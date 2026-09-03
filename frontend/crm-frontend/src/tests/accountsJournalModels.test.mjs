import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import {
  describe,
  test,
} from "node:test";


const modelsUrl =
  new URL(
    "../app/features/accounts/models/accounts.models.ts",
    import.meta.url
  );


const readModels =
  () =>
    readFile(
      modelsUrl,
      "utf8"
    );


describe(
  "Accounts Journal frontend models",
  () => {

    test(
      "defines Journal status and reference types",
      async () => {

        const source =
          await readModels();


        assert.match(
          source,
          /export\s+type\s+JournalEntryStatus/
        );


        assert.match(
          source,
          /'draft'/
        );


        assert.match(
          source,
          /'posted'/
        );


        assert.match(
          source,
          /'void'/
        );


        assert.match(
          source,
          /export\s+type\s+JournalReferenceType/
        );

      }
    );


    test(
      "defines Journal line and Journal entry interfaces",
      async () => {

        const source =
          await readModels();


        assert.match(
          source,
          /export\s+interface\s+JournalEntryLine/
        );


        assert.match(
          source,
          /export\s+interface\s+JournalEntry/
        );


        const requiredFields = [
          "_id",
          "journalNumber",
          "journalDate",
          "narration",
          "referenceType",
          "referenceNo",
          "status",
          "totalDebit",
          "totalCredit",
          "lines",
        ];


        for (
          const field of requiredFields
        ) {

          assert.match(
            source,
            new RegExp(
              `\\b${field}\\??\\s*:`
            ),
            `Missing JournalEntry field: ${field}`
          );

        }

      }
    );


    test(
      "defines Journal list query contract",
      async () => {

        const source =
          await readModels();


        assert.match(
          source,
          /export\s+interface\s+JournalEntryQuery/
        );


        for (
          const field of [
            "search",
            "status",
            "referenceType",
            "accountId",
            "from",
            "to",
            "sortBy",
            "sortOrder",
          ]
        ) {

          assert.match(
            source,
            new RegExp(
              `\\b${field}\\??\\s*:`
            ),
            `Missing Journal query field: ${field}`
          );

        }

      }
    );

  }
);