import assert from "node:assert/strict";

import {
  access,
  readFile,
} from "node:fs/promises";

import {
  describe,
  test,
} from "node:test";


const serviceUrl =
  new URL(
    "../app/features/accounts/services/general-ledger.service.ts",
    import.meta.url
  );


describe(
  "Accounts General Ledger frontend service",
  () => {

    test(
      "General Ledger service file exists",
      async () => {

        await assert.doesNotReject(
          () =>
            access(
              serviceUrl
            )
        );

      }
    );


    test(
      "uses the General Ledger backend base endpoint",
      async () => {

        const source =
          await readFile(
            serviceUrl,
            "utf8"
          );


        assert.match(
          source,
          /\/accounting\/general-ledger/
        );

      }
    );


    test(
      "exposes General Ledger list and account ledger methods",
      async () => {

        const source =
          await readFile(
            serviceUrl,
            "utf8"
          );


        assert.match(
          source,
          /\bgetGeneralLedger\s*\(/
        );


        assert.match(
          source,
          /\bgetAccountLedger\s*\(/
        );


        assert.match(
          source,
          /GeneralLedgerResponse/
        );

      }
    );

  }
);