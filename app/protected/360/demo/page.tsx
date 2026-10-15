import Link from "next/link";
import {redirect} from "next/navigation";
import {authorized360User} from "@/lib/feedback360-access";
import {ALL_ITEMS_360,FEEDBACK_ROLES,type FeedbackRole} from "@/lib/feedback360";
import {summarize360,professional360} from "@/lib/feedback360-report";
import {Radar360,CompetencyBars,GapBars} from "../[id]/report-visuals";
import ReportActions from "../report-actions";
import GapInterpretation from "../gap-interpretation";

const roleRows:FeedbackRole[]=["self","manager","peer","peer","peer","report","report","report"];
const roster=roleRows.map((role,i)=>({id:"demo-rater-"+i,role,status:"completed"}));
const answers=roster.flatMap((person,index)=>
 ALL_ITEMS_360.map((item,itemIndex)=>{
  const competence=Math.floor(itemIndex/5);
  const intensity=(competence*3+index)%8;
  const result=person.role==="self"?3+(intensity%3===0?1:0):
   person.role==="manager"?2+(intensity%3===0?0:1)+(intensity%5===0?1:0):
   person.role==="peer"?2+(intensity%4===0?0:1)+(intensity%6===0?1:0):
   2+(intensity%5===0?0:1)+(intensity%7===0?1:0);
  return {rater_id:person.id,item_key:item.key,rating:Math.max(1,Math.min(4,result)),not_observed:false};
 })
);

export default async function Feedback360DemoReport(){
 const user=await authorized360User();
 if(!user)redirect("/protected/catalogo");
 const result=summarize360(roster,answers,true);
 const report=professional360(result.dimensions,result.facets);
 return <div className="space-y-6">
  <div className="no-print flex flex-wrap items-center justify-between gap-3">
   <Link href="/protected/360" className="text-sm font-bold text-neutral-600">← Regresar a Evaluación 360°</Link>
   <ReportActions fileName="FactoRH-360-REPORTE-DE-MUESTRA" elementId="reporte-360-demo"/>
  </div>
  <article id="reporte-360-demo" className="space-y-6">
   <header className="rounded-3xl bg-neutral-800 p-7 text-white">
    <p className="text-xs font-extrabold uppercase tracking-widest text-orange-300">FactoRH · Reporte de demostración</p>
    <h1 className="mt-3 text-3xl font-black">Mariana Ejemplo</h1>
    <p className="mt-2 text-sm text-neutral-300">Líder de Operaciones · Empresa Demostración</p>
    <p className="mt-4 inline-flex rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white">MUESTRA FICTICIA · No corresponde a una evaluación real</p>
   </header>
   <section className="grid gap-3 md:grid-cols-4">
    {(["self","manager","peer","report"] as FeedbackRole[]).map(role=><div key={role} className="rounded-2xl border border-neutral-200 bg-white p-5">
     <p className="text-sm text-neutral-600">{FEEDBACK_ROLES[role]}</p>
     <p className="mt-2 text-3xl font-black text-neutral-900">{result.byRole[role].completed}</p>
     <p className="mt-1 text-xs text-neutral-500">respuestas de muestra</p>
    </div>)}
   </section>
   <section className="rounded-3xl border border-neutral-200 bg-white p-7">
    <p className="text-xs font-bold uppercase tracking-wider text-orange-600">Inteligencia de talento</p>
    <h2 className="mt-2 text-2xl font-black text-neutral-900">{report.headline}</h2>
    <p className="mt-3 text-sm leading-7 text-neutral-600">El ejemplo integra 12 competencias y 60 reactivos en escala conductual de 1 a 4, con autoevaluación, jefatura, pares y colaboradores.</p>
    <div className="mt-4 space-y-3">{report.executiveSummary.map((sentence,i)=><p key={i} className="text-sm leading-7 text-neutral-700">{sentence}</p>)}</div>
    <p className="mt-5 text-2xl font-black text-orange-700">{report.overall?.toFixed(2)??"—"} <span className="text-sm font-medium text-neutral-500">/ 4.00 · Índice del entorno (simulado)</span></p>
   </section>
   <div className="grid gap-5 xl:grid-cols-2">
    <section className="rounded-3xl border border-neutral-200 bg-white p-5">
     <h2 className="text-xl font-black">Radar de competencias 360°</h2><Radar360 dimensions={result.dimensions}/>
    </section>
    <section className="rounded-3xl border border-neutral-200 bg-white p-5">
     <h2 className="text-xl font-black">Competencias mejor valoradas y áreas de mejora</h2>
     <div className="mt-6"><CompetencyBars dimensions={result.dimensions}/></div>
    </section>
   </div>
   <section className="rounded-3xl border border-neutral-200 bg-white p-6">
    <h2 className="text-xl font-black">Brechas entre autopercepción y entorno</h2>
    <div className="mt-5"><GapBars dimensions={result.dimensions}/></div>
   </section>
   <GapInterpretation dimensions={result.dimensions} readings={report.competencyReadings}/>
   <div className="grid gap-5 md:grid-cols-2">
    <section className="rounded-3xl border border-neutral-200 bg-white p-6">
     <h2 className="text-lg font-black">Fortalezas de liderazgo</h2>
     <div className="mt-4 space-y-4">{report.strengths.map(v=><div key={v.name} className="rounded-xl bg-neutral-50 p-4">
      <strong className="text-neutral-900">{v.name} · {v.score.toFixed(2)}</strong>
      <p className="mt-2 text-sm leading-6 text-neutral-700">{v.message}</p></div>)}</div>
    </section>
    <section className="rounded-3xl border border-neutral-200 bg-white p-6">
     <h2 className="text-lg font-black">Prioridades de desarrollo</h2>
     <div className="mt-4 space-y-4">{report.priorities.map(v=><div key={v.name} className="rounded-xl bg-neutral-50 p-4">
      <strong className="text-neutral-900">{v.name} · {v.score.toFixed(2)}</strong>
      <p className="mt-2 text-sm leading-6 text-neutral-700">{v.message}</p></div>)}</div>
    </section>
   </div>
   <section className="rounded-3xl border border-neutral-200 bg-white p-6">
    <h2 className="text-xl font-black">Plan de desarrollo sugerido</h2>
    <div className="mt-4 space-y-4">{report.developmentPlan.slice(0,3).map(plan=><div key={plan.competency} className="rounded-xl border border-neutral-200 p-5">
     <h3 className="font-bold text-neutral-900">{plan.competency}</h3><p className="mt-2 text-sm text-neutral-700">{plan.objective}</p>
     <ul className="mt-3 list-inside list-disc text-sm leading-7 text-neutral-600">{plan.actions.map(action=><li key={action}>{action}</li>)}</ul>
    </div>)}</div>
   </section>
   <p className="rounded-xl bg-orange-50 p-4 text-xs leading-6 text-orange-900">Todos los nombres, perfiles, respuestas y resultados de esta página son sintéticos. Sirven para ilustrar la presentación del reporte de FactoRH y no deben utilizarse para tomar decisiones sobre personas reales.</p>
  </article>
 </div>;
}
