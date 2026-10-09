export type VectorDimensionName =
  | "Impulso"
  | "Vinculación"
  | "Constancia"
  | "Estructura";

export type VectorDimensionInput = {
  name: string;
  score: number;
};

export type VectorFacetInput = {
  dimension: string;
  facet: string;
  score: number;
};

export type VectorDimensionReading = {
  name: VectorDimensionName;
  score: number;
  index: number;
  band: "Bajo" | "Moderado-bajo" | "Equilibrado" | "Moderado-alto" | "Alto";
  summary: string;
  strength: string;
  watchout: string;
  environment: string;
};

export type VectorAnalysis = {
  dimensions: VectorDimensionReading[];
  profileTitle: string;
  executiveSummary: string[];
  strengths: string[];
  watchouts: string[];
  communicationStyle: string;
  leadershipStyle: string;
  managementSuggestions: string[];
  topFacets: VectorFacetInput[];
  developmentFacets: VectorFacetInput[];
};

const descriptions: Record<
  VectorDimensionName,
  {
    low: string;
    balanced: string;
    high: string;
    lowStrength: string;
    lowRisk: string;
    highStrength: string;
    highRisk: string;
    lowEnvironment: string;
    highEnvironment: string;
  }
> = {
  Impulso: {
    low: "Tiende a decidir con mayor cautela, evita presionar innecesariamente y suele preferir contar con contexto antes de tomar control de una situación.",
    balanced: "Combina iniciativa con prudencia. Puede acelerar cuando la situación lo requiere sin convertir la rapidez en su único criterio de acción.",
    high: "Tiende a tomar iniciativa, asumir control y moverse con rapidez frente a retos, presión y objetivos exigentes.",
    lowStrength: "Prudencia, consideración de consecuencias y menor tendencia a imponer decisiones.",
    lowRisk: "Puede postergar conversaciones difíciles o tardar en tomar control cuando la situación exige definición rápida.",
    highStrength: "Iniciativa, decisión, orientación a resultados y disposición para enfrentar retos.",
    highRisk: "Puede elevar demasiado el ritmo, mostrarse impaciente o decidir antes de integrar suficiente contexto.",
    lowEnvironment: "Entornos donde exista tiempo para analizar, coordinar y construir acuerdos antes de actuar.",
    highEnvironment: "Entornos con retos, autonomía, objetivos claros y capacidad real para tomar decisiones.",
  },
  Vinculación: {
    low: "Tiende a relacionarse de manera más reservada y selectiva. Puede preferir interacciones concretas y espacios de trabajo con menor exposición social.",
    balanced: "Puede relacionarse y comunicar con facilidad sin depender constantemente de la interacción social para mantener su energía o desempeño.",
    high: "Tiende a establecer contacto con facilidad, expresar ideas, generar conversación e influir mediante interacción frecuente.",
    lowStrength: "Escucha, sobriedad en la comunicación y menor necesidad de reconocimiento social.",
    lowRisk: "Puede hacer poco visibles sus ideas o tardar en construir redes de apoyo cuando el puesto exige alta exposición e influencia.",
    highStrength: "Comunicación, sociabilidad, persuasión y facilidad para construir relaciones.",
    highRisk: "Puede hablar antes de escuchar suficiente, sobreprometer o depender demasiado de la interacción para movilizar resultados.",
    lowEnvironment: "Funciones que permitan concentración individual y relaciones más selectivas o especializadas.",
    highEnvironment: "Funciones con negociación, influencia, servicio, liderazgo visible o contacto frecuente con otras personas.",
  },
  Constancia: {
    low: "Tiende a buscar variedad, movimiento y cambios de ritmo. Puede sentirse más cómodo cuando existen retos nuevos y ciclos de trabajo relativamente cortos.",
    balanced: "Puede sostener rutinas necesarias y, al mismo tiempo, adaptarse a cambios sin depender de un ritmo completamente estable.",
    high: "Tiende a mantener estabilidad, seguimiento, paciencia y continuidad incluso cuando los resultados requieren tiempo.",
    lowStrength: "Adaptación al cambio, agilidad y tolerancia a entornos con prioridades móviles.",
    lowRisk: "Puede perder interés en tareas repetitivas, dar seguimiento irregular o impacientarse con ritmos más lentos.",
    highStrength: "Persistencia, paciencia, apoyo consistente y continuidad en compromisos de largo plazo.",
    highRisk: "Puede tardar en abandonar métodos conocidos o mostrar resistencia ante cambios frecuentes y poco estructurados.",
    lowEnvironment: "Entornos dinámicos, con proyectos cortos, variedad y posibilidad de cambiar de frente con frecuencia.",
    highEnvironment: "Entornos donde el seguimiento, la estabilidad de servicio y la construcción sostenida de resultados sean importantes.",
  },
  Estructura: {
    low: "Tiende a privilegiar flexibilidad y criterio práctico sobre procedimientos detallados. Puede adaptarse con rapidez cuando no existen reglas completas.",
    balanced: "Combina orden y flexibilidad. Puede utilizar criterios, datos y procesos sin convertirlos en una limitación innecesaria.",
    high: "Tiende a trabajar con estándares, planeación, precisión, evidencia y mecanismos de control antes de considerar terminado un trabajo.",
    lowStrength: "Flexibilidad, improvisación funcional y capacidad para actuar cuando la información o los procesos son incompletos.",
    lowRisk: "Puede omitir controles, documentación o verificación de detalles cuando opera con mucha velocidad o presión.",
    highStrength: "Precisión, calidad, apego a criterios, planeación y seguimiento con evidencia.",
    highRisk: "Puede sobreanalizar, rigidizar procedimientos o invertir demasiado tiempo en detalles que no modifican el resultado.",
    lowEnvironment: "Entornos que valoren autonomía, adaptación y solución práctica sin exceso de formalidad.",
    highEnvironment: "Entornos donde la calidad, el control, la documentación y la reducción de errores sean críticos.",
  },
};

const pairTitles: Record<string, string> = {
  "Impulso|Vinculación": "Movilización e influencia",
  "Constancia|Impulso": "Ejecución con persistencia",
  "Estructura|Impulso": "Ejecución con control",
  "Constancia|Vinculación": "Relación y continuidad",
  "Estructura|Vinculación": "Influencia con estructura",
  "Constancia|Estructura": "Estabilidad y precisión",
};

export function vectorIndex(score: number) {
  return Math.max(0, Math.min(100, Math.round(((score - 1) / 4) * 100)));
}

export function vectorBand(index: number): VectorDimensionReading["band"] {
  if (index <= 24) return "Bajo";
  if (index <= 44) return "Moderado-bajo";
  if (index <= 55) return "Equilibrado";
  if (index <= 75) return "Moderado-alto";
  return "Alto";
}

export function analyzeVectorConductual(
  dimensionInputs: VectorDimensionInput[],
  facets: VectorFacetInput[],
): VectorAnalysis {
  const dimensions = dimensionInputs
    .filter((item): item is VectorDimensionInput & { name: VectorDimensionName } =>
      ["Impulso", "Vinculación", "Constancia", "Estructura"].includes(item.name),
    )
    .map((item) => {
      const index = vectorIndex(item.score);
      const band = vectorBand(index);
      const definition = descriptions[item.name];
      const low = index < 45;
      const high = index > 55;
      return {
        name: item.name,
        score: item.score,
        index,
        band,
        summary: low ? definition.low : high ? definition.high : definition.balanced,
        strength: low ? definition.lowStrength : high ? definition.highStrength : definition.balanced,
        watchout: low ? definition.lowRisk : high ? definition.highRisk : "No aparece una polarización marcada; conviene interpretar esta dimensión por su combinación con las demás.",
        environment: low ? definition.lowEnvironment : high ? definition.highEnvironment : "Puede adaptarse a ambientes con distintos niveles de exigencia en esta dimensión.",
      };
    })
    .sort((a, b) => b.index - a.index);

  const topTwo = dimensions.slice(0, 2);
  const pairKey = topTwo.map((item) => item.name).sort().join("|");
  const spread =
    dimensions.length > 1
      ? dimensions[0].index - dimensions[dimensions.length - 1].index
      : 0;
  const profileTitle =
    spread <= 12
      ? "Configuración conductual equilibrada"
      : pairTitles[pairKey] || "Predominio de " + topTwo.map((item) => item.name).join(" + ");

  const byName = new Map(dimensions.map((item) => [item.name, item]));
  const impulse = byName.get("Impulso");
  const relation = byName.get("Vinculación");
  const constancy = byName.get("Constancia");
  const structure = byName.get("Estructura");

  const executiveSummary: string[] = [];
  if (topTwo.length) {
    executiveSummary.push(
      "La configuración predominante combina " +
        topTwo.map((item) => item.name.toLowerCase()).join(" y ") +
        ". Esto describe tendencias relativas dentro del propio perfil y no debe interpretarse como una clasificación rígida de personalidad.",
    );
  }

  if (impulse && structure && impulse.index >= 65 && structure.index >= 65) {
    executiveSummary.push(
      "La combinación de iniciativa elevada con alta orientación a estructura sugiere una forma de trabajo exigente: busca mover resultados, pero también mantener control, criterios y calidad. Bajo presión conviene observar que la exigencia no se transforme en rigidez o sobrecontrol.",
    );
  } else if (impulse && relation && impulse.index >= 65 && relation.index >= 65) {
    executiveSummary.push(
      "La combinación de iniciativa e influencia favorece la movilización rápida de personas y decisiones. El principal reto suele estar en equilibrar velocidad, escucha y seguimiento antes de comprometer recursos o expectativas.",
    );
  } else if (constancy && structure && constancy.index >= 65 && structure.index >= 65) {
    executiveSummary.push(
      "La combinación de constancia y estructura favorece continuidad, confiabilidad y cuidado del proceso. En contextos de cambio acelerado conviene revisar la velocidad con la que se abandonan métodos conocidos.",
    );
  } else {
    executiveSummary.push(
      "El valor del resultado está en observar cómo se combinan las cuatro tendencias. Ninguna dimensión es positiva o negativa por sí misma; su utilidad depende del puesto, el contexto y las conductas que la organización necesita.",
    );
  }

  const strengths = dimensions.slice(0, 2).map(
    (item) => item.name + ": " + item.strength,
  );
  const watchouts = dimensions
    .filter((item) => item.index >= 76 || item.index <= 24)
    .map((item) => item.name + ": " + item.watchout);

  if (!watchouts.length && dimensions.length) {
    watchouts.push(
      "No aparecen polarizaciones extremas en las cuatro tendencias. Las oportunidades de desarrollo deben definirse principalmente a partir del puesto, la entrevista y la evidencia de desempeño.",
    );
  }

  const communicationStyle =
    relation && relation.index >= 65
      ? structure && structure.index >= 65
        ? "Tiende a comunicar de manera visible y persuasiva, pero buscando sustentar el mensaje con criterios y datos."
        : "Tiende a comunicar de manera abierta, directa y relacional; puede beneficiarse de verificar comprensión y acuerdos concretos."
      : relation && relation.index <= 35
        ? "Tiende a una comunicación más selectiva y concreta. Puede ser útil darle tiempo para preparar ideas y asegurar que los temas relevantes no queden sin verbalizar."
        : "Muestra una comunicación adaptable: puede interactuar con otros sin requerir exposición constante.";

  const leadershipStyle =
    impulse && impulse.index >= 65
      ? constancy && constancy.index <= 35
        ? "Puede liderar con velocidad, exigencia y orientación a resultados. Conviene cuidar paciencia, delegación y ritmo del equipo."
        : "Tiende a asumir responsabilidad y marcar dirección. Su efectividad aumentará cuando combine claridad de objetivos con escucha y seguimiento."
      : impulse && impulse.index <= 35
        ? "Puede favorecer un liderazgo participativo y prudente. En escenarios ambiguos conviene fortalecer definición, confrontación productiva y velocidad de decisión."
        : "Tiende a alternar dirección y participación según el contexto; el comportamiento observable dependerá especialmente de presión, experiencia y claridad del rol.";

  const managementSuggestions: string[] = [];
  if (impulse && impulse.index >= 70) {
    managementSuggestions.push(
      "Definir objetivos y márgenes de decisión claros; evitar microgestión innecesaria y utilizar indicadores de resultado.",
    );
  }
  if (relation && relation.index >= 70) {
    managementSuggestions.push(
      "Aprovechar espacios de interacción, negociación y comunicación; cerrar conversaciones relevantes con acuerdos, responsables y fechas.",
    );
  }
  if (constancy && constancy.index >= 70) {
    managementSuggestions.push(
      "Anticipar cambios y explicar su propósito; permitir una transición ordenada cuando el contexto lo permita.",
    );
  }
  if (structure && structure.index >= 70) {
    managementSuggestions.push(
      "Entregar criterios, datos y estándares claros; acordar cuándo el nivel de calidad es suficiente para evitar sobreanálisis.",
    );
  }
  if (!managementSuggestions.length) {
    managementSuggestions.push(
      "Gestionar con objetivos claros y retroalimentación conductual; el perfil no muestra una polarización que requiera una forma única de conducción.",
    );
  }

  const validFacets = facets
    .filter((item) => Number.isFinite(item.score))
    .sort((a, b) => b.score - a.score);

  return {
    dimensions,
    profileTitle,
    executiveSummary,
    strengths,
    watchouts,
    communicationStyle,
    leadershipStyle,
    managementSuggestions,
    topFacets: validFacets.slice(0, 4),
    developmentFacets: [...validFacets].reverse().slice(0, 4),
  };
}
