import test from "node:test";
import assert from "node:assert/strict";


test(
  "Profit & Loss router module exists",
  async () => {

    const module =
      await import(
        "../routes/profitLoss.routes.js"
      );

    assert.ok(
      module.default
    );

  }
);


test(
  "Profit & Loss router exposes GET only",
  async () => {

    const module =
      await import(
        "../routes/profitLoss.routes.js"
      );


    const router =
      module.default;


    const methods =
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
      methods,
      [
        {
          path: "/",
          methods: ["get"],
        },
      ]
    );

  }
);
