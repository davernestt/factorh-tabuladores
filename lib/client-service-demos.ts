/** Catálogo de demostraciones administradas desde Centro de Clientes.
 * La muestra es ficticia y no crea licencias. Únicamente los módulos con
 * portal cliente realmente disponible pueden recibir un acceso operativo.
 */
export type ServiceDemo={moduleKey:string;previewHref:string;kind:"live"|"preview";days:number|null;quantity:number|null;unit:string;includes:string[];warning?:string;plans:{name:string;quantity:number|null}[]};
export const clientServiceDemos:Record<string,ServiceDemo>={
 psychometrics:{
  moduleKey:"psychometrics",previewHref:"/demo-cliente?seccion=psicometrias",kind:"live",days:30,quantity:2,unit:"candidatos",
  includes:["Dos candidatos durante 30 días.","Una, varias o todas las pruebas habilitadas por candidato, desde una liga.","Resultados por prueba e informe integral al completar la batería."],
  warning:"Los paquetes pagados existentes aún consumen por instrumento, no por candidato.",
  plans:[{name:"10 créditos psicométricos",quantity:10},{name:"30 créditos psicométricos",quantity:30},{name:"50 créditos psicométricos",quantity:50},{name:"100 créditos psicométricos",quantity:100},{name:"350 créditos psicométricos",quantity:350},{name:"Cantidad personalizada",quantity:null}]
 },
 feedback360:{
  moduleKey:"feedback360",previewHref:"/demo-cliente?seccion=360",kind:"live",days:14,quantity:1,unit:"líder evaluado",
  includes:["Un ciclo 360° real para un líder, durante 14 días.","Autoevaluación, jefe, pares y colaboradores con ligas individuales.","Resultados y reporte al cerrar; grupos pequeños sujetos a confidencialidad."],
  plans:[{name:"1 líder",quantity:1},{name:"5 líderes",quantity:5},{name:"15 líderes",quantity:15},{name:"30 líderes",quantity:30},{name:"60 líderes",quantity:60},{name:"Cantidad personalizada",quantity:null}]
 },
 nom035:{
  moduleKey:"nom035",previewHref:"/protected/nom035/demo?view=cliente",kind:"live",days:14,quantity:null,unit:"centros",
  includes:["Acceso al expediente NOM-035 por 14 días.","Herramientas, registro de centros y guías disponibles según el tramo normativo.","Vista de reportes de muestra disponible separadamente para la demostración."],
  warning:"Piloto temporal, sin límite técnico de trabajadores o centros. No representa una certificación de cumplimiento. No se recomienda usar con datos reales sin acordar el alcance.",
  plans:[{name:"Acceso al módulo NOM-035",quantity:null}]
 },
 pdl:{
  moduleKey:"pdl",previewHref:"/protected/empresas/demos/pdl",kind:"preview",days:null,quantity:null,unit:"líderes",
  includes:["Ejemplo ilustrativo de autopercepción, evaluación del jefe inmediato y entrevista.","Vista conceptual de diagnóstico y seguimiento de líderes.","No se habilitan encuestas reales al cliente desde esta opción."],
  plans:[{name:"Proyecto PDL con consultoría",quantity:null}]
 },
 climate:{
  moduleKey:"climate",previewHref:"/protected/empresas/demos/climate",kind:"preview",days:null,quantity:null,unit:"participantes",
  includes:["Ejemplo de clima, cultura y compromiso, con comparativos ilustrativos.","Explicación de confidencialidad de resultados por departamento.","La aplicación autónoma en cuentas cliente está pendiente."],
  plans:[{name:"Campaña de Clima/C3 PRO",quantity:null}]
 },
 studies:{
  moduleKey:"studies",previewHref:"/protected/empresas/demos/studies",kind:"preview",days:null,quantity:null,unit:"estudios",
  includes:["Ejemplo conceptual de capturas, investigación y entrega.","Tipos de estudio Express, Esencial, Integral y Ejecutivo.","No se asignan estudios reales desde esta muestra."],
  plans:[{name:"Estudios Socioeconómicos",quantity:null}]
 }
};
