/** NOM-035-STPS-2018, Guía de Referencia I (ejemplo oficial).
 * Source: https://sidof.segob.gob.mx/notas/docFuente/5541828
 * GR.I: II >= 1 affirmative, III >= 3, or IV >= 2, only if section I is "Sí".
 * This screening is not a diagnosis. The employer's identification and referral
 * workflow needs a separate, restricted clinical/occupational-health procedure.
 */
export type Nom035Guide1Section="II"|"III"|"IV";
export type Nom035Guide1Question={
 code:string;section:Nom035Guide1Section;question:string;
};
export const GUIDE1_EVENT_QUESTION=
 "¿Ha presenciado o sufrido alguna vez, durante o con motivo del trabajo un acontecimiento como los siguientes?";
export const GUIDE1_EVENT_EXAMPLES=[
 "Accidente que tenga como consecuencia la muerte, la pérdida de un miembro o una lesión grave",
 "Asaltos; actos violentos que derivaron en lesiones graves; secuestro; amenazas",
 "Cualquier otro que ponga en riesgo su vida o salud, y/o la de otras personas"
] as const;
export const GUIDE1_QUESTIONS:readonly Nom035Guide1Question[]=[
 {code:"II1",section:"II",question:"¿Ha tenido recuerdos recurrentes sobre el acontecimiento que le provocan malestares?"},
 {code:"II2",section:"II",question:"¿Ha tenido sueños de carácter recurrente sobre el acontecimiento, que le producen malestar?"},
 {code:"III1",section:"III",question:"¿Se ha esforzado por evitar todo tipo de sentimientos, conversaciones o situaciones que le puedan recordar el acontecimiento?"},
 {code:"III2",section:"III",question:"¿Se ha esforzado por evitar todo tipo de actividades, lugares o personas que motivan recuerdos del acontecimiento?"},
 {code:"III3",section:"III",question:"¿Ha tenido dificultad para recordar alguna parte importante del evento?"},
 {code:"III4",section:"III",question:"¿Ha disminuido su interés en sus actividades cotidianas?"},
 {code:"III5",section:"III",question:"¿Se ha sentido usted alejado o distante de los demás?"},
 {code:"III6",section:"III",question:"¿Ha notado que tiene dificultad para expresar sus sentimientos?"},
 {code:"III7",section:"III",question:"¿Ha tenido la impresión de que su vida se va a acortar, que va a morir antes que otras personas o que tiene un futuro limitado?"},
 {code:"IV1",section:"IV",question:"¿Ha tenido usted dificultades para dormir?"},
 {code:"IV2",section:"IV",question:"¿Ha estado particularmente irritable o le han dado arranques de coraje?"},
 {code:"IV3",section:"IV",question:"¿Ha tenido dificultad para concentrarse?"},
 {code:"IV4",section:"IV",question:"¿Ha estado nervioso o constantemente en alerta?"},
 {code:"IV5",section:"IV",question:"¿Se ha sobresaltado fácilmente por cualquier cosa?"}
] as const;
export const GUIDE1_SECTION_NAMES:Record<Nom035Guide1Section,string>={
 II:"Recuerdos persistentes sobre el acontecimiento · último mes",
 III:"Esfuerzo por evitar circunstancias parecidas · último mes",
 IV:"Afectación · último mes"
};
const EXPECTED_CODES=new Set(GUIDE1_QUESTIONS.map(q=>q.code));
/** Client-side preview only. The authoritative computation lives in a PostgreSQL RPC. */
export function scoreNom035Guide1(exposed:boolean,answers:Record<string,boolean>){
 if(!exposed){
  if(Object.keys(answers).length)throw Error("No corresponden preguntas complementarias");
  return {needsReferral:false,exposure:false};
 }
 if(Object.keys(answers).length!==14||
    Object.keys(answers).some(k=>!EXPECTED_CODES.has(k)||typeof answers[k]!=="boolean"))
  throw Error("El cuestionario de seguimiento no está completo");
 const yes=(section:Nom035Guide1Section)=>
  GUIDE1_QUESTIONS.filter(q=>q.section===section&&answers[q.code]).length;
 return {needsReferral:yes("II")>=1||yes("III")>=3||yes("IV")>=2,exposure:true};
}
