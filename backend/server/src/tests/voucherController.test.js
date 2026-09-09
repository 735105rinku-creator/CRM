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

          "postVoucher",

          "voidVoucher",

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

test(
  "postVoucher passes accounting company, authenticated user and voucher id to the service",
  async () => {

    const controllerModule =
      await import(
        "../controllers/voucher.controller.js"
      );


    const serviceModule =
      await import(
        "../services/voucher.service.js"
      );

    const voucherService =
      serviceModule.default;


    const originalPostVoucher =
      voucherService.postVoucher;


    let receivedInput =
      null;


    voucherService.postVoucher =
      async (input) => {

        receivedInput =
          input;


        return {
          _id:
            input.voucherId,

          status:
            "posted",
        };

      };


    try {

      const req = {
        accountingAccess: {
          companyId:
            "64f000000000000000000001",
        },

        user: {
          _id:
            "64f000000000000000000009",
        },

        params: {
          voucherId:
            "64f000000000000000000010",
        },
      };


      let responseStatus =
        null;

      let responseBody =
        null;


      await new Promise(
        (
          resolve,
          reject
        ) => {

          const res = {

            status(code) {
              responseStatus =
                code;

              return res;
            },


            json(body) {
              responseBody =
                body;

              resolve();

              return res;
            },

          };


          controllerModule
            .postVoucher(
              req,
              res,
              reject
            );

        }
      );


      assert.deepEqual(
        receivedInput,
        {
          companyId:
            "64f000000000000000000001",

          voucherId:
            "64f000000000000000000010",

          userId:
            "64f000000000000000000009",
        }
      );


      assert.equal(
        responseStatus,
        200
      );


      assert.equal(
        responseBody.success,
        true
      );


      assert.equal(
        responseBody.data.status,
        "posted"
      );

    } finally {

      voucherService.postVoucher =
        originalPostVoucher;

    }

  }
);

test(
  "voidVoucher passes accounting company, authenticated user, voucher id and reason to the service",
  async () => {

    const controllerModule =
      await import(
        "../controllers/voucher.controller.js"
      );


    const serviceModule =
      await import(
        "../services/voucher.service.js"
      );

    const voucherService =
      serviceModule.default;


    const originalVoidVoucher =
      voucherService.voidVoucher;


    let receivedInput =
      null;


    voucherService.voidVoucher =
      async (input) => {

        receivedInput =
          input;


        return {
          _id:
            input.voucherId,

          status:
            "void",

          voidReason:
            input.reason,
        };

      };


    try {

      const req = {
        accountingAccess: {
          companyId:
            "64f000000000000000000001",
        },

        user: {
          _id:
            "64f000000000000000000009",
        },

        params: {
          voucherId:
            "64f000000000000000000010",
        },

        body: {
          reason:
            "Incorrect payment entry",
        },
      };


      let responseStatus =
        null;

      let responseBody =
        null;


      await new Promise(
        (
          resolve,
          reject
        ) => {

          const res = {

            status(code) {
              responseStatus =
                code;

              return res;
            },


            json(body) {
              responseBody =
                body;

              resolve();

              return res;
            },

          };


          controllerModule
            .voidVoucher(
              req,
              res,
              reject
            );

        }
      );


      assert.deepEqual(
        receivedInput,
        {
          companyId:
            "64f000000000000000000001",

          voucherId:
            "64f000000000000000000010",

          userId:
            "64f000000000000000000009",

          reason:
            "Incorrect payment entry",
        }
      );


      assert.equal(
        responseStatus,
        200
      );


      assert.equal(
        responseBody.success,
        true
      );


      assert.equal(
        responseBody.data.status,
        "void"
      );


      assert.equal(
        responseBody.data.voidReason,
        "Incorrect payment entry"
      );

    } finally {

      voucherService.voidVoucher =
        originalVoidVoucher;

    }

  }
);
