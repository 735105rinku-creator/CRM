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


test('voucher models support the existing backend purchase voucher contract', () => {
  const source = read(
    'src/app/features/accounts/models/accounts.models.ts'
  );

  assert.match(
    source,
    /export\s+type\s+VoucherType/
  );

  assert.match(
    source,
    /'purchase'/
  );

  assert.match(
    source,
    /export\s+interface\s+Voucher/
  );

  assert.match(
    source,
    /export\s+interface\s+CreateVoucherPayload/
  );

  assert.match(
    source,
    /export\s+interface\s+UpdateVoucherPayload/
  );
});


test('voucher service exposes purchase bill workflow on existing voucher endpoint', () => {
  const source = read(
    'src/app/features/accounts/services/voucher.service.ts'
  );

  assert.match(
    source,
    /\/accounting\/vouchers/
  );

  assert.match(
    source,
    /getPurchaseVouchers\s*\(/
  );

  assert.match(
    source,
    /voucherType\s*:\s*'purchase'/
  );

  assert.match(
    source,
    /createPurchaseVoucher\s*\(/
  );

  assert.match(
    source,
    /\.post<Voucher>/
  );

  assert.match(
    source,
    /\.patch<Voucher>/
  );

  assert.match(
    source,
    /\/post/
  );

  assert.match(
    source,
    /\/void/
  );
});


test('purchase bills route loads the real component', () => {
  const source = read(
    'src/app/features/accounts/accounts.routes.ts'
  );

  assert.match(
    source,
    /path\s*:\s*'bills'[\s\S]*?\.\/pages\/purchase-bills\/purchase-bills\.component[\s\S]*?module\.PurchaseBillsComponent/
  );
});


test('accounts sidebar exposes Purchase Bills route', () => {
  const source = read(
    'src/app/features/accounts/components/accounts-sidebar/accounts-sidebar.component.ts'
  );

  assert.match(
    source,
    /Purchase Bills/
  );

  assert.match(
    source,
    /\/accounts\/bills/
  );
});


test('PurchaseBillsComponent supports draft purchase bill workflow', () => {
  const source = read(
    'src/app/features/accounts/pages/purchase-bills/purchase-bills.component.ts'
  );

  assert.match(
    source,
    /voucherType[\s\S]*?'purchase'/
  );

  assert.match(
    source,
    /getPurchaseVouchers\s*\(/
  );

  assert.match(
    source,
    /createPurchaseVoucher\s*\(/
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
    /getVendors\s*\(/
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


test('purchase bills template exposes bill entry and workflow controls', () => {
  const source = read(
    'src/app/features/accounts/pages/purchase-bills/purchase-bills.component.html'
  );

  const requiredText = [
    'Purchase Bills',
    'New Bill',
    'Bill Date',
    'Vendor / Party',
    'Reference No.',
    'Reference Date',
    'Narration',
    'Account',
    'Description',
    'Debit',
    'Credit',
    'Total Debit',
    'Total Credit',
    'Save Draft',
    'Post Bill',
    'Void',
    'Draft',
    'Posted'
  ];

  for (const text of requiredText) {
    assert.ok(
      source.includes(text),
      `Expected Purchase Bills template to contain: ${text}`
    );
  }
});