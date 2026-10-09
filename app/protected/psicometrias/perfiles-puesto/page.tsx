import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAppUser } from "@/lib/app-auth";

type Profile = {
  id: string;
  name: string;
  family: string;
  level: string;
  description: string | null;
};

type Competency = {
  profile_id: string;
  competency_key: string;
  competency_name: string;
  reference_min: number | string;
  reference_max: number | string;
  importance: string;
  sort_order: number;
};

export default function JobProfilesPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
          <p className="text-neutral-600">Cargando perfiles de puesto...</p>
        </div>
      }
    >
      <JobProfilesContent />
    </Suspense>
  );
}

async function JobProfilesContent() {
  const currentUser = await getCurrentAppUser();
  if (!currentUser) redirect("/auth/login");

  const db = createAdminClient();
  let profilesQuery = db
    .from("psychometric_job_profiles")
    .select("id,name,family,level,description,organization_id")
    .eq("active", true)
    .order("family")
    .order("level")
    .order("name");

  if (currentUser.role === "client" && currentUser.organizationId) {
    profilesQuery = profilesQuery.or(
      `organization_id.is.null,organization_id.eq.${currentUser.organizationId}`,
    );
  }

  const [profilesR, competenciesR] = await Promise.all([
    profilesQuery,
    db
      .from("psychometric_job_profile_competencies")
      .select("profile_id,competency_key,competency_name,reference_min,reference_max,importance,sort_order")
      .order("sort_order"),
  ]);

  if (profilesR.error || competenciesR.error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-7">
        <h1 className="font-bold text-red-800">No fue posible cargar los perfiles</h1>
        <p className="mt-2 text-sm text-red-700">
          {profilesR.error?.message ?? competenciesR.error?.message ?? "Error"}
        </p>
      </div>
    );
  }

  const profiles = (profilesR.data ?? []) as Profile[];
  const competencies = (competenciesR.data ?? []) as Competency[];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href="/protected/psicometrias?view=pruebas"
            className="text-sm font-bold text-neutral-500 hover:text-orange-600"
          >
            ← Volver a Psicometrías
          </Link>
          <div className="mt-5 text-sm font-bold uppercase tracking-[.2em] text-orange-600">
            FactoRH · Psicometrías
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            Perfiles objetivo de puesto
          </h1>
          <p className="mt-3 max-w-4xl text-neutral-600">
            Los perfiles base permiten comparar evidencia psicométrica con competencias
            relevantes para una familia y nivel de puesto sin convertir el resultado en
            una recomendación automática de contratación.
          </p>
        </div>
        <Link
          href="/protected/psicometrias/nueva?fresh=1"
          className="rounded-xl bg-orange-500 px-5 py-3 text-center text-sm font-bold text-white hover:bg-orange-600"
        >
          Asignar psicometrías
        </Link>
      </div>

      <section className="rounded-3xl border border-orange-200 bg-orange-50 p-6">
        <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-700">
          Cómo se utilizan
        </div>
        <p className="mt-2 max-w-5xl text-sm leading-7 text-neutral-700">
          Al crear una evaluación puedes escribir el nombre exacto de la vacante, por
          ejemplo “Gerente de Planta Guadalajara”, y seleccionar un perfil base como
          “Gerencia de Operaciones”. El nombre exacto identifica la vacante; el perfil
          base define las competencias y rangos de referencia contra los que se organiza
          la lectura del reporte integral.
        </p>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        {profiles.map((profile) => {
          const rows = competencies
            .filter((item) => item.profile_id === profile.id)
            .sort((a, b) => a.sort_order - b.sort_order);

          return (
            <article
              key={profile.id}
              className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-orange-600">
                    {profile.family} · {profile.level}
                  </div>
                  <h2 className="mt-2 text-xl font-black text-neutral-900">
                    {profile.name}
                  </h2>
                </div>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600">
                  {rows.length} competencias
                </span>
              </div>

              {profile.description && (
                <p className="mt-4 text-sm leading-6 text-neutral-600">
                  {profile.description}
                </p>
              )}

              <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-200">
                <div className="grid grid-cols-[1fr_110px_105px] bg-neutral-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
                  <div>Competencia</div>
                  <div>Referencia</div>
                  <div>Importancia</div>
                </div>
                <div className="divide-y divide-neutral-100">
                  {rows.map((item) => (
                    <div
                      key={item.competency_key}
                      className="grid grid-cols-[1fr_110px_105px] items-center px-4 py-3 text-sm"
                    >
                      <div className="font-semibold text-neutral-800">
                        {item.competency_name}
                      </div>
                      <div className="font-black text-neutral-900">
                        {Math.round(Number(item.reference_min))}–{Math.round(Number(item.reference_max))}
                      </div>
                      <div>
                        <ImportanceBadge value={item.importance} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <section className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6 text-sm leading-6 text-neutral-600">
        <strong className="text-neutral-800">Criterio de uso.</strong> Los rangos son
        marcos de referencia internos para organizar la entrevista y la comparación con
        el puesto. Un resultado fuera del rango no determina por sí solo una decisión;
        puede representar una brecha, una sobreexpresión o simplemente evidencia que
        debe contextualizarse con experiencia, entrevista y desempeño.
      </section>
    </div>
  );
}

function ImportanceBadge({ value }: { value: string }) {
  const label =
    value === "critical"
      ? "Crítica"
      : value === "high"
        ? "Alta"
        : "Media";

  const cls =
    value === "critical"
      ? "bg-orange-50 text-orange-700"
      : value === "high"
        ? "bg-blue-50 text-blue-700"
        : "bg-neutral-100 text-neutral-600";

  return (
    <span className={"inline-flex rounded-full px-2.5 py-1 text-xs font-bold " + cls}>
      {label}
    </span>
  );
}
