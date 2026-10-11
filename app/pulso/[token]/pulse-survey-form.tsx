"use client";
import {useState} from "react";
type Question={position:number;prompt:string;dimension_name:string|null};
const opts=[{value:1,label:"Totalmente en desacuerdo"},{value:2,label:"En desacuerdo"},{value:3,label:"Ni de acuerdo ni en desacuerdo"},{value:4,label:"De acuerdo"},{value:5,label:"Totalmente de acuerdo"}];
export default function PulseSurveyForm({token,questions}:{token:string;questions:Question[]}){
 const [scores,setScores]=useState<Record<number,number>>({});
 const [busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState("");
 const answered=questions.filter(q=>Number.isInteger(scores[q.position])).length;
 async function send(){
  setError("");
  if(answered!==questions.length){setError("Responde todas las afirmaciones para continuar.");return;}
  setBusy(true);
  try{
   const r=await fetch("/api/pulso/submit",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({token,answers:questions.map(q=>({position:q.position,score:scores[q.position]}))})});
   const data=await r.json();
   if(!r.ok)throw Error(data.error||"No se guardó el cuestionario");
   setScores({});setDone(true);
  }catch(e){setError(e instanceof Error?e.message:"Ocurrió un problema. No cierres la ventana.");}
  finally{setBusy(false)}
 }
 if(done)return <section className="mt-5 rounded-3xl bg-white p-10 text-center shadow-sm"><h2 className="text-2xl font-black text-neutral-800">Gracias por participar</h2><p className="mt-3 text-neutral-600">Las respuestas de este pulso se registraron correctamente. Puedes cerrar esta página.</p></section>;
 return <section className="mt-5 space-y-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
  <p className="text-sm font-bold text-neutral-700">Avance: {answered} de {questions.length} preguntas</p>
  <div className="h-2 rounded-full bg-neutral-100"><div className="h-2 rounded-full bg-orange-500" style={{width:Math.round(answered/questions.length*100)+"%"}}/></div>
  <p className="text-xs text-neutral-500">Responde según tu experiencia. Tu información se enviará únicamente al finalizar.</p>
  {questions.map((q,i)=><fieldset key={q.position} className="border-b border-neutral-100 pb-6">
   <legend className="text-sm font-black leading-6 text-neutral-800">{i+1}. {q.prompt}</legend>
   <div className="mt-3 grid gap-2 sm:grid-cols-5">{opts.map(o=><label key={o.value}
    className={"flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-xs leading-5 "+(scores[q.position]===o.value?"border-orange-400 bg-orange-50":"border-neutral-200")}>
    <input type="radio" name={"q"+q.position} value={o.value} checked={scores[q.position]===o.value}
     onChange={()=>{setScores(prev=>({...prev,[q.position]:o.value}));setError("");}}
     className="mt-1 accent-orange-600"/>{o.label}</label>)}</div>
  </fieldset>)}
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
  <button type="button" disabled={busy||answered!==questions.length} onClick={()=>void send()} className="rounded-xl bg-orange-600 px-6 py-3 font-bold text-white disabled:opacity-40">
   {busy?"Enviando...":"Enviar respuestas"}
  </button>
 </section>;
}
