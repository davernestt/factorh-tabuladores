"use client";

import Link from "next/link";

export default function C3ReportToolbar({campaignId}:{campaignId:string}){
 return <div className="c3-no-print mx-auto mb-5 flex max-w-5xl flex-wrap items-center justify-between gap-3">
  <Link href={"/protected/c3/"+campaignId} className="rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50">← Volver a campaña</Link>
  <div className="flex flex-wrap gap-2">
   <button type="button" onClick={()=>window.print()} className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700">Imprimir / guardar PDF</button>
   <a href={"/api/c3/report/"+campaignId+"/word"} download className="rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold text-white hover:bg-neutral-700">Descargar Word</a>
  </div>
 </div>;
}
