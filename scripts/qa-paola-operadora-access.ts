import {strict as assert} from "node:assert";
import {readFileSync} from "node:fs";
const src=(p:string)=>readFileSync(p,"utf8");
const staff=src("lib/staff-permissions.ts");
const modules=["psychometrics","feedback360","pdl","nom035","climate","studies","candidates"];
for(const module of modules)assert.match(staff,new RegExp(module));
assert.match(staff,/profile\.activated===true&&!!profile\.validated_at/);
assert.match(staff,/if\(!access\.activated\)return false/);
const all:[
 string,string
][]=[
 ["app/protected/psicometrias/layout.tsx","psychometrics"],
 ["app/protected/evaluaciones/layout.tsx","pdl"],
 ["app/protected/candidatos/layout.tsx","candidates"],
 ["app/protected/estudios/layout.tsx","studies"],
 ["app/protected/c3/layout.tsx","climate"],
 ["lib/feedback360-access.ts","feedback360"],
 ["lib/nom035/access.ts","nom035"],
 ["app/api/admin/evaluaciones/[id]/casos-calificacion/route.ts","pdl"],
 ["app/api/admin/360/route.ts","feedback360"],
 ["app/api/admin/candidatos/[id]/route.ts","candidates"],
 ["app/protected/c3/actions.ts","climate"]
];
for(const [file,mod] of all){
 assert.match(src(file),new RegExp("hasStaffPermission"),file);
 assert.match(src(file),new RegExp(mod),file+" missing module");
}
const userRoutes=[
 "app/api/admin/usuarios/route.ts",
 "app/api/admin/usuarios/[id]/route.ts",
 "app/api/admin/usuarios/[id]/permisos-operativos/route.ts",
 "app/api/admin/empresas/[id]/modulos/route.ts",
 "app/api/admin/empresas/[id]/creditos/route.ts"
];
for(const file of userRoutes)assert.match(src(file),/super_admin/,file+" must remain restricted");
const c3=src("app/api/c3/report/[id]/word/route.ts");
assert.match(c3,/report_released_at/,"Staff never releases a new report");
assert.match(src("app/protected/layout.tsx"),/staffAccess.grants.filter\(g=>g.can_view\)/);
assert.match(src("app/protected/mi-acceso/page.tsx"),/getCoordinatorAccess/);
assert.match(src("app/api/admin/360/route.ts"),/Sólo puedes crear ciclos de empresas con servicio 360° vigente/);
console.log("PAOLA_QA_STATIC_OK: 7 grants, 11 server guards, privilege boundaries, release protection.");
