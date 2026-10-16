"use client";
import {useState,type ReactNode} from "react";
type Tab="resumen"|"usuarios"|"servicios"|"seguimiento";
export default function CompanyDetailTabs({overview,users,services,usage,history}:{
 overview:ReactNode;users:ReactNode;services:ReactNode;usage:ReactNode;history:ReactNode;
}){
 const [tab,setTab]=useState<Tab>("resumen");
 const tabs:Array<{id:Tab;label:string;hint:string}>=[
  {id:"resumen",label:"Resumen",hint:"Datos y accesos"},
  {id:"usuarios",label:"Usuarios",hint:"Crear, editar o desactivar"},
  {id:"servicios",label:"Servicios",hint:"Dar demo y activar planes"},
  {id:"seguimiento",label:"Seguimiento",hint:"Consumos e historial"}
 ];
 return <div className="space-y-5">
  <nav className="grid gap-2 rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm sm:grid-cols-2 xl:grid-cols-4" aria-label="Secciones de empresa">
   {tabs.map(item=><button type="button" key={item.id} onClick={()=>setTab(item.id)}
    aria-pressed={item.id===tab}
    className={`rounded-xl px-4 py-3 text-left transition ${tab===item.id?"bg-neutral-800 text-white":"text-neutral-700 hover:bg-neutral-100"}`}>
    <span className="block text-sm font-black">{item.label}</span>
    <span className={`mt-1 block text-xs ${tab===item.id?"text-neutral-300":"text-neutral-500"}`}>{item.hint}</span>
   </button>)}
  </nav>
  {tab==="resumen"&&overview}
  {tab==="usuarios"&&users}
  {tab==="servicios"&&services}
  {tab==="seguimiento"&&<div className="space-y-6">{usage}{history}</div>}
 </div>;
}
