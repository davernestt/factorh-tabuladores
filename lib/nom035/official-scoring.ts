import {NOM035_OFFICIAL_BANK,type Nom035Guide,type Nom035Question} from "./official-bank";
export type Nom035Risk="Nulo o despreciable"|"Bajo"|"Medio"|"Alto"|"Muy alto";
export type Nom035ScoredGroup={name:string;score:number;level:Nom035Risk};
export type Nom035Score={
 guide:Nom035Guide;total:number;level:Nom035Risk;
 categories:Nom035ScoredGroup[];domains:Nom035ScoredGroup[];
 applicableQuestions:number;notApplicable:number;
};
type Grid={final:readonly number[];categories:Record<string,readonly number[]>;domains:Record<string,readonly number[]>};
export const NOM035_RISK_LEVELS=["Nulo o despreciable","Bajo","Medio","Alto","Muy alto"] as const;
export const NOM035_THRESHOLDS:Record<Nom035Guide,Grid>={
 II:{
  final:[20,45,70,90],
  categories:{
   "Ambiente de trabajo":[3,5,7,9],
   "Factores propios de la actividad":[10,20,30,40],
   "Organización del tiempo de trabajo":[4,6,9,12],
   "Liderazgo y relaciones en el trabajo":[10,18,28,38]
  },
  domains:{
   "Condiciones en el ambiente de trabajo":[3,5,7,9],
   "Carga de trabajo":[12,16,20,24],
   "Falta de control sobre el trabajo":[5,8,11,14],
   "Jornada de trabajo":[1,2,4,6],
   "Interferencia en la relación trabajo-familia":[1,2,4,6],
   "Liderazgo":[3,5,8,11],
   "Relaciones en el trabajo":[5,8,11,14],
   "Violencia":[7,10,13,16]
  }
 },
 III:{
  final:[50,75,99,140],
  categories:{
   "Ambiente de trabajo":[5,9,11,14],
   "Factores propios de la actividad":[15,30,45,60],
   "Organización del tiempo de trabajo":[5,7,10,13],
   "Liderazgo y relaciones en el trabajo":[14,29,42,58],
   "Entorno organizacional":[10,14,18,23]
  },
  domains:{
   "Condiciones en el ambiente de trabajo":[5,9,11,14],
   "Carga de trabajo":[15,21,27,37],
   "Falta de control sobre el trabajo":[11,16,21,25],
   "Jornada de trabajo":[1,2,4,6],
   "Interferencia en la relación trabajo-familia":[4,6,8,10],
   "Liderazgo":[9,12,16,20],
   "Relaciones en el trabajo":[10,13,17,21],
   "Violencia":[7,10,13,16],
   "Reconocimiento del desempeño":[6,10,14,18],
   "Insuficiente sentido de pertenencia e inestabilidad":[4,6,8,10]
  }
 }
};
/** Upper bounds begin the next level: e.g. score 20 -> Bajo for Guía II. */
export function riskLevel(value:number,bounds:readonly number[]):Nom035Risk{
 if(!Number.isFinite(value)||value<0||bounds.length!==4)
  throw Error("Calificación fuera de dominio.");
 for(let i=0;i<4;i++)if(value<bounds[i])return NOM035_RISK_LEVELS[i];
 return "Muy alto";
}
export function nom035SampleSize(population:number){
 if(!Number.isInteger(population)||population<=50)throw Error("Muestreo solo aplicable a centros con más de 50 trabajadores.");
 // Ecuación 1, Guía III. Ceiling implements the minimum whole-person requirement.
 return Math.min(population,Math.ceil((0.9604*population)/(0.0025*(population-1)+0.9604)));
}
export type Nom035RawAnswer={position:number;option:number};
export function scoreNom035Guide(
 guide:Nom035Guide,answers:Nom035RawAnswer[],
 gates:{clients:boolean;supervisor:boolean}
):Nom035Score{
 const bank=NOM035_OFFICIAL_BANK[guide];
 if(!gates||typeof gates.clients!=="boolean"||typeof gates.supervisor!=="boolean")
  throw Error("Contesta las dos preguntas filtro.");
 const byNum=new Map<number,number>();
 for(const a of answers){
  if(!Number.isInteger(a.position)||!Number.isInteger(a.option)||
    a.option<0||a.option>4||byNum.has(a.position))
    throw Error("Respuestas repetidas o fuera de escala.");
  byNum.set(a.position,a.option);
 }
 const categories=new Map<string,number>(),domains=new Map<string,number>();
 let total=0,applicable=0;
 for(const q of bank){
  const active=q.conditional==="clients"?gates.clients:
    q.conditional==="supervisor"?gates.supervisor:true;
  const option=byNum.get(q.position);
  if(!active&&option!==undefined)throw Error("Respuestas a sección no aplicable.");
  if(active&&option===undefined)throw Error("Falta contestar pregunta "+q.position);
  let points=0;
  if(active){
   applicable++;
   points=q.positive?option!:4-option!;
  }
  total+=points;
  categories.set(q.category,(categories.get(q.category)||0)+points);
  domains.set(q.domain,(domains.get(q.domain)||0)+points);
 }
 if(byNum.size!==applicable)throw Error("Hay preguntas ajenas a la guía.");
 const thresholds=NOM035_THRESHOLDS[guide];
 const collect=(values:Map<string,number>,limits:Record<string,readonly number[]>):Nom035ScoredGroup[]=>
  [...values].map(([name,score])=>{
   const b=limits[name];
   if(!b)throw Error("Clasificación no encontrada: "+name);
   return {name,score,level:riskLevel(score,b)};
  });
 return {
  guide,total,level:riskLevel(total,thresholds.final),
  categories:collect(categories,thresholds.categories),
  domains:collect(domains,thresholds.domains),
  applicableQuestions:applicable,
  notApplicable:bank.length-applicable
 };
}
export function validateNom035Bank(){
 for(const guide of ["II","III"] as const){
  const questions=NOM035_OFFICIAL_BANK[guide];
  if(questions.length!==(guide==="II"?46:72))throw Error("Banco incompleto: "+guide);
  const cat=new Set<string>(),dom=new Set<string>();
  for(let i=0;i<questions.length;i++){
   const q:Nom035Question=questions[i];
   if(q.position!==i+1)throw Error("Numeración oficial incorrecta.");
   cat.add(q.category);dom.add(q.domain);
  }
  const t=NOM035_THRESHOLDS[guide];
  if([...cat].some(x=>!t.categories[x])||[...dom].some(x=>!t.domains[x])||
    Object.keys(t.categories).length!==cat.size||Object.keys(t.domains).length!==dom.size)
    throw Error("Categorías/dominios incorrectos: "+guide);
 }
 return true;
}