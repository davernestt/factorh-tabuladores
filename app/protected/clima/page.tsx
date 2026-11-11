import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/app-auth";
import {
  ArrowRight,
  Activity,
  ClipboardCheck,
  ClipboardList,
  Layers3,
  ChartNoAxesCombined,
  Building2,
  ShieldCheck,
  BookOpen,
} from "lucide-react";

const instruments = [
  {
    name:"C3 PRO",
    subtitle:"Diagnóstico integral",
    detail:"Clima + Cultura + Compromiso. 13 dimensiones, tres pilares, eNPS y preguntas abiertas; permite complementar con módulos especializados.",
    count:"56 reactivos",
    duration:"Tiempo pendiente de medición en piloto",
    status:"Prepiloto funcional",
    available:true,
    href:"/protected/clima/pro",
    icon:ClipboardCheck,
  },
  {
    name:"C3 Esencial",
    subtitle:"Diagnóstico breve",
    detail:"Diagnóstico breve de 29 reactivos: 13 dimensiones, eNPS y preguntas abiertas. Campañas, ligas y reportes propios.",
    count:"29 reactivos · 13 dimensiones",
    duration:"Aplicación piloto",
    status:"Piloto funcional",
    available:true,
    href:"/protected/clima/encuestas?variant=esencial",
    icon:ClipboardList,
  },
  {
    name:"Pulso FactoRH",
    subtitle:"Seguimiento ágil",
    detail:"Encuestas breves de 8 a 12 preguntas seleccionadas del banco C3 para monitorear temas concretos sin reaplicar todo el diagnóstico.",
    count:"8–12 reactivos seleccionables",
    duration:"Duración por verificar",
    status:"Piloto funcional",
    available:true,
    href:"/protected/clima/pulsos",
    icon:Activity,
  },
  {
    name:"Módulos especializados",
    subtitle:"Diagnósticos temáticos",
    detail:"Ocho diagnósticos temáticos: bienestar, liderazgo, reconocimiento, desarrollo, experiencia del colaborador, cambio, colaboración y compensación.",
    count:"8 módulos · 96 reactivos",
    duration:"8–16 preguntas por módulo",
    status:"Piloto funcional",
    available:true,
    href:"/protected/clima/encuestas?variant=module",
    icon:Layers3,
  },
];

export default function ClimaLanding(){
  return <Suspense fallback={<div className="rounded-3xl bg-white p-9 text-neutral-500">Cargando catálogo de Clima Laboral...</div>}><ClimaLandingContent/></Suspense>;
}

async function ClimaLandingContent(){
  const user=await getCurrentAppUser();
  if(!user||user.role!=="super_admin")redirect("/auth/login");
  return <div className="space-y-8">
    <Link href="/protected/evaluaciones" className="inline-flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700">← Centro de evaluaciones</Link>
    <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm sm:p-9">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[.18em] text-orange-600">FactoRH · Diagnóstico y desarrollo organizacional</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-neutral-800 sm:text-4xl">Clima Laboral</h1>
          <p className="mt-4 text-base leading-7 text-neutral-600">Elige primero qué instrumento necesitas. Después podrás definir la empresa, participantes y campaña. Una evaluación integral no es lo mismo que un pulso de seguimiento.</p>
        </div>
        <div className="rounded-2xl bg-orange-50 p-4 text-orange-600"><ChartNoAxesCombined className="h-9 w-9"/></div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold text-neutral-600">
        <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-2">Clima</span>
        <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-2">Cultura</span>
        <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-2">Compromiso</span>
        <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-2">Seguimiento continuo</span>
      </div>
    </section>
    <section>
      <div className="mb-5"><h2 className="text-2xl font-black text-neutral-800">Instrumentos de Clima Laboral</h2>
      <p className="mt-1 text-sm text-neutral-500">Cada uno tendrá su propio cuestionario, método de evaluación y reporte.</p></div>
      <div className="grid gap-5 md:grid-cols-2">
        {instruments.map((item)=>{
          const Icon=item.icon;
          return <article key={item.name} className="flex flex-col rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-2xl bg-orange-50 p-3 text-orange-600"><Icon className="h-7 w-7"/></div>
              <span className={"rounded-full px-3 py-2 text-xs font-bold "+(item.available?"bg-emerald-50 text-emerald-700":"bg-neutral-100 text-neutral-600")}>{item.status}</span>
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-wider text-orange-600">{item.subtitle}</p>
            <h3 className="mt-1 text-2xl font-black text-neutral-800">{item.name}</h3>
            <p className="mt-3 flex-1 text-sm leading-6 text-neutral-600">{item.detail}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-lg bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-600">{item.count}</span>
              <span className="rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-600">{item.duration}</span>
            </div>
            <Link href={item.href} className="mt-6 inline-flex items-center gap-2 self-start rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold text-white hover:bg-orange-600">
              {item.available?"Entrar al instrumento":"Ver especificación"}<ArrowRight className="h-4 w-4"/>
            </Link>
          </article>;
        })}
      </div>
    </section>
    <section className="grid gap-4 md:grid-cols-3">
      <Link href="/protected/c3" className="rounded-2xl border border-neutral-200 bg-white p-5 hover:border-orange-300">
        <Building2 className="h-6 w-6 text-orange-600"/><h3 className="mt-3 font-black text-neutral-800">Campañas y empresas</h3>
        <p className="mt-2 text-sm leading-6 text-neutral-500">Administración del piloto C3 PRO. Primero define el instrumento.</p>
      </Link>
      <Link href="/protected/c3/demo" className="rounded-2xl border border-neutral-200 bg-white p-5 hover:border-orange-300">
        <ChartNoAxesCombined className="h-6 w-6 text-orange-600"/><h3 className="mt-3 font-black text-neutral-800">Dashboard de ejemplo</h3>
        <p className="mt-2 text-sm leading-6 text-neutral-500">Visualiza indicadores con datos 100% ficticios.</p>
      </Link>
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <ShieldCheck className="h-6 w-6 text-orange-600"/><h3 className="mt-3 font-black text-neutral-800">Privacidad y metodología</h3>
        <p className="mt-2 text-sm leading-6 text-neutral-500">Instrumentos preliminares; no son escalas psicométricamente validadas ni sustituyen NOM-035.</p>
      </div>
    </section>
    <p className="flex items-center gap-2 text-xs leading-6 text-neutral-500"><BookOpen className="h-4 w-4 shrink-0"/>C3 Esencial, Pulso y los ocho módulos especializados se encuentran en fase piloto metodológico: cuentan con aplicación independiente pero aún requieren validación. No sustituyen NOM-035.</p>
  </div>;
}
