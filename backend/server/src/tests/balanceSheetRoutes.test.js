import test from "node:test";
import assert from "node:assert/strict";


test(
  "Balance Sheet router module exists",
  async () => {

    const module =
      await import(
        "../routes/balanceSheet.routes.js"
      );

    assert.ok(
      module.default
    );

  }
);


test(
  "Balance Sheet router exposes GET only",
  async () => {

    const module =
      await import(
        "../routes/balanceSheet.routes.js"
      );


    const router =
      module.default;


    const routes =
      router.stack
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
                layer.route.methods
              ),
          })
        );


    assert.deepEqual(
      routes,
      [
        {
          path: "/",
          methods: ["get"],
        },
      ]
    );

  }
);
