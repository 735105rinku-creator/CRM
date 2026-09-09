import assert from "node:assert/strict";

import {
  readFile,
} from "node:fs/promises";

import {
  describe,
  test,
} from "node:test";


const routesUrl =
  new URL(
    "../app/features/accounts/accounts.routes.ts",
    import.meta.url
  );


const readRoutes =
  () =>
    readFile(
      routesUrl,
      "utf8"
    );


describe(
  "Accounts General Ledger route",
  () => {

    test(
      "defines ledger route",
      async () => {

        const source =
          await readRoutes();


        assert.match(
          source,
          /path\s*:\s*['"]ledger['"]/
        );

      }
    );


    test(
      "ledger route lazy loads real GeneralLedgerComponent",
      async () => {

        const source =
          await readRoutes();


        assert.match(
          source,
          /\.\/pages\/general-ledger\/general-ledger\.component/
        );


        /*
         * Accept project formatting:
         *
         * .then(module => module.GeneralLedgerComponent)
         *
         * OR
         *
         * .then(
         *   (module) =>
         *     module.GeneralLedgerComponent
         * )
         */

        assert.match(
          source,
          /\.then\s*\(\s*\(?\s*module\s*\)?\s*=>\s*module\.GeneralLedgerComponent\s*\)/
        );

      }
    );


    test(
      "ledger route is not mapped to AccountsPlaceholderComponent",
      async () => {

        const source =
          await readRoutes();


        const ledgerBlockMatch =
          source.match(
            /{\s*path\s*:\s*['"]ledger['"][\s\S]*?(?=\n\s*},|\n\s*}\s*,|\n\s*])/m
          );


        assert.ok(
          ledgerBlockMatch,
          "Could not find ledger route block."
        );


        assert.doesNotMatch(
          ledgerBlockMatch[0],
          /AccountsPlaceholderComponent/
        );


        assert.doesNotMatch(
          ledgerBlockMatch[0],
          /pages\/placeholder/
        );


        assert.match(
          ledgerBlockMatch[0],
          /GeneralLedgerComponent/
        );

      }
    );


    test(
      "ledger route retains Accounts metadata",
      async () => {

        const source =
          await readRoutes();


        const ledgerBlockMatch =
          source.match(
            /{\s*path\s*:\s*['"]ledger['"][\s\S]*?(?=\n\s*},|\n\s*}\s*,|\n\s*])/m
          );


        assert.ok(
          ledgerBlockMatch,
          "Could not find ledger route block."
        );


        assert.match(
          ledgerBlockMatch[0],
          /title\s*:\s*['"]General Ledger['"]/
        );


        assert.match(
          ledgerBlockMatch[0],
          /section\s*:\s*['"]Accounts['"]/
        );


        assert.match(
          ledgerBlockMatch[0],
          /feature\s*:\s*['"]ledger['"]/
        );

      }
    );

  }
);