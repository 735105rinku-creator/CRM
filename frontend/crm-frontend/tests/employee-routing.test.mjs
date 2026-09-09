import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const loginPath =
  'src/app/features/auth/login/login.component.ts';

const guardPath =
  'src/app/core/auth/employee-dashboard.guard.ts';

const loginSource =
  fs.readFileSync(loginPath, 'utf8');

const guardSource =
  fs.readFileSync(guardPath, 'utf8');

test(
  'employee login must enter employee-dashboard so department guard can decide workspace',
  () => {
    assert.match(
      loginSource,
      /employee\s*:\s*['"]\/employee-dashboard['"]/,
      'employee login is bypassing employeeDashboardGuard'
    );
  }
);

test(
  'employee dashboard guard preserves Logistics redirect',
  () => {
    assert.match(
      guardSource,
      /['"]\/logistics\/dashboard['"]/,
      'Logistics employee redirect is missing'
    );
  }
);

test(
  'employee dashboard guard redirects Accounts employee to Accounts dashboard',
  () => {
    assert.match(
      guardSource,
      /['"]\/accounts\/dashboard['"]/,
      'Accounts employee redirect is missing'
    );
  }
);
