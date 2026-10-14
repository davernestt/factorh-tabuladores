import Link from "next/link";
import {Suspense} from "react";
import {redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import ClientCatalogView, {
  type ClientCatalogModule,type ClientCatalogInstrument,type ClientCatalogCredits,
} from "@/app/protected/catalogo/client-catalog-view";
import DemoAssign from "./demo-assign";
import DemoParticipant from "./demo-participant";

type Params={searchParams:Promise<{seccion?:string;modulo?:string}>};
const instruments:ClientCatalogInstrument[]=[
  {id:"bigfive",name:"Personalidad Laboral Big Five FactoRH",description:"Describe cinco tendencias amplias de personalidad en el contexto laboral.",assessment_type:"psychometric_bigfive"},
  {id:"reasoning",name:"Razonamiento Laboral General FactoRH",description:"Evalúa razonamiento verbal, numérico, lógico y análisis aplicado.",assessment_type:"psychometric_reasoning"},
  {id:"integrity",name:"Integridad y Criterio Laboral FactoRH",description:"Explora actitudes ante responsabilidad, normas y transparencia.",assessment_type:"psychometric_integrity"},
  {id:"vector",name:"Vector Conductual FactoRH",description:"Explora impulso, vinculación, constancia y estructura.",assessment_type:"psychometric_vector"},
  {id:"sales",name:"Perfil Comercial FactoRH",description:"Iniciativa comercial, orientación al cliente y tolerancia al rechazo.",assessment_type:"psychometric_sales"},
  {id:"attention",name:"Atención y Precisión FactoRH",description:"Atención selectiva, exactitud y control de errores.",assessment_type:"psychometric_attention"},
  {id:"needs",name:"Mapa de Necesidades Laborales FactoRH",description:"Motivación laboral, autonomía, reconocimiento y aprendizaje.",assessment_type:"psychometric_needs"},
  {id:"values",name:"Valores y Motivadores Laborales FactoRH",description:"Importancia relativa de logro, servicio y colaboración.",assessment_type:"psychometric_values"},
  {id:"social",name:"Adaptabilidad Social y Liderazgo FactoRH",description:"Juicio interpersonal, tacto, delegación y comunicación.",assessment_type:"psychometric_social_leadership"},
];
const modules:ClientCatalogModule[]=[
 {module_key:"psychometrics",name:"Psicometrías",description:"Aplicación de pruebas, seguimiento y reportes individuales e integrales.",route:"/protected/psicometrias",client_available:true},
 {module_key:"pdl",name:"Programa de Desarrollo de Líderes",description:"Evaluaciones y seguimiento del desarrollo de líderes.",route:"/protected",client_available:false},
 {module_key:"feedback360",name:"Evaluación 360°",description:"Evaluación multifuente y reportes consolidados de competencias.",route:"/protected/360",client_available:false},
 {module_key:"studies",name:"Estudios e Investigaciones",description:"Estudios socioeconómicos e investigación laboral.",route:null,client_available:false},
 {module_key:"nom035",name:"NOM-035",description:"Evaluación y seguimiento de factores de riesgo psicosocial.",route:"/protected/nom035",client_available:true},
 {module_key:"climate",name:"Clima Laboral",description:"Encuestas, análisis y seguimiento de clima organizacional.",route:null,client_available:false},
];
const credits:ClientCatalogCredits={credits_total:2,credits_used:0,active:true,valid_until:null,plan_type:"trial",plan_name:"Prueba gratuita"};
const samplePeople=[
 {name:"Mariana Ejemplo",test:"Personalidad Laboral Big Five",date:"09 oct 2026",status:"Completada",percent:100},
 {name:"Carlos Demostración",test:"Razonamiento Laboral General",date:"12 oct 2026",status:"Pendiente",percent:0},
];
const sampleDimensions=[{name:"Responsabilidad",value:82},{name:"Colaboración",value:74},{name:"Apertura al aprendizaje",value:87},{name:"Organización",value:70},{name:"Comunicación",value:78}];

function demoLink(section:string){return `/demo-cliente?seccion=${section}`;}

function DemoPsychometrics(){
 return <div className="space-y-6">
  <div className="flex flex-wrap items-end justify-between gap-4">
   <div><p className="text-xs font-black uppercase tracking-widest text-orange-600">FactoRH · Psicometrías</p>
    <h1 className="mt-2 text-3xl font-black text-neutral-900">Evaluación psicométrica</h1>
    <p className="mt-3 text-sm leading-7 text-neutral-600">Administra personas, aplicaciones, seguimiento y reportes de tu empresa.</p>
   </div>
   <Link href={demoLink("asignar")} className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white">+ Asignar psicometría</Link>
  </div>
  <div className="rounded-3xl border border-orange-200 bg-orange-50 p-5">
   <p className="text-xs font-bold uppercase tracking-wider text-orange-700">Prueba gratuita FactoRH</p>
   <p className="mt-2 text-xl font-black text-neutral-900">2 créditos disponibles</p>
   <p className="mt-1 text-sm text-neutral-600">Tu demo incluye dos aplicaciones, cada una con una prueba psicométrica.</p>
  </div>
  <nav className="flex flex-wrap gap-2 rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm">
   <Link href={demoLink("psicometrias")} className="rounded-xl bg-neutral-700 px-5 py-3 text-sm font-bold text-white">Personas y resultados</Link>
   <Link href={demoLink("instrumentos")} className="rounded-xl px-5 py-3 text-sm font-bold text-neutral-600 hover:bg-neutral-50">Consultar instrumentos</Link>
  </nav>
  <div className="grid gap-3 sm:grid-cols-4">
   {([["Personas evaluadas","2"],["Instrumentos",String(instruments.length)],["Aplicaciones activas","1"],["Reportes generados","1"]] as const).map(([n,v])=><div key={n} className="rounded-2xl border border-neutral-200 bg-white p-5"><p className="text-xs text-neutral-500">{n}</p><p className="mt-2 text-3xl font-black text-neutral-900">{v}</p></div>)}
  </div>
  <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
   <div className="border-b border-neutral-100 p-6"><h2 className="text-xl font-black text-neutral-900">Personas y aplicaciones</h2><p className="mt-2 text-xs text-neutral-500">Registros ficticios para demostrar el funcionamiento. No afectan los créditos mostrados.</p></div>
   <div className="divide-y divide-neutral-100">
    {samplePeople.map((p,i)=><div key={p.name} className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
     <div><p className="font-bold text-neutral-900">{p.name}</p><p className="mt-1 text-xs text-neutral-500">{p.test} · {p.date}</p></div>
     <div className="flex flex-wrap items-center gap-4"><span className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-600">{p.status}</span>
      {i===0?<Link href={demoLink("resultados")} className="text-sm font-bold text-orange-700 hover:underline">Ver reporte →</Link>:
      <Link href={demoLink("participante")} className="text-sm font-bold text-orange-700 hover:underline">Ver experiencia del participante →</Link>}
     </div>
    </div>)}
   </div>
  </section>
 </div>;
}

function DemoInstruments(){
 return <div className="space-y-6">
  <Link href={demoLink("psicometrias")} className="text-sm font-bold text-neutral-500">← Volver a Psicometrías</Link>
  <div><p className="text-xs font-black uppercase tracking-widest text-orange-600">Catálogo psicométrico</p><h1 className="mt-2 text-3xl font-black">Conoce nuestros instrumentos</h1>
   <p className="mt-2 text-sm text-neutral-600">Información de muestra basada en el catálogo de FactoRH. Consultar no consume aplicaciones.</p></div>
  <div className="grid gap-4 md:grid-cols-2">{instruments.map((i,index)=><article key={i.id} className="rounded-3xl border border-neutral-200 bg-white p-6">
   <p className="text-xs font-bold text-orange-600">Instrumento FactoRH</p>
   <h2 className="mt-2 text-lg font-black text-neutral-900">{i.name}</h2>
   <p className="mt-3 text-sm leading-6 text-neutral-600">{i.description}</p>
   <p className="mt-3 text-xs font-semibold text-neutral-500">{index<3?"Habilitada en el plan de ejemplo":"Consulta informativa"}</p>
   {index<3&&<Link href={demoLink("asignar")} className="mt-4 inline-flex text-sm font-bold text-orange-700">Asignar instrumento →</Link>}
  </article>)}</div>
 </div>;
}
function DemoResults(){
 return <div className="space-y-6">
  <Link href={demoLink("psicometrias")} className="text-sm font-bold text-neutral-500">← Personas y resultados</Link>
  <section className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
   <p className="text-xs font-bold uppercase tracking-widest text-orange-600">FactoRH · Reporte ilustrativo</p>
   <h1 className="mt-2 text-3xl font-black text-neutral-900">Perfil psicométrico individual</h1>
   <p className="mt-3 text-sm text-neutral-600">Mariana Ejemplo · Personalidad Laboral Big Five</p>
   <p className="mt-4 rounded-xl bg-neutral-50 p-4 text-xs leading-6 text-neutral-600">Resultados completamente ficticios para explicar la apariencia de un reporte. No son puntuaciones obtenidas en una evaluación ni representan una interpretación psicológica real.</p>
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
   <h2 className="text-xl font-black text-neutral-900">Visualización de competencias (ejemplo)</h2>
   <div className="mt-6 space-y-5">
    {sampleDimensions.map(p=><div key={p.name}><div className="flex justify-between text-sm"><span className="font-semibold text-neutral-700">{p.name}</span><span className="font-bold tabular-nums text-neutral-800">{p.value}/100</span></div>
    <div className="mt-2 h-3 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-orange-500" style={{width:`${p.value}%`}}/></div></div>)}
   </div>
   <div className="mt-6 rounded-xl bg-neutral-50 p-5 text-sm leading-7 text-neutral-700">En un reporte real también podrás revisar conclusiones profesionales por dimensión, evidencia de las respuestas y recomendaciones contextualizadas, según el instrumento aplicado.</div>
   <p className="mt-4 text-xs text-neutral-500">La descarga de PDF o Word no está habilitada en esta simulación porque no existe una evaluación real que respaldar.</p>
  </section>
  <Link href={demoLink("asignar")} className="inline-flex rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white">Mostrar una nueva asignación →</Link>
 </div>;
}

function DemoSolution({moduleKey}:{moduleKey:string}){
 const module=modules.find(m=>m.module_key===moduleKey&&m.module_key!=="psychometrics");
 if(!module)return <p className="rounded-2xl bg-white p-6">Módulo no reconocido. <Link href={demoLink("inicio")} className="font-bold text-orange-600">Volver al catálogo</Link></p>;
 return <div className="space-y-6">
  <Link href={demoLink("inicio")} className="text-sm font-bold text-neutral-500">← Explorar catálogo</Link>
  <section className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
   <p className="text-xs font-black uppercase tracking-widest text-orange-600">FactoRH · Conoce nuestras soluciones</p>
   <h1 className="mt-3 text-3xl font-black text-neutral-900">{module.name}</h1>
   <p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-600">{module.description}</p>
   <p className="mt-6 rounded-xl bg-neutral-50 p-5 text-sm leading-6 text-neutral-700">Esta solución está visible en el catálogo comercial, pero <strong>no está habilitada</strong> en el plan demo psicométrico. FactoRH debe autorizarla para que aparezcan sus funciones operativas.</p>
   <Link href={demoLink("inicio")} className="mt-6 inline-flex rounded-xl border border-orange-200 px-5 py-3 text-sm font-bold text-orange-700">Volver al catálogo</Link>
  </section>
 </div>;
}

export default function DemoClientePage({searchParams}:Params){
  return <Suspense fallback={<main className="min-h-screen bg-neutral-100 p-8 text-sm text-neutral-500">Cargando vista demo de cliente...</main>}>
    <DemoClienteContent searchParams={searchParams}/>
  </Suspense>;
}

async function DemoClienteContent({searchParams}:Params){
 const appUser=await getCurrentAppUser();
 if(!appUser)redirect("/auth/login");
 if(appUser.role!=="super_admin")redirect("/protected/catalogo");
 const search=await searchParams;
 const section=["inicio","psicometrias","instrumentos","asignar","participante","resultados","solucion","nom035"].includes(search.seccion||"") ? search.seccion!:"inicio";
 const tabs=[
  {id:"inicio",name:"Explorar catálogo"},{id:"psicometrias",name:"Mis psicometrías"},
  {id:"asignar",name:"Asignar"},
 ];
 return <main className="min-h-screen bg-neutral-100 pb-12">
  <div className="border-b border-orange-200 bg-orange-50">
   <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 text-xs">
    <span className="font-bold text-orange-800">Vista Demo de Cliente · Sólo administrador FactoRH · Datos ficticios</span>
    <Link href="/protected/evaluaciones" className="rounded-lg bg-neutral-900 px-3 py-2 font-bold text-white hover:bg-neutral-700">Salir de la demo y volver a Administración ↗</Link>
   </div>
  </div>
  <header className="border-b border-neutral-200 bg-white">
   <div className="mx-auto max-w-7xl px-5 py-4">
    <div className="flex flex-wrap items-center justify-between gap-4">
     <Link href={demoLink("inicio")} className="inline-flex items-center gap-4 rounded-xl px-2 py-2">
      <span className="text-[29px] font-extrabold tracking-tight"><span className="text-neutral-500">Facto</span><span className="text-orange-600">RH</span></span>
      <span className="border-l border-neutral-200 pl-3 text-xs font-semibold text-neutral-500">Empresa Demostración</span>
     </Link>
     <div className="text-xs text-neutral-500">Responsable de RH (usuario de ejemplo)</div>
    </div>
    <nav className="mt-4 flex gap-1 overflow-x-auto whitespace-nowrap rounded-xl bg-neutral-100 p-1" aria-label="Navegación simulada de empresa">
     {tabs.map(tab=><Link key={tab.id} href={demoLink(tab.id)}
       className={"shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold "+(section===tab.id?"bg-white text-orange-700 shadow-sm":"text-neutral-700 hover:bg-white")}>{tab.name}</Link>)}
    </nav>
   </div>
  </header>
  <div className="mx-auto max-w-7xl px-5 py-7">
   <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-5 py-3 text-xs text-neutral-600">
    <span>Plan simulado: <strong>2 aplicaciones demo de psicometrías</strong> · 3 instrumentos habilitados</span>
    <span>No hay cambios en Supabase, correos, contraseñas ni evaluaciones reales</span>
   </div>
   {section==="inicio"&&<ClientCatalogView mode="demo" modules={modules} instruments={instruments} credits={credits}
       organizationName="Empresa Demostración" allowedIds={["bigfive","reasoning","integrity"]}
       accessibleKeys={["psychometrics"]} availablePsychometrics/>}
   {section==="psicometrias"&&<DemoPsychometrics/>}
   {section==="instrumentos"&&<DemoInstruments/>}
   {section==="asignar"&&<DemoAssign/>}
   {section==="participante"&&<DemoParticipant/>}
   {section==="resultados"&&<DemoResults/>}
   {section==="solucion"&&<DemoSolution moduleKey={search.modulo||""}/>}
   {section==="nom035"&&<DemoSolution moduleKey="nom035"/>}
  </div>
 </main>;
}
