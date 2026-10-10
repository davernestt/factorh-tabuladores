import Link from "next/link";
import {Suspense} from "react";
import {redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {ArrowLeft,ArrowRight,ClipboardCheck,ChartNoAxesCombined,ShieldCheck,ListChecks} from "lucide-react";

type C3Item={code:string;pillar:string|null;dimension_name:string|null;prompt:string;response_type:string;position:number};
export default function C3ProInstrument(){
 return <Suspense fallback={<div className="rounded-3xl bg-white p-8 text-neutral-600">Cargando C3 PRO...</div>}><C3ProContent/></Suspense>;
}
async function C3ProContent(){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")redirect("/auth/login");
 const db=createAdminClient();
 const {data,error}=await db.from("c3_items")
   .select("code,pillar,dimension_name,prompt,response_type,position")
   .eq("instrument_code","C3").eq("active",true).order("position",{ascending:true});
 const items=(data??[]) as C3Item[];
 const groups=[
  {name:"Clima",items:items.filter(i=>i.pillar==="Clima"&&i.response_type==="likert")},
  {name:"Cultura",items:items.filter(i=>i.pillar==="Cultura"&&i.response_type==="likert")},
  {name:"Compromiso",items:items.filter(i=>i.pillar==="Compromiso"&&i.response_type==="likert")},
  {name:"eNPS y preguntas abiertas",items:items.filter(i=>i.response_type!=="likert")},
 ];
 return <div className="space-y-7">
  <Link href="/protected/clima" className="inline-flex items-center gap-2 text-sm font-bold text-orange-600"><ArrowLeft className="h-4 w-4"/>Catálogo de Clima Laboral</Link>
  <section className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm sm:p-9">
   <div className="flex flex-wrap items-start justify-between gap-4">
    <div className="max-w-3xl">
     <p className="text-xs font-black uppercase tracking-[.18em] text-orange-600">Instrumento integral · Prepiloto</p>
     <h1 className="mt-3 text-3xl font-black text-neutral-800">FactoRH C3 PRO</h1>
     <p className="mt-3 text-base leading-7 text-neutral-600">Diagnóstico de Clima, Cultura y Compromiso con 13 dimensiones, tres pilares, eNPS y preguntas abiertas. Puedes revisar el cuestionario sin tener que crear una empresa o abrir una campaña.</p>
    </div>
    <span className="rounded-2xl bg-orange-50 p-4 text-orange-600"><ClipboardCheck className="h-9 w-9"/></span>
   </div>
   <div className="mt-6 flex flex-wrap gap-3">
    <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">Cuestionario implementado · piloto</span>
    <span className="rounded-full bg-neutral-100 px-4 py-2 text-xs font-bold text-neutral-600">56 preguntas</span>
    <span className="rounded-full bg-neutral-100 px-4 py-2 text-xs font-bold text-neutral-600">13 dimensiones</span>
    <span className="rounded-full bg-neutral-100 px-4 py-2 text-xs font-bold text-neutral-600">3 pilares</span>
   </div>
  </section>
  <section className="grid gap-4 md:grid-cols-2">
   <Link href="/protected/c3/demo" className="rounded-3xl border border-neutral-200 bg-white p-6 hover:border-orange-300">
    <ChartNoAxesCombined className="h-7 w-7 text-orange-600"/>
    <h2 className="mt-4 text-lg font-black text-neutral-800">Conocer los reportes</h2>
    <p className="mt-2 text-sm leading-6 text-neutral-600">Dashboard ficticio para revisar cómo se presentan los resultados de una campaña.</p>
    <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-orange-600">Ver demo <ArrowRight className="h-4 w-4"/></span>
   </Link>
   <Link href="/protected/c3" className="rounded-3xl border border-neutral-200 bg-white p-6 hover:border-orange-300">
    <ListChecks className="h-7 w-7 text-orange-600"/>
    <h2 className="mt-4 text-lg font-black text-neutral-800">Administrar campañas C3 PRO</h2>
    <p className="mt-2 text-sm leading-6 text-neutral-600">Configura empresa y participantes cuando estemos preparados para aplicar el piloto.</p>
    <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-orange-600">Ir a campañas <ArrowRight className="h-4 w-4"/></span>
   </Link>
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
   <div className="flex items-center gap-3"><ClipboardCheck className="h-7 w-7 text-orange-600"/><div>
    <h2 className="text-xl font-black text-neutral-800">Banco del cuestionario C3 PRO</h2>
    <p className="mt-1 text-sm text-neutral-600">Lectura y revisión; esta vista no registra respuestas ni modifica el banco maestro.</p>
   </div></div>
   {error||items.length!==56?<div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">No se pudo verificar el banco completo de 56 reactivos. No se muestra una versión incompleta.</div>:
    <div className="mt-6 space-y-3">
      {groups.map((group,g)=><details key={group.name} className="group rounded-2xl border border-neutral-200 p-4" open={g===0}>
       <summary className="cursor-pointer list-item font-bold text-neutral-800">{group.name} <span className="ml-2 text-sm font-normal text-neutral-500">({group.items.length} preguntas)</span></summary>
       <div className="mt-4 divide-y divide-neutral-100">{group.items.map((item)=><div key={item.code} className="py-3">
        <div className="flex flex-wrap items-start gap-3"><span className="rounded-md bg-orange-50 px-2 py-1 text-xs font-bold text-orange-700">{item.code}</span><div className="flex-1">
         <p className="text-sm font-medium leading-6 text-neutral-800">{item.prompt}</p>
         <p className="mt-1 text-xs text-neutral-500">{item.dimension_name|| (item.response_type==="enps"?"eNPS":"Respuesta abierta")} · {item.response_type==="likert"?"Escala 1–5":item.response_type==="enps"?"Escala 0–10":"Texto abierto"}</p>
        </div></div>
       </div>)}</div>
      </details>)}
    </div>}
  </section>
  <p className="flex items-start gap-2 rounded-2xl border border-neutral-200 bg-white p-5 text-xs leading-6 text-neutral-600"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-orange-600"/>Versión metodológica previa a la validación. Los resultados no sustituyen diagnósticos clínicos ni el cumplimiento de la NOM-035. La versión Esencial y los pulsos tendrán bancos y criterios propios.</p>
 </div>;
}
