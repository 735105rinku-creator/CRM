import assert from "node:assert/strict";

import {
  describe,
  test,
} from "node:test";


describe(
  "Accounting General Ledger mount",
  () => {

    test(
      "mounts General Ledger router under /general-ledger",
      async () => {

        const module =
          await import(
            "../routes/accounting.routes.js"
          );


        const router =
          module.default;


        assert.ok(
          router,
          "Accounting router must be exported."
        );


        const mounted =
          router.stack.some(
            (
              layer
            ) => {

              if (
                !Array.isArray(
                  layer.matchers
                )
              ) {
                return false;
              }


              const matcher =
                layer.matchers[0];


              if (
                typeof matcher !==
                "function"
              ) {
                return false;
              }


              try {

                return Boolean(
                  matcher(
                    "/general-ledger"
                  )
                );

              } catch {

                return false;

              }

            }
          );


        assert.equal(
          mounted,
          true,
          "General Ledger router must be mounted at /general-ledger."
        );

      }
    );

  }
);