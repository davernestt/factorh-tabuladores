import type {Nom035RequirementKey} from "./rules";

/**
 * FactoRH learning catalog for NOM-035-STPS-2018.
 * Normative obligations are separated from optional, non-prescriptive
 * evidence examples. Source:
 * https://sidof.segob.gob.mx/notas/docFuente/5541828
 * Reviewed for the 2018 standard's scope on 2026-10-12.
 * Legal review is recommended before commercial release.
 */
export type Nom035GuideTask={
 id:string;
 title:string;
 help:string;
};
export type Nom035GuideCard={
 key:Nom035RequirementKey;
 meaning:string;
 normative:string[];
 steps:string[];
 tasks:readonly Nom035GuideTask[];
 evidence:string[];
 monitoring:string[];
 warnings?:string[];
 source:string;
};
export const NOM035_EVIDENCE_GUIDES:Record<Nom035RequirementKey,Nom035GuideCard>={
 policy:{
  key:"policy",
  meaning:"La empresa debe contar con una política que realmente se aplique, se mantenga vigente y sea conocida por sus trabajadores; no basta con redactarla y guardarla.",
  normative:[
   "Establecer por escrito, implantar, mantener y difundir la política.",
   "Incluir expresamente prevención de factores de riesgo psicosocial, prevención de violencia laboral y promoción de un entorno organizacional favorable.",
   "La Guía de Referencia IV ofrece un ejemplo de política, no un formato obligatorio."
  ],
  steps:[
   "Revisar si ya existe una política; comprobar que contiene los tres compromisos.",
   "Acordar responsabilidades con Dirección, RH y Seguridad y Salud en el Trabajo.",
   "Aprobar una versión y hacerla accesible a la plantilla por medios adecuados al centro.",
   "Incorporar la política al ingreso de nuevo personal y mantenerla actualizada cuando cambien procesos."
  ],
  tasks:[
   {id:"policy_content",title:"Comprobar los tres compromisos de la política",help:"Riesgos psicosociales, violencia laboral y entorno organizacional favorable."},
   {id:"policy_approval",title:"Emitir y aprobar la versión vigente",help:"Anotar versión, fecha de vigencia y aprobación interna."},
   {id:"policy_implementation",title:"Comunicar responsables y mecanismos para ponerla en práctica",help:"La política necesita aplicación real, no solo un documento."},
   {id:"policy_diffusion",title:"Difundir y conservar referencia de esa difusión",help:"Puede ser acuse, comunicado o evidencia equivalente."},
   {id:"policy_review",title:"Revisar vigencia ante cambios relevantes",help:"Seguimiento preventivo propuesto por FactoRH, sin periodicidad específica añadida por la NOM."}
  ],
  evidence:[
   "Política escrita vigente y registro de control de versiones.",
   "Constancia o registro de aprobación interna.",
   "Comunicaciones de difusión, acuses o evidencia de disponibilidad.",
   "Material de inducción y referencia al canal interno de consulta."
  ],
  monitoring:[
   "Confirmar que colaboradores de distintas áreas puedan consultar la política.",
   "Revisar cambios de responsables, instalaciones o prácticas que requieran actualizarla.",
   "Registrar fecha de la siguiente revisión interna sugerida por RH."
  ],
  source:"2; 5.1; 5.7 a); Guía de Referencia IV"
 },
 prevention:{
  key:"prevention",
  meaning:"Se trata de prevenir problemas mediante cambios concretos en la organización del trabajo, relaciones laborales, comunicación, apoyo social y capacitación; no solamente ofrecer una plática general.",
  normative:[
   "Adoptar medidas para prevenir y controlar factores de riesgo psicosocial, promover el entorno favorable y atender violencia laboral.",
   "El numeral 8.1 exige impulsar apoyo social, difusión, capacitación y acciones de promoción de un entorno favorable.",
   "El numeral 8.2 describe medidas sobre liderazgo, cargas, control del trabajo, apoyo social, equilibrio trabajo-familia, reconocimiento, violencia, información y capacitación.",
   "La detección de necesidades de capacitación debe realizarse al menos cada dos años e integrarse al programa de capacitación (8.2 i)."
  ],
  steps:[
   "Revisar procesos de trabajo, horas y turnos, cargas, roles, conflictos y canales de comunicación.",
   "Priorizar medidas factibles con responsables de área y Seguridad y Salud.",
   "Establecer acciones y comunicar instrucciones a los equipos.",
   "Verificar con líderes y trabajadores si las medidas se mantienen y dan resultado."
  ],
  tasks:[
   {id:"prevention_scope",title:"Identificar áreas de prevención y prácticas de trabajo",help:"Considerar liderazgo, cargas, descansos, funciones, apoyo y violencia."},
   {id:"prevention_measures",title:"Definir acciones preventivas concretas",help:"Documentar qué práctica cambia, dónde y quién será responsable."},
   {id:"prevention_training",title:"Planear capacitación y sensibilización pertinente",help:"Integrar resultados de detección de necesidades al programa de capacitación."},
   {id:"prevention_communication",title:"Difundir medidas e instrucciones",help:"La plantilla debe conocer cómo actuar y a quién recurrir."},
   {id:"prevention_followup",title:"Revisar implementación y ajustar",help:"Dejar evidencia de acciones realizadas y hallazgos posteriores."}
  ],
  evidence:[
   "Programa o matriz de medidas preventivas con responsables.",
   "Procedimientos de trabajo, jornadas, cargas o descansos revisados.",
   "Materiales de capacitación y constancias de impartición.",
   "Minutas de coordinación y registros de medidas implantadas."
  ],
  monitoring:[
   "Vigilar pendientes y fecha compromiso de cada medida.",
   "Revisar periódicamente indicadores internos de organización del trabajo.",
   "Realizar detección de necesidades de capacitación al menos cada dos años (8.2 i)."
  ],
  source:"5.4; 8.1; 8.2 a)–i)"
 },
 information:{
  key:"information",
  meaning:"Los trabajadores deben recibir información clara sobre la política, las medidas preventivas, cómo denunciar violencia laboral y los resultados organizacionales cuando corresponda.",
  normative:[
   "Difundir política, medidas contra violencia laboral, medidas de prevención/control y los mecanismos de quejas.",
   "Informar sobre posibles alteraciones a la salud por exposición a riesgos psicosociales.",
   "En centros de 16 o más trabajadores, comunicar los resultados de la identificación y análisis; para más de 50, también la evaluación del entorno organizacional.",
   "El resultado de las evaluaciones aplicables debe estar disponible para consulta de los trabajadores (7.8)."
  ],
  steps:[
   "Preparar un plan de comunicación comprensible para personal operativo y administrativo.",
   "Difundir política, canales de denuncia, medidas preventivas y rutas de orientación.",
   "Una vez realizada la evaluación, comunicar resultados organizacionales sin identificar personas.",
   "Mantener acceso al material y comprobar que llegó a los trabajadores de los distintos turnos."
  ],
  tasks:[
   {id:"info_materials",title:"Preparar materiales accesibles para la plantilla",help:"Adaptar formato y lenguaje a turnos, puestos y canales reales."},
   {id:"info_policy",title:"Difundir política y medidas de prevención",help:"Incluir dónde consultar documentos e información."},
   {id:"info_complaints",title:"Comunicar el mecanismo de quejas y violencia laboral",help:"Explicar privacidad y cómo presentar una comunicación."},
   {id:"info_health",title:"Informar sobre posibles alteraciones a la salud",help:"Proporcionar información preventiva sin hacer diagnósticos."},
   {id:"info_results",title:"Comunicar resultados organizacionales cuando aplique",help:"En centros de 16 o más, respetar confidencialidad y disponibilidad para consulta."}
  ],
  evidence:[
   "Plan o cronograma de difusión con medios utilizados.",
   "Carteles, comunicados, circulares y materiales accesibles.",
   "Acuses, constancias, listas de asistencia o registros equivalentes.",
   "Constancia de disponibilidad de resultados agregados cuando aplique."
  ],
  monitoring:[
   "Comprobar difusión en todos los turnos y sedes pertinentes.",
   "Actualizar mensajes si cambian mecanismos, políticas o medidas.",
   "Comprobar que los resultados aplicables siguen disponibles para consulta."
  ],
  source:"5.7 a)–f); 7.8"
 },
 complaints:{
  key:"complaints",
  meaning:"La empresa necesita vías seguras y confidenciales para recibir reportes sobre violencia laboral y prácticas contrarias al entorno favorable, con criterios claros para atenderlos y evitar represalias.",
  normative:[
   "Disponer de mecanismos seguros y confidenciales para recibir quejas por prácticas opuestas al entorno organizacional favorable y denuncias de violencia laboral.",
   "Difundir los mecanismos y las medidas adoptadas a los trabajadores.",
   "Las medidas preventivas deben contemplar acciones para prevenir violencia laboral."
  ],
  steps:[
   "Definir los canales: persona designada, correo, buzón protegido u otro medio operativo.",
   "Documentar qué ocurre al recibir una queja, quién la analiza y cómo se limita el acceso.",
   "Definir medidas de protección, atención y criterios para escalar casos.",
   "Difundir el mecanismo e identificar posibles barreras de acceso o uso."
  ],
  tasks:[
   {id:"complaints_channels",title:"Establecer mecanismos confidenciales de recepción",help:"Evitar buzones o correos accesibles a personas no autorizadas."},
   {id:"complaints_protocol",title:"Definir el procedimiento de atención y escalamiento",help:"Responsables, confidencialidad, medidas y seguimiento."},
   {id:"complaints_training",title:"Capacitar a las personas receptoras",help:"Atención respetuosa, protección de datos y no represalias."},
   {id:"complaints_communication",title:"Difundir las instrucciones de uso",help:"Canales disponibles y qué puede reportarse."},
   {id:"complaints_review",title:"Verificar funcionamiento del mecanismo",help:"Seguimiento sin revelar detalles identificables en este expediente."}
  ],
  evidence:[
   "Procedimiento del canal confidencial y roles de acceso.",
   "Comunicados de difusión y capacitación del personal autorizado.",
   "Constancia administrativa de existencia y operación del canal.",
   "Reporte estadístico desidentificado cuando sea seguro y útil."
  ],
  monitoring:[
   "Verificar disponibilidad del canal y tiempos internos de atención definidos por la empresa.",
   "Conservar casos individuales en repositorio aparte, con controles de acceso.",
   "Revisar efectividad del mecanismo sin publicar identidades o testimonios."
  ],
  warnings:["No cargar denuncias nominativas ni narraciones de casos en la ficha general."],
  source:"5.7 b), d); 8.1 b); 8.2 g)"
 },
 severe_events:{
  key:"severe_events",
  meaning:"Si una persona sufrió o presenció un acontecimiento traumático severo durante o con motivo del trabajo, debe existir un proceso para identificarla y canalizarla a un servicio médico o de salud autorizado.",
  normative:[
   "Identificar a trabajadores sujetos a acontecimientos traumáticos severos laborales y canalizarlos para su atención a institución de seguridad social, institución privada o médico del centro de trabajo (5.5).",
   "La Guía I es un ejemplo de cuestionario; la norma no exige exclusivamente su utilización.",
   "El numeral 6.5 contempla comunicación escrita del acontecimiento por el trabajador.",
   "Los registros específicos de nombres de personas con exámenes o evaluaciones clínicas, en los supuestos aplicables, deben gestionarse con acceso restringido (5.8 c)."
  ],
  steps:[
   "Identificar un servicio médico o profesional autorizado para la atención y canalización.",
   "Definir la recepción privada de comunicaciones de acontecimientos vinculados al trabajo.",
   "Aplicar una herramienta de identificación cuando corresponda y orientar a la persona.",
   "Registrar y confirmar la gestión de la canalización en un expediente clínico o de salud restringido, nunca en este compendio general."
  ],
  tasks:[
   {id:"trauma_service",title:"Designar servicio de atención y canalización",help:"Definir responsable profesional e instrucciones de contacto."},
   {id:"trauma_protocol",title:"Documentar protocolo de recepción y resguardo",help:"Establecer canales confidenciales y acceso limitado."},
   {id:"trauma_information",title:"Comunicar a la plantilla cómo reportar un acontecimiento",help:"Incluir orientación sobre vías disponibles."},
   {id:"trauma_screening",title:"Disponer del proceso de identificación cuando corresponda",help:"La Guía I es un ejemplo y no constituye un diagnóstico."},
   {id:"trauma_followup",title:"Verificar el proceso de canalización mediante registro restringido",help:"En este panel solo registrar la existencia del procedimiento, sin identidades."}
  ],
  evidence:[
   "Protocolo general de identificación y canalización, sin información clínica.",
   "Constancia de asignación de servicio médico o de atención.",
   "Materiales de comunicación de canales de apoyo.",
   "Referencia controlada al expediente restringido que conserve constancias cuando aplique."
  ],
  monitoring:[
   "Comprobar que el servicio de atención está disponible y el protocolo es conocido.",
   "Mantener separado el registro administrativo de los expedientes personales.",
   "Verificar tiempos de respuesta y seguimiento mediante personal autorizado."
  ],
  warnings:[
   "No subir diagnósticos, nombres, escritos de incidentes ni síntomas individuales a este expediente.",
   "No se debe presentar el tamizaje automatizado como una valoración clínica."
  ],
  source:"5.5; 5.8 c) cuando aplique; 6.5; Guía de Referencia I"
 },
 risk_identification:{
  key:"risk_identification",
  meaning:"La organización debe identificar los factores de riesgo psicosocial: condiciones peligrosas, cargas, escaso control, jornada, interferencia trabajo-familia, relaciones, liderazgo y violencia laboral.",
  normative:[
   "En centros de 16 a 50 trabajadores deben incluirse todos los trabajadores en la identificación y análisis (7.1 a).",
   "En centros con más de 50 debe realizarse identificación/análisis y evaluación del entorno organizacional, permitiéndose una muestra representativa conforme a Guía III (7.1 b).",
   "El método utilizado debe contener cuestionarios, reglas de aplicación, evaluación y niveles de riesgo (7.4); métodos alternativos deben observar la validación de 7.5.",
   "Integrar el resultado al diagnóstico de seguridad y salud en el trabajo (7.6) y repetir la evaluación al menos cada dos años (7.9)."
  ],
  steps:[
   "Confirmar plantilla por centro, seleccionar método y documentar cobertura o muestreo.",
   "Preparar comunicación de aplicación y confidencialidad.",
   "Aplicar Guía II o III según el tamaño, o un método alternativo que cumpla 7.4–7.5.",
   "Analizar factores y niveles de riesgo; integrar resultados al diagnóstico de seguridad y salud.",
   "Determinar medidas y planear próxima aplicación."
  ],
  tasks:[
   {id:"risk_population",title:"Confirmar plantilla y cobertura de evaluación",help:"Censo 16–50; censo o muestra representativa en más de 50."},
   {id:"risk_method",title:"Documentar el método y sus reglas de calificación",help:"Si no se usan guías oficiales, documentar validación según 7.5."},
   {id:"risk_application",title:"Aplicar cuestionarios conforme a procedimiento",help:"Conservar constancia metodológica de aplicación."},
   {id:"risk_analysis",title:"Identificar factores y niveles de riesgo",help:"Revisar categorías y dominios aplicables."},
   {id:"risk_integration",title:"Integrar resultado al diagnóstico de seguridad y salud",help:"Referencia al diagnóstico NOM-030 y a recomendaciones."},
   {id:"risk_reassessment",title:"Programar evaluación posterior dentro de dos años",help:"Seguimiento de la periodicidad mínima del numeral 7.9."}
  ],
  evidence:[
   "Padrón o recuento de plantilla del centro y protocolo de muestreo, cuando corresponda.",
   "Método y cuestionario aplicados con versión y criterios de calificación.",
   "Informe de resultados y análisis por categoría y dominio.",
   "Constancia de incorporación al diagnóstico de seguridad y salud.",
   "Plan de próxima evaluación, con periodicidad no superior a dos años."
  ],
  monitoring:[
   "Revisar avances de aplicación y cobertura de la población.",
   "Dar seguimiento a los hallazgos que requieran medidas de control.",
   "Vigilar próxima fecha de aplicación, al menos bienal."
  ],
  source:"5.2/5.3; 7.1–7.2; 7.4–7.9"
 },
 organizational_environment:{
  key:"organizational_environment",
  meaning:"Los centros con más de 50 trabajadores deben evaluar si la organización fomenta pertenencia, capacitación, responsabilidades claras, participación, distribución adecuada de cargas y reconocimiento.",
  normative:[
   "Evaluar los seis aspectos señalados en 7.3: pertenencia, formación, claridad de responsabilidades, participación/comunicación, cargas y jornadas, evaluación/reconocimiento.",
   "Aplicar la evaluación junto con la identificación de riesgos para centros con más de 50 trabajadores (5.3; 7.1 b).",
   "Puede utilizarse Guía III con censo o muestra representativa correctamente seleccionada, o método alternativo conforme a los requisitos normativos."
  ],
  steps:[
   "Revisar que la evaluación elegida cubra los seis aspectos.",
   "Confirmar el método de aplicación y procedimiento de selección de participantes.",
   "Analizar resultados por dimensión y áreas cuando sea posible sin identificar personas.",
   "Identificar las oportunidades de mejora y documentar responsables.",
   "Compartir los resultados organizacionales para consulta de los trabajadores."
  ],
  tasks:[
   {id:"environment_factors",title:"Confirmar seis componentes del entorno favorable",help:"Pertenencia, formación, funciones, participación, cargas/jornadas y reconocimiento."},
   {id:"environment_coverage",title:"Documentar censo o protocolo de muestreo",help:"En caso de muestra, conservar evidencia de selección representativa."},
   {id:"environment_application",title:"Aplicar el método elegido y consolidar resultados",help:"Conservar la versión y evidencia metodológica."},
   {id:"environment_report",title:"Documentar diagnóstico e informe",help:"Debe contemplar la evaluación del entorno, no solo riesgos."},
   {id:"environment_actions",title:"Definir y dar seguimiento a medidas de mejora",help:"En función de lo encontrado, dentro del programa correspondiente."}
  ],
  evidence:[
   "Método/Guía III y protocolo de cobertura o muestreo.",
   "Informe técnico con los resultados del entorno organizacional.",
   "Referencia a difusión/disponibilidad de resultados.",
   "Matriz de acciones de mejora cuando corresponda."
  ],
  monitoring:[
   "Conservar evidencia de avances de acciones de mejora.",
   "Reevaluar como mínimo cada dos años, junto con riesgos psicosociales.",
   "Evitar desglose de grupos que puedan identificar personas."
  ],
  source:"5.3; 7.1 b); 7.3–7.9"
 },
 results_report:{
  key:"results_report",
  meaning:"Las evaluaciones de riesgos y, en su caso, del entorno organizacional deben documentarse en un informe técnico suficientemente completo para explicar qué se evaluó, cómo, qué se encontró y qué se recomienda.",
  normative:[
   "El informe debe señalar datos del centro: razón social, domicilio y actividad principal.",
   "Debe incluir objetivo, principales actividades realizadas y método utilizado.",
   "Debe presentar resultados, conclusiones, recomendaciones y acciones de intervención cuando corresponda.",
   "Debe identificar al responsable de la evaluación con nombre completo y número de cédula profesional, en su caso (7.7).",
   "Los resultados deben estar disponibles para consulta de los trabajadores (7.8)."
  ],
  steps:[
   "Reunir datos completos del centro y confirmar versión del método aplicado.",
   "Integrar cobertura de población, resultados y metodología al informe.",
   "Redactar conclusiones, recomendaciones y acciones pertinentes.",
   "Revisar y firmar/identificar al responsable conforme al numeral 7.7.",
   "Dejar disponible el resultado organizacional para consulta de trabajadores sin publicar datos sensibles."
  ],
  tasks:[
   {id:"report_center",title:"Completar razón social, domicilio y actividad principal",help:"Verificar consistencia con el centro de trabajo."},
   {id:"report_method",title:"Describir objetivo, actividades y método",help:"Incluir forma de aplicación, cobertura y niveles de riesgo."},
   {id:"report_results",title:"Integrar resultados y conclusiones",help:"Contemplar riesgos y entorno organizacional cuando aplique."},
   {id:"report_recommendations",title:"Documentar recomendaciones e intervenciones",help:"Si procede, vincular a programa de intervención."},
   {id:"report_author",title:"Identificar al responsable de la evaluación",help:"Nombre y cédula profesional, en su caso."},
   {id:"report_access",title:"Habilitar consulta de resultados organizacionales",help:"Sin acceso a respuestas individuales ni datos clínicos."}
  ],
  evidence:[
   "Informe técnico del centro que incorpore todos los rubros de 7.7.",
   "Anexo de método aplicado, tablas de resultados y criterios normativos.",
   "Constancia de autoría/revisión interna del informe.",
   "Constancia de disponibilidad del resultado para consulta de los trabajadores."
  ],
  monitoring:[
   "Verificar que todos los apartados de 7.7 estén completos.",
   "Registrar correcciones o versiones posteriores del informe.",
   "Revisar que exista una forma accesible de consultar resultados agregados."
  ],
  source:"5.8 a); 7.7; 7.8; 10.4"
 },
 intervention:{
  key:"intervention",
  meaning:"Cuando los resultados de la evaluación muestran que se requieren controles, la empresa debe implementar un programa específico; no basta con identificar el riesgo.",
  normative:[
   "Las acciones de control deben instrumentarse mediante un programa cuando los resultados de la evaluación así lo determinen (8.3).",
   "El programa debe identificar áreas/trabajadores comprendidos, tipo de medidas, fechas, control de avances, evaluación posterior cuando corresponda y responsable (8.4).",
   "Las medidas se determinan según el nivel aplicable: organizacional, grupal o individual (8.5).",
   "La empresa debe conservar registro de las medidas de control adoptadas cuando correspondan (5.8 b)."
  ],
  steps:[
   "Revisar el informe para identificar factores y áreas que requieren intervención.",
   "Priorizar medidas organizacionales y grupales; reservar atención individual a instancias autorizadas.",
   "Describir acciones, responsables, áreas y fechas concretas.",
   "Implementar y registrar avances; verificar posteriormente si se redujo la exposición.",
   "Actualizar el programa según resultados de seguimiento."
  ],
  tasks:[
   {id:"intervention_findings",title:"Relacionar el programa con hallazgos de evaluación",help:"Especificar motivo y áreas afectadas sin identificar personas."},
   {id:"intervention_actions",title:"Definir medidas organizacionales y grupales",help:"Determinar las medidas conforme al nivel de intervención que proceda."},
   {id:"intervention_dates",title:"Asignar responsables, áreas y fechas",help:"Verificar los rubros que pide 8.4."},
   {id:"intervention_progress",title:"Controlar avances y evidencia de ejecución",help:"Minutas, constancias, procedimientos o cambios aplicados."},
   {id:"intervention_evaluation",title:"Realizar evaluación posterior cuando corresponda",help:"Observar efectividad de las medidas adoptadas."}
  ],
  evidence:[
   "Programa de intervención con los seis elementos del numeral 8.4.",
   "Matriz de actividades, responsables, áreas y fechas.",
   "Evidencia de ejecución y controles de avance.",
   "Seguimiento/evaluación de resultados posteriores cuando corresponda."
  ],
  monitoring:[
   "Actualizar progreso de medidas conforme al calendario acordado.",
   "Documentar retrasos y decisiones de ajuste del programa.",
   "Comprobar si fueron necesarias nuevas medidas según el resultado posterior."
  ],
  warnings:["No registrar expedientes clínicos, síntomas ni nombres de personas intervenidas en este compendio general."],
  source:"5.4; 5.8 b); 8.3–8.5"
 }
};
export function nom035EvidenceGuide(key:Nom035RequirementKey):Nom035GuideCard{
 return NOM035_EVIDENCE_GUIDES[key];
}
export function nom035GuideTasks(key:Nom035RequirementKey){
 return NOM035_EVIDENCE_GUIDES[key].tasks;
}
