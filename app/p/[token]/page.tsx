import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

type RouteContext = {
  params: Promise<{ token: string }>;
};

type Assignment = {
  id: string;
  template_id: string;
  public_token: string;
  status: string;
  created_at: string;
};

type Template = {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
};

export default async function ParticipantPortalPage({ params }: RouteContext) {
  const { token } = await params;
  const db = createAdminClient();

  const { data: process, error: processError } = await db
    .from("assessment_processes")
    .select("id,name,status,person_id,organization_id,target_date")
    .eq("public_token", token)
    .neq("status", "cancelled")
    .maybeSingle();

  if (processError || !process) {
    return <PortalError />;
  }

  const [personResult, organizationResult, assignmentsResult] = await Promise.all([
    db
      .from("people")
      .select("first_name,last_name,job_title,area")
      .eq("id", process.person_id)
      .single(),
    db
      .from("organizations")
      .select("id,name")
      .eq("id", process.organization_id)
      .single(),
    db
      .from("assessment_assignments")
      .select("id,template_id,public_token,status,created_at")
      .eq("process_id", process.id)
      .neq("status", "cancelled")
      .order("created_at"),
  ]);

  if (
    personResult.error ||
    organizationResult.error ||
    assignmentsResult.error ||
    !personResult.data ||
    !organizationResult.data
  ) {
    return <PortalError />;
  }

  const targetOrganization = organizationResult.data;
  const assignments = (assignmentsResult.data ?? []) as Assignment[];
  const templateIds = assignments.map((assignment) => assignment.template_id);

  const { data: templatesData, error: templatesError } =
    templateIds.length > 0
      ? await db
          .from("assessment_templates")
          .select("id,organization_id,name,description")
          .in("id", templateIds)
      : { data: [], error: null };

  if (templatesError) {
    return <PortalError />;
  }

  const templates = (templatesData ?? []) as Template[];
  const sourceOrganizationIds = Array.from(
    new Set(
      templates
        .map((template) => template.organization_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const { data: sourceOrganizations } =
    sourceOrganizationIds.length > 0
      ? await db
          .from("organizations")
          .select("id,name")
          .in("id", sourceOrganizationIds)
      : { data: [] };

  const sourceNames = new Map(
    (sourceOrganizations ?? []).map((organization) => [
      organization.id,
      organization.name,
    ]),
  );

  const templateById = new Map(templates.map((template) => [template.id, template]));
  const completed = assignments.filter(
    (assignment) => assignment.status === "completed",
  ).length;
  const allCompleted = assignments.length > 0 && completed === assignments.length;
  const personName = `${personResult.data.first_name.trim()} ${personResult.data.last_name ?? ""}`.trim();

  function adaptText(value: string | null, template: Template) {
    if (!value) return value;
    const sourceName = template.organization_id
      ? sourceNames.get(template.organization_id)
      : null;
    if (!sourceName || sourceName === targetOrganization.name) return value;
    return value.split(sourceName).join(targetOrganization.name);
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-10">
      <div className="mx-auto max-w-4xl">
        <BrandHeader />

        <section className="mt-8 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <div className="bg-neutral-900 px-7 py-9 text-white md:px-10">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-400">
              Portal del participante
            </div>
            <h1 className="mt-3 text-3xl font-black md:text-4xl">
              Hola, {personResult.data.first_name.trim()}
            </h1>
            <p className="mt-3 max-w-2xl text-neutral-300">
              {targetOrganization.name} te ha asignado{" "}
              {assignments.length === 1
                ? "una evaluación"
                : `una batería de ${assignments.length} evaluaciones`}.
              Puedes completarlas desde esta misma liga.
            </p>
          </div>

          <div className="p-7 md:p-10">
            <div className="grid gap-4 rounded-2xl bg-neutral-50 p-5 md:grid-cols-3">
              <Info label="Participante" value={personName} />
              <Info
                label="Puesto"
                value={personResult.data.job_title ?? "No especificado"}
              />
              <Info
                label="Avance"
                value={`${completed} de ${assignments.length} completadas`}
              />
            </div>

            {allCompleted ? (
              <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <div className="text-3xl">✓</div>
                <h2 className="mt-2 text-xl font-black text-emerald-800">
                  Proceso completado
                </h2>
                <p className="mt-2 text-sm text-emerald-700">
                  Todas tus evaluaciones quedaron registradas. El equipo
                  responsable revisará los resultados.
                </p>
              </div>
            ) : (
              <div className="mt-7">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-neutral-900">
                      Tus evaluaciones
                    </h2>
                    <p className="mt-1 text-sm text-neutral-500">
                      Puedes realizarlas una por una; tu avance se guarda automáticamente.
                    </p>
                  </div>
                  <div className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                    {completed}/{assignments.length}
                  </div>
                </div>

                <div className="space-y-3">
                  {assignments.map((assignment, index) => {
                    const template = templateById.get(assignment.template_id);
                    if (!template) return null;

                    const isCompleted = assignment.status === "completed";
                    const isInProgress = assignment.status === "in_progress";

                    return (
                      <div
                        key={assignment.id}
                        className="flex flex-col gap-4 rounded-2xl border border-neutral-200 p-5 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                            Evaluación {index + 1}
                          </div>
                          <h3 className="mt-1 font-black text-neutral-900">
                            {template.name}
                          </h3>
                          {template.description && (
                            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-neutral-500">
                              {adaptText(template.description, template)}
                            </p>
                          )}
                        </div>

                        {isCompleted ? (
                          <span className="rounded-xl bg-emerald-50 px-4 py-2 text-center text-sm font-bold text-emerald-700">
                            Completada ✓
                          </span>
                        ) : (
                          <Link
                            href={`/e/${assignment.public_token}`}
                            className="rounded-xl bg-orange-500 px-5 py-3 text-center text-sm font-bold text-white hover:bg-orange-600"
                          >
                            {isInProgress ? "Continuar" : "Comenzar"}
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function BrandHeader() {
  return (
    <header className="flex items-center justify-between">
      <div>
        <div className="text-2xl font-black tracking-tight text-neutral-900">
          Factor<span className="text-orange-500">RH</span>
        </div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Evaluaciones
        </div>
      </div>
      <div className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-500 shadow-sm">
        Acceso personal
      </div>
    </header>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="mt-1 font-semibold text-neutral-900">{value}</div>
    </div>
  );
}

function PortalError() {
  return (
    <main className="min-h-screen bg-neutral-100 p-6">
      <div className="mx-auto mt-20 max-w-lg rounded-3xl border border-neutral-200 bg-white p-10 shadow-sm">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
          FactorRH Evaluaciones
        </div>
        <h1 className="mt-3 text-2xl font-black text-neutral-900">
          No pudimos abrir este proceso
        </h1>
        <p className="mt-3 text-neutral-600">
          Verifica que la liga sea correcta o solicita un nuevo acceso.
        </p>
      </div>
    </main>
  );
}
