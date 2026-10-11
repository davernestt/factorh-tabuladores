"use client";

import {useMemo,useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {createNom035Center,updateNom035Center} from "./actions";
import {NOM035_TIER_LABELS,nom035Guide,nom035Tier,type Nom035Method} from "@/lib/nom035/rules";
type Organization={id:string;name:string};
type CenterFields={
 id:string;organization_id:string;name:string;worker_count:number;
 street_address:string;municipality:string;state:string;main_activity:string;
 assessment_method:Nom035Method;last_assessment_on:string|null;
};
const states=[
 "Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas","Chihuahua",
 "Ciudad de México","Coahuila","Colima","Durango","Estado de México","Guanajuato",
 "Guerrero","Hidalgo","Jalisco","Michoacán","Morelos","Nayarit","Nuevo León","Oaxaca",
 "Puebla","Querétaro","Quintana Roo","San Luis Potosí","Sinaloa","Sonora","Tabasco",
 "Tamaulipas","Tlaxcala","Veracruz","Yucatán","Zacatecas"
];
export default function Nom035CenterForm({organizations,center}:{
 organizations:Organization[];center?:CenterFields
}){
 const router=useRouter();
 const [pending,start]=useTransition();
 const [workers,setWorkers]=useState(center?.worker_count??0);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const [editing,setEditing]=useState(!center);
 const tier=useMemo(()=>Number.isInteger(workers)&&workers>0?nom035Tier(workers):null,[workers]);
 const guide=tier?nom035Guide(workers):null;
 function submit(form:FormData){
  setError("");setMessage("");
  start(async()=>{
   try{
    if(center){form.set("center_id",center.id);form.set("organization_id",center.organization_id);
      await updateNom035Center(form);
      setMessage("Datos guardados correctamente. Revisa las obligaciones actualizadas.");
      setEditing(false);router.refresh();
    }else{
      await createNom035Center(form);
    }
   }catch(e){setError(e instanceof Error?e.message:"No se pudo guardar. Comprueba los datos.");}
  });
 }
 const input="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-800 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-300";
 if(center&&!editing)return <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h2 className="text-xl font-black text-neutral-800">Ficha del centro de trabajo</h2>
    <p className="mt-2 text-sm text-neutral-600">{center.name} · {center.worker_count} trabajadores registrados</p></div>
   <button type="button" onClick={()=>setEditing(true)}
    className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-bold text-neutral-700">Modificar ficha</button>
  </div>
  {message&&<p role="status" className="mt-4 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-700">{message}</p>}
 </section>;
 return <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><h2 className="text-xl font-black text-neutral-800">{center?"Actualizar centro de trabajo":"Registrar centro de trabajo"}</h2>
    <p className="mt-2 text-sm leading-6 text-neutral-600">Una empresa puede tener varios centros con tamaños y obligaciones distintas. Registra la plantilla del centro, no la suma de toda la empresa.</p></div>
   {center&&<button type="button" onClick={()=>{setEditing(false);setError("");}}
    className="rounded-lg px-3 py-2 text-sm font-bold text-neutral-500">Cancelar</button>}
  </div>
  <form action={submit} className="mt-6 space-y-5">
   <div className="grid gap-4 md:grid-cols-2">
    <label className="text-sm font-bold text-neutral-700">Empresa
     {center?<select name="organization_id" defaultValue={center.organization_id} disabled
      className={input}>{organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>:
     <select name="organization_id" defaultValue="" required className={input}>
      <option value="" disabled>Selecciona una empresa cliente</option>
      {organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
     </select>}
    </label>
    <label className="text-sm font-bold text-neutral-700">Nombre del centro de trabajo
     <input className={input} name="name" required minLength={3} maxLength={160}
      defaultValue={center?.name||""} placeholder="Ej. Planta Guadalajara · Centro de distribución"/>
    </label>
    <label className="text-sm font-bold text-neutral-700">Número de trabajadores en este centro
     <input className={input} name="worker_count" required type="number" min={1} max={100000}
      defaultValue={center?.worker_count||""} onChange={e=>setWorkers(Number(e.target.value))}
      placeholder="Ej. 48"/>
    </label>
    <label className="text-sm font-bold text-neutral-700">Actividad principal
     <input className={input} name="main_activity" required maxLength={250}
      defaultValue={center?.main_activity||""} placeholder="Ej. Almacenamiento y distribución"/>
    </label>
    <label className="text-sm font-bold text-neutral-700">Entidad federativa
     <select className={input} name="state" required defaultValue={center?.state||""}>
      <option value="" disabled>Selecciona estado</option>
      {states.map(s=><option key={s} value={s}>{s}</option>)}
     </select>
    </label>
    <label className="text-sm font-bold text-neutral-700">Municipio o alcaldía
     <input className={input} name="municipality" required maxLength={120}
      defaultValue={center?.municipality||""} placeholder="Ej. Zapopan"/>
    </label>
    <label className="text-sm font-bold text-neutral-700 md:col-span-2">Domicilio del centro (opcional durante el alta)
     <input className={input} name="street_address" maxLength={350}
      defaultValue={center?.street_address||""} placeholder="Calle, número, colonia y código postal"/>
    </label>
    <label className="text-sm font-bold text-neutral-700">Método de evaluación previsto
     <select name="assessment_method" className={input} defaultValue={center?.assessment_method||"official_guides"}>
      <option value="official_guides">Guías de referencia oficiales</option>
      <option value="validated_alternative">Método alternativo (requiere validar cumplimiento de NOM)</option>
      <option value="undecided">Por definir</option>
     </select>
    </label>
    <label className="text-sm font-bold text-neutral-700">Última evaluación realizada (si existe)
     <input className={input} type="date" name="last_assessment_on"
      defaultValue={center?.last_assessment_on||""}/>
    </label>
   </div>
   <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
    <p className="text-xs font-black uppercase tracking-wider text-orange-700">Clasificación automática por centro</p>
    {tier?<><h3 className="mt-2 text-xl font-black text-neutral-800">{NOM035_TIER_LABELS[tier]}</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-700">{guide==="none"?
       "No se exige la identificación general mediante Guía II o III por tamaño. Sí aplican obligaciones de prevención, difusión y atención de acontecimientos traumáticos.":
       "La Guía de Referencia "+guide+" es la opción oficial para este tamaño, no la única metodología permitida. El cuestionario requerirá configuración y validación posterior."}</p>
     </>:<p className="mt-2 text-sm text-neutral-700">Indica el número de trabajadores para identificar el tramo aplicable.</p>}
   </div>
   <p className="text-xs leading-6 text-neutral-500">No captures nombres de colaboradores, información médica ni incidentes específicos en esta ficha administrativa.</p>
   {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
   {message&&<p role="status" className="rounded-xl bg-neutral-50 p-4 text-sm font-semibold text-neutral-700">{message}</p>}
   <button type="submit" disabled={pending||!organizations.length}
    className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-black text-white hover:bg-orange-700 disabled:opacity-40">
    {pending?"Guardando...":center?"Guardar cambios":"Crear centro y ver obligaciones →"}
   </button>
  </form>
 </section>;
}
