import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const candidateStageLabels: Record<string, string> = {
  sourced: "Sourced",
  contacted: "Contactado",
  screening: "Filtro",
  interview: "Entrevista",
  assessment: "Evaluación",
  finalist: "Finalista",
  hired: "Contratado",
  rejected: "Descartado",
  withdrawn: "Declinó",
};

const outcomeLabels: Record<string, string> = {
  recommended: "Recomendable",
  with_reservations: "Con Reservas",
  not_recommended: "No Recomendable",
};

const eseStatusLabels: Record<string, string> = {
  requested: "Solicitado",
  scheduled: "Programado",
  fieldwork: "Visita / campo",
  verification: "Verificación",
  report: "Reporte",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const eseResultLabels: Record<string, string> = {
  recommended: "Recomendable",
  with_reservations: "Con Reservas",
  not_recommended: "No Recomendable",
};

async function requireUser() {
  const authClient = await createClient();
  const { data, error } = await authClient.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");
}

function dateLabel(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(new Date(value));
}

function percent(value: number | null) {
  return value === null ? "—" : `${value.toFixed(0)}%`;
}

async function saveCandidateReview(formData: FormData) {
  "use server";

  await requireUser();

  const candidateId = String(formData.get("candidate_id") || "");
  const jobId = String(formData.get("job_id") || "");
  const stage = String(formData.get("stage") || "");
  const interviewNotes = String(formData.get("interview_notes") || "").trim();
  const interviewedAt = String(formData.get("interviewed_at") || "").trim();
  const manualOutcome = String(formData.get("manual_outcome") || "").trim();
  const decisionNotes = String(formData.get("decision_notes") || "").trim();

  if (!candidateId || !jobId || !Object.keys(candidateStageLabels).includes(stage)) {
    throw new Error("Datos del candidato inválidos.");
  }

  const db = createAdminClient();

  const { error } = await db
    .from("recruitment_job_candidates")
    .update({
      stage,
      interview_notes: interviewNotes || null,
      interviewed_at: interviewedAt ? new Date(interviewedAt).toISOString() : null,
      manual_outcome: manualOutcome || null,
      decision_notes: decisionNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidateId)
    .eq("recruitment_job_id", jobId);

  if (error) throw new Error(error.message);

  revalidatePath(`/protected/operacion/reclutamiento/${jobId}`);
  revalidatePath(
    `/protected/operacion/reclutamiento/${jobId}/candidatos/${candidateId}`,
  );
}

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string; candidateId: string }>;
}) {
  await requireUser();
  const { id: jobId, candidateId } = await params;
  const db = createAdminClient();

  const { data: candidate, error } = await db
    .from("recruitment_job_candidates")
    .select(
      "id,recruitment_job_id,person_id,stage,source,notes,interview_notes,interviewed_at,manual_outcome,decision_notes,created_at,updated_at",
    )
    .eq("id", candidateId)
    .eq("recruitment_job_id", jobId)
    .single();

  if (error || !candidate) notFound();

  const { data: job, error: jobError } = await db
    .from("recruitment_jobs")
    .select(
      "id,service_order_id,organization_id,vacancy_name,status,location,salary_min,salary_max",
    )
    .eq("id", jobId)
    .single();

  if (jobError || !job) notFound();

  const [personResult, orgResult, processesResult, eseResult] = await Promise.all([
    db
      .from("people")
      .select("id,first_name,last_name,email,phone,job_title,area,created_at")
      .eq("id", candidate.person_id)
      .single(),
    db.from("organizations").select("id,name").eq("id", job.organization_id).single(),
    db
      .from("assessment_processes")
      .select("id,name,status,start_date,target_date,created_at")
      .eq("recruitment_job_candidate_id", candidate.id)
      .order("created_at", { ascending: false }),
    db
      .from("ese_cases")
      .select(
        "id,service_order_id,case_name,status,result,due_date,report_url,notes,created_at",
      )
      .eq("person_id", candidate.person_id)
      .eq("organization_id", job.organization_id)
      .order("created_at", { ascending: false }),
  ]);

  if (personResult.error || !personResult.data) notFound();

  const person = personResult.data;
  const organization = orgResult.data;
  const processes = processesResult.data ?? [];
  const eseCases = eseResult.data ?? [];

  const processIds = processes.map((item) => item.id);

  const { data: assignments } = processIds.length
    ? await db
        .from("assessment_assignments")
        .select(
          "id,process_id,template_id,status,started_at,completed_at,created_at,due_date",
        )
        .in("process_id", processIds)
        .order("created_at", { ascending: false })
    : { data: [] as any[] };

  const assignmentRows = assignments ?? [];
  const templateIds = Array.from(
    new Set(assignmentRows.map((item) => item.template_id)),
  );

  const { data: templates } = templateIds.length
    ? await db
        .from("assessment_templates")
        .select("id,name,assessment_type")
        .in("id", templateIds)
    : { data: [] as any[] };

  const assignmentIds = assignmentRows.map((item) => item.id);
  const { data: results } = assignmentIds.length
    ? await db
        .from("assessment_results")
        .select("assignment_id,percentage,score,interpretation")
        .in("assignment_id", assignmentIds)
    : { data: [] as any[] };

  const templateMap = new Map((templates ?? []).map((item) => [item.id, item]));
  const resultRows = results ?? [];
  const resultsByAssignment = new Map<string, any[]>();

  for (const result of resultRows) {
    const list = resultsByAssignment.get(result.assignment_id) ?? [];
    list.push(result);
    resultsByAssignment.set(result.assignment_id, list);
  }

  const completedAssignments = assignmentRows.filter(
    (item) => item.status === "completed",
  );

  const personName = [person.first_name, person.last_name].filter(Boolean).join(" ");

  const returnTo = `/protected/operacion/reclutamiento/${job.id}/candidatos/${candidate.id}`;
  const assessmentHref =
    `/protected/nueva-evaluacion?organization=${encodeURIComponent(job.organization_id)}` +
    `&person=${encodeURIComponent(candidate.person_id)}` +
    `&recruitmentCandidate=${encodeURIComponent(candidate.id)}` +
    `&process=${encodeURIComponent(`${job.vacancy_name} · Selección`)}` +
    `&returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div>
      <Link
        href={`/protected/operacion/reclutamiento/${job.id}`}
        className="text-sm font-bold text-orange-600 hover:text-orange-700"
      >
        ← Volver a la vacante
      </Link>

      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            {organization?.name ?? "Cliente"} · {job.vacancy_name}
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            {personName}
          </h1>
          <p className="mt-2 text-neutral-600">
            {[person.job_title, person.area].filter(Boolean).join(" · ") ||
              "Candidato en proceso de selección"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {person.email && (
              <span className="rounded-full bg-white px-3 py-1.5 text-neutral-600 ring-1 ring-neutral-200">
                {person.email}
              </span>
            )}
            {person.phone && (
              <span className="rounded-full bg-white px-3 py-1.5 text-neutral-600 ring-1 ring-neutral-200">
                {person.phone}
              </span>
            )}
            {candidate.source && (
              <span className="rounded-full bg-neutral-100 px-3 py-1.5 font-semibold text-neutral-600">
                Fuente: {candidate.source}
              </span>
            )}
          </div>
        </div>

        <Link
          href={assessmentHref}
          className="rounded-xl bg-orange-500 px-5 py-3 text-center text-sm font-bold text-white shadow-sm hover:bg-orange-600"
        >
          + Asignar evaluación
        </Link>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Etapa"
          value={candidateStageLabels[candidate.stage] ?? candidate.stage}
          note="Proceso de selección"
        />
        <Metric
          label="Evaluaciones"
          value={String(assignmentRows.length)}
          note={`${completedAssignments.length} completadas`}
        />
        <Metric
          label="ESE"
          value={String(eseCases.length)}
          note={
            eseCases.some((item) => item.status === "delivered")
              ? "Con estudio entregado"
              : "Estudios relacionados"
          }
        />
        <Metric
          label="Dictamen responsable"
          value={
            candidate.manual_outcome
              ? outcomeLabels[candidate.manual_outcome] ?? candidate.manual_outcome
              : "Pendiente"
          }
          note="Captura manual, no automática"
        />
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid content-start gap-6">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-black text-neutral-900">Entrevista y decisión</h2>
                <p className="mt-1 text-sm leading-6 text-neutral-500">
                  Registro del responsable del proceso. La plataforma no genera una
                  recomendación automática de contratación.
                </p>
              </div>
            </div>

            <form action={saveCandidateReview} className="mt-5 grid gap-4">
              <input type="hidden" name="candidate_id" value={candidate.id} />
              <input type="hidden" name="job_id" value={job.id} />

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                  Etapa
                  <select
                    name="stage"
                    defaultValue={candidate.stage}
                    className="rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal"
                  >
                    {Object.entries(candidateStageLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                  Fecha de entrevista
                  <input
                    name="interviewed_at"
                    type="datetime-local"
                    defaultValue={
                      candidate.interviewed_at
                        ? new Date(candidate.interviewed_at)
                            .toLocaleString("sv-SE", {
                              timeZone: "America/Mexico_City",
                            })
                            .slice(0, 16)
                        : ""
                    }
                    className="rounded-xl border border-neutral-300 px-4 py-3 font-normal"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                Notas de entrevista
                <textarea
                  name="interview_notes"
                  rows={7}
                  defaultValue={candidate.interview_notes ?? ""}
                  placeholder="Experiencia, ejemplos conductuales, motivadores, disponibilidad, dudas y acuerdos..."
                  className="rounded-xl border border-neutral-300 px-4 py-3 font-normal"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                Dictamen manual del responsable
                <select
                  name="manual_outcome"
                  defaultValue={candidate.manual_outcome ?? ""}
                  className="rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal"
                >
                  <option value="">Pendiente</option>
                  <option value="recommended">Recomendable</option>
                  <option value="with_reservations">Con Reservas</option>
                  <option value="not_recommended">No Recomendable</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                Justificación / decisión
                <textarea
                  name="decision_notes"
                  rows={5}
                  defaultValue={candidate.decision_notes ?? ""}
                  placeholder="Documenta criterios laborales relevantes y la decisión del responsable."
                  className="rounded-xl border border-neutral-300 px-4 py-3 font-normal"
                />
              </label>

              <button className="rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold text-white hover:bg-neutral-900">
                Guardar ficha
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="font-black text-neutral-900">Datos del proceso</h2>
            <div className="mt-5 grid gap-4 text-sm">
              <Info label="Vacante" value={job.vacancy_name} />
              <Info label="Ubicación" value={job.location || "—"} />
              <Info
                label="Rango salarial"
                value={
                  job.salary_min || job.salary_max
                    ? `${job.salary_min ?? "—"} – ${job.salary_max ?? "—"}`
                    : "—"
                }
              />
              <Info label="Alta del candidato" value={dateLabel(candidate.created_at)} />
              <Info label="Última actualización" value={dateLabel(candidate.updated_at)} />
            </div>
          </section>
        </div>

        <div className="grid content-start gap-6">
          <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-neutral-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-black text-neutral-900">Evaluaciones</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Resultados vinculados específicamente a esta vacante.
                </p>
              </div>
              <Link
                href={assessmentHref}
                className="text-xs font-bold text-orange-600 hover:text-orange-700"
              >
                + Asignar otra
              </Link>
            </div>

            {assignmentRows.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-500">
                Este candidato todavía no tiene evaluaciones en este proceso.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {assignmentRows.map((assignment) => {
                  const template = templateMap.get(assignment.template_id);
                  const assignmentResults =
                    resultsByAssignment.get(assignment.id) ?? [];
                  const avgPercentage = assignmentResults.length
                    ? assignmentResults.reduce(
                        (sum, item) => sum + Number(item.percentage || 0),
                        0,
                      ) / assignmentResults.length
                    : null;

                  return (
                    <Link
                      key={assignment.id}
                      href={`/protected/evaluaciones/${assignment.id}`}
                      className="block p-5 transition hover:bg-neutral-50"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="font-black text-neutral-900">
                            {template?.name ?? "Evaluación"}
                          </div>
                          <div className="mt-1 text-xs font-semibold text-neutral-500">
                            {assignment.status === "completed"
                              ? "Completada"
                              : assignment.status === "in_progress"
                                ? "En proceso"
                                : "Pendiente"}{" "}
                            · {dateLabel(assignment.completed_at || assignment.created_at)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black text-neutral-900">
                            {percent(avgPercentage)}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                            promedio dimensiones
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 px-6 py-5">
              <h2 className="font-black text-neutral-900">Estudios socioeconómicos</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Estudios de esta misma persona dentro de la empresa.
              </p>
            </div>

            {eseCases.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-500">
                No hay un ESE relacionado con este candidato.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {eseCases.map((ese) => (
                  <div key={ese.id} className="p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="font-black text-neutral-900">
                          {ese.case_name}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-neutral-500">
                          {eseStatusLabels[ese.status] ?? ese.status}
                          {ese.due_date ? ` · Compromiso ${ese.due_date}` : ""}
                        </div>
                      </div>
                      <div
                        className={
                          ese.result
                            ? "rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-black text-neutral-700"
                            : "rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700"
                        }
                      >
                        {ese.result
                          ? eseResultLabels[ese.result] ?? ese.result
                          : "Pendiente"}
                      </div>
                    </div>

                    {ese.notes && (
                      <p className="mt-3 text-sm leading-6 text-neutral-600">
                        {ese.notes}
                      </p>
                    )}

                    {ese.report_url && (
                      <a
                        href={ese.report_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex text-xs font-bold text-orange-600 hover:text-orange-700"
                      >
                        Abrir reporte ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </div>
      <div className="mt-3 text-2xl font-black tracking-tight text-neutral-900">
        {value}
      </div>
      <div className="mt-2 text-sm text-neutral-500">{note}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="mt-1 font-semibold text-neutral-800">{value}</div>
    </div>
  );
}
