"use client";
import {useState} from "react";
import {CheckCircle2, ClipboardList, Download, FilePlus2, FileText, Clock3} from "lucide-react";

type Tab="resumen"|"solicitar"|"seguimiento";
const services=[
 {key:"express",name:"Estudio Express",description:"Verificación esencial y reporte ágil según el alcance contratado."},
 {key:"esencial",name:"Estudio Esencial",description:"Información estructurada y validación documental."},
 {key:"integral",name:"Estudio Integral",description:"Visita domiciliaria, referencias y evidencias autorizadas."},
 {key:"ejecutivo",name:"Estudio Ejecutivo",description:"Análisis y verificaciones adicionales según la necesidad."},
 {key:"referencias",name:"Referencias laborales",description:"Confirmación de trayectoria laboral y fuentes."},
 {key:"investigacion",name:"Investigación laboral",description:"Investigación ampliada de antecedentes profesionales."},
];
const original=[
 {folio:"ESE-DEMO-001",name:"María Ejemplo",type:"Estudio Integral",status:"Referencias en proceso",progress:65,delivered:false},
 {folio:"ESE-DEMO-002",name:"Carlos Demostración",type:"Estudio Esencial",status:"Reporte autorizado",progress:100,delivered:true},
];
export default function ClientPanel(){
 const [tab,setTab]=useState<Tab>("resumen");
 const [service,setService]=useState("integral");
 const [quantity,setQuantity]=useState(1);
 const [requests,setRequests]=useState<string[]>([]);
 const [notice,setNotice]=useState("");
 const [selected,setSelected]=useState("ESE-DEMO-001");
 const data=original.find(c=>c.folio===selected)||original[0];
 function request(){
   const item=services.find(s=>s.key===service);
   if(!item)return;
   setRequests(prev=>[item.name+" · "+quantity+" servicio(s)",...prev]);
   setNotice("Solicitud simulada. En la plataforma real se enviaría a FactoRH para confirmar el alcance.");
   setTab("seguimiento");
 }
 return <div className="space-y-6">
  <header className="rounded-3xl border border-neutral-200 bg-white p-7">
    <p className="text-xs font-black uppercase tracking-widest text-orange-600">FactoRH · Portal de empresa</p>
    <h1 className="mt-2 text-3xl font-black text-neutral-900">Estudios e Investigaciones</h1>
    <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600">Empresa Demostración · Solicita investigaciones, consulta su avance y descarga exclusivamente los documentos autorizados por FactoRH.</p>
  </header>
  <nav className="flex flex-wrap gap-2 rounded-2xl border border-neutral-200 bg-white p-2">
   {([{id:"resumen",name:"Inicio"},{id:"solicitar",name:"Solicitar servicio"},{id:"seguimiento",name:"Mis estudios"}] as const).map(t=>
    <button type="button" key={t.id} onClick={()=>{setTab(t.id);setNotice("")}}
      className={"rounded-xl px-5 py-3 text-sm font-bold "+(tab===t.id?"bg-orange-600 text-white":"text-neutral-700 hover:bg-neutral-100")}>{t.name}</button>)}
  </nav>
  {notice&&<p role="status" className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">{notice}</p>}
  {tab==="resumen"&&<>
   <div className="grid gap-3 sm:grid-cols-3">
    {([["Solicitudes",2+requests.length],["En proceso",1+requests.length],["Entregados",1]] as const).map(([name,count])=><div key={name} className="rounded-2xl border border-neutral-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{name}</p><p className="mt-2 text-3xl font-black">{count}</p></div>)}
   </div>
   <section className="rounded-3xl border border-neutral-200 bg-white p-6">
    <h2 className="text-xl font-black">Bienvenido a tu centro de estudios</h2>
    <p className="mt-3 text-sm leading-7 text-neutral-600">Podrás solicitar uno o varios estudios, conocer cada etapa del proceso y consultar el reporte final una vez que el equipo de FactoRH termine la validación.</p>
    <div className="mt-5 flex flex-wrap gap-3">
      <button type="button" onClick={()=>setTab("solicitar")} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white"><FilePlus2 size={17}/> Nueva solicitud</button>
      <button type="button" onClick={()=>setTab("seguimiento")} className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-5 py-3 text-sm font-bold text-neutral-700"><ClipboardList size={17}/> Revisar avances</button>
    </div>
   </section>
  </>}
  {tab==="solicitar"&&<section className="rounded-3xl border border-neutral-200 bg-white p-6">
   <p className="text-xs font-bold uppercase tracking-wide text-orange-600">Nueva solicitud</p>
   <h2 className="mt-2 text-2xl font-black">¿Qué servicio necesitas?</h2>
   <p className="mt-2 text-sm leading-6 text-neutral-600">Selecciona el alcance a cotizar o activar según tu contrato. Esta vista no envía solicitudes reales.</p>
   <div className="mt-5 grid gap-3 md:grid-cols-2">{services.map(s=><label key={s.key} className={"flex cursor-pointer gap-3 rounded-2xl border p-4 "+(service===s.key?"border-orange-400 bg-orange-50":"border-neutral-200")}>
    <input type="radio" name="study-type" checked={service===s.key} onChange={()=>setService(s.key)} className="mt-1 accent-orange-600"/>
    <span><strong className="block text-sm text-neutral-900">{s.name}</strong><span className="mt-2 block text-xs leading-6 text-neutral-600">{s.description}</span></span>
   </label>)}</div>
   <label className="mt-5 block text-sm font-semibold text-neutral-700">Cantidad de estudios
     <input type="number" min={1} max={20} value={quantity} onChange={e=>setQuantity(Math.max(1,Math.min(20,Number(e.target.value)||1)))}
      className="mt-2 block w-32 rounded-xl border border-neutral-300 px-4 py-3"/>
   </label>
   <p className="mt-4 text-xs leading-6 text-neutral-500">Verificación crediticia no habilitada, sujeta a revisión legal. Los datos personales se solicitarán posteriormente a través de un flujo protegido y con los consentimientos aplicables.</p>
   <button type="button" onClick={request} className="mt-5 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white">Simular solicitud de estudio →</button>
  </section>}
  {tab==="seguimiento"&&<>
    <section className="rounded-3xl border border-neutral-200 bg-white p-6">
      <h2 className="text-xl font-black text-neutral-900">Mis solicitudes y expedientes</h2>
      {requests.map((label,i)=><div key={i} className="mt-4 flex items-center justify-between rounded-xl bg-neutral-50 p-4 text-sm"><span>{label}</span><span className="text-xs font-semibold text-neutral-500">Por confirmar · Demo</span></div>)}
      <div className="mt-5 grid gap-3 md:grid-cols-2">{original.map(c=><button key={c.folio} type="button" onClick={()=>setSelected(c.folio)}
        className={"rounded-2xl border p-5 text-left "+(selected===c.folio?"border-orange-400 bg-orange-50":"border-neutral-200 bg-white")}>
        <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{c.folio}</p><p className="mt-2 font-black">{c.name}</p>
        <p className="mt-1 text-xs text-neutral-600">{c.type} · {c.status}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200"><div className="h-full rounded-full bg-orange-500" style={{width:String(c.progress)+"%"}}/></div>
      </button>)}</div>
    </section>
    <section className="rounded-3xl border border-neutral-200 bg-white p-6">
      <h2 className="text-lg font-black">Seguimiento: {data.name}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {["Solicitud recibida","Contacto y visita","Verificaciones","Entrega autorizada"].map((step,i)=><div key={step} className="rounded-2xl bg-neutral-50 p-4">
          {i===(data.delivered?3:2)?<Clock3 size={18} className="text-orange-600"/>:<CheckCircle2 size={18} className={data.delivered||i<2?"text-green-700":"text-neutral-400"}/>}
          <p className="mt-2 text-xs font-semibold text-neutral-700">{step}</p>
        </div>)}
      </div>
      {data.delivered?<div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-5">
       <p className="font-black text-neutral-900">Informe liberado por FactoRH</p>
       <p className="mt-2 text-sm text-neutral-700">El cliente vería el PDF principal y únicamente los complementos autorizados.</p>
       <div className="mt-4 flex flex-wrap gap-2">
        {["Informe principal.pdf","Complemento autorizado.pdf"].map(name=><button type="button" key={name} onClick={()=>setNotice("Descarga simulada: "+name+". No se generó ni abrió un archivo real.")}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-neutral-800"><Download size={15}/>{name}</button>)}
       </div>
      </div>:<p className="mt-5 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600">El reporte y sus anexos no están disponibles hasta que FactoRH los apruebe y libere.</p>}
    </section>
  </>}
  <p className="text-xs leading-6 text-neutral-500"><FileText size={14} className="mr-1 inline"/> Los nombres, expedientes, avances, solicitudes y PDFs de esta vista son ejemplos. Ninguna acción se guarda.</p>
 </div>;
}
