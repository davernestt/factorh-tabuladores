"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import type {CreditPlan} from "./company-credit-manager";
import type {ModuleSubscription,PlatformModule} from "./company-module-manager";

type Action="trial"|"active"|"edit"|"paused"|"requested";
const datePlus=(days:number)=>{
 const d=new Date();d.setDate(d.getDate()+days);return d.toISOString().slice(0,10);
};
const today=()=>new Date().toISOString().slice(0,10);
const readable=(d:string|null|undefined)=>d?new Date(d+"T12:00:00").toLocaleDateString("es-MX"):"Sin vencimiento";
const label:Record<string,string>={trial:"En demo",active:"Plan activo",requested:"Solicitado",paused:"Suspendido",expired:"Vencido",cancelled:"Cancelado"};
const hint:Record<string,string>={
 psychometrics:"Por ahora, los planes pagados descuentan créditos por instrumento; la demo descuenta una aplicación por candidato.",
 feedback360:"Cada ciclo creado cuenta contra el cupo de líderes; la demo permite un líder.",
 nom035:"Se habilita el acceso al módulo. El cupo de trabajadores todavía no se limita automáticamente.",
 pdl:"Pendiente de acceso autónomo para clientes: sólo puedes registrar la solicitud.",
 studies:"Pendiente de acceso autónomo para clientes: sólo puedes registrar la solicitud.",
 climate:"Pendiente de acceso autónomo para clientes: sólo puedes registrar la solicitud."
};
export default function CompanyServiceOperations({organizationId,modules,subscriptions,credit,cycleCount}:{
 organizationId:string;modules:PlatformModule[];subscriptions:ModuleSubscription[];
 credit:CreditPlan|null;cycleCount:number;
}){
 const router=useRouter();
 const [selection,setSelection]=useState<{module:PlatformModule;action:Action}|null>(null);
 const [qty,setQty]=useState("1");
 const [planName,setPlanName]=useState("");
 const [endsOn,setEndsOn]=useState("");
 const [note,setNote]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const map=new Map(subscriptions.map(s=>[s.module_key,s]));
 useEffect(()=>{
  if(!selection)return;
  const {module,action}=selection;
  const existing=map.get(module.module_key);
  const keep=action==="edit"||action==="paused";
  setQty(module.module_key==="psychometrics"?
   String(keep&&credit?credit.credits_total:action==="trial"?2:50):
   module.module_key==="feedback360"?
   String(keep?(existing?.evaluation_limit??(existing?.status==="trial"?1:15)):action==="trial"?1:15):"");
  setPlanName(keep?existing?.plan_name||"":action==="trial"?"Prueba gratuita":action==="active"?"Plan contratado":"");
  setEndsOn(keep?existing?.ends_on||"":action==="trial"?datePlus(module.module_key==="psychometrics"?30:14):datePlus(365));
  setNote(keep?existing?.requested_notes||"":"");
  setError("");
 },[selection]);
 const hasPsych=selection?.module.module_key==="psychometrics";
 const has360=selection?.module.module_key==="feedback360";
 const limitRelevant=Boolean(hasPsych||has360);
 const modalTitle=selection?.action==="trial"?"Dar demo":selection?.action==="active"?"Activar plan":selection?.action==="paused"?"Suspender servicio":selection?.action==="requested"?"Registrar interés":"Modificar servicio";
 async function submit(){
  if(!selection||busy)return;
  const {module,action}=selection;
  const sub=map.get(module.module_key);
  const isPsych=module.module_key==="psychometrics";
  let status:ModuleSubscription["status"]=action==="edit"?sub?.status||"requested":action==="paused"?"paused":action;
  if(action==="edit"&&!sub&&module.module_key!=="psychometrics"){setError("Primero habilita el servicio.");return;}
  if((action==="active"||action==="edit")&&limitRelevant&&(!Number.isInteger(Number(qty))||Number(qty)<1||Number(qty)>10000)){setError("Indica una cantidad válida.");return;}
  if(action==="edit"&&status==="trial"&&module.module_key==="feedback360"&&Number(qty)>1){setError("La demo 360° permite un líder. Para más, activa un plan.");return;}
  if(action==="trial"&&sub?.status==="active"){setError("Hay una licencia activa: suspéndela o modifícala en lugar de convertirla en demo.");return;}
  if(action==="paused"&&!(sub?.status==="active"||sub?.status==="trial")){setError("Sólo se suspende un plan o demo activo.");return;}
  if((action==="trial"||action==="active")&&isPsych&&credit&&(credit.credits_used>0||credit.plan_type==="package")){
   if(!window.confirm("Al activar este nuevo plan de Psicometrías, el contador de créditos comenzará desde cero. El consumo histórico se conservará en la bitácora. ¿Continuar?"))return;
  }
  if(action==="paused"&&!window.confirm("¿Suspender el acceso al servicio de esta empresa? Se conservará su historial."))return;
  setBusy(true);setError("");
  try{
   let res:Response;
   if(isPsych&&action!=="requested"){
    const operation=action==="paused"?"pause":action==="edit"?"adjust":"replace";
    const mode=action==="trial"||action==="edit"&&credit?.plan_type==="trial"?"trial":"package";
    res=await fetch(`/api/admin/empresas/${organizationId}/creditos`,{
     method:"PATCH",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({operation,mode,credits_total:mode==="trial"?2:Number(qty),plan_name:planName,valid_until:endsOn||null})
    });
   }else{
    res=await fetch(`/api/admin/empresas/${organizationId}/modulos`,{
     method:"PATCH",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({module_key:module.module_key,status,plan_name:planName,
      starts_on:action==="edit"||action==="paused"?sub?.starts_on||today():today(),
      ends_on:endsOn||null,requested_on:sub?.requested_on||today(),
      requested_notes:note,reminder_days:30,client_notice:true,
      ...(has360&&action!=="paused"&&action!=="requested"?{evaluation_limit:action==="trial"?1:Number(qty)}:{})
     })
    });
   }
   const data=await res.json();
   if(!res.ok)throw Error(data.error||"No se pudo actualizar el servicio.");
   setSelection(null);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Error al guardar.");}
  finally{setBusy(false);}
 }
 const getActions=(m:PlatformModule,s?:ModuleSubscription)=>{
  if(!m.client_available)return [{action:"requested" as Action,text:s?"Actualizar solicitud":"Registrar interés"}];
  const actions:{action:Action;text:string}[]=[];
  if(!s||["requested","cancelled","expired"].includes(s.status)){
   actions.push({action:"trial",text:"Dar demo"},{action:"active",text:"Activar plan"});
  }else if(s.status==="paused"){
   actions.push({action:"edit",text:"Reactivar / modificar"});
  }else{
   actions.push({action:"edit",text:"Modificar"});
   if(["active","trial"].includes(s.status))actions.push({action:"paused",text:"Suspender"});
  }
  return actions;
 };
 return <section className="space-y-4">
  <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <h2 className="text-2xl font-black text-neutral-900">Habilitar servicios</h2>
   <p className="mt-2 text-sm leading-7 text-neutral-600">Selecciona un módulo y decide si deseas habilitar una prueba, activar un plan, modificar sus condiciones o suspenderlo. Ningún servicio cambia hasta que lo confirmes.</p>
   <div className="mt-5 grid gap-4 lg:grid-cols-2">
    {modules.map(m=>{
     const s=map.get(m.module_key);
     const psych=m.module_key==="psychometrics";
     const currentStatus=psych&&credit?(credit.active?credit.plan_type==="trial"?"trial":"active":"paused"):s?.status;
     const effective={...s,status:currentStatus||s?.status} as ModuleSubscription|undefined;
     const remaining=psych&&credit?Math.max(0,credit.credits_total-credit.credits_used):null;
     return <article key={m.module_key} className="rounded-2xl border border-neutral-200 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
       <h3 className="text-lg font-black text-neutral-900">{m.name}</h3>
       <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${currentStatus==="active"?"bg-emerald-50 text-emerald-700":currentStatus==="trial"?"bg-orange-50 text-orange-700":"bg-neutral-100 text-neutral-600"}`}>
        {currentStatus?label[currentStatus]||currentStatus:"Sin activar"}
       </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{m.description}</p>
      {s?.plan_name&&<p className="mt-2 text-sm font-semibold text-neutral-800">{s.plan_name}</p>}
      <p className="mt-1 text-xs text-neutral-500">Inicio: {readable(s?.starts_on)} · Vence: {readable(s?.ends_on)}</p>
      {psych&&credit&&<p className="mt-2 text-xs font-bold text-neutral-700">{remaining} de {credit.credits_total} aplicaciones disponibles</p>}
      {m.module_key==="feedback360"&&<p className="mt-2 text-xs font-bold text-neutral-700">{cycleCount} ciclos creados{s?.evaluation_limit?" · cupo "+s.evaluation_limit:s?.status==="trial"?" · demo: 1 líder":""}</p>}
      {!m.client_available&&<p className="mt-2 text-xs font-bold text-amber-700">Portal de este módulo aún no habilitado para clientes.</p>}
      <div className="mt-4 flex flex-wrap gap-2">
       {getActions(m,effective).map(a=><button key={a.action} type="button" onClick={()=>setSelection({module:m,action:a.action})}
        className={`rounded-xl px-4 py-2.5 text-sm font-bold ${a.action==="trial"||a.action==="active"?"bg-orange-600 text-white hover:bg-orange-700":"border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"}`}>{a.text}</button>)}
      </div>
     </article>;
    })}
   </div>
  </div>
  {selection&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
   <div role="dialog" aria-modal="true" aria-label={modalTitle+" "+selection.module.name} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
    <div className="flex items-start justify-between gap-4">
     <div><p className="text-xs font-bold uppercase tracking-wider text-orange-600">Centro de Clientes · FactoRH</p>
      <h2 className="mt-2 text-2xl font-black text-neutral-900">{modalTitle}</h2>
      <p className="mt-1 text-sm text-neutral-600">{selection.module.name}</p></div>
     <button type="button" onClick={()=>setSelection(null)} className="rounded-xl bg-neutral-100 px-3 py-2 font-bold" aria-label="Cerrar">✕</button>
    </div>
    <p className="mt-4 rounded-xl bg-neutral-50 p-3 text-sm leading-6 text-neutral-600">{hint[selection.module.module_key]||"Configura vigencia y condiciones de uso."}</p>
    {selection.action!=="paused"&&<div className="mt-4 space-y-4">
     {selection.action!=="requested"&&<label className="block text-sm font-bold text-neutral-700">Nombre del plan
      <input value={planName} onChange={e=>setPlanName(e.target.value)} maxLength={100} placeholder="Ej. Paquete de 17 líderes" className="mt-2 w-full rounded-xl border border-neutral-300 p-3"/>
     </label>}
     {limitRelevant&&selection.action!=="requested"&&<label className="block text-sm font-bold text-neutral-700">Cantidad {hasPsych?"de créditos disponibles":"de líderes / ciclos 360°"}
      <input type="number" min="1" max="10000" value={qty} disabled={selection.action==="trial"} onChange={e=>setQty(e.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 p-3 disabled:bg-neutral-100"/>
      {hasPsych&&<span className="mt-1 block text-xs font-normal text-neutral-500">Los planes psicométricos pagados todavía consumen por instrumento; la demo por candidato.</span>}
      {has360&&<span className="mt-1 block text-xs font-normal text-neutral-500">Se bloquea la creación al alcanzar el cupo. Ciclos ya creados: {cycleCount}.</span>}
     </label>}
     {selection.action!=="requested"&&<label className="block text-sm font-bold text-neutral-700">Vigencia hasta
      <input type="date" min={today()} value={endsOn} onChange={e=>setEndsOn(e.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 p-3"/>
     </label>}
     <label className="block text-sm font-bold text-neutral-700">Nota o condiciones (opcional)
      <textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={1200} placeholder="Ej. Prospecto solicita habilitación después de demo." className="mt-2 w-full rounded-xl border border-neutral-300 p-3" rows={3}/>
     </label>
    </div>}
    {selection.action==="paused"&&<p className="mt-5 text-sm text-neutral-700">Suspender impide nuevas operaciones mientras el servicio permanezca inactivo. No elimina evaluaciones ni resultados.</p>}
    {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mt-6 flex justify-end gap-3">
     <button type="button" onClick={()=>setSelection(null)} className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-bold">Cancelar</button>
     <button type="button" disabled={busy} onClick={()=>void submit()} className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?"Guardando...":"Confirmar "+modalTitle.toLowerCase()}</button>
    </div>
   </div>
  </div>}
 </section>;
}
