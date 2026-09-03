import assert from "node:assert/strict";

import {
  describe,
  test,
} from "node:test";

import {
  readFile,
} from "node:fs/promises";


const controllerUrl =
  new URL(
    "../controllers/generalLedger.controller.js",
    import.meta.url
  );


describe(
  "General Ledger repository wiring",
  () => {

    test(
      "controller injects repository instances instead of module namespaces",
      async () => {

        const source =
          await readFile(
            controllerUrl,
            "utf8"
          );


        assert.doesNotMatch(
          source,
          /import\s+\*\s+as\s+chartOfAccountRepository/
        );


        assert.doesNotMatch(
          source,
          /import\s+\*\s+as\s+journalEntryRepository/
        );


        assert.match(
          source,
          /import\s+chartOfAccountRepository/
        );


        assert.match(
          source,
          /import\s+journalEntryRepository/
        );

      }
    );

  }
);