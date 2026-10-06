import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAppUser } from "@/lib/auth/app-user";
import Link from "next/link";
import { redirect } from "next/navigation";

const statusLabels: Record<string, string> = {
  requested: "Solicitado",
  unassigned: "Por asignar",
  pending_contact: "Pendiente de contacto",
  scheduled: "Visita programada",
  fieldwork: "En campo",
  waiting_info: "Pendiente de información",
  verification: "Verificación",
  review: "En revisión",
  report: "Reporte",
  delivered: "Terminado",
  cancelled: "Cancelado",
};

const resultLabels: Record<string, string> = {
  recommended: "Recomendable",
  with_reservations: "Con observaciones",
  not_recommended: "No recomendable",
  not_conclusive: "No concluyente",
};

function dateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function shortDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeZone: "America/Mexico_City",
  }).format(new Date(value));
}

export default async function EseDashboardPage() {
  const auth = await createClient();
  const { data, error } = await auth.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const appUser = await getCurrentAppUser();
  if (!appUser || !["super_admin", "ese_operator"].includes(appUser.role)) {
    redirect("/auth/login?error=unauthorized");
  }

  const db = createAdminClient();
  const [casesResult, orgsResult] = await Promise.all([
    db
      .from("ese_cases")
      .select("id,organization_id,case_name,position_name,study_type,status,result,due_date,progress,assigned_to,service_order_id,created_at,updated_at")
      .order("created_at", { ascending: false }),
    db.from("organizations").select("id,name"),
  ]);

  if (casesResult.error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-7">
        <h1 className="font-black text-red-800">No fue posible cargar Estudios Socioeconómicos</h1>
        <p className="mt-2 text-sm text-red-700">{casesResult.error.message}</p>
      </div>
    );
  }

  const cases = casesResult.data ?? [];
  const orgNames = new Map((orgsResult.data ?? []).map((item) => [item.id, item.name]));
  const today = dateKey(new Date());

  const active = cases.filter((item) => !["delivered", "cancelled"].includes(item.status));
  const completed = cases.filter((item) => item.status === "delivered");
  const overdue = active.filter((item) => item.due_date && item.due_date < today);
  const pendingInfo = cases.filter((item) => item.status === "waiting_info");
  const unassigned = cases.filter((item) => item.status === "unassigned" || item.status === "requested");

  const resultCounts = {
    recommended: cases.filter((item) => item.result === "recommended").length,
    with_reservations: cases.filter((item) => item.result === "with_reservations").length,
    not_recommended: cases.filter((item) => item.result === "not_recommended").length,
    not_conclusive: cases.filter((item) => item.result === "not_conclusive").length,
  };

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Operación · Estudios Socioeconómicos
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            Dashboard de estudios
          </h1>
          <p className="mt-2 max-w-3xl text-neutral-600">
            Seguimiento de solicitudes, avance operativo, vencimientos y dictámenes.
          </p>
        </div>

        <Link
          href="/protected/operacion/ese/nuevo"
          className="rounded-xl bg-orange-500 px-5 py-3 text-center text-sm font-bold text-white shadow-sm hover:bg-orange-600"
        >
          + Nuevo estudio
        </Link>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Solicitados" value={String(cases.length)} note="Total registrado" />
        <Metric label="Por asignar" value={String(unassigned.length)} note="Requieren responsable" />
        <Metric label="Activos" value={String(active.length)} note="En ejecución" />
        <Metric label="Pend. información" value={String(pendingInfo.length)} note="Bloqueados por datos" />
        <Metric label="Terminados" value={String(completed.length)} note="Entregados" />
        <Metric label="Vencidos" value={String(overdue.length)} note="Fuera de compromiso" tone={overdue.length ? "red" : "default"} />
      </div>

      <section className="mt-7 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-black text-neutral-900">Resultados acumulados</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Distribución de dictámenes de los estudios con resultado capturado.
            </p>
          </div>
          <div className="text-sm font-semibold text-neutral-500">
            {Object.values(resultCounts).reduce((a, b) => a + b, 0)} con dictamen
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ResultCard label="Recomendables" value={resultCounts.recommended} />
          <ResultCard label="Con observaciones" value={resultCounts.with_reservations} />
          <ResultCard label="No recomendables" value={resultCounts.not_recommended} />
          <ResultCard label="No concluyentes" value={resultCounts.not_conclusive} />
        </div>
      </section>

      <section className="mt-7 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-6 py-5">
          <h2 className="font-black text-neutral-900">Bandeja de estudios</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Abre cualquier expediente para capturar el levantamiento y continuar el proceso.
          </p>
        </div>

        {cases.length === 0 ? (
          <div className="p-10 text-center text-sm text-neutral-500">
            Todavía no hay estudios. Crea el primero desde “Nuevo estudio”.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-6 py-4">Candidato</th>
                  <th className="px-4 py-4">Cliente</th>
                  <th className="px-4 py-4">Tipo</th>
                  <th className="px-4 py-4">Estatus</th>
                  <th className="px-4 py-4">Avance</th>
                  <th className="px-4 py-4">Compromiso</th>
                  <th className="px-4 py-4">Resultado</th>
                  <th className="px-6 py-4 text-right">Abrir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {cases.map((item) => {
                  const isOverdue =
                    !["delivered", "cancelled"].includes(item.status) &&
                    item.due_date &&
                    item.due_date < today;

                  return (
                    <tr key={item.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-5">
                        <div className="font-black text-neutral-900">{item.case_name}</div>
                        <div className="mt-1 text-xs text-neutral-500">
                          {item.position_name || "Sin puesto registrado"}
                        </div>
                      </td>
                      <td className="px-4 py-5 font-semibold text-neutral-700">
                        {orgNames.get(item.organization_id) ?? "Cliente"}
                      </td>
                      <td className="px-4 py-5 capitalize text-neutral-600">{item.study_type}</td>
                      <td className="px-4 py-5">
                        <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-700">
                          {statusLabels[item.status] ?? item.status}
                        </span>
                        {isOverdue && (
                          <div className="mt-2 text-xs font-bold text-red-600">Vencido</div>
                        )}
                      </td>
                      <td className="min-w-40 px-4 py-5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span>{item.progress ?? 0}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full bg-orange-500"
                            style={{ width: `${Math.max(0, Math.min(100, item.progress ?? 0))}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-5 text-neutral-600">{shortDate(item.due_date)}</td>
                      <td className="px-4 py-5 text-neutral-600">
                        {item.result ? resultLabels[item.result] ?? item.result : "Pendiente"}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Link
                          href={`/protected/operacion/ese/caso/${item.id}`}
                          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-700 hover:border-orange-300 hover:text-orange-700"
                        >
                          Gestionar
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
  tone = "default",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "default" | "red";
}) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${tone === "red" ? "border-red-200 bg-red-50" : "border-neutral-200 bg-white"}`}>
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">{label}</div>
      <div className="mt-3 text-3xl font-black tracking-tight text-neutral-900">{value}</div>
      <div className="mt-2 text-sm text-neutral-500">{note}</div>
    </div>
  );
}

function ResultCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="text-xs font-black uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-neutral-900">{value}</div>
    </div>
  );
}
