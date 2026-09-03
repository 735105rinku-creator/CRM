import assert from "node:assert/strict";

import {
  describe,
  test,
} from "node:test";


describe(
  "Voucher Controller",
  () => {

    test(
      "exports all Phase 1 Voucher controller handlers",
      async () => {

        let module;


        try {

          module =
            await import(
              "../controllers/voucher.controller.js"
            );

        } catch (
          error
        ) {

          assert.fail(
            `Voucher controller must exist: ${error.message}`
          );

        }


        const requiredHandlers = [

          "createVoucher",

          "getVouchers",

          "getVoucherById",

          "updateVoucher",

        ];


        for (
          const handler of
            requiredHandlers
        ) {

          assert.equal(
            typeof module[
              handler
            ],
            "function",
            `Missing Voucher controller handler: ${handler}`
          );

        }

      }
    );


    test(
      "does not expose a physical delete handler",
      async () => {

        const module =
          await import(
            "../controllers/voucher.controller.js"
          );


        assert.equal(
          module.deleteVoucher,
          undefined
        );


        assert.equal(
          module.removeVoucher,
          undefined
        );

      }
    );

  }
);
