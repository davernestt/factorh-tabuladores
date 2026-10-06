'use client';
import { useState } from 'react';
import Link from 'next/link';
import { FEEDBACK_ROLES, type FeedbackRole } from '@/lib/feedback360';

type Organization={id:string;name:string};
type Person={id:string;organization_id:string;first_name:string;last_name:string|null;email:string|null;job_title:string|null};
type Rater = { id:number; role:FeedbackRole; name:string; email:string };
type Invite={role:FeedbackRole;name:string;email:string|null;url:string};
const btn='rounded-xl bg-orange-500 px-5 py-3 font-bold text-white hover:bg-orange-600 disabled:opacity-50';
const input='w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-800 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100';
let idx=1;
const fresh=(role:FeedbackRole):Rater=>({id:idx++,role,name:'',email:''});
export default function New360Form({organizations,people}:{organizations:Organization[];people:Person[]}){
  const [org,setOrg]=useState('');const [person,setPerson]=useState('');const [name,setName]=useState('Evaluación 360°');
  const [dueDate,setDueDate]=useState('');const [raters,setRaters]=useState<Rater[]>([fresh('manager')]);
  const [saving,setSaving]=useState(false);const [error,setError]=useState('');const [invites,setInvites]=useState<Invite[]|null>(null);
  const [cycleId,setCycleId]=useState('');
  const validPeople=people.filter(p=>p.organization_id===org);
  const selected=validPeople.find(p=>p.id===person);
  const personName=selected?`${selected.first_name} ${selected.last_name??''}`.trim():'';
  const update=(id:number,changes:Partial<Rater>)=>setRaters(rows=>rows.map(r=>r.id===id?{...r,...changes}:r));
  async function submit(e:React.FormEvent){
    e.preventDefault();setError('');if(!selected){setError('Selecciona una persona.');return;}
    if(raters.some(r=>!r.name.trim())){setError('Escribe el nombre de todos los evaluadores agregados.');return;}
    setSaving(true);
    try{
      const payload={organization_id:org,person_id:person,name,due_date:dueDate,
        raters:[{role:'self' as FeedbackRole,name:personName,email:selected.email||''},...raters.map(({role,name,email})=>({role,name,email}))]};
      const res=await fetch('/api/admin/360',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await res.json();if(!res.ok)throw new Error(data.error||'No se pudo crear el ciclo.');
      setInvites(data.invitations);setCycleId(data.cycle_id);
    }catch(err){setError(err instanceof Error?err.message:'Error inesperado.');}finally{setSaving(false)}
  }
  if(invites)return <section className="rounded-3xl border border-orange-200 bg-white p-6 shadow-sm md:p-8">
    <div className="text-xs font-bold uppercase tracking-wider text-orange-600">Ciclo creado correctamente</div>
    <h2 className="mt-2 text-2xl font-black text-neutral-800">Invitaciones individuales</h2>
    <p className="mt-3 max-w-3xl text-sm text-neutral-600">Copia las ligas y envíalas a sus evaluadores. Por seguridad solo se muestran en este momento. Guárdalas antes de salir: la base de datos conserva únicamente la huella criptográfica del token.</p>
    <div className="mt-6 space-y-3">{invites.map((r,i)=><div key={i} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 md:flex md:items-center md:justify-between md:gap-4">
      <div><p className="font-bold text-neutral-800">{r.name} <span className="ml-2 text-xs font-medium text-neutral-500">{FEEDBACK_ROLES[r.role]}</span></p><p className="mt-1 max-w-lg break-all text-xs text-neutral-500">{r.url}</p></div>
      <button type="button" className="mt-3 rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-bold text-neutral-700 hover:border-orange-400 md:mt-0" onClick={()=>void navigator.clipboard.writeText(r.url)}>Copiar liga</button>
    </div>)}</div>
    <div className="mt-7"><Link href={`/protected/360/${cycleId}`} className={btn}>Ver seguimiento y reporte →</Link></div>
  </section>;
  return <form onSubmit={submit} className="space-y-6">
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8"><h2 className="text-xl font-black text-neutral-800">1. Persona evaluada</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-bold text-neutral-700">Empresa<select required className={`${input} mt-2`} value={org} onChange={e=>{setOrg(e.target.value);setPerson('')}}><option value="">Seleccionar empresa</option>{organizations.map(o=><option value={o.id} key={o.id}>{o.name}</option>)}</select></label>
        <label className="text-sm font-bold text-neutral-700">Persona evaluada<select required className={`${input} mt-2`} value={person} onChange={e=>setPerson(e.target.value)}><option value="">Seleccionar persona</option>{validPeople.map(p=><option value={p.id} key={p.id}>{`${p.first_name} ${p.last_name??''}`.trim()} {p.job_title?`· ${p.job_title}`:''}</option>)}</select></label>
        <label className="text-sm font-bold text-neutral-700">Nombre del ciclo<input required maxLength={150} className={`${input} mt-2`} value={name} onChange={e=>setName(e.target.value)}/></label>
        <label className="text-sm font-bold text-neutral-700">Fecha límite (opcional)<input type="date" className={`${input} mt-2`} value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label>
      </div><p className="mt-4 text-sm text-neutral-500">Autoevaluación: {personName||'Se agregará al elegir a la persona'}. Su invitación se generará automáticamente.</p>
    </section>
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8"><h2 className="text-xl font-black text-neutral-800">2. Evaluadores externos</h2>
      <p className="mt-2 text-sm text-neutral-600">Agrega jefe, pares y colaboradores. Para reportar una categoría anónima por separado necesitamos al menos tres respuestas válidas de esa categoría.</p>
      <div className="mt-5 space-y-4">{raters.map(r=><div key={r.id} className="grid gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 md:grid-cols-[160px_1fr_1fr_auto] md:items-end">
        <label className="text-xs font-bold text-neutral-600">Relación<select className={`${input} mt-1`} value={r.role} onChange={e=>update(r.id,{role:e.target.value as FeedbackRole})}>{(['manager','peer','report'] as FeedbackRole[]).map(role=><option key={role} value={role}>{FEEDBACK_ROLES[role]}</option>)}</select></label>
        <label className="text-xs font-bold text-neutral-600">Nombre<input className={`${input} mt-1`} value={r.name} onChange={e=>update(r.id,{name:e.target.value})} required placeholder="Nombre del evaluador" /></label>
        <label className="text-xs font-bold text-neutral-600">Correo (opcional)<input type="email" className={`${input} mt-1`} value={r.email} onChange={e=>update(r.id,{email:e.target.value})} placeholder="correo@empresa.com" /></label>
        <button type="button" onClick={()=>setRaters(xs=>xs.filter(x=>x.id!==r.id))} className="rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-600 hover:text-red-600">Quitar</button>
      </div>)}</div>
      <div className="mt-5 flex flex-wrap gap-2">{(['manager','peer','report'] as FeedbackRole[]).map(role=><button key={role} type="button" onClick={()=>setRaters(r=>[...r,fresh(role)])} className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700 hover:bg-orange-100">+ {FEEDBACK_ROLES[role]}</button>)}</div>
    </section>
    {error&&<p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
    <div className="flex flex-wrap items-center gap-4"><button className={btn} type="submit" disabled={saving}>{saving?'Creando...':'Crear evaluación y generar ligas'}</button><span className="text-sm text-neutral-500">Se crean {raters.length+1} invitaciones independientes.</span></div>
  </form>;
}
