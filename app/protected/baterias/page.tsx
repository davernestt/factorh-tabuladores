import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import BatteriesManager from "./batteries-manager";

type SearchProps = { searchParams: Promise<{ tipo?: string }> };

export default function BatteriesPage({ searchParams }: SearchProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
          <p className="text-neutral-600">Cargando baterías...</p>
        </div>
      }
    >
      <BatteriesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function BatteriesContent({searchParams}:SearchProps) {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();

  if (authError || !authData?.claims) {
    redirect("/auth/login");
  }

  const psychometricOnly = (await searchParams).tipo === "psicometrias";
  const db = createAdminClient();
  let templateQuery = db
    .from("assessment_templates")
    .select("id,name,description,assessment_type")
    .eq("active",true)
    .order("name");
  if(psychometricOnly) templateQuery = templateQuery.like("assessment_type","psychometric_%");
  const [
    organizationsResult,
    templatesResult,
    accessResult,
    batteriesResult,
    batteryItemsResult,
  ] = await Promise.all([
    db
      .from("organizations")
      .select("id,name")
      .eq("active", true)
      .order("name"),
    templateQuery,
    db
      .from("organization_assessment_templates")
      .select("organization_id,template_id,enabled,participant_sendable"),
    db
      .from("assessment_batteries")
      .select("id,organization_id,name,description")
      .eq("active", true)
      .order("name"),
    db
      .from("assessment_battery_items")
      .select("battery_id,template_id,sort_order")
      .order("sort_order"),
  ]);

  const firstError =
    organizationsResult.error ||
    templatesResult.error ||
    accessResult.error ||
    batteriesResult.error ||
    batteryItemsResult.error;

  if (firstError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-7">
        <h1 className="font-bold text-red-800">No fue posible cargar baterías</h1>
        <p className="mt-2 text-sm text-red-700">{firstError.message}</p>
      </div>
    );
  }

  const allowedIds = new Set((templatesResult.data ?? []).map(template => template.id));
  const visibleBatteries = psychometricOnly
    ? (batteriesResult.data ?? []).filter(battery => {
        const items = (batteryItemsResult.data ?? []).filter(item => item.battery_id === battery.id);
        return items.length > 0 && items.every(item => allowedIds.has(item.template_id));
      })
    : (batteriesResult.data ?? []);

  return (
    <div>
      <div>
        <Link href="/protected/psicometrias" className="text-sm font-semibold text-neutral-500 hover:text-orange-700">
          ← Volver a Psicometrías
        </Link>
        <div className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
          Psicometrías · Herramienta de configuración
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
          {psychometricOnly ? "Configurar baterías psicométricas" : "Baterías de evaluación"}
        </h1>
        <p className="mt-2 max-w-3xl text-neutral-600">
          Guarda combinaciones de pruebas para reutilizarlas al asignar una evaluación.
          Una batería no es un módulo independiente: es una selección de instrumentos
          que después se aplica desde Psicometrías.
        </p>
        {psychometricOnly && (
          <p className="mt-3 text-xs leading-5 text-neutral-500">
            Aquí se muestran solo instrumentos y baterías psicométricas. Las combinaciones
            del programa PDL permanecen intactas.
          </p>
        )}
        <Link
          href="/protected/psicometrias/nueva?fresh=1"
          className="mt-5 inline-flex rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700"
        >
          Asignar psicometrías →
        </Link>
      </div>

      <div className="mt-7">
        <BatteriesManager
          organizations={organizationsResult.data ?? []}
          templates={templatesResult.data ?? []}
          access={accessResult.data ?? []}
          batteries={visibleBatteries}
          batteryItems={batteryItemsResult.data ?? []}
        />
      </div>
    </div>
  );
}
