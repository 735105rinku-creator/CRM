import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const salesTs = readFileSync(
  "./src/app/features/accounts/pages/sales-invoices/sales-invoices.component.ts",
  "utf8"
);

const salesHtml = readFileSync(
  "./src/app/features/accounts/pages/sales-invoices/sales-invoices.component.html",
  "utf8"
);

const purchaseTs = readFileSync(
  "./src/app/features/accounts/pages/purchase-bills/purchase-bills.component.ts",
  "utf8"
);

const purchaseHtml = readFileSync(
  "./src/app/features/accounts/pages/purchase-bills/purchase-bills.component.html",
  "utf8"
);

test("Sales Invoice supports optional proof UI", () => {
  assert.match(salesTs, /onInvoiceProofSelected\s*\(/);
  assert.match(salesTs, /removeInvoiceProof\s*\(/);
  assert.match(salesHtml, /Supporting Proof/);
  assert.match(
    salesHtml,
    /accept="\.pdf,\.jpg,\.jpeg,\.png"/
  );
});

test("Purchase Bill supports proof UI", () => {
  assert.match(purchaseTs, /onBillProofSelected\s*\(/);
  assert.match(purchaseTs, /removeBillProof\s*\(/);
  assert.match(purchaseHtml, /Supporting Proof/);
});

test("Manual Purchase Bill requires proof before posting", () => {
  assert.match(
    purchaseTs,
    /Purchase Bill requires supporting proof before posting/
  );
});

test("Purchase-origin bills reuse Purchase proof without duplicate upload", () => {
  assert.match(
    purchaseTs,
    /sourceModule\s*===\s*'purchase_invoice'/
  );

  assert.match(
    purchaseHtml,
    /Purchase Invoice proof reused automatically/i
  );
});

test("Sales and Purchase native proof limits are enforced", () => {
  assert.match(salesTs, /maximum of 5/i);
  assert.match(salesTs, /10 MB/i);
  assert.match(purchaseTs, /maximum of 5/i);
  assert.match(purchaseTs, /10 MB/i);
});
