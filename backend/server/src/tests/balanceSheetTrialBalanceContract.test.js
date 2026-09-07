import test from "node:test";
import assert from "node:assert/strict";

import {
  BalanceSheetService
} from "../services/balanceSheet.service.js";


test(
  "Balance Sheet understands Trial Balance debit-credit closing balance objects",
  async () => {

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
              accountId: "cash-1",
              accountCode: "1001",
              accountName: "Cash",
              nature: "asset",
              accountType: "cash",
              status: "active",

              closingBalance: {
                debit: 15000,
                credit: 0,
              },
            },

            {
              accountId: "payable-1",
              accountCode: "2001",
              accountName: "Trade Payables",
              nature: "liability",
              accountType: "accounts_payable",
              status: "active",

              closingBalance: {
                debit: 0,
                credit: 5000,
              },
            },

            {
              accountId: "capital-1",
              accountCode: "3001",
              accountName: "Capital",
              nature: "equity",
              accountType: "capital",
              status: "active",

              closingBalance: {
                debit: 0,
                credit: 3500,
              },
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

              closingBalance: {
                debit: 0,
                credit: 10000,
              },
            },

            {
              accountId: "expense-1",
              accountCode: "5001",
              accountName: "Office Expense",
              nature: "expense",
              accountType: "direct_expense",
              status: "active",
              periodDebit: 3500,
              periodCredit: 0,

              closingBalance: {
                debit: 3500,
                credit: 0,
              },
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
      result.assets.total,
      15000
    );

    assert.equal(
      result.liabilities.total,
      5000
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
      result.assets.accounts[0]
        .closingBalance,
      15000
    );

    assert.equal(
      result.liabilities.accounts[0]
        .closingBalance,
      -5000
    );

  }
);