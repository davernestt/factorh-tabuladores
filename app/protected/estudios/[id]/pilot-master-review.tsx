"use client";
import {useState} from "react";
type Fields=Record<string,string>;
const outcomes=["","Recomendable","Recomendable con observaciones","No recomendable","No concluyente"];
export default function PilotMasterReview({caseId,initial}:{caseId:string;initial:Fields}){
 const [data,setData]=useState<Fields>(initial||{}),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const set=(key:string,value:string)=>{setData(p=>({...p,[key]:value}));setMessage("");};
 const cls="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm focus:border-orange-500 focus:outline-none";
 async function save(){
  setBusy(true);setMessage("");
  try{
   const response=await fetch(`/api/estudios/piloto/${caseId}/dictamen`,{
    method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)
   });
   const result=await response.json();
   if(!response.ok)throw Error(result.error||"No se pudo guardar.");
   setMessage("Borrador del administrador guardado. No se ha emitido ni autorizado ningún informe.");
  }catch(e){setMessage(e instanceof Error?e.message:"Error inesperado");}
  finally{setBusy(false)}
 }
 return <section className="space-y-5 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
  <header><p className="text-xs font-extrabold uppercase tracking-wider text-orange-600">Formato maestro · Solo superadministración</p>
   <h2 className="mt-2 text-xl font-black">Resumen, investigación y dictamen</h2>
   <p className="mt-3 text-sm leading-7 text-neutral-600">Estos apartados corresponden a las páginas 1, 12 y 13 del archivo original. Se redactan con base en el trabajo revisado del aplicador y el referencista; no los determina un algoritmo ni se publican sin autorización.</p>
  </header>
  <div className="grid gap-4 md:grid-cols-2">
   {([
    ["service.responsible","Responsable del estudio","text"],["service.request_date","Fecha de solicitud","date"],
    ["service.visit_date","Fecha de visita","date"],["service.close_date","Fecha de cierre","date"]
   ] as const).map(([key,label,kind])=><label key={key} className="text-xs font-semibold text-neutral-700">{label}
    <input type={kind} maxLength={180} value={data[key]||""} onChange={e=>set(key,e.target.value)} className={cls}/>
   </label>)}
  </div>
  <label className="block text-xs font-semibold text-neutral-700">Página 1 · Resumen ejecutivo
   <textarea maxLength={2500} rows={5} value={data["executive.summary"]||""}
    onChange={e=>set("executive.summary",e.target.value)} className={cls}
    placeholder="Coincidencias, inconsistencias verificables, pendientes y conclusión del alcance autorizado."/>
  </label>
  <label className="block text-xs font-semibold text-neutral-700">Página 12 · Reporte de investigación
   <textarea maxLength={5000} rows={7} value={data["research.report"]||""}
    onChange={e=>set("research.report",e.target.value)} className={cls}
    placeholder="Integra los hallazgos documentados del aplicador y las referencias aprobadas."/>
  </label>
  <label className="block text-xs font-semibold text-neutral-700">Página 13 · Dictamen final
   <select value={data["verdict.result"]||""} onChange={e=>set("verdict.result",e.target.value)} className={cls}>
    {outcomes.map(option=><option key={option} value={option}>{option||"Pendiente de determinar"}</option>)}
   </select>
  </label>
  <label className="block text-xs font-semibold text-neutral-700">Fundamento del dictamen
   <textarea maxLength={2500} rows={5} value={data["verdict.rationale"]||""}
    onChange={e=>set("verdict.rationale",e.target.value)} className={cls}
    placeholder="Evidencia revisada, aclaraciones y justificación objetiva; no utilizar atributos protegidos."/>
  </label>
  {message&&<p role="status" className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-700">{message}</p>}
  <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
    <p className="text-xs font-extrabold uppercase tracking-wider text-orange-700">Generador de documentos · Solo prueba interna</p>
    <h3 className="mt-2 text-lg font-black text-neutral-900">Descargar borrador automático</h3>
    <p className="mt-2 text-sm leading-7 text-neutral-700">Los documentos incluyen las 13 páginas del formato maestro, las capturas del aplicador y del referencista, los importes mensuales calculados y tu dictamen guardado. La información faltante permanece marcada como pendiente. Antes de exportar, guarda el resumen y las observaciones que hayas modificado.</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <a href={`/api/estudios/piloto/${caseId}/reporte?formato=pdf`}
        className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700">Descargar PDF</a>
      <a href={`/api/estudios/piloto/${caseId}/reporte?formato=docx`}
        className="rounded-xl border border-orange-300 bg-white px-5 py-3 text-sm font-bold text-orange-800 hover:bg-orange-50">Descargar Word editable</a>
    </div>
    <p className="mt-4 text-xs leading-6 text-orange-900">Esta descarga no entrega ni publica archivos a clientes. Los casos piloto son ficticios y las fotografías, croquis y coordenadas reales aún no están conectados.</p>
  </div>
  <div className="flex flex-wrap items-center justify-between gap-3">
   <p className="text-xs text-neutral-500">Fase de prueba: el guardado no genera el PDF o Word ni libera el documento al cliente.</p>
   <button type="button" onClick={save} disabled={busy} className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
    {busy?"Guardando...":"Guardar resumen y dictamen"}
   </button>
  </div>
 </section>;
}
