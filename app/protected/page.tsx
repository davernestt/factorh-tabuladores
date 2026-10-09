import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import DeleteAssessmentButton from "./delete-assessment-button";
import { relationshipLabel } from "@/lib/pdl-evaluation-role";

type Assignment = {
  id: string;
  status: string;
  evaluator_name: string | null;
  relationship_type: string;
  public_token: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  process_id: string;
  template_id: string;
};

type ProcessRow = {
  id: string;
  name: string;
  person_id: string;
  organization_id: string;
};

type Person = {
  id: string;
  first_name: string;
  last_name: string | null;
  job_title: string | null;
  area: string | null;
};

type Organization = {
  id: string;
  name: string;
};

type Template = {
  id: string;
  name: string;
  assessment_type: string;
};

type Question = {
  id: string;
  template_id: string;
  question_type: string;
};

type ResponseRow = {
  assignment_id: string;
  question_id: string;
};

type ResultRow = {
  assignment_id: string;
  score: number | string;
};

type ParticipantAssignmentView = {
  assignment: Assignment;
  process: ProcessRow | undefined;
  person: Person | undefined;
  organization: Organization | undefined;
  template: Template | undefined;
  scaleTotal: number;
  scaleAnswered: number;
  progress: number;
  average: number | null;
};

type ParticipantGroup = {
  personId: string;
  person: Person | undefined;
  organizationId: string | null;
  organizationName: string;
  assignments: ParticipantAssignmentView[];
  activeCount: number;
  completedCount: number;
  pendingCount: number;
  inProgressCount: number;
  cancelledCount: number;
  overallStatus: string;
  latestActivity: string | null;
};

type DashboardSearchParams = Record<string, string | string[] | undefined>;

type DashboardProps = {
  searchParams: Promise<DashboardSearchParams>;
};

export default function AdminDashboard({ searchParams }: DashboardProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
          <p className="text-neutral-600">Cargando panel de evaluaciones...</p>
        </div>
      }
    >
      <AdminDashboardContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminDashboardContent({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();

  if (authError || !authData?.claims) {
    redirect("/auth/login");
  }

  const params = await searchParams;
  const query = normalizeSearch(paramValue(params.q));
  const organizationFilter = paramValue(params.organization);
  const statusFilter = paramValue(params.status);
  const areaFilter = paramValue(params.area);
  const templateFilter = paramValue(params.template);

  const db = createAdminClient();

  const [
    assignmentsResult,
    processesResult,
    peopleResult,
    organizationsResult,
    templatesResult,
    questionsResult,
    responsesResult,
    resultsResult,
  ] = await Promise.all([
    db
      .from("assessment_assignments")
      .select(
        "id,status,evaluator_name,relationship_type,public_token,created_at,started_at,completed_at,process_id,template_id",
      )
      .order("created_at", { ascending: false }),
    db
      .from("assessment_processes")
      .select("id,name,person_id,organization_id"),
    db
      .from("people")
      .select("id,first_name,last_name,job_title,area"),
    db.from("organizations").select("id,name"),
    db.from("assessment_templates").select("id,name,assessment_type"),
    db
      .from("assessment_questions")
      .select("id,template_id,question_type"),
    db
      .from("assessment_responses")
      .select("assignment_id,question_id"),
    db.from("assessment_results").select("assignment_id,score"),
  ]);

  const firstError =
    assignmentsResult.error ||
    processesResult.error ||
    peopleResult.error ||
    organizationsResult.error ||
    templatesResult.error ||
    questionsResult.error ||
    responsesResult.error ||
    resultsResult.error;

  if (firstError) {
    return (
      <ErrorCard message={firstError.message} />
    );
  }

  const assignments = (assignmentsResult.data ?? []) as Assignment[];
  const processes = new Map(
    ((processesResult.data ?? []) as ProcessRow[]).map((row) => [row.id, row]),
  );
  const people = new Map(
    ((peopleResult.data ?? []) as Person[]).map((row) => [row.id, row]),
  );
  const organizations = new Map(
    ((organizationsResult.data ?? []) as Organization[]).map((row) => [
      row.id,
      row,
    ]),
  );
  const templates = new Map(
    ((templatesResult.data ?? []) as Template[]).map((row) => [row.id, row]),
  );
  const questions = (questionsResult.data ?? []) as Question[];
  const responses = (responsesResult.data ?? []) as ResponseRow[];
  const resultRows = (resultsResult.data ?? []) as ResultRow[];

  const questionTypeById = new Map(
    questions.map((question) => [question.id, question.question_type]),
  );

  const scaleTotalByTemplate = new Map<string, number>();
  for (const question of questions) {
    if (question.question_type !== "scale") continue;
    scaleTotalByTemplate.set(
      question.template_id,
      (scaleTotalByTemplate.get(question.template_id) ?? 0) + 1,
    );
  }

  const scaleAnsweredByAssignment = new Map<string, number>();
  for (const response of responses) {
    if (questionTypeById.get(response.question_id) !== "scale") continue;
    scaleAnsweredByAssignment.set(
      response.assignment_id,
      (scaleAnsweredByAssignment.get(response.assignment_id) ?? 0) + 1,
    );
  }

  const scoresByAssignment = new Map<string, number[]>();
  for (const result of resultRows) {
    const list = scoresByAssignment.get(result.assignment_id) ?? [];
    list.push(Number(result.score));
    scoresByAssignment.set(result.assignment_id, list);
  }

  const total = assignments.length;
  const completed = assignments.filter((item) => item.status === "completed").length;
  const inProgress = assignments.filter(
    (item) => item.status === "in_progress",
  ).length;
  const pending = assignments.filter((item) => item.status === "pending").length;

  const completedAverages = assignments
    .filter((assignment) => assignment.status === "completed")
    .map((assignment) => {
      const values = scoresByAssignment.get(assignment.id) ?? [];
      if (!values.length) return null;
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    })
    .filter((value): value is number => value !== null);

  const globalAverage = completedAverages.length
    ? completedAverages.reduce((sum, value) => sum + value, 0) /
      completedAverages.length
    : null;


  const assignmentViews: ParticipantAssignmentView[] = assignments.map((assignment) => {
    const process = processes.get(assignment.process_id);
    const person = process ? people.get(process.person_id) : undefined;
    const organization = process
      ? organizations.get(process.organization_id)
      : undefined;
    const template = templates.get(assignment.template_id);
    const scaleTotal = scaleTotalByTemplate.get(assignment.template_id) ?? 0;
    const scaleAnswered = scaleAnsweredByAssignment.get(assignment.id) ?? 0;
    const progress = scaleTotal
      ? Math.round((scaleAnswered / scaleTotal) * 100)
      : 0;
    const scores = scoresByAssignment.get(assignment.id) ?? [];
    const average = scores.length
      ? scores.reduce((sum, value) => sum + value, 0) / scores.length
      : null;

    return {
      assignment,
      process,
      person,
      organization,
      template,
      scaleTotal,
      scaleAnswered,
      progress,
      average,
    };
  });

  const grouped = new Map<string, ParticipantAssignmentView[]>();
  for (const view of assignmentViews) {
    const key = view.process?.person_id ?? `assignment:${view.assignment.id}`;
    const list = grouped.get(key) ?? [];
    list.push(view);
    grouped.set(key, list);
  }

  const participantGroups: ParticipantGroup[] = Array.from(grouped.entries())
    .map(([personId, views]) => {
      const sortedViews = [...views].sort((a, b) => {
        const statusRank: Record<string, number> = {
          in_progress: 0,
          pending: 1,
          completed: 2,
          cancelled: 3,
        };
        const rankDiff =
          (statusRank[a.assignment.status] ?? 9) -
          (statusRank[b.assignment.status] ?? 9);
        if (rankDiff !== 0) return rankDiff;

        return (
          new Date(
            b.assignment.completed_at ??
              b.assignment.started_at ??
              b.assignment.created_at,
          ).getTime() -
          new Date(
            a.assignment.completed_at ??
              a.assignment.started_at ??
              a.assignment.created_at,
          ).getTime()
        );
      });

      const activeCount = sortedViews.filter((view) =>
        ["pending", "in_progress"].includes(view.assignment.status),
      ).length;
      const completedCount = sortedViews.filter(
        (view) => view.assignment.status === "completed",
      ).length;
      const pendingCount = sortedViews.filter(
        (view) => view.assignment.status === "pending",
      ).length;
      const inProgressCount = sortedViews.filter(
        (view) => view.assignment.status === "in_progress",
      ).length;
      const cancelledCount = sortedViews.filter(
        (view) => view.assignment.status === "cancelled",
      ).length;
      const overallStatus = inProgressCount
        ? "in_progress"
        : pendingCount
          ? "pending"
          : completedCount
            ? "completed"
            : "cancelled";

      const latest = sortedViews
        .map(
          (view) =>
            view.assignment.completed_at ??
            view.assignment.started_at ??
            view.assignment.created_at,
        )
        .filter(Boolean)
        .sort(
          (a, b) => new Date(b).getTime() - new Date(a).getTime(),
        )[0] ?? null;

      return {
        personId,
        person: sortedViews[0]?.person,
        organizationId: sortedViews[0]?.process?.organization_id ?? null,
        organizationName: sortedViews[0]?.organization?.name ?? "—",
        assignments: sortedViews,
        activeCount,
        completedCount,
        pendingCount,
        inProgressCount,
        cancelledCount,
        overallStatus,
        latestActivity: latest,
      };
    })
    .sort((a, b) => {
      const aActive = a.activeCount > 0 ? 0 : 1;
      const bActive = b.activeCount > 0 ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return (
        new Date(b.latestActivity ?? 0).getTime() -
        new Date(a.latestActivity ?? 0).getTime()
      );
    });

  const participantCount = participantGroups.length;

  const organizationOptions = Array.from(organizations.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );
  const areaOptions = Array.from(
    new Set(
      participantGroups
        .map((group) => group.person?.area?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((a, b) => a.localeCompare(b, "es"));
  const templateOptions = Array.from(templates.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );

  const filteredParticipantGroups = participantGroups.filter((group) => {
    if (
      organizationFilter &&
      group.organizationId !== organizationFilter
    ) {
      return false;
    }

    if (areaFilter && group.person?.area?.trim() !== areaFilter) {
      return false;
    }

    if (statusFilter === "active" && group.activeCount === 0) return false;
    if (statusFilter === "pending" && group.pendingCount === 0) return false;
    if (statusFilter === "in_progress" && group.inProgressCount === 0) return false;
    if (statusFilter === "completed" && group.completedCount === 0) return false;
    if (statusFilter === "cancelled" && group.cancelledCount === 0) return false;

    if (
      templateFilter &&
      !group.assignments.some(
        (view) => view.assignment.template_id === templateFilter,
      )
    ) {
      return false;
    }

    if (query) {
      const searchable = normalizeSearch(
        [
          group.person?.first_name,
          group.person?.last_name,
          group.person?.job_title,
          group.person?.area,
          group.organizationName,
          ...group.assignments.map((view) => view.template?.name),
          ...group.assignments.map((view) => view.process?.name),
        ]
          .filter(Boolean)
          .join(" "),
      );
      if (!searchable.includes(query)) return false;
    }

    return true;
  });

  const filteredViews = filteredParticipantGroups.flatMap(
    (group) => group.assignments,
  );
  const filteredTotal = filteredViews.length;
  const filteredCompleted = filteredViews.filter(
    (view) => view.assignment.status === "completed",
  ).length;
  const filteredInProgress = filteredViews.filter(
    (view) => view.assignment.status === "in_progress",
  ).length;
  const filteredPending = filteredViews.filter(
    (view) => view.assignment.status === "pending",
  ).length;
  const filteredCompletedAverages = filteredViews
    .filter((view) => view.assignment.status === "completed")
    .map((view) => view.average)
    .filter((value): value is number => value !== null);
  const filteredGlobalAverage = filteredCompletedAverages.length
    ? filteredCompletedAverages.reduce((sum, value) => sum + value, 0) /
      filteredCompletedAverages.length
    : null;

  const hasFilters = Boolean(
    query ||
      organizationFilter ||
      statusFilter ||
      areaFilter ||
      templateFilter,
  );

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Panel administrativo
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            Evaluaciones
          </h1>
          <p className="mt-2 text-neutral-600">
            Seguimiento de participantes, avance y resultados.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-500 shadow-sm">
            {filteredParticipantGroups.length} {filteredParticipantGroups.length === 1 ? "persona" : "personas"} · {filteredTotal} {filteredTotal === 1 ? "evaluación" : "evaluaciones"}
          </div>
          <a
            href="/protected/nueva-evaluacion?fresh=1"
            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-orange-600"
          >
            + Nueva evaluación
          </a>
        </div>
      </div>

      <form
        method="get"
        className="mt-7 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">
              Buscar y filtrar
            </div>
            <h2 className="mt-1 text-lg font-black text-neutral-900">
              Encuentra personas rápido
            </h2>
          </div>
          <div className="text-xs text-neutral-500">
            Mostrando {filteredParticipantGroups.length} de {participantCount} personas
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(260px,1.5fr)_minmax(180px,1fr)_minmax(170px,.85fr)_minmax(170px,.85fr)_minmax(220px,1.2fr)_auto]">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-400">
              Buscar persona
            </span>
            <input
              type="search"
              name="q"
              defaultValue={paramValue(params.q)}
              placeholder="Nombre, puesto, área o prueba..."
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <label className="block">
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

          <label className="block">
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
              <option value="cancelled">Con canceladas</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-400">
              Área
            </span>
            <select
              name="area"
              defaultValue={areaFilter}
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
              <option value="">Todas</option>
              {areaOptions.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-400">
              Prueba
            </span>
            <select
              name="template"
              defaultValue={templateFilter}
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
              <option value="">Todas</option>
              {templateOptions.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white hover:bg-neutral-800"
            >
              Filtrar
            </button>
            {hasFilters && (
              <Link
                href="/protected"
                className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-bold text-neutral-600 hover:bg-neutral-50"
              >
                Limpiar
              </Link>
            )}
          </div>
        </div>
      </form>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Total" value={String(filteredTotal)} />
        <Metric label="Pendientes" value={String(filteredPending)} />
        <Metric label="En proceso" value={String(filteredInProgress)} />
        <Metric label="Completadas" value={String(filteredCompleted)} />
        <Metric
          label="Promedio general"
          value={filteredGlobalAverage === null ? "—" : filteredGlobalAverage.toFixed(2)}
          suffix={filteredGlobalAverage === null ? undefined : "/ 5"}
        />
      </div>

      <section className="mt-7 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-6 py-5">
          <h2 className="font-bold text-neutral-900">Personas evaluadas</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Cada persona aparece una sola vez. Abre su registro para ver sus pruebas activas, avance, fechas, resultados e historial.
          </p>
        </div>

        {filteredParticipantGroups.length === 0 ? (
          <div className="p-10 text-center text-neutral-500">
            {hasFilters
              ? "No encontré personas con los filtros seleccionados."
              : "Aún no hay evaluaciones asignadas."}
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredParticipantGroups.map((group) => {
              const personName = group.person
                ? `${group.person.first_name.trim()} ${group.person.last_name ?? ""}`.trim()
                : "Sin participante";

              const activeAssignments = group.assignments.filter((view) =>
                ["pending", "in_progress"].includes(view.assignment.status),
              );
              const historicalAssignments = group.assignments.filter(
                (view) =>
                  !["pending", "in_progress"].includes(view.assignment.status),
              );

              return (
                <details key={group.personId} className="group">
                  <summary className="cursor-pointer list-none px-6 py-5 transition hover:bg-neutral-50">
                    <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(160px,1fr)_minmax(220px,1.2fr)_minmax(150px,.8fr)_auto] md:items-center">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="font-black text-neutral-900">{personName}</div>
                          <span className="text-neutral-400 transition group-open:rotate-90">›</span>
                        </div>
                        <div className="mt-1 text-xs text-neutral-500">
                          {[group.person?.job_title, group.person?.area]
                            .filter(Boolean)
                            .join(" · ") || "Sin puesto registrado"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                          Empresa
                        </div>
                        <div className="mt-1 text-sm font-semibold text-neutral-700">
                          {group.organizationName}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                          Pruebas
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {group.activeCount > 0 && (
                            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                              {group.activeCount} {group.activeCount === 1 ? "activa" : "activas"}
                            </span>
                          )}
                          {group.completedCount > 0 && (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                              {group.completedCount} {group.completedCount === 1 ? "completada" : "completadas"}
                            </span>
                          )}
                          {group.cancelledCount > 0 && (
                            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-500">
                              {group.cancelledCount} {group.cancelledCount === 1 ? "cancelada" : "canceladas"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                          Estado general
                        </div>
                        <div className="mt-1">
                          <StatusBadge status={group.overallStatus} />
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-semibold text-orange-600">
                          Ver pruebas
                        </div>
                        <div className="mt-1 text-[11px] text-neutral-400">
                          {group.latestActivity ? `Última actividad: ${formatPanelDate(group.latestActivity)}` : "Sin actividad"}
                        </div>
                      </div>
                    </div>
                  </summary>

                  <div className="border-t border-neutral-100 bg-neutral-50/70 px-6 py-6">
                    {activeAssignments.length > 0 && (
                      <div>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="font-black text-neutral-900">Pruebas activas</h3>
                          <span className="text-xs text-neutral-400">
                            Pendientes y en proceso
                          </span>
                        </div>
                        <div className="grid gap-4">
                          {activeAssignments.map((view) => (
                            <AssessmentCard
                              key={view.assignment.id}
                              view={view}
                              personName={personName}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {historicalAssignments.length > 0 && (
                      <div className={activeAssignments.length ? "mt-7" : ""}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="font-black text-neutral-900">Historial</h3>
                          <span className="text-xs text-neutral-400">
                            Completadas y canceladas
                          </span>
                        </div>
                        <div className="grid gap-4">
                          {historicalAssignments.map((view) => (
                            <AssessmentCard
                              key={view.assignment.id}
                              view={view}
                              personName={personName}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}


function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function AssessmentCard({
  view,
  personName,
}: {
  view: ParticipantAssignmentView;
  personName: string;
}) {
  const {
    assignment,
    process,
    template,
    scaleTotal,
    scaleAnswered,
    progress,
    average,
  } = view;

  const appliedDate =
    assignment.started_at ??
    assignment.created_at;
  const finishedDate = assignment.completed_at;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(140px,.7fr)_minmax(180px,1fr)_minmax(150px,.7fr)_auto] lg:items-center">
        <div>
          <div className="font-black text-neutral-900">
            {template?.name ?? "Evaluación"}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            {process?.name ?? "Proceso"}
          </div>
          <div className="mt-2 text-xs font-semibold text-neutral-600">
            {assignment.relationship_type === "self"
              ? "Responde la persona evaluada"
              : `Evalúa: ${assignment.evaluator_name ?? "Sin nombre"} · ${relationshipLabel(assignment.relationship_type)}`}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
            <span>Asignada: {formatPanelDate(assignment.created_at)}</span>
            {assignment.started_at && (
              <span>Iniciada: {formatPanelDate(assignment.started_at)}</span>
            )}
            {finishedDate && (
              <span>Finalizada: {formatPanelDate(finishedDate)}</span>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Estado
          </div>
          <div className="mt-2">
            <StatusBadge status={assignment.status} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-neutral-700">Avance</span>
            <span className="font-bold text-neutral-900">
              {scaleAnswered}/{scaleTotal} · {progress}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-orange-500"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <div className="mt-2 text-[11px] text-neutral-400">
            {appliedDate ? `Actividad desde ${formatPanelDate(appliedDate)}` : "Sin actividad"}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Resultado
          </div>
          <div className="mt-1">
            {average === null ? (
              <span className="text-neutral-400">—</span>
            ) : (
              <>
                <span className="text-2xl font-black text-neutral-900">
                  {average.toFixed(2)}
                </span>
                <span className="ml-1 text-xs text-neutral-500">/ 5</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 lg:items-end">
          <Link
            href={`/protected/procesos/${assignment.process_id}/editar`}
            className="text-xs font-bold text-neutral-700 hover:text-orange-600"
          >
            Editar proceso
          </Link>
          <Link
            href={`/protected/evaluaciones/${assignment.id}`}
            className="text-sm font-bold text-orange-600 hover:text-orange-700"
          >
            Ver detalle
          </Link>
          {assignment.status === "completed" &&
            template?.assessment_type?.startsWith("leadership") && (
              <Link
                href={`/protected/evaluaciones/${assignment.id}/reporte`}
                className="text-xs font-bold text-neutral-900 hover:text-orange-600"
              >
                Ver reporte
              </Link>
            )}
          {assignment.status !== "completed" &&
            assignment.status !== "cancelled" && (
              <Link
                href={`/e/${assignment.public_token}`}
                target="_blank"
                className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
              >
                Abrir evaluación
              </Link>
            )}
          <DeleteAssessmentButton
            assignmentId={assignment.id}
            participantName={personName}
            templateName={template?.name ?? "Evaluación"}
          />
        </div>
      </div>
    </div>
  );
}

function formatPanelDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function Metric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="mt-2">
        <span className="text-3xl font-black tracking-tight text-neutral-900">
          {value}
        </span>
        {suffix && <span className="ml-1 text-sm text-neutral-500">{suffix}</span>}
      </div>
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
    cancelled: "bg-neutral-100 text-neutral-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        classes[status] ?? classes.cancelled
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-7">
      <h1 className="font-bold text-red-800">No fue posible cargar el panel</h1>
      <p className="mt-2 text-sm text-red-700">{message}</p>
    </div>
  );
}
