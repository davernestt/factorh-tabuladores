import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import NewAssessmentForm from "../../nueva-evaluacion/new-assessment-form";

const ADMIN_EMAILS = ["david@factorh.com.mx"];

export default function NewPsychometricAssessmentPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
          <p className="text-neutral-600">Cargando psicometrías...</p>
        </div>
      }
    >
      <NewPsychometricAssessmentContent />
    </Suspense>
  );
}

async function NewPsychometricAssessmentContent() {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();
  const email = String(authData?.claims?.email ?? "").trim().toLowerCase();

  if (authError || !authData?.claims || !ADMIN_EMAILS.includes(email)) {
    redirect("/auth/login");
  }

  const db = createAdminClient();

  const [
    organizationsResult,
    peopleResult,
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
      .from("people")
      .select(
        "id,organization_id,first_name,last_name,email,phone,job_title,area",
      )
      .eq("active", true)
      .order("first_name"),
    db
      .from("assessment_templates")
      .select("id,organization_id,name,description,assessment_type")
      .eq("active", true)
      .like("assessment_type", "psychometric_%")
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
    peopleResult.error ||
    templatesResult.error ||
    accessResult.error ||
    batteriesResult.error ||
    batteryItemsResult.error;

  if (firstError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-7">
        <h1 className="font-bold text-red-800">
          No fue posible cargar las psicometrías
        </h1>
        <p className="mt-2 text-sm text-red-700">{firstError.message}</p>
      </div>
    );
  }

  const psychometricTemplates = templatesResult.data ?? [];
  const psychometricTemplateIds = new Set(
    psychometricTemplates.map((template) => template.id),
  );
  const psychometricAccess = (accessResult.data ?? []).filter((row) =>
    psychometricTemplateIds.has(row.template_id),
  );

  const allBatteryItems = batteryItemsResult.data ?? [];
  const validBatteryIds = new Set(
    (batteriesResult.data ?? [])
      .filter((battery) => {
        const items = allBatteryItems.filter(
          (item) => item.battery_id === battery.id,
        );
        return (
          items.length > 0 &&
          items.every((item) => psychometricTemplateIds.has(item.template_id))
        );
      })
      .map((battery) => battery.id),
  );

  const psychometricBatteries = (batteriesResult.data ?? []).filter(
    (battery) => validBatteryIds.has(battery.id),
  );
  const psychometricBatteryItems = allBatteryItems.filter(
    (item) =>
      validBatteryIds.has(item.battery_id) &&
      psychometricTemplateIds.has(item.template_id),
  );

  return (
    <div>
      <Link
        href="/protected/psicometrias"
        className="text-sm font-semibold text-neutral-500 hover:text-neutral-900"
      >
        ← Volver a Psicometrías
      </Link>

      <div className="mt-5">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
          Psicometrías · Administración
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
          Asignar psicometrías
        </h1>
        <p className="mt-2 max-w-3xl text-neutral-600">
          Aquí sólo aparecen los instrumentos psicométricos de FactorRH. Las herramientas del Programa de Desarrollo de Líderes se asignan desde el módulo PDL.
        </p>
      </div>

      <div className="mt-7">
        <NewAssessmentForm
          organizations={organizationsResult.data ?? []}
          people={peopleResult.data ?? []}
          templates={psychometricTemplates}
          templateAccess={psychometricAccess}
          batteries={psychometricBatteries}
          batteryItems={psychometricBatteryItems}
          scope="psychometrics"
        />
      </div>
    </div>
  );
}
