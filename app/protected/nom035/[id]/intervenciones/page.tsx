import {Suspense} from "react";
import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {ClipboardCheck,CalendarClock,ShieldAlert,History} from "lucide-react";
import {nom035AuthorizedCenter} from "@/lib/nom035/server-access";
import {NOM035_UUID} from "@/lib/nom035/access";
import InterventionEditor,{type ActionRecord,type RiskCampaignOption} from "@/app/protected/nom035/intervenciones/intervention-editor";
export default function Nom035InterventionsPage(props:{params:Promise<{id:string}>}){
 return <Suspense fallback={<p className="p-8">Preparando programa de intervención...</p>}><Content {...props}/></Suspense>;
}
async function Content({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!NOM035_UUID.test(id))notFound();
 let context:Awaited<ReturnType<typeof nom035AuthorizedCenter>>;
 try{context=await nom035AuthorizedCenter(id)}catch{redirect("/protected/nom035")}
 const {db,center}=context;
 const [actionsR,campaignsR,orgR]=await Promise.all([
  db.from("nom035_intervention_actions").select("*").eq("center_id",id)
   .order("created_at",{ascending:false}),
  db.from("nom035_risk_campaigns").select("id,title,guide,status")
   .eq("center_id",id).order("created_at",{ascending:false}),
  db.from("organizations").select("name").eq("id",center.organization_id).maybeSingle()
 ]);
 if(actionsR.error||campaignsR.error||orgR.error)
  return <p className="rounded-xl bg-red-50 p-6 text-red-700">No se pudo cargar el programa de intervención.</p>;
 const actions=(actionsR.data||[]) as ActionRecord[];
 const campaigns=(campaignsR.data||[]) as RiskCampaignOption[];
 const active=actions.filter(a=>["planned","in_progress"].includes(a.status));
 const completed=actions.filter(a=>["completed","verified"].includes(a.status));
 const overdue=active.filter(a=>a.due_on&&a.due_on<new Date().toISOString().slice(0,10));
 const ids=actions.map(a=>a.id);
 const audits=ids.length?
  await db.from("nom035_intervention_audit").select("action_id,prior_status,next_status,prior_progress,next_progress,change_note,changed_at")
   .in("action_id",ids).order("changed_at",{ascending:false}).limit(35):
  {data:[],error:null};
 return <div className="space-y-7">
  <Link className="text-sm font-bold text-orange-700" href={"/protected/nom035/"+id}>← Volver al expediente del centro</Link>
  <header className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
   <p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">
    FactoRH · NOM-035 · Numerales 8.3 a 8.5
   </p>
   <h1 className="mt-3 text-3xl font-black text-neutral-900">Programa de intervención</h1>
   <p className="mt-3 text-sm font-bold text-neutral-700">
    {orgR.data?.name||"Organización"} · {center.name}
   </p>
   <p className="mt-4 max-w-4xl text-sm leading-7 text-neutral-600">
    Documenta las medidas para atender los hallazgos, con área comprendida, tipo de medida,
    fechas, responsable, control de avances y evaluación posterior cuando corresponda.
    La necesidad de un programa depende de los resultados reales de la evaluación.
   </p>
  </header>
  <section className="grid gap-3 sm:grid-cols-3">
   {[
    {n:actions.length,t:"Medidas registradas",Icon:ClipboardCheck},
    {n:completed.length,t:"Ejecutadas o verificadas",Icon:History},
    {n:overdue.length,t:"Pendientes vencidas",Icon:CalendarClock}
   ].map(d=><div key={d.t} className="rounded-2xl border border-neutral-200 bg-white p-5">
    <d.Icon className="h-5 w-5 text-orange-600"/>
    <p className="mt-3 text-3xl font-black text-neutral-900">{d.n}</p>
    <p className="mt-1 text-xs font-bold text-neutral-600">{d.t}</p>
   </div>)}
  </section>
  <InterventionEditor centerId={id} campaigns={campaigns}/>
  <section className="space-y-3">
   <h2 className="text-xl font-black text-neutral-900">Medidas del centro</h2>
   {!actions.length?<p className="rounded-xl bg-white p-6 text-sm text-neutral-600">
    Todavía no hay medidas registradas. Elabora una cuando existan hallazgos que deban atenderse.
   </p>:actions.map(action=><InterventionEditor key={action.id} centerId={id} campaigns={campaigns} existing={action}/>)}
  </section>
  {audits.data?.length?<section className="rounded-2xl border border-neutral-200 bg-white p-6">
   <h2 className="flex items-center gap-2 text-xl font-black text-neutral-900">
    <History className="h-5 w-5 text-orange-600"/>Historial de seguimiento
   </h2>
   <div className="mt-4 divide-y divide-neutral-100">
    {audits.data.map((event,i)=><div key={i} className="grid gap-2 py-3 text-xs text-neutral-700 sm:grid-cols-[155px_1fr]">
     <p className="font-bold">{new Date(event.changed_at).toLocaleDateString("es-MX")}</p>
     <p>{event.prior_status||"Nueva"} → {event.next_status} · {event.next_progress}%.
      {event.change_note?" "+event.change_note:""}</p>
    </div>)}
   </div>
  </section>:null}
  <p className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
   Esta herramienta registra controles organizacionales. Los expedientes clínicos,
   canalizaciones y quejas individuales deben resguardarse en otro sistema con acceso restringido.
  </p>
 </div>;
}
