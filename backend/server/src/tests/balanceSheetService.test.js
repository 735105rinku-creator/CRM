import test from "node:test";
import assert from "node:assert/strict";


test(
  "BalanceSheetService module exists",
  async () => {

    const module =
      await import(
        "../services/balanceSheet.service.js"
      );

    assert.equal(
      typeof module.BalanceSheetService,
      "function"
    );

  }
);


test(
  "builds assets liabilities equity and current period profit",
  async () => {

    const {
      BalanceSheetService,
    } = await import(
      "../services/balanceSheet.service.js"
    );


    const calls = [];


    const trialBalanceService = {

      async getTrialBalance(query) {

        calls.push(query);

        return {

          companyId: "company-1",

          period: {
            from: "2026-04-01",
            to: "2026-09-07",
          },

          accounts: [

            {
              accountId: "cash-1",
              accountCode: "1001",
              accountName: "Cash",
              nature: "asset",
              accountType: "cash",
              status: "active",
              closingBalance: 15000,
            },

            {
              accountId: "receivable-1",
              accountCode: "1101",
              accountName: "Trade Receivables",
              nature: "asset",
              accountType: "receivable",
              status: "inactive",
              closingBalance: 0,
            },

            {
              accountId: "payable-1",
              accountCode: "2001",
              accountName: "Trade Payables",
              nature: "liability",
              accountType: "payable",
              status: "active",
              closingBalance: -5000,
            },

            {
              accountId: "capital-1",
              accountCode: "3001",
              accountName: "Capital",
              nature: "equity",
              accountType: "capital",
              status: "active",
              closingBalance: -3500,
            },

            {
              accountId: "sales-1",
              accountCode: "4001",
              accountName: "Sales",
              nature: "income",
              accountType: "sales",
              status: "active",
              periodDebit: 0,
              periodCredit: 10000,
              closingBalance: -10000,
            },

            {
              accountId: "expense-1",
              accountCode: "5001",
              accountName: "Office Expense",
              nature: "expense",
              accountType: "expense",
              status: "active",
              periodDebit: 3500,
              periodCredit: 0,
              closingBalance: 3500,
            },

          ],

        };

      },

    };


    const service =
      new BalanceSheetService({
        trialBalanceService,
      });


    const result =
      await service.getBalanceSheet({
        companyId: "company-1",
        asOf: "2026-09-07",
      });


    assert.deepEqual(
      calls,
      [
        {
          companyId: "company-1",
          from: "2026-04-01",
          to: "2026-09-07",
        },
      ]
    );


    assert.equal(
      result.asOf,
      "2026-09-07"
    );


    assert.equal(
      result.assets.accounts.length,
      2
    );

    assert.equal(
      result.assets.total,
      15000
    );


    assert.equal(
      result.liabilities.accounts.length,
      1
    );

    assert.equal(
      result.liabilities.total,
      5000
    );


    assert.equal(
      result.equity.accounts.length,
      1
    );

    assert.equal(
      result.equity.total,
      3500
    );


    assert.deepEqual(
      result.currentPeriodResult,
      {
        type: "profit",
        amount: 6500,
      }
    );


    assert.equal(
      result.totalLiabilitiesAndEquity,
      15000
    );

    assert.equal(
      result.difference,
      0
    );

    assert.equal(
      result.isBalanced,
      true
    );


    assert.equal(
      result.assets.accounts[1].status,
      "inactive"
    );

    assert.equal(
      result.assets.accounts[1].amount,
      0
    );

  }
);


test(
  "handles current period loss on the asset side of the equation",
  async () => {

    const {
      BalanceSheetService,
    } = await import(
      "../services/balanceSheet.service.js"
    );


    const trialBalanceService = {

      async getTrialBalance() {

        return {

          companyId: "company-1",

          period: {
            from: "2026-04-01",
            to: "2026-09-07",
          },

          accounts: [

            {
              accountId: "asset-1",
              accountCode: "1001",
              accountName: "Cash",
              nature: "asset",
              accountType: "cash",
              status: "active",
              closingBalance: 7000,
            },

            {
              accountId: "liability-1",
              accountCode: "2001",
              accountName: "Payable",
              nature: "liability",
              accountType: "payable",
              status: "active",
              closingBalance: -5000,
            },

            {
              accountId: "equity-1",
              accountCode: "3001",
              accountName: "Capital",
              nature: "equity",
              accountType: "capital",
              status: "active",
              closingBalance: -5000,
            },

            {
              accountId: "income-1",
              accountCode: "4001",
              accountName: "Sales",
              nature: "income",
              accountType: "sales",
              status: "active",
              periodDebit: 0,
              periodCredit: 2000,
              closingBalance: -2000,
            },

            {
              accountId: "expense-1",
              accountCode: "5001",
              accountName: "Expense",
              nature: "expense",
              accountType: "expense",
              status: "active",
              periodDebit: 5000,
              periodCredit: 0,
              closingBalance: 5000,
            },

          ],

        };

      },

    };


    const service =
      new BalanceSheetService({
        trialBalanceService,
      });


    const result =
      await service.getBalanceSheet({
        companyId: "company-1",
        asOf: "2026-09-07",
      });


    assert.deepEqual(
      result.currentPeriodResult,
      {
        type: "loss",
        amount: 3000,
      }
    );


    assert.equal(
      result.assets.total,
      7000
    );

    assert.equal(
      result.totalLiabilitiesAndEquity,
      7000
    );

    assert.equal(
      result.difference,
      0
    );

    assert.equal(
      result.isBalanced,
      true
    );

  }
);


test(
  "preserves zero and inactive balance sheet accounts",
  async () => {

    const {
      BalanceSheetService,
    } = await import(
      "../services/balanceSheet.service.js"
    );


    const trialBalanceService = {

      async getTrialBalance() {

        return {

          companyId: "company-1",

          period: {
            from: "2026-04-01",
            to: "2026-09-07",
          },

          accounts: [

            {
              accountId: "asset-zero",
              accountCode: "1001",
              accountName: "Inactive Asset",
              nature: "asset",
              accountType: "other_asset",
              status: "inactive",
              closingBalance: 0,
            },

            {
              accountId: "liability-zero",
              accountCode: "2001",
              accountName: "Inactive Liability",
              nature: "liability",
              accountType: "other_liability",
              status: "inactive",
              closingBalance: 0,
            },

            {
              accountId: "equity-zero",
              accountCode: "3001",
              accountName: "Inactive Equity",
              nature: "equity",
              accountType: "equity",
              status: "inactive",
              closingBalance: 0,
            },

          ],

        };

      },

    };


    const service =
      new BalanceSheetService({
        trialBalanceService,
      });


    const result =
      await service.getBalanceSheet({
        companyId: "company-1",
        asOf: "2026-09-07",
      });


    assert.equal(
      result.assets.accounts.length,
      1
    );

    assert.equal(
      result.liabilities.accounts.length,
      1
    );

    assert.equal(
      result.equity.accounts.length,
      1
    );

    assert.equal(
      result.assets.accounts[0].amount,
      0
    );

    assert.equal(
      result.liabilities.accounts[0].amount,
      0
    );

    assert.equal(
      result.equity.accounts[0].amount,
      0
    );


    assert.deepEqual(
      result.currentPeriodResult,
      {
        type: "break-even",
        amount: 0,
      }
    );

  }
);
