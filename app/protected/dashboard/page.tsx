import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

const serviceLabels: Record<string, string> = {
  recruitment: "Reclutamiento y Headhunting",
  ese: "Estudios Socioeconómicos",
  hr_consulting: "Consultoría RH",
};

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function dateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function monthKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
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

export default async function ExecutiveDashboardPage() {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();

  if (authError || !authData?.claims) {
    redirect("/auth/login");
  }

  const db = createAdminClient();

  const [
    opportunitiesResult,
    quotesResult,
    organizationsResult,
    activitiesResult,
    ordersResult,
    recruitmentJobsResult,
    eseCasesResult,
    consultingProjectsResult,
    consultingTasksResult,
    assessmentsResult,
  ] = await Promise.all([
    db
      .from("sales_opportunities")
      .select(
        "id,organization_id,title,service_type,stage,estimated_value,next_action_at,created_at,updated_at",
      ),
    db
      .from("sales_quotes")
      .select(
        "id,opportunity_id,organization_id,quote_number,status,total,accepted_at,sent_at,created_at",
      ),
    db.from("organizations").select("id,name,lifecycle_stage"),
    db
      .from("sales_activities")
      .select("id,opportunity_id,organization_id,subject,status,scheduled_at")
      .eq("status", "pending"),
    db
      .from("service_orders")
      .select(
        "id,organization_id,service_type,title,status,target_date,commercial_value,updated_at",
      ),
    db
      .from("recruitment_jobs")
      .select(
        "id,service_order_id,organization_id,vacancy_name,status,openings,created_at,filled_at",
      ),
    db
      .from("ese_cases")
      .select(
        "id,service_order_id,organization_id,case_name,status,result,due_date,created_at",
      ),
    db
      .from("consulting_projects")
      .select(
        "id,service_order_id,organization_id,title,status,target_date,created_at",
      ),
    db
      .from("consulting_tasks")
      .select("id,consulting_project_id,title,status,due_date"),
    db
      .from("assessment_assignments")
      .select("id,status,created_at,completed_at"),
  ]);

  const opportunities = opportunitiesResult.data ?? [];
  const quotes = quotesResult.data ?? [];
  const organizations = organizationsResult.data ?? [];
  const activities = activitiesResult.data ?? [];
  const orders = ordersResult.data ?? [];
  const recruitmentJobs = recruitmentJobsResult.data ?? [];
  const eseCases = eseCasesResult.data ?? [];
  const consultingProjects = consultingProjectsResult.data ?? [];
  const consultingTasks = consultingTasksResult.data ?? [];
  const assessments = assessmentsResult.data ?? [];

  const organizationNames = new Map(
    organizations.map((item) => [item.id, item.name]),
  );
  const opportunitiesById = new Map(
    opportunities.map((item) => [item.id, item]),
  );

  const now = new Date();
  const today = dateKey(now);
  const currentMonth = monthKey(now);

  const openOpportunities = opportunities.filter(
    (item) => item.stage !== "won" && item.stage !== "lost",
  );
  const pipelineValue = openOpportunities.reduce(
    (sum, item) => sum + Number(item.estimated_value || 0),
    0,
  );

  const acceptedQuotes = quotes.filter((item) => item.status === "accepted");
  const acceptedThisMonth = acceptedQuotes.filter(
    (item) => item.accepted_at && monthKey(new Date(item.accepted_at)) === currentMonth,
  );
  const salesThisMonth = acceptedThisMonth.reduce(
    (sum, item) => sum + Number(item.total || 0),
    0,
  );

  const clients = organizations.filter((item) => item.lifecycle_stage === "client");
  const activeOrders = orders.filter(
    (item) => item.status !== "completed" && item.status !== "cancelled",
  );

  const overdueActivities = activities.filter(
    (item) =>
      item.scheduled_at &&
      new Date(item.scheduled_at) < now &&
      dateKey(new Date(item.scheduled_at)) !== today,
  );

  const todayActivities = activities.filter(
    (item) =>
      item.scheduled_at && dateKey(new Date(item.scheduled_at)) === today,
  );

  const openWithoutNextAction = openOpportunities.filter(
    (item) => !item.next_action_at,
  );

  const overdueOrders = activeOrders.filter(
    (item) => item.target_date && item.target_date < today,
  );

  const activeRecruitment = recruitmentJobs.filter(
    (item) => item.status !== "filled" && item.status !== "cancelled",
  );
  const openPositions = activeRecruitment.reduce(
    (sum, item) => sum + Number(item.openings || 0),
    0,
  );

  const activeEse = eseCases.filter(
    (item) => item.status !== "delivered" && item.status !== "cancelled",
  );
  const overdueEse = activeEse.filter(
    (item) => item.due_date && item.due_date < today,
  );

  const activeConsulting = consultingProjects.filter(
    (item) => item.status !== "completed" && item.status !== "cancelled",
  );
  const overdueConsultingTasks = consultingTasks.filter(
    (item) =>
      item.status !== "completed" &&
      item.status !== "cancelled" &&
      item.due_date &&
      item.due_date < today,
  );

  const pendingAssessments = assessments.filter(
    (item) => item.status === "pending" || item.status === "in_progress",
  );
  const completedAssessmentsThisMonth = assessments.filter(
    (item) =>
      item.status === "completed" &&
      item.completed_at &&
      monthKey(new Date(item.completed_at)) === currentMonth,
  );

  const serviceSales = Object.keys(serviceLabels).map((serviceType) => {
    const relevantOpportunityIds = new Set(
      opportunities
        .filter((item) => item.service_type === serviceType)
        .map((item) => item.id),
    );

    const monthSales = acceptedThisMonth
      .filter((quote) => relevantOpportunityIds.has(quote.opportunity_id))
      .reduce((sum, quote) => sum + Number(quote.total || 0), 0);

    const pipeline = openOpportunities
      .filter((item) => item.service_type === serviceType)
      .reduce((sum, item) => sum + Number(item.estimated_value || 0), 0);

    return {
      serviceType,
      monthSales,
      pipeline,
    };
  });

  const maxServiceValue = Math.max(
    1,
    ...serviceSales.flatMap((item) => [item.monthSales, item.pipeline]),
  );

  const criticalAlerts = [
    {
      label: "Seguimientos vencidos",
      value: overdueActivities.length,
      href: "/protected/comercial/agenda",
      note: "Contactos comerciales fuera de fecha",
    },
    {
      label: "Oportunidades sin próxima acción",
      value: openWithoutNextAction.length,
      href: "/protected/comercial/agenda",
      note: "Prospectos que pueden enfriarse",
    },
    {
      label: "Órdenes vencidas",
      value: overdueOrders.length,
      href: "/protected/operacion",
      note: "Servicios fuera de fecha objetivo",
    },
    {
      label: "ESE vencidos",
      value: overdueEse.length,
      href: "/protected/operacion",
      note: "Estudios con compromiso superado",
    },
    {
      label: "Tareas de consultoría vencidas",
      value: overdueConsultingTasks.length,
      href: "/protected/operacion",
      note: "Entregables o actividades atrasadas",
    },
  ].filter((item) => item.value > 0);

  const totalCritical = criticalAlerts.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  const recentSales = [...acceptedQuotes]
    .sort((a, b) => {
      const aDate = a.accepted_at || a.created_at;
      const bDate = b.accepted_at || b.created_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    })
    .slice(0, 6);

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Dirección FactoRH
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            Dashboard Ejecutivo
          </h1>
          <p className="mt-2 max-w-3xl text-neutral-600">
            Vista integral de ventas, clientes, operación y capacidad de entrega.
          </p>
        </div>

        <div
          className={
            totalCritical > 0
              ? "rounded-2xl border border-red-200 bg-red-50 px-5 py-4 shadow-sm"
              : "rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm"
          }
        >
          <div className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
            Atención directiva
          </div>
          <div className="mt-1 text-2xl font-black text-neutral-900">
            {totalCritical}
          </div>
          <div className="text-xs text-neutral-600">
            {totalCritical === 1 ? "pendiente crítico" : "pendientes críticos"}
          </div>
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric
          label="Ventas del mes"
          value={money(salesThisMonth)}
          note={`${acceptedThisMonth.length} cierres aceptados`}
        />
        <Metric
          label="Pipeline"
          value={money(pipelineValue)}
          note={`${openOpportunities.length} oportunidades abiertas`}
        />
        <Metric
          label="Clientes"
          value={String(clients.length)}
          note="Empresas en cartera"
        />
        <Metric
          label="Servicios activos"
          value={String(activeOrders.length)}
          note="Órdenes por entregar"
        />
        <Metric
          label="Agenda hoy"
          value={String(todayActivities.length)}
          note="Seguimientos programados"
        />
        <Metric
          label="Evaluaciones pendientes"
          value={String(pendingAssessments.length)}
          note={`${completedAssessmentsThisMonth.length} completadas este mes`}
        />
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-black text-neutral-900">Ventas y pipeline por servicio</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Compara lo cerrado este mes contra el valor comercial abierto.
              </p>
            </div>
            <Link
              href="/protected/comercial"
              className="text-xs font-bold text-orange-600 hover:text-orange-700"
            >
              Abrir Comercial →
            </Link>
          </div>

          <div className="mt-6 grid gap-5">
            {serviceSales.map((item) => (
              <div key={item.serviceType}>
                <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="font-bold text-neutral-800">
                    {serviceLabels[item.serviceType]}
                  </div>
                  <div className="text-xs font-semibold text-neutral-500">
                    Vendido {money(item.monthSales)} · Pipeline {money(item.pipeline)}
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{
                        width: `${Math.max(
                          item.monthSales > 0 ? 4 : 0,
                          (item.monthSales / maxServiceValue) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-neutral-700"
                      style={{
                        width: `${Math.max(
                          item.pipeline > 0 ? 4 : 0,
                          (item.pipeline / maxServiceValue) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-neutral-500">
            <span>■ Naranja: venta cerrada del mes</span>
            <span>■ Gris oscuro: pipeline abierto</span>
          </div>
        </section>

        <section className="rounded-3xl bg-neutral-800 p-6 text-white shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">
                Pulso operativo
              </div>
              <h2 className="mt-2 text-xl font-black">Qué está en ejecución</h2>
            </div>
            <Link
              href="/protected/operacion"
              className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white"
            >
              Operación →
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <PulseRow
              label="Vacantes activas"
              value={activeRecruitment.length}
              detail={`${openPositions} posiciones por cubrir`}
            />
            <PulseRow
              label="ESE activos"
              value={activeEse.length}
              detail={overdueEse.length ? `${overdueEse.length} vencidos` : "En tiempo"}
            />
            <PulseRow
              label="Proyectos consultoría"
              value={activeConsulting.length}
              detail={
                overdueConsultingTasks.length
                  ? `${overdueConsultingTasks.length} tareas vencidas`
                  : "Sin tareas vencidas"
              }
            />
            <PulseRow
              label="Órdenes activas"
              value={activeOrders.length}
              detail={overdueOrders.length ? `${overdueOrders.length} vencidas` : "En control"}
            />
          </div>
        </section>
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-6 py-5">
            <div>
              <h2 className="font-black text-neutral-900">Alertas prioritarias</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Pendientes que requieren intervención o seguimiento.
              </p>
            </div>
            <Link
              href="/protected/comercial/agenda"
              className="text-xs font-bold text-orange-600 hover:text-orange-700"
            >
              Agenda →
            </Link>
          </div>

          {criticalAlerts.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-lg font-black text-neutral-900">
                Sin alertas críticas
              </div>
              <p className="mt-2 text-sm text-neutral-500">
                Los seguimientos y compromisos registrados están al día.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {criticalAlerts.map((alert) => (
                <Link
                  key={alert.label}
                  href={alert.href}
                  className="flex items-center justify-between gap-4 p-5 transition hover:bg-neutral-50"
                >
                  <div>
                    <div className="font-bold text-neutral-900">{alert.label}</div>
                    <div className="mt-1 text-xs text-neutral-500">{alert.note}</div>
                  </div>
                  <div className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-red-50 px-3 font-black text-red-700">
                    {alert.value}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 px-6 py-5">
            <h2 className="font-black text-neutral-900">Ventas recientes</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Últimas cotizaciones aceptadas.
            </p>
          </div>

          {recentSales.length === 0 ? (
            <div className="p-10 text-center text-sm text-neutral-500">
              Aún no hay ventas aceptadas registradas.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {recentSales.map((quote) => {
                const opportunity = opportunitiesById.get(quote.opportunity_id);
                return (
                  <Link
                    key={quote.id}
                    href={`/protected/comercial/cotizaciones/${quote.id}`}
                    className="flex flex-col gap-3 p-5 transition hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-black text-neutral-900">
                        {organizationNames.get(quote.organization_id) ?? "Cliente"}
                      </div>
                      <div className="mt-1 text-sm text-neutral-600">
                        {opportunity?.title ?? quote.quote_number}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-neutral-400">
                        {opportunity
                          ? serviceLabels[opportunity.service_type] ??
                            opportunity.service_type
                          : quote.quote_number}{" "}
                        · {dateTime(quote.accepted_at || quote.created_at)}
                      </div>
                    </div>
                    <div className="text-lg font-black text-neutral-900">
                      {money(Number(quote.total || 0))}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="mt-7 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="font-black text-neutral-900">Accesos rápidos</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Entra directamente a los módulos que requieren gestión.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink
            href="/protected/comercial"
            title="Comercial"
            note="Pipeline, agenda, cotizaciones y clientes"
          />
          <QuickLink
            href="/protected/operacion"
            title="Operación"
            note="Órdenes y ejecución de servicios"
          />
          <QuickLink
            href="/protected/operacion/reclutamiento"
            title="Indicadores de Reclutamiento"
            note="Cobertura, fuentes y conversión"
          />
          <QuickLink
            href="/protected"
            title="Evaluaciones"
            note="Asignaciones, avance y resultados"
          />
        </div>
      </section>
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

function PulseRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/10 p-4">
      <div>
        <div className="text-sm font-bold text-white">{label}</div>
        <div className="mt-1 text-xs text-neutral-300">{detail}</div>
      </div>
      <div className="text-3xl font-black text-white">{value}</div>
    </div>
  );
}

function QuickLink({
  href,
  title,
  note,
}: {
  href: string;
  title: string;
  note: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 transition hover:border-orange-300 hover:bg-orange-50"
    >
      <div className="font-black text-neutral-900">{title}</div>
      <div className="mt-2 text-sm leading-6 text-neutral-500">{note}</div>
    </Link>
  );
}
