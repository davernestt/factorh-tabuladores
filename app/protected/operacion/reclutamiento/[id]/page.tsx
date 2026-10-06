import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const statusLabels: Record<string,string> = {
  intake:"Levantamiento",
  sourcing:"Sourcing",
  screening:"Filtro",
  interviews:"Entrevistas",
  finalists:"Finalistas",
  filled:"Cubierta",
  on_hold:"Pausa",
  cancelled:"Cancelada",
};

const candidateStageLabels: Record<string,string> = {
  sourced:"Sourced",
  contacted:"Contactado",
  screening:"Filtro",
  interview:"Entrevista",
  assessment:"Evaluación",
  finalist:"Finalista",
  hired:"Contratado",
  rejected:"Descartado",
  withdrawn:"Declinó",
};

async function requireUser() {
  const authClient = await createClient();
  const { data, error } = await authClient.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");
}

async function updateJob(formData: FormData) {
  "use server";
  await requireUser();

  const id = String(formData.get("job_id") || "");
  const status = String(formData.get("status") || "intake");
  const vacancyName = String(formData.get("vacancy_name") || "").trim();
  const openings = Number(formData.get("openings") || 1);
  const salaryMin = Number(formData.get("salary_min") || 0);
  const salaryMax = Number(formData.get("salary_max") || 0);
  const location = String(formData.get("location") || "").trim();
  const workMode = String(formData.get("work_mode") || "").trim();
  const requirements = String(formData.get("requirements") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!id || !vacancyName) throw new Error("Vacante inválida.");

  const db = createAdminClient();
  const { error } = await db.from("recruitment_jobs").update({
    vacancy_name: vacancyName,
    status,
    openings: Number.isFinite(openings) && openings > 0 ? openings : 1,
    salary_min: salaryMin > 0 ? salaryMin : null,
    salary_max: salaryMax > 0 ? salaryMax : null,
    location: location || null,
    work_mode: workMode || null,
    requirements: requirements || null,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/protected/operacion");
  revalidatePath(`/protected/operacion/reclutamiento/${id}`);
}

async function addCandidate(formData: FormData) {
  "use server";
  await requireUser();

  const jobId = String(formData.get("job_id") || "");
  const organizationId = String(formData.get("organization_id") || "");
  const firstName = String(formData.get("first_name") || "").trim();
  const lastName = String(formData.get("last_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const source = String(formData.get("source") || "").trim();

  if (!jobId || !organizationId || !firstName) {
    throw new Error("Nombre del candidato requerido.");
  }

  const db = createAdminClient();
  const { data: person, error: personError } = await db.from("people").insert({
    organization_id: organizationId,
    first_name: firstName,
    last_name: lastName || null,
    email: email || null,
    phone: phone || null,
    active: true,
  }).select("id").single();

  if (personError || !person) throw new Error(personError?.message || "No fue posible crear candidato.");

  const { error } = await db.from("recruitment_job_candidates").insert({
    recruitment_job_id: jobId,
    person_id: person.id,
    stage: "sourced",
    source: source || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/protected/operacion/reclutamiento/${jobId}`);
}

async function updateCandidateStage(formData: FormData) {
  "use server";
  await requireUser();
  const id = String(formData.get("candidate_id") || "");
  const jobId = String(formData.get("job_id") || "");
  const stage = String(formData.get("stage") || "");
  if (!id || !jobId || !Object.keys(candidateStageLabels).includes(stage)) throw new Error("Etapa inválida.");

  const db = createAdminClient();
  const { error } = await db.from("recruitment_job_candidates").update({
    stage,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/protected/operacion/reclutamiento/${jobId}`);
}

export default async function RecruitmentPage({params}:{params:Promise<{id:string}>}) {
  await requireUser();
  const {id} = await params;
  const db = createAdminClient();

  const {data: job, error} = await db.from("recruitment_jobs")
    .select("id,service_order_id,organization_id,vacancy_name,status,openings,salary_min,salary_max,location,work_mode,requirements,notes")
    .eq("id",id).single();
  if (error || !job) notFound();

  const [orgResult, candidatesResult] = await Promise.all([
    db.from("organizations").select("name").eq("id",job.organization_id).single(),
    db.from("recruitment_job_candidates")
      .select("id,person_id,stage,source,created_at")
      .eq("recruitment_job_id",id)
      .order("created_at",{ascending:false}),
  ]);

  const candidateLinks = candidatesResult.data ?? [];
  const personIds = candidateLinks.map(x=>x.person_id);
  const {data: people} = personIds.length
    ? await db.from("people").select("id,first_name,last_name,email,phone").in("id",personIds)
    : {data:[] as any[]};

  const peopleMap = new Map((people ?? []).map(p=>[p.id,p]));

  const recruitmentCandidateIds = candidateLinks.map((item) => item.id);
  const { data: assessmentProcesses } = recruitmentCandidateIds.length
    ? await db
        .from("assessment_processes")
        .select("id,recruitment_job_candidate_id,name,status,created_at")
        .in("recruitment_job_candidate_id", recruitmentCandidateIds)
        .order("created_at", { ascending: false })
    : { data: [] as any[] };

  const assessmentProcessIds = (assessmentProcesses ?? []).map((item) => item.id);
  const { data: assessmentAssignments } = assessmentProcessIds.length
    ? await db
        .from("assessment_assignments")
        .select("id,process_id,status,template_id,created_at")
        .in("process_id", assessmentProcessIds)
        .order("created_at", { ascending: false })
    : { data: [] as any[] };

  const processesByRecruitmentCandidate = new Map<string, any[]>();
  for (const process of assessmentProcesses ?? []) {
    if (!process.recruitment_job_candidate_id) continue;
    const list =
      processesByRecruitmentCandidate.get(process.recruitment_job_candidate_id) ?? [];
    list.push(process);
    processesByRecruitmentCandidate.set(
      process.recruitment_job_candidate_id,
      list,
    );
  }

  const assignmentsByProcess = new Map<string, any[]>();
  for (const assignment of assessmentAssignments ?? []) {
    const list = assignmentsByProcess.get(assignment.process_id) ?? [];
    list.push(assignment);
    assignmentsByProcess.set(assignment.process_id, list);
  }

  const org = orgResult.data;

  return (
    <div>
      <Link href={`/protected/operacion/${job.service_order_id}`} className="text-sm font-bold text-orange-600">
        ← Volver a la orden
      </Link>

      <div className="mt-4">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
          Reclutamiento · {org?.name ?? "Cliente"}
        </div>
        <h1 className="mt-2 text-3xl font-black text-neutral-900">{job.vacancy_name}</h1>
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="font-black text-neutral-900">Datos de la vacante</h2>
          <form action={updateJob} className="mt-5 grid gap-4">
            <input type="hidden" name="job_id" value={job.id} />
            <Field label="Vacante" name="vacancy_name" defaultValue={job.vacancy_name} />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                Estatus
                <select name="status" defaultValue={job.status} className="rounded-xl border border-neutral-300 px-4 py-3 font-normal">
                  {Object.entries(statusLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <Field label="Vacantes" name="openings" type="number" defaultValue={String(job.openings)} />
              <Field label="Sueldo mínimo" name="salary_min" type="number" defaultValue={job.salary_min ? String(job.salary_min) : ""} />
              <Field label="Sueldo máximo" name="salary_max" type="number" defaultValue={job.salary_max ? String(job.salary_max) : ""} />
              <Field label="Ubicación" name="location" defaultValue={job.location ?? ""} />
              <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                Modalidad
                <select name="work_mode" defaultValue={job.work_mode ?? ""} className="rounded-xl border border-neutral-300 px-4 py-3 font-normal">
                  <option value="">Sin definir</option>
                  <option value="onsite">Presencial</option>
                  <option value="hybrid">Híbrida</option>
                  <option value="remote">Remota</option>
                </select>
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold text-neutral-700">
              Requisitos
              <textarea name="requirements" rows={5} defaultValue={job.requirements ?? ""} className="rounded-xl border border-neutral-300 px-4 py-3 font-normal" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-neutral-700">
              Notas
              <textarea name="notes" rows={3} defaultValue={job.notes ?? ""} className="rounded-xl border border-neutral-300 px-4 py-3 font-normal" />
            </label>
            <button className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white">Guardar vacante</button>
          </form>
        </section>

        <div className="grid content-start gap-6">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="font-black text-neutral-900">Agregar candidato</h2>
            <form action={addCandidate} className="mt-5 grid gap-4">
              <input type="hidden" name="job_id" value={job.id}/>
              <input type="hidden" name="organization_id" value={job.organization_id}/>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nombre *" name="first_name" />
                <Field label="Apellidos" name="last_name" />
                <Field label="Correo" name="email" type="email" />
                <Field label="Teléfono" name="phone" />
                <Field label="Fuente" name="source" placeholder="LinkedIn, Indeed, referido..." />
              </div>
              <button className="rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold text-white">Agregar candidato</button>
            </form>
          </section>

          <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 px-6 py-5">
              <h2 className="font-black text-neutral-900">Pipeline de candidatos</h2>
            </div>
            {candidateLinks.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-500">Aún no hay candidatos.</div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {candidateLinks.map(link=>{
                  const person = peopleMap.get(link.person_id);
                  const processes =
                    processesByRecruitmentCandidate.get(link.id) ?? [];
                  const assignments = processes.flatMap(
                    (process) => assignmentsByProcess.get(process.id) ?? [],
                  );
                  const completedAssignments = assignments.filter(
                    (assignment) => assignment.status === "completed",
                  );
                  const latestCompleted = completedAssignments[0];

                  const returnTo = `/protected/operacion/reclutamiento/${job.id}`;
                  const assessmentHref =
                    `/protected/nueva-evaluacion?organization=${encodeURIComponent(job.organization_id)}` +
                    `&person=${encodeURIComponent(link.person_id)}` +
                    `&recruitmentCandidate=${encodeURIComponent(link.id)}` +
                    `&process=${encodeURIComponent(`${job.vacancy_name} · Selección`)}` +
                    `&returnTo=${encodeURIComponent(returnTo)}`;

                  return (
                    <div key={link.id} className="p-5">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="font-black text-neutral-900">
                              {person ? [person.first_name,person.last_name].filter(Boolean).join(" ") : "Candidato"}
                            </div>
                            <div className="mt-1 text-xs text-neutral-500">
                              {person?.email || person?.phone || "Sin contacto"}{link.source ? ` · ${link.source}` : ""}
                            </div>
                            {assignments.length > 0 && (
                              <div className="mt-2 text-xs font-semibold text-orange-600">
                                {assignments.length} {assignments.length === 1 ? "evaluación" : "evaluaciones"} · {completedAssignments.length} completadas
                              </div>
                            )}
                          </div>

                          <form action={updateCandidateStage} className="flex gap-2">
                            <input type="hidden" name="candidate_id" value={link.id}/>
                            <input type="hidden" name="job_id" value={job.id}/>
                            <select name="stage" defaultValue={link.stage} className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold">
                              {Object.entries(candidateStageLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                            </select>
                            <button className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-white">Guardar</button>
                          </form>
                        </div>

                        <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
                          <Link
                            href={assessmentHref}
                            className="rounded-lg bg-neutral-800 px-3 py-2 text-xs font-bold text-white hover:bg-neutral-900"
                          >
                            + Asignar evaluación
                          </Link>

                          {latestCompleted && (
                            <Link
                              href={`/protected/evaluaciones/${latestCompleted.id}`}
                              className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100"
                            >
                              Ver último resultado
                            </Link>
                          )}

                          {assignments.length > 0 && !latestCompleted && (
                            <span className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-bold text-neutral-500">
                              Evaluación pendiente
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({label,name,type="text",defaultValue="",placeholder}:{label:string;name:string;type?:string;defaultValue?:string;placeholder?:string}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-neutral-700">
      {label}
      <input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} className="rounded-xl border border-neutral-300 px-4 py-3 font-normal" />
    </label>
  );
}
