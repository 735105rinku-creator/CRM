import assert from "node:assert/strict";

import {
  describe,
  test,
} from "node:test";

import {
  GeneralLedgerService,
} from "../services/generalLedger.service.js";


describe(
  "General Ledger calculation",
  () => {

    test(
      "calculates running balance from opening balance and posted journal lines",
      async () => {

        const chartOfAccountRepository = {

          async findChartOfAccountById() {

            return {
              _id:
                "account-001",

              accountCode:
                "1001",

              accountName:
                "Cash Account",

              nature:
                "asset",

              openingBalance:
                1000,

              openingBalanceType:
                "debit",

              status:
                "active",
            };

          },

        };


        const journalEntryRepository = {

          async findPostedLinesByAccount() {

            return [
              {
                journalId:
                  "journal-001",

                journalNumber:
                  "JV-001",

                journalDate:
                  "2026-09-01T00:00:00.000Z",

                narration:
                  "Cash received",

                referenceType:
                  "receipt",

                referenceNo:
                  "RCPT-001",

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

                narration:
                  "Cash expense",

                referenceType:
                  "expense",

                referenceNo:
                  "EXP-001",

                debit:
                  0,

                credit:
                  150,
              },
            ];

          },

        };


        const service =
          new GeneralLedgerService({
            chartOfAccountRepository,
            journalEntryRepository,
          });


        const result =
          await service
            .getAccountLedger({
              companyId:
                "company-001",

              accountId:
                "account-001",

              query:
                {},
            });


        assert.equal(
          result.account.accountCode,
          "1001"
        );


        assert.equal(
          result.openingBalance.amount,
          1000
        );


        assert.equal(
          result.openingBalance.type,
          "debit"
        );


        assert.equal(
          result.entries.length,
          2
        );


        assert.equal(
          result.entries[0]
            .runningBalance,
          1300
        );


        assert.equal(
          result.entries[0]
            .balanceType,
          "debit"
        );


        assert.equal(
          result.entries[1]
            .runningBalance,
          1150
        );


        assert.equal(
          result.entries[1]
            .balanceType,
          "debit"
        );


        assert.deepEqual(
          result.totals,
          {
            debit:
              300,

            credit:
              150,
          }
        );


        assert.deepEqual(
          result.closingBalance,
          {
            amount:
              1150,

            type:
              "debit",
          }
        );

      }
    );

  }
);