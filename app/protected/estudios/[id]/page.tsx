import {Suspense} from "react";
import Link from "next/link";
import {redirect,notFound} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {hasStaffPermission} from "@/lib/staff-permissions";
import {createAdminClient} from "@/lib/supabase/admin";
import DeliveryManager from "../delivery-manager";
import PilotCollaboration from "./pilot-collaboration";
import PilotMasterReview from "./pilot-master-review";
type Params={params:Promise<{id:string}>};
export default function StudyPage({params}:Params){return <Suspense fallback={<p className="rounded-xl bg-white p-6">Cargando expediente...</p>}><StudyContent params={params}/></Suspense>}
async function StudyContent({params}:Params){
 const u=await getCurrentAppUser();if(!u)redirect("/auth/login");
 if(u.role!=="super_admin"&&u.role!=="client"&&!await hasStaffPermission(u,"studies","view"))redirect("/protected/mi-acceso");
 const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const db=createAdminClient(),{data:c,error}=await db.from("ese_cases").select("id,organization_id,case_name,study_type,status,progress,client_visible,delivery_status,delivery_released_at,is_demo").eq("id",id).maybeSingle();
 if(error||!c)notFound();
 if(u.role==="client"&&(c.organization_id!==u.organizationId||!c.client_visible||c.is_demo))notFound();
 const {data:docs,error:docsError}=await db.from("ese_delivery_files").select("id,kind,title,client_deliverable,created_at").eq("case_id",id).order("created_at");
 if(docsError)return <p className="rounded-xl bg-red-50 p-5 text-red-700">Error al consultar los documentos.</p>;
 const files=u.role==="super_admin"||await hasStaffPermission(u,"studies","reports")?docs||[]:(docs||[]).filter(f=>f.client_deliverable&&c.delivery_status==="released");
 const {data:masterR,error:masterError}=u.role==="super_admin"&&c.is_demo?
   await db.from("ese_case_sections").select("data").eq("case_id",id).eq("section_key","master_review").maybeSingle():
   {data:null,error:null};
 if(masterError)return <p className="rounded-xl bg-red-50 p-5 text-red-700">No se pudo leer el borrador de revisión.</p>;
 const [tasksR,workersR]=u.role==="super_admin"&&c.is_demo?await Promise.all([
  db.from("ese_work_tasks").select("id,task_type,status,assignee_id,review_notes,updated_at").eq("case_id",id).order("created_at"),
  db.from("app_users").select("user_id,display_name,email,role,active").in("role",["super_admin","ese_operator"]).eq("active",true)
 ]):[{data:[],error:null},{data:[],error:null}];
 if(tasksR.error||workersR.error)return <div className="rounded-xl bg-red-50 p-5 text-red-700">No se pudieron leer las tareas piloto.</div>;
 return <div className="space-y-6">
 <Link href="/protected/estudios" className="text-sm font-bold text-neutral-500 hover:text-orange-700">← Estudios e Investigaciones</Link>
 <header className="rounded-3xl border border-neutral-200 bg-white p-7">
 <p className="text-xs font-bold uppercase tracking-[.14em] text-orange-600">FactoRH · Expediente</p>
 <h1 className="mt-3 text-3xl font-black">{c.case_name}</h1>
 <p className="mt-2 text-sm text-neutral-600">Tipo: {c.study_type} · Avance: {c.progress}% · Estado: {c.status}</p>
 </header>
 {u.role==="super_admin"?(c.is_demo?
 <div className="space-y-6">
   <PilotCollaboration caseId={id} tasks={tasksR.data||[]} workers={workersR.data||[]}/>
   <PilotMasterReview caseId={id}
     tasks={(tasksR.data||[]).map(task=>({task_type:task.task_type,status:task.status}))}
     initial={masterR?.data&&typeof masterR.data==="object"&&!Array.isArray(masterR.data)?
       masterR.data as Record<string,string>:{}}/>
  </div>:
 <DeliveryManager caseId={id} files={files} status={c.delivery_status}/>):
 <section className="rounded-3xl border border-neutral-200 bg-white p-7">
 <h2 className="text-xl font-black">Documentos autorizados por FactoRH</h2>
 {c.delivery_status!=="released"?<p className="mt-4 text-sm text-neutral-600">Tu estudio está en revisión. Los documentos aparecerán cuando FactoRH autorice su entrega.</p>:
 files.length===0?<p className="mt-4 text-sm text-neutral-600">Todavía no hay documentos publicados.</p>:<div className="mt-5 space-y-3">{files.map(f=><div key={f.id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-4">
 <div><p className="font-semibold">{f.title}</p><p className="text-xs text-neutral-500">{f.kind==="main_report"?"Informe principal":"Complemento"}</p></div>
 <a href={`/api/estudios/${id}/descargar?archivo=${encodeURIComponent(f.id)}`} className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white">Descargar PDF</a></div>)}</div>}
 </section>}
 </div>
}
