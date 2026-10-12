/**
 * Synthetic-only previews for FactoRH NOM-035.
 * NO database calls, NO persistence, NO participant identities.
 * Deterministic synthetic responses are scored using the same domain logic
 * as the production questionnaires. They must never be presented as collected data.
 */
import {NOM035_OFFICIAL_BANK,type Nom035Guide,type Nom035Question} from "./official-bank";
import {scoreNom035Guide,nom035SampleSize,NOM035_RISK_LEVELS,type Nom035Risk,type Nom035Score} from "./official-scoring";
import {GUIDE1_QUESTIONS,scoreNom035Guide1} from "./guide1";
import {nom035EvidenceGuide} from "./evidence-guides";
import {nom035Requirements} from "./rules";

export type DemoLevelCount={level:Nom035Risk;count:number;percentage:number};
export type DemoGroup={
 name:string;average:number;counts:DemoLevelCount[];highOrVeryHigh:number;
};
export type DemoQuestionExample={position:number;prompt:string;answer:string;domain:string};
export type DemoGuide={
 guide:Nom035Guide;population:number;target:number;completed:number;
 coverage:"census"|"sample";sampleMinimum:number|null;
 total:DemoGroup;categories:DemoGroup[];domains:DemoGroup[];
 averageScore:number;answeredAverage:number;skippedAverage:number;
 sampleQuestions:DemoQuestionExample[];
};
export type DemoGuide1={
 population:number;invited:number;completed:number;exposureCount:number;
 referralCount:number;withoutExposure:number;
 examples:Array<{caseId:string;event:boolean;followUpQuestions:number;referral:boolean;description:string}>;
};
export type DemoTask={title:string;status:"Pendiente"|"En proceso"|"Realizada";owner:string;deadline:string;evidence:string};
export type DemoRequirement={
 key:string;title:string;basis:string;status:"Pendiente"|"En proceso"|"Documentado";
 reviewed:boolean;description:string;tasks:DemoTask[];files:string[];
};
export type Nom035Simulation={
 label:string;organization:string;centerName:string;guide1:DemoGuide1;
 guideII:DemoGuide;guideIII:DemoGuide;
 requirements:DemoRequirement[];totalDocuments:number;
};
function noise(seed:number,salt:number){
 let v=(Math.imul(seed+1,1664525)+Math.imul(salt+17,1013904223))|0;
 v^=v>>>16;v=Math.imul(v,2246822519);v^=v>>>13;v=Math.imul(v,3266489917);
 return (v^(v>>>16))>>>0;
}
function clamp(x:number,min:number,max:number){return Math.max(min,Math.min(max,x))}
function riskPower(person:number,total:number,domain:string,guide:Nom035Guide){
 // Distinct, credible virtual profiles for each evaluation without randomness.
 const cluster=person%10;
 const baseline=cluster<=1?0.4:cluster<=4?1.35:cluster<=7?2.15:3.3;
 const domainBias=domain.includes("Carga")?0.8:
  domain.includes("Jornada")?0.45:
  domain.includes("Interferencia")?0.65:
  domain.includes("Violencia")?-0.6:
  domain.includes("Reconocimiento")?0.5:
  domain.includes("Relaciones")?-0.2:0.05;
 return baseline+domainBias+(guide==="III"?0.15:0)+((person%7)-3)*0.07;
}
function buildAnswers(guide:Nom035Guide,person:number,n:number){
 const bank=NOM035_OFFICIAL_BANK[guide];
 const clients=person%4!==0;
 const supervisor=person%6===0;
 const scoredAnswers=bank.filter(q=>q.conditional===null||
  q.conditional==="clients"&&clients||
  q.conditional==="supervisor"&&supervisor).map(q=>{
   const p=riskPower(person,n,q.domain,guide);
   const jitter=(noise(person,q.position+ (guide==="II"?100:250))%100)/100-0.5;
   const points=clamp(Math.round(p+jitter*2.1),0,4);
   return {position:q.position,option:q.positive?points:4-points,points};
  });
 const scored=scoreNom035Guide(guide,scoredAnswers.map(a=>({
  position:a.position,option:a.option
 })),{clients,supervisor});
 return {scored,answers:scoredAnswers,clients,supervisor};
}
function tally(name:string,scores:Array<{score:number;level:Nom035Risk}>):DemoGroup{
 const counts=NOM035_RISK_LEVELS.map(level=>{
  const count=scores.filter(s=>s.level===level).length;
  return {level,count,percentage:scores.length?Number((count*100/scores.length).toFixed(1)):0};
 });
 const average=scores.length?Number((scores.reduce((sum,x)=>sum+x.score,0)/scores.length).toFixed(1)):0;
 return {name,average,counts,highOrVeryHigh:counts[3].count+counts[4].count};
}
function sampleExample(guide:Nom035Guide,simulated:{scored:Nom035Score;answers:Array<{position:number;option:number}>}){
 const ids=guide==="II"?[1,5,14,23,33,41,44]:[1,7,19,23,42,57,65,69];
 return ids.map(position=>{
  const q=NOM035_OFFICIAL_BANK[guide].find(q=>q.position===position)!;
  const answer=simulated.answers.find(a=>a.position===position);
  return {position,prompt:q.prompt,domain:q.domain,
   answer:answer?["Siempre","Casi siempre","Algunas veces","Casi nunca","Nunca"][answer.option]:"No aplica (salto condicional)"};
 });
}
function makeGuide(guide:Nom035Guide,population:number,target:number):DemoGuide{
 const members=Array.from({length:target},(_,i)=>buildAnswers(guide,i,target));
 const groupsOf=(kind:"categories"|"domains")=>{
  const first=members[0].scored[kind];
  return first.map(item=>tally(item.name,members.map(m=>{
   const chosen=m.scored[kind].find(c=>c.name===item.name)!;
   return {score:chosen.score,level:chosen.level};
  }))).sort((a,b)=>b.highOrVeryHigh-a.highOrVeryHigh||
    b.average-a.average);
 };
 const total=tally("Nivel de riesgo psicosocial general",members.map(m=>({
  score:m.scored.total,level:m.scored.level
 })));
 const answeredAverage=Number((members.reduce((n,m)=>n+m.scored.applicableQuestions,0)/target).toFixed(1));
 const skippedAverage=Number((members.reduce((n,m)=>n+m.scored.notApplicable,0)/target).toFixed(1));
 return {
  guide,population,target,completed:target,
  coverage:population===target?"census":"sample",
  sampleMinimum:guide==="III"?nom035SampleSize(population):null,
  total,categories:groupsOf("categories"),domains:groupsOf("domains"),
  averageScore:total.average,answeredAverage,skippedAverage,
  sampleQuestions:sampleExample(guide,members[3])
 };
}
function makeGuide1():DemoGuide1{
 const population=120,invited=120,completed=110;
 const examples=[] as DemoGuide1["examples"];
 let exposureCount=0,referralCount=0;
 for(let person=0;person<completed;person++){
  const exposed=person%5===0;
  const answers:Record<string,boolean>={};
  if(exposed){
   exposureCount++;
   for(const q of GUIDE1_QUESTIONS)answers[q.code]=false;
   const mode=person%20;
   if(mode===0){answers.II1=true;}
   else if(mode===5){answers.III1=true;answers.III2=true;answers.III3=true;}
   else if(mode===10){answers.IV1=true;answers.IV2=true;}
   else {answers.III1=true;}
  }
  const score=scoreNom035Guide1(exposed,answers);
  if(score.needsReferral)referralCount++;
  if([0,1,5,15].includes(person)){
   examples.push({
    caseId:"Escenario "+(examples.length+1),event:exposed,
    followUpQuestions:exposed?14:0,referral:score.needsReferral,
    description:!exposed?"No reportó acontecimiento; finaliza en la sección I.":
      score.needsReferral?"Cumple un umbral de referencia; recibe orientación para valoración.":
      "Reportó acontecimiento, sin activar los umbrales de la Guía I."
   });
  }
 }
 return {population,invited,completed,exposureCount,referralCount,
  withoutExposure:completed-exposureCount,examples};
}
function makeRequirements():DemoRequirement[]{
 const statuses:DemoRequirement["status"][]=[
  "Documentado","En proceso","Documentado","En proceso",
  "Documentado","Documentado","En proceso","Documentado","Pendiente"
 ];
 const owners=["Recursos Humanos","Seguridad y Salud","Comunicación Interna","Relaciones Laborales",
  "Servicio Médico","Recursos Humanos","Desarrollo Organizacional","Consultoría RH","Dirección de RH"];
 const recs=nom035Requirements(120);
 return recs.map((req,index)=>{
  const guide=nom035EvidenceGuide(req.key);
  const status=statuses[index];
  const completed=status==="Documentado"?Math.max(2,guide.tasks.length-1):
   status==="En proceso"?2:0;
  const tasks=guide.tasks.map((task,step)=>({
   title:task.title,status:(step<completed?"Realizada":
    step===completed&&status==="En proceso"?"En proceso":"Pendiente") as DemoTask["status"],
   owner:owners[index],deadline:"2026-11-"+String(4+(index+step)%20).padStart(2,"0"),
   evidence:step<completed?"DOC-DEMO-"+String(index+1).padStart(2,"0")+"-"+String(step+1):""
  }));
  return {key:req.key,title:req.label,basis:req.norm,status,
   reviewed:index===0||index===2||index===5,
   description:guide.meaning,tasks,
   files:status==="Pendiente"?[]:[
    "Evidencia de ejemplo · "+(index+1)+"A.pdf",
    ...(status==="Documentado"?["Registro de actividad · "+(index+1)+"B.pdf"]:[])
   ]};
 });
}
export function nom035Simulation():Nom035Simulation{
 const guideII=makeGuide("II",34,34),guideIII=makeGuide("III",120,94);
 const requirements=makeRequirements();
 return {
  label:"SIMULACIÓN • DATOS FICTICIOS • NO ES UN INFORME DE CUMPLIMIENTO",
  organization:"Empresa Ejemplo del Bajío, S.A. de C.V.",
  centerName:"Centro Guadalajara · Demostración",
  guide1:makeGuide1(),guideII,guideIII,requirements,
  totalDocuments:requirements.reduce((sum,r)=>sum+r.files.length,0)
 };
}
