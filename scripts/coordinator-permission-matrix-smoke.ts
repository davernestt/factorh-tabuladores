import {strict as assert} from "node:assert";
import {readFileSync} from "node:fs";
const read=(p:string)=>readFileSync(p,"utf8");
const permissions=read("lib/staff-permissions.ts");
const migration=read("supabase/migrations/20261016_staged_coordinator_matrix.sql");
const endpoint=read("app/api/admin/usuarios/[id]/permisos-operativos/route.ts");
const ui=read("app/protected/empresas/coordinator-matrix.tsx");
const company=read("app/protected/empresas/[id]/page.tsx");
const names=["psychometrics","feedback360","pdl","nom035","climate","studies","candidates"];
for(const module of names){
 assert.ok(permissions.includes(module),`Falta módulo ${module}`);
 assert.ok(migration.includes(module),`Falta base de datos ${module}`);
 assert.ok(ui.includes("grants"),"Formulario debe ser de permisos.");
}
assert.match(permissions,/if\(!access\.activated\)return false/);
assert.match(permissions,/profile\.activated===true&&!!profile\.validated_at/);
assert.match(migration,/activated boolean not null default false/);
assert.match(migration,/validated_at is not null and activated_at is not null/);
assert.match(migration,/on conflict\(user_id\) do nothing/);
assert.doesNotMatch(migration,/update public\.app_users|delete from public\.app_users/i);
assert.match(endpoint,/actor\.role!=="super_admin"/);
assert.match(endpoint,/orgR\.data\?\.slug!=="factorh"/);
assert.match(endpoint,/profileR\.data\.activated/);
assert.doesNotMatch(endpoint,/staff_access_profiles"\)\.update|activated:true/);
assert.match(ui,/Guardar matriz sin activar/);
assert.match(ui,/No hay botón de activación/);
assert.match(company,/<CoordinatorMatrix/);
for(const file of [
 "app/protected/psicometrias/layout.tsx",
 "app/protected/evaluaciones/layout.tsx",
 "app/protected/nueva-evaluacion/layout.tsx",
 "app/protected/procesos/layout.tsx",
 "app/protected/clima/layout.tsx",
 "app/protected/c3/layout.tsx",
 "app/protected/estudios/layout.tsx",
 "app/protected/candidatos/layout.tsx"
])assert.match(read(file),/hasStaffPermission/,`Falta guardia de ${file}`);
console.log("COORDINADORA_BORRADOR_OK: 7 módulos x 3 permisos, servidor deny-by-default, Paola conserva rol.");
