"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, Check, ClipboardCopy, ListFilter, RefreshCw, UserRoundX } from "lucide-react";
import {
  c3AlertCounts, c3SortAlerts,
  type C3AlertItem
} from "@/lib/c3/action-alerts";

type Filter="attention"|"overdue"|"today"|"upcoming"|"no_date"|"no_owner"|"all";
function dateDisplay(day:string|null){
  if(!day)return "Sin fecha";
  const fields=day.split("-");
  return fields.length===3?fields[2]+"/"+fields[1]+"/"+fields[0]:day;
}
function daysLabel(task:C3AlertItem){
  if(task.kind==="overdue")return String(Math.abs(task.daysUntilDue??0))+" días de atraso";
  if(task.kind==="today")return "Vence hoy";
  if(task.kind==="upcoming")return task.daysUntilDue===1?"Vence mañana":"Vence en "+task.daysUntilDue+" días";
  if(task.kind==="no_date")return "Sin fecha compromiso";
  return dateDisplay(task.dueOn);
}
function flag(task:C3AlertItem):string{
  if(task.kind==="overdue")return "VENCIDA";
  if(task.kind==="today")return "HOY";
  if(task.kind==="upcoming")return "PRÓXIMA";
  if(task.kind==="no_date")return "SIN FECHA";
  if(task.missingOwner)return "SIN RESPONSABLE";
  return "PROGRAMADA";
}
function matchesFilter(task:C3AlertItem,filter:Filter){
  if(filter==="all")return true;
  if(filter==="no_owner")return task.missingOwner;
  if(filter==="attention")return task.kind!=="normal"||task.missingOwner;
  return task.kind===filter;
}
function digestFor(items:C3AlertItem[],today:string){
  const counts=c3AlertCounts(items);
  const title="AGENDA SEMANAL DE SEGUIMIENTO · FACTORH C3 PRO";
  const data=[title,"Corte: "+dateDisplay(today)+" (Ciudad de México)",
    "Actividades en la selección: "+counts.active,
    "Vencidas: "+counts.overdue+" | Hoy: "+counts.today+
      " | Próximos 7 días: "+counts.upcoming,
    "Sin fecha: "+counts.noDate+" | Sin responsable: "+counts.withoutOwner,
    "",
    "COMPROMISOS PARA REVISAR"];
  if(!items.length)data.push("No existen compromisos con los filtros seleccionados.");
  c3SortAlerts(items).forEach((a,i)=>{
    data.push((i+1)+". ["+flag(a)+"] "+a.title);
    data.push("   "+a.campaign.organizationName+" · "+a.campaign.name);
    data.push("   Responsable: "+(a.owner||"POR ASIGNAR")+
      " | Fecha: "+dateDisplay(a.dueOn)+
      " | Etapa: "+a.phaseDays+" días");
    data.push("   Seguimiento interno: FactoRH > C3 PRO > "+a.campaign.name+" > Plan de acción");
  });
  data.push("","Agenda administrativa; no contiene respuestas de encuestados.",
    "Preparada para revisión semanal. No se enviaron notificaciones automáticamente.");
  return data.join("\n");
}
export default function C3AlertsClient({items,today}:{items:C3AlertItem[];today:string}){
  const router=useRouter();
  const [busy,startRefresh]=useTransition();
  const [company,setCompany]=useState("all");
  const [phase,setPhase]=useState("all");
  const [status,setStatus]=useState<Filter>("attention");
  const [query,setQuery]=useState("");
  const [message,setMessage]=useState("");
  const [showFallback,setShowFallback]=useState("");
  const [copied,setCopied]=useState(false);
  const companies=useMemo(()=>
    [...new Map(items.map(a=>[a.campaign.organizationId,a.campaign.organizationName])).entries()]
    .sort((a,b)=>a[1].localeCompare(b[1],"es")), [items]);
  const filtered=useMemo(()=>c3SortAlerts(items.filter(a=>
    (company==="all"||a.campaign.organizationId===company)&&
    (phase==="all"||String(a.phaseDays)===phase)&&
    matchesFilter(a,status)&&
    (!query||[
      a.title,a.owner,a.campaign.organizationName,a.campaign.name,
      a.dimensionCode||""
    ].join(" ").toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")))
  )),[items,company,phase,status,query]);
  const counts=useMemo(()=>c3AlertCounts(filtered),[filtered]);
  const allCounts=useMemo(()=>c3AlertCounts(items),[items]);
  const selection=[["attention","Requieren atención"],["overdue","Vencidas"],["today","Vencen hoy"],
    ["upcoming","Próximos 7 días"],["no_date","Sin fecha"],["no_owner","Sin responsable"],["all","Todas"]] as const;
  async function copyAgenda(){
    setMessage("");setCopied(false);
    const agenda=digestFor(filtered,today);
    try{
      await navigator.clipboard.writeText(agenda);
      setCopied(true);setShowFallback("");
      setMessage("Agenda copiada. Puedes pegarla en WhatsApp, correo o tu minuta de seguimiento.");
    }catch{
      setShowFallback(agenda);
      setMessage("El navegador no permitió copiar automáticamente. Selecciona y copia el texto de abajo.");
    }
  }
  function refresh(){
    startRefresh(()=>router.refresh());
  }
  return <div className="space-y-6">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[
        {title:"Vencidas",count:allCounts.overdue,icon:AlertTriangle,filter:"overdue" as Filter},
        {title:"Vencen hoy",count:allCounts.today,icon:CalendarClock,filter:"today" as Filter},
        {title:"Próximos 7 días",count:allCounts.upcoming,icon:CalendarClock,filter:"upcoming" as Filter},
        {title:"Sin fecha",count:allCounts.noDate,icon:ListFilter,filter:"no_date" as Filter},
        {title:"Sin responsable",count:allCounts.withoutOwner,icon:UserRoundX,filter:"no_owner" as Filter}
      ].map(card=><button key={card.title} type="button" onClick={()=>setStatus(card.filter)}
        className={"rounded-2xl border bg-white p-5 text-left shadow-sm transition-colors hover:bg-neutral-50 "+
        (status===card.filter?"border-orange-400 ring-1 ring-orange-300":"border-neutral-200")}>
        <card.icon className="h-5 w-5 text-orange-600"/>
        <p className="mt-3 text-3xl font-black tabular-nums text-neutral-800">{card.count}</p>
        <p className="mt-1 text-sm font-bold text-neutral-700">{card.title}</p>
      </button>)}
    </section>

    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-black text-neutral-800">Preparar reunión semanal</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Selecciona una empresa o fase, revisa las alertas y copia una agenda de compromisos
            lista para compartir con los responsables. No incluye respuestas individuales.
          </p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={refresh} disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-bold text-neutral-700 disabled:opacity-50">
            <RefreshCw className={"h-4 w-4 "+(busy?"animate-spin":"")}/>Actualizar
          </button>
          <button type="button" onClick={()=>void copyAgenda()}
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-neutral-700">
            {copied?<Check className="h-4 w-4"/>:<ClipboardCopy className="h-4 w-4"/>}
            Copiar agenda semanal
          </button>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-bold text-neutral-600">Empresa
          <select value={company} onChange={e=>setCompany(e.target.value)}
            className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-3 text-sm">
            <option value="all">Todas las empresas</option>
            {companies.map(([id,name])=><option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-neutral-600">Etapa del plan
          <select value={phase} onChange={e=>setPhase(e.target.value)}
            className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-3 text-sm">
            <option value="all">30, 60 y 90 días</option>
            <option value="30">Días 1–30</option><option value="60">Días 31–60</option><option value="90">Días 61–90</option>
          </select>
        </label>
        <label className="text-xs font-bold text-neutral-600">Buscar compromiso
          <input type="search" value={query} onChange={e=>setQuery(e.target.value)}
            placeholder="Actividad, área, campaña..."
            className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm"/>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {selection.map(([value,label])=><button key={value} type="button" onClick={()=>setStatus(value)}
          className={"rounded-lg px-3 py-2 text-xs font-bold transition-colors "+
            (status===value?"bg-orange-600 text-white":"bg-neutral-100 text-neutral-700 hover:bg-neutral-200")}>
          {label}
        </button>)}
      </div>
      {message&&<p role="status" className="mt-4 rounded-xl bg-neutral-100 p-4 text-sm text-neutral-700">{message}</p>}
      {showFallback&&<textarea aria-label="Agenda semanal para copiar" readOnly rows={9} value={showFallback}
        className="mt-3 w-full rounded-xl border border-neutral-300 p-3 text-sm text-neutral-700"/>}
    </section>

    <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 p-6">
        <div><h2 className="text-xl font-black text-neutral-800">Compromisos que requieren seguimiento</h2>
          <p className="mt-2 text-sm text-neutral-600">
            {filtered.length} actividades mostradas · {counts.overdue} vencidas ·
            {" "+counts.today} para hoy · {counts.upcoming} próximas · {counts.noDate} sin fecha
          </p>
        </div>
        <span className="rounded-full bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-600">
          Corte {dateDisplay(today)}
        </span>
      </header>
      {!filtered.length?<div className="p-8">
        <p className="font-bold text-neutral-800">No hay compromisos para esta selección.</p>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Puede que no existan actividades aún o que todas estén concluidas. Cambia los filtros
          o crea una actividad desde el Plan de Acción de la campaña correspondiente.
        </p>
        <Link href="/protected/c3/seguimiento" className="mt-4 inline-block text-sm font-bold text-orange-600">
          Ir a los planes de acción →
        </Link>
      </div>:<div className="divide-y divide-neutral-100">
        {filtered.map(task=><article key={task.id} className="p-5 hover:bg-neutral-50">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-wide text-orange-600">
                {task.campaign.organizationName} · {task.campaign.name}
              </p>
              <h3 className="mt-2 text-base font-black text-neutral-800">{task.title}</h3>
              <p className="mt-2 text-sm text-neutral-600">
                Responsable: <strong>{task.owner||"Por asignar"}</strong>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={"rounded-lg px-3 py-2 text-xs font-bold "+
                (task.kind==="overdue"?"bg-red-50 text-red-700":
                task.kind==="today"?"bg-orange-50 text-orange-700":
                "bg-neutral-100 text-neutral-700")}>
                {daysLabel(task)}
              </span>
              {task.missingOwner&&<span className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Sin responsable</span>}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600">
            <span>{task.phaseDays} días · {task.dimensionCode||"Acción transversal"} ·
              {" "+(task.priority==="alta"?"Prioridad alta":task.priority==="baja"?"Prioridad baja":"Prioridad media")}
            </span>
            <Link href={"/protected/c3/"+task.campaignId+"/plan"}
              className="rounded-lg bg-neutral-800 px-4 py-2.5 font-bold text-white hover:bg-neutral-700">
              Gestionar actividad →
            </Link>
          </div>
        </article>)}
      </div>}
    </section>
    <p className="text-xs leading-6 text-neutral-500">
      Las alertas se calculan al consultar o actualizar esta pantalla: no se envían solas,
      ni modifican fechas o estados. Se excluyen las acciones completadas, canceladas y
      las campañas canceladas. Este seguimiento no expone respuestas de encuestados.
    </p>
  </div>;
}
