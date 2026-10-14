import {Suspense} from "react";
import Link from "next/link";
import {redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";

export default function TasksPage(){return <Suspense fallback={<div>Cargando tareas...</div>}><Content/></Suspense>}
async function Content(){
 const user=await getCurrentAppUser();
 if(!user)redirect("/auth/login");
 if(!["super_admin","ese_operator"].includes(user.role))redirect("/protected/estudios");
 const db=createAdminClient();
 const {data:tasks,error}=await db.from("ese_work_tasks")
  .select("id,task_type,status,created_at,ese_cases!inner(case_name,is_demo,study_type)")
  .eq("assignee_id",user.userId).eq("ese_cases.is_demo",true)
  .order("created_at",{ascending:false}).limit(50);
 if(error)return <p className="rounded-xl bg-red-50 p-6 text-sm text-red-700">No se pudieron cargar las tareas.</p>;
 return <div className="space-y-6">
  <Link href="/protected/estudios" className="text-sm font-semibold text-neutral-500 hover:text-orange-700">← Estudios e Investigaciones</Link>
  <header className="rounded-3xl border border-neutral-200 bg-white p-7">
   <p className="text-xs font-extrabold uppercase tracking-wider text-orange-600">FactoRH · Portal operativo</p>
   <h1 className="mt-2 text-3xl font-black">Mis tareas de estudios</h1>
   <p className="mt-3 text-sm leading-7 text-neutral-600">Visitas y referencias asignadas únicamente a tu usuario. Por ahora esta sección trabaja solo con expedientes de prueba ficticios.</p>
  </header>
  {!(tasks||[]).length?<p className="rounded-2xl bg-white p-6 text-sm text-neutral-600">Todavía no tienes tareas asignadas.</p>:
   <div className="space-y-3">{(tasks||[]).map(t=><article key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-5">
    <div><p className="font-bold text-neutral-900">{t.task_type==="visita"?"Visita / aplicación":"Referencias laborales"}</p>
     <p className="mt-1 text-xs text-neutral-600">{t.status.replaceAll("_"," ")} · Caso de prueba</p>
    </div>
    <Link href={`/protected/estudios/tareas/${t.id}`} className="text-sm font-bold text-orange-700">Abrir tarea →</Link>
   </article>)}</div>}
 </div>;
}
