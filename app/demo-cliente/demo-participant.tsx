"use client";

import {useState} from "react";
import Link from "next/link";

const sample=[
 {question:"Cuando detectas un error importante en una tarea, ¿qué haces primero?",choices:["Lo comunico y propongo una solución","Espero a ver si alguien lo nota","Cambio de actividad sin avisar"]},
 {question:"Si recibes instrucciones contradictorias, ¿cómo actuarías?",choices:["Aclaro prioridades antes de continuar","Elijo una instrucción al azar","Suspendo todo sin comunicarlo"]},
 {question:"Al colaborar con un equipo nuevo, ¿qué práctica te resulta más útil?",choices:["Acordar objetivos y responsabilidades","Evitar compartir avances","Trabajar sin coordinación"]},
];
export default function DemoParticipant(){
 const [answers,setAnswers]=useState<Record<number,number>>({});
 const [finished,setFinished]=useState(false);
 return <div className="space-y-6">
   <div className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
     <p className="text-xs font-black uppercase tracking-widest text-orange-600">FactoRH · Vista del participante</p>
     <h1 className="mt-3 text-3xl font-black text-neutral-900">Ejemplo de evaluación laboral</h1>
     <p className="mt-3 text-sm leading-7 text-neutral-600">Esta es una actividad ilustrativa de tres preguntas, no un instrumento psicométrico validado. Los cuestionarios reales pueden tener otras preguntas, escalas y duraciones.</p>
   </div>
   {!finished?<form onSubmit={e=>{e.preventDefault();setFinished(true)}} className="space-y-4">
    {sample.map((q,i)=><fieldset key={i} className="rounded-3xl border border-neutral-200 bg-white p-6">
     <legend className="sr-only">Pregunta {i+1}</legend>
     <p className="text-xs font-bold uppercase tracking-wider text-orange-600">Pregunta {i+1} de {sample.length}</p>
     <h2 className="mt-3 text-lg font-bold text-neutral-900">{q.question}</h2>
     <div className="mt-4 space-y-2">{q.choices.map((choice,j)=><label key={j} className={"flex cursor-pointer gap-3 rounded-xl border px-4 py-3 text-sm "+(answers[i]===j?"border-orange-400 bg-orange-50":"border-neutral-200")}>
      <input type="radio" name={`question-${i}`} checked={answers[i]===j} onChange={()=>setAnswers(a=>({...a,[i]:j}))} className="accent-orange-600"/>
      {choice}
     </label>)}</div>
    </fieldset>)}
    <button type="submit" disabled={Object.keys(answers).length!==sample.length} className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50">Terminar simulación</button>
   </form>:<section className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
    <p className="text-xs font-bold uppercase tracking-wider text-orange-600">Simulación finalizada</p>
    <h2 className="mt-2 text-2xl font-black text-neutral-900">Así se confirma una evaluación completada</h2>
    <p className="mt-3 text-sm leading-7 text-neutral-600">Las respuestas de esta actividad no se guardaron y no se generan puntajes psicológicos. En un proceso real la plataforma registraría el avance y prepararía los resultados correspondientes.</p>
    <Link href="/demo-cliente?seccion=resultados" className="mt-5 inline-flex rounded-xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white">Ver un reporte ilustrativo →</Link>
   </section>}
 </div>;
}
