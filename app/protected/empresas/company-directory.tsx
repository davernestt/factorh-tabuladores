"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
type Company={
 id:string;name:string;slug:string;active:boolean;lifecycle_stage:string;email:string|null;
 users:number;services:number;trials:number;expiring:number;creditsRemaining:number;
};
export default function CompanyDirectory({companies}:{companies:Company[]}){
 const [query,setQuery]=useState("");
 const [stage,setStage]=useState("all");
 const filtered=useMemo(()=>companies.filter(c=>
  (stage==="all"||c.lifecycle_stage===stage)&&
  (c.name+" "+(c.email||"")).toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es"))
 ),[companies,stage,query]);
 return <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h2 className="text-xl font-black text-neutral-900">Directorio de empresas</h2>
    <p className="mt-1 text-sm text-neutral-500">Selecciona una empresa para administrar usuarios, licencias, consumos y seguimiento comercial.</p>
   </div>
   <div className="text-sm font-semibold text-neutral-500">{filtered.length} empresas</div>
  </div>
  <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
   <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por empresa o correo comercial…" className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm"/>
   <select value={stage} onChange={e=>setStage(e.target.value)} className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm">
    <option value="all">Todos los estados</option><option value="prospect">Prospectos</option>
    <option value="client">Clientes</option><option value="inactive">Inactivos</option>
   </select>
  </div>
  <div className="mt-5 space-y-3">
   {filtered.length===0&&<p className="rounded-xl bg-neutral-50 p-5 text-sm text-neutral-500">No hay empresas con esos filtros.</p>}
   {filtered.map(c=><Link href={`/protected/empresas/${c.id}`} key={c.id}
    className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-orange-300 hover:bg-orange-50/30">
    <div className="min-w-0">
     <div className="flex flex-wrap items-center gap-2">
      <h3 className="text-lg font-black text-neutral-900">{c.name}</h3>
      <span className="rounded-lg bg-neutral-100 px-2 py-1 text-[11px] font-bold text-neutral-600">
       {c.lifecycle_stage==="prospect"?"Prospecto":c.lifecycle_stage==="inactive"?"Inactiva":"Cliente"}
      </span>
     </div>
     <p className="mt-1 text-xs text-neutral-500">{c.email||"Sin correo comercial"}</p>
     <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-neutral-600">
      <span><strong>{c.users}</strong> usuarios</span>
      <span><strong>{c.services}</strong> licencias activas</span>
      <span><strong>{c.trials}</strong> demos</span>
      {c.expiring>0&&<span className="font-bold text-amber-700">{c.expiring} por vencer</span>}
     </div>
    </div>
    <span className="rounded-xl bg-neutral-800 px-4 py-2.5 text-sm font-bold text-white group-hover:bg-orange-600">Abrir expediente →</span>
   </Link>)}
  </div>
 </section>;
}
