import Link from "next/link";
import {arrendamasQuestions,arrendamasOpenQuestions} from "@/lib/clima/especial-arrendamas";
const rubros=[...new Set(arrendamasQuestions.map(q=>q.r))];
export default function ArrendamasDraft(){
 return <div className="space-y-6">
  <Link href="/protected/clima/especiales" className="text-sm font-bold text-orange-600">← Encuestas a la medida</Link>
  <header className="rounded-3xl border border-neutral-200 bg-white p-7 sm:p-9">
   <p className="text-xs font-black uppercase tracking-[.15em] text-orange-600">Servicio especial · Cuestionario en preparación</p>
   <h1 className="mt-3 text-3xl font-black text-neutral-800">Arrendamás · Clima Laboral</h1>
   <p className="mt-3 text-sm leading-7 text-neutral-600">Borrador construido a partir del Excel original del cliente. Se corrigieron ortografía y puntuación conservando los 111 reactivos, el orden, los rubros y los atributos. Aún no se pueden enviar invitaciones desde esta sección.</p>
   <div className="mt-6 grid gap-3 sm:grid-cols-4">
    {([["111","Afirmaciones"],["3","Preguntas abiertas"],["6","Rubros"],["24","Atributos"]] as const).map(([v,label])=><div key={label} className="rounded-xl bg-neutral-50 p-4"><p className="text-3xl font-black text-neutral-800">{v}</p><p className="mt-1 text-xs text-neutral-500">{label}</p></div>)}
   </div>
  </header>
  <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
   <h2 className="font-black text-amber-900">Pendiente de aprobación antes de aplicar</h2>
   <p className="mt-2 text-sm leading-6 text-amber-900">Confirmar escala de respuesta, número final de participantes (se mencionaron 68, mientras el Excel tiene una lista más extensa), autorización de la redacción y tratamiento de la pregunta de denuncias. No se han cargado datos personales ni resultados de la empresa.</p>
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8">
   <h2 className="text-2xl font-black text-neutral-800">Cuestionario revisado</h2>
   <p className="mt-2 text-sm text-neutral-600">Abre un rubro para revisar sus preguntas. Las agrupaciones originales se conservan.</p>
   <div className="mt-5 space-y-3">{rubros.map((r,i)=>{
    const qs=arrendamasQuestions.filter(q=>q.r===r);
    return <details key={r} open={i===0} className="rounded-2xl border border-neutral-200 p-4 sm:p-5">
      <summary className="cursor-pointer text-lg font-black text-neutral-800">{r} <span className="ml-2 text-xs font-semibold text-neutral-500">{qs.length} afirmaciones</span></summary>
      <div className="mt-4 divide-y divide-neutral-100">{qs.map(q=><div key={q.n} className="py-4">
       <p className="text-xs font-bold text-orange-600">{q.a}</p>
       <p className="mt-1 text-sm leading-7 text-neutral-800"><strong>{q.n}.</strong> {q.q}</p>
      </div>)}</div>
    </details>;
   })}</div>
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8">
   <h2 className="text-xl font-black text-neutral-800">Preguntas abiertas · revisión especial</h2>
   <p className="mt-2 text-sm leading-6 text-neutral-600">Estas preguntas se mantienen como referencia del cuestionario original, no como campos de aplicación publicados.</p>
   <div className="mt-4 divide-y divide-neutral-100">{arrendamasOpenQuestions.map(q=><div key={q.n} className="py-4"><p className="font-semibold text-neutral-800">{q.n}. {q.q}</p>{q.status==="bloqueada"&&<p className="mt-1 text-xs font-bold text-amber-700">Requiere protocolo de canal de denuncias antes de habilitarse.</p>}</div>)}</div>
  </section>
  <p className="pb-5 text-xs text-neutral-500">Estado: revisión editorial · Sin aplicación, sin ligas, sin registros de colaboradores.</p>
 </div>;
}