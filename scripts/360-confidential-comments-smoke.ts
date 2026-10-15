import { strict as assert } from "node:assert";
import { safe360Comments } from "../lib/feedback360-confidential-comments";
import type { ResultRater, CommentRow } from "../lib/feedback360-report";

const raters: ResultRater[] = [
  {id:"s",role:"self",status:"completed"},
  {id:"j",role:"manager",status:"completed"},
  {id:"p1",role:"peer",status:"completed"},
  {id:"p2",role:"peer",status:"completed"},
  {id:"p3",role:"peer",status:"pending"},
  {id:"r1",role:"report",status:"completed"},
  {id:"r2",role:"report",status:"completed"},
  {id:"r3",role:"report",status:"completed"},
];
const comments: CommentRow[] = [
 {rater_id:"s",question_key:"strengths",comment:"Mi mayor fortaleza"},
 {rater_id:"j",question_key:"strengths",comment:"Fortaleza observada"},
 {rater_id:"p1",question_key:"improvements",comment:"Comentario par 1"},
 {rater_id:"p2",question_key:"improvements",comment:"Comentario par 2"},
 {rater_id:"p3",question_key:"improvements",comment:"Pendiente no autorizado"},
 {rater_id:"r1",question_key:"strengths",comment:"Comentario colaborador 1"},
 {rater_id:"r2",question_key:"strengths",comment:"Comentario colaborador 2"},
 {rater_id:"r3",question_key:"strengths",comment:"Comentario colaborador 3"},
 {rater_id:"desconocido",question_key:"strengths",comment:"Sin evaluador"},
 {rater_id:"s",question_key:"improvements",comment:"   "},
];
assert.deepEqual(safe360Comments(raters, comments, false), [], "No divulgar en ciclos abiertos");
const safe = safe360Comments(raters, comments, true);
assert.deepEqual(safe.map(x=>x.rater_id),["s","j","r1","r2","r3"],"Ocultar pares con menos de 3, pendientes y respuestas vacías");
const completedThird = raters.map(r=>r.id==="p3"?{...r,status:"completed"}:r);
assert.equal(safe360Comments(completedThird, comments, true).filter(x=>x.rater_id.startsWith("p")).length,3);
console.log("360_CONFIDENTIAL_COMMENTS_OK: grupos pequeños, pendientes y ciclos abiertos protegidos.");
