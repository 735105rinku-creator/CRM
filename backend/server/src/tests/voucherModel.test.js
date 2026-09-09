import assert from "node:assert/strict";
import { test } from "node:test";
import {
  existsSync,
  readFileSync,
} from "node:fs";

const voucherModelPath =
  new URL(
    "../models/Voucher.js",
    import.meta.url
  );

test(
  "Voucher model defines the Tally-compatible voucher contract",
  () => {
    assert.equal(
      existsSync(voucherModelPath),
      true,
      "src/models/Voucher.js must exist"
    );

    const source =
      readFileSync(
        voucherModelPath,
        "utf8"
      );

    const requiredFields = [
      "companyId",
      "voucherNumber",
      "voucherType",
      "financialYear",
      "voucherDate",
      "narration",
      "referenceNo",
      "referenceDate",
      "partyAccountId",
      "lines",
      "totalDebit",
      "totalCredit",
      "status",
      "journalEntryId",
      "sourceModule",
      "sourceReferenceId",
      "createdBy",
      "updatedBy",
      "postedBy",
      "postedAt",
      "voidedBy",
      "voidedAt",
      "voidReason",
    ];

    for (
      const field
      of requiredFields
    ) {
      assert.match(
        source,
        new RegExp(
          `\\b${field}\\s*:`
        ),
        `Voucher model must define ${field}`
      );
    }

    assert.match(
      source,
      /VOUCHER_TYPES/,
      "Voucher model must use VOUCHER_TYPES"
    );

    assert.match(
      source,
      /VOUCHER_STATUSES/,
      "Voucher model must use VOUCHER_STATUSES"
    );

    assert.match(
      source,
      /autoCreate\s*:\s*false/,
      "Voucher model must not auto-create the collection"
    );

    assert.match(
      source,
      /autoIndex\s*:\s*false/,
      "Voucher model must not auto-build indexes"
    );

    assert.match(
      source,
      /collection\s*:\s*["']vouchers["']/,
      "Voucher model must use vouchers collection"
    );

    assert.match(
      source,
      /companyId[\s\S]*financialYear[\s\S]*voucherType[\s\S]*voucherNumber[\s\S]*unique\s*:\s*true/,
      "Voucher identity must be unique per company, FY, type and number"
    );
  }
);
