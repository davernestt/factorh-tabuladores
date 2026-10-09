export type IntegralInstrument = {
  assessmentType: string;
  name: string;
  dimensions: Array<{ name: string; value: number }>;
  overall?: number | null;
};

export type IntegralAnalysis = {
  headline: string;
  executiveSummary: string[];
  sections: Array<{
    title: string;
    summary: string;
    highlights: string[];
    watchouts: string[];
  }>;
  convergences: string[];
  tensions: string[];
  interviewQuestions: string[];
  closing: string;
};

function dimension(
  instrument: IntegralInstrument | undefined,
  name: string,
) {
  return instrument?.dimensions.find((item) => item.name === name)?.value ?? null;
}

function top(
  instrument: IntegralInstrument | undefined,
  count = 2,
) {
  return [...(instrument?.dimensions ?? [])]
    .sort((a, b) => b.value - a.value)
    .slice(0, count);
}

function lower(
  instrument: IntegralInstrument | undefined,
  count = 2,
) {
  return [...(instrument?.dimensions ?? [])]
    .sort((a, b) => a.value - b.value)
    .slice(0, count);
}

function names(items: Array<{ name: string }>) {
  return items.map((item) => item.name).join(" y ");
}

function avg(items: Array<{ value: number }>) {
  if (!items.length) return null;
  return items.reduce((sum, item) => sum + item.value, 0) / items.length;
}

function high(value: number | null) {
  return value !== null && value >= 70;
}

function low(value: number | null) {
  return value !== null && value <= 40;
}

export function analyzeIntegralPsychometrics(
  instruments: IntegralInstrument[],
): IntegralAnalysis {
  const byType = new Map(
    instruments.map((item) => [item.assessmentType, item]),
  );

  const vector = byType.get("psychometric_vector");
  const needs = byType.get("psychometric_needs");
  const reasoning = byType.get("psychometric_reasoning");
  const social = byType.get("psychometric_social_leadership");
  const values = byType.get("psychometric_values");
  const integrity = byType.get("psychometric_integrity");
  const bigfive = byType.get("psychometric_bigfive");
  const sales = byType.get("psychometric_sales");
  const attention = byType.get("psychometric_attention");

  const sections: IntegralAnalysis["sections"] = [];
  const convergences: string[] = [];
  const tensions: string[] = [];
  const interviewQuestions: string[] = [];

  if (vector) {
    sections.push({
      title: "Estilo conductual",
      summary:
        "El patrón conductual muestra mayor intensidad relativa en " +
        names(top(vector)) +
        ". Las dimensiones menos marcadas son " +
        names(lower(vector)) +
        ". La combinación orienta sobre ejecución, relación, ritmo y estructura.",
      highlights: top(vector).map(
        (item) => item.name + ": " + Math.round(item.value),
      ),
      watchouts: lower(vector).map(
        (item) => item.name + ": " + Math.round(item.value),
      ),
    });
  }

  if (needs || values) {
    const strongest = [...top(needs, 3), ...top(values, 2)].slice(0, 5);
    sections.push({
      title: "Motivadores y valores laborales",
      summary:
        "Las condiciones que aparecen con mayor fuerza se concentran en " +
        strongest
          .slice(0, 4)
          .map((item) => item.name)
          .join(", ") +
        ". Esto ayuda a anticipar qué elementos del puesto, liderazgo y cultura pueden sostener el compromiso.",
      highlights: strongest.map(
        (item) => item.name + ": " + Math.round(item.value),
      ),
      watchouts: [...lower(needs, 2), ...lower(values, 2)]
        .slice(0, 4)
        .map(
          (item) =>
            item.name +
            ": menor prioridad relativa (" +
            Math.round(item.value) +
            ")",
        ),
    });
  }

  if (reasoning || attention) {
    const reasoningOverall =
      reasoning?.overall ?? avg(reasoning?.dimensions ?? []);
    const attentionOverall =
      attention?.overall ?? avg(attention?.dimensions ?? []);
    const phrases: string[] = [];
    if (reasoning) {
      phrases.push(
        "razonamiento global cercano a " +
          Math.round(reasoningOverall ?? 0) +
          "%",
      );
    }
    if (attention) {
      phrases.push(
        "exactitud global cercana a " +
          Math.round(attentionOverall ?? 0) +
          "%",
      );
    }

    sections.push({
      title: "Recursos cognitivos y de precisión",
      summary:
        "En las pruebas de desempeño se observa " +
        phrases.join(" y ") +
        ". Resulta especialmente útil revisar en qué tipos de problema muestra mayor consistencia y dónde conviene profundizar con ejercicios del puesto.",
      highlights: [
        ...top(reasoning, 2).map(
          (item) =>
            "Razonamiento · " +
            item.name +
            ": " +
            Math.round(item.value) +
            "%",
        ),
        ...top(attention, 2).map(
          (item) =>
            "Atención · " +
            item.name +
            ": " +
            Math.round(item.value) +
            "%",
        ),
      ],
      watchouts: [
        ...lower(reasoning, 2).map(
          (item) =>
            "Razonamiento · " +
            item.name +
            ": " +
            Math.round(item.value) +
            "%",
        ),
        ...lower(attention, 2).map(
          (item) =>
            "Atención · " +
            item.name +
            ": " +
            Math.round(item.value) +
            "%",
        ),
      ],
    });
  }

  if (social || bigfive) {
    const strongest = [...top(social, 2), ...top(bigfive, 2)].slice(0, 4);
    sections.push({
      title: "Interacción, liderazgo y personalidad laboral",
      summary:
        "La lectura conjunta permite observar cómo podría relacionarse, influir, organizarse y responder ante presión. Destacan " +
        strongest.map((item) => item.name).join(", ") +
        ".",
      highlights: strongest.map(
        (item) => item.name + ": " + Math.round(item.value),
      ),
      watchouts: [...lower(social, 2), ...lower(bigfive, 2)].map(
        (item) => item.name + ": " + Math.round(item.value),
      ),
    });
  }

  if (integrity) {
    sections.push({
      title: "Criterio e integridad laboral",
      summary:
        "El instrumento aporta hipótesis sobre responsabilidad, apego a normas, transparencia, uso de recursos, manejo de errores y criterio ético. Conviene profundizar mediante ejemplos conductuales y escenarios de entrevista.",
      highlights: top(integrity, 3).map(
        (item) => item.name + ": " + Math.round(item.value),
      ),
      watchouts: lower(integrity, 2).map(
        (item) =>
          item.name +
          ": revisar con ejemplos concretos (" +
          Math.round(item.value) +
          ")",
      ),
    });
  }

  if (sales) {
    sections.push({
      title: "Potencial comercial",
      summary:
        "En el perfil comercial sobresalen " +
        names(top(sales, 2)) +
        ". Las áreas de menor intensidad relativa son " +
        names(lower(sales, 2)) +
        "; conviene contrastarlas con resultados reales, tipo de venta y ciclo comercial.",
      highlights: top(sales, 3).map(
        (item) => item.name + ": " + Math.round(item.value),
      ),
      watchouts: lower(sales, 2).map(
        (item) => item.name + ": " + Math.round(item.value),
      ),
    });
  }

  const impulse = dimension(vector, "Impulso");
  const structure = dimension(vector, "Estructura");
  const extraversion = dimension(bigfive, "Extraversión");
  const responsibility = dimension(bigfive, "Responsabilidad");
  const cooperation = dimension(bigfive, "Cooperación");
  const socialInfluence = dimension(social, "Influencia");
  const salesPersuasion = dimension(sales, "Persuasión");
  const achievementNeed = dimension(needs, "Logro");
  const achievementValue = dimension(values, "Logro");
  const learningNeed = dimension(needs, "Aprendizaje");
  const learningValue = dimension(values, "Aprendizaje");

  if (high(impulse) && high(achievementNeed) && high(achievementValue)) {
    convergences.push(
      "Existe convergencia entre iniciativa conductual y orientación al logro: varias pruebas apuntan a preferencia por metas, avance visible y movimiento hacia resultados.",
    );
  }

  if (high(extraversion) && high(socialInfluence) && high(salesPersuasion)) {
    convergences.push(
      "Aparece convergencia en interacción e influencia: la persona reporta facilidad para participar, persuadir y movilizar acuerdos.",
    );
  }

  if (high(structure) && high(responsibility)) {
    convergences.push(
      "Estructura y responsabilidad se refuerzan entre sí, sugiriendo preferencia por orden, seguimiento y criterios claros de ejecución.",
    );
  }

  if (high(learningNeed) && high(learningValue)) {
    convergences.push(
      "Aprendizaje aparece tanto como necesidad motivacional como valor, por lo que el desarrollo y la exposición a retos nuevos pueden ser relevantes para compromiso y permanencia.",
    );
  }

  if (high(cooperation) && high(dimension(values, "Colaboración"))) {
    convergences.push(
      "La cooperación aparece respaldada por personalidad y valores, sugiriendo una preferencia consistente por coordinación, confianza y trabajo conjunto.",
    );
  }

  if (high(impulse) && high(structure)) {
    tensions.push(
      "Impulso y Estructura aparecen elevados: puede buscar velocidad y control al mismo tiempo. Bajo presión conviene observar si esta combinación se convierte en exigencia, rigidez o dificultad para delegar.",
    );
  }

  if (high(dimension(needs, "Autonomía")) && high(dimension(needs, "Estructura"))) {
    tensions.push(
      "Necesita autonomía, pero también claridad y estructura. Probablemente funcione mejor con objetivos y límites claros, dejando libertad sobre el método de ejecución.",
    );
  }

  if (low(dimension(bigfive, "Estabilidad emocional")) && high(impulse)) {
    tensions.push(
      "La combinación de iniciativa alta con menor estabilidad emocional relativa sugiere revisar cómo cambia la velocidad de decisión cuando aumenta la presión.",
    );
  }

  if (
    high(dimension(sales, "Iniciativa comercial")) &&
    low(dimension(sales, "Disciplina comercial"))
  ) {
    tensions.push(
      "Puede existir energía para abrir oportunidades sin el mismo nivel de disciplina de seguimiento. Conviene revisar hábitos de CRM, agenda y cierre de compromisos.",
    );
  }

  const lowest = instruments
    .flatMap((instrument) =>
      instrument.dimensions.map((item) => ({
        instrument: instrument.name,
        ...item,
      })),
    )
    .sort((a, b) => a.value - b.value)
    .slice(0, 4);

  for (const item of lowest) {
    interviewQuestions.push(
      "Explorar " +
        item.name.toLowerCase() +
        " (" +
        item.instrument +
        "): pedir un ejemplo reciente donde esta capacidad o preferencia haya sido relevante y profundizar en qué hizo, qué resultado obtuvo y qué aprendió.",
    );
  }

  if (!interviewQuestions.length) {
    interviewQuestions.push(
      "Pedir ejemplos conductuales recientes que confirmen las principales fortalezas y áreas de atención observadas en el perfil.",
    );
  }

  return {
    headline:
      instruments.length > 1
        ? "Síntesis psicométrica integral"
        : "Síntesis ejecutiva del perfil",
    executiveSummary: [
      "El reporte integra " +
        instruments.length +
        " " +
        (instruments.length === 1
          ? "instrumento psicométrico"
          : "instrumentos psicométricos") +
        " dentro del mismo proceso. La lectura busca identificar patrones consistentes, contrastes y preguntas útiles para una decisión de selección o desarrollo.",
      convergences.length
        ? "Los hallazgos más útiles son aquellos que aparecen de forma consistente en más de un instrumento, porque permiten construir hipótesis más robustas para entrevista y seguimiento."
        : "Con la información disponible conviene concentrarse en el patrón interno de cada instrumento y validar los hallazgos mediante entrevista y evidencia laboral.",
      "No se genera una calificación única de la persona porque conducta, motivación, razonamiento, personalidad e integridad son constructos distintos. El valor está en su combinación y en el ajuste con el puesto.",
    ],
    sections,
    convergences,
    tensions,
    interviewQuestions,
    closing:
      "La decisión final debe considerar la combinación entre perfil, experiencia, entrevista, referencias, resultados previos y requisitos críticos del puesto.",
  };
}
