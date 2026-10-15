import type {DimensionScore} from "@/lib/feedback360";
import type {ProfessionalInsight} from "@/lib/feedback360-report";
import {format360Gap,get360GapInsights} from "@/lib/feedback360-gap-interpretation";

type Props={
 dimensions:DimensionScore[];
 readings?:ProfessionalInsight["competencyReadings"];
};
export default function GapInterpretation({dimensions,readings=[]}:Props){
 const insights=get360GapInsights(dimensions,readings);
 const comparable=dimensions.filter(d=>d.gap!==null).length;
 return <section aria-labelledby="360-gap-reading" className="break-inside-avoid space-y-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
  <div>
   <p className="text-xs font-black uppercase tracking-widest text-orange-600">Interpretación de brechas y desarrollo</p>
   <h2 id="360-gap-reading" className="mt-2 text-xl font-black text-neutral-900 sm:text-2xl">¿Qué significa esta diferencia de percepciones?</h2>
   <p className="mt-2 text-sm leading-7 text-neutral-600">
    La brecha se calcula como <strong>autoevaluación menos promedio del entorno</strong> (jefatura, pares y colaboradores con resultados liberados).
    No mide automáticamente el desempeño: indica dónde conviene contrastar comportamientos y expectativas.
   </p>
  </div>
  <div className="grid gap-3 md:grid-cols-3">
   <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
    <p className="text-base font-black text-orange-700">Positiva (+)</p>
    <p className="mt-2 text-sm leading-6 text-neutral-700">Me evalúo más alto que mi entorno. Conviene buscar ejemplos observables y posibles puntos ciegos.</p>
   </div>
   <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
    <p className="text-base font-black text-neutral-800">Negativa (−)</p>
    <p className="mt-2 text-sm leading-6 text-neutral-700">Mi entorno me evalúa más alto que yo. Puede haber fortalezas poco reconocidas.</p>
   </div>
   <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
    <p className="text-base font-black text-neutral-800">Cero (0.00)</p>
    <p className="mt-2 text-sm leading-6 text-neutral-700">Coinciden las puntuaciones mostradas. Las diferencias pequeñas indican percepciones cercanas, no identidad exacta.</p>
   </div>
  </div>
  <p className="text-xs leading-6 text-neutral-500">
   Criterio práctico de FactoRH: diferencias de 0.35 puntos o más merecen conversación; a partir de 0.70 se prioriza su revisión.
   Son umbrales descriptivos, no pruebas estadísticas ni diagnósticos.
  </p>
  <div className="border-t border-neutral-200 pt-5">
   <h3 className="text-lg font-black text-neutral-900">Tres diferencias prioritarias y qué hacer con ellas</h3>
   <p className="mt-2 text-sm leading-6 text-neutral-600">Se ordenan por la magnitud de la diferencia, no por el nivel de desempeño. Si faltan respuestas suficientes, no se inventan resultados.</p>
   {insights.length?(
    <div className="mt-4 grid gap-4">
     {insights.map((insight,index)=><article key={insight.key} className="break-inside-avoid rounded-2xl border border-neutral-200 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
       <div className="min-w-0">
        <p className="text-xs font-bold text-neutral-500">Prioridad de conversación {index+1} · Diferencia {insight.magnitude}</p>
        <h4 className="mt-1 text-base font-black text-neutral-900">{insight.name}</h4>
       </div>
       <div className="text-right">
        <p className={"text-2xl font-black tabular-nums "+(insight.gap>0?"text-orange-700":"text-neutral-700")}>{format360Gap(insight.gap)}</p>
        <p className="mt-1 text-xs text-neutral-500">Auto {insight.self.toFixed(2)} · Entorno {insight.external.toFixed(2)}</p>
       </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
       <div className="rounded-xl bg-neutral-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Interpretación</p>
        <p className="mt-2 text-sm leading-6 text-neutral-700">{insight.interpretation}</p>
       </div>
       <div className="rounded-xl bg-neutral-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Acción recomendada</p>
        <p className="mt-2 text-sm leading-6 text-neutral-700">{insight.suggestion}</p>
        <p className="mt-3 text-xs font-semibold text-neutral-600">{insight.followUp}</p>
       </div>
      </div>
     </article>)}
    </div>
   ):<p className="mt-4 rounded-xl bg-neutral-50 p-4 text-sm leading-7 text-neutral-600">
    {comparable===0?
      "Aún no hay suficiente información comparable entre la autoevaluación y el entorno para interpretar brechas.":
      "No se observan diferencias de 0.35 puntos o más. Las percepciones disponibles son relativamente cercanas; conviene revisar comportamientos y resultados para confirmarlo."}
   </p>}
  </div>
 </section>;
}
