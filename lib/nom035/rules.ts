export type Nom035Tier="small"|"medium"|"large";
export type Nom035Method="official_guides"|"validated_alternative"|"undecided";
export type Nom035RequirementKey=
 |"policy"|"prevention"|"information"|"complaints"|"severe_events"
 |"risk_identification"|"organizational_environment"|"results_report"|"intervention";
export type Nom035Requirement={
 key:Nom035RequirementKey;
 label:string;
 description:string;
 norm:string;
 conditional?:boolean;
 sensitive?:boolean;
};
export type Nom035Center={
 id:string;
 organization_id:string;
 name:string;
 worker_count:number;
 street_address:string;
 municipality:string;
 state:string;
 main_activity:string;
 assessment_method:Nom035Method;
 last_assessment_on:string|null;
 active:boolean;
 created_at:string;
};
export type Nom035Progress={
 center_id:string;
 requirement_key:Nom035RequirementKey;
 status:"pending"|"in_progress"|"documented";
 proof_reference:string;
 notes:string;
 updated_at:string;
};

export const NOM035_SOURCE="https://www.dof.gob.mx/nota_detalle.php?codigo=5541828&fecha=23/10/2018";

export function nom035Tier(workerCount:number):Nom035Tier{
 if(!Number.isInteger(workerCount)||workerCount<1)throw Error("Número de trabajadores inválido.");
 if(workerCount<=15)return "small";
 if(workerCount<=50)return "medium";
 return "large";
}
export const NOM035_TIER_LABELS:Record<Nom035Tier,string>={
 small:"Hasta 15 trabajadores",
 medium:"De 16 a 50 trabajadores",
 large:"Más de 50 trabajadores"
};
export function nom035Guide(workerCount:number):"none"|"II"|"III"{
 const t=nom035Tier(workerCount);
 return t==="small"?"none":t==="medium"?"II":"III";
}
export function nom035AssessmentScope(workerCount:number):string{
 const t=nom035Tier(workerCount);
 if(t==="small")return "La identificación general mediante las Guías II o III no es exigible por este tamaño; permanecen las obligaciones de prevención, difusión y atención de eventos traumáticos.";
 if(t==="medium")return "Identificación y análisis de riesgos para todos los trabajadores del centro. Puede utilizarse la Guía de Referencia II o un método alternativo validado conforme a la norma.";
 return "Identificación y análisis de riesgos, más evaluación del entorno organizacional. Puede aplicarse la Guía de Referencia III a todos los trabajadores o a una muestra representativa calculada conforme a la norma; también cabe método alternativo validado.";
}
const COMMON:Nom035Requirement[]=[
 {key:"policy",label:"Política de prevención por escrito",description:"Mantener, implantar y difundir la política sobre riesgos psicosociales, violencia laboral y entorno favorable.",norm:"5.1"},
 {key:"prevention",label:"Medidas de prevención",description:"Documentar medidas y acciones de prevención, capacitación, apoyo social y organización del trabajo.",norm:"5.4; 8.1 y 8.2"},
 {key:"information",label:"Información a los trabajadores",description:"Preparar y conservar evidencia de difusión de política, medios de denuncia, prevención y demás información aplicable.",norm:"5.7"},
 {key:"complaints",label:"Mecanismo confidencial de quejas",description:"Disponer de un mecanismo seguro y confidencial para quejas por prácticas contrarias al entorno favorable o violencia laboral.",norm:"8.1 b)"},
 {key:"severe_events",label:"Identificación y canalización de acontecimientos traumáticos severos",description:"Establecer un protocolo específico y restringido para identificar casos relacionados con el trabajo y canalizarlos cuando corresponda. No almacenar información clínica en este expediente.",norm:"5.5",sensitive:true}
];
const EVALUATION:Nom035Requirement[]=[
 {key:"risk_identification",label:"Identificación y análisis de riesgos psicosociales",description:"Planificar aplicación, población o selección según las reglas del centro de trabajo y metodología elegida.",norm:"5.2/5.3; 7.1 y 7.2"},
 {key:"results_report",label:"Informe técnico de resultados",description:"Mantener un informe con datos del centro, objetivo, actividades, método, resultados, conclusiones, recomendaciones y responsable.",norm:"7.7 y 7.8"},
 {key:"intervention",label:"Acciones de control y seguimiento",description:"Registrar medidas de control y un programa de intervención cuando los resultados lo determinen.",norm:"8.3 a 8.6",conditional:true}
];
const ENVIRONMENT:Nom035Requirement={
 key:"organizational_environment",label:"Evaluación del entorno organizacional",
 description:"Además de riesgos psicosociales, evaluar pertenencia, capacitación, responsabilidades, participación, cargas y reconocimiento.",
 norm:"5.3; 7.3"
};
export function nom035Requirements(workerCount:number):Nom035Requirement[]{
 const tier=nom035Tier(workerCount);
 if(tier==="small")return [...COMMON];
 return [...COMMON,...EVALUATION,...(tier==="large"?[ENVIRONMENT]:[])];
}
export function nom035NextAssessment(lastAssessment:string|null,workerCount:number):string|null{
 if(workerCount<=15||!lastAssessment||!/^(\d{4})-(\d{2})-(\d{2})$/.test(lastAssessment))return null;
 const [y,m,d]=lastAssessment.split("-").map(Number);
 const date=new Date(Date.UTC(y+2,m-1,d,12));
 if(Number.isNaN(date.getTime()))return null;
 return date.toISOString().slice(0,10);
}
export function nom035RequirementMap(workerCount:number){
 return new Set(nom035Requirements(workerCount).map(x=>x.key));
}
