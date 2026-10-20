import assert from "node:assert/strict";
import test from "node:test";
import {
  isPublic360Path, isAllowedClientPath, isAllowedStaffPath,
} from "../lib/feedback360-route-policy.ts";
import { build360Url } from "../lib/feedback360-url.ts";

const token = "A".repeat(43);

test("360 public paths only permit token-based questionnaire and submission", () => {
  for (const path of [`/360/${token}`, `/api/360/${token}`, `/360/${token}/`]) {
    assert.equal(isPublic360Path(path), true, path);
  }
  for (const path of [
    "/360/nueva",
    "/api/360/personas",
    "/api/360/personas/123",
    "/api/admin/360",
    "/protected/360",
    "/360/short",
    `/api/360/${token}/reporte`,
  ]) {
    assert.equal(isPublic360Path(path), false, path);
  }
});

test("client path policy excludes privileged and lookalike paths", () => {
  for (const path of [
    "/protected/catalogo",
    "/protected/solicitar-usuarios",
    "/protected/estudios",
    "/protected/psicometrias/nueva",
    "/protected/360/nueva",
    "/protected/nom035",
  ]) assert.equal(isAllowedClientPath(path), true, path);
  for (const path of [
    "/protected/empresas",
    "/protected/usuarios",
    "/protected/comercial",
    "/protected/360-malicious",
    "/protected",
  ]) assert.equal(isAllowedClientPath(path), false, path);
});

test("staff policy keeps non-admin profiles away from restricted modules", () => {
  assert.equal(isAllowedStaffPath("/protected/mi-acceso", "consultant"), true);
  assert.equal(isAllowedStaffPath("/protected/estudios/tareas", "consultant"), false);
  assert.equal(isAllowedStaffPath("/protected/estudios/tareas", "ese_operator"), true);
  assert.equal(isAllowedStaffPath("/protected/empresas", "ese_operator"), false);
});

test("360 invitation links use the request origin, never a fixed preview URL", () => {
  // The CI workflow does not set FACTORH_PUBLIC_ORIGIN.
  assert.equal(build360Url(token, "https://factorh.example"), `https://factorh.example/360/${token}`);
  assert.throws(() => build360Url(token, "http://unsecured.example"));
  assert.throws(() => build360Url("invalid", "https://factorh.example"));
});
