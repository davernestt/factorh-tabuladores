import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  analyzeIntegralPsychometrics,
  type IntegralInstrument,
} from "@/lib/psychometric-integral";
import {
  analyzeJobProfileAlignment,
  type JobProfileCompetency,
} from "@/lib/psychometric-job-profile";
import { getPsychometricCatalogItem } from "@/lib/psychometric-catalog";
import {
  ScoreColumnChart,
  ScoreDotPlot,
  ScoreRadarChart,
  ScoreRing,
} from "../../report-ui";
import PsychometricExportActions, { type PsychometricExportData } from "../../export-actions";

type PageProps = { params: Promise<{ processId: string }> };

type Assignment = {
  id: string;
  status: string;
  template_id: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type Template = {
  id: string;
  name: string;
  assessment_type: string;
};

type ResultRow = {
  assignment_id: string;
  dimension_id: string;
  score: number | string;
  percentage: number | string;
};

type Dimension = {
  id: string;
  template_id: string;
  name: string;
  sort_order: number;
};

export default function IntegralPsychometricReportPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
          <p className="text-neutral-600">Integrando resultados psicométricos...</p>
        </div>
      }
    >
      <IntegralReportContent {...props} />
    </Suspense>
  );
}

async function IntegralReportContent({ params }: PageProps) {
  const auth = await createClient();
  const { data: authData, error: authError } = await auth.auth.getClaims();
  if (authError || !authData?.claims) redirect("/auth/login");

  const { processId } = await params;
  const db = createAdminClient();

  const processR = await db
    .from("assessment_processes")
    .select("id,name,person_id,organization_id,created_at,evaluation_purpose,target_job_title,target_job_profile_id")
    .eq("id", processId)
    .maybeSingle();

  if (processR.error) return <ErrorCard message={processR.error.message} />;
  if (!processR.data) notFound();

  const assignmentsR = await db
    .from("assessment_assignments")
    .select("id,status,template_id,created_at,started_at,completed_at")
    .eq("process_id", processId)
    .order("created_at");

  if (assignmentsR.error) return <ErrorCard message={assignmentsR.error.message} />;

  const assignments = (assignmentsR.data ?? []) as Assignment[];
  const templateIds = Array.from(new Set(assignments.map((item) => item.template_id)));

  const templatesR = templateIds.length
    ? await db
        .from("assessment_templates")
        .select("id,name,assessment_type")
        .in("id", templateIds)
    : { data: [], error: null };

  if (templatesR.error) return <ErrorCard message={templatesR.error.message} />;

  const templates = (templatesR.data ?? []) as Template[];
  const templateById = new Map(templates.map((item) => [item.id, item]));
  const psychometricAssignments = assignments.filter((assignment) =>
    templateById.get(assignment.template_id)?.assessment_type.startsWith("psychometric_"),
  );

  if (!psychometricAssignments.length) notFound();

  const [personR, organizationR] = await Promise.all([
    db
      .from("people")
      .select("id,first_name,last_name,job_title,area")
      .eq("id", processR.data.person_id)
      .single(),
    db
      .from("organizations")
      .select("id,name")
      .eq("id", processR.data.organization_id)
      .single(),
  ]);

  if (personR.error || organizationR.error) {
    return <ErrorCard message={personR.error?.message ?? organizationR.error?.message ?? "Error"} />;
  }

  const completedCount = psychometricAssignments.filter((item) => item.status === "completed").length;
  const allCompleted = completedCount === psychometricAssignments.length;

  if (!allCompleted) {
    const personName = `${personR.data.first_name.trim()} ${personR.data.last_name ?? ""}`.trim();
    return (
      <div className="space-y-7">
        <Link href="/protected/psicometrias?view=personas" className="text-sm font-bold text-neutral-500 hover:text-orange-600">
          ← Volver a Personas y resultados
        </Link>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-amber-700">Reporte integral</div>
          <h1 className="mt-2 text-2xl font-black text-amber-900">{personName}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-amber-900">
            El reporte integral estará disponible cuando finalicen todas las psicometrías de este proceso.
            Actualmente hay {completedCount} de {psychometricAssignments.length} concluidas.
          </p>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-amber-100">
            <div
              className="h-full rounded-full bg-amber-500"
              style={{ width: `${Math.round((completedCount / psychometricAssignments.length) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  const assignmentIds = psychometricAssignments.map((item) => item.id);
  const psychometricTemplateIds = Array.from(new Set(psychometricAssignments.map((item) => item.template_id)));

  const [resultsR, dimensionsR] = await Promise.all([
    db
      .from("assessment_results")
      .select("assignment_id,dimension_id,score,percentage")
      .in("assignment_id", assignmentIds),
    db
      .from("assessment_dimensions")
      .select("id,template_id,name,sort_order")
      .in("template_id", psychometricTemplateIds)
      .order("sort_order"),
  ]);

  if (resultsR.error || dimensionsR.error) {
    return <ErrorCard message={resultsR.error?.message ?? dimensionsR.error?.message ?? "Error"} />;
  }

  const results = (resultsR.data ?? []) as ResultRow[];
  const dimensions = (dimensionsR.data ?? []) as Dimension[];
  const dimensionById = new Map(dimensions.map((item) => [item.id, item]));

  const instruments: IntegralInstrument[] = psychometricAssignments.map((assignment) => {
    const template = templateById.get(assignment.template_id);
    const objective = ["psychometric_reasoning", "psychometric_attention"].includes(
      template?.assessment_type ?? "",
    );

    const dimensionResults = results
      .filter((row) => row.assignment_id === assignment.id)
      .map((row) => {
        const dimension = dimensionById.get(row.dimension_id);
        const value = objective
          ? Number(row.percentage)
          : scaleIndex(Number(row.score));
        return {
          name: dimension?.name ?? "Dimensión",
          value,
        };
      });

    return {
      assessmentType: template?.assessment_type ?? "psychometric",
      name: template?.name ?? "Psicometría",
      dimensions: dimensionResults,
      overall: dimensionResults.length
        ? dimensionResults.reduce((sum, item) => sum + item.value, 0) / dimensionResults.length
        : null,
    };
  });

  const analysis = analyzeIntegralPsychometrics(instruments);

  let jobProfile:
    | {
        id: string;
        name: string;
        family: string;
        level: string;
        description: string | null;
      }
    | null = null;
  let jobCompetencies: JobProfileCompetency[] = [];

  if (processR.data.target_job_profile_id) {
    const [jobProfileR, jobCompetenciesR] = await Promise.all([
      db
        .from("psychometric_job_profiles")
        .select("id,name,family,level,description")
        .eq("id", processR.data.target_job_profile_id)
        .maybeSingle(),
      db
        .from("psychometric_job_profile_competencies")
        .select("competency_key,competency_name,reference_min,reference_max,importance,sort_order")
        .eq("profile_id", processR.data.target_job_profile_id)
        .order("sort_order"),
    ]);

    if (jobProfileR.error || jobCompetenciesR.error) {
      return (
        <ErrorCard
          message={
            jobProfileR.error?.message ??
            jobCompetenciesR.error?.message ??
            "No fue posible cargar el perfil objetivo."
          }
        />
      );
    }

    jobProfile = jobProfileR.data;
    jobCompetencies = (jobCompetenciesR.data ?? []) as JobProfileCompetency[];
  }

  const jobAlignment =
    jobProfile && jobCompetencies.length
      ? analyzeJobProfileAlignment(
          jobProfile.name,
          processR.data.target_job_title,
          processR.data.evaluation_purpose,
          jobCompetencies,
          instruments,
        )
      : null;

  const person = personR.data;
  const personName = `${person.first_name.trim()} ${person.last_name ?? ""}`.trim();
  const completedAt = psychometricAssignments
    .map((item) => item.completed_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  const completedDate = completedAt
    ? new Intl.DateTimeFormat("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(completedAt))
    : "—";

  const performance = instruments.filter((item) =>
    ["psychometric_reasoning", "psychometric_attention"].includes(item.assessmentType),
  );
  const scaleSignals = instruments
    .filter((item) => !["psychometric_reasoning", "psychometric_attention"].includes(item.assessmentType))
    .flatMap((instrument) =>
      instrument.dimensions.map((item) => ({
        label: item.name,
        value: item.value,
        source: instrument.name,
      })),
    )
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  const instrumentViews = instruments.map((instrument, index) => {
    const ranked = [...instrument.dimensions].sort((a, b) => b.value - a.value);
    const top = ranked.slice(0, 2);
    const low = [...ranked].reverse().slice(0, 2);
    const chart: "radar" | "columns" | "dots" =
      ["psychometric_vector", "psychometric_social_leadership", "psychometric_integrity", "psychometric_bigfive"].includes(
        instrument.assessmentType,
      )
        ? "radar"
        : instrument.assessmentType === "psychometric_attention"
          ? "dots"
          : "columns";

    return {
      ...instrument,
      assignmentId: psychometricAssignments[index]?.id ?? "",
      chart,
      top,
      low,
      summary: [
        "Dentro de esta prueba, las dimensiones relativamente más altas son " +
          top.map((item) => item.name).join(" y ") +
          ".",
        "Las dimensiones relativamente más bajas son " +
          low.map((item) => item.name).join(" y ") +
          ". Su relevancia depende de las exigencias reales del puesto y debe contrastarse con entrevista.",
      ],
    };
  });

  const purposeLabels: Record<string, string> = {
    selection: "Selección",
    promotion: "Promoción",
    development: "Desarrollo",
    profile: "Conocimiento de perfil",
  };
  const purposeLabel =
    purposeLabels[processR.data.evaluation_purpose ?? ""] ??
    "Evaluación psicométrica";
  const targetRole =
    processR.data.target_job_title?.trim() ||
    jobProfile?.name ||
    null;

  const objectiveText = jobAlignment
    ? jobAlignment.objectiveText
    : targetRole
      ? "Describir e integrar el perfil psicométrico de la persona y aportar evidencia relevante para " +
        purposeLabel.toLowerCase() +
        " en relación con el puesto " +
        targetRole +
        ". El reporte funciona como apoyo para entrevista y toma de decisiones, sin emitir una recomendación automática."
      : "Describir e integrar el perfil psicométrico de la persona para apoyar " +
        purposeLabel.toLowerCase() +
        ", entrevista y toma de decisiones. Al no existir un perfil objetivo asociado, la lectura se concentra en el patrón de resultados de las pruebas aplicadas.";

  const batteryRows = instrumentViews.map((instrument) => {
    const meta = getPsychometricCatalogItem(instrument.assessmentType);
    return {
      name: instrument.name,
      description:
        meta?.publicDescription ??
        "Instrumento psicométrico FactorRH aplicado dentro de este proceso.",
    };
  });

  const exportFindings = [
    ...analysis.convergences,
    ...(jobAlignment?.strongestMatches.map(
      (item) =>
        item.name +
        ": evidencia dentro del rango de referencia del perfil objetivo.",
    ) ?? []),
  ];

  const exportCautions = [
    ...analysis.tensions,
    ...(jobAlignment?.criticalToValidate.map(
      (item) =>
        item.name +
        ": " +
        item.status +
        ". Conviene profundizar antes de concluir el proceso.",
    ) ?? []),
  ];

  const exportData: PsychometricExportData = {
    title: "Reporte Psicométrico Integral",
    subtitle:
      "Síntesis ejecutiva y acumulado de resultados individuales del proceso",
    personName,
    jobTitle: person.job_title,
    area: person.area,
    organizationName: organizationR.data.name,
    processName: processR.data.name,
    reportDate: completedDate,
    executiveSummary: [
      objectiveText,
      ...analysis.executiveSummary,
      ...(jobAlignment?.snapshot ?? []),
      "Para el jefe de la vacante: " + analysis.managerGuidance.supervision,
      "Bajo presión: " + analysis.managerGuidance.pressure,
    ],
    keyFindings: exportFindings,
    cautions: exportCautions,
    interviewQuestions: analysis.interviewQuestions,
    closing: analysis.closing,
    instruments: instrumentViews.map((instrument) => ({
      name: instrument.name,
      subtitle:
        "Resultado individual incluido dentro del reporte psicométrico integral.",
      chart: instrument.chart,
      overallLabel:
        ["psychometric_reasoning", "psychometric_attention"].includes(
          instrument.assessmentType,
        )
          ? "Resultado global"
          : undefined,
      overallDisplay:
        ["psychometric_reasoning", "psychometric_attention"].includes(
          instrument.assessmentType,
        ) && instrument.overall !== null && instrument.overall !== undefined
          ? Math.round(instrument.overall) + "%"
          : undefined,
      summary: instrument.summary,
      highlights: instrument.top.map(
        (item) => item.name + ": " + Math.round(item.value),
      ),
      watchouts: instrument.low.map(
        (item) => item.name + ": " + Math.round(item.value),
      ),
      dimensions: instrument.dimensions.map((item) => ({
        name: item.name,
        value: item.value,
        displayValue:
          ["psychometric_reasoning", "psychometric_attention"].includes(
            instrument.assessmentType,
          )
            ? Math.round(item.value) + "%"
            : String(Math.round(item.value)),
        narrative:
          "Este resultado muestra la posición de la dimensión dentro de la prueba y debe interpretarse junto con el patrón general del instrumento.",
      })),
    })),
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/protected/psicometrias?view=personas" className="text-sm font-bold text-neutral-500 hover:text-orange-600">
          ← Volver a Personas y resultados
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <PsychometricExportActions
            fileName={`Reporte-Psicometrico-Integral-${personName}`}
            data={exportData}
            integral
          />
          <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-bold text-white">
            Reporte psicométrico integral
          </span>
        </div>
      </div>

      <header className="rounded-3xl bg-neutral-900 p-7 text-white shadow-sm md:p-9">
        <div className="text-xs font-bold uppercase tracking-[.18em] text-orange-400">
          FactorRH · Síntesis ejecutiva
        </div>
        <div className="mt-5 grid gap-7 lg:grid-cols-[1.7fr_.8fr] lg:items-end">
          <div>
            <h1 className="text-3xl font-black md:text-4xl">{analysis.headline}</h1>
            <p className="mt-3 max-w-3xl text-neutral-300">
              Integración de los resultados obtenidos en {instruments.length} {instruments.length === 1 ? "instrumento" : "instrumentos"} del proceso {processR.data.name}.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-700 bg-neutral-800 p-5">
            <div className="text-xs font-bold uppercase tracking-wide text-orange-300">Persona evaluada</div>
            <div className="mt-2 text-xl font-black">{personName}</div>
            <div className="mt-1 text-sm text-neutral-300">
              {[person.job_title, person.area].filter(Boolean).join(" · ") || "Sin puesto registrado"}
            </div>
            <div className="mt-1 text-sm text-neutral-400">{organizationR.data.name}</div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="Pruebas integradas" value={String(instruments.length)} />
        <Metric label="Proceso" value={processR.data.name} compact />
        <Metric label="Cierre" value={completedDate} compact />
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
          Objetivo de la evaluación
        </div>
        <h2 className="mt-2 text-2xl font-black text-neutral-900">
          {purposeLabel}{targetRole ? " · " + targetRole : ""}
        </h2>
        <p className="mt-4 max-w-5xl text-sm leading-7 text-neutral-700">
          {objectiveText}
        </p>
        {jobProfile && (
          <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">
              Perfil base utilizado
            </div>
            <div className="mt-1 font-black text-neutral-900">
              {jobProfile.name}
            </div>
            <div className="mt-1 text-sm text-neutral-500">
              {jobProfile.family} · {jobProfile.level}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
          Snapshot ejecutivo
        </div>
        <h2 className="mt-2 text-3xl font-black text-neutral-900">
          Lo que un jefe de la vacante necesita ver primero
        </h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-emerald-50 p-5">
            <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              Fortaleza principal
            </div>
            <p className="mt-3 text-sm leading-6 text-neutral-700">
              {analysis.strengths[0] ?? "El perfil requiere mayor evidencia para identificar una fortaleza predominante."}
            </p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-5">
            <div className="text-xs font-bold uppercase tracking-wide text-amber-700">
              Aspecto principal a profundizar
            </div>
            <p className="mt-3 text-sm leading-6 text-neutral-700">
              {analysis.opportunities[0] ?? "No se identificó un aspecto prioritario con la información disponible."}
            </p>
          </div>
          <div className="rounded-2xl bg-neutral-50 p-5">
            <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
              Comparación con puesto
            </div>
            <p className="mt-3 text-sm leading-6 text-neutral-700">
              {jobAlignment
                ? jobAlignment.withinRange +
                  " de " +
                  jobAlignment.rows.length +
                  " competencias cuentan con evidencia dentro del rango de referencia. " +
                  (jobAlignment.missingEvidence
                    ? jobAlignment.missingEvidence +
                      " requieren más evidencia."
                    : "La batería aporta evidencia para todo el perfil.")
                : "No se seleccionó un perfil objetivo. El reporte presenta una lectura integral sin emitir una comparación contra puesto."}
            </p>
          </div>
        </div>
        <p className="mt-5 text-xs leading-5 text-neutral-400">
          Este Snapshot organiza evidencia para facilitar la lectura. No representa una recomendación de contratación, promoción o descarte.
        </p>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
          Batería aplicada
        </div>
        <h2 className="mt-2 text-2xl font-black text-neutral-900">
          Qué aportó cada instrumento
        </h2>
        <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-200">
          <div className="grid grid-cols-[minmax(180px,.8fr)_minmax(0,1.7fr)] bg-neutral-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-neutral-400">
            <div>Prueba</div>
            <div>Qué evalúa</div>
          </div>
          <div className="divide-y divide-neutral-100">
            {batteryRows.map((item) => (
              <div
                key={item.name}
                className="grid grid-cols-[minmax(180px,.8fr)_minmax(0,1.7fr)] gap-4 px-4 py-4"
              >
                <div className="text-sm font-black text-neutral-900">{item.name}</div>
                <div className="text-sm leading-6 text-neutral-600">{item.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Resumen ejecutivo</div>
        <h2 className="mt-2 text-3xl font-black text-neutral-900">Lectura integrada del perfil</h2>
        <div className="mt-5 space-y-4 text-sm leading-7 text-neutral-700">
          {analysis.executiveSummary.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </section>

      {jobAlignment && (
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
            Comparación contra perfil objetivo
          </div>
          <h2 className="mt-2 text-3xl font-black text-neutral-900">
            Mapa de competencias de referencia
          </h2>
          <p className="mt-2 max-w-5xl text-sm leading-6 text-neutral-500">
            La comparación se construye competencia por competencia utilizando únicamente
            las pruebas incluidas en esta batería. Un resultado fuera del rango no equivale
            a “bueno” o “malo”: señala una diferencia que debe contextualizarse con el
            puesto y validarse en entrevista.
          </p>

          <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200">
            <div className="grid grid-cols-[minmax(180px,1.2fr)_100px_110px_minmax(170px,1fr)] gap-3 bg-neutral-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
              <div>Competencia</div>
              <div>Referencia</div>
              <div>Evidencia</div>
              <div>Lectura</div>
            </div>
            <div className="divide-y divide-neutral-100">
              {jobAlignment.rows.map((item) => (
                <div
                  key={item.key}
                  className="grid grid-cols-[minmax(180px,1.2fr)_100px_110px_minmax(170px,1fr)] gap-3 px-4 py-4 text-sm"
                >
                  <div>
                    <div className="font-black text-neutral-900">{item.name}</div>
                    <div className="mt-1 text-xs text-neutral-400">
                      {item.importance === "critical"
                        ? "Importancia crítica"
                        : item.importance === "high"
                          ? "Importancia alta"
                          : "Importancia media"}
                    </div>
                  </div>
                  <div className="font-black text-neutral-700">
                    {Math.round(item.referenceMin)}–{Math.round(item.referenceMax)}
                  </div>
                  <div className="font-black text-neutral-900">
                    {item.observed === null ? "—" : Math.round(item.observed)}
                  </div>
                  <div>
                    <AlignmentStatus status={item.status} />
                    {item.evidence.length > 0 && (
                      <div className="mt-2 text-[11px] leading-5 text-neutral-400">
                        Basado en {item.evidence.length} indicador{item.evidence.length === 1 ? "" : "es"} de la batería.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {jobAlignment.criticalToValidate.length > 0 && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="text-xs font-bold uppercase tracking-wide text-amber-700">
                Competencias críticas para validar
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {jobAlignment.criticalToValidate.map((item) => (
                  <p key={item.key} className="text-sm leading-6 text-neutral-700">
                    • <strong>{item.name}:</strong> {item.status.toLowerCase()}.
                  </p>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {(performance.length > 0 || scaleSignals.length > 0) && (
        <section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          {performance.length > 0 ? (
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Pruebas de desempeño</div>
              <h2 className="mt-2 text-xl font-black text-neutral-900">Resultados objetivos</h2>
              <div className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {performance.map((instrument) => (
                  <ScoreRing
                    key={instrument.assessmentType}
                    value={instrument.overall ?? 0}
                    label={instrument.assessmentType === "psychometric_reasoning" ? "Razonamiento" : "Atención"}
                    caption={instrument.name}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="hidden xl:block" />
          )}

          {scaleSignals.length > 0 && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <ScoreColumnChart
                title="Tendencias relativamente más marcadas"
                items={scaleSignals.map((item) => ({ label: item.label, value: item.value }))}
              />
              <p className="mt-3 text-xs leading-5 text-neutral-400">
                Los índices pertenecen a instrumentos distintos y se muestran para facilitar la lectura de intensidad relativa; no constituyen una calificación global.
              </p>
            </div>
          )}
        </section>
      )}

      {analysis.convergences.length > 0 && (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 md:p-8">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Convergencias entre pruebas</div>
          <h2 className="mt-2 text-2xl font-black text-emerald-950">Patrones que se repiten</h2>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {analysis.convergences.map((item) => (
              <div key={item} className="rounded-2xl bg-white/75 p-4 text-sm leading-6 text-emerald-950">{item}</div>
            ))}
          </div>
        </section>
      )}

      {analysis.tensions.length > 0 && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 md:p-8">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-amber-700">Contrastes a explorar</div>
          <h2 className="mt-2 text-2xl font-black text-amber-950">Dónde conviene profundizar</h2>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {analysis.tensions.map((item) => (
              <div key={item} className="rounded-2xl bg-white/75 p-4 text-sm leading-6 text-amber-950">{item}</div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-5">
        {analysis.sections.map((section, index) => (
          <article key={section.title} className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
                  Lectura {String(index + 1).padStart(2, "0")}
                </div>
                <h2 className="mt-2 text-2xl font-black text-neutral-900">{section.title}</h2>
              </div>
            </div>
            <p className="mt-4 max-w-5xl text-sm leading-7 text-neutral-700">{section.summary}</p>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-emerald-50 p-5">
                <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">Elementos destacados</div>
                <div className="mt-3 space-y-2">
                  {section.highlights.map((item) => <p key={item} className="text-sm leading-6 text-neutral-700">• {item}</p>)}
                </div>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-5">
                <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">Puntos para validar</div>
                <div className="mt-3 space-y-2">
                  {section.watchouts.map((item) => <p key={item} className="text-sm leading-6 text-neutral-700">• {item}</p>)}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-5">
        <div>
          <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
            Anexo de resultados individuales
          </div>
          <h2 className="mt-2 text-3xl font-black text-neutral-900">
            Reportes de cada prueba aplicada
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-neutral-500">
            Después de la síntesis integral se presentan los resultados de cada instrumento para que el reclutador o gerente pueda revisar el detalle sin salir de este reporte.
          </p>
        </div>

        {instrumentViews.map((instrument, index) => (
          <article
            key={instrument.assignmentId || instrument.name}
            className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
                  Prueba {index + 1} de {instrumentViews.length}
                </div>
                <h3 className="mt-2 text-2xl font-black text-neutral-900">
                  {instrument.name}
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
                  {instrument.summary[0]}
                </p>
              </div>
              {instrument.assignmentId && (
                <Link
                  href={`/protected/psicometrias/${instrument.assignmentId}`}
                  className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
                >
                  Abrir reporte individual
                </Link>
              )}
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
              <div className="rounded-2xl bg-neutral-50 p-5">
                {instrument.chart === "radar" ? (
                  <ScoreRadarChart
                    title="Mapa visual"
                    items={instrument.dimensions.map((item) => ({ label: item.name, value: item.value }))}
                  />
                ) : instrument.chart === "dots" ? (
                  <ScoreDotPlot
                    title="Perfil por dimensión"
                    items={instrument.dimensions.map((item) => ({ label: item.name, value: item.value }))}
                  />
                ) : (
                  <ScoreColumnChart
                    title="Resultado por dimensión"
                    items={instrument.dimensions.map((item) => ({ label: item.name, value: item.value }))}
                  />
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl bg-emerald-50 p-5">
                  <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                    Resultados relativamente más altos
                  </div>
                  <div className="mt-3 space-y-2">
                    {instrument.top.map((item) => (
                      <p key={item.name} className="text-sm leading-6 text-neutral-700">
                        • {item.name}: <strong>{Math.round(item.value)}</strong>
                      </p>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-amber-50 p-5">
                  <div className="text-xs font-bold uppercase tracking-wide text-amber-700">
                    Puntos para profundizar
                  </div>
                  <div className="mt-3 space-y-2">
                    {instrument.low.map((item) => (
                      <p key={item.name} className="text-sm leading-6 text-neutral-700">
                        • {item.name}: <strong>{Math.round(item.value)}</strong>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {instrument.dimensions.map((item) => (
                <div key={item.name} className="rounded-2xl border border-neutral-200 p-4">
                  <div className="text-sm font-black text-neutral-900">{item.name}</div>
                  <div className="mt-1 text-2xl font-black text-orange-600">
                    {["psychometric_reasoning", "psychometric_attention"].includes(instrument.assessmentType)
                      ? Math.round(item.value) + "%"
                      : Math.round(item.value)}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Guía para entrevista</div>
        <h2 className="mt-2 text-2xl font-black text-neutral-900">Preguntas de profundización sugeridas</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-neutral-500">
          Estas preguntas convierten los hallazgos psicométricos en evidencia conductual: el objetivo es pedir ejemplos, decisiones y resultados reales.
        </p>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {analysis.interviewQuestions.map((item) => (
            <div key={item} className="rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">{item}</div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6 text-sm leading-6 text-neutral-600">
        <strong className="text-neutral-800">Cierre ejecutivo.</strong> {analysis.closing}
      </section>
    </div>
  );
}

function scaleIndex(score: number) {
  return Math.max(0, Math.min(100, Math.round(((score - 1) / 4) * 100)));
}

function AlignmentStatus({
  status,
}: {
  status:
    | "Dentro del rango de referencia"
    | "Por debajo del rango de referencia"
    | "Por encima del rango de referencia"
    | "Sin evidencia suficiente";
}) {
  const cls =
    status === "Dentro del rango de referencia"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Sin evidencia suficiente"
        ? "bg-neutral-100 text-neutral-500"
        : "bg-amber-50 text-amber-700";

  return (
    <span className={"inline-flex rounded-full px-2.5 py-1 text-xs font-bold " + cls}>
      {status}
    </span>
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

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-7">
      <h1 className="font-bold text-red-800">No fue posible generar el reporte integral</h1>
      <p className="mt-2 text-sm text-red-700">{message}</p>
    </div>
  );
}
