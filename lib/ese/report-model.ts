/** Reporte FactoRH ESE: estructura de 13 páginas a partir del formato maestro. */
export type Block =
 | {kind:"bar";text:string}
 | {kind:"text";text:string;size?:number}
 | {kind:"table";headers:string[];rows:string[][];widths?:number[]}
 | {kind:"box";text:string;height?:number};
export type Page={heading:string;blocks:Block[]};
export type Report={caseName:string;companyName:string;studyType:string;position:string;
 version:"BORRADOR DE PRUEBA"|"VISTA PREVIA VALIDADA";pages:Page[];statusSummary:string};
export type ReportInput={
 caseName:string;companyName:string;studyType:string;position?:string;
 visit:Record<string,string>;references:Record<string,string>;
 review:Record<string,string>;approvedVisit:boolean;approvedReferences:boolean;
};
const pending="—";
const bar=(text:string):Block=>({kind:"bar",text});
const txt=(text:string,size=8):Block=>({kind:"text",text,size});
const tbl=(headers:string[],rows:string[][],widths?:number[]):Block=>({kind:"table",headers,rows,widths});
const box=(text:string,height=55):Block=>({kind:"box",text,height});
function val(data:Record<string,string>,key:string){return String(data[key]||"").trim()||pending}
function item(data:Record<string,string>,prefix:string,columns:string[]):string[]{return columns.map(k=>val(data,prefix+"."+k))}
const cp=(data:Record<string,string>,pairs:[string,string][]):string[][]=>pairs.map(([label,key])=>[label,val(data,key)]);
const money=(value:string):string=>{const n=Number(value);return value!==pending&&Number.isFinite(n)?"$"+n.toLocaleString("es-MX",{minimumFractionDigits:2,maximumFractionDigits:2}):pending};
function sum(data:Record<string,string>,keys:string[]):number{
 return keys.reduce((s,k)=>{const n=Number(data[k]);return s+(data[k]!==""&&Number.isFinite(n)?n:0)},0);
}
const fmt=(n:number)=>money(String(Math.round(n*100)/100));
function paired(data:Record<string,string>,pairs:[[string,string],[string,string]][]):Block{
 return tbl(["Campo","Dato declarado / verificado","Campo","Dato declarado / verificado"],pairs.map(([l,r])=>[l[0],val(data,l[1]),r[0],val(data,r[1])]),[1.1,1.6,1.1,1.6]);
}
const rates=["Calidad del trabajo","Puntualidad y asistencia","Responsabilidad","Integridad / confiabilidad",
"Adaptación al trabajo","Relación con superiores","Relación con compañeros","Iniciativa y autonomía"];
const expenses=["Alimentación","Vivienda / renta / hipoteca","Servicios (agua, luz, gas, internet)","Transporte / gasolina","Educación y salud","Créditos / tarjetas","Recreación / deporte","Otros"];
const assets=["Vivienda / inmueble","Vehículo","Ahorro / inversión","Otro activo relevante"];
const homechecks=["Estado general de conservación","Orden y limpieza","Accesibilidad y ubicación","Seguridad del entorno","Congruencia con lo declarado"];
const congruence=["Ingresos vs. egresos","Capacidad de pago","Nivel de endeudamiento","Congruencia con lo observado"];
const docs=["Acta de nacimiento","Identificación oficial","CURP","Constancia de situación fiscal / RFC","NSS / documento IMSS","Comprobante de domicilio","Comprobante de estudios","Licencia de conducir (si aplica)","Documento migratorio (si aplica)","Otro"];
function referenceLabor(data:Record<string,string>,i:number):Page{
 const p="labor."+i;
 const details=paired(data,[
 [["Empresa",p+".company"],["Teléfono / correo",p+".contact"]],
 [["Domicilio",p+".address"],["Área / departamento",p+".department"]],
 [["Puesto confirmado",p+".position"],["Jefatura inmediata",p+".supervisor"]],
 [["Fecha de ingreso",p+".start"],["Fecha de egreso",p+".end"]],
 [["Sueldo declarado",p+".declared_salary"],["Sueldo confirmado",p+".confirmed_salary"]],
 [["Motivo declarado",p+".declared_reason"],["Motivo confirmado",p+".confirmed_reason"]],
 [["¿Es recontratable?",p+".rehire"],["Referencia proporcionada por",p+".source"]],
 [["Puesto de quien refiere",p+".source_title"],["Fecha y medio de contacto",p+".contact_date"]],
 ]);
 const rated=tbl(["Criterio","Calif. (1–5)","Comentario / evidencia"],
 rates.map((name,j)=>[name,val(data,p+".rating."+j),val(data,p+".evidence."+j)]),[2.0,.6,2.9]);
 return {heading:"REFERENCIA LABORAL "+(i+1),blocks:[
  bar((11+i)+". REFERENCIA LABORAL "+(i+1)),details,box("FUNCIONES Y RESPONSABILIDADES CONFIRMADAS\n"+val(data,p+".duties"),54),
  rated,box("INCONSISTENCIAS, ACLARACIONES Y CONCLUSIÓN DE LA REFERENCIA\n"+val(data,p+".conclusion"),76)]};
}
function personalRows(data:Record<string,string>,i:number):Block[]{
 const p="personal."+i;
 return [
  bar("REFERENCIA PERSONAL "+(i+1)),
  paired(data,[
   [["Nombre",p+".name"],["Teléfono",p+".phone"]],
   [["Relación con la persona",p+".relation"],["Tiempo de conocerle",p+".duration"]],
  ]),
  tbl(["Campo","Información confirmada"],[
   ["Conducta general",val(data,p+".conduct")],
   ["Relación con otras personas",val(data,p+".others")],
   ["Responsabilidad y confiabilidad",val(data,p+".trust")],
   ["Conocimiento de la dinámica familiar",val(data,p+".family")],
   ["¿La recomendaría?",val(data,p+".recommend")],
   ["Observaciones",val(data,p+".notes")],
  ],[1.3,3.7])
 ];
}
const evidenceNames=["Fachada y persona candidata","Sala / espacio común","Comedor","Cocina","Entorno inmediato","Evidencia complementaria"];
export function buildEseReport(input:ReportInput):Report{
 const v=input.visit,r=input.references,a=input.review;
 const ingresos=sum(v,[0,1,2,3].map(i=>"income."+i+".amount"));
 const egresos=sum(v,expenses.map((_,i)=>"expense."+i+".amount"));
 const personIncome=Number(v["income.0.amount"]||"0");
 const hasIncome=[0,1,2,3].some(i=>v["income."+i+".amount"]?.trim());
 const hasExpense=expenses.some((_,i)=>v["expense."+i+".amount"]?.trim());
 const outcome=val(a,"verdict.result");
 const state=input.approvedVisit&&input.approvedReferences&&outcome!==pending&&val(a,"verdict.rationale")!==pending?
  "VISTA PREVIA VALIDADA":"BORRADOR DE PRUEBA";
 const page1:Page={heading:"ESTUDIO SOCIOECONÓMICO Y LABORAL",blocks:[
  txt("Formato profesional de levantamiento, validación y dictamen",9),
  paired({...a,"meta.name":input.caseName,"meta.company":input.companyName,"meta.position":input.position||"",
   "meta.type":input.studyType},[
   [["Nombre de la persona candidata","meta.name"],["Empresa solicitante","meta.company"]],
   [["Puesto evaluado","meta.position"],["Tipo de estudio","meta.type"]],
  ]),
  bar("RESULTADO EJECUTIVO"),
  tbl(["Recomendable","Recomendable con observaciones","No recomendable","No concluyente"],[
   ["Recomendable","Recomendable con observaciones","No recomendable","No concluyente"].map(x=>outcome===x?"X":"")
  ],[1,1.45,1,1]),
  txt("El resultado deberá sustentarse exclusivamente en hallazgos verificables, inconsistencias relevantes y el alcance contratado.",7),
  box("RESUMEN EJECUTIVO\n"+val(a,"executive.summary"),165),
  bar("CONTROL DEL SERVICIO"),
  paired(a,[
   [["Fecha de solicitud","service.request_date"],["Fecha de visita","service.visit_date"]],
   [["Fecha de cierre","service.close_date"],["Responsable del estudio","service.responsible"]],
  ])
 ]};
 const page2:Page={heading:"DATOS PERSONALES Y DOCUMENTOS",blocks:[
  bar("1. IDENTIFICACIÓN Y DATOS DE CONTACTO"),
  paired(v,[
   [["Nombre completo","id.name"],["Teléfono","id.phone"]],
   [["Correo electrónico","id.email"],["Fecha de nacimiento","id.birthdate"]],
   [["Lugar de nacimiento","id.birthplace"],["CURP","id.curp"]],
   [["RFC","id.rfc"],["NSS / IMSS","id.nss"]],
  ]),
  bar("2. DOMICILIO DECLARADO"),
  paired(v,[
   [["Calle y número","address.street"],["Colonia","address.neighborhood"]],
   [["Código postal","address.zip"],["Municipio / Alcaldía","address.city"]],
   [["Estado","address.state"],["Entre calles","address.cross"]],
   [["Referencia de ubicación","address.landmark"],["Tiempo de residencia","address.tenure"]],
   [["Domicilio anterior","address.previous"],["Motivo del cambio","address.reason"]],
  ]),
  bar("3. VALIDACIÓN DOCUMENTAL"),
  txt("Marcar solo lo efectivamente revisado. Evitar números de documentos completos.",7),
  tbl(["Documento","Presentado","Original","Vigente","Coincide","Observaciones"],
   docs.map((d,i)=>[d,val(v,"document."+i+".presented"),val(v,"document."+i+".original"),val(v,"document."+i+".valid"),
    val(v,"document."+i+".matches"),val(v,"document."+i+".notes")]),[1.8,.6,.6,.6,.6,1.8])
 ]};
 const page3:Page={heading:"HOGAR Y VIVIENDA",blocks:[
  bar("4. INTEGRACIÓN DEL HOGAR"),
  txt("Registrar únicamente quienes habitan de forma habitual en el domicilio visitado.",7),
  tbl(["Nombre","Parentesco","Edad","Escolaridad","Ocupación","Aportación"],
   [0,1,2,3,4].map(i=>item(v,"household."+i,["name","relation","age","education","occupation","contribution"])),
   [1.2,.95,.35,.9,1,1]),
  bar("5. CARACTERÍSTICAS DE LA VIVIENDA"),
  paired(v,[
   [["Tipo de ocupación","housing.type"],["Propietario / arrendador","housing.owner"]],
   [["Renta / pago mensual","housing.payment"],["Antigüedad en vivienda","housing.tenure"]],
   [["Habitaciones","housing.rooms"],["Baños","housing.baths"]],
   [["Servicios disponibles","housing.utilities"],["Mascotas","housing.pets"]],
  ]),
  bar("6. CONDICIONES OBSERVADAS EN LA VISITA"),
  tbl(["Aspecto","Evaluación","Observaciones objetivas"],homechecks.map((name,i)=>[
   name,val(v,"condition."+i+".result"),val(v,"condition."+i+".comment")]),[2,1,2.5]),
  box("OBSERVACIONES DEL DOMICILIO Y ENTORNO\n"+val(v,"visit_observations"),76),
  txt("Documentar hechos observables; evitar juicios sobre origen, salud, religión, apariencia u otros atributos personales.",7)
 ]};
 const page4:Page={heading:"EDUCACIÓN Y TRAYECTORIA",blocks:[
  bar("7. EDUCACIÓN Y FORMACIÓN"),
  tbl(["Nivel","Institución","Periodo","Estatus","Documento","Resultado de validación"],
   [0,1,2,3,4].map(i=>item(v,"education."+i,["level","school","period","status","document","validation"])),[.7,1.5,.7,.8,.9,1.5]),
  bar("8. TRAYECTORIA LABORAL DECLARADA"),
  tbl(["Empresa","Puesto","Ingreso","Egreso","Motivo de salida","Contacto","Validación"],
   [0,1,2].map(i=>item(v,"employment."+i,["company","position","start","end","reason","contact","validation"])),
   [1.2,.85,.7,.7,1.25,.8,1.0])
 ]};
 const page5:Page={heading:"SITUACIÓN ECONÓMICA",blocks:[
  bar("9. SITUACIÓN ECONÓMICA DEL HOGAR"),
  txt("Cantidades mensuales; indicar expresamente los datos no verificables.",7),
  tbl(["Persona que aporta","Ingreso mensual","Fuente","Observaciones / soporte"],
   [0,1,2,3].map(i=>[val(v,"income."+i+".person"),money(val(v,"income."+i+".amount")),
    val(v,"income."+i+".source"),val(v,"income."+i+".support")]),[1.2,.85,1.1,2]),
  tbl(["Total de ingresos","Monto","Ingreso de la persona candidata","Monto"],
   [["Total de ingresos",hasIncome?fmt(ingresos):pending,"Ingreso de la persona candidata",v["income.0.amount"]?.trim()?fmt(personIncome):pending]],[1.4,.8,1.4,.8]),
  bar("GASTOS MENSUALES"),
  tbl(["Concepto","Monto mensual","Persona que paga","Observaciones"],
   expenses.map((name,i)=>[name,money(val(v,"expense."+i+".amount")),val(v,"expense."+i+".payer"),val(v,"expense."+i+".notes")]),
   [2.0,.7,1.1,2]),
  tbl(["Total de egresos","Monto","Balance mensual estimado","Monto"],
   [["Total de egresos",hasExpense?fmt(egresos):pending,"Balance mensual",hasIncome&&hasExpense?fmt(ingresos-egresos):pending]],[1.6,.9,1.7,.9]),
  box("OBSERVACIONES SOBRE INGRESOS Y EGRESOS\n"+val(v,"finance.notes"),72)
 ]};
 const page6:Page={heading:"PATRIMONIO Y OBLIGACIONES",blocks:[
  bar("10. PATRIMONIO Y OBLIGACIONES RELEVANTES"),
  bar("ACTIVOS DECLARADOS"),
  tbl(["Tipo","Titular","Valor estimado","Saldo / gravamen","Soporte / observación"],
   assets.map((name,i)=>[name,val(v,"asset."+i+".holder"),money(val(v,"asset."+i+".value")),
    money(val(v,"asset."+i+".lien")),val(v,"asset."+i+".support")]),
   [1.35,1.1,.8,.85,1.5]),
  bar("OBLIGACIONES FINANCIERAS"),
  tbl(["Institución / acreedor","Tipo","Pago mensual","Saldo estimado","Observaciones"],
   [0,1,2,3,4,5].map(i=>[val(v,"debt."+i+".creditor"),val(v,"debt."+i+".type"),
    money(val(v,"debt."+i+".payment")),money(val(v,"debt."+i+".balance")),val(v,"debt."+i+".notes")]),
   [1.35,1,.9,.9,1.45]),
  bar("ANÁLISIS DE CONGRUENCIA ECONÓMICA"),
  tbl(["Criterio","Análisis","Comentario / evidencia"],
   congruence.map((name,i)=>[name,val(v,"coherence."+i+".status"),val(v,"coherence."+i+".notes")]),[1.6,1,3]),
  box("CONCLUSIÓN DEL MÓDULO ECONÓMICO\n"+val(v,"finance.conclusion"),70)
 ]};
 const page9:Page={heading:"REFERENCIAS PERSONALES Y VECINALES",blocks:[
  bar("13. REFERENCIAS PERSONALES"),
  ...personalRows(r,0),...personalRows(r,1),
  bar("14. REFERENCIA VECINAL"),
  paired(r,[
   [["Nombre de la persona vecina","neighbor.name"],["Teléfono","neighbor.phone"]],
   [["Domicilio / ubicación","neighbor.address"],["Tiempo de conocerle","neighbor.duration"]],
  ])
 ]};
 const page10:Page={heading:"REFERENCIA VECINAL Y EVIDENCIAS",blocks:[
  tbl(["Aspecto vecinal","Información declarada / confirmada"],[
   ["Relación con la persona candidata / familia",val(r,"neighbor.relation")],
   ["Tiempo de residencia observado",val(r,"neighbor.residence")],
   ["Convivencia y conducta general",val(r,"neighbor.conduct")],
   ["Incidentes relevantes conocidos",val(r,"neighbor.incidents")],
   ["¿La recomendaría?",val(r,"neighbor.recommend")],
   ["Observaciones",val(r,"neighbor.notes")]
  ],[1.75,3.25]),
  bar("15. EVIDENCIA FOTOGRÁFICA Y DE UBICACIÓN"),
  txt("Las imágenes se insertarán únicamente cuando exista autorización, origen verificable y archivo almacenado con permisos.",7),
  tbl(["Evidencia","Estado / descripción","Evidencia","Estado / descripción"],
   [[0,1],[2,3],[4,5]].map(([i,j])=>[
    (i+1)+". "+evidenceNames[i],val(v,"evidence."+i+".notes"),
    (j+1)+". "+evidenceNames[j],val(v,"evidence."+j+".notes")
   ]),[1.2,1.3,1.2,1.3]),
  box("CROQUIS, MAPA O REFERENCIA DE UBICACIÓN\n"+val(v,"location.reference"),100)
 ]};
 const page11:Page={heading:"CROQUIS Y UBICACIÓN",blocks:[
  bar("CROQUIS, MAPA O REFERENCIA DE UBICACIÓN"),
  box("Espacio reservado para croquis, mapa o referencia digital validada.\n"+
    "Ubicación precisa: "+val(v,"location.consent")+".\n"+
    "Referencia de visita: "+val(v,"location.reference")+".\n"+
    "Observaciones: "+val(v,"location.notes"),410),
  txt("No se incluyen coordenadas exactas ni mapas automáticos sin consentimiento y verificación de la ubicación.",8)
 ]};
 const page12:Page={heading:"REPORTE DE INVESTIGACIÓN",blocks:[
  bar("16. REPORTE DE INVESTIGACIÓN"),
  box(val(a,"research.report"),480)
 ]};
 const outcomes=["Recomendable","Recomendable con observaciones","No recomendable","No concluyente"];
 const privacy=[
  ["Responsable del tratamiento","David Ernesto Carrillo Ruiz, bajo la marca comercial FactoRH."],
  ["Domicilio del responsable","Volcán Osorno 5827, Huentitán el Bajo, Guadalajara, Jalisco."],
  ["Datos objeto de tratamiento","Identificación, contacto, domicilio, documentación, formación, trayectoria laboral, referencias, fotografías y, cuando aplique, información financiera y patrimonial."],
  ["Finalidades principales","Integrar, validar y emitir el estudio socioeconómico y laboral; confirmar la información proporcionada y comunicar el resultado a la empresa solicitante."],
  ["Comunicación del reporte","Solo se comunicarán a "+input.companyName+" las evidencias estrictamente necesarias y autorizadas."],
  ["Derechos ARCO, limitación y revocación","David@factorh.com.mx"],
  ["Consulta del aviso integral","www.factorh.com.mx"]
 ];
 const page13:Page={heading:"DICTAMEN Y PRIVACIDAD",blocks:[
  bar("17. DICTAMEN FINAL"),
  tbl(outcomes,[outcomes.map(x=>outcome===x?"X":"")],[1,1.45,1,1]),
  box("FUNDAMENTO DEL DICTAMEN\n"+val(a,"verdict.rationale"),110),
  txt("El dictamen es un insumo y no sustituye la decisión integral de contratación de la empresa solicitante.",7),
  bar("18. AVISO DE PRIVACIDAD"),
  txt("El Aviso de Privacidad Integral deberá ponerse a disposición de la persona antes del levantamiento; verificar vigencia y consentimiento.",7),
  tbl(["Aspecto","Información del formato maestro"],privacy,[1.3,3.7])
 ]};
 return {
  caseName:input.caseName,companyName:input.companyName,studyType:input.studyType,
  position:input.position||"",version:state,
  statusSummary:"Visita "+(input.approvedVisit?"validada":"pendiente")+
   " · Referencias "+(input.approvedReferences?"validadas":"pendientes"),
  pages:[page1,page2,page3,page4,page5,page6,referenceLabor(r,0),referenceLabor(r,1),
   page9,page10,page11,page12,page13]
 };
}
