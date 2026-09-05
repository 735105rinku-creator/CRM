import assert from "node:assert/strict";

import {
  test,
} from "node:test";

test(
  "exports Day Book controller",
  async () => {

    const module =
      await import(
        "../controllers/dayBook.controller.js"
      );

    assert.equal(
      typeof module.getDayBook,
      "function"
    );

  }
);

test(
  "forwards company context and query and returns 200 response",
  async () => {

    const serviceModule =
      await import(
        "../services/dayBook.service.js"
      );

    const controllerModule =
      await import(
        "../controllers/dayBook.controller.js"
      );

    const original =
      serviceModule.DayBookService.prototype.getDayBook;

    let captured = null;

    serviceModule.DayBookService.prototype.getDayBook =
      async (args) => {
        captured = args;
        return { rows: [] };
      };

    const req = {
      accountingAccess: {
        companyId: "company-001",
      },
      query: {
        from: "2026-04-01",
      },
    };

    let statusCode = null;
    let body = null;
    let nextError = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(value) {
        body = value;
        return this;
      },
    };

    const next =
      (error) => {
        nextError = error;
      };

    try {
      await controllerModule.getDayBook(
        req,
        res,
        next
      );
    } finally {
      serviceModule.DayBookService.prototype.getDayBook =
        original;
    }

    assert.equal(nextError, null);

    assert.deepEqual(
      captured,
      {
        companyId: "company-001",
        query: {
          from: "2026-04-01",
        },
      }
    );

    assert.equal(statusCode, 200);
    assert.equal(body?.statusCode, 200);
    assert.equal(
      body?.message,
      "Day Book fetched successfully."
    );

  }
);

test(
  "rejects missing accounting company context",
  async () => {

    const controllerModule =
      await import(
        "../controllers/dayBook.controller.js"
      );

    let nextError = null;

    await controllerModule.getDayBook(
      { query: {} },
      {
        status() { return this; },
        json() { return this; },
      },
      (error) => {
        nextError = error;
      }
    );

    assert.ok(nextError);
    assert.equal(nextError.statusCode, 403);
    assert.match(
      nextError.message,
      /company context missing/i
    );

  }
);
