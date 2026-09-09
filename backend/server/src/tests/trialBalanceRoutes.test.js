import assert from "node:assert/strict";
import { test } from "node:test";


test(
  "Trial Balance router module exists",
  async () => {

    await assert.doesNotReject(
      async () => {

        const module =
          await import(
            "../routes/trialBalance.routes.js"
          );

        assert.ok(
          module.default ||
          module.trialBalanceRouter,
          "Trial Balance router export is required."
        );

      }
    );

  }
);
