import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

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

export default async function ClientesPage() {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();

  if (authError || !authData?.claims) {
    redirect("/auth/login");
  }

  const db = createAdminClient();

  const [organizationsResult, opportunitiesResult, quotesResult, contactsResult] =
    await Promise.all([
      db
        .from("organizations")
        .select("id,name,phone,commercial_email,website,created_at,lifecycle_stage")
        .eq("lifecycle_stage", "client")
        .order("name", { ascending: true }),
      db
        .from("sales_opportunities")
        .select("id,organization_id,stage,service_type,estimated_value,updated_at"),
      db
        .from("sales_quotes")
        .select("id,organization_id,status,total,accepted_at,created_at"),
      db
        .from("sales_contacts")
        .select("id,organization_id,first_name,last_name,is_primary,phone,email")
        .eq("active", true),
    ]);

  const organizations = organizationsResult.data ?? [];
  const opportunities = opportunitiesResult.data ?? [];
  const quotes = quotesResult.data ?? [];
  const contacts = contactsResult.data ?? [];

  const rows = organizations.map((organization) => {
    const orgOpportunities = opportunities.filter(
      (item) => item.organization_id === organization.id,
    );
    const won = orgOpportunities.filter((item) => item.stage === "won");
    const acceptedQuotes = quotes.filter(
      (item) =>
        item.organization_id === organization.id && item.status === "accepted",
    );
    const primaryContact =
      contacts.find(
        (item) =>
          item.organization_id === organization.id && item.is_primary === true,
      ) ??
      contacts.find((item) => item.organization_id === organization.id) ??
      null;

    const sales = acceptedQuotes.reduce(
      (sum, item) => sum + Number(item.total || 0),
      0,
    );

    const lastSaleDate = acceptedQuotes
      .map((item) => item.accepted_at || item.created_at)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

    return {
      ...organization,
      wonCount: won.length,
      acceptedQuotes: acceptedQuotes.length,
      sales,
      lastSaleDate,
      primaryContact,
    };
  });

  const totalSales = rows.reduce((sum, item) => sum + item.sales, 0);
  const activeClients = rows.length;
  const repeatClients = rows.filter((item) => item.acceptedQuotes > 1).length;

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
            Clientes
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            Cartera de clientes
          </h1>
          <p className="mt-2 max-w-3xl text-neutral-600">
            Empresas con oportunidades ganadas y su historial de ventas en FactoRH.
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
        <Metric label="Clientes" value={String(activeClients)} note="Empresas activas" />
        <Metric
          label="Ventas acumuladas"
          value={money(totalSales)}
          note="Cotizaciones aceptadas"
        />
        <Metric
          label="Clientes recurrentes"
          value={String(repeatClients)}
          note="Más de una venta"
        />
        <Metric
          label="Ticket promedio"
          value={activeClients ? money(totalSales / activeClients) : "$0"}
          note="Venta acumulada / cliente"
        />
      </div>

      <section className="mt-7 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-6 py-5">
          <h2 className="font-black text-neutral-900">Clientes FactoRH</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Abre cualquier empresa para revisar contactos, ventas y servicios.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-neutral-500">
            Aún no hay clientes. Cuando una cotización sea aceptada, la empresa aparecerá aquí.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-4 py-4">Contacto</th>
                  <th className="px-4 py-4 text-center">Ventas</th>
                  <th className="px-4 py-4 text-right">Acumulado</th>
                  <th className="px-4 py-4">Última venta</th>
                  <th className="px-6 py-4 text-right">Abrir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-5">
                      <div className="font-black text-neutral-900">{item.name}</div>
                      <div className="mt-1 text-xs text-neutral-500">
                        {item.commercial_email || item.phone || "Sin datos de contacto"}
                      </div>
                    </td>
                    <td className="px-4 py-5 text-neutral-700">
                      {item.primaryContact
                        ? [item.primaryContact.first_name, item.primaryContact.last_name]
                            .filter(Boolean)
                            .join(" ")
                        : "—"}
                    </td>
                    <td className="px-4 py-5 text-center font-bold text-neutral-800">
                      {item.acceptedQuotes}
                    </td>
                    <td className="px-4 py-5 text-right font-black text-neutral-900">
                      {money(item.sales)}
                    </td>
                    <td className="px-4 py-5 text-neutral-600">
                      {dateLabel(item.lastSaleDate)}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link
                        href={`/protected/comercial/clientes/${item.id}`}
                        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-700 hover:border-orange-300 hover:text-orange-700"
                      >
                        Ver cliente
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
