"use client";

import {useState} from "react";
import {Check,ClipboardCopy,ExternalLink,FileText,MessageCircle,Send} from "lucide-react";

type DemoType="tour"|"survey"|"report";
const items:{key:DemoType;title:string;path:string;description:string}[]=[
 {key:"tour",title:"Demo completa",path:"/demo-clima",description:"Dashboard ejecutivo, encuesta de muestra y reporte"},
 {key:"survey",title:"Liga de encuesta de prueba",path:"/demo-clima/encuesta",description:"9 preguntas interactivas; no almacena respuestas"},
 {key:"report",title:"Reporte ejecutivo DEMO",path:"/demo-clima/reporte",description:"Resultados ficticios y opción de guardar PDF"}
];

function getUrl(path:string):string {
 return new URL(path,window.location.origin).toString();
}
function message(type:DemoType,url:string) {
 const heading=type==="report"?"reporte ejecutivo de ejemplo":type==="survey"?"encuesta de demostración":"demostración de Clima Laboral";
 return `Hola, te comparto la ${heading} de FactoRH C3 PRO (Clima, Cultura y Compromiso):\n\n${url}\n\nEs una DEMO con datos ficticios; no contiene información de empresas ni respuestas reales. Si tienes alguna duda, con gusto te apoyo.`;
}

export default function ClimateDemoShare(){
 const [status,setStatus]=useState("");
 async function copy(value:string,label:string) {
  try {
   await navigator.clipboard.writeText(value);
   setStatus(label+" copiado. Ya puedes compartirlo.");
  } catch {
   setStatus("No se pudo copiar automáticamente. Abre el enlace y cópialo desde la barra de direcciones.");
  }
 }
 return <section className="rounded-3xl border-2 border-orange-300 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="clima-demo-share-title">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div>
    <p className="text-xs font-black uppercase tracking-[.18em] text-orange-600">Uso comercial · FactoRH</p>
    <h2 id="clima-demo-share-title" className="mt-2 text-2xl font-black text-neutral-800">Enviar DEMO al cliente</h2>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">No necesitas crear una campaña. Selecciona qué quieres compartir. La liga es siempre la misma y funciona sin contraseña de FactoRH.</p>
   </div>
   <span className="rounded-full bg-orange-50 px-3 py-2 text-xs font-black text-orange-800">DATOS FICTICIOS</span>
  </div>
  <div className="mt-6 grid gap-4 lg:grid-cols-3">
   {items.map(item=><div key={item.key} className="flex flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
    <div className="flex items-center gap-2">
      {item.key==="report"?<FileText className="h-5 w-5 text-orange-600"/>:<Send className="h-5 w-5 text-orange-600"/>}
      <h3 className="font-black text-neutral-800">{item.title}</h3>
    </div>
    <p className="mt-2 flex-1 text-sm leading-6 text-neutral-600">{item.description}</p>
    <div className="mt-4 flex flex-wrap gap-2">
     <button type="button" onClick={()=>void copy(getUrl(item.path),item.title)} className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-800 hover:border-orange-400"><ClipboardCopy className="h-4 w-4"/>Copiar liga</button>
     <button type="button" onClick={()=>window.open("https://wa.me/?text="+encodeURIComponent(message(item.key,getUrl(item.path))),"_blank","noopener,noreferrer")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"><MessageCircle className="h-4 w-4"/>Enviar WhatsApp</button>
     <a href={item.path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-3 py-2 text-xs font-bold text-neutral-700"><ExternalLink className="h-4 w-4"/>Ver</a>
    </div>
   </div>)}
  </div>
  {status&&<p className="mt-4 flex items-center gap-2 rounded-xl bg-orange-50 p-3 text-sm font-semibold text-orange-900" role="status"><Check className="h-4 w-4 shrink-0"/>{status}</p>}
  <p className="mt-5 text-xs leading-5 text-neutral-500">Los ejemplos contienen resultados simulados y nueve preguntas de muestra. No generan invitaciones, no registran respuestas y no sustituyen la aplicación contratada del cuestionario completo.</p>
 </section>;
}
