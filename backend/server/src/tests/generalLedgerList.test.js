import assert from "node:assert/strict";

import {
  describe,
  test,
} from "node:test";

import {
  GeneralLedgerService,
} from "../services/generalLedger.service.js";


describe(
  "General Ledger list",
  () => {

    test(
      "returns account-wise opening, movement and closing balances",
      async () => {

        const accounts = [
          {
            _id:
              "account-cash",

            accountCode:
              "1001",

            accountName:
              "Cash",

            nature:
              "asset",

            openingBalance:
              1000,

            openingBalanceType:
              "debit",

            status:
              "active",
          },

          {
            _id:
              "account-payable",

            accountCode:
              "2001",

            accountName:
              "Accounts Payable",

            nature:
              "liability",

            openingBalance:
              500,

            openingBalanceType:
              "credit",

            status:
              "active",
          },
        ];


        const chartOfAccountRepository = {

          async findChartOfAccounts() {

            return accounts;

          },


          async findChartOfAccountById({
            accountId,
          }) {

            return accounts.find(
              (
                account
              ) =>
                account._id ===
                accountId
            ) || null;

          },

        };


        const journalEntryRepository = {

          async findPostedLinesByAccount({
            accountId,
          }) {

            if (
              accountId ===
              "account-cash"
            ) {

              return [
                {
                  journalId:
                    "journal-001",

                  journalNumber:
                    "JV-001",

                  journalDate:
                    "2026-09-01T00:00:00.000Z",

                  debit:
                    300,

                  credit:
                    0,
                },

                {
                  journalId:
                    "journal-002",

                  journalNumber:
                    "JV-002",

                  journalDate:
                    "2026-09-02T00:00:00.000Z",

                  debit:
                    0,

                  credit:
                    150,
                },
              ];

            }


            if (
              accountId ===
              "account-payable"
            ) {

              return [
                {
                  journalId:
                    "journal-003",

                  journalNumber:
                    "JV-003",

                  journalDate:
                    "2026-09-03T00:00:00.000Z",

                  debit:
                    100,

                  credit:
                    250,
                },
              ];

            }


            return [];

          },

        };


        const service =
          new GeneralLedgerService({
            chartOfAccountRepository,
            journalEntryRepository,
          });


        const result =
          await service
            .getGeneralLedger({
              companyId:
                "company-001",

              query:
                {},
            });


        assert.equal(
          result.accounts.length,
          2
        );


        /* =====================================================
           CASH
        ===================================================== */

        assert.equal(
          result.accounts[0]
            .accountCode,
          "1001"
        );


        assert.deepEqual(
          result.accounts[0]
            .openingBalance,
          {
            amount:
              1000,

            type:
              "debit",
          }
        );


        assert.equal(
          result.accounts[0]
            .totalDebit,
          300
        );


        assert.equal(
          result.accounts[0]
            .totalCredit,
          150
        );


        assert.deepEqual(
          result.accounts[0]
            .closingBalance,
          {
            amount:
              1150,

            type:
              "debit",
          }
        );


        /* =====================================================
           ACCOUNTS PAYABLE
        ===================================================== */

        assert.equal(
          result.accounts[1]
            .accountCode,
          "2001"
        );


        assert.deepEqual(
          result.accounts[1]
            .openingBalance,
          {
            amount:
              500,

            type:
              "credit",
          }
        );


        assert.equal(
          result.accounts[1]
            .totalDebit,
          100
        );


        assert.equal(
          result.accounts[1]
            .totalCredit,
          250
        );


        assert.deepEqual(
          result.accounts[1]
            .closingBalance,
          {
            amount:
              650,

            type:
              "credit",
          }
        );


        /* =====================================================
           SUMMARY
        ===================================================== */

        assert.deepEqual(
          result.summary,
          {
            totalAccounts:
              2,

            totalDebit:
              400,

            totalCredit:
              400,
          }
        );

      }
    );

  }
);