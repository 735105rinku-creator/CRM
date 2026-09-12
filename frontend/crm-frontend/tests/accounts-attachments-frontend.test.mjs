import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const models = readFileSync(
  "./src/app/features/accounts/models/accounts.models.ts",
  "utf8"
);

const voucherService = readFileSync(
  "./src/app/features/accounts/services/voucher.service.ts",
  "utf8"
);

const expenseService = readFileSync(
  "./src/app/features/accounts/services/account-expense.service.ts",
  "utf8"
);

test(
  "Voucher frontend model exposes proof attachments",
  () => {
    assert.match(
      models,
      /export interface VoucherAttachment/
    );

    assert.match(
      models,
      /attachments\??:\s*VoucherAttachment\[\]/
    );
  }
);

test(
  "Voucher frontend model exposes Purchase source metadata",
  () => {
    assert.match(
      models,
      /sourceModule\??:/
    );

    assert.match(
      models,
      /sourceReferenceId\??:/
    );
  }
);

test(
  "VoucherService exposes proof upload",
  () => {
    assert.match(
      voucherService,
      /uploadAttachments\s*\(/
    );

    assert.match(
      voucherService,
      /proofFiles/
    );

    assert.match(
      voucherService,
      /new FormData/
    );
  }
);

test(
  "VoucherService exposes proof removal",
  () => {
    assert.match(
      voucherService,
      /removeAttachment\s*\(/
    );

    assert.match(
      voucherService,
      /attachments\/\$\{/
    );
  }
);

test(
  "AccountExpense frontend contract exposes attachments",
  () => {
    assert.match(
      expenseService,
      /attachments:\s*AccountExpenseAttachment\[\]/
    );
  }
);

test(
  "AccountExpenseService exposes proof upload and removal",
  () => {
    assert.match(
      expenseService,
      /uploadAttachments\s*\(/
    );

    assert.match(
      expenseService,
      /removeAttachment\s*\(/
    );

    assert.match(
      expenseService,
      /proofFiles/
    );
  }
);
