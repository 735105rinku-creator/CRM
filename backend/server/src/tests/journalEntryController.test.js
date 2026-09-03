import assert from "node:assert/strict";

import {
  describe,
  test,
} from "node:test";


describe(
  "Journal Entry Controller",
  () => {

    test(
      "exports all Journal Entry controller handlers",
      async () => {

        let module;


        try {

          module =
            await import(
              "../controllers/journalEntry.controller.js"
            );

        } catch (
          error
        ) {

          assert.fail(
            `Journal Entry controller must exist: ${error.message}`
          );

        }


        const requiredHandlers = [

          "createJournalEntry",

          "getJournalEntries",

          "getJournalEntryById",

          "updateJournalEntry",

          "postJournalEntry",

          "voidJournalEntry",

        ];


        for (
          const handler of
            requiredHandlers
        ) {

          assert.equal(
            typeof module[
              handler
            ],
            "function",
            `Missing Journal Entry controller handler: ${handler}`
          );

        }

      }
    );


    test(
      "does not expose a physical delete handler",
      async () => {

        const module =
          await import(
            "../controllers/journalEntry.controller.js"
          );


        assert.equal(
          module.deleteJournalEntry,
          undefined
        );


        assert.equal(
          module.removeJournalEntry,
          undefined
        );

      }
    );

  }
);