import assert from "node:assert/strict";

import {
  readFile,
} from "node:fs/promises";

import {
  describe,
  test,
} from "node:test";


const routesUrl =
  new URL(
    "../app/features/accounts/accounts.routes.ts",
    import.meta.url
  );


const readRoutes =
  () =>
    readFile(
      routesUrl,
      "utf8"
    );


describe(
  "Accounts Journal Entries route",
  () => {

    test(
      "defines /journal-entries route",
      async () => {

        const source =
          await readRoutes();


        assert.match(
          source,
          /path\s*:\s*['"]journal-entries['"]/
        );

      }
    );


    test(
      "loads JournalEntriesComponent lazily",
      async () => {

        const source =
          await readRoutes();


        assert.match(
          source,
          /pages\/journal-entries\/journal-entries\.component/
        );


        assert.match(
          source,
          /JournalEntriesComponent/
        );

      }
    );


    test(
      "does not redirect journal-entries to placeholder page",
      async () => {

        const source =
          await readRoutes();


        const journalRoute =
          source.match(
            /{\s*path\s*:\s*['"]journal-entries['"][\s\S]*?}/
          );


        assert.ok(
          journalRoute,
          "Journal Entries route must exist."
        );


        assert.doesNotMatch(
          journalRoute[0],
          /AccountsPlaceholderComponent/
        );

      }
    );

  }
);