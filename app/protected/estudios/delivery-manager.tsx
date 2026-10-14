"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
type Attachment={id:string;kind:string;title:string;client_deliverable:boolean;created_at:string};
export default function DeliveryManager({caseId,files,status}:{caseId:string;files:Attachment[];status:string}){
 const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[title,setTitle]=useState(""),[kind,setKind]=useState("complement"),[file,setFile]=useState<File|null>(null);
 async function upload(e:React.FormEvent){
 e.preventDefault();if(!file)return;setBusy(true);setMessage("");
 try{const fd=new FormData();fd.set("file",file);fd.set("title",title);fd.set("kind",kind);
 const res=await fetch(`/api/estudios/${caseId}/entregables`,{method:"POST",body:fd});
 const data=await res.json();if(!res.ok)throw Error(data.error||"Error al subir");
 setMessage("PDF guardado de forma privada. Pendiente de aprobación.");setFile(null);setTitle("");router.refresh();
 }catch(e){setMessage(e instanceof Error?e.message:"Error")}finally{setBusy(false)}
 }
 async function action(action:"release"|"revoke"|"review"){
 setBusy(true);setMessage("");
 try{const res=await fetch(`/api/estudios/${caseId}/liberar`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action})});
 const data=await res.json();if(!res.ok)throw Error(data.error||"No fue posible");
 setMessage(action==="release"?"Expediente liberado para el cliente.":action==="revoke"?"Entrega revocada.":"Expediente enviado a revisión.");
 router.refresh();
 }catch(e){setMessage(e instanceof Error?e.message:"Error")}finally{setBusy(false)}
 }
 return <section className="space-y-5 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
 <div><h2 className="text-xl font-black">Control de entrega y complementos</h2><p className="mt-2 text-sm leading-7 text-neutral-600">Carga un PDF principal y los PDF complementarios que quieras entregar. Ninguno será visible al cliente hasta que apruebes la entrega. Para corregir una entrega publicada, primero revócala.</p></div>
 {status!=="released"&&<form onSubmit={upload} className="space-y-3 rounded-xl bg-neutral-50 p-5">
 <label className="block text-xs font-semibold">Tipo
 <select className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3" value={kind} onChange={e=>setKind(e.target.value)}>
 <option value="complement">Reporte complementario</option><option value="main_report">Informe principal</option></select></label>
 <label className="block text-xs font-semibold">Título del archivo<input required maxLength={160} minLength={2} value={title} onChange={e=>setTitle(e.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3"/></label>
 <label className="block text-xs font-semibold">Archivo PDF (máximo 10 MB)<input required type="file" accept=".pdf,application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)} className="mt-2 block w-full text-sm"/></label>
 <button disabled={busy||!file} className="rounded-xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">Guardar PDF privado</button>
 </form>}
 <div><p className="text-sm font-black">Documentos preparados</p>{files.length===0?<p className="mt-3 text-sm text-neutral-500">Todavía no has cargado ningún PDF.</p>:<div className="mt-3 space-y-3">{files.map(f=><div key={f.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 p-4">
 <div><p className="text-sm font-bold">{f.title}</p><p className="mt-1 text-xs text-neutral-500">{f.kind==="main_report"?"Informe principal":"Complemento"} · {f.client_deliverable?"Incluido en la entrega":"Sólo revisión interna"}</p></div>
 <div className="flex gap-3"><a className="text-sm font-bold text-orange-700" href={`/api/estudios/${caseId}/descargar?archivo=${encodeURIComponent(f.id)}`} target="_blank" rel="noreferrer">Revisar PDF</a>
 {status!=="released"&&<button disabled={busy} type="button" onClick={async()=>{setBusy(true);try{const r=await fetch(`/api/estudios/${caseId}/entregables`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({file_id:f.id,client_deliverable:!f.client_deliverable})});const d=await r.json();if(!r.ok)throw Error(d.error||"Error");router.refresh()}catch(e){setMessage(e instanceof Error?e.message:"Error")}finally{setBusy(false)}}} className="text-sm font-bold text-neutral-700">{f.client_deliverable?"Excluir":"Incluir al cliente"}</button>}</div>
 </div>)}</div>}</div>
 {message&&<p role="status" className="text-sm text-neutral-700">{message}</p>}
 <div className="flex flex-wrap gap-3 border-t border-neutral-200 pt-5">
 {status!=="released"?<><button type="button" disabled={busy} onClick={()=>action("review")} className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-bold">Enviar a revisión</button><button type="button" disabled={busy||!files.some(f=>f.kind==="main_report"&&f.client_deliverable)} onClick={()=>action("release")} className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">Aprobar y liberar entrega</button></>:
 <button type="button" disabled={busy} onClick={()=>action("revoke")} className="rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold text-white">Revocar para correcciones</button>}
 </div></section>;
}
