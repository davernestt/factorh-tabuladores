"use client";
import { Printer } from "lucide-react";
export default function PrintToolbar(){return <button type="button" onClick={()=>window.print()} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-black text-white hover:bg-orange-700"><Printer className="h-4 w-4"/> Imprimir / Guardar en PDF</button>}
