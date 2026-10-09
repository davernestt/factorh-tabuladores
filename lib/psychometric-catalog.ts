export type PsychometricCatalogItem = {
  assessmentType: string;
  publicName: string;
  publicDescription: string;
  recommendedFor: string[];
  useCases: string[];
  estimatedMinutes: string;
  internalMarketReference: string;
  internalReferenceNote: string;
};

export const psychometricCatalog: Record<string, PsychometricCatalogItem> = {
  psychometric_vector: {
    assessmentType: "psychometric_vector",
    publicName: "Vector Conductual FactoRH",
    publicDescription:
      "Explora cuatro tendencias conductuales relevantes en el trabajo: Impulso, Vinculación, Constancia y Estructura. Ayuda a comprender estilo de ejecución, comunicación, ritmo, control y adaptación al entorno.",
    recommendedFor: ["Selección general", "Mandos y liderazgo", "Ventas", "Servicio", "Desarrollo"],
    useCases: ["Estilo conductual", "Entrevista", "Ajuste al puesto", "Desarrollo"],
    estimatedMinutes: "12–18 min",
    internalMarketReference: "DISC / Cleaver",
    internalReferenceNote:
      "Referencia funcional interna por tipo de constructo y uso organizacional. No es equivalencia técnica ni reproducción del instrumento comercial.",
  },
  psychometric_needs: {
    assessmentType: "psychometric_needs",
    publicName: "Mapa de Necesidades Laborales FactoRH",
    publicDescription:
      "Identifica condiciones que tienden a incrementar o disminuir la motivación laboral, como logro, autonomía, influencia, reconocimiento, estructura, afiliación, variedad, servicio, estabilidad y aprendizaje.",
    recommendedFor: ["Selección general", "Retención", "Desarrollo", "Mandos", "Planes de carrera"],
    useCases: ["Motivadores", "Riesgo de desajuste", "Retención", "Entrevista"],
    estimatedMinutes: "12–18 min",
    internalMarketReference: "Kostick / PAPI",
    internalReferenceNote:
      "Referencia funcional interna por su foco en necesidades, preferencias y comportamiento laboral. No replica escalas, reactivos ni puntuación.",
  },
  psychometric_reasoning: {
    assessmentType: "psychometric_reasoning",
    publicName: "Razonamiento Laboral General FactoRH",
    publicDescription:
      "Evalúa desempeño en razonamiento verbal, numérico, lógico, secuencial y análisis aplicado mediante problemas de opción múltiple orientados al contexto laboral.",
    recommendedFor: ["Administrativos", "Analistas", "Técnicos", "Supervisión", "Gerencias"],
    useCases: ["Aprendizaje", "Análisis", "Solución de problemas", "Toma de decisiones"],
    estimatedMinutes: "20–30 min",
    internalMarketReference: "Terman-Merrill / Wonderlic / Raven",
    internalReferenceNote:
      "Referencia funcional interna a familias de pruebas cognitivas y de razonamiento. No pretende equivalencia de coeficiente intelectual ni usa reactivos protegidos.",
  },
  psychometric_social_leadership: {
    assessmentType: "psychometric_social_leadership",
    publicName: "Adaptabilidad Social y Liderazgo FactoRH",
    publicDescription:
      "Explora juicio interpersonal, tacto y comunicación, influencia, supervisión y delegación, y manejo de conflicto en situaciones laborales.",
    recommendedFor: ["Supervisores", "Jefaturas", "Coordinaciones", "Gerencias", "Servicio"],
    useCases: ["Manejo de personas", "Supervisión", "Relaciones", "Conflicto"],
    estimatedMinutes: "10–15 min",
    internalMarketReference: "MOSS",
    internalReferenceNote:
      "Referencia funcional interna por su foco en adaptabilidad social, supervisión y relaciones humanas. No reproduce el Test MOSS.",
  },
  psychometric_values: {
    assessmentType: "psychometric_values",
    publicName: "Valores y Motivadores Laborales FactoRH",
    publicDescription:
      "Explora la importancia relativa que la persona asigna a logro, servicio, aprendizaje, colaboración, influencia y estabilidad dentro del trabajo.",
    recommendedFor: ["Selección general", "Cultura", "Desarrollo", "Planes de carrera", "Mandos"],
    useCases: ["Valores laborales", "Motivadores", "Cultura", "Entrevista"],
    estimatedMinutes: "8–12 min",
    internalMarketReference: "Zavic / SIV-SPV (familia de valores)",
    internalReferenceNote:
      "Referencia funcional interna por evaluación de valores y motivadores. La estructura FactoRH es propia y no replica esas pruebas.",
  },
  psychometric_integrity: {
    assessmentType: "psychometric_integrity",
    publicName: "Integridad y Criterio Laboral FactoRH",
    publicDescription:
      "Explora actitudes declaradas frente a responsabilidad, apego a normas, transparencia, uso de recursos, manejo de errores y criterio ético en el trabajo.",
    recommendedFor: ["Administrativos", "Caja y valores", "Compras", "Almacén", "Supervisión"],
    useCases: ["Criterio laboral", "Responsabilidad", "Normas", "Entrevista de integridad"],
    estimatedMinutes: "10–15 min",
    internalMarketReference: "Inventarios de integridad laboral / Honesty-Integrity",
    internalReferenceNote:
      "Referencia funcional interna a inventarios de integridad. Debe usarse como fuente de hipótesis para entrevista, no como detector de mentira.",
  },
  psychometric_bigfive: {
    assessmentType: "psychometric_bigfive",
    publicName: "Personalidad Laboral Big Five FactoRH",
    publicDescription:
      "Describe cinco tendencias amplias de personalidad en contexto laboral: Responsabilidad, Extraversión, Estabilidad emocional, Apertura al aprendizaje y Cooperación.",
    recommendedFor: ["Selección general", "Profesionales", "Mandos", "Gerencias", "Desarrollo"],
    useCases: ["Personalidad laboral", "Ajuste al rol", "Trabajo en equipo", "Desarrollo"],
    estimatedMinutes: "10–15 min",
    internalMarketReference: "Big Five / NEO / BFI",
    internalReferenceNote:
      "Comparte el modelo conceptual de Cinco Grandes, de uso amplio en psicología de la personalidad. Los reactivos, scoring e interpretación FactoRH son propios.",
  },
  psychometric_sales: {
    assessmentType: "psychometric_sales",
    publicName: "Perfil Comercial FactoRH",
    publicDescription:
      "Explora iniciativa comercial, persuasión, orientación al cliente, tolerancia al rechazo y disciplina comercial para puestos de venta y desarrollo de negocio.",
    recommendedFor: ["Ventas", "Ejecutivos comerciales", "Prospección", "Account managers", "Desarrollo de negocio"],
    useCases: ["Potencial comercial", "Entrevista", "Venta consultiva", "Seguimiento"],
    estimatedMinutes: "10–15 min",
    internalMarketReference: "IPV – Inventario de Personalidad para Vendedores",
    internalReferenceNote:
      "Referencia funcional interna por su orientación a rasgos relacionados con la actividad comercial. No replica el IPV ni sus escalas oficiales.",
  },
  psychometric_attention: {
    assessmentType: "psychometric_attention",
    publicName: "Atención y Precisión FactoRH",
    publicDescription:
      "Evalúa exactitud en discriminación visual, atención selectiva, seguimiento de reglas, verificación y control de errores mediante tareas breves de opción múltiple.",
    recommendedFor: ["Operativos", "Administrativos", "Calidad", "Almacén", "Captura y control"],
    useCases: ["Precisión", "Atención", "Verificación", "Seguimiento de instrucciones"],
    estimatedMinutes: "12–20 min",
    internalMarketReference: "d2-R / Toulouse-Piéron / pruebas de atención administrativa",
    internalReferenceNote:
      "Referencia funcional interna a familias de pruebas de atención y precisión. No reproduce láminas, reactivos ni baremos de instrumentos comerciales.",
  },
};

export function getPsychometricCatalogItem(type: string) {
  return psychometricCatalog[type] ?? null;
}
