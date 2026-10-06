import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

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

export default async function OperacionPage() {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();

  if (authError || !authData?.claims) redirect("/auth/login");

  const db = createAdminClient();

  const [ordersResult, organizationsResult] = await Promise.all([
    db
      .from("service_orders")
      .select(
        "id,order_number,organization_id,service_type,title,status,priority,target_date,commercial_value,created_at",
      )
      .order("created_at", { ascending: false }),
    db.from("organizations").select("id,name"),
  ]);

  const orders = ordersResult.data ?? [];
  const organizations = new Map(
    (organizationsResult.data ?? []).map((item) => [item.id, item.name]),
  );

  const active = orders.filter(
    (item) => item.status !== "completed" && item.status !== "cancelled",
  );
  const completed = orders.filter((item) => item.status === "completed");
  const waiting = orders.filter((item) => item.status === "waiting_client");
  const totalValue = active.reduce(
    (sum, item) => sum + Number(item.commercial_value || 0),
    0,
  );

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Operación
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            Órdenes de servicio
          </h1>
          <p className="mt-2 max-w-3xl text-neutral-600">
            El puente entre lo que FactoRH vende y lo que tiene que entregar.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/protected/operacion/reclutamiento"
            className="rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-bold text-orange-700 shadow-sm hover:bg-orange-100"
          >
            Indicadores de Reclutamiento
          </Link>
          <Link
            href="/protected/comercial"
            className="rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-700 shadow-sm hover:border-orange-300 hover:text-orange-700"
          >
            Ir a Comercial
          </Link>
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Servicios activos" value={String(active.length)} note="Por entregar" />
        <Metric
          label="Valor en operación"
          value={money(totalValue)}
          note="Venta ligada a servicios activos"
        />
        <Metric
          label="Esperando cliente"
          value={String(waiting.length)}
          note="Requieren información o respuesta"
        />
        <Metric
          label="Completados"
          value={String(completed.length)}
          note="Servicios terminados"
        />
      </div>

      <section className="mt-7 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-6 py-5">
          <h2 className="font-black text-neutral-900">Servicios vendidos</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Cada cotización aceptada genera automáticamente una orden de servicio.
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="p-10 text-center text-sm text-neutral-500">
            Aún no hay órdenes. La primera aparecerá cuando aceptes una cotización.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-6 py-4">Orden</th>
                  <th className="px-4 py-4">Cliente</th>
                  <th className="px-4 py-4">Servicio</th>
                  <th className="px-4 py-4">Estatus</th>
                  <th className="px-4 py-4">Fecha objetivo</th>
                  <th className="px-4 py-4 text-right">Valor</th>
                  <th className="px-6 py-4 text-right">Abrir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-5">
                      <div className="font-black text-neutral-900">
                        {order.order_number}
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">{order.title}</div>
                    </td>
                    <td className="px-4 py-5 font-semibold text-neutral-800">
                      {organizations.get(order.organization_id) ?? "Empresa"}
                    </td>
                    <td className="px-4 py-5 text-neutral-600">
                      {serviceLabels[order.service_type] ?? order.service_type}
                    </td>
                    <td className="px-4 py-5">
                      <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-700">
                        {statusLabels[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="px-4 py-5 text-neutral-600">
                      {dateLabel(order.target_date)}
                    </td>
                    <td className="px-4 py-5 text-right font-black text-neutral-900">
                      {money(Number(order.commercial_value || 0))}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link
                        href={`/protected/operacion/${order.id}`}
                        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-700 hover:border-orange-300 hover:text-orange-700"
                      >
                        Gestionar
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
