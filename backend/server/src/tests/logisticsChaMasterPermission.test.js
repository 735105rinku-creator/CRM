import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const backendRoot = process.cwd();
const projectRoot = path.resolve(backendRoot, "../..");
const readBackend = (relativePath) =>
  fs.readFileSync(path.join(backendRoot, relativePath), "utf8");
const readFrontend = (relativePath) =>
  fs.readFileSync(path.join(projectRoot, "frontend/crm-frontend", relativePath), "utf8");

test("CHA Master routes use CHA permissions instead of general vendor permissions", () => {
  const routes = readBackend("src/routes/logisticsCha.routes.js");

  assert.match(routes, /["']\/masters["']/);
  assert.match(routes, /requireLogisticsPermission\(\s*["']view["']\s*,\s*["']cha["']\s*\)/);
  assert.match(routes, /requireLogisticsPermission\(\s*["']create["']\s*,\s*["']cha["']\s*\)/);
  assert.match(routes, /requireLogisticsPermission\(\s*["']edit["']\s*,\s*["']cha["']\s*\)/);
});

test("CHA Master frontend no longer calls the general vendors endpoint", () => {
  const component = readFrontend(
    "src/app/features/logistics/cha-master/cha-master.component.ts"
  );

  assert.match(component, /\/logistics\/cha\/masters/);
  assert.doesNotMatch(component, /\/logistics\/vendors/);
});

test("CHA Master controller forces vendorType cha and rejects non-CHA vendor ids", () => {
  const controller = readBackend("src/controllers/logisticsChaMaster.controller.js");

  assert.match(controller, /vendorType:\s*["']cha["']/);
  assert.match(controller, /vendor\.vendorType\s*!==\s*["']cha["']/);
});

test("CHA status-only updates do not inject unrelated vendor defaults", async () => {
  const { validateChaMasterStatusPayload } = await import(
    "../controllers/logisticsChaMaster.controller.js"
  );

  assert.deepEqual(validateChaMasterStatusPayload({ status: "inactive" }), {
    status: "inactive",
    statusOther: "",
  });
  assert.throws(
    () => validateChaMasterStatusPayload({ status: "unknown" }),
    /Invalid CHA status/
  );
});
