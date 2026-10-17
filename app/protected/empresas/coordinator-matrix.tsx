"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
const labels:Record<string,string>={
 psychometrics:"Psicometrías",feedback360:"Evaluación 360°",pdl:"PDL",
 nom035:"NOM-035",climate:"Clima Laboral",studies:"Estudios Socioeconómicos",candidates:"Candidatos"
};
type Grant={module_key:string;can_view:boolean;can_operate:boolean;can_reports:boolean};
export default function CoordinatorMatrix({userId,name,initial,activated,validated}:{
 userId:string;name:string;initial:Grant[];activated:boolean;validated:boolean;
}){
 const router=useRouter();
 const [grants,setGrants]=useState(initial),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 function toggle(key:string,field:"can_view"|"can_operate"|"can_reports",value:boolean){
  setGrants(rows=>rows.map(g=>g.module_key===key?{...g,[field]:value}:g));
 }
 async function save(){
  setBusy(true);setNotice("");
  try{
   const r=await fetch(`/api/admin/usuarios/${userId}/permisos-operativos`,{
    method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({grants})
   });
   const data=await r.json();
   if(!r.ok)throw Error(data.error||"No fue posible guardar.");
   setNotice(data.message||"Guardado en borrador.");router.refresh();
  }catch(e){setNotice(e instanceof Error?e.message:"Error al guardar.");}
  finally{setBusy(false);}
 }
 return <section className="rounded-3xl border border-orange-200 bg-white p-6 shadow-sm">
  <p className="text-xs font-black uppercase tracking-widest text-orange-600">Perfil FactoRH · Coordinación Operativa</p>
  <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
   <div><h2 className="text-xl font-black text-neutral-900">{name} · Matriz de permisos</h2>
    <p className="mt-2 text-sm leading-6 text-neutral-600">Define qué servicios podrá consultar, operar y en cuáles podrá obtener reportes. Esta configuración aún no concede acceso.</p>
   </div>
   <span className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
    {activated?"Perfil activado":validated?"Validado · sin activar":"Pendiente de validación"}
   </span>
  </div>
  <div className="mt-5 overflow-x-auto">
   <table className="w-full text-sm"><thead><tr className="border-b border-neutral-200 text-left text-neutral-500">
    <th className="py-3 pr-3">Módulo</th>
    <th className="px-2 py-3 text-center">Consultar</th>
    <th className="px-2 py-3 text-center">Operar</th>
    <th className="px-2 py-3 text-center">Reportes</th>
   </tr></thead>
   <tbody>{grants.map(g=><tr className="border-b border-neutral-100" key={g.module_key}>
    <td className="py-4 pr-3 font-semibold text-neutral-800">{labels[g.module_key]||g.module_key}</td>
    {(["can_view","can_operate","can_reports"] as const).map(field=><td className="px-2 py-4 text-center" key={field}>
      <input type="checkbox" disabled={activated} checked={g[field]}
       aria-label={`${labels[g.module_key]} ${field==="can_view"?"Consultar":field==="can_operate"?"Operar":"Reportes"}`}
       onChange={e=>toggle(g.module_key,field,e.target.checked)} className="h-4 w-4 accent-orange-600"/>
     </td>)}
   </tr>)}</tbody></table>
  </div>
  <div className="mt-5 rounded-2xl bg-neutral-100 p-4 text-sm leading-6 text-neutral-700">
   <strong>Exclusivo del superadministrador:</strong> usuarios, roles, licencias, créditos, precios, configuración general, instrumentos y metodologías, eliminar expedientes y liberar permisos.
  </div>
  {notice&&<p className="mt-3 rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700" role="status">{notice}</p>}
  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
   <p className="text-xs text-amber-800">No hay botón de activación mientras la prueba de seguridad esté pendiente.</p>
   <button type="button" disabled={activated||busy} onClick={()=>void save()}
     className="rounded-xl bg-neutral-800 px-5 py-3 text-sm font-black text-white disabled:opacity-40">
     {busy?"Guardando...":"Guardar matriz sin activar"}
   </button>
  </div>
 </section>;
}
