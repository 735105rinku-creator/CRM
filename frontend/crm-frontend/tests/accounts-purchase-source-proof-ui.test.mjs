import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const models = readFileSync(
  "./src/app/features/accounts/models/accounts.models.ts",
  "utf8"
);

const html = readFileSync(
  "./src/app/features/accounts/pages/purchase-bills/purchase-bills.component.html",
  "utf8"
);

test("Voucher exposes response-only sourceAttachments", () => {
  assert.match(
    models,
    /sourceAttachments\?\s*:\s*VoucherAttachment\[\]/
  );
});

test("Purchase-origin bill renders source attachment filenames", () => {
  assert.match(
    html,
    /bill\.sourceAttachments/
  );

  assert.match(
    html,
    /attachment\.originalName/
  );

  assert.match(
    html,
    /\[href\]="attachmentUrl\(attachment\)"/
  );
});

test("Purchase-origin source proof remains read-only", () => {
  const sourceBlock =
    html.match(
      /@if \(isPurchaseOriginBill\(bill\)\) \{([\s\S]*?)\} @else \{/
    )?.[1] ?? "";

  assert.doesNotMatch(
    sourceBlock,
    /removeBillProof/
  );

  assert.doesNotMatch(
    sourceBlock,
    /onBillProofSelected/
  );
});
