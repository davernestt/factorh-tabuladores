import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireUser() {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();

  if (authError || !authData?.claims) {
    redirect("/auth/login");
  }

  return authData.claims;
}

function dateTime(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(new Date(value));
}

function dateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

async function completeAgendaActivity(formData: FormData) {
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

export default async function AgendaComercialPage() {
  await requireUser();
  const db = createAdminClient();

  const [activitiesResult, opportunitiesResult, quotesResult, organizationsResult] =
    await Promise.all([
      db
        .from("sales_activities")
        .select(
          "id,opportunity_id,organization_id,subject,channel,scheduled_at,status",
        )
        .eq("status", "pending")
        .order("scheduled_at", { ascending: true, nullsFirst: false }),
      db
        .from("sales_opportunities")
        .select(
          "id,organization_id,title,stage,priority,next_action,next_action_at,estimated_value",
        ),
      db
        .from("sales_quotes")
        .select(
          "id,opportunity_id,organization_id,quote_number,status,total,sent_at,created_at,valid_until",
        )
        .in("status", ["sent", "follow_up"]),
      db.from("organizations").select("id,name"),
    ]);

  const activities = activitiesResult.data ?? [];
  const opportunities = (opportunitiesResult.data ?? []).filter(
    (item) => item.stage !== "won" && item.stage !== "lost",
  );
  const quotes = quotesResult.data ?? [];
  const organizations = new Map(
    (organizationsResult.data ?? []).map((item) => [item.id, item.name]),
  );

  const now = new Date();
  const todayKey = dateKey(now);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const overdue = activities.filter(
    (item) => item.scheduled_at && new Date(item.scheduled_at) < now &&
      dateKey(new Date(item.scheduled_at)) !== todayKey,
  );

  const today = activities.filter(
    (item) => item.scheduled_at && dateKey(new Date(item.scheduled_at)) === todayKey,
  );

  const noNextAction = opportunities.filter(
    (item) => !item.next_action_at,
  );

  const staleQuotes = quotes.filter((item) => {
    const reference = item.sent_at || item.created_at;
    return reference && new Date(reference) < threeDaysAgo;
  });

  const channelLabel: Record<string, string> = {
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

  const money = (value: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href="/protected/comercial"
            className="text-sm font-bold text-orange-600 hover:text-orange-700"
          >
            ← Volver a Comercial
          </Link>
          <div className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Agenda comercial
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            Lo que requiere tu atención
          </h1>
          <p className="mt-2 max-w-3xl text-neutral-600">
            Primero atiende vencidos, después lo programado para hoy y finalmente
            oportunidades o cotizaciones que se estén enfriando.
          </p>
        </div>

        <Link
          href="/protected/comercial/nuevo"
          className="rounded-xl bg-orange-500 px-5 py-3 text-center text-sm font-bold text-white shadow-sm hover:bg-orange-600"
        >
          + Nuevo prospecto
        </Link>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AlertMetric
          label="Vencidos"
          value={overdue.length}
          note="Seguimientos anteriores a hoy"
          tone="red"
        />
        <AlertMetric
          label="Para hoy"
          value={today.length}
          note="Actividades programadas"
          tone="orange"
        />
        <AlertMetric
          label="Sin próxima acción"
          value={noNextAction.length}
          note="Oportunidades abiertas"
          tone="amber"
        />
        <AlertMetric
          label="Cotizaciones frías"
          value={staleQuotes.length}
          note="Sin movimiento por más de 3 días"
          tone="neutral"
        />
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <AgendaSection
          title="🔴 Seguimientos vencidos"
          subtitle="Atiéndelos primero para recuperar conversaciones."
          empty="No tienes seguimientos vencidos."
        >
          {overdue.map((item) => (
            <ActivityRow
              key={item.id}
              item={item}
              company={organizations.get(item.organization_id) ?? "Empresa"}
              channelLabel={channelLabel[item.channel ?? ""] ?? item.channel ?? "Seguimiento"}
              action={completeAgendaActivity}
            />
          ))}
        </AgendaSection>

        <AgendaSection
          title="🟠 Agenda de hoy"
          subtitle="Contactos y compromisos programados para hoy."
          empty="No tienes actividades programadas para hoy."
        >
          {today.map((item) => (
            <ActivityRow
              key={item.id}
              item={item}
              company={organizations.get(item.organization_id) ?? "Empresa"}
              channelLabel={channelLabel[item.channel ?? ""] ?? item.channel ?? "Seguimiento"}
              action={completeAgendaActivity}
            />
          ))}
        </AgendaSection>

        <AgendaSection
          title="⚠️ Oportunidades sin próxima acción"
          subtitle="Si no hay siguiente paso, el prospecto se puede perder."
          empty="Todas tus oportunidades abiertas tienen seguimiento."
        >
          {noNextAction.map((item) => (
            <Link
              key={item.id}
              href={`/protected/comercial/${item.id}`}
              className="block border-b border-neutral-100 p-5 transition last:border-b-0 hover:bg-neutral-50"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-black text-neutral-900">
                    {organizations.get(item.organization_id) ?? "Empresa"}
                  </div>
                  <div className="mt-1 text-sm text-neutral-600">{item.title}</div>
                </div>
                <div className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-black uppercase text-red-700">
                  Agendar seguimiento
                </div>
              </div>
            </Link>
          ))}
        </AgendaSection>

        <AgendaSection
          title="📄 Cotizaciones que requieren seguimiento"
          subtitle="Propuestas enviadas o en seguimiento con más de 3 días."
          empty="No tienes cotizaciones frías."
        >
          {staleQuotes.map((quote) => (
            <Link
              key={quote.id}
              href={`/protected/comercial/cotizaciones/${quote.id}`}
              className="block border-b border-neutral-100 p-5 transition last:border-b-0 hover:bg-neutral-50"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-black text-neutral-900">
                    {quote.quote_number}
                  </div>
                  <div className="mt-1 text-sm text-neutral-600">
                    {organizations.get(quote.organization_id) ?? "Empresa"} ·{" "}
                    {dateTime(quote.sent_at || quote.created_at)}
                  </div>
                </div>
                <div className="text-lg font-black text-neutral-900">
                  {money(Number(quote.total || 0))}
                </div>
              </div>
            </Link>
          ))}
        </AgendaSection>
      </div>
    </div>
  );
}

function AlertMetric({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: number;
  note: string;
  tone: "red" | "orange" | "amber" | "neutral";
}) {
  const classes = {
    red: "border-red-200 bg-red-50 text-red-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    neutral: "border-neutral-200 bg-white text-neutral-800",
  }[tone];

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${classes}`}>
      <div className="text-xs font-black uppercase tracking-[0.16em]">{label}</div>
      <div className="mt-3 text-4xl font-black">{value}</div>
      <div className="mt-2 text-sm opacity-75">{note}</div>
    </div>
  );
}

function AgendaSection({
  title,
  subtitle,
  empty,
  children,
}: {
  title: string;
  subtitle: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 px-6 py-5">
        <h2 className="font-black text-neutral-900">{title}</h2>
        <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
      </div>
      {hasChildren ? (
        <div>{children}</div>
      ) : (
        <div className="p-8 text-center text-sm text-neutral-500">{empty}</div>
      )}
    </section>
  );
}

function ActivityRow({
  item,
  company,
  channelLabel,
  action,
}: {
  item: {
    id: string;
    opportunity_id: string | null;
    subject: string;
    scheduled_at: string | null;
  };
  company: string;
  channelLabel: string;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="border-b border-neutral-100 p-5 last:border-b-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-black text-neutral-900">{company}</div>
          <div className="mt-1 text-sm font-semibold text-neutral-700">
            {item.subject}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            {channelLabel} · {dateTime(item.scheduled_at)}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {item.opportunity_id && (
            <Link
              href={`/protected/comercial/${item.opportunity_id}`}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-700"
            >
              Abrir
            </Link>
          )}
          {item.opportunity_id && (
            <form action={action}>
              <input type="hidden" name="activity_id" value={item.id} />
              <input
                type="hidden"
                name="opportunity_id"
                value={item.opportunity_id}
              />
              <button
                type="submit"
                className="rounded-lg bg-neutral-800 px-3 py-2 text-xs font-bold text-white"
              >
                Marcar realizada
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
