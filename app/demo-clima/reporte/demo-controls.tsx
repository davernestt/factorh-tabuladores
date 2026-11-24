"use client";
export default function DemoControls(){
 return <button type="button" onClick={()=>window.print()} className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700">Imprimir / Guardar como PDF</button>;
}
