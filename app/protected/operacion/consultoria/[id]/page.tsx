import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const statusLabels:Record<string,string> = {
  planning:"Planeación",
  in_progress:"En proceso",
  on_hold:"Pausa",
  completed:"Completado",
  cancelled:"Cancelado",
};

const taskLabels:Record<string,string> = {
  pending:"Pendiente",
  in_progress:"En proceso",
  completed:"Completada",
  blocked:"Bloqueada",
  cancelled:"Cancelada",
};

async function requireUser() {
  const authClient=await createClient();
  const {data,error}=await authClient.auth.getClaims();
  if(error||!data?.claims) redirect("/auth/login");
}

async function updateProject(formData:FormData) {
  "use server";
  await requireUser();
  const id=String(formData.get("project_id")||"");
  const status=String(formData.get("status")||"planning");
  const startDate=String(formData.get("start_date")||"").trim();
  const targetDate=String(formData.get("target_date")||"").trim();
  const objective=String(formData.get("objective")||"").trim();
  const scope=String(formData.get("scope")||"").trim();
  const notes=String(formData.get("notes")||"").trim();

  const db=createAdminClient();
  const {error}=await db.from("consulting_projects").update({
    status,start_date:startDate||null,target_date:targetDate||null,
    objective:objective||null,scope:scope||null,notes:notes||null,
    updated_at:new Date().toISOString(),
  }).eq("id",id);
  if(error) throw new Error(error.message);
  revalidatePath(`/protected/operacion/consultoria/${id}`);
}

async function addTask(formData:FormData) {
  "use server";
  await requireUser();
  const projectId=String(formData.get("project_id")||"");
  const title=String(formData.get("title")||"").trim();
  const dueDate=String(formData.get("due_date")||"").trim();
  const notes=String(formData.get("notes")||"").trim();
  if(!projectId||!title) throw new Error("Tarea requerida.");

  const db=createAdminClient();
  const {error}=await db.from("consulting_tasks").insert({
    consulting_project_id:projectId,
    title,status:"pending",due_date:dueDate||null,notes:notes||null,
  });
  if(error) throw new Error(error.message);
  revalidatePath(`/protected/operacion/consultoria/${projectId}`);
}

async function updateTask(formData:FormData) {
  "use server";
  await requireUser();
  const id=String(formData.get("task_id")||"");
  const projectId=String(formData.get("project_id")||"");
  const status=String(formData.get("status")||"pending");
  const db=createAdminClient();
  const {error}=await db.from("consulting_tasks").update({
    status,updated_at:new Date().toISOString(),
  }).eq("id",id);
  if(error) throw new Error(error.message);
  revalidatePath(`/protected/operacion/consultoria/${projectId}`);
}

export default async function ConsultingPage({params}:{params:Promise<{id:string}>}) {
  await requireUser();
  const {id}=await params;
  const db=createAdminClient();

  const {data:project,error}=await db.from("consulting_projects")
    .select("id,service_order_id,organization_id,title,status,start_date,target_date,objective,scope,notes")
    .eq("id",id).single();
  if(error||!project) notFound();

  const [orgResult,tasksResult]=await Promise.all([
    db.from("organizations").select("name").eq("id",project.organization_id).single(),
    db.from("consulting_tasks").select("id,title,status,due_date,notes,created_at").eq("consulting_project_id",id).order("created_at",{ascending:false}),
  ]);
  const tasks=tasksResult.data??[];

  return (
    <div>
      <Link href={`/protected/operacion/${project.service_order_id}`} className="text-sm font-bold text-orange-600">← Volver a la orden</Link>
      <div className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
        Consultoría RH · {orgResult.data?.name ?? "Cliente"}
      </div>
      <h1 className="mt-2 text-3xl font-black text-neutral-900">{project.title}</h1>

      <div className="mt-7 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="font-black text-neutral-900">Proyecto</h2>
          <form action={updateProject} className="mt-5 grid gap-4">
            <input type="hidden" name="project_id" value={project.id}/>
            <label className="grid gap-2 text-sm font-semibold text-neutral-700">
              Estatus
              <select name="status" defaultValue={project.status} className="rounded-xl border border-neutral-300 px-4 py-3 font-normal">
                {Object.entries(statusLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Inicio" name="start_date" type="date" defaultValue={project.start_date ?? ""}/>
              <Field label="Fecha objetivo" name="target_date" type="date" defaultValue={project.target_date ?? ""}/>
            </div>
            <label className="grid gap-2 text-sm font-semibold text-neutral-700">
              Objetivo
              <textarea name="objective" rows={3} defaultValue={project.objective ?? ""} className="rounded-xl border border-neutral-300 px-4 py-3 font-normal"/>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-neutral-700">
              Alcance
              <textarea name="scope" rows={4} defaultValue={project.scope ?? ""} className="rounded-xl border border-neutral-300 px-4 py-3 font-normal"/>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-neutral-700">
              Notas
              <textarea name="notes" rows={3} defaultValue={project.notes ?? ""} className="rounded-xl border border-neutral-300 px-4 py-3 font-normal"/>
            </label>
            <button className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white">Guardar proyecto</button>
          </form>
        </section>

        <div className="grid content-start gap-6">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="font-black text-neutral-900">Nueva tarea / entregable</h2>
            <form action={addTask} className="mt-5 grid gap-4">
              <input type="hidden" name="project_id" value={project.id}/>
              <Field label="Actividad *" name="title"/>
              <Field label="Fecha compromiso" name="due_date" type="date"/>
              <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                Notas
                <textarea name="notes" rows={3} className="rounded-xl border border-neutral-300 px-4 py-3 font-normal"/>
              </label>
              <button className="rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold text-white">Agregar tarea</button>
            </form>
          </section>

          <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 px-6 py-5">
              <h2 className="font-black text-neutral-900">Plan de trabajo</h2>
            </div>
            {tasks.length===0 ? (
              <div className="p-8 text-center text-sm text-neutral-500">Aún no hay tareas.</div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {tasks.map(task=>(
                  <div key={task.id} className="p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="font-black text-neutral-900">{task.title}</div>
                        <div className="mt-1 text-xs text-neutral-500">{task.due_date || "Sin fecha"}{task.notes ? ` · ${task.notes}` : ""}</div>
                      </div>
                      <form action={updateTask} className="flex gap-2">
                        <input type="hidden" name="task_id" value={task.id}/>
                        <input type="hidden" name="project_id" value={project.id}/>
                        <select name="status" defaultValue={task.status} className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold">
                          {Object.entries(taskLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                        </select>
                        <button className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-white">Guardar</button>
                      </form>
                    </div>
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

function Field({label,name,type="text",defaultValue=""}:{label:string;name:string;type?:string;defaultValue?:string}) {
  return <label className="grid gap-2 text-sm font-semibold text-neutral-700">{label}<input name={name} type={type} defaultValue={defaultValue} className="rounded-xl border border-neutral-300 px-4 py-3 font-normal"/></label>
}
