import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/app-auth";
import { hasStaffPermission } from "@/lib/staff-permissions";
import { createAdminClient } from "@/lib/supabase/admin";

const errorResponse = (error: string, status = 400) =>
  NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

/** Generate a new link for the same invitation, without invalidating old links. */
export async function POST(request: NextRequest) {
  const user = await getCurrentAppUser();
  if (!user || (user.role !== "super_admin" && !(await hasStaffPermission(user, "pdl", "operate")))) {
    return errorResponse("Sin autorización", 403);
  }
  const body = await request.json().catch(() => null);
  const inviteId = typeof body?.invite_id === "string" ? body.invite_id : "";
  if (!/^[a-f0-9-]{36}$/i.test(inviteId)) return errorResponse("Invitación inválida");

  const db = createAdminClient();
  const invite = await db.from("pdl_quiz_invites")
    .select("id,active,expires_at,max_attempts,quiz_id,quiz_version")
    .eq("id", inviteId).maybeSingle();
  if (invite.error) return errorResponse("No fue posible consultar la invitación", 500);
  if (!invite.data) return errorResponse("No se encontró la invitación", 404);
  if (!invite.data.active || new Date(invite.data.expires_at).getTime() <= Date.now()) {
    return errorResponse("La invitación está vencida o desactivada. No se generó una nueva liga.", 409);
  }
  const [attempts, existingLinks, quiz] = await Promise.all([
    db.from("pdl_quiz_attempts").select("id", { count: "exact", head: true }).eq("invite_id", inviteId),
    db.from("pdl_quiz_invite_links").select("id", { count: "exact", head: true }).eq("invite_id", inviteId),
    db.from("pdl_quiz_catalog").select("published").eq("quiz_id",invite.data.quiz_id).eq("version",invite.data.quiz_version).maybeSingle()
  ]);
  if (attempts.error || existingLinks.error || quiz.error) return errorResponse("No fue posible verificar la invitación", 500);
  if (!quiz.data?.published) return errorResponse("El cuestionario no está habilitado", 409);
  if ((attempts.count ?? 0) >= invite.data.max_attempts) {
    return errorResponse("El participante ya utilizó todos sus intentos", 409);
  }
  // Limit the number of active alternatives for each invite.
  if ((existingLinks.count ?? 0) >= 10) return errorResponse("Se alcanzó el límite de ligas alternativas. Contacta al administrador.", 409);

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const created = await db.from("pdl_quiz_invite_links").insert({
    invite_id: inviteId, token_hash: tokenHash, created_by: user.userId
  });
  if (created.error) return errorResponse("No se pudo generar la nueva liga", 500);
  const canonicalOrigin = process.env.PDL_PUBLIC_ORIGIN ||
    "https://factorh-evaluaciones-git-nom035-v1-davidcarrillorh-5996.vercel.app";
  return NextResponse.json({
    url: `${canonicalOrigin}/pdl/quiz/${token}`,
    message: "Liga alternativa creada. La liga anterior sigue funcionando y no se reinician los intentos."
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
