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
  "src/app/features/accounts/services/profit-loss.service.ts"
);

const routes = read(
  "src/app/features/accounts/accounts.routes.ts"
);

const sidebar = read(
  "src/app/features/accounts/components/accounts-sidebar/accounts-sidebar.component.ts"
);

const component = read(
  "src/app/features/accounts/pages/profit-loss/profit-loss.component.ts"
);

const template = read(
  "src/app/features/accounts/pages/profit-loss/profit-loss.component.html"
);


test(
  "profit loss models match backend report contract",
  () => {
    assert.match(
      models,
      /interface\s+ProfitLossAccount/
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
      /amount:\s*number/
    );

    assert.match(
      models,
      /interface\s+ProfitLossSection/
    );

    assert.match(
      models,
      /accounts:\s*ProfitLossAccount\[\]/
    );

    assert.match(
      models,
      /total:\s*number/
    );

    assert.match(
      models,
      /interface\s+ProfitLossReport/
    );

    assert.match(
      models,
      /income:\s*ProfitLossSection/
    );

    assert.match(
      models,
      /expenses:\s*ProfitLossSection/
    );

    assert.match(
      models,
      /netProfit:\s*number/
    );

    assert.match(
      models,
      /netLoss:\s*number/
    );

    assert.match(
      models,
      /result:\s*['"]profit['"]\s*\|\s*['"]loss['"]\s*\|\s*['"]break-even['"]/
    );
  }
);


test(
  "profit loss service uses read-only accounting endpoint and date filters",
  () => {
    assert.match(
      service,
      /\/accounting\/profit-and-loss/
    );

    assert.match(
      service,
      /getProfitLoss/
    );

    assert.match(service, /from/);
    assert.match(service, /to/);

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
  "accounts route loads real ProfitLossComponent",
  () => {
    assert.match(
      routes,
      /path:\s*['"]profit-and-loss['"]/
    );

    assert.match(
      routes,
      /\.\/pages\/profit-loss\/profit-loss\.component/
    );

    assert.match(
      routes,
      /module\.ProfitLossComponent/
    );
  }
);


test(
  "accounts sidebar exposes Profit & Loss",
  () => {
    assert.match(
      sidebar,
      /label:\s*['"]Profit & Loss['"]/
    );

    assert.match(
      sidebar,
      /route:\s*['"]\/accounts\/profit-and-loss['"]/
    );
  }
);


test(
  "ProfitLossComponent supports loading period filtering and result",
  () => {
    assert.match(
      component,
      /export\s+class\s+ProfitLossComponent/
    );

    assert.match(
      component,
      /loadProfitLoss/
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
      /resultLabel/
    );
  }
);


test(
  "profit loss template renders income expenses totals and net result",
  () => {
    assert.match(
      template,
      /Profit & Loss/
    );

    assert.match(
      template,
      /Income/
    );

    assert.match(
      template,
      /Expenses/
    );

    assert.match(
      template,
      /Account Code/
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
      /Total Income/
    );

    assert.match(
      template,
      /Total Expenses/
    );

    assert.match(
      template,
      /Net Profit/
    );

    assert.match(
      template,
      /Net Loss/
    );
  }
);