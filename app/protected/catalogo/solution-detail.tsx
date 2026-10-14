import Link from "next/link";
import {solutionContent} from "./solution-content";

type Props={
  moduleKey:string;
  name:string;
  mode:"demo"|"client";
  organizationName?:string|null;
};

export default function SolutionDetail({moduleKey,name,mode,organizationName}:Props){
 const content=solutionContent[moduleKey];
 if(!content)return null;
 const back=mode==="demo"?"/demo-cliente?seccion=inicio":"/protected/catalogo";
 const subject=encodeURIComponent(`Quiero conocer ${name} - ${organizationName||"Mi empresa"}`);
 const body=encodeURIComponent(`Hola, me interesa conocer más sobre ${name}. ¿Podemos revisar cómo aplicarlo en mi empresa?`);
 return <div className="space-y-6">
   <Link href={back} className="inline-flex text-sm font-semibold text-neutral-500 hover:text-orange-700">
     ← Volver a explorar soluciones
   </Link>
   <section className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm sm:p-9">
     <p className="text-xs font-extrabold uppercase tracking-[.18em] text-orange-600">
       FactoRH · Soluciones para empresas
     </p>
     <h1 className="mt-3 text-3xl font-black tracking-tight text-neutral-900">{name}</h1>
     <h2 className="mt-4 max-w-4xl text-xl font-extrabold leading-snug text-orange-700">
       {content.tagline}
     </h2>
     <p className="mt-5 max-w-4xl text-base leading-8 text-neutral-700">{content.overview}</p>
   </section>
   <div className="grid gap-5 lg:grid-cols-2">
     <section className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
       <p className="text-xs font-extrabold uppercase tracking-wider text-orange-600">El reto en tu empresa</p>
       <h3 className="mt-2 text-xl font-black text-neutral-900">¿Qué problema te ayuda a resolver?</h3>
       <p className="mt-4 text-sm leading-7 text-neutral-700">{content.problem}</p>
     </section>
     <section className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
       <p className="text-xs font-extrabold uppercase tracking-wider text-orange-600">Beneficios para RH y Dirección</p>
       <h3 className="mt-2 text-xl font-black text-neutral-900">¿Qué puedes conseguir?</h3>
       <ul className="mt-4 space-y-3">
         {content.benefits.map(benefit=><li key={benefit} className="flex gap-3 text-sm leading-7 text-neutral-700">
           <span className="font-black text-orange-600">✓</span>{benefit}
         </li>)}
       </ul>
     </section>
   </div>
   <section className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm sm:p-9">
     <p className="text-xs font-extrabold uppercase tracking-wider text-orange-600">Una ruta sencilla</p>
     <h3 className="mt-2 text-2xl font-black text-neutral-900">Así funciona</h3>
     <div className="mt-6 grid gap-4 md:grid-cols-3">
       {content.howItWorks.map((step,index)=><div key={step} className="rounded-2xl bg-neutral-50 p-5">
         <span className="text-2xl font-black text-orange-600">{String(index+1).padStart(2,"0")}</span>
         <p className="mt-3 text-sm leading-7 text-neutral-700">{step}</p>
       </div>)}
     </div>
     <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
       <h4 className="text-sm font-black text-neutral-900">El valor para tu operación</h4>
       <p className="mt-2 text-sm leading-7 text-neutral-700">{content.decisionValue}</p>
     </div>
     <p className="mt-5 text-xs leading-6 text-neutral-500">{content.note}</p>
   </section>
   <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-orange-200 bg-orange-50 p-6 sm:p-8">
     <div className="max-w-2xl">
       <h3 className="text-xl font-black text-neutral-900">¿Te gustaría explorar esta solución en tu empresa?</h3>
       <p className="mt-2 text-sm leading-7 text-neutral-700">
         FactoRH puede ayudarte a revisar el alcance adecuado según tus necesidades y el número de personas que planeas evaluar.
       </p>
     </div>
     {mode==="client"?
       <a href={`mailto:David@factorh.com.mx?subject=${subject}&body=${body}`}
         className="inline-flex rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700">
         Solicitar información a FactoRH →
       </a>:
       <Link href={back} className="inline-flex rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700">
         Seguir explorando soluciones →
       </Link>}
   </section>
   {mode==="demo"&&<p className="text-xs text-neutral-500">
     Información comercial ilustrativa. Esta pantalla no activa servicios ni consulta datos de empresas.
   </p>}
 </div>;
}
