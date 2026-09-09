import test from "node:test";
import assert from "node:assert/strict";


test(
  "ProfitLossService module exists",
  async () => {

    const module =
      await import(
        "../services/profitLoss.service.js"
      );

    assert.equal(
      typeof module.ProfitLossService,
      "function"
    );

  }
);


test(
  "calculates income expenses and net profit from Trial Balance period movement",
  async () => {

    const {
      ProfitLossService,
    } =
      await import(
        "../services/profitLoss.service.js"
      );


    const calls = [];


    const trialBalanceService = {

      async getTrialBalance(query) {

        calls.push(query);

        return {

          companyId:
            query.companyId,

          period: {
            from: "2026-04-01",
            to: "2027-03-31",
          },

          accounts: [

            {
              accountId: "income-1",
              accountCode: "4001",
              accountName: "Sales",
              nature: "income",
              accountType: "sales",
              status: "active",
              periodDebit: 1000,
              periodCredit: 11000,
            },

            {
              accountId: "expense-1",
              accountCode: "5001",
              accountName: "Office Expense",
              nature: "expense",
              accountType: "expense",
              status: "active",
              periodDebit: 4000,
              periodCredit: 500,
            },

            {
              accountId: "asset-1",
              accountCode: "1001",
              accountName: "Cash",
              nature: "asset",
              accountType: "cash",
              status: "active",
              periodDebit: 10000,
              periodCredit: 3500,
            },

          ],

        };

      },

    };


    const service =
      new ProfitLossService({
        trialBalanceService,
      });


    const result =
      await service.getProfitLoss({
        companyId: "company-1",
        from: "2026-04-01",
        to: "2027-03-31",
      });


    assert.deepEqual(
      calls,
      [
        {
          companyId: "company-1",
          from: "2026-04-01",
          to: "2027-03-31",
        },
      ]
    );


    assert.equal(
      result.income.accounts.length,
      1
    );

    assert.equal(
      result.expenses.accounts.length,
      1
    );


    assert.equal(
      result.income.accounts[0].amount,
      10000
    );

    assert.equal(
      result.expenses.accounts[0].amount,
      3500
    );


    assert.equal(
      result.income.total,
      10000
    );

    assert.equal(
      result.expenses.total,
      3500
    );


    assert.equal(
      result.netProfit,
      6500
    );

    assert.equal(
      result.netLoss,
      0
    );

    assert.equal(
      result.result,
      "profit"
    );

  }
);


test(
  "returns net loss when expenses exceed income",
  async () => {

    const {
      ProfitLossService,
    } =
      await import(
        "../services/profitLoss.service.js"
      );


    const trialBalanceService = {

      async getTrialBalance() {

        return {

          companyId: "company-1",

          period: {
            from: "2026-04-01",
            to: "2027-03-31",
          },

          accounts: [

            {
              accountId: "income-1",
              accountCode: "4001",
              accountName: "Sales",
              nature: "income",
              accountType: "sales",
              status: "active",
              periodDebit: 0,
              periodCredit: 5000,
            },

            {
              accountId: "expense-1",
              accountCode: "5001",
              accountName: "Operating Expense",
              nature: "expense",
              accountType: "expense",
              status: "active",
              periodDebit: 8000,
              periodCredit: 0,
            },

          ],

        };

      },

    };


    const service =
      new ProfitLossService({
        trialBalanceService,
      });


    const result =
      await service.getProfitLoss({
        companyId: "company-1",
      });


    assert.equal(
      result.netProfit,
      0
    );

    assert.equal(
      result.netLoss,
      3000
    );

    assert.equal(
      result.result,
      "loss"
    );

  }
);


test(
  "preserves zero balance and inactive income or expense accounts",
  async () => {

    const {
      ProfitLossService,
    } =
      await import(
        "../services/profitLoss.service.js"
      );


    const trialBalanceService = {

      async getTrialBalance() {

        return {

          companyId: "company-1",

          period: {
            from: "2026-04-01",
            to: "2027-03-31",
          },

          accounts: [

            {
              accountId: "income-zero",
              accountCode: "4099",
              accountName: "Other Income",
              nature: "income",
              accountType: "other_income",
              status: "inactive",
              periodDebit: 0,
              periodCredit: 0,
            },

            {
              accountId: "expense-zero",
              accountCode: "5099",
              accountName: "Other Expense",
              nature: "expense",
              accountType: "expense",
              status: "inactive",
              periodDebit: 0,
              periodCredit: 0,
            },

          ],

        };

      },

    };


    const service =
      new ProfitLossService({
        trialBalanceService,
      });


    const result =
      await service.getProfitLoss({
        companyId: "company-1",
      });


    assert.equal(
      result.income.accounts.length,
      1
    );

    assert.equal(
      result.expenses.accounts.length,
      1
    );

    assert.equal(
      result.income.accounts[0].status,
      "inactive"
    );

    assert.equal(
      result.income.accounts[0].amount,
      0
    );

    assert.equal(
      result.expenses.accounts[0].amount,
      0
    );

    assert.equal(
      result.result,
      "break-even"
    );

  }
);
