import type {C3Aggregate,C3Dimension,C3Pillar} from "./report";

/**
 * Interpretación CONSULTIVA preliminar: jamás convertir puntuaciones del
 * cuestionario prepiloto en inferencias causales, diagnósticos, predicciones
 * de rotación o comparaciones con baremos externos.
 */
export type C3Action = {
  code:string;dimension:string;pillar:string;score:number;
  hypothesis:string;discovery:string;action:string;
  owner:string;indicator:string;day30:string;day60:string;day90:string
};
export type C3Reading = {
  pillars: {name:string;score:number|null;observation:string}[];
  strengths: C3Dimension[];
  opportunities: C3Action[];
  overview:string;
  participationCaveat:string;
  decisions:string[];
  glossary:string[];
};
type ActionCopy = Omit<C3Action,"code"|"dimension"|"pillar"|"score">;
const playbook:Record<string,ActionCopy>={
 D01:{hypothesis:"Las prácticas de liderazgo inmediato podrían necesitar mayor consistencia.",discovery:"Contrastar claridad de prioridades, acompañamiento y calidad de retroalimentación en reuniones voluntarias.",action:"Probar reuniones breves de seguimiento y retroalimentación con acuerdos verificables.",owner:"Dirección de área y RH",indicator:"Cumplimiento de acuerdos de seguimiento",day30:"Entrevistas voluntarias y definición de expectativas",day60:"Piloto de reuniones individuales con registro de acuerdos",day90:"Verificar el cumplimiento y recoger retroalimentación agregada"},
 D02:{hypothesis:"El flujo de información podría no estar llegando de forma oportuna y uniforme.",discovery:"Revisar ejemplos de instrucciones contradictorias, cambios no comunicados y canales saturados.",action:"Acordar un canal oficial, responsables y tiempos de comunicación.",owner:"Comunicación interna y líderes de área",indicator:"Claridad y puntualidad de comunicados",day30:"Mapear canales y fallas de comunicación",day60:"Publicar protocolo de comunicación por áreas",day90:"Revisar entendimiento y tiempos de respuesta"},
 D03:{hypothesis:"Existen oportunidades para fortalecer la coordinación y las relaciones.",discovery:"Identificar puntos de fricción entre actividades o turnos sin atribuirlos a personas.",action:"Instalar acuerdos de servicio y coordinación entre equipos.",owner:"Líderes de operación",indicator:"Incidencias de coordinación resueltas",day30:"Identificar traspasos y dependencias críticas",day60:"Definir compromisos entre equipos",day90:"Revisar incidencias y acuerdos"},
 D04:{hypothesis:"Las condiciones materiales y los recursos podrían estar limitando la experiencia laboral.",discovery:"Contrastar disponibilidad de herramientas, cargas, infraestructura y tiempos de espera.",action:"Priorizar dos mejoras de recursos o procesos a partir de evidencia operativa.",owner:"Operaciones y Administración",indicator:"Incidencias de recursos y tiempo de solución",day30:"Inventario de obstáculos recurrentes",day60:"Resolver los obstáculos prioritarios",day90:"Verificar el impacto operativo"},
 D05:{hypothesis:"El esfuerzo podría no estar recibiendo reconocimiento suficiente o consistente.",discovery:"Conocer qué formas de reconocimiento resultan significativas según los colaboradores.",action:"Implantar reconocimiento específico basado en contribuciones observables.",owner:"RH y mandos responsables",indicator:"Percepción de reconocimiento en pulso",day30:"Explorar expectativas de reconocimiento",day60:"Activar reconocimiento semanal no monetario",day90:"Medir utilidad y ajustar"},
 D06:{hypothesis:"Podría existir una distancia entre valores declarados y prácticas cotidianas.",discovery:"Contrastar políticas, ejemplos de decisiones y comportamientos observables.",action:"Traducir cada valor en conductas esperadas y mecanismos de seguimiento.",owner:"Dirección y RH",indicator:"Percepción de congruencia entre discurso y práctica",day30:"Recabar ejemplos voluntarios de congruencia",day60:"Definir conductas y ejemplos por valor",day90:"Verificar incorporación a rutinas"},
 D07:{hypothesis:"Las percepciones de trato justo y respeto ameritan revisión.",discovery:"Revisar canales de consulta, lineamientos y percepción de trato con garantías de confidencialidad.",action:"Fortalecer difusión y funcionamiento de mecanismos seguros de escucha.",owner:"RH y Relaciones Laborales",indicator:"Conocimiento y accesibilidad de canales formales",day30:"Revisar políticas y mecanismos existentes",day60:"Capacitar en trato respetuoso y canales",day90:"Verificar conocimiento y confianza"},
 D08:{hypothesis:"Podría requerirse mayor claridad o seguimiento de objetivos compartidos.",discovery:"Contrastar objetivos comunicados, criterios de éxito y prácticas de revisión.",action:"Implantar tableros simples con prioridades y responsables.",owner:"Dirección de área",indicator:"Metas con seguimiento periódico",day30:"Alinear resultados esperados por equipo",day60:"Dar seguimiento quincenal a compromisos",day90:"Revisar avance y cuellos de botella"},
 D09:{hypothesis:"La organización podría aprovechar mejor las propuestas de mejora.",discovery:"Revisar cómo se reciben, evalúan y contestan ideas de mejora.",action:"Crear un mecanismo visible de propuestas y cierre de retroalimentación.",owner:"Mejora Continua y líderes",indicator:"Propuestas revisadas y acciones implementadas",day30:"Identificar barreras a propuestas",day60:"Probar tablero de ideas y responsables",day90:"Publicar avances y aprendizajes"},
 D10:{hypothesis:"El sentido de pertenencia podría reforzarse conectando trabajo y propósito.",discovery:"Escuchar qué prácticas generan orgullo o distancia sin deducir motivos a partir del índice.",action:"Comunicar hitos, contribuciones y propósito con ejemplos concretos.",owner:"Dirección y Comunicación Interna",indicator:"Percepción de pertenencia en seguimiento agregado",day30:"Recoger mensajes clave de identidad",day60:"Implementar comunicación de aportaciones",day90:"Revisar comprensión y pertenencia"},
 D11:{hypothesis:"La conexión entre esfuerzo y contribución podría fortalecerse.",discovery:"Explorar la claridad sobre impacto del trabajo y obstáculos de motivación.",action:"Reforzar conversaciones sobre propósito y contribución por equipo.",owner:"Líderes de área",indicator:"Claridad de aportaciones al resultado",day30:"Revisar tareas y objetivos prioritarios",day60:"Realizar conversaciones de contribución",day90:"Evaluar cambios percibidos"},
 D12:{hypothesis:"Las expectativas de permanencia y futuro requieren mayor comprensión.",discovery:"Explorar oportunidades y expectativas de desarrollo sin preguntar públicamente quién planea irse.",action:"Definir conversaciones voluntarias de desarrollo y comunicación de oportunidades.",owner:"RH y Desarrollo Organizacional",indicator:"Claridad de oportunidades de desarrollo",day30:"Revisar expectativas de carrera de forma voluntaria",day60:"Comunicar rutas de desarrollo disponibles",day90:"Revisar percepción agregada y ajustes"},
 D13:{hypothesis:"Las percepciones sobre compensación y equidad podrían necesitar mayor transparencia.",discovery:"Distinguir la percepción del personal de un estudio técnico de equidad salarial real.",action:"Explicar componentes de compensación y criterios con información verificable.",owner:"RH y Compensaciones",indicator:"Comprensión de criterios de compensación total",day30:"Revisar comunicación y dudas frecuentes",day60:"Publicar explicación comprensible de compensación",day90:"Verificar entendimiento y dudas recurrentes"}
};
export function c3OperationalBand(score:number|null|undefined):string{
 if(score==null||!Number.isFinite(score))return "Sin dato publicable";
 if(score<55)return "Prioridad de revisión";
 if(score<70)return "Atención";
 if(score<85)return "Favorable con oportunidades";
 return "Fortaleza";
}
export function c3ReadyToReport(summary:C3Aggregate):boolean{
 return !summary.suppressed && typeof summary.global==="number" &&
  Array.isArray(summary.pillars)&&summary.pillars.length===3 &&
  summary.pillars.every(p=>typeof p.score==="number") &&
  Array.isArray(summary.dimensions)&&summary.dimensions.length===13 &&
  summary.dimensions.every(d=>!d.suppressed&&typeof d.score==="number");
}
function pillarCopy(name:string,score:number|null,dimensions:C3Dimension[]):string{
 if(score==null)return "No hay información agregada suficiente para interpretar este pilar.";
 const valid=dimensions.filter(d=>d.pillar===name && d.score!==null) as (C3Dimension & {score:number})[];
 if(!valid.length)return "No hay dimensiones publicables para este pilar.";
 const low=[...valid].sort((a,b)=>a.score-b.score)[0];
 const high=[...valid].sort((a,b)=>b.score-a.score)[0];
 return "Índice descriptivo "+score.toFixed(1)+"/100. Dentro de este pilar, "+high.name+
  " obtuvo el valor relativo más alto ("+high.score.toFixed(1)+
  ") y "+low.name+" el más bajo ("+low.score.toFixed(1)+
  "). Esta comparación es interna, no una norma externa.";
}
export function c3Readout(s:C3Aggregate):C3Reading{
 const dimensions=(s.dimensions||[]).filter(d=>!d.suppressed&&d.score!==null) as (C3Dimension & {score:number})[];
 const priority=[...dimensions].sort((a,b)=>a.score-b.score).slice(0,3);
 const best=[...dimensions].sort((a,b)=>b.score-a.score).slice(0,3);
 const opportunities:C3Action[]=priority.map(d=>({code:d.code,dimension:d.name,pillar:d.pillar,score:d.score,
  ...(playbook[d.code]||{hypothesis:"Requiere análisis complementario.",discovery:"Contrastar los resultados con información cualitativa y operativa.",action:"Definir un plan de mejora a partir de evidencia.",owner:"Dirección de área y RH",indicator:"Seguimiento de acuerdos",day30:"Indagar",day60:"Intervenir",day90:"Verificar"})}));
 const participation=s.population&&s.population>0?100*s.completed/s.population:null;
 const participationCaveat=participation===null?
  "La población elegible no está confirmada; no es posible calcular la tasa de participación.":
  "Respondieron "+s.completed+" de "+s.population+" personas elegibles ("+participation.toFixed(1)+"%)."+
  (participation<80?" La cobertura es inferior a la meta operativa orientativa de 80%; revisar representatividad y posible sesgo de no respuesta.":" La cobertura no garantiza por sí sola representatividad ni ausencia de sesgo de no respuesta.");
 return {
  pillars:(s.pillars||[]).map(p=>({name:p.name,score:p.score,observation:pillarCopy(p.name,p.score,s.dimensions||[])})),
  strengths:best,
  opportunities,
  overview:c3ReadyToReport(s) ?
    "El índice global descriptivo es "+s.global!.toFixed(1)+
    "/100 ("+c3OperationalBand(s.global)+"). Las oportunidades presentadas corresponden a las dimensiones relativamente más bajas dentro de esta misma aplicación. No identifican por sí mismas causas ni predicen resultados futuros.":
    "Todavía no hay cobertura completa y suficiente para emitir una interpretación ejecutiva.",
  participationCaveat,
  decisions:[
   "Validar con Dirección si las prioridades relativas coinciden con la realidad operativa, sin buscar responsables individuales.",
   "Elegir como máximo dos frentes para una intervención inicial y asignar patrocinador, recursos y responsable.",
   "Aprobar indicadores verificables y fechas para revisar la ejecución de los acuerdos.",
   "Definir si procede un pulso posterior con preguntas y población comparables."
  ],
  glossary:[
    "Índice (0–100): transformación descriptiva de respuestas de 1 a 5; no representa porcentaje de personas satisfechas.",
    "Favorabilidad: promedio por reactivo del porcentaje de respuestas 4 o 5. No es el índice (0–100).",
    "eNPS: porcentaje de promotores (9–10) menos detractores (0–6) en escala de −100 a +100; es independiente del C3.",
    "Clasificaciones: rangos operativos prepiloto, no puntos de corte estadísticamente validados ni benchmarks externos.",
    "Confidencialidad: se publican resultados agregados bajo criterios mínimos de cobertura. No se exportan comentarios abiertos ni respuestas individuales."
  ]
 };
}
