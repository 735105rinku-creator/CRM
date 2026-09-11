import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const voucherTs = readFileSync(
  "./src/app/features/accounts/pages/voucher-entry/voucher-entry.component.ts",
  "utf8"
);

const voucherHtml = readFileSync(
  "./src/app/features/accounts/pages/voucher-entry/voucher-entry.component.html",
  "utf8"
);

const expenseTs = readFileSync(
  "./src/app/features/accounts/pages/expense-register/expense-register.component.ts",
  "utf8"
);

const expenseHtml = readFileSync(
  "./src/app/features/accounts/pages/expense-register/expense-register.component.html",
  "utf8"
);

test("Voucher UI supports proof upload and removal", () => {
  assert.match(voucherTs, /onVoucherProofSelected\s*\(/);
  assert.match(voucherTs, /removeVoucherProof\s*\(/);
  assert.match(voucherTs, /attachmentUrl\s*\(/);
  assert.match(voucherHtml, /Supporting Proof/);
  assert.match(voucherHtml, /accept="\.pdf,\.jpg,\.jpeg,\.png"/);
});

test("Voucher Payment UI blocks posting without proof", () => {
  assert.match(
    voucherTs,
    /Payment Voucher requires supporting proof before posting/
  );
});

test("Expense UI supports proof upload and removal", () => {
  assert.match(expenseTs, /onExpenseProofSelected\s*\(/);
  assert.match(expenseTs, /removeExpenseProof\s*\(/);
  assert.match(expenseTs, /attachmentUrl\s*\(/);
  assert.match(expenseHtml, /Supporting Proof/);
  assert.match(expenseHtml, /accept="\.pdf,\.jpg,\.jpeg,\.png"/);
});

test("Proof UI exposes five-file and 10 MB limits", () => {
  assert.match(voucherTs, /maximum of 5/i);
  assert.match(voucherTs, /10 MB/i);
  assert.match(expenseTs, /maximum of 5/i);
  assert.match(expenseTs, /10 MB/i);
});
