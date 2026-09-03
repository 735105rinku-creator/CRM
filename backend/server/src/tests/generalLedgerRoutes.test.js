import assert from "node:assert/strict";

import {
  describe,
  test,
} from "node:test";


describe(
  "General Ledger routes",
  () => {

    test(
      "exposes read-only General Ledger routes",
      async () => {

        const module =
          await import(
            "../routes/generalLedger.routes.js"
          );


        const router =
          module.default;


        assert.ok(
          router,
          "General Ledger router must be exported."
        );


        const routes =
          router.stack
            .filter(
              (
                layer
              ) =>
                layer.route
            )
            .map(
              (
                layer
              ) => ({
                path:
                  layer.route.path,

                methods:
                  Object.keys(
                    layer.route.methods
                  ),
              })
            );


        const listRoute =
          routes.find(
            (
              route
            ) =>
              route.path ===
              "/"
          );


        assert.ok(
          listRoute,
          "GET / route must exist."
        );


        assert.deepEqual(
          listRoute.methods,
          [
            "get",
          ]
        );


        const accountRoute =
          routes.find(
            (
              route
            ) =>
              route.path ===
              "/:accountId"
          );


        assert.ok(
          accountRoute,
          "GET /:accountId route must exist."
        );


        assert.deepEqual(
          accountRoute.methods,
          [
            "get",
          ]
        );

      }
    );


    test(
      "does not expose General Ledger write routes",
      async () => {

        const module =
          await import(
            "../routes/generalLedger.routes.js"
          );


        const router =
          module.default;


        const methods =
          router.stack
            .filter(
              (
                layer
              ) =>
                layer.route
            )
            .flatMap(
              (
                layer
              ) =>
                Object.keys(
                  layer.route.methods
                )
            );


        assert.doesNotMatch(
          methods.join(" "),
          /\bpost\b|\bput\b|\bpatch\b|\bdelete\b/
        );

      }
    );

  }
);