export type LeadershipDimensionInput = {
  id: string;
  name: string;
  description?: string | null;
  sort_order: number;
};

export type LeadershipQuestionInput = {
  id: string;
  dimension_id: string | null;
  prompt: string;
  question_type: string;
  sort_order: number;
  required?: boolean;
};

export type LeadershipResponseInput = {
  question_id: string;
  numeric_value: number | string | null;
  text_value: string | null;
  evidence_text?: string | null;
  is_not_observed?: boolean;
};

export type LeadershipResultInput = {
  dimension_id: string;
  score: number | string;
  percentage?: number | string;
};

export type DimensionAnalysis = {
  id: string;
  name: string;
  order: number;
  score: number | null;
  level: string;
  tone: "strong" | "functional" | "attention" | "priority";
  narrative: string;
  behavioralReading: string;
  strongestItem: string | null;
  developmentItem: string | null;
  qualitativeEvidence: string[];
};

export type DevelopmentPlanItem = {
  competency: string;
  currentFinding: string;
  targetBehavior: string;
  action: string;
  indicator: string;
  day30: string;
  day60: string;
  day90: string;
};

export type LeadershipAnalysis = {
  overall: number | null;
  overallLevel: string;
  executiveSummary: string;
  perspectiveNote: string;
  dimensions: DimensionAnalysis[];
  strengths: DimensionAnalysis[];
  priorities: DimensionAnalysis[];
  risks: string[];
  plan: DevelopmentPlanItem[];
  openResponses: Array<{ prompt: string; answer: string }>;
};

function scoreBand(score: number | null) {
  if (score === null) {
    return {
      level: "Sin información suficiente",
      tone: "attention" as const,
    };
  }
  if (score >= 4.5) {
    return { level: "Fortaleza consolidada", tone: "strong" as const };
  }
  if (score >= 3.8) {
    return { level: "Fortaleza funcional", tone: "strong" as const };
  }
  if (score >= 3.0) {
    return {
      level: "Desempeño funcional con oportunidad",
      tone: "functional" as const,
    };
  }
  if (score >= 2.0) {
    return {
      level: "Brecha de desarrollo relevante",
      tone: "attention" as const,
    };
  }
  return { level: "Brecha prioritaria", tone: "priority" as const };
}

function shortPrompt(value: string, max = 115) {
  const text = value.trim().replace(/\s+/g, " ");
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function perspectiveFor(type: string, name: string) {
  if (type === "leadership_direction") {
    return "Este resultado refleja la observación del jefe inmediato sobre conductas de liderazgo y gestión. Debe contrastarse con la autoevaluación, entrevista conductual, casos y 360° antes de emitir una conclusión integral.";
  }
  if (type === "leadership_interview") {
    return "Este resultado integra evidencia conductual reportada durante la entrevista. Su valor aumenta al contrastarlo con conductas observadas por terceros y resultados de otras herramientas.";
  }
  if (type === "leadership_cases") {
    return "Este resultado representa el criterio mostrado ante situaciones simuladas. Evalúa cómo estructura decisiones y respuestas, pero no sustituye la observación del comportamiento cotidiano.";
  }
  if (type.startsWith("leadership") || name.toLowerCase().includes("liderazgo")) {
    return "Este resultado corresponde principalmente a autopercepción. Es útil para conocer cómo la persona interpreta su propio liderazgo, pero no debe leerse de forma aislada ni como diagnóstico psicológico.";
  }
  return "La interpretación se limita a competencias y conductas laborales observadas en esta herramienta; no constituye un diagnóstico clínico.";
}

const developmentGuides: Array<{
  match: RegExp;
  target: string;
  action: string;
  indicator: string;
  risk: string;
}> = [
  {
    match: /liderazgo de personas/i,
    target: "Dirigir con expectativas claras, retroalimentación oportuna, delegación y seguimiento consistente.",
    action: "Implementar una rutina semanal de 1:1, delegar responsabilidades con resultado/fecha definidos y registrar acuerdos de retroalimentación.",
    indicator: "≥90% de compromisos con responsable y fecha; al menos 2 conversaciones de feedback documentadas al mes.",
    risk: "dependencia excesiva del líder, bajo desarrollo del equipo y problemas de desempeño atendidos tarde",
  },
  {
    match: /comunicaci[oó]n/i,
    target: "Comunicar acuerdos con claridad, confirmar entendimiento y sostener conversaciones difíciles de forma directa.",
    action: "Cerrar reuniones con acuerdos escritos, responsable y fecha; aplicar una estructura de conversación difícil basada en hechos, impacto, expectativa y acuerdo.",
    indicator: "≥90% de acuerdos críticos documentados y disminución de retrabajos por falta de claridad.",
    risk: "retrabajo, acuerdos ambiguos, conflictos evitables y pérdida de coordinación",
  },
  {
    match: /gesti[oó]n|ejecuci[oó]n/i,
    target: "Convertir prioridades en responsables, fechas, seguimiento y cierre verificable.",
    action: "Usar un tablero semanal de prioridades con máximo 5 compromisos críticos, responsable, fecha y estatus.",
    indicator: "≥85% de compromisos críticos cerrados en fecha durante 8 semanas consecutivas.",
    risk: "incumplimientos recurrentes, microgestión y dispersión de prioridades",
  },
  {
    match: /resultados/i,
    target: "Gestionar el área por resultados e indicadores, no solamente por actividad.",
    action: "Definir 3 KPI esenciales, revisar tendencia semanal y realizar análisis de causa cuando un indicador se desvíe.",
    indicator: "100% de KPI con meta, tendencia, responsable y acción correctiva cuando aplique.",
    risk: "gestión reactiva y dificultad para explicar o corregir desviaciones",
  },
  {
    match: /decisiones/i,
    target: "Tomar decisiones con criterio, velocidad y claridad sobre cuándo actuar, consultar o escalar.",
    action: "Llevar un registro breve de decisiones relevantes: datos disponibles, alternativas, riesgo, decisión y resultado.",
    indicator: "Reducción de decisiones postergadas y evidencia de criterios explícitos en decisiones críticas.",
    risk: "lentitud, escalamiento innecesario o decisiones sin valorar consecuencias",
  },
  {
    match: /colaboraci[oó]n|sist[eé]mico/i,
    target: "Resolver problemas considerando interdependencias y el impacto en otras áreas.",
    action: "Establecer acuerdos interáreas con entregable, responsable, SLA/fecha y revisión quincenal de fricciones.",
    indicator: "Disminución de incidencias interáreas repetitivas y ≥90% de acuerdos transversales cumplidos.",
    risk: "silos, transferencia de problemas y deterioro de relaciones interáreas",
  },
  {
    match: /cultura|ejemplo/i,
    target: "Mostrar congruencia entre lo que exige y lo que practica, interviniendo conductas que dañan la cultura.",
    action: "Definir 3 conductas no negociables del equipo y aplicar conversaciones correctivas consistentes ante desviaciones.",
    indicator: "Intervención documentada de desviaciones relevantes y reducción de reincidencias.",
    risk: "normalización de conductas inadecuadas, percepción de favoritismo y pérdida de credibilidad",
  },
  {
    match: /visi[oó]n de negocio/i,
    target: "Relacionar decisiones del área con cliente, ingresos, costos y prioridades del negocio.",
    action: "Incluir costo-beneficio e impacto al cliente en propuestas relevantes y revisar mensualmente un indicador financiero/comercial relacionado con el área.",
    indicator: "100% de propuestas relevantes con impacto de negocio explícito y al menos 1 mejora trimestral cuantificada.",
    risk: "optimización local del área sin mejorar el resultado global del negocio",
  },
  {
    match: /madurez/i,
    target: "Fortalecer autoconciencia, apertura a feedback, responsabilidad y capacidad para corregir decisiones.",
    action: "Solicitar feedback estructurado mensual a jefe y equipo; registrar un aprendizaje, conducta a cambiar y evidencia de aplicación.",
    indicator: "1 compromiso conductual mensual con evidencia observable y seguimiento 30/60/90.",
    risk: "resistencia al feedback, defensividad y repetición de patrones que limitan el liderazgo",
  },
];

function guideFor(name: string) {
  return (
    developmentGuides.find((guide) => guide.match.test(name)) ?? {
      target: "Mostrar una conducta más consistente, observable y verificable en esta competencia.",
      action:
        "Definir una conducta específica a practicar semanalmente, solicitar retroalimentación y registrar evidencia de aplicación.",
      indicator:
        "Evidencia semanal de aplicación y mejora observable en la revisión de 60 y 90 días.",
      risk:
        "inconsistencia entre intención y ejecución, con impacto en la efectividad del liderazgo",
    }
  );
}


function behavioralReadingFor(input: {
  dimensionName: string;
  score: number | null;
  high: { question: LeadershipQuestionInput; value: number } | null;
  low: { question: LeadershipQuestionInput; value: number } | null;
}) {
  const { dimensionName, score, high, low } = input;
  if (score === null) {
    return "No hay información cuantitativa suficiente para establecer una lectura conductual de esta dimensión.";
  }

  const guide = guideFor(dimensionName);

  if (!high || !low) {
    return `El resultado debe interpretarse como una referencia general de ${dimensionName}. Para convertirlo en un objetivo de desarrollo conviene contrastarlo con ejemplos observables y con otras fuentes del proceso.`;
  }

  if (high.value === low.value) {
    return `Las conductas calificadas dentro de ${dimensionName} presentan valoraciones equivalentes, por lo que no existe un contraste interno suficientemente claro para señalar una conducta más sólida y otra más débil. El siguiente paso es contrastar esta dimensión con evidencia cualitativa y otras fuentes. Como objetivo de desarrollo, conviene: ${guide.target}`;
  }

  const caution =
    score >= 3.8
      ? "La primera puede considerarse un recurso actual de la persona dentro de esta dimensión."
      : "La primera no debe interpretarse automáticamente como una fortaleza consolidada; únicamente es la conducta mejor valorada en términos relativos dentro de esta dimensión.";

  return `La lectura muestra un contraste entre “${shortPrompt(
    high.question.prompt,
    125,
  )}” y “${shortPrompt(
    low.question.prompt,
    125,
  )}”. ${caution} El desarrollo debe concentrarse en elevar la consistencia de la segunda conducta. En términos de gestión, el objetivo es: ${guide.target}`;
}

export function buildLeadershipAnalysis(input: {
  assessmentType: string;
  templateName: string;
  dimensions: LeadershipDimensionInput[];
  questions: LeadershipQuestionInput[];
  responses: LeadershipResponseInput[];
  results: LeadershipResultInput[];
}): LeadershipAnalysis {
  const responseByQuestion = new Map(
    input.responses.map((response) => [response.question_id, response]),
  );
  const resultByDimension = new Map(
    input.results.map((result) => [
      result.dimension_id,
      Number(result.score),
    ]),
  );

  const dimensions = input.dimensions
    .map((dimension) => {
      const dimensionQuestions = input.questions.filter(
        (question) => question.dimension_id === dimension.id,
      );
      const scored = dimensionQuestions
        .filter((question) => question.question_type === "scale")
        .map((question) => {
          const response = responseByQuestion.get(question.id);
          const value =
            response?.numeric_value === null ||
            response?.numeric_value === undefined ||
            response?.is_not_observed
              ? null
              : Number(response.numeric_value);
          return { question, value };
        })
        .filter(
          (item): item is { question: LeadershipQuestionInput; value: number } =>
            item.value !== null && Number.isFinite(item.value),
        );

      const calculated =
        scored.length > 0
          ? scored.reduce((sum, item) => sum + item.value, 0) / scored.length
          : null;
      const stored = resultByDimension.get(dimension.id);
      const score =
        stored !== undefined && Number.isFinite(stored) ? stored : calculated;
      const band = scoreBand(score);

      const orderedLow = [...scored].sort((a, b) => a.value - b.value);
      const orderedHigh = [...scored].sort((a, b) => b.value - a.value);
      const low = orderedLow[0] ?? null;
      const high = orderedHigh[0] ?? null;

      const qualitativeEvidence = dimensionQuestions
        .filter((question) => question.question_type === "text")
        .map((question) => responseByQuestion.get(question.id)?.text_value?.trim())
        .filter((value): value is string => Boolean(value))
        .slice(0, 3);

      let narrative = score === null
        ? "No hay información cuantitativa suficiente para interpretar esta dimensión."
        : `El resultado de ${score.toFixed(2)}/5 ubica esta dimensión en “${band.level.toLowerCase()}”.`;

      const hasInternalContrast =
        high && low && high.value !== low.value;

      if (hasInternalContrast && score !== null) {
        narrative += ` Dentro de esta dimensión existe una diferencia observable entre conductas, útil para priorizar el desarrollo sin confundir el reactivo mejor puntuado con una fortaleza absoluta.`;
      } else if (score !== null && high && low) {
        narrative +=
          " Las conductas de esta dimensión muestran puntuaciones equivalentes, por lo que no existe un contraste interno claro.";
      }

      if (qualitativeEvidence.length > 0) {
        narrative +=
          " Las respuestas abiertas aportan evidencia cualitativa adicional que conviene contrastar con hechos observables y otras fuentes.";
      }

      return {
        id: dimension.id,
        name: dimension.name,
        order: dimension.sort_order,
        score,
        level: band.level,
        tone: band.tone,
        narrative,
        behavioralReading: behavioralReadingFor({
          dimensionName: dimension.name,
          score,
          high,
          low,
        }),
        strongestItem:
          high && low && high.value !== low.value ? high.question.prompt : null,
        developmentItem:
          high && low && high.value !== low.value ? low.question.prompt : null,
        qualitativeEvidence,
      } satisfies DimensionAnalysis;
    })
    .sort((a, b) => a.order - b.order);

  const scoredDimensions = dimensions.filter(
    (dimension): dimension is DimensionAnalysis & { score: number } =>
      dimension.score !== null,
  );

  const overall =
    scoredDimensions.length > 0
      ? scoredDimensions.reduce((sum, dimension) => sum + dimension.score, 0) /
        scoredDimensions.length
      : null;

  const overallBand = scoreBand(overall);
  const sortedHigh = [...scoredDimensions].sort((a, b) => b.score - a.score);
  const sortedLow = [...scoredDimensions].sort((a, b) => a.score - b.score);
  const strengths = sortedHigh.slice(0, Math.min(3, sortedHigh.length));
  const priorities = sortedLow.slice(0, Math.min(3, sortedLow.length));

  const dispersion =
    scoredDimensions.length > 1
      ? Math.max(...scoredDimensions.map((item) => item.score)) -
        Math.min(...scoredDimensions.map((item) => item.score))
      : 0;

  let executiveSummary =
    overall === null
      ? "Aún no existe información suficiente para construir una lectura integral de esta prueba."
      : `El perfil global se ubica en ${overall.toFixed(
          2,
        )}/5, correspondiente a “${overallBand.level.toLowerCase()}”.`;

  if (strengths.length > 0) {
    executiveSummary += ` Las competencias relativamente más sólidas son ${strengths
      .map((item) => item.name)
      .join(", ")}.`;
  }
  if (priorities.length > 0) {
    executiveSummary += ` Las prioridades de desarrollo se concentran en ${priorities
      .map((item) => item.name)
      .join(", ")}.`;
  }
  if (dispersion >= 1.25) {
    executiveSummary +=
      " El perfil muestra una dispersión relevante entre dimensiones, por lo que conviene trabajar sobre las brechas específicas y no interpretar el promedio global como un desempeño homogéneo.";
  } else if (scoredDimensions.length > 1) {
    executiveSummary +=
      " El perfil es relativamente consistente entre dimensiones; las diferencias existentes son útiles para priorizar desarrollo, pero no sugieren contrastes extremos dentro de esta herramienta.";
  }

  const risks = priorities
    .filter((item) => item.score < 3.5)
    .map((item) => {
      const guide = guideFor(item.name);
      return `${item.name}: si la brecha se mantiene, puede traducirse en ${guide.risk}.`;
    });

  const plan = priorities.slice(0, 3).map((item) => {
    const guide = guideFor(item.name);
    const currentFinding = item.developmentItem
      ? `La evidencia cuantitativa identifica como foco conductual: “${shortPrompt(
          item.developmentItem,
          145,
        )}”.`
      : `La dimensión presenta un resultado de ${item.score.toFixed(
          2,
        )}/5 y requiere mayor consistencia observable.`;

    return {
      competency: item.name,
      currentFinding,
      targetBehavior: guide.target,
      action: guide.action,
      indicator: guide.indicator,
      day30:
        "Definir conducta objetivo, línea base y rutina de práctica; revisar primeras evidencias con jefe/RH.",
      day60:
        "Validar frecuencia y calidad de la nueva conducta con evidencia observable; ajustar obstáculos y compromisos.",
      day90:
        "Comparar contra línea base, documentar mejora y decidir si la competencia pasa a mantenimiento o requiere un nuevo ciclo.",
    };
  });

  const openResponses = input.questions
    .filter((question) => question.question_type === "text")
    .map((question) => ({
      prompt: question.prompt,
      answer: responseByQuestion.get(question.id)?.text_value?.trim() ?? "",
    }))
    .filter((item) => item.answer.length > 0);

  return {
    overall,
    overallLevel: overallBand.level,
    executiveSummary,
    perspectiveNote: perspectiveFor(
      input.assessmentType,
      input.templateName,
    ),
    dimensions,
    strengths,
    priorities,
    risks,
    plan,
    openResponses,
  };
}
