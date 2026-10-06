import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function EstudiosAplicacionPage() {
  const auth = await createClient();
  const { data, error } = await auth.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const db = createAdminClient();
  const [casesResult, organizationsResult] = await Promise.all([
    db.from("ese_cases")
      .select("id,service_order_id,organization_id,case_name,status,due_date,created_at")
      .neq("status","cancelled")
      .order("created_at",{ascending:false}),
    db.from("organizations").select("id,name"),
  ]);

  const cases = casesResult.data ?? [];
  const organizations = new Map(
    (organizationsResult.data ?? []).map((item)=>[item.id,item.name]),
  );

  return (
    <div>
      <Link href="/protected/estudios" className="text-sm font-bold text-orange-600 hover:text-orange-700">
        ← Volver al dashboard
      </Link>

      <div className="mt-5">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
          Estudios e Investigaciones
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
          Aplicación y captura de estudios
        </h1>
        <p className="mt-2 max-w-3xl text-neutral-600">
          Desde aquí se concentran los estudios que requieren captura o seguimiento en plataforma.
          El formulario integral del estudio se seguirá conectando sobre este módulo.
        </p>
      </div>

      <section className="mt-7 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-6 py-5">
          <h2 className="font-black text-neutral-900">Estudios disponibles</h2>
        </div>

        {cases.length === 0 ? (
          <div className="p-10 text-center text-sm text-neutral-500">
            No hay estudios activos por capturar.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {cases.map((item)=>(
              <div key={item.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-black text-neutral-900">{item.case_name}</div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {organizations.get(item.organization_id) ?? "Empresa"}
                    {item.due_date ? ` · Compromiso ${item.due_date}` : ""}
                  </div>
                </div>
                <Link
                  href={`/protected/operacion/ese/${item.service_order_id}`}
                  className="rounded-xl bg-neutral-800 px-4 py-2.5 text-center text-xs font-bold text-white"
                >
                  Abrir captura
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
