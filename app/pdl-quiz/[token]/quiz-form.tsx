'use client';
import { useRef, useState } from 'react';
import type { Quiz, Result } from '@/lib/pdl-quizzes/types';
type Attempt={attempt_number:number;result:Result};
export default function QuizForm({token,quiz,name,organization,attempts,maxAttempts}:{token:string;quiz:Quiz;name:string;organization:string;attempts:Attempt[];maxAttempts:number}) {
 const [history,setHistory]=useState(attempts),[answering,setAnswering]=useState(attempts.length===0);
 const [answers,setAnswers]=useState<Record<string,number>>({}),[reflection,setReflection]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const requestId=useRef<string|null>(null),inFlight=useRef(false);
 async function submit(event:React.FormEvent) {
  event.preventDefault();if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');
  requestId.current??=crypto.randomUUID();
  try {
   const response=await fetch(`/api/pdl-quizzes/${token}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers,reflection,requestId:requestId.current})});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'No fue posible guardar.');
   setHistory(h=>[data,...h.filter(x=>x.attempt_number!==data.attempt_number)]);setAnswering(false);window.scrollTo({top:0,behavior:'smooth'});
  }catch(e){setError(e instanceof Error?e.message:'No fue posible guardar. Reintenta sin cerrar la página.');}
  finally{inFlight.current=false;setBusy(false);}
 }
 const last=history[0];
 return <main className="min-h-screen bg-neutral-50 px-4 py-10"><div className="mx-auto max-w-3xl space-y-6">
  <header><p className="font-bold text-orange-700">FactoRH · Programa de Desarrollo de Líderes</p><h1 className="mt-3 text-3xl font-bold">{quiz.title}</h1><p className="mt-2">{name} · {organization}</p></header>
  {answering?<form onSubmit={submit} className="space-y-6">
   <div className="rounded-xl border bg-white p-5"><p>10 preguntas · 8–12 minutos · Aprobación: 80/100</p><p>Intento {history.length+1} de {maxAttempts}. Selecciona una respuesta por pregunta.</p><p className="mt-2 text-sm">Tu facilitador podrá consultar tus respuestas y resultados. Esta liga es personal; no la compartas.</p></div>
   <p aria-live="polite">{Object.keys(answers).length} de {quiz.questions.length} contestadas</p>
   {quiz.questions.map((q,i)=><fieldset key={q.id} disabled={busy} className="rounded-xl border bg-white p-5"><legend className="px-2 font-bold">{i+1}. {q.prompt}</legend><div className="space-y-3">{q.options.map((option,index)=><label key={index} className="flex cursor-pointer gap-3 rounded-lg border p-3 hover:bg-orange-50"><input type="radio" required name={q.id} checked={answers[q.id]===index} onChange={()=>setAnswers(a=>({...a,[q.id]:index}))} value={index}/><span>{option}</span></label>)}</div></fieldset>)}
   <label className="block rounded-xl border bg-white p-5 font-bold">¿Qué aplicarás con tu equipo esta semana? <span className="font-normal">(Opcional, sin puntaje)</span><textarea maxLength={2000} value={reflection} disabled={busy} onChange={e=>setReflection(e.target.value)} className="mt-3 w-full rounded border p-3 font-normal" rows={3}/></label>
   {error?<p role="alert" className="text-red-700">{error}</p>:null}
   <button disabled={busy} className="rounded-xl bg-orange-600 px-6 py-4 font-bold text-white disabled:opacity-50">{busy?'Guardando…':'Enviar y ver mi resultado'}</button>
  </form>:last?<section className="space-y-5">
   <div className="rounded-xl border bg-white p-6"><p className="text-4xl font-bold">{last.result.score}/100</p><h2 className="mt-2 text-xl font-bold">{last.result.passed?'Aprobado':'Requiere repaso'}</h2><p>Intento {last.attempt_number} guardado correctamente.</p><p className="mt-3 text-sm">Este resultado refleja aprendizaje del tema; no sustituye la observación de tu desempeño.</p></div>
   {last.result.feedback.map((f,i)=><article key={f.id} className="rounded-xl border bg-white p-5"><h3 className="font-bold">{i+1}. {f.prompt}</h3><p className={f.isCorrect?'text-green-700':'text-red-700'}>{f.isCorrect?'Correcta':'Por reforzar'}</p><p>Tu respuesta: {f.selected}</p>{!f.isCorrect?<p>Respuesta correcta: {f.correct}</p>:null}<p className="mt-2 text-neutral-600">{f.explanation}</p></article>)}
   {last.result.reflection?<p className="rounded-xl bg-orange-50 p-5">Tu compromiso: {last.result.reflection}</p>:null}
   <p>Historial: {history.map(a=>`Intento ${a.attempt_number}: ${a.result.score}/100`).join(' · ')}</p>
   {history.length<maxAttempts?<button onClick={()=>{requestId.current=null;setAnswers({});setReflection('');setError('');setAnswering(true);window.scrollTo(0,0);}} className="rounded-xl bg-orange-600 px-6 py-4 font-bold text-white">Ya repasé; comenzar segundo intento</button>:<p>Has completado los intentos disponibles.</p>}
  </section>:null}
 </div></main>;
}
