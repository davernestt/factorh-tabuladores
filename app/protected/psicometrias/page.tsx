import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAppUser } from "@/lib/app-auth";
import { getPsychometricCatalogItem } from "@/lib/psychometric-catalog";
import CopyAssessmentLink from "../copy-assessment-link";

type Template = {
  id: string;
  name: string;
  description: string | null;
  assessment_type: string;
  version: number;
  validity_days: number | null;
};

type Assignment = {
  id: string;
  status: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  process_id: string;
  template_id: string;
};

type ProcessRow = {
  id: string;
  person_id: string;
  organization_id: string;
  name: string;
  public_token: string;
};

type Person = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  area: string | null;
};

type Organization = { id: string; name: string };
type Question = { id: string; template_id: string; question_type: string };
type ResponseRow = { assignment_id: string; question_id: string; numeric_value: number | string | null };

type PageSearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams: Promise<PageSearchParams>;
};

type ApplicationView = {
  assignment: Assignment;
  template: Template | undefined;
  process: ProcessRow | undefined;
  total: number;
  answered: number;
  progress: number;
};

type PersonGroup = {
  personId: string;
  person: Person | undefined;
  organization: Organization | undefined;
  applications: ApplicationView[];
  active: number;
  completed: number;
  pending: number;
  inProgress: number;
  latest: string | null;
};

export default function PsychometricsPage({ searchParams }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
          <p className="text-neutral-600">Cargando psicometrías...</p>
        </div>
      }
    >
      <PsychometricsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function PsychometricsContent({ searchParams }: PageProps) {
  const currentUser = await getCurrentAppUser();
  if (!currentUser) redirect("/auth/login");

  const isOwner = currentUser.role === "super_admin";
  const scopedOrganizationId =
    currentUser.role === "client" ? currentUser.organizationId : null;
  const params = await searchParams;
  const view = paramValue(params.view) === "pruebas" ? "pruebas" : "personas";
  const query = normalize(paramValue(params.q));
  const organizationFilter = paramValue(params.organization);
  const statusFilter = paramValue(params.status);

  const db = createAdminClient();

  const creditPlanR = scopedOrganizationId
    ? await db
        .from("organization_psychometric_credits")
        .select("plan_type,plan_name,credits_total,credits_used,valid_until,active")
        .eq("organization_id", scopedOrganizationId)
        .maybeSingle()
    : { data: null, error: null };

  if (creditPlanR.error) {
    return <ErrorCard message={creditPlanR.error.message} />;
  }

  const clientPlan = creditPlanR.data;
  const clientCreditsRemaining = clientPlan
    ? Math.max(0, Number(clientPlan.credits_total) - Number(clientPlan.credits_used))
    : null;
  const clientPlanExpired =
    Boolean(clientPlan?.valid_until) &&
    new Date(String(clientPlan?.valid_until) + "T23:59:59").getTime() <
      Date.now();
  const clientCanAssign =
    !scopedOrganizationId ||
    Boolean(
      clientPlan &&
        clientPlan.active &&
        !clientPlanExpired &&
        (clientCreditsRemaining ?? 0) > 0,
    );

  const templatesR = await db
    .from("assessment_templates")
    .select("id,name,description,assessment_type,version,validity_days")
    .like("assessment_type", "psychometric_%")
    .eq("active", true)
    .order("name");

  if (templatesR.error) return <ErrorCard message={templatesR.error.message} />;

  let templates = (templatesR.data ?? []) as Template[];

  if (scopedOrganizationId) {
    const accessR = await db
      .from("organization_assessment_templates")
      .select("template_id,enabled")
      .eq("organization_id", scopedOrganizationId)
      .eq("enabled", true);

    if (accessR.error) return <ErrorCard message={accessR.error.message} />;
    const allowedTemplateIds = new Set(
      (accessR.data ?? []).map((item) => item.template_id),
    );
    templates = templates.filter((item) => allowedTemplateIds.has(item.id));
  }

  const templateIds = templates.map((item) => item.id);

  const [assignmentsR, questionsR] = await Promise.all([
    templateIds.length
      ? db
          .from("assessment_assignments")
          .select("id,status,created_at,started_at,completed_at,process_id,template_id")
          .in("template_id", templateIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    templateIds.length
      ? db
          .from("assessment_questions")
          .select("id,template_id,question_type")
          .in("template_id", templateIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (assignmentsR.error || questionsR.error) {
    return <ErrorCard message={assignmentsR.error?.message ?? questionsR.error?.message ?? "Error"} />;
  }

  const assignments = (assignmentsR.data ?? []) as Assignment[];
  const questions = (questionsR.data ?? []) as Question[];
  const assignmentIds = assignments.map((item) => item.id);
  const processIds = Array.from(new Set(assignments.map((item) => item.process_id)));

  const [processesR, responsesR] = await Promise.all([
    processIds.length
      ? db
          .from("assessment_processes")
          .select("id,person_id,organization_id,name,public_token")
          .in("id", processIds)
      : Promise.resolve({ data: [], error: null }),
    assignmentIds.length
      ? db
          .from("assessment_responses")
          .select("assignment_id,question_id,numeric_value")
          .in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (processesR.error || responsesR.error) {
    return <ErrorCard message={processesR.error?.message ?? responsesR.error?.message ?? "Error"} />;
  }

  const processes = (processesR.data ?? []) as ProcessRow[];
  const personIds = Array.from(new Set(processes.map((item) => item.person_id)));
  const organizationIds = Array.from(new Set(processes.map((item) => item.organization_id)));

  const [peopleR, organizationsR] = await Promise.all([
    personIds.length
      ? db
          .from("people")
          .select("id,first_name,last_name,email,phone,job_title,area")
          .in("id", personIds)
      : Promise.resolve({ data: [], error: null }),
    organizationIds.length
      ? db.from("organizations").select("id,name").in("id", organizationIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (peopleR.error || organizationsR.error) {
    return <ErrorCard message={peopleR.error?.message ?? organizationsR.error?.message ?? "Error"} />;
  }

  const templateById = new Map(templates.map((item) => [item.id, item]));
  const processById = new Map(processes.map((item) => [item.id, item]));
  const peopleById = new Map(((peopleR.data ?? []) as Person[]).map((item) => [item.id, item]));
  const organizationById = new Map(((organizationsR.data ?? []) as Organization[]).map((item) => [item.id, item]));
  const responseRows = (responsesR.data ?? []) as ResponseRow[];

  const scoredQuestionIdsByTemplate = new Map<string, Set<string>>();
  for (const question of questions) {
    if (!["scale", "choice"].includes(question.question_type)) continue;
    const ids = scoredQuestionIdsByTemplate.get(question.template_id) ?? new Set<string>();
    ids.add(question.id);
    scoredQuestionIdsByTemplate.set(question.template_id, ids);
  }

  const answeredIdsByAssignment = new Map<string, Set<string>>();
  for (const response of responseRows) {
    if (response.numeric_value === null) continue;
    const ids = answeredIdsByAssignment.get(response.assignment_id) ?? new Set<string>();
    ids.add(response.question_id);
    answeredIdsByAssignment.set(response.assignment_id, ids);
  }

  const applications: ApplicationView[] = assignments.map((assignment) => {
    const total = scoredQuestionIdsByTemplate.get(assignment.template_id)?.size ?? 0;
    const validQuestionIds = scoredQuestionIdsByTemplate.get(assignment.template_id) ?? new Set<string>();
    const answered = Array.from(answeredIdsByAssignment.get(assignment.id) ?? new Set<string>())
      .filter((questionId) => validQuestionIds.has(questionId)).length;
    return {
      assignment,
      template: templateById.get(assignment.template_id),
      process: processById.get(assignment.process_id),
      total,
      answered,
      progress: total ? Math.round((answered / total) * 100) : 0,
    };
  });

  const visibleApplications = scopedOrganizationId
    ? applications.filter(
        (application) =>
          application.process?.organization_id === scopedOrganizationId,
      )
    : applications;

  const grouped = new Map<string, ApplicationView[]>();
  for (const application of visibleApplications) {
    const key = application.process?.person_id ?? "assignment:" + application.assignment.id;
    const list = grouped.get(key) ?? [];
    list.push(application);
    grouped.set(key, list);
  }

  const personGroups: PersonGroup[] = Array.from(grouped.entries())
    .map(([personId, list]) => {
      const ordered = [...list].sort(
        (a, b) =>
          new Date(
            b.assignment.completed_at ??
              b.assignment.started_at ??
              b.assignment.created_at,
          ).getTime() -
          new Date(
            a.assignment.completed_at ??
              a.assignment.started_at ??
              a.assignment.created_at,
          ).getTime(),
      );
      const process = ordered[0]?.process;
      const active = ordered.filter((item) =>
        ["pending", "in_progress"].includes(item.assignment.status),
      ).length;
      const completed = ordered.filter((item) => item.assignment.status === "completed").length;
      const pending = ordered.filter((item) => item.assignment.status === "pending").length;
      const inProgress = ordered.filter((item) => item.assignment.status === "in_progress").length;
      const latest =
        ordered[0]?.assignment.completed_at ??
        ordered[0]?.assignment.started_at ??
        ordered[0]?.assignment.created_at ??
        null;

      return {
        personId,
        person: peopleById.get(personId),
        organization: process ? organizationById.get(process.organization_id) : undefined,
        applications: ordered,
        active,
        completed,
        pending,
        inProgress,
        latest,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.latest ?? 0).getTime() - new Date(a.latest ?? 0).getTime(),
    );

  const filteredGroups = personGroups.filter((group) => {
    if (organizationFilter && group.organization?.id !== organizationFilter) return false;
    if (statusFilter === "active" && group.active === 0) return false;
    if (statusFilter === "pending" && group.pending === 0) return false;
    if (statusFilter === "in_progress" && group.inProgress === 0) return false;
    if (statusFilter === "completed" && group.completed === 0) return false;

    if (query) {
      const personName = group.person
        ? group.person.first_name + " " + (group.person.last_name ?? "")
        : "";
      const searchable = normalize(
        [
          personName,
          group.person?.job_title,
          group.person?.area,
          group.organization?.name,
          ...group.applications.map((item) => item.template?.name ?? ""),
        ].filter(Boolean).join(" "),
      );
      if (!searchable.includes(query)) return false;
    }
    return true;
  });

  const completed = visibleApplications.filter(
    (item) => item.assignment.status === "completed",
  ).length;
  const active = visibleApplications.filter((item) =>
    ["pending", "in_progress"].includes(item.assignment.status),
  ).length;

  const organizationOptions = Array.from(organizationById.values())
    .filter(
      (organization) =>
        !scopedOrganizationId || organization.id === scopedOrganizationId,
    )
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const publicCatalog = templates.map((template) => ({
    template,
    meta: getPsychometricCatalogItem(template.assessment_type),
    questions: scoredQuestionIdsByTemplate.get(template.id)?.size ?? 0,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm font-bold uppercase tracking-[.2em] text-orange-600">
            FactoRH · Psicometrías
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            Evaluación psicométrica
          </h1>
          <p className="mt-3 max-w-3xl text-neutral-600">
            Administración de candidatos, aplicaciones, avances, resultados y catálogo de instrumentos FactoRH.
          </p>
        </div>
        {clientCanAssign ? (
          <Link
            href="/protected/psicometrias/nueva?fresh=1"
            className="rounded-xl bg-orange-500 px-5 py-3 text-center text-sm font-bold text-white shadow-sm hover:bg-orange-600"
          >
            + Asignar psicometría
          </Link>
        ) : (
          <div className="rounded-xl bg-neutral-200 px-5 py-3 text-center text-sm font-bold text-neutral-500">
            Sin créditos disponibles
          </div>
        )}
      </div>

      {scopedOrganizationId && (
        <section
          className={
            clientCanAssign
              ? "rounded-3xl border border-orange-200 bg-orange-50 p-5"
              : "rounded-3xl border border-amber-200 bg-amber-50 p-5"
          }
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-700">
                {clientPlan?.plan_type === "package"
                  ? clientPlan.plan_name
                  : "Prueba gratuita FactoRH"}
              </div>
              <div className="mt-1 text-xl font-black text-neutral-900">
                {clientCreditsRemaining ?? 0} créditos disponibles
              </div>
              <p className="mt-1 text-sm text-neutral-600">
                {clientPlan?.plan_type === "trial"
                  ? "La demo incluye 2 aplicaciones. Cada liga permite una sola psicometría."
                  : "Cada instrumento nuevo consume 1 crédito. Puedes agrupar varias pruebas en una sola liga."}
              </p>
            </div>
            {clientPlan?.valid_until && (
              <div className="rounded-xl bg-white px-4 py-3 text-xs font-bold text-neutral-600 ring-1 ring-neutral-200">
                Vigencia: {new Date(clientPlan.valid_until + "T12:00:00").toLocaleDateString("es-MX")}
              </div>
            )}
          </div>
          {!clientCanAssign && (
            <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-amber-800">
              Para generar nuevas ligas, solicita a FactoRH la activación de un paquete de créditos.
            </p>
          )}
        </section>
      )}

      <nav className="flex flex-wrap gap-2 rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm">
        <Link
          href="/protected/psicometrias?view=personas"
          className={
            view === "personas"
              ? "rounded-xl bg-[#4A4A4A] px-5 py-3 text-sm font-bold text-white"
              : "rounded-xl px-5 py-3 text-sm font-bold text-neutral-600 hover:bg-neutral-50"
          }
        >
          Personas y resultados
        </Link>
        <Link
          href="/protected/psicometrias?view=pruebas"
          className={
            view === "pruebas"
              ? "rounded-xl bg-[#4A4A4A] px-5 py-3 text-sm font-bold text-white"
              : "rounded-xl px-5 py-3 text-sm font-bold text-neutral-600 hover:bg-neutral-50"
          }
        >
          Catálogo de pruebas
        </Link>
        <Link
          href="/protected/psicometrias/perfiles-puesto"
          className="rounded-xl px-5 py-3 text-sm font-bold text-neutral-600 hover:bg-neutral-50"
        >
          Perfiles de puesto
        </Link>
      </nav>

      <section className="grid gap-4 sm:grid-cols-4">
        <Metric label="Personas evaluadas" value={String(personGroups.length)} />
        <Metric label="Instrumentos" value={String(templates.length)} />
        <Metric label="Aplicaciones activas" value={String(active)} />
        <Metric label="Reportes generados" value={String(completed)} />
      </section>

      {view === "personas" ? (
        <>
          <form
            method="get"
            className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <input type="hidden" name="view" value="personas" />
            <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-400">
                  Buscar persona
                </span>
                <input
                  type="search"
                  name="q"
                  defaultValue={paramValue(params.q)}
                  placeholder="Nombre, puesto, área o prueba..."
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-400">
                  Empresa
                </span>
                <select
                  name="organization"
                  defaultValue={organizationFilter}
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">Todas</option>
                  {organizationOptions.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-400">
                  Estado
                </span>
                <select
                  name="status"
                  defaultValue={statusFilter}
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">Todos</option>
                  <option value="active">Con pruebas activas</option>
                  <option value="pending">Con pendientes</option>
                  <option value="in_progress">En proceso</option>
                  <option value="completed">Con completadas</option>
                </select>
              </label>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="rounded-xl bg-[#4A4A4A] px-5 py-3 text-sm font-bold text-white hover:bg-[#4A4A4A]"
                >
                  Filtrar
                </button>
                {(query || organizationFilter || statusFilter) && (
                  <Link
                    href="/protected/psicometrias?view=personas"
                    className="rounded-xl border border-neutral-300 px-4 py-3 text-sm font-bold text-neutral-600 hover:bg-neutral-50"
                  >
                    Limpiar
                  </Link>
                )}
              </div>
            </div>
          </form>

          <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 px-6 py-5">
              <h2 className="font-black text-neutral-900">Personas evaluadas</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Cada persona aparece una sola vez. Abre su expediente para revisar psicometrías, avances, fechas y reportes.
              </p>
            </div>

            {filteredGroups.length === 0 ? (
              <div className="p-10 text-center text-neutral-500">
                No encontré personas con los filtros seleccionados.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {filteredGroups.map((group) => {
                  const personName = group.person
                    ? `${group.person.first_name.trim()} ${group.person.last_name ?? ""}`.trim()
                    : "Sin participante";
                  return (
                    <details key={group.personId} className="group">
                      <summary className="cursor-pointer list-none px-6 py-5 transition hover:bg-neutral-50">
                        <div className="grid gap-4 md:grid-cols-[minmax(0,1.7fr)_minmax(140px,.9fr)_minmax(220px,1.2fr)_minmax(150px,.8fr)_auto] md:items-center">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="font-black text-neutral-900">{personName}</div>
                              <span className="text-neutral-400 transition group-open:rotate-90">›</span>
                            </div>
                            <div className="mt-1 text-xs text-neutral-500">
                              {[group.person?.job_title, group.person?.area].filter(Boolean).join(" · ") || "Sin puesto registrado"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">Empresa</div>
                            <div className="mt-1 text-sm font-semibold text-neutral-700">{group.organization?.name ?? "—"}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {group.active > 0 && (
                              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                                {group.active} {group.active === 1 ? "activa" : "activas"}
                              </span>
                            )}
                            {group.completed > 0 && (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                {group.completed} {group.completed === 1 ? "completada" : "completadas"}
                              </span>
                            )}
                          </div>
                          <div>
                            <StatusBadge
                              status={
                                group.inProgress > 0
                                  ? "in_progress"
                                  : group.pending > 0
                                    ? "pending"
                                    : "completed"
                              }
                            />
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-orange-600">Ver psicometrías</div>
                            <div className="mt-1 text-[11px] text-neutral-400">
                              {group.latest ? formatDate(group.latest) : "Sin actividad"}
                            </div>
                          </div>
                        </div>
                      </summary>

                      <div className="border-t border-neutral-100 bg-neutral-50/70 p-6">
                        <div className="space-y-6">
                          {groupApplicationsByProcess(group.applications).map((processGroup) => (
                            <section
                              key={processGroup.processId}
                              className="overflow-hidden rounded-3xl border border-neutral-200 bg-white"
                            >
                              <div className="flex flex-col gap-3 border-b border-neutral-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                  <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                                    Proceso psicométrico
                                  </div>
                                  <div className="mt-1 font-black text-neutral-900">
                                    {processGroup.name}
                                  </div>
                                  <div className="mt-1 text-xs text-neutral-500">
                                    {processGroup.completed} de {processGroup.total} pruebas concluidas
                                  </div>
                                </div>
                                {processGroup.completed === processGroup.total ? (
                                  <Link
                                    href={`/protected/psicometrias/integral/${processGroup.processId}`}
                                    className="rounded-xl bg-[#4A4A4A] px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-[#4A4A4A]"
                                  >
                                    Ver reporte integral
                                  </Link>
                                ) : (
                                  <div className="flex flex-col items-start gap-2 md:items-end">
                                    <div className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700">
                                      Integral disponible al concluir {processGroup.total - processGroup.completed}
                                    </div>
                                    {processGroup.publicToken && group.person && group.organization && (
                                      <CopyAssessmentLink
                                        path={`/p/${processGroup.publicToken}`}
                                        personName={personName}
                                        templateName={processGroup.name}
                                        organizationName={group.organization.name}
                                        email={group.person.email}
                                        phone={group.person.phone}
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="grid gap-4 p-4">
                                {processGroup.applications.map((application) => (
                                  <ApplicationCard key={application.assignment.id} application={application} />
                                ))}
                              </div>
                            </section>
                          ))}
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="space-y-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
              Catálogo psicométrico
            </div>
            <h2 className="mt-2 text-2xl font-black text-neutral-900">
              Pruebas disponibles
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
              Consulta qué evalúa cada instrumento, para qué perfiles resulta útil y en qué procesos puede utilizarse.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {publicCatalog.map(({ template, meta, questions: questionCount }) => (
              <article
                key={template.id}
                className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
              >
                <div className="text-xs font-bold uppercase tracking-wide text-orange-600">
                  Instrumento FactoRH · v{template.version}
                </div>
                <h3 className="mt-2 text-xl font-black text-neutral-900">
                  {meta?.publicName ?? template.name}
                </h3>
                <p className="mt-4 text-sm leading-6 text-neutral-600">
                  {meta?.publicDescription ?? template.description}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {questionCount > 0 && (
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                      {questionCount} reactivos
                    </span>
                  )}
                  {meta?.estimatedMinutes && (
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                      {meta.estimatedMinutes}
                    </span>
                  )}
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                    Vigencia: {template.validity_days ?? "Configurable"} días
                  </span>
                </div>

                {meta && (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                        Recomendada para
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {meta.recommendedFor.map((item) => (
                          <span key={item} className="rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                        Usos principales
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {meta.useCases.map((item) => (
                          <span key={item} className="rounded-lg bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-600">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {isOwner && meta && (
                  <div className="mt-5 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                      Referencia interna de diseño · sólo administración
                    </div>
                    <div className="mt-2 text-sm font-black text-neutral-900">
                      {meta.internalMarketReference}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-neutral-500">
                      {meta.internalReferenceNote}
                    </p>
                  </div>
                )}

                <div className="mt-5 border-t border-neutral-100 pt-5">
                  <Link
                    href="/protected/psicometrias/nueva?fresh=1"
                    className="text-sm font-bold text-orange-600 hover:text-orange-700"
                  >
                    Asignar instrumento →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function groupApplicationsByProcess(applications: ApplicationView[]) {
  const map = new Map<
    string,
    {
      processId: string;
      name: string;
      publicToken: string | null;
      applications: ApplicationView[];
      total: number;
      completed: number;
    }
  >();

  for (const application of applications) {
    const processId = application.process?.id ?? application.assignment.process_id;
    const current = map.get(processId) ?? {
      processId,
      name: application.process?.name ?? "Proceso psicométrico",
      publicToken: application.process?.public_token ?? null,
      applications: [],
      total: 0,
      completed: 0,
    };

    current.applications.push(application);
    current.total += 1;
    if (application.assignment.status === "completed") current.completed += 1;
    map.set(processId, current);
  }

  return Array.from(map.values()).sort((a, b) => {
    const aDate = a.applications[0]?.assignment.created_at ?? "";
    const bDate = b.applications[0]?.assignment.created_at ?? "";
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });
}

function ApplicationCard({ application }: { application: ApplicationView }) {
  const { assignment, template, process, total, answered, progress } = application;
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(130px,.7fr)_minmax(200px,1fr)_minmax(160px,.8fr)_auto] lg:items-center">
        <div>
          <div className="font-black text-neutral-900">{template?.name ?? "Psicometría"}</div>
          <div className="mt-1 text-xs text-neutral-500">{process?.name ?? "Proceso psicométrico"}</div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
            <span>Asignada: {formatDate(assignment.created_at)}</span>
            {assignment.started_at && <span>Iniciada: {formatDate(assignment.started_at)}</span>}
            {assignment.completed_at && <span>Finalizada: {formatDate(assignment.completed_at)}</span>}
          </div>
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">Estado</div>
          <div className="mt-2"><StatusBadge status={assignment.status} /></div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-600">Avance</span>
            <span className="font-bold text-neutral-900">{answered}/{total} · {progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">Resultado</div>
          <div className="mt-1 text-sm font-bold text-neutral-700">
            {assignment.status === "completed" ? "Reporte disponible" : "En captura"}
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 lg:items-end">
          {assignment.status === "completed" ? (
            <Link
              href={`/protected/psicometrias/${assignment.id}`}
              className="text-sm font-bold text-orange-600 hover:text-orange-700"
            >
              Ver reporte
            </Link>
          ) : (
            <span className="text-xs font-semibold text-neutral-400">
              Seguimiento en proceso
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">{label}</div>
      <div className="mt-2 text-3xl font-black text-neutral-900">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: "Pendiente",
    in_progress: "En proceso",
    completed: "Completada",
    cancelled: "Cancelada",
  };
  const classes: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    in_progress: "bg-blue-50 text-blue-700",
    completed: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-neutral-100 text-neutral-500",
  };
  return (
    <span className={"inline-flex rounded-full px-3 py-1 text-xs font-bold " + (classes[status] ?? classes.cancelled)}>
      {labels[status] ?? status}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-7">
      <h1 className="font-bold text-red-800">No fue posible cargar Psicometrías</h1>
      <p className="mt-2 text-sm text-red-700">{message}</p>
    </div>
  );
}
