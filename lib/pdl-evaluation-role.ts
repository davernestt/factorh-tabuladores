export type PdlRelationship = "self" | "manager" | "interviewer";

export function relationshipForAssessmentType(assessmentType: string): PdlRelationship {
  if (assessmentType === "leadership_direction") return "manager";
  if (assessmentType === "leadership_interview") return "interviewer";
  return "self";
}

export function relationshipLabel(relationship: string) {
  if (relationship === "manager") return "Jefe inmediato";
  if (relationship === "interviewer") return "Entrevistador";
  return "Autoevaluación";
}

export function isExternalRelationship(relationship: string) {
  return relationship === "manager" || relationship === "interviewer";
}

export function isExternalAssessmentType(assessmentType: string) {
  return relationshipForAssessmentType(assessmentType) !== "self";
}
