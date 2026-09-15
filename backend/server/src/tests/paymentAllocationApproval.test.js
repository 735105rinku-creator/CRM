import assert from "node:assert/strict";
import { test } from "node:test";

test("PaymentAllocation service exposes a post-time approval guard", async () => {
  const { default: service } = await import(
    "../services/paymentAllocation.service.js"
  );

  assert.equal(typeof service.assertApprovedForPosting, "function");
});
