import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const voucherService = readFileSync(
  "./src/services/voucher.service.js",
  "utf8"
);

const accountingRoutes = readFileSync(
  "./src/routes/accounting.routes.js",
  "utf8"
);


test(
  "Voucher attachment removal invokes safe Accounts proof cleanup",
  () => {

    assert.match(
      voucherService,
      /safeRemoveAccountsProofFile/
    );

    assert.match(
      voucherService,
      /attachmentToRemove/
    );

    assert.match(
      voucherService,
      /await\s+safeRemoveAccountsProofFile\s*\(/
    );
  }
);


test(
  "Expense attachment removal invokes safe Accounts proof cleanup",
  () => {

    assert.match(
      accountingRoutes,
      /safeRemoveAccountsProofFile/
    );

    assert.match(
      accountingRoutes,
      /attachmentFileUrl/
    );

    assert.match(
      accountingRoutes,
      /await\s+safeRemoveAccountsProofFile\s*\(/
    );
  }
);
