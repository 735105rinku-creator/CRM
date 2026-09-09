import assert from 'node:assert/strict';
import { test } from 'node:test';

const companyId = '64b000000000000000000001';
const vendorId = '64b000000000000000000002';
const warehouseId = '64b000000000000000000003';
const actor = { companyId, userId: '64b000000000000000000004', userName: 'Buyer', departmentName: 'Purchase', canCreate: true, canEdit: true, canApprove: true, canDelete: true };
const payload = () => ({ date: '2026-09-07', items: [{ description: 'Steel', quantity: 100, unit: 'kg', unitPrice: 10, taxRate: 18 }], purpose: 'Production' });
async function setup() {
  const { PurchaseService } = await import('../services/purchase.service.js');
  const records = new Map();
  const copy = (v) => v ? structuredClone(v) : v;
  const repository = {
    async create(record) { records.set(String(record._id), copy(record)); return copy(record); },
    async get(company, kind, id) { const r = records.get(String(id)); return r?.companyId === company && r.kind === kind && !r.deleted ? copy(r) : null; },
    async save(company, kind, id, version, changes) {
      const r = records.get(String(id));
      if (!r || r.companyId !== company || r.kind !== kind || r.version !== version) return null;
      const result = { ...r, ...copy(changes), version: version + 1 }; records.set(String(id), result); return copy(result);
    },
    async findReceiptOrder(company, id) { return copy([...records.values()].find(r => r.companyId === company && r.receipts?.some(g => String(g._id) === String(id)))); },
    async all(company, kind) { return copy([...records.values()].filter(r => r.companyId === company && (!kind || r.kind === kind) && !r.deleted)); },
    async master(type, company, id) { return company === companyId && [vendorId, warehouseId].includes(id) ? { _id: id, vendorName: 'Supplier', warehouseName: 'Main', status: 'active' } : null; },
    async lookups() { return { vendors: [{ _id: vendorId, name: 'Supplier' }], warehouses: [{ _id: warehouseId, name: 'Main' }], products: [] }; },
  };
  return { service: new PurchaseService({ repository }), records, repository };
}
async function sentOrder(service) {
  let order = await service.create(actor, 'orders', { ...payload(), vendorId, warehouseId });
  order = await service.transition(actor, 'orders', order._id, 'approved');
  return service.transition(actor, 'orders', order._id, 'sent');
}
const receipt = (order, qty, accepted = qty) => ({ date: '2026-09-07', orderId: String(order._id), items: [{ orderItemId: String(order.items[0]._id), receivedQty: qty, acceptedQty: accepted, rejectedQty: qty - accepted }] });

test('PR CRUD enforces validation, server identity, calculated totals and approval workflow', async () => {
  const { service } = await setup();
  await assert.rejects(() => service.create(actor, 'requests', { ...payload(), items: [] }), /items/i);
  let pr = await service.create(actor, 'requests', { ...payload(), requestedByName: 'Forged', grandTotal: 1 });
  assert.equal(pr.requestedByName, 'Buyer'); assert.equal(pr.grandTotal, 1180); assert.equal(pr.status, 'draft');
  assert.match(pr.number, /^PR-20260907-[A-F0-9]{24}$/);
  pr = await service.update(actor, 'requests', pr._id, { remarks: 'Updated' }); assert.equal(pr.remarks, 'Updated');
  pr = await service.transition(actor, 'requests', pr._id, 'pending_approval');
  await assert.rejects(() => service.transition({ ...actor, canApprove: false }, 'requests', pr._id, 'approved'), e => e.statusCode === 403);
  pr = await service.transition(actor, 'requests', pr._id, 'approved'); assert.equal(pr.editHistory.at(-1).userName, 'Buyer');
  await assert.rejects(() => service.update(actor, 'requests', pr._id, { remarks: 'Bad' }), /editable/i);
  await assert.rejects(() => service.transition(actor, 'requests', pr._id, 'draft'), /transition/i);
});
test('tenant references, invalid identifiers and vendor/warehouse state are validated', async () => {
  const { service } = await setup();
  await assert.rejects(() => service.create(actor, 'orders', { ...payload(), vendorId: '64b000000000000000000099', warehouseId }), /vendor/i);
  await assert.rejects(() => service.create(actor, 'orders', { ...payload(), vendorId, warehouseId: '64b000000000000000000099' }), /warehouse/i);
  await assert.rejects(() => service.create(actor, 'vendor-enquiries', payload()), /vendorId/i);
  await assert.rejects(() => service.get(actor, 'requests', 'bad'), e => e.statusCode === 400);
  const pr = await service.create(actor, 'requests', payload());
  await assert.rejects(() => service.get({ ...actor, companyId: vendorId }, 'requests', pr._id), e => e.statusCode === 404);
  await assert.rejects(() => service.create(actor, 'quotations', { ...payload(), vendorId, requestId: String(pr._id) }), /approved/i);
});
test('RFQ quotation and PO preserve linked vendor and request and approval permissions', async () => {
  const { service } = await setup();
  let pr = await service.create(actor, 'requests', payload());
  await service.transition(actor, 'requests', pr._id, 'pending_approval'); pr = await service.transition(actor, 'requests', pr._id, 'approved');
  let rfq = await service.create(actor, 'vendor-enquiries', { ...payload(), vendorId, requestId: String(pr._id), source: 'Direct Supplier' });
  rfq = await service.transition(actor, 'vendor-enquiries', rfq._id, 'sent');
  let quote = await service.create(actor, 'quotations', { ...payload(), vendorId, requestId: String(pr._id), enquiryId: String(rfq._id), freight: 20, otherCharges: 5, status: 'received' });
  assert.equal(quote.grandTotal, 1205);
  await assert.rejects(() => service.transition({ ...actor, canApprove: false }, 'quotations', quote._id, 'selected'), e => e.statusCode === 403);
  quote = await service.transition(actor, 'quotations', quote._id, 'selected');
  const po = await service.create(actor, 'orders', { ...payload(), vendorId, warehouseId, quotationId: String(quote._id), requestId: String(pr._id) });
  assert.equal(String(po.quotationId), String(quote._id));
});
test('multiple receipts aggregate accepted quantity and complete the order', async () => {
  const { service } = await setup(); const order = await sentOrder(service);
  const first = await service.create(actor, 'goods-receipts', receipt(order, 30)); assert.equal(first.status, 'partial');
  await service.create(actor, 'goods-receipts', receipt(order, 50));
  let current = await service.get(actor, 'orders', order._id); assert.equal(current.items[0].receivedQty, 80); assert.equal(current.items[0].remainingQty, 20); assert.equal(current.status, 'partially_received');
  await assert.rejects(() => service.create(actor, 'goods-receipts', receipt(order, 21)), /over.receipt/i);
  const final = await service.create(actor, 'goods-receipts', receipt(order, 20)); assert.equal(final.status, 'completed');
  current = await service.get(actor, 'orders', order._id); assert.equal(current.status, 'received'); assert.equal(current.items[0].remainingQty, 0);
});
test('receipt edits replace the old contribution atomically and preserve audit', async () => {
  const { service } = await setup(); const order = await sentOrder(service);
  const first = await service.create(actor, 'goods-receipts', receipt(order, 30));
  await service.create(actor, 'goods-receipts', receipt(order, 50));
  await assert.rejects(() => service.update(actor, 'goods-receipts', first._id, receipt(order, 60)), /over.receipt/i);
  const edited = await service.update(actor, 'goods-receipts', first._id, receipt(order, 40));
  assert.equal(edited.editHistory.at(-1).action, 'updated');
  const current = await service.get(actor, 'orders', order._id); assert.equal(current.items[0].receivedQty, 90); assert.equal(current.items[0].remainingQty, 10);
});
test('physical overdelivery, duplicate lines, and inconsistent inspection are rejected', async () => {
  const { service } = await setup(); const order = await sentOrder(service);
  const rejected = await service.create(actor, 'goods-receipts', receipt(order, 100, 0)); assert.equal(rejected.status, 'rejected');
  const current = await service.get(actor, 'orders', order._id); assert.equal(current.items[0].remainingQty, 100); assert.equal(current.items[0].rejectedQty, 100); assert.equal(current.status, 'partially_received');
  await assert.rejects(() => service.create(actor, 'goods-receipts', receipt(order, 1)), /over.receipt/i);
  const other = await sentOrder(service); const invalid = receipt(other, 10); invalid.items[0].acceptedQty = 9;
  await assert.rejects(() => service.create(actor, 'goods-receipts', invalid), /accepted|inspection|equal/i);
  const duplicate = receipt(other, 10); duplicate.items.push({ ...duplicate.items[0] });
  await assert.rejects(() => service.create(actor, 'goods-receipts', duplicate), /duplicate/i);
});
test('concurrent receipts cannot both consume the same remaining quantity', async () => {
  const { service } = await setup(); const order = await sentOrder(service);
  const results = await Promise.allSettled([service.create(actor, 'goods-receipts', receipt(order, 60)), service.create(actor, 'goods-receipts', receipt(order, 60))]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const current = await service.get(actor, 'orders', order._id); assert.equal(current.items[0].receivedQty, 60);
});
test('parallel document numbering is unique and drafts can be soft deleted', async () => {
  const { service } = await setup();
  const documents = await Promise.all(Array.from({ length: 40 }, () => service.create(actor, 'requests', payload())));
  assert.equal(new Set(documents.map(r => r.number)).size, 40);
  await service.remove(actor, documents[0]._id);
  await assert.rejects(() => service.get(actor, 'requests', documents[0]._id), e => e.statusCode === 404);
  const list = await service.list(actor, 'requests', { limit: 100 }); assert.equal(list.pagination.total, 39);
});
test('dashboard reports filters and vendor totals are based on persisted tenant records', async () => {
  const { service } = await setup(); await sentOrder(service);
  await service.create(actor, 'requests', payload());
  const dashboard = await service.dashboard(actor); assert.equal(dashboard.requests, 1); assert.equal(dashboard.orders, 1); assert.equal(dashboard.pendingDeliveries, 1);
  const reports = await service.reports(actor, {}); assert.equal(reports.vendorTotals[0].total, 1180); assert.ok(reports.integrationGaps.length);
  const filtered = await service.list(actor, 'orders', { status: 'draft' }); assert.equal(filtered.pagination.total, 0);
});
