import assert from "node:assert/strict";

import {
  describe,
  test,
} from "node:test";


describe(
  "Accounting Voucher mount",
  () => {

    test(
      "mounts Voucher router under /vouchers",
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
                    "/vouchers"
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
          "Voucher router must be mounted at /vouchers."
        );

      }
    );

  }
);
