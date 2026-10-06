import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildLeadershipAnalysis } from "@/lib/leadership-analysis";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import ReportActions from "./report-actions";
import { DimensionBars, Heatmap, RadarChart } from "./report-charts";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function LeadershipReportPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
          <p className="text-neutral-600">Generando reporte...</p>
        </div>
      }
    >
      <LeadershipReportContent {...props} />
    </Suspense>
  );
}

async function LeadershipReportContent({ params }: PageProps) {
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
      "id,status,created_at,started_at,completed_at,process_id,template_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (assignmentError) {
    return <ErrorCard message={assignmentError.message} />;
  }
  if (!assignment) notFound();

  const [
    processResult,
    templateResult,
    dimensionsResult,
    questionsResult,
    responsesResult,
    resultsResult,
  ] = await Promise.all([
    db
      .from("assessment_processes")
      .select("id,name,person_id,organization_id")
      .eq("id", assignment.process_id)
      .single(),
    db
      .from("assessment_templates")
      .select("id,name,description,assessment_type,version")
      .eq("id", assignment.template_id)
      .single(),
    db
      .from("assessment_dimensions")
      .select("id,name,description,sort_order")
      .eq("template_id", assignment.template_id)
      .order("sort_order"),
    db
      .from("assessment_questions")
      .select(
        "id,dimension_id,prompt,question_type,sort_order,required",
      )
      .eq("template_id", assignment.template_id)
      .order("sort_order"),
    db
      .from("assessment_responses")
      .select(
        "question_id,numeric_value,text_value,evidence_text,is_not_observed",
      )
      .eq("assignment_id", assignment.id),
    db
      .from("assessment_results")
      .select("dimension_id,score,percentage")
      .eq("assignment_id", assignment.id),
  ]);

  const firstError =
    processResult.error ||
    templateResult.error ||
    dimensionsResult.error ||
    questionsResult.error ||
    responsesResult.error ||
    resultsResult.error;

  if (firstError) {
    return <ErrorCard message={firstError.message} />;
  }

  const processData = processResult.data;
  const template = templateResult.data;

  if (!template.assessment_type.startsWith("leadership")) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-7">
        <h1 className="font-bold text-amber-900">
          Reporte no disponible para esta prueba
        </h1>
        <p className="mt-2 text-sm text-amber-800">
          El análisis de competencias está reservado al Programa de Desarrollo
          de Líderes.
        </p>
      </div>
    );
  }

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

  if (personResult.error || organizationResult.error) {
    return (
      <ErrorCard
        message={
          personResult.error?.message ??
          organizationResult.error?.message ??
          "No fue posible cargar a la persona."
        }
      />
    );
  }

  const person = personResult.data;
  const organization = organizationResult.data;
  const dimensions = dimensionsResult.data ?? [];
  const questions = questionsResult.data ?? [];
  const responses = responsesResult.data ?? [];
  const results = resultsResult.data ?? [];

  const analysis = buildLeadershipAnalysis({
    assessmentType: template.assessment_type,
    templateName: template.name,
    dimensions,
    questions,
    responses,
    results,
  });

  const personName =
    `${person.first_name.trim()} ${person.last_name ?? ""}`.trim();
  const fileName = `Reporte-Liderazgo-${personName}-${template.name}`;
  const completed = assignment.status === "completed";

  return (
    <div>
      <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/protected/evaluaciones/${assignment.id}`}
          className="text-sm font-semibold text-neutral-500 hover:text-neutral-900"
        >
          ← Volver al detalle
        </Link>
        {completed && <ReportActions fileName={fileName} />}
      </div>

      {!completed && (
        <div className="no-print mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Este reporte es preliminar. La versión final se habilita cuando la
          prueba queda completada.
        </div>
      )}

      <article
        id="leadership-report"
        className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none"
      >
        <header className="bg-neutral-950 px-7 py-10 text-white md:px-10">
          <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-2xl font-black tracking-tight">
                Factor<span className="text-orange-500">RH</span>
              </div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">
                Programa de Desarrollo de Líderes
              </div>
              <h1 className="mt-8 text-3xl font-black md:text-4xl">
                Reporte de Competencias
              </h1>
              <p className="mt-2 text-lg text-neutral-300">{template.name}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-orange-400">
                Persona evaluada
              </div>
              <div className="mt-2 text-xl font-black">{personName}</div>
              <div className="mt-1 text-neutral-300">
                {[person.job_title, person.area].filter(Boolean).join(" · ") ||
                  "Sin puesto registrado"}
              </div>
              <div className="mt-1 text-neutral-400">{organization.name}</div>
            </div>
          </div>
        </header>

        <div className="p-7 md:p-10">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Resultado global"
              value={
                analysis.overall === null ? "—" : analysis.overall.toFixed(2)
              }
              suffix={analysis.overall === null ? undefined : "/ 5"}
            />
            <Metric
              label="Nivel"
              value={analysis.overallLevel}
              compact
            />
            <Metric
              label="Dimensiones"
              value={String(analysis.dimensions.length)}
            />
            <Metric
              label="Fecha"
              value={formatDate(
                assignment.completed_at ??
                  assignment.started_at ??
                  assignment.created_at,
              )}
              compact
            />
          </section>

          <section className="mt-8 rounded-3xl border border-orange-200 bg-orange-50 p-6 md:p-8">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">
              Síntesis ejecutiva
            </div>
            <p className="mt-3 text-lg leading-relaxed text-neutral-900">
              {analysis.executiveSummary}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-neutral-600">
              {analysis.perspectiveNote}
            </p>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-neutral-200 p-6 md:p-7">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                Vista global
              </div>
              <h2 className="mt-2 text-xl font-black text-neutral-900">
                Radar de competencias
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Lectura comparativa de las dimensiones de la prueba.
              </p>
              <div className="mt-4">
                <RadarChart data={analysis.dimensions} />
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 p-6 md:p-7">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                Comparativo
              </div>
              <h2 className="mt-2 text-xl font-black text-neutral-900">
                Resultado por dimensión
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Permite identificar rápidamente fortalezas y brechas.
              </p>
              <div className="mt-6">
                <DimensionBars data={analysis.dimensions} />
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-neutral-200 p-6 md:p-8">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Mapa de desarrollo
            </div>
            <h2 className="mt-2 text-xl font-black text-neutral-900">
              Lectura visual de prioridades
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              El color no sustituye la interpretación; sirve para priorizar la
              conversación de desarrollo.
            </p>
            <div className="mt-6">
              <Heatmap data={analysis.dimensions} />
            </div>
          </section>

          <section className="mt-8">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Interpretación
            </div>
            <h2 className="mt-2 text-2xl font-black text-neutral-900">
              Análisis por dimensión
            </h2>

            <div className="mt-5 grid gap-4">
              {analysis.dimensions.map((dimension) => (
                <div
                  key={dimension.id}
                  className="break-inside-avoid rounded-3xl border border-neutral-200 p-6"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                        Dimensión {dimension.order}
                      </div>
                      <h3 className="mt-1 text-lg font-black text-neutral-900">
                        {dimension.name}
                      </h3>
                      <div className="mt-2 inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-700">
                        {dimension.level}
                      </div>
                    </div>
                    <div className="text-3xl font-black text-neutral-900">
                      {dimension.score === null
                        ? "—"
                        : dimension.score.toFixed(2)}
                      {dimension.score !== null && (
                        <span className="ml-1 text-xs font-medium text-neutral-400">
                          / 5
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-4 leading-relaxed text-neutral-700">
                    {dimension.narrative}
                  </p>

                  {dimension.qualitativeEvidence.length > 0 && (
                    <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                        Evidencia cualitativa reportada
                      </div>
                      <div className="mt-3 space-y-2">
                        {dimension.qualitativeEvidence.map((evidence, index) => (
                          <p
                            key={`${dimension.id}-evidence-${index}`}
                            className="text-sm italic leading-relaxed text-neutral-600"
                          >
                            “{evidence}”
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="break-inside-avoid rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Fortalezas
              </div>
              <h2 className="mt-2 text-xl font-black text-emerald-950">
                Competencias mejor posicionadas
              </h2>
              <div className="mt-5 space-y-3">
                {analysis.strengths.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-white/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="font-bold text-neutral-900">{item.name}</div>
                      <div className="font-black text-emerald-800">
                        {item.score?.toFixed(2)}
                      </div>
                    </div>
                    {item.strongestItem && (
                      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                        Conducta destacada: {item.strongestItem}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="break-inside-avoid rounded-3xl border border-amber-200 bg-amber-50 p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                Prioridades
              </div>
              <h2 className="mt-2 text-xl font-black text-amber-950">
                Focos de desarrollo
              </h2>
              <div className="mt-5 space-y-3">
                {analysis.priorities.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-white/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="font-bold text-neutral-900">{item.name}</div>
                      <div className="font-black text-amber-800">
                        {item.score?.toFixed(2)}
                      </div>
                    </div>
                    {item.developmentItem && (
                      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                        Foco conductual: {item.developmentItem}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {analysis.risks.length > 0 && (
            <section className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6 md:p-8">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
                Riesgos de desarrollo
              </div>
              <h2 className="mt-2 text-xl font-black text-red-950">
                Impactos posibles si las brechas no se trabajan
              </h2>
              <ul className="mt-4 space-y-2 text-sm leading-relaxed text-red-900">
                {analysis.risks.map((risk) => (
                  <li key={risk}>• {risk}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-8">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Desarrollo
            </div>
            <h2 className="mt-2 text-2xl font-black text-neutral-900">
              Plan de acción 30 · 60 · 90 días
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-500">
              Se priorizan hasta tres competencias para evitar planes demasiado
              amplios. El seguimiento debe hacerse con evidencia observable.
            </p>

            <div className="mt-5 space-y-5">
              {analysis.plan.map((item, index) => (
                <div
                  key={item.competency}
                  className="break-inside-avoid overflow-hidden rounded-3xl border border-neutral-200"
                >
                  <div className="bg-neutral-950 px-6 py-5 text-white">
                    <div className="text-xs font-semibold uppercase tracking-wide text-orange-400">
                      Prioridad {index + 1}
                    </div>
                    <h3 className="mt-1 text-xl font-black">{item.competency}</h3>
                  </div>

                  <div className="grid gap-0 md:grid-cols-2">
                    <PlanCell label="Hallazgo actual" value={item.currentFinding} />
                    <PlanCell
                      label="Conducta esperada"
                      value={item.targetBehavior}
                    />
                    <PlanCell label="Acción concreta" value={item.action} />
                    <PlanCell label="Indicador" value={item.indicator} />
                  </div>

                  <div className="border-t border-neutral-200 p-5">
                    <div className="grid gap-3 md:grid-cols-3">
                      <Timeline label="30 días" value={item.day30} />
                      <Timeline label="60 días" value={item.day60} />
                      <Timeline label="90 días" value={item.day90} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {analysis.openResponses.length > 0 && (
            <section className="mt-8 break-before-page">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                Anexo cualitativo
              </div>
              <h2 className="mt-2 text-2xl font-black text-neutral-900">
                Respuestas abiertas
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Se presentan como evidencia del proceso y no como afirmaciones
                verificadas por sí mismas.
              </p>

              <div className="mt-5 space-y-4">
                {analysis.openResponses.map((item, index) => (
                  <div
                    key={`${item.prompt}-${index}`}
                    className="break-inside-avoid rounded-2xl border border-neutral-200 p-5"
                  >
                    <div className="font-semibold text-neutral-900">
                      {item.prompt}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <footer className="mt-10 border-t border-neutral-200 pt-6 text-xs leading-relaxed text-neutral-500">
            <strong className="text-neutral-700">Nota metodológica.</strong> Este
            reporte interpreta competencias y conductas laborales con base en las
            respuestas registradas en la herramienta. No constituye diagnóstico
            clínico, psicopatológico ni certificación de aptitud. Para decisiones
            de desarrollo relevantes debe contrastarse con evidencia de desempeño,
            entrevista, observación de Dirección y demás instrumentos del programa.
          </footer>
        </div>
      </article>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          #leadership-report {
            width: 100% !important;
            max-width: none !important;
          }
          .break-inside-avoid {
            break-inside: avoid;
          }
          .break-before-page {
            break-before: page;
          }
        }
      `}</style>
    </div>
  );
}

function Metric({
  label,
  value,
  suffix,
  compact = false,
}: {
  label: string;
  value: string;
  suffix?: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="mt-2">
        <span
          className={
            compact
              ? "text-base font-black text-neutral-900"
              : "text-3xl font-black text-neutral-900"
          }
        >
          {value}
        </span>
        {suffix && (
          <span className="ml-1 text-xs font-medium text-neutral-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function PlanCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-neutral-200 p-5 md:border-r">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-neutral-700">{value}</p>
    </div>
  );
}

function Timeline({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-4">
      <div className="font-black text-orange-600">{label}</div>
      <p className="mt-2 text-xs leading-relaxed text-neutral-600">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeZone: "America/Mexico_City",
  }).format(new Date(value));
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-7">
      <h1 className="font-bold text-red-800">No fue posible generar el reporte</h1>
      <p className="mt-2 text-sm text-red-700">{message}</p>
    </div>
  );
}
