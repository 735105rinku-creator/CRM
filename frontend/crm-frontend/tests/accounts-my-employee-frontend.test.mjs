import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

const read = (file) =>
  fs.readFileSync(
    path.join(root, file),
    "utf8"
  );

const routesSource = read(
  "src/app/features/accounts/accounts.routes.ts"
);

const sidebarSource = read(
  "src/app/features/accounts/components/accounts-sidebar/accounts-sidebar.component.ts"
);

const sidebarHtmlSource = read(
  "src/app/features/accounts/components/accounts-sidebar/accounts-sidebar.component.html"
);

const employeeDashboardSource = read(
  "src/app/features/employee/employee-dashboard.component.ts"
);


test(
  "Accounts exposes employee workspace through the existing EmployeeDashboardComponent",
  () => {
    assert.match(
      routesSource,
      /path:\s*['"]employee['"][\s\S]*?['"]\.\.\/employee\/employee-dashboard\.component['"][\s\S]*?EmployeeDashboardComponent/
    );
  }
);


test(
  "Accounts sidebar exposes a MY EMPLOYEE group",
  () => {
    assert.match(
      sidebarSource,
      /title:\s*['"]MY EMPLOYEE['"]/
    );
  }
);


test(
  "Accounts MY EMPLOYEE sidebar routes use the accounts employee workspace",
  () => {
    const expectedFeatures = [
      "profile",
      "attendance",
      "attendance-history",
      "apply-leave",
      "leave-history",
      "leave-balance",
      "payslip",
      "documents",
      "bank",
      "events",
      "holidays",
      "meetings",
      "messages",
      "settings"
    ];

    for (const feature of expectedFeatures) {
      assert.ok(
        sidebarSource.includes("route: '/accounts/employee'"),
        "Missing Accounts employee workspace route"
      );

      assert.ok(
        sidebarSource.includes(`queryParams: { feature: '${feature}' }`),
        `Missing Accounts MY EMPLOYEE feature: ${feature}`
      );
    }
  }
);


test(
  "Accounts employee route is treated as an embedded employee workspace",
  () => {
    assert.match(
      employeeDashboardSource,
      /['"]\/accounts\/employee['"]/
    );

    assert.match(
      employeeDashboardSource,
      /isLogisticsEmbedded\(\)|isEmbedded/
    );
  }
);
test('Accounts sidebar separates employee query params from router path', () => {
  assert.match(
    sidebarSource,
    /route:\s*['"]\/accounts\/employee['"]/
  );

  assert.match(
    sidebarSource,
    /queryParams:\s*\{\s*feature:\s*['"]profile['"]\s*\}/
  );

  assert.match(
    sidebarHtmlSource,
    /\[queryParams\]\s*=\s*["']item\.queryParams["']/
  );

  assert.doesNotMatch(
    sidebarSource,
    /route:\s*['"]\/accounts\/employee\?feature=/
  );
});