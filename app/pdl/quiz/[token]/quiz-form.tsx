"use client";
import { useState } from "react";

type Question={position:number;question:string;options:{value:string;label:string}[]};
export default function QuizForm({token,questions}:{token:string;questions:Question[]}){
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [saving,setSaving]=useState(false);
  const [result,setResult]=useState<{score:number;passed:boolean;attempt_number:number}|null>(null);
  const [error,setError]=useState("");
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(Object.keys(answers).length!==questions.length){setError("Contesta todas las preguntas");return;}
    setSaving(true);setError("");
    const request_id=crypto.randomUUID();
    try{
      const r=await fetch("/api/pdl/quiz",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,answers,request_id})});
      const data=await r.json();
      if(!r.ok)throw new Error(data.error||"No se pudo registrar");
      setResult(data);
    }catch(e){setError(e instanceof Error?e.message:"No se pudo guardar");}
    finally{setSaving(false);}
  }
  if(result)return <section className="mt-8 rounded-2xl bg-orange-50 p-7" role="status"><h2 className="text-2xl font-bold">Respuestas registradas</h2><p className="mt-3 text-lg">Calificación: <strong>{result.score}/100</strong></p><p>{result.passed?"Aprobado":"No aprobado"} · Intento {result.attempt_number}</p><p className="mt-3 text-sm">Tu resultado se guardó correctamente. Recursos Humanos podrá consultarlo.</p></section>;
  return <form className="mt-7 space-y-6" onSubmit={submit}>
    {questions.map((q,i)=><fieldset key={q.position} className="rounded-xl border border-neutral-200 p-5">
      <legend className="px-2 font-bold">{i+1}. {q.question}</legend>
      <div className="mt-3 space-y-3">{q.options.map(o=><label key={o.value} className="flex cursor-pointer items-start gap-3 text-sm"><input type="radio" className="mt-1 accent-orange-600" name={"q"+q.position} value={o.value} checked={answers[String(q.position)]===o.value} onChange={()=>setAnswers(prev=>({...prev,[q.position]:o.value}))} required/>{o.label}</label>)}</div>
    </fieldset>)}
    {error&&<p className="rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>}
    <button disabled={saving||Object.keys(answers).length!==questions.length} className="rounded-xl bg-orange-600 px-7 py-3 font-bold text-white disabled:opacity-50">{saving?"Guardando...":"Enviar respuestas"}</button>
  </form>;
}
