import assert from "node:assert/strict";

import {
  test,
} from "node:test";

test(
  "Day Book route exposes GET only",
  async () => {

    const module =
      await import(
        "../routes/dayBook.routes.js"
      );

    const router =
      module.default;

    const routes =
      router.stack
        .filter((layer) => layer.route)
        .map((layer) => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods),
        }));

    const root =
      routes.find(
        (route) => route.path === "/"
      );

    assert.ok(root);
    assert.deepEqual(
      root.methods,
      ["get"]
    );

    const methods =
      routes.flatMap(
        (route) => route.methods
      );

    assert.doesNotMatch(
      methods.join(" "),
      /\bpost\b|\bput\b|\bpatch\b|\bdelete\b/
    );

  }
);
