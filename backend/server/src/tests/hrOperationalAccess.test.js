import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const logisticsAccess = read("src/middleware/logisticsAccess.middleware.js");
const logisticsPermissions = read("src/constants/logisticsPermissions.js");
const logisticsPermissionMiddleware = read("src/middleware/logisticsPermission.middleware.js");
const crmRoutes = read("src/routes/crm.routes.js");

test("HR is not a Logistics management role", () => {
  const match = logisticsAccess.match(/const MANAGEMENT_ROLES\s*=\s*new Set\([\s\S]*?\);/);
  assert.ok(match, "Logistics MANAGEMENT_ROLES block not found");
  assert.doesNotMatch(
    match[0],
    /ROLES\.HR/,
    "HR must not receive Logistics management access"
  );
});

test("default Logistics role permissions do not grant HR or HR manager access", () => {
  const match = logisticsPermissions.match(/DEFAULT_LOGISTICS_ROLE_PERMISSIONS\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\);/);
  assert.ok(match, "DEFAULT_LOGISTICS_ROLE_PERMISSIONS block not found");
  assert.doesNotMatch(match[1], /(?:^|\s)hr\s*:/m);
  assert.doesNotMatch(match[1], /hr_manager\s*:/);
});

test("runtime Logistics permission resolver does not synthesize HR read access", () => {
  assert.doesNotMatch(
    logisticsPermissionMiddleware,
    /normalizedRole\s*===\s*ROLES\.HR[\s\S]*?allowed:\s*viewOnly/,
    "HR must not receive generated Logistics read-only permissions"
  );
});

test("CRM operational routes use an HR deny guard", () => {
  assert.match(
    crmRoutes,
    /const\s+requireNonHrOperationalCrm\s*=/,
    "CRM needs a central HR deny middleware for Sales operations"
  );

  for (const route of ["leads", "deals", "tasks", "quotations"]) {
    const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `router\\.(?:get|post|patch)\\(\\s*["']\\/${escaped}(?:\\/:id)?["']\\s*,\\s*requireNonHrOperationalCrm`
    );
    assert.match(
      crmRoutes,
      pattern,
      `${route} operational routes must deny HR before handler execution`
    );
  }
});

test("HR employee-support CRM endpoints remain outside the Sales deny guard", () => {
  assert.doesNotMatch(
    crmRoutes,
    /router\.get\(["']\/contacts["']\s*,\s*requireNonHrOperationalCrm/
  );
  assert.doesNotMatch(
    crmRoutes,
    /router\.get\(["']\/accounts["']\s*,\s*requireNonHrOperationalCrm/
  );
  assert.doesNotMatch(
    crmRoutes,
    /router\.get\(["']\/daily-tasks["']\s*,\s*requireNonHrOperationalCrm/
  );
});
