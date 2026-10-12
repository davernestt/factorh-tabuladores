import {Suspense} from "react";
import Link from "next/link";
import {redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {nom035DemoReportBundle,demoReportDraft} from "@/lib/nom035/demo-report";
import {NOM035_LEVEL_LABELS} from "@/lib/nom035/report-data";
import Nom035PrintButton from "@/app/protected/nom035/[id]/compendio/print-button";
export default function Nom035DemoReport(){
 return <Suspense fallback={<p className="p-8">Preparando informe ficticio...</p>}><Content/></Suspense>;
}
async function Content(){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")redirect("/protected/nom035");
 const {demo,guide,groups}=nom035DemoReportBundle();
 return <main className="mx-auto max-w-5xl space-y-6 pb-12 text-neutral-800 print:max-w-none">
  <nav className="flex flex-wrap items-center justify-between gap-3 print:hidden">
   <Link href="/protected/nom035/demo" className="text-sm font-bold text-orange-700">
    ← Regresar al simulador de guías
   </Link>
   <div className="flex flex-wrap gap-2">
    <a href="/api/nom035/demo/word" className="rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-bold">Descargar Word ficticio</a>
    <Nom035PrintButton/>
   </div>
  </nav>
  <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-xs font-black tracking-wide text-orange-900">
   SIMULACIÓN DE INFORME TÉCNICO · DATOS TOTALMENTE FICTICIOS · NO CONSTITUYE EVALUACIÓN NI CONSTANCIA DE CUMPLIMIENTO
  </div>
  <header className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm print:rounded-none print:border-0 print:p-0">
   <p className="text-xs font-black uppercase tracking-wide text-orange-700">FactoRH · NOM-035 · Guía III</p>
   <h1 className="mt-3 text-3xl font-black text-neutral-900">Informe técnico · Numeral 7.7</h1>
   <h2 className="mt-4 text-lg font-black text-neutral-900">{demo.organization}</h2>
   <p className="mt-2 text-sm text-neutral-600">{demo.centerName} · Dirección ficticia, Guadalajara, Jalisco</p>
   <p className="mt-4 text-sm font-semibold">Población: {guide.population} · Muestra simulada: {guide.target} · Cuestionarios ficticios: {guide.completed}</p>
  </header>
  <section className="rounded-3xl border border-neutral-200 bg-white p-7 print:border-0">
   {[
    ["B. Objetivo",demoReportDraft.objective],
    ["C. Actividades realizadas",demoReportDraft.activities],
    ["D. Método utilizado",demoReportDraft.methodology_notes]
   ].map(([title,body])=><div key={title} className="mb-6 last:mb-0">
    <h3 className="font-black text-neutral-900">{title}</h3>
    <p className="mt-2 text-sm leading-7 text-neutral-700">{body}</p>
   </div>)}
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-7 print:border-0">
   <h3 className="text-xl font-black text-neutral-900">E. Distribuciones de riesgo · cinco niveles</h3>
   <p className="mt-2 text-xs leading-6 text-neutral-500">
    Los niveles se calcularon sobre cuestionarios ficticios individuales y después se agregaron;
    no se reclasificó un promedio como si fuera una persona.
   </p>
   <div className="mt-5 space-y-4">
    {groups.map(group=><div key={group.metric_kind+group.metric_name} className="break-inside-avoid rounded-xl border border-neutral-100 p-4" style={{breakInside:"avoid-page"}}>
     <p className="text-sm font-black text-neutral-800">{group.metric_kind.toUpperCase()} · {group.metric_name}</p>
     <div className="mt-3 grid grid-cols-5 gap-2 text-center">
      {NOM035_LEVEL_LABELS.map(l=><div key={l.key}>
       <p className="text-lg font-black">{group[l.key]}</p>
       <p className="text-[10px] leading-4 text-neutral-500">{l.name}</p>
      </div>)}
     </div>
    </div>)}
   </div>
  </section>
  <section className="rounded-3xl border border-neutral-200 bg-white p-7 print:border-0">
   <h3 className="text-lg font-black">F. Conclusiones</h3>
   <p className="mt-3 text-sm leading-7">{demoReportDraft.conclusions}</p>
   <h3 className="mt-6 text-lg font-black">G. Recomendaciones e intervención</h3>
   <p className="mt-3 text-sm leading-7">{demoReportDraft.recommendations}</p>
   <p className="mt-3 text-sm leading-7">{demoReportDraft.intervention_notes}</p>
   <h3 className="mt-6 text-lg font-black">H. Responsable de la evaluación</h3>
   <p className="mt-2 text-sm">{demoReportDraft.responsible_name} · SIN CÉDULA DEBIDO A QUE ES FICTICIO</p>
  </section>
  <footer className="text-xs leading-6 text-neutral-500">
   La ficha demuestra el formato que recibirá un centro con campaña cerrada.
   El documento real exige validación profesional de las conclusiones, métodos y resultados.
  </footer>
 </main>;
}
