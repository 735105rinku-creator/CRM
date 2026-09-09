import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

const read = (file) =>
  fs.readFileSync(path.join(root, file), "utf8");

const logisticsGuardSource = read(
  "src/app/core/auth/logistics.guard.ts"
);

const loginSource = read(
  "src/app/features/auth/login/login.component.ts"
);

test(
  "Company Admin is not granted operational Logistics access by managementRoles",
  () => {
    const managementRolesMatch = logisticsGuardSource.match(
      /const managementRoles\s*=\s*\[([\s\S]*?)\];/
    );

    assert.ok(
      managementRolesMatch,
      "managementRoles block was not found"
    );

    assert.doesNotMatch(
      managementRolesMatch[1],
      /['"]company_admin['"]/,
      "company_admin must not receive Logistics operational access"
    );
  }
);

test(
  "Company Admin Logistics access redirects to Company Admin dashboard",
  () => {
    assert.match(
      logisticsGuardSource,
      /role\s*===\s*['"]company_admin['"][\s\S]*?managementRedirect\([\s\S]*?['"]\/dashboard['"][\s\S]*?['"]monitor-only['"]/
    );
  }
);

test(
  "Company Admin login ignores a stale returnUrl just like other management-only routing",
  () => {
    assert.match(
      loginSource,
      /role\s*===\s*['"]company_admin['"][\s\S]*?\|\|[\s\S]*?!requestedReturnUrl/
    );
  }
);