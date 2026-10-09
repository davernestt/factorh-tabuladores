import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  analyzeVectorConductual,
  vectorIndex,
  type VectorFacetInput,
} from "@/lib/vector-conductual";

type PageProps = { params: Promise<{ id: string }> };

type ResultRow = {
  dimension_id: string;
  score: number | string;
};

type QuestionRow = {
  id: string;
  dimension_id: string | null;
  facet: string | null;
  reverse_scored: boolean;
};

type ResponseRow = {
  question_id: string;
  numeric_value: number | string | null;
};

export default function PsychometricReportPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
          <p className="text-neutral-600">Generando reporte psicométrico...</p>
        </div>
      }
    >
      <PsychometricReportContent {...props} />
    </Suspense>
  );
}

async function PsychometricReportContent({ params }: PageProps) {
  const auth = await createClient();
  const { data: authData, error: authError } = await auth.auth.getClaims();
  if (authError || !authData?.claims) redirect("/auth/login");

  const { id } = await params;
  const db = createAdminClient();

  const assignmentR = await db
    .from("assessment_assignments")
    .select(
      "id,status,created_at,started_at,completed_at,process_id,template_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (assignmentR.error) return <ErrorCard message={assignmentR.error.message} />;
  if (!assignmentR.data) notFound();

  const assignment = assignmentR.data;

  const [processR, templateR, dimensionsR, resultsR, questionsR, responsesR] =
    await Promise.all([
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
        .from("assessment_results")
        .select("dimension_id,score")
        .eq("assignment_id", assignment.id),
      db
        .from("assessment_questions")
        .select("id,dimension_id,facet,reverse_scored")
        .eq("template_id", assignment.template_id),
      db
        .from("assessment_responses")
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

  if (templateR.data.assessment_type === "psychometric_needs") {
    redirect(`/protected/psicometrias/${id}/necesidades`);
  }

  if (templateR.data.assessment_type === "psychometric_reasoning") {
    redirect(`/protected/psicometrias/${id}/razonamiento`);
  }

  if (templateR.data.assessment_type === "psychometric_attention") {
    redirect(`/protected/psicometrias/${id}/atencion`);
  }

  if (
    [
      "psychometric_social_leadership",
      "psychometric_values",
      "psychometric_integrity",
      "psychometric_bigfive",
      "psychometric_sales",
    ].includes(templateR.data.assessment_type)
  ) {
    redirect(`/protected/psicometrias/${id}/perfil`);
  }

  if (templateR.data.assessment_type !== "psychometric_vector") {
    notFound();
  }

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

  const person = personR.data;
  const organization = organizationR.data;
  const personName = `${person.first_name.trim()} ${person.last_name ?? ""}`.trim();

  if (assignment.status !== "completed") {
    return (
      <div className="space-y-6">
        <Link href="/protected/psicometrias" className="text-sm font-bold text-neutral-500 hover:text-orange-600">
          ← Volver a Psicometrías
        </Link>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <h1 className="text-xl font-black text-amber-900">La evaluación todavía no está terminada</h1>
          <p className="mt-2 text-sm leading-6 text-amber-800">
            El reporte se genera cuando la persona completa los 64 reactivos y finaliza la aplicación.
          </p>
        </div>
      </div>
    );
  }

  const dimensions = dimensionsR.data ?? [];
  const dimensionName = new Map(dimensions.map((item) => [item.id, item.name]));
  const resultRows = (resultsR.data ?? []) as ResultRow[];
  const dimensionInputs = resultRows.map((row) => ({
    name: dimensionName.get(row.dimension_id) ?? "Dimensión",
    score: Number(row.score),
  }));

  const questions = (questionsR.data ?? []) as QuestionRow[];
  const responses = (responsesR.data ?? []) as ResponseRow[];
  const questionById = new Map(questions.map((item) => [item.id, item]));
  const facetBuckets = new Map<string, { dimension: string; facet: string; values: number[] }>();

  for (const response of responses) {
    if (response.numeric_value === null) continue;
    const question = questionById.get(response.question_id);
    if (!question?.dimension_id || !question.facet) continue;
    const raw = Number(response.numeric_value);
    if (!Number.isFinite(raw)) continue;
    const adjusted = question.reverse_scored ? 6 - raw : raw;
    const dimension = dimensionName.get(question.dimension_id) ?? "Dimensión";
    const key = dimension + "|" + question.facet;
    const bucket: { dimension: string; facet: string; values: number[] } =
      facetBuckets.get(key) ?? {
        dimension,
        facet: question.facet,
        values: [],
      };
    bucket.values.push(adjusted);
    facetBuckets.set(key, bucket);
  }

  const facets: VectorFacetInput[] = Array.from(facetBuckets.values()).map((bucket) => ({
    dimension: bucket.dimension,
    facet: bucket.facet,
    score: bucket.values.reduce((sum, value) => sum + value, 0) / bucket.values.length,
  }));

  const analysis = analyzeVectorConductual(dimensionInputs, facets);
  const quality = responseQuality(responses, assignment.started_at, assignment.completed_at);
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
        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
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
              Perfil descriptivo de tendencias conductuales en contexto laboral.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-700 bg-neutral-800 p-5">
            <div className="text-xs font-bold uppercase tracking-wide text-orange-300">Persona evaluada</div>
            <div className="mt-2 text-xl font-black">{personName}</div>
            <div className="mt-1 text-sm text-neutral-300">
              {[person.job_title, person.area].filter(Boolean).join(" · ") || "Sin puesto registrado"}
            </div>
            <div className="mt-1 text-sm text-neutral-400">{organization.name}</div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Perfil" value={analysis.profileTitle} compact />
        <Metric label="Reactivos" value="64" />
        <Metric label="Fecha" value={completedAt} compact />
        <Metric label="Calidad técnica básica" value={quality.label} compact />
      </section>

      {quality.flags.length > 0 && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-amber-700">Indicadores de respuesta</div>
          <h2 className="mt-2 text-xl font-black text-amber-900">Interpretar con cautela</h2>
          <div className="mt-3 space-y-2 text-sm leading-6 text-amber-900">
            {quality.flags.map((flag) => <p key={flag}>• {flag}</p>)}
          </div>
          <p className="mt-3 text-xs leading-5 text-amber-700">
            Estas señales no detectan mentira ni invalidan automáticamente el resultado; sólo sugieren revisar la aplicación junto con entrevista y otras fuentes.
          </p>
        </section>
      )}

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Lectura ejecutiva</div>
        <h2 className="mt-2 text-3xl font-black text-neutral-900">{analysis.profileTitle}</h2>
        <div className="mt-5 space-y-3 text-sm leading-7 text-neutral-700">
          {analysis.executiveSummary.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1.15fr]">
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Mapa conductual</div>
          <h2 className="mt-2 text-xl font-black text-neutral-900">Radar de tendencias</h2>
          <p className="mt-1 text-sm leading-6 text-neutral-500">
            Índice conductual de 0 a 100 para facilitar la lectura del perfil.
          </p>
          <div className="mt-6">
            <VectorRadar dimensions={analysis.dimensions} />
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Resultados</div>
          <h2 className="mt-2 text-xl font-black text-neutral-900">Intensidad por dimensión</h2>
          <div className="mt-6 space-y-5">
            {analysis.dimensions.map((dimension) => (
              <div key={dimension.name}>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="font-black text-neutral-900">{dimension.name}</div>
                    <div className="mt-1 text-xs font-semibold text-neutral-400">{dimension.band}</div>
                  </div>
                  <div className="text-2xl font-black text-neutral-900">{dimension.index}</div>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full bg-orange-500" style={{ width: dimension.index + "%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <InfoPanel title="Fortalezas conductuales probables" items={analysis.strengths} tone="good" />
        <InfoPanel title="Riesgos o tensiones a observar" items={analysis.watchouts} tone="watch" />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {analysis.dimensions
          .slice()
          .sort((a, b) => ["Impulso", "Vinculación", "Constancia", "Estructura"].indexOf(a.name) - ["Impulso", "Vinculación", "Constancia", "Estructura"].indexOf(b.name))
          .map((dimension) => (
            <article key={dimension.name} className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-orange-600">{dimension.band}</div>
                  <h2 className="mt-1 text-xl font-black text-neutral-900">{dimension.name}</h2>
                </div>
                <div className="rounded-2xl bg-neutral-900 px-4 py-3 text-2xl font-black text-white">{dimension.index}</div>
              </div>
              <p className="mt-4 text-sm leading-7 text-neutral-700">{dimension.summary}</p>
              <div className="mt-5 grid gap-3">
                <Callout label="Puede aportar" text={dimension.strength} />
                <Callout label="Conviene observar" text={dimension.watchout} />
                <Callout label="Ambiente que puede resultarle natural" text={dimension.environment} />
              </div>
            </article>
          ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <TextCard eyebrow="Comunicación" title="Cómo tiende a relacionarse y comunicar" text={analysis.communicationStyle} />
        <TextCard eyebrow="Liderazgo" title="Hipótesis de estilo de conducción" text={analysis.leadershipStyle} />
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Facetas internas</div>
        <h2 className="mt-2 text-2xl font-black text-neutral-900">Dónde aparecen los contrastes más claros</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-neutral-500">
          Estas facetas ayudan a profundizar la entrevista y muestran contrastes internos entre grupos de reactivos.
        </p>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <FacetPanel title="Facetas relativamente más altas" items={analysis.topFacets} />
          <FacetPanel title="Facetas relativamente más bajas" items={analysis.developmentFacets} />
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Gestión y entrevista</div>
        <h2 className="mt-2 text-2xl font-black text-neutral-900">Sugerencias de manejo</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {analysis.managementSuggestions.map((item) => (
            <div key={item} className="rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">{item}</div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6 text-sm leading-6 text-neutral-600">
        <strong className="text-neutral-800">Alcance de interpretación.</strong> Vector Conductual FactorRH v1.0 es un instrumento de autodescripción laboral con reactivos originales. El resultado debe integrarse con entrevista estructurada, experiencia, evidencia de desempeño y requisitos reales del puesto.
      </section>
    </div>
  );
}

function VectorRadar({ dimensions }: { dimensions: Array<{ name: string; index: number }> }) {
  const order = ["Impulso", "Vinculación", "Constancia", "Estructura"];
  const sorted = order.map((name) => dimensions.find((item) => item.name === name) ?? { name, index: 0 });
  const center = 180;
  const radius = 118;
  const points = sorted.map((item, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / sorted.length;
    const r = radius * (item.index / 100);
    return {
      x: center + Math.cos(angle) * r,
      y: center + Math.sin(angle) * r,
      axisX: center + Math.cos(angle) * radius,
      axisY: center + Math.sin(angle) * radius,
      labelX: center + Math.cos(angle) * (radius + 38),
      labelY: center + Math.sin(angle) * (radius + 38),
      ...item,
    };
  });

  return (
    <svg viewBox="0 0 360 360" className="mx-auto h-auto w-full max-w-md">
      {[25, 50, 75, 100].map((level) => {
        const ring = sorted.map((_, index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / sorted.length;
          const r = radius * (level / 100);
          return (center + Math.cos(angle) * r) + "," + (center + Math.sin(angle) * r);
        }).join(" ");
        return <polygon key={level} points={ring} fill="none" stroke="#e5e5e5" strokeWidth="1.5" />;
      })}
      {points.map((point) => (
        <line key={point.name} x1={center} y1={center} x2={point.axisX} y2={point.axisY} stroke="#e5e5e5" />
      ))}
      <polygon
        points={points.map((point) => point.x + "," + point.y).join(" ")}
        fill="rgba(249,115,22,.16)"
        stroke="#f97316"
        strokeWidth="4"
      />
      {points.map((point) => (
        <g key={point.name}>
          <circle cx={point.x} cy={point.y} r="5" fill="#f97316" />
          <text x={point.labelX} y={point.labelY} textAnchor="middle" className="fill-neutral-700 text-[12px] font-bold">
            {point.name}
          </text>
          <text x={point.labelX} y={point.labelY + 15} textAnchor="middle" className="fill-neutral-400 text-[10px] font-semibold">
            {point.index}
          </text>
        </g>
      ))}
    </svg>
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

function InfoPanel({ title, items, tone }: { title: string; items: string[]; tone: "good" | "watch" }) {
  const cls = tone === "good" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50";
  const titleCls = tone === "good" ? "text-emerald-800" : "text-amber-800";
  return (
    <section className={"rounded-3xl border p-6 " + cls}>
      <h2 className={"text-xl font-black " + titleCls}>{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((item) => <p key={item} className="text-sm leading-6 text-neutral-700">• {item}</p>)}
      </div>
    </section>
  );
}

function Callout({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">{label}</div>
      <p className="mt-2 text-sm leading-6 text-neutral-700">{text}</p>
    </div>
  );
}

function TextCard({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">{eyebrow}</div>
      <h2 className="mt-2 text-xl font-black text-neutral-900">{title}</h2>
      <p className="mt-4 text-sm leading-7 text-neutral-700">{text}</p>
    </section>
  );
}

function FacetPanel({ title, items }: { title: string; items: VectorFacetInput[] }) {
  return (
    <div className="rounded-2xl border border-neutral-200 p-5">
      <h3 className="font-black text-neutral-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.dimension + item.facet} className="flex items-center justify-between gap-4 rounded-xl bg-neutral-50 px-4 py-3">
            <div>
              <div className="text-sm font-bold text-neutral-800">{item.facet}</div>
              <div className="text-xs text-neutral-400">{item.dimension}</div>
            </div>
            <div className="text-lg font-black text-neutral-900">{vectorIndex(item.score)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function responseQuality(responses: ResponseRow[], startedAt: string | null, completedAt: string | null) {
  const values = responses
    .map((item) => item.numeric_value === null ? null : Number(item.numeric_value))
    .filter((value): value is number => Number.isFinite(value));

  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const maxShare = values.length ? Math.max(...counts.values()) / values.length : 0;
  const flags: string[] = [];

  if (startedAt && completedAt) {
    const minutes = (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60000;
    if (minutes > 0 && minutes < 4) {
      flags.push("El tiempo total de respuesta fue muy corto para 64 reactivos; conviene confirmar que la persona leyó cada afirmación.");
    }
  }

  if (maxShare >= 0.8) {
    flags.push("Existe una concentración muy alta en una sola opción de respuesta; conviene revisar si hubo respuesta automática o poco diferenciada.");
  }

  return {
    label: flags.length ? "Revisar" : "Sin alertas básicas",
    flags,
  };
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-7">
      <h1 className="font-bold text-red-800">No fue posible generar el reporte</h1>
      <p className="mt-2 text-sm text-red-700">{message}</p>
    </div>
  );
}
