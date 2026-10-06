import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

const serviceLabels: Record<string, string> = {
  recruitment: "Reclutamiento y Headhunting",
  ese: "Estudios Socioeconómicos",
  hr_consulting: "Consultoría RH",
};

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

function dateLabel(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeZone: "America/Mexico_City",
  }).format(new Date(value));
}

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();

  if (authError || !authData?.claims) {
    redirect("/auth/login");
  }

  const { id } = await params;
  const db = createAdminClient();

  const { data: organization, error } = await db
    .from("organizations")
    .select(
      "id,name,phone,commercial_email,website,notes,lifecycle_stage,created_at,updated_at",
    )
    .eq("id", id)
    .single();

  if (error || !organization) notFound();

  const [contactsResult, opportunitiesResult, quotesResult, activitiesResult] =
    await Promise.all([
      db
        .from("sales_contacts")
        .select("id,first_name,last_name,job_title,email,phone,is_primary,active")
        .eq("organization_id", id)
        .order("is_primary", { ascending: false }),
      db
        .from("sales_opportunities")
        .select(
          "id,title,service_type,stage,estimated_value,next_action,next_action_at,created_at,updated_at",
        )
        .eq("organization_id", id)
        .order("created_at", { ascending: false }),
      db
        .from("sales_quotes")
        .select(
          "id,quote_number,status,total,valid_until,accepted_at,created_at,opportunity_id",
        )
        .eq("organization_id", id)
        .order("created_at", { ascending: false }),
      db
        .from("sales_activities")
        .select(
          "id,opportunity_id,subject,activity_type,channel,status,scheduled_at,completed_at,created_at",
        )
        .eq("organization_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const contacts = contactsResult.data ?? [];
  const opportunities = opportunitiesResult.data ?? [];
  const quotes = quotesResult.data ?? [];
  const activities = activitiesResult.data ?? [];

  const acceptedQuotes = quotes.filter((item) => item.status === "accepted");
  const totalSales = acceptedQuotes.reduce(
    (sum, item) => sum + Number(item.total || 0),
    0,
  );
  const wonOpportunities = opportunities.filter((item) => item.stage === "won");
  const openOpportunities = opportunities.filter(
    (item) => item.stage !== "won" && item.stage !== "lost",
  );

  const salesByService = Object.keys(serviceLabels).map((service) => {
    const opportunityIds = new Set(
      opportunities
        .filter((item) => item.service_type === service)
        .map((item) => item.id),
    );

    const amount = acceptedQuotes
      .filter((quote) => opportunityIds.has(quote.opportunity_id))
      .reduce((sum, quote) => sum + Number(quote.total || 0), 0);

    return {
      service,
      amount,
      sales: acceptedQuotes.filter((quote) =>
        opportunityIds.has(quote.opportunity_id),
      ).length,
    };
  });

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href="/protected/comercial/clientes"
            className="text-sm font-bold text-orange-600 hover:text-orange-700"
          >
            ← Volver a Clientes
          </Link>
          <div className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Cliente FactoRH
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            {organization.name}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {organization.phone && (
              <span className="rounded-full bg-white px-3 py-1.5 text-neutral-600 shadow-sm ring-1 ring-neutral-200">
                {organization.phone}
              </span>
            )}
            {organization.commercial_email && (
              <span className="rounded-full bg-white px-3 py-1.5 text-neutral-600 shadow-sm ring-1 ring-neutral-200">
                {organization.commercial_email}
              </span>
            )}
          </div>
        </div>

        <Link
          href="/protected/comercial/nuevo"
          className="rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-bold text-orange-700 hover:bg-orange-100"
        >
          + Nueva oportunidad
        </Link>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Ventas acumuladas"
          value={money(totalSales)}
          note="Cotizaciones aceptadas"
        />
        <Metric
          label="Negocios ganados"
          value={String(wonOpportunities.length)}
          note="Oportunidades cerradas"
        />
        <Metric
          label="Oportunidades abiertas"
          value={String(openOpportunities.length)}
          note="Venta adicional potencial"
        />
        <Metric
          label="Contactos"
          value={String(contacts.filter((item) => item.active).length)}
          note="Personas relacionadas"
        />
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid content-start gap-6">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="font-black text-neutral-900">Contactos</h2>
            <div className="mt-5 grid gap-3">
              {contacts.length === 0 ? (
                <div className="text-sm text-neutral-500">Sin contactos registrados.</div>
              ) : (
                contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="rounded-2xl border border-neutral-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-black text-neutral-900">
                          {[contact.first_name, contact.last_name]
                            .filter(Boolean)
                            .join(" ")}
                        </div>
                        <div className="mt-1 text-sm text-neutral-500">
                          {contact.job_title || "Sin puesto"}
                        </div>
                      </div>
                      {contact.is_primary && (
                        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black uppercase text-orange-700">
                          Principal
                        </span>
                      )}
                    </div>
                    <div className="mt-3 text-xs leading-5 text-neutral-500">
                      {contact.phone || "Sin teléfono"}
                      {contact.email ? ` · ${contact.email}` : ""}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="font-black text-neutral-900">Venta por servicio</h2>
            <div className="mt-5 grid gap-3">
              {salesByService.map((item) => (
                <div
                  key={item.service}
                  className="rounded-2xl border border-neutral-200 p-4"
                >
                  <div className="text-sm font-bold text-neutral-800">
                    {serviceLabels[item.service]}
                  </div>
                  <div className="mt-2 text-2xl font-black text-neutral-900">
                    {money(item.amount)}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {item.sales} {item.sales === 1 ? "venta" : "ventas"}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid content-start gap-6">
          <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 px-6 py-5">
              <h2 className="font-black text-neutral-900">Oportunidades</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Historial comercial completo de la empresa.
              </p>
            </div>

            {opportunities.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-500">
                Sin oportunidades registradas.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {opportunities.map((item) => (
                  <Link
                    key={item.id}
                    href={`/protected/comercial/${item.id}`}
                    className="flex flex-col gap-3 p-5 transition hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-black text-neutral-900">{item.title}</div>
                      <div className="mt-1 text-xs font-semibold text-neutral-500">
                        {serviceLabels[item.service_type] ?? item.service_type} ·{" "}
                        {stageLabels[item.stage] ?? item.stage}
                      </div>
                    </div>
                    <div className="text-lg font-black text-neutral-900">
                      {money(Number(item.estimated_value || 0))}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 px-6 py-5">
              <h2 className="font-black text-neutral-900">Cotizaciones</h2>
            </div>

            {quotes.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-500">
                Sin cotizaciones registradas.
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
                        {quoteStatusLabels[quote.status] ?? quote.status} ·{" "}
                        {dateLabel(quote.accepted_at || quote.created_at)}
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

          <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 px-6 py-5">
              <h2 className="font-black text-neutral-900">Actividad reciente</h2>
            </div>

            {activities.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-500">
                Sin actividad registrada.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {activities.map((activity) => (
                  <div key={activity.id} className="p-5">
                    <div className="font-bold text-neutral-900">
                      {activity.subject}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {activity.status === "completed" ? "Realizada" : "Pendiente"} ·{" "}
                      {dateLabel(
                        activity.completed_at ||
                          activity.scheduled_at ||
                          activity.created_at,
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </div>
      <div className="mt-3 text-3xl font-black tracking-tight text-neutral-900">
        {value}
      </div>
      <div className="mt-2 text-sm text-neutral-500">{note}</div>
    </div>
  );
}
