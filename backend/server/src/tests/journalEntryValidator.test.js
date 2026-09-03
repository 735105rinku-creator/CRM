import assert from "node:assert/strict";

import {
  describe,
  test,
} from "node:test";


/* ============================================================
   TEST DATA
============================================================ */

const cashAccountId =
  "64b000000000000000000001";


const salesAccountId =
  "64b000000000000000000002";


const validJournalPayload =
  () => ({

    journalDate:
      "2026-09-02",

    narration:
      "Cash sales entry",

    referenceType:
      "manual",

    referenceNo:
      "MANUAL-001",

    lines: [

      {
        accountId:
          cashAccountId,

        description:
          "Cash received",

        debit:
          1000,

        credit:
          0,
      },

      {
        accountId:
          salesAccountId,

        description:
          "Sales income",

        debit:
          0,

        credit:
          1000,
      },

    ],

  });


/* ============================================================
   JOURNAL ENTRY VALIDATOR
============================================================ */

describe(
  "Journal Entry Validator",
  () => {

    test(
      "exports create and update schemas",
      async () => {

        let module;


        try {

          module =
            await import(
              "../validators/journalEntry.validator.js"
            );

        } catch (
          error
        ) {

          assert.fail(
            `Journal Entry validator must exist: ${error.message}`
          );

        }


        assert.ok(
          module.createJournalEntrySchema
        );


        assert.ok(
          module.updateJournalEntrySchema
        );


        assert.ok(
          module.journalEntryIdParamSchema
        );


        assert.ok(
          module.journalEntryQuerySchema
        );


        assert.ok(
          module.voidJournalEntrySchema
        );

      }
    );


    test(
      "accepts a balanced journal with at least two lines",
      async () => {

        const {
          createJournalEntrySchema,
        } =
          await import(
            "../validators/journalEntry.validator.js"
          );


        const {
          error,
          value,
        } =
          createJournalEntrySchema
            .validate(
              validJournalPayload(),
              {
                abortEarly:
                  false,

                convert:
                  true,
              }
            );


        assert.equal(
          error,
          undefined
        );


        assert.equal(
          value.lines.length,
          2
        );

      }
    );


    test(
      "rejects an unbalanced journal",
      async () => {

        const {
          createJournalEntrySchema,
        } =
          await import(
            "../validators/journalEntry.validator.js"
          );


        const payload =
          validJournalPayload();


        payload.lines[1].credit =
          900;


        const {
          error,
        } =
          createJournalEntrySchema
            .validate(
              payload,
              {
                abortEarly:
                  false,
              }
            );


        assert.ok(
          error,
          "Unbalanced journal must be rejected."
        );


        assert.match(
          error.message,
          /debit.*credit|balanced/i
        );

      }
    );


    test(
      "rejects a line containing both debit and credit",
      async () => {

        const {
          createJournalEntrySchema,
        } =
          await import(
            "../validators/journalEntry.validator.js"
          );


        const payload =
          validJournalPayload();


        payload.lines[0].credit =
          100;


        const {
          error,
        } =
          createJournalEntrySchema
            .validate(
              payload,
              {
                abortEarly:
                  false,
              }
            );


        assert.ok(
          error,
          "A line cannot contain both debit and credit."
        );

      }
    );


    test(
      "rejects a journal containing fewer than two lines",
      async () => {

        const {
          createJournalEntrySchema,
        } =
          await import(
            "../validators/journalEntry.validator.js"
          );


        const payload =
          validJournalPayload();


        payload.lines =
          [
            payload.lines[0]
          ];


        const {
          error,
        } =
          createJournalEntrySchema
            .validate(
              payload
            );


        assert.ok(
          error,
          "Journal must contain at least two lines."
        );

      }
    );


    test(
      "does not allow client controlled posting or total fields",
      async () => {

        const {
          createJournalEntrySchema,
        } =
          await import(
            "../validators/journalEntry.validator.js"
          );


        const payload = {
          ...validJournalPayload(),

          journalNumber:
            "JV-FAKE",

          status:
            "posted",

          totalDebit:
            1000,

          totalCredit:
            1000,

          companyId:
            "64b000000000000000000099",

          postedBy:
            "64b000000000000000000098",

          postedAt:
            new Date()
              .toISOString(),
        };


        const {
          error,
        } =
          createJournalEntrySchema
            .validate(
              payload,
              {
                abortEarly:
                  false,
              }
            );


        assert.ok(
          error,
          "Backend-controlled Journal fields must be rejected."
        );

      }
    );


    test(
      "requires a reason when voiding a journal",
      async () => {

        const {
          voidJournalEntrySchema,
        } =
          await import(
            "../validators/journalEntry.validator.js"
          );


        const {
          error,
        } =
          voidJournalEntrySchema
            .validate({
              reason:
                "",
            });


        assert.ok(
          error
        );

      }
    );

  }
);