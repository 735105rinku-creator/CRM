import test from "node:test";
import assert from "node:assert/strict";


test(
  "OutstandingController exposes getOutstanding",
  async () => {

    const module =
      await import(
        "../controllers/outstanding.controller.js"
      );

    assert.equal(
      typeof module.getOutstanding,
      "function"
    );

  }
);


test(
  "outstanding controller passes company and query to service",
  async () => {

    const {
      OutstandingController,
    } =
      await import(
        "../controllers/outstanding.controller.js"
      );

    let receivedInput = null;

    const service = {
      async getOutstanding(input) {
        receivedInput = input;

        return {
          asOf: "2026-09-07",

          receivables: {
            accounts: [],
            total: 0,
          },

          payables: {
            accounts: [],
            total: 0,
          },
        };
      },
    };


    const controller =
      new OutstandingController({
        outstandingService:
          service,
      });


    const req = {
      accountingAccess: {
        companyId:
          "company-1",
      },

      query: {
        type:
          "receivable",

        asOf:
          "2026-09-07",
      },
    };


    let statusCode = null;
    let payload = null;


    const res = {

      status(code) {
        statusCode = code;
        return this;
      },

      json(body) {
        payload = body;
        return this;
      },

    };


    await controller.getOutstanding(
      req,
      res
    );


    assert.deepEqual(
      receivedInput,
      {
        companyId:
          "company-1",

        query: {
          type:
            "receivable",

          asOf:
            "2026-09-07",
        },
      }
    );


    assert.equal(
      statusCode,
      200
    );


    assert.equal(
      payload.success,
      true
    );


    assert.equal(
      payload.data.asOf,
      "2026-09-07"
    );

  }
);
