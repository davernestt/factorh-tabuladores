
export type JobProfileCompetency = {
  competency_key: string;
  competency_name: string;
  reference_min: number | string;
  reference_max: number | string;
  importance: "critical" | "high" | "medium" | string;
  sort_order: number;
};

export type JobProfileInstrument = {
  assessmentType: string;
  name: string;
  dimensions: Array<{ name: string; value: number }>;
  overall?: number | null;
};

export type JobProfileEvidence = {
  assessmentType: string;
  dimension: string;
  weight: number;
};

export type JobProfileAlignmentRow = {
  key: string;
  name: string;
  importance: string;
  referenceMin: number;
  referenceMax: number;
  observed: number | null;
  status:
    | "Dentro del rango de referencia"
    | "Por debajo del rango de referencia"
    | "Por encima del rango de referencia"
    | "Sin evidencia suficiente";
  evidence: Array<{
    instrument: string;
    dimension: string;
    value: number;
    weight: number;
  }>;
};

export type JobProfileAlignment = {
  rows: JobProfileAlignmentRow[];
  withinRange: number;
  belowRange: number;
  aboveRange: number;
  missingEvidence: number;
  criticalToValidate: JobProfileAlignmentRow[];
  strongestMatches: JobProfileAlignmentRow[];
  objectiveText: string;
  snapshot: string[];
};

const mappings: Record<string, JobProfileEvidence[]> = {
  analysis_problem_solving: [
    { assessmentType: "psychometric_reasoning", dimension: "__overall__", weight: 1.4 },
    { assessmentType: "psychometric_reasoning", dimension: "Lógica y relaciones", weight: 1.1 },
    { assessmentType: "psychometric_reasoning", dimension: "Análisis aplicado", weight: 1.3 },
    { assessmentType: "psychometric_bigfive", dimension: "Apertura al aprendizaje", weight: 0.5 },
  ],
  learning_agility: [
    { assessmentType: "psychometric_reasoning", dimension: "__overall__", weight: 0.9 },
    { assessmentType: "psychometric_bigfive", dimension: "Apertura al aprendizaje", weight: 1.2 },
    { assessmentType: "psychometric_needs", dimension: "Aprendizaje", weight: 0.8 },
    { assessmentType: "psychometric_values", dimension: "Aprendizaje", weight: 0.8 },
  ],
  detail_quality: [
    { assessmentType: "psychometric_attention", dimension: "__overall__", weight: 1.4 },
    { assessmentType: "psychometric_attention", dimension: "Verificación", weight: 1.2 },
    { assessmentType: "psychometric_attention", dimension: "Control de errores", weight: 1.2 },
    { assessmentType: "psychometric_vector", dimension: "Estructura", weight: 0.8 },
    { assessmentType: "psychometric_bigfive", dimension: "Responsabilidad", weight: 0.7 },
  ],
  results_orientation: [
    { assessmentType: "psychometric_vector", dimension: "Impulso", weight: 1.0 },
    { assessmentType: "psychometric_needs", dimension: "Logro", weight: 0.9 },
    { assessmentType: "psychometric_values", dimension: "Logro", weight: 0.9 },
    { assessmentType: "psychometric_bigfive", dimension: "Responsabilidad", weight: 0.8 },
  ],
  planning_organization: [
    { assessmentType: "psychometric_vector", dimension: "Estructura", weight: 1.0 },
    { assessmentType: "psychometric_bigfive", dimension: "Responsabilidad", weight: 1.0 },
    { assessmentType: "psychometric_attention", dimension: "Seguimiento de reglas", weight: 0.8 },
    { assessmentType: "psychometric_attention", dimension: "Verificación", weight: 0.7 },
  ],
  leadership_people: [
    { assessmentType: "psychometric_social_leadership", dimension: "Supervisión y delegación", weight: 1.3 },
    { assessmentType: "psychometric_social_leadership", dimension: "Influencia", weight: 1.0 },
    { assessmentType: "psychometric_social_leadership", dimension: "Manejo de conflicto", weight: 1.0 },
    { assessmentType: "psychometric_bigfive", dimension: "Cooperación", weight: 0.6 },
    { assessmentType: "psychometric_vector", dimension: "Vinculación", weight: 0.5 },
  ],
  communication_influence: [
    { assessmentType: "psychometric_social_leadership", dimension: "Tacto y comunicación", weight: 1.2 },
    { assessmentType: "psychometric_social_leadership", dimension: "Influencia", weight: 1.1 },
    { assessmentType: "psychometric_vector", dimension: "Vinculación", weight: 0.9 },
    { assessmentType: "psychometric_bigfive", dimension: "Extraversión", weight: 0.6 },
    { assessmentType: "psychometric_sales", dimension: "Persuasión", weight: 0.8 },
  ],
  pressure_management: [
    { assessmentType: "psychometric_bigfive", dimension: "Estabilidad emocional", weight: 1.3 },
    { assessmentType: "psychometric_social_leadership", dimension: "Manejo de conflicto", weight: 0.8 },
    { assessmentType: "psychometric_vector", dimension: "Constancia", weight: 0.6 },
    { assessmentType: "psychometric_sales", dimension: "Tolerancia al rechazo", weight: 0.7 },
  ],
  adaptability_change: [
    { assessmentType: "psychometric_bigfive", dimension: "Apertura al aprendizaje", weight: 1.2 },
    { assessmentType: "psychometric_needs", dimension: "Variedad", weight: 0.7 },
    { assessmentType: "psychometric_vector", dimension: "Impulso", weight: 0.5 },
    { assessmentType: "psychometric_social_leadership", dimension: "Juicio interpersonal", weight: 0.5 },
  ],
  teamwork: [
    { assessmentType: "psychometric_bigfive", dimension: "Cooperación", weight: 1.2 },
    { assessmentType: "psychometric_values", dimension: "Colaboración", weight: 1.0 },
    { assessmentType: "psychometric_social_leadership", dimension: "Juicio interpersonal", weight: 0.8 },
    { assessmentType: "psychometric_needs", dimension: "Afiliación", weight: 0.5 },
  ],
  autonomy: [
    { assessmentType: "psychometric_needs", dimension: "Autonomía", weight: 1.2 },
    { assessmentType: "psychometric_vector", dimension: "Impulso", weight: 0.7 },
    { assessmentType: "psychometric_bigfive", dimension: "Responsabilidad", weight: 0.5 },
  ],
  integrity_judgment: [
    { assessmentType: "psychometric_integrity", dimension: "Criterio ético", weight: 1.2 },
    { assessmentType: "psychometric_integrity", dimension: "Transparencia", weight: 1.1 },
    { assessmentType: "psychometric_integrity", dimension: "Responsabilidad", weight: 1.1 },
    { assessmentType: "psychometric_integrity", dimension: "Apego a normas", weight: 1.0 },
    { assessmentType: "psychometric_integrity", dimension: "Manejo de errores", weight: 0.9 },
  ],
  customer_orientation: [
    { assessmentType: "psychometric_sales", dimension: "Orientación al cliente", weight: 1.3 },
    { assessmentType: "psychometric_values", dimension: "Servicio", weight: 0.8 },
    { assessmentType: "psychometric_needs", dimension: "Servicio", weight: 0.8 },
    { assessmentType: "psychometric_bigfive", dimension: "Cooperación", weight: 0.5 },
  ],
  commercial_initiative: [
    { assessmentType: "psychometric_sales", dimension: "Iniciativa comercial", weight: 1.4 },
    { assessmentType: "psychometric_vector", dimension: "Impulso", weight: 0.8 },
    { assessmentType: "psychometric_needs", dimension: "Logro", weight: 0.6 },
  ],
  negotiation_persuasion: [
    { assessmentType: "psychometric_sales", dimension: "Persuasión", weight: 1.4 },
    { assessmentType: "psychometric_social_leadership", dimension: "Influencia", weight: 1.0 },
    { assessmentType: "psychometric_vector", dimension: "Vinculación", weight: 0.6 },
  ],
  commercial_discipline: [
    { assessmentType: "psychometric_sales", dimension: "Disciplina comercial", weight: 1.4 },
    { assessmentType: "psychometric_bigfive", dimension: "Responsabilidad", weight: 0.9 },
    { assessmentType: "psychometric_vector", dimension: "Estructura", weight: 0.8 },
  ],
  frustration_tolerance: [
    { assessmentType: "psychometric_sales", dimension: "Tolerancia al rechazo", weight: 1.4 },
    { assessmentType: "psychometric_bigfive", dimension: "Estabilidad emocional", weight: 1.0 },
    { assessmentType: "psychometric_vector", dimension: "Constancia", weight: 0.6 },
  ],
  rules_processes: [
    { assessmentType: "psychometric_integrity", dimension: "Apego a normas", weight: 1.2 },
    { assessmentType: "psychometric_vector", dimension: "Estructura", weight: 1.0 },
    { assessmentType: "psychometric_bigfive", dimension: "Responsabilidad", weight: 0.8 },
    { assessmentType: "psychometric_attention", dimension: "Seguimiento de reglas", weight: 0.8 },
  ],
  execution_pace: [
    { assessmentType: "psychometric_vector", dimension: "Impulso", weight: 1.1 },
    { assessmentType: "psychometric_attention", dimension: "__overall__", weight: 0.5 },
    { assessmentType: "psychometric_bigfive", dimension: "Responsabilidad", weight: 0.5 },
  ],
  stability_followthrough: [
    { assessmentType: "psychometric_vector", dimension: "Constancia", weight: 1.1 },
    { assessmentType: "psychometric_bigfive", dimension: "Responsabilidad", weight: 0.9 },
    { assessmentType: "psychometric_sales", dimension: "Disciplina comercial", weight: 0.5 },
  ],
  service_orientation: [
    { assessmentType: "psychometric_values", dimension: "Servicio", weight: 1.0 },
    { assessmentType: "psychometric_needs", dimension: "Servicio", weight: 1.0 },
    { assessmentType: "psychometric_bigfive", dimension: "Cooperación", weight: 0.7 },
    { assessmentType: "psychometric_sales", dimension: "Orientación al cliente", weight: 0.7 },
  ],
  innovation_learning: [
    { assessmentType: "psychometric_bigfive", dimension: "Apertura al aprendizaje", weight: 1.2 },
    { assessmentType: "psychometric_needs", dimension: "Aprendizaje", weight: 0.8 },
    { assessmentType: "psychometric_values", dimension: "Aprendizaje", weight: 0.8 },
    { assessmentType: "psychometric_reasoning", dimension: "__overall__", weight: 0.5 },
  ],
  decision_making: [
    { assessmentType: "psychometric_reasoning", dimension: "Análisis aplicado", weight: 1.1 },
    { assessmentType: "psychometric_reasoning", dimension: "Lógica y relaciones", weight: 0.9 },
    { assessmentType: "psychometric_vector", dimension: "Impulso", weight: 0.8 },
    { assessmentType: "psychometric_social_leadership", dimension: "Juicio interpersonal", weight: 0.7 },
    { assessmentType: "psychometric_integrity", dimension: "Criterio ético", weight: 0.7 },
  ],
};

function instrumentValue(
  instruments: JobProfileInstrument[],
  evidence: JobProfileEvidence,
) {
  const instrument = instruments.find(
    (item) => item.assessmentType === evidence.assessmentType,
  );
  if (!instrument) return null;

  if (evidence.dimension === "__overall__") {
    return instrument.overall ?? null;
  }

  return (
    instrument.dimensions.find((item) => item.name === evidence.dimension)
      ?.value ?? null
  );
}

export function analyzeJobProfileAlignment(
  profileName: string,
  targetJobTitle: string | null,
  purpose: string | null,
  competencies: JobProfileCompetency[],
  instruments: JobProfileInstrument[],
): JobProfileAlignment {
  const rows: JobProfileAlignmentRow[] = competencies
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
    .map((competency) => {
      const evidenceRules = mappings[competency.competency_key] ?? [];
      const evidence = evidenceRules
        .map((rule) => {
          const value = instrumentValue(instruments, rule);
          if (value === null || !Number.isFinite(value)) return null;
          const instrument = instruments.find(
            (item) => item.assessmentType === rule.assessmentType,
          );
          return {
            instrument: instrument?.name ?? rule.assessmentType,
            dimension: rule.dimension === "__overall__" ? "Resultado global" : rule.dimension,
            value,
            weight: rule.weight,
          };
        })
        .filter(
          (
            item,
          ): item is {
            instrument: string;
            dimension: string;
            value: number;
            weight: number;
          } => Boolean(item),
        );

      const totalWeight = evidence.reduce((sum, item) => sum + item.weight, 0);
      const observed =
        totalWeight > 0
          ? evidence.reduce((sum, item) => sum + item.value * item.weight, 0) /
            totalWeight
          : null;

      const referenceMin = Number(competency.reference_min);
      const referenceMax = Number(competency.reference_max);
      let status: JobProfileAlignmentRow["status"] =
        "Sin evidencia suficiente";

      if (observed !== null) {
        if (observed < referenceMin) status = "Por debajo del rango de referencia";
        else if (observed > referenceMax)
          status = "Por encima del rango de referencia";
        else status = "Dentro del rango de referencia";
      }

      return {
        key: competency.competency_key,
        name: competency.competency_name,
        importance: competency.importance,
        referenceMin,
        referenceMax,
        observed,
        status,
        evidence,
      };
    });

  const within = rows.filter(
    (item) => item.status === "Dentro del rango de referencia",
  );
  const below = rows.filter(
    (item) => item.status === "Por debajo del rango de referencia",
  );
  const above = rows.filter(
    (item) => item.status === "Por encima del rango de referencia",
  );
  const missing = rows.filter(
    (item) => item.status === "Sin evidencia suficiente",
  );

  const criticalToValidate = rows.filter(
    (item) =>
      item.importance === "critical" &&
      item.status !== "Dentro del rango de referencia",
  );

  const strongestMatches = within
    .filter((item) => item.observed !== null)
    .sort((a, b) => {
      const aCenter = (a.referenceMin + a.referenceMax) / 2;
      const bCenter = (b.referenceMin + b.referenceMax) / 2;
      return (
        Math.abs((a.observed ?? 0) - aCenter) -
        Math.abs((b.observed ?? 0) - bCenter)
      );
    })
    .slice(0, 3);

  const purposeLabel: Record<string, string> = {
    selection: "selección",
    promotion: "promoción",
    development: "desarrollo",
    profile: "conocimiento de perfil",
  };
  const role = targetJobTitle?.trim() || profileName;
  const objectiveText =
    "Analizar el perfil psicométrico de la persona en relación con los requerimientos definidos para " +
    role +
    ", utilizando el perfil base " +
    profileName +
    " como marco de referencia para " +
    (purposeLabel[purpose ?? ""] ?? "apoyo a la toma de decisiones") +
    ". La comparación es descriptiva y no constituye una recomendación automática de contratación, promoción o descarte.";

  const snapshot = [
    within.length
      ? within.length +
        " de " +
        rows.length +
        " competencias cuentan con evidencia dentro del rango de referencia definido."
      : "No hay competencias con evidencia suficiente dentro del rango de referencia definido.",
    below.length || above.length
      ? "Se identifican " +
        (below.length + above.length) +
        " competencias fuera del rango de referencia que conviene profundizar con entrevista y evidencia laboral."
      : "No se observan desviaciones relevantes en las competencias con evidencia disponible.",
    missing.length
      ? missing.length +
        " competencias no cuentan con evidencia suficiente porque la batería aplicada no cubre todos sus indicadores."
      : "La batería aplicada aporta evidencia para todas las competencias del perfil objetivo.",
  ];

  return {
    rows,
    withinRange: within.length,
    belowRange: below.length,
    aboveRange: above.length,
    missingEvidence: missing.length,
    criticalToValidate,
    strongestMatches,
    objectiveText,
    snapshot,
  };
}
