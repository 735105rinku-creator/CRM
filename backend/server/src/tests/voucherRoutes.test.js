import assert from "node:assert/strict";

import {
  describe,
  test,
} from "node:test";


describe(
  "Voucher Routes",
  () => {

    test(
      "exports the Phase 1 Voucher router",
      async () => {

        let module;


        try {

          module =
            await import(
              "../routes/voucher.routes.js"
            );

        } catch (
          error
        ) {

          assert.fail(
            `Voucher routes must exist: ${error.message}`
          );

        }


        assert.ok(
          module.default,
          "Voucher router default export is required"
        );


        assert.equal(
          typeof module.default,
          "function"
        );

      }
    );


    test(
      "registers GET, POST and PATCH routes without DELETE",
      async () => {

        const {
          default:
            router,
        } =
          await import(
            "../routes/voucher.routes.js"
          );


        const layers =
          router.stack ||
          [];


        const methods =
          layers
            .map(
              (
                layer
              ) =>
                Object.keys(
                  layer.route?.methods ||
                  {}
                )
            )
            .flat();


        assert.ok(
          methods.includes(
            "get"
          )
        );


        assert.ok(
          methods.includes(
            "post"
          )
        );


        assert.ok(
          methods.includes(
            "patch"
          )
        );


        assert.equal(
          methods.includes(
            "delete"
          ),
          false
        );

      }
    );

  }
);

test(
  "registers Voucher post and void workflow routes",
  async () => {

    const {
      default:
        router,
    } =
      await import(
        "../routes/voucher.routes.js"
      );


    const routes =
      (router.stack || [])
        .filter(
          (layer) =>
            layer.route
        )
        .map(
          (layer) => ({
            path:
              layer.route.path,

            methods:
              Object.keys(
                layer.route.methods ||
                {}
              ),
          })
        );


    const hasPostRoute =
      routes.some(
        (route) =>
          route.path ===
            "/:voucherId/post" &&
          route.methods.includes(
            "post"
          )
      );


    const hasVoidRoute =
      routes.some(
        (route) =>
          route.path ===
            "/:voucherId/void" &&
          route.methods.includes(
            "post"
          )
      );


    assert.equal(
      hasPostRoute,
      true
    );


    assert.equal(
      hasVoidRoute,
      true
    );


    const hasDeleteRoute =
      routes.some(
        (route) =>
          route.methods.includes(
            "delete"
          )
      );


    assert.equal(
      hasDeleteRoute,
      false
    );

  }
);
