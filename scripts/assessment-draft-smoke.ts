import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import {
  ASSESSMENT_DRAFT_MAX_AGE_MS,
  readAssessmentDraft,
  serializeAssessmentDraft,
  selectUnconfirmedAssessmentResponses,
} from "../lib/assessment-draft";

const questionId = "11111111-1111-4111-8111-111111111111";
const now = Date.UTC(2026, 9, 20, 21, 0, 0);
const responses = {
  [questionId]: { numeric_value: 2, text_value: "", is_not_observed: false },
};

const serialized = serializeAssessmentDraft(responses, now);
assert.deepEqual(readAssessmentDraft(serialized, now + 1000), responses);
assert.deepEqual(
  readAssessmentDraft(serialized, now + ASSESSMENT_DRAFT_MAX_AGE_MS),
  responses,
);
assert.equal(
  readAssessmentDraft(serialized, now + ASSESSMENT_DRAFT_MAX_AGE_MS + 1),
  null,
  "No recuperar información almacenada por más de 24 horas",
);
assert.equal(readAssessmentDraft("not-json", now), null);
assert.equal(readAssessmentDraft(JSON.stringify({
  version: 1, savedAt: now, responses: { [questionId]: { numeric_value: "no", text_value: "", is_not_observed: false } },
}), now), null, "No recuperar borradores con respuestas inválidas");
assert.equal(readAssessmentDraft(JSON.stringify({
  version: 1, savedAt: now, responses: { "invalid-id": responses[questionId] },
}), now), null, "No recuperar identificadores inválidos");
assert.equal(readAssessmentDraft(serialized, now - 70000), null, "Rechazar reloj futuro");
assert.equal(readAssessmentDraft(null), null);

const q2 = "22222222-2222-4222-8222-222222222222";
const answer2 = { numeric_value: 5, text_value: "", is_not_observed: false };
const filtered = selectUnconfirmedAssessmentResponses(
  { ...responses, [q2]: answer2 },
  new Set([questionId]),
);
assert.deepEqual(filtered, { [q2]: answer2 }, "Nunca respaldar respuestas confirmadas.");
assert.deepEqual(readAssessmentDraft(serializeAssessmentDraft(filtered, now), now), filtered);

const client = readFileSync("app/e/[token]/assessment-client.tsx", "utf8");
assert.match(client, /readAssessmentDraft\(raw\)/);
assert.match(client, /serializeAssessmentDraft\\(unsaved\\)/);
assert.match(client, /selectUnconfirmedAssessmentResponses\\(responses, savedQuestionIds\\)/);
assert.match(client, /window\\.localStorage\\.removeItem\\(key\\)/);
assert.doesNotMatch(client, /serializeAssessmentDraft\\(responses\\)/);
assert.match(client, /saved\.delete\(questionId\)/, "Las respuestas locales no deben figurar como guardadas en el servidor");
assert.match(client, /window\.localStorage\.removeItem\(draftKey\)/, "Borrar borradores tras el cierre");
assert.match(client, /data\.assignment\.status === "completed"/);
assert.match(client, /dispositivos compartidos/, "Avisar que se guardan datos en este dispositivo");
console.log("ASSESSMENT_DRAFT_QA_OK: recuperar, validar, caducar y limpiar borradores");
