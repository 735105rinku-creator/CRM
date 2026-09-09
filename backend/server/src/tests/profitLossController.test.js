import test from "node:test";
import assert from "node:assert/strict";


test(
  "ProfitLossController module exists",
  async () => {

    const module =
      await import(
        "../controllers/profitLoss.controller.js"
      );

    assert.equal(
      typeof module.ProfitLossController,
      "function"
    );

  }
);


test(
  "forwards company context and query and returns 200 response",
  async () => {

    const {
      ProfitLossController,
    } =
      await import(
        "../controllers/profitLoss.controller.js"
      );


    const calls = [];


    const controller =
      new ProfitLossController({

        profitLossService: {

          async getProfitLoss(query) {

            calls.push(query);

            return {
              companyId: query.companyId,
              period: {
                from: query.from,
                to: query.to,
              },
              income: {
                accounts: [],
                total: 0,
              },
              expenses: {
                accounts: [],
                total: 0,
              },
              netProfit: 0,
              netLoss: 0,
              result: "break-even",
            };

          },

        },

      });


    const req = {

      accountingAccess: {
        companyId: "company-1",
      },

      query: {
        from: "2026-04-01",
        to: "2027-03-31",
      },

    };


    let responseBody = null;


    const res = {

      json(body) {

        responseBody = body;

        return body;

      },

    };


    await controller.getProfitLoss(
      req,
      res
    );


    assert.deepEqual(
      calls,
      [
        {
          companyId: "company-1",
          from: "2026-04-01",
          to: "2027-03-31",
        },
      ]
    );


    assert.equal(
      responseBody.statusCode,
      200
    );

    assert.equal(
      responseBody.message,
      "Profit & Loss fetched successfully."
    );

  }
);


test(
  "rejects missing accounting company context",
  async () => {

    const {
      ProfitLossController,
    } =
      await import(
        "../controllers/profitLoss.controller.js"
      );


    let serviceCalled = false;


    const controller =
      new ProfitLossController({

        profitLossService: {

          async getProfitLoss() {

            serviceCalled = true;

          },

        },

      });


    const req = {
      query: {},
    };


    const res = {
      json() {},
    };


    let forwardedError = null;


    const next = (
      error
    ) => {

      forwardedError =
        error;

    };


    await controller.getProfitLoss(
      req,
      res,
      next
    );


    assert.equal(
      serviceCalled,
      false
    );


    assert.ok(
      forwardedError
    );


    assert.equal(
      forwardedError.statusCode,
      403
    );


    assert.equal(
      forwardedError.message,
      "Accounting company context missing."
    );

  }
);