import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {Suspense} from "react";
import {createAdminClient} from "@/lib/supabase/admin";
import {getCurrentAppUser} from "@/lib/app-auth";
import {hasNom035Subscription} from "@/lib/nom035/access";
import {canNom035Organization,NOM035_UUID} from "@/lib/nom035/access";
import {nom035EvidenceGuide} from "@/lib/nom035/evidence-guides";
import {nom035Requirements,NOM035_SOURCE} from "@/lib/nom035/rules";
import Nom035PrintButton from "./print-button";
// Session and route params already make this page request-scoped.
type Props={params:Promise<{id:string}>};
export default function CompendiumPage(props:Props){
 return <Suspense fallback={<p className="p-8">Preparando compendio NOM-035...</p>}><Content {...props}/></Suspense>;
}
const dateText=(str:string|null|undefined)=>str?str.slice(0,10).split("-").reverse().join("/"):"Sin fecha";
async function Content({params}:Props){
 const user=await getCurrentAppUser();
 if(!user||!["super_admin","client"].includes(user.role))redirect("/auth/login");
 if(!await hasNom035Subscription(user))redirect("/protected/psicometrias");
 const {id}=await params;
 if(!NOM035_UUID.test(id))notFound();
 const db=createAdminClient();
 const {data:center,error}=await db.from("nom035_work_centers")
  .select("id,name,organization_id,worker_count,municipality,state,main_activity,street_address,active")
  .eq("id",id).eq("active",true).maybeSingle();
 if(error||!center||!canNom035Organization(user,center.organization_id))notFound();
 const [organizationR,progressR,tasksR,docsR]=await Promise.all([
  db.from("organizations").select("name").eq("id",center.organization_id).maybeSingle(),
  db.from("nom035_evidence_progress")
   .select("requirement_key,status,responsible,proof_reference,notes,next_review_on,internal_review,internal_reviewed_at")
   .eq("center_id",id),
  db.from("nom035_evidence_task_progress")
   .select("requirement_key,task_key,status,responsible,target_date,evidence_reference,notes")
   .eq("center_id",id),
  db.from("nom035_evidence_files")
   .select("id,requirement_key,title,original_file_name,created_at")
   .eq("center_id",id).order("created_at",{ascending:false})
 ]);
 if(progressR.error||tasksR.error||docsR.error||organizationR.error)
  return <p className="p-8 text-red-800">No fue posible preparar el expediente. Regresa y vuelve a intentarlo.</p>;
 const requirements=nom035Requirements(center.worker_count);
 const progress=progressR.data||[],tasks=tasksR.data||[],docs=docsR.data||[];
 const status=(code:string)=>progress.find(x=>x.requirement_key===code);
 const completed=requirements.filter(r=>status(r.key)?.status==="documented").length;
 const reviewed=requirements.filter(r=>status(r.key)?.internal_review==="verified").length;
 const now=new Date().toLocaleDateString("es-MX",{timeZone:"America/Mexico_City",day:"2-digit",month:"long",year:"numeric"});
 return <main className="mx-auto max-w-5xl space-y-6 pb-16 text-neutral-800 print:max-w-none print:space-y-4 print:p-0">
  <nav className="flex flex-wrap items-center justify-between gap-4 print:hidden">
   <Link href={"/protected/nom035/"+id} className="text-sm font-bold text-orange-700">
    ← Volver al centro de trabajo
   </Link>
   <Nom035PrintButton/>
  </nav>
  <header className="rounded-3xl border border-neutral-200 bg-white p-8 print:rounded-none print:border-none print:p-0">
   <p className="text-xs font-black uppercase tracking-[.2em] text-orange-700">FactoRH · NOM-035-STPS-2018</p>
   <h1 className="mt-3 text-3xl font-black text-neutral-800">Compendio documental del centro</h1>
   <p className="mt-3 text-base font-bold">{organizationR.data?.name||"Organización"} · {center.name}</p>
   <p className="mt-2 text-sm text-neutral-600">
    {center.municipality}, {center.state} · {center.main_activity} ·
    {" "+center.worker_count} trabajadores
   </p>
   <p className="mt-2 text-xs text-neutral-500">Fecha de corte: {now}</p>
   <div className="mt-6 grid grid-cols-3 gap-3">
    <div className="rounded-xl bg-neutral-50 p-4 print:border print:border-neutral-200">
     <p className="text-2xl font-black">{requirements.length}</p>
     <p className="text-xs text-neutral-600">Requisitos aplicables</p>
    </div>
    <div className="rounded-xl bg-neutral-50 p-4 print:border print:border-neutral-200">
     <p className="text-2xl font-black">{completed}</p>
     <p className="text-xs text-neutral-600">Documentados</p>
    </div>
    <div className="rounded-xl bg-neutral-50 p-4 print:border print:border-neutral-200">
     <p className="text-2xl font-black">{reviewed}</p>
     <p className="text-xs text-neutral-600">Revisados internamente</p>
    </div>
   </div>
   <p className="mt-5 border-t border-neutral-200 pt-4 text-xs leading-6 text-neutral-600">
    Este compendio reúne declaraciones de avance, referencias y ejemplos de evidencia.
    No contiene respuestas individuales, diagnósticos ni certificados de cumplimiento.
    La revisión interna no sustituye la evaluación de conformidad por autoridad o unidad acreditada.
   </p>
  </header>
  {requirements.map(req=>{
   const guide=nom035EvidenceGuide(req.key),record=status(req.key);
   const linked=tasks.filter(t=>t.requirement_key===req.key),files=docs.filter(d=>d.requirement_key===req.key);
   const completedSteps=guide.tasks.filter(t=>linked.some(x=>x.task_key===t.id&&x.status==="completed")).length;
   return <section key={req.key} className="break-inside-avoid rounded-2xl border border-neutral-200 bg-white p-6 print:rounded-none print:p-4"
    style={{breakInside:"avoid-page"}}>
    <div className="flex flex-wrap items-start justify-between gap-2">
     <div className="min-w-0 flex-1">
      <p className="text-xs font-bold text-orange-700">Numerales {req.norm}</p>
      <h2 className="mt-1 text-lg font-black">{req.label}</h2>
     </div>
     <div className="text-right text-xs">
      <p className="font-bold">Estado: {record?.status==="documented"?"Documentado":
       record?.status==="in_progress"?"En proceso":"Pendiente"}</p>
      <p className="mt-1 text-neutral-500">
       {record?.internal_review==="verified"?"Revisado internamente":
        record?.internal_review==="changes_requested"?"Requiere ajustes":"Sin revisión"}
      </p>
     </div>
    </div>
    <p className="mt-3 text-sm leading-6 text-neutral-700">{guide.meaning}</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2 print:grid-cols-2">
     <div>
      <h3 className="text-xs font-black uppercase text-neutral-700">Exigencia normativa</h3>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5">
       {guide.normative.map((text,i)=><li key={i}>{text}</li>)}
      </ul>
     </div>
     <div>
      <h3 className="text-xs font-black uppercase text-neutral-700">Evidencias sugeridas</h3>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5">
       {guide.evidence.map((text,i)=><li key={i}>{text}</li>)}
      </ul>
     </div>
    </div>
    <div className="mt-4 border-t border-neutral-100 pt-3">
     <h3 className="text-xs font-black uppercase text-neutral-700">
      Plan de implementación · {completedSteps} / {guide.tasks.length} actividades realizadas
     </h3>
     <div className="mt-2 space-y-2">
      {guide.tasks.map(t=>{
       const saved=linked.find(x=>x.task_key===t.id);
       return <div key={t.id} className="grid grid-cols-[1fr_75px] gap-3 border-b border-neutral-100 py-1.5 text-xs sm:grid-cols-[1fr_90px_90px] print:grid-cols-[1fr_90px_90px]">
        <div><p className="font-bold">{t.title}</p>
         {(saved?.responsible||saved?.evidence_reference)&&<p className="mt-1 text-neutral-600">
          {saved.responsible?"Responsable: "+saved.responsible+". ":""}
          {saved.evidence_reference?"Referencia: "+saved.evidence_reference:""}
         </p>}</div>
        <p className="text-neutral-600">{saved?.status==="completed"?"Realizada":
          saved?.status==="in_progress"?"En proceso":"Pendiente"}</p>
        <p className="hidden text-neutral-500 sm:block print:block">{dateText(saved?.target_date)}</p>
       </div>;
      })}
     </div>
    </div>
    <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2 print:grid-cols-2">
     <p><strong>Responsable general:</strong> {record?.responsible||"Sin asignar"}</p>
     <p><strong>Próxima revisión:</strong> {dateText(record?.next_review_on)}</p>
     <p><strong>Referencia principal:</strong> {record?.proof_reference||"Sin registrar"}</p>
     <p><strong>Documentos vinculados:</strong> {files.length}</p>
    </div>
    {files.length>0&&<ul className="mt-2 list-disc pl-5 text-xs text-neutral-600">
     {files.map(d=><li key={d.id}>{d.title} · {d.original_file_name} · {dateText(d.created_at)}</li>)}
    </ul>}
    {record?.notes&&<p className="mt-3 text-xs leading-5 text-neutral-600">
     <strong>Observaciones:</strong> {record.notes}</p>}
   </section>;
  })}
  <footer className="rounded-2xl border border-neutral-200 bg-white p-6 text-xs leading-6 text-neutral-600 print:border-t print:p-3">
   <p><strong>Fundamento:</strong> <a href={NOM035_SOURCE} className="text-orange-700 underline">
    NOM-035-STPS-2018, Diario Oficial de la Federación</a>.</p>
   <p>Conforme al numeral 10.4, los registros o evidencias documentales pueden exhibirse
    impresos o por medios electrónicos y deben conservarse al menos un año
    desde su elaboración. Las fechas sugeridas por RH no constituyen nuevas periodicidades normativas.</p>
   <p className="mt-2 font-bold">Uso interno · Información administrativa no clínica.</p>
  </footer>
 </main>;
}