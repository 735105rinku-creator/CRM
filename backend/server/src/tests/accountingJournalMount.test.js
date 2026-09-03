import assert from "node:assert/strict";

import {
  describe,
  test,
} from "node:test";


describe(
  "Accounting Journal Entry Mount",
  () => {

    test(
      "mounts Journal Entry routes under /journal-entries",
      async () => {

        const {
          default:
            router,
        } =
          await import(
            "../routes/accounting.routes.js"
          );


        const nestedRouters =
          router.stack
            .filter(
              (
                layer
              ) =>
                !layer.route &&
                layer.name ===
                  "router"
            );


        const hasJournalMount =
          nestedRouters
            .some(
              (
                layer
              ) => {

                const matcher =
                  layer.matchers?.[0];


                if (
                  typeof matcher !==
                  "function"
                ) {

                  return false;
                }


                return Boolean(
                  matcher(
                    "/journal-entries"
                  )
                );

              }
            );


        assert.equal(
          hasJournalMount,
          true,
          "Accounting router must mount Journal Entry routes at /journal-entries."
        );

      }
    );

  }
);