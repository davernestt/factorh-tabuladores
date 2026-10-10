"use client";
import {useState} from "react";
export default function InviteGenerator({campaignId,disabled}:{campaignId:string;disabled:boolean}){
 const [segment,setSegment]=useState("operativo"),[url,setUrl]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function create(){
  setBusy(true);setError("");setUrl("");
  try{const res=await fetch("/api/c3/invite",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({campaignId,segment})});
  const body=await res.json();if(!res.ok)throw new Error(body.error||"No se generó el enlace");setUrl(body.url)}catch(e){setError(e instanceof Error?e.message:"Error al crear la liga")}finally{setBusy(false)}
 }
 return <section className="rounded-3xl border border-neutral-200 bg-white p-6">
 <h2 className="text-xl font-black text-neutral-800">Ligas individuales para colaboradores</h2>
 <p className="mt-2 text-sm text-neutral-600">Una liga por participante; cada liga se usa una sola vez. No se solicita cuenta ni contraseña administrativa. Comparte el enlace únicamente con la persona correspondiente.</p>
 <div className="mt-4 flex flex-wrap items-center gap-3">
 <select aria-label="Tipo de colaborador" disabled={disabled||busy} value={segment} onChange={e=>setSegment(e.target.value)} className="rounded-xl border border-neutral-300 p-3 text-sm"><option value="operativo">Personal operativo</option><option value="administrativo">Personal administrativo</option></select>
 <button type="button" onClick={create} disabled={disabled||busy} className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?"Generando...":"Generar liga individual"}</button></div>
 {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
 {url&&<div className="mt-4 rounded-xl bg-orange-50 p-4"><div className="text-xs font-bold text-neutral-700">Copia ahora: por seguridad esta liga no volverá a mostrarse</div><div className="mt-2 break-all text-sm text-neutral-700">{url}</div><button type="button" onClick={()=>navigator.clipboard.writeText(url)} className="mt-3 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-bold text-white">Copiar enlace</button></div>}
 </section>
}
