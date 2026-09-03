import assert from "node:assert/strict";

import {
  readFile,
} from "node:fs/promises";

import {
  describe,
  test,
} from "node:test";


const htmlUrl =
  new URL(
    "../app/features/accounts/pages/journal-entries/journal-entries.component.html",
    import.meta.url
  );


const readHtml =
  () =>
    readFile(
      htmlUrl,
      "utf8"
    );


describe(
  "Accounts Journal Entries page HTML",
  () => {

    test(
      "renders Journal Entries page heading",
      async () => {

        let source;


        try {

          source =
            await readHtml();

        } catch (
          error
        ) {

          assert.fail(
            `Journal Entries HTML must exist: ${error.message}`
          );

        }


        assert.match(
          source,
          /Journal Entries/i
        );

      }
    );


    test(
      "renders search status and date filters",
      async () => {

        const source =
          await readHtml();


        assert.match(
          source,
          /\[ngModel\]="search\(\)"/
        );


        assert.match(
          source,
          /\[ngModel\]="statusFilter\(\)"/
        );


        assert.match(
          source,
          /\[ngModel\]="fromDate\(\)"/
        );


        assert.match(
          source,
          /\[ngModel\]="toDate\(\)"/
        );


        assert.match(
          source,
          /\(click\)="applyFilters\(\)"/
        );


        assert.match(
          source,
          /\(click\)="resetFilters\(\)"/
        );

      }
    );


    test(
      "renders Journal summary metrics",
      async () => {

        const source =
          await readHtml();


        for (
          const metric of [
            "journalCount",
            "draftCount",
            "postedCount",
            "voidCount",
            "totalDebit",
            "totalCredit",
          ]
        ) {

          assert.match(
            source,
            new RegExp(
              `\\b${metric}\\(\\)`
            ),
            `Missing Journal metric: ${metric}`
          );

        }

      }
    );


    test(
      "renders Journal table fields",
      async () => {

        const source =
          await readHtml();


        for (
          const field of [
            "journalNumber",
            "journalDate",
            "narration",
            "totalDebit",
            "totalCredit",
            "status",
          ]
        ) {

          assert.match(
            source,
            new RegExp(
              `journal\\.${field}`
            ),
            `Missing Journal table field: ${field}`
          );

        }


        assert.match(
          source,
          /referenceLabel\s*\(\s*journal\s*\)/
        );

      }
    );


    test(
      "renders loading error and empty states",
      async () => {

        const source =
          await readHtml();


        assert.match(
          source,
          /loading\(\)/
        );


        assert.match(
          source,
          /error\(\)/
        );


        assert.match(
          source,
          /journals\(\)\.length/
        );


        assert.match(
          source,
          /No Journal Entries/i
        );

      }
    );


    test(
      "does not expose a physical delete action",
      async () => {

        const source =
          await readHtml();


        assert.doesNotMatch(
          source,
          />\s*Delete\s*</i
        );


        assert.doesNotMatch(
          source,
          /deleteJournal/i
        );

      }
    );

  }
);