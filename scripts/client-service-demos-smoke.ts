import {strict as assert} from "node:assert";
import {readFileSync} from "node:fs";
import {clientServiceDemos} from "../lib/client-service-demos";
const ui=readFileSync("app/protected/empresas/company-service-operations.tsx","utf8");
const server=readFileSync("app/api/admin/empresas/[id]/modulos/route.ts","utf8");
const view=readFileSync("app/protected/empresas/demos/[moduleKey]/page.tsx","utf8");
for(const name of ["psychometrics","feedback360","nom035","pdl","climate","studies"])
 assert.ok(clientServiceDemos[name]?.previewHref,`Falta demo visual: ${name}`);
assert.deepEqual(
 [clientServiceDemos.psychometrics.days,clientServiceDemos.psychometrics.quantity,clientServiceDemos.feedback360.days,clientServiceDemos.feedback360.quantity],
 [30,2,14,1]);
assert.equal(clientServiceDemos.nom035.days,14);
for(const key of ["pdl","climate","studies"])assert.equal(clientServiceDemos[key].kind,"preview");
for(const key of ["psychometrics","feedback360","nom035"])assert.equal(clientServiceDemos[key].kind,"live");
assert.match(ui,/Ver demo/);
assert.match(ui,/Activar demo/);
assert.match(ui,/Activar servicio/);
assert.match(ui,/clientServiceDemos\[selection.module.module_key\].includes/);
assert.match(ui,/Selecciona el paquete/);
assert.match(ui,/currentStatus\?\{\.\.\.s,status:currentStatus\} as ModuleSubscription:s/);
assert.match(server,/demoConfig.kind!=="live"/);
assert.match(server,/status==="trial"&&evaluationLimit!==1/);
assert.match(server,/demoConfig.days/);
assert.match(server,/currentUser.role !== "super_admin"/);
assert.match(view,/user.role!=="super_admin"/);
console.log("DEMOS_MODULOS_OK: seis muestras, dos limites de candidatos/lideres, vigencias y roles.");
