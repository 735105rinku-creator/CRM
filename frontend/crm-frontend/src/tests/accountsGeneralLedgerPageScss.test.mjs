import assert from "node:assert/strict";

import {
  access,
  readFile,
} from "node:fs/promises";

import {
  describe,
  test,
} from "node:test";


const scssUrl =
  new URL(
    "../app/features/accounts/pages/general-ledger/general-ledger.component.scss",
    import.meta.url
  );


describe(
  "Accounts General Ledger page SCSS",
  () => {

    test(
      "General Ledger SCSS file exists",
      async () => {

        await assert.doesNotReject(
          () =>
            access(
              scssUrl
            )
        );

      }
    );


    test(
      "styles main General Ledger layout",
      async () => {

        const source =
          await readFile(
            scssUrl,
            "utf8"
          );


        assert.match(
          source,
          /\.general-ledger-page/
        );


        assert.match(
          source,
          /\.page-header/
        );


        assert.match(
          source,
          /\.summary-grid/
        );


        assert.match(
          source,
          /\.summary-card/
        );

      }
    );


    test(
      "styles filters and ledger table",
      async () => {

        const source =
          await readFile(
            scssUrl,
            "utf8"
          );


        assert.match(
          source,
          /\.filter-panel/
        );


        assert.match(
          source,
          /\.filter-grid/
        );


        assert.match(
          source,
          /\.ledger-panel/
        );


        assert.match(
          source,
          /\.ledger-table/
        );

      }
    );


    test(
      "styles loading error and empty states",
      async () => {

        const source =
          await readFile(
            scssUrl,
            "utf8"
          );


        assert.match(
          source,
          /\.state-panel/
        );


        assert.match(
          source,
          /\.state-panel--loading/
        );


        assert.match(
          source,
          /\.state-panel--error/
        );


        assert.match(
          source,
          /\.state-panel--empty/
        );

      }
    );


    test(
      "uses Neumorphism shadows",
      async () => {

        const source =
          await readFile(
            scssUrl,
            "utf8"
          );


        assert.match(
          source,
          /box-shadow\s*:/
        );


        assert.match(
          source,
          /inset/
        );

      }
    );


    test(
      "contains responsive layouts",
      async () => {

        const source =
          await readFile(
            scssUrl,
            "utf8"
          );


        assert.match(
          source,
          /@media\s*\(max-width\s*:\s*1200px\)/
        );


        assert.match(
          source,
          /@media\s*\(max-width\s*:\s*768px\)/
        );

      }
    );


    test(
      "does not use deprecated darken function",
      async () => {

        const source =
          await readFile(
            scssUrl,
            "utf8"
          );


        assert.doesNotMatch(
          source,
          /\bdarken\s*\(/
        );

      }
    );

  }
);