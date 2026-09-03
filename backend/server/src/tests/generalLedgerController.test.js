import assert from "node:assert/strict";

import {
  describe,
  test,
} from "node:test";


describe(
  "General Ledger controller",
  () => {

    test(
      "exports General Ledger list controller",
      async () => {

        const module =
          await import(
            "../controllers/generalLedger.controller.js"
          );


        assert.equal(
          typeof module.getGeneralLedger,
          "function"
        );

      }
    );


    test(
      "exports account ledger controller",
      async () => {

        const module =
          await import(
            "../controllers/generalLedger.controller.js"
          );


        assert.equal(
          typeof module.getAccountLedger,
          "function"
        );

      }
    );

  }
);