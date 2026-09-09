import test from 'node:test';
import assert from 'node:assert/strict';

test('commercial totals ignore client totals and round each monetary line', async () => {
  const { calculateTotals } = await import('../services/purchaseWorkflow.rules.js');
  const result = calculateTotals({items:[{itemName:'Steel',unit:'kg',quantity:3,unitPrice:12.35,taxPercent:18,lineTotal:1}],freightCharges:10,otherCharges:2,grandTotal:1});
  assert.equal(result.subtotal,37.05);
  assert.equal(result.taxTotal,6.67);
  assert.equal(result.grandTotal,55.72);
  assert.throws(()=>calculateTotals({items:[{itemName:'X',unit:'kg',quantity:-1,unitPrice:1}]}),/quantity/i);
});
test('receipts aggregate accepted quantities and reject overreceipt or duplicate lines', async () => {
  const { receiveItems } = await import('../services/purchaseWorkflow.rules.js');
  const po = {items:[{_id:'a',itemName:'Steel',unit:'kg',orderedQuantity:10,receivedQuantity:4}]};
  const row={purchaseOrderItemId:'a',currentReceivedQuantity:5,acceptedQuantity:4,rejectedQuantity:1};
  const partial=receiveItems(po,[row]);
  assert.equal(partial.items[0].remainingQuantity,2);
  assert.equal(partial.orderItems[0].receivedQuantity,8);
  assert.equal(partial.orderStatus,'partially_received');
  assert.throws(()=>receiveItems(po,[{...row,currentReceivedQuantity:7,acceptedQuantity:6}]),/remaining/i);
  assert.throws(()=>receiveItems(po,[row,row]),/duplicate/i);
  assert.throws(()=>receiveItems(po,[{...row,acceptedQuantity:1}]),/equal/i);
  assert.equal(receiveItems(po,[{...row,currentReceivedQuantity:6,acceptedQuantity:6,rejectedQuantity:0}]).orderStatus,'received');
});
test('approval decisions require explicit senior capability and valid transitions', async () => {
  const { assertTransition } = await import('../services/purchaseWorkflow.rules.js');
  assert.throws(()=>assertTransition('quotation','received','selected',false),/senior/i);
  assert.doesNotThrow(()=>assertTransition('quotation','received','selected',true));
  assert.throws(()=>assertTransition('order','draft','received',true),/transition/i);
  assert.throws(()=>assertTransition('order','draft','approved',false),/senior/i);
});
