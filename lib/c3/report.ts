import { createAdminClient } from "@/lib/supabase/admin";

export type C3Dimension = {
  code:string; name:string; pillar:string; score:number|null;
  favorability:number|null; neutrality:number|null; unfavorable:number|null;
  participants:number|null; suppressed:boolean
};
export type C3Pillar = {name:string;score:number|null};
export type C3Aggregate = {
  suppressed:boolean; completed:number; invitations:number; population:number|null;
  participation?:number|null; dimensions?:C3Dimension[]; pillars?:C3Pillar[];
  global?:number|null; enps?:number|null; enps_responses?:number|null;
  version?:string; validated?:boolean;
};
export type C3Report = {
  campaign:{id:string;name:string;status:string;bank_version:string;scope:string};
  organization:string; summary:C3Aggregate;
  generatedAt:string;
};
export type C3Opportunity = {code:string;name:string;score:number;action:string;measure:string};

const suggestions:Record<string,{action:string;measure:string}>={
 D01:{action:"Acordar rutinas de retroalimentación con líderes inmediatos.",measure:"Seguimiento de acuerdos y claridad de expectativas."},
 D02:{action:"Definir canales y reglas de comunicación entre áreas.",measure:"Oportunidad y claridad de la información."},
 D03:{action:"Facilitar acuerdos de colaboración y resolución de diferencias.",measure:"Compromisos entre compañeros y áreas."},
 D04:{action:"Revisar recursos operativos, procesos y distribución de cargas.",measure:"Incidencias y tiempos de respuesta."},
 D05:{action:"Implementar prácticas de reconocimiento frecuente y específico.",measure:"Percepción de reconocimiento oportuno."},
 D06:{action:"Traducir los valores organizacionales en comportamientos observables.",measure:"Congruencia percibida y ejemplos de aplicación."},
 D07:{action:"Revisar reglas de trato justo y canales de comunicación segura.",measure:"Conocimiento de canales y trato respetuoso."},
 D08:{action:"Clarificar objetivos y compromisos mediante tableros de seguimiento.",measure:"Avance documentado de compromisos."},
 D09:{action:"Abrir espacios para propuestas de mejora continua.",measure:"Propuestas recibidas e implementadas."},
 D10:{action:"Fortalecer la comunicación del propósito y la pertenencia.",measure:"Sentido de pertenencia en un pulso posterior."},
 D11:{action:"Alinear las tareas con el propósito y la contribución del equipo.",measure:"Claridad del impacto del trabajo."},
 D12:{action:"Indagar expectativas de carrera y permanencia de forma voluntaria.",measure:"Intención de permanencia en seguimiento agregado."},
 D13:{action:"Explicar criterios salariales y valor de las prestaciones.",measure:"Comprensión de la compensación total."}
};
export const c3Format=(n:number|null|undefined,digits=1)=>typeof n==="number"&&Number.isFinite(n)?n.toLocaleString("es-MX",{minimumFractionDigits:digits,maximumFractionDigits:digits}):"—";
export function c3Opportunities(data:C3Aggregate,limit=3):C3Opportunity[]{
 return (data.dimensions||[]).filter(x=>x.score!==null&&!x.suppressed)
 .sort((a,b)=>Number(a.score)-Number(b.score)).slice(0,limit)
 .map(d=>({code:d.code,name:d.name,score:Number(d.score),action:suggestions[d.code]?.action||"Investigar los factores de esta dimensión.",measure:suggestions[d.code]?.measure||"Evolución del indicador."}));
}
export function c3Strengths(data:C3Aggregate,limit=2):C3Dimension[]{
 return (data.dimensions||[]).filter(x=>x.score!==null&&!x.suppressed)
 .sort((a,b)=>Number(b.score)-Number(a.score)).slice(0,limit);
}
export async function loadC3Report(campaignId:string):Promise<C3Report|null>{
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaignId))return null;
 const db=createAdminClient();
 const [campaignResult,aggregateResult]=await Promise.all([
  db.from("c3_campaigns").select("id,name,status,organization_id,bank_version,scope").eq("id",campaignId).maybeSingle(),
  db.rpc("c3_campaign_aggregate",{p_campaign_id:campaignId})
 ]);
 if(campaignResult.error||!campaignResult.data||aggregateResult.error||!aggregateResult.data)return null;
 const {data:organization}=await db.from("organizations").select("name").eq("id",campaignResult.data.organization_id).maybeSingle();
 return {
  campaign:{id:campaignResult.data.id,name:campaignResult.data.name,status:campaignResult.data.status,
    bank_version:campaignResult.data.bank_version,scope:campaignResult.data.scope},
  organization:organization?.name||"Organización",
  summary:aggregateResult.data as C3Aggregate,
  generatedAt:new Date().toISOString()
 };
}
