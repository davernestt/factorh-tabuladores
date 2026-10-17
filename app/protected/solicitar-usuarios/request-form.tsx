"use client";
import {useState} from "react";
export default function RequestUserForm(){
 const [count,setCount]=useState("1"),[notes,setNotes]=useState("");
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[ok,setOk]=useState(false);
 async function send(){
  setBusy(true);setMessage("");setOk(false);
  try{
   const r=await fetch("/api/cliente/solicitudes-usuarios",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({requested_count:Number(count),notes})
   });
   const data=await r.json();
   if(!r.ok)throw Error(data.error||"Error al registrar solicitud.");
   setOk(true);setMessage(data.message);
  }catch(e){setMessage(e instanceof Error?e.message:"No se pudo registrar.");}
  finally{setBusy(false);}
 }
 return <div className="space-y-5 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
  <h1 className="text-2xl font-black text-neutral-900">Solicitar usuarios para mi empresa</h1>
  <p className="text-sm leading-7 text-neutral-600">Puedes solicitar accesos adicionales. FactoRH revisará tu solicitud y, únicamente cuando la autorice, creará y enviará las invitaciones. Tú no podrás dar de alta usuarios ni conceder permisos.</p>
  <label className="block text-sm font-bold text-neutral-700">¿Cuántos usuarios adicionales necesitas?
   <input type="number" min={1} max={20} value={count} onChange={e=>setCount(e.target.value)}
    className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 text-neutral-900"/>
  </label>
  <label className="block text-sm font-bold text-neutral-700">¿Para qué los necesitas? (opcional)
   <textarea maxLength={1000} rows={4} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Ej. Tres integrantes de Recursos Humanos para dar seguimiento a las evaluaciones."
    className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 text-neutral-900"/>
  </label>
  {message&&<p role={ok?"status":"alert"} className={`rounded-xl p-3 text-sm ${ok?"bg-emerald-50 text-emerald-800":"bg-red-50 text-red-700"}`}>{message}</p>}
  <button type="button" disabled={busy||!Number.isInteger(Number(count))||Number(count)<1||Number(count)>20}
   onClick={()=>void send()} className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-40">
   {busy?"Enviando...":"Enviar solicitud a FactoRH"}
  </button>
 </div>;
}
