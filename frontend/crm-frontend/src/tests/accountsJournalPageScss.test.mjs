import assert from "node:assert/strict";

import {
  readFile,
} from "node:fs/promises";

import {
  describe,
  test,
} from "node:test";


const scssUrl =
  new URL(
    "../app/features/accounts/pages/journal-entries/journal-entries.component.scss",
    import.meta.url
  );


const readScss =
  () =>
    readFile(
      scssUrl,
      "utf8"
    );


describe(
  "Accounts Journal Entries page SCSS",
  () => {

    test(
      "defines Journal page styles",
      async () => {

        let source;


        try {

          source =
            await readScss();

        } catch (
          error
        ) {

          assert.fail(
            `Journal Entries SCSS must exist: ${error.message}`
          );

        }


        assert.match(
          source,
          /\.journal-page/
        );


        assert.match(
          source,
          /\.page-header/
        );

      }
    );


    test(
      "defines Neumorphism panels and cards",
      async () => {

        const source =
          await readScss();


        for (
          const selector of [
            ".summary-card",
            ".filter-panel",
            ".journal-table-card",
            ".state-card",
            ".empty-state",
          ]
        ) {

          assert.match(
            source,
            new RegExp(
              selector.replace(
                ".",
                "\\."
              )
            ),
            `Missing Journal style: ${selector}`
          );

        }


        assert.match(
          source,
          /box-shadow/
        );


        assert.match(
          source,
          /border-radius/
        );

      }
    );


    test(
      "defines table and status styles",
      async () => {

        const source =
          await readScss();


        assert.match(
          source,
          /\.journal-table/
        );


        assert.match(
          source,
          /\.status-badge/
        );


        assert.match(
          source,
          /\.status-draft/
        );


        assert.match(
          source,
          /\.status-posted/
        );


        assert.match(
          source,
          /\.status-void/
        );

      }
    );


    test(
      "defines responsive behavior",
      async () => {

        const source =
          await readScss();


        assert.match(
          source,
          /@media\s*\(max-width:/
        );


        assert.match(
          source,
          /\.summary-grid/
        );


        assert.match(
          source,
          /\.filter-grid/
        );

      }
    );


    test(
      "does not use deprecated darken function",
      async () => {

        const source =
          await readScss();


        assert.doesNotMatch(
          source,
          /\bdarken\s*\(/
        );

      }
    );

  }
);