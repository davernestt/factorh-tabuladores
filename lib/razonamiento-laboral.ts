export type ReasoningInput = {
  name: string;
  percentage: number;
};

export type ReasoningReading = {
  name: string;
  percentage: number;
  band: "Aciertos bajos" | "Aciertos moderados" | "Aciertos funcionales" | "Aciertos sólidos" | "Aciertos muy sólidos";
  meaning: string;
  relevance: string;
};

export type ReasoningAnalysis = {
  dimensions: ReasoningReading[];
  overall: number;
  overallBand: ReasoningReading["band"];
  strongest: ReasoningReading[];
  priorities: ReasoningReading[];
  executiveSummary: string[];
  interviewPrompts: string[];
};

const definitions: Record<string, { meaning: string; relevance: string }> = {
  "Razonamiento verbal": {
    meaning: "Explora comprensión de conceptos, relaciones entre palabras e inferencias expresadas mediante lenguaje.",
    relevance: "Puede ser relevante en puestos que exigen comprender instrucciones, sintetizar información, redactar o argumentar."
  },
  "Razonamiento numérico": {
    meaning: "Explora la capacidad para trabajar con cantidades, porcentajes, proporciones y relaciones numéricas básicas.",
    relevance: "Puede ser relevante en funciones con indicadores, presupuestos, costos, inventarios, productividad o análisis cuantitativo."
  },
  "Lógica y relaciones": {
    meaning: "Explora la capacidad para derivar conclusiones a partir de reglas, condiciones y relaciones dadas.",
    relevance: "Puede ser relevante en diagnóstico de problemas, control, auditoría, análisis de procesos y toma de decisiones estructurada."
  },
  "Secuencias y patrones": {
    meaning: "Explora identificación de regularidades y cambios sistemáticos en series numéricas o simbólicas.",
    relevance: "Puede aportar información en tareas que exigen detectar patrones, aprender reglas nuevas o reconocer desviaciones."
  },
  "Análisis aplicado": {
    meaning: "Explora solución de problemas laborales sencillos utilizando datos, restricciones, tiempos y criterios objetivos.",
    relevance: "Puede ser relevante en planeación, priorización, capacidad operativa y resolución práctica de problemas."
  }
};

export function reasoningBand(value: number): ReasoningReading["band"] {
  if (value < 40) return "Aciertos bajos";
  if (value < 60) return "Aciertos moderados";
  if (value < 75) return "Aciertos funcionales";
  if (value < 90) return "Aciertos sólidos";
  return "Aciertos muy sólidos";
}

export function analyzeReasoning(inputs: ReasoningInput[]): ReasoningAnalysis {
  const dimensions = inputs.map((item) => {
    const def = definitions[item.name] ?? {
      meaning: "Explora una dimensión de razonamiento laboral.",
      relevance: "Debe interpretarse según las exigencias reales del puesto."
    };
    return {
      name: item.name,
      percentage: Math.max(0, Math.min(100, item.percentage)),
      band: reasoningBand(item.percentage),
      meaning: def.meaning,
      relevance: def.relevance
    };
  });

  const overall = dimensions.length
    ? dimensions.reduce((sum, item) => sum + item.percentage, 0) / dimensions.length
    : 0;

  const ranked = [...dimensions].sort((a, b) => b.percentage - a.percentage);
  const strongest = ranked.slice(0, 2);
  const priorities = [...ranked].reverse().slice(0, 2);

  const executiveSummary = [
    "El resultado resume el porcentaje de respuestas correctas en cinco tipos de razonamiento. No equivale a un coeficiente intelectual, percentil normativo ni diagnóstico de capacidad general.",
    "Las diferencias entre dimensiones sirven como hipótesis para profundizar en entrevista o mediante ejercicios de trabajo, especialmente cuando el puesto exige de forma crítica alguno de estos tipos de razonamiento.",
    "Mientras el instrumento permanezca en fase experimental, los resultados deben interpretarse de manera descriptiva y nunca como criterio único para contratar, descartar o promover."
  ];

  const interviewPrompts = priorities.map((item) =>
    "Profundizar en " + item.name.toLowerCase() + ": pedir que resuelva en entrevista un problema breve relacionado con las exigencias reales del puesto y observar el proceso seguido, no sólo la respuesta final."
  );

  return {
    dimensions,
    overall,
    overallBand: reasoningBand(overall),
    strongest,
    priorities,
    executiveSummary,
    interviewPrompts
  };
}
