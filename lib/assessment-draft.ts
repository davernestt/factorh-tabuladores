// Borradores temporales para recuperar respuestas si falla la red.
// El navegador es el único lugar donde se guarda esta copia; nunca se registra en logs.
export const ASSESSMENT_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type AssessmentDraftResponse = {
  numeric_value: number | null;
  text_value: string;
  is_not_observed: boolean;
};

type DraftEnvelope = {
  version: 1;
  savedAt: number;
  responses: Record<string, AssessmentDraftResponse>;
};

function validResponse(value: unknown): value is AssessmentDraftResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const response = value as Partial<AssessmentDraftResponse>;
  return (response.numeric_value === null ||
    (typeof response.numeric_value === "number" && Number.isFinite(response.numeric_value))) &&
    typeof response.text_value === "string" && response.text_value.length <= 12000 &&
    typeof response.is_not_observed === "boolean";
}

export function serializeAssessmentDraft(
  responses: Record<string, AssessmentDraftResponse>,
  now = Date.now(),
): string {
  return JSON.stringify({ version: 1, savedAt: now, responses } satisfies DraftEnvelope);
}

export function readAssessmentDraft(
  raw: string | null,
  now = Date.now(),
): Record<string, AssessmentDraftResponse> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DraftEnvelope>;
    if (parsed.version !== 1 ||
      typeof parsed.savedAt !== "number" ||
      !Number.isFinite(parsed.savedAt) ||
      parsed.savedAt > now + 60000 ||
      now - parsed.savedAt > ASSESSMENT_DRAFT_MAX_AGE_MS ||
      !parsed.responses || typeof parsed.responses !== "object" ||
      Array.isArray(parsed.responses)) return null;
    const entries = Object.entries(parsed.responses);
    if (entries.length > 200 || entries.some(([id, response]) =>
      !/^[0-9a-f-]{36}$/i.test(id) || !validResponse(response))) return null;
    return parsed.responses as Record<string, AssessmentDraftResponse>;
  } catch {
    return null;
  }
}

/** Solo las respuestas que el servidor todavía no confirmó entran al borrador. */
export function selectUnconfirmedAssessmentResponses(
  responses: Record<string, AssessmentDraftResponse>,
  confirmedQuestionIds: ReadonlySet<string>,
): Record<string, AssessmentDraftResponse> {
  return Object.fromEntries(
    Object.entries(responses).filter(([questionId]) => !confirmedQuestionIds.has(questionId)),
  );
}

/** Confirma los valores que el servidor realmente devuelve después de un guardado. */
export function verifyPersistedAssessmentAnswers(
  expected: Array<{question_id: string; numeric_value: number | null; text_value: string; is_not_observed: boolean}>,
  persisted: Array<{question_id: string; numeric_value: number | string | null; text_value: string | null; is_not_observed: boolean}>,
): string[] {
  const storedById = new Map(persisted.map(response => [response.question_id, response]));
  return expected.filter(answer => {
    const saved = storedById.get(answer.question_id);
    if (!saved) return false;
    const numericMatches = answer.numeric_value === null
      ? saved.numeric_value === null
      : saved.numeric_value !== null && Number(saved.numeric_value) === answer.numeric_value;
    return numericMatches &&
      (saved.text_value ?? "").trim() === answer.text_value.trim() &&
      saved.is_not_observed === answer.is_not_observed;
  }).map(answer => answer.question_id);
}
