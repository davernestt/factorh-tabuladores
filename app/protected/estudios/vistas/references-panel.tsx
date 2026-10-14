"use client";
import {useState} from "react";
import {CheckCircle2,Clock3,PhoneCall,ClipboardCheck,LockKeyhole} from "lucide-react";

type Status="pending"|"verified"|"not_reached"|"clarification";
type Call={id:string,study:string,employer:string,contact:string,relationship:string,status:Status};
const assigned:Call[]=[
 {id:"REF-DEMO-001",study:"ESE-DEMO-001",employer:"Comercializadora Ejemplo",contact:"Coordinación de Recursos Humanos",relationship:"Empleo anterior",status:"pending"},
 {id:"REF-DEMO-002",study:"ESE-DEMO-001",employer:"Distribuidora Simulada",contact:"Exjefatura directa",relationship:"Empleo anterior",status:"pending"},
];
const statusNames:Record<Status,string>={pending:"Pendiente",verified:"Información corroborada",not_reached:"Sin contacto",clarification:"Requiere aclaración"};
type Tab="pendientes"|"llamada"|"historial";

export default function ReferencesPanel(){
 const [tab,setTab]=useState<Tab>("pendientes");
 const [selected,setSelected]=useState(assigned[0].id);
 const [outcomes,setOutcomes]=useState<Record<string,{status:Status,notes:string,date:string}>>({});
 const [status,setStatus]=useState<Status>("verified");
 const [date,setDate]=useState("2026-10-13");
 const [notes,setNotes]=useState("");
 const [notice,setNotice]=useState("");
 const current=assigned.find(x=>x.id===selected)||assigned[0];
 function pick(id:string){
  setSelected(id);
  const saved=outcomes[id];
  setStatus(saved?.status||"verified");setDate(saved?.date||"2026-10-13");setNotes(saved?.notes||"");
  setTab("llamada");setNotice("");
 }
 function save(){
  if(!notes.trim()){setNotice("Escribe el resultado verificable de la llamada para continuar.");return;}
  setOutcomes(prev=>({...prev,[selected]:{status,notes:notes.trim(),date}}));
  setTab("historial");
  setNotice("Referencia registrada únicamente en esta simulación. En producción se anexaría al expediente de FactoRH.");
 }
 const remaining=assigned.filter(c=>!outcomes[c.id]).length;
 return <div className="space-y-6">
  <header className="rounded-3xl border border-neutral-200 bg-white p-7">
   <p className="text-xs font-black uppercase tracking-widest text-orange-600">FactoRH · Portal de referencias laborales</p>
   <h1 className="mt-2 text-3xl font-black text-neutral-900">Investigación de referencias</h1>
   <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600">Consulta las referencias que se te asignaron, documenta llamadas e integra los resultados al estudio compartido. Tu rol no da acceso a fotografías del domicilio, ingresos ni reportes finales.</p>
  </header>
  <div className="grid gap-3 sm:grid-cols-3">
   {([["Asignadas",assigned.length],["Por contactar",remaining],["Capturadas",Object.keys(outcomes).length]] as const).map(([label,n])=><div key={label} className="rounded-2xl border border-neutral-200 bg-white p-5">
     <p className="text-xs font-bold uppercase text-neutral-500">{label}</p><p className="mt-2 text-3xl font-black">{n}</p>
   </div>)}
  </div>
  <nav className="flex flex-wrap gap-2 rounded-2xl border border-neutral-200 bg-white p-2">
    {([{id:"pendientes",name:"Mis referencias"},{id:"llamada",name:"Registrar llamada"},{id:"historial",name:"Registros capturados"}] as const).map(t=>
      <button type="button" key={t.id} onClick={()=>{setTab(t.id);setNotice("")}} className={"rounded-xl px-5 py-3 text-sm font-bold "+(tab===t.id?"bg-orange-600 text-white":"text-neutral-700 hover:bg-neutral-100")}>{t.name}</button>)}
  </nav>
  {notice&&<p role="status" className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">{notice}</p>}
  {tab==="pendientes"&&<section className="rounded-3xl border border-neutral-200 bg-white p-6">
    <h2 className="text-xl font-black">Referencias asignadas</h2>
    <div className="mt-5 space-y-3">{assigned.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200 p-5">
     <div><p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{item.study}</p>
       <p className="mt-2 font-black text-neutral-900">{item.employer}</p>
       <p className="mt-1 text-xs text-neutral-600">{item.contact} · {item.relationship}</p>
       <p className="mt-2 text-xs font-semibold text-orange-700">{outcomes[item.id]?statusNames[outcomes[item.id].status]:"Pendiente de llamada"}</p>
     </div>
     <button type="button" onClick={()=>pick(item.id)} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-xs font-bold text-white"><PhoneCall size={16}/> {outcomes[item.id]?"Revisar registro":"Registrar llamada"}</button>
    </div>)}</div>
  </section>}
  {tab==="llamada"&&<section className="rounded-3xl border border-neutral-200 bg-white p-6">
   <p className="text-xs font-black uppercase tracking-wide text-orange-600">Bitácora de llamada</p>
   <h2 className="mt-2 text-xl font-black">Registrar verificación telefónica</h2>
   <div className="mt-4 rounded-2xl bg-neutral-50 p-5">
    <label className="block text-xs font-bold text-neutral-700">Referencia asignada
      <select value={selected} onChange={e=>pick(e.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm">
       {assigned.map(x=><option key={x.id} value={x.id}>{x.employer} · {x.study}</option>)}
      </select>
    </label>
    <p className="mt-3 text-xs text-neutral-600">Fuente a contactar: <strong>{current.contact}</strong>. Expediente compartido: <strong>{current.study}</strong>.</p>
   </div>
   <div className="mt-5 grid gap-4 md:grid-cols-2">
    <label className="block text-xs font-bold text-neutral-700">Fecha de intento o llamada
     <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-2 w-full rounded-xl border border-neutral-300 p-3 text-sm"/>
    </label>
    <label className="block text-xs font-bold text-neutral-700">Resultado del contacto
     <select value={status} onChange={e=>setStatus(e.target.value as Status)} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm">
      {(["verified","not_reached","clarification"] as Status[]).map(x=><option key={x} value={x}>{statusNames[x]}</option>)}
     </select>
    </label>
    <label className="block text-xs font-bold text-neutral-700 md:col-span-2">Observaciones y datos confirmados
     <textarea rows={5} value={notes} onChange={e=>setNotes(e.target.value)}
      placeholder="Documenta únicamente fechas, puesto, vínculo laboral, respuesta de la fuente y discrepancias verificables. No captures opiniones sobre vida privada."
      className="mt-2 w-full rounded-xl border border-neutral-300 p-3 text-sm"/>
    </label>
   </div>
   <p className="mt-4 text-xs leading-6 text-neutral-500">En el sistema definitivo el referencista solo podrá acceder a datos mínimos, y cada registro tendrá responsable, fecha y trazabilidad. La información no podrá marcarse como corroborada sin evidencia suficiente.</p>
   <button type="button" onClick={save} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white"><ClipboardCheck size={17}/> Guardar referencia (demo)</button>
  </section>}
  {tab==="historial"&&<section className="rounded-3xl border border-neutral-200 bg-white p-6">
    <h2 className="text-xl font-black">Registros de referencia</h2>
    {Object.keys(outcomes).length===0?<p className="mt-4 text-sm text-neutral-600">Todavía no has guardado llamadas en esta demostración.</p>:
      <div className="mt-5 space-y-3">{assigned.filter(a=>outcomes[a.id]).map(a=>{
       const entry=outcomes[a.id];return <div key={a.id} className="rounded-2xl border border-neutral-200 p-5">
        <div className="flex items-center justify-between gap-2"><p className="font-black text-neutral-900">{a.employer}</p>
          {entry.status==="verified"?<CheckCircle2 size={20} className="text-green-700"/>:<Clock3 size={20} className="text-orange-600"/>}</div>
        <p className="mt-2 text-xs font-bold text-orange-700">{statusNames[entry.status]} · {entry.date}</p>
        <p className="mt-3 text-sm leading-7 text-neutral-700">{entry.notes}</p>
        <button type="button" onClick={()=>pick(a.id)} className="mt-3 text-xs font-bold text-orange-700">Editar registro simulado →</button>
       </div>
      })}</div>}
  </section>}
  <p className="flex items-start gap-2 text-xs leading-6 text-neutral-500"><LockKeyhole className="mt-1 shrink-0" size={16}/> Los nombres de empresas, contactos, estudios y resultados son ficticios. Las capturas solo se muestran en esta pantalla; no se guardan ni se envían al expediente real.</p>
 </div>;
}
