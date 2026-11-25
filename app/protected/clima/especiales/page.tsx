import Link from "next/link";
import {ClipboardList,ShieldCheck,ArrowRight} from "lucide-react";
export default function SpecialSurveys(){
 return <div className="space-y-6">
  <Link href="/protected/clima" className="text-sm font-bold text-orange-600">← Clima Laboral</Link>
  <header className="rounded-3xl border border-neutral-200 bg-white p-7">
   <p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">Servicio especial · FactoRH</p>
   <h1 className="mt-2 text-3xl font-black text-neutral-800">Encuestas a la medida</h1>
   <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600">Cuestionarios diseñados o proporcionados por cada empresa. Son independientes de C3 PRO, C3 Esencial y de las demás evaluaciones de FactoRH.</p>
  </header>
  <Link href="/protected/clima/especiales/arrendamas" className="group flex flex-wrap items-center justify-between gap-5 rounded-3xl border border-orange-200 bg-white p-6 shadow-sm hover:border-orange-500">
   <div className="flex items-start gap-4"><ClipboardList className="mt-1 h-8 w-8 text-orange-600"/><div>
    <p className="text-xs font-black uppercase text-orange-600">Cuestionario del cliente · Borrador editorial</p>
    <h2 className="mt-2 text-2xl font-black text-neutral-800">Arrendamás</h2>
    <p className="mt-2 text-sm text-neutral-600">111 afirmaciones · 3 preguntas abiertas · 6 rubros · 24 atributos</p>
    <p className="mt-2 text-sm text-neutral-500">Textos revisados. Pendientes: aprobación del cliente, escala, población definitiva y pruebas de aplicación.</p>
   </div></div>
   <span className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white">Ver cuestionario <ArrowRight className="h-4 w-4"/></span>
  </Link>
  <p className="flex items-start gap-2 rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600"><ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-orange-600"/>El listado es un borrador de configuración, no una campaña activa. Ninguna invitación ni respuesta se crea desde esta pantalla.</p>
 </div>;
}