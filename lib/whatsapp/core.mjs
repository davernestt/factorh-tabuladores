import { createHmac, timingSafeEqual } from "node:crypto";

export function verifySignature(rawBody, header, secret) {
  if (!secret || typeof header !== "string" || !header.startsWith("sha256=")) return false;
  const actual = header.slice(7);
  if (!/^[0-9a-f]{64}$/i.test(actual)) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}
export function parseMessages(payload) {
  const result = [];
  if (payload?.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) return result;
  for (const entry of payload.entry) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      if (change?.field !== "messages") continue;
      const v = change?.value;
      if (typeof v?.metadata?.phone_number_id !== "string" || !Array.isArray(v?.messages)) continue;
      const names = new Map((Array.isArray(v.contacts) ? v.contacts : [])
        .filter(x => typeof x?.wa_id === "string")
        .map(x => [x.wa_id, x?.profile?.name || null]));
      for (const msg of v.messages) {
        if (typeof msg?.id !== "string" || typeof msg?.from !== "string") continue;
        result.push({
          message_id: msg.id.slice(0, 255),
          phone_number_id: v.metadata.phone_number_id.slice(0, 100),
          from_phone: msg.from.slice(0, 40),
          profile_name: typeof names.get(msg.from) === "string" ? names.get(msg.from).slice(0, 200) : null,
          message_type: typeof msg.type === "string" ? msg.type.slice(0, 40) : "unknown",
          text_body: msg.type === "text" && typeof msg?.text?.body === "string" ? msg.text.body.slice(0, 4000) : null
        });
        if (result.length >= 150) return result;
      }
    }
  }
  return result;
}
const menu = "¡Hola! Bienvenido a FactoRH.\n1. Servicios para empresas\n2. Vacantes y postulaciones\n3. Atención a clientes\n4. Hablar con un asesor\nResponde con una opción.";
const answers = {
  "1": "¿Qué servicio necesitas: psicometrías, reclutamiento, 360°, estudios socioeconómicos u otro? Un asesor revisará tu solicitud.",
  "2": "Un reclutador continuará tu atención. No envíes datos sensibles por este chat.",
  "3": "Cuéntanos qué apoyo necesitas con tu servicio de FactoRH. Un asesor dará seguimiento.",
  "4": "Tu solicitud de atención humana quedó registrada."
};
export function responseFor(text) {
  const choice = typeof text === "string" ? text.trim() : "";
  return answers[choice] || menu;
}
