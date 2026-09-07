import test from "node:test";
import assert from "node:assert/strict";

const modulePath =
  new URL(
    "../services/gstReport.service.js",
    import.meta.url
  );

async function loadServiceClass() {
  const module =
    await import(
      modulePath.href
    );

  return module.GstReportService;
}

function createChartRepository() {
  return {
    async list() {
      return [
        {
          _id: "sales",
          accountCode: "SALES",
          accountName: "Sales",
          accountType: "sales",
          status: "active",
        },
        {
          _id: "purchase",
          accountCode: "PURCHASE",
          accountName: "Purchase",
          accountType: "purchase",
          status: "active",
        },
        {
          _id: "output-tax",
          accountCode: "GST-OUT",
          accountName: "Output GST",
          accountType: "tax",
          status: "active",
        },
        {
          _id: "input-tax",
          accountCode: "GST-IN",
          accountName: "Input GST",
          accountType: "tax",
          status: "active",
        },
        {
          _id: "inactive-tax",
          accountCode: "GST-OLD",
          accountName: "Old GST",
          accountType: "tax",
          status: "inactive",
        },
        {
          _id: "bank",
          accountCode: "BANK",
          accountName: "Bank",
          accountType: "bank",
          status: "active",
        },
      ];
    },
  };
}

function createVoucherRepository(
  vouchers = []
) {
  const calls = [];

  return {
    calls,

    async list(query) {
      calls.push(query);

      return vouchers;
    },
  };
}

async function createService(
  vouchers = []
) {
  const GstReportService =
    await loadServiceClass();

  const voucherRepository =
    createVoucherRepository(
      vouchers
    );

  const chartOfAccountRepository =
    createChartRepository();

  const service =
    new GstReportService({
      voucherRepository,
      chartOfAccountRepository,
    });

  return {
    service,
    voucherRepository,
  };
}

test(
  "GstReportService module exists",
  async () => {
    const GstReportService =
      await loadServiceClass();

    assert.equal(
      typeof GstReportService,
      "function"
    );
  }
);

test(
  "reads only posted vouchers for the requested company and date range",
  async () => {
    const {
      service,
      voucherRepository,
    } =
      await createService([]);

    await service.getGstReport({
      companyId:
        "company-1",
      query: {
        from:
          "2026-04-01",
        to:
          "2027-03-31",
      },
    });

    assert.equal(
      voucherRepository.calls.length,
      1
    );

    assert.equal(
      voucherRepository.calls[0].companyId,
      "company-1"
    );

    assert.equal(
      voucherRepository.calls[0].status,
      "posted"
    );

    assert.equal(
      voucherRepository.calls[0].from,
      "2026-04-01"
    );

    assert.equal(
      voucherRepository.calls[0].to,
      "2027-03-31"
    );
  }
);

test(
  "calculates output tax from Sales Voucher tax credits",
  async () => {
    const {
      service,
    } =
      await createService([
        {
          _id:
            "sales-voucher-1",
          voucherNumber:
            "SV/2026-27/000001",
          voucherType:
            "sales",
          voucherDate:
            "2026-09-05",
          status:
            "posted",
          lines: [
            {
              accountId:
                "bank",
              debit:
                1180,
              credit:
                0,
            },
            {
              accountId:
                "sales",
              debit:
                0,
              credit:
                1000,
            },
            {
              accountId:
                "output-tax",
              debit:
                0,
              credit:
                180,
            },
          ],
        },
      ]);

    const result =
      await service.getGstReport({
        companyId:
          "company-1",
        query: {
          from:
            "2026-09-01",
          to:
            "2026-09-30",
        },
      });

    assert.equal(
      result.outputTax.total,
      180
    );

    assert.equal(
      result.inputTax.total,
      0
    );

    assert.equal(
      result.netGst.amount,
      180
    );

    assert.equal(
      result.netGst.type,
      "payable"
    );
  }
);

test(
  "calculates input tax from Purchase Voucher tax debits",
  async () => {
    const {
      service,
    } =
      await createService([
        {
          _id:
            "purchase-voucher-1",
          voucherNumber:
            "PV/2026-27/000001",
          voucherType:
            "purchase",
          voucherDate:
            "2026-09-05",
          status:
            "posted",
          lines: [
            {
              accountId:
                "purchase",
              debit:
                1000,
              credit:
                0,
            },
            {
              accountId:
                "input-tax",
              debit:
                180,
              credit:
                0,
            },
            {
              accountId:
                "bank",
              debit:
                0,
              credit:
                1180,
            },
          ],
        },
      ]);

    const result =
      await service.getGstReport({
        companyId:
          "company-1",
        query: {
          from:
            "2026-09-01",
          to:
            "2026-09-30",
        },
      });

    assert.equal(
      result.inputTax.total,
      180
    );

    assert.equal(
      result.outputTax.total,
      0
    );

    assert.equal(
      result.netGst.amount,
      180
    );

    assert.equal(
      result.netGst.type,
      "receivable"
    );
  }
);

test(
  "reduces output tax for Credit Note tax debits",
  async () => {
    const {
      service,
    } =
      await createService([
        {
          _id:
            "sales-voucher-1",
          voucherNumber:
            "SV/2026-27/000001",
          voucherType:
            "sales",
          voucherDate:
            "2026-09-05",
          status:
            "posted",
          lines: [
            {
              accountId:
                "output-tax",
              debit:
                0,
              credit:
                180,
            },
          ],
        },
        {
          _id:
            "credit-note-1",
          voucherNumber:
            "CN/2026-27/000001",
          voucherType:
            "credit_note",
          voucherDate:
            "2026-09-06",
          status:
            "posted",
          lines: [
            {
              accountId:
                "output-tax",
              debit:
                30,
              credit:
                0,
            },
          ],
        },
      ]);

    const result =
      await service.getGstReport({
        companyId:
          "company-1",
        query: {
          from:
            "2026-09-01",
          to:
            "2026-09-30",
        },
      });

    assert.equal(
      result.outputTax.total,
      150
    );
  }
);

test(
  "reduces input tax for Debit Note tax credits",
  async () => {
    const {
      service,
    } =
      await createService([
        {
          _id:
            "purchase-voucher-1",
          voucherNumber:
            "PV/2026-27/000001",
          voucherType:
            "purchase",
          voucherDate:
            "2026-09-05",
          status:
            "posted",
          lines: [
            {
              accountId:
                "input-tax",
              debit:
                180,
              credit:
                0,
            },
          ],
        },
        {
          _id:
            "debit-note-1",
          voucherNumber:
            "DN/2026-27/000001",
          voucherType:
            "debit_note",
          voucherDate:
            "2026-09-06",
          status:
            "posted",
          lines: [
            {
              accountId:
                "input-tax",
              debit:
                0,
              credit:
                30,
            },
          ],
        },
      ]);

    const result =
      await service.getGstReport({
        companyId:
          "company-1",
        query: {
          from:
            "2026-09-01",
          to:
            "2026-09-30",
        },
      });

    assert.equal(
      result.inputTax.total,
      150
    );
  }
);

test(
  "ignores non-tax ledger lines",
  async () => {
    const {
      service,
    } =
      await createService([
        {
          _id:
            "sales-voucher-1",
          voucherType:
            "sales",
          voucherDate:
            "2026-09-05",
          status:
            "posted",
          lines: [
            {
              accountId:
                "bank",
              debit:
                1180,
              credit:
                0,
            },
            {
              accountId:
                "sales",
              debit:
                0,
              credit:
                1180,
            },
          ],
        },
      ]);

    const result =
      await service.getGstReport({
        companyId:
          "company-1",
        query: {
          from:
            "2026-09-01",
          to:
            "2026-09-30",
        },
      });

    assert.equal(
      result.outputTax.total,
      0
    );

    assert.equal(
      result.inputTax.total,
      0
    );
  }
);

test(
  "preserves inactive tax ledgers in historical GST calculation",
  async () => {
    const {
      service,
    } =
      await createService([
        {
          _id:
            "sales-voucher-old",
          voucherType:
            "sales",
          voucherDate:
            "2026-05-05",
          status:
            "posted",
          lines: [
            {
              accountId:
                "inactive-tax",
              debit:
                0,
              credit:
                90,
            },
          ],
        },
      ]);

    const result =
      await service.getGstReport({
        companyId:
          "company-1",
        query: {
          from:
            "2026-04-01",
          to:
            "2026-06-30",
        },
      });

    assert.equal(
      result.outputTax.total,
      90
    );
  }
);

test(
  "rejects invalid date format",
  async () => {
    const {
      service,
    } =
      await createService([]);

    await assert.rejects(
      () =>
        service.getGstReport({
          companyId:
            "company-1",
          query: {
            from:
              "07-09-2026",
            to:
              "2026-09-30",
          },
        }),
      /from|date|YYYY-MM-DD/i
    );
  }
);

test(
  "rejects when from date is after to date",
  async () => {
    const {
      service,
    } =
      await createService([]);

    await assert.rejects(
      () =>
        service.getGstReport({
          companyId:
            "company-1",
          query: {
            from:
              "2026-10-01",
            to:
              "2026-09-30",
          },
        }),
      /from.*to|date range/i
    );
  }
);

test(
  "returns transaction rows with voucher and tax ledger details",
  async () => {
    const {
      service,
    } =
      await createService([
        {
          _id:
            "sales-voucher-1",
          voucherNumber:
            "SV/2026-27/000001",
          voucherType:
            "sales",
          voucherDate:
            "2026-09-05",
          status:
            "posted",
          lines: [
            {
              accountId:
                "output-tax",
              debit:
                0,
              credit:
                180,
            },
          ],
        },
      ]);

    const result =
      await service.getGstReport({
        companyId:
          "company-1",
        query: {
          from:
            "2026-09-01",
          to:
            "2026-09-30",
        },
      });

    assert.equal(
      result.outputTax.entries.length,
      1
    );

    assert.equal(
      result.outputTax.entries[0].voucherNumber,
      "SV/2026-27/000001"
    );

    assert.equal(
      result.outputTax.entries[0].voucherType,
      "sales"
    );

    assert.equal(
      result.outputTax.entries[0].accountType,
      "tax"
    );

    assert.equal(
      result.outputTax.entries[0].taxAmount,
      180
    );
  }
);

test(
  "defaults to the current Indian financial year when dates are omitted",
  async () => {
    const {
      service,
      voucherRepository,
    } =
      await createService([]);

    const result =
      await service.getGstReport({
        companyId:
          "company-1",
        query:
          {},
      });

    assert.equal(
      result.from,
      "2026-04-01"
    );

    assert.equal(
      result.to,
      "2027-03-31"
    );

    assert.equal(
      voucherRepository.calls[0].from,
      "2026-04-01"
    );

    assert.equal(
      voucherRepository.calls[0].to,
      "2027-03-31"
    );
  }
);
