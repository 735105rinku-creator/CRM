import assert from "node:assert/strict";

import {
  describe,
  test,
} from "node:test";


/* ============================================================
   HELPERS
============================================================ */

const routeSignatures =
  (
    router
  ) =>
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
        ) => {

          const path =
            layer.route.path;


          return Object
            .keys(
              layer.route.methods
            )
            .filter(
              (
                method
              ) =>
                layer.route
                  .methods[
                    method
                  ]
            )
            .map(
              (
                method
              ) =>
                `${method.toUpperCase()} ${path}`
            );

        }
      );


/* ============================================================
   JOURNAL ENTRY ROUTES
============================================================ */

describe(
  "Journal Entry Routes",
  () => {

    test(
      "exports an Express router",
      async () => {

        let module;


        try {

          module =
            await import(
              "../routes/journalEntry.routes.js"
            );

        } catch (
          error
        ) {

          assert.fail(
            `Journal Entry routes must exist: ${error.message}`
          );

        }


        const router =
          module.default;


        assert.ok(
          router,
          "Journal Entry router default export is required."
        );


        assert.ok(
          Array.isArray(
            router.stack
          ),
          "Journal Entry default export must be an Express router."
        );

      }
    );


    test(
      "defines required Journal Entry endpoints",
      async () => {

        const {
          default:
            router,
        } =
          await import(
            "../routes/journalEntry.routes.js"
          );


        const routes =
          routeSignatures(
            router
          );


        const expectedRoutes = [

          "GET /",

          "POST /",

          "GET /:id",

          "PATCH /:id",

          "POST /:id/post",

          "POST /:id/void",

        ];


        for (
          const route of
            expectedRoutes
        ) {

          assert.ok(
            routes.includes(
              route
            ),
            `Missing Journal Entry route: ${route}`
          );

        }

      }
    );


    test(
      "does not define a physical DELETE endpoint",
      async () => {

        const {
          default:
            router,
        } =
          await import(
            "../routes/journalEntry.routes.js"
          );


        const routes =
          routeSignatures(
            router
          );


        const deleteRoutes =
          routes.filter(
            (
              route
            ) =>
              route.startsWith(
                "DELETE "
              )
          );


        assert.deepEqual(
          deleteRoutes,
          []
        );

      }
    );

  }
);