import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ id: string }> };
type ResultRow = { dimension_id: string; percentage: number | string };
type QuestionRow = { id: string; difficulty: string | null; correct_option: number | null };
type ResponseRow = { question_id: string; numeric_value: number | string | null };

export default function AttentionReportPage(props: PageProps) {
  return (
    <Suspense fallback={<div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm">Generando reporte de atención...</div>}>
      <AttentionReportContent {...props} />
    </Suspense>
  );
}

async function AttentionReportContent({ params }: PageProps) {
  const auth = await createClient();
  const { data: authData, error: authError } = await auth.auth.getClaims();
  if (authError || !authData?.claims) redirect("/auth/login");

  const { id } = await params;
  const db = createAdminClient();
  const assignmentR = await db.from("assessment_assignments")
    .select("id,status,started_at,completed_at,process_id,template_id")
    .eq("id", id).maybeSingle();
  if (assignmentR.error) return <ErrorCard message={assignmentR.error.message} />;
  if (!assignmentR.data) notFound();
  const assignment = assignmentR.data;

  const [processR, templateR, dimensionsR, resultsR, questionsR, responsesR] = await Promise.all([
    db.from("assessment_processes").select("id,person_id,organization_id").eq("id", assignment.process_id).single(),
    db.from("assessment_templates").select("id,name,assessment_type").eq("id", assignment.template_id).single(),
    db.from("assessment_dimensions").select("id,name,sort_order").eq("template_id", assignment.template_id).order("sort_order"),
    db.from("assessment_results").select("dimension_id,percentage").eq("assignment_id", assignment.id),
    db.from("assessment_questions").select("id,difficulty,correct_option").eq("template_id", assignment.template_id),
    db.from("assessment_responses").select("question_id,numeric_value").eq("assignment_id", assignment.id),
  ]);
  const firstError = processR.error || templateR.error || dimensionsR.error || resultsR.error || questionsR.error || responsesR.error;
  if (firstError) return <ErrorCard message={firstError.message} />;
  if (templateR.data.assessment_type !== "psychometric_attention") notFound();

  const [personR, organizationR] = await Promise.all([
    db.from("people").select("id,first_name,last_name,job_title,area").eq("id", processR.data.person_id).single(),
    db.from("organizations").select("id,name").eq("id", processR.data.organization_id).single(),
  ]);
  if (personR.error || organizationR.error) return <ErrorCard message={personR.error?.message ?? organizationR.error?.message ?? "Error"} />;

  if (assignment.status !== "completed") {
    return (
      <div className="space-y-6">
        <Link href="/protected/psicometrias" className="text-sm font-bold text-neutral-500 hover:text-orange-600">← Volver a Psicometrías</Link>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <h1 className="text-xl font-black text-amber-900">La psicometría todavía no está terminada</h1>
          <p className="mt-2 text-sm text-amber-800">El reporte se genera cuando la persona responde los 30 reactivos.</p>
        </div>
      </div>
    );
  }

  const dimensionName = new Map((dimensionsR.data ?? []).map((item) => [item.id, item.name]));
  const dimensions = ((resultsR.data ?? []) as ResultRow[]).map((row) => ({
    name: dimensionName.get(row.dimension_id) ?? "Dimensión",
    percentage: Number(row.percentage),
  }));
  const questions = (questionsR.data ?? []) as QuestionRow[];
  const responses = (responsesR.data ?? []) as ResponseRow[];
  const questionById = new Map(questions.map((item) => [item.id, item]));
  let correct = 0;
  const difficulty = new Map<string, { correct: number; total: number }>();
  for (const response of responses) {
    const question = questionById.get(response.question_id);
    if (!question || question.correct_option === null || response.numeric_value === null) continue;
    const ok = Number(response.numeric_value) === question.correct_option;
    if (ok) correct += 1;
    const key = question.difficulty ?? "Sin nivel";
    const bucket = difficulty.get(key) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (ok) bucket.correct += 1;
    difficulty.set(key, bucket);
  }
  const total = questions.filter((item) => item.correct_option !== null).length;
  const overall = total ? Math.round((correct / total) * 100) : 0;
  const duration = assignment.started_at && assignment.completed_at
    ? Math.max(1, Math.round((new Date(assignment.completed_at).getTime() - new Date(assignment.started_at).getTime()) / 60000))
    : null;
  const ranked = [...dimensions].sort((a,b)=>b.percentage-a.percentage);
  const person = personR.data;
  const personName = (person.first_name.trim() + " " + (person.last_name ?? "")).trim();

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/protected/psicometrias" className="text-sm font-bold text-neutral-500 hover:text-orange-600">← Volver a Psicometrías</Link>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Versión experimental 1.0</span>
      </div>

      <header className="rounded-3xl bg-neutral-900 p-7 text-white shadow-sm md:p-9">
        <div className="text-xs font-bold uppercase tracking-[.18em] text-orange-400">FactorRH · Psicometrías</div>
        <div className="mt-5 grid gap-7 lg:grid-cols-[1.7fr_.8fr] lg:items-end">
          <div>
            <h1 className="text-3xl font-black md:text-4xl">{templateR.data.name}</h1>
            <p className="mt-3 max-w-3xl text-neutral-300">Desempeño descriptivo en tareas breves de discriminación, selección, seguimiento de reglas, verificación y control de errores.</p>
          </div>
          <div className="rounded-2xl border border-neutral-700 bg-neutral-800 p-5">
            <div className="text-xs font-bold uppercase tracking-wide text-orange-300">Persona evaluada</div>
            <div className="mt-2 text-xl font-black">{personName}</div>
            <div className="mt-1 text-sm text-neutral-300">{[person.job_title, person.area].filter(Boolean).join(" · ") || "Sin puesto registrado"}</div>
            <div className="mt-1 text-sm text-neutral-400">{organizationR.data.name}</div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Aciertos" value={correct + " / " + total} />
        <Metric label="Exactitud global" value={overall + "%"} />
        <Metric label="Tiempo total" value={duration ? duration + " min" : "—"} compact />
        <Metric label="Reactivos" value={String(total)} />
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Lectura ejecutiva</div>
        <h2 className="mt-2 text-3xl font-black text-neutral-900">Atención y precisión</h2>
        <div className="mt-5 space-y-3 text-sm leading-7 text-neutral-700">
          <p>El resultado global muestra el porcentaje de respuestas correctas en 30 tareas breves. No equivale a un percentil, diagnóstico neuropsicológico ni medida normativa de velocidad.</p>
          <p>Las diferencias por dimensión permiten identificar dónde hubo mayor y menor exactitud relativa. Su importancia debe contrastarse con las demandas reales del puesto y, cuando sea crítico, con una muestra de trabajo.</p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Exactitud por dimensión</div>
          <div className="mt-6 space-y-5">
            {dimensions.map((item) => (
              <div key={item.name}>
                <div className="flex items-center justify-between gap-3">
                  <div className="font-black text-neutral-900">{item.name}</div>
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
          <Panel title="Mayor exactitud relativa" items={ranked.slice(0,2).map((item)=>item.name + ": " + Math.round(item.percentage) + "%")} tone="good" />
          <Panel title="Áreas a verificar" items={[...ranked].reverse().slice(0,2).map((item)=>item.name + ": " + Math.round(item.percentage) + "%")} tone="watch" />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {["Básico","Intermedio","Avanzado"].map((level)=>{
          const row=difficulty.get(level) ?? {correct:0,total:0};
          const pct=row.total ? Math.round((row.correct/row.total)*100) : 0;
          return (
            <div key={level} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">{level}</div>
              <div className="mt-2 text-3xl font-black text-neutral-900">{pct}%</div>
              <div className="mt-1 text-xs text-neutral-500">{row.correct} de {row.total} correctas</div>
            </div>
          );
        })}
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6 text-sm leading-6 text-neutral-600">
        <strong className="text-neutral-800">Nota metodológica.</strong> Atención y Precisión FactorRH v1.0 es un instrumento experimental con reactivos originales. El tiempo total se muestra sólo como dato contextual; todavía no existe baremo de velocidad ni punto de corte. No debe utilizarse como criterio único de contratación y no sustituye pruebas clínicas, neuropsicológicas o de seguridad certificadas cuando éstas sean requeridas.
      </section>
    </div>
  );
}

function Metric({ label, value, compact=false }: { label:string; value:string; compact?:boolean }) {
  return <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><div className="text-xs font-bold uppercase tracking-wide text-neutral-400">{label}</div><div className={compact ? "mt-2 text-lg font-black leading-tight text-neutral-900" : "mt-2 text-3xl font-black text-neutral-900"}>{value}</div></div>;
}
function Panel({ title, items, tone }: { title:string; items:string[]; tone:"good"|"watch" }) {
  const cls=tone==="good"?"border-emerald-200 bg-emerald-50":"border-amber-200 bg-amber-50";
  return <section className={"rounded-3xl border p-6 "+cls}><h2 className="text-xl font-black text-neutral-900">{title}</h2><div className="mt-4 space-y-3">{items.map((item)=><p key={item} className="text-sm leading-6 text-neutral-700">• {item}</p>)}</div></section>;
}
function ErrorCard({ message }: { message:string }) {
  return <div className="rounded-3xl border border-red-200 bg-red-50 p-7"><h1 className="font-bold text-red-800">No fue posible generar el reporte</h1><p className="mt-2 text-sm text-red-700">{message}</p></div>;
}
