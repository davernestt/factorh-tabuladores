import Link from 'next/link';
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { authorized360Admin } from '@/lib/feedback360-auth';
import { COMPETENCIES_360, FEEDBACK_ROLES, type DimensionScore, type FeedbackRole } from '@/lib/feedback360';
import { professional360, summarize360, type FacetScore } from '@/lib/feedback360-report';
import { CompetencyBars, Radar360 } from '../../[id]/report-visuals';
import ReportActions from '../../report-actions';

type PageProps={params:Promise<{organizationId:string}>};
const ROLES:FeedbackRole[]=['self','manager','peer','report'];

export default function Company360Page(props:PageProps){
  return <Suspense fallback={<div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center">Generando análisis organizacional 360°...</div>}><Company360Content {...props}/></Suspense>
}

async function Company360Content({params}:PageProps){
  if(!await authorized360Admin())redirect('/auth/login');
  const {organizationId}=await params;
  const db=createAdminClient();
  const [orgR,cyclesR]=await Promise.all([
    db.from('organizations').select('id,name').eq('id',organizationId).maybeSingle(),
    db.from('feedback360_cycles').select('id,person_id,name,status,closed_at,created_at').eq('organization_id',organizationId).eq('status','closed').order('closed_at',{ascending:true})
  ]);
  if(orgR.error||cyclesR.error)return <ErrorBox message={orgR.error?.message??cyclesR.error?.message??'Error al cargar empresa.'}/>;
  if(!orgR.data)notFound();
  const cycles=cyclesR.data??[];
  if(!cycles.length)return <div className="space-y-5"><Link href="/protected/360" className="text-sm font-bold text-orange-600">← Volver a 360°</Link><div className="rounded-3xl border border-neutral-200 bg-white p-8"><h1 className="text-2xl font-black">{orgR.data.name}</h1><p className="mt-3 text-neutral-600">Todavía no hay ciclos 360° cerrados para generar estadística organizacional.</p></div></div>;
  const cycleIds=cycles.map(c=>c.id);
  const [ratersR,peopleR]=await Promise.all([
    db.from('feedback360_raters').select('id,cycle_id,role,status').in('cycle_id',cycleIds),
    db.from('people').select('id,first_name,last_name,job_title,area').in('id',[...new Set(cycles.map(c=>c.person_id))])
  ]);
  if(ratersR.error||peopleR.error)return <ErrorBox message={ratersR.error?.message??peopleR.error?.message??'Error al cargar participantes.'}/>;
  const raters=ratersR.data??[];
  const raterIds=raters.map(r=>r.id);
  const answersR=raterIds.length?await db.from('feedback360_answers').select('rater_id,item_key,rating,not_observed').in('rater_id',raterIds):{data:[],error:null};
  if(answersR.error)return <ErrorBox message={answersR.error.message}/>;
  const answers=answersR.data??[];

  const summaries=cycles.map(c=>{
    const cycleRaters=raters.filter(r=>r.cycle_id===c.id) as {id:string;role:FeedbackRole;status:string}[];
    const ids=new Set(cycleRaters.map(r=>r.id));
    return {cycle:c,summary:summarize360(cycleRaters,answers.filter(a=>ids.has(a.rater_id)),true)};
  });
  const dimensions=aggregateDimensions(summaries.map(x=>x.summary.dimensions));
  const facets=aggregateFacets(summaries.map(x=>x.summary.facets));
  const professional=professional360(dimensions,facets);
  const evaluatedPeople=new Set(cycles.map(c=>c.person_id)).size;
  const completedRaters=raters.filter(r=>r.status==='completed').length;
  const invited=raters.length;
  const responseRate=invited?completedRaters/invited*100:0;
  const personOverall=summaries.map(x=>{
    const vals=x.summary.dimensions.flatMap(d=>{
      const ext=(['manager','peer','report'] as FeedbackRole[]).map(r=>d.scores[r]).filter((v):v is number=>v!=null);
      return ext.length?[ext.reduce((a,b)=>a+b,0)/ext.length]:[];
    });
    return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
  }).filter((v):v is number=>v!==null);
  const dispersion=stddev(personOverall);
  const consistency=dispersion<.20?'Alta consistencia entre personas evaluadas':dispersion<.35?'Variación moderada entre personas':'Alta dispersión: existen experiencias de liderazgo significativamente diferentes';
  const roleAverages=Object.fromEntries(ROLES.map(role=>[role,mean(dimensions.map(d=>d.scores[role]).filter((v):v is number=>v!=null))])) as Record<FeedbackRole,number|null>;
  const companyNarrative=buildCompanyNarrative(orgR.data.name,professional.overall,professional.strengths.map(x=>x.name),professional.priorities.map(x=>x.name),consistency,roleAverages);
  const fileName=`Reporte-360-Empresa-${orgR.data.name}`;

  return <div className="space-y-7">
    <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Link href="/protected/360" className="text-sm font-bold text-neutral-500 hover:text-orange-600">← Volver a Evaluación 360°</Link><ReportActions fileName={fileName} elementId="company360-report"/></div>
    <article id="company360-report" className="space-y-7">
      <header className="rounded-3xl bg-neutral-800 p-7 text-white md:p-9"><div className="text-xs font-bold uppercase tracking-[.18em] text-orange-300">FactorRH · Inteligencia organizacional 360°</div><h1 className="mt-3 text-3xl font-black">{orgR.data.name}</h1><p className="mt-2 max-w-3xl text-neutral-300">Lectura consolidada de las evaluaciones 360° cerradas. El objetivo es identificar patrones compartidos, fortalezas culturales observables y prioridades de desarrollo colectivo.</p></header>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Personas evaluadas" value={String(evaluatedPeople)}/><Metric label="Ciclos cerrados" value={String(cycles.length)}/><Metric label="Participación" value={responseRate.toFixed(0)+'%'}/><Metric label="Índice entorno" value={professional.overall?.toFixed(2)??'—'} suffix="/ 4"/></section>
      {evaluatedPeople<5&&<div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800"><strong>Muestra organizacional todavía pequeña.</strong> Los patrones son útiles como lectura preliminar, pero conviene evitar conclusiones generales de cultura hasta acumular al menos cinco personas evaluadas y una participación razonablemente amplia.</div>}
      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8"><div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Lectura ejecutiva</div><h2 className="mt-2 text-2xl font-black text-neutral-800">Qué nos está diciendo la organización</h2><div className="mt-5 space-y-4 text-sm leading-7 text-neutral-700">{companyNarrative.map((p,i)=><p key={i}>{p}</p>)}</div><div className="mt-5 rounded-2xl bg-neutral-50 p-4 text-sm font-semibold text-neutral-700">{consistency} · desviación entre resultados individuales: {dispersion.toFixed(2)}</div></section>
      <section className="grid gap-5 xl:grid-cols-2"><div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"><div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Mapa consolidado</div><h2 className="mt-2 text-xl font-black">Percepción por fuente</h2><p className="mt-1 text-sm text-neutral-500">Promedio por competencia de todas las personas evaluadas.</p><div className="mt-5"><Radar360 dimensions={dimensions}/></div></div><div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"><div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Prioridades organizacionales</div><h2 className="mt-2 text-xl font-black">Competencias según el entorno</h2><div className="mt-5"><CompetencyBars dimensions={dimensions}/></div></div></section>
      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8"><div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Perspectivas</div><h2 className="mt-2 text-2xl font-black">Cómo ve la organización el liderazgo</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{ROLES.map(role=><div key={role} className="rounded-2xl bg-neutral-50 p-5"><div className="text-xs font-bold uppercase tracking-wide text-neutral-400">{FEEDBACK_ROLES[role]}</div><div className="mt-2 text-3xl font-black text-neutral-800">{roleAverages[role]?.toFixed(2)??'—'}</div><div className="text-xs text-neutral-400">promedio / 4.00</div></div>)}</div></section>
      <section className="grid gap-5 lg:grid-cols-2"><Insight title="Fortalezas compartidas" intro="Son las competencias mejor observadas por el entorno y pueden utilizarse como palancas para prácticas internas, mentoring y reconocimiento." items={professional.strengths.map(x=>x.name+' · '+x.score.toFixed(2))}/><Insight title="Focos transversales" intro="No son etiquetas negativas: representan conductas con mayor oportunidad de mejora cuando se observan de forma repetida en diferentes personas." items={professional.priorities.map(x=>x.name+' · '+x.score.toFixed(2))}/></section>
      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8"><div className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Plan organizacional sugerido</div><h2 className="mt-2 text-2xl font-black">Qué debería trabajar RH con la empresa</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-neutral-500">La recomendación es intervenir sobre patrones recurrentes y convertirlos en prácticas operativas, no limitarse a impartir cursos aislados.</p><div className="mt-6 grid gap-5">{professional.competencyReadings.filter(r=>professional.priorities.some(p=>p.name===r.name)).map((r,i)=><article key={r.key} className="rounded-2xl border border-neutral-200 p-5"><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-wide text-orange-600">Frente {i+1}</div><h3 className="mt-1 text-lg font-black text-neutral-800">{r.name}</h3></div><div className="text-2xl font-black text-neutral-800">{r.external.toFixed(2)}</div></div><p className="mt-3 text-sm leading-6 text-neutral-700">{r.impact}</p><div className="mt-4 grid gap-2 md:grid-cols-3">{r.suggestions.map((x,j)=><div key={j} className="rounded-xl bg-neutral-50 p-3 text-sm leading-6 text-neutral-700">{x}</div>)}</div><div className="mt-4 rounded-xl bg-orange-50 p-4 text-sm leading-6 text-neutral-700"><strong className="text-orange-700">Enfoque RH:</strong> incorporar este frente a seguimiento de líderes, People Review y compromisos de 30–60–90 días; medir cambio conductual, no sólo asistencia a capacitación.</div></article>)}</div></section>
      <footer className="rounded-3xl border border-neutral-200 bg-white p-6 text-xs leading-6 text-neutral-500"><strong className="text-neutral-700">Nota metodológica.</strong> Los promedios organizacionales se calculan a partir de ciclos 360° cerrados y representan percepciones conductuales agregadas. No equivalen a un diagnóstico clínico, de personalidad ni de cultura organizacional por sí solos. Deben contrastarse con indicadores de desempeño, rotación, clima, People Review, entrevistas y observación de procesos.</footer>
    </article>
  </div>
}

function aggregateDimensions(groups:DimensionScore[][]):DimensionScore[]{
  return COMPETENCIES_360.map(c=>{
    const rows=groups.map(g=>g.find(d=>d.key===c.key)).filter((d):d is DimensionScore=>!!d);
    const scores:DimensionScore['scores']={}; const counts:DimensionScore['counts']={};
    for(const role of ROLES){const vals=rows.map(d=>d.scores[role]).filter((v):v is number=>v!=null);counts[role]=vals.length;if(vals.length)scores[role]=mean(vals)!}
    const ext=(['manager','peer','report'] as FeedbackRole[]).map(r=>scores[r]).filter((v):v is number=>v!=null);
    const gap=scores.self!=null&&ext.length?Number((scores.self-mean(ext)!).toFixed(2)):null;
    return {key:c.key,name:c.name,scores,counts,gap};
  });
}
function aggregateFacets(groups:FacetScore[][]):FacetScore[]{
  const first=groups[0]??[];
  return first.map(seed=>{const rows=groups.map(g=>g.find(f=>f.key===seed.key)).filter((f):f is FacetScore=>!!f);const scores:FacetScore['scores']={};const counts:FacetScore['counts']={};for(const role of ROLES){const vals=rows.map(f=>f.scores[role]).filter((v):v is number=>v!=null);counts[role]=vals.length;if(vals.length)scores[role]=mean(vals)!}return {...seed,scores,counts}})
}
function buildCompanyNarrative(name:string,overall:number|null,strengths:string[],priorities:string[],consistency:string,roles:Record<FeedbackRole,number|null>){
  const gap=roles.self!=null?roles.self-mean([roles.manager,roles.peer,roles.report].filter((v):v is number=>v!=null))!:null;
  return [
    overall==null?`La muestra de ${name} todavía no permite construir una lectura cuantitativa consolidada.`:`En ${name}, la percepción agregada del entorno se ubica en ${overall.toFixed(2)} sobre 4.00. Este dato funciona como punto de referencia para entender la frecuencia con la que las conductas esperadas están siendo observadas de manera consistente en las personas evaluadas.`,
    strengths.length?`Las fortalezas colectivas mejor posicionadas son ${strengths.join(', ')}. Cuando estas competencias aparecen de forma reiterada entre distintas personas, RH puede tratarlas como capacidades disponibles que conviene reforzar, reconocer y convertir en prácticas compartidas.`:'Aún no existe información suficiente para identificar fortalezas colectivas.',
    priorities.length?`Los focos de desarrollo más claros son ${priorities.join(', ')}. La recomendación no es traducir automáticamente estos resultados en cursos; primero conviene identificar qué procesos, hábitos de liderazgo, expectativas o mecanismos de seguimiento están facilitando o bloqueando esas conductas.`:'',
    gap==null?consistency:`${consistency}. La diferencia promedio entre autoevaluación y entorno es de ${gap>0?'+':''}${gap.toFixed(2)} puntos. Una brecha positiva sostenida puede indicar que las personas perciben su conducta de forma más favorable que quienes reciben su impacto; una brecha negativa puede revelar fortalezas que no están siendo reconocidas por quienes las ejercen.`
  ].filter(Boolean);
}
function mean(values:number[]){return values.length?values.reduce((a,b)=>a+b,0)/values.length:null}
function stddev(values:number[]){if(values.length<2)return 0;const m=mean(values)!;return Math.sqrt(values.reduce((s,v)=>s+(v-m)**2,0)/values.length)}
function Metric({label,value,suffix}:{label:string;value:string;suffix?:string}){return <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><div className="text-xs font-bold uppercase tracking-wide text-neutral-400">{label}</div><div className="mt-2 text-3xl font-black text-neutral-800">{value}{suffix&&<span className="ml-1 text-xs font-semibold text-neutral-400">{suffix}</span>}</div></div>}
function Insight({title,intro,items}:{title:string;intro:string;items:string[]}){return <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black text-neutral-800">{title}</h2><p className="mt-2 text-sm leading-6 text-neutral-500">{intro}</p><div className="mt-4 space-y-2">{items.map((x,i)=><div key={i} className="rounded-xl bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-700">{x}</div>)}</div></section>}
function ErrorBox({message}:{message:string}){return <div className="rounded-3xl border border-red-200 bg-red-50 p-7"><h1 className="font-bold text-red-800">No fue posible generar el análisis organizacional</h1><p className="mt-2 text-sm text-red-700">{message}</p></div>}
