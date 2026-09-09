import assert from "node:assert/strict";

import {
  test,
} from "node:test";

import mongoose from "mongoose";

import JournalEntry from "../models/JournalEntry.js";


test(
  "valid balanced journal validates without middleware callback error",
  async () => {

    const accountOneId =
      new mongoose.Types.ObjectId();

    const accountTwoId =
      new mongoose.Types.ObjectId();

    const journal =
      new JournalEntry({
        companyId:
          new mongoose.Types.ObjectId(),

        journalNumber:
          "JV-TEST-VALIDATION-001",

        journalDate:
          new Date(
            "2026-09-08T00:00:00.000Z"
          ),

        narration:
          "Journal model validation regression test",

        referenceType:
          "manual",

        referenceNo:
          "TEST-JE-VALIDATION-001",

        status:
          "draft",

        lines: [
          {
            accountId:
              accountOneId,

            accountCode:
              "TEST-EXP-001",

            accountName:
              "Test Expense",

            debit:
              1000,

            credit:
              0,
          },
          {
            accountId:
              accountTwoId,

            accountCode:
              "TEST-INC-001",

            accountName:
              "Test Income",

            debit:
              0,

            credit:
              1000,
          },
        ],
      });


    await assert.doesNotReject(
      journal.validate()
    );


    assert.equal(
      journal.totalDebit,
      1000
    );


    assert.equal(
      journal.totalCredit,
      1000
    );

  }
);