import assert from "node:assert/strict";

import {
  describe,
  test,
} from "node:test";

import {
  GeneralLedgerService,
} from "../services/generalLedger.service.js";


describe(
  "General Ledger actual repository contract",
  () => {

    test(
      "works with ChartOfAccountRepository findById and list methods",
      async () => {

        const accounts = [
          {
            _id:
              "account-001",

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
        ];


        const chartOfAccountRepository = {

          async findById({
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


          async list() {

            return accounts;

          },

        };


        const journalEntryRepository = {

          async findPostedLinesByAccount() {

            return [];

          },

        };


        const service =
          new GeneralLedgerService({
            chartOfAccountRepository,
            journalEntryRepository,
          });


        const accountLedger =
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
          accountLedger
            .account
            .accountCode,
          "1001"
        );


        const generalLedger =
          await service
            .getGeneralLedger({
              companyId:
                "company-001",

              query:
                {},
            });


        assert.equal(
          generalLedger
            .accounts
            .length,
          1
        );


        assert.equal(
          generalLedger
            .accounts[0]
            .accountCode,
          "1001"
        );

      }
    );

  }
);