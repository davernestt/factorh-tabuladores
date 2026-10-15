"use client";
import {useCallback,useEffect,useState} from "react";
import {Download,Link2,MessageCircle,Mail,ShieldCheck} from "lucide-react";
import Link from "next/link";

type Invite={id:string;url:string|null;departmentId:string|null};
type Department={id:string;name:string;active:boolean};
const csvCell=(value:string)=>'"'+(/^[=+\-@\t\r]/.test(value)?"'"+value:value).replace(/"/g,'""')+'"';

export default function ClimaInviteManager({campaignId,organizationId,open}:{campaignId:string;organizationId:string;open:boolean}){
 const [invites,setInvites]=useState<Invite[]>([]);
 const [departments,setDepartments]=useState<Department[]>([]);
 const [departmentId,setDepartmentId]=useState("");
 const [count,setCount]=useState(10);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const reload=useCallback(async()=>{
  try{
   const res=await fetch("/api/clima-encuestas/invites?campaignId="+encodeURIComponent(campaignId),{cache:"no-store"});
   const body=await res.json();
   if(!res.ok)throw Error(body.error||"No se pudieron obtener las ligas");
   setInvites(body.links||[]);
  }catch(e){setError(e instanceof Error?e.message:"Error de consulta")}
  finally{setLoading(false)}
 },[campaignId]);
 useEffect(()=>{void reload()},[reload]);
 useEffect(()=>{
  let cancelled=false;
  void fetch("/api/360/departamentos?organization_id="+encodeURIComponent(organizationId),{cache:"no-store"})
   .then(r=>r.ok?r.json():Promise.reject(new Error("No se pudo cargar el catálogo.")))
   .then(data=>{if(!cancelled)setDepartments((data.departments||[]).filter((d:Department)=>d.active));})
   .catch(()=>{if(!cancelled)setError("No se pudieron cargar departamentos. Actualiza la página.");});
  return ()=>{cancelled=true};
 },[organizationId]);
 async function generate(){
  setBusy(true);setError("");setNotice("");
  try{
   const res=await fetch("/api/clima-encuestas/invites",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({campaignId,count,departmentId:departmentId||null})
   });
   const body=await res.json();
   if(!res.ok)throw Error(body.error||"No se generaron las ligas");
   await reload();
   setNotice("Se generaron "+body.count+" ligas. Distribúyelas individualmente; el sistema no revela quién respondió.");
  }catch(e){setError(e instanceof Error?e.message:"Error al generar ligas")}finally{setBusy(false)}
 }
 function download(){
  const content="\uFEFF"+[["numero","departamento","liga_individual"],...invites.map((it,i)=>[String(i+1),departments.find(d=>d.id===it.departmentId)?.name||"Sin departamento",it.url||"No recuperable"])].map(row=>row.map(csvCell).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([content],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="FactoRH_Ligas_Encuesta_"+campaignId.slice(0,8)+".csv";
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 async function copy(url:string){
  try{await navigator.clipboard.writeText(url);setNotice("Enlace copiado.");setError("")}
  catch{setError("No fue posible copiar automáticamente. Puedes descargar las ligas en CSV.")}
 }
 return <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
  <div className="flex items-start gap-3">
   <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-orange-600"/>
   <div>
    <h2 className="text-xl font-black text-neutral-800">Ligas confidenciales de aplicación</h2>
    <p className="mt-2 text-sm leading-6 text-neutral-600">Genera enlaces únicos y de un solo uso. No guardamos nombres ni mostramos qué enlace respondió. Si compartes una liga con una persona identificada, quien la distribuya podría relacionarla con ella; evita conservar ese registro.</p>
   </div>
  </div>
  <div className="mt-5 flex flex-wrap items-center gap-3">
   <label className="text-sm font-bold text-neutral-700">Departamento
    <select className="mt-2 block min-w-[195px] rounded-xl border border-neutral-300 bg-white p-3" value={departmentId} onChange={e=>setDepartmentId(e.target.value)} disabled={!open||busy}>
     <option value="">Sin departamento</option>{departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
    </select>
   </label>
   <input aria-label="Número de ligas" type="number" value={count} onChange={e=>setCount(Number(e.target.value))}
    disabled={!open||busy} min={1} max={100} className="w-28 rounded-xl border border-neutral-300 p-3"/>
   <button type="button" disabled={!open||busy||!Number.isInteger(count)||count<1||count>100}
    onClick={()=>void generate()}
    className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">
    <Link2 className="h-4 w-4"/>{busy?"Generando...":"Generar ligas"}
   </button>
   <button type="button" disabled={!invites.length} onClick={download}
    className="inline-flex items-center gap-2 rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">
    <Download className="h-4 w-4"/>Exportar CSV
   </button>
  </div>
  <p className="mt-3 text-xs text-neutral-500">El departamento queda registrado al generar el lote, sin solicitar nombres a quienes responden. <Link href="/protected/departamentos" className="font-bold text-orange-600">Administrar departamentos →</Link></p>
  {!open&&<p className="mt-3 text-sm text-neutral-500">Abre la campaña para crear nuevas ligas.</p>}
  {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
  {notice&&<p role="status" className="mt-4 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-700">{notice}</p>}
  <div className="mt-5 flex items-center justify-between text-sm text-neutral-600">
   <span>{loading?"Cargando ligas...":invites.length+" ligas registradas"}</span>
   <button type="button" onClick={()=>void reload()} className="font-bold text-orange-600">Actualizar</button>
  </div>
  <div className="mt-3 max-h-[430px] divide-y divide-neutral-100 overflow-auto">
   {invites.map((item,i)=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
    <p className="text-sm font-bold text-neutral-800">Liga {i+1}<span className="ml-2 text-xs font-normal text-neutral-500">{departments.find(d=>d.id===item.departmentId)?.name||"Sin departamento"}</span></p>
    <div className="flex flex-wrap gap-2">
     <button type="button" disabled={!item.url} onClick={()=>item.url&&void copy(item.url)}
      className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-bold disabled:opacity-40">Copiar</button>
     {item.url&&<>
      <a href={"https://wa.me/?text="+encodeURIComponent("Te invitamos a participar en una encuesta confidencial de FactoRH. Esta liga es individual: "+item.url)}
       target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
       <MessageCircle className="h-3.5 w-3.5"/>WhatsApp</a>
      <a href={"mailto:?subject="+encodeURIComponent("Invitación · Encuesta FactoRH")+"&body="+encodeURIComponent("Hola, te invitamos a participar de forma voluntaria en esta encuesta de FactoRH: "+item.url)}
       className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
       <Mail className="h-3.5 w-3.5"/>Correo</a>
     </>}
    </div>
   </div>)}
  </div>
  <p className="mt-4 text-xs leading-6 text-neutral-500">Los archivos exportados contienen credenciales individuales y deben almacenarse de forma segura. Envío por WhatsApp y correo requiere confirmación manual.</p>
 </section>;
}
