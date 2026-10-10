"use client";
export default function DemoReportControls(){
 return <div className="flex flex-wrap items-center gap-2">
  <button type="button" onClick={()=>window.print()} className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700">Imprimir / Guardar PDF</button>
  <a href="/api/c3/report/demo/word" className="rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold text-white hover:bg-neutral-700">Descargar Word de ejemplo</a>
 </div>;
}
