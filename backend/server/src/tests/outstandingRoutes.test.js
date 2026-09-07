import test from "node:test";
import assert from "node:assert/strict";

test(
  "outstanding route module exists",
  async () => {

    const module =
      await import(
        "../routes/outstanding.routes.js"
      );

    assert.ok(
      module.default
    );

  }
);
