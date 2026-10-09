import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { analyzeNeeds } from "@/lib/necesidades-laborales";
import { PsychometricTestInfo, ScoreColumnChart } from "../../report-ui";

type PageProps = { params: Promise<{ id: string }> };

type ResultRow = {
  dimension_id: string;
  score: number | string;
};

export default function LaborNeedsReportPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500" />
          <p className="text-neutral-600">Generando reporte de necesidades laborales...</p>
        </div>
      }
    >
      <LaborNeedsReportContent {...props} />
    </Suspense>
  );
}

async function LaborNeedsReportContent({ params }: PageProps) {
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

  const [processR, templateR, dimensionsR, resultsR, responsesR] =
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
        .from("assessment_responses")
        .select("numeric_value")
        .eq("assignment_id", assignment.id),
    ]);

  const firstError =
    processR.error ||
    templateR.error ||
    dimensionsR.error ||
    resultsR.error ||
    responsesR.error;

  if (firstError) return <ErrorCard message={firstError.message} />;
  if (templateR.data.assessment_type !== "psychometric_needs") notFound();

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
    return (
      <ErrorCard
        message={
          personR.error?.message ??
          organizationR.error?.message ??
          "No fue posible cargar a la persona."
        }
      />
    );
  }

  if (assignment.status !== "completed") {
    return (
      <div className="space-y-6">
        <Link
          href="/protected/psicometrias"
          className="text-sm font-bold text-neutral-500 hover:text-orange-600"
        >
          ← Volver a Psicometrías
        </Link>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <h1 className="text-xl font-black text-amber-900">
            La psicometría todavía no está terminada
          </h1>
          <p className="mt-2 text-sm leading-6 text-amber-800">
            El reporte se genera cuando la persona completa los 60 reactivos.
          </p>
        </div>
      </div>
    );
  }

  const dimensionName = new Map(
    (dimensionsR.data ?? []).map((item) => [item.id, item.name]),
  );
  const inputs = ((resultsR.data ?? []) as ResultRow[]).map((row) => ({
    name: dimensionName.get(row.dimension_id) ?? "Dimensión",
    score: Number(row.score),
  }));
  const analysis = analyzeNeeds(inputs);

  const person = personR.data;
  const personName = `${person.first_name.trim()} ${person.last_name ?? ""}`.trim();
  const completedAt = assignment.completed_at
    ? new Intl.DateTimeFormat("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(assignment.completed_at))
    : "—";

  const responseValues = (responsesR.data ?? [])
    .map((item) =>
      item.numeric_value === null ? null : Number(item.numeric_value),
    )
    .filter((value): value is number => Number.isFinite(value));

  const quality = basicResponseQuality(
    responseValues,
    assignment.started_at,
    assignment.completed_at,
  );

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/protected/psicometrias"
          className="text-sm font-bold text-neutral-500 hover:text-orange-600"
        >
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
            <h1 className="text-3xl font-black md:text-4xl">
              {templateR.data.name}
            </h1>
            <p className="mt-3 max-w-3xl text-neutral-300">
              Mapa descriptivo de las condiciones que tienden a incrementar o
              disminuir la motivación laboral.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-700 bg-neutral-800 p-5">
            <div className="text-xs font-bold uppercase tracking-wide text-orange-300">
              Persona evaluada
            </div>
            <div className="mt-2 text-xl font-black">{personName}</div>
            <div className="mt-1 text-sm text-neutral-300">
              {[person.job_title, person.area].filter(Boolean).join(" · ") ||
                "Sin puesto registrado"}
            </div>
            <div className="mt-1 text-sm text-neutral-400">
              {organizationR.data.name}
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Reactivos" value="60" />
        <Metric label="Dimensiones" value="10" />
        <Metric label="Fecha" value={completedAt} compact />
        <Metric label="Calidad técnica básica" value={quality.label} compact />
      </section>

      <PsychometricTestInfo assessmentType={templateR.data.assessment_type} />

      {quality.flags.length > 0 && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-amber-700">
            Indicadores de respuesta
          </div>
          <h2 className="mt-2 text-xl font-black text-amber-900">
            Interpretar con cautela
          </h2>
          <div className="mt-3 space-y-2 text-sm leading-6 text-amber-900">
            {quality.flags.map((flag) => (
              <p key={flag}>• {flag}</p>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
          Lectura ejecutiva
        </div>
        <h2 className="mt-2 text-3xl font-black text-neutral-900">
          Perfil motivacional laboral
        </h2>
        <div className="mt-5 space-y-3 text-sm leading-7 text-neutral-700">
          {analysis.executiveSummary.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <ScoreColumnChart
          title="Mapa visual de motivadores"
          items={analysis.dimensions.map((item) => ({ label: item.name, value: item.index }))}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
            Mapa de necesidades
          </div>
          <h2 className="mt-2 text-xl font-black text-neutral-900">
            Intensidad relativa
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Índice de intensidad de 0 a 100 para facilitar la lectura del perfil.
          </p>
          <div className="mt-6 space-y-4">
            {analysis.dimensions.map((item) => (
              <div key={item.name}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-black text-neutral-900">{item.name}</div>
                    <div className="text-xs font-semibold text-neutral-400">
                      {item.band}
                    </div>
                  </div>
                  <div className="text-xl font-black text-neutral-900">
                    {item.index}
                  </div>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-orange-500"
                    style={{ width: `${item.index}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <Panel
            title="Motivadores principales"
            subtitle="Las tres necesidades relativamente más altas del perfil."
            items={analysis.topMotivators.map(
              (item) => `${item.name}: ${item.energizes}`,
            )}
            tone="good"
          />
          <Panel
            title="Necesidades menos críticas"
            subtitle="Factores que la persona necesita en menor medida; no son debilidades."
            items={analysis.lowerNeeds.map(
              (item) => `${item.name}: ${item.meaning}`,
            )}
            tone="neutral"
          />
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {analysis.dimensions.map((item) => (
          <article
            key={item.name}
            className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-orange-600">
                  {item.band}
                </div>
                <h2 className="mt-1 text-xl font-black text-neutral-900">
                  {item.name}
                </h2>
              </div>
              <div className="rounded-2xl bg-neutral-900 px-4 py-3 text-2xl font-black text-white">
                {item.index}
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-neutral-700">
              {item.meaning}
            </p>

            <div className="mt-5 grid gap-3">
              <Callout label="Tiende a energizar" text={item.energizes} />
              <Callout label="Puede generar desgaste si es una necesidad alta" text={item.frustrates} />
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="Riesgos de desmotivación o rotación"
          subtitle="Hipótesis a validar cuando estas condiciones faltan de forma sostenida."
          items={analysis.retentionRisks}
          tone="watch"
        />
        <Panel
          title="Sugerencias de gestión"
          subtitle="Condiciones que pueden favorecer compromiso y permanencia."
          items={analysis.managementSuggestions}
          tone="good"
        />
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">
          Entrevista de profundización
        </div>
        <h2 className="mt-2 text-2xl font-black text-neutral-900">
          Preguntas sugeridas
        </h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {analysis.interviewPrompts.map((item) => (
            <div
              key={item}
              className="rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-700"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6 text-sm leading-6 text-neutral-600">
        <strong className="text-neutral-800">Alcance de interpretación.</strong> Mapa de
        Necesidades Laborales FactorRH v1.0 es un instrumento de
        autodescripción laboral con reactivos originales. Las necesidades altas no son
        fortalezas por sí mismas y las bajas no son defectos. El resultado debe
        contrastarse con entrevista, condiciones del puesto, experiencia y evidencia de desempeño.
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div
        className={
          compact
            ? "mt-2 text-lg font-black leading-tight text-neutral-900"
            : "mt-2 text-3xl font-black text-neutral-900"
        }
      >
        {value}
      </div>
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
  tone: "good" | "watch" | "neutral";
}) {
  const cls =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "watch"
        ? "border-amber-200 bg-amber-50"
        : "border-neutral-200 bg-white";
  return (
    <section className={"rounded-3xl border p-6 " + cls}>
      <h2 className="text-xl font-black text-neutral-900">{title}</h2>
      <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <p key={item} className="text-sm leading-6 text-neutral-700">
            • {item}
          </p>
        ))}
      </div>
    </section>
  );
}

function Callout({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <p className="mt-2 text-sm leading-6 text-neutral-700">{text}</p>
    </div>
  );
}

function basicResponseQuality(
  values: number[],
  startedAt: string | null,
  completedAt: string | null,
) {
  const flags: string[] = [];
  const counts = new Map<number, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const maxShare = values.length
    ? Math.max(...Array.from(counts.values())) / values.length
    : 0;

  if (startedAt && completedAt) {
    const minutes =
      (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60000;
    if (minutes > 0 && minutes < 4) {
      flags.push(
        "El tiempo total fue muy corto para 60 reactivos; conviene confirmar que las afirmaciones se leyeron con atención.",
      );
    }
  }

  if (maxShare >= 0.8) {
    flags.push(
      "Existe una concentración muy alta en una sola opción de respuesta; conviene revisar si hubo poca diferenciación.",
    );
  }

  return {
    label: flags.length ? "Revisar" : "Sin alertas básicas",
    flags,
  };
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-7">
      <h1 className="font-bold text-red-800">
        No fue posible generar el reporte
      </h1>
      <p className="mt-2 text-sm text-red-700">{message}</p>
    </div>
  );
}
