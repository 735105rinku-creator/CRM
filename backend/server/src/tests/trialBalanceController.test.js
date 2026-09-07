import assert from "node:assert/strict";
import { test } from "node:test";


test(
  "TrialBalanceController module exists",
  async () => {

    await assert.doesNotReject(
      async () => {

        const module =
          await import(
            "../controllers/trialBalance.controller.js"
          );

        assert.ok(
          module.TrialBalanceController,
          "TrialBalanceController export is required."
        );

      }
    );

  }
);
