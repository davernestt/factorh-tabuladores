import FactoRHLogo from "@/components/factorh-logo";
import Link from "next/link";
import PrintToolbar from "./print-toolbar";

export type C3ActionReportItem={
 id:string;phase_days:number;dimension_code:string|null;title:string;objective:string;
 owner_label:string;metric:string;evidence:string;priority:string;status:string;
 due_on:string|null;updated_at:string;
};
export type C3ActionReportData={
 campaignId:string;campaignName:string;organizationName:string;
 bankVersion:string;released:boolean;actions:C3ActionReportItem[];
};
const states:Record<string,string>={
 pendiente:"Pendiente",en_proceso:"En proceso",completada:"Completada",cancelada:"Cancelada"
};
const dims:Record<string,string>={
 D01:"Liderazgo inmediato",D02:"Comunicación interna",D03:"Colaboración y relaciones",
 D04:"Condiciones y recursos",D05:"Reconocimiento y valoración del trabajo",
 D06:"Valores y congruencia",D07:"Ética, respeto y justicia",D08:"Orientación a resultados",
 D09:"Adaptabilidad y mejora continua",D10:"Orgullo y pertenencia",
 D11:"Motivación y contribución",D12:"Permanencia y futuro",
 D13:"Compensaciones, beneficios y equidad percibida"
};
const stages=[
 {days:30,title:"Días 1–30",subtitle:"Escuchar y contrastar"},
 {days:60,title:"Días 31–60",subtitle:"Intervenir"},
 {days:90,title:"Días 61–90",subtitle:"Verificar"}
];
const dateLabel=(s:string|null)=>s?s.split("-").reverse().join("/"):"Por definir";
function todayMexico(){
 const p=new Intl.DateTimeFormat("en-US",{timeZone:"America/Mexico_City",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const get=(s:string)=>p.find(x=>x.type===s)?.value||"";
 return get("year")+"-"+get("month")+"-"+get("day");
}
function overdue(a:C3ActionReportItem,day:string){
 return Boolean(a.due_on&&a.due_on<day&&a.status!=="cancelada"&&a.status!=="completada");
}
function tally(items:C3ActionReportItem[]){
 const valid=items.filter(a=>a.status!=="cancelada");
 const completed=valid.filter(a=>a.status==="completada").length;
 return {valid:valid.length,completed,rate:valid.length?Math.round(100*completed/valid.length):null};
}

export default function C3PlanReportBody({report}:{report:C3ActionReportData}){
 const {actions}=report;
 const day=todayMexico();
 const count=tally(actions);
 const late=actions.filter(a=>overdue(a,day));
 const pending=actions.filter(a=>a.status==="pendiente").length;
 const inProgress=actions.filter(a=>a.status==="en_proceso").length;
 const priorities=actions.filter(a=>a.status!=="cancelada"&&a.status!=="completada")
  .sort((a,b)=>Number(overdue(b,day))-Number(overdue(a,day))||
   (a.due_on||"9999").localeCompare(b.due_on||"9999")).slice(0,5);
 const todayLong=new Intl.DateTimeFormat("es-MX",{
  timeZone:"America/Mexico_City",day:"numeric",month:"long",year:"numeric"
 }).format(new Date());
 return <main className="min-h-screen bg-neutral-100 px-4 py-7">
  <style>{"@page{size:A4;margin:13mm 12mm}@media print{html,body,main{background:#fff!important}.c3r-no-print{display:none!important}.c3r-paper{max-width:none!important;margin:0!important;padding:0!important;box-shadow:none!important;border:0!important;border-radius:0!important}.c3r-keep{break-inside:avoid;page-break-inside:avoid}.c3r-page{break-before:page;page-break-before:always}.c3r-color{-webkit-print-color-adjust:exact;print-color-adjust:exact}h1,h2,h3{break-after:avoid}}.c3r-wrap{overflow-wrap:anywhere}"}</style>
  <div className="c3r-no-print mx-auto mb-5 flex max-w-5xl flex-wrap items-center justify-between gap-3">
   <Link href={"/protected/c3/"+report.campaignId+"/plan"} className="rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-700">← Volver al plan</Link>
   <PrintToolbar/>
  </div>
  <article className="c3r-paper mx-auto max-w-5xl rounded-3xl bg-white px-6 pb-12 pt-9 text-neutral-800 shadow-xl sm:px-12">
   <header className="c3r-keep flex flex-wrap items-center justify-between gap-5 border-b-4 border-orange-500 pb-7">
    <div><FactoRHLogo className="h-12 w-auto" />
     <p className="mt-3 text-xs font-bold uppercase tracking-[.15em] text-orange-600">Consultoría organizacional</p></div>
    <div className="text-left sm:text-right"><p className="font-black">Informe ejecutivo</p>
     <p className="mt-1 text-xs text-neutral-500">Corte: {todayLong}</p>
     <p className="mt-1 text-xs text-neutral-500">C3 PRO · Banco {report.bankVersion}</p></div>
   </header>
   <section className="c3r-keep c3r-color mt-9 rounded-3xl bg-slate-800 p-8 text-white">
    <p className="text-xs font-black uppercase tracking-[.2em] text-orange-300">Seguimiento organizacional</p>
    <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">Plan de Acción<br/>de 90 días</h1>
    <p className="mt-6 text-xl font-black">{report.organizationName}</p>
    <p className="mt-1 text-sm text-slate-300">{report.campaignName}</p>
    <span className="mt-5 inline-flex rounded-lg border border-slate-500 bg-slate-700 px-3 py-2 text-xs font-bold">
     {report.released?"Seguimiento posterior al informe C3":"Plan preliminar · Informe de encuesta pendiente"}
    </span>
   </section>
   <section className="c3r-keep mt-9">
    <h2 className="text-xl font-black">1. Resumen ejecutivo para Dirección</h2>
    <p className="mt-3 text-sm leading-7 text-neutral-600">
     El cumplimiento refleja únicamente el avance documentado de compromisos administrativos.
     No implica una mejora validada del clima, cultura o compromiso de los colaboradores.
    </p>
    {!report.released&&<p className="c3r-color mt-4 rounded-xl border-l-4 border-orange-500 bg-orange-50 p-4 text-sm leading-6 text-neutral-700">
     <strong>Carácter preliminar:</strong> el informe final de la encuesta aún no se ha emitido.
     Ninguna actividad debe interpretarse como conclusión de las respuestas de los participantes.
    </p>}
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
     {[[String(count.valid),"Compromisos vigentes"],
       [String(count.completed),"Concluidos"],
       [count.rate===null?"—":count.rate+"%","Cumplimiento"],
       [String(late.length),"Fuera de plazo"]].map(([value,label])=>
       <div key={label} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-3xl font-black tabular-nums">{value}</p>
        <p className="mt-2 text-xs text-neutral-600">{label}</p>
       </div>)}
    </div>
    <p className="mt-3 text-xs text-neutral-500">{pending} pendientes · {inProgress} en proceso · {actions.length-count.valid} canceladas.</p>
   </section>
   <section className="mt-10">
    <h2 className="text-xl font-black">2. Cumplimiento por etapa</h2>
    <div className="mt-5 grid gap-4 sm:grid-cols-3">
     {stages.map(s=>{
      const t=tally(actions.filter(a=>a.phase_days===s.days));
      return <div key={s.days} className="c3r-keep rounded-2xl border border-neutral-200 p-5">
       <p className="text-xs font-black uppercase tracking-wide text-orange-600">{s.title}</p>
       <h3 className="mt-2 font-bold">{s.subtitle}</h3>
       <p className="mt-4 text-3xl font-black">{t.rate===null?"—":t.rate+"%"}</p>
       <p className="mt-1 text-xs text-neutral-600">{t.completed} de {t.valid} compromisos concluidos</p>
       <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
        <div className="c3r-color h-2 bg-orange-500" style={{width:(t.rate||0)+"%"}}/>
       </div>
      </div>;
     })}
    </div>
   </section>
   <section className="mt-10">
    <h2 className="text-xl font-black">3. Atención de Dirección</h2>
    {!priorities.length?<p className="mt-3 rounded-xl bg-neutral-50 p-5 text-sm text-neutral-600">
     {actions.length?"No existen actividades vigentes sin concluir.":"Aún no se han registrado actividades de intervención."}
    </p>:
    <div className="mt-4 space-y-3">{priorities.map(a=>
     <div key={a.id} className="c3r-keep flex flex-wrap items-start justify-between gap-3 rounded-xl border border-neutral-200 p-4">
      <div className="min-w-0 flex-1"><p className="c3r-wrap text-sm font-black">{a.title}</p>
       <p className="mt-2 text-xs text-neutral-500">{a.owner_label||"Responsable pendiente"} · {dateLabel(a.due_on)}</p></div>
      <span className={"rounded-lg px-3 py-2 text-xs font-bold "+(overdue(a,day)?"bg-red-50 text-red-700":"bg-neutral-100 text-neutral-700")}>
       {overdue(a,day)?"Vencida":states[a.status]||a.status}
      </span>
     </div>)}</div>}
   </section>
   <section className="c3r-page mt-10">
    <h2 className="text-xl font-black">4. Bitácora de acciones y evidencias</h2>
    {stages.map(s=>{
     const rows=actions.filter(a=>a.phase_days===s.days);
     return <div key={s.days} className="mt-7">
      <h3 className="c3r-keep border-b-2 border-neutral-200 pb-3 font-black">{s.title} · {s.subtitle}</h3>
      {!rows.length?<p className="mt-3 text-sm text-neutral-500">Sin actividades registradas.</p>:
       <div className="mt-4 space-y-4">{rows.map(a=>
        <article key={a.id} className="c3r-keep rounded-2xl border border-neutral-200 p-5">
         <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1"><p className="text-xs font-black uppercase tracking-wide text-orange-600">
           {a.dimension_code?a.dimension_code+" · "+(dims[a.dimension_code]||"Dimensión"):"Intervención transversal"}
          </p><h4 className="c3r-wrap mt-2 font-black">{a.title}</h4></div>
          <span className="rounded-lg bg-neutral-100 px-3 py-2 text-xs font-bold">{states[a.status]||a.status}</span>
         </div>
         {!!a.objective&&<p className="c3r-wrap mt-3 text-sm leading-6 text-neutral-600">{a.objective}</p>}
         <div className="mt-4 grid gap-3 text-xs text-neutral-600 sm:grid-cols-2">
          <p><strong>Responsable:</strong> {a.owner_label||"Por asignar"}</p>
          <p><strong>Fecha:</strong> {dateLabel(a.due_on)}{overdue(a,day)?" · Vencida":""}</p>
          <p><strong>Prioridad:</strong> {a.priority==="alta"?"Alta":a.priority==="baja"?"Baja":"Media"}</p>
          <p className="c3r-wrap"><strong>Meta:</strong> {a.metric||"Por definir"}</p>
         </div>
         <p className="c3r-wrap mt-4 rounded-xl bg-neutral-50 p-3 text-xs leading-6 text-neutral-600">
          <strong>Evidencia / observaciones:</strong> {a.evidence||"Aún no se ha registrado."}
         </p>
        </article>)}</div>}
     </div>;
    })}
   </section>
   <section className="c3r-keep mt-11 border-t border-neutral-200 pt-7">
    <h2 className="text-xl font-black">5. Próximos pasos</h2>
    <p className="mt-3 text-sm leading-7 text-neutral-600">
     {actions.length===0?"Definir compromisos medibles, responsables y fechas antes de la reunión de seguimiento.":
      late.length?"Revisar los atrasos, asignar medidas correctivas y documentar evidencias verificables.":
      "Verificar evidencias de cierre y dar seguimiento periódico a los compromisos en proceso."}
    </p>
    <p className="mt-4 text-xs leading-6 text-neutral-500">
     FactoRH C3 PRO · Reporte administrativo interno. No incluye respuestas individuales.
     El reporte diagnóstico requiere liberación independiente y controles de confidencialidad.
    </p>
   </section>
  </article>
 </main>;
}
