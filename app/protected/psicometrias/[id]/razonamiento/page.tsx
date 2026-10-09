import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { analyzeReasoning } from "@/lib/razonamiento-laboral";

type PageProps = { params: Promise<{ id: string }> };

type ResultRow = {
  dimension_id: string;
  percentage: number | string;
};

type QuestionRow = {
  id: string;
  dimension_id: string | null;
  difficulty: string | null;
  correct_option: number | null;
};

type ResponseRow = {
  question_id: string;
  numeric_value: number | string | null;
};

export default function ReasoningReportPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
          <p className="text-neutral-600">Generando reporte de razonamiento...</p>
        </div>
      }
    >
      <ReasoningReportContent {...props} />
    </Suspense>
  );
}

async function ReasoningReportContent({ params }: PageProps) {
  const auth = await createClient();
  const { data: authData, error: authError } = await auth.auth.getClaims();
  if (authError || !authData?.claims) redirect("/auth/login");

  const { id } = await params;
  const db = createAdminClient();

  const assignmentR = await db
    .from("assessment_assignments")
    .select("id,status,created_at,started_at,completed_at,process_id,template_id")
    .eq("id", id)
    .maybeSingle();

  if (assignmentR.error) return <ErrorCard message={assignmentR.error.message} />;
  if (!assignmentR.data) notFound();

  const assignment = assignmentR.data;

  const [processR, templateR, dimensionsR, resultsR, questionsR, responsesR] =
    await Promise.all([
      db.from("assessment_processes")
        .select("id,name,person_id,organization_id")
        .eq("id", assignment.process_id)
        .single(),
      db.from("assessment_templates")
        .select("id,name,description,assessment_type,version")
        .eq("id", assignment.template_id)
        .single(),
      db.from("assessment_dimensions")
        .select("id,name,description,sort_order")
        .eq("template_id", assignment.template_id)
        .order("sort_order"),
      db.from("assessment_results")
        .select("dimension_id,percentage")
        .eq("assignment_id", assignment.id),
      db.from("assessment_questions")
        .select("id,dimension_id,difficulty,correct_option")
        .eq("template_id", assignment.template_id),
      db.from("assessment_responses")
        .select("question_id,numeric_value")
        .eq("assignment_id", assignment.id),
    ]);

  const firstError =
    processR.error ||
    templateR.error ||
    dimensionsR.error ||
    resultsR.error ||
    questionsR.error ||
    responsesR.error;

  if (firstError) return <ErrorCard message={firstError.message} />;
  if (templateR.data.assessment_type !== "psychometric_reasoning") notFound();

  const [personR, organizationR] = await Promise.all([
    db.from("people")
      .select("id,first_name,last_name,job_title,area")
      .eq("id", processR.data.person_id)
      .single(),
    db.from("organizations")
      .select("id,name")
      .eq("id", processR.data.organization_id)
      .single(),
  ]);

  if (personR.error || organizationR.error) {
    return <ErrorCard message={personR.error?.message ?? organizationR.error?.message ?? "Error"} />;
  }

  if (assignment.status !== "completed") {
    return (
      <div className="space-y-6">
        <Link href="/protected/psicometrias" className="text-sm font-bold text-neutral-500 hover:text-orange-600">
          ← Volver a Psicometrías
        </Link>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <h1 className="text-xl font-black text-amber-900">La psicometría todavía no está terminada</h1>
          <p className="mt-2 text-sm leading-6 text-amber-800">
            El reporte se genera cuando la persona responde los 30 reactivos.
          </p>
        </div>
      </div>
    );
  }

  const dimensions = dimensionsR.data ?? [];
  const dimensionName = new Map(dimensions.map((item) => [item.id, item.name]));
  const inputs = ((resultsR.data ?? []) as ResultRow[]).map((row) => ({
    name: dimensionName.get(row.dimension_id) ?? "Dimensión",
    percentage: Number(row.percentage),
  }));
  const analysis = analyzeReasoning(inputs);

  const questions = (questionsR.data ?? []) as QuestionRow[];
  const responses = (responsesR.data ?? []) as ResponseRow[];
  const questionById = new Map(questions.map((item) => [item.id, item]));
  let correct = 0;
  const difficulty = new Map<string, { correct: number; total: number }>();

  for (const response of responses) {
    const question = questionById.get(response.question_id);
    if (!question || question.correct_option === null || response.numeric_value === null) continue;
    const isCorrect = Number(response.numeric_value) === question.correct_option;
    if (isCorrect) correct += 1;
    const key = question.difficulty ?? "Sin nivel";
    const bucket = difficulty.get(key) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (isCorrect) bucket.correct += 1;
    difficulty.set(key, bucket);
  }

  const total = questions.filter((item) => item.correct_option !== null).length;
  const overallAccuracy = total ? Math.round((correct / total) * 100) : 0;
  const durationMinutes =
    assignment.started_at && assignment.completed_at
      ? Math.max(
          1,
          Math.round(
            (new Date(assignment.completed_at).getTime() -
              new Date(assignment.started_at).getTime()) /
              60000,
          ),
        )
      : null;

  const person = personR.data;
  const personName =
    person.first_name.trim() + " " + (person.last_name ?? "").trim();
  const completedAt = assignment.completed_at
    ? new Intl.DateTimeFormat("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(assignment.completed_at))
    : "—";

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/protected/psicometrias" className="text-sm font-bold text-neutral-500 hover:text-orange-600">
          ← Volver a Psicometrías
        </Link>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
          Reporte FactorRH
        </span>
      </div>

      <header className="rounded-3xl bg-neutral-900 p-7 text-white shadow-sm md:p-9">
        <div className="text-xs font-bold uppercase tracking-[.18em] text-orange-400">
          FactorRH · Psicometrías
        </div>
        <div className="mt-5 grid gap-7 lg:grid-cols-[1.7fr_.8fr] lg:items-end">
          <div>
            <h1 className="text-3xl font-black md:text-4xl">{templateR.data.name}</h1>
            <p className="mt-3 max-w-3xl text-neutral-300">
              Desempeño descriptivo en problemas verbales, numéricos, lógicos, secuenciales y de análisis aplicado.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-700 bg-neutral-800 p-5">
            <div className="text-xs font-bold uppercase tracking-wide text-orange-300">
              Persona evaluada
            </div>
            <div className="mt-2 text-xl font-black">{personName}</div>
            <div className="mt-1 text-sm text-neutral-300">
              {[person.job_title, person.area].filter(Boolean).join(" · ") || "Sin puesto registrado"}
            </div>
            <div className="mt-1 text-sm text-neutral-400">{organizationR.data.name}</div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Aciertos" value={String(correct) + " / " + String(total)} />
        <Metric label="Resultado global" value={String(overallAccuracy) + "%"} />
        <Metric label="Tiempo de respuesta" value={durationMinutes ? String(durationMinutes) + " min" : "—"} compact />
        <Metric label="Fecha" value={completedAt} compact />
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Lectura ejecutiva</div>
        <h2 className="mt-2 text-3xl font-black text-neutral-900">{analysis.overallBand}</h2>
        <div className="mt-5 space-y-3 text-sm leading-7 text-neutral-700">
          {analysis.executiveSummary.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Desempeño por área</div>
          <h2 className="mt-2 text-xl font-black text-neutral-900">Porcentaje de aciertos</h2>
          <div className="mt-6 space-y-5">
            {analysis.dimensions.map((item) => (
              <div key={item.name}>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="font-black text-neutral-900">{item.name}</div>
                    <div className="mt-1 text-xs font-semibold text-neutral-400">{item.band}</div>
                  </div>
                  <div className="text-2xl font-black text-neutral-900">{Math.round(item.percentage)}%</div>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full bg-orange-500" style={{ width: item.percentage + "%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <Panel
            title="Mayor rendimiento relativo"
            subtitle="Áreas con mayor porcentaje de aciertos dentro de esta aplicación."
            items={analysis.strongest.map((item) => item.name + ": " + Math.round(item.percentage) + "%")}
            tone="good"
          />
          <Panel
            title="Áreas para profundizar"
            subtitle="No implican incapacidad; conviene verificar su importancia contra el puesto."
            items={analysis.priorities.map((item) => item.name + ": " + Math.round(item.percentage) + "%")}
            tone="watch"
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {["Básico", "Intermedio", "Avanzado"].map((level) => {
          const row = difficulty.get(level) ?? { correct: 0, total: 0 };
          const pct = row.total ? Math.round((row.correct / row.total) * 100) : 0;
          return (
            <div key={level} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">{level}</div>
              <div className="mt-2 text-3xl font-black text-neutral-900">{pct}%</div>
              <div className="mt-1 text-xs text-neutral-500">{row.correct} de {row.total} correctas</div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {analysis.dimensions.map((item) => (
          <article key={item.name} className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-orange-600">{item.band}</div>
                <h2 className="mt-1 text-xl font-black text-neutral-900">{item.name}</h2>
              </div>
              <div className="rounded-2xl bg-neutral-900 px-4 py-3 text-2xl font-black text-white">
                {Math.round(item.percentage)}%
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-neutral-700">{item.meaning}</p>
            <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">Relevancia laboral posible</div>
              <p className="mt-2 text-sm leading-6 text-neutral-700">{item.relevance}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Entrevista y prueba de trabajo</div>
        <h2 className="mt-2 text-2xl font-black text-neutral-900">Cómo profundizar</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {analysis.interviewPrompts.map((item) => (
            <div key={item} className="rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6 text-sm leading-6 text-neutral-600">
        <strong className="text-neutral-800">Alcance de interpretación.</strong> Razonamiento Laboral General FactorRH v1.0 utiliza reactivos originales y reporta el porcentaje de aciertos por área. Para una decisión completa conviene integrarlo con entrevista estructurada, experiencia, requisitos del puesto y, cuando sea pertinente, una muestra de trabajo.
      </section>
    </div>
  );
}

function Metric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">{label}</div>
      <div className={compact ? "mt-2 text-lg font-black leading-tight text-neutral-900" : "mt-2 text-3xl font-black text-neutral-900"}>{value}</div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  items,
  tone,
}: {
  title: string;
  subtitle: string;
  items: string[];
  tone: "good" | "watch";
}) {
  const cls = tone === "good" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50";
  return (
    <section className={"rounded-3xl border p-6 " + cls}>
      <h2 className="text-xl font-black text-neutral-900">{title}</h2>
      <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => <p key={item} className="text-sm leading-6 text-neutral-700">• {item}</p>)}
      </div>
    </section>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-7">
      <h1 className="font-bold text-red-800">No fue posible generar el reporte</h1>
      <p className="mt-2 text-sm text-red-700">{message}</p>
    </div>
  );
}
