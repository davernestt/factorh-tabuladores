import {Suspense} from "react";
import Link from "next/link";
import {notFound} from "next/navigation";
import {FileText,Printer,ShieldCheck,ChartNoAxesCombined,ClipboardList} from "lucide-react";
import {getNom035ReportBundle,NOM035_LEVEL_LABELS,interventionSummaryDomain,type Nom035ReportGroup} from "@/lib/nom035/report-data";
import Nom035ReportEditor from "@/app/protected/nom035/informes/report-editor";
import Nom035PrintButton from "@/app/protected/nom035/[id]/compendio/print-button";
import {NOM035_SOURCE} from "@/lib/nom035/rules";

type Props={params:Promise<{campaignId:string}>,searchParams:Promise<{vista?:string}>};
const date=(input:string|null|undefined)=>input?
 new Date(input).toLocaleDateString("es-MX",{timeZone:"America/Mexico_City"}):"No registrada";
function RiskGroupCard({group}:{group:Nom035ReportGroup}){
 return <div className="break-inside-avoid rounded-xl border border-neutral-200 bg-white p-4"
  style={{breakInside:"avoid-page"}}>
  <div className="flex flex-wrap items-center justify-between gap-2">
   <h4 className="text-sm font-bold text-neutral-800">{group.metric_name}</h4>
   <p className="text-xs font-bold text-neutral-500">
    Media descriptiva: {group.count_scored?(group.sum_score/group.count_scored).toFixed(1):"—"}
   </p>
  </div>
  <div className="mt-4 grid grid-cols-5 gap-2 text-center">
   {NOM035_LEVEL_LABELS.map(level=><div key={level.key}>
    <p className="text-xl font-black text-neutral-900">{group[level.key]}</p>
    <p className="mt-1 text-[10px] leading-4 text-neutral-500">{level.name}</p>
   </div>)}
  </div>
  <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-neutral-100">
   {NOM035_LEVEL_LABELS.map((level,i)=><div key={level.key}
    style={{width:group.count_scored?100*group[level.key]/group.count_scored+"%":"0%"}}
    className={["bg-emerald-400","bg-slate-300","bg-amber-400","bg-orange-400","bg-red-500"][i]}/>)}
  </div>
 </div>;
}
function Paragraphs({text}:{text:string|null|undefined}){
 return <p className="whitespace-pre-wrap text-sm leading-7 text-neutral-700">
  {text?.trim()||"PENDIENTE: el responsable de la evaluación debe completar esta sección."}
 </p>;
}
export default function Nom035ReportPage(props:Props){
 return <Suspense fallback={<p className="rounded-2xl bg-white p-8">Preparando informe técnico NOM-035...</p>}>
  <ReportContent {...props}/>
 </Suspense>;
}
async function ReportContent({params,searchParams}:Props){
 const {campaignId}=await params;
 let report:Awaited<ReturnType<typeof getNom035ReportBundle>>;
 try{report=await getNom035ReportBundle(campaignId)}catch{notFound()}
 const {campaign,center,organizationName,groups,draft,privacyReady,targetAchieved,actions,invited,user}=report;
 const {vista}=await searchParams;
 const executive=vista==="ejecutiva";
 const total=groups.find(x=>x.metric_kind==="total");
 const categories=groups.filter(x=>x.metric_kind==="category");
 const domains=interventionSummaryDomain(groups).slice(0,5);
 const completeDraft=Boolean(draft&&draft.objective?.trim()&&draft.activities?.trim()&&
  draft.methodology_notes?.trim()&&draft.conclusions?.trim()&&draft.recommendations?.trim()&&
  draft.responsible_name?.trim());
 const canReview=report.reviewable&&completeDraft&&Boolean(center.street_address);
 const high=total?total.risk_alto+total.risk_muy_alto:0;
 const note="Los datos corresponden únicamente a cuestionarios de esta campaña. "+
  "El promedio es descriptivo y no se reclasifica como una puntuación individual.";
 return <div className="space-y-6 pb-12 text-neutral-800 print:space-y-4">
  <nav className="flex flex-wrap items-center justify-between gap-3 print:hidden">
   <Link href={"/protected/nom035/riesgos/"+campaignId}
    className="text-sm font-bold text-orange-700">← Regresar a campaña</Link>
   <div className="flex flex-wrap items-center gap-2">
    <Link href={"?vista=ejecutiva"} className={"rounded-xl px-4 py-3 text-xs font-bold "+
     (executive?"bg-orange-600 text-white":"bg-white text-neutral-700")}>
     Informe ejecutivo
    </Link>
    <Link href={"?vista=tecnica"} className={"rounded-xl px-4 py-3 text-xs font-bold "+
     (!executive?"bg-orange-600 text-white":"bg-white text-neutral-700")}>
     Informe técnico 7.7
    </Link>
    <a href={"/api/nom035/reports/"+campaignId+"/word?vista="+(executive?"ejecutiva":"tecnica")}
     className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-xs font-bold text-neutral-700">
     Word
    </a>
    <Nom035PrintButton/>
   </div>
  </nav>
  <header className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm print:rounded-none print:border-0 print:p-0">
   <p className="text-xs font-black uppercase tracking-[.15em] text-orange-600">
    FactoRH · NOM-035-STPS-2018 · {executive?"Dirección":"Numeral 7.7"}
   </p>
   <h1 className="mt-3 text-3xl font-black text-neutral-900">
    {executive?"Informe ejecutivo de riesgos psicosociales":"Informe técnico de evaluación NOM-035"}
   </h1>
   <p className="mt-3 text-lg font-bold text-neutral-800">{organizationName}</p>
   <p className="mt-1 text-sm text-neutral-600">{center.name} · {center.municipality}, {center.state}</p>
   <p className="mt-2 text-xs text-neutral-500">
    Guía {campaign.guide} · Banco {campaign.bank_version} ·
    {" "+(campaign.coverage_mode==="census"?"Censo":"Muestra declarada")} ·
    Generado el {date(new Date().toISOString())}
   </p>
  </header>
  {!privacyReady?<div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
   <h2 className="text-lg font-black text-amber-950">Informe protegido: campaña todavía no publicable</h2>
   <p className="mt-3 text-sm leading-7 text-amber-900">
    No se mostrarán distribuciones de riesgo hasta cerrar la campaña y obtener
    al menos diez respuestas. El mínimo de privacidad es un control adicional de
    FactoRH, no un umbral de la NOM-035.
   </p>
  </div>:<>
   {!targetAchieved&&<p className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold leading-7 text-red-800">
    BORRADOR INCOMPLETO: la participación es inferior a la población requerida.
    Este documento no debe presentarse como diagnóstico normativo terminado.
   </p>}
   <section className="grid gap-3 sm:grid-cols-4">
    {[
     {name:"Plantilla del centro",value:campaign.workforce_snapshot},
     {name:"Población objetivo",value:campaign.eligible_population},
     {name:"Ligas generadas",value:invited},
     {name:"Cuestionarios recibidos",value:campaign.completed_count}
    ].map(k=><div key={k.name} className="rounded-xl border border-neutral-200 bg-white p-5">
     <p className="text-xs font-bold text-neutral-500">{k.name}</p>
     <p className="mt-3 text-3xl font-black text-neutral-900">{k.value}</p>
    </div>)}
   </section>
   {total&&<section className="rounded-2xl border border-neutral-200 bg-white p-6">
    <h2 className="text-xl font-black text-neutral-900">Distribución general por niveles de riesgo</h2>
    <p className="mt-2 text-sm text-neutral-600">
     {high} de {campaign.completed_count} cuestionarios presentan nivel alto o muy alto
     ({campaign.completed_count?Math.round(100*high/campaign.completed_count):0}%).
    </p>
    <div className="mt-5"><RiskGroupCard group={total}/></div>
    <p className="mt-4 text-xs text-neutral-500">{note}</p>
   </section>}
   {executive?<section className="grid gap-4 lg:grid-cols-2">
    <article className="rounded-2xl border border-neutral-200 bg-white p-6">
     <h2 className="text-xl font-black text-neutral-900">Dominios prioritarios para analizar</h2>
     <div className="mt-4 space-y-3">
      {domains.map(x=><div key={x.name} className="flex flex-wrap justify-between gap-3 border-b border-neutral-100 pb-3">
       <p className="text-sm font-bold text-neutral-800">{x.name}</p>
       <p className="text-sm font-black text-orange-700">{x.high}/{x.count} alto o muy alto</p>
      </div>)}
     </div>
    </article>
    <article className="rounded-2xl border border-neutral-200 bg-white p-6">
     <h2 className="text-xl font-black text-neutral-900">Conclusiones y decisión de Dirección</h2>
     <div className="mt-4"><Paragraphs text={draft?.conclusions}/></div>
     <h3 className="mt-5 text-sm font-black text-neutral-900">Recomendaciones</h3>
     <div className="mt-2"><Paragraphs text={draft?.recommendations}/></div>
    </article>
   </section>:<>
    <section className="rounded-2xl border border-neutral-200 bg-white p-6">
     <h2 className="text-xl font-black text-neutral-900">A. Datos del centro de trabajo</h2>
     <div className="mt-4 space-y-2 text-sm leading-7 text-neutral-700">
      <p><strong>Razón social:</strong> {organizationName}</p>
      <p><strong>Centro:</strong> {center.name}</p>
      <p><strong>Domicilio:</strong> {center.street_address||"PENDIENTE de captura"},
       {" "+center.municipality}, {center.state}</p>
      <p><strong>Actividad principal:</strong> {center.main_activity}</p>
     </div>
     <div className="mt-5 space-y-5 border-t border-neutral-100 pt-5">
      {[
       ["B. Objetivo",draft?.objective],
       ["C. Actividades realizadas",draft?.activities],
       ["D. Método conforme al numeral 7.4",draft?.methodology_notes]
      ].map(([title,value])=><div key={title}>
       <h3 className="font-black text-neutral-800">{title}</h3>
       <div className="mt-2"><Paragraphs text={value}/></div>
      </div>)}
     </div>
    </section>
    <section className="rounded-2xl border border-neutral-200 bg-white p-6">
     <h2 className="text-xl font-black text-neutral-900">E. Resultados de la evaluación</h2>
     <p className="mt-2 text-xs leading-6 text-neutral-600">
      {note} La evaluación del entorno organizacional se incorpora en Guía III,
      cuando corresponde al tamaño del centro.
     </p>
     <h3 className="mt-6 text-lg font-black text-neutral-900">Categorías</h3>
     <div className="mt-4 grid gap-3 lg:grid-cols-2">
      {categories.map(x=><RiskGroupCard key={x.metric_name} group={x}/>)}
     </div>
     <h3 className="mt-7 text-lg font-black text-neutral-900">Dominios</h3>
     <div className="mt-4 grid gap-3 lg:grid-cols-2">
      {groups.filter(g=>g.metric_kind==="domain").map(x=><RiskGroupCard key={x.metric_name} group={x}/>)}
     </div>
    </section>
    <section className="rounded-2xl border border-neutral-200 bg-white p-6">
     {[
      ["F. Conclusiones",draft?.conclusions],
      ["G. Recomendaciones y acciones de intervención",draft?.recommendations],
      ["Acciones de intervención complementarias",draft?.intervention_notes]
     ].map(([title,value])=><div key={title} className="mb-5 last:mb-0">
      <h3 className="text-lg font-black text-neutral-900">{title}</h3>
      <div className="mt-2"><Paragraphs text={value}/></div>
     </div>)}
     <h3 className="mt-5 text-lg font-black text-neutral-900">H. Responsable de la evaluación</h3>
     <p className="mt-2 text-sm text-neutral-700">{draft?.responsible_name||"PENDIENTE de identificación"}</p>
     <p className="mt-1 text-sm text-neutral-600">
      Cédula profesional (en su caso): {draft?.professional_license||"No indicada"}
     </p>
    </section>
   </>}
   <section className="rounded-2xl border border-neutral-200 bg-white p-6">
    <h2 className="text-xl font-black text-neutral-900">Programa y seguimiento de acciones</h2>
    {!actions.length?<p className="mt-3 text-sm text-neutral-600">
     No hay medidas asociadas a esta campaña. Revisar si los resultados requieren
     un programa de intervención según el numeral 8.3.
    </p>:<div className="mt-4 space-y-3">
     {actions.map((x,i)=><div key={i} className="break-inside-avoid rounded-xl bg-neutral-50 p-4 text-sm" style={{breakInside:"avoid-page"}}>
      <p className="font-bold text-neutral-800">{x.description}</p>
      <p className="mt-2 text-xs leading-6 text-neutral-600">
       {x.affected_area} · Responsable: {x.responsible} · Avance: {x.progress_percent}% ·
       Compromiso: {x.due_on||"Sin fecha"}
      </p>
     </div>)}
    </div>}
   </section>
  </>}
  <section className="rounded-2xl border border-neutral-200 bg-white p-5 text-xs leading-6 text-neutral-600">
   <p><strong>Estado del documento:</strong> {draft?.validation_status==="internal_review"?
    "Revisión administrativa interna registrada":"BORRADOR PENDIENTE DE REVISIÓN"}.</p>
   <p>La aprobación interna no equivale a verificación o certificación por la STPS.
    Deben validarse las reglas normativas y el método antes de utilizarse como informe definitivo.
    Los resultados aplicables deberán permanecer disponibles para consulta conforme al numeral 7.8.
   </p>
   <a href={NOM035_SOURCE} className="mt-2 inline-block font-bold text-orange-700 underline" target="_blank"
    rel="noopener noreferrer">Texto oficial NOM-035-STPS-2018</a>
  </section>
  {!executive&&<Nom035ReportEditor campaignId={campaignId} draft={draft}
   isAdmin={user.role==="super_admin"} canReview={Boolean(canReview)}/>}
 </div>;
}
