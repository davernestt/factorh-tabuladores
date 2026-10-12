"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import {
 ArrowLeft,ArrowRight,BookOpen,Building2,ChartColumnIncreasing,
 CheckCircle2,ChevronRight,ClipboardCheck,ClipboardList,
 Download,Eye,FileBarChart2,FileCheck2,Files,FolderOpen,
 Info,LockKeyhole,ShieldCheck,Sparkles,Users,TriangleAlert,
 Activity,CalendarDays,ExternalLink,Target,Printer,PlayCircle
} from "lucide-react";
import {
 type Nom035Simulation,type DemoGuide,type DemoGroup,type DemoRequirement,
 type DemoLevelCount
} from "@/lib/nom035/demo-data";
type Audience="admin"|"client";
type Section="overview"|"guide1"|"guide2"|"guide3"|"evidence"|"questionnaire";
const labels:{id:Section;label:string}[]=[
 {id:"overview",label:"Resumen ejecutivo"},{id:"guide1",label:"Guía I"},
 {id:"guide2",label:"Guía II"},{id:"guide3",label:"Guía III"},
 {id:"evidence",label:"Expediente"},{id:"questionnaire",label:"Cómo se responde"}
];
const riskLevels=[
 {label:"Nulo o despreciable",color:"#58a889",short:"Nulo"},
 {label:"Bajo",color:"#a5b5bf",short:"Bajo"},
 {label:"Medio",color:"#e8bc61",short:"Medio"},
 {label:"Alto",color:"#e7964e",short:"Alto"},
 {label:"Muy alto",color:"#d66b62",short:"Muy alto"}
];
const roundedCard="rounded-2xl border border-neutral-200 bg-white shadow-sm";
function formatPercent(a:number,b:number){return b?Math.round(a/b*100)+"%":"0%"}
function BigMetric({icon:Icon,value,title,subtitle}:{
 icon:typeof Users;value:string|number;title:string;subtitle?:string
}){
 return <article className={roundedCard+" p-5 sm:p-6"}>
  <div className="flex items-start justify-between">
   <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{title}</p>
   <Icon className="h-5 w-5 shrink-0 text-orange-600"/>
  </div>
  <p className="mt-4 text-3xl font-black tabular-nums tracking-tight text-neutral-900">{value}</p>
  {subtitle&&<p className="mt-2 text-xs leading-5 text-neutral-500">{subtitle}</p>}
 </article>;
}
function RiskStack({counts,total,showNumbers=true}:{
 counts:DemoLevelCount[];total:number;showNumbers?:boolean
}){
 return <div>
  <div className="flex h-3 overflow-hidden rounded-full bg-neutral-100">
   {counts.map((part,i)=>part.count?
    <div key={part.level} style={{
     width:100*part.count/Math.max(1,total)+"%",backgroundColor:riskLevels[i].color
    }} title={part.level+": "+part.count} className="h-full"/>:null)}
  </div>
  {showNumbers&&<div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-600">
   {counts.map((part,i)=><span key={part.level} className="inline-flex items-center gap-1.5">
    <span className="h-2.5 w-2.5 rounded-full" style={{backgroundColor:riskLevels[i].color}}/>
    {riskLevels[i].short}: <strong className="text-neutral-800">{part.count}</strong>
   </span>)}
  </div>}
 </div>;
}
function GroupDistribution({group,total,compact=false}:{
 group:DemoGroup;total:number;compact?:boolean
}){
 return <article className={roundedCard+" p-5"}>
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div className="max-w-lg">
    <h4 className="text-sm font-black leading-6 text-neutral-800">{group.name}</h4>
    <p className="mt-1 text-xs text-neutral-500">
     Media descriptiva: {group.average.toFixed(1)} puntos
    </p>
   </div>
   <div className="text-right">
    <p className="text-lg font-black tabular-nums text-neutral-900">
     {formatPercent(group.highOrVeryHigh,total)}
    </p>
    <p className="text-[11px] text-neutral-500">Alto + muy alto</p>
   </div>
  </div>
  <div className="mt-4"><RiskStack counts={group.counts} total={total} showNumbers={!compact}/></div>
 </article>;
}
function SectionIntro({eyebrow,title,description}:{
 eyebrow:string;title:string;description:string
}){
 return <div className="mb-5">
  <p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">{eyebrow}</p>
  <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl">{title}</h2>
  <p className="mt-3 max-w-4xl text-sm leading-7 text-neutral-600">{description}</p>
 </div>;
}
function Coverage({guide}:{guide:DemoGuide}){
 return <section className="grid gap-3 sm:grid-cols-4">
  <BigMetric icon={Users} title="Plantilla laboral" value={guide.population+" personas"}/>
  <BigMetric icon={Target} title={guide.coverage==="sample"?"Muestra seleccionada":"Censo convocado"} value={guide.target}/>
  <BigMetric icon={ClipboardCheck} title="Contestaron" value={guide.completed}
   subtitle={formatPercent(guide.completed,guide.target)+" de participación respecto a convocados"}/>
  <BigMetric icon={FileBarChart2} title="Media total (descriptiva)" value={guide.averageScore.toFixed(1)+" pts"}/>
 </section>;
}
function ClientRecommendation({guide,client}:{guide:DemoGuide;client:boolean}){
 const top=guide.domains[0];
 const h=guide.total.highOrVeryHigh;
 return <section className="mt-5 grid gap-4 lg:grid-cols-2">
  <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
   <div className="flex items-start gap-3">
    <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-orange-700"/>
    <div>
     <h3 className="text-base font-black text-neutral-900">Principal frente para revisión</h3>
     <p className="mt-2 text-sm font-bold text-neutral-800">{top.name}</p>
     <p className="mt-2 text-sm leading-6 text-neutral-700">
      {top.highOrVeryHigh} de {guide.completed} cuestionarios se ubican en niveles
      alto o muy alto en este dominio. Corresponde analizar condiciones de trabajo
      y determinar acciones preventivas o de control.
     </p>
    </div>
   </div>
  </div>
  <div className="rounded-2xl border border-neutral-200 bg-white p-6">
   <h3 className="text-base font-black text-neutral-900">
    {client?"Próximas acciones para tu empresa":"Sugerencias del consultor FactoRH"}
   </h3>
   <div className="mt-4 space-y-3">
    {[
     "Revisar causas y áreas involucradas sin identificar colaboradores.",
     "Asignar responsables, fechas y evidencia a las medidas de intervención.",
     "Documentar seguimiento e incorporar hallazgos al expediente del centro."
    ].map((s,i)=><div key={s} className="flex gap-3 text-sm leading-6 text-neutral-700">
     <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-black text-neutral-800">{i+1}</span>
     {s}
    </div>)}
   </div>
  </div>
 </section>;
}
function GuideResults({guide,client}:{guide:DemoGuide;client:boolean}){
 const [detail,setDetail]=useState<"category"|"domain">("category");
 return <div className="space-y-5">
  <SectionIntro eyebrow={"Diagnóstico NOM-035 · Guía "+guide.guide}
   title={"Resultados simulados · Guía "+guide.guide}
   description={guide.coverage==="census"?
    "Ejemplo de aplicación censal. Todos los trabajadores del centro completaron el cuestionario virtual. Los niveles se calcularon por respuesta y después se agregaron.":
    "Ejemplo de una muestra ficticia. Se muestra el mínimo calculado por la Guía III, pero la selección aleatoria y su distribución deben documentarse por separado en una aplicación real."}/>
  <Coverage guide={guide}/>
  <div className={roundedCard+" p-6"}>
   <div className="flex flex-wrap items-start justify-between gap-3">
    <div>
     <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Distribución general</p>
     <h3 className="mt-2 text-xl font-black text-neutral-900">Niveles de riesgo psicosocial</h3>
     <p className="mt-2 text-sm text-neutral-500">Cada cuestionario virtual se clasificó conforme a los umbrales utilizados por FactoRH.</p>
    </div>
    <div className="rounded-xl bg-orange-50 px-4 py-3 text-right">
     <p className="text-2xl font-black text-orange-800">{formatPercent(guide.total.highOrVeryHigh,guide.completed)}</p>
     <p className="text-xs font-bold text-orange-800">Alto o muy alto</p>
    </div>
   </div>
   <div className="mt-7">
    <RiskStack counts={guide.total.counts} total={guide.completed}/>
   </div>
   <div className="mt-6 grid gap-2 sm:grid-cols-5">
    {guide.total.counts.map((part,i)=><div key={part.level}
     className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-center">
     <div className="mx-auto mb-2 h-2 w-8 rounded-full" style={{backgroundColor:riskLevels[i].color}}/>
     <p className="text-2xl font-black text-neutral-900">{part.count}</p>
     <p className="mt-1 text-[11px] leading-4 text-neutral-600">{part.level}</p>
     <p className="mt-2 text-xs font-bold text-neutral-500">{part.percentage}%</p>
    </div>)}
   </div>
  </div>
  {guide.sampleMinimum!==null&&<div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-5 text-sm leading-6 text-neutral-700">
   <Info className="mt-0.5 h-5 w-5 shrink-0 text-orange-600"/>
   Para {guide.population} trabajadores, el mínimo calculado por la Ecuación 1 de la Guía III
   es {guide.sampleMinimum}. Esta simulación utiliza {guide.target} personas ficticias.
   El número por sí solo no acredita representatividad ni cumplimiento.
  </div>}
  <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
   <h3 className="text-xl font-black text-neutral-900">Desglose de resultados</h3>
   <div className="flex rounded-xl bg-neutral-100 p-1">
    {([{id:"category",text:"Categorías"},{id:"domain",text:"Dominios"}] as const).map(tab=>
     <button type="button" key={tab.id} onClick={()=>setDetail(tab.id)}
      className={"rounded-lg px-4 py-2 text-xs font-black transition-colors "+
       (detail===tab.id?"bg-white text-orange-700 shadow-sm":"text-neutral-600")}>
      {tab.text}
     </button>)}
   </div>
  </div>
  <div className="grid gap-4 lg:grid-cols-2">
   {(detail==="category"?guide.categories:guide.domains).map(g=>
    <GroupDistribution key={g.name} group={g} total={guide.completed}/>)}
  </div>
  <ClientRecommendation guide={guide} client={client}/>
  <div className="rounded-xl border border-neutral-100 bg-white p-4 text-xs leading-6 text-neutral-500">
   Promedio de preguntas contestadas por persona: {guide.answeredAverage};
   no aplicables por filtros: {guide.skippedAverage}. La media numérica no se
   reclasifica artificialmente como si fuera el resultado de una persona.
   Estos resultados son solamente demostrativos y requieren validación normativa
   independiente antes de su uso comercial.
  </div>
 </div>;
}
function GuideOne({demo}:{demo:Nom035Simulation["guide1"]}){
 return <div className="space-y-5">
  <SectionIntro eyebrow="Guía I · Identificación de acontecimientos"
   title="Tamizaje inicial y orientación clínica"
   description="En esta demostración respondieron 110 personas virtuales. El cuestionario finalizó tras la sección I para quienes no reportaron un acontecimiento y activó las otras 14 preguntas solo cuando correspondía."/>
  <section className="grid gap-3 sm:grid-cols-4">
   <BigMetric icon={Users} title="Personas convocadas" value={demo.invited}/>
   <BigMetric icon={ClipboardCheck} title="Cuestionarios completos" value={demo.completed}
    subtitle={formatPercent(demo.completed,demo.invited)+" de respuesta"}/>
   <BigMetric icon={Activity} title="Reportaron acontecimiento" value={demo.exposureCount}/>
   <BigMetric icon={ShieldCheck} title="Orientación recomendada" value={demo.referralCount}
    subtitle="Tamizajes que activaron umbrales de referencia, no diagnósticos"/>
  </section>
  <div className={roundedCard+" p-6"}>
   <h3 className="text-xl font-black text-neutral-900">Recorrido de la Guía I</h3>
   <div className="mt-6 grid gap-3 md:grid-cols-3">
    {[
     {number:demo.completed,title:"Sección I",body:"Pregunta inicial: ¿ocurrió un acontecimiento traumático severo laboral?"},
     {number:demo.exposureCount,title:"Secciones II a IV",body:"Solo las personas con acontecimiento reportado respondieron los 14 reactivos adicionales."},
     {number:demo.referralCount,title:"Orientación privada",body:"Quienes alcanzaron los umbrales recibieron instrucciones para solicitar valoración profesional."}
    ].map((step,i)=><div key={step.title} className="rounded-xl bg-neutral-50 p-5">
     <span className="text-xs font-bold uppercase text-orange-700">Etapa {i+1}</span>
     <p className="mt-3 text-3xl font-black text-neutral-900">{step.number}</p>
     <p className="mt-2 text-sm font-black text-neutral-800">{step.title}</p>
     <p className="mt-2 text-xs leading-6 text-neutral-600">{step.body}</p>
    </div>)}
   </div>
  </div>
  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
   <div className="flex items-start gap-3">
    <LockKeyhole className="mt-0.5 h-6 w-6 shrink-0 text-amber-800"/>
    <div>
     <h3 className="font-black text-neutral-900">Privacidad y canalización</h3>
     <p className="mt-2 text-sm leading-7 text-neutral-700">
      El dashboard real no permite consultar quién respondió «Sí» ni cuáles fueron sus
      síntomas. El administrador ve únicamente cifras agregadas cuando se alcanza el
      mínimo de privacidad. La eventual canalización nominal se realiza por el
      servicio de salud autorizado, fuera de este panel.
     </p>
    </div>
   </div>
  </div>
  <div className={roundedCard+" p-6"}>
   <h3 className="font-black text-neutral-900">Qué rutas se simularon</h3>
   <div className="mt-4 grid gap-3 sm:grid-cols-2">
    {demo.examples.map(e=><div key={e.caseId} className="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
     <p className="text-xs font-black uppercase text-orange-700">{e.caseId}</p>
     <p className="mt-2 text-sm font-black text-neutral-800">
      Acontecimiento: {e.event?"Sí":"No"} · Seguimiento: {e.followUpQuestions} preguntas
     </p>
     <p className="mt-2 text-xs leading-6 text-neutral-600">{e.description}</p>
    </div>)}
   </div>
  </div>
 </div>;
}
function EvidencePanel({data,client}:{data:DemoRequirement[];client:boolean}){
 const [open,setOpen]=useState<string|null>(null);
 const documented=data.filter(x=>x.status==="Documentado").length;
 const completed=data.reduce((n,r)=>n+r.tasks.filter(t=>t.status==="Realizada").length,0);
 const totalTasks=data.reduce((n,r)=>n+r.tasks.length,0);
 return <div className="space-y-5">
  <SectionIntro eyebrow="Compendio de evidencias • Demostración"
   title="Obligaciones, responsables y documentación"
   description="Así se mostrarían los nueve requisitos normativos aplicables a un centro de más de 50 trabajadores, con tareas, referencias, revisiones y documentos inventados para esta prueba."/>
  <div className="grid gap-3 sm:grid-cols-3">
   <BigMetric icon={ClipboardCheck} title="Requisitos documentados" value={documented+" / "+data.length}/>
   <BigMetric icon={CheckCircle2} title="Actividades realizadas" value={completed+" / "+totalTasks}/>
   <BigMetric icon={FileCheck2} title="Revisión interna" value={data.filter(d=>d.reviewed).length+" requisitos"}/>
  </div>
  <div className="space-y-3">
   {data.map(item=><article key={item.key} className={roundedCard+" overflow-hidden"}>
    <button type="button" onClick={()=>setOpen(open===item.key?null:item.key)}
     className="flex w-full items-start justify-between gap-4 p-5 text-left sm:p-6">
     <div>
      <p className="text-xs font-bold uppercase tracking-wide text-orange-700">Numerales {item.basis}</p>
      <h3 className="mt-2 text-sm font-black text-neutral-900 sm:text-base">{item.title}</h3>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
       <span className={"rounded-lg px-2.5 py-1.5 font-bold "+
        (item.status==="Documentado"?"bg-emerald-50 text-emerald-800":
        item.status==="En proceso"?"bg-blue-50 text-blue-800":"bg-neutral-100 text-neutral-600")}>{item.status}</span>
       <span className="rounded-lg bg-neutral-100 px-2.5 py-1.5 text-neutral-600">
        {item.tasks.filter(t=>t.status==="Realizada").length} / {item.tasks.length} actividades
       </span>
       {item.reviewed&&<span className="text-emerald-700">Revisado internamente</span>}
      </div>
     </div>
     <ChevronRight className={"mt-2 h-5 w-5 shrink-0 text-neutral-500 transition-transform "+
      (open===item.key?"rotate-90":"")}/>
    </button>
    {open===item.key&&<div className="space-y-4 border-t border-neutral-100 px-5 py-5 sm:px-6">
     <p className="text-sm leading-7 text-neutral-600">{item.description}</p>
     <h4 className="text-sm font-black text-neutral-800">Actividades de ejemplo</h4>
     <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] border-collapse text-left text-xs">
       <thead className="bg-neutral-50 text-neutral-500"><tr>
        <th className="px-3 py-3">Actividad</th><th className="px-3 py-3">Responsable</th>
        <th className="px-3 py-3">Fecha</th><th className="px-3 py-3">Estado</th>
        <th className="px-3 py-3">Evidencia</th>
       </tr></thead>
       <tbody>{item.tasks.map(t=><tr key={t.title} className="border-b border-neutral-100">
        <td className="px-3 py-3 text-neutral-800">{t.title}</td>
        <td className="px-3 py-3">{t.owner}</td>
        <td className="px-3 py-3">{t.deadline}</td>
        <td className="px-3 py-3 font-semibold">{t.status}</td>
        <td className="px-3 py-3">{t.evidence||"Pendiente"}</td>
       </tr>)}</tbody>
      </table>
     </div>
     <h4 className="text-sm font-black text-neutral-800">Documentos vinculados (ejemplo)</h4>
     <div className="flex flex-wrap gap-2">
      {item.files.length?item.files.map(file=><span key={file}
       className="inline-flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-700">
       <Files className="h-4 w-4 text-orange-600"/>{file}
      </span>):<p className="text-xs text-neutral-500">Aún no hay documentos de ejemplo.</p>}
     </div>
    </div>}
   </article>)}
  </div>
  <p className="rounded-xl border border-neutral-200 bg-white p-4 text-xs leading-6 text-neutral-500">
   Los documentos que aparecen en esta demostración son etiquetas ficticias, no archivos
   reales ni evidencias cargadas. Para trabajar con documentos auténticos, utiliza el
   expediente NOM-035 de tu empresa y respeta los permisos de acceso.
  </p>
 </div>;
}
function QuestionPreview({data}:{data:Nom035Simulation}){
 const [guide,setGuide]=useState<"I"|"II"|"III">("III");
 const [expanded,setExpanded]=useState(false);
 const target=guide==="II"?data.guideII:data.guideIII;
 return <div className="space-y-5">
  <SectionIntro eyebrow="Simulación de aplicación"
   title="Así responde un colaborador virtual"
   description="Las respuestas fueron generadas automáticamente en memoria para probar el motor de calificación. La vista del administrador real no muestra formularios contestados por personas."/>
  <div className={roundedCard+" p-5 sm:p-6"}>
   <div className="flex flex-wrap gap-2">
    {(["I","II","III"] as const).map(k=><button key={k} type="button"
     onClick={()=>{setGuide(k);setExpanded(false)}}
     className={"rounded-xl px-5 py-3 text-sm font-black "+
      (guide===k?"bg-orange-600 text-white":"bg-neutral-100 text-neutral-700")}>
     Guía {k}
    </button>)}
   </div>
   {guide==="I"?<div className="mt-6">
    <p className="text-sm font-black text-neutral-900">
     ¿Ha presenciado o sufrido alguna vez, durante o con motivo del trabajo, un acontecimiento traumático severo?
    </p>
    <p className="mt-3 text-sm text-neutral-600">Ejemplo virtual: <strong>Sí</strong>.</p>
    <div className="mt-4 rounded-xl bg-neutral-50 p-4 text-sm leading-7 text-neutral-700">
     El participante ficticio responde también las 14 preguntas complementarias. Se
     calculan los umbrales de referencia; únicamente la orientación privada se
     muestra al participante si corresponde.
    </div>
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
     Por sensibilidad de esta guía, la demostración administrativa no despliega
     patrones detallados de síntomas individuales.
    </div>
   </div>:
    <div className="mt-6">
     <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-lg font-black text-neutral-900">Ejemplo de reactivos Guía {guide}</h3>
      <span className="text-xs font-bold text-neutral-500">
       {target.sampleQuestions.length} de {guide==="II"?46:72} reactivos seleccionados
      </span>
     </div>
     <div className="mt-5 space-y-4">
      {target.sampleQuestions.slice(0,expanded?undefined:4).map(q=><div key={q.position}
       className="rounded-xl border border-neutral-200 p-4">
       <p className="text-xs font-bold text-orange-700">Pregunta {q.position} · {q.domain}</p>
       <p className="mt-2 text-sm font-semibold leading-6 text-neutral-800">{q.prompt}</p>
       <p className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-xs font-bold text-orange-800">
        Respuesta virtual: {q.answer}
       </p>
      </div>)}
     </div>
     <button type="button" className="mt-4 text-sm font-bold text-orange-700"
      onClick={()=>setExpanded(v=>!v)}>{expanded?"Ver menos":"Ver más preguntas de ejemplo"}</button>
    </div>}
  </div>
  <div className="rounded-xl bg-neutral-100 p-4 text-xs leading-6 text-neutral-600">
   Se aplicaron todos los reactivos pertinentes de las guías II y III a
   participantes ficticios. Los saltos condicionales se calcularon
   individualmente según si atendían clientes o supervisaban personal.
   No se guardaron sus respuestas ni se generaron ligas de invitación.
  </div>
 </div>;
}
function Overview({data,client,onOpen}:{data:Nom035Simulation;client:boolean;onOpen:(t:Section)=>void}){
 const g=data.guideIII,totalRespondents=g.completed;
 const h=g.total.highOrVeryHigh;
 const top=g.domains.slice(0,4);
 return <div className="space-y-5">
  <SectionIntro eyebrow={client?"Portal de empresa · Resumen NOM-035":"Panel general NOM-035 · Consultor"}
   title={client?"Tu diagnóstico y plan de seguimiento":"Concentrado ejecutivo de evaluaciones"}
   description={client?
    "Tu empresa visualiza indicadores organizacionales agregados, recomendaciones de acción y el avance de su expediente. No puede consultar respuestas individuales ni expedientes de otras empresas.":
    "Vista consolidada de campañas simuladas de NOM-035 con orientación consultiva, control de aplicación y seguimiento documental. Aquí se podrían comparar centros autorizados."}/>
  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
   <BigMetric icon={Building2} title="Centros en demostración" value="2"
    subtitle="Centro administrativo (Guía II) y centro industrial (Guía III)"/>
   <BigMetric icon={ClipboardCheck} title="Guías II y III respondidas" value={data.guideII.completed+data.guideIII.completed}
    subtitle="34 + 94 cuestionarios sintéticos"/>
   <BigMetric icon={Activity} title="Tamizajes Guía I" value={data.guide1.completed}
    subtitle="Solo conteo general; sin identidad ni síntomas"/>
   <BigMetric icon={FileCheck2} title="Documentos de ejemplo" value={data.totalDocuments}
    subtitle="Referencias ficticias en el expediente"/>
  </section>
  <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
   <section className={roundedCard+" p-6"}>
    <div className="flex flex-wrap items-center justify-between gap-3">
     <div>
      <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Centro industrial · Guía III</p>
      <h3 className="mt-2 text-xl font-black text-neutral-900">Panorama de niveles de riesgo</h3>
     </div>
     <button type="button" onClick={()=>onOpen("guide3")}
      className="inline-flex items-center gap-1 text-xs font-black text-orange-700">
      Ver diagnóstico <ArrowRight className="h-4 w-4"/>
     </button>
    </div>
    <div className="mt-5"><RiskStack counts={g.total.counts} total={totalRespondents}/></div>
    <div className="mt-6 flex items-end justify-between border-t border-neutral-100 pt-5">
     <div>
      <p className="text-3xl font-black text-neutral-900">{h} <span className="text-base font-bold text-neutral-500">/ {totalRespondents}</span></p>
      <p className="mt-1 text-xs text-neutral-500">Cuestionarios clasificados alto o muy alto</p>
     </div>
     <p className="text-2xl font-black text-orange-700">{formatPercent(h,totalRespondents)}</p>
    </div>
   </section>
   <section className={roundedCard+" p-6"}>
    <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Aplicaciones simuladas</p>
    <h3 className="mt-2 text-xl font-black text-neutral-900">Estado de campañas</h3>
    <div className="mt-5 space-y-4">
     {[
      {label:"Guía I · Acontecimientos",value:data.guide1.completed,goal:data.guide1.invited},
      {label:"Guía II · Centro administrativo",value:data.guideII.completed,goal:data.guideII.target},
      {label:"Guía III · Centro industrial",value:data.guideIII.completed,goal:data.guideIII.target}
     ].map(row=><div key={row.label}>
      <div className="flex items-center justify-between text-xs">
       <p className="font-bold text-neutral-700">{row.label}</p>
       <span className="font-black text-neutral-800">{row.value}/{row.goal}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
       <div style={{width:100*row.value/row.goal+"%"}}
        className="h-2 rounded-full bg-orange-500"/>
      </div>
     </div>)}
    </div>
   </section>
  </div>
  <section className={roundedCard+" p-6"}>
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h3 className="text-xl font-black text-neutral-900">Dominios que merecen atención</h3>
     <p className="mt-2 text-xs leading-6 text-neutral-500">
      Ordenados por número de respuestas en niveles alto o muy alto en la Guía III.
     </p></div>
    <button type="button" onClick={()=>onOpen("guide3")} className="text-xs font-bold text-orange-700">
     Ver todos los dominios →
    </button>
   </div>
   <div className="mt-5 grid gap-3 lg:grid-cols-2">
    {top.map(d=><div key={d.name} className="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
     <div className="flex items-start justify-between gap-4">
      <h4 className="text-sm font-black leading-6 text-neutral-800">{d.name}</h4>
      <span className="text-lg font-black text-orange-700">{formatPercent(d.highOrVeryHigh,totalRespondents)}</span>
     </div>
     <div className="mt-3"><RiskStack counts={d.counts} total={totalRespondents} showNumbers={false}/></div>
    </div>)}
   </div>
  </section>
  <section className="grid gap-4 lg:grid-cols-2">
   <article className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
    <p className="text-xs font-black uppercase tracking-wide text-orange-700">
     {client?"Recomendación para RH":"Prioridad consultiva"}
    </p>
    <h3 className="mt-3 text-lg font-black text-neutral-900">Atender los factores de mayor exposición</h3>
    <p className="mt-3 text-sm leading-7 text-neutral-700">
     En el conjunto simulado, los dominios más destacados requieren análisis de
     causas, definición de medidas, responsables y verificación posterior.
     Las medidas deben decidirse sobre resultados reales y condiciones de cada centro.
    </p>
    <button type="button" onClick={()=>onOpen("guide3")}
     className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-xs font-black text-white">
     Revisar resultados <ArrowRight className="h-4 w-4"/>
    </button>
   </article>
   <article className={roundedCard+" p-6"}>
    <p className="text-xs font-black uppercase tracking-wide text-neutral-500">Expediente de implementación</p>
    <h3 className="mt-3 text-lg font-black text-neutral-900">Actividades y evidencias</h3>
    <p className="mt-3 text-sm leading-7 text-neutral-600">
     Política preventiva, información a trabajadores, mecanismos de queja, aplicación
     de guías, informe técnico y seguimiento de intervenciones.
    </p>
    <button type="button" onClick={()=>onOpen("evidence")}
     className="mt-4 inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-4 py-3 text-xs font-black text-neutral-700">
     Abrir compendio <ArrowRight className="h-4 w-4"/>
    </button>
   </article>
  </section>
 </div>;
}
export default function Nom035DemoDashboard({data,initialAudience="admin"}:{
 data:Nom035Simulation;initialAudience?:Audience
}){
 const [audience,setAudience]=useState<Audience>(initialAudience);
 const [section,setSection]=useState<Section>("overview");
 const client=audience==="client";
 const topTitle=client?"Mi empresa · Portal NOM-035":"FactoRH · Consultoría NOM-035";
 const select=(id:Section)=>{setSection(id);window.scrollTo({top:0,behavior:"smooth"});};
 return <div className="space-y-6 pb-10">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <Link href="/protected/nom035" className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-700">
    <ArrowLeft className="h-4 w-4"/>Volver al módulo real NOM-035
   </Link>
   <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-900">
    <Info className="h-4 w-4"/>SOLO DEMOSTRACIÓN · SIN DATOS REALES
   </span>
  </div>
  <header className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
   <div className="absolute right-0 top-0 h-2 w-full bg-gradient-to-r from-neutral-800 via-orange-600 to-amber-400"/>
   <div className="flex flex-wrap items-start justify-between gap-5">
    <div className="max-w-3xl">
     <p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">{topTitle}</p>
     <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
      {client?"Tu centro, tus resultados y tus acciones":"Laboratorio de evaluación NOM-035"}
     </h1>
     <p className="mt-3 text-sm leading-7 text-neutral-600">
      {client?"Vista orientada al responsable de RH de una empresa. Solo contenidos de su propia organización, sin controles generales de FactoRH.":
       "Simulador interno que genera respuestas ficticias a las Guías I, II y III, muestra resultados agregados y permite previsualizar el portal del cliente."}
     </p>
     <p className="mt-3 text-xs font-bold text-neutral-500">
      {data.organization} · Escenarios de Guadalajara
     </p>
    </div>
    <div className="w-full rounded-2xl bg-neutral-100 p-1.5 sm:w-auto">
     <p className="px-2 pb-2 pt-1 text-[10px] font-black uppercase tracking-wide text-neutral-500">
      Cambiar vista
     </p>
     <div className="grid grid-cols-2 gap-1">
      <button type="button" onClick={()=>{setAudience("admin");setSection("overview")}}
       className={"inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-xs font-black "+
        (!client?"bg-white text-orange-700 shadow-sm":"text-neutral-600")}>
       <ShieldCheck className="h-4 w-4"/>Administrador
      </button>
      <button type="button" onClick={()=>{setAudience("client");setSection("overview")}}
       className={"inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-xs font-black "+
        (client?"bg-white text-orange-700 shadow-sm":"text-neutral-600")}>
       <Eye className="h-4 w-4"/>Vista cliente
      </button>
     </div>
    </div>
   </div>
   <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
    Los trabajadores y las respuestas fueron generados por computadora.
    Ninguna información procede de Colbert, FactoRH, empresas clientes o participantes reales.
    Cambiar de vista no inicia sesión con una cuenta de cliente ni otorga permisos.
   </div>
  </header>
  {client&&<section className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
   <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
    <div className="flex items-center gap-2">
     <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-sm font-black text-white">F</span>
     <div>
      <p className="text-xs font-black uppercase tracking-wide text-neutral-800">Portal empresarial FactoRH</p>
      <p className="text-[11px] text-neutral-500">NOM-035 · Empresa de ejemplo</p>
     </div>
    </div>
    <span className="rounded-full bg-neutral-100 px-3 py-2 text-[11px] font-bold text-neutral-600">
     Sesión simulada: Responsable de RH
    </span>
   </div>
   <div className="flex flex-wrap gap-2 px-5 py-3">
    {([
     {id:"overview",label:"Inicio"},
     {id:"guide3",label:"Resultados de mi empresa"},
     {id:"guide1",label:"Guía I"},
     {id:"evidence",label:"Mis evidencias"}
    ] as const).map(item=><button key={item.id} type="button"
     onClick={()=>select(item.id)}
     className={"rounded-lg px-3 py-2 text-xs font-bold "+
      (section===item.id?"bg-orange-50 text-orange-700":"text-neutral-600 hover:bg-neutral-50")}>
     {item.label}
    </button>)}
   </div>
  </section>}
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-5 print:hidden">
   <div>
    <p className="text-sm font-black text-neutral-900">Nuevo · Informe técnico de prueba</p>
    <p className="mt-1 text-xs leading-5 text-neutral-600">
     Revisa el documento terminado y descarga el Word sin aplicar encuestas reales.
    </p>
   </div>
   <Link href="/protected/nom035/demo/informe"
    className="rounded-xl bg-orange-600 px-5 py-3 text-xs font-black text-white">
    Ver informe técnico ficticio →
   </Link>
  </div>
  <nav className="flex flex-wrap gap-2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm"
   aria-label="Secciones de demostración NOM-035">
   {labels.filter(tab=>!client||tab.id!=="questionnaire").map(tab=><button key={tab.id} type="button" onClick={()=>select(tab.id)}
    className={"rounded-xl px-4 py-3 text-xs font-black transition-colors "+
     (section===tab.id?"bg-orange-600 text-white":"bg-neutral-50 text-neutral-700 hover:bg-orange-50")}>
    {tab.label}
   </button>)}
  </nav>
  {client&&<div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-700">
   <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-orange-600"/>
   <p className="leading-6">
    <strong>Vista simulada de cliente.</strong> Una empresa solamente debe consultar
    sus centros, resultados agregados, responsables, archivos y recomendaciones autorizados.
    No puede consultar evaluaciones de otros clientes, respuestas personales ni configurar
    campañas pertenecientes a FactoRH.
   </p>
  </div>}
  {section==="overview"&&<Overview data={data} client={client} onOpen={select}/>}
  {section==="guide1"&&<GuideOne demo={data.guide1}/>}
  {section==="guide2"&&<GuideResults guide={data.guideII} client={client}/>}
  {section==="guide3"&&<GuideResults guide={data.guideIII} client={client}/>}
  {section==="evidence"&&<EvidencePanel data={data.requirements} client={client}/>}
  {section==="questionnaire"&&<QuestionPreview data={data}/>}
  <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-5">
   <p className="text-xs leading-6 text-neutral-500">
    DEMO NOM-035 · Indicadores ficticios · No acredita cumplimiento, representatividad real
    ni evaluación clínica.
   </p>
   <button type="button" onClick={()=>window.print()}
    className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-xs font-black text-neutral-700">
    <Printer className="h-4 w-4"/>Imprimir vista
   </button>
  </footer>
 </div>;
}
