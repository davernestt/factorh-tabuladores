import {nom035Simulation} from "@/lib/nom035/demo-data";
import {type Nom035ReportGroup,type Nom035ReportDraft,NOM035_LEVEL_LABELS} from "@/lib/nom035/report-data";
import {type WordReportPayload} from "@/lib/nom035/word-export";
export const demoReportDraft:Nom035ReportDraft={
 objective:"Identificar y analizar factores de riesgo psicosocial y, cuando procede, evaluar el entorno organizacional para orientar medidas de prevención.",
 activities:"Planeación del diagnóstico, comunicación de la aplicación, selección ficticia de participantes, aplicación de cuestionarios y análisis de resultados agregados.",
 methodology_notes:"Guía de Referencia III de la NOM-035-STPS-2018. Centro virtual con 120 trabajadores, 94 cuestionarios ficticios completados. La selección aleatoria se presenta únicamente a modo de ejemplo: no se ejecutó un muestreo real. Calificaciones por categoría y dominio a partir de respuestas sintéticas.",
 conclusions:"Los resultados simulados sugieren priorizar la revisión de cargas de trabajo y factores organizacionales. No es válido trasladar estas conclusiones a una empresa real sin evaluación, revisión profesional y confirmación de las condiciones de trabajo.",
 recommendations:"Analizar cargas, turnos y medidas de apoyo social; realizar sesiones con responsables; establecer programa de intervención con fechas, responsables y evidencia; verificar posteriormente la eficacia de las medidas.",
 intervention_notes:"Ejemplo de programa con acciones de revisión de cargas laborales, organización de turnos y fortalecimiento de canales de apoyo; no se ha implementado en ningún centro real.",
 responsible_name:"Profesional ficticio (demostración)",
 professional_license:"",
 validation_status:"draft",
 reviewed_at:null
};
export function nom035DemoReportBundle(){
 const d=nom035Simulation(),guide=d.guideIII;
 const groups:Nom035ReportGroup[]=[
  {metric_kind:"total" as const,...convertGroup(guide.total)},
  ...guide.categories.map(g=>({metric_kind:"category" as const,...convertGroup(g)})),
  ...guide.domains.map(g=>({metric_kind:"domain" as const,...convertGroup(g)}))
 ];
 return {demo:d,groups,guide};
}
function convertGroup(group:{name:string;average:number;counts:Array<{level:string;count:number}>}){
 const values=Object.fromEntries(NOM035_LEVEL_LABELS.map((l,i)=>[l.key,group.counts[i]?.count||0]));
 const count=group.counts.reduce((s,c)=>s+c.count,0);
 return {
  metric_name:group.name,count_scored:count,
  sum_score:Math.round(group.average*count),
  risk_nulo:Number(values.risk_nulo||0),risk_bajo:Number(values.risk_bajo||0),
  risk_medio:Number(values.risk_medio||0),risk_alto:Number(values.risk_alto||0),
  risk_muy_alto:Number(values.risk_muy_alto||0)
 };
}
export function nom035DemoWordPayload(kind:"technical"|"executive"):WordReportPayload{
 const {demo,groups,guide}=nom035DemoReportBundle();
 return {
  kind,company:demo.organization,center:demo.centerName,
  address:"Domicilio virtual, Guadalajara, Jalisco",activity:"Operación ficticia para demostración",
  guide:"III",version:"DOF-2018-v1",population:guide.population,
  target:guide.target,completed:guide.completed,covered:true,validated:false,
  objective:demoReportDraft.objective,activities:demoReportDraft.activities,
  method:demoReportDraft.methodology_notes,conclusions:demoReportDraft.conclusions,
  recommendations:demoReportDraft.recommendations,interventions:demoReportDraft.intervention_notes,
  responsible:demoReportDraft.responsible_name,license:"",
  aggregates:groups,actions:[{
   description:"Revisar distribución de cargas de trabajo (actividad de ejemplo)",
   responsible:"Gerencia RH ficticia",affected_area:"Operaciones (simulado)",
   status:"planned",progress_percent:0
  }]
 };
}
