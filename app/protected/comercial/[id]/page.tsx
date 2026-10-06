import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const stageLabels: Record<string, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  responded: "Respondió",
  qualified: "Necesidad detectada",
  meeting: "Reunión",
  proposal_sent: "Cotización enviada",
  follow_up: "Seguimiento",
  won: "Ganado",
  lost: "Perdido",
};

const serviceLabels: Record<string, string> = {
  recruitment: "Reclutamiento y Headhunting",
  ese: "Estudios Socioeconómicos",
  hr_consulting: "Consultoría RH",
};

const channelLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  phone: "Llamada",
  email: "Email",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  google: "Google",
  in_person: "Presencial",
  other: "Otro",
};

const activityLabels: Record<string, string> = {
  first_contact: "Primer contacto",
  follow_up: "Seguimiento",
  call: "Llamada",
  message: "Mensaje",
  email: "Email",
  meeting: "Reunión",
  proposal: "Cotización",
  note: "Nota",
  close: "Cierre",
};

const quoteStatusLabels: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviada",
  follow_up: "Seguimiento",
  accepted: "Aceptada",
  rejected: "Rechazada",
  expired: "Vencida",
};

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function dateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function requireUser() {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();

  if (authError || !authData?.claims) {
    redirect("/auth/login");
  }

  return authData.claims;
}

async function updateStage(formData: FormData) {
  "use server";

  await requireUser();
  const id = String(formData.get("opportunity_id") || "");
  const stage = String(formData.get("stage") || "");

  const validStages = Object.keys(stageLabels);
  if (!id || !validStages.includes(stage)) {
    throw new Error("Etapa inválida.");
  }

  const db = createAdminClient();

  const { data: opportunity, error: findError } = await db
    .from("sales_opportunities")
    .select("id,organization_id")
    .eq("id", id)
    .single();

  if (findError || !opportunity) {
    throw new Error(findError?.message || "No se encontró la oportunidad.");
  }

  const { error } = await db
    .from("sales_opportunities")
    .update({
      stage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  if (stage === "won") {
    await db
      .from("organizations")
      .update({
        lifecycle_stage: "client",
        updated_at: new Date().toISOString(),
      })
      .eq("id", opportunity.organization_id);
  }

  await db.from("sales_activities").insert({
    opportunity_id: id,
    organization_id: opportunity.organization_id,
    activity_type: stage === "won" || stage === "lost" ? "close" : "note",
    subject: `Etapa actualizada a ${stageLabels[stage]}`,
    status: "completed",
    completed_at: new Date().toISOString(),
  });

  revalidatePath("/protected/comercial");
  revalidatePath("/protected/comercial/agenda");
  revalidatePath(`/protected/comercial/${id}`);
}

async function addActivity(formData: FormData) {
  "use server";

  const claims = await requireUser();
  const id = String(formData.get("opportunity_id") || "");
  const activityType = String(formData.get("activity_type") || "follow_up");
  const channel = String(formData.get("channel") || "whatsapp");
  const subject = String(formData.get("subject") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const status = String(formData.get("status") || "pending");
  const scheduledRaw = String(formData.get("scheduled_at") || "").trim();

  if (!id || !subject) {
    throw new Error("La oportunidad y el asunto son obligatorios.");
  }

  const db = createAdminClient();

  const { data: opportunity, error: findError } = await db
    .from("sales_opportunities")
    .select("id,organization_id,contact_id")
    .eq("id", id)
    .single();

  if (findError || !opportunity) {
    throw new Error(findError?.message || "No se encontró la oportunidad.");
  }

  const now = new Date().toISOString();
  const scheduledAt = scheduledRaw ? new Date(scheduledRaw).toISOString() : null;
  const isCompleted = status === "completed";

  const { error } = await db.from("sales_activities").insert({
    opportunity_id: id,
    organization_id: opportunity.organization_id,
    contact_id: opportunity.contact_id,
    activity_type: activityType,
    channel,
    subject,
    notes: notes || null,
    scheduled_at: scheduledAt,
    completed_at: isCompleted ? now : null,
    status: isCompleted ? "completed" : "pending",
    owner_id: typeof claims.sub === "string" ? claims.sub : null,
  });

  if (error) throw new Error(error.message);

  const opportunityUpdate: Record<string, string | null> = {
    updated_at: now,
  };

  if (isCompleted) {
    opportunityUpdate.last_contact_at = now;
  } else {
    opportunityUpdate.next_action = subject;
    opportunityUpdate.next_action_at = scheduledAt;
  }

  await db.from("sales_opportunities").update(opportunityUpdate).eq("id", id);

  revalidatePath("/protected/comercial");
  revalidatePath("/protected/comercial/agenda");
  revalidatePath(`/protected/comercial/${id}`);
}

async function completeActivity(formData: FormData) {
  "use server";

  await requireUser();
  const activityId = String(formData.get("activity_id") || "");
  const opportunityId = String(formData.get("opportunity_id") || "");

  if (!activityId || !opportunityId) {
    throw new Error("Actividad inválida.");
  }

  const db = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await db
    .from("sales_activities")
    .update({
      status: "completed",
      completed_at: now,
    })
    .eq("id", activityId);

  if (error) throw new Error(error.message);

  const { data: nextActivity } = await db
    .from("sales_activities")
    .select("subject,scheduled_at")
    .eq("opportunity_id", opportunityId)
    .eq("status", "pending")
    .not("scheduled_at", "is", null)
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  await db
    .from("sales_opportunities")
    .update({
      last_contact_at: now,
      next_action: nextActivity?.subject ?? null,
      next_action_at: nextActivity?.scheduled_at ?? null,
      updated_at: now,
    })
    .eq("id", opportunityId);

  revalidatePath("/protected/comercial");
  revalidatePath("/protected/comercial/agenda");
  revalidatePath(`/protected/comercial/${opportunityId}`);
}

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const db = createAdminClient();

  const { data: opportunity, error } = await db
    .from("sales_opportunities")
    .select(
      "id,organization_id,contact_id,title,service_type,stage,source,priority,estimated_value,probability,expected_close_date,last_contact_at,next_action_at,next_action,lost_reason,notes,created_at,updated_at",
    )
    .eq("id", id)
    .single();

  if (error || !opportunity) notFound();

  const [organizationResult, contactResult, activitiesResult, quotesResult] = await Promise.all([
    db
      .from("organizations")
      .select("id,name,website,phone,commercial_email,lifecycle_stage")
      .eq("id", opportunity.organization_id)
      .single(),
    opportunity.contact_id
      ? db
          .from("sales_contacts")
          .select("id,first_name,last_name,job_title,email,phone")
          .eq("id", opportunity.contact_id)
          .single()
      : Promise.resolve({ data: null, error: null }),
    db
      .from("sales_activities")
      .select(
        "id,activity_type,channel,subject,notes,scheduled_at,completed_at,status,created_at",
      )
      .eq("opportunity_id", id)
      .order("created_at", { ascending: false }),
    db
      .from("sales_quotes")
      .select("id,quote_number,status,total,valid_until,created_at")
      .eq("opportunity_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const organization = organizationResult.data;
  const contact = contactResult.data;
  const activities = activitiesResult.data ?? [];
  const quotes = quotesResult.data ?? [];

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href="/protected/comercial"
            className="text-sm font-bold text-orange-600 hover:text-orange-700"
          >
            ← Volver al pipeline
          </Link>
          <div className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
            {organization?.name ?? "Empresa"}
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            {opportunity.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700">
              {serviceLabels[opportunity.service_type] ?? opportunity.service_type}
            </span>
            <span className="rounded-full bg-neutral-200 px-3 py-1.5 text-xs font-bold text-neutral-700">
              {stageLabels[opportunity.stage] ?? opportunity.stage}
            </span>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-neutral-600 shadow-sm ring-1 ring-neutral-200">
              Prioridad {opportunity.priority}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Link
            href={`/protected/comercial/${opportunity.id}/cotizaciones/nueva`}
            className="rounded-xl bg-orange-500 px-5 py-3 text-center text-sm font-bold text-white shadow-sm hover:bg-orange-600"
          >
            + Crear cotización
          </Link>
          <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-right shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
              Valor potencial
            </div>
            <div className="mt-1 text-2xl font-black text-neutral-900">
              {money(Number(opportunity.estimated_value || 0))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-5">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                  Estado comercial
                </div>
                <div className="mt-2 text-xl font-black text-neutral-900">
                  {stageLabels[opportunity.stage] ?? opportunity.stage}
                </div>
              </div>

              <form action={updateStage} className="flex flex-wrap gap-3">
                <input type="hidden" name="opportunity_id" value={opportunity.id} />
                <select
                  name="stage"
                  defaultValue={opportunity.stage}
                  className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 outline-none focus:border-orange-500"
                >
                  {Object.entries(stageLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold text-white hover:bg-neutral-900"
                >
                  Actualizar etapa
                </button>
              </form>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-neutral-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-black text-neutral-900">Cotizaciones</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Propuestas económicas vinculadas a esta oportunidad.
                </p>
              </div>
              <Link
                href={`/protected/comercial/${opportunity.id}/cotizaciones/nueva`}
                className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-center text-sm font-bold text-orange-700 hover:bg-orange-100"
              >
                + Nueva cotización
              </Link>
            </div>

            {quotes.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-500">
                Aún no hay cotizaciones. Crea la primera propuesta para esta oportunidad.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {quotes.map((quote) => (
                  <Link
                    key={quote.id}
                    href={`/protected/comercial/cotizaciones/${quote.id}`}
                    className="flex flex-col gap-3 p-5 transition hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-black text-neutral-900">
                        {quote.quote_number}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-neutral-500">
                        {quoteStatusLabels[quote.status] ?? quote.status}
                        {quote.valid_until ? ` · Vigencia ${quote.valid_until}` : ""}
                      </div>
                    </div>
                    <div className="text-lg font-black text-neutral-900">
                      {money(Number(quote.total || 0))}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-neutral-900">Registrar actividad</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Registra lo que ocurrió o programa el siguiente contacto.
            </p>

            <form action={addActivity} className="mt-5 grid gap-4">
              <input type="hidden" name="opportunity_id" value={opportunity.id} />

              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                  Actividad
                  <select
                    name="activity_type"
                    defaultValue="follow_up"
                    className="rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal outline-none focus:border-orange-500"
                  >
                    {Object.entries(activityLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                  Canal
                  <select
                    name="channel"
                    defaultValue="whatsapp"
                    className="rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal outline-none focus:border-orange-500"
                  >
                    {Object.entries(channelLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                  Estado
                  <select
                    name="status"
                    defaultValue="pending"
                    className="rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal outline-none focus:border-orange-500"
                  >
                    <option value="pending">Programar</option>
                    <option value="completed">Ya realizada</option>
                  </select>
                </label>
              </div>

              <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                Asunto *
                <input
                  name="subject"
                  required
                  placeholder="Ej. Llamar para revisar propuesta"
                  className="rounded-xl border border-neutral-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                  Fecha y hora
                  <input
                    name="scheduled_at"
                    type="datetime-local"
                    className="rounded-xl border border-neutral-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                  Notas
                  <input
                    name="notes"
                    placeholder="Acuerdo, respuesta, dato importante..."
                    className="rounded-xl border border-neutral-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
                  />
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white hover:bg-orange-600"
                >
                  Guardar actividad
                </button>
              </div>
            </form>
          </section>

          <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 px-6 py-5">
              <h2 className="font-black text-neutral-900">Historial comercial</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Llamadas, mensajes, reuniones, cotizaciones y seguimientos.
              </p>
            </div>

            {activities.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-500">
                Aún no hay actividades registradas.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {activities.map((activity) => (
                  <div key={activity.id} className="p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-neutral-900">
                            {activity.subject}
                          </span>
                          <span
                            className={
                              activity.status === "completed"
                                ? "rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-black uppercase text-green-700"
                                : "rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black uppercase text-orange-700"
                            }
                          >
                            {activity.status === "completed" ? "Realizada" : "Pendiente"}
                          </span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-neutral-500">
                          {activityLabels[activity.activity_type] ?? activity.activity_type}
                          {activity.channel
                            ? ` · ${channelLabels[activity.channel] ?? activity.channel}`
                            : ""}
                        </div>
                        {activity.notes && (
                          <p className="mt-2 text-sm leading-6 text-neutral-600">
                            {activity.notes}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 text-right text-xs text-neutral-500">
                        <div>
                          {activity.status === "completed"
                            ? dateTime(activity.completed_at || activity.created_at)
                            : dateTime(activity.scheduled_at)}
                        </div>
                        {activity.status === "pending" && (
                          <form action={completeActivity} className="mt-2">
                            <input type="hidden" name="activity_id" value={activity.id} />
                            <input
                              type="hidden"
                              name="opportunity_id"
                              value={opportunity.id}
                            />
                            <button
                              type="submit"
                              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
                            >
                              Marcar realizada
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="grid content-start gap-5">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="font-black text-neutral-900">Contacto</h2>
            <div className="mt-5 grid gap-4 text-sm">
              <Info label="Nombre" value={
                contact
                  ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
                  : "—"
              } />
              <Info label="Puesto" value={contact?.job_title || "—"} />
              <Info label="Teléfono" value={contact?.phone || organization?.phone || "—"} />
              <Info label="Correo" value={contact?.email || organization?.commercial_email || "—"} />
              <Info label="Origen" value={opportunity.source || "—"} />
            </div>
          </section>

          <section
            className={
              opportunity.next_action_at
                ? "rounded-3xl border border-orange-200 bg-orange-50 p-6 shadow-sm"
                : "rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm"
            }
          >
            <div className="text-xs font-black uppercase tracking-[0.16em] text-neutral-600">
              Próxima acción
            </div>
            <div className="mt-3 text-lg font-black text-neutral-900">
              {opportunity.next_action || "Sin próxima acción"}
            </div>
            <div className="mt-2 text-sm text-neutral-600">
              {dateTime(opportunity.next_action_at)}
            </div>
            {!opportunity.next_action_at && (
              <div className="mt-4 text-sm font-bold text-red-700">
                Esta oportunidad necesita seguimiento.
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="font-black text-neutral-900">Resumen</h2>
            <div className="mt-5 grid gap-4 text-sm">
              <Info label="Último contacto" value={dateTime(opportunity.last_contact_at)} />
              <Info
                label="Probabilidad"
                value={`${opportunity.probability ?? 0}%`}
              />
              <Info
                label="Cierre esperado"
                value={opportunity.expected_close_date || "—"}
              />
              <Info label="Creada" value={dateTime(opportunity.created_at)} />
            </div>
            {opportunity.notes && (
              <div className="mt-5 rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
                {opportunity.notes}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="mt-1 font-semibold text-neutral-800">{value}</div>
    </div>
  );
}
