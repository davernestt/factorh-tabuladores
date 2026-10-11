import { createClient } from "@supabase/supabase-js";
import { parseMessages, responseFor, verifySignature } from "../../../../lib/whatsapp/core.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const p = new URL(request.url).searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!token || p.get("hub.mode") !== "subscribe" || p.get("hub.verify_token") !== token || !p.get("hub.challenge"))
    return new Response("Unauthorized", { status: 403 });
  return new Response(p.get("hub.challenge"), { status: 200, headers: { "content-type": "text/plain" } });
}
export async function POST(request) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 503 });
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > 1048576) return new Response("Payload too large", { status: 413 });
  if (!verifySignature(raw, request.headers.get("x-hub-signature-256"), secret))
    return new Response("Invalid signature", { status: 401 });
  let payload;
  try { payload = JSON.parse(raw); }
  catch { return new Response("Invalid JSON", { status: 400 }); }
  const messages = parseMessages(payload);
  if (!messages.length) return Response.json({ received: true });
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return new Response("Storage not configured", { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const msg of messages) {
    const { error } = await db.from("wa_inbound_events")
      .upsert({ ...msg, source_business: "factorh" }, { onConflict: "message_id", ignoreDuplicates: true });
    if (error) return new Response("Temporary storage error", { status: 503 });
    const { error: queueError } = await db.from("wa_outbox")
      .upsert({ source_message_id: msg.message_id, source_business: "factorh",
        phone_number_id: msg.phone_number_id, to_phone: msg.from_phone,
        text_body: responseFor(msg.text_body), status: "pending" },
        { onConflict: "source_message_id", ignoreDuplicates: true });
    if (queueError) return new Response("Temporary queue error", { status: 503 });
  }
  // Deliberately no outbound send: build a safe sender with template, 24h and delivery checks first.
  return Response.json({ received: true });
}
