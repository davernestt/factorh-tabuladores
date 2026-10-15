import type {DimensionScore} from "./feedback360";
import type {ProfessionalInsight} from "./feedback360-report";

/**
 * Diferencia de percepción en puntos de la escala 1-4:
 * autoevaluación - promedio simple de fuentes externas liberadas.
 * La selección es descriptiva, no un diagnóstico ni una prueba estadística.
 */
export type GapInsight={
 key:string;
 name:string;
 gap:number;
 self:number;
 external:number;
 direction:"auto_higher"|"environment_higher";
 magnitude:"relevante"|"moderada";
 interpretation:string;
 suggestion:string;
 followUp:string;
};

export const GAP_RELEVANT_THRESHOLD=0.70;
export const GAP_DISCUSSION_THRESHOLD=0.35;

export function format360Gap(gap:number):string{
 return `${gap>0?"+":""}${gap.toFixed(2)}`;
}

export function get360GapInsights(
 dimensions:DimensionScore[],
 readings:ProfessionalInsight["competencyReadings"]=[]
):GapInsight[]{
 const byKey=new Map(readings.map(r=>[r.key,r]));
 return dimensions.flatMap(d=>{
  const self=d.scores.self;
  const vals=([d.scores.manager,d.scores.peer,d.scores.report] as Array<number|undefined>)
   .filter((value):value is number=>typeof value==="number"&&Number.isFinite(value));
  if(typeof self!=="number"||!Number.isFinite(self)||!vals.length)return [];
  const external=vals.reduce((sum,value)=>sum+value,0)/vals.length;
  const gap=Number((self-external).toFixed(2));
  // Evitar transformar diferencias mínimas o redondeos en diagnósticos.
  if(Math.abs(gap)<GAP_DISCUSSION_THRESHOLD)return [];
  const abs=Math.abs(gap);
  const direction=gap>0?"auto_higher" as const:"environment_higher" as const;
  const reading=byKey.get(d.key);
  const behavior=reading?.suggestions?.[0];
  const interpretation=direction==="auto_higher"
   ?`La persona se evalúa ${abs.toFixed(2)} puntos por encima del entorno en ${d.name}. Es una posible diferencia entre lo que considera que hace y lo que otras personas observan; por sí sola no demuestra bajo desempeño.`
   :`El entorno valora ${d.name} ${abs.toFixed(2)} puntos por encima de la propia persona. Puede existir una fortaleza poco reconocida o distintas expectativas sobre la conducta.`;
  const suggestion=direction==="auto_higher"
   ?`Pedir ejemplos recientes tanto a la persona evaluada como a su entorno y acordar dos conductas observables. ${behavior??"Definir un compromiso medible con la jefatura."}`
   :`Explorar qué comportamientos positivos están reconociendo los demás y cómo aprovecharlos conscientemente. ${behavior??"Solicitar ejemplos concretos de situaciones exitosas."}`;
  return [{
   key:d.key,name:d.name,gap,self,external,direction,
   magnitude:abs>=GAP_RELEVANT_THRESHOLD?"relevante" as const:"moderada" as const,
   interpretation,suggestion,
   followUp:"Registrar un ejemplo observable y revisarlo con la jefatura en 30 días."
  }];
 }).sort((a,b)=>Math.abs(b.gap)-Math.abs(a.gap)||a.name.localeCompare(b.name,"es")).slice(0,3);
}
