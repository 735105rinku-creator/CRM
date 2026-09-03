import assert from "node:assert/strict";

import {
  readFile,
} from "node:fs/promises";

import {
  describe,
  test,
} from "node:test";


const modelsUrl =
  new URL(
    "../app/features/accounts/models/accounts.models.ts",
    import.meta.url
  );


const readModels =
  () =>
    readFile(
      modelsUrl,
      "utf8"
    );


describe(
  "Accounts General Ledger frontend models",
  () => {

    test(
      "defines ledger balance contract",
      async () => {

        const source =
          await readModels();


        assert.match(
          source,
          /export\s+interface\s+LedgerBalance/
        );


        assert.match(
          source,
          /amount\s*:\s*number/
        );


        /*
         * Accept both:
         *
         * type: 'debit' | 'credit'
         *
         * and:
         *
         * type:
         *   | 'debit'
         *   | 'credit'
         */

        assert.match(
          source,
          /type\s*:\s*(?:\r?\n\s*)?\|?\s*['"]debit['"]\s*(?:\r?\n\s*)?\|\s*['"]credit['"]/
        );

      }
    );


    test(
      "defines General Ledger account summary",
      async () => {

        const source =
          await readModels();


        assert.match(
          source,
          /export\s+interface\s+GeneralLedgerAccount/
        );


        for (
          const field of [
            "accountId",
            "accountCode",
            "accountName",
            "openingBalance",
            "totalDebit",
            "totalCredit",
            "closingBalance",
          ]
        ) {

          assert.match(
            source,
            new RegExp(
              `\\b${field}\\??\\s*:`
            ),
            `Missing General Ledger account field: ${field}`
          );

        }

      }
    );


    test(
      "defines General Ledger response summary",
      async () => {

        const source =
          await readModels();


        assert.match(
          source,
          /export\s+interface\s+GeneralLedgerSummary/
        );


        assert.match(
          source,
          /totalAccounts\s*:\s*number/
        );


        assert.match(
          source,
          /totalDebit\s*:\s*number/
        );


        assert.match(
          source,
          /totalCredit\s*:\s*number/
        );


        assert.match(
          source,
          /export\s+interface\s+GeneralLedgerResponse/
        );


        assert.match(
          source,
          /accounts\s*:\s*GeneralLedgerAccount\[\]/
        );


        assert.match(
          source,
          /summary\s*:\s*GeneralLedgerSummary/
        );

      }
    );

  }
);