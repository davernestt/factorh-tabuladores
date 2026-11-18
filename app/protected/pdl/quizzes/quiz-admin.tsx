"use client";
import { useEffect,useState } from "react";
type Quiz={quiz_id:string;version:number;title:string;published:boolean;passing_score:number;max_attempts:number};
type Company={id:string;name:string};
type Invite={id:string;organization_id:string;quiz_id:string;participant_name:string;participant_email:string|null;created_at:string;active:boolean;expires_at:string};
type Result={invite_id:string;attempt_number:number;score:number|null;passed:boolean};
type Data={quizzes:Quiz[];organizations:Company[];invites:Invite[];results:Result[]};
const initial:Data={quizzes:[],organizations:[],invites:[],results:[]};
export default function QuizAdmin({canOperate}:{canOperate:boolean}){
 const [data,setData]=useState<Data>(initial),[busy,setBusy]=useState(true),[error,setError]=useState(""),[url,setUrl]=useState("");
 const [organization_id,setOrganization]=useState(""),[quiz_id,setQuiz]=useState("cultura"),[participant_name,setName]=useState(""),[participant_email,setEmail]=useState("");
 async function reload(){
   setBusy(true);try{const r=await fetch("/api/pdl/quizzes",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"No fue posible consultar");setData(d);setOrganization(prev=>prev||d.organizations[0]?.id||"");}catch(e){setError(e instanceof Error?e.message:"Error de consulta");}finally{setBusy(false);}
 }
 useEffect(()=>{void reload()},[]);
 async function invite(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");setUrl("");setBusy(true);
  try{const r=await fetch("/api/pdl/quizzes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({organization_id,quiz_id,participant_name,participant_email})});const d=await r.json();if(!r.ok)throw new Error(d.error||"No se pudo generar");setUrl(d.url);setName("");setEmail("");await reload();}catch(e){setError(e instanceof Error?e.message:"Error al generar");}finally{setBusy(false);}
 }
 return <div className="space-y-7">
  <section className="grid gap-3 md:grid-cols-2">
   {data.quizzes.map(q=><article key={q.quiz_id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
    <h2 className="text-lg font-bold">{q.title}</h2><p className="mt-2 text-sm text-neutral-600">10 preguntas · {q.passing_score}/100 para aprobar · {q.max_attempts} intentos</p>
    <p className={q.published?"mt-3 text-sm font-semibold text-emerald-700":"mt-3 text-sm font-semibold text-amber-700"}>{q.published?"Habilitado para invitaciones":"En revisión: todavía no se envían invitaciones"}</p></article>)}
  </section>
  {canOperate&&<section className="rounded-2xl border border-neutral-200 bg-white p-6">
   <h2 className="text-xl font-bold">Generar invitación individual</h2><p className="mt-1 text-sm text-neutral-500">Cada participante recibe una liga personal. No compartas una misma liga con distintas personas.</p>
   <form onSubmit={invite} className="mt-4 grid gap-4 md:grid-cols-2">
    <label className="text-sm font-semibold">Empresa<select required className="mt-2 w-full rounded-lg border p-3" value={organization_id} onChange={e=>setOrganization(e.target.value)}>{data.organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
    <label className="text-sm font-semibold">Quiz<select required className="mt-2 w-full rounded-lg border p-3" value={quiz_id} onChange={e=>setQuiz(e.target.value)}>{data.quizzes.map(q=><option key={q.quiz_id} value={q.quiz_id} disabled={!q.published}>{q.title}{q.published?"":" (en revisión)"}</option>)}</select></label>
    <label className="text-sm font-semibold">Nombre del participante<input required minLength={2} maxLength={150} className="mt-2 w-full rounded-lg border p-3" value={participant_name} onChange={e=>setName(e.target.value)}/></label>
    <label className="text-sm font-semibold">Correo (opcional)<input type="email" className="mt-2 w-full rounded-lg border p-3" value={participant_email} onChange={e=>setEmail(e.target.value)}/></label>
    <button type="submit" disabled={busy||!organization_id} className="rounded-xl bg-orange-600 px-5 py-3 font-bold text-white disabled:opacity-50">Crear liga</button>
   </form>
   {url&&<div className="mt-5 break-all rounded-xl bg-orange-50 p-4"><p className="font-bold">Liga creada. Cópiala ahora: por seguridad no se vuelve a mostrar.</p><a className="mt-2 block text-orange-700 underline" href={url} target="_blank" rel="noreferrer">{url}</a><button className="mt-3 rounded-lg border px-4 py-2" onClick={()=>navigator.clipboard.writeText(url)} type="button">Copiar liga</button></div>}
  </section>}
  {error&&<p className="rounded-xl bg-red-50 p-4 text-red-700" role="alert">{error}</p>}
  <section className="overflow-x-auto rounded-2xl border bg-white p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Seguimiento de participantes</h2><button className="rounded-lg border px-3 py-2 text-sm" onClick={()=>void reload()} disabled={busy}>Actualizar</button></div>
  <table className="w-full text-left text-sm"><thead><tr className="border-b text-neutral-500"><th className="p-2">Empresa</th><th className="p-2">Participante</th><th className="p-2">Cuestionario</th><th className="p-2">Intentos</th><th className="p-2">Última calificación</th></tr></thead><tbody>
  {data.invites.map(i=>{const scores=data.results.filter(r=>r.invite_id===i.id).sort((a,b)=>b.attempt_number-a.attempt_number);const last=scores[0];return <tr key={i.id} className="border-b"><td className="p-2">{data.organizations.find(o=>o.id===i.organization_id)?.name||"Empresa"}</td><td className="p-2">{i.participant_name}</td><td className="p-2">{data.quizzes.find(q=>q.quiz_id===i.quiz_id)?.title||i.quiz_id}</td><td className="p-2">{scores.length}/2</td><td className="p-2">{last?String(last.score)+"/100 "+(last.passed?"· Aprobado":"· No aprobado"):"Pendiente"}</td></tr>})}
  {!data.invites.length&&<tr><td colSpan={5} className="p-5 text-center text-neutral-500">Aún no hay invitaciones para mostrar.</td></tr>}
  </tbody></table></section>
 </div>;
}