"use client";
import {useState} from "react";
import {createRiskCampaign} from "@/app/protected/nom035/riesgos/actions";
import {nom035SampleSize} from "@/lib/nom035/official-scoring";
export default function RiskCampaignForm({centerId,workerCount,guide}:{
 centerId:string;workerCount:number;guide:"II"|"III"
}){
 const [mode,setMode]=useState<"census"|"sample">("census");
 const [target,setTarget]=useState(workerCount);
 const min=guide==="III"?nom035SampleSize(workerCount):workerCount;
 function setCoverage(next:"census"|"sample"){
  setMode(next);setTarget(next==="sample"?min:workerCount);
 }
 const input="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm text-neutral-800";
 return <form action={createRiskCampaign} className="space-y-5">
  <input type="hidden" name="center_id" value={centerId}/>
  <label className="block text-sm font-bold text-neutral-700">Nombre del diagnóstico
   <input name="title" className={input} minLength={4} maxLength={150} required
    placeholder={"Aplicación Guía "+guide+" · Octubre 2026"}/>
  </label>
  <div className="grid gap-4 sm:grid-cols-2">
   <label className="text-sm font-bold text-neutral-700">Cobertura
    <select name="coverage_mode" className={input} value={mode}
     onChange={e=>setCoverage(e.target.value as "census"|"sample")}>
     <option value="census">Censo · Todos los trabajadores</option>
     {guide==="III"&&<option value="sample">Muestra representativa · Guía III</option>}
    </select>
   </label>
   <label className="text-sm font-bold text-neutral-700">Participantes objetivo
    <input className={input} type="number" name="eligible_population" min={mode==="sample"?min:workerCount}
     max={workerCount} value={target} readOnly={mode==="census"}
     onChange={e=>setTarget(Number(e.target.value))}/>
   </label>
  </div>
  {guide==="III"&&<p className="rounded-2xl bg-neutral-50 p-4 text-sm leading-7 text-neutral-700">
   Para una plantilla de <strong>{workerCount}</strong> personas, el tamaño mínimo de la muestra de
   la Ecuación 1 de la Guía III es <strong>{min}</strong>.
   No basta con alcanzar el número: la selección debe ser aleatoria y distribuirse
   conforme al porcentaje de hombres y mujeres del centro.
  </p>}
  {mode==="sample"&&<div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
   <label className="block text-sm font-bold text-neutral-800">Referencia de protocolo de muestreo
    <textarea className={input} name="sample_protocol_ref" minLength={20} maxLength={350} rows={3}
     required placeholder="Ej. Acta del muestreo aleatorio NOM035-GDL-2026, registro de estratos por género en el expediente interno"/>
   </label>
   <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-neutral-800">
    <input type="checkbox" name="gender_protocol_confirmed" required className="mt-1.5 accent-orange-600"/>
    Confirmo que la selección se realizó aleatoriamente y se documentó
    la distribución conforme al porcentaje de hombres y mujeres del centro.
    La referencia anterior permite revisar esa evidencia.
   </label>
  </div>}
  <p className="text-xs leading-6 text-neutral-500">
   Se creará un borrador con copia íntegra de la Guía {guide} y sus umbrales oficiales.
   Las respuestas no se mostrarán individualmente y el reporte permanecerá protegido
   hasta cerrar la campaña y alcanzar el mínimo de privacidad de FactoRH.
  </p>
  <button type="submit" disabled={target<min||target>workerCount}
   className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-black text-white disabled:opacity-40">
   Crear campaña en borrador →
  </button>
 </form>;
}
