"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Search, ClipboardList, AlertTriangle, CheckCircle2, CalendarClock } from "lucide-react";

export type PortfolioCampaign = {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  status: string;
  reportReleased: boolean;
};
export type PortfolioAction = {
  id: string;
  campaignId: string;
  title: string;
  owner: string;
  phaseDays: number;
  priority: string;
  status: string;
  dimensionCode: string | null;
  dueOn: string | null;
  updatedAt: string;
};
const statusLabel: Record<string, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  completada: "Completada",
  cancelada: "Cancelada",
};
const campaignStatus: Record<string, string> = {
  draft: "Borrador", open: "Abierta", closed: "Cerrada", cancelled: "Cancelada"
};
const statusClass: Record<string, string> = {
  pendiente: "bg-neutral-100 text-neutral-700",
  en_proceso: "bg-blue-50 text-blue-700",
  completada: "bg-emerald-50 text-emerald-700",
  cancelada: "bg-neutral-100 text-neutral-500"
};
const priorityLabel: Record<string, string> = {
  alta: "Alta", media: "Media", baja: "Baja"
};

function csvCell(value: string) {
  // Spreadsheet formula injection protection for exported administrative text.
  const protectedValue = /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
  return '"' + protectedValue.replace(/"/g, '""') + '"';
}
function formattedDate(value: string | null) {
  if (!value) return "Sin fecha";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return day + "/" + month + "/" + year;
}
function overdue(action: PortfolioAction, today: string) {
  return Boolean(action.dueOn && action.dueOn < today &&
    action.status !== "completada" && action.status !== "cancelada");
}
function dueSoon(action: PortfolioAction, today: string, sevenDays: string) {
  return Boolean(action.dueOn && action.dueOn >= today && action.dueOn <= sevenDays &&
    action.status !== "completada" && action.status !== "cancelada");
}

export default function C3PortfolioClient({
  campaigns, actions, today, sevenDays,
}: {
  campaigns: PortfolioCampaign[];
  actions: PortfolioAction[];
  today: string;
  sevenDays: string;
}) {
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [taskFilter, setTaskFilter] = useState("all");
  const [phase, setPhase] = useState("all");
  const companyOptions = useMemo(
    () => [...new Map(campaigns.map(c => [c.organizationId, c.organizationName])).entries()]
      .sort((a,b) => a[1].localeCompare(b[1], "es")),
    [campaigns]
  );
  const campaignById = useMemo(() => new Map(campaigns.map(c => [c.id,c])), [campaigns]);

  const filteredCampaigns = useMemo(() => campaigns.filter(c =>
    (company === "all" || c.organizationId === company) &&
    (campaignFilter === "all" || c.status === campaignFilter) &&
    (!query || (c.name + " " + c.organizationName).toLocaleLowerCase("es")
      .includes(query.toLocaleLowerCase("es")))
  ), [campaigns, company, campaignFilter, query]);

  const visibleActions = useMemo(() => {
    const ids = new Set(filteredCampaigns.map(c => c.id));
    return actions.filter(a => ids.has(a.campaignId) &&
      (phase === "all" || String(a.phaseDays) === phase) &&
      (taskFilter === "all" ||
        (taskFilter === "overdue" ? overdue(a,today) :
         taskFilter === "soon" ? dueSoon(a,today,sevenDays) :
         taskFilter === a.status))
    );
  }, [actions, filteredCampaigns, taskFilter, phase, today, sevenDays]);

  const summary = useMemo(() => {
    const completed=visibleActions.filter(a => a.status === "completada").length;
    const pending=visibleActions.filter(a => a.status === "pendiente").length;
    const inProgress=visibleActions.filter(a => a.status === "en_proceso").length;
    const late=visibleActions.filter(a => overdue(a,today)).length;
    const soon=visibleActions.filter(a => dueSoon(a,today,sevenDays)).length;
    const excluded=visibleActions.filter(a => a.status === "cancelada").length;
    return {completed,pending,inProgress,late,soon,total:visibleActions.length,excluded};
  }, [visibleActions, today, sevenDays]);

  const campaignMetrics = useMemo(() => filteredCampaigns.map(c => {
    const all=actions.filter(a => a.campaignId === c.id && (phase === "all" || String(a.phaseDays) === phase));
    const active=all.filter(a => a.status !== "cancelada");
    const done=active.filter(a => a.status === "completada").length;
    return {
      ...c,
      count: active.length, done,
      late: active.filter(a => overdue(a,today)).length,
      soon: active.filter(a => dueSoon(a,today,sevenDays)).length,
      percent: active.length ? Math.round(100*done/active.length) : null
    };
  }), [filteredCampaigns, actions, phase, today, sevenDays]);

  const sortedActions = useMemo(() => [...visibleActions]
    .sort((a,b) => {
      const aOver=overdue(a,today)?0:1, bOver=overdue(b,today)?0:1;
      if(aOver!==bOver) return aOver-bOver;
      return (a.dueOn || "9999").localeCompare(b.dueOn || "9999") ||
        a.title.localeCompare(b.title,"es");
    }), [visibleActions,today]);

  function downloadCsv() {
    const header=["Empresa","Campaña","Actividad","Responsable","Fase días","Dimensión",
      "Prioridad","Estado","Fecha compromiso","Vencida","Última actualización"];
    const rows=sortedActions.map(a => {
      const c=campaignById.get(a.campaignId);
      return [c?.organizationName || "Empresa",c?.name||"Campaña",a.title,a.owner,
        String(a.phaseDays),a.dimensionCode||"",priorityLabel[a.priority]||a.priority,
        statusLabel[a.status]||a.status,a.dueOn||"",
        overdue(a,today)?"Sí":"No",a.updatedAt.slice(0,10)];
    });
    const content="\uFEFF"+[header,...rows].map(cells=>cells.map(csvCell).join(",")).join("\r\n");
    const objectUrl=URL.createObjectURL(new Blob([content],{type:"text/csv;charset=utf-8"}));
    const anchor=document.createElement("a");
    anchor.href=objectUrl; anchor.download="FactoRH_C3_Seguimiento_90_dias.csv";
    document.body.appendChild(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
  }

  const selectClass="rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm font-medium text-neutral-700";
  return <div className="space-y-6">
    <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-black text-neutral-800">Filtros de seguimiento</h2>
          <p className="mt-1 text-xs text-neutral-500">Las métricas responden a tus filtros. Solo se muestran compromisos administrativos, no respuestas a la encuesta.</p></div>
        <button type="button" onClick={downloadCsv} disabled={!sortedActions.length}
          className="inline-flex items-center gap-2 rounded-xl bg-neutral-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">
          <Download className="h-4 w-4"/>Exportar acciones CSV
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="relative xl:col-span-1">
          <span className="sr-only">Buscar campaña</span>
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-neutral-400"/>
          <input value={query} onChange={e=>setQuery(e.target.value)}
            placeholder="Buscar campaña..." className="w-full rounded-xl border border-neutral-300 py-2.5 pl-9 pr-3 text-sm"/>
        </label>
        <label><span className="sr-only">Empresa</span>
          <select className={selectClass+" w-full"} value={company} onChange={e=>setCompany(e.target.value)}>
            <option value="all">Todas las empresas</option>
            {companyOptions.map(([id,name])=><option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label><span className="sr-only">Estado de campaña</span>
          <select className={selectClass+" w-full"} value={campaignFilter} onChange={e=>setCampaignFilter(e.target.value)}>
            <option value="all">Todas las campañas</option>
            {Object.entries(campaignStatus).map(([key,label])=><option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label><span className="sr-only">Estado de actividad</span>
          <select className={selectClass+" w-full"} value={taskFilter} onChange={e=>setTaskFilter(e.target.value)}>
            <option value="all">Todas las actividades</option>
            <option value="overdue">Vencidas</option>
            <option value="soon">Vencen en 7 días</option>
            {Object.entries(statusLabel).map(([key,label])=><option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label><span className="sr-only">Fase</span>
          <select className={selectClass+" w-full"} value={phase} onChange={e=>setPhase(e.target.value)}>
            <option value="all">Todas las fases</option>
            <option value="30">Primeros 30 días</option><option value="60">Días 31–60</option><option value="90">Días 61–90</option>
          </select>
        </label>
      </div>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        {icon:ClipboardList, number:String(visibleActions.length), label:"Actividades filtradas",desc:String(filteredCampaigns.length)+" campañas"},
        {icon:CheckCircle2, number:summary.total-summary.excluded ? Math.round(summary.completed/(summary.total-summary.excluded)*100)+"%" : "—",
          label:"Cumplimiento",desc:String(summary.completed)+" completadas de "+String(summary.total-summary.excluded)+" vigentes"},
        {icon:AlertTriangle, number:String(summary.late),label:"Actividades vencidas",desc:"Compromisos sin completar"},
        {icon:CalendarClock,number:String(summary.soon),label:"Vencen en 7 días",desc:"Se recomienda dar seguimiento"}
      ].map(k=> <div key={k.label} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <k.icon className="h-5 w-5 text-orange-600"/>
        <p className="mt-3 text-3xl font-black tabular-nums text-neutral-800">{k.number}</p>
        <p className="mt-1 text-sm font-bold text-neutral-700">{k.label}</p>
        <p className="mt-1 text-xs text-neutral-500">{k.desc}</p>
      </div>)}
    </section>

    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-black text-neutral-800">Avance por campaña</h2>
          <p className="mt-1 text-sm text-neutral-500">El avance considera actividades completas entre actividades no canceladas.</p></div>
        <span className="rounded-full bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-600">{campaignMetrics.length} campañas</span>
      </div>
      {!campaignMetrics.length?<p className="mt-5 rounded-xl bg-neutral-50 p-5 text-sm text-neutral-600">No hay campañas con estos filtros.</p>:
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {campaignMetrics.map(c=><article key={c.id} className="rounded-2xl border border-neutral-200 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-orange-600">{c.organizationName}</p>
              <h3 className="mt-1 text-base font-black text-neutral-800">{c.name}</h3>
            </div>
            <span className="shrink-0 rounded-lg bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600">
              {campaignStatus[c.status]||c.status}
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div><p className="text-xs text-neutral-500">{c.count} acciones vigentes · {c.done} completas</p>
              <p className="mt-1 text-xs font-medium text-neutral-500">
                {c.reportReleased?"Informe final emitido":"Informe final pendiente"}
              </p></div>
            <p className="text-2xl font-black text-neutral-800">{c.percent===null?"Sin plan":c.percent+"%"}</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-2 rounded-full bg-orange-500" style={{width:(c.percent||0)+"%"}}/>
          </div>
          <div className="mt-4 flex flex-wrap justify-between gap-3 text-xs text-neutral-600">
            <span>{c.late} vencidas · {c.soon} próximas a vencer</span>
            <div className="flex flex-wrap gap-3"><Link href={"/protected/c3/"+c.id+"/plan"} className="font-black text-orange-600 hover:text-orange-700">Abrir plan →</Link><Link href={"/c3-plan-report/"+c.id} className="font-black text-neutral-800 hover:text-orange-700">Informe para Dirección →</Link></div>
          </div>
        </article>)}
      </div>}
    </section>

    <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 p-6">
        <h2 className="text-xl font-black text-neutral-800">Detalle de compromisos</h2>
        <p className="mt-2 text-sm text-neutral-500">Primero se muestran las actividades vencidas y después las de vencimiento más próximo.</p>
      </div>
      {!sortedActions.length?<div className="p-8 text-sm leading-7 text-neutral-600">
        Aún no hay acciones que coincidan con los filtros. Entra a una campaña y crea su primera actividad en el Plan de Acción de 90 días.
      </div>:
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>{["Campaña","Actividad / responsable","Fase","Vencimiento","Estado","Seguimiento"].map(label=>
                <th key={label} className="px-5 py-4">{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {sortedActions.map(a=>{
                const c=campaignById.get(a.campaignId);
                const late=overdue(a,today);
                return <tr key={a.id}>
                  <td className="min-w-[165px] px-5 py-4">
                    <p className="font-bold text-neutral-800">{c?.organizationName||"Empresa"}</p>
                    <p className="mt-1 text-xs text-neutral-500">{c?.name||"Campaña"}</p>
                  </td>
                  <td className="min-w-[200px] px-5 py-4">
                    <p className="font-semibold text-neutral-800">{a.title}</p>
                    <p className="mt-1 text-xs text-neutral-500">{a.owner||"Sin responsable definido"}</p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-neutral-600">Días {a.phaseDays===30?"1–30":a.phaseDays===60?"31–60":"61–90"}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className={late?"font-bold text-red-700":"text-neutral-600"}>{formattedDate(a.dueOn)}</span>
                    {late&&<p className="mt-1 text-xs font-bold text-red-700">Vencida</p>}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className={"rounded-lg px-3 py-2 text-xs font-bold "+(statusClass[a.status]||"bg-neutral-100 text-neutral-700")}>
                      {statusLabel[a.status]||a.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <Link href={"/protected/c3/"+a.campaignId+"/plan"} className="font-bold text-orange-600 hover:text-orange-700">Actualizar →</Link>
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>}
    </section>

    <p className="text-xs leading-6 text-neutral-500">
      Tablero de compromisos administrativos, independiente de la identidad de los encuestados.
      No presenta puntuaciones, respuestas individuales ni datos de grupos pequeños. Fecha de referencia:
      {" "+formattedDate(today)} (hora del centro de México).
    </p>
  </div>;
}
