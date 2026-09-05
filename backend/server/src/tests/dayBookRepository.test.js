import assert from "node:assert/strict";

import {
  describe,
  test,
} from "node:test";

import JournalEntry
  from "../models/JournalEntry.js";

import {
  DayBookRepository,
} from "../repositories/dayBook.repository.js";

const companyId =
  "507f1f77bcf86cd799439011";

describe(
  "Day Book repository",
  () => {

    test(
      "exports DayBookRepository with listPosted",
      () => {

        const repository =
          new DayBookRepository();

        assert.equal(
          typeof repository.listPosted,
          "function"
        );

      }
    );

    test(
      "queries posted company entries with dates sorting and pagination",
      async () => {

        const repository =
          new DayBookRepository();

        const originalAggregate =
          JournalEntry.aggregate;

        let capturedPipeline =
          null;

        JournalEntry.aggregate =
          async (pipeline) => {
            capturedPipeline = pipeline;

            return [
              {
                rows: [],
                summary: [],
              },
            ];
          };

        try {
          await repository.listPosted({
            companyId,
            from: "2026-04-01",
            to: "2026-04-30",
            sort: "desc",
            page: 2,
            limit: 25,
          });
        } finally {
          JournalEntry.aggregate =
            originalAggregate;
        }

        assert.ok(
          Array.isArray(capturedPipeline),
          "Repository must execute JournalEntry.aggregate()."
        );

        const baseMatch =
          capturedPipeline.find(
            (stage) => stage.$match
          )?.$match;

        assert.equal(
          baseMatch.status,
          "posted"
        );

        assert.equal(
          String(baseMatch.companyId),
          companyId
        );

        assert.ok(
          baseMatch.journalDate.$gte instanceof Date
        );

        assert.ok(
          baseMatch.journalDate.$lte instanceof Date
        );

        assert.ok(
          baseMatch.journalDate.$lte >
            new Date("2026-04-30T00:00:00.000Z"),
          "To date must include the full final day."
        );

        const facet =
          capturedPipeline.find(
            (stage) => stage.$facet
          )?.$facet;

        assert.ok(
          facet,
          "Pipeline must contain a $facet stage."
        );

        const sortStage =
          facet.rows.find(
            (stage) => stage.$sort
          );

        assert.deepEqual(
          sortStage.$sort,
          {
            journalDate: -1,
            journalNumber: -1,
          }
        );

        assert.equal(
          facet.rows.find(
            (stage) => "$skip" in stage
          ).$skip,
          25
        );

        assert.equal(
          facet.rows.find(
            (stage) => "$limit" in stage
          ).$limit,
          25
        );

        assert.doesNotMatch(
          JSON.stringify(capturedPipeline),
          /\$merge|\$out/
        );

      }
    );


    test(
      "enriches linked vouchers filters voucher type and returns full totals",
      async () => {

        const repository =
          new DayBookRepository();

        const originalAggregate =
          JournalEntry.aggregate;

        let capturedPipeline =
          null;

        JournalEntry.aggregate =
          async (pipeline) => {
            capturedPipeline = pipeline;

            return [
              {
                rows: [
                  {
                    journalNumber: "JE-2",
                    resolvedVoucherType: "sales",
                  },
                ],

                summary: [
                  {
                    voucherCount: 3,
                    totalDebit: 1500,
                    totalCredit: 1500,
                  },
                ],
              },
            ];
          };

        let result;

        try {
          result =
            await repository.listPosted({
              companyId,
              from: "2026-04-01",
              to: "2026-04-30",
              voucherType: "sales",
              sort: "asc",
              page: 1,
              limit: 10,
            });
        } finally {
          JournalEntry.aggregate =
            originalAggregate;
        }

        const lookup =
          capturedPipeline.find(
            (stage) => stage.$lookup
          )?.$lookup;

        assert.ok(
          lookup,
          "Pipeline must enrich linked Voucher metadata."
        );

        assert.equal(
          lookup.from,
          "vouchers"
        );

        const voucherTypeMatch =
          capturedPipeline.find(
            (stage, index) =>
              index > 0 &&
              stage.$match?.resolvedVoucherType
          );

        assert.deepEqual(
          voucherTypeMatch?.$match,
          {
            resolvedVoucherType: "sales",
          }
        );

        const facet =
          capturedPipeline.find(
            (stage) => stage.$facet
          ).$facet;

        assert.deepEqual(
          facet.rows.find(
            (stage) => stage.$sort
          ).$sort,
          {
            journalDate: 1,
            journalNumber: 1,
          }
        );

        assert.equal(
          result.total,
          3
        );

        assert.deepEqual(
          result.totals,
          {
            voucherCount: 3,
            totalDebit: 1500,
            totalCredit: 1500,
          }
        );

      }
    );

  }
);
