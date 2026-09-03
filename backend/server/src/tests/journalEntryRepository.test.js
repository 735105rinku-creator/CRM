import assert from "node:assert/strict";

import {
  describe,
  test,
} from "node:test";


describe(
  "Journal Entry Repository",
  () => {

    test(
      "exports the Journal Entry repository",
      async () => {

        let module;


        try {

          module =
            await import(
              "../repositories/journalEntry.repository.js"
            );

        } catch (
          error
        ) {

          assert.fail(
            `Journal Entry repository must exist: ${error.message}`
          );

        }


        assert.ok(
          module.default,
          "Default Journal Entry repository export is required."
        );


        assert.ok(
          module.journalEntryRepository,
          "Named Journal Entry repository export is required."
        );

      }
    );


    test(
      "provides company-scoped Journal CRUD and workflow methods",
      async () => {

        const {
          default:
            repository,
        } =
          await import(
            "../repositories/journalEntry.repository.js"
          );


        const requiredMethods = [

          "create",

          "findById",

          "list",

          "updateDraftById",

          "postById",

          "voidById",

        ];


        for (
          const method of
            requiredMethods
        ) {

          assert.equal(
            typeof repository[
              method
            ],
            "function",
            `Missing Journal repository method: ${method}`
          );

        }

      }
    );


    test(
      "provides account-ledger lookup for future General Ledger",
      async () => {

        const {
          default:
            repository,
        } =
          await import(
            "../repositories/journalEntry.repository.js"
          );


        assert.equal(
          typeof repository
            .findPostedLinesByAccount,
          "function"
        );

      }
    );


    test(
      "does not expose a physical delete method",
      async () => {

        const {
          default:
            repository,
        } =
          await import(
            "../repositories/journalEntry.repository.js"
          );


        assert.equal(
          repository.delete,
          undefined
        );


        assert.equal(
          repository.deleteById,
          undefined
        );


        assert.equal(
          repository.remove,
          undefined
        );

      }
    );

  }
);