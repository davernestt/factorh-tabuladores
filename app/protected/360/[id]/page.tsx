import Link from 'next/link';
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { authorized360Admin } from '@/lib/feedback360-auth';
import { FEEDBACK_ROLES, interpret360, type FeedbackRole } from '@/lib/feedback360';
import { band360, professional360, summarize360 } from '@/lib/feedback360-report';
import { CompetencyBars, GapBars, Radar360 } from './report-visuals';
import CycleActions from './cycle-actions';
import InviteActions from './invite-actions';
import './print.css';

type PageProps = { params: Promise<{ id: string }> };

export default function Feedback360Detail(props: PageProps) {
  return (
    <Suspense fallback={<Loading360 message="Cargando seguimiento y reporte 360°..." />}>
      <Feedback360DetailContent {...props} />
    </Suspense>
  );
}

async function Feedback360DetailContent({ params }: PageProps) {
  if(!await authorized360Admin()) redirect('/auth/login');
  const {id}=await params;
  const db=createAdminClient();
  const {data:cycle,error:cycleError}=await db.from('feedback360_cycles')
    .select('id,organization_id,person_id,name,status,due_date,created_at,closed_at,instrument_version')
    .eq('id',id).maybeSingle();
  if(cycleError) return <ErrorBox message={cycleError.message}/>;
  if(!cycle) notFound();

  const [personR,orgR,ratersR]=await Promise.all([
    db.from('people').select('first_name,last_name,job_title,area').eq('id',cycle.person_id).single(),
    db.from('organizations').select('name').eq('id',cycle.organization_id).single(),
    db.from('feedback360_raters').select('id,role,evaluator_name,evaluator_email,status,completed_at').eq('cycle_id',id).order('created_at'),
  ]);
  const firstError=personR.error||orgR.error||ratersR.error;
  if(firstError) return <ErrorBox message={firstError.message}/>;

  const raters=(ratersR.data??[]) as {id:string;role:FeedbackRole;evaluator_name:string;evaluator_email:string|null;status:string;completed_at:string|null}[];
  const raterIds=raters.map(r=>r.id);
  const [answersR,commentsR]=raterIds.length?await Promise.all([
    db.from('feedback360_answers').select('rater_id,item_key,rating,not_observed').in('rater_id',raterIds),
    db.from('feedback360_comments').select('rater_id,question_key,comment').in('rater_id',raterIds),
  ]):[{data:[],error:null},{data:[],error:null}];
  if(answersR.error||commentsR.error)return <ErrorBox message={answersR.error?.message??commentsR.error?.message??'Error al cargar resultados.'}/>;

  const closed=cycle.status==='closed';
  const summary=summarize360(raters,answersR.data??[],closed);
  const analysis=closed?interpret360(summary.dimensions):null;
  const professional=closed?professional360(summary.dimensions):null;
  const person=personR.data;
  const personName=`${person.first_name} ${person.last_name??''}`.trim();

  return <div className="space-y-7">
    <div className="no-print"><Link href="/protected/360" className="text-sm font-bold text-neutral-500 hover:text-orange-600">← Volver a Evaluación 360°</Link></div>

    <header className="rounded-3xl bg-neutral-800 p-7 text-white md:p-9">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[.18em] text-orange-300">FactorRH · Evaluación 360° v{cycle.instrument_version}</div>
          <h1 className="mt-3 text-3xl font-black">{personName}</h1>
          <p className="mt-2 text-neutral-300">{[person.job_title,person.area].filter(Boolean).join(' · ')||'Sin puesto registrado'}</p>
          <p className="mt-1 text-sm text-neutral-400">{orgR.data.name} · {cycle.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold">{closed?'Ciclo cerrado':'En proceso'}</span>
          <CycleActions id={cycle.id} status={cycle.status}/>
        </div>
      </div>
    </header>

    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {(['self','manager','peer','report'] as FeedbackRole[]).map(role=><div key={role} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-semibold text-neutral-500">{FEEDBACK_ROLES[role]}</div>
        <div className="mt-2 text-3xl font-black text-neutral-800">{summary.byRole[role].completed}<span className="text-base font-semibold text-neutral-400"> / {summary.byRole[role].invited}</span></div>
      </div>)}
    </section>

    <section className="rounded-3xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 p-6"><h2 className="text-xl font-black text-neutral-800">Seguimiento de evaluadores</h2><p className="mt-1 text-sm text-neutral-500">Las ligas son individuales. Las respuestas de pares y colaboradores nunca se muestran por persona.</p></div>
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm">
        <thead className="bg-neutral-50 text-xs uppercase text-neutral-500"><tr><th className="px-5 py-4">Evaluador</th><th className="px-5 py-4">Relación</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4 no-print">Acción</th></tr></thead>
        <tbody className="divide-y divide-neutral-100">{raters.map(r=><tr key={r.id}>
          <td className="px-5 py-4"><div className="font-bold text-neutral-800">{r.evaluator_name}</div><div className="text-xs text-neutral-500">{r.evaluator_email??'Sin correo'}</div></td>
          <td className="px-5 py-4 text-neutral-600">{FEEDBACK_ROLES[r.role]}</td>
          <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${r.status==='completed'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{r.status==='completed'?'Completada':'Pendiente'}</span></td>
          <td className="px-5 py-4 no-print">{r.status==='pending'&&cycle.status==='open'?<InviteActions id={cycle.id} raterId={r.id}/>:<span className="text-xs text-neutral-400">—</span>}</td>
        </tr>)}</tbody>
      </table></div>
    </section>

    {!closed?<section className="rounded-3xl border border-orange-200 bg-orange-50 p-7">
      <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-700">Confidencialidad activa</div>
      <h2 className="mt-2 text-xl font-black text-neutral-800">El reporte consolidado se libera al cerrar el ciclo</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-700">Mientras el ciclo permanece abierto sólo mostramos avance. Al cerrar el ciclo se liberan los resultados consolidados. Si un grupo de pares o colaboradores tiene menos de tres respuestas, el resultado se muestra con una advertencia de muestra reducida.</p>
    </section>:<>
      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between"><div><div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Reporte consolidado</div><h2 className="mt-2 text-2xl font-black text-neutral-800">12 competencias</h2></div><button className="no-print rounded-xl border border-neutral-300 px-4 py-2 text-sm font-bold text-neutral-700" onClick={undefined}>Usa Imprimir del navegador para PDF</button></div>
        {summary.smallSampleGroups.length>0&&<p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800"><strong>Muestra reducida:</strong> {summary.smallSampleGroups.map(r=>`${FEEDBACK_ROLES[r]} (n=${summary.byRole[r].completed})`).join(', ')}. Los resultados sí se muestran, pero deben interpretarse con cautela porque representan a menos de tres evaluadores.</p>}
        <div className="mt-6 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-neutral-50 text-xs uppercase text-neutral-500"><tr><th className="px-4 py-3">Competencia</th><th className="px-4 py-3">AUTO</th><th className="px-4 py-3">Jefe</th><th className="px-4 py-3">Pares</th><th className="px-4 py-3">Colaboradores</th><th className="px-4 py-3">Brecha</th></tr></thead><tbody className="divide-y divide-neutral-100">{summary.dimensions.map(d=><tr key={d.key}><td className="px-4 py-4 font-bold text-neutral-800">{d.name}</td>{(['self','manager','peer','report'] as FeedbackRole[]).map(role=><td key={role} className="px-4 py-4 text-neutral-700">{d.scores[role]!==undefined?<><strong>{d.scores[role]!.toFixed(2)}</strong><div className="text-xs text-neutral-400">{band360(d.scores[role]!)}{(role==='peer'||role==='report')&&d.counts[role] ? ` · n=${d.counts[role]}` : ''}</div></>:'—'}</td>)}<td className="px-4 py-4 font-bold text-neutral-700">{d.gap===null?'—':d.gap>0?`+${d.gap.toFixed(2)}`:d.gap.toFixed(2)}</td></tr>)}</tbody></table></div>
      </section>

      {professional&&<section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl"><div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Lectura ejecutiva</div><h2 className="mt-2 text-3xl font-black text-neutral-800">{professional.headline}</h2><div className="mt-5 space-y-3 text-sm leading-7 text-neutral-600">{professional.executiveSummary.map((p,i)=><p key={i}>{p}</p>)}</div></div>
          <div className="min-w-[190px] rounded-2xl bg-neutral-800 p-6 text-white"><div className="text-xs font-bold uppercase tracking-[.14em] text-orange-300">Índice del entorno</div><div className="mt-2 text-5xl font-black">{professional.overall?.toFixed(2)??'—'}</div><div className="mt-1 text-sm text-neutral-300">sobre 4.00</div></div>
        </div>
      </section>}

      {professional&&<section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"><div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Mapa 360°</div><h2 className="mt-2 text-xl font-black text-neutral-800">Percepción por fuente</h2><p className="mt-1 text-sm text-neutral-500">Compara la forma en que la persona se observa con la experiencia de jefe, pares y colaboradores.</p><div className="mt-5"><Radar360 dimensions={summary.dimensions}/></div></div>
        <div className="space-y-5"><div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"><div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Ranking</div><h2 className="mt-2 text-xl font-black text-neutral-800">Competencias según el entorno</h2><div className="mt-5"><CompetencyBars dimensions={summary.dimensions}/></div></div><div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"><div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Autopercepción</div><h2 className="mt-2 text-xl font-black text-neutral-800">Brechas Auto vs entorno</h2><p className="mt-1 text-xs text-neutral-500">Positivo = la persona se califica por encima del entorno. | ≥0.70 = conversación prioritaria.</p><div className="mt-5"><GapBars dimensions={summary.dimensions}/></div></div></div>
      </section>}

      {analysis&&<section className="grid gap-5 lg:grid-cols-3">
        <Insight title="Fortalezas validadas" items={analysis.strengths.map(x=>`${x.name} · ${x.external.toFixed(2)}`)}/>
        <Insight title="Prioridades de desarrollo" items={analysis.priorities.map(x=>`${x.name} · ${x.external.toFixed(2)}`)}/>
        <Insight title="Posibles puntos ciegos" items={analysis.blindSpots.length?analysis.blindSpots.map(x=>`${x.name}: AUTO ${x.scores.self?.toFixed(2)} vs entorno ${x.external.toFixed(2)}`):['No se detectaron brechas de autopercepción ≥ 0.70.']}/>
      </section>}

      {professional&&<section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Plan de desarrollo individual</div><h2 className="mt-2 text-2xl font-black text-neutral-800">Ruta de mejora · 90 días</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">El plan prioriza las competencias con menor valoración externa y las traduce en conductas observables, seguimiento y evidencia de avance.</p>
        <div className="mt-6 grid gap-4">{professional.developmentPlan.map((p,i)=><article key={p.competency} className="rounded-2xl border border-neutral-200 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><span className="text-xs font-bold uppercase tracking-[.12em] text-orange-600">Prioridad {i+1} · {p.horizon}</span><h3 className="mt-1 text-lg font-black text-neutral-800">{p.competency}</h3></div><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600">{p.indicator}</span></div><p className="mt-3 text-sm font-semibold text-neutral-700">{p.objective}</p><ul className="mt-3 grid gap-2 text-sm leading-6 text-neutral-600 md:grid-cols-3">{p.actions.map((a,j)=><li key={j} className="rounded-xl bg-neutral-50 p-3">{a}</li>)}</ul></article>)}</div>
        <div className="mt-7 rounded-2xl bg-neutral-800 p-6 text-white"><h3 className="font-black">Sugerencias para la devolución y seguimiento</h3><ul className="mt-4 grid gap-3 text-sm leading-6 text-neutral-300 md:grid-cols-2">{professional.recommendations.map((x,i)=><li key={i}><span className="mr-2 font-black text-orange-400">0{i+1}</span>{x}</li>)}</ul></div>
      </section>}

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Detalle conductual</div><h2 className="mt-2 text-2xl font-black text-neutral-800">Facetas por competencia</h2>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">{summary.dimensions.map(d=><div key={d.key} className="rounded-2xl border border-neutral-200 p-5"><h3 className="font-black text-neutral-800">{d.name}</h3><div className="mt-4 space-y-3">{summary.facets.filter(f=>f.competencyKey===d.key).map(f=><div key={f.key}><div className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold text-neutral-700">{f.facet}</span><span className="text-xs text-neutral-500">{(['self','manager','peer','report'] as FeedbackRole[]).filter(r=>f.scores[r]!==undefined).map(r=>`${FEEDBACK_ROLES[r]} ${f.scores[r]!.toFixed(1)}`).join(' · ')||'Sin dato liberado'}</span></div></div>)}</div></div>)}</div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8"><div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Comentarios cualitativos</div><h2 className="mt-2 text-2xl font-black text-neutral-800">Temas abiertos</h2><p className="mt-2 text-sm text-neutral-500">Los comentarios se presentan sin identificar a pares o colaboradores.</p>
        <div className="mt-5 grid gap-4">{(commentsR.data??[]).length?(commentsR.data??[]).map((c,i)=><blockquote key={i} className="rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">“{c.comment}”</blockquote>):<p className="text-sm text-neutral-500">No se recibieron comentarios abiertos.</p>}</div>
      </section>
    </>}
  </div>;
}

function Insight({title,items}:{title:string;items:string[]}){return <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"><h3 className="font-black text-neutral-800">{title}</h3><ul className="mt-4 space-y-2 text-sm text-neutral-600">{items.map((x,i)=><li key={i} className="rounded-xl bg-neutral-50 px-3 py-2">{x}</li>)}</ul></section>}
function ErrorBox({message}:{message:string}){return <div className="rounded-3xl border border-red-200 bg-red-50 p-7"><h1 className="font-bold text-red-800">No fue posible cargar el 360°</h1><p className="mt-2 text-sm text-red-700">{message}</p></div>}

function Loading360({message}:{message:string}){return <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-sm"><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-orange-500"/><p className="text-neutral-600">{message}</p></div>}
