import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAppUser } from "@/lib/app-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import NewAssessmentForm from "../../nueva-evaluacion/new-assessment-form";

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
  const currentUser = await getCurrentAppUser();
  if (!currentUser) redirect("/auth/login");

  const scopedOrganizationId =
    currentUser.role === "client" ? currentUser.organizationId : null;

  if (currentUser.role === "client" && !scopedOrganizationId) {
    redirect("/auth/login?error=unauthorized");
  }

  const db = createAdminClient();

  const creditPlanResult = scopedOrganizationId
    ? await db
        .from("organization_psychometric_credits")
        .select("plan_type,plan_name,credits_total,credits_used,valid_until,active,trial_single_test_only")
        .eq("organization_id", scopedOrganizationId)
        .maybeSingle()
    : { data: null, error: null };

  if (creditPlanResult.error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-7">
        <h1 className="font-bold text-red-800">No fue posible validar tu plan</h1>
        <p className="mt-2 text-sm text-red-700">{creditPlanResult.error.message}</p>
      </div>
    );
  }

  const creditPlan = creditPlanResult.data;
  const creditsRemaining = creditPlan
    ? Math.max(0, Number(creditPlan.credits_total) - Number(creditPlan.credits_used))
    : 0;
  const planExpired =
    Boolean(creditPlan?.valid_until) &&
    new Date(String(creditPlan?.valid_until) + "T23:59:59").getTime() <
      Date.now();
  const planBlocked =
    Boolean(scopedOrganizationId) &&
    (!creditPlan || !creditPlan.active || planExpired || creditsRemaining <= 0);

  let organizationsQuery = db
    .from("organizations")
    .select("id,name")
    .eq("active", true)
    .order("name");

  let peopleQuery = db
    .from("people")
    .select(
      "id,organization_id,first_name,last_name,email,phone,job_title,area",
    )
    .eq("active", true)
    .order("first_name");

  let accessQuery = db
    .from("organization_assessment_templates")
    .select("organization_id,template_id,enabled,participant_sendable");

  let batteriesQuery = db
    .from("assessment_batteries")
    .select("id,organization_id,name,description")
    .eq("active", true)
    .order("name");

  let jobProfilesQuery = db
    .from("psychometric_job_profiles")
    .select("id,organization_id,name,family,level,description")
    .eq("active", true)
    .order("family")
    .order("level")
    .order("name");

  if (scopedOrganizationId) {
    organizationsQuery = organizationsQuery.eq("id", scopedOrganizationId);
    peopleQuery = peopleQuery.eq("organization_id", scopedOrganizationId);
    accessQuery = accessQuery.eq("organization_id", scopedOrganizationId);
    batteriesQuery = batteriesQuery.eq("organization_id", scopedOrganizationId);
    jobProfilesQuery = jobProfilesQuery.or(
      `organization_id.is.null,organization_id.eq.${scopedOrganizationId}`,
    );
  }

  const [
    organizationsResult,
    peopleResult,
    templatesResult,
    accessResult,
    batteriesResult,
    batteryItemsResult,
    jobProfilesResult,
  ] = await Promise.all([
    organizationsQuery,
    peopleQuery,
    db
      .from("assessment_templates")
      .select("id,organization_id,name,description,assessment_type")
      .eq("active", true)
      .like("assessment_type", "psychometric_%")
      .order("name"),
    accessQuery,
    batteriesQuery,
    db
      .from("assessment_battery_items")
      .select("battery_id,template_id,sort_order")
      .order("sort_order"),
    jobProfilesQuery,
  ]);

  const firstError =
    organizationsResult.error ||
    peopleResult.error ||
    templatesResult.error ||
    accessResult.error ||
    batteriesResult.error ||
    batteryItemsResult.error ||
    jobProfilesResult.error;

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

  const accessRows = accessResult.data ?? [];
  const enabledTemplateIds = scopedOrganizationId
    ? new Set(
        accessRows
          .filter((row) => row.enabled && row.participant_sendable)
          .map((row) => row.template_id),
      )
    : null;

  const psychometricTemplates = (templatesResult.data ?? []).filter(
    (template) => !enabledTemplateIds || enabledTemplateIds.has(template.id),
  );

  const psychometricTemplateIds = new Set(
    psychometricTemplates.map((template) => template.id),
  );
  const psychometricAccess = accessRows.filter((row) =>
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

  if (planBlocked) {
    return (
      <div className="space-y-6">
        <Link
          href="/protected/psicometrias"
          className="text-sm font-semibold text-neutral-500 hover:text-neutral-900"
        >
          ← Volver a Psicometrías
        </Link>
        <section className="rounded-3xl border border-orange-200 bg-white p-8 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
            Créditos agotados
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            Tu prueba de FactorRH terminó
          </h1>
          <p className="mt-3 max-w-2xl text-neutral-600">
            Ya utilizaste las aplicaciones disponibles o la vigencia del plan terminó.
            Para seguir enviando evaluaciones, FactorRH debe activar un paquete de créditos para tu empresa.
          </p>
          <div className="mt-6 rounded-2xl bg-neutral-50 p-5 text-sm text-neutral-700">
            Tus resultados y reportes anteriores permanecen disponibles. El bloqueo sólo evita generar nuevas aplicaciones.
          </div>
        </section>
      </div>
    );
  }

  const maxTemplateSelections =
    scopedOrganizationId && creditPlan?.plan_type === "trial" ? 1 : null;
  const creditNotice = scopedOrganizationId && creditPlan
    ? creditPlan.plan_type === "trial"
      ? `Prueba gratuita: quedan ${creditsRemaining} de ${creditPlan.credits_total} aplicaciones. Cada liga demo permite una sola psicometría.`
      : `${creditPlan.plan_name}: ${creditsRemaining} créditos disponibles. Cada instrumento nuevo consume 1 crédito; una batería consume un crédito por cada prueba incluida.`
    : null;

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
          Psicometrías
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
          Asignar psicometrías
        </h1>
        <p className="mt-2 max-w-3xl text-neutral-600">
          Crea el proceso, selecciona las pruebas habilitadas para la empresa y genera la liga que responderá el candidato o colaborador.
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
          jobProfiles={jobProfilesResult.data ?? []}
          scope="psychometrics"
          maxTemplateSelections={maxTemplateSelections}
          creditNotice={creditNotice}
        />
      </div>
    </div>
  );
}
