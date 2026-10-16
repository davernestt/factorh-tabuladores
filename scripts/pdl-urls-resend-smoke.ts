import {strict as assert} from "node:assert";
import {readFileSync} from "node:fs";
import {buildPdlPublicUrl,PUBLIC_PDL_ORIGIN} from "../lib/pdl-public-url";
const copy=readFileSync("app/protected/copy-assessment-link.tsx","utf8");
const create=readFileSync("app/protected/nueva-evaluacion/new-assessment-form.tsx","utf8");
const list=readFileSync("app/protected/page.tsx","utf8");
const detail=readFileSync("app/protected/evaluaciones/[id]/page.tsx","utf8");
const resend=readFileSync("app/protected/resend-assessment-link.tsx","utf8");
assert.equal(buildPdlPublicUrl("/e/14309dde-ba3f-45c6-8214-38dc257d5b74"),
 `${PUBLIC_PDL_ORIGIN}/e/14309dde-ba3f-45c6-8214-38dc257d5b74`);
assert.equal(buildPdlPublicUrl("/p/14309dde-ba3f-45c6-8214-38dc257d5b74"),
 `${PUBLIC_PDL_ORIGIN}/p/14309dde-ba3f-45c6-8214-38dc257d5b74`);
assert.throws(()=>buildPdlPublicUrl("https://bad.example/"),/no es válida/);
assert.doesNotMatch(copy,/window\.location\.origin/);
assert.doesNotMatch(create,/window\.location\.origin/);
assert.match(copy,/buildPdlPublicUrl\(target\)/);
assert.match(create,/buildPdlPublicUrl\(path\)/);
assert.match(list,/<ResendAssessmentLink/);
assert.match(detail,/<ResendAssessmentLink/);
assert.match(list,/process\.public_token/);
assert.match(detail,/processData\.public_token/);
assert.match(list,/professionalGradesByAssignment/);
assert.match(list,/textAnsweredByAssignment/);
assert.match(resend,/Reenviar liga/);
assert.match(resend,/WhatsApp y Correo abren la aplicación/);
assert.doesNotMatch(resend,/fetch\(|\.insert\(|\.upsert\(/);
console.log("PDL_RESEND_VERIFIED: mismo token, host actual, sin crear asignaciones ni consumir créditos");
