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
test(
  "create forwards Mongo session to JournalEntry model creation",
  async () => {

    const repositoryModule =
      await import(
        "../repositories/journalEntry.repository.js"
      );

    const repository =
      repositoryModule.default;


    const modelModule =
      await import(
        "../models/JournalEntry.js"
      );

    const JournalEntry =
      modelModule.default;


    const fakeSession = {
      id: "journal-create-session",
    };


    let receivedOptions =
      null;


    const originalCreate =
      JournalEntry.create;


    JournalEntry.create =
      async (
        payload,
        options
      ) => {

        receivedOptions =
          options;

        return {
          _id:
            "64f000000000000000000099",

          ...payload,
        };

      };


    try {

      await repository.create(
        {
          companyId:
            "64f000000000000000000001",

          journalNumber:
            "JV-TEST-001",

          status:
            "draft",
        },
        {
          session:
            fakeSession,
        }
      );


      assert.equal(
        receivedOptions?.session,
        fakeSession
      );

    } finally {

      JournalEntry.create =
        originalCreate;

    }

  }
);

test(
  "findById forwards Mongo session to the JournalEntry query",
  async () => {

    const repositoryModule =
      await import(
        "../repositories/journalEntry.repository.js"
      );

    const repository =
      repositoryModule.default;


    const modelModule =
      await import(
        "../models/JournalEntry.js"
      );

    const JournalEntry =
      modelModule.default;


    const fakeSession = {
      id: "journal-find-session",
    };


    let receivedSession =
      null;


    const originalFindOne =
      JournalEntry.findOne;


    JournalEntry.findOne =
      (filter) => {

        const query = {

          session(session) {
            receivedSession =
              session;

            return query;
          },

          async lean() {
            return {
              _id:
                filter._id,

              companyId:
                filter.companyId,
            };
          },

        };


        return query;

      };


    try {

      await repository.findById({
        companyId:
          "64f000000000000000000001",

        journalEntryId:
          "64f000000000000000000099",

        session:
          fakeSession,
      });


      assert.equal(
        receivedSession,
        fakeSession
      );

    } finally {

      JournalEntry.findOne =
        originalFindOne;

    }

  }
);

test(
  "postById forwards Mongo session to the atomic JournalEntry update",
  async () => {

    const repositoryModule =
      await import(
        "../repositories/journalEntry.repository.js"
      );

    const repository =
      repositoryModule.default;


    const modelModule =
      await import(
        "../models/JournalEntry.js"
      );

    const JournalEntry =
      modelModule.default;


    const fakeSession = {
      id: "journal-post-session",
    };


    let receivedOptions =
      null;


    const originalFindOneAndUpdate =
      JournalEntry.findOneAndUpdate;


    JournalEntry.findOneAndUpdate =
      (
        filter,
        update,
        options
      ) => {

        receivedOptions =
          options;


        return {
          async lean() {
            return {
              _id:
                filter._id,

              status:
                update.$set.status,
            };
          },
        };

      };


    try {

      await repository.postById({
        companyId:
          "64f000000000000000000001",

        journalEntryId:
          "64f000000000000000000099",

        userId:
          "64f000000000000000000009",

        session:
          fakeSession,
      });


      assert.equal(
        receivedOptions?.session,
        fakeSession
      );

    } finally {

      JournalEntry.findOneAndUpdate =
        originalFindOneAndUpdate;

    }

  }
);

test(
  "voidById forwards Mongo session to the atomic JournalEntry update",
  async () => {

    const repositoryModule =
      await import(
        "../repositories/journalEntry.repository.js"
      );

    const repository =
      repositoryModule.default;


    const modelModule =
      await import(
        "../models/JournalEntry.js"
      );

    const JournalEntry =
      modelModule.default;


    const fakeSession = {
      id: "journal-void-session",
    };


    let receivedOptions =
      null;


    const originalFindOneAndUpdate =
      JournalEntry.findOneAndUpdate;


    JournalEntry.findOneAndUpdate =
      (
        filter,
        update,
        options
      ) => {

        receivedOptions =
          options;


        return {
          async lean() {
            return {
              _id:
                filter._id,

              status:
                update.$set.status,

              voidReason:
                update.$set.voidReason,
            };
          },
        };

      };


    try {

      await repository.voidById({
        companyId:
          "64f000000000000000000001",

        journalEntryId:
          "64f000000000000000000099",

        userId:
          "64f000000000000000000009",

        reason:
          "Voucher voided",

        session:
          fakeSession,
      });


      assert.equal(
        receivedOptions?.session,
        fakeSession
      );

    } finally {

      JournalEntry.findOneAndUpdate =
        originalFindOneAndUpdate;

    }

  }
);
