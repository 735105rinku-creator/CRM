import assert from "node:assert/strict";

import {
  access,
  readFile,
} from "node:fs/promises";

import {
  describe,
  test,
} from "node:test";


const htmlUrl =
  new URL(
    "../app/features/accounts/pages/general-ledger/general-ledger.component.html",
    import.meta.url
  );


describe(
  "Accounts General Ledger page HTML",
  () => {

    test(
      "General Ledger HTML file exists",
      async () => {

        await assert.doesNotReject(
          () =>
            access(
              htmlUrl
            )
        );

      }
    );


    test(
      "renders General Ledger heading and summary",
      async () => {

        const source =
          await readFile(
            htmlUrl,
            "utf8"
          );


        assert.match(
          source,
          /General Ledger/i
        );


        assert.match(
          source,
          /Total Accounts/i
        );


        assert.match(
          source,
          /Total Debit/i
        );


        assert.match(
          source,
          /Total Credit/i
        );


        assert.match(
          source,
          /Movement Difference/i
        );

      }
    );


    test(
      "renders read-only ledger filters",
      async () => {

        const source =
          await readFile(
            htmlUrl,
            "utf8"
          );


        assert.match(
          source,
          /Search accounts/i
        );


        assert.match(
          source,
          /natureOptions/
        );


        assert.match(
          source,
          /accountTypeOptions/
        );


        assert.match(
          source,
          /statusOptions/
        );


        assert.match(
          source,
          /sortOptions/
        );

      }
    );


    test(
      "renders ledger table columns",
      async () => {

        const source =
          await readFile(
            htmlUrl,
            "utf8"
          );


        for (
          const heading of [
            "Account Code",
            "Account Name",
            "Nature",
            "Opening Balance",
            "Debit",
            "Credit",
            "Closing Balance",
            "Status",
          ]
        ) {

          assert.match(
            source,
            new RegExp(
              heading,
              "i"
            ),
            `Missing ledger table heading: ${heading}`
          );

        }

      }
    );


    test(
      "renders loading error and empty states",
      async () => {

        const source =
          await readFile(
            htmlUrl,
            "utf8"
          );


        assert.match(
          source,
          /isLoading\(\)/
        );


        assert.match(
          source,
          /errorMessage\(\)/
        );


        assert.match(
          source,
          /isEmpty\(\)/
        );


        assert.match(
          source,
          /No ledger accounts found/i
        );

      }
    );


    test(
      "does not expose create edit or delete actions",
      async () => {

        const source =
          await readFile(
            htmlUrl,
            "utf8"
          );


        assert.doesNotMatch(
          source,
          />\s*Create\s*</i
        );


        assert.doesNotMatch(
          source,
          />\s*Edit\s*</i
        );


        assert.doesNotMatch(
          source,
          />\s*Delete\s*</i
        );

      }
    );

  }
);