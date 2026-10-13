"use client";
import {useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {updateNom035PilotAccess} from "./pilot-actions";
type Org={id:string;name:string};
type Pilot={organization_id:string;status:string;starts_on:string|null;ends_on:string|null};
export default function Nom035PilotManager({organizations,pilots,clientOrganizationIds,centerOrganizationIds}:{
 organizations:Org[];pilots:Pilot[];clientOrganizationIds:string[];centerOrganizationIds:string[]
}){
 const [organizationId,setOrganizationId]=useState("");
 const [ends,setEnds]=useState(()=>{
  const d=new Date();d.setUTCDate(d.getUTCDate()+30);return d.toISOString().slice(0,10);
 });
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [pending,start]=useTransition();
 const router=useRouter();
 const actual=pilots.find(x=>x.organization_id===organizationId);
 const hasClient=clientOrganizationIds.includes(organizationId);
 const hasCenter=centerOrganizationIds.includes(organizationId);
 const ready=Boolean(organizationId&&hasClient&&hasCenter);
 function submit(operation:"enable"|"pause"){
  setError("");setNotice("");
  const f=new FormData();f.set("operation",operation);
  f.set("organization_id",organizationId);f.set("ends_on",ends);
  start(async()=>{try{
   await updateNom035PilotAccess(f);
   setNotice(operation==="enable"?"Acceso piloto actualizado.":"Acceso piloto suspendido.");
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"No se pudo cambiar el acceso.");}});
 }
 return <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
  <p className="text-xs font-black uppercase tracking-[.15em] text-orange-600">
   Exclusivo administrador FactoRH
  </p>
  <h2 className="mt-2 text-xl font-black text-neutral-900">Habilitar pruebas NOM-035 por empresa</h2>
  <p className="mt-2 text-sm leading-7 text-neutral-600">
   La empresa debe tener una cuenta cliente existente. El acceso no se habilita
   automáticamente para otros clientes y vence en la fecha establecida.
   Activar el módulo no crea campañas ni envía enlaces.
  </p>
  <div className="mt-5 grid gap-4 md:grid-cols-2">
   <label className="text-xs font-bold text-neutral-700">Empresa cliente
    <select value={organizationId} onChange={e=>setOrganizationId(e.target.value)}
     className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm">
     <option value="">Selecciona una empresa...</option>
     {organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
   </label>
   <label className="text-xs font-bold text-neutral-700">Fecha final del piloto
    <input value={ends} onChange={e=>setEnds(e.target.value)}
     type="date" className="mt-2 w-full rounded-xl border border-neutral-300 p-3 text-sm"/>
   </label>
  </div>
  {organizationId&&<p className={"mt-4 rounded-xl p-4 text-xs "+(ready?
    "bg-neutral-50 text-neutral-700":"bg-amber-50 text-amber-900")}>
   {hasClient?"✓ Usuario cliente activo":"• Falta usuario cliente activo"}
   {" · "}{hasCenter?"✓ Centro de trabajo configurado":"• Falta registrar un centro activo"}
  </p>}
  {actual&&<p className="mt-4 rounded-xl bg-neutral-50 p-4 text-xs text-neutral-700">
   Situación actual: <strong>{actual.status}</strong>
   {actual.ends_on?" · Vence "+actual.ends_on:""}
  </p>}
  <div className="mt-4 flex flex-wrap gap-2">
   <button type="button" disabled={pending||!ready}
    onClick={()=>submit("enable")} className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-black text-white disabled:opacity-40">
    {pending?"Guardando...":"Habilitar piloto de esta empresa"}
   </button>
   {actual&&["active","trial"].includes(actual.status)&&
    <button type="button" disabled={pending} onClick={()=>submit("pause")}
     className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-bold text-neutral-700 disabled:opacity-40">
     Suspender acceso
    </button>}
  </div>
  {error&&<p role="alert" className="mt-4 text-sm font-semibold text-red-700">{error}</p>}
  {notice&&<p role="status" className="mt-4 text-sm font-semibold text-emerald-700">{notice}</p>}
 </section>;
}
