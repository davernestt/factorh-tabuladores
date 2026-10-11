"use client";
import {useMemo,useState} from "react";

export type ClimaQuestion={
 position:number;prompt:string;response_type:"likert"|"enps"|"open";
 dimension_name:string|null;
};
const labels=[
 {value:1,name:"Totalmente en desacuerdo"},
 {value:2,name:"En desacuerdo"},
 {value:3,name:"Ni de acuerdo ni en desacuerdo"},
 {value:4,name:"De acuerdo"},
 {value:5,name:"Totalmente de acuerdo"}
];
const step=7;
export default function ClimaPublicForm({token,questions}:{token:string;questions:ClimaQuestion[]}){
 const [scores,setScores]=useState<Record<number,number>>({});
 const [comments,setComments]=useState<Record<number,string>>({});
 const [page,setPage]=useState(0);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const [done,setDone]=useState(false);
 const pages=Math.ceil(questions.length/step);
 const selected=questions.slice(page*step,(page+1)*step);
 const required=useMemo(()=>questions.filter(q=>q.response_type!=="open"),[questions]);
 const answered=required.filter(q=>Number.isInteger(scores[q.position])).length;
 const percentage=Math.round(100*answered/Math.max(required.length,1));
 const missing=selected.filter(q=>q.response_type!=="open"&&!Number.isInteger(scores[q.position]));
 function goNext(){
  if(missing.length){setError("Responde todas las preguntas obligatorias de esta sección.");return;}
  setError("");setPage(p=>Math.min(pages-1,p+1));window.scrollTo(0,0);
 }
 async function send(){
  const omitted=required.filter(q=>!Number.isInteger(scores[q.position]));
  if(omitted.length){
   setPage(Math.floor(questions.findIndex(q=>q.position===omitted[0].position)/step));
   setError("Completa todas las preguntas obligatorias.");
   window.scrollTo(0,0);
   return;
  }
  setBusy(true);setError("");
  try{
   const answers=questions.flatMap(q=>{
    if(q.response_type==="open"){
     const text=(comments[q.position]||"").trim();
     return text?[{position:q.position,text}]:[];
    }
    return [{position:q.position,score:scores[q.position]}];
   });
   const response=await fetch("/api/clima-encuestas/submit",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({token,answers})
   });
   const body=await response.json();
   if(!response.ok)throw Error(body.error||"No fue posible enviar tus respuestas.");
   setDone(true);setScores({});setComments({});
  }catch(e){setError(e instanceof Error?e.message:"Error de envío. Conserva abierta esta página.");}
  finally{setBusy(false)}
 }
 if(done)return <section className="mt-5 rounded-3xl bg-white p-10 text-center shadow-sm">
  <h2 className="text-2xl font-black text-neutral-800">¡Gracias por participar!</h2>
  <p className="mt-4 text-neutral-600">Tus respuestas fueron registradas correctamente. Puedes cerrar esta ventana.</p>
 </section>;
 return <section className="mt-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
  <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-neutral-700">
   <span>Sección {page+1} de {pages}</span>
   <span>{answered} de {required.length} obligatorias · {percentage}%</span>
  </div>
  <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100">
   <div className="h-2 bg-orange-500" style={{width:percentage+"%"}}/>
  </div>
  <p className="mt-3 text-xs leading-6 text-neutral-500">Responde según tu experiencia reciente. El cuestionario se envía únicamente al finalizar. Las preguntas abiertas son opcionales.</p>
  <div className="mt-8 space-y-8">
   {selected.map((q,i)=><fieldset key={q.position} className="border-b border-neutral-100 pb-7">
    <legend className="text-base font-bold leading-7 text-neutral-800">
     {page*step+i+1}. {q.prompt}
    </legend>
    {q.response_type==="likert"&&<div className="mt-4 grid gap-2 sm:grid-cols-5">
     {labels.map(v=><label key={v.value} className={"flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-xs leading-5 "+(scores[q.position]===v.value?"border-orange-500 bg-orange-50":"border-neutral-200")}>
      <input type="radio" name={"q"+q.position} className="mt-1 accent-orange-600"
       value={v.value} checked={scores[q.position]===v.value}
       onChange={()=>{setScores(x=>({...x,[q.position]:v.value}));setError("");}}/>
      {v.name}
     </label>)}
    </div>}
    {q.response_type==="enps"&&<div className="mt-4">
     <p className="mb-3 text-xs text-neutral-500">0 = Nada probable · 10 = Extremadamente probable</p>
     <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
      {Array.from({length:11},(_,v)=><label key={v} className={"flex cursor-pointer flex-col items-center rounded-xl border p-2 text-sm font-bold "+(scores[q.position]===v?"border-orange-500 bg-orange-50":"border-neutral-200")}>
       <input type="radio" className="sr-only" name={"q"+q.position} value={v}
        checked={scores[q.position]===v} onChange={()=>{setScores(x=>({...x,[q.position]:v}));setError("");}}/>{v}
      </label>)}
     </div>
    </div>}
    {q.response_type==="open"&&<label className="mt-4 block">
     <span className="text-xs font-bold text-neutral-500">Respuesta abierta opcional · Evita escribir nombres u otros datos personales.</span>
     <textarea rows={3} maxLength={1000} value={comments[q.position]||""}
      onChange={e=>setComments(prev=>({...prev,[q.position]:e.target.value}))}
      placeholder="Tu comentario (opcional)"
      className="mt-3 w-full rounded-xl border border-neutral-300 p-3 text-sm text-neutral-800"/>
    </label>}
   </fieldset>)}
  </div>
  {error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
  <div className="mt-5 flex flex-wrap justify-between gap-3">
   <button type="button" onClick={()=>{setPage(p=>Math.max(p-1,0));setError("");window.scrollTo(0,0)}}
    disabled={page===0||busy} className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-bold text-neutral-700 disabled:opacity-30">Anterior</button>
   {page<pages-1?<button type="button" onClick={goNext} disabled={busy}
    className="rounded-xl bg-neutral-800 px-6 py-3 text-sm font-bold text-white">Continuar →</button>:
    <button type="button" onClick={()=>void send()} disabled={busy||answered<required.length}
     className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-40">
     {busy?"Enviando...":"Enviar respuestas"}
    </button>}
  </div>
 </section>;
}
