import test from "node:test";
import assert from "node:assert/strict";

const modulePath =
  new URL(
    "../controllers/gstReport.controller.js",
    import.meta.url
  );

test(
  "GstReportController exposes getGstReport",
  async () => {
    const module =
      await import(
        modulePath.href
      );

    assert.equal(
      typeof module.GstReportController,
      "function"
    );

    assert.equal(
      typeof module.getGstReport,
      "function"
    );
  }
);

test(
  "GST controller passes company context and query to service",
  async () => {
    const module =
      await import(
        modulePath.href
      );

    let received =
      null;

    const fakeService = {
      async getGstReport(input) {
        received =
          input;

        return {
          from:
            "2026-09-01",
          to:
            "2026-09-30",
          outputTax: {
            total:
              180,
            entries:
              [],
          },
          inputTax: {
            total:
              100,
            entries:
              [],
          },
          netGst: {
            amount:
              80,
            type:
              "payable",
          },
        };
      },
    };

    const controller =
      new module.GstReportController({
        gstReportService:
          fakeService,
      });

    const req = {
      accountingAccess: {
        companyId:
          "company-1",
      },

      query: {
        from:
          "2026-09-01",
        to:
          "2026-09-30",
      },
    };

    let statusCode =
      null;

    let responseBody =
      null;

    const res = {
      status(code) {
        statusCode =
          code;

        return this;
      },

      json(body) {
        responseBody =
          body;

        return body;
      },
    };

    await controller.getGstReport(
      req,
      res
    );

    assert.deepEqual(
      received,
      {
        companyId:
          "company-1",

        query: {
          from:
            "2026-09-01",
          to:
            "2026-09-30",
        },
      }
    );

    assert.equal(
      statusCode,
      200
    );

    assert.equal(
      responseBody.statusCode,
      200
    );
  }
);

test(
  "GST controller rejects missing accounting company context",
  async () => {
    const module =
      await import(
        modulePath.href
      );

    const controller =
      new module.GstReportController({
        gstReportService: {
          async getGstReport() {
            throw new Error(
              "service should not run"
            );
          },
        },
      });

    const req = {
      accountingAccess:
        null,

      query:
        {},
    };

    const res = {};

    await assert.rejects(
      () =>
        controller.getGstReport(
          req,
          res
        ),
      /Accounting company context missing/i
    );
  }
);
