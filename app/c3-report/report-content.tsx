import Image from "next/image";
import type {C3Report} from "@/lib/c3/report";
import {c3Format} from "@/lib/c3/report";
import {c3OperationalBand,c3Readout} from "@/lib/c3/consulting";

const pillarExplanation:Record<string,string>={
 Clima:"Cómo se experimentan las condiciones, recursos, liderazgo y relaciones de trabajo.",
 Cultura:"Congruencia de valores, justicia, enfoque a resultados y disposición a mejorar.",
 Compromiso:"Orgullo, motivación y expectativas de futuro en la organización."
};
const pct=(v:number|null|undefined)=>Math.max(0,Math.min(100,typeof v==="number"?v:0));
export default function C3ReportContent({report}:{report:C3Report}){
 const s=report.summary;
 const reading=c3Readout(s);
 const date=new Date(report.generatedAt).toLocaleDateString("es-MX",{day:"numeric",month:"long",year:"numeric",timeZone:"America/Mexico_City"});
 const completedPercent=s.population&&s.population>0?100*s.completed/s.population:null;
 const sample=s.demo===true;
 return <article className="c3-print-document relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-white px-6 pb-10 pt-9 text-neutral-800 shadow-xl sm:px-12 sm:pt-12">
   <header className="c3-keep flex flex-wrap items-center justify-between gap-5 border-b-4 border-orange-500 pb-7">
     <div><Image src="/brand/factorh-wordmark.svg" alt="FactoRH" width={220} height={55} className="h-auto w-52 object-contain object-left"/>
       <p className="mt-3 text-xs font-bold uppercase tracking-[.15em] text-orange-600">Inteligencia organizacional · C3 PRO</p></div>
     <div className="text-left sm:text-right">
       <p className="font-black text-neutral-800">Reporte ejecutivo</p>
       <p className="mt-1 text-xs text-neutral-500">{date}</p>
       <p className="mt-1 text-xs text-neutral-500">Instrumento {report.campaign.bank_version}</p>
     </div>
   </header>
   {sample&&<div className="c3-keep mt-6 rounded-xl border-2 border-dashed border-orange-500 bg-orange-50 px-5 py-3 text-center text-sm font-black tracking-[.13em] text-orange-700">DEMOSTRACIÓN · CIFRAS FICTICIAS · NO SON RESULTADOS DE CLIENTES</div>}
   <section className="c3-keep relative mt-9 rounded-3xl bg-slate-800 p-7 text-white sm:p-10">
     <div className="absolute right-0 top-0 h-36 w-40 rounded-bl-full bg-orange-500/15"/>
     <p className="relative text-xs font-extrabold uppercase tracking-[.2em] text-orange-300">Diagnóstico preliminar</p>
     <h1 className="relative mt-4 text-3xl font-black leading-tight sm:text-4xl">Clima, Cultura y<br/>Compromiso</h1>
     <p className="relative mt-5 text-xl font-bold text-white">{report.organization}</p>
     <p className="relative mt-1 text-sm text-slate-300">{report.campaign.name}</p>
     <div className="relative mt-7 inline-block rounded-lg border border-orange-300/50 bg-slate-700/90 px-4 py-2 text-xs font-extrabold tracking-wide text-orange-200">METODOLOGÍA PROPIA EN FASE DE VALIDACIÓN</div>
   </section>
   <section className="c3-keep mt-9">
     <div className="flex flex-wrap items-end justify-between gap-2">
       <h2 className="text-xl font-black text-slate-800">01 · Lectura ejecutiva</h2>
       <p className="text-xs text-neutral-500">Indicadores de percepción agregados</p>
     </div>
     <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
       {[
         {value:c3Format(s.global),label:"Índice global C3",suffix:"/ 100"},
         {value:String(s.completed),label:"Respuestas completas",suffix:"personas"},
         {value:completedPercent===null?"—":c3Format(completedPercent)+"%",label:"Participación",suffix:"de la población"},
         {value:c3Format(s.enps),label:"eNPS",suffix:"escala −100 a +100"}
       ].map((d,i)=><div className={"c3-keep rounded-2xl p-4 "+(i===0?"bg-orange-50 ring-1 ring-orange-200":"bg-slate-50") } key={d.label}>
         <p className={"text-3xl font-black sm:text-4xl "+(i===0?"text-orange-700":"text-slate-800")}>{d.value}</p>
         <p className="mt-2 text-xs font-bold text-slate-700">{d.label}</p>
         <p className="mt-1 text-xs text-slate-500">{d.suffix}</p>
       </div>)}
     </div>
     <div className="mt-5 grid gap-4 sm:grid-cols-2">
       <div className="rounded-xl border border-neutral-200 p-5">
         <p className="text-xs font-extrabold uppercase tracking-wider text-orange-600">Interpretación consultiva</p>
         <p className="mt-3 text-sm leading-7 text-neutral-700">{reading.overview}</p>
         <p className="mt-3 text-xs font-semibold text-neutral-500">Clasificación operativa: {c3OperationalBand(s.global)}. No es un baremo externo.</p>
       </div>
       <div className="rounded-xl border border-neutral-200 p-5">
         <p className="text-xs font-extrabold uppercase tracking-wider text-orange-600">Cobertura de la muestra</p>
         <p className="mt-3 text-sm leading-7 text-neutral-700">{reading.participationCaveat}</p>
         <p className="mt-3 text-xs text-neutral-500">Las ligas compartidas no equivalen a encuestas completas. Los resultados pueden reflejar sesgo de no respuesta.</p>
       </div>
     </div>
   </section>
   <section className="c3-keep mt-9">
     <h2 className="text-xl font-black text-slate-800">02 · Los tres pilares</h2>
     <p className="mt-2 text-sm text-neutral-500">Cada pilar aporta un tercio al índice global; sus dimensiones tienen el mismo peso dentro del pilar.</p>
     <div className="mt-5 space-y-4">
       {reading.pillars.map(p=><div className="c3-keep rounded-2xl border border-neutral-200 p-5" key={p.name}>
         <div className="flex items-center justify-between gap-4"><div>
           <h3 className="text-base font-black text-slate-800">{p.name}</h3>
           <p className="mt-1 text-xs text-neutral-500">{pillarExplanation[p.name]}</p>
         </div><p className="text-2xl font-black tabular-nums text-orange-600">{c3Format(p.score)}</p></div>
         <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100"><div className="c3-bar h-full rounded-full bg-orange-500" style={{width:pct(p.score)+"%"}}/></div>
         <p className="mt-3 text-xs leading-6 text-neutral-600">{p.observation}</p>
       </div>)}
     </div>
   </section>
   <section className="c3-page-break mt-10">
     <h2 className="text-xl font-black text-slate-800">03 · Mapa de las 13 dimensiones</h2>
     <p className="mt-2 text-sm leading-6 text-neutral-600">Comparativo interno de indicadores. La columna de favorabilidad es un porcentaje de respuestas 4 y 5, distinto del índice normalizado.</p>
     <div className="mt-5 space-y-2">
       {(s.dimensions||[]).map(d=><div className="c3-keep rounded-lg border border-neutral-200 p-3" key={d.code}>
         <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
           <div className="min-w-0 flex-1"><span className="text-xs font-black text-orange-600">{d.code} · {d.pillar}</span><p className="mt-1 text-sm font-bold text-neutral-800">{d.name}</p></div>
           <div className="flex min-w-[116px] items-baseline justify-end gap-3 text-right">
             <div><p className="text-lg font-black tabular-nums text-slate-800">{c3Format(d.score)}</p><p className="text-[10px] text-neutral-500">Índice</p></div>
             <div><p className="text-sm font-bold tabular-nums text-neutral-700">{d.favorability===null?"—":c3Format(d.favorability)+"%"}</p><p className="text-[10px] text-neutral-500">Favorable</p></div>
           </div>
         </div>
         <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="c3-bar h-full rounded-full bg-orange-500" style={{width:pct(d.score)+"%"}}/></div>
       </div>)}
     </div>
   </section>
   <section className="c3-page-break mt-10">
     <h2 className="text-xl font-black text-slate-800">04 · Hallazgos para la conversación directiva</h2>
     <div className="mt-4 grid gap-4 sm:grid-cols-2">
       <div className="c3-keep rounded-2xl border border-slate-200 bg-slate-50 p-5">
         <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Fortalezas relativas</h3>
         <p className="mt-2 text-xs leading-5 text-neutral-500">Dimensiones con los índices más altos dentro de esta aplicación. No son fortalezas validadas frente a otras empresas.</p>
         {reading.strengths.map((d,i)=><div key={d.code} className="mt-4 border-t border-slate-200 pt-3">
           <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-800">{i+1}. {d.name}</span><strong className="text-lg text-slate-800">{c3Format(d.score)}</strong></div>
           <p className="text-xs text-neutral-500">{d.pillar}</p>
         </div>)}
       </div>
       <div className="c3-keep rounded-2xl border border-orange-200 bg-orange-50 p-5">
         <h3 className="text-sm font-black uppercase tracking-wider text-orange-700">Oportunidades relativas</h3>
         <p className="mt-2 text-xs leading-5 text-neutral-600">Dimensiones con puntuaciones relativamente más bajas. Son hipótesis para investigar, no diagnósticos causales.</p>
         {reading.opportunities.map((o,i)=><div key={o.code} className="mt-4 border-t border-orange-200 pt-3">
           <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-800">{i+1}. {o.dimension}</span><strong className="text-lg text-orange-700">{c3Format(o.score)}</strong></div>
           <p className="text-xs text-neutral-500">{o.pillar}</p>
         </div>)}
       </div>
     </div>
   </section>
   <section className="mt-10">
     <h2 className="text-xl font-black text-slate-800">05 · Plan consultivo de intervención</h2>
     <p className="mt-2 text-sm leading-6 text-neutral-600">Tres áreas sugeridas, priorizadas por su posición relativa. Dirección y RH deben confirmar cada frente antes de intervenir.</p>
     <div className="mt-5 space-y-5">
       {reading.opportunities.map((o,i)=><div key={o.code} className="c3-keep rounded-2xl border border-neutral-200 p-5">
         <div className="flex flex-wrap items-start justify-between gap-3">
           <div><p className="text-xs font-extrabold uppercase tracking-[.12em] text-orange-600">Prioridad propuesta {i+1} · {o.code}</p><h3 className="mt-2 text-lg font-black text-slate-800">{o.dimension}</h3></div>
           <div className="rounded-lg bg-orange-50 px-3 py-2 text-lg font-black text-orange-700">{c3Format(o.score)}</div>
         </div>
         <div className="mt-4 grid gap-4 sm:grid-cols-2">
           <div><p className="text-xs font-black text-slate-600">Hipótesis a verificar</p><p className="mt-1 text-xs leading-6 text-neutral-700">{o.hypothesis}</p></div>
           <div><p className="text-xs font-black text-slate-600">Qué investigar primero</p><p className="mt-1 text-xs leading-6 text-neutral-700">{o.discovery}</p></div>
           <div><p className="text-xs font-black text-slate-600">Intervención posible</p><p className="mt-1 text-xs leading-6 text-neutral-700">{o.action}</p></div>
           <div><p className="text-xs font-black text-slate-600">Responsable sugerido · indicador</p><p className="mt-1 text-xs leading-6 text-neutral-700">{o.owner}<span className="block mt-1 italic">{o.indicator}</span></p></div>
         </div>
         <div className="mt-4 grid grid-cols-1 gap-2 border-t border-neutral-200 pt-4 sm:grid-cols-3">
           {[["Días 1–30",o.day30],["Días 31–60",o.day60],["Días 61–90",o.day90]].map(([label,copy])=><div key={label} className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-black text-orange-700">{label}</p><p className="mt-2 text-xs leading-5 text-neutral-600">{copy}</p></div>)}
         </div>
       </div>)}
     </div>
   </section>
   <section className="c3-keep mt-10">
     <h2 className="text-xl font-black text-slate-800">06 · Decisiones para Dirección</h2>
     <ol className="mt-4 space-y-3">
       {reading.decisions.map((d,i)=><li key={d} className="flex gap-3 rounded-xl border border-neutral-200 p-4">
         <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-50 text-sm font-black text-orange-700">{i+1}</span><span className="text-sm leading-6 text-neutral-700">{d}</span>
       </li>)}
     </ol>
   </section>
   <section className="c3-page-break mt-10 border-t-4 border-orange-500 pt-8">
     <h2 className="text-xl font-black text-slate-800">07 · Nota técnica y límites de interpretación</h2>
     <p className="mt-3 text-sm leading-7 text-neutral-700">FactoRH C3 PRO es un instrumento prepiloto. Los puntajes reflejan percepciones de quienes respondieron y no constituyen diagnóstico clínico, predicción de permanencia, auditoría salarial ni acreditación de NOM-035. Las propuestas de mejora deben contrastarse con evidencia cualitativa y operativa antes de decidir su ejecución.</p>
     <div className="mt-5 space-y-3">
       {reading.glossary.map(s=>{const sep=s.indexOf(":");return <div className="c3-keep rounded-xl bg-slate-50 p-4 text-xs leading-6 text-neutral-700" key={s}><strong className="text-slate-800">{s.slice(0,sep+1)}</strong>{" "+s.slice(sep+1)}</div>})}
     </div>
     <p className="mt-5 text-xs leading-6 text-neutral-500">Metodología: dimensión = media de índices individuales con al menos 3 de 4 respuestas válidas; pilar = media de sus dimensiones; C3 = media de sus tres pilares. El cálculo exige cobertura suficiente para todas las dimensiones y un mínimo de cinco respuestas completas. El eNPS utiliza respuestas 0–10 y no forma parte del índice C3. Los criterios de ocultamiento se aplican adicionalmente según el riesgo contextual de identificación.</p>
     <p className="mt-3 text-xs leading-6 text-neutral-500">La selección de prioridades es una clasificación interna provisional. Si los grupos son pequeños, las comparaciones entre departamentos y los comentarios textuales no se exportan. Los resultados deben tratarse como información laboral confidencial.</p>
   </section>
   <footer className="mt-12 flex flex-wrap justify-between gap-3 border-t border-neutral-200 pt-5 text-xs text-neutral-500">
     <span>FactoRH · C3 PRO · Inteligencia organizacional</span><span>{sample?"DEMOSTRACIÓN · ":""}Reporte prepiloto · {date}</span>
   </footer>
 </article>;
}
