import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const serviceLabels: Record<string, string> = {
  recruitment: "Reclutamiento y Headhunting",
  ese: "Estudios Socioeconómicos",
  hr_consulting: "Consultoría RH",
};

const statusLabels: Record<string, string> = {
  new: "Nueva",
  planning: "Planeación",
  in_progress: "En proceso",
  waiting_client: "Esperando cliente",
  completed: "Completada",
  cancelled: "Cancelada",
};

const serviceGuide: Record<string, { title: string; steps: string[] }> = {
  recruitment: {
    title: "Flujo operativo sugerido",
    steps: [
      "Levantar perfil y requisitos de la vacante",
      "Definir fuentes de reclutamiento",
      "Sourcing y filtro inicial",
      "Entrevistas y evaluaciones",
      "Presentar finalistas",
      "Contratación y garantía",
    ],
  },
  ese: {
    title: "Flujo operativo sugerido",
    steps: [
      "Recibir datos del candidato",
      "Programar investigación",
      "Validar domicilio y referencias",
      "Integrar evidencia",
      "Emitir dictamen y reporte",
      "Entregar al cliente",
    ],
  },
  hr_consulting: {
    title: "Flujo operativo sugerido",
    steps: [
      "Definir objetivo y alcance",
      "Diagnóstico / levantamiento",
      "Plan de trabajo",
      "Ejecución de entregables",
      "Seguimiento con cliente",
      "Cierre y siguientes oportunidades",
    ],
  },
};

async function requireUser() {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();

  if (authError || !authData?.claims) redirect("/auth/login");

  return authData.claims;
}

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
    timeZone: "America/Mexico_City",
  }).format(new Date(value));
}

async function updateOrder(formData: FormData) {
  "use server";

  const claims = await requireUser();
  const id = String(formData.get("order_id") || "");
  const status = String(formData.get("status") || "");
  const priority = String(formData.get("priority") || "medium");
  const startDate = String(formData.get("start_date") || "").trim();
  const targetDate = String(formData.get("target_date") || "").trim();
  const scope = String(formData.get("scope") || "").trim();
  const notes = String(formData.get("internal_notes") || "").trim();

  if (!id || !Object.keys(statusLabels).includes(status)) {
    throw new Error("Orden o estatus inválido.");
  }

  const db = createAdminClient();
  const now = new Date().toISOString();

  const { data: previous, error: findError } = await db
    .from("service_orders")
    .select("status")
    .eq("id", id)
    .single();

  if (findError || !previous) {
    throw new Error(findError?.message || "No se encontró la orden.");
  }

  const { error } = await db
    .from("service_orders")
    .update({
      status,
      priority,
      start_date: startDate || null,
      target_date: targetDate || null,
      scope: scope || null,
      internal_notes: notes || null,
      completed_at: status === "completed" ? now : null,
      updated_at: now,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  if (previous.status !== status) {
    await db.from("service_order_updates").insert({
      service_order_id: id,
      update_type: "status_change",
      title: `Estatus actualizado a ${statusLabels[status]}`,
      created_by: typeof claims.sub === "string" ? claims.sub : null,
    });
  }

  revalidatePath("/protected/operacion");
  revalidatePath(`/protected/operacion/${id}`);
}

async function addUpdate(formData: FormData) {
  "use server";

  const claims = await requireUser();
  const id = String(formData.get("order_id") || "");
  const updateType = String(formData.get("update_type") || "note");
  const title = String(formData.get("title") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!id || !title) throw new Error("Título requerido.");

  const db = createAdminClient();

  const { error } = await db.from("service_order_updates").insert({
    service_order_id: id,
    update_type: updateType,
    title,
    notes: notes || null,
    created_by: typeof claims.sub === "string" ? claims.sub : null,
  });

  if (error) throw new Error(error.message);

  await db
    .from("service_orders")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/protected/operacion");
  revalidatePath(`/protected/operacion/${id}`);
}

export default async function OperacionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const db = createAdminClient();

  const { data: order, error } = await db
    .from("service_orders")
    .select(
      "id,order_number,quote_id,opportunity_id,organization_id,service_type,title,status,priority,start_date,target_date,completed_at,commercial_value,scope,internal_notes,created_at,updated_at",
    )
    .eq("id", id)
    .single();

  if (error || !order) notFound();

  const [organizationResult, quoteResult, opportunityResult, updatesResult, moduleResult] =
    await Promise.all([
      db.from("organizations").select("name").eq("id", order.organization_id).single(),
      db
        .from("sales_quotes")
        .select("id,quote_number,status,total")
        .eq("id", order.quote_id)
        .single(),
      db
        .from("sales_opportunities")
        .select("id,title")
        .eq("id", order.opportunity_id)
        .single(),
      db
        .from("service_order_updates")
        .select("id,update_type,title,notes,created_at")
        .eq("service_order_id", id)
        .order("created_at", { ascending: false }),
      order.service_type === "recruitment"
        ? db.from("recruitment_jobs").select("id").eq("service_order_id", id).maybeSingle()
        : order.service_type === "ese"
          ? Promise.resolve({ data: { id }, error: null })
          : db.from("consulting_projects").select("id").eq("service_order_id", id).maybeSingle(),
    ]);

  const organization = organizationResult.data;
  const quote = quoteResult.data;
  const opportunity = opportunityResult.data;
  const updates = updatesResult.data ?? [];
  const guide = serviceGuide[order.service_type] ?? serviceGuide.hr_consulting;
  const moduleId = moduleResult.data?.id ?? null;

  const moduleHref =
    order.service_type === "recruitment" && moduleId
      ? `/protected/operacion/reclutamiento/${moduleId}`
      : order.service_type === "ese"
        ? `/protected/operacion/ese/${order.id}`
        : order.service_type === "hr_consulting" && moduleId
          ? `/protected/operacion/consultoria/${moduleId}`
          : null;

  const moduleLabel =
    order.service_type === "recruitment"
      ? "Abrir vacante y candidatos"
      : order.service_type === "ese"
        ? "Administrar estudios"
        : "Abrir proyecto y tareas";

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href="/protected/operacion"
            className="text-sm font-bold text-orange-600 hover:text-orange-700"
          >
            ← Volver a Operación
          </Link>
          <div className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
            {organization?.name ?? "Cliente"}
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            {order.order_number}
          </h1>
          <p className="mt-2 text-lg font-semibold text-neutral-700">{order.title}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700">
              {serviceLabels[order.service_type] ?? order.service_type}
            </span>
            <span className="rounded-full bg-neutral-200 px-3 py-1.5 text-xs font-bold text-neutral-700">
              {statusLabels[order.status] ?? order.status}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {moduleHref && (
            <Link
              href={moduleHref}
              className="rounded-xl bg-orange-500 px-5 py-3 text-center text-sm font-bold text-white shadow-sm hover:bg-orange-600"
            >
              {moduleLabel}
            </Link>
          )}
          <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-right shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
              Valor comercial
            </div>
            <div className="mt-1 text-2xl font-black text-neutral-900">
              {money(Number(order.commercial_value || 0))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid content-start gap-6">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="font-black text-neutral-900">Gestión del servicio</h2>
            <form action={updateOrder} className="mt-5 grid gap-4">
              <input type="hidden" name="order_id" value={order.id} />

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                  Estatus
                  <select
                    name="status"
                    defaultValue={order.status}
                    className="rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal outline-none focus:border-orange-500"
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                  Prioridad
                  <select
                    name="priority"
                    defaultValue={order.priority}
                    className="rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal outline-none focus:border-orange-500"
                  >
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                  Inicio
                  <input
                    name="start_date"
                    type="date"
                    defaultValue={order.start_date ?? ""}
                    className="rounded-xl border border-neutral-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                  Fecha objetivo
                  <input
                    name="target_date"
                    type="date"
                    defaultValue={order.target_date ?? ""}
                    className="rounded-xl border border-neutral-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                Alcance
                <textarea
                  name="scope"
                  rows={4}
                  defaultValue={order.scope ?? ""}
                  placeholder="Qué incluye exactamente este servicio..."
                  className="rounded-xl border border-neutral-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                Notas internas
                <textarea
                  name="internal_notes"
                  rows={3}
                  defaultValue={order.internal_notes ?? ""}
                  placeholder="Información para operación..."
                  className="rounded-xl border border-neutral-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
                />
              </label>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white hover:bg-orange-600"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="font-black text-neutral-900">Registrar avance</h2>
            <form action={addUpdate} className="mt-5 grid gap-4">
              <input type="hidden" name="order_id" value={order.id} />
              <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                  Tipo
                  <select
                    name="update_type"
                    defaultValue="note"
                    className="rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal outline-none focus:border-orange-500"
                  >
                    <option value="note">Nota</option>
                    <option value="milestone">Hito</option>
                    <option value="deliverable">Entregable</option>
                    <option value="client_request">Solicitud cliente</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                  Avance *
                  <input
                    name="title"
                    required
                    placeholder="Ej. Perfil validado con cliente"
                    className="rounded-xl border border-neutral-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                Detalle
                <textarea
                  name="notes"
                  rows={3}
                  className="rounded-xl border border-neutral-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
                />
              </label>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-neutral-800 px-6 py-3 text-sm font-bold text-white hover:bg-neutral-900"
                >
                  Registrar avance
                </button>
              </div>
            </form>
          </section>

          <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 px-6 py-5">
              <h2 className="font-black text-neutral-900">Bitácora operativa</h2>
            </div>
            {updates.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-500">
                Todavía no hay avances registrados.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {updates.map((update) => (
                  <div key={update.id} className="p-5">
                    <div className="font-bold text-neutral-900">{update.title}</div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      {update.update_type.replace("_", " ")} · {dateTime(update.created_at)}
                    </div>
                    {update.notes && (
                      <p className="mt-2 text-sm leading-6 text-neutral-600">
                        {update.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="grid content-start gap-6">
          <section className="rounded-3xl bg-neutral-800 p-6 text-white shadow-sm">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">
              {guide.title}
            </div>
            <div className="mt-5 grid gap-3">
              {guide.steps.map((step, index) => (
                <div key={step} className="flex gap-3 rounded-2xl bg-white/10 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-xs font-black text-white">
                    {index + 1}
                  </div>
                  <div className="text-sm leading-6 text-neutral-200">{step}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="font-black text-neutral-900">Origen comercial</h2>
            <div className="mt-5 grid gap-4 text-sm">
              <Info label="Cotización" value={quote?.quote_number ?? "—"} />
              <Info label="Estatus cotización" value={quote?.status ?? "—"} />
              <Info label="Oportunidad" value={opportunity?.title ?? "—"} />
              <Info label="Orden creada" value={dateTime(order.created_at)} />
              <Info label="Último movimiento" value={dateTime(order.updated_at)} />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {quote && (
                <Link
                  href={`/protected/comercial/cotizaciones/${quote.id}`}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-700"
                >
                  Ver cotización
                </Link>
              )}
              {opportunity && (
                <Link
                  href={`/protected/comercial/${order.opportunity_id}`}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-700"
                >
                  Ver oportunidad
                </Link>
              )}
            </div>
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
