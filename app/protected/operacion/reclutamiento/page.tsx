import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

const jobStatusLabels: Record<string, string> = {
  intake: "Levantamiento",
  sourcing: "Sourcing",
  screening: "Filtro",
  interviews: "Entrevistas",
  finalists: "Finalistas",
  filled: "Cubierta",
  on_hold: "Pausa",
  cancelled: "Cancelada",
};

const candidateStageLabels: Record<string, string> = {
  sourced: "Sourced",
  contacted: "Contactado",
  screening: "Filtro",
  interview: "Entrevista",
  assessment: "Evaluación",
  finalist: "Finalista",
  hired: "Contratado",
  rejected: "Descartado",
  withdrawn: "Declinó",
};

const funnelOrder = [
  "sourced",
  "contacted",
  "screening",
  "interview",
  "assessment",
  "finalist",
  "hired",
] as const;

async function requireUser() {
  const authClient = await createClient();
  const { data, error } = await authClient.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");
}

function daysBetween(start: string, end?: string | null) {
  const a = new Date(start).getTime();
  const b = end ? new Date(end).getTime() : Date.now();
  return Math.max(0, Math.floor((b - a) / 86400000));
}

function percent(value: number) {
  return `${Math.round(value)}%`;
}

export default async function RecruitmentMetricsPage() {
  await requireUser();
  const db = createAdminClient();

  const [jobsResult, candidatesResult, organizationsResult] = await Promise.all([
    db
      .from("recruitment_jobs")
      .select(
        "id,service_order_id,organization_id,vacancy_name,status,openings,location,created_at,filled_at,updated_at",
      )
      .order("created_at", { ascending: false }),
    db
      .from("recruitment_job_candidates")
      .select(
        "id,recruitment_job_id,person_id,stage,source,created_at,updated_at",
      )
      .order("created_at", { ascending: false }),
    db.from("organizations").select("id,name"),
  ]);

  const jobs = jobsResult.data ?? [];
  const candidates = candidatesResult.data ?? [];
  const organizations = new Map(
    (organizationsResult.data ?? []).map((item) => [item.id, item.name]),
  );

  const openJobs = jobs.filter(
    (job) => job.status !== "filled" && job.status !== "cancelled",
  );
  const filledJobs = jobs.filter((job) => job.status === "filled");
  const totalOpenings = openJobs.reduce(
    (sum, job) => sum + Number(job.openings || 0),
    0,
  );

  const completedCoverageDays = filledJobs
    .filter((job) => job.filled_at)
    .map((job) => daysBetween(job.created_at, job.filled_at));

  const avgCoverageDays = completedCoverageDays.length
    ? completedCoverageDays.reduce((sum, value) => sum + value, 0) /
      completedCoverageDays.length
    : 0;

  const hiredCandidates = candidates.filter((item) => item.stage === "hired");
  const conversion =
    candidates.length > 0 ? (hiredCandidates.length / candidates.length) * 100 : 0;

  const candidatesByJob = new Map<string, typeof candidates>();
  for (const candidate of candidates) {
    const list = candidatesByJob.get(candidate.recruitment_job_id) ?? [];
    list.push(candidate);
    candidatesByJob.set(candidate.recruitment_job_id, list);
  }

  const funnelCounts = funnelOrder.map((stage) => ({
    stage,
    count: candidates.filter((item) => item.stage === stage).length,
  }));

  const sourceMap = new Map<string, { total: number; hired: number }>();
  for (const candidate of candidates) {
    const source = candidate.source?.trim() || "Sin fuente";
    const current = sourceMap.get(source) ?? { total: 0, hired: 0 };
    current.total += 1;
    if (candidate.stage === "hired") current.hired += 1;
    sourceMap.set(source, current);
  }

  const sourceRows = Array.from(sourceMap.entries())
    .map(([source, values]) => ({
      source,
      ...values,
      conversion: values.total ? (values.hired / values.total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/protected/operacion"
            className="text-sm font-bold text-orange-600 hover:text-orange-700"
          >
            ← Volver a Operación
          </Link>
          <div className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Reclutamiento
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            Indicadores de Reclutamiento
          </h1>
          <p className="mt-2 max-w-3xl text-neutral-600">
            Cobertura, velocidad, volumen de candidatos, fuentes y conversión de los
            procesos operados por FactoRH.
          </p>
        </div>

        <div className="rounded-2xl bg-neutral-800 px-5 py-4 text-sm text-white shadow-sm">
          <div className="font-black">Lectura operativa</div>
          <div className="mt-1 text-neutral-300">
            Los tiempos de cobertura se calculan desde la creación de la vacante
            hasta que se marca como cubierta.
          </div>
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Vacantes abiertas" value={String(openJobs.length)} note="Procesos activos" />
        <Metric label="Posiciones abiertas" value={String(totalOpenings)} note="Headcount por cubrir" />
        <Metric label="Vacantes cubiertas" value={String(filledJobs.length)} note="Procesos cerrados" />
        <Metric
          label="Días promedio cobertura"
          value={completedCoverageDays.length ? avgCoverageDays.toFixed(1) : "—"}
          note="Vacantes con fecha de cierre"
        />
        <Metric label="Candidatos" value={String(candidates.length)} note="Total registrados" />
        <Metric
          label="Conversión a contratación"
          value={percent(conversion)}
          note={`${hiredCandidates.length} contratados`}
        />
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="font-black text-neutral-900">Embudo de candidatos</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Distribución actual por etapa del proceso de selección.
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            {funnelCounts.map((item) => {
              const max = Math.max(1, ...funnelCounts.map((x) => x.count));
              const width = Math.max(5, (item.count / max) * 100);

              return (
                <div key={item.stage}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold text-neutral-700">
                      {candidateStageLabels[item.stage] ?? item.stage}
                    </span>
                    <span className="font-black text-neutral-900">{item.count}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 px-6 py-5">
            <h2 className="font-black text-neutral-900">Fuentes de candidatos</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Volumen y contrataciones por origen registrado.
            </p>
          </div>

          {sourceRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-500">
              Todavía no hay fuentes registradas.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {sourceRows.map((row) => (
                <div key={row.source} className="grid grid-cols-[1fr_auto_auto] gap-4 p-5">
                  <div>
                    <div className="font-black text-neutral-900">{row.source}</div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {row.total} candidatos
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-neutral-900">{row.hired}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                      contratados
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-orange-600">
                      {percent(row.conversion)}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                      conversión
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="mt-7 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-6 py-5">
          <h2 className="font-black text-neutral-900">Desempeño por vacante</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Edad del proceso, candidatos, finalistas y contrataciones.
          </p>
        </div>

        {jobs.length === 0 ? (
          <div className="p-10 text-center text-sm text-neutral-500">
            Aún no hay vacantes operativas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-6 py-4">Vacante</th>
                  <th className="px-4 py-4">Cliente</th>
                  <th className="px-4 py-4">Estatus</th>
                  <th className="px-4 py-4 text-center">Días</th>
                  <th className="px-4 py-4 text-center">Candidatos</th>
                  <th className="px-4 py-4 text-center">Finalistas</th>
                  <th className="px-4 py-4 text-center">Contratados</th>
                  <th className="px-6 py-4 text-right">Abrir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {jobs.map((job) => {
                  const rows = candidatesByJob.get(job.id) ?? [];
                  const finalists = rows.filter(
                    (item) => item.stage === "finalist" || item.stage === "hired",
                  ).length;
                  const hired = rows.filter((item) => item.stage === "hired").length;
                  const days = daysBetween(job.created_at, job.filled_at);

                  return (
                    <tr key={job.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-5">
                        <div className="font-black text-neutral-900">
                          {job.vacancy_name}
                        </div>
                        <div className="mt-1 text-xs text-neutral-500">
                          {job.location || "Sin ubicación"} · {job.openings}{" "}
                          {Number(job.openings) === 1 ? "posición" : "posiciones"}
                        </div>
                      </td>
                      <td className="px-4 py-5 font-semibold text-neutral-700">
                        {organizations.get(job.organization_id) ?? "Empresa"}
                      </td>
                      <td className="px-4 py-5">
                        <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-700">
                          {jobStatusLabels[job.status] ?? job.status}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-center font-black text-neutral-900">
                        {days}
                      </td>
                      <td className="px-4 py-5 text-center font-bold text-neutral-800">
                        {rows.length}
                      </td>
                      <td className="px-4 py-5 text-center font-bold text-neutral-800">
                        {finalists}
                      </td>
                      <td className="px-4 py-5 text-center font-bold text-neutral-800">
                        {hired}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Link
                          href={`/protected/operacion/reclutamiento/${job.id}`}
                          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-700 hover:border-orange-300 hover:text-orange-700"
                        >
                          Ver proceso
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
