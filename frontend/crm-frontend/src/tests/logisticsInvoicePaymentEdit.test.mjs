import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const root = new URL('../app/features/logistics/', import.meta.url);
test('invoice and vendor payment screens expose no record delete action or request', () => {
  for (const file of ['invoices/invoice-list/logistics-invoice-list.component', 'invoices/invoice-new/logistics-invoice-new.component', 'vendor-payments/vendor-payment.component']) {
    const ts = readFileSync(new URL(`${file}.ts`, root), 'utf8');
    const html = readFileSync(new URL(`${file}.html`, root), 'utf8');
    assert.doesNotMatch(ts, /api\.delete\s*\(/);
    assert.doesNotMatch(html, /deleteInvoice|deletePayment/);
  }
});
