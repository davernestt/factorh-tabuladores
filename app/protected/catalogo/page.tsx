import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

type Template = {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  assessment_type: string;
  version: number;
  active: boolean;
};

type Organization = {
  id: string;
  name: string;
};

type Dimension = {
  id: string;
  template_id: string;
};

type Question = {
  id: string;
  template_id: string;
};

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
          <p className="text-neutral-600">Cargando catálogo...</p>
        </div>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}

async function CatalogContent() {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();

  if (authError || !authData?.claims) {
    redirect("/auth/login");
  }

  const db = createAdminClient();

  const [templatesResult, organizationsResult, dimensionsResult, questionsResult] =
    await Promise.all([
      db
        .from("assessment_templates")
        .select("id,organization_id,name,description,assessment_type,version,active")
        .order("name"),
      db.from("organizations").select("id,name").order("name"),
      db.from("assessment_dimensions").select("id,template_id"),
      db.from("assessment_questions").select("id,template_id"),
    ]);

  const firstError =
    templatesResult.error ||
    organizationsResult.error ||
    dimensionsResult.error ||
    questionsResult.error;

  if (firstError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-7">
        <h1 className="font-bold text-red-800">No fue posible cargar el catálogo</h1>
        <p className="mt-2 text-sm text-red-700">{firstError.message}</p>
      </div>
    );
  }

  const templates = (templatesResult.data ?? []) as Template[];
  const organizations = new Map(
    ((organizationsResult.data ?? []) as Organization[]).map((item) => [
      item.id,
      item.name,
    ]),
  );
  const dimensions = (dimensionsResult.data ?? []) as Dimension[];
  const questions = (questionsResult.data ?? []) as Question[];

  const dimensionsByTemplate = new Map<string, number>();
  for (const dimension of dimensions) {
    dimensionsByTemplate.set(
      dimension.template_id,
      (dimensionsByTemplate.get(dimension.template_id) ?? 0) + 1,
    );
  }

  const questionsByTemplate = new Map<string, number>();
  for (const question of questions) {
    questionsByTemplate.set(
      question.template_id,
      (questionsByTemplate.get(question.template_id) ?? 0) + 1,
    );
  }

  const catalogGroups = Array.from(
    templates.reduce((groups, template) => {
      const current = groups.get(template.name) ?? [];
      current.push(template);
      groups.set(template.name, current);
      return groups;
    }, new Map<string, Template[]>()),
  ).map(([name, variants]) => ({ name, variants }));

  const active = catalogGroups.filter((group) =>
    group.variants.some((template) => template.active),
  ).length;

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Administración
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            Catálogo de evaluaciones
          </h1>
          <p className="mt-2 max-w-2xl text-neutral-600">
            Aquí puedes revisar qué instrumentos existen, para qué empresa están
            disponibles y cuántas dimensiones y reactivos contiene cada uno.
          </p>
        </div>

        <Link
          href="/protected/nueva-evaluacion"
          className="rounded-xl bg-orange-500 px-5 py-3 text-center text-sm font-bold text-white shadow-sm hover:bg-orange-600"
        >
          + Asignar evaluación
        </Link>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <Metric label="Instrumentos" value={String(catalogGroups.length)} />
        <Metric label="Activos" value={String(active)} />
        <Metric
          label="Empresas con pruebas"
          value={String(
            new Set(
              templates
                .map((template) => template.organization_id)
                .filter((value): value is string => Boolean(value)),
            ).size,
          )}
        />
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        {catalogGroups.map((group) => {
          const organizationNames = Array.from(
            new Set(
              group.variants.map((template) =>
                template.organization_id
                  ? organizations.get(template.organization_id) ?? "Empresa"
                  : "General",
              ),
            ),
          );

          const dimensionValues = new Set(
            group.variants.map(
              (template) => dimensionsByTemplate.get(template.id) ?? 0,
            ),
          );
          const questionValues = new Set(
            group.variants.map(
              (template) => questionsByTemplate.get(template.id) ?? 0,
            ),
          );
          const versionValues = new Set(
            group.variants.map((template) => template.version),
          );

          const representative = group.variants[0];
          const isActive = group.variants.some((template) => template.active);
          const canAssign = group.variants.some(
            (template) =>
              template.assessment_type === "leadership" ||
              template.assessment_type.startsWith("psychometric_"),
          );

          const description =
            group.variants.length > 1
              ? "Herramienta del Programa de Desarrollo y Alineación de Líderes, disponible para las empresas indicadas."
              : representative.description ?? "Sin descripción registrada.";

          return (
            <section
              key={group.name}
              className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                    Disponible para: {organizationNames.join(" · ")}
                  </div>
                  <h2 className="mt-2 text-xl font-black text-neutral-900">
                    {group.name}
                  </h2>
                </div>

                <span
                  className={
                    isActive
                      ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                      : "rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-500"
                  }
                >
                  {isActive ? "Activa" : "Inactiva"}
                </span>
              </div>

              <p className="mt-4 min-h-12 text-sm leading-relaxed text-neutral-600">
                {description}
              </p>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <Stat
                  label="Dimensiones"
                  value={
                    dimensionValues.size === 1
                      ? String(Array.from(dimensionValues)[0])
                      : "Varía"
                  }
                />
                <Stat
                  label="Reactivos"
                  value={
                    questionValues.size === 1
                      ? String(Array.from(questionValues)[0])
                      : "Varía"
                  }
                />
                <Stat
                  label="Versión"
                  value={
                    versionValues.size === 1
                      ? String(Array.from(versionValues)[0])
                      : "Varía"
                  }
                />
              </div>

              <div className="mt-5 border-t border-neutral-100 pt-5">
                {canAssign ? (
                  <Link
                    href={
                      representative.assessment_type.startsWith("psychometric_")
                        ? "/protected/psicometrias/nueva?fresh=1"
                        : "/protected/nueva-evaluacion?fresh=1"
                    }
                    className="text-sm font-bold text-orange-600 hover:text-orange-700"
                  >
                    Asignar esta evaluación →
                  </Link>
                ) : (
                  <div>
                    <div className="text-sm font-bold text-neutral-700">
                      Aplicación interna
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      El instrumento ya está cargado. En la siguiente fase habilitaremos su flujo específico de aplicación.
                    </p>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {templates.length === 0 && (
        <div className="mt-7 rounded-3xl border border-neutral-200 bg-white p-10 text-center text-neutral-500 shadow-sm">
          Aún no hay evaluaciones en el catálogo.
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
        {value}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="mt-1 text-xl font-black text-neutral-900">{value}</div>
    </div>
  );
}
