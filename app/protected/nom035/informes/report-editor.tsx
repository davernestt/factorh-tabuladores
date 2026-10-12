"use client";
import {useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {saveNom035TechnicalReport,reviewNom035TechnicalReport} from "@/app/protected/nom035/informes/actions";
import {Save,CheckCircle2} from "lucide-react";
type Draft={
 objective:string;activities:string;methodology_notes:string;
 conclusions:string;recommendations:string;intervention_notes:string;
 responsible_name:string;professional_license:string;validation_status:string;
};
const fields:[
 keyof Draft,string,string,number
][]=[
 ["objective","Objetivo de la evaluación","Indicar la finalidad de la identificación y análisis de riesgos.",2000],
 ["activities","Actividades principales realizadas","Inducción, levantamiento, cuestionarios, tratamiento de datos, análisis.",4000],
 ["methodology_notes","Método aplicado y análisis","Guía usada, población/muestreo, fechas, filtros y reglas.",4000],
 ["conclusions","Conclusiones del responsable","Interpretación de hallazgos y limitaciones de la evaluación.",4500],
 ["recommendations","Recomendaciones para el centro","Medidas preventivas y correctivas de acuerdo con resultados.",4500],
 ["intervention_notes","Acciones de intervención y seguimiento, cuando correspondan","Cómo se integrará el programa y evaluación posterior.",4000]
];
const inp="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm leading-6 text-neutral-800";
export default function Nom035ReportEditor({campaignId,draft,isAdmin,canReview}:{
 campaignId:string;draft:Draft|null;isAdmin:boolean;canReview:boolean
}){
 const router=useRouter();
 const [pending,start]=useTransition();
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const locked=draft?.validation_status==="internal_review"&&!isAdmin;
 function save(form:FormData){
  setMessage("");setError("");
  start(async()=>{
   try{await saveNom035TechnicalReport(form);setMessage("Borrador guardado.");router.refresh();}
   catch(e){setError(e instanceof Error?e.message:"Error al guardar el informe.");}
  });
 }
 function review(){
  setError("");setMessage("");
  const fd=new FormData();fd.set("campaign_id",campaignId);
  start(async()=>{
   try{await reviewNom035TechnicalReport(fd);
    setMessage("Informe marcado como revisado internamente.");router.refresh();
   }catch(e){setError(e instanceof Error?e.message:"No se pudo revisar.");}
  });
 }
 return <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8 print:hidden">
  <div className="flex flex-wrap justify-between gap-3">
   <div>
    <p className="text-xs font-black uppercase tracking-wide text-orange-700">Informe técnico · Numeral 7.7</p>
    <h2 className="mt-2 text-xl font-black text-neutral-900">Redacción y revisión del responsable</h2>
   </div>
   <span className="rounded-xl bg-neutral-100 px-4 py-2 text-xs font-bold text-neutral-700">
    {draft?.validation_status==="internal_review"?"Revisado internamente":"Borrador"}
   </span>
  </div>
  <p className="mt-3 text-sm leading-7 text-neutral-600">
   El sistema rellena automáticamente los resultados agregados. El objetivo, método,
   conclusiones y recomendaciones requieren revisión profesional y no son generados
   como diagnósticos individuales.
  </p>
  <form action={save} className="mt-6 space-y-5">
   <input type="hidden" name="campaign_id" value={campaignId}/>
   {fields.map(([key,title,help,max])=><label key={key} className="block text-sm font-bold text-neutral-700">
    {title}
    <p className="mt-1 text-xs font-normal leading-5 text-neutral-500">{help}</p>
    <textarea name={key} defaultValue={draft?.[key]||""} rows={key==="conclusions"?5:3}
     maxLength={max} disabled={locked} className={inp}/>
   </label>)}
   <div className="grid gap-4 sm:grid-cols-2">
    <label className="text-sm font-bold text-neutral-700">Nombre completo del responsable
     <input name="responsible_name" maxLength={180} disabled={locked}
      className={inp} defaultValue={draft?.responsible_name||""}/>
    </label>
    <label className="text-sm font-bold text-neutral-700">Cédula profesional (en su caso)
     <input name="professional_license" maxLength={80} disabled={locked}
      className={inp} defaultValue={draft?.professional_license||""}/>
    </label>
   </div>
   {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
   {message&&<p role="status" className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-700">{message}</p>}
   <div className="flex flex-wrap gap-3">
    {!locked&&<button type="submit" disabled={pending}
     className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-black text-white disabled:opacity-40">
     <Save className="h-4 w-4"/>{pending?"Guardando...":"Guardar borrador"}
    </button>}
    {isAdmin&&<button type="button" onClick={review}
     disabled={pending||!canReview}
     className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-6 py-3 text-sm font-black text-neutral-800 disabled:opacity-40">
     <CheckCircle2 className="h-4 w-4"/>Registrar revisión interna
    </button>}
   </div>
  </form>
  {!canReview&&<p className="mt-4 text-xs leading-6 text-amber-700">
   El informe no puede marcarse revisado hasta que exista un borrador completo,
   la campaña esté cerrada y se alcance la población objetivo.
  </p>}
 </section>;
}
