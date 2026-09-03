import assert from "node:assert/strict";

import {
  readFile,
} from "node:fs/promises";

import {
  describe,
  test,
} from "node:test";


const serviceUrl =
  new URL(
    "../app/features/accounts/services/journal-entry.service.ts",
    import.meta.url
  );


const readService =
  () =>
    readFile(
      serviceUrl,
      "utf8"
    );


describe(
  "Accounts Journal Entry frontend service",
  () => {

    test(
      "defines JournalEntryService",
      async () => {

        let source;


        try {

          source =
            await readService();

        } catch (
          error
        ) {

          assert.fail(
            `JournalEntryService must exist: ${error.message}`
          );

        }


        assert.match(
          source,
          /export\s+class\s+JournalEntryService/
        );


        assert.match(
          source,
          /@Injectable/
        );

      }
    );


    test(
      "uses the accounting Journal API base path",
      async () => {

        const source =
          await readService();


        assert.match(
          source,
          /\/accounting\/journal-entries/
        );

      }
    );


    test(
      "defines Journal read methods",
      async () => {

        const source =
          await readService();


        for (
          const method of [
            "getAll",
            "getById",
          ]
        ) {

          assert.match(
            source,
            new RegExp(
              `\\b${method}\\s*\\(`
            ),
            `Missing Journal service method: ${method}`
          );

        }

      }
    );


    test(
      "defines Journal workflow methods",
      async () => {

        const source =
          await readService();


        for (
          const method of [
            "create",
            "update",
            "post",
            "void",
          ]
        ) {

          assert.match(
            source,
            new RegExp(
              `\\b${method}\\s*\\(`
            ),
            `Missing Journal workflow method: ${method}`
          );

        }

      }
    );


    test(
      "uses the correct post and void endpoints",
      async () => {

        const source =
          await readService();


        assert.match(
          source,
          /\$\{this\.basePath\}\/\$\{id\}\/post/
        );


        assert.match(
          source,
          /\$\{this\.basePath\}\/\$\{id\}\/void/
        );

      }
    );


    test(
      "uses Journal frontend model contracts",
      async () => {

        const source =
          await readService();


        for (
          const type of [
            "JournalEntry",
            "JournalEntryQuery",
            "CreateJournalEntryPayload",
            "UpdateJournalEntryPayload",
            "VoidJournalEntryPayload",
          ]
        ) {

          assert.match(
            source,
            new RegExp(
              `\\b${type}\\b`
            ),
            `Journal service must use ${type}`
          );

        }

      }
    );

  }
);