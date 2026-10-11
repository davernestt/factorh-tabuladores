"use client";
import {useState} from "react";
import {
 GUIDE1_QUESTIONS,GUIDE1_SECTION_NAMES,GUIDE1_EVENT_QUESTION,
 GUIDE1_EVENT_EXAMPLES,scoreNom035Guide1,
 type Nom035Guide1Section
} from "@/lib/nom035/guide1";

export default function Guide1PrivateForm({token,contact,instructions}:{
 token:string;contact:string;instructions:string
}){
 const [exposed,setExposed]=useState<boolean|null>(null);
 const [answers,setAnswers]=useState<Record<string,boolean>>({});
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [finished,setFinished]=useState<boolean|null>(null);
 const answered=GUIDE1_QUESTIONS.filter(q=>typeof answers[q.code]==="boolean").length;
 async function submit(){
  if(exposed===null)return setError("Responde la pregunta inicial.");
  if(exposed&&answered!==GUIDE1_QUESTIONS.length)
   return setError("Contesta todas las preguntas de las secciones II, III y IV.");
  try{
   scoreNom035Guide1(exposed,exposed?answers:{});
  }catch{
   return setError("Faltan preguntas por contestar.");
  }
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/evaluacion/nom035-i/submit",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({token,exposed,answers:exposed?answers:{}})
   });
   const body=await response.json();
   if(!response.ok)throw Error(body.error||"No se guardó el cuestionario.");
   setFinished(Boolean(body.needsReferral));
   setExposed(null);setAnswers({});
   window.scrollTo({top:0,behavior:"smooth"});
  }catch(e){
   setError(e instanceof Error?e.message:"Error de envío. No cierres la página.");
  }finally{setBusy(false)}
 }
 if(finished!==null)return <section className="mt-6 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm sm:p-10">
  <p className="text-xs font-black uppercase tracking-[.15em] text-orange-600">Cuestionario registrado</p>
  <h2 className="mt-4 text-2xl font-black text-neutral-800">Gracias por participar</h2>
  {finished?<div className="mt-5 rounded-2xl border-l-4 border-orange-500 bg-orange-50 p-5">
    <h3 className="text-lg font-black text-neutral-800">Se recomienda solicitar valoración clínica</h3>
    <p className="mt-3 text-sm leading-7 text-neutral-700">
      Tus respuestas cumplen uno de los criterios de referencia de la Guía I.
      Esto no es un diagnóstico ni significa que tengas una enfermedad.
      Es importante buscar orientación de un profesional de salud autorizado.
    </p>
    <p className="mt-4 text-sm font-black text-neutral-800">Servicio de atención: {contact}</p>
    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-neutral-700">{instructions}</p>
    <p className="mt-4 text-xs leading-6 text-neutral-600">
      Si te encuentras en peligro inmediato o necesitas atención urgente, utiliza los servicios
      de emergencia de tu localidad.
    </p>
   </div>:
   <p className="mt-5 text-sm leading-7 text-neutral-600">
    Con las respuestas registradas no se activó el criterio de referencia clínica
    de esta guía. Este resultado no sustituye una consulta profesional; si experimentas
    molestias o necesitas apoyo, puedes comunicarte con {contact}.
   </p>}
  <div className="mt-6 rounded-xl bg-neutral-50 p-4 text-xs leading-6 text-neutral-600">
   El formulario no conservó un expediente clínico ni almacenó los detalles de tus
   respuestas en el panel de FactoRH. Para documentar una canalización nominal,
   comunícate voluntariamente con el servicio responsable siguiendo el protocolo del centro.
  </div>
 </section>;
 const sections:["II","III","IV"]=["II","III","IV"];
 return <section className="mt-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-9">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <h2 className="text-xl font-black text-neutral-800">Cuestionario de referencia</h2>
   <span className="rounded-xl bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-600">
    {exposed===true?answered+" de 14 preguntas complementarias":"Pregunta inicial"}
   </span>
  </div>
  <p className="mt-3 text-sm leading-7 text-neutral-600">
   Responde conforme a tu experiencia. La pregunta inicial se refiere a hechos
   durante o con motivo del trabajo; las demás secciones, si corresponden,
   hacen referencia al último mes.
  </p>
  <fieldset className="mt-7 rounded-2xl border border-neutral-200 p-5">
   <legend className="px-2 text-xs font-black uppercase tracking-[.13em] text-orange-600">
    I. Acontecimiento traumático severo
   </legend>
   <p className="text-base font-black leading-7 text-neutral-800">{GUIDE1_EVENT_QUESTION}</p>
   <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-neutral-600">
    {GUIDE1_EVENT_EXAMPLES.map(example=><li key={example}>{example}</li>)}
   </ul>
   <div className="mt-5 grid grid-cols-2 gap-3">
    {([{value:true,label:"Sí"},{value:false,label:"No"}] as const).map(a=>
      <label key={a.label} className={"flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm font-bold "+
        (exposed===a.value?"border-orange-500 bg-orange-50":"border-neutral-200")}>
       <input type="radio" name="event" checked={exposed===a.value}
        onChange={()=>{setExposed(a.value);setAnswers({});setError("");}}
        className="accent-orange-600"/>
       {a.label}
      </label>)}
   </div>
  </fieldset>
  {exposed===false&&<p className="mt-5 rounded-xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
   De acuerdo con la Guía I, no es necesario responder las siguientes secciones
   cuando no se reporta un acontecimiento de la sección inicial.
  </p>}
  {exposed===true&&<div className="mt-8 space-y-7">
    {sections.map(section=><section key={section}
      className="rounded-2xl border border-neutral-200 p-5">
     <h3 className="text-base font-black text-neutral-800">
      {section}. {GUIDE1_SECTION_NAMES[section as Nom035Guide1Section]}
     </h3>
     <div className="mt-5 space-y-5">
      {GUIDE1_QUESTIONS.filter(q=>q.section===section).map((question,i)=>
       <fieldset key={question.code} className="border-b border-neutral-100 pb-5 last:border-0 last:pb-0">
        <legend className="text-sm font-semibold leading-6 text-neutral-800">
         {i+1}. {question.question}
        </legend>
        <div className="mt-3 flex flex-wrap gap-4">
         {([{value:true,label:"Sí"},{value:false,label:"No"}] as const).map(a=>
          <label key={a.label} className={"flex min-w-28 cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold "+
           (answers[question.code]===a.value?"border-orange-500 bg-orange-50":"border-neutral-200")}>
           <input type="radio" name={question.code} className="accent-orange-600"
            checked={answers[question.code]===a.value}
            onChange={()=>{setAnswers(v=>({...v,[question.code]:a.value}));setError("");}}/>
           {a.label}
          </label>)}
        </div>
       </fieldset>)}
     </div>
    </section>)}
   </div>}
  {error&&<p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
  <div className="mt-8 border-t border-neutral-200 pt-6">
   <button type="button" onClick={()=>void submit()} disabled={busy||exposed===null||
     (exposed===true&&answered!==GUIDE1_QUESTIONS.length)}
    className="w-full rounded-xl bg-orange-600 px-6 py-4 text-sm font-black text-white hover:bg-orange-700 disabled:opacity-40 sm:w-auto">
    {busy?"Enviando de forma confidencial...":"Enviar cuestionario"}
   </button>
   <p className="mt-3 text-xs leading-6 text-neutral-500">
    Una vez enviado, el enlace se cierra y no será posible consultar respuestas individuales.
   </p>
  </div>
 </section>;
}
