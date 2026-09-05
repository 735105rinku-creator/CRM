import assert from "node:assert/strict";
import test from "node:test";

test("charge calculation applies discount before GST and adds other tax once", async () => {
  const { calculateLogisticsCharges } = await import("../utils/logisticsCharges.js");
  assert.deepEqual(calculateLogisticsCharges({
    freightAmount: 5000, handlingCharge: 1000, documentationCharge: 500,
    otherCharge: 500, discount: 1000, gstRate: 18, otherTax: 80,
  }), {
    subtotal: 7000,
    taxableAmount: 6000,
    gstAmount: 1080,
    totalAmount: 7160,
  });
});

test("discount cannot make taxable amount or GST negative", async () => {
  const { calculateLogisticsCharges } = await import("../utils/logisticsCharges.js");
  assert.deepEqual(calculateLogisticsCharges({ freightAmount: 100, discount: 200, gstRate: 18 }), {
    subtotal: 100, taxableAmount: 0, gstAmount: 0, totalAmount: 0,
  });
});
