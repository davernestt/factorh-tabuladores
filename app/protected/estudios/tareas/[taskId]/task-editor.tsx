"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
type Task={id:string;task_type:string;status:string;payload:Record<string,string>;review_notes:string|null};
export default function TaskEditor({task,admin}:{task:Task;admin:boolean}){
 const router=useRouter();
 const [values,setValues]=useState<Record<string,string>>(task.payload||{});
 const [review,setReview]=useState(task.review_notes||"");
 const [saving,setSaving]=useState(false),[notice,setNotice]=useState("");
 const locked=task.status==="en_revision"||task.status==="aprobado";
 const set=(key:string,value:string)=>setValues(prev=>({...prev,[key]:value}));
 async function send(action:"save"|"submit"|"approve"|"request_changes"){
  setNotice("");setSaving(true);
  try{
   const res=await fetch(`/api/estudios/piloto/tareas/${task.id}`,{
    method:"PATCH",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action,payload:values,review_notes:review})
   });
   const json=await res.json();if(!res.ok)throw Error(json.error||"No fue posible guardar.");
   setNotice(action==="submit"?"Enviado a revisión FactoRH.":action==="save"?"Borrador guardado.":action==="approve"?"Tarea aprobada.":"Devuelto para corrección.");
   router.refresh();
  }catch(e){setNotice(e instanceof Error?e.message:"Error inesperado");}
  finally{setSaving(false)}
 }
 const field="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm disabled:bg-neutral-100";
 return <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <p className="text-xs font-extrabold uppercase tracking-wider text-orange-600">
    {task.task_type==="visita"?"Captura de aplicación / visita":"Captura de referencias laborales"}
   </p>
   <h2 className="mt-2 text-xl font-black">Mis datos y observaciones</h2>
   <p className="mt-2 text-sm leading-7 text-neutral-600">Captura de prueba exclusivamente con información inventada. No agregues CURP, teléfonos reales ni datos de personas.</p>
   <div className="mt-5 grid gap-4 md:grid-cols-2">
    {task.task_type==="visita"?<>
      <label className="text-sm font-semibold text-neutral-700">Tipo de vivienda declarado (ficticio)
       <select disabled={locked} value={values.housing||""} onChange={e=>set("housing",e.target.value)} className={field}>
        <option value="">Selecciona</option><option value="propia">Propia</option>
        <option value="rentada">Rentada</option><option value="familiar">Familiar</option><option value="otra">Otra</option>
       </select>
      </label>
      <label className="text-sm font-semibold text-neutral-700">Resultado de la visita
       <select disabled={locked} value={values.visit_result||""} onChange={e=>set("visit_result",e.target.value)} className={field}>
        <option value="">Selecciona</option><option value="pendiente">Pendiente</option>
        <option value="realizada">Realizada</option><option value="no_realizada">No realizada</option>
       </select>
      </label>
     </>:<>
      <label className="text-sm font-semibold text-neutral-700">Empresa de ejemplo
       <input disabled={locked} maxLength={160} value={values.company||""} onChange={e=>set("company",e.target.value)}
        placeholder="Empresa Simulada S.A." className={field}/>
      </label>
      <label className="text-sm font-semibold text-neutral-700">Cargo de quien dio la referencia
       <input disabled={locked} maxLength={120} value={values.source_role||""} onChange={e=>set("source_role",e.target.value)}
        placeholder="Coordinación de RH" className={field}/>
      </label>
      <label className="text-sm font-semibold text-neutral-700 md:col-span-2">Resultado
       <select disabled={locked} value={values.outcome||""} onChange={e=>set("outcome",e.target.value)} className={field}>
        <option value="">Selecciona</option><option value="corroborada">Información corroborada</option>
        <option value="sin_contacto">Sin contacto</option><option value="aclaracion">Requiere aclaración</option>
       </select>
      </label>
     </>}
    <label className="text-sm font-semibold text-neutral-700 md:col-span-2">
      Observaciones objetivas de ejemplo
      <textarea disabled={locked} rows={5} maxLength={1600} value={values.observations||""}
       onChange={e=>set("observations",e.target.value)} placeholder="Ejemplo ficticio: se corroboró el cargo y periodo informado."
       className={field}/>
    </label>
   </div>
   {task.review_notes&&<div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
    <strong>Observaciones de FactoRH:</strong> {task.review_notes}
   </div>}
   {notice&&<p role="status" className="mt-4 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-700">{notice}</p>}
   {!locked&&<div className="mt-5 flex flex-wrap gap-3">
    <button disabled={saving} onClick={()=>send("save")} className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-bold disabled:opacity-50">Guardar borrador</button>
    <button disabled={saving} onClick={()=>send("submit")} className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Enviar a revisión →</button>
   </div>}
   {admin&&task.status==="en_revision"&&<div className="mt-6 border-t border-neutral-200 pt-5">
      <h3 className="font-black">Validación del superadministrador</h3>
      <label className="mt-3 block text-sm font-semibold text-neutral-700">Observaciones de revisión
        <textarea rows={3} maxLength={500} value={review} onChange={e=>setReview(e.target.value)} className={field}
         placeholder="Indica qué debe aclararse antes de aprobar."/>
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
       <button disabled={saving} onClick={()=>send("request_changes")}
        className="rounded-xl border border-orange-300 px-5 py-3 text-sm font-bold text-orange-700 disabled:opacity-50">Devolver para corrección</button>
       <button disabled={saving} onClick={()=>send("approve")}
        className="rounded-xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Aprobar tarea</button>
      </div>
   </div>}
   {task.status==="aprobado"&&<p className="mt-4 text-sm font-bold text-neutral-700">Validada por FactoRH. Captura bloqueada.</p>}
   <p className="mt-6 text-xs leading-6 text-neutral-500">Guardar o aprobar una tarea no genera ni libera el reporte para el cliente. Solo superadministración puede realizar la autorización final, en el flujo de entrega correspondiente.</p>
 </section>;
}
