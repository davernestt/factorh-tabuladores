import {Suspense} from "react";
import Link from "next/link";
import {redirect,notFound} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {hasStaffPermission} from "@/lib/staff-permissions";
import {createAdminClient} from "@/lib/supabase/admin";
import TaskEditor from "./task-editor";

type Props={params:Promise<{taskId:string}>};
export default function Page({params}:Props){
 return <Suspense fallback={<p className="rounded-xl bg-white p-5 text-sm">Cargando tarea...</p>}>
  <Content params={params}/></Suspense>;
}
async function Content({params}:Props){
 const user=await getCurrentAppUser();
 if(!user)redirect("/auth/login");
 if(!["super_admin","ese_operator"].includes(user.role)&&!await hasStaffPermission(user,"studies","view"))redirect("/protected/mi-acceso");
 const {taskId}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(taskId))notFound();
 const db=createAdminClient();
 const {data:task}=await db.from("ese_work_tasks")
  .select("id,case_id,assignee_id,task_type,status,payload,review_notes")
  .eq("id",taskId).maybeSingle();
 if(!task||(user.role!=="super_admin"&&task.assignee_id!==user.userId))notFound();
 const {data:c}=await db.from("ese_cases")
  .select("id,is_demo,case_name,study_type,delivery_status").eq("id",task.case_id).maybeSingle();
 if(!c?.is_demo||c.delivery_status==="released")notFound();
 const payload=task.payload&&typeof task.payload==="object"&&!Array.isArray(task.payload)
  ?task.payload as Record<string,string>:{};
 return <div className="space-y-6">
  <Link href={user.role==="super_admin"?`/protected/estudios/${c.id}`:"/protected/estudios/tareas"}
   className="text-sm font-semibold text-neutral-500 hover:text-orange-700">← Volver</Link>
  <header className="rounded-3xl border border-neutral-200 bg-white p-6">
   <p className="text-xs font-black uppercase tracking-widest text-orange-600">Estudios Socioeconómicos · Prueba interna</p>
   <h1 className="mt-2 text-2xl font-black">{c.case_name}</h1>
   <p className="mt-2 text-sm text-neutral-600">Estudio {c.study_type} · Tarea {task.task_type==="visita"?"Visita domiciliaria":"Referencias laborales"} · {task.status.replaceAll("_"," ")}</p>
  </header>
  <TaskEditor task={{id:task.id,task_type:task.task_type,status:task.status,
    payload,review_notes:task.review_notes}} admin={user.role==="super_admin"}/>
 </div>;
}
