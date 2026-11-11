"use client";
import {useEffect,useState} from "react";
export default function PulseInvites({campaignId,open}:{campaignId:string;open:boolean}){
 const [links,setLinks]=useState<Array<{id:string;url:string|null}>>([]);
 const [count,setCount]=useState(5),[error,setError]=useState(""),[busy,setBusy]=useState(false),[info,setInfo]=useState("");
 async function reload(){
  try{
   const r=await fetch("/api/pulso/invites?campaignId="+encodeURIComponent(campaignId),{cache:"no-store"});
   const data=await r.json();if(!r.ok)throw Error(data.error||"No se cargaron las ligas");
   setLinks(data.links||[]);
  }catch(e){setError(e instanceof Error?e.message:"Error de consulta")}
 }
 useEffect(()=>{void reload()},[campaignId]);
 async function generate(){
  setBusy(true);setError("");setInfo("");
  try{
   const r=await fetch("/api/pulso/invites",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({campaignId,count})});
   const data=await r.json();if(!r.ok)throw Error(data.error||"No se generaron las ligas");
   await reload();setInfo("Se generaron "+data.count+" ligas individuales. Compártelas de forma privada.");
  }catch(e){setError(e instanceof Error?e.message:"Error al generar")}finally{setBusy(false)}
 }
 const csvEscape=(v:string)=>'"'+(/^[=+\-@\t\r]/.test(v)?"'"+v:v).replace(/"/g,'""')+'"';
 function download(){
  const rows=[["liga"],...links.map(x=>[x.url||"No recuperable"])];
  const csv="\uFEFF"+rows.map(x=>x.map(csvEscape).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="FactoRH_Pulso_Ligas.csv";a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return <section className="space-y-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
  <h2 className="text-xl font-black text-neutral-800">Invitaciones confidenciales</h2>
  <p className="text-sm leading-6 text-neutral-600">Cada enlace funciona una vez. No se muestran estados de respuesta por liga para proteger la privacidad. No vincules la distribución con nombres en esta plataforma.</p>
  <div className="flex flex-wrap items-center gap-3">
   <input aria-label="Cantidad de ligas" type="number" min={1} max={100} value={count} disabled={!open||busy}
    onChange={e=>setCount(Number(e.target.value))} className="w-24 rounded-xl border border-neutral-300 p-3"/>
   <button type="button" disabled={!open||busy||count<1||count>100||!Number.isInteger(count)} onClick={()=>void generate()}
    className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">Generar ligas</button>
   <button type="button" disabled={!links.length} onClick={download} className="rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">Descargar CSV</button>
  </div>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
  {info&&<p role="status" className="rounded-xl bg-neutral-100 p-3 text-sm">{info}</p>}
  <p className="text-xs text-neutral-500">{links.length} ligas registradas. El CSV contiene accesos individuales: guárdalo de forma segura.</p>
  <div className="max-h-[390px] divide-y divide-neutral-100 overflow-auto">{links.map((item,i)=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
   <span className="text-sm font-bold text-neutral-700">Liga {i+1}</span>
   <div className="flex flex-wrap gap-2">
    <button type="button" disabled={!item.url} onClick={()=>item.url&&navigator.clipboard.writeText(item.url).then(()=>setInfo("Liga copiada."),()=>setError("No fue posible copiar."))}
     className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-bold disabled:opacity-40">Copiar</button>
    {item.url&&<a href={"https://wa.me/?text="+encodeURIComponent("Te invitamos a participar en una encuesta breve y confidencial de FactoRH. Tu participación es voluntaria: "+item.url)} target="_blank" rel="noopener noreferrer"
     className="rounded-lg bg-green-50 px-3 py-2 text-xs font-bold text-green-800">WhatsApp</a>}
   </div>
  </div>)}</div>
 </section>;
}
