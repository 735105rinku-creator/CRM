import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const logisticsGuardSource = read("src/app/core/auth/logistics.guard.ts");
const routesSource = read("src/app/app.routes.ts");
const hrHtmlSource = read("src/app/features/hr/hr-dashboard.component.html");

test("HR is not granted operational Logistics access by managementRoles", () => {
  const match = logisticsGuardSource.match(/const managementRoles\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(match, "managementRoles block was not found");
  assert.doesNotMatch(
    match[1],
    /['"]hr['"]/,
    "HR must not receive Logistics operational access"
  );
});

test("HR Logistics access redirects to HR dashboard", () => {
  assert.match(
    logisticsGuardSource,
    /role\s*===\s*['"]hr['"][\s\S]*?managementRedirect\([\s\S]*?['"]\/hr-dashboard['"][\s\S]*?['"]monitor-only['"]/
  );
});

test("Sales workspace has HR access protection in addition to authGuard", () => {
  const salesBlock = routesSource.match(/path:\s*['"]sales['"][\s\S]*?children:\s*\[/);
  assert.ok(salesBlock, "Sales route block was not found");
  assert.match(
    salesBlock[0],
    /canActivate\s*:\s*\[[\s\S]*?authGuard[\s\S]*?salesAccessGuard[\s\S]*?\]/,
    "Sales route must use salesAccessGuard after authGuard"
  );
});

test("HR-only users do not see Logistics operational navigation", () => {
  assert.match(
    hrHtmlSource,
    /@if\s*\(\s*!isHrOnlyUser\(\)\s*\)\s*\{[\s\S]*?<p>\s*Logistics\s*<\/p>[\s\S]*?setFeature\(['"]logistics['"]\)/,
    "Logistics monitoring navigation must remain available only to non-HR management users"
  );
});

test("HR-only users do not see Sales CRM operational navigation", () => {
  assert.match(
    hrHtmlSource,
    /@if\s*\(\s*!isHrOnlyUser\(\)\s*\)\s*\{[\s\S]*?setFeature\(['"]crm-leads['"]\)[\s\S]*?setFeature\(['"]crm-deals['"]\)[\s\S]*?setFeature\(['"]crm-tasks['"]\)/,
    "Sales CRM navigation must remain available only to non-HR management users"
  );
});

test("HR dashboard has an explicit HR-only role check", () => {
  const hrTsSource = read("src/app/features/hr/hr-dashboard.component.ts");

  assert.match(
    hrTsSource,
    /protected\s+isHrOnlyUser\s*\(\s*\)\s*:\s*boolean/,
    "HR dashboard needs an explicit HR-only role helper"
  );

  assert.match(
    hrTsSource,
    /currentUser\(\)[\s\S]*?role[\s\S]*?===\s*['"]hr['"]/,
    "HR-only helper must check the actual hr role"
  );
});
test("HR rejects stale Sales and Logistics feature query parameters", () => {
  const hrTsSource = read("src/app/features/hr/hr-dashboard.component.ts");

  assert.match(
    hrTsSource,
    /private\s+isRestrictedHrOperationalFeature\s*\(/,
    "HR dashboard needs a central restricted-feature check"
  );

  assert.match(
    hrTsSource,
    /requestedFeature[\s\S]*?!this\.isRestrictedHrOperationalFeature\(requestedFeature\)[\s\S]*?activeFeature\.set\(requestedFeature\)/,
    "stale restricted feature query params must not activate Sales or Logistics views"
  );
});

test("HR setFeature blocks hidden Sales and Logistics operational features", () => {
  const hrTsSource = read("src/app/features/hr/hr-dashboard.component.ts");

  assert.match(
    hrTsSource,
    /setFeature\(feature:\s*HrFeature\)[\s\S]*?if\s*\(\s*this\.isRestrictedHrOperationalFeature\(feature\)\s*\)[\s\S]*?activeFeature\.set\(['"]dashboard['"]\)/,
    "setFeature must refuse hidden Sales and Logistics operational features"
  );
});

test("HR dashboard remains reachable through the MainLayout parent", () => {
  const mainLayoutBlock = routesSource.match(/component:\s*MainLayoutComponent,[\s\S]*?children:\s*\[/);
  assert.ok(mainLayoutBlock, "MainLayout route block was not found");
  assert.doesNotMatch(
    mainLayoutBlock[0],
    /canActivate\s*:\s*\[[\s\S]*?salesAccessGuard[\s\S]*?\]/,
    "MainLayout parent must not run salesAccessGuard because it also owns the HR dashboard"
  );
});

test("HR refresh does not preload restricted Sales or Logistics operational data", () => {
  const hrTsSource = read("src/app/features/hr/hr-dashboard.component.ts");
  const refreshBlock = hrTsSource.match(/protected\s+refreshAll\s*\(\s*\)\s*:\s*void\s*\{[\s\S]*?(?=\n\s*protected\s+dashboardMetrics)/);
  assert.ok(refreshBlock, "refreshAll block was not found");
  assert.match(
    refreshBlock[0],
    /if\s*\(\s*!this\.isHrOnlyUser\(\)\s*\)\s*\{[\s\S]*?this\.loadCrm\(\);[\s\S]*?this\.loadLogisticsMonitor\(\);[\s\S]*?\}/,
    "HR-only refresh must skip Sales CRM and Logistics operational preload"
  );
});

test("HR-only users do not see the CRM Accounts section", () => {
  assert.match(
    hrHtmlSource,
    /@if\s*\(\s*!isHrOnlyUser\(\)\s*\)\s*\{[\s\S]*?<p>\s*CRM\s*<\/p>[\s\S]*?setFeature\(['"]account-invoices['"]\)[\s\S]*?setFeature\(['"]account-payments['"]\)[\s\S]*?setFeature\(['"]account-expenses['"]\)[\s\S]*?\}/,
    "The complete CRM section must be hidden from HR-only users"
  );
});

test("HR blocks hidden account CRM features from query and setFeature access", () => {
  const hrTsSource = read("src/app/features/hr/hr-dashboard.component.ts");
  const restrictedBlock = hrTsSource.match(/private\s+isRestrictedHrOperationalFeature\s*\([\s\S]*?(?=\n\s*protected\s+readonly\s+companyName)/);
  assert.ok(restrictedBlock, "restricted HR feature helper was not found");
  assert.match(restrictedBlock[0], /feature\s*===\s*['"]account-invoices['"]/, "HR must restrict account-invoices");
  assert.match(restrictedBlock[0], /feature\s*===\s*['"]account-payments['"]/, "HR must restrict account-payments");
  assert.match(restrictedBlock[0], /feature\s*===\s*['"]account-expenses['"]/, "HR must restrict account-expenses");
});
