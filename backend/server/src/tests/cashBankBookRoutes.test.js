import test from "node:test";
import assert from "node:assert/strict";


test(
  "Cash/Bank Book router module exists",
  async () => {

    const module =
      await import(
        "../routes/cashBankBook.routes.js"
      );

    assert.ok(
      module.default
    );

  }
);


test(
  "Cash/Bank Book router exposes GET only",
  async () => {

    const module =
      await import(
        "../routes/cashBankBook.routes.js"
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
