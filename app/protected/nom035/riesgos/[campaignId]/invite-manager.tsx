"use client";
import {useCallback,useEffect,useState} from "react";
import {ClipboardCopy,Download,Link2,ShieldCheck} from "lucide-react";
type Invitation={id:string;url:string|null};
const escapeCsv=(s:string)=>'"'+(/^[=+\-@\t\r]/.test(s)?"'"+s:s).replace(/"/g,'""')+'"';

export default function RiskInviteManager({campaignId,open}:{
 campaignId:string;open:boolean
}){
 const [links,setLinks]=useState<Invitation[]>([]);
 const [count,setCount]=useState(10);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const reload=useCallback(async()=>{
  setError("");
  try{
   const res=await fetch("/api/evaluacion/nom035-riesgo/invites?campaignId="+
    encodeURIComponent(campaignId),{cache:"no-store"});
   const body=await res.json();
   if(!res.ok)throw Error(body.error||"No se cargaron las ligas.");
   setLinks(body.links||[]);
  }catch(e){setError(e instanceof Error?e.message:"Error de consulta");}
  finally{setLoading(false);}
 },[campaignId]);
 useEffect(()=>{void reload()},[reload]);
 async function generate(){
  setError("");setMessage("");setBusy(true);
  try{
   const res=await fetch("/api/evaluacion/nom035-riesgo/invites",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({campaignId,count})
   });
   const body=await res.json();
   if(!res.ok)throw Error(body.error||"No se pudieron generar ligas.");
   await reload();
   setMessage("Ligas generadas. Compártelas de forma privada y no publiques el listado.");
  }catch(e){setError(e instanceof Error?e.message:"Error de generación");}
  finally{setBusy(false);}
 }
 async function copy(link:string){
  try{await navigator.clipboard.writeText(link);setError("");setMessage("Liga copiada.");}
  catch{setError("No fue posible copiar. Exporta el CSV para obtener las ligas.");}
 }
 function download(){
  const rows=[["Número","Liga privada"],...links.map((a,i)=>[String(i+1),a.url||"NO RECUPERABLE"])];
  const csv="\uFEFF"+rows.map(row=>row.map(escapeCsv).join(",")).join("\r\n");
  const blobUrl=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const anchor=document.createElement("a");anchor.href=blobUrl;
  anchor.download="FactoRH_NOM035_Riesgos_Ligas.csv";
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(blobUrl),1000);
 }
 return <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
  <div className="flex items-start gap-3">
   <ShieldCheck className="mt-1 h-6 w-6 text-orange-600"/>
   <div>
    <h2 className="text-xl font-black text-neutral-800">Ligas de aplicación</h2>
    <p className="mt-2 text-sm leading-6 text-neutral-600">
     Cada liga es individual, de un solo uso. No se identifican los resultados por liga.
     El cuestionario no guarda respuestas individuales; los indicadores solamente
     se mostrarán después del cierre de la campaña y al cumplir el umbral de privacidad.
    </p>
   </div>
  </div>
  <div className="mt-5 flex flex-wrap items-center gap-3">
   <label className="text-xs font-bold text-neutral-600">Cantidad
    <input aria-label="Número de ligas" type="number" min={1} max={100}
     value={count} onChange={e=>setCount(Number(e.target.value))} disabled={!open||busy}
     className="mt-1 block w-28 rounded-xl border border-neutral-300 p-3 text-sm"/>
   </label>
   <button type="button" disabled={!open||busy||!Number.isInteger(count)||count<1||count>100}
    onClick={()=>void generate()}
    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">
    <Link2 className="h-4 w-4"/>{busy?"Generando...":"Generar ligas"}
   </button>
   <button type="button" disabled={!links.length} onClick={download}
    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">
    <Download className="h-4 w-4"/>Descargar CSV
   </button>
  </div>
  {!open&&<p className="mt-3 text-sm text-neutral-500">Abre la campaña para generar invitaciones.</p>}
  {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-800">{error}</p>}
  {message&&<p role="status" className="mt-4 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-700">{message}</p>}
  <p className="mt-5 text-xs font-bold text-neutral-600">
   {loading?"Consultando enlaces...":links.length+" ligas creadas"}
  </p>
  <div className="mt-2 max-h-80 divide-y divide-neutral-100 overflow-y-auto">
   {links.map((a,i)=><div key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
    <p className="text-sm font-semibold text-neutral-800">Liga {i+1}</p>
    <button type="button" disabled={!a.url} onClick={()=>a.url&&void copy(a.url)}
     className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-bold text-neutral-700 disabled:opacity-40">
     <ClipboardCopy className="h-3.5 w-3.5"/>Copiar
    </button>
   </div>)}
  </div>
  <p className="mt-4 rounded-xl bg-neutral-50 p-4 text-xs leading-6 text-neutral-600">
   Las ligas permiten acceder a un cuestionario relacionado con temas sensibles.
   Evita compartirlas en grupos públicos o adjuntar los CSV a reportes organizacionales.
   El sistema no almacena un listado de personas ni muestra resultados por invitación.
  </p>
 </section>;
}
