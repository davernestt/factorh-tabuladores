import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
const read = (path: string) => readFileSync(path, "utf8");
const index = read("app/protected/psicometrias/page.tsx");
const integral = read("app/protected/psicometrias/integral/[processId]/page.tsx");
const details = read("app/protected/evaluaciones/[id]/page.tsx");
const exportActions = read("app/protected/psicometrias/export-actions.tsx");

assert.match(index, /hasStaffPermission\(currentUser, "psychometrics", "view"\)/);
assert.match(index, /\.eq\("organization_id", scopedOrganizationId\)\.eq\("client_visible", true\)/);
assert.match(index, /\.in\("process_id", visibleProcessIds\)/);
assert.match(integral, /hasStaffPermission\(currentUser, "psychometrics", "reports"\)/);
assert.match(integral, /processR\.data\.client_visible !== true/);
assert.match(details, /const moduleKey = scopeTemplate\.data\.assessment_type\.startsWith\("psychometric_"\)/);
assert.match(details, /scopeProcess\.data\.client_visible !== true/);
assert.match(details, /hasStaffPermission\(currentAppUser, moduleKey, "view"\)/);

// Comprobar presencia de ambos generadores; los E2E de descarga y apertura
// requieren una sesión autenticada y NO quedan certificados por este smoke.
assert.match(exportActions, /buildImagePdf\(pages\)/);
assert.match(exportActions, /type:"application\/pdf"/);
assert.match(exportActions, /buildWordHtml\(/);
assert.match(exportActions, /buildMhtml\(/);
assert.match(exportActions, /type: "application\/msword;charset=utf-8"/);
assert.match(exportActions, /sanitize\(fileName\) \+ "\.pdf"/);
assert.match(exportActions, /sanitize\(fileName\) \+ "\.doc"/);
assert.match(exportActions, /triggerDownload\(blob, sanitize\(fileName\)/);
console.log("PSYCHOMETRIC_ACCESS_AND_EXPORT_STRUCTURE_OK: comprobación estática; falta E2E con sesión");
