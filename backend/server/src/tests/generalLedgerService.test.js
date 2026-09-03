import assert from "node:assert/strict";

import {
  describe,
  test,
} from "node:test";


describe(
  "General Ledger service",
  () => {

    test(
      "GeneralLedgerService module exists",
      async () => {

        const module =
          await import(
            "../services/generalLedger.service.js"
          );


        assert.ok(
          module.GeneralLedgerService
        );

      }
    );


    test(
      "exposes account ledger method",
      async () => {

        const {
          GeneralLedgerService,
        } =
          await import(
            "../services/generalLedger.service.js"
          );


        assert.equal(
          typeof GeneralLedgerService
            .prototype
            .getAccountLedger,
          "function"
        );

      }
    );


    test(
      "exposes general ledger list method",
      async () => {

        const {
          GeneralLedgerService,
        } =
          await import(
            "../services/generalLedger.service.js"
          );


        assert.equal(
          typeof GeneralLedgerService
            .prototype
            .getGeneralLedger,
          "function"
        );

      }
    );

  }
);