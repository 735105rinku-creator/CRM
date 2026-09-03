import assert from "node:assert/strict";

import {
  describe,
  test,
} from "node:test";


/* ============================================================
   ACCOUNTING CONSTANTS
============================================================ */

describe(
  "Journal Entry Accounting Constants",
  () => {

    test(
      "defines supported journal statuses and reference types",
      async () => {

        const accounting =
          await import(
            "../constants/accounting.js"
          );


        assert.deepEqual(
          accounting.JOURNAL_STATUSES,
          [
            "draft",
            "posted",
            "void",
          ]
        );


        assert.deepEqual(
          accounting.JOURNAL_REFERENCE_TYPES,
          [
            "manual",
            "sales_invoice",
            "receipt",
            "credit_note",
            "purchase_bill",
            "payment",
            "debit_note",
            "expense",
            "opening_balance",
            "adjustment",
          ]
        );

      }
    );


    test(
      "defines journal number prefix",
      async () => {

        const accounting =
          await import(
            "../constants/accounting.js"
          );


        assert.equal(
          accounting.JOURNAL_NUMBER_PREFIX,
          "JV"
        );

      }
    );

  }
);


/* ============================================================
   JOURNAL ENTRY MODEL CONTRACT
============================================================ */

describe(
  "Journal Entry Model",
  () => {

    test(
      "defines the journal entry schema without automatic database setup",
      async () => {

        let module;


        try {

          module =
            await import(
              "../models/JournalEntry.js"
            );

        } catch (
          error
        ) {

          assert.fail(
            `JournalEntry model must exist: ${error.message}`
          );

        }


        const JournalEntry =
          module.default;


        assert.equal(
          JournalEntry.modelName,
          "JournalEntry"
        );


        const schema =
          JournalEntry.schema;


        assert.equal(
          schema.options.collection,
          "journal_entries"
        );


        assert.equal(
          schema.options.autoCreate,
          false
        );


        assert.equal(
          schema.options.autoIndex,
          false
        );


        const requiredPaths = [
          "companyId",
          "journalNumber",
          "journalDate",
          "narration",
          "referenceType",
          "referenceId",
          "referenceNo",
          "status",
          "totalDebit",
          "totalCredit",
          "lines",
          "createdBy",
          "updatedBy",
          "postedBy",
          "postedAt",
          "voidedBy",
          "voidedAt",
          "voidReason",
        ];


        for (
          const path of
            requiredPaths
        ) {

          assert.ok(
            schema.path(
              path
            ),
            `Missing JournalEntry schema path: ${path}`
          );

        }

      }
    );


    test(
      "defines debit and credit line fields",
      async () => {

        let module;


        try {

          module =
            await import(
              "../models/JournalEntry.js"
            );

        } catch (
          error
        ) {

          assert.fail(
            `JournalEntry model must exist: ${error.message}`
          );

        }


        const JournalEntry =
          module.default;


        const linesPath =
          JournalEntry.schema
            .path(
              "lines"
            );


        assert.ok(
          linesPath
        );


        assert.ok(
          linesPath.schema,
          "Journal lines must use a subdocument schema."
        );


        const lineSchema =
          linesPath.schema;


        const requiredLinePaths = [
          "accountId",
          "accountCode",
          "accountName",
          "description",
          "debit",
          "credit",
        ];


        for (
          const path of
            requiredLinePaths
        ) {

          assert.ok(
            lineSchema.path(
              path
            ),
            `Missing journal line schema path: ${path}`
          );

        }

      }
    );


    test(
      "limits journal status to draft, posted and void",
      async () => {

        let module;


        try {

          module =
            await import(
              "../models/JournalEntry.js"
            );

        } catch (
          error
        ) {

          assert.fail(
            `JournalEntry model must exist: ${error.message}`
          );

        }


        const JournalEntry =
          module.default;


        const statusPath =
          JournalEntry.schema
            .path(
              "status"
            );


        assert.deepEqual(
          statusPath.enumValues,
          [
            "draft",
            "posted",
            "void",
          ]
        );


        assert.equal(
          statusPath.defaultValue,
          "draft"
        );

      }
    );

  }
);