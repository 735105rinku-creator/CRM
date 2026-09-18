import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8");

const authService = read("src/app/core/auth/auth.service.ts");
const login = read("src/app/features/auth/login/login.component.ts");
const shell = read("src/app/features/accounts/layout/accounts-shell.component.ts");
const sidebar = read("src/app/features/accounts/components/accounts-sidebar/accounts-sidebar.component.ts");
const sidebarHtml = read("src/app/features/accounts/components/accounts-sidebar/accounts-sidebar.component.html");
const repository = read("../../backend/server/src/repositories/employee.repository.js");

test("Accounts login resolves directly to the Accounts dashboard", () => {
  assert.match(login, /accounts:\s*['"]\/accounts\/dashboard['"]/);
});

test("Accounts identity is derived from the authenticated company context", () => {
  assert.match(shell, /companyName\s*=\s*computed/);
  assert.match(sidebar, /companyName\s*=\s*computed/);
  assert.match(sidebarHtml, /\{\{\s*companyName\(\)\s*\}\}/);
});

test("Stored identity cannot silently override the active authenticated identity", () => {
  assert.match(authService, /storeSession\(response, rememberMe\)/);
  assert.match(authService, /this\.currentUser\.set\(response\.user\)/);
});

test("Employee profile lookup prioritizes the authenticated user link", () => {
  assert.match(repository, /findOne\(\{\s*companyId,\s*userId\s*\}\)/s);
  assert.match(repository, /if \(!employee && employeeId\)/);
  assert.match(repository, /if \(!employee && employeeCode\)/);
});
