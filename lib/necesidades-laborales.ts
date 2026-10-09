export type NeedInput = { name: string; score: number };

export type NeedReading = {
  name: string;
  score: number;
  index: number;
  band: "Baja" | "Moderada-baja" | "Media" | "Moderada-alta" | "Alta";
  meaning: string;
  energizes: string;
  frustrates: string;
};

export type NeedsAnalysis = {
  dimensions: NeedReading[];
  topMotivators: NeedReading[];
  lowerNeeds: NeedReading[];
  executiveSummary: string[];
  retentionRisks: string[];
  managementSuggestions: string[];
  interviewPrompts: string[];
};

const defs: Record<string, {high:string; low:string; energizes:string; frustrates:string}> = {
  Logro: {
    high:"Tiende a motivarse con metas exigentes, avance visible y oportunidades para superar resultados.",
    low:"No necesita que el trabajo esté marcado por competencia o metas crecientemente exigentes para mantenerse comprometido.",
    energizes:"Objetivos retadores, indicadores claros y posibilidad de demostrar avance.",
    frustrates:"Rutina sin metas claras, poco reto o ausencia de criterios de logro."
  },
  Autonomía: {
    high:"Valora un margen amplio para decidir cómo organizar y ejecutar su trabajo.",
    low:"Puede sentirse cómodo con mayor dirección, lineamientos y acompañamiento.",
    energizes:"Confianza, margen de decisión y responsabilidad sobre el cómo.",
    frustrates:"Microgestión, autorizaciones constantes o poca capacidad de decisión."
  },
  Influencia: {
    high:"Se activa cuando puede incidir en decisiones, coordinar o movilizar a otros.",
    low:"No requiere tener control o protagonismo en decisiones para sentirse motivado.",
    energizes:"Participación en decisiones, coordinación y capacidad real de incidencia.",
    frustrates:"Roles sin voz, poca participación o responsabilidad puramente ejecutora."
  },
  Reconocimiento: {
    high:"Valora que su aportación y sus resultados sean visibles y reconocidos.",
    low:"Puede sostener su esfuerzo con menor necesidad de reconocimiento explícito.",
    energizes:"Retroalimentación positiva, visibilidad de resultados y reconocimiento oportuno.",
    frustrates:"Esfuerzo invisible, ausencia prolongada de retroalimentación o reconocimiento ambiguo."
  },
  Estructura: {
    high:"Prefiere trabajar con prioridades, responsabilidades, reglas y criterios claros.",
    low:"Tolera mejor la ambigüedad y puede operar con menor necesidad de reglas detalladas.",
    energizes:"Claridad de rol, procesos, prioridades y estándares definidos.",
    frustrates:"Cambios desordenados, instrucciones contradictorias o falta de criterios."
  },
  Afiliación: {
    high:"La pertenencia y la calidad de las relaciones influyen de manera importante en su motivación.",
    low:"Puede trabajar con independencia social y menor necesidad de cercanía con el equipo.",
    energizes:"Confianza, cooperación, sentido de equipo y relaciones de apoyo.",
    frustrates:"Aislamiento, conflicto relacional sostenido o baja integración."
  },
  Variedad: {
    high:"Necesita cambio, novedad y retos diferentes para mantener alto su interés.",
    low:"Puede sentirse cómodo con continuidad, especialización y rutinas conocidas.",
    energizes:"Proyectos nuevos, problemas distintos y cambios de contexto.",
    frustrates:"Repetición prolongada, monotonía o escasa novedad."
  },
  Servicio: {
    high:"Se motiva cuando percibe una contribución útil para clientes, compañeros o usuarios.",
    low:"No necesita visualizar un impacto social directo para mantener su compromiso.",
    energizes:"Propósito visible, impacto concreto y posibilidad de ayudar.",
    frustrates:"Tareas cuyo propósito o beneficiario resulta poco claro."
  },
  Estabilidad: {
    high:"Valora previsibilidad, continuidad y seguridad en las condiciones importantes del trabajo.",
    low:"Tolera mejor escenarios inciertos, cambios frecuentes y menor previsibilidad.",
    energizes:"Continuidad, comunicación anticipada de cambios y acuerdos estables.",
    frustrates:"Incertidumbre prolongada, cambios sorpresivos o señales ambiguas sobre continuidad."
  },
  Aprendizaje: {
    high:"Se activa con oportunidades de aprender, ampliar capacidades y crecer profesionalmente.",
    low:"Puede sentirse satisfecho consolidando habilidades ya dominadas sin necesidad constante de novedad intelectual.",
    energizes:"Retos de aprendizaje, formación, nuevos conocimientos y crecimiento.",
    frustrates:"Estancamiento, poca exposición a retos nuevos o ausencia de desarrollo."
  },
};

export function needIndex(score:number){
  return Math.max(0, Math.min(100, Math.round(((score-1)/4)*100)));
}
export function needBand(index:number):NeedReading["band"]{
  if(index<=24) return "Baja";
  if(index<=44) return "Moderada-baja";
  if(index<=60) return "Media";
  if(index<=79) return "Moderada-alta";
  return "Alta";
}

export function analyzeNeeds(inputs:NeedInput[]):NeedsAnalysis{
  const dimensions = inputs.map(item=>{
    const index=needIndex(item.score);
    const def=defs[item.name] ?? {high:"Necesidad elevada.",low:"Necesidad relativamente baja.",energizes:"Condiciones alineadas con esta necesidad.",frustrates:"Desajuste prolongado con esta necesidad."};
    const high=index>=61;
    return {
      name:item.name,
      score:item.score,
      index,
      band:needBand(index),
      meaning: high ? def.high : index<=44 ? def.low : "Esta necesidad aparece en un nivel intermedio y probablemente depende más del contexto que de una preferencia muy marcada.",
      energizes:def.energizes,
      frustrates:def.frustrates
    };
  }).sort((a,b)=>b.index-a.index);

  const topMotivators=dimensions.slice(0,3);
  const lowerNeeds=[...dimensions].sort((a,b)=>a.index-b.index).slice(0,3);

  const executiveSummary=[
    "Las necesidades más elevadas describen condiciones que probablemente incrementan energía, satisfacción y compromiso cuando están presentes de manera consistente.",
    "Las puntuaciones bajas no representan debilidades. Indican factores que la persona necesita en menor medida para mantenerse motivada.",
    "El valor del perfil está en contrastarlo con el puesto, el estilo del jefe y las condiciones reales de la organización."
  ];

  const retentionRisks=topMotivators.map(item=>item.name+": "+item.frustrates);
  const managementSuggestions=topMotivators.map(item=>item.name+": "+item.energizes);
  const interviewPrompts=topMotivators.map(item=>"Explorar "+item.name.toLowerCase()+": pedir un ejemplo de una situación laboral en la que esta condición haya aumentado o disminuido su motivación.");

  return {dimensions,topMotivators,lowerNeeds,executiveSummary,retentionRisks,managementSuggestions,interviewPrompts};
}
