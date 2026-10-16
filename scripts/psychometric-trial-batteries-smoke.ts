import { strict as assert } from "node:assert";
import {readFileSync} from "node:fs";

/** Verifica el contrato entre el consumo SQL y el selector cliente.
 * Las pruebas completas de integración se validan además en la aplicación.
 */
const sql=readFileSync("supabase/migrations/20261015_psychometric_trial_multi_test_one_candidate_credit.sql","utf8");
const page=readFileSync("app/protected/psicometrias/nueva/page.tsx","utf8");
const form=readFileSync("app/protected/nueva-evaluacion/new-assessment-form.tsx","utf8");
const route=readFileSync("app/api/admin/evaluaciones/route.ts","utf8");
assert.match(sql, /v_charge\s*:=\s*case\s+when\s+v_plan\.plan_type='trial'\s+then\s+1\s+else\s+p_units\s+end/i,
 "La demo debe descontar 1 aplicación por proceso/candidato, mientras el paquete conserva 1 por instrumento");
assert.match(sql,/v_plan\.credits_used\+v_charge>v_plan\.credits_total/i,
 "La prueba debe seguir bloqueándose al agotar las 2 aplicaciones");
assert.match(sql,/v_plan\.valid_until\s*<\s*current_date/i,
 "Se mantiene el bloqueo al vencer");
assert.doesNotMatch(sql,/set\s+credits_used\s*=\s*0/i,
 "No reiniciar contadores históricos de clientes");
assert.match(page,/const maxTemplateSelections = null;/,
 "La demo no debe limitar la selección a un instrumento");
assert.match(form,/Seleccionar todas las psicometrías habilitadas/,
 "El cliente debe poder elegir todo el catálogo autorizado en un clic");
assert.match(route,/p_units: templatesToApply\.length/,
 "El servidor informa el número real de instrumentos a la función SQL");
console.log("PSYCHOMETRIC_TRIAL_BATTERIES_OK: 2 candidatos, baterías completas, créditos y vigencia preservados.");
