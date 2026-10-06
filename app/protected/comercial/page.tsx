import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

const stageOrder = [
  ["new", "Nuevo"],
  ["contacted", "Contactado"],
  ["responded", "Respondió"],
  ["qualified", "Necesidad detectada"],
  ["meeting", "Reunión"],
  ["proposal_sent", "Cotización enviada"],
  ["follow_up", "Seguimiento"],
] as const;

const serviceLabels: Record<string, string> = {
  recruitment: "Reclutamiento y Headhunting",
  ese: "Estudios Socioeconómicos",
  hr_consulting: "Consultoría RH",
};

type Opportunity = {
  id: string;
  organization_id: string;
  title: string;
  service_type: string;
  stage: string;
  estimated_value: number | string;
  next_action: string | null;
  next_action_at: string | null;
  priority: string;
};

type Organization = {
  id: string;
  name: string;
};

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function shortDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
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

export default async function ComercialPage() {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();

  if (authError || !authData?.claims) {
    redirect("/auth/login");
  }

  const db = createAdminClient();

  const [opportunitiesResult, organizationsResult, activitiesResult] =
    await Promise.all([
      db
        .from("sales_opportunities")
        .select(
          "id,organization_id,title,service_type,stage,estimated_value,next_action,next_action_at,priority",
        )
        .order("created_at", { ascending: false }),
      db.from("organizations").select("id,name"),
      db
        .from("sales_activities")
        .select("id,status,scheduled_at")
        .eq("status", "pending"),
    ]);

  const opportunities = (opportunitiesResult.data ?? []) as Opportunity[];
  const organizations = new Map(
    ((organizationsResult.data ?? []) as Organization[]).map((item) => [
      item.id,
      item.name,
    ]),
  );

  const open = opportunities.filter(
    (item) => item.stage !== "won" && item.stage !== "lost",
  );
  const won = opportunities.filter((item) => item.stage === "won");
  const proposals = opportunities.filter(
    (item) => item.stage === "proposal_sent" || item.stage === "follow_up",
  );

  const pipelineValue = open.reduce(
    (sum, item) => sum + Number(item.estimated_value || 0),
    0,
  );

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const todayFollowUps = (activitiesResult.data ?? []).filter((item) => {
    if (!item.scheduled_at) return false;
    const value = new Date(item.scheduled_at);
    return value >= start && value <= end;
  }).length;

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Panel administrativo
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            Comercial
          </h1>
          <p className="mt-2 max-w-3xl text-neutral-600">
            Controla prospectos, oportunidades, seguimientos y cierres de FactoRH.
            Ninguna oportunidad debe quedarse sin una próxima acción.
          </p>
        </div>

        <Link
          href="/protected/comercial/nuevo"
          className="rounded-xl bg-orange-500 px-5 py-3 text-center text-sm font-bold text-white shadow-sm hover:bg-orange-600"
        >
          + Nuevo prospecto
        </Link>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Pipeline potencial"
          value={money(pipelineValue)}
          note="Valor de oportunidades abiertas"
        />
        <Metric
          label="Prospectos"
          value={String(open.length)}
          note="Oportunidades activas"
        />
        <Metric
          label="Seguimientos hoy"
          value={String(todayFollowUps)}
          note="Actividades programadas"
        />
        <Metric
          label="Cotizaciones"
          value={String(proposals.length)}
          note="Propuestas y seguimientos abiertos"
        />
        <Metric
          label="Clientes ganados"
          value={String(won.length)}
          note="Cierres registrados"
        />
      </div>

      <section className="mt-7 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-neutral-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-bold text-neutral-900">Pipeline comercial</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Vista operativa de oportunidades por etapa.
            </p>
          </div>
          <div className="rounded-full bg-orange-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-orange-700">
            {open.length} oportunidades abiertas
          </div>
        </div>

        <div className="overflow-x-auto p-5">
          <div className="grid min-w-[1450px] grid-cols-7 gap-4">
            {stageOrder.map(([key, label]) => {
              const stageItems = opportunities.filter((item) => item.stage === key);

              return (
                <div
                  key={key}
                  className="min-h-64 rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-neutral-800">
                      {label}
                    </h3>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-neutral-500 shadow-sm">
                      {stageItems.length}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {stageItems.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-4 text-center text-xs leading-5 text-neutral-400">
                        Sin oportunidades en esta etapa.
                      </div>
                    ) : (
                      stageItems.map((item) => (
                        <Link
                          key={item.id}
                          href={`/protected/comercial/${item.id}`}
                          className="block rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-bold text-neutral-900">
                              {organizations.get(item.organization_id) ?? "Empresa"}
                            </div>
                            {item.priority === "high" && (
                              <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-black uppercase text-orange-700">
                                Alta
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-neutral-700">
                            {item.title}
                          </div>
                          <div className="mt-2 text-xs font-semibold text-orange-600">
                            {serviceLabels[item.service_type] ?? item.service_type}
                          </div>
                          <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                            <span>{money(Number(item.estimated_value || 0))}</span>
                            <span>{shortDate(item.next_action_at)}</span>
                          </div>
                          <div className="mt-2 text-xs leading-5 text-neutral-500">
                            {item.next_action || "Sin próxima acción"}
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-neutral-900">Servicios comerciales</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Las oportunidades se clasifican por línea de negocio para medir qué vende mejor.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {Object.entries(serviceLabels).map(([key, label], index) => {
              const count = opportunities.filter(
                (item) => item.service_type === key,
              ).length;
              return (
                <div key={key} className="rounded-2xl border border-neutral-200 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 font-black text-white">
                    {index + 1}
                  </div>
                  <div className="mt-4 font-bold text-neutral-900">{label}</div>
                  <div className="mt-2 text-2xl font-black text-neutral-900">{count}</div>
                  <div className="text-xs text-neutral-500">oportunidades registradas</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl bg-neutral-800 p-6 text-white shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">
            Disciplina comercial
          </div>
          <h2 className="mt-3 text-2xl font-black">
            Toda oportunidad debe tener una próxima acción.
          </h2>
          <p className="mt-3 text-sm leading-6 text-neutral-300">
            El sistema ya está preparado para guardar la próxima acción y su fecha.
            Los siguientes pasos serán alertas, edición de etapas y seguimiento desde
            la propia ficha del prospecto.
          </p>
        </section>
      </div>
    </div>
  );
}
