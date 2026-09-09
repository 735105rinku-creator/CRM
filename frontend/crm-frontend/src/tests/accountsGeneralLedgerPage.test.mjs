import assert from "node:assert/strict";

import {
  access,
  readFile,
} from "node:fs/promises";

import {
  describe,
  test,
} from "node:test";


const componentUrl =
  new URL(
    "../app/features/accounts/pages/general-ledger/general-ledger.component.ts",
    import.meta.url
  );


describe(
  "Accounts General Ledger page",
  () => {

    test(
      "General Ledger component file exists",
      async () => {

        await assert.doesNotReject(
          () =>
            access(
              componentUrl
            )
        );

      }
    );


    test(
      "defines standalone GeneralLedgerComponent",
      async () => {

        const source =
          await readFile(
            componentUrl,
            "utf8"
          );


        assert.match(
          source,
          /export\s+class\s+GeneralLedgerComponent/
        );


        assert.match(
          source,
          /standalone\s*:\s*true/
        );

      }
    );


    test(
      "uses GeneralLedgerService read-only flow",
      async () => {

        const source =
          await readFile(
            componentUrl,
            "utf8"
          );


        assert.match(
          source,
          /GeneralLedgerService/
        );


        assert.match(
          source,
          /\bgetGeneralLedger\s*\(/
        );


        assert.match(
          source,
          /\bloadLedger\s*\(/
        );

      }
    );


    test(
      "supports loading error empty and data states",
      async () => {

        const source =
          await readFile(
            componentUrl,
            "utf8"
          );


        assert.match(
          source,
          /\bisLoading\b/
        );


        assert.match(
          source,
          /\berrorMessage\b/
        );


        assert.match(
          source,
          /\baccounts\b/
        );


        assert.match(
          source,
          /\bsummary\b/
        );

      }
    );


    test(
      "does not expose General Ledger write operations",
      async () => {

        const source =
          await readFile(
            componentUrl,
            "utf8"
          );


        assert.doesNotMatch(
          source,
          /\.post\s*</
        );


        assert.doesNotMatch(
          source,
          /\.patch\s*</
        );


        assert.doesNotMatch(
          source,
          /\.delete\s*</
        );

      }
    );

  }
);