import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAILS = ["david@factorh.com.mx"];

type CreateBody = {
  organization_id?: string;
  template_id?: string;
  template_ids?: string[];
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
  const existingPersonId = clean(body.existing_person_id);
  const requestedIds = Array.isArray(body.template_ids)
    ? body.template_ids.map(clean).filter(Boolean)
    : [];
  const legacyTemplateId = clean(body.template_id);
  const templateIds = Array.from(
    new Set(
      requestedIds.length > 0
        ? requestedIds
        : legacyTemplateId
          ? [legacyTemplateId]
          : [],
    ),
  );

  if (!organizationId || templateIds.length === 0) {
    return NextResponse.json(
      { error: "Selecciona empresa y al menos una evaluación." },
      { status: 400 },
    );
  }

  if (templateIds.length > 20) {
    return NextResponse.json(
      { error: "La batería no puede contener más de 20 evaluaciones." },
      { status: 400 },
    );
  }

  const db = createAdminClient();

  const [organizationResult, templatesResult, accessResult] = await Promise.all([
    db
      .from("organizations")
      .select("id,name,active")
      .eq("id", organizationId)
      .eq("active", true)
      .maybeSingle(),
    db
      .from("assessment_templates")
      .select("id,name,organization_id,active")
      .in("id", templateIds)
      .eq("active", true),
    db
      .from("organization_assessment_templates")
      .select("template_id,enabled,participant_sendable")
      .eq("organization_id", organizationId)
      .in("template_id", templateIds),
  ]);

  const firstValidationError =
    organizationResult.error || templatesResult.error || accessResult.error;

  if (firstValidationError) {
    return NextResponse.json(
      { error: firstValidationError.message },
      { status: 500 },
    );
  }

  if (!organizationResult.data) {
    return NextResponse.json(
      { error: "La empresa seleccionada no está disponible." },
      { status: 400 },
    );
  }

  const templates = templatesResult.data ?? [];
  const access = accessResult.data ?? [];

  if (templates.length !== templateIds.length) {
    return NextResponse.json(
      { error: "Una o más evaluaciones ya no están disponibles." },
      { status: 400 },
    );
  }

  const allowedIds = new Set(
    access
      .filter((row) => row.enabled && row.participant_sendable)
      .map((row) => row.template_id),
  );

  const unauthorized = templateIds.filter((id) => !allowedIds.has(id));
  if (unauthorized.length > 0) {
    return NextResponse.json(
      {
        error:
          "Una o más evaluaciones no están habilitadas para enviarse a participantes de esta empresa.",
      },
      { status: 400 },
    );
  }

  const templateById = new Map(templates.map((template) => [template.id, template]));
  const orderedTemplates = templateIds
    .map((id) => templateById.get(id))
    .filter((template): template is NonNullable<typeof template> => Boolean(template));

  let personId = existingPersonId;
  let createdPersonId: string | null = null;
  let personName = "";
  let personEmail: string | null = null;
  let personPhone: string | null = null;

  if (personId) {
    const { data: person, error: personError } = await db
      .from("people")
      .select("id,first_name,last_name,email,phone,organization_id,active")
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
    personPhone = person.phone;
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
      .select("id,first_name,last_name,email,phone")
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
    personPhone = newPerson.phone;
  }

  const defaultProcessName =
    orderedTemplates.length === 1
      ? `${orderedTemplates[0].name} - ${personName}`
      : `Batería de ${orderedTemplates.length} evaluaciones - ${personName}`;

  const processName = clean(body.process_name) || defaultProcessName;

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
    .select("id,public_token")
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

  const assignmentRows = orderedTemplates.map((template) => ({
    process_id: processData.id,
    template_id: template.id,
    relationship_type: "self",
    evaluator_name: personName,
    evaluator_email: personEmail,
    due_date: dueDate,
    status: "pending",
  }));

  const { data: assignments, error: assignmentError } = await db
    .from("assessment_assignments")
    .insert(assignmentRows)
    .select("id,public_token,status,template_id");

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
    process_id: processData.id,
    assignment_id: assignments?.[0]?.id ?? null,
    assignment_ids: (assignments ?? []).map((item) => item.id),
    public_token: processData.public_token,
    path: `/p/${processData.public_token}`,
    person_name: personName,
    person_email: personEmail,
    person_phone: personPhone,
    organization_name: organizationResult.data.name,
    template_name:
      orderedTemplates.length === 1
        ? orderedTemplates[0].name
        : `Batería de ${orderedTemplates.length} evaluaciones`,
    template_names: orderedTemplates.map((template) => template.name),
  });
}
