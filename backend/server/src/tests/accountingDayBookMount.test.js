import assert from "node:assert/strict";

import {
  test,
} from "node:test";

test(
  "mounts Day Book router under /day-book",
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
        (layer) => {

          if (!Array.isArray(layer.matchers)) {
            return false;
          }

          const matcher =
            layer.matchers[0];

          if (typeof matcher !== "function") {
            return false;
          }

          try {
            return Boolean(
              matcher("/day-book")
            );
          } catch {
            return false;
          }

        }
      );

    assert.equal(
      mounted,
      true,
      "Day Book router must be mounted at /day-book."
    );

  }
);
