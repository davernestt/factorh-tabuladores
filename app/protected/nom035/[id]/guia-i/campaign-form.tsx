"use client";
import {useState} from "react";
import {createGuide1Campaign} from "@/app/protected/nom035/guia-i/actions";

export default function Guide1CampaignCreateForm({centerId,workerCount}:{
 centerId:string;workerCount:number
}){
 const [coverage,setCoverage]=useState<"all"|"previously_identified">("all");
 const [population,setPopulation]=useState(workerCount);
 const [basis,setBasis]=useState("");
 function modeChanged(value:"all"|"previously_identified"){
  setCoverage(value);
  if(value==="all"){setPopulation(workerCount);setBasis("");}
 }
 const field="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-800";
 return <form action={createGuide1Campaign} className="space-y-5">
  <input type="hidden" name="center_id" value={centerId}/>
  <div className="grid gap-4 sm:grid-cols-2">
   <label className="text-sm font-bold text-neutral-700 sm:col-span-2">
    Nombre de la aplicación
    <input className={field} type="text" name="name" minLength={4} maxLength={140}
     required placeholder="Identificación de acontecimientos traumáticos · Octubre"/>
   </label>
   <label className="text-sm font-bold text-neutral-700 sm:col-span-2">
    Población a la que se dirige
    <select className={field} name="coverage_mode" value={coverage}
     onChange={e=>modeChanged(e.target.value as "all"|"previously_identified")}>
     <option value="all">Todos los trabajadores del centro (sin antecedentes de identificación confiables)</option>
     <option value="previously_identified">Solo trabajadores previamente identificados mediante registros confiables</option>
    </select>
   </label>
   <label className="text-sm font-bold text-neutral-700">
    Número de trabajadores a convocar
    <input className={field} type="number" name="eligible_population" value={population}
     onChange={e=>setPopulation(Number(e.target.value))}
     min={1} max={workerCount} required readOnly={coverage==="all"}/>
   </label>
   {coverage==="previously_identified"&&<label className="text-sm font-bold text-neutral-700">
    Fuente documental de identificación previa
    <input className={field} type="text" name="identification_basis" value={basis}
     onChange={e=>setBasis(e.target.value)} minLength={12} maxLength={350}
     required placeholder="Ej. Investigación de accidentes RH-SEG-04"/>
   </label>}
  </div>
  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
   <h3 className="font-black text-amber-950">Canal de atención confidencial</h3>
   <p className="mt-2 text-sm leading-6 text-amber-900">
    Antes de iniciar el tamizaje debe existir un servicio de salud ocupacional o
    instancia autorizada que pueda orientar y canalizar a las personas. Este formulario
    no guarda nombres, diagnósticos ni respuestas individuales; tampoco sustituye el
    registro restringido de derivaciones que el patrón pueda necesitar.
   </p>
   <label className="mt-4 block text-sm font-bold text-neutral-800">
    Servicio o área de atención
    <input className={field} type="text" name="referral_contact" required
     minLength={8} maxLength={200}
     placeholder="Ej. Servicio médico laboral / IMSS / Seguridad y Salud en el Trabajo"/>
   </label>
   <label className="mt-4 block text-sm font-bold text-neutral-800">
    Instrucciones para la persona que necesite valoración
    <textarea className={field} name="referral_instructions" rows={4} required
     minLength={30} maxLength={1400}
     placeholder="Describe a qué área acudir, cómo solicitar atención privada y qué hacer si necesita apoyo inmediato."/>
   </label>
   <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-neutral-800">
    <input type="checkbox" required name="coordinator_confirmed"
     className="mt-1.5 h-4 w-4 shrink-0 accent-orange-600"/>
    Confirmo que existe una persona o servicio autorizado para la orientación y
    canalización; he revisado las instrucciones y no utilizaré este cuestionario
    como diagnóstico clínico ni como constancia automática de cumplimiento.
   </label>
  </div>
  <button type="submit"
   className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-black text-white hover:bg-orange-700">
   Crear Guía I en borrador →
  </button>
 </form>;
}
