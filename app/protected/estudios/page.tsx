import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

const statusLabels: Record<string,string> = {
  requested:"Solicitado",
  scheduled:"Programado",
  fieldwork:"Visita / campo",
  verification:"Verificación",
  report:"Reporte",
  delivered:"Entregado",
  cancelled:"Cancelado",
};

const resultLabels: Record<string,string> = {
  recommended:"Recomendable",
  with_reservations:"Con Reservas",
  not_recommended:"No Recomendable",
};

export default async function EstudiosDashboardPage() {
  const auth = await createClient();
  const { data, error } = await auth.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const db = createAdminClient();

  const [casesResult, organizationsResult] = await Promise.all([
    db.from("ese_cases")
      .select("id,service_order_id,organization_id,case_name,status,result,due_date,created_at")
      .order("created_at",{ascending:false}),
    db.from("organizations").select("id,name"),
  ]);

  const cases = casesResult.data ?? [];
  const organizations = new Map(
    (organizationsResult.data ?? []).map((item)=>[item.id,item.name]),
  );

  const requested = cases.filter((item)=>item.status === "requested").length;
  const inProgress = cases.filter((item)=>
    ["scheduled","fieldwork","verification","report"].includes(item.status)
  ).length;
  const delivered = cases.filter((item)=>item.status === "delivered").length;
  const recommended = cases.filter((item)=>item.result === "recommended").length;
  const reservations = cases.filter((item)=>item.result === "with_reservations").length;
  const notRecommended = cases.filter((item)=>item.result === "not_recommended").length;

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Estudios e Investigaciones
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            Dashboard de Estudios Socioeconómicos
          </h1>
          <p className="mt-2 max-w-3xl text-neutral-600">
            Seguimiento de solicitudes, avances, cierres y dictámenes de los estudios.
          </p>
        </div>

        <Link
          href="/protected/estudios/aplicacion"
          className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-orange-600"
        >
          Aplicación y captura
        </Link>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Solicitados" value={requested} />
        <Metric label="En proceso" value={inProgress} />
        <Metric label="Terminados" value={delivered} />
        <Metric label="Recomendables" value={recommended} />
        <Metric label="Con reservas" value={reservations} />
        <Metric label="No recomendables" value={notRecommended} />
      </div>

      <section className="mt-7 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-6 py-5">
          <h2 className="font-black text-neutral-900">Estudios registrados</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Vista general de las investigaciones en curso y concluidas.
          </p>
        </div>

        {cases.length === 0 ? (
          <div className="p-10 text-center text-sm text-neutral-500">
            Aún no hay estudios registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-6 py-4">Persona</th>
                  <th className="px-4 py-4">Cliente</th>
                  <th className="px-4 py-4">Estatus</th>
                  <th className="px-4 py-4">Resultado</th>
                  <th className="px-4 py-4">Compromiso</th>
                  <th className="px-6 py-4 text-right">Abrir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {cases.map((item)=>(
                  <tr key={item.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-5 font-black text-neutral-900">
                      {item.case_name}
                    </td>
                    <td className="px-4 py-5 text-neutral-700">
                      {organizations.get(item.organization_id) ?? "Empresa"}
                    </td>
                    <td className="px-4 py-5 text-neutral-600">
                      {statusLabels[item.status] ?? item.status}
                    </td>
                    <td className="px-4 py-5 font-semibold text-neutral-700">
                      {item.result ? resultLabels[item.result] ?? item.result : "Pendiente"}
                    </td>
                    <td className="px-4 py-5 text-neutral-600">
                      {item.due_date || "—"}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link
                        href={`/protected/operacion/ese/${item.service_order_id}`}
                        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-700 hover:border-orange-300 hover:text-orange-700"
                      >
                        Ver estudio
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({label,value}:{label:string;value:number}) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </div>
      <div className="mt-3 text-3xl font-black text-neutral-900">{value}</div>
    </div>
  );
}
