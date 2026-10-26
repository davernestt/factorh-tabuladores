/**
 * Adapta el texto editorial de instrumentos PDL a la empresa destinataria.
 * Nunca modifica el banco histórico ni las respuestas almacenadas.
 */
function escapedLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function adaptPdlCopy(
  value: string | null,
  targetOrganizationName: string,
  sourceOrganizationName: string | null = null,
): string | null {
  if (!value) return value;
  const target = targetOrganizationName.trim();
  if (!target) return value;

  let result = value.replace(/\{\{\s*empresa\s*\}\}/gi, target);
  const source = sourceOrganizationName?.trim() ?? "";
  if (source && source.toLocaleLowerCase("es") !== target.toLocaleLowerCase("es")
    && !/^facto\s?rh$/i.test(source)) {
    result = result.replace(new RegExp(escapedLiteral(source), "gi"), target);
    const abbreviated = source.replace(/^grupo\s+/i, "").trim();
    if (abbreviated && abbreviated !== source) {
      result = result.replace(new RegExp("\\b" + escapedLiteral(abbreviated) + "\\b", "gi"), target);
    }
  }

  // Formulaciones heredadas del primer proyecto (Colbert) que también
  // aparecen en cuestionarios originalmente copiados a FactoRH.
  result = result.replace(/\b(?:Grupo\s+)?Colbert\b/gi, target);
  result = result.replace(/\bAlberto\b/gi, "la Dirección General");
  return result;
}
