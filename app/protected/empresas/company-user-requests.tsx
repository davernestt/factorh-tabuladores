"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
type Request={id:string;requested_count:number;notes:string;status:string;created_at:string};
export default function CompanyUserRequests({organizationId,requests}:{
 organizationId:string;requests:Request[];
}){
 const router=useRouter(),[busy,setBusy]=useState<string|null>(null),[error,setError]=useState("");
 const open=requests.filter(x=>x.status==="pending"||x.status==="reviewed");
 async function handle(id:string,status:"reviewed"|"fulfilled"|"rejected"){
  setBusy(id);setError("");
  try{
   const response=await fetch(`/api/admin/empresas/${organizationId}/solicitudes-usuarios`,{
    method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({request_id:id,status})
   });
   const data=await response.json();
   if(!response.ok)throw Error(data.error||"No se pudo actualizar.");
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Error de solicitud.");}
  finally{setBusy(null);}
 }
 return <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
  <h2 className="text-xl font-black text-neutral-900">Solicitudes de usuarios</h2>
  <p className="mt-2 text-sm leading-7 text-neutral-600">Las empresas sólo pueden solicitar. Tú decides si autorizas y creas las cuentas desde «Crear usuario». Marcar una solicitud como atendida no crea usuarios automáticamente.</p>
  {error&&<p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  {open.length===0&&<p className="mt-4 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-500">No hay solicitudes pendientes.</p>}
  <div className="mt-4 space-y-3">{open.map(r=><article key={r.id} className="rounded-2xl border border-neutral-200 p-4">
   <div className="flex flex-wrap items-center justify-between gap-2">
    <p className="font-bold text-neutral-900">{r.requested_count} usuario{r.requested_count===1?"":"s"} solicitado{r.requested_count===1?"":"s"}</p>
    <span className="rounded-lg bg-orange-50 px-2 py-1 text-xs font-bold text-orange-700">{r.status==="reviewed"?"En revisión":"Pendiente"}</span>
   </div>
   <p className="mt-2 text-xs text-neutral-500">{new Date(r.created_at).toLocaleDateString("es-MX")}</p>
   {r.notes&&<p className="mt-3 whitespace-pre-line text-sm text-neutral-600">{r.notes}</p>}
   <div className="mt-4 flex flex-wrap gap-2">
    <button type="button" disabled={busy!==null||r.status==="reviewed"} onClick={()=>void handle(r.id,"reviewed")}
      className="rounded-xl border border-neutral-300 px-3 py-2 text-xs font-bold text-neutral-700 disabled:opacity-40">En revisión</button>
    <button type="button" disabled={busy!==null} onClick={()=>void handle(r.id,"fulfilled")}
      className="rounded-xl bg-neutral-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Marcar atendida</button>
    <button type="button" disabled={busy!==null} onClick={()=>void handle(r.id,"rejected")}
      className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-40">Rechazar</button>
   </div>
  </article>)}</div>
 </section>;
}
