import type {C3Report,C3Aggregate,C3Dimension} from "./report";

const dimensions=[
 ["D01","Liderazgo inmediato","Clima",72,73],
 ["D02","Comunicación interna","Clima",61,58],
 ["D03","Colaboración y relaciones","Clima",69,67],
 ["D04","Condiciones y recursos","Clima",65,62],
 ["D05","Reconocimiento y valoración del trabajo","Clima",56,49],
 ["D13","Compensaciones, beneficios y equidad","Clima",58,55],
 ["D06","Valores y congruencia","Cultura",74,76],
 ["D07","Ética, respeto y justicia","Cultura",68,64],
 ["D08","Orientación a resultados","Cultura",79,82],
 ["D09","Adaptabilidad y mejora continua","Cultura",71,70],
 ["D10","Orgullo y pertenencia","Compromiso",81,84],
 ["D11","Motivación y contribución","Compromiso",76,78],
 ["D12","Permanencia y futuro","Compromiso",62,60],
] as const;
const dims:C3Dimension[]=dimensions.map(([code,name,pillar,score,favorability])=>({
 code,name,pillar,score,favorability,neutrality:Math.max(0,Math.min(100-favorability,Math.round((100-favorability)*0.53))),
 unfavorable:Math.round((100-favorability)*0.47),participants:45,suppressed:false
}));
const pillars=["Clima","Cultura","Compromiso"].map(name=>{
 const own=dims.filter(d=>d.pillar===name);
 return {name,score:Math.round(own.reduce((t,d)=>t+Number(d.score),0)/own.length*10)/10};
});
const global=Math.round(pillars.reduce((n,p)=>n+p.score,0)/3*10)/10;
/** Deliberately synthetic: never pulled from Supabase and never names a client. */
export const c3DemoReport:C3Report={
 campaign:{id:"00000000-0000-0000-0000-000000000000",name:"Ejemplo de diagnóstico C3 PRO (SIMULACIÓN)",status:"closed",bank_version:"1.6-prepiloto",scope:"operativo_administrativo"},
 organization:"EMPRESA DEMOSTRATIVA · DATOS FICTICIOS",
 summary:{
  suppressed:false,population:50,invitations:50,completed:45,participation:90,
  dimensions:dims,pillars,global,enps:20,enps_responses:45,
  version:"1.6-prepiloto",validated:false
 } satisfies C3Aggregate,
 generatedAt:"2026-10-10T12:00:00.000Z",
 demo:true
};
