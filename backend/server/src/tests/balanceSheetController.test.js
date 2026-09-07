import test from "node:test";
import assert from "node:assert/strict";


test(
  "BalanceSheetController module exists",
  async () => {

    const module =
      await import(
        "../controllers/balanceSheet.controller.js"
      );

    assert.equal(
      typeof module.BalanceSheetController,
      "function"
    );

  }
);


test(
  "forwards company context and asOf and returns 200 response",
  async () => {

    const {
      BalanceSheetController,
    } = await import(
      "../controllers/balanceSheet.controller.js"
    );


    const calls = [];


    const balanceSheetService = {

      async getBalanceSheet(query) {

        calls.push(query);

        return {
          companyId: "company-1",
          asOf: "2026-09-07",
        };

      },

    };


    const controller =
      new BalanceSheetController({
        balanceSheetService,
      });


    const req = {

      accountingAccess: {
        companyId: "company-1",
      },

      query: {
        asOf: "2026-09-07",
      },

    };


    let responseBody;


    const res = {

      json(body) {

        responseBody = body;

        return body;

      },

    };


    const next = (error) => {

      throw error;

    };


    await controller.getBalanceSheet(
      req,
      res,
      next
    );


    assert.deepEqual(
      calls,
      [
        {
          companyId: "company-1",
          asOf: "2026-09-07",
        },
      ]
    );


    assert.equal(
      responseBody.statusCode,
      200
    );


    assert.equal(
      responseBody.message,
      "Balance Sheet fetched successfully."
    );


    assert.deepEqual(
      responseBody.data,
      {
        companyId: "company-1",
        asOf: "2026-09-07",
      }
    );

  }
);


test(
  "rejects missing accounting company context",
  async () => {

    const {
      BalanceSheetController,
    } = await import(
      "../controllers/balanceSheet.controller.js"
    );


    let serviceCalled =
      false;


    const balanceSheetService = {

      async getBalanceSheet() {

        serviceCalled =
          true;

      },

    };


    const controller =
      new BalanceSheetController({
        balanceSheetService,
      });


    const req = {

      query: {
        asOf: "2026-09-07",
      },

    };


    const res = {

      json() {

        throw new Error(
          "Response should not be sent."
        );

      },

    };


    let forwardedError;


    const next = (error) => {

      forwardedError =
        error;

    };


    await controller.getBalanceSheet(
      req,
      res,
      next
    );


    assert.equal(
      serviceCalled,
      false
    );


    assert.equal(
      forwardedError?.statusCode,
      403
    );


    assert.equal(
      forwardedError?.message,
      "Accounting company context missing."
    );

  }
);
