/** Preguntas oficiales NOM-035-STPS-2018, Guías de Referencia II y III.
 * Fuente: https://sidof.segob.gob.mx/notas/docFuente/5541828
 * Banco congelado v1, transcrito de las tablas del DOF el 2026-10-12.
 * Las respuestas negativas/positivas, categorías y dominios requieren control de versión.
 */
export type Nom035Guide="II"|"III";
export type Nom035Gate="clients"|"supervisor"|null;
export type Nom035Question={position:number;prompt:string;category:string;domain:string;conditional:Nom035Gate;positive:boolean};
export const NOM035_OFFICIAL_BANK:Record<Nom035Guide,readonly Nom035Question[]>={
  "II": [
    {
      "position": 1,
      "prompt": "Mi trabajo me exige hacer mucho esfuerzo físico",
      "category": "Ambiente de trabajo",
      "domain": "Condiciones en el ambiente de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 2,
      "prompt": "Me preocupa sufrir un accidente en mi trabajo",
      "category": "Ambiente de trabajo",
      "domain": "Condiciones en el ambiente de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 3,
      "prompt": "Considero que las actividades que realizo son peligrosas",
      "category": "Ambiente de trabajo",
      "domain": "Condiciones en el ambiente de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 4,
      "prompt": "Por la cantidad de trabajo que tengo debo quedarme tiempo adicional a mi turno",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 5,
      "prompt": "Por la cantidad de trabajo que tengo debo trabajar sin parar",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 6,
      "prompt": "Considero que es necesario mantener un ritmo de trabajo acelerado",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 7,
      "prompt": "Mi trabajo exige que esté muy concentrado",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 8,
      "prompt": "Mi trabajo requiere que memorice mucha información",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 9,
      "prompt": "Mi trabajo exige que atienda varios asuntos al mismo tiempo",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 10,
      "prompt": "En mi trabajo soy responsable de cosas de mucho valor",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 11,
      "prompt": "Respondo ante mi jefe por los resultados de toda mi área de trabajo",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 12,
      "prompt": "En mi trabajo me dan órdenes contradictorias",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 13,
      "prompt": "Considero que en mi trabajo me piden hacer cosas innecesarias",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 14,
      "prompt": "Trabajo horas extras más de tres veces a la semana",
      "category": "Organización del tiempo de trabajo",
      "domain": "Jornada de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 15,
      "prompt": "Mi trabajo me exige laborar en días de descanso, festivos o fines de semana",
      "category": "Organización del tiempo de trabajo",
      "domain": "Jornada de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 16,
      "prompt": "Considero que el tiempo en el trabajo es mucho y perjudica mis actividades familiares o personales",
      "category": "Organización del tiempo de trabajo",
      "domain": "Interferencia en la relación trabajo-familia",
      "conditional": null,
      "positive": false
    },
    {
      "position": 17,
      "prompt": "Pienso en las actividades familiares o personales cuando estoy en mi trabajo",
      "category": "Organización del tiempo de trabajo",
      "domain": "Interferencia en la relación trabajo-familia",
      "conditional": null,
      "positive": false
    },
    {
      "position": 18,
      "prompt": "Mi trabajo permite que desarrolle nuevas habilidades",
      "category": "Factores propios de la actividad",
      "domain": "Falta de control sobre el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 19,
      "prompt": "En mi trabajo puedo aspirar a un mejor puesto",
      "category": "Factores propios de la actividad",
      "domain": "Falta de control sobre el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 20,
      "prompt": "Durante mi jornada de trabajo puedo tomar pausas cuando las necesito",
      "category": "Factores propios de la actividad",
      "domain": "Falta de control sobre el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 21,
      "prompt": "Puedo decidir la velocidad a la que realizo mis actividades en mi trabajo",
      "category": "Factores propios de la actividad",
      "domain": "Falta de control sobre el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 22,
      "prompt": "Puedo cambiar el orden de las actividades que realizo en mi trabajo",
      "category": "Factores propios de la actividad",
      "domain": "Falta de control sobre el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 23,
      "prompt": "Me informan con claridad cuáles son mis funciones",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Liderazgo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 24,
      "prompt": "Me explican claramente los resultados que debo obtener en mi trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Liderazgo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 25,
      "prompt": "Me informan con quién puedo resolver problemas o asuntos de trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Liderazgo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 26,
      "prompt": "Me permiten asistir a capacitaciones relacionadas con mi trabajo",
      "category": "Factores propios de la actividad",
      "domain": "Falta de control sobre el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 27,
      "prompt": "Recibo capacitación útil para hacer mi trabajo",
      "category": "Factores propios de la actividad",
      "domain": "Falta de control sobre el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 28,
      "prompt": "Mi jefe tiene en cuenta mis puntos de vista y opiniones",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Liderazgo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 29,
      "prompt": "Mi jefe ayuda a solucionar los problemas que se presentan en el trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Liderazgo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 30,
      "prompt": "Puedo confiar en mis compañeros de trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Relaciones en el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 31,
      "prompt": "Cuando tenemos que realizar trabajo de equipo los compañeros colaboran",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Relaciones en el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 32,
      "prompt": "Mis compañeros de trabajo me ayudan cuando tengo dificultades",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Relaciones en el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 33,
      "prompt": "En mi trabajo puedo expresarme libremente sin interrupciones",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Violencia",
      "conditional": null,
      "positive": true
    },
    {
      "position": 34,
      "prompt": "Recibo críticas constantes a mi persona y/o trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Violencia",
      "conditional": null,
      "positive": false
    },
    {
      "position": 35,
      "prompt": "Recibo burlas, calumnias, difamaciones, humillaciones o ridiculizaciones",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Violencia",
      "conditional": null,
      "positive": false
    },
    {
      "position": 36,
      "prompt": "Se ignora mi presencia o se me excluye de las reuniones de trabajo y en la toma de decisiones",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Violencia",
      "conditional": null,
      "positive": false
    },
    {
      "position": 37,
      "prompt": "Se manipulan las situaciones de trabajo para hacerme parecer un mal trabajador",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Violencia",
      "conditional": null,
      "positive": false
    },
    {
      "position": 38,
      "prompt": "Se ignoran mis éxitos laborales y se atribuyen a otros trabajadores",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Violencia",
      "conditional": null,
      "positive": false
    },
    {
      "position": 39,
      "prompt": "Me bloquean o impiden las oportunidades que tengo para obtener ascenso o mejora en mi trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Violencia",
      "conditional": null,
      "positive": false
    },
    {
      "position": 40,
      "prompt": "He presenciado actos de violencia en mi centro de trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Violencia",
      "conditional": null,
      "positive": false
    },
    {
      "position": 41,
      "prompt": "Atiendo clientes o usuarios muy enojados",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": "clients",
      "positive": false
    },
    {
      "position": 42,
      "prompt": "Mi trabajo me exige atender personas muy necesitadas de ayuda o enfermas",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": "clients",
      "positive": false
    },
    {
      "position": 43,
      "prompt": "Para hacer mi trabajo debo demostrar sentimientos distintos a los míos",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": "clients",
      "positive": false
    },
    {
      "position": 44,
      "prompt": "Comunican tarde los asuntos de trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Relaciones en el trabajo",
      "conditional": "supervisor",
      "positive": false
    },
    {
      "position": 45,
      "prompt": "Dificultan el logro de los resultados del trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Relaciones en el trabajo",
      "conditional": "supervisor",
      "positive": false
    },
    {
      "position": 46,
      "prompt": "Ignoran las sugerencias para mejorar su trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Relaciones en el trabajo",
      "conditional": "supervisor",
      "positive": false
    }
  ],
  "III": [
    {
      "position": 1,
      "prompt": "El espacio donde trabajo me permite realizar mis actividades de manera segura e higiénica",
      "category": "Ambiente de trabajo",
      "domain": "Condiciones en el ambiente de trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 2,
      "prompt": "Mi trabajo me exige hacer mucho esfuerzo físico",
      "category": "Ambiente de trabajo",
      "domain": "Condiciones en el ambiente de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 3,
      "prompt": "Me preocupa sufrir un accidente en mi trabajo",
      "category": "Ambiente de trabajo",
      "domain": "Condiciones en el ambiente de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 4,
      "prompt": "Considero que en mi trabajo se aplican las normas de seguridad y salud en el trabajo",
      "category": "Ambiente de trabajo",
      "domain": "Condiciones en el ambiente de trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 5,
      "prompt": "Considero que las actividades que realizo son peligrosas",
      "category": "Ambiente de trabajo",
      "domain": "Condiciones en el ambiente de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 6,
      "prompt": "Por la cantidad de trabajo que tengo debo quedarme tiempo adicional a mi turno",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 7,
      "prompt": "Por la cantidad de trabajo que tengo debo trabajar sin parar",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 8,
      "prompt": "Considero que es necesario mantener un ritmo de trabajo acelerado",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 9,
      "prompt": "Mi trabajo exige que esté muy concentrado",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 10,
      "prompt": "Mi trabajo requiere que memorice mucha información",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 11,
      "prompt": "En mi trabajo tengo que tomar decisiones difíciles muy rápido",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 12,
      "prompt": "Mi trabajo exige que atienda varios asuntos al mismo tiempo",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 13,
      "prompt": "En mi trabajo soy responsable de cosas de mucho valor",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 14,
      "prompt": "Respondo ante mi jefe por los resultados de toda mi área de trabajo",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 15,
      "prompt": "En el trabajo me dan órdenes contradictorias",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 16,
      "prompt": "Considero que en mi trabajo me piden hacer cosas innecesarias",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 17,
      "prompt": "Trabajo horas extras más de tres veces a la semana",
      "category": "Organización del tiempo de trabajo",
      "domain": "Jornada de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 18,
      "prompt": "Mi trabajo me exige laborar en días de descanso, festivos o fines de semana",
      "category": "Organización del tiempo de trabajo",
      "domain": "Jornada de trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 19,
      "prompt": "Considero que el tiempo en el trabajo es mucho y perjudica mis actividades familiares o personales",
      "category": "Organización del tiempo de trabajo",
      "domain": "Interferencia en la relación trabajo-familia",
      "conditional": null,
      "positive": false
    },
    {
      "position": 20,
      "prompt": "Debo atender asuntos de trabajo cuando estoy en casa",
      "category": "Organización del tiempo de trabajo",
      "domain": "Interferencia en la relación trabajo-familia",
      "conditional": null,
      "positive": false
    },
    {
      "position": 21,
      "prompt": "Pienso en las actividades familiares o personales cuando estoy en mi trabajo",
      "category": "Organización del tiempo de trabajo",
      "domain": "Interferencia en la relación trabajo-familia",
      "conditional": null,
      "positive": false
    },
    {
      "position": 22,
      "prompt": "Pienso que mis responsabilidades familiares afectan mi trabajo",
      "category": "Organización del tiempo de trabajo",
      "domain": "Interferencia en la relación trabajo-familia",
      "conditional": null,
      "positive": false
    },
    {
      "position": 23,
      "prompt": "Mi trabajo permite que desarrolle nuevas habilidades",
      "category": "Factores propios de la actividad",
      "domain": "Falta de control sobre el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 24,
      "prompt": "En mi trabajo puedo aspirar a un mejor puesto",
      "category": "Factores propios de la actividad",
      "domain": "Falta de control sobre el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 25,
      "prompt": "Durante mi jornada de trabajo puedo tomar pausas cuando las necesito",
      "category": "Factores propios de la actividad",
      "domain": "Falta de control sobre el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 26,
      "prompt": "Puedo decidir cuánto trabajo realizo durante la jornada laboral",
      "category": "Factores propios de la actividad",
      "domain": "Falta de control sobre el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 27,
      "prompt": "Puedo decidir la velocidad a la que realizo mis actividades en mi trabajo",
      "category": "Factores propios de la actividad",
      "domain": "Falta de control sobre el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 28,
      "prompt": "Puedo cambiar el orden de las actividades que realizo en mi trabajo",
      "category": "Factores propios de la actividad",
      "domain": "Falta de control sobre el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 29,
      "prompt": "Los cambios que se presentan en mi trabajo dificultan mi labor",
      "category": "Factores propios de la actividad",
      "domain": "Falta de control sobre el trabajo",
      "conditional": null,
      "positive": false
    },
    {
      "position": 30,
      "prompt": "Cuando se presentan cambios en mi trabajo se tienen en cuenta mis ideas o aportaciones",
      "category": "Factores propios de la actividad",
      "domain": "Falta de control sobre el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 31,
      "prompt": "Me informan con claridad cuáles son mis funciones",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Liderazgo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 32,
      "prompt": "Me explican claramente los resultados que debo obtener en mi trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Liderazgo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 33,
      "prompt": "Me explican claramente los objetivos de mi trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Liderazgo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 34,
      "prompt": "Me informan con quién puedo resolver problemas o asuntos de trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Liderazgo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 35,
      "prompt": "Me permiten asistir a capacitaciones relacionadas con mi trabajo",
      "category": "Factores propios de la actividad",
      "domain": "Falta de control sobre el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 36,
      "prompt": "Recibo capacitación útil para hacer mi trabajo",
      "category": "Factores propios de la actividad",
      "domain": "Falta de control sobre el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 37,
      "prompt": "Mi jefe ayuda a organizar mejor el trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Liderazgo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 38,
      "prompt": "Mi jefe tiene en cuenta mis puntos de vista y opiniones",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Liderazgo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 39,
      "prompt": "Mi jefe me comunica a tiempo la información relacionada con el trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Liderazgo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 40,
      "prompt": "La orientación que me da mi jefe me ayuda a realizar mejor mi trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Liderazgo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 41,
      "prompt": "Mi jefe ayuda a solucionar los problemas que se presentan en el trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Liderazgo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 42,
      "prompt": "Puedo confiar en mis compañeros de trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Relaciones en el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 43,
      "prompt": "Entre compañeros solucionamos los problemas de trabajo de forma respetuosa",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Relaciones en el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 44,
      "prompt": "En mi trabajo me hacen sentir parte del grupo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Relaciones en el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 45,
      "prompt": "Cuando tenemos que realizar trabajo de equipo los compañeros colaboran",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Relaciones en el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 46,
      "prompt": "Mis compañeros de trabajo me ayudan cuando tengo dificultades",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Relaciones en el trabajo",
      "conditional": null,
      "positive": true
    },
    {
      "position": 47,
      "prompt": "Me informan sobre lo que hago bien en mi trabajo",
      "category": "Entorno organizacional",
      "domain": "Reconocimiento del desempeño",
      "conditional": null,
      "positive": true
    },
    {
      "position": 48,
      "prompt": "La forma como evalúan mi trabajo en mi centro de trabajo me ayuda a mejorar mi desempeño",
      "category": "Entorno organizacional",
      "domain": "Reconocimiento del desempeño",
      "conditional": null,
      "positive": true
    },
    {
      "position": 49,
      "prompt": "En mi centro de trabajo me pagan a tiempo mi salario",
      "category": "Entorno organizacional",
      "domain": "Reconocimiento del desempeño",
      "conditional": null,
      "positive": true
    },
    {
      "position": 50,
      "prompt": "El pago que recibo es el que merezco por el trabajo que realizo",
      "category": "Entorno organizacional",
      "domain": "Reconocimiento del desempeño",
      "conditional": null,
      "positive": true
    },
    {
      "position": 51,
      "prompt": "Si obtengo los resultados esperados en mi trabajo me recompensan o reconocen",
      "category": "Entorno organizacional",
      "domain": "Reconocimiento del desempeño",
      "conditional": null,
      "positive": true
    },
    {
      "position": 52,
      "prompt": "Las personas que hacen bien el trabajo pueden crecer laboralmente",
      "category": "Entorno organizacional",
      "domain": "Reconocimiento del desempeño",
      "conditional": null,
      "positive": true
    },
    {
      "position": 53,
      "prompt": "Considero que mi trabajo es estable",
      "category": "Entorno organizacional",
      "domain": "Insuficiente sentido de pertenencia e inestabilidad",
      "conditional": null,
      "positive": true
    },
    {
      "position": 54,
      "prompt": "En mi trabajo existe continua rotación de personal",
      "category": "Entorno organizacional",
      "domain": "Insuficiente sentido de pertenencia e inestabilidad",
      "conditional": null,
      "positive": false
    },
    {
      "position": 55,
      "prompt": "Siento orgullo de laborar en este centro de trabajo",
      "category": "Entorno organizacional",
      "domain": "Insuficiente sentido de pertenencia e inestabilidad",
      "conditional": null,
      "positive": true
    },
    {
      "position": 56,
      "prompt": "Me siento comprometido con mi trabajo",
      "category": "Entorno organizacional",
      "domain": "Insuficiente sentido de pertenencia e inestabilidad",
      "conditional": null,
      "positive": true
    },
    {
      "position": 57,
      "prompt": "En mi trabajo puedo expresarme libremente sin interrupciones",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Violencia",
      "conditional": null,
      "positive": true
    },
    {
      "position": 58,
      "prompt": "Recibo críticas constantes a mi persona y/o trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Violencia",
      "conditional": null,
      "positive": false
    },
    {
      "position": 59,
      "prompt": "Recibo burlas, calumnias, difamaciones, humillaciones o ridiculizaciones",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Violencia",
      "conditional": null,
      "positive": false
    },
    {
      "position": 60,
      "prompt": "Se ignora mi presencia o se me excluye de las reuniones de trabajo y en la toma de decisiones",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Violencia",
      "conditional": null,
      "positive": false
    },
    {
      "position": 61,
      "prompt": "Se manipulan las situaciones de trabajo para hacerme parecer un mal trabajador",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Violencia",
      "conditional": null,
      "positive": false
    },
    {
      "position": 62,
      "prompt": "Se ignoran mis éxitos laborales y se atribuyen a otros trabajadores",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Violencia",
      "conditional": null,
      "positive": false
    },
    {
      "position": 63,
      "prompt": "Me bloquean o impiden las oportunidades que tengo para obtener ascenso o mejora en mi trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Violencia",
      "conditional": null,
      "positive": false
    },
    {
      "position": 64,
      "prompt": "He presenciado actos de violencia en mi centro de trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Violencia",
      "conditional": null,
      "positive": false
    },
    {
      "position": 65,
      "prompt": "Atiendo clientes o usuarios muy enojados",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": "clients",
      "positive": false
    },
    {
      "position": 66,
      "prompt": "Mi trabajo me exige atender personas muy necesitadas de ayuda o enfermas",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": "clients",
      "positive": false
    },
    {
      "position": 67,
      "prompt": "Para hacer mi trabajo debo demostrar sentimientos distintos a los míos",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": "clients",
      "positive": false
    },
    {
      "position": 68,
      "prompt": "Mi trabajo me exige atender situaciones de violencia",
      "category": "Factores propios de la actividad",
      "domain": "Carga de trabajo",
      "conditional": "clients",
      "positive": false
    },
    {
      "position": 69,
      "prompt": "Comunican tarde los asuntos de trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Relaciones en el trabajo",
      "conditional": "supervisor",
      "positive": false
    },
    {
      "position": 70,
      "prompt": "Dificultan el logro de los resultados del trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Relaciones en el trabajo",
      "conditional": "supervisor",
      "positive": false
    },
    {
      "position": 71,
      "prompt": "Cooperan poco cuando se necesita",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Relaciones en el trabajo",
      "conditional": "supervisor",
      "positive": false
    },
    {
      "position": 72,
      "prompt": "Ignoran las sugerencias para mejorar su trabajo",
      "category": "Liderazgo y relaciones en el trabajo",
      "domain": "Relaciones en el trabajo",
      "conditional": "supervisor",
      "positive": false
    }
  ]
} as const;
export const NOM035_ANSWER_OPTIONS=["Siempre","Casi siempre","Algunas veces","Casi nunca","Nunca"] as const;
export const NOM035_OFFICIAL_SOURCE="https://sidof.segob.gob.mx/notas/docFuente/5541828";
export function nom035OfficialBank(guide:Nom035Guide){
 return NOM035_OFFICIAL_BANK[guide];
}
