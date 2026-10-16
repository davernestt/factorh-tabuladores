"use client";
import {useState} from "react";
import Link from "next/link";
type Row={id:string;prompt:string;question_type:string;dimension_id:string|null;sort_order:number};
type Section={id:string;name:string;description:string|null;sort_order:number};
type Answer={question_id:string;text_value:string|null};
type Grade={question_id:string;score:number};
export default function CaseRatingForm({assignmentId,sections,questions,answers,grades,completed}:{
 assignmentId:string;sections:Section[];questions:Row[];answers:Answer[];grades:Grade[];completed:boolean;
}){
 const [scores,setScores]=useState<Record<string,number>>(Object.fromEntries(grades.map(g=>[g.question_id,Number(g.score)])));
 const [pending,setPending]=useState<string|null>(null);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const rubric=questions.filter(q=>q.question_type==="scale");
 const evaluated=rubric.filter(q=>scores[q.id]!=null).length;
 const allDone=completed&&rubric.length>0&&evaluated===rubric.length;
 const responses=new Map(answers.map(a=>[a.question_id,a.text_value]));
 async function grade(questionId:string,score:number){
  if(pending||!completed)return;
  const old=scores[questionId];
  setScores(x=>({...x,[questionId]:score}));
  setPending(questionId);setError("");setNotice("");
  try{
   const res=await fetch(`/api/admin/evaluaciones/${assignmentId}/casos-calificacion`,{
    method:"PATCH",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({questionId,score})
   });
   const data=await res.json();
   if(!res.ok)throw Error(data.error||"No se pudo guardar.");
   if(data.ratedCount===rubric.length)setNotice("Rúbrica completa. El reporte profesional ya puede consultarse.");
  }catch(e){
   setScores(x=>{const copy={...x};if(old===undefined)delete copy[questionId];else copy[questionId]=old;return copy;});
   setError(e instanceof Error?e.message:"Error al guardar calificación.");
  }finally{setPending(null);}
 }
 return <div className="space-y-5">
  <div className="sticky top-3 z-20 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
     <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Revisión exclusivamente FactoRH</p>
     <h2 className="mt-1 text-xl font-black text-neutral-900">Criterios valorados: {evaluated} / {rubric.length}</h2>
     <p className="mt-1 text-sm text-neutral-500">Escala 1 = Evidencia insuficiente · 3 = Respuesta funcional · 5 = Criterio sólido.</p>
    </div>
    {allDone?<Link href={`/protected/evaluaciones/${assignmentId}/reporte`}
     className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white">Ver reporte profesional →</Link>:
     <span className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800">{completed?"Calificación pendiente":"Esperando respuestas del participante"}</span>}
   </div>
   <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full bg-orange-500" style={{width:`${rubric.length?100*evaluated/rubric.length:0}%`}}/></div>
   {error&&<p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
   {notice&&<p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
  </div>
  {sections.map((section,i)=>{
   const qs=questions.filter(q=>q.dimension_id===section.id);
   return <section key={section.id} className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
    <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Caso {i+1}</p>
    <h3 className="mt-2 text-xl font-black">{section.name}</h3>
    {section.description&&<p className="mt-2 whitespace-pre-line text-sm leading-7 text-neutral-600">{section.description}</p>}
    <div className="mt-6 space-y-3">{qs.filter(q=>q.question_type==="text").map(q=>
     <div key={q.id} className="rounded-xl bg-neutral-50 p-4">
      <p className="text-sm font-bold text-neutral-800">{q.prompt}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-neutral-700">{responses.get(q.id)?.trim()||"Respuesta pendiente."}</p>
     </div>)}</div>
    <h4 className="mt-7 text-base font-black text-neutral-900">Valoración profesional del caso</h4>
    <p className="mt-1 text-xs text-neutral-500">Califica lo que demuestra la respuesta, no lo que la persona dice que haría idealmente.</p>
    <div className="mt-4 space-y-4">{qs.filter(q=>q.question_type==="scale").map(q=>
     <div key={q.id} className="rounded-2xl border border-neutral-200 p-4">
      <p className="font-semibold text-neutral-900">{q.prompt}</p>
      <div className="mt-3 grid grid-cols-5 gap-2">{[1,2,3,4,5].map(v=><button
       key={v} type="button" disabled={!completed||Boolean(pending)} onClick={()=>void grade(q.id,v)}
       aria-pressed={scores[q.id]===v}
       className={`rounded-xl border py-3 font-black disabled:cursor-not-allowed disabled:opacity-40 ${scores[q.id]===v?"border-orange-600 bg-orange-600 text-white":"border-neutral-300 text-neutral-700 hover:border-orange-400 hover:bg-orange-50"}`}>{v}</button>)}</div>
      {pending===q.id&&<p className="mt-2 text-xs text-neutral-500">Guardando calificación…</p>}
     </div>)}</div>
   </section>;
  })}
 </div>;
}
