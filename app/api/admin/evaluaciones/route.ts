import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAILS = ["david@factorh.com.mx"];

type CreateBody = {
  organization_id?: string;
  template_id?: string;
  existing_person_id?: string | null;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  job_title?: string;
  area?: string;
  process_name?: string;
  due_date?: string | null;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();
  const email = String(authData?.claims?.email ?? "").trim().toLowerCase();

  if (authError || !authData?.claims || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const body = (await request.json()) as CreateBody;
  const organizationId = clean(body.organization_id);
  const templateId = clean(body.template_id);
  const existingPersonId = clean(body.existing_person_id);

  if (!organizationId || !templateId) {
    return NextResponse.json(
      { error: "Selecciona empresa y evaluación." },
      { status: 400 },
    );
  }

  const db = createAdminClient();

  const [organizationResult, templateResult] = await Promise.all([
    db
      .from("organizations")
      .select("id,name,active")
      .eq("id", organizationId)
      .eq("active", true)
      .maybeSingle(),
    db
      .from("assessment_templates")
      .select("id,name,organization_id,active")
      .eq("id", templateId)
      .eq("active", true)
      .maybeSingle(),
  ]);

  if (organizationResult.error) {
    return NextResponse.json(
      { error: organizationResult.error.message },
      { status: 500 },
    );
  }

  if (!organizationResult.data) {
    return NextResponse.json(
      { error: "La empresa seleccionada no está disponible." },
      { status: 400 },
    );
  }

  if (templateResult.error) {
    return NextResponse.json(
      { error: templateResult.error.message },
      { status: 500 },
    );
  }

  const template = templateResult.data;
  if (!template) {
    return NextResponse.json(
      { error: "La evaluación seleccionada no está disponible." },
      { status: 400 },
    );
  }

  if (
    template.organization_id &&
    template.organization_id !== organizationId
  ) {
    return NextResponse.json(
      { error: "Esta evaluación no pertenece a la empresa seleccionada." },
      { status: 400 },
    );
  }

  let personId = existingPersonId;
  let createdPersonId: string | null = null;
  let personName = "";
  let personEmail: string | null = null;

  if (personId) {
    const { data: person, error: personError } = await db
      .from("people")
      .select("id,first_name,last_name,email,organization_id,active")
      .eq("id", personId)
      .eq("organization_id", organizationId)
      .eq("active", true)
      .maybeSingle();

    if (personError) {
      return NextResponse.json(
        { error: personError.message },
        { status: 500 },
      );
    }

    if (!person) {
      return NextResponse.json(
        { error: "La persona seleccionada no pertenece a esta empresa." },
        { status: 400 },
      );
    }

    personName = `${person.first_name.trim()} ${person.last_name ?? ""}`.trim();
    personEmail = person.email;
  } else {
    const firstName = clean(body.first_name);
    if (!firstName) {
      return NextResponse.json(
        { error: "Escribe el nombre del colaborador." },
        { status: 400 },
      );
    }

    const { data: newPerson, error: newPersonError } = await db
      .from("people")
      .insert({
        organization_id: organizationId,
        first_name: firstName,
        last_name: clean(body.last_name) || null,
        email: clean(body.email).toLowerCase() || null,
        phone: clean(body.phone) || null,
        job_title: clean(body.job_title) || null,
        area: clean(body.area) || null,
        active: true,
      })
      .select("id,first_name,last_name,email")
      .single();

    if (newPersonError) {
      return NextResponse.json(
        { error: newPersonError.message },
        { status: 500 },
      );
    }

    personId = newPerson.id;
    createdPersonId = newPerson.id;
    personName = `${newPerson.first_name.trim()} ${newPerson.last_name ?? ""}`.trim();
    personEmail = newPerson.email;
  }

  const processName =
    clean(body.process_name) ||
    `${template.name} - ${personName}`;

  const { data: processData, error: processError } = await db
    .from("assessment_processes")
    .insert({
      organization_id: organizationId,
      person_id: personId,
      name: processName,
      status: "open",
      start_date: new Date().toISOString().slice(0, 10),
      target_date: clean(body.due_date) || null,
    })
    .select("id")
    .single();

  if (processError) {
    if (createdPersonId) {
      await db.from("people").delete().eq("id", createdPersonId);
    }

    return NextResponse.json(
      { error: processError.message },
      { status: 500 },
    );
  }

  const dueDate = clean(body.due_date)
    ? `${clean(body.due_date)}T23:59:59`
    : null;

  const { data: assignment, error: assignmentError } = await db
    .from("assessment_assignments")
    .insert({
      process_id: processData.id,
      template_id: templateId,
      relationship_type: "self",
      evaluator_name: personName,
      evaluator_email: personEmail,
      due_date: dueDate,
      status: "pending",
    })
    .select("id,public_token,status")
    .single();

  if (assignmentError) {
    await db.from("assessment_processes").delete().eq("id", processData.id);
    if (createdPersonId) {
      await db.from("people").delete().eq("id", createdPersonId);
    }

    return NextResponse.json(
      { error: assignmentError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    assignment_id: assignment.id,
    public_token: assignment.public_token,
    path: `/e/${assignment.public_token}`,
    person_name: personName,
    organization_name: organizationResult.data.name,
    template_name: template.name,
  });
}
