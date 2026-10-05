import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAILS = ["david@factorh.com.mx"];

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();
  const email = String(authData?.claims?.email ?? "").trim().toLowerCase();

  if (authError || !authData?.claims || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await context.params;
  const db = createAdminClient();

  const { data: assignment, error: assignmentError } = await db
    .from("assessment_assignments")
    .select("id,process_id")
    .eq("id", id)
    .maybeSingle();

  if (assignmentError) {
    return NextResponse.json({ error: assignmentError.message }, { status: 500 });
  }

  if (!assignment) {
    return NextResponse.json({ error: "La evaluación ya no existe." }, { status: 404 });
  }

  const { error: deleteError } = await db
    .from("assessment_assignments")
    .delete()
    .eq("id", assignment.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const { count, error: countError } = await db
    .from("assessment_assignments")
    .select("id", { count: "exact", head: true })
    .eq("process_id", assignment.process_id);

  if (!countError && (count ?? 0) === 0) {
    await db.from("assessment_processes").delete().eq("id", assignment.process_id);
  }

  return NextResponse.json({ ok: true });
}
