"use client";
import {useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {saveNom035Intervention} from "@/app/protected/nom035/intervenciones/actions";
import {ChevronDown,ClipboardCheck,CalendarCheck2,Activity} from "lucide-react";

export type ActionRecord={
 id:string;campaign_id:string|null;source_domain:string;severity:string;
 measure_scope:string;affected_area:string;description:string;responsible:string;
 starts_on:string|null;due_on:string|null;evaluation_on:string|null;
 status:string;progress_percent:number;evidence_reference:string;
 effectiveness_notes:string;updated_at:string;
};
export type RiskCampaignOption={id:string;title:string;guide:string;status:string};
const input="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-3 text-sm text-neutral-800 focus:border-orange-500 focus:outline-none";
const statuses=[
 {id:"planned",name:"Planeada"},{id:"in_progress",name:"En ejecución"},
 {id:"completed",name:"Ejecutada"},{id:"verified",name:"Efectividad verificada"},
 {id:"cancelled",name:"Cancelada"}
];
export default function InterventionEditor({centerId,campaigns,existing}:{
 centerId:string;campaigns:RiskCampaignOption[];existing?:ActionRecord
}){
 const router=useRouter();
 const [pending,start]=useTransition();
 const [status,setStatus]=useState(existing?.status||"planned");
 const [progress,setProgress]=useState(existing?.progress_percent||0);
 const [ref,setRef]=useState(existing?.evidence_reference||"");
 const [notes,setNotes]=useState(existing?.effectiveness_notes||"");
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const [expanded,setExpanded]=useState(!existing);
 function submit(form:FormData){
  setError("");setMessage("");
  start(async()=>{
   try{
    await saveNom035Intervention(form);
    setMessage("Medida guardada en el expediente.");
    setExpanded(false);
    router.refresh();
   }catch(e){setError(e instanceof Error?e.message:"No se pudo guardar la medida.");}
  });
 }
 return <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
  {existing&&<button type="button" onClick={()=>setExpanded(v=>!v)}
   className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-5 text-left">
   <div className="min-w-0 flex-1">
    <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
     {existing.measure_scope==="organizational"?"Organizacional":
      existing.measure_scope==="group"?"Grupal":"Canalización individual (sin datos sensibles)"}
    </p>
    <h3 className="mt-1 text-base font-black leading-6 text-neutral-900">{existing.description}</h3>
    <p className="mt-2 text-xs leading-5 text-neutral-500">
     {existing.affected_area} · {existing.responsible} · {existing.progress_percent}% ·
     {" "+(statuses.find(x=>x.id===existing.status)?.name||existing.status)}
    </p>
   </div>
   <ChevronDown className={"h-5 w-5 text-neutral-500 transition-transform "+(expanded?"rotate-180":"")}/>
  </button>}
  {expanded&&<form action={submit} className={"space-y-5 p-5 sm:p-6 "+(existing?"border-t border-neutral-100":"")}>
   {!existing&&<h3 className="text-lg font-black text-neutral-900">Nueva medida de intervención</h3>}
   <input type="hidden" name="center_id" value={centerId}/>
   {existing&&<input type="hidden" name="id" value={existing.id}/>}
   <div className="grid gap-4 md:grid-cols-2">
    <label className="text-xs font-bold text-neutral-700">Campaña de origen (opcional)
     <select name="campaign_id" className={input} defaultValue={existing?.campaign_id||""}>
      <option value="">Medida general preventiva</option>
      {campaigns.map(c=><option key={c.id} value={c.id}>
       Guía {c.guide} · {c.title}
      </option>)}
     </select>
    </label>
    <label className="text-xs font-bold text-neutral-700">Dominio o factor de riesgo
     <input name="source_domain" maxLength={150} className={input}
      defaultValue={existing?.source_domain||""} placeholder="Ej. Carga de trabajo"/>
    </label>
    <label className="text-xs font-bold text-neutral-700">Prioridad identificada
     <select name="severity" defaultValue={existing?.severity||"pending_review"} className={input}>
      <option value="pending_review">Por revisar</option>
      <option value="medio">Medio</option><option value="alto">Alto</option>
      <option value="muy_alto">Muy alto</option>
     </select>
    </label>
    <label className="text-xs font-bold text-neutral-700">Nivel de intervención
     <select name="measure_scope" defaultValue={existing?.measure_scope||"organizational"} className={input}>
      <option value="organizational">Organizacional · Políticas y procesos</option>
      <option value="group">Grupal · Equipos o departamentos</option>
      <option value="individual_referral">Individual · Solo protocolo, sin datos clínicos</option>
     </select>
    </label>
    <label className="text-xs font-bold text-neutral-700 md:col-span-2">Medida concreta
     <textarea name="description" required minLength={15} maxLength={1200} rows={3}
      className={input} defaultValue={existing?.description||""}
      placeholder="Ej. Revisar distribución de cargas y ajustar turnos para mantener descansos"/>
    </label>
    <label className="text-xs font-bold text-neutral-700">Área o población comprendida
     <input name="affected_area" required minLength={3} maxLength={180} className={input}
      defaultValue={existing?.affected_area||""} placeholder="Ej. Operaciones (sin nombres de personas)"/>
    </label>
    <label className="text-xs font-bold text-neutral-700">Responsable de ejecución
     <input name="responsible" required minLength={3} maxLength={180} className={input}
      defaultValue={existing?.responsible||""} placeholder="Ej. Gerencia de Operaciones"/>
    </label>
    <label className="text-xs font-bold text-neutral-700">Fecha de inicio
     <input name="starts_on" type="date" className={input}
      defaultValue={existing?.starts_on||""}/>
    </label>
    <label className="text-xs font-bold text-neutral-700">Fecha compromiso
     <input name="due_on" type="date" className={input}
      defaultValue={existing?.due_on||""}/>
    </label>
    <label className="text-xs font-bold text-neutral-700">Fecha de evaluación posterior
     <input name="evaluation_on" type="date" className={input}
      defaultValue={existing?.evaluation_on||""}/>
    </label>
    <label className="text-xs font-bold text-neutral-700">Estado
     <select name="status" value={status} onChange={e=>{
      setStatus(e.target.value);
      if(e.target.value==="completed"||e.target.value==="verified")setProgress(100);
     }} className={input}>
      {statuses.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
     </select>
    </label>
    <label className="text-xs font-bold text-neutral-700">Porcentaje de avance
     <input name="progress_percent" type="number" min={0} max={100} required
      value={progress} onChange={e=>setProgress(Number(e.target.value))}
      readOnly={status==="completed"||status==="verified"} className={input}/>
    </label>
    <label className="text-xs font-bold text-neutral-700">Referencia documental
     <input name="evidence_reference" maxLength={350} value={ref}
      onChange={e=>setRef(e.target.value)} className={input}
      placeholder="Ej. MIN-RH-17 / procedimiento actualizado"/>
    </label>
    <label className="text-xs font-bold text-neutral-700 md:col-span-2">
     Evaluación posterior de efectividad (obligatoria para verificación)
     <textarea name="effectiveness_notes" rows={3} maxLength={1400} className={input}
      value={notes} onChange={e=>setNotes(e.target.value)}
      placeholder="Qué se revisó después de implantar la medida y cuáles fueron los hallazgos"/>
    </label>
    {existing&&<label className="text-xs font-bold text-neutral-700 md:col-span-2">
     Motivo o nota de actualización (queda en historial)
     <textarea name="change_note" required minLength={8} maxLength={700}
      className={input} rows={2} placeholder="Describe por qué cambió el estado, fecha o avance"/>
    </label>}
   </div>
   <p className="rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-900">
    Para medidas de atención individual registra solo el procedimiento, áreas responsables y
    evidencia administrativa. No captures nombres, diagnósticos, síntomas o información médica.
    La revisión de efectividad es interna y no certifica el cumplimiento normativo.
   </p>
   {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
   {message&&<p role="status" className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-700">{message}</p>}
   <div className="flex flex-wrap gap-3">
    <button type="submit" disabled={pending||(["completed","verified"].includes(status)&&(!ref||progress!==100))||
      (status==="verified"&&!notes.trim())}
     className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-black text-white disabled:opacity-40">
     {pending?"Guardando...":existing?"Guardar avance":"Crear medida"}
    </button>
    {existing&&<button type="button" onClick={()=>setExpanded(false)}
     className="rounded-xl border border-neutral-200 px-5 py-3 text-sm font-bold text-neutral-600">
     Cancelar
    </button>}
   </div>
  </form>}
 </section>;
}
