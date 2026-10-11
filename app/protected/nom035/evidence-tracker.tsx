"use client";
import {useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {CheckCircle2,ClipboardCheck,FileText,LockKeyhole} from "lucide-react";
import {updateNom035Evidence} from "./actions";
import type {Nom035Progress,Nom035Requirement} from "@/lib/nom035/rules";
const statusLabels={
 pending:"Pendiente de documentar",
 in_progress:"En elaboración",
 documented:"Documentado (sin verificación externa)"
};
type Status=keyof typeof statusLabels;
export default function Nom035EvidenceTracker({centerId,requirements,progress}:{
 centerId:string;requirements:Nom035Requirement[];progress:Nom035Progress[]
}){
 const stored=new Map(progress.map(x=>[x.requirement_key,x]));
 const documented=requirements.filter(r=>stored.get(r.key)?.status==="documented").length;
 return <section className="space-y-5">
  <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">Expediente documental · Fase 1</p>
     <h2 className="mt-2 text-xl font-black text-neutral-800">Obligaciones y seguimiento</h2></div>
    <span className="rounded-xl bg-neutral-100 px-4 py-3 text-sm font-black text-neutral-700">
     {documented} de {requirements.length} referencias registradas
    </span>
   </div>
   <p className="mt-3 text-sm leading-7 text-neutral-600">Marca el avance de cada obligación y documenta dónde se conserva la evidencia. Esta etapa registra referencias, no archivos clínicos, nombres de colaboradores ni declaraciones de cumplimiento verificadas por la autoridad.</p>
  </div>
  <div className="space-y-4">
   {requirements.map(r=><EvidenceRow key={r.key} centerId={centerId}
    requirement={r} saved={stored.get(r.key)||null}/>)}
  </div>
 </section>;
}
function EvidenceRow({centerId,requirement,saved}:{
 centerId:string;requirement:Nom035Requirement;saved:Nom035Progress|null
}){
 const router=useRouter();
 const [status,setStatus]=useState<Status>(saved?.status||"pending");
 const [reference,setReference]=useState(saved?.proof_reference||"");
 const [notes,setNotes]=useState(saved?.notes||"");
 const [busy,start]=useTransition();
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 function save(form:FormData){
  setMessage("");setError("");
  start(async()=>{
   try{await updateNom035Evidence(form);setMessage("Referencia actualizada.");router.refresh();}
   catch(e){setError(e instanceof Error?e.message:"No se guardó el seguimiento.");}
  });
 }
 return <article className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div className="max-w-3xl">
    <p className="text-xs font-black uppercase tracking-wide text-orange-600">Numerales {requirement.norm}</p>
    <h3 className="mt-2 text-lg font-black text-neutral-800">{requirement.label}</h3>
    <p className="mt-2 text-sm leading-6 text-neutral-600">{requirement.description}</p>
   </div>
   <span className={"inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold "+
    (saved?.status==="documented"?"bg-emerald-50 text-emerald-700":saved?.status==="in_progress"?"bg-blue-50 text-blue-700":"bg-neutral-100 text-neutral-600")}>
    {saved?.status==="documented"?<CheckCircle2 className="h-4 w-4"/>:
     <ClipboardCheck className="h-4 w-4"/>}
    {saved?.status==="documented"?"Registrada":saved?.status==="in_progress"?"En elaboración":"Pendiente"}
   </span>
  </div>
  {requirement.sensitive&&<div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-900">
   <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0"/>
   <p>No adjuntes aquí nombres de trabajadores, diagnósticos, datos médicos ni detalles de un evento. La gestión individual requerirá un expediente separado y con acceso clínico restringido.</p>
  </div>}
  {requirement.conditional&&<p className="mt-3 text-xs font-bold text-neutral-500">
   La necesidad de medidas de control específicas dependerá de los resultados y circunstancias aplicables.
  </p>}
  <form action={save} className="mt-5 grid gap-3 rounded-2xl bg-neutral-50 p-4 md:grid-cols-2">
   <input type="hidden" name="center_id" value={centerId}/>
   <input type="hidden" name="requirement_key" value={requirement.key}/>
   <label className="text-xs font-bold text-neutral-600">Estado de documentación
    <select name="status" value={status} onChange={e=>setStatus(e.target.value as Status)}
     className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm text-neutral-800">
     {Object.entries(statusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
    </select>
   </label>
   <label className="text-xs font-bold text-neutral-600">Referencia de evidencia {status==="documented"?"(obligatoria)":""}
    <input name="proof_reference" value={reference} onChange={e=>setReference(e.target.value)}
     maxLength={350} placeholder="Ej. Política RH-035 versión 2, carpeta interna / acta 2026-10"
     className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm text-neutral-800"/>
   </label>
   <label className="text-xs font-bold text-neutral-600 md:col-span-2">Observaciones administrativas (sin datos personales)
    <textarea name="notes" rows={2} maxLength={700} value={notes}
     onChange={e=>setNotes(e.target.value)}
     className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm text-neutral-800"
     placeholder="Ej. Pendiente de aprobación por Dirección / fecha de revisión"/>
   </label>
   <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
    <div>
     {error&&<p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
     {message&&<p role="status" className="text-sm font-semibold text-emerald-700">{message}</p>}
    </div>
    <button type="submit" disabled={busy||(status==="documented"&&!reference.trim())}
     className="inline-flex items-center gap-2 rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">
     <FileText className="h-4 w-4"/>{busy?"Guardando...":"Guardar seguimiento"}
    </button>
   </div>
  </form>
 </article>;
}
