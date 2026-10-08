import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { relationshipLabel } from "@/lib/pdl-evaluation-role";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function EvaluationDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
          <p className="text-neutral-600">Cargando detalle de evaluación...</p>
        </div>
      }
    >
      <EvaluationDetailContent params={params} />
    </Suspense>
  );
}

async function EvaluationDetailContent({ params }: PageProps) {
  const authClient = await createClient();
  const { data: authData, error: authError } = await authClient.auth.getClaims();

  if (authError || !authData?.claims) {
    redirect("/auth/login");
  }

  const { id } = await params;
  const db = createAdminClient();

  const { data: assignment, error: assignmentError } = await db
    .from("assessment_assignments")
    .select(
      "id,status,evaluator_name,evaluator_email,evaluator_phone,relationship_type,public_token,created_at,started_at,completed_at,process_id,template_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (assignmentError) {
    return <ErrorCard message={assignmentError.message} />;
  }

  if (!assignment) {
    notFound();
  }

  const [
    processResult,
    templateResult,
    dimensionsResult,
    resultsResult,
    questionsResult,
    responsesResult,
  ] = await Promise.all([
    db
      .from("assessment_processes")
      .select("id,name,person_id,organization_id")
      .eq("id", assignment.process_id)
      .single(),
    db
      .from("assessment_templates")
      .select("id,name,description,assessment_type")
      .eq("id", assignment.template_id)
      .single(),
    db
      .from("assessment_dimensions")
      .select("id,name,sort_order")
      .eq("template_id", assignment.template_id)
      .order("sort_order"),
    db
      .from("assessment_results")
      .select("dimension_id,score,percentage,answered_questions")
      .eq("assignment_id", assignment.id),
    db
      .from("assessment_questions")
      .select("id,question_type,required")
      .eq("template_id", assignment.template_id),
    db
      .from("assessment_responses")
      .select("question_id,text_value,numeric_value")
      .eq("assignment_id", assignment.id),
  ]);

  const firstError =
    processResult.error ||
    templateResult.error ||
    dimensionsResult.error ||
    resultsResult.error ||
    questionsResult.error ||
    responsesResult.error;

  if (firstError) {
    return <ErrorCard message={firstError.message} />;
  }

  const processData = processResult.data;
  const [personResult, organizationResult] = await Promise.all([
    db
      .from("people")
      .select("first_name,last_name,job_title,area")
      .eq("id", processData.person_id)
      .single(),
    db
      .from("organizations")
      .select("name")
      .eq("id", processData.organization_id)
      .single(),
  ]);

  if (personResult.error) {
    return <ErrorCard message={personResult.error.message} />;
  }

  if (organizationResult.error) {
    return <ErrorCard message={organizationResult.error.message} />;
  }

  const person = personResult.data;
  const organization = organizationResult.data;
  const template = templateResult.data;
  const dimensions = dimensionsResult.data ?? [];
  const resultByDimension = new Map(
    (resultsResult.data ?? []).map((result) => [result.dimension_id, result]),
  );
  const questionTypeById = new Map(
    (questionsResult.data ?? []).map((question) => [
      question.id,
      question.question_type,
    ]),
  );

  const responses = responsesResult.data ?? [];
  const scaleTotal = (questionsResult.data ?? []).filter(
    (question) => question.question_type === "scale",
  ).length;
  const scaleAnswered = responses.filter(
    (response) => questionTypeById.get(response.question_id) === "scale",
  ).length;
  const textAnswered = responses.filter(
    (response) =>
      questionTypeById.get(response.question_id) === "text" &&
      typeof response.text_value === "string" &&
      response.text_value.trim().length > 0,
  ).length;

  const scores = Array.from(resultByDimension.values()).map((result) =>
    Number(result.score),
  );
  const overallAverage = scores.length
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : null;

  const personName = `${person.first_name.trim()} ${person.last_name ?? ""}`.trim();

  return (
    <div>
      <Link
        href="/protected"
        className="text-sm font-semibold text-neutral-500 hover:text-neutral-900"
      >
        ← Volver a evaluaciones
      </Link>

      <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            {organization.name}
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            {personName}
          </h1>
          <p className="mt-2 text-neutral-600">
            {[person.job_title, person.area].filter(Boolean).join(" · ") ||
              "Sin puesto registrado"}
          </p>
          <p className="mt-1 text-sm text-neutral-500">{processData.name}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={assignment.status} />
          {assignment.status === "completed" &&
            template.assessment_type?.startsWith("leadership") && (
              <Link
                href={`/protected/evaluaciones/${assignment.id}/reporte`}
                className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white hover:bg-neutral-800"
              >
                Ver reporte
              </Link>
            )}
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Evaluación" value={template.name} small />
        <Metric
          label="Fuente"
          value={
            assignment.relationship_type === "self"
              ? "Autoevaluación"
              : `${relationshipLabel(assignment.relationship_type)} · ${assignment.evaluator_name ?? "Sin nombre"}`
          }
          small
        />
        <Metric
          label="Avance"
          value={`${scaleAnswered}/${scaleTotal}`}
          suffix="reactivos"
        />
        <Metric label="Abiertas" value={String(textAnswered)} suffix="guardadas" />
        <Metric
          label="Resultado global"
          value={overallAverage === null ? "—" : overallAverage.toFixed(2)}
          suffix={overallAverage === null ? undefined : "/ 5"}
        />
      </div>

      <section className="mt-7 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">
            Resultado por dimensión
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Promedio obtenido en cada dimensión de la evaluación.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {dimensions.map((dimension) => {
            const result = resultByDimension.get(dimension.id);
            const score = result ? Number(result.score) : null;
            const percentage = result ? Number(result.percentage) : 0;

            return (
              <div
                key={dimension.id}
                className="rounded-2xl border border-neutral-200 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      Dimensión {dimension.sort_order}
                    </div>
                    <div className="mt-1 font-semibold text-neutral-900">
                      {dimension.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-neutral-900">
                      {score === null ? "—" : score.toFixed(2)}
                    </span>
                    {score !== null && (
                      <span className="ml-1 text-xs text-neutral-500">/ 5</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-orange-500"
                    style={{ width: `${Math.min(100, percentage)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-7 rounded-3xl bg-neutral-900 p-6 text-white md:p-8">
        <h2 className="text-xl font-bold">Información del proceso</h2>
        <div className="mt-5 grid gap-5 text-sm md:grid-cols-3">
          <Info
            label="Inicio"
            value={formatDate(assignment.started_at ?? assignment.created_at)}
          />
          <Info
            label="Finalización"
            value={
              assignment.completed_at
                ? formatDate(assignment.completed_at)
                : "Aún no finaliza"
            }
          />
          <Info
            label="Aplicación"
            value={
              assignment.status === "completed"
                ? "Cerrada"
                : "Disponible por enlace"
            }
          />
        </div>

        {assignment.status !== "completed" && (
          <Link
            href={`/e/${assignment.public_token}`}
            className="mt-6 inline-flex rounded-xl bg-orange-500 px-5 py-3 font-bold text-white hover:bg-orange-600"
          >
            Abrir evaluación
          </Link>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  suffix,
  small = false,
}: {
  label: string;
  value: string;
  suffix?: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="mt-2">
        <span
          className={
            small
              ? "text-lg font-bold text-neutral-900"
              : "text-3xl font-black tracking-tight text-neutral-900"
          }
        >
          {value}
        </span>
        {suffix && <span className="ml-1 text-xs text-neutral-500">{suffix}</span>}
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
      className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-bold ${
        classes[status] ?? classes.cancelled
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="mt-1 font-medium text-white">{value}</div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(new Date(value));
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-7">
      <h1 className="font-bold text-red-800">No fue posible cargar el detalle</h1>
      <p className="mt-2 text-sm text-red-700">{message}</p>
    </div>
  );
}
