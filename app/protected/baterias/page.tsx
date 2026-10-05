import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import BatteriesManager from "./batteries-manager";

export default function BatteriesPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
          <p className="text-neutral-600">Cargando baterías...</p>
        </div>
      }
    >
      <BatteriesContent />
    </Suspense>
  );
}

async function BatteriesContent() {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();

  if (authError || !authData?.claims) {
    redirect("/auth/login");
  }

  const db = createAdminClient();
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
    db
      .from("assessment_templates")
      .select("id,name,description")
      .eq("active", true)
      .order("name"),
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

  return (
    <div>
      <div>
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
          Administración
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
          Baterías de evaluación
        </h1>
        <p className="mt-2 max-w-3xl text-neutral-600">
          Crea combinaciones predeterminadas de pruebas para asignarlas después
          con una sola liga.
        </p>
      </div>

      <div className="mt-7">
        <BatteriesManager
          organizations={organizationsResult.data ?? []}
          templates={templatesResult.data ?? []}
          access={accessResult.data ?? []}
          batteries={batteriesResult.data ?? []}
          batteryItems={batteryItemsResult.data ?? []}
        />
      </div>
    </div>
  );
}
