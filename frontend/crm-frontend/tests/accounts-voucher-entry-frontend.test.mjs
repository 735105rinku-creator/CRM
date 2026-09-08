import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const testsDir = path.dirname(currentFile);
const frontendRoot = path.resolve(testsDir, '..');

function read(relativePath) {
  return fs.readFileSync(
    path.join(frontendRoot, relativePath),
    'utf8'
  );
}

test('voucher models expose all approved accounting voucher types', () => {
  const source = read(
    'src/app/features/accounts/models/accounts.models.ts'
  );

  for (const voucherType of [
    'journal',
    'payment',
    'receipt',
    'contra',
    'credit_note',
    'debit_note'
  ]) {
    assert.ok(
      source.includes(`'${voucherType}'`),
      `Expected VoucherType to include ${voucherType}`
    );
  }

  assert.match(
    source,
    /export\s+interface\s+CreateVoucherPayload/
  );

  assert.match(
    source,
    /export\s+interface\s+UpdateVoucherPayload/
  );
});


test('voucher service exposes generic voucher list and create workflow', () => {
  const source = read(
    'src/app/features/accounts/services/voucher.service.ts'
  );

  assert.match(
    source,
    /getVouchers\s*\(/
  );

  assert.match(
    source,
    /\.get<Voucher\[\]>/
  );

  assert.match(
    source,
    /createVoucher\s*\(/
  );

  assert.match(
    source,
    /\.post<Voucher>/
  );

  assert.match(
    source,
    /updateVoucher\s*\(/
  );

  assert.match(
    source,
    /postVoucher\s*\(/
  );

  assert.match(
    source,
    /voidVoucher\s*\(/
  );
});


test('accounts routes load the shared voucher entry component for approved voucher workspaces', () => {
  const source = read(
    'src/app/features/accounts/accounts.routes.ts'
  );

  assert.match(
    source,
    /\.\/pages\/voucher-entry\/voucher-entry\.component/
  );

  for (const pathName of [
    'journal',
    'payments',
    'receipts',
    'contra',
    'credit-notes',
    'debit-notes'
  ]) {
    assert.ok(
      source.includes(`path: '${pathName}'`),
      `Expected Accounts route for ${pathName}`
    );
  }

  for (const voucherType of [
    'journal',
    'payment',
    'receipt',
    'contra',
    'credit_note',
    'debit_note'
  ]) {
    assert.ok(
      source.includes(`voucherType: '${voucherType}'`),
      `Expected route data voucherType ${voucherType}`
    );
  }
});


test('accounts sidebar exposes approved voucher entry workspaces', () => {
  const source = read(
    'src/app/features/accounts/components/accounts-sidebar/accounts-sidebar.component.ts'
  );

  const expectedEntries = [
    ['Journal Vouchers', '/accounts/journal'],
    ['Payments', '/accounts/payments'],
    ['Receipts', '/accounts/receipts'],
    ['Contra', '/accounts/contra'],
    ['Credit Notes', '/accounts/credit-notes'],
    ['Debit Notes', '/accounts/debit-notes']
  ];

  for (const [label, route] of expectedEntries) {
    assert.ok(
      source.includes(label),
      `Expected sidebar label: ${label}`
    );

    assert.ok(
      source.includes(route),
      `Expected sidebar route: ${route}`
    );
  }
});


test('VoucherEntryComponent supports shared draft post and void workflow', () => {
  const source = read(
    'src/app/features/accounts/pages/voucher-entry/voucher-entry.component.ts'
  );

  assert.match(
    source,
    /export\s+class\s+VoucherEntryComponent/
  );

  assert.match(
    source,
    /ActivatedRoute/
  );

  assert.match(
    source,
    /voucherType/
  );

  assert.match(
    source,
    /getVouchers\s*\(/
  );

  assert.match(
    source,
    /createVoucher\s*\(/
  );

  assert.match(
    source,
    /updateVoucher\s*\(/
  );

  assert.match(
    source,
    /postVoucher\s*\(/
  );

  assert.match(
    source,
    /voidVoucher\s*\(/
  );

  assert.match(
    source,
    /getActiveAccounts\s*\(/
  );

  assert.match(
    source,
    /FormArray/
  );

  assert.match(
    source,
    /totalDebit\s*\(\s*\)\s*:\s*number/
  );

  assert.match(
    source,
    /totalCredit\s*\(\s*\)\s*:\s*number/
  );

  assert.match(
    source,
    /balanced\s*\(\s*\)\s*:\s*boolean/
  );
});


test('voucher entry template exposes accounting entry and lifecycle controls', () => {
  const source = read(
    'src/app/features/accounts/pages/voucher-entry/voucher-entry.component.html'
  );

  const requiredText = [
    'New Voucher',
    'Voucher Date',
    'Reference No.',
    'Reference Date',
    'Narration',
    'Accounting Lines',
    'Account',
    'Description',
    'Debit',
    'Credit',
    'Total Debit',
    'Total Credit',
    'Save Draft',
    'Post Voucher',
    'Void',
    'Draft',
    'Posted'
  ];

  for (const text of requiredText) {
    assert.ok(
      source.includes(text),
      `Expected voucher entry template to contain: ${text}`
    );
  }
});


test('voucher entry totals use current reactive form values', () => {
  const source = read(
    'src/app/features/accounts/pages/voucher-entry/voucher-entry.component.ts'
  );

  assert.match(
    source,
    /totalDebit\s*\(\s*\)\s*:\s*number/
  );

  assert.match(
    source,
    /totalCredit\s*\(\s*\)\s*:\s*number/
  );

  assert.match(
    source,
    /balanced\s*\(\s*\)\s*:\s*boolean/
  );

  assert.doesNotMatch(
    source,
    /readonly\s+totalDebit\s*=\s*computed/
  );

  assert.doesNotMatch(
    source,
    /readonly\s+totalCredit\s*=\s*computed/
  );
});