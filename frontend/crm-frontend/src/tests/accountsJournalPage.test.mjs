import assert from "node:assert/strict";

import {
  readFile,
} from "node:fs/promises";

import {
  describe,
  test,
} from "node:test";


const componentUrl =
  new URL(
    "../app/features/accounts/pages/journal-entries/journal-entries.component.ts",
    import.meta.url
  );


const readComponent =
  () =>
    readFile(
      componentUrl,
      "utf8"
    );


describe(
  "Accounts Journal Entries page",
  () => {

    test(
      "defines standalone JournalEntriesComponent",
      async () => {

        let source;


        try {

          source =
            await readComponent();

        } catch (
          error
        ) {

          assert.fail(
            `Journal Entries component must exist: ${error.message}`
          );

        }


        assert.match(
          source,
          /export\s+class\s+JournalEntriesComponent/
        );


        assert.match(
          source,
          /standalone\s*:\s*true/
        );

      }
    );


    test(
      "uses JournalEntryService and JournalEntry model",
      async () => {

        const source =
          await readComponent();


        assert.match(
          source,
          /\bJournalEntryService\b/
        );


        assert.match(
          source,
          /\bJournalEntry\b/
        );

      }
    );


    test(
      "defines Journal listing state",
      async () => {

        const source =
          await readComponent();


        for (
          const field of [
            "journals",
            "loading",
            "error",
            "search",
            "statusFilter",
            "fromDate",
            "toDate",
          ]
        ) {

          assert.match(
            source,
            new RegExp(
              `\\b${field}\\b`
            ),
            `Missing Journal page state: ${field}`
          );

        }

      }
    );


    test(
      "loads Journal entries using the read API",
      async () => {

        const source =
          await readComponent();


        assert.match(
          source,
          /\bloadJournals\s*\(/
        );


        assert.match(
          source,
          /\.getAll\s*\(/
        );


        assert.match(
          source,
          /\bngOnInit\s*\(/
        );

      }
    );


    test(
      "provides filter and reset behavior",
      async () => {

        const source =
          await readComponent();


        for (
          const method of [
            "applyFilters",
            "resetFilters",
          ]
        ) {

          assert.match(
            source,
            new RegExp(
              `\\b${method}\\s*\\(`
            ),
            `Missing Journal page method: ${method}`
          );

        }

      }
    );


    test(
      "does not automatically perform Journal write operations",
      async () => {

        const source =
          await readComponent();


        const ngOnInitMatch =
          source.match(
            /ngOnInit\s*\(\)\s*:\s*void\s*\{([\s\S]*?)\n\s*\}/
          );


        assert.ok(
          ngOnInitMatch,
          "ngOnInit method is required."
        );


        const ngOnInitBody =
          ngOnInitMatch[1];


        assert.doesNotMatch(
          ngOnInitBody,
          /\.create\s*\(/
        );


        assert.doesNotMatch(
          ngOnInitBody,
          /\.update\s*\(/
        );


        assert.doesNotMatch(
          ngOnInitBody,
          /\.post\s*\(/
        );


        assert.doesNotMatch(
          ngOnInitBody,
          /\.void\s*\(/
        );

      }
    );

  }
);