"use client";
import {useState,type ReactNode} from "react";
type Tab="resumen"|"usuarios"|"servicios"|"consumos"|"historial";
export default function CompanyDetailTabs({overview,users,services,usage,history}:{
 overview:ReactNode;users:ReactNode;services:ReactNode;usage:ReactNode;history:ReactNode;
}){
 const [tab,setTab]=useState<Tab>("resumen");
 const tabs:Array<{id:Tab;label:string}>=[
  {id:"resumen",label:"Resumen"},{id:"usuarios",label:"Usuarios"},
  {id:"servicios",label:"Servicios y precios"},{id:"consumos",label:"Consumos"},
  {id:"historial",label:"Historial"}
 ];
 const contents:{[K in Tab]:ReactNode}={resumen:overview,usuarios:users,servicios:services,consumos:usage,historial:history};
 return <div className="space-y-5">
  <nav className="flex flex-wrap gap-2 rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm" aria-label="Secciones de empresa">
   {tabs.map(item=><button type="button" key={item.id} onClick={()=>setTab(item.id)}
    aria-current={item.id===tab?"page":undefined}
    className={`rounded-xl px-4 py-3 text-sm font-bold transition ${tab===item.id?"bg-orange-600 text-white":"text-neutral-600 hover:bg-neutral-100"}`}>
    {item.label}
   </button>)}
  </nav>
  <div>{contents[tab]}</div>
 </div>;
}
