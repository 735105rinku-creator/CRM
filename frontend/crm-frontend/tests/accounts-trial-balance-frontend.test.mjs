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
  "src/app/features/accounts/services/trial-balance.service.ts"
);

const routes = read(
  "src/app/features/accounts/accounts.routes.ts"
);

const sidebar = read(
  "src/app/features/accounts/components/accounts-sidebar/accounts-sidebar.component.ts"
);

const component = read(
  "src/app/features/accounts/pages/trial-balance/trial-balance.component.ts"
);

const template = read(
  "src/app/features/accounts/pages/trial-balance/trial-balance.component.html"
);

test(
  "trial balance models match backend report contract",
  () => {
    assert.match(
      models,
      /interface\s+TrialBalancePeriod/
    );

    assert.match(
      models,
      /interface\s+TrialBalanceAmount/
    );

    assert.match(
      models,
      /openingBalance:\s*TrialBalanceAmount/
    );

    assert.match(
      models,
      /periodDebit:\s*number/
    );

    assert.match(
      models,
      /periodCredit:\s*number/
    );

    assert.match(
      models,
      /closingBalance:\s*TrialBalanceAmount/
    );

    assert.match(
      models,
      /interface\s+TrialBalanceTotals/
    );

    assert.match(
      models,
      /accounts:\s*TrialBalanceRow\[\]/
    );

    assert.match(
      models,
      /totals:\s*TrialBalanceTotals/
    );
  }
);

test(
  "trial balance service uses read-only accounting endpoint and date filters",
  () => {
    assert.match(
      service,
      /\/accounting\/trial-balance/
    );

    assert.match(
      service,
      /getTrialBalance/
    );

    assert.match(
      service,
      /from/
    );

    assert.match(
      service,
      /to/
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
  "accounts route loads real TrialBalanceComponent",
  () => {
    assert.match(
      routes,
      /path:\s*['"]trial-balance['"]/
    );

    assert.match(
      routes,
      /\.\/pages\/trial-balance\/trial-balance\.component/
    );

    assert.match(
      routes,
      /module\.TrialBalanceComponent/
    );
  }
);

test(
  "accounts sidebar exposes Trial Balance",
  () => {
    assert.match(
      sidebar,
      /label:\s*['"]Trial Balance['"]/
    );

    assert.match(
      sidebar,
      /route:\s*['"]\/accounts\/trial-balance['"]/
    );
  }
);

test(
  "TrialBalanceComponent supports loading and period filtering",
  () => {
    assert.match(
      component,
      /export\s+class\s+TrialBalanceComponent/
    );

    assert.match(
      component,
      /loadTrialBalance/
    );

    assert.match(
      component,
      /applyPeriod/
    );

    assert.match(
      component,
      /resetPeriod/
    );

    assert.match(
      component,
      /isBalanced/
    );
  }
);

test(
  "trial balance template renders accounting report columns and totals",
  () => {
    assert.match(
      template,
      /Trial Balance/
    );

    assert.match(
      template,
      /Account Code/
    );

    assert.match(
      template,
      /Opening Debit/
    );

    assert.match(
      template,
      /Opening Credit/
    );

    assert.match(
      template,
      /Period Debit/
    );

    assert.match(
      template,
      /Period Credit/
    );

    assert.match(
      template,
      /Closing Debit/
    );

    assert.match(
      template,
      /Closing Credit/
    );

    assert.match(
      template,
      /Total/
    );

    assert.match(
      template,
      /Balanced/
    );
  }
);
test(
  "trial balance frontend uses the exact backend debit-credit balance and totals contract",
  () => {

    assert.match(
      models,
      /interface\s+TrialBalanceAmount\s*\{[\s\S]*?debit:\s*number;[\s\S]*?credit:\s*number;[\s\S]*?\}/
    );

    const trialBalanceAmountBlock =
      models.match(
        /interface\s+TrialBalanceAmount\s*\{([^}]*)\}/
      )?.[1] ?? "";

    assert.doesNotMatch(
      trialBalanceAmountBlock,
      /\bamount\s*:/
    );

    assert.doesNotMatch(
      trialBalanceAmountBlock,
      /\btype\s*:/
    );


    assert.match(
      models,
      /totalOpeningDebit:\s*number/
    );

    assert.match(
      models,
      /totalOpeningCredit:\s*number/
    );

    assert.match(
      models,
      /totalPeriodDebit:\s*number/
    );

    assert.match(
      models,
      /totalPeriodCredit:\s*number/
    );

    assert.match(
      models,
      /totalClosingDebit:\s*number/
    );

    assert.match(
      models,
      /totalClosingCredit:\s*number/
    );

    assert.match(
      models,
      /isBalanced:\s*boolean/
    );


    assert.match(
      component,
      /balance\?\.debit/
    );

    assert.match(
      component,
      /balance\?\.credit/
    );

    assert.doesNotMatch(
      component,
      /balance\?\.type/
    );

    assert.doesNotMatch(
      component,
      /balance\.amount/
    );


    assert.match(
      template,
      /totals\.totalOpeningDebit/
    );

    assert.match(
      template,
      /totals\.totalOpeningCredit/
    );

    assert.match(
      template,
      /totals\.totalPeriodDebit/
    );

    assert.match(
      template,
      /totals\.totalPeriodCredit/
    );

    assert.match(
      template,
      /totals\.totalClosingDebit/
    );

    assert.match(
      template,
      /totals\.totalClosingCredit/
    );

  }
);
