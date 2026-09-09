import assert from "node:assert/strict";
import { test } from "node:test";

import * as accountingConstants from "../constants/accounting.js";

test("defines Tally-compatible voucher constants", () => {
  assert.deepEqual(
    accountingConstants.VOUCHER_TYPES,
    [
      "journal",
      "payment",
      "receipt",
      "contra",
      "sales",
      "purchase",
      "credit_note",
      "debit_note",
    ]
  );

  assert.deepEqual(
    accountingConstants.VOUCHER_STATUSES,
    [
      "draft",
      "posted",
      "void",
    ]
  );

  assert.deepEqual(
    accountingConstants.VOUCHER_PREFIXES,
    {
      journal: "JV",
      payment: "PV",
      receipt: "RV",
      contra: "CV",
      sales: "SV",
      purchase: "PUR",
      credit_note: "CN",
      debit_note: "DN",
    }
  );
});
