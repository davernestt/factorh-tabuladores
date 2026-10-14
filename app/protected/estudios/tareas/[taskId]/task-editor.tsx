"use client";
import {useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {ESE_REFERENCE_GROUPS,ESE_VISIT_GROUPS,type EseField} from "@/lib/ese/master-schema";

type Task={id:string;task_type:string;status:string;payload:Record<string,string>;review_notes:string|null};
export default function TaskEditor({task,admin}:{task:Task;admin:boolean}){
 const router=useRouter();
 const groups=task.task_type==="visita"?ESE_VISIT_GROUPS:ESE_REFERENCE_GROUPS;
 const [values,setValues]=useState<Record<string,string>>(task.payload||{});
 const [section,setSection]=useState(0);
 const [review,setReview]=useState(task.review_notes||"");
 const [saving,setSaving]=useState(false),[notice,setNotice]=useState("");
 const locked=task.status==="en_revision"||task.status==="aprobado";
 const set=(key:string,value:string)=>{setValues(prev=>({...prev,[key]:value}));setNotice("");};
 const progress=useMemo(()=>{
  return groups.map(g=>({id:g.id,count:g.fields.filter(f=>String(values[f.key]||"").trim()).length,total:g.fields.length}));
 },[groups,values]);
 const hasContent=progress.filter(p=>p.count>0).length;
 const group=groups[section];
 const input="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-3 text-sm focus:border-orange-500 focus:outline-none disabled:bg-neutral-100";

 async function send(action:"save"|"submit"|"approve"|"request_changes"){
  setNotice("");setSaving(true);
  try{
   const res=await fetch(`/api/estudios/piloto/tareas/${task.id}`,{
    method:"PATCH",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action,payload:values,review_notes:review})
   });
   const data=await res.json();
   if(!res.ok)throw Error(data.error||"No fue posible guardar la información.");
   setNotice(action==="save"?"Borrador guardado en el expediente.":action==="submit"?"La captura se envió a FactoRH para revisión.":
    action==="approve"?"Tarea validada por FactoRH.":"Se devolvió la captura para corregir.");
   router.refresh();
  }catch(e){setNotice(e instanceof Error?e.message:"Error inesperado");}
  finally{setSaving(false)}
 }
 function fieldControl(field:EseField){
  const val=values[field.key]||"";
  const sensitive=/^id\.(?:curp|rfc|nss|phone)|^labor\.[01]\.contact$|^personal\.[01]\.phone$|^neighbor\.phone$/.test(field.key);
  // En el piloto no se guardan identificadores reales ni teléfonos de personas.
  const disabled=locked||sensitive;
  const label=sensitive?field.label+" · Próximamente (acceso protegido)":field.label;
  return <label key={field.key} className={"block text-xs font-semibold text-neutral-700 "+(field.kind==="textarea"?"md:col-span-2":"")}>
    <span className="block">{label}</span>
    {field.kind==="select"?
      <select disabled={disabled} value={val} onChange={e=>set(field.key,e.target.value)} className={input}>
       {(field.options||[]).map(option=><option key={option} value={option}>{option||"Seleccionar / no registrado"}</option>)}
      </select>:
     field.kind==="textarea"?
      <textarea disabled={disabled} value={val} onChange={e=>set(field.key,e.target.value)} maxLength={field.max||1600}
        rows={4} className={input} placeholder="Describir solo hechos observables o información declarada y verificable."/>:
      <input disabled={disabled} value={val} onChange={e=>set(field.key,e.target.value)}
       type={field.kind==="date"?"date":field.kind==="money"||field.kind==="number"?"number":"text"}
       min={field.kind==="money"||field.kind==="number"?"0":undefined}
       step={field.kind==="money"?"0.01":undefined} maxLength={field.kind==="date"?undefined:field.max||180}
       className={input} placeholder={sensitive?"Bloqueado para datos reales en piloto":field.kind==="money"?"Monto mensual":field.kind==="number"?"Número":"Captura de ejemplo"}/>
    }
   </label>;
 }
 return <section className="space-y-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
   <header>
    <p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">FactoRH · Formato maestro de 13 páginas</p>
    <h2 className="mt-2 text-2xl font-black text-neutral-900">
      {task.task_type==="visita"?"Captura del aplicador":"Captura del investigador de referencias"}
    </h2>
    <p className="mt-3 text-sm leading-7 text-neutral-600">Las secciones siguen el mismo orden y denominaciones del documento FactoRH ESE.docx. Los espacios vacíos del formato se llenarán desde estos campos, sin duplicar información entre colaboradores.</p>
   </header>
   <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-xs leading-6 text-orange-900">
    <strong>Solo piloto ficticio.</strong> La captura y los borradores sí se guardan, pero no ingreses nombres verdaderos, CURP, teléfonos, domicilios ni información financiera de personas. Los campos de identificadores y teléfonos están deshabilitados hasta completar la validación jurídica y los controles de acceso.
   </div>
   <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-neutral-50 p-4">
    <div><p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Apartados con datos</p>
     <p className="mt-1 text-xl font-black text-neutral-900">{hasContent} de {groups.length}</p></div>
    <span className="text-xs font-semibold text-neutral-500">Estado: {task.status.replaceAll("_"," ")}</span>
   </div>
   <div className="grid gap-5 lg:grid-cols-[245px_minmax(0,1fr)]">
    <nav aria-label="Apartados de estudio" className="flex max-h-[640px] flex-col gap-2 overflow-auto rounded-2xl bg-neutral-50 p-2">
     {groups.map((item,i)=><button key={item.id} type="button" onClick={()=>{setSection(i);setNotice("")}}
      className={"rounded-xl border px-3 py-3 text-left text-xs transition-colors "+
       (i===section?"border-orange-400 bg-orange-50 text-orange-800":"border-transparent bg-white text-neutral-700 hover:border-neutral-200")}>
      <span className="block font-bold">{item.title}</span>
      <span className="mt-1 block text-neutral-500">Página {item.page} · {progress[i].count}/{progress[i].total} campos</span>
     </button>)}
    </nav>
    <div className="min-w-0 rounded-2xl border border-neutral-200 p-4 sm:p-6">
     <p className="text-xs font-black uppercase tracking-widest text-orange-600">Página {group.page} del informe maestro</p>
     <h3 className="mt-2 text-xl font-black text-neutral-900">{group.title}</h3>
     {group.id==="evidencias"&&<p className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-xs leading-6 text-orange-950">
      La plantilla incluye seis espacios fotográficos, croquis y mapa. Por ahora únicamente documentamos las descripciones; subir fotografías y fijar coordenadas se incorporará con consentimiento verificable y almacenamiento protegido.
     </p>}
     {group.id==="economia"&&<p className="mt-3 text-xs text-neutral-500">
      Todos los ingresos y gastos se capturan en periodicidad mensual; al generar el informe se calcularán totales y balance a partir de estas cifras.
     </p>}
     {group.id==="documentos"&&<p className="mt-3 text-xs text-neutral-500">
      Marca solamente documentos realmente cotejados. No captures folios completos innecesarios.
     </p>}
     <div className="mt-5 grid gap-4 md:grid-cols-2">
      {group.fields.map(fieldControl)}
     </div>
     <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-5">
      <button type="button" disabled={section===0} onClick={()=>setSection(i=>Math.max(0,i-1))}
        className="rounded-xl border border-neutral-300 px-4 py-2.5 text-xs font-bold text-neutral-700 disabled:opacity-40">← Anterior</button>
      <span className="text-xs font-semibold text-neutral-500">Apartado {section+1} de {groups.length}</span>
      <button type="button" disabled={section===groups.length-1} onClick={()=>setSection(i=>Math.min(groups.length-1,i+1))}
        className="rounded-xl border border-neutral-300 px-4 py-2.5 text-xs font-bold text-neutral-700 disabled:opacity-40">Siguiente →</button>
     </div>
    </div>
   </div>
   {task.review_notes&&<div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
    <strong>Observaciones de FactoRH:</strong> {task.review_notes}
   </div>}
   {notice&&<p role="status" className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-800">{notice}</p>}
   {!locked&&<div className="flex flex-wrap gap-3">
    <button type="button" disabled={saving} onClick={()=>send("save")}
      className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-bold disabled:opacity-50">Guardar borrador</button>
    <button type="button" disabled={saving} onClick={()=>send("submit")}
      className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Enviar a revisión FactoRH →</button>
   </div>}
   {admin&&task.status==="en_revision"&&<div className="border-t border-neutral-200 pt-5">
    <h3 className="font-black">Validación del superadministrador</h3>
    <label className="mt-3 block text-sm font-semibold text-neutral-700">Observaciones para devolución
      <textarea rows={3} maxLength={500} value={review} onChange={e=>setReview(e.target.value)} className={input}
       placeholder="Explica objetivamente la información que debe corregirse."/>
    </label>
    <div className="mt-4 flex flex-wrap gap-3">
     <button disabled={saving} onClick={()=>send("request_changes")}
       className="rounded-xl border border-orange-300 px-5 py-3 text-sm font-bold text-orange-700 disabled:opacity-50">Devolver para corrección</button>
     <button disabled={saving} onClick={()=>send("approve")}
       className="rounded-xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Aprobar información</button>
    </div>
   </div>}
   {task.status==="aprobado"&&<p className="text-sm font-bold text-neutral-700">Tarea aprobada. Los datos están bloqueados para el colaborador.</p>}
   <p className="text-xs leading-6 text-neutral-500">La aprobación de un apartado no constituye dictamen final ni libera información al cliente. El resumen ejecutivo, reporte de investigación, dictamen y entrega permanecen bajo control del superadministrador.</p>
 </section>;
}
