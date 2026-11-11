"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {Download,Link2,Mail,MessageCircle,Plus,RefreshCw,Send,ShieldCheck} from "lucide-react";

type Department={id:string;name:string};
type Invite={
 id:string;code:string;segment:string;departmentId:string|null;
 distributionStatus:"pending"|"shared";sharedAt?:string|null;url:string|null;
};
type Filter="pending"|"shared"|"all";

const kinds:Record<string,string>={
 sin_clasificar:"Sin clasificar",operativo:"Operativo",administrativo:"Administrativo"
};
const csvCell=(value:string)=>'"'+( /^[=+\-@\t\r]/.test(value)?"'"+value:value).replace(/"/g,'""')+'"';

export default function InviteGenerator({campaignId,disabled}:{campaignId:string;disabled:boolean}){
 const [departments,setDepartments]=useState<Department[]>([]);
 const [invites,setInvites]=useState<Invite[]>([]);
 const [count,setCount]=useState(10);
 const [segment,setSegment]=useState("sin_clasificar");
 const [departmentId,setDepartmentId]=useState("");
 const [departmentName,setDepartmentName]=useState("");
 const [filter,setFilter]=useState<Filter>("pending");
 const [search,setSearch]=useState("");
 const [busy,setBusy]=useState(false);
 const [adding,setAdding]=useState(false);
 const [error,setError]=useState("");
 const [info,setInfo]=useState("");
 const [loading,setLoading]=useState(true);
 const [updatingId,setUpdatingId]=useState<string|null>(null);

 const reload=useCallback(async()=>{
  setLoading(true);
  try{
   const [linksResponse,deptResponse]=await Promise.all([
    fetch("/api/c3/invites/bulk?campaignId="+encodeURIComponent(campaignId),{cache:"no-store"}),
    fetch("/api/c3/departments?campaignId="+encodeURIComponent(campaignId),{cache:"no-store"})
   ]);
   const [linksData,deptData]=await Promise.all([linksResponse.json(),deptResponse.json()]);
   if(!linksResponse.ok||!deptResponse.ok)throw new Error(linksData.error||deptData.error||"No se pudieron cargar las ligas.");
   setInvites(linksData.links||[]);
   setDepartments(deptData.departments||[]);
  }catch(e){setError(e instanceof Error?e.message:"Ocurrió un error.");}
  finally{setLoading(false);}
 },[campaignId]);
 useEffect(()=>{void reload();},[reload]);

 const totals=useMemo(()=>({
  pending:invites.filter(x=>x.distributionStatus==="pending").length,
  shared:invites.filter(x=>x.distributionStatus==="shared").length,
  all:invites.length
 }),[invites]);
 const shown=useMemo(()=>invites.filter(x=>
  (filter==="all"||x.distributionStatus===filter)&&
  (!search||[x.code,kinds[x.segment]||x.segment,departments.find(d=>d.id===x.departmentId)?.name||""]
    .join(" ").toLowerCase().includes(search.toLowerCase()))
 ),[filter,search,invites,departments]);
 const baseMessage=(item:Invite)=>"Hola, te compartimos la liga individual para participar en la encuesta de Clima Laboral de tu organización (FactoRH C3 PRO). Tu código de distribución es "+item.code+". La participación es voluntaria y los resultados se reportan en grupos, nunca como respuestas individuales. La liga es de un solo uso: "+(item.url||"");
 const whatsAppHref=(item:Invite)=>"https://wa.me/?text="+encodeURIComponent(baseMessage(item));
 const emailHref=(item:Invite)=>"mailto:?subject="+encodeURIComponent("Invitación confidencial · Clima Laboral FactoRH")+"&body="+encodeURIComponent(baseMessage(item));
 const clear=()=>{setError("");setInfo("");};

 async function createBatch(){
  clear();
  if(!Number.isInteger(count)||count<1||count>200){setError("Genera entre 1 y 200 ligas por lote.");return;}
  setBusy(true);
  try{
   const r=await fetch("/api/c3/invites/bulk",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({campaignId,segment,count,departmentId:departmentId||null})});
   const data=await r.json();
   if(!r.ok)throw new Error(data.error||"No se generó el lote.");
   await reload();setFilter("pending");setInfo("Se generaron "+data.count+" ligas individuales. Puedes copiarlas, compartirlas o descargarlas en CSV. Registra manualmente las que hayas enviado.");
  }catch(e){setError(e instanceof Error?e.message:"Ocurrió un error.");}
  finally{setBusy(false);}
 }
 async function addDepartment(){
  clear();
  const name=departmentName.trim();
  if(name.length<2){setError("Escribe un nombre de área de al menos dos caracteres.");return;}
  setAdding(true);
  try{
   const r=await fetch("/api/c3/departments",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({campaignId,name})});
   const data=await r.json();
   if(!r.ok)throw new Error(data.error||"No se guardó el departamento.");
   setDepartments(previous=>[...previous,data.department].sort((a,b)=>a.name.localeCompare(b.name,"es")));
   setDepartmentId(data.department.id);setDepartmentName("");
   setInfo("Departamento añadido. Puedes seleccionarlo al generar el siguiente lote.");
  }catch(e){setError(e instanceof Error?e.message:"No fue posible añadir el área.");}
  finally{setAdding(false);}
 }
 async function mark(item:Invite,shared:boolean){
  clear();setUpdatingId(item.id);
  try{
   const r=await fetch("/api/c3/invites/distribution",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({campaignId,inviteId:item.id,shared})});
   const data=await r.json();
   if(!r.ok)throw new Error(data.error||"No se actualizó la distribución.");
   setInvites(current=>current.map(x=>x.id===item.id?{
    ...x,distributionStatus:shared?"shared":"pending",sharedAt:shared?new Date().toISOString():null
   }:x));
   setInfo(shared?item.code+" marcada como compartida (registro manual).":item.code+" regresó a pendiente.");
  }catch(e){setError(e instanceof Error?e.message:"Ocurrió un error.");}
  finally{setUpdatingId(null);}
 }
 async function copy(item:Invite){
  clear();
  if(!item.url){setError("Este enlace histórico no se puede recuperar. Solicita una nueva liga.");return;}
  try{await navigator.clipboard.writeText(item.url);setInfo("Liga "+item.code+" copiada. Esto NO la marca como enviada.");}
  catch{setError("El navegador no permitió copiar automáticamente.");}
 }
 function downloadCsv(){
  clear();
  const header=["codigo","tipo_personal","departamento","estado_distribucion","liga_personal"];
  const lines=[header,...invites.map(x=>[
   x.code,kinds[x.segment]||x.segment,departments.find(d=>d.id===x.departmentId)?.name||"Sin asignar",
   x.distributionStatus==="shared"?"Marcada como compartida":"Pendiente",x.url||"No recuperable"
  ])];
  const payload="\uFEFF"+lines.map(row=>row.map(csvCell).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([payload],{type:"text/csv;charset=utf-8"}));
  const link=document.createElement("a");link.href=url;link.download="FactoRH_C3_Distribucion_"+campaignId.slice(0,8)+".csv";
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  setInfo("Archivo CSV descargado. Contiene ligas de acceso: guárdalo en un lugar seguro y no lo compartas por grupos.");
 }

 return <section className="space-y-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-4">
   <div><h2 className="text-xl font-black text-neutral-800">Invitaciones y distribución confidencial</h2>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">Genera muchas ligas en una sola operación. Identifica cada enlace mediante un código y registra si ya lo compartiste. No guardamos nombres, teléfonos ni correos de colaboradores en este registro.</p></div>
   <ShieldCheck className="h-7 w-7 text-orange-600"/>
  </div>
  <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-neutral-700">
   <strong>Importante:</strong> este es un sistema de encuestas <strong>confidenciales</strong>, no de anonimato absoluto. Un enlace individual puede vincularse con la persona a la que lo entregas. FactoRH no muestra respuestas individuales ni indica en esta tabla qué código respondió. Los indicadores por departamento se publicarán solo cuando cumplan los umbrales de confidencialidad.
  </div>
  <section className="rounded-2xl border border-neutral-200 p-5">
   <h3 className="font-black text-neutral-800">1. Departamentos (opcional)</h3>
   <p className="mt-1 text-xs leading-5 text-neutral-500">Por ejemplo: Recursos Humanos, Finanzas, Logística. Si un grupo es pequeño, sus resultados se ocultarán o se agruparán para proteger a los participantes.</p>
   <div className="mt-3 flex flex-wrap gap-2">
    <input aria-label="Nombre de departamento" value={departmentName} maxLength={80} onChange={e=>setDepartmentName(e.target.value)}
     placeholder="Ej. Finanzas" className="min-w-0 flex-1 rounded-xl border border-neutral-300 px-4 py-3 text-sm"/>
    <button type="button" disabled={adding||busy} onClick={addDepartment} className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-neutral-800 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
     <Plus className="h-4 w-4"/>{adding?"Agregando...":"Agregar área"}
    </button>
   </div>
   {!!departments.length&&<p className="mt-3 text-xs text-neutral-500">{departments.length} departamentos configurados: {departments.map(d=>d.name).join(" · ")}</p>}
  </section>
  <section className="rounded-2xl border border-neutral-200 p-5">
   <h3 className="font-black text-neutral-800">2. Generar ligas por lote</h3>
   <div className="mt-4 grid gap-3 md:grid-cols-3">
    <label className="text-xs font-bold text-neutral-600">Cantidad de ligas
     <input type="number" min={1} max={200} step={1} value={count} onChange={e=>setCount(Number(e.target.value))}
      disabled={disabled||busy} className="mt-2 w-full rounded-xl border border-neutral-300 p-3 text-base text-neutral-800"/>
    </label>
    <label className="text-xs font-bold text-neutral-600">Tipo de personal (opcional)
     <select value={segment} onChange={e=>setSegment(e.target.value)} disabled={disabled||busy}
      className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm text-neutral-800">
      <option value="sin_clasificar">Sin clasificar</option><option value="operativo">Operativo</option><option value="administrativo">Administrativo</option>
     </select>
    </label>
    <label className="text-xs font-bold text-neutral-600">Departamento (opcional)
     <select value={departmentId} onChange={e=>setDepartmentId(e.target.value)} disabled={disabled||busy}
      className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm text-neutral-800">
      <option value="">Sin departamento</option>{departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
     </select>
    </label>
   </div>
   <div className="mt-4 flex flex-wrap items-center gap-3">
    <button type="button" onClick={createBatch} disabled={disabled||busy} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-40">
     <Link2 className="h-4 w-4"/>{busy?"Generando...":"Generar "+count+" ligas"}
    </button>
    {disabled&&<p className="text-xs text-neutral-500">Abre la campaña para generar enlaces. Puedes consultar los que ya existen aunque esté cerrada.</p>}
   </div>
  </section>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
  {info&&<p role="status" className="rounded-xl bg-neutral-100 p-4 text-sm text-neutral-700">{info}</p>}
  <section className="overflow-hidden rounded-2xl border border-neutral-200">
   <div className="flex flex-wrap items-start justify-between gap-3 bg-neutral-50 p-5">
    <div><h3 className="font-black text-neutral-800">3. Control de distribución</h3><p className="mt-1 text-xs text-neutral-600">Las marcas de envío son manuales. WhatsApp y correo abren sus aplicaciones, pero no envían mensajes automáticamente.</p></div>
    <div className="flex flex-wrap gap-2">
     <button onClick={()=>void reload()} type="button" disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-700"><RefreshCw className="h-4 w-4"/>Actualizar</button>
     <button onClick={downloadCsv} type="button" disabled={!invites.length} className="inline-flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"><Download className="h-4 w-4"/>Exportar CSV</button>
    </div>
   </div>
   <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 p-4">
    <div className="flex flex-wrap gap-2">
     {([["pending","Por compartir"],["shared","Marcadas compartidas"],["all","Todas"]] as const).map(([value,label])=>
      <button key={value} type="button" onClick={()=>setFilter(value)} className={"rounded-lg px-3 py-2 text-xs font-bold "+(filter===value?"bg-orange-600 text-white":"bg-neutral-100 text-neutral-700")}>{label} ({totals[value]})</button>)}
    </div>
    <input aria-label="Buscar liga por código o departamento" placeholder="Buscar código o área..." value={search} onChange={e=>setSearch(e.target.value)}
     className="rounded-lg border border-neutral-300 p-2 text-sm"/>
   </div>
   {loading?<p className="p-6 text-sm text-neutral-500">Cargando registro...</p>:shown.length===0?<p className="p-6 text-sm text-neutral-500">No hay ligas con este filtro. Crea un lote o cambia el filtro.</p>:
    <div className="divide-y divide-neutral-100">{shown.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 hover:bg-neutral-50">
     <div className="min-w-[150px] flex-1">
      <p className="font-black text-neutral-800">{item.code}</p>
      <p className="mt-1 text-xs text-neutral-500">{kinds[item.segment]||item.segment} · {departments.find(d=>d.id===item.departmentId)?.name||"Sin departamento"}</p>
      <p className={"mt-2 text-xs font-semibold "+(item.distributionStatus==="shared"?"text-emerald-700":"text-orange-700")}>
       {item.distributionStatus==="shared"?"Marcada como compartida":"Pendiente de compartir"}
      </p>
     </div>
     <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={()=>void copy(item)} disabled={!item.url} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-700 disabled:opacity-40">Copiar</button>
      {item.url&&<>
       <a href={whatsAppHref(item)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"><MessageCircle className="h-4 w-4"/>WhatsApp</a>
       <a href={emailHref(item)} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800"><Mail className="h-4 w-4"/>Correo</a>
      </>}
      <button type="button" onClick={()=>void mark(item,item.distributionStatus!=="shared")} disabled={updatingId===item.id}
       className="inline-flex items-center gap-1 rounded-lg bg-neutral-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">
       <Send className="h-3 w-3"/>{item.distributionStatus==="shared"?"Volver a pendiente":"Marcar compartida"}
      </button>
     </div>
    </div>)}</div>}
   <div className="border-t border-neutral-200 bg-neutral-50 px-5 py-4 text-xs leading-6 text-neutral-600">
    <strong>Privacidad:</strong> no se muestran estados de respuesta por liga. Las cifras de participación se reportan únicamente de forma agregada. Los enlaces CSV son credenciales de acceso y requieren almacenamiento seguro.
   </div>
  </section>
 </section>;
}
