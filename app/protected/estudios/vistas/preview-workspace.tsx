"use client";

import {useState} from "react";
import Link from "next/link";
import {ArrowLeft,Building2,ClipboardCheck,PhoneCall,Eye,ShieldCheck} from "lucide-react";
import ClientPanel from "./client-panel";
import ApplicatorPanel from "./applicator-panel";
import ReferencesPanel from "./references-panel";

type Role="cliente"|"aplicador"|"referencias";
const roles=[
 {key:"cliente" as Role,title:"Vista de cliente",subtitle:"Solicitudes, avances y reportes autorizados",icon:Building2},
 {key:"aplicador" as Role,title:"Vista de aplicador",subtitle:"Entrevistas, fotografías, croquis y ubicación",icon:ClipboardCheck},
 {key:"referencias" as Role,title:"Vista de referencista",subtitle:"Llamadas y comprobación de trayectoria",icon:PhoneCall}
];

export default function PreviewWorkspace({initialRole}:{initialRole:Role}){
 const [role,setRole]=useState<Role>(initialRole);
 return <div className="space-y-6">
   <div className="rounded-3xl border border-orange-200 bg-orange-50 p-5">
     <div className="flex flex-wrap items-start justify-between gap-3">
       <div>
         <div className="flex items-center gap-2"><Eye size={19} className="text-orange-700"/>
          <p className="text-xs font-black uppercase tracking-[.16em] text-orange-700">Modo demostración · Solo superadministrador</p>
         </div>
         <h1 className="mt-2 text-xl font-black text-neutral-900">Así verá FactoRH cada perfil</h1>
         <p className="mt-2 text-sm leading-7 text-neutral-700">
           Navega y realiza acciones simuladas sin cambiar tu cuenta. No se usan expedientes reales,
           no se almacenan respuestas y no se consumen créditos.
         </p>
       </div>
       <Link href="/protected/estudios"
        className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white hover:bg-neutral-700">
        <ArrowLeft size={16}/> Regresar a administración
       </Link>
     </div>
   </div>
   <div className="grid gap-3 md:grid-cols-3" aria-label="Seleccionar vista de perfil">
    {roles.map(item=>{
      const Icon=item.icon;
      return <button type="button" key={item.key} onClick={()=>setRole(item.key)}
       aria-pressed={role===item.key}
       className={"flex items-start gap-3 rounded-2xl border p-5 text-left transition-colors "+(role===item.key?"border-orange-500 bg-orange-50 ring-1 ring-orange-200":"border-neutral-200 bg-white hover:bg-neutral-50")}>
       <span className={"rounded-xl p-3 "+(role===item.key?"bg-white text-orange-700":"bg-neutral-100 text-neutral-600")}><Icon size={21}/></span>
       <span><strong className="block text-sm text-neutral-900">{item.title}</strong><span className="mt-2 block text-xs leading-6 text-neutral-600">{item.subtitle}</span></span>
      </button>;
    })}
   </div>
   <section className="rounded-3xl border border-neutral-200 bg-neutral-100 p-3 shadow-sm sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-2 text-xs">
      <span className="font-bold text-neutral-700">Vista simulada: {roles.find(item=>item.key===role)?.title}</span>
      <span className="inline-flex items-center gap-1 text-neutral-500"><ShieldCheck size={14}/> Ninguna acción se guarda</span>
    </div>
    {role==="cliente"&&<ClientPanel/>}
    {role==="aplicador"&&<ApplicatorPanel/>}
    {role==="referencias"&&<ReferencesPanel/>}
   </section>
   <p className="text-xs leading-6 text-neutral-500">
     Alcance actual: demostración interactiva. Los formularios reales de aplicador y referencista,
     autorizaciones, almacenamiento de evidencia y colaboración simultánea se habilitarán
     en fases posteriores, después de validar permisos, consentimiento y privacidad.
   </p>
 </div>;
}
