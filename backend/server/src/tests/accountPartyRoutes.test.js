import test from "node:test";
import assert from "node:assert/strict";

test(
  "Account Party router module exists",
  async () => {
    const module =
      await import(
        "../routes/accountParty.routes.js"
      );

    assert.ok(
      module.default
    );
  }
);

test(
  "Account Party router exposes GET POST PATCH and no DELETE",
  async () => {
    const module =
      await import(
        "../routes/accountParty.routes.js"
      );

    const router =
      module.default;

    const routes =
      router.stack
        .filter(
          layer =>
            layer.route
        )
        .map(
          layer => ({
            path:
              layer.route.path,

            methods:
              Object.keys(
                layer.route.methods
              ),
          })
        );

    const customerRoot =
      routes.find(
        route =>
          route.path ===
          "/customers"
      );

    const customerDetail =
      routes.find(
        route =>
          route.path ===
          "/customers/:id"
      );

    const vendorRoot =
      routes.find(
        route =>
          route.path ===
          "/vendors"
      );

    const vendorDetail =
      routes.find(
        route =>
          route.path ===
          "/vendors/:id"
      );

    assert.deepEqual(
      customerRoot.methods.sort(),
      [
        "get",
        "post",
      ]
    );

    assert.deepEqual(
      customerDetail.methods.sort(),
      [
        "get",
        "patch",
      ]
    );

    assert.deepEqual(
      vendorRoot.methods.sort(),
      [
        "get",
        "post",
      ]
    );

    assert.deepEqual(
      vendorDetail.methods.sort(),
      [
        "get",
        "patch",
      ]
    );

    assert.equal(
      routes.some(
        route =>
          route.methods.includes(
            "delete"
          )
      ),
      false
    );
  }
);
