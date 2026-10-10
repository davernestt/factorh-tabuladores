import {Suspense} from "react";
import Link from "next/link";
import {redirect,notFound} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {loadC3Report} from "@/lib/c3/report";
import {c3ReadyToReport} from "@/lib/c3/consulting";
import C3ReportContent from "../report-content";
import ReportToolbar from "./report-toolbar";

export default function C3ExecutiveReport(props:{params:Promise<{id:string}>}){
 return <Suspense fallback={<main className="p-10 text-center text-neutral-600">Preparando reporte ejecutivo...</main>}><C3ExecutiveReportContent {...props}/></Suspense>;
}
async function C3ExecutiveReportContent({params}:{params:Promise<{id:string}>}){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")redirect("/auth/login");
 const {id}=await params;
 const report=await loadC3Report(id);
 if(!report)notFound();
 if(report.campaign.status!=="closed" || !c3ReadyToReport(report.summary))return <main className="min-h-screen bg-neutral-100 px-4 py-16">
  <section className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-sm">
   <p className="text-xs font-black uppercase tracking-wider text-orange-600">Confidencialidad C3 PRO</p>
   <h1 className="mt-3 text-2xl font-black text-neutral-800">Reporte final aún no disponible</h1>
   <p className="mt-4 text-sm leading-7 text-neutral-600">El informe real se habilita cuando la campaña está cerrada, tiene por lo menos cinco cuestionarios completos y presenta cobertura suficiente en las 13 dimensiones. Así evitamos publicar datos parciales o facilitar inferencias sobre respuestas individuales mediante exportaciones sucesivas.</p>
   <p className="mt-3 text-sm leading-6 text-neutral-600">Mientras tanto puedes revisar el diseño y las recomendaciones consultivas con una demostración que utiliza datos ficticios.</p>
   <div className="mt-6 flex flex-wrap gap-3">
    <Link href={"/protected/c3/"+id} className="rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold text-white">Volver a campaña</Link>
    <Link href="/protected/c3/demo/reporte" className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white">Ver ejemplo de reporte</Link>
   </div>
  </section>
 </main>;
 return <main className="min-h-screen bg-neutral-100 px-4 py-7">
   <style>{`
     @page {size:A4;margin:14mm 12mm;}
     @media print {
       html,body,main{background:#fff !important;}
       .c3-no-print{display:none!important;}
       .c3-print-document{max-width:none!important;margin:0!important;padding:0!important;box-shadow:none!important;border:0!important;border-radius:0!important;}
       .c3-keep{break-inside:avoid;page-break-inside:avoid;}
       .c3-page-break{break-before:page;page-break-before:always;}
       .c3-bar{print-color-adjust:exact;-webkit-print-color-adjust:exact;}
       h1,h2,h3{break-after:avoid;}
     }
   `}</style>
   <ReportToolbar campaignId={id}/>
   <C3ReportContent report={report}/>
 </main>;
}
