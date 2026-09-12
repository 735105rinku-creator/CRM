import assert from "node:assert/strict";
import {
  readFileSync
} from "node:fs";
import { test } from "node:test";

const html =
  readFileSync(
    "./src/app/features/accounts/pages/voucher-entry/voucher-entry.component.html",
    "utf8"
  );

const ts =
  readFileSync(
    "./src/app/features/accounts/pages/voucher-entry/voucher-entry.component.ts",
    "utf8"
  );


test(
  "Payment voucher UI does not expose Purchase Invoice allocation controls",
  () => {

    assert.doesNotMatch(
      html,
      /Allocate Purchase Invoices/
    );

    assert.doesNotMatch(
      html,
      /Allocate Invoices/
    );

    assert.doesNotMatch(
      html,
      /openAllocations\s*\(/
    );
  }
);


test(
  "VoucherEntryComponent no longer carries payment allocation UI state or handlers",
  () => {

    const allocationSymbols = [
      "allocationOpen",
      "allocationVoucher",
      "allocationOptions",
      "allocationAmounts",
      "allocationTotal",
      "openAllocations",
      "closeAllocations",
      "setAllocation",
      "saveAllocations",
      "PurchasePaymentAllocationOption",
    ];

    for (
      const symbol of allocationSymbols
    ) {
      assert.doesNotMatch(
        ts,
        new RegExp(
          `\\b${symbol}\\b`
        ),
        `Unexpected allocation UI symbol remains: ${symbol}`
      );
    }
  }
);
