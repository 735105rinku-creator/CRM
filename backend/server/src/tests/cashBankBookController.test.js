import test from "node:test";
import assert from "node:assert/strict";


test(
  "CashBankBookController module exists",
  async () => {

    const module =
      await import(
        "../controllers/cashBankBook.controller.js"
      );

    assert.equal(
      typeof module.CashBankBookController,
      "function"
    );

  }
);


test(
  "forwards company context and query and returns 200 response",
  async () => {

    const {
      CashBankBookController,
    } =
      await import(
        "../controllers/cashBankBook.controller.js"
      );


    const calls = [];


    const cashBankBookService = {

      async getCashBankBook(input) {

        calls.push(input);

        return {
          accounts: [],
          summary: {
            totalAccounts: 0,
            totalOpening: 0,
            totalDebit: 0,
            totalCredit: 0,
            totalClosing: 0,
          },
        };

      },

    };


    const controller =
      new CashBankBookController({
        cashBankBookService,
      });


    const req = {

      accountingAccess: {
        companyId: "company-1",
      },

      query: {
        from: "2026-04-01",
        to: "2027-03-31",
        accountId: "bank-1",
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


    await controller.getCashBankBook(
      req,
      res,
      next
    );


    assert.deepEqual(
      calls,
      [
        {
          companyId: "company-1",
          query: {
            from: "2026-04-01",
            to: "2027-03-31",
            accountId: "bank-1",
          },
        },
      ]
    );


    assert.equal(
      responseBody.statusCode,
      200
    );


    assert.equal(
      responseBody.message,
      "Cash/Bank Book fetched successfully."
    );

  }
);


test(
  "rejects missing accounting company context",
  async () => {

    const {
      CashBankBookController,
    } =
      await import(
        "../controllers/cashBankBook.controller.js"
      );


    let serviceCalled =
      false;


    const controller =
      new CashBankBookController({

        cashBankBookService: {

          async getCashBankBook() {

            serviceCalled =
              true;

          },

        },

      });


    const req = {
      query: {},
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


    await controller.getCashBankBook(
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
