"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
type Org={id:string;name:string};
export default function PilotCreator({organizations}: {organizations:Org[]}){
 const router=useRouter();
 const [org,setOrg]=useState(organizations[0]?.id||"");
 const [study,setStudy]=useState("integral");
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function create(){
  setError("");setBusy(true);
  try{
   const res=await fetch("/api/estudios/piloto",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({organization_id:org,study_type:study})});
   const d=await res.json();
   if(!res.ok)throw Error(d.error||"No se pudo crear el expediente");
   router.push(`/protected/estudios/${encodeURIComponent(d.id)}`);
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Error inesperado");setBusy(false)}
 }
 return <section className="rounded-3xl border border-orange-200 bg-white p-6 shadow-sm">
  <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Prueba interna · Solo superadministración</p>
  <h2 className="mt-2 text-xl font-black">Crear expediente ficticio</h2>
  <p className="mt-2 text-sm leading-7 text-neutral-600">Genera un expediente sin CURP, teléfono ni datos reales. No será visible para el cliente y no podrá liberarse como reporte definitivo. Podrás repartir tareas de visita y referencias.</p>
  <div className="mt-4 grid gap-3 sm:grid-cols-2">
   <label className="text-xs font-semibold text-neutral-700">Empresa de referencia interna
    <select className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm"
      value={org} onChange={e=>setOrg(e.target.value)}>{organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
   </label>
   <label className="text-xs font-semibold text-neutral-700">Tipo de estudio
    <select className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm"
     value={study} onChange={e=>setStudy(e.target.value)}>
     {["express","esencial","integral","ejecutivo"].map(key=><option key={key} value={key}>{key.charAt(0).toUpperCase()+key.slice(1)}</option>)}</select>
   </label>
  </div>
  {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  <button type="button" onClick={create} disabled={!org||busy} className="mt-4 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
    {busy?"Creando...":"Crear estudio piloto →"}
  </button>
 </section>;
}
