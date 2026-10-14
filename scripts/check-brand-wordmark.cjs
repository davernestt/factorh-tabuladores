// Invariante de identidad: FactoRH utiliza solo letras, nunca el isotipo circular.
const assert = require("node:assert/strict");
const fs = require("node:fs");
for (const path of ["public/brand/factorh-logo.svg","public/brand/factorh-wordmark.svg"]) {
  const svg=fs.readFileSync(path,"utf8");
  assert.match(svg, /<text\b/i, `${path} debe contener letras tipográficas`);
  assert.match(svg, /<tspan fill="#737373">Facto<\/tspan>/);
  assert.match(svg, /<tspan fill="#F05A14">RH<\/tspan>/);
  assert.doesNotMatch(svg, /<(?:circle|path|polygon|ellipse|image|use|rect)\b/i,
    `${path} no debe incluir símbolos o imágenes`);
}
const c3=fs.readFileSync("lib/c3/word.ts","utf8");
const nom=fs.readFileSync("lib/nom035/word-export.ts","utf8");
for(const [path,source] of [["C3 Word",c3],["NOM035 Word",nom]]) {
  assert.match(source,/Facto<\/w:t>/,`${path} debe separar Facto`);
  assert.match(source,/RH<\/w:t>/,`${path} debe separar RH`);
  assert.match(source,/737373/);
  assert.match(source,/F05A14/);
}
const homepage=fs.readFileSync("app/page.tsx","utf8");
assert.doesNotMatch(homepage,/Factor<span/, "El nombre comercial es FactoRH, no FactorRH");
console.log("Marca FactoRH validada: solo letras gris/naranja en SVG y Word.");
