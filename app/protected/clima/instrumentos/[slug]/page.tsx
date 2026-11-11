import Link from "next/link";
import {Suspense} from "react";
import {notFound,redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {ArrowLeft,ClipboardList,Activity,Layers3,ShieldCheck,ArrowRight} from "lucide-react";

const modules=[
  ["M01","Bienestar",12,"Demandas, recuperación, apoyo y entorno de trabajo."],
  ["M02","Liderazgo",16,"Claridad, delegación, retroalimentación y confianza."],
  ["M03","Reconocimiento",8,"Oportunidad, significado, equidad y visibilidad."],
  ["M04","Desarrollo",12,"Aprendizaje, carrera, movilidad y acompañamiento."],
  ["M05","Experiencia del colaborador",12,"Procesos internos, atención de RH y experiencia de ingreso."],
  ["M06","Gestión del cambio",12,"Comunicación, participación y adaptación a un cambio concreto."],
  ["M07","Colaboración y efectividad de equipos",12,"Coordinación entre áreas, responsabilidad y conflictos."],
  ["M08","Compensación total y propuesta de valor",12,"Equidad percibida, transparencia y beneficios."],
] as const;
const pages={
 esencial:{
  label:"C3 Esencial",eyebrow:"Diagnóstico organizacional breve",desc:"Una alternativa más corta que C3 PRO para conocer tendencias generales de Clima, Cultura y Compromiso.",
  status:"Diseño metodológico pendiente",questions:"29 reactivos propuestos",duration:"Por comprobar en el piloto",
  content:[
    ["Estructura preliminar","Dos preguntas por cada una de las 13 dimensiones (26 reactivos Likert), una pregunta eNPS y dos preguntas abiertas."],
    ["Qué mediría","Las mismas familias conceptuales del C3 PRO: Clima, Cultura y Compromiso, sin asumir equivalencia estadística con la versión integral."],
    ["Qué falta","Seleccionar el reactivo más informativo de cada faceta, revisar cobertura de contenido, definir puntuación, realizar entrevistas cognitivas y pilotar la versión abreviada."],
    ["Reporte propio","Diagnóstico breve, áreas de atención, favorabilidad e indicadores interpretados con cautela. No deben reutilizarse automáticamente las reglas de cobertura de C3 PRO."],
  ],
 },
 pulso:{
  label:"FactoRH Pulso",eyebrow:"Seguimiento ágil",desc:"Encuestas breves para seguir compromisos concretos después de un diagnóstico o un cambio organizacional.",
  status:"Diseño metodológico pendiente",questions:"8–12 reactivos por aplicación (propuesta)",duration:"Por comprobar en el piloto",
  content:[
    ["Enfoque","Seleccionar un tema específico: comunicación, reconocimiento, liderazgo, bienestar, colaboración o gestión del cambio."],
    ["Frecuencia","Aplicación puntual o recurrente, según la necesidad del cliente; sin asumir que todos los pulsos deban ser mensuales."],
    ["Comparabilidad","Para comparar periodos deben mantenerse las mismas preguntas, escalas, población elegible y condiciones de aplicación."],
    ["Reporte propio","Variación por reactivo o tema, evolución en el tiempo, participación y seguimiento de acciones. Un pulso de tema específico NO genera índice C3 global."],
  ],
 },
 modulos:{
  label:"Módulos especializados",eyebrow:"Diagnósticos temáticos",desc:"Profundiza en áreas concretas de experiencia laboral o complementa una aplicación integral.",
  status:"Banco cargado · configuración pendiente",questions:"8 módulos · 96 reactivos",duration:"Depende del módulo elegido",
  content:[
    ["Cobertura","Los módulos se encuentran documentados y sus reactivos están cargados en el banco maestro."],
    ["Reglas de elegibilidad","La experiencia de ingreso aplica a personal de incorporación reciente; Gestión del Cambio exige un evento específico y Colaboración necesita exposición a trabajo entre áreas."],
    ["Reportes","Cada módulo deberá calcular sus propios índices y respetar la confidencialidad. No se añade automáticamente al índice C3."],
    ["Qué falta","Programar selección por campaña, saltos y filtros de elegibilidad, validación del motor y formatos de resultados por módulo."],
  ],
 },
} as const;
type Slug=keyof typeof pages;
export default function InstrumentPage(props:{params:Promise<{slug:string}>}){
 return <Suspense fallback={<div className="rounded-3xl bg-white p-9 text-neutral-500">Cargando información del instrumento...</div>}><InstrumentContent {...props}/></Suspense>;
}
async function InstrumentContent({params}:{params:Promise<{slug:string}>}){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")redirect("/auth/login");
 const {slug}=await params;
 if(!(slug in pages))notFound();
 const item=pages[slug as Slug];
 const Icon=slug==="pulso"?Activity:slug==="modulos"?Layers3:ClipboardList;
 return <div className="space-y-7">
  <Link href="/protected/clima" className="inline-flex items-center gap-2 text-sm font-bold text-orange-600"><ArrowLeft className="h-4 w-4"/>Catálogo de Clima Laboral</Link>
  <section className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm sm:p-9">
   <div className="flex flex-wrap items-start justify-between gap-4">
    <div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-widest text-orange-600">{item.eyebrow}</p>
     <h1 className="mt-3 text-3xl font-black text-neutral-800">{item.label}</h1>
     <p className="mt-3 leading-7 text-neutral-600">{item.desc}</p></div>
    <span className="rounded-2xl bg-orange-50 p-4 text-orange-600"><Icon className="h-9 w-9"/></span>
   </div>
   <div className="mt-6 flex flex-wrap items-center gap-3">
    <span className="rounded-full bg-neutral-100 px-4 py-2 text-xs font-bold text-neutral-700">{item.status}</span>
    <span className="rounded-full bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-600">{item.questions}</span>
    <span className="rounded-full bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-600">{item.duration}</span>
   </div>
  </section>
  {slug==="modulos"&&<section className="rounded-3xl border border-neutral-200 bg-white p-7">
    <h2 className="text-xl font-black text-neutral-800">Banco especializado · Ocho módulos</h2>
    <div className="mt-5 grid gap-3 md:grid-cols-2">{modules.map(([code,name,total,desc])=><article key={code} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
     <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-black text-orange-600">{code} · {name}</p><span className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-neutral-500">{total} reactivos</span></div>
     <p className="mt-3 text-sm leading-6 text-neutral-600">{desc}</p>
    </article>)}</div>
   </section>}
  <section className="rounded-3xl border border-neutral-200 bg-white p-7">
   <h2 className="text-xl font-black text-neutral-800">Alcance del instrumento</h2>
   <div className="mt-5 grid gap-4 md:grid-cols-2">{item.content.map(([title,description])=><article key={title} className="rounded-2xl border border-neutral-200 p-5">
    <h3 className="font-black text-neutral-800">{title}</h3>
    <p className="mt-3 text-sm leading-6 text-neutral-600">{description}</p>
   </article>)}</div>
  </section>
  <section className="flex flex-wrap items-center gap-4 rounded-3xl border border-orange-200 bg-orange-50 p-6">
   <ShieldCheck className="h-7 w-7 text-orange-600"/>
   <div className="flex-1"><h2 className="font-black text-neutral-800">Disponible para revisión metodológica, todavía no para aplicar</h2>
    <p className="mt-1 text-sm leading-6 text-neutral-600">El diseño de esta encuesta no se ha cerrado ni sometido a pruebas. No generaremos campañas ficticiamente listas ni resultados sin respaldo.</p></div>
   <Link href="/protected/clima" className="inline-flex items-center gap-2 rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold text-white">Volver al catálogo <ArrowRight className="h-4 w-4"/></Link>
  </section>
 </div>;
}
