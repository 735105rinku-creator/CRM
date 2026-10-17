import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const serviceSource = readFileSync(
  new URL("../services/employee.service.js", import.meta.url),
  "utf8"
);

const getBankServiceMatch = serviceSource.match(
  /export const getEmployeeBankService\s*=\s*async\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\n\};/
);

test("employee bank read service exists", () => {
  assert.ok(
    getBankServiceMatch,
    "getEmployeeBankService must exist."
  );
});

test("employee bank read enforces dedicated authorization", () => {
  assert.ok(
    getBankServiceMatch,
    "getEmployeeBankService must exist."
  );

  const body = getBankServiceMatch[1];

  assert.match(
    body,
    /\bensureEmployeeBankReadAccess\s*\(/,
    "Bank reads must invoke dedicated authorization."
  );
});

test("bank authorization helper checks own identity", () => {
  assert.match(
    serviceSource,
    /const ensureEmployeeBankReadAccess\s*=/,
    "Dedicated bank authorization helper must exist."
  );

  const helper = serviceSource.match(
    /const ensureEmployeeBankReadAccess\s*=\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\n\};/
  );

  assert.ok(helper, "Bank authorization helper body must exist.");

  assert.match(
    helper[1],
    /employee\.userId/,
    "Employee-to-user linkage must be checked."
  );

  assert.match(
    helper[1],
    /currentUser\.employee/,
    "User-to-employee linkage must be checked."
  );

  assert.match(
    helper[1],
    /403/,
    "Unauthorized bank reads must be rejected."
  );
});