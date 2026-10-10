import {Suspense} from "react";
import Link from "next/link";
import {redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {c3DemoReport} from "@/lib/c3/demo-report";
import C3ReportContent from "@/app/c3-report/report-content";
import DemoReportControls from "./demo-report-controls";

export default function C3ExecutiveReportDemo(){
 return <Suspense fallback={<main className="p-10 text-center text-neutral-600">Preparando demostración...</main>}><C3DemoContent/></Suspense>;
}
async function C3DemoContent(){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")redirect("/auth/login");
 return <main className="min-h-screen bg-neutral-100 px-4 py-7">
  <style>{`
   @page {size:A4;margin:14mm 12mm;}
   @media print {
    html,body,main{background:#fff!important;}
    .c3-no-print{display:none!important;}
    .c3-print-document{max-width:none!important;margin:0!important;padding:0!important;box-shadow:none!important;border:0!important;border-radius:0!important;}
    .c3-keep{break-inside:avoid;page-break-inside:avoid;}
    .c3-page-break{break-before:page;page-break-before:always;}
    .c3-bar{print-color-adjust:exact;-webkit-print-color-adjust:exact;}
    h1,h2,h3{break-after:avoid;}
   }
  `}</style>
  <div className="c3-no-print mx-auto mb-5 flex max-w-5xl flex-wrap items-center justify-between gap-3">
   <Link href="/protected/c3/demo" className="rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-700">← Volver al dashboard ficticio</Link>
   <DemoReportControls/>
  </div>
  <C3ReportContent report={c3DemoReport}/>
  <p className="c3-no-print mx-auto mt-4 max-w-5xl text-xs leading-5 text-neutral-500">La impresión a PDF utiliza el navegador. Esta demostración no registra ni consulta respuestas reales.</p>
 </main>;
}
