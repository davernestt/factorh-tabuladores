"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";

type Org={id:string;name:string};
export type StudyRequestDraft={
 service_key:string;organization_id?:string;
 full_name:string;phone:string;curp:string;home_address:string;
 position_name:string;person_relationship:"candidate"|"employee";
 privacy_acknowledged:boolean;
};
type Props={
 serviceKey:string;serviceName:string;
 organizations?:Org[];isAdmin?:boolean;demoMode?:boolean;liveEnabled?:boolean;
 onDemoSubmitted?:(info:{service:string;person:string;relationship:string})=>void;
};

export default function RequestForm({
 serviceKey,serviceName,organizations=[],isAdmin=false,demoMode=false,
 liveEnabled=false,onDemoSubmitted
}:Props){
 const router=useRouter();
 const [open,setOpen]=useState(false),[pending,setPending]=useState(false);
 const [message,setMessage]=useState("");
 const [form,setForm]=useState<StudyRequestDraft>({
  service_key:serviceKey,organization_id:organizations[0]?.id||"",
  full_name:"",phone:"",curp:"",home_address:"",position_name:"",
  person_relationship:"candidate",privacy_acknowledged:false
 });
 const simulated=demoMode||!liveEnabled;
 const serviceLabels:Record<string,string>={
  express:"Estudio Express",esencial:"Estudio Esencial",integral:"Estudio Integral",
  ejecutivo:"Estudio Ejecutivo",referencias_laborales:"Referencias laborales",
  investigacion_laboral:"Investigación laboral"
 };
 const services=Object.entries(serviceLabels);
 function change<K extends keyof StudyRequestDraft>(key:K,value:StudyRequestDraft[K]){
  setForm(previous=>({...previous,[key]:value}));
 }
 function close(){setOpen(false);setMessage("");}
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(pending)return;
  setMessage("");
  if(!form.privacy_acknowledged){
   setMessage("Primero confirma la información de privacidad y autorización de la persona.");
   return;
  }
  if(simulated){
   onDemoSubmitted?.({service:serviceLabels[form.service_key]||serviceName,
     person:form.full_name.trim(),relationship:form.person_relationship});
   setMessage("Solicitud simulada. No se guardaron datos personales ni se envió información.");
   return;
  }
  setPending(true);
  try{
   const response=await fetch("/api/estudios/solicitudes",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)
   });
   const result=await response.json();
   if(!response.ok)throw Error(result.error||"No fue posible registrar la solicitud.");
   setMessage("Solicitud registrada. FactoRH confirmará el alcance y realizará el seguimiento.");
   setOpen(false);router.refresh();
  }catch(cause){
   setMessage(cause instanceof Error?cause.message:"No fue posible registrar la solicitud.");
  }finally{setPending(false)}
 }

 const input="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500";
 return <div className="mt-4">
  <button type="button" onClick={()=>{setOpen(true);setMessage("")}}
   className="rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-bold text-orange-700 hover:bg-orange-50">
   {isAdmin?"Registrar solicitud":"Solicitar servicio"} →
  </button>
  {!open&&message&&<p role="status" className="mt-2 text-xs text-neutral-700">{message}</p>}
  {open&&<div role="presentation" className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3 sm:p-5">
   <div role="dialog" aria-modal="true" aria-labelledby="ese-new-request-heading"
    className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
    <div className="flex items-start justify-between gap-4">
     <div>
      <p className="text-xs font-bold uppercase tracking-wider text-orange-600">FactoRH · Estudios e Investigaciones</p>
      <h2 id="ese-new-request-heading" className="mt-2 text-2xl font-black text-neutral-900">Nueva solicitud</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">Registra una solicitud por persona para dar seguimiento individual.</p>
     </div>
     <button type="button" onClick={close} aria-label="Cerrar formulario" className="rounded-lg px-3 py-2 text-xl text-neutral-600 hover:bg-neutral-100">×</button>
    </div>
    {simulated&&<div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-xs leading-6 text-orange-950">
      <strong>Vista de prueba:</strong> este formulario no guarda información. Utiliza exclusivamente datos ficticios.
      La captura real de CURP y domicilio se habilitará después de completar el aviso de privacidad y las pruebas de seguridad.
    </div>}
    <form onSubmit={submit} className="mt-5 space-y-4">
     {isAdmin&&<label className="block text-sm font-semibold text-neutral-700">Empresa solicitante *
      <select required value={form.organization_id||""} onChange={e=>change("organization_id",e.target.value)} className={input}>
       <option value="">Selecciona una empresa</option>
       {organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
     </label>}
     <label className="block text-sm font-semibold text-neutral-700">Tipo de estudio o investigación *
      <select value={form.service_key} onChange={e=>change("service_key",e.target.value)} className={input}>
       {services.map(([key,name])=><option value={key} key={key}>{name}</option>)}
      </select>
     </label>
     <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-semibold text-neutral-700 sm:col-span-2">1. Nombre completo de la persona *
       <input required minLength={5} maxLength={180} autoComplete="off" value={form.full_name}
        onChange={e=>change("full_name",e.target.value)} placeholder="Nombre(s) y apellidos" className={input}/>
      </label>
      <label className="block text-sm font-semibold text-neutral-700">2. Teléfono de contacto *
       <input required type="tel" inputMode="tel" minLength={10} maxLength={20}
        autoComplete="off" value={form.phone} onChange={e=>change("phone",e.target.value)}
        placeholder="Ej. 3312345678" className={input}/>
      </label>
      <label className="block text-sm font-semibold text-neutral-700">3. CURP *
       <input required autoComplete="off" maxLength={18} minLength={18}
        pattern="[A-Za-z&Ññ]{4}[0-9]{6}[HMhm][A-Za-z]{5}[A-Za-z0-9][0-9]"
        value={form.curp} onChange={e=>change("curp",e.target.value.toUpperCase())}
        placeholder="18 caracteres" className={input}/>
      </label>
      <label className="block text-sm font-semibold text-neutral-700 sm:col-span-2">4. Domicilio completo *
       <textarea required minLength={12} maxLength={500} rows={3} value={form.home_address}
        onChange={e=>change("home_address",e.target.value)}
        placeholder="Calle, número, colonia, municipio, estado y código postal" className={input}/>
      </label>
      <label className="block text-sm font-semibold text-neutral-700">5. Puesto de ingreso o actual *
       <input required minLength={2} maxLength={180} value={form.position_name}
        onChange={e=>change("position_name",e.target.value)}
        placeholder="Ej. Auxiliar de almacén" className={input}/>
      </label>
      <label className="block text-sm font-semibold text-neutral-700">Situación de la persona *
       <select value={form.person_relationship} onChange={e=>change("person_relationship",e.target.value as "candidate"|"employee")} className={input}>
        <option value="candidate">Candidato(a) a ingresar</option>
        <option value="employee">Colaborador(a) actual</option>
       </select>
      </label>
     </div>
     <label className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-xs leading-6 text-neutral-700">
      <input type="checkbox" required checked={form.privacy_acknowledged}
       onChange={e=>change("privacy_acknowledged",e.target.checked)} className="mt-1 accent-orange-600"/>
      <span>Confirmo que la persona recibió el aviso de privacidad aplicable y que cuento con la autorización necesaria para transmitir estos datos exclusivamente para la solicitud del servicio. La autorización deberá acreditarse antes de iniciar la investigación.</span>
     </label>
     <p className="text-xs leading-6 text-neutral-500">El formulario no solicita información sobre religión, salud, relaciones familiares ni otros datos innecesarios en esta etapa. La consulta de Buró de Crédito permanece deshabilitada.</p>
     {message&&<p role="status" className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-800">{message}</p>}
     <div className="flex flex-wrap justify-end gap-3 border-t border-neutral-100 pt-4">
      <button type="button" onClick={close} className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-bold text-neutral-700">Cerrar</button>
      <button type="submit" disabled={pending||(isAdmin&&!form.organization_id)}
       className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50">
       {pending?"Guardando...":simulated?"Simular solicitud (no guardar)":"Registrar solicitud"}
      </button>
     </div>
    </form>
   </div>
  </div>}
 </div>;
}
