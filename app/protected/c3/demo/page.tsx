import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/app-auth";

const raw=[
 ["D01","Liderazgo inmediato","Clima",72,73],
 ["D02","Comunicación interna","Clima",61,58],
 ["D03","Colaboración y relaciones","Clima",69,67],
 ["D04","Condiciones y recursos","Clima",65,62],
 ["D05","Reconocimiento y valoración","Clima",56,49],
 ["D13","Compensaciones y beneficios","Clima",58,55],
 ["D06","Valores y congruencia","Cultura",74,76],
 ["D07","Ética, respeto y justicia","Cultura",68,64],
 ["D08","Orientación a resultados","Cultura",79,82],
 ["D09","Adaptabilidad y mejora continua","Cultura",71,70],
 ["D10","Orgullo y pertenencia","Compromiso",81,84],
 ["D11","Motivación y contribución","Compromiso",76,78],
 ["D12","Permanencia y futuro","Compromiso",62,60]
] as const;
const score=(x:number)=>x.toFixed(1);
const pillars=["Clima","Cultura","Compromiso"].map(name=>{
 const dims=raw.filter(d=>d[2]===name);
 return {name,score:dims.reduce((n,d)=>n+d[3],0)/dims.length};
});
const global=pillars.reduce((n,p)=>n+p.score,0)/3;
export default function C3DemoPage(){
 return <Suspense fallback={<div className="p-10 text-neutral-600">Cargando demostración...</div>}><C3DemoContent/></Suspense>;
}
async function C3DemoContent(){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")redirect("/auth/login");
 const lows=[...raw].sort((a,b)=>a[3]-b[3]).slice(0,3);
 return <div className="space-y-6">
  <Link href="/protected/c3" className="text-sm font-bold text-orange-600">← Campañas C3 PRO</Link>
  <div className="rounded-2xl border-2 border-orange-400 bg-orange-50 p-5">
   <p className="text-sm font-black uppercase tracking-[.15em] text-orange-700">Vista demostrativa · Datos 100% ficticios</p>
   <p className="mt-2 text-sm leading-6 text-neutral-700">Esta pantalla existe únicamente para revisar el diseño del dashboard. <strong>No representa a Colbert ni contiene respuestas reales.</strong> Sus resultados no se guardan, comparan ni exportan a campañas.</p>
  </div>
  <header className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
   <div className="flex flex-wrap items-start justify-between gap-4">
    <div><Image src="/brand/factorh-wordmark.svg" width={185} height={42} alt="FactoRH" className="h-auto w-40 object-contain object-left"/>
      <p className="mt-4 text-xs font-black uppercase tracking-[.15em] text-orange-600">C3 PRO · Clima, Cultura y Compromiso</p>
      <h1 className="mt-3 text-3xl font-black text-neutral-800">Dashboard ejecutivo — DEMO</h1>
      <p className="mt-2 text-neutral-600">Empresa simulada | Instrumento prepiloto</p></div>
     <div className="rounded-full bg-neutral-100 px-4 py-2 text-xs font-black text-neutral-600">Simulación de diseño</div>
   </div>
   <div className="mt-7 grid gap-3 sm:grid-cols-4">
    {[
      [score(global),"Índice global /100"],
      ["45","Encuestas completas"],
      ["90%","Participación"],
      ["+20","eNPS"]
    ].map(([n,label])=><div key={label} className="rounded-2xl bg-neutral-50 p-5"><p className="text-3xl font-black text-neutral-800">{n}</p><p className="mt-2 text-xs text-neutral-500">{label}</p></div>)}
   </div>
  </header>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <h2 className="text-xl font-black text-neutral-800">Pilares organizacionales</h2>
   <div className="mt-4 grid gap-4 md:grid-cols-3">{pillars.map(p=><div key={p.name} className="rounded-2xl border border-neutral-200 p-5"><p className="text-sm font-bold text-neutral-600">{p.name}</p><p className="mt-2 text-3xl font-black text-neutral-800">{score(p.score)}</p><div className="mt-3 h-3 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-orange-500" style={{width:p.score+"%"}}/></div></div>)}</div>
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <h2 className="text-xl font-black text-neutral-800">Las 13 dimensiones</h2>
   <p className="mt-2 text-sm text-neutral-500">Puntuación normalizada (0–100) y favorabilidad (% de respuestas 4 y 5). Datos inventados para revisar presentación.</p>
   <div className="mt-5 space-y-3">{raw.map(d=><div key={d[0]} className="rounded-xl border border-neutral-200 p-4">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold text-orange-600">{d[0]} · {d[2]}</p><p className="mt-1 font-semibold text-neutral-800">{d[1]}</p></div><div className="text-right"><strong className="text-xl">{score(d[3])}</strong><p className="text-xs text-neutral-500">{d[4]}% favorable</p></div></div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-orange-500" style={{width:d[3]+"%"}}/></div>
   </div>)}</div>
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <h2 className="text-xl font-black text-neutral-800">Oportunidades de intervención</h2>
   <p className="mt-2 text-sm leading-6 text-neutral-600">Las puntuaciones bajas son señales para investigar, no explicaciones automáticas de las causas.</p>
   <div className="mt-5 grid gap-3 md:grid-cols-3">{lows.map((d,i)=><div key={d[0]} className="rounded-2xl bg-orange-50 p-5"><p className="text-xs font-bold text-orange-600">Prioridad preliminar {i+1}</p><p className="mt-2 font-bold text-neutral-800">{d[1]}</p><p className="mt-2 text-2xl font-black text-neutral-800">{score(d[3])}</p></div>)}</div>
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
   <h2 className="text-xl font-black text-neutral-800">Plan sugerido · 90 días</h2>
   <div className="mt-5 grid gap-3 md:grid-cols-3">
    {[["Días 1–30","Escuchar y contrastar","Entrevistas voluntarias, revisión de procesos e indicadores."],["Días 31–60","Intervenir","Definir hasta dos acciones, responsables, recursos y fechas."],["Días 61–90","Verificar","Seguimiento de compromisos y medición comparable de avances."]].map(row=><div key={row[0]} className="rounded-xl border border-neutral-200 p-5"><p className="text-xs font-black text-orange-600">{row[0]}</p><h3 className="mt-2 font-bold">{row[1]}</h3><p className="mt-2 text-sm text-neutral-600">{row[2]}</p></div>)}
   </div>
  </section>
  <p className="pb-8 text-center text-xs text-neutral-500">DEMO SIN DATOS REALES · FactoRH C3 PRO en validación metodológica · No sustituye NOM-035</p>
 </div>;
}
