import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { authorized360Admin } from '@/lib/feedback360-auth';

export default function Feedback360Index() {
  return (
    <Suspense fallback={<Loading360 />}>
      <Feedback360IndexContent />
    </Suspense>
  );
}

async function Feedback360IndexContent() {
  if(!await authorized360Admin())redirect('/auth/login');
  const db=createAdminClient();
  const [cyclesR, peopleR, orgsR, ratersR] = await Promise.all([
    db.from('feedback360_cycles').select('id,person_id,organization_id,name,status,created_at').order('created_at',{ascending:false}),
    db.from('people').select('id,first_name,last_name,job_title'),
    db.from('organizations').select('id,name'),
    db.from('feedback360_raters').select('cycle_id,role,status'),
  ]);
  const error=cyclesR.error||peopleR.error||orgsR.error||ratersR.error;
  if(error)return <p className="rounded-2xl bg-red-50 p-6 text-red-700">No pudimos cargar el 360°: {error.message}. ¿Se aplicó la migración SQL?</p>;
  const people=new Map((peopleR.data??[]).map(p=>[p.id,p]));
  const orgs=new Map((orgsR.data??[]).map(p=>[p.id,p.name]));
  const raters=ratersR.data??[];
  return <div>
    <Link href="/protected/evaluaciones" className="text-sm font-bold text-neutral-500 hover:text-orange-600">← Centro de evaluaciones</Link>
    <div className="mt-5 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="text-sm font-bold uppercase tracking-[.16em] text-orange-600">Herramienta 3 · FactoRH</div><h1 className="mt-2 text-3xl font-black text-neutral-800">Evaluación 360°</h1><p className="mt-2 text-neutral-600">Resultados por persona evaluada, integrando autoevaluación, jefe, pares y colaboradores.</p></div><Link href="/protected/360/nueva" className="rounded-xl bg-orange-500 px-5 py-3 text-center font-bold text-white hover:bg-orange-600">+ Nueva evaluación 360°</Link></div>
    <div className="mt-7 grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-neutral-200 bg-white p-5"><div className="text-sm text-neutral-500">Ciclos creados</div><div className="mt-2 text-3xl font-black text-neutral-800">{(cyclesR.data??[]).length}</div></div><div className="rounded-2xl border border-neutral-200 bg-white p-5"><div className="text-sm text-neutral-500">Respuestas terminadas</div><div className="mt-2 text-3xl font-black text-neutral-800">{raters.filter(r=>r.status==='completed').length}</div></div><div className="rounded-2xl border border-neutral-200 bg-white p-5"><div className="text-sm text-neutral-500">Invitaciones pendientes</div><div className="mt-2 text-3xl font-black text-neutral-800">{raters.filter(r=>r.status==='pending').length}</div></div></div>
    <section className="mt-7 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between"><div><div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Inteligencia organizacional</div><h2 className="mt-2 text-xl font-black text-neutral-800">Resultados consolidados por empresa</h2><p className="mt-1 text-sm text-neutral-500">Promedios de todos los ciclos 360° cerrados, fortalezas colectivas, brechas y prioridades transversales.</p></div></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[...new Set((cyclesR.data??[]).map(c=>c.organization_id))].map(orgId=>{const closed=(cyclesR.data??[]).filter(c=>c.organization_id===orgId&&c.status==='closed');return <div key={orgId} className="rounded-2xl border border-neutral-200 p-4"><div className="font-black text-neutral-800">{orgs.get(orgId)??'Empresa'}</div><div className="mt-1 text-sm text-neutral-500">{closed.length} ciclo{closed.length===1?'':'s'} cerrado{closed.length===1?'':'s'}</div>{closed.length>0?<Link href={`/protected/360/empresa/${orgId}`} className="mt-3 inline-block text-sm font-bold text-orange-600 hover:text-orange-700">Ver análisis de empresa →</Link>:<span className="mt-3 inline-block text-sm text-neutral-400">Sin datos cerrados</span>}</div>})}</div></section>
    <section className="mt-7 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm"><header className="border-b border-neutral-200 p-6"><h2 className="font-bold text-neutral-800">Personas evaluadas</h2><p className="mt-1 text-sm text-neutral-500">Una fila por ciclo, no una fila por evaluador.</p></header>
      {(cyclesR.data??[]).length===0?<p className="p-10 text-neutral-500">Todavía no hay ciclos 360°. Crea la primera evaluación para comenzar.</p>:<div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-neutral-50 text-xs uppercase text-neutral-500"><tr><th className="px-5 py-4">Evaluado</th><th className="px-5 py-4">Empresa</th><th className="px-5 py-4">Ciclo</th><th className="px-5 py-4">Avance</th><th className="px-5 py-4">Acción</th></tr></thead><tbody className="divide-y divide-neutral-100">{(cyclesR.data??[]).map(c=>{const p=people.get(c.person_id);const group=raters.filter(r=>r.cycle_id===c.id);const n=group.filter(r=>r.status==='completed').length;return <tr key={c.id}><td className="px-5 py-5"><strong className="text-neutral-800">{p?`${p.first_name} ${p.last_name??''}`:'Sin persona'}</strong><p className="text-xs text-neutral-500">{p?.job_title??'Sin puesto'}</p></td><td className="px-5 py-5 text-neutral-600">{orgs.get(c.organization_id)}</td><td className="px-5 py-5 text-neutral-600">{c.name}<p className="mt-1 text-xs">{c.status==='open'?'En proceso':c.status==='closed'?'Cerrada':'Cancelada'}</p></td><td className="px-5 py-5 text-neutral-600">{n} / {group.length} evaluadores<div className="mt-2 h-2 w-28 overflow-hidden rounded-full bg-neutral-100"><div className="h-full bg-orange-500" style={{width:`${group.length?100*n/group.length:0}%`}} /></div></td><td className="px-5 py-5"><Link href={`/protected/360/${c.id}`} className="font-bold text-orange-600 hover:text-orange-700">Seguimiento y reporte →</Link></td></tr>})}</tbody></table></div>}
    </section>
  </div>;
}

function Loading360(){return <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm"><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500"/><p className="text-neutral-600">Cargando evaluaciones 360°...</p></div>}
