"use client";
import {useMemo,useState} from "react";
import {NOM035_ANSWER_OPTIONS,type Nom035Guide,type Nom035Question} from "@/lib/nom035/official-bank";

type SurveyItem=Pick<Nom035Question,"position"|"prompt"|"conditional">;
type Stage={kind:"questions"|"clients"|"supervisor";questions:SurveyItem[]};
export default function Nom035RiskSurvey({token,guide,questions}:{
 token:string;guide:Nom035Guide;questions:SurveyItem[]
}){
 const [options,setOptions]=useState<Record<string,number>>({});
 const [clients,setClients]=useState<boolean|null>(null);
 const [supervisor,setSupervisor]=useState<boolean|null>(null);
 const [step,setStep]=useState(0);
 const [busy,setBusy]=useState(false);
 const [finished,setFinished]=useState(false);
 const [error,setError]=useState("");
 const stages:Stage[]=useMemo(()=>{
  const base=questions.filter(q=>q.conditional===null);
  const clientQuestions=questions.filter(q=>q.conditional==="clients");
  const supervisorQuestions=questions.filter(q=>q.conditional==="supervisor");
  const chunks:Stage[]=[];
  for(let i=0;i<base.length;i+=8)
   chunks.push({kind:"questions",questions:base.slice(i,i+8)});
  return [...chunks,{kind:"clients",questions:clientQuestions},
   {kind:"supervisor",questions:supervisorQuestions}];
 },[questions]);
 const active=stages[step];
 const applicableCount=questions.filter(q=>q.conditional===null||
  q.conditional==="clients"&&clients===true||
  q.conditional==="supervisor"&&supervisor===true).length;
 const completedCount=questions.filter(q=>q.conditional===null||
  q.conditional==="clients"&&clients===true||
  q.conditional==="supervisor"&&supervisor===true)
  .filter(q=>Number.isInteger(options[String(q.position)])).length;
 function setGate(kind:"clients"|"supervisor",value:boolean){
  if(kind==="clients"){setClients(value);setOptions(prev=>{
   const next={...prev};
   for(const q of questions.filter(x=>x.conditional==="clients"))delete next[String(q.position)];
   return next;
  });}
  else {setSupervisor(value);setOptions(prev=>{
   const next={...prev};
   for(const q of questions.filter(x=>x.conditional==="supervisor"))delete next[String(q.position)];
   return next;
  });}
  setError("");
 }
 function itemAnswered(item:SurveyItem){
  return Number.isInteger(options[String(item.position)]);
 }
 function validateCurrent():string|null{
  if(active.kind==="clients"&&clients===null)
   return "Indica si atiendes clientes o usuarios.";
  if(active.kind==="supervisor"&&supervisor===null)
   return "Indica si supervisas personal.";
  const relevant=active.kind==="questions"?active.questions:
   active.kind==="clients"&&clients===true?active.questions:
   active.kind==="supervisor"&&supervisor===true?active.questions:[];
  if(relevant.some(q=>!itemAnswered(q)))return "Responde todas las preguntas de esta sección.";
  return null;
 }
 function next(){
  const e=validateCurrent();
  if(e){setError(e);return;}
  setError("");setStep(v=>Math.min(v+1,stages.length-1));
  window.scrollTo({top:0,behavior:"smooth"});
 }
 async function finish(){
  const e=validateCurrent();
  if(e){setError(e);return;}
  if(clients===null||supervisor===null||completedCount!==applicableCount){
   setError("Confirma los filtros y todas las respuestas antes de enviar.");return;
  }
  setBusy(true);setError("");
  try{
   const res=await fetch("/api/evaluacion/nom035-riesgo/submit",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({token,clients,supervisor,options})
   });
   const b=await res.json();
   if(!res.ok||!b.ok)throw Error(b.error||"No se registró el cuestionario.");
   setFinished(true);setOptions({});setClients(null);setSupervisor(null);
   window.scrollTo({top:0,behavior:"smooth"});
  }catch(ex){setError(ex instanceof Error?ex.message:"Error de envío. Conserva la ventana abierta.");}
  finally{setBusy(false);}
 }
 if(finished)return <div className="mt-6 rounded-3xl border border-neutral-200 bg-white p-9 text-center shadow-sm">
  <h2 className="text-2xl font-black text-neutral-800">Cuestionario registrado</h2>
  <p className="mt-4 text-sm leading-7 text-neutral-600">
   Gracias por participar. Tu respuesta se incorporó a los indicadores
   organizacionales de la NOM-035. No se publican calificaciones individuales.
   Puedes cerrar esta ventana.
  </p>
 </div>;
 const sectionQuestions=active.kind==="questions"?active.questions:
  active.kind==="clients"&&clients===true?active.questions:
  active.kind==="supervisor"&&supervisor===true?active.questions:[];
 return <section className="mt-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
  <div className="flex flex-wrap justify-between gap-2 text-sm font-bold text-neutral-700">
   <span>Sección {step+1} de {stages.length}</span>
   <span>{completedCount} de {applicableCount} preguntas aplicables respondidas</span>
  </div>
  <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
   <div className="h-2 rounded-full bg-orange-500"
    style={{width:((step+1)/stages.length*100).toFixed(0)+"%"}}/>
  </div>
  <p className="mt-4 text-xs leading-6 text-neutral-500">
   Selecciona una respuesta por afirmación. Piensa en las condiciones de tu trabajo
   durante los últimos dos meses. No hay respuestas correctas o incorrectas.
  </p>
  {active.kind!=="questions"&&<fieldset className="mt-7 rounded-2xl border border-orange-200 bg-orange-50 p-5">
    <legend className="px-2 text-xs font-black uppercase tracking-wide text-orange-700">
     Pregunta filtro
    </legend>
    <p className="font-black text-neutral-800">
     {active.kind==="clients"?"En mi trabajo debo brindar servicio a clientes o usuarios:":
      "Soy jefe de otros trabajadores:"}
    </p>
    <div className="mt-4 flex gap-3">
     {([{value:true,label:"Sí"},{value:false,label:"No"}] as const).map(v=>
      <label key={v.label} className="flex cursor-pointer items-center gap-3 rounded-xl border border-orange-100 bg-white px-5 py-3 text-sm font-bold">
       <input type="radio" name={active.kind}
        checked={(active.kind==="clients"?clients:supervisor)===v.value}
        onChange={()=>setGate(active.kind as "clients"|"supervisor",v.value)}
        className="accent-orange-600"/>
       {v.label}
      </label>)}
    </div>
    {sectionQuestions.length===0&&(clients===false&&active.kind==="clients"||
       supervisor===false&&active.kind==="supervisor")&&
     <p className="mt-4 text-sm leading-6 text-neutral-600">
      Según la Guía {guide}, estas preguntas no aplican. Puedes continuar.
     </p>}
   </fieldset>}
  <div className="mt-8 space-y-7">
   {sectionQuestions.map(q=><fieldset key={q.position}
    className="border-b border-neutral-100 pb-7">
    <legend className="text-sm font-black leading-7 text-neutral-800">
     {q.position}. {q.prompt}
    </legend>
    <div className="mt-4 grid gap-2 sm:grid-cols-5">
     {NOM035_ANSWER_OPTIONS.map((label,idx)=><label key={label}
      className={"flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-xs leading-5 "+
       (options[String(q.position)]===idx?"border-orange-500 bg-orange-50":"border-neutral-200")}>
      <input className="mt-1 accent-orange-600" type="radio" name={"q"+q.position}
       checked={options[String(q.position)]===idx}
       onChange={()=>{setOptions(prev=>({...prev,[q.position]:idx}));setError("");}}/>
      <span>{label}</span>
     </label>)}
    </div>
   </fieldset>)}
  </div>
  {error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}
  <div className="mt-7 flex flex-wrap justify-between gap-3">
   <button type="button" disabled={step===0||busy}
    onClick={()=>{setStep(s=>Math.max(0,s-1));setError("");window.scrollTo({top:0,behavior:"smooth"});}}
    className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-bold text-neutral-700 disabled:opacity-30">
    ← Anterior
   </button>
   {step<stages.length-1?<button type="button" disabled={busy} onClick={next}
    className="rounded-xl bg-neutral-800 px-6 py-3 text-sm font-black text-white">
    Continuar →
   </button>:
    <button type="button" disabled={busy} onClick={()=>void finish()}
     className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-black text-white disabled:opacity-40">
     {busy?"Registrando...":"Finalizar cuestionario"}
    </button>}
  </div>
  <p className="mt-5 text-xs leading-6 text-neutral-500">
   Las preguntas de atención a clientes y supervisión se muestran solo si aplican.
   Las respuestas individuales no estarán disponibles para los administradores.
  </p>
 </section>;
}
