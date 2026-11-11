/**
 * Pulse templates are coherent multi-dimension topics, not individual questions.
 * Each C3 dimension has four published Likert items. Selecting 2 or 3 dimensions
 * creates 8 or 12 questions respectively. Scores are descriptive pilot metrics.
 */
export type PulseTopic={
 id:string;name:string;description:string;dimensionCodes:readonly string[];
 intent:string;
};
export const PULSE_TOPICS:readonly PulseTopic[]=[
 {id:"comunicacion",name:"Comunicación y coordinación",description:"Claridad de mensajes, canales internos y colaboración entre áreas.",dimensionCodes:["D02","D03"],intent:"Dar seguimiento a la comunicación y coordinación del trabajo."},
 {id:"liderazgo",name:"Liderazgo y reconocimiento",description:"Acompañamiento de los líderes y valoración de las contribuciones.",dimensionCodes:["D01","D05"],intent:"Conocer cómo se perciben el liderazgo cotidiano y el reconocimiento."},
 {id:"cultura",name:"Cultura, confianza y valores",description:"Congruencia con valores, trato justo y apertura a mejorar.",dimensionCodes:["D06","D07","D09"],intent:"Revisar la vivencia de los valores y la confianza organizacional."},
 {id:"condiciones",name:"Condiciones y compensación",description:"Recursos para trabajar, cargas y percepción de compensación y beneficios.",dimensionCodes:["D04","D13"],intent:"Identificar oportunidades de mejora en condiciones y compensación percibida."},
 {id:"compromiso",name:"Motivación y sentido de pertenencia",description:"Orgullo, motivación, contribución y expectativas de permanencia.",dimensionCodes:["D10","D11","D12"],intent:"Revisar motivación y pertenencia después de las acciones implementadas."},
 {id:"resultados",name:"Objetivos y mejora continua",description:"Claridad sobre resultados, compromisos y capacidad de adaptación.",dimensionCodes:["D08","D09"],intent:"Monitorear la ejecución de acuerdos y la mejora del trabajo."},
 {id:"permanencia",name:"Reconocimiento y permanencia",description:"Cómo se valoran las contribuciones y expectativas de continuidad.",dimensionCodes:["D05","D12"],intent:"Dar seguimiento a reconocimiento e intención de permanencia."}
];
export const PULSE_DIMENSIONS:readonly {code:string;name:string}[]=[
 {code:"D01",name:"Liderazgo inmediato"},
 {code:"D02",name:"Comunicación interna"},
 {code:"D03",name:"Colaboración y relaciones"},
 {code:"D04",name:"Condiciones y recursos"},
 {code:"D05",name:"Reconocimiento y valoración del trabajo"},
 {code:"D06",name:"Valores y congruencia"},
 {code:"D07",name:"Ética, respeto y justicia"},
 {code:"D08",name:"Orientación a resultados"},
 {code:"D09",name:"Adaptabilidad y mejora continua"},
 {code:"D10",name:"Orgullo y pertenencia"},
 {code:"D11",name:"Motivación y contribución"},
 {code:"D12",name:"Permanencia y futuro"},
 {code:"D13",name:"Compensaciones, beneficios y equidad"}
];
export function pulseTopicFor(id:string){
 return PULSE_TOPICS.find(topic=>topic.id===id);
}
