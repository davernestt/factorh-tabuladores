import type { CommentRow, ResultRater } from "./feedback360-report";

/**
 * Comentarios cualitativos liberables de un ciclo cerrado.
 * Una persona de pares o colaboradores no puede quedar expuesta por escribir
 * un comentario cuando solo hay una o dos respuestas completadas en su grupo.
 * Mantener las respuestas sin mostrar nombres ni correos.
 */
export function safe360Comments(
  raters: ResultRater[],
  comments: CommentRow[],
  cycleClosed: boolean,
): CommentRow[] {
  if (!cycleClosed) return [];
  const completed = raters.filter(r => r.status === "completed");
  const counts = {
    peer: completed.filter(r => r.role === "peer").length,
    report: completed.filter(r => r.role === "report").length,
  };
  const byId = new Map(completed.map(r => [r.id, r]));
  return comments.filter(c => {
    const role = byId.get(c.rater_id)?.role;
    if (!role || !c.comment?.trim()) return false;
    if (role === "peer" || role === "report") return counts[role] >= 3;
    return role === "self" || role === "manager";
  });
}
