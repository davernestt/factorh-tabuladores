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

export default function AdminDashboard() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
          <p className="text-neutral-600">Cargando panel de evaluaciones...</p>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}

async function AdminDashboardContent() {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();

  if (authError || !authData?.claims) {
    redirect("/auth/login");
  }

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
            {total} {total === 1 ? "evaluación" : "evaluaciones"}
          </div>
          <a
            href="/protected/nueva-evaluacion?fresh=1"
            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-orange-600"
          >
            + Nueva evaluación
          </a>
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Total" value={String(total)} />
        <Metric label="Pendientes" value={String(pending)} />
        <Metric label="En proceso" value={String(inProgress)} />
        <Metric label="Completadas" value={String(completed)} />
        <Metric
          label="Promedio general"
          value={globalAverage === null ? "—" : globalAverage.toFixed(2)}
          suffix={globalAverage === null ? undefined : "/ 5"}
        />
      </div>

      <section className="mt-7 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-6 py-5">
          <h2 className="font-bold text-neutral-900">Procesos y participantes</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Abre cualquier registro para revisar su resultado por dimensión.
          </p>
        </div>

        {assignments.length === 0 ? (
          <div className="p-10 text-center text-neutral-500">
            Aún no hay evaluaciones asignadas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Participante</th>
                  <th className="px-6 py-4 font-semibold">Empresa</th>
                  <th className="px-6 py-4 font-semibold">Evaluación</th>
                  <th className="px-6 py-4 font-semibold">Estado</th>
                  <th className="px-6 py-4 font-semibold">Avance</th>
                  <th className="px-6 py-4 font-semibold">Resultado</th>
                  <th className="px-6 py-4 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {assignments.map((assignment) => {
                  const process = processes.get(assignment.process_id);
                  const person = process ? people.get(process.person_id) : undefined;
                  const organization = process
                    ? organizations.get(process.organization_id)
                    : undefined;
                  const template = templates.get(assignment.template_id);
                  const scaleTotal =
                    scaleTotalByTemplate.get(assignment.template_id) ?? 0;
                  const scaleAnswered =
                    scaleAnsweredByAssignment.get(assignment.id) ?? 0;
                  const progress = scaleTotal
                    ? Math.round((scaleAnswered / scaleTotal) * 100)
                    : 0;
                  const scores = scoresByAssignment.get(assignment.id) ?? [];
                  const average = scores.length
                    ? scores.reduce((sum, value) => sum + value, 0) /
                      scores.length
                    : null;

                  const personName = person
                    ? `${person.first_name.trim()} ${person.last_name ?? ""}`.trim()
                    : assignment.evaluator_name ?? "Sin participante";

                  return (
                    <tr key={assignment.id} className="align-top">
                      <td className="px-6 py-5">
                        <div className="font-semibold text-neutral-900">
                          {personName}
                        </div>
                        <div className="mt-1 text-xs text-neutral-500">
                          {[person?.job_title, person?.area]
                            .filter(Boolean)
                            .join(" · ") || "Sin puesto registrado"}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-neutral-600">
                        {organization?.name ?? "—"}
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-medium text-neutral-800">
                          {template?.name ?? "Evaluación"}
                        </div>
                        <div className="mt-1 text-xs text-neutral-500">
                          {process?.name ?? "Proceso"}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-neutral-600">
                          {assignment.relationship_type === "self"
                            ? "Responde la persona evaluada"
                            : `Evalúa: ${assignment.evaluator_name ?? "Sin nombre"} · ${relationshipLabel(assignment.relationship_type)}`}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={assignment.status} />
                      </td>
                      <td className="min-w-40 px-6 py-5">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-semibold text-neutral-800">
                            {scaleAnswered}/{scaleTotal}
                          </span>
                          <span className="text-neutral-500">{progress}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full bg-orange-500"
                            style={{ width: `${Math.min(100, progress)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {average === null ? (
                          <span className="text-neutral-400">—</span>
                        ) : (
                          <div>
                            <span className="text-xl font-black text-neutral-900">
                              {average.toFixed(2)}
                            </span>
                            <span className="ml-1 text-xs text-neutral-500">/ 5</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-2">
                          <Link
                            href={`/protected/procesos/${assignment.process_id}/editar`}
                            className="text-xs font-bold text-neutral-700 hover:text-orange-600"
                          >
                            Editar proceso
                          </Link>
                          <Link
                            href={`/protected/evaluaciones/${assignment.id}`}
                            className="font-semibold text-orange-600 hover:text-orange-700"
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
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
