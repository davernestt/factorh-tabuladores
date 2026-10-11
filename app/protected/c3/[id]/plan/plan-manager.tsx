"use client";
import {useState,useTransition} from "react";
import {createC3Action,updateC3Action} from "./actions";

type Action={
 id:string;phase_days:number;dimension_code:string|null;title:string;objective:string;
 owner_label:string;metric:string;evidence:string;priority:string;status:string;due_on:string|null
};
const dimLabels:Record<string,string>={
 D01:"Liderazgo inmediato",D02:"Comunicación interna",D03:"Colaboración y relaciones",
 D04:"Condiciones y recursos",D05:"Reconocimiento y valoración",D06:"Valores y congruencia",
 D07:"Ética, respeto y justicia",D08:"Orientación a resultados",D09:"Adaptabilidad y mejora continua",
 D10:"Orgullo y pertenencia",D11:"Motivación y contribución",D12:"Permanencia y futuro",
 D13:"Compensaciones, beneficios y equidad"
};
const stateLabels:Record<string,string>={
 pendiente:"Pendiente",en_proceso:"En proceso",completada:"Completada",cancelada:"Cancelada"
};
const phases=[{value:30,name:"Días 1–30 · Escuchar y contrastar"},{value:60,name:"Días 31–60 · Intervenir"},{value:90,name:"Días 61–90 · Verificar"}];
export default function PlanManager({campaignId,actions,cancelled}:{campaignId:string;actions:Action[];cancelled:boolean}){
 const [creating,setCreating]=useState(false);
 const [error,setError]=useState("");
 const [working,start]=useTransition();
 const done=actions.filter(a=>a.status==="completada").length;
 function send(form:FormData,fn:(data:FormData)=>Promise<void>,after?:()=>void){
  setError("");start(async()=>{try{await fn(form);after?.()}catch(e){setError(e instanceof Error?e.message:"No se pudo guardar. Reintenta.");}});
 }
 return <div className="space-y-6">
  <section className="grid gap-4 md:grid-cols-3">
   {[[String(actions.length),"Actividades registradas"],[String(done),"Completadas"],[actions.length?Math.round(done/actions.length*100)+"%":"—","Avance del plan"]].map(([value,label])=><div key={label} className="rounded-2xl border border-neutral-200 bg-white p-5">
    <div className="text-3xl font-black text-neutral-800">{value}</div><div className="mt-1 text-sm text-neutral-500">{label}</div>
   </div>)}
  </section>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h2 className="text-xl font-black text-neutral-800">Actividades y compromisos</h2>
     <p className="mt-1 text-sm text-neutral-500">Registra responsables por función, indicadores y fechas objetivo. No incluyas nombres ni respuestas de encuestados.</p></div>
    {!cancelled&&<button type="button" onClick={()=>setCreating(x=>!x)} className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700">{creating?"Cerrar formulario":"+ Nueva actividad"}</button>}
   </div>
   {creating&&!cancelled&&<form className="mt-6 grid gap-4 border-t border-neutral-200 pt-6 md:grid-cols-2" action={form=>send(form,createC3Action,()=>setCreating(false))}>
    <input type="hidden" name="campaign_id" value={campaignId}/>
    <label className="text-sm font-semibold text-neutral-700 md:col-span-2">Actividad concreta<input required name="title" minLength={8} maxLength={160} placeholder="Ej. Establecer reunión semanal de coordinación" className="mt-2 w-full rounded-xl border border-neutral-300 p-3"/></label>
    <label className="text-sm font-semibold text-neutral-700 md:col-span-2">Objetivo<textarea name="objective" maxLength={1200} rows={2} placeholder="¿Qué se busca cambiar o mejorar?" className="mt-2 w-full rounded-xl border border-neutral-300 p-3"/></label>
    <label className="text-sm font-semibold text-neutral-700">Etapa<select name="phase_days" className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3">{phases.map(p=><option key={p.value} value={p.value}>{p.name}</option>)}</select></label>
    <label className="text-sm font-semibold text-neutral-700">Dimensión relacionada (opcional)<select name="dimension_code" className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3"><option value="">Acción transversal / no atribuida</option>{Object.entries(dimLabels).map(([code,name])=><option key={code} value={code}>{code} · {name}</option>)}</select></label>
    <label className="text-sm font-semibold text-neutral-700">Responsable o área<input name="owner_label" maxLength={120} placeholder="Ej. RH / Gerencia de Operaciones" className="mt-2 w-full rounded-xl border border-neutral-300 p-3"/></label>
    <label className="text-sm font-semibold text-neutral-700">Indicador o meta<input name="metric" maxLength={400} placeholder="Ej. 100% de reuniones realizadas" className="mt-2 w-full rounded-xl border border-neutral-300 p-3"/></label>
    <label className="text-sm font-semibold text-neutral-700">Prioridad<select name="priority" defaultValue="media" className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3"><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></label>
    <label className="text-sm font-semibold text-neutral-700">Fecha compromiso<input name="due_on" type="date" className="mt-2 w-full rounded-xl border border-neutral-300 p-3"/></label>
    <div className="md:col-span-2"><button type="submit" disabled={working} className="rounded-xl bg-neutral-800 px-6 py-3 font-bold text-white disabled:opacity-40">{working?"Guardando...":"Guardar actividad"}</button></div>
   </form>}
  </section>
  {phases.map(phase=>{
   const rows=actions.filter(a=>a.phase_days===phase.value);
   return <section key={phase.value} className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50 p-5">
     <h3 className="font-black text-neutral-800">{phase.name}</h3><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-neutral-600">{rows.length} acciones</span>
    </header>
    {!rows.length?<p className="p-6 text-sm text-neutral-500">Todavía no hay acciones en esta etapa.</p>:<div className="divide-y divide-neutral-100">
     {rows.map(action=><ActionCard key={action.id} item={action} campaignId={campaignId} disabled={working||cancelled} submit={form=>send(form,updateC3Action)}/>)}
    </div>}
   </section>;
  })}
 </div>;
}
function ActionCard({item,campaignId,disabled,submit}:{item:Action;campaignId:string;disabled:boolean;submit:(form:FormData)=>void}){
 const [status,setStatus]=useState(item.status),[evidence,setEvidence]=useState(item.evidence||"");
 return <div className="p-5">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-wide text-orange-600">{item.dimension_code?item.dimension_code+" · "+dimLabels[item.dimension_code]:"Intervención transversal"}</p>
    <h4 className="mt-2 text-lg font-black text-neutral-800">{item.title}</h4>
    {item.objective&&<p className="mt-2 text-sm leading-6 text-neutral-600">{item.objective}</p>}</div>
   <span className="rounded-xl bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-700">{item.priority.toUpperCase()}</span>
  </div>
  <div className="mt-3 grid gap-2 text-sm text-neutral-600 md:grid-cols-3">
   <p><strong>Responsable:</strong> {item.owner_label||"Sin asignar"}</p>
   <p><strong>Compromiso:</strong> {item.due_on||"Sin fecha"}</p>
   <p><strong>Indicador:</strong> {item.metric||"Por definir"}</p>
  </div>
  <form action={submit} className="mt-4 grid gap-3 rounded-2xl bg-neutral-50 p-4 md:grid-cols-[200px_1fr_auto] md:items-end">
   <input type="hidden" name="campaign_id" value={campaignId}/><input type="hidden" name="id" value={item.id}/>
   <label className="text-xs font-bold text-neutral-600">Estado<select name="status" value={status} disabled={disabled} onChange={e=>setStatus(e.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm">{Object.entries(stateLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
   <label className="text-xs font-bold text-neutral-600">Evidencia y observaciones<textarea name="evidence" value={evidence} onChange={e=>setEvidence(e.target.value)} maxLength={1200} rows={2} disabled={disabled} placeholder="Registra evidencia verificable; evita datos personales." className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm"/></label>
   <button disabled={disabled} type="submit" className="rounded-xl bg-neutral-800 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">Actualizar</button>
  </form>
 </div>;
}
