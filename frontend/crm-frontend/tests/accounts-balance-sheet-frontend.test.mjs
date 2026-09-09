import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) =>
  fs.existsSync(path)
    ? fs.readFileSync(path, "utf8")
    : "";

const models = read(
  "src/app/features/accounts/models/accounts.models.ts"
);

const service = read(
  "src/app/features/accounts/services/balance-sheet.service.ts"
);

const routes = read(
  "src/app/features/accounts/accounts.routes.ts"
);

const sidebar = read(
  "src/app/features/accounts/components/accounts-sidebar/accounts-sidebar.component.ts"
);

const component = read(
  "src/app/features/accounts/pages/balance-sheet/balance-sheet.component.ts"
);

const template = read(
  "src/app/features/accounts/pages/balance-sheet/balance-sheet.component.html"
);


test(
  "balance sheet models match backend report contract",
  () => {
    assert.match(
      models,
      /interface\s+BalanceSheetAccount/
    );

    assert.match(
      models,
      /closingBalance:\s*number/
    );

    assert.match(
      models,
      /amount:\s*number/
    );

    assert.match(
      models,
      /interface\s+BalanceSheetSection/
    );

    assert.match(
      models,
      /accounts:\s*BalanceSheetAccount\[\]/
    );

    assert.match(
      models,
      /total:\s*number/
    );

    assert.match(
      models,
      /interface\s+BalanceSheetPeriodResult/
    );

    assert.match(
      models,
      /type:\s*['"]profit['"]\s*\|\s*['"]loss['"]\s*\|\s*['"]break-even['"]/
    );

    assert.match(
      models,
      /interface\s+BalanceSheetReport/
    );

    assert.match(
      models,
      /asOf:\s*string/
    );

    assert.match(
      models,
      /assets:\s*BalanceSheetSection/
    );

    assert.match(
      models,
      /liabilities:\s*BalanceSheetSection/
    );

    assert.match(
      models,
      /equity:\s*BalanceSheetSection/
    );

    assert.match(
      models,
      /currentPeriodResult:\s*BalanceSheetPeriodResult/
    );

    assert.match(
      models,
      /totalLiabilitiesAndEquity:\s*number/
    );

    assert.match(
      models,
      /difference:\s*number/
    );

    assert.match(
      models,
      /isBalanced:\s*boolean/
    );
  }
);


test(
  "balance sheet service uses GET-only endpoint and asOf",
  () => {
    assert.match(
      service,
      /\/accounting\/balance-sheet/
    );

    assert.match(
      service,
      /getBalanceSheet/
    );

    assert.match(
      service,
      /asOf/
    );

    assert.doesNotMatch(
      service,
      /\.post\s*\(/
    );

    assert.doesNotMatch(
      service,
      /\.put\s*\(/
    );

    assert.doesNotMatch(
      service,
      /\.patch\s*\(/
    );

    assert.doesNotMatch(
      service,
      /\.delete\s*\(/
    );
  }
);


test(
  "accounts route loads real BalanceSheetComponent",
  () => {
    assert.match(
      routes,
      /path:\s*['"]balance-sheet['"]/
    );

    assert.match(
      routes,
      /\.\/pages\/balance-sheet\/balance-sheet\.component/
    );

    assert.match(
      routes,
      /module\.BalanceSheetComponent/
    );
  }
);


test(
  "accounts sidebar exposes Balance Sheet",
  () => {
    assert.match(
      sidebar,
      /label:\s*['"]Balance Sheet['"]/
    );

    assert.match(
      sidebar,
      /route:\s*['"]\/accounts\/balance-sheet['"]/
    );
  }
);


test(
  "BalanceSheetComponent supports as-of filtering and balance state",
  () => {
    assert.match(
      component,
      /export\s+class\s+BalanceSheetComponent/
    );

    assert.match(
      component,
      /loadBalanceSheet/
    );

    assert.match(
      component,
      /applyAsOf/
    );

    assert.match(
      component,
      /resetAsOf/
    );

    assert.match(
      component,
      /currentPeriodResultLabel/
    );

    assert.match(
      component,
      /isBalanced/
    );
  }
);


test(
  "balance sheet template renders statement sections and totals",
  () => {
    assert.match(
      template,
      /Balance Sheet/
    );

    assert.match(
      template,
      /As of/
    );

    assert.match(
      template,
      /Assets/
    );

    assert.match(
      template,
      /Liabilities/
    );

    assert.match(
      template,
      /Equity/
    );

    assert.match(
      template,
      /Account Code/
    );

    assert.match(
      template,
      /Closing Balance/
    );

    assert.match(
      template,
      /Total Assets/
    );

    assert.match(
      template,
      /Total Liabilities/
    );

    assert.match(
      template,
      /Total Equity/
    );

    assert.match(
      template,
      /Current Period/
    );

    assert.match(
      template,
      /Liabilities & Equity/
    );

    assert.match(
      template,
      /Difference/
    );
  }
);