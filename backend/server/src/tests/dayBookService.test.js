import assert from "node:assert/strict";

import {
  test,
} from "node:test";

import {
  DayBookService,
} from "../services/dayBook.service.js";

const service =
  new DayBookService({
    dayBookRepository: {},
  });

test("resolves FY from April onward", () => {
  assert.deepEqual(
    service.resolveIndianFinancialYear(
      new Date("2026-09-05T10:00:00.000Z")
    ),
    {
      from: "2026-04-01",
      to: "2027-03-31",
    }
  );
});

test("resolves previous FY before April", () => {
  assert.deepEqual(
    service.resolveIndianFinancialYear(
      new Date("2026-02-15T10:00:00.000Z")
    ),
    {
      from: "2025-04-01",
      to: "2026-03-31",
    }
  );
});

test("normalizes default Day Book query", () => {
  assert.deepEqual(
    service.normalizeQuery(
      {},
      new Date("2026-09-05T10:00:00.000Z")
    ),
    {
      from: "2026-04-01",
      to: "2027-03-31",
      voucherType: null,
      sort: "desc",
      page: 1,
      limit: 25,
    }
  );
});

test("rejects invalid date format", () => {
  assert.throws(
    () => service.normalizeQuery({
      from: "05-09-2026",
    }),
    /date/i
  );
});

test("rejects from date after to date", () => {
  assert.throws(
    () => service.normalizeQuery({
      from: "2026-06-01",
      to: "2026-05-01",
    }),
    /from date cannot be after to date/i
  );
});

test("rejects unsupported sort", () => {
  assert.throws(
    () => service.normalizeQuery({
      sort: "newest",
    }),
    /sort/i
  );
});

test("rejects unsupported voucher type", () => {
  assert.throws(
    () => service.normalizeQuery({
      voucherType: "unknown",
    }),
    /voucher type/i
  );
});

test("rejects invalid page", () => {
  assert.throws(
    () => service.normalizeQuery({
      page: 0,
    }),
    /page/i
  );
});

test("rejects limit above 100", () => {
  assert.throws(
    () => service.normalizeQuery({
      limit: 101,
    }),
    /limit/i
  );
});

test("maps manual journal as Journal Voucher with ledger snapshots", () => {
  const mapped =
    service.mapRow({
      _id: "journal-1",
      journalDate: new Date("2026-09-05T00:00:00.000Z"),
      journalNumber: "JV/2026-27/000001",
      referenceType: "manual",
      referenceNo: "",
      narration: "Manual adjustment",
      resolvedVoucherType: "journal",
      totalDebit: 100,
      totalCredit: 100,
      lines: [
        {
          accountId: "account-1",
          accountCode: "1001",
          accountName: "Cash",
          debit: 100,
          credit: 0,
        },
      ],
    });

  assert.equal(mapped.displayType, "Journal Voucher");
  assert.equal(mapped.voucherType, "journal");
  assert.equal(mapped.voucherNumber, "JV/2026-27/000001");
  assert.equal(mapped.totalDebit, 100);
  assert.equal(mapped.totalCredit, 100);
  assert.deepEqual(
    mapped.lines[0],
    {
      accountId: "account-1",
      accountCode: "1001",
      accountName: "Cash",
      debit: 100,
      credit: 0,
    }
  );
});

test("uses linked Voucher metadata for sales entry", () => {
  const mapped =
    service.mapRow({
      _id: "journal-2",
      journalNumber: "JE-0002",
      referenceType: "voucher",
      referenceNo: "INV-001",
      resolvedVoucherType: "sales",
      linkedVoucher: {
        voucherType: "sales",
        voucherNumber: "SV/2026-27/000001",
      },
      totalDebit: 500,
      totalCredit: 500,
      lines: [],
    });

  assert.equal(mapped.displayType, "Sales Voucher");
  assert.equal(mapped.voucherType, "sales");
  assert.equal(mapped.voucherNumber, "SV/2026-27/000001");
});

test("gets Day Book using normalized repository query and full totals", async () => {
  let captured = null;

  const reportService =
    new DayBookService({
      dayBookRepository: {
        async listPosted(args) {
          captured = args;

          return {
            rows: [
              {
                _id: "journal-3",
                journalNumber: "JV/2026-27/000003",
                referenceType: "manual",
                resolvedVoucherType: "journal",
                totalDebit: 250,
                totalCredit: 250,
                lines: [],
              },
            ],
            total: 1,
            totals: {
              voucherCount: 1,
              totalDebit: 250,
              totalCredit: 250,
            },
          };
        },
      },
    });

  const result =
    await reportService.getDayBook({
      companyId: "company-001",
      query: {
        from: "2026-04-01",
        to: "2026-04-30",
        sort: "asc",
        page: "2",
        limit: "10",
      },
      now: new Date("2026-09-05T10:00:00.000Z"),
    });

  assert.deepEqual(
    captured,
    {
      companyId: "company-001",
      from: "2026-04-01",
      to: "2026-04-30",
      voucherType: null,
      sort: "asc",
      page: 2,
      limit: 10,
    }
  );

  assert.deepEqual(result.period, {
    from: "2026-04-01",
    to: "2026-04-30",
  });

  assert.deepEqual(result.summary, {
    voucherCount: 1,
    totalDebit: 250,
    totalCredit: 250,
  });

  assert.deepEqual(result.pagination, {
    page: 2,
    limit: 10,
    total: 1,
    totalPages: 1,
  });

  assert.equal(result.rows[0].displayType, "Journal Voucher");
});

test("rejects Day Book request without company context", async () => {
  const reportService =
    new DayBookService({
      dayBookRepository: {
        async listPosted() {
          throw new Error("Repository must not be called.");
        },
      },
    });

  await assert.rejects(
    () => reportService.getDayBook({
      companyId: "",
      query: {},
    }),
    /company/i
  );
});
