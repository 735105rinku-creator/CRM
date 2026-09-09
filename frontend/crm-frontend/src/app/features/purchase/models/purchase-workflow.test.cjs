const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync(__dirname + '/purchase-workflow.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const target = { exports: {} };
new Function('module', 'exports', compiled)(target, target.exports);
const { allowedTransitions, estimateTotals, receiptError } = target.exports;
test('employee submits PR but cannot approve it', () => {
  assert.deepEqual(allowedTransitions('requests', 'draft', false), ['pending_approval']);
  assert.deepEqual(allowedTransitions('requests', 'pending_approval', false), []);
  assert.deepEqual(allowedTransitions('requests', 'pending_approval', true), ['approved', 'rejected']);
});
test('receipt status cannot be manually changed', () => assert.deepEqual(allowedTransitions('goods-receipts', 'partial', true), []));
test('quotation selection and order sending require approval permission', () => {
  assert.deepEqual(allowedTransitions('quotations', 'received', false), []);
  assert.ok(allowedTransitions('quotations', 'received', true).includes('selected'));
  assert.deepEqual(allowedTransitions('orders', 'approved', false), []);
});
test('price estimate includes tax freight and other charges with cent rounding', () => {
  assert.deepEqual(estimateTotals([{ quantity: 3, unitPrice: 10.25, taxRate: 18 }], 2, 1), { subtotal: 30.75, taxTotal: 5.54, grandTotal: 39.29 });
});
test('receipt rejects overdelivery and inconsistent disposition', () => {
  assert.ok(receiptError([{ receivedQty: 21, acceptedQty: 21, rejectedQty: 0, remainingPhysical: 20 }]));
  assert.ok(receiptError([{ receivedQty: 10, acceptedQty: 8, rejectedQty: 1, remainingPhysical: 20 }]));
  assert.equal(receiptError([{ receivedQty: 20, acceptedQty: 18, rejectedQty: 2, remainingPhysical: 20 }]), '');
  assert.ok(receiptError([{ receivedQty: 0, acceptedQty: 0, rejectedQty: 0, remainingPhysical: 20 }]));
});
