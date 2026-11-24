"use client";
import { useState } from "react";
import Link from "next/link";

const items=[
 {pillar:"Clima",dimension:"Liderazgo inmediato",q:"Mi jefe inmediato me comunica claramente lo que espera de mi trabajo."},
 {pillar:"Clima",dimension:"Comunicación interna",q:"Conozco los canales adecuados para expresar dudas o inquietudes laborales."},
 {pillar:"Clima",dimension:"Condiciones y recursos",q:"Cuento con las herramientas necesarias para desempeñar mis funciones."},
 {pillar:"Clima",dimension:"Reconocimiento y valoración",q:"Recibo comentarios que me ayudan a identificar los aspectos positivos de mi desempeño."},
 {pillar:"Cultura",dimension:"Ética, respeto y justicia",q:"Las personas reciben un trato respetuoso independientemente de su puesto."},
 {pillar:"Cultura",dimension:"Orientación a resultados",q:"Se da seguimiento a los resultados y objetivos de nuestro trabajo."},
 {pillar:"Compromiso",dimension:"Orgullo y pertenencia",q:"Me siento orgulloso de formar parte de esta organización."},
 {pillar:"Compromiso",dimension:"Motivación y contribución",q:"Habitualmente busco maneras de contribuir al logro de los objetivos de mi equipo."},
 {pillar:"Clima",dimension:"Compensaciones, beneficios y equidad",q:"Considero que mi remuneración es justa en relación con las responsabilidades de mi puesto."}
];
const options=["Totalmente en desacuerdo","En desacuerdo","Ni de acuerdo ni en desacuerdo","De acuerdo","Totalmente de acuerdo"];
export default function DemoSurvey(){
 const [answers,setAnswers]=useState<Record<number,number>>({});
 const [finished,setFinished]=useState(false);
 const count=Object.keys(answers).length;
 return <main className="min-h-screen bg-neutral-100 px-4 py-8">
  <div className="mx-auto max-w-3xl space-y-6">
   <header className="rounded-3xl border bg-white p-7">
    <p className="text-2xl font-black text-neutral-700">Facto<span className="text-orange-600">RH</span></p>
    <p className="mt-4 text-xs font-black uppercase tracking-wider text-orange-700">Demostración pública · C3 PRO</p>
    <h1 className="mt-2 text-3xl font-black text-neutral-800">Vista previa de la encuesta</h1>
    <p className="mt-3 text-sm leading-6 text-neutral-600">Muestra de 9 afirmaciones del banco C3 PRO de 56 reactivos. Las respuestas que marques aquí no se guardan ni generan resultados reales. Una aplicación contratada utiliza invitaciones y controles de confidencialidad.</p>
    <p className="mt-3 rounded-xl bg-orange-50 p-4 text-sm font-semibold text-orange-800">DEMO · No introducir datos personales ni información confidencial.</p>
   </header>
   {finished?<section className="rounded-3xl bg-white p-8 text-center shadow-sm">
    <h2 className="text-2xl font-black">¡Recorrido de demostración completado!</h2>
    <p className="mt-3 text-neutral-600">Contestaste {count} afirmaciones de muestra. Ninguna respuesta se envió ni se almacenó.</p>
    <div className="mt-6 flex flex-wrap justify-center gap-3">
     <button type="button" className="rounded-xl border px-5 py-3 font-bold" onClick={()=>{setFinished(false);setAnswers({});}}>Volver a probar</button>
     <Link href="/demo-clima" className="rounded-xl bg-orange-600 px-5 py-3 font-bold text-white">Ver dashboard de muestra</Link>
    </div>
   </section>:<>
    <div className="rounded-xl bg-white p-4 text-sm font-semibold text-neutral-700">Avance: {count} de {items.length} preguntas</div>
    {items.map((item,i)=><fieldset key={i} className="rounded-2xl border border-neutral-200 bg-white p-5">
      <legend className="sr-only">Pregunta {i+1}</legend>
      <p className="text-xs font-extrabold uppercase tracking-wide text-orange-600">{item.pillar} · {item.dimension}</p>
      <h2 className="mt-2 text-base font-bold leading-6 text-neutral-800">{i+1}. {item.q}</h2>
      <div className="mt-4 grid gap-2">{options.map((option,v)=><label key={v} className={"flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm "+(answers[i]===v+1?"border-orange-500 bg-orange-50":"border-neutral-200")}>
       <input type="radio" name={"demo-"+i} checked={answers[i]===v+1} onChange={()=>setAnswers(prev=>({...prev,[i]:v+1}))} className="mt-1 accent-orange-600"/>{option}
      </label>)}</div>
    </fieldset>)}
    <button type="button" disabled={count!==items.length} className="w-full rounded-xl bg-orange-600 p-4 font-bold text-white disabled:opacity-40" onClick={()=>setFinished(true)}>Terminar demostración</button>
   </>}
   <div className="pb-5 text-center text-sm"><Link href="/demo-clima" className="font-bold text-orange-700">← Volver al dashboard de ejemplo</Link></div>
  </div>
 </main>;
}
