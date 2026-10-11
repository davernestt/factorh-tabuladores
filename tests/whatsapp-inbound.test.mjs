import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { parseMessages, responseFor, verifySignature } from "../lib/whatsapp/core.mjs";
test("signed payload accepted, altered payload rejected", () => {
 const data = JSON.stringify({ object: "whatsapp_business_account" });
 const signature = "sha256=" + createHmac("sha256", "secret").update(data).digest("hex");
 assert.equal(verifySignature(data, signature, "secret"), true);
 assert.equal(verifySignature(data+" ", signature, "secret"), false);
 assert.equal(verifySignature(data, "invalid", "secret"), false);
});
test("one inbound message parsed; status-only ignored", () => {
 const base = { object: "whatsapp_business_account", entry: [{ changes: [{
 field: "messages", value: { metadata: { phone_number_id: "123" },
 messages: [{ id: "wamid.123", from: "5213312345678", type: "text", text: { body: "2" } }] }
 }] }] };
 assert.equal(parseMessages(base).length, 1);
 assert.equal(parseMessages(base)[0].text_body, "2");
 base.entry[0].changes[0].value.messages = [];
 assert.equal(parseMessages(base).length, 0);
});
test("FactoRH menu and candidate option", () => {
 assert.match(responseFor("hola"), /FactoRH/);
 assert.match(responseFor("2"), /reclutador/);
});
