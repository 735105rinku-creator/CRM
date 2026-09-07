import test from "node:test";
import assert from "node:assert/strict";

const routePath =
  new URL(
    "../routes/gstReport.routes.js",
    import.meta.url
  );

test(
  "GST Report router module exists",
  async () => {
    const module =
      await import(
        routePath.href
      );

    assert.ok(
      module.default
    );
  }
);

test(
  "GST Report router exposes GET only",
  async () => {
    const module =
      await import(
        routePath.href
      );

    const router =
      module.default;

    const routeLayers =
      router.stack.filter(
        (layer) =>
          layer.route
      );

    const methods =
      routeLayers.flatMap(
        (layer) =>
          Object.keys(
            layer.route.methods
          )
      );

    assert.ok(
      methods.includes(
        "get"
      )
    );

    assert.equal(
      methods.includes(
        "post"
      ),
      false
    );

    assert.equal(
      methods.includes(
        "put"
      ),
      false
    );

    assert.equal(
      methods.includes(
        "patch"
      ),
      false
    );

    assert.equal(
      methods.includes(
        "delete"
      ),
      false
    );
  }
);
