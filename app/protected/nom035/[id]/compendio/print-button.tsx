"use client";
import {Printer} from "lucide-react";
export default function Nom035PrintButton(){
 return <button type="button" onClick={()=>window.print()}
  className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white print:hidden">
  <Printer className="h-4 w-4"/>Imprimir o guardar como PDF
 </button>;
}