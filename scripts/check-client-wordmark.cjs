const assert = require("node:assert/strict");
const fs = require("node:fs");
const get = p => fs.readFileSync(p,"utf8");
const logo = get("components/factorh-logo.tsx");
assert.match(logo, /text-neutral-500">Facto/);
assert.match(logo, /text-orange-600">RH/);
assert.doesNotMatch(logo, /<Image|factorh-logo\.svg|factorh-wordmark\.svg/);
const portal=get("app/cliente/[slug]/page.tsx");
const form=get("components/login-form.tsx");
assert.match(portal, /<LoginForm showBrand=\{false\}/);
assert.match(form, /showBrand\s*&&/);
for (const page of ["app/c3-report/report-content.tsx","app/c3-plan-report/[id]/report-body.tsx"]){
 assert.match(get(page), /<FactoRHLogo\b/);
 assert.doesNotMatch(get(page), /factorh-wordmark\.svg/);
}
const pdf=get("app/protected/evaluaciones/[id]/reporte/report-actions.tsx");
assert.match(pdf, /factorh-lettering-v3\.svg/);
const asset=get("public/brand/factorh-lettering-v3.svg");
assert.match(asset, /Facto<\/tspan>/);
assert.match(asset, /RH<\/tspan>/);
assert.doesNotMatch(asset, /<circle\b|<path\b|<polygon\b/);
console.log("PASS: Portal de clientes y reportes sin isotipo ni referencias al logo antiguo.");
