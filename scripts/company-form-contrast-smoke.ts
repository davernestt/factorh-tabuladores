import {strict as assert} from "node:assert";
import {readFileSync} from "node:fs";
const src=readFileSync("app/protected/empresas/company-manager.tsx","utf8");
assert.match(src,/rounded-3xl bg-white text-neutral-900 shadow-2xl/,"El modal debe definir texto oscuro, independientemente del banner.");
const controls=[...src.matchAll(/className="(input-company[^"]*)"/g)].map(m=>m[1]);
assert.equal(controls.length,7,"Nombre, slug, estatus, correo, teléfono, sitio web y notas deben cubrirse.");
for(const value of controls){
  assert.match(value,/\bbg-white\b/,"El control debe tener fondo blanco.");
  assert.match(value,/\btext-neutral-900\b/,"El texto escrito siempre debe tener color oscuro.");
}
assert.match(src,/color: rgb\(23 23 23\)/,"Definir color CSS por si se alteran clases.");
assert.match(src,/\.input-company::placeholder/,"Conservar contraste distinto para placeholder.");
console.log("FORMULARIO_EMPRESA_CONTRASTE_OK: siete campos con texto visible.");
