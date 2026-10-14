/**
 * Copy comercial visible para prospectos y clientes FactoRH.
 * Describe beneficios y alcances, sin prometer resultados garantizados
 * ni convertir información comercial en acceso operativo.
 */
export type SolutionContent = {
  tagline: string;
  overview: string;
  problem: string;
  benefits: [string,string,string];
  howItWorks: [string,string,string];
  decisionValue: string;
  note: string;
};

export const solutionContent: Record<string,SolutionContent> = {
  psychometrics: {
    tagline: "Conoce mejor a tus candidatos antes de decidir.",
    overview: "Un currículum y una buena entrevista cuentan solo una parte de la historia. Complementa tu proceso de selección con evaluaciones de personalidad, razonamiento, integridad, atención y motivadores, y reúne los resultados en reportes claros para RH y líderes.",
    problem: "Decisiones de contratación basadas únicamente en la impresión de la entrevista, con poca evidencia comparable sobre las personas.",
    benefits: [
      "Identifica fortalezas y áreas por explorar antes de una entrevista final.",
      "Complementa la comparación de candidatos con información estructurada.",
      "Centraliza aplicaciones, avances y reportes en un solo lugar."
    ],
    howItWorks: [
      "Selecciona los instrumentos habilitados y asigna una liga al participante.",
      "El candidato responde en línea; puedes dar seguimiento a su avance.",
      "Consulta reportes por prueba y utiliza los hallazgos junto con entrevistas y otras evidencias."
    ],
    decisionValue: "Más información para conversar, comparar y decidir; las pruebas no sustituyen el criterio profesional ni determinan por sí solas una contratación.",
    note: "La disponibilidad de instrumentos y el número de aplicaciones dependen del plan contratado."
  },
  pdl: {
    tagline: "Convierte a tus jefes en líderes que realmente hacen crecer al equipo.",
    overview: "Cuando una persona asciende por su experiencia técnica, no siempre cuenta con herramientas para dirigir, delegar o dar seguimiento. El Programa de Desarrollo de Líderes (PDL) ayuda a diagnosticar competencias y convertir los hallazgos en conversaciones y acciones concretas de desarrollo.",
    problem: "Líderes que resuelven todo personalmente, delegan poco o tienen dificultades para comunicar expectativas y desarrollar a sus colaboradores.",
    benefits: [
      "Detecta fortalezas y brechas de liderazgo con distintas fuentes de evidencia.",
      "Prioriza necesidades de capacitación y desarrollo por persona.",
      "Orienta compromisos, conversaciones y seguimiento con los líderes."
    ],
    howItWorks: [
      "Realiza evaluaciones de liderazgo y recopila la información correspondiente.",
      "Revisa las competencias y contrasta la autopercepción con las evidencias disponibles.",
      "Diseña un plan de desarrollo con acciones y seguimiento del avance."
    ],
    decisionValue: "Deja de capacitar por intuición y enfoca el desarrollo en las competencias que más necesitan tus líderes.",
    note: "El alcance de las evaluaciones, entrevistas y acompañamiento depende del servicio contratado."
  },
  feedback360: {
    tagline: "Descubre cómo se vive el liderazgo desde diferentes perspectivas.",
    overview: "Un líder puede percibir su desempeño de una manera y su equipo experimentarlo de otra. La Evaluación 360° reúne retroalimentación de diferentes relaciones laborales para detectar coincidencias, diferencias y oportunidades de mejora en competencias observables.",
    problem: "Puntos ciegos en el estilo de liderazgo, conversaciones de desempeño poco objetivas y falta de retroalimentación estructurada.",
    benefits: [
      "Contrasta la autopercepción con opiniones de jefes, pares y colaboradores.",
      "Identifica fortalezas consistentes y conductas que conviene mejorar.",
      "Ofrece una base para conversaciones y planes de desarrollo."
    ],
    howItWorks: [
      "Define a la persona evaluada y a sus grupos de evaluadores.",
      "Recopila las valoraciones de competencias a través de cuestionarios.",
      "Analiza un reporte consolidado y acuerda acciones de mejora."
    ],
    decisionValue: "Transforma las percepciones en conversaciones de desarrollo más útiles y fundamentadas.",
    note: "La retroalimentación debe interpretarse con contexto, confidencialidad y acompañamiento adecuado."
  },
  studies: {
    tagline: "Verifica información clave antes de incorporar a alguien a tu empresa.",
    overview: "Cuando una contratación requiere mayor profundidad, los estudios socioeconómicos e investigaciones ayudan a conocer y documentar información relevante de un candidato, de acuerdo con el alcance contratado y las autorizaciones correspondientes.",
    problem: "Expedientes incompletos, datos sin verificar y procesos de contratación con poca trazabilidad documental.",
    benefits: [
      "Reúne información útil para complementar el expediente de selección.",
      "Organiza hallazgos, documentación y observaciones en un reporte.",
      "Da seguimiento al estado de cada estudio solicitado."
    ],
    howItWorks: [
      "Solicita el estudio adecuado al nivel de profundidad que necesitas.",
      "Se recaba y verifica información conforme al alcance y consentimiento aplicable.",
      "Recibe un reporte con hallazgos y consideraciones para tu proceso."
    ],
    decisionValue: "Mayor trazabilidad documental y una visión más completa antes de tomar decisiones relevantes.",
    note: "Los estudios están sujetos a consentimiento, protección de datos y alcances definidos; no garantizan conductas futuras."
  },
  nom035: {
    tagline: "Pasa del diagnóstico de riesgo psicosocial a un plan de acción.",
    overview: "Cumplir con la NOM-035-STPS-2018 implica más que levantar encuestas. Organiza centros de trabajo, aplica las guías de referencia que correspondan, analiza resultados y da seguimiento a medidas y evidencias de intervención desde un solo entorno.",
    problem: "Encuestas dispersas, evidencias sin orden y acciones de prevención que no tienen responsables ni seguimiento documentado.",
    benefits: [
      "Estructura el diagnóstico conforme al tamaño y necesidades del centro.",
      "Visualiza factores de riesgo y áreas que requieren atención.",
      "Registra acciones, responsables, fechas y evidencias de seguimiento."
    ],
    howItWorks: [
      "Configura el centro de trabajo y determina la guía y obligaciones aplicables.",
      "Organiza la aplicación y revisa los resultados agrupados.",
      "Documenta intervenciones y su seguimiento con evidencia."
    ],
    decisionValue: "Convierte los hallazgos en un proceso de prevención y mejora que RH pueda administrar.",
    note: "El módulo se encuentra en piloto controlado. Usarlo no garantiza por sí solo el cumplimiento normativo."
  },
  climate: {
    tagline: "Escucha a tu gente antes de que los problemas se reflejen en la operación.",
    overview: "La rotación, la desmotivación y los conflictos suelen tener señales previas. Con encuestas de clima, cultura y compromiso puedes explorar cómo viven los colaboradores su entorno, liderazgo, comunicación y reconocimiento para priorizar acciones de mejora.",
    problem: "Decisiones sobre personas tomadas sin escuchar a los equipos y sin identificar qué factores están afectando su experiencia laboral.",
    benefits: [
      "Conoce percepciones sobre liderazgo, comunicación y condiciones de trabajo.",
      "Detecta diferencias entre áreas o grupos cuando los datos lo permiten.",
      "Prioriza planes de mejora y establece seguimiento a los hallazgos."
    ],
    howItWorks: [
      "Elige el instrumento adecuado y define la población a consultar.",
      "Aplica encuestas y revisa los resultados por dimensiones.",
      "Comparte hallazgos con líderes y da seguimiento a los compromisos."
    ],
    decisionValue: "Convierte la voz de los colaboradores en prioridades de gestión, no solo en una encuesta anual.",
    note: "Los análisis segmentados deben respetar la confidencialidad y los mínimos de respuesta pertinentes."
  }
};
