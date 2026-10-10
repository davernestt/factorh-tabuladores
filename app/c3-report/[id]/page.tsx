import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect,notFound } from "next/navigation";
import { getCurrentAppUser } from "@/lib/app-auth";
import { loadC3Report,c3Format,c3Opportunities,c3Strengths } from "@/lib/c3/report";
import ReportToolbar from "./report-toolbar";

export default function C3ExecutiveReport(props:{params:Promise<{id:string}>}) {
 return <Suspense fallback={<div className="p-12 text-center text-neutral-700">Preparando reporte C3 PRO...</div>}><C3ExecutiveReportContent {...props}/></Suspense>;
}
async function C3ExecutiveReportContent({params}:{params:Promise<{id:string}>}) {
 const user=await getCurrentAppUser();
 if(!user || user.role!=="super_admin")redirect("/auth/login");
 const {id}=await params;
 const report=await loadC3Report(id);
 if(!report)notFound();
 const summary=report.summary;
 const isPublishable=!summary.suppressed && summary.global!==null && summary.global!==undefined &&
   (summary.dimensions||[]).length===13 && (summary.dimensions||[]).every(d=>d.score!==null);
 if(!isPublishable){
   return <main className="min-h-screen bg-neutral-100 px-4 py-16"><section className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-sm">
     <h1 className="text-2xl font-black text-neutral-800">Reporte reservado hasta contar con datos suficientes</h1>
     <p className="mt-4 leading-7 text-neutral-600">FactoRH C3 PRO no genera el informe ejecutivo si la campaña tiene menos de cinco cuestionarios completos o faltan respuestas válidas para alguna de las 13 dimensiones. Nunca se sustituyen datos faltantes por cero.</p>
     <Link href={"/protected/c3/"+id} className="mt-6 inline-flex rounded-xl bg-orange-600 px-5 py-3 font-bold text-white">Volver al dashboard</Link>
   </section></main>;
 }
 const opportunities=c3Opportunities(summary,3),strengths=c3Strengths(summary,2);
 const date=new Date(report.generatedAt).toLocaleDateString("es-MX",{year:"numeric",month:"long",day:"numeric",timeZone:"America/Mexico_City"});
 const pillars=summary.pillars||[];
 const labels:Record<string,string>={Clima:"Condiciones y experiencia laboral",Cultura:"Comportamientos y prácticas organizacionales",Compromiso:"Vínculo y disposición hacia la organización"};
 return <main className="min-h-screen bg-neutral-100 px-4 py-7 text-neutral-800">
  <style>{`
   @page { size:A4; margin:15mm 13mm; }
   @media print {
     html,body,main { background:#fff !important; }
     .c3-no-print { display:none !important; }
     .c3-print-document { max-width:none !important; margin:0 !important; padding:0 !important; box-shadow:none !important; border:none !important; border-radius:0 !important; }
     .c3-keep { break-inside:avoid; page-break-inside:avoid; }
     .c3-page-break { break-before:page; page-break-before:always; }
     .c3-bar { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
     h1,h2,h3 { break-after:avoid; }
   }
  `}</style>
  <ReportToolbar campaignId={id}/>
  <article className="c3-print-document mx-auto max-w-5xl rounded-3xl bg-white px-6 py-10 shadow-lg sm:px-12">
   <header className="flex flex-wrap items-start justify-between gap-5 border-b-4 border-orange-500 pb-6">
     <div><Image src="/brand/factorh-wordmark.svg" alt="FactoRH" width={230} height={54} className="h-auto max-w-[210px] object-contain object-left"/>
       <p className="mt-3 text-xs font-bold uppercase tracking-[.18em] text-orange-600">Consultoría organizacional · C3 PRO</p></div>
     <div className="max-w-sm text-left sm:text-right"><p className="text-sm font-bold text-neutral-700">Reporte Ejecutivo</p><p className="mt-1 text-sm text-neutral-500">{date}</p><p className="mt-1 text-xs text-neutral-500">Versión de evaluación {report.campaign.bank_version}</p></div>
   </header>
   <section className="c3-keep mt-9">
     <p className="text-xs font-bold uppercase tracking-[.16em] text-orange-600">Diagnóstico organizacional · prepiloto</p>
     <h1 className="mt-3 text-3xl font-black leading-tight text-neutral-800 sm:text-4xl">Clima, Cultura y Compromiso</h1>
     <p className="mt-3 text-xl font-bold text-neutral-700">{report.organization}</p>
     <p className="mt-1 text-sm text-neutral-500">{report.campaign.name}</p>
     <p className="mt-6 border-l-4 border-orange-400 bg-orange-50 px-5 py-4 text-sm leading-6 text-neutral-700">Instrumento propio FactoRH en fase piloto. Los indicadores representan percepciones laborales agregadas, no diagnósticos clínicos, mediciones normativas NOM-035 ni resultados de una escala científicamente validada.</p>
   </section>
   <section className="c3-keep mt-10">
     <h2 className="text-xl font-black text-neutral-800">1. Resumen ejecutivo</h2>
     <p className="mt-3 text-sm leading-7 text-neutral-600">El reporte consolida las respuestas de la población elegible. El índice global combina tres pilares con el mismo peso: Clima, Cultura y Compromiso. Las respuestas «No aplica» y «No tengo información suficiente» no cuentan como puntuaciones desfavorables.</p>
     <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
       {[
         [c3Format(summary.global),"Índice C3 / 100"],
         [String(summary.completed),"Encuestas completas"],
         [summary.population?c3Format((summary.completed/summary.population)*100)+"%":"—","Participación"],
         [c3Format(summary.enps),"eNPS"]
       ].map(([value,label])=><div key={label} className="c3-keep rounded-2xl border border-neutral-200 bg-neutral-50 p-4"><div className="text-3xl font-black text-neutral-800">{value}</div><p className="mt-2 text-xs font-medium text-neutral-500">{label}</p></div>)}
     </div>
     <p className="mt-3 text-xs text-neutral-500">Invitaciones generadas: {summary.invitations} · Población elegible registrada: {summary.population??"No definida"} · La participación se calcula contra la población elegible, no contra las ligas creadas.</p>
   </section>
   <section className="c3-keep mt-10">
     <h2 className="text-xl font-black text-neutral-800">2. Resultados por pilar</h2>
     <div className="mt-4 space-y-3">
       {pillars.map(p=><div key={p.name} className="c3-keep rounded-xl border border-neutral-200 p-4">
         <div className="flex items-center justify-between gap-4"><div><p className="font-bold text-neutral-800">{p.name}</p><p className="mt-1 text-xs text-neutral-500">{labels[p.name]||""}</p></div><strong className="text-xl text-neutral-800">{c3Format(p.score)}</strong></div>
         <div className="mt-3 h-3 overflow-hidden rounded-full bg-neutral-200"><div className="c3-bar h-full rounded-full bg-orange-500" style={{width:Math.max(0,Math.min(100,p.score||0))+"%"}}/></div>
       </div>)}
     </div>
   </section>
   <section className="c3-page-break mt-10">
     <h2 className="text-xl font-black text-neutral-800">3. Dimensiones evaluadas</h2>
     <p className="mt-2 text-xs text-neutral-500">Escala normalizada 0–100. Favorabilidad: porcentaje de respuestas 4 y 5. Ambos indicadores tienen interpretaciones distintas.</p>
     <div className="mt-5 overflow-hidden rounded-xl border border-neutral-200">
       <table className="w-full border-collapse text-left text-sm">
         <thead className="bg-neutral-800 text-white"><tr>
           <th className="px-3 py-3 font-semibold">Dimensión</th><th className="px-2 py-3 text-right font-semibold">Índice</th><th className="px-3 py-3 text-right font-semibold">Fav.</th>
         </tr></thead>
         <tbody>{(summary.dimensions||[]).map((d,i)=><tr key={d.code} className={"c3-keep border-t border-neutral-200 "+(i%2===1?"bg-neutral-50":"bg-white")}>
           <td className="px-3 py-2"><span className="font-bold text-orange-600">{d.code}</span> {d.name}<span className="block text-xs text-neutral-500">{d.pillar}</span></td>
           <td className="px-2 py-2 text-right font-bold">{c3Format(d.score)}</td>
           <td className="px-3 py-2 text-right">{d.favorability===null?"No publicable":c3Format(d.favorability)+"%"}</td>
         </tr>)}</tbody>
       </table>
     </div>
   </section>
   <section className="c3-keep mt-9">
     <h2 className="text-xl font-black text-neutral-800">4. Fortalezas observadas</h2>
     <p className="mt-3 text-sm leading-7 text-neutral-600">Las dimensiones con mayores índices describen percepciones comparativamente favorables dentro de esta campaña. No son benchmarks del mercado.</p>
     <div className="mt-4 grid gap-3 sm:grid-cols-2">{strengths.map(d=><div key={d.code} className="rounded-xl border-l-4 border-neutral-500 bg-neutral-50 p-4"><p className="text-xs font-bold text-neutral-500">{d.code}</p><p className="mt-1 font-bold">{d.name}</p><p className="mt-2 text-2xl font-black">{c3Format(d.score)}</p></div>)}</div>
   </section>
   <section className="mt-9">
     <h2 className="text-xl font-black text-neutral-800">5. Oportunidades prioritarias</h2>
     <p className="mt-3 text-sm leading-7 text-neutral-600">Se presentan las dimensiones con menor puntuación relativa. Las intervenciones siguientes son <strong>hipótesis de trabajo</strong> que requieren contraste con entrevistas, procesos e indicadores operativos antes de decidir acciones.</p>
     <div className="mt-4 space-y-3">{opportunities.map((o,i)=><div key={o.code} className="c3-keep rounded-xl border border-orange-200 bg-orange-50 p-5">
       <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-black">{i+1}. {o.name}</p><span className="font-black text-orange-700">{c3Format(o.score)}</span></div>
       <p className="mt-2 text-sm text-neutral-700"><strong>Acción a evaluar:</strong> {o.action}</p>
       <p className="mt-2 text-xs text-neutral-600"><strong>Seguimiento propuesto:</strong> {o.measure}</p>
     </div>)}</div>
   </section>
   <section className="c3-page-break mt-10">
     <h2 className="text-xl font-black text-neutral-800">6. Ruta de acción sugerida · 90 días</h2>
     <div className="mt-5 space-y-4">
       {[
         ["Días 1–30","Entender las causas","Revisar las dimensiones de menor puntuación, escuchar a colaboradores mediante técnicas que preserven confidencialidad y contrastar hallazgos con procesos e indicadores operativos."],
         ["Días 31–60","Diseñar e implementar","Elegir una o dos acciones factibles, acordar responsables, recursos, fechas y criterios de éxito. No presentar recomendaciones automáticas como causas demostradas."],
         ["Días 61–90","Verificar avances","Dar seguimiento a compromisos e indicadores operativos. Realizar un pulso breve comparable solo si conserva el texto, población y condiciones de aplicación."]
       ].map(([phase,title,description])=><div key={phase} className="c3-keep flex gap-4 rounded-xl border border-neutral-200 p-5">
         <div className="w-24 shrink-0 border-r border-orange-200 pr-2 text-sm font-black text-orange-600">{phase}</div>
         <div><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p></div>
       </div>)}
     </div>
   </section>
   <section className="c3-keep mt-10 border-t border-neutral-200 pt-6">
     <h2 className="text-lg font-black">7. Nota metodológica y de confidencialidad</h2>
     <p className="mt-3 text-xs leading-6 text-neutral-600">Los índices por dimensión se calculan a partir de la media de personas con al menos tres de cuatro reactivos válidos. Cada pilar requiere la cobertura de todas sus dimensiones. El índice C3 se obtiene como promedio simple de los tres pilares. El eNPS es independiente y utiliza promotores 9–10 y detractores 0–6. Los datos de la campaña se presentan agregados, sin divulgar respuestas individuales. Este reporte omite comentarios abiertos y segmentaciones para evitar reidentificación. FactoRH C3 PRO se encuentra en validación metodológica y no sustituye obligaciones de NOM-035.</p>
   </section>
   <footer className="mt-12 flex flex-wrap justify-between gap-3 border-t border-neutral-200 pt-5 text-xs text-neutral-500"><span>FactoRH · C3 PRO</span><span>Uso consultivo · Versión prepiloto · {date}</span></footer>
  </article>
 </main>;
}
