import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const read = (relativePath) =>
  fs.readFileSync(
    path.join(root, relativePath),
    'utf8'
  );

const modelsPath =
  'src/app/features/accounts/models/accounts.models.ts';

const servicePath =
  'src/app/features/accounts/services/voucher.service.ts';

const componentPath =
  'src/app/features/accounts/pages/sales-invoices/sales-invoices.component.ts';

const templatePath =
  'src/app/features/accounts/pages/sales-invoices/sales-invoices.component.html';

const routesPath =
  'src/app/features/accounts/accounts.routes.ts';

const sidebarPath =
  'src/app/features/accounts/components/accounts-sidebar/accounts-sidebar.component.ts';


test(
  'voucher models expose the existing backend sales voucher contract',
  () => {
    const source = read(modelsPath);

    assert.match(
      source,
      /export\s+type\s+VoucherType/
    );

    assert.match(
      source,
      /'sales'/
    );

    assert.match(
      source,
      /export\s+type\s+VoucherStatus/
    );

    assert.match(
      source,
      /'draft'/
    );

    assert.match(
      source,
      /'posted'/
    );

    assert.match(
      source,
      /'void'/
    );

    assert.match(
      source,
      /export\s+interface\s+VoucherLine/
    );

    assert.match(
      source,
      /accountId:\s*string/
    );

    assert.match(
      source,
      /debit:\s*number/
    );

    assert.match(
      source,
      /credit:\s*number/
    );

    assert.match(
      source,
      /export\s+interface\s+Voucher/
    );

    assert.match(
      source,
      /voucherNumber:\s*string/
    );

    assert.match(
      source,
      /voucherType:\s*VoucherType/
    );

    assert.match(
      source,
      /partyAccountId/
    );

    assert.match(
      source,
      /lines:\s*VoucherLine\[\]/
    );

    assert.match(
      source,
      /totalDebit:\s*number/
    );

    assert.match(
      source,
      /totalCredit:\s*number/
    );
  }
);


test(
  'voucher service uses existing accounting voucher workflow',
  () => {
    const source = read(servicePath);

    assert.match(
      source,
      /\/accounting\/vouchers/
    );

    assert.match(
      source,
      /voucherType:\s*'sales'/
    );

    assert.match(
      source,
      /\.get<Voucher\[\]>/
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
  }
);


test(
  'sales invoices route loads the real component',
  () => {
    const source = read(routesPath);

    assert.match(
      source,
      /path:\s*'invoices'/
    );

    assert.match(
      source,
      /\.\/pages\/sales-invoices\/sales-invoices\.component/
    );

    assert.match(
      source,
      /module\.SalesInvoicesComponent/
    );
  }
);


test(
  'accounts sidebar exposes Sales Invoices route',
  () => {
    const source = read(sidebarPath);

    assert.match(
      source,
      /label:\s*'Sales Invoices'/
    );

    assert.match(
      source,
      /route:\s*'\/accounts\/invoices'/
    );
  }
);


test(
  'SalesInvoicesComponent supports draft sales invoice workflow',
  () => {
    const source = read(componentPath);

    assert.match(
      source,
      /export\s+class\s+SalesInvoicesComponent/
    );

    assert.match(
      source,
      /voucherType:\s*'sales'/
    );

    assert.match(
      source,
      /createSalesVoucher/
    );

    assert.match(
      source,
      /updateVoucher/
    );

    assert.match(
      source,
      /postVoucher/
    );

    assert.match(
      source,
      /voidVoucher/
    );

    assert.match(
      source,
      /getActiveAccounts/
    );

    assert.match(
      source,
      /FormArray/
    );

    assert.match(
      source,
      /totalDebit/
    );

    assert.match(
      source,
      /totalCredit/
    );
  }
);


test(
  'sales invoice template exposes invoice entry and workflow controls',
  () => {
    const source = read(templatePath);

    const requiredText = [
      'Sales Invoices',
      'New Invoice',
      'Invoice Date',
      'Customer / Party',
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
      'Post Invoice',
      'Void',
      'Draft',
      'Posted'
    ];

    for (const text of requiredText) {
      assert.ok(
        source.includes(text),
        `Expected template to contain "${text}".`
      );
    }
  }
);

test('sales invoice totals read current reactive-form values instead of stale computed state', () => {
  const source = read(
    'src/app/features/accounts/pages/sales-invoices/sales-invoices.component.ts'
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
