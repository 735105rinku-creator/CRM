import assert from "node:assert/strict";

import {
  readFile,
} from "node:fs/promises";

import {
  describe,
  test,
} from "node:test";


const sidebarUrl =
  new URL(
    "../app/features/accounts/components/accounts-sidebar/accounts-sidebar.component.ts",
    import.meta.url
  );


const readSidebar =
  () =>
    readFile(
      sidebarUrl,
      "utf8"
    );


describe(
  "Accounts Journal Entries sidebar",
  () => {

    test(
      "contains Journal Entries menu item",
      async () => {

        const source =
          await readSidebar();


        assert.match(
          source,
          /Journal Entries/
        );

      }
    );


    test(
      "links Journal Entries to /accounts/journal-entries",
      async () => {

        const source =
          await readSidebar();


        assert.match(
          source,
          /\/accounts\/journal-entries/
        );

      }
    );


    test(
      "does not use the old /accounts/journal destination",
      async () => {

        const source =
          await readSidebar();


        assert.doesNotMatch(
          source,
          /['"]\/accounts\/journal['"]/
        );

      }
    );

  }
);