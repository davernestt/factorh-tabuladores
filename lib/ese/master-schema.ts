/**
 * Correspondencia de captura con FactoRH ESE.docx (formato maestro, 13 páginas).
 * Esquema de captura del PILOTO: no se admiten datos reales hasta la fase legal.
 * Un payload por tarea permite que visita y referencias no se sobrescriban.
 */
export type EseField={
 key:string;label:string;kind?:"text"|"date"|"money"|"textarea"|"select"|"number";
 options?:string[];max?:number;hint?:string
};
export type EseGroup={id:string;title:string;page:string;fields:EseField[]};
const T=(key:string,label:string,max=180):EseField=>({key,label,max});
const A=(key:string,label:string,max=1600):EseField=>({key,label,kind:"textarea",max});
const S=(key:string,label:string,options:string[]):EseField=>({key,label,kind:"select",options,max:120});
const D=(key:string,label:string):EseField=>({key,label,kind:"date",max:10});
const M=(key:string,label:string):EseField=>({key,label,kind:"money",max:18});
const N=(key:string,label:string):EseField=>({key,label,kind:"number",max:12});
const yesNo=["","Sí","No","No verificable"];
const checks=["","Adecuado","Requiere atención","No verificable"];
const documents=["Acta de nacimiento","Identificación oficial","CURP","Constancia de situación fiscal / RFC","NSS / documento IMSS","Comprobante de domicilio","Comprobante de estudios","Licencia de conducir (si aplica)","Documento migratorio (si aplica)","Otro"];
const conditions=["Estado general de conservación","Orden y limpieza","Accesibilidad y ubicación","Seguridad del entorno","Congruencia con lo declarado"];
const expenses=["Alimentación","Vivienda / renta / hipoteca","Servicios (agua, luz, gas, internet)","Transporte / gasolina","Educación y salud","Créditos / tarjetas","Recreación / deporte","Otros"];
const assets=["Vivienda / inmueble","Vehículo","Ahorro / inversión","Otro activo relevante"];
const criteria=["Ingresos vs. egresos","Capacidad de pago","Nivel de endeudamiento","Congruencia con lo observado"];
const performance=["Calidad del trabajo","Puntualidad y asistencia","Responsabilidad","Integridad / confiabilidad","Adaptación al trabajo","Relación con superiores","Relación con compañeros","Iniciativa y autonomía"];

export const ESE_VISIT_GROUPS:EseGroup[]=[
 {id:"identificacion",title:"1. Identificación y datos de contacto",page:"2",fields:[
  T("id.name","Nombre completo"),T("id.phone","Teléfono"),T("id.email","Correo electrónico"),D("id.birthdate","Fecha de nacimiento"),
  T("id.birthplace","Lugar de nacimiento"),T("id.curp","CURP (únicamente ficticia en piloto)",18),
  T("id.rfc","RFC ficticio",13),T("id.nss","NSS / IMSS ficticio",12)
 ]},
 {id:"domicilio",title:"2. Domicilio declarado",page:"2",fields:[
  T("address.street","Calle y número"),T("address.neighborhood","Colonia"),
  T("address.zip","Código postal",5),T("address.city","Municipio / Alcaldía"),
  T("address.state","Estado"),T("address.cross","Entre calles"),
  T("address.landmark","Referencia de ubicación"),T("address.tenure","Tiempo de residencia"),
  T("address.previous","Domicilio anterior"),T("address.reason","Motivo del cambio")
 ]},
 {id:"documentos",title:"3. Validación documental",page:"2",
  fields:documents.flatMap((name,i)=>[
   S(`document.${i}.presented`,`${name} · Presentado`,yesNo),
   S(`document.${i}.original`,`${name} · Original cotejado`,yesNo),
   S(`document.${i}.valid`,`${name} · Vigente`,yesNo),
   S(`document.${i}.matches`,`${name} · Coincide`,yesNo),
   T(`document.${i}.notes`,`${name} · Observaciones`,400)
  ])},
 {id:"hogar",title:"4. Integración del hogar",page:"3",
  fields:Array.from({length:5},(_,i)=>[
   T(`household.${i}.name`,`Integrante ${i+1} · Nombre`),T(`household.${i}.relation`,`Integrante ${i+1} · Parentesco / relación`),
   N(`household.${i}.age`,`Integrante ${i+1} · Edad`),T(`household.${i}.education`,`Integrante ${i+1} · Escolaridad`),
   T(`household.${i}.occupation`,`Integrante ${i+1} · Ocupación`),M(`household.${i}.contribution`,`Integrante ${i+1} · Aportación mensual`)
  ]).flat()},
 {id:"vivienda",title:"5. Características de la vivienda",page:"3",fields:[
  S("housing.type","Tipo de ocupación",["","Propia","Rentada","Prestada","Familiar","Otro"]),
  T("housing.owner","Propietario / arrendador"),M("housing.payment","Renta / pago mensual"),
  T("housing.tenure","Antigüedad en vivienda"),N("housing.rooms","Habitaciones"),N("housing.baths","Baños"),
  T("housing.utilities","Servicios disponibles (agua, drenaje, electricidad, gas, internet)",350),
  T("housing.pets","Mascotas"),A("housing.notes","Observaciones de vivienda",650)
 ]},
 {id:"visita",title:"6. Condiciones observadas en la visita",page:"3",
  fields:[
   S("visit_result","Resultado general de la visita",["","pendiente","realizada","no_realizada"]),
   ...conditions.flatMap((name,i)=>[
    S(`condition.${i}.result`,`${name} · Evaluación`,checks),
    T(`condition.${i}.comment`,`${name} · Observaciones objetivas`,500)
   ]),
   A("visit_observations","Observaciones del domicilio y entorno")
 ]},
 {id:"educacion",title:"7. Educación y formación",page:"4",
  fields:Array.from({length:5},(_,i)=>[
   T(`education.${i}.level`,`Registro ${i+1} · Nivel`),T(`education.${i}.school`,`Registro ${i+1} · Institución`),
   T(`education.${i}.period`,`Registro ${i+1} · Periodo`),T(`education.${i}.status`,`Registro ${i+1} · Estatus`),
   T(`education.${i}.document`,`Registro ${i+1} · Documento`),T(`education.${i}.validation`,`Registro ${i+1} · Resultado de validación`,500)
  ]).flat()},
 {id:"trayectoria",title:"8. Trayectoria laboral declarada",page:"4",
  fields:Array.from({length:3},(_,i)=>[
   T(`employment.${i}.company`,`Empleo ${i+1} · Empresa`),T(`employment.${i}.position`,`Empleo ${i+1} · Puesto`),
   D(`employment.${i}.start`,`Empleo ${i+1} · Ingreso`),D(`employment.${i}.end`,`Empleo ${i+1} · Egreso`),
   T(`employment.${i}.reason`,`Empleo ${i+1} · Motivo de salida`,350),
   T(`employment.${i}.contact`,`Empleo ${i+1} · Teléfono / contacto`),
   T(`employment.${i}.validation`,`Empleo ${i+1} · Validación`,350)
  ]).flat()},
 {id:"economia",title:"9. Situación económica del hogar",page:"5",fields:[
  ...Array.from({length:4},(_,i)=>[
   T(`income.${i}.person`,`Ingreso ${i+1} · Persona que aporta`),M(`income.${i}.amount`,`Ingreso ${i+1} · Ingreso mensual`),
   T(`income.${i}.source`,`Ingreso ${i+1} · Fuente`),T(`income.${i}.support`,`Ingreso ${i+1} · Observaciones / soporte`,400)
  ]).flat(),
  ...expenses.flatMap((name,i)=>[
   M(`expense.${i}.amount`,`${name} · Gasto mensual`),
   T(`expense.${i}.payer`,`${name} · Persona que paga`),
   T(`expense.${i}.notes`,`${name} · Observaciones`,350)
  ]),
  A("finance.notes","Observaciones sobre ingresos y egresos")
 ]},
 {id:"patrimonio",title:"10. Patrimonio y obligaciones relevantes",page:"6",fields:[
  ...assets.flatMap((name,i)=>[
   T(`asset.${i}.holder`,`${name} · Titular`),M(`asset.${i}.value`,`${name} · Valor estimado`),
   M(`asset.${i}.lien`,`${name} · Saldo / gravamen`),T(`asset.${i}.support`,`${name} · Soporte / observación`,350)
  ]),
  ...Array.from({length:6},(_,i)=>[
   T(`debt.${i}.creditor`,`Obligación ${i+1} · Institución / acreedor`),
   T(`debt.${i}.type`,`Obligación ${i+1} · Tipo`),
   M(`debt.${i}.payment`,`Obligación ${i+1} · Pago mensual`),
   M(`debt.${i}.balance`,`Obligación ${i+1} · Saldo estimado`),
   T(`debt.${i}.notes`,`Obligación ${i+1} · Observaciones`,350)
  ]).flat(),
  ...criteria.flatMap((name,i)=>[
   S(`coherence.${i}.status`,`${name} · Análisis`,["","Consistente","Requiere aclaración","No verificable"]),
   T(`coherence.${i}.notes`,`${name} · Comentario / evidencia`,400)
  ]),
  A("finance.conclusion","Conclusión del módulo económico")
 ]},
 {id:"evidencias",title:"15. Evidencia fotográfica y de ubicación",page:"10–11",fields:[
  ...["Fachada y persona candidata","Sala / espacio común","Comedor","Cocina","Entorno inmediato","Evidencia complementaria"].map((name,i)=>
   T(`evidence.${i}.notes`,`${name} · Descripción de la evidencia`,400)),
  T("location.reference","Croquis, mapa o referencia (texto ilustrativo)",500),
  S("location.consent","Autorización de ubicación precisa",["","No autorizada","Autorizada"]),
  A("location.notes","Observaciones de ubicación",500)
 ]}
];

function labor(i:number):EseGroup{
 const prefix=`labor.${i}`;
 return {
  id:`labor${i+1}`,title:`${i===0?"11":"12"}. Referencia laboral ${i+1}`,page:String(7+i),
  fields:[
   T(`${prefix}.company`,"Empresa"),T(`${prefix}.contact`,"Teléfono / correo (ficticio)"),
   T(`${prefix}.address`,"Domicilio"),T(`${prefix}.department`,"Área / departamento"),
   T(`${prefix}.position`,"Puesto confirmado"),T(`${prefix}.supervisor`,"Jefatura inmediata"),
   D(`${prefix}.start`,"Fecha de ingreso"),D(`${prefix}.end`,"Fecha de egreso"),
   M(`${prefix}.declared_salary`,"Sueldo declarado"),M(`${prefix}.confirmed_salary`,"Sueldo confirmado"),
   T(`${prefix}.declared_reason`,"Motivo declarado",500),T(`${prefix}.confirmed_reason`,"Motivo confirmado",500),
   S(`${prefix}.rehire`,"¿Es recontratable?",["","Sí","No","No informado"]),
   T(`${prefix}.source`,"Referencia proporcionada por"),T(`${prefix}.source_title`,"Puesto de quien refiere"),
   T(`${prefix}.contact_date`,"Fecha y medio de contacto"),A(`${prefix}.duties`,"Funciones y responsabilidades confirmadas",1000),
   ...performance.flatMap((name,j)=>[
    S(`${prefix}.rating.${j}`,`${name} · Calificación`,["","1","2","3","4","5"]),
    T(`${prefix}.evidence.${j}`,`${name} · Comentario / evidencia`,500)
   ]),
   A(`${prefix}.conclusion`,"Inconsistencias, aclaraciones y conclusión de la referencia")
  ]
 };
}
function personal(i:number):EseGroup{
 const p=`personal.${i}`;
 return {id:`personal${i+1}`,title:`13. Referencia personal ${i+1}`,page:"9",fields:[
  T(`${p}.name`,"Nombre"),T(`${p}.phone`,"Teléfono ficticio"),
  T(`${p}.relation`,"Relación con la persona"),T(`${p}.duration`,"Tiempo de conocerle"),
  A(`${p}.conduct`,"Conducta general",500),A(`${p}.others`,"Relación con otras personas",500),
  A(`${p}.trust`,"Responsabilidad y confiabilidad",500),A(`${p}.family`,"Conocimiento de la dinámica familiar",500),
  S(`${p}.recommend`,"¿La recomendaría?",["","Sí","No","Con observaciones"]),
  A(`${p}.notes`,"Observaciones",900)
 ]};
}
export const ESE_REFERENCE_GROUPS:EseGroup[]=[
 labor(0),labor(1),personal(0),personal(1),
 {id:"vecinal",title:"14. Referencia vecinal",page:"9–10",fields:[
  T("neighbor.name","Nombre de la persona vecina"),T("neighbor.phone","Teléfono ficticio"),
  T("neighbor.address","Domicilio / ubicación"),T("neighbor.duration","Tiempo de conocerle"),
  T("neighbor.relation","Relación con la persona candidata / familia"),
  T("neighbor.residence","Tiempo de residencia observado"),
  A("neighbor.conduct","Convivencia y conducta general",600),
  A("neighbor.incidents","Incidentes relevantes conocidos",600),
  S("neighbor.recommend","¿La recomendaría?",["","Sí","No","Con observaciones"]),
  A("neighbor.notes","Observaciones",900)
 ]}
];
export function getEseGroups(type:string):EseGroup[]{
 return type==="visita"?ESE_VISIT_GROUPS:type==="referencias"?ESE_REFERENCE_GROUPS:[];
}
export function sanitizeEsePayload(value:unknown,type:string):Record<string,string>|null{
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const input=value as Record<string,unknown>;
 const all=getEseGroups(type).flatMap(group=>group.fields);
 const fields=new Map(all.map(field=>[field.key,field]));
 if(Object.keys(input).length>all.length||JSON.stringify(input).length>85000)return null;
 const result:Record<string,string>={};
 for(const [key,val] of Object.entries(input)){
  const field=fields.get(key);
  if(!field||typeof val!=="string"||val.length>(field.max||180))return null;
  if(field.options&&!field.options.includes(val))return null;
  if(field.kind==="money"&&val!==""&&!/^\d{1,12}(?:\.\d{1,2})?$/.test(val))return null;
  if(field.kind==="number"&&val!==""&&!/^\d{1,10}$/.test(val))return null;
  if(field.kind==="date"&&val!==""&&!/^\d{4}-\d{2}-\d{2}$/.test(val))return null;
  result[key]=val.trim();
 }
 return result;
}
export function eseTaskSubmittable(data:Record<string,string>,type:string):boolean{
 return type==="visita"?Boolean(data.visit_result&&data.visit_result!=="pendiente"&&data.visit_observations?.trim()):
 Boolean(([0,1] as const).some(i=>data[`labor.${i}.company`]?.trim()&&data[`labor.${i}.conclusion`]?.trim())||
 ([0,1] as const).some(i=>data[`personal.${i}.name`]?.trim()&&data[`personal.${i}.notes`]?.trim())||
 (data["neighbor.name"]?.trim()&&data["neighbor.notes"]?.trim()));
}
