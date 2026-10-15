/** Presentación comercial: una solicitud no modifica una suscripción ni procesa pagos. */
export function feedback360PurchaseHref(organizationName?:string|null):string {
 const company=(organizationName||"Mi empresa").trim().slice(0,120);
 const subject=encodeURIComponent("Solicitar contratación Evaluación 360° · "+company);
 const body=encodeURIComponent(
  "Hola, equipo FactoRH.\n\n"+
  "Después de conocer la Evaluación 360°, me interesa contratar el módulo para "+company+".\n"+
  "Me gustaría recibir la propuesta comercial, condiciones y pasos para activar el servicio.\n\n"+
  "Gracias.");
 return "mailto:David@factorh.com.mx?subject="+subject+"&body="+body;
}
/** El CTA sólo corresponde a prospectos/clientes, jamás al panel propietario. */
export function show360Purchase(role:string,subscriptionStatus?:string|null,isAccessible=true):boolean {
 return role==="client" && !(subscriptionStatus==="active"&&isAccessible);
}
