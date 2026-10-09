export type ProfileDimensionInput = {
  name: string;
  score: number;
};

type DimensionDefinition = {
  high: string;
  low: string;
  highPotential: string;
  lowPotential: string;
  highWatchout: string;
  lowWatchout: string;
};

export type ScaleProfileConfig = {
  assessmentType: string;
  title: string;
  subtitle: string;
  highSection: string;
  lowSection: string;
  note: string;
  dimensions: Record<string, DimensionDefinition>;
};

export type ScaleDimensionReading = {
  name: string;
  score: number;
  index: number;
  band: string;
  meaning: string;
  potential: string;
  watchout: string;
};

export type ScaleProfileAnalysis = {
  config: ScaleProfileConfig;
  dimensions: ScaleDimensionReading[];
  top: ScaleDimensionReading[];
  lower: ScaleDimensionReading[];
  executiveSummary: string[];
  interviewPrompts: string[];
};

function def(
  high: string,
  low: string,
  highPotential: string,
  lowPotential: string,
  highWatchout: string,
  lowWatchout: string,
): DimensionDefinition {
  return { high, low, highPotential, lowPotential, highWatchout, lowWatchout };
}

const configs: Record<string, ScaleProfileConfig> = {
  psychometric_social_leadership: {
    assessmentType: "psychometric_social_leadership",
    title: "Adaptabilidad Social y Liderazgo",
    subtitle: "Tendencias interpersonales relevantes para coordinación, supervisión y manejo de personas.",
    highSection: "Recursos interpersonales relativamente más sólidos",
    lowSection: "Áreas a profundizar",
    note:
      "Este instrumento describe tendencias de autopercepción social y de liderazgo. No demuestra por sí solo competencia real para dirigir personas; debe contrastarse con entrevista conductual, referencias y evidencia de desempeño.",
    dimensions: {
      "Juicio interpersonal": def(
        "Tiende a considerar contexto, perspectivas y consecuencias antes de interpretar la conducta de otros.",
        "Puede interpretar situaciones sociales de manera más directa y requerir mayor evidencia antes de atribuir intenciones.",
        "Lectura de contexto y mejor anticipación del impacto interpersonal.",
        "Claridad y menor tendencia a sobreinterpretar señales sociales.",
        "Puede sobreanalizar dinámicas o dedicar demasiado tiempo a interpretar señales ambiguas.",
        "Puede pasar por alto señales sutiles, tensiones o efectos interpersonales de una decisión.",
      ),
      "Tacto y comunicación": def(
        "Tiende a expresar desacuerdos y retroalimentación con claridad y consideración.",
        "Puede preferir mensajes muy directos o evitar conversaciones difíciles cuando anticipa tensión.",
        "Mayor capacidad para sostener conversaciones difíciles sin deteriorar innecesariamente la relación.",
        "Comunicación franca y menor inversión de energía en matices sociales.",
        "Puede suavizar demasiado mensajes que requieren definición rápida.",
        "Conviene observar tono, escucha y manejo de retroalimentación bajo presión.",
      ),
      Influencia: def(
        "Tiende a adaptar argumentos y movilizar acuerdos incluso sin autoridad formal.",
        "Puede sentirse más cómodo aportando desde la ejecución que intentando persuadir activamente a otros.",
        "Negociación, alineación y capacidad para generar adhesión.",
        "Menor necesidad de protagonismo y posible objetividad frente a dinámicas políticas.",
        "Puede invertir energía excesiva en persuadir o sobredimensionar su capacidad de influencia.",
        "Puede hacer poco visibles sus ideas o depender demasiado de la jerarquía para movilizar acuerdos.",
      ),
      "Supervisión y delegación": def(
        "Tiende a clarificar expectativas, delegar y dar seguimiento con estructura.",
        "Puede preferir resolver personalmente o dar seguimiento de forma menos sistemática.",
        "Distribución de responsabilidad y desarrollo de otros.",
        "Autonomía operativa y menor necesidad de controlar el trabajo ajeno.",
        "Puede caer en sobreseguimiento si la exigencia es elevada.",
        "Conviene explorar delegación, seguimiento y claridad de acuerdos.",
      ),
      "Manejo de conflicto": def(
        "Tiende a abordar desacuerdos manteniendo foco en el problema y buscando cierres concretos.",
        "Puede evitar tensión, postergar conversaciones o reaccionar con mayor rigidez en desacuerdos.",
        "Confrontación productiva y capacidad para cerrar acuerdos después de tensiones.",
        "Puede reducir exposición a conflictos innecesarios.",
        "Puede normalizar demasiado el conflicto o asumir que toda diferencia debe enfrentarse de inmediato.",
        "Conviene observar evitación, reactividad y capacidad para poner límites.",
      ),
    },
  },
  psychometric_values: {
    assessmentType: "psychometric_values",
    title: "Valores y Motivadores Laborales",
    subtitle: "Importancia relativa asignada a diferentes fuentes de sentido y preferencia dentro del trabajo.",
    highSection: "Valores relativamente más importantes",
    lowSection: "Valores menos determinantes",
    note:
      "Las puntuaciones altas indican mayor importancia declarada y las bajas menor centralidad relativa. No existen valores universalmente superiores; la utilidad depende del ajuste entre persona, puesto, liderazgo y cultura.",
    dimensions: {
      Logro: def(
        "Da alta importancia a metas exigentes, avance y resultados visibles.",
        "Puede valorar el trabajo sin necesitar competencia o metas crecientemente exigentes.",
        "Orientación a objetivos y mejora continua.",
        "Mayor tolerancia a contextos donde el éxito no se mide sólo por indicadores.",
        "Puede frustrarse con ritmos lentos o convertir el logro en una fuente excesiva de presión.",
        "Puede requerir otros motivadores para sostener esfuerzo en entornos altamente competitivos.",
      ),
      Servicio: def(
        "Da alta importancia a que el trabajo genere utilidad concreta para otras personas.",
        "No necesita visualizar un impacto directo en otros para otorgar valor al trabajo.",
        "Orientación a cliente, usuario y contribución.",
        "Puede concentrarse en resultados técnicos sin depender tanto del reconocimiento del beneficiario.",
        "Puede asumir cargas adicionales por querer ayudar constantemente.",
        "En roles de servicio conviene verificar interés real por necesidades de terceros.",
      ),
      Aprendizaje: def(
        "Da alta importancia a aprender, ampliar capacidades y enfrentar temas nuevos.",
        "Puede sentirse satisfecho consolidando conocimientos ya dominados.",
        "Curiosidad, desarrollo y adaptación intelectual.",
        "Especialización y continuidad.",
        "Puede perder interés si percibe estancamiento o poca novedad.",
        "Puede mostrar menor interés por puestos donde el aprendizaje continuo es central.",
      ),
      Colaboración: def(
        "Da alta importancia a cooperación, confianza y apoyo mutuo.",
        "Puede trabajar con independencia social y menor necesidad de integración.",
        "Coordinación, confianza y construcción de equipo.",
        "Autonomía y menor dependencia del clima grupal.",
        "Puede evitar desacuerdos para proteger relaciones.",
        "Conviene explorar disposición a coordinar cuando el puesto exige trabajo transversal.",
      ),
      Influencia: def(
        "Da alta importancia a participar en decisiones y generar impacto visible.",
        "No necesita tener voz o capacidad de incidencia para valorar un puesto.",
        "Participación, liderazgo e iniciativa para incidir.",
        "Comodidad con roles especialistas o de contribución individual.",
        "Puede frustrarse en estructuras con poca autonomía o participación.",
        "Puede requerir claridad si el rol demanda persuadir o liderar sin autoridad.",
      ),
      Estabilidad: def(
        "Da alta importancia a continuidad, previsibilidad y seguridad.",
        "Tolera mejor incertidumbre, cambio y menor previsibilidad.",
        "Compromiso con continuidad y ambientes estables.",
        "Adaptación a contextos cambiantes.",
        "Cambios sorpresivos pueden afectar motivación y permanencia.",
        "Puede aburrirse o no valorar especialmente beneficios vinculados con estabilidad.",
      ),
    },
  },
  psychometric_integrity: {
    assessmentType: "psychometric_integrity",
    title: "Integridad y Criterio Laboral",
    subtitle: "Actitudes declaradas frente a responsabilidad, controles, transparencia, recursos, errores y dilemas.",
    highSection: "Criterios relativamente más consistentes",
    lowSection: "Aspectos que requieren exploración",
    note:
      "Este instrumento no detecta mentiras, fraude ni deshonestidad. Es sensible a deseabilidad social y sólo debe utilizarse para generar hipótesis de entrevista, nunca como prueba definitiva de integridad.",
    dimensions: {
      Responsabilidad: def(
        "Tiende a respaldar la rendición de cuentas, el aviso oportuno y el cumplimiento aun sin supervisión.",
        "Puede mostrar mayor tolerancia a postergar avisos, cierre o asunción explícita de responsabilidad.",
        "Trazabilidad y compromiso con acuerdos.",
        "Flexibilidad ante circunstancias cambiantes.",
        "Puede asumir responsabilidad de más si no distingue límites del rol.",
        "Conviene pedir ejemplos reales de incumplimientos, errores y cómo los comunicó.",
      ),
      "Apego a normas": def(
        "Tiende a considerar importantes los controles y reglas incluso bajo presión.",
        "Puede privilegiar criterio personal o rapidez frente a procedimientos formales.",
        "Consistencia operativa y respeto por controles.",
        "Flexibilidad y cuestionamiento de burocracia innecesaria.",
        "Puede rigidizar procesos que requieren excepción razonada.",
        "Conviene explorar cómo decide cuándo una excepción es legítima y quién debe autorizarla.",
      ),
      Transparencia: def(
        "Tiende a valorar la comunicación completa de información relevante, incluso cuando no le favorece.",
        "Puede ser más selectivo respecto a qué información considera necesario comunicar.",
        "Claridad, trazabilidad y menor riesgo de ocultamiento por conveniencia.",
        "Capacidad de simplificar y filtrar información.",
        "Puede sobrecomunicar información que no agrega valor.",
        "Conviene explorar omisiones, manejo de incertidumbre y comunicación de malas noticias.",
      ),
      "Uso de recursos": def(
        "Tiende a mostrar cuidado y criterios claros sobre uso de tiempo, información, dinero y activos.",
        "Puede mostrar mayor tolerancia a usos informales o pequeñas excepciones.",
        "Cuidado de recursos y conciencia de límites.",
        "Pragmatismo en el uso cotidiano de recursos.",
        "Puede volverse excesivamente restrictivo con recursos de bajo impacto.",
        "Conviene explorar límites sobre uso personal, información, gastos y activos.",
      ),
      "Manejo de errores": def(
        "Tiende a reconocer, reportar y analizar errores con orientación correctiva.",
        "Puede preferir corregir primero y comunicar sólo cuando considera que el impacto lo amerita.",
        "Aprendizaje, prevención y comunicación temprana.",
        "Pragmatismo para resolver sin sobredimensionar fallas menores.",
        "Puede dedicar demasiado tiempo a documentar errores de bajo impacto.",
        "Conviene explorar qué errores reportaría, cuándo y a quién.",
      ),
      "Criterio ético": def(
        "Tiende a considerar conflictos de interés, consistencia y explicabilidad de las decisiones.",
        "Puede privilegiar resultado, autoridad o contexto sobre principios explícitos.",
        "Decisiones defendibles y conciencia de conflictos de interés.",
        "Flexibilidad contextual.",
        "Puede sobrerregular decisiones simples si percibe dilemas donde no existen.",
        "Conviene profundizar con escenarios reales y observar razonamiento, no sólo la respuesta final.",
      ),
    },
  },
  psychometric_bigfive: {
    assessmentType: "psychometric_bigfive",
    title: "Personalidad Laboral Big Five",
    subtitle: "Cinco tendencias amplias de personalidad expresadas en contexto de trabajo.",
    highSection: "Tendencias relativamente más marcadas",
    lowSection: "Tendencias relativamente menos marcadas",
    note:
      "Las cinco dimensiones describen tendencias, no competencias ni diagnósticos. Tanto los niveles altos como bajos pueden aportar ventajas o riesgos dependiendo del puesto y del contexto.",
    dimensions: {
      Responsabilidad: def(
        "Tiende a ser organizado, disciplinado y orientado a cerrar compromisos.",
        "Tiende a trabajar con mayor flexibilidad, espontaneidad y menor estructura previa.",
        "Orden, seguimiento y disciplina.",
        "Adaptabilidad y menor rigidez procedimental.",
        "Puede sobreplanear o elevar demasiado su autoexigencia.",
        "Puede requerir apoyos de organización y seguimiento en roles de alta carga.",
      ),
      Extraversión: def(
        "Tiende a buscar interacción, participar y expresar sus ideas con visibilidad.",
        "Tiende a ser más reservado, selectivo y cómodo con concentración individual.",
        "Energía social, asertividad y networking.",
        "Escucha, concentración y menor necesidad de exposición.",
        "Puede dominar conversaciones o necesitar demasiada interacción.",
        "Puede hacer poco visibles ideas valiosas en entornos muy sociales.",
      ),
      "Estabilidad emocional": def(
        "Tiende a recuperarse con mayor rapidez de presión, crítica y contratiempos.",
        "Puede experimentar con mayor intensidad preocupación, tensión o impacto emocional ante presión.",
        "Regulación, recuperación y claridad bajo presión.",
        "Sensibilidad a riesgos y señales de tensión.",
        "Puede subestimar señales emocionales propias o de otros.",
        "Conviene explorar estrategias de manejo de estrés, crítica y sobrecarga.",
      ),
      "Apertura al aprendizaje": def(
        "Tiende a mostrar curiosidad, flexibilidad cognitiva y disposición a explorar métodos nuevos.",
        "Tiende a valorar más la continuidad, experiencia conocida y soluciones probadas.",
        "Aprendizaje, innovación y adaptación intelectual.",
        "Pragmatismo y consolidación de métodos.",
        "Puede dispersarse entre ideas nuevas o cambiar antes de estabilizar procesos.",
        "Puede resistir cambios conceptuales o nuevas herramientas.",
      ),
      Cooperación: def(
        "Tiende a considerar perspectivas ajenas, colaborar y preservar relaciones de trabajo.",
        "Tiende a ser más competitivo, directo o escéptico frente a las intenciones de otros.",
        "Empatía, cooperación y construcción de confianza.",
        "Confrontación, independencia y menor complacencia.",
        "Puede evitar confrontaciones necesarias o ceder demasiado.",
        "Puede generar fricción si la franqueza supera la consideración interpersonal.",
      ),
    },
  },
  psychometric_sales: {
    assessmentType: "psychometric_sales",
    title: "Perfil Comercial",
    subtitle: "Tendencias conductuales vinculadas con prospección, influencia, cliente, rechazo y disciplina de venta.",
    highSection: "Recursos comerciales relativamente más sólidos",
    lowSection: "Aspectos comerciales a profundizar",
    note:
      "El perfil comercial es una autodescripción y no demuestra por sí solo desempeño en ventas. Debe combinarse con evidencia de resultados, entrevista estructurada, simulación comercial y conocimiento del mercado.",
    dimensions: {
      "Iniciativa comercial": def(
        "Tiende a generar actividad y abrir oportunidades sin esperar a que lleguen por sí solas.",
        "Puede preferir trabajar oportunidades con interés previo o una cartera ya definida.",
        "Prospección, energía inicial y creación de oportunidades.",
        "Foco en oportunidades más calificadas.",
        "Puede priorizar volumen de actividad sobre calidad.",
        "Conviene explorar comodidad con prospección en frío y generación autónoma de cartera.",
      ),
      Persuasión: def(
        "Tiende a adaptar argumentos, manejar objeciones y pedir decisiones concretas.",
        "Puede sentirse más cómodo informando que influyendo activamente.",
        "Influencia, negociación y construcción de argumentos.",
        "Comunicación sobria y menor presión sobre el cliente.",
        "Puede sobrerrepresentar su capacidad de convencer o presionar demasiado.",
        "Conviene realizar una simulación de objeciones y cierre.",
      ),
      "Orientación al cliente": def(
        "Tiende a priorizar comprensión de necesidades, claridad de condiciones y valor de largo plazo.",
        "Puede concentrarse más en el producto, la cuota o la transacción que en el diagnóstico del cliente.",
        "Venta consultiva y relación sostenible.",
        "Velocidad transaccional y foco en cierre.",
        "Puede prolongar demasiado el diagnóstico o evitar pedir el cierre.",
        "Conviene explorar ética comercial, escucha y ajuste real de la solución.",
      ),
      "Tolerancia al rechazo": def(
        "Tiende a recuperarse de negativas y mantener actividad comercial durante ciclos difíciles.",
        "Puede verse más afectado por rechazo, pérdida de oportunidades o periodos de baja conversión.",
        "Persistencia y estabilidad ante ciclos comerciales.",
        "Sensibilidad que puede favorecer aprendizaje si se gestiona bien.",
        "Puede normalizar demasiadas negativas sin revisar estrategia.",
        "Conviene explorar cómo se recupera y qué hace después de perder una venta importante.",
      ),
      "Disciplina comercial": def(
        "Tiende a registrar, priorizar y dar seguimiento de forma sistemática.",
        "Puede depender más de memoria, intuición y actividad inmediata que de procesos formales.",
        "Pipeline, seguimiento y predictibilidad comercial.",
        "Agilidad y menor burocracia.",
        "Puede dedicar demasiado tiempo al control administrativo.",
        "Conviene revisar hábitos de CRM, seguimiento, forecasting y cierre de compromisos.",
      ),
    },
  },
};

export function profileIndex(score: number) {
  return Math.max(0, Math.min(100, Math.round(((score - 1) / 4) * 100)));
}

function band(index: number) {
  if (index <= 24) return "Bajo";
  if (index <= 44) return "Moderado-bajo";
  if (index <= 60) return "Medio";
  if (index <= 79) return "Moderado-alto";
  return "Alto";
}

export function getScaleProfileConfig(type: string) {
  return configs[type] ?? null;
}

export function analyzeScaleProfile(
  type: string,
  inputs: ProfileDimensionInput[],
): ScaleProfileAnalysis | null {
  const config = getScaleProfileConfig(type);
  if (!config) return null;

  const dimensions = inputs.map((item) => {
    const index = profileIndex(item.score);
    const definition = config.dimensions[item.name];
    const high = index >= 61;
    const low = index <= 44;
    return {
      name: item.name,
      score: item.score,
      index,
      band: band(index),
      meaning: definition
        ? high
          ? definition.high
          : low
            ? definition.low
            : "La dimensión aparece en un rango intermedio y probablemente se expresa de forma más dependiente del contexto."
        : "Resultado descriptivo de esta dimensión.",
      potential: definition
        ? high
          ? definition.highPotential
          : definition.lowPotential
        : "Debe interpretarse según el contexto del puesto.",
      watchout: definition
        ? high
          ? definition.highWatchout
          : definition.lowWatchout
        : "Conviene profundizar con entrevista y evidencia conductual.",
    };
  });

  const ranked = [...dimensions].sort((a, b) => b.index - a.index);
  const top = ranked.slice(0, 2);
  const lower = [...ranked].reverse().slice(0, 2);
  const executiveSummary = [
    "El perfil muestra diferencias relativas entre dimensiones, no etiquetas rígidas. Los puntajes describen la intensidad de respuestas dentro del instrumento y todavía no representan percentiles normativos.",
    top.length
      ? "Las dimensiones relativamente más altas son " +
        top.map((item) => item.name).join(" y ") +
        ". Deben interpretarse como tendencias declaradas que conviene contrastar con ejemplos reales."
      : "No hay información suficiente para identificar tendencias relativas.",
    "Las dimensiones relativamente más bajas no son automáticamente debilidades. Su relevancia depende de las exigencias reales del puesto, la cultura y el tipo de liderazgo.",
  ];
  const interviewPrompts = lower.map(
    (item) =>
      "Profundizar en " +
      item.name.toLowerCase() +
      ": pedir un ejemplo reciente que muestre cómo actúa en una situación donde esta dimensión es importante.",
  );

  return { config, dimensions, top, lower, executiveSummary, interviewPrompts };
}
