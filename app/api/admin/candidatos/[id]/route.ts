import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAILS = ["david@factorh.com.mx"];

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await createClient();
  const { data, error } = await auth.auth.getClaims();
  const email = String(data?.claims?.email ?? "").toLowerCase();
  if (error || !data?.claims || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await context.params;
  let input: { organization_id?: string; first_name?: string; last_name?: string; job_title?: string; area?: string; email?: string; phone?: string };
  try { input = await request.json(); } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }
  const organization_id = String(input.organization_id ?? "").trim();
  const first_name = String(input.first_name ?? "").trim();
  if (!organization_id || !first_name) {
    return NextResponse.json({ error: "Empresa y nombre son obligatorios." }, { status: 400 });
  }

  const db = createAdminClient();
  const [personResult, orgResult, processResult] = await Promise.all([
    db.from("people").select("id,organization_id").eq("id", id).single(),
    db.from("organizations").select("id").eq("id", organization_id).single(),
    db.from("assessment_processes").select("id,organization_id").eq("person_id", id),
  ]);
  if (personResult.error || orgResult.error || processResult.error || !personResult.data || !orgResult.data) {
    return NextResponse.json({ error: "No fue posible validar el candidato o la empresa." }, { status: 400 });
  }
  const processes = processResult.data ?? [];
  const changingCompany = personResult.data.organization_id !== organization_id;
  if (changingCompany && processes.length) {
    const { data: assignments, error: assignmentsError } = await db
      .from("assessment_assignments").select("id,status").in("process_id", processes.map(p => p.id));
    if (assignmentsError) return NextResponse.json({ error: assignmentsError.message }, { status: 500 });
    if ((assignments ?? []).some(a => a.status !== "pending")) {
      return NextResponse.json({ error: "No puedes cambiar de empresa a un candidato con evaluaciones iniciadas, completadas o canceladas." }, { status: 409 });
    }
  }

  const payload = {
    organization_id, first_name,
    last_name: String(input.last_name ?? "").trim() || null,
    job_title: String(input.job_title ?? "").trim() || null,
    area: String(input.area ?? "").trim() || null,
    email: String(input.email ?? "").trim() || null,
    phone: String(input.phone ?? "").trim() || null,
  };
  // Update linked processes before the person to avoid moving a candidate while their processes still belong elsewhere.
  if (changingCompany && processes.length) {
    const moved = await db.from("assessment_processes").update({ organization_id })
      .eq("person_id", id).eq("organization_id", personResult.data.organization_id);
    if (moved.error) return NextResponse.json({ error: moved.error.message }, { status: 500 });
  }
  const saved = await db.from("people").update(payload).eq("id", id);
  if (saved.error) {
    if (changingCompany && processes.length) {
      await db.from("assessment_processes").update({ organization_id: personResult.data.organization_id })
        .eq("person_id", id).eq("organization_id", organization_id);
    }
    return NextResponse.json({ error: saved.error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
