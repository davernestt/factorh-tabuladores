'use client';
import {useEffect,useMemo,useState} from 'react';
import { ANSWER_SCALE, COMPETENCIES_360, FEEDBACK_ROLES, OPEN_QUESTIONS, type FeedbackRole } from '@/lib/feedback360';

type Info={role:FeedbackRole;evaluator_name:string;cycle:string;person_name:string;job_title:string|null;organization:string|null;questions:{key:string;competency_key:string;competency:string;facet:string;prompt:string;self_prompt:string;sort_order:number}[]};
type Answer={value:number|null;not_observed:boolean};
const input='w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-orange-200';
export default function Participant360({token}:{token:string}){
  const [info,setInfo]=useState<Info|null>(null);const [answers,setAnswers]=useState<Record<string,Answer>>({});
  const [comments,setComments]=useState<Record<string,string>>({});const [pending,setPending]=useState(true);
  const [saving,setSaving]=useState(false);const [finished,setFinished]=useState(false);const [error,setError]=useState('');
  useEffect(()=>{let active=true;(async()=>{try{const res=await fetch(`/api/360/${token}`,{cache:'no-store'});const j=await res.json();if(!res.ok)throw new Error(j.error||'No pudo abrirse el cuestionario.');if(active){if(j.completed)setFinished(true);else setInfo(j)}}catch(e){if(active)setError(e instanceof Error?e.message:'No disponible.')}finally{if(active)setPending(false)}})();return()=>{active=false}},[token]);
  const answered=useMemo(()=>Object.keys(answers).length,[answers]);
  function respond(key:string,entry:Answer){setAnswers(prev=>({...prev,[key]:entry}));setError('')}
  async function submit(e:React.FormEvent){e.preventDefault();if(!info)return;
    if(answered!==info.questions.length){setError(`Faltan ${info.questions.length-answered} respuestas. Todas las preguntas deben marcarse, incluso si eliges «No tengo elementos para evaluarlo».`);return;}
    if(!window.confirm('¿Confirmas el envío? Después de finalizar no podrás cambiar tus respuestas.'))return;
    setSaving(true);setError('');
    try{const res=await fetch(`/api/360/${token}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers:info.questions.map(q=>({key:q.key,...answers[q.key]})),comments})});const data=await res.json();if(!res.ok)throw new Error(data.error||'No se pudo guardar.');setFinished(true)}catch(e){setError(e instanceof Error?e.message:'Error al enviar.')}finally{setSaving(false)}
  }
  return <main className="min-h-screen bg-neutral-100 px-4 py-8 text-neutral-800 md:py-12"><div className="mx-auto max-w-4xl">
    <div className="mb-7 flex items-center justify-between"><span className="text-xl font-black tracking-tight text-neutral-700">Factor<span className="text-orange-500">RH</span></span><span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Evaluación 360°</span></div>
    {pending?<div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center text-neutral-500">Cargando tu evaluación…</div>:finished?<div className="rounded-3xl border border-orange-200 bg-white p-10 text-center"><div className="text-4xl">✓</div><h1 className="mt-4 text-2xl font-black">Respuestas enviadas</h1><p className="mt-3 text-neutral-600">Gracias por participar. Tu evaluación ha sido registrada y se integrará al reporte de la persona evaluada.</p></div>:!info?<p role="alert" className="rounded-3xl bg-red-50 p-7 text-red-700">{error||'No se encontró una evaluación activa para esta liga.'}</p>:<form onSubmit={submit}>
      <section className="mb-5 rounded-3xl border border-orange-200 bg-orange-50 p-6 shadow-sm md:p-7">
        <div className="text-xs font-black uppercase tracking-[.16em] text-orange-700">Verifica tu invitación antes de comenzar</div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-orange-100 bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">Esta liga corresponde a</div>
            <div className="mt-2 text-lg font-black text-neutral-800">{info.evaluator_name}</div>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">{info.role==='self'?'Tipo de evaluación':'Vas a evaluar a'}</div>
            <div className="mt-2 text-lg font-black text-neutral-800">{info.role==='self'?'Tu autoevaluación':info.person_name}</div>
            {info.role!=='self'&&info.job_title&&<div className="mt-1 text-xs text-neutral-500">{info.job_title}</div>}
          </div>
          <div className="rounded-2xl border border-orange-100 bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">Tu relación en esta evaluación</div>
            <div className="mt-2 text-lg font-black text-neutral-800">{FEEDBACK_ROLES[info.role]}</div>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-neutral-700">
          {info.role==='self'
            ? <>Hola <strong>{info.evaluator_name}</strong>. Esta liga es personal y corresponde a tu autoevaluación.</>
            : <>Hola <strong>{info.evaluator_name}</strong>. Esta liga es personal para que evalúes a <strong>{info.person_name}</strong>.</>}
          {' '}Si este no es tu nombre o recibiste esta liga por error, no la contestes y solicita la liga correcta al administrador.
        </p>
      </section>

      <header className="rounded-3xl bg-neutral-800 p-7 text-white md:p-9"><div className="text-xs font-bold uppercase tracking-widest text-orange-300">{info.organization} · {FEEDBACK_ROLES[info.role]}</div><h1 className="mt-3 text-3xl font-black">Evaluación 360°</h1><p className="mt-2 text-neutral-200">{info.role==='self'?<>Autoevaluación de: <strong>{info.person_name}</strong></>:<>Evaluador: <strong>{info.evaluator_name}</strong> · Persona evaluada: <strong>{info.person_name}</strong>{info.job_title?` · ${info.job_title}`:''}</>}</p><p className="mt-4 text-sm leading-6 text-neutral-200">Evalúa conductas que hayas observado en el trabajo. 1 = Casi nunca; 4 = Consistentemente. Si no tienes elementos suficientes para evaluar un comportamiento, selecciona «No tengo elementos para evaluarlo». Responde con objetividad. El cuestionario contiene 60 reactivos y suele tomar entre 15 y 20 minutos. El reporte presenta las calificaciones de pares y colaboradores únicamente de manera agregada, con un mínimo de tres respuestas válidas por grupo y competencia.</p></header>
      <div className="sticky top-0 z-10 mt-5 flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white/95 px-5 py-4 shadow-sm backdrop-blur"><div className="min-w-32 text-sm font-bold text-neutral-700">{answered} de {info.questions.length} reactivos</div><div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-orange-500 transition-all" style={{width:`${answered/info.questions.length*100}%`}}/></div><span className="text-xs font-bold text-orange-700">{Math.round(answered/info.questions.length*100)}%</span></div>
      {COMPETENCIES_360.map((c,i)=><section key={c.key} className="mt-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm md:p-7"><div className="text-xs font-bold uppercase tracking-widest text-orange-600">Competencia {i+1} de 12</div><h2 className="mt-2 text-xl font-black text-neutral-800">{c.name}</h2><div className="mt-5 space-y-6">{info.questions.filter(q=>q.competency_key===c.key).map(q=><fieldset className="border-b border-neutral-100 pb-5 last:border-0 last:pb-0" key={q.key}><legend className="mb-3 text-sm font-semibold leading-6 text-neutral-700">{q.sort_order}. {info.role==='self'?q.self_prompt:q.prompt}</legend><div className="grid gap-2 sm:grid-cols-5">{ANSWER_SCALE.map(scale=><label key={scale.value} className={`cursor-pointer rounded-xl border p-3 text-center text-xs font-semibold transition-colors ${answers[q.key]?.value===scale.value&&!answers[q.key]?.not_observed?'border-orange-500 bg-orange-50 text-orange-800':'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'}`}><input type="radio" name={q.key} value={scale.value} className="mr-1 accent-orange-500" checked={answers[q.key]?.value===scale.value&&!answers[q.key]?.not_observed} onChange={()=>respond(q.key,{value:scale.value,not_observed:false})}/>{scale.value}<span className="mt-1 block font-normal">{scale.label}</span></label>)}<label className={`cursor-pointer rounded-xl border p-3 text-center text-xs font-semibold ${answers[q.key]?.not_observed?'border-orange-500 bg-orange-50 text-orange-800':'border-neutral-200 text-neutral-600'}`}><input type="radio" name={q.key} className="mr-1 accent-orange-500" checked={answers[q.key]?.not_observed??false} onChange={()=>respond(q.key,{value:null,not_observed:true})}/>N/O<span className="mt-1 block font-normal">No tengo elementos</span></label></div></fieldset>)}</div></section>)}
      <section className="mt-5 rounded-3xl border border-neutral-200 bg-white p-6"><h2 className="text-xl font-black text-neutral-800">Comentarios abiertos</h2><p className="mt-2 text-sm text-neutral-600">Opcionales. Evita escribir nombres o datos que identifiquen a otros evaluadores.</p><div className="mt-5 space-y-5">{OPEN_QUESTIONS.map(q=><label key={q.key} className="block text-sm font-semibold text-neutral-700">{info.role==='self'?q.selfText:q.text}<textarea rows={3} maxLength={2000} value={comments[q.key]??''} onChange={e=>setComments(v=>({...v,[q.key]:e.target.value}))} className={`${input} mt-2 font-normal`}/></label>)}</div></section>
      {error&&<p role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>}
      <div className="mt-6 flex flex-col items-start gap-3"><button className="rounded-xl bg-orange-500 px-7 py-4 font-black text-white hover:bg-orange-600 disabled:opacity-50" type="submit" disabled={saving||answered!==info.questions.length}>{saving?'Enviando…':'Finalizar evaluación 360°'}</button><p className="text-xs text-neutral-500">Tus respuestas se envían juntas al finalizar. Procura terminar sin cerrar esta página.</p></div>
    </form>}
  </div></main>;
}
