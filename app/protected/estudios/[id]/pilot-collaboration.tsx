"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
type Worker={user_id:string;display_name:string|null;email:string;role:string};
type Task={id:string;task_type:string;status:string;assignee_id:string;review_notes:string|null;updated_at:string};
export default function PilotCollaboration({caseId,workers,tasks}:{
 caseId:string;workers:Worker[];tasks:Task[];
}){
 const router=useRouter();
 const [type,setType]=useState("visita");
 const [assignee,setAssignee]=useState(workers[0]?.user_id||"");
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const roles:Record<string,string>={visita:"Visita y entrevista",referencias:"Referencias laborales"};
 const statuses:Record<string,string>={pendiente:"Pendiente",en_proceso:"En captura",en_revision:"En revisión",correcciones:"Para corregir",aprobado:"Validada"};
 async function create(e:React.FormEvent){e.preventDefault();setError("");setBusy(true);
  try{
   const response=await fetch(`/api/estudios/piloto/${caseId}/tareas`,{method:"POST",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({task_type:type,assignee_id:assignee})});
   const d=await response.json();if(!response.ok)throw Error(d.error||"No fue posible asignar");
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Error");}finally{setBusy(false)}
 }
 return <section className="rounded-3xl border border-orange-200 bg-white p-6 shadow-sm">
  <div className="flex flex-wrap justify-between gap-3">
   <div><p className="text-xs font-bold uppercase tracking-widest text-orange-600">Trabajo colaborativo · Piloto</p>
   <h2 className="mt-2 text-xl font-black">Asignar tareas del estudio</h2>
   <p className="mt-2 text-sm leading-7 text-neutral-600">Visita y referencias pueden capturarse de forma independiente. Cada persona recibe exclusivamente su propia tarea. Como administrador puedes revisarlas todas.</p></div>
   <span className="h-fit rounded-xl bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-700">No visible para clientes</span>
  </div>
  <form onSubmit={create} className="mt-5 grid gap-3 rounded-2xl bg-neutral-50 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
    <label className="text-xs font-bold text-neutral-700">Actividad
      <select value={type} onChange={e=>setType(e.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm">
       <option value="visita">Aplicación y visita</option><option value="referencias">Referencias laborales</option>
      </select>
    </label>
    <label className="text-xs font-bold text-neutral-700">Asignar a
      <select value={assignee} onChange={e=>setAssignee(e.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm">
       {workers.map(w=><option key={w.user_id} value={w.user_id}>{w.display_name||w.email} ({w.role==="super_admin"?"Administrador":"Aplicador"})</option>)}
      </select>
    </label>
    <button type="submit" disabled={busy||!assignee} className="rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?"Asignando...":"Asignar tarea"}</button>
  </form>
  {error&&<p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
  <div className="mt-5 space-y-3">
   {tasks.length===0?<p className="text-sm text-neutral-500">Sin tareas todavía. Asigna la visita y las referencias para comenzar.</p>:
    tasks.map(t=><div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 p-4">
      <div><p className="font-bold text-neutral-900">{roles[t.task_type]||t.task_type}</p>
       <p className="mt-1 text-xs text-neutral-500">{workers.find(w=>w.user_id===t.assignee_id)?.display_name||workers.find(w=>w.user_id===t.assignee_id)?.email||"Operador"} · {statuses[t.status]||t.status}</p>
       {t.review_notes&&<p className="mt-2 text-xs text-orange-700">Observación de revisión: {t.review_notes}</p>}
      </div>
      <a href={`/protected/estudios/tareas/${t.id}`} className="text-sm font-bold text-orange-700 hover:underline">Capturar / revisar →</a>
    </div>)}
  </div>
  <p className="mt-5 text-xs leading-6 text-neutral-500">Durante la fase piloto, puedes asignarte tareas a ti mismo para probar ambos perfiles. Más adelante podrás crear usuarios con rol de aplicador o referencista y asignarles únicamente lo necesario.</p>
 </section>;
}
