import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import {
  describe,
  test,
} from "node:test";


const readSource = (relativePath) =>
  readFile(
    new URL(
      `../app/features/logistics/${relativePath}`,
      import.meta.url
    ),
    "utf8"
  );


describe("Urgent Logistics frontend requirements", () => {
  test("Air Cargo form captures shipment date and selectable shipment currency", async () => {
    const ts = await readSource(
      "shipments/air-cargo/air-cargo-new/air-cargo-new.component.ts"
    );
    const html = await readSource(
      "shipments/air-cargo/air-cargo-new/air-cargo-new.component.html"
    );

    assert.match(ts, /\bshipmentDate\b/);
    assert.match(ts, /currencyOptions/);
    assert.match(ts, /selectedCurrency\(\)/);
    assert.match(html, /Shipment Date/);
    assert.match(html, /form\.shipmentDate/);
    assert.match(html, /form\.currency/);
  });

  test("Sea Freight form captures shipment date, CHA, and selectable currency", async () => {
    const ts = await readSource("shipments/sea-freight/sea-freight.component.ts");
    const html = await readSource("shipments/sea-freight/sea-freight.component.html");

    assert.match(ts, /\bshipmentDate\b/);
    assert.match(ts, /chaRows/);
    assert.match(ts, /chaRequired/);
    assert.match(ts, /currencyOptions/);
    assert.match(ts, /selectedCurrency\(\)/);
    assert.match(html, /Shipment Date/);
    assert.match(html, /CHA Required/);
    assert.match(html, /form\.currency/);
  });

  test("Air Cargo list preserves duplicate currency and shows delivered receipt action", async () => {
    const ts = await readSource(
      "shipments/air-cargo/air-cargo-list/air-cargo-list.component.ts"
    );
    const html = await readSource(
      "shipments/air-cargo/air-cargo-list/air-cargo-list.component.html"
    );

    assert.match(ts, /raw\.charges\?\s*\.currency\s*\|\|\s*'INR'/);
    assert.match(ts, /uploadDeliveryReceipt/);
    assert.match(html, /Upload Delivery Receipt/);
    assert.match(html, /Receipt Uploaded/);
  });

  test("invoice form uploads invoice copy after invoice exists and uses shipment currency", async () => {
    const ts = await readSource(
      "invoices/invoice-new/logistics-invoice-new.component.ts"
    );
    const html = await readSource(
      "invoices/invoice-new/logistics-invoice-new.component.html"
    );

    assert.match(ts, /selectedInvoiceCopy/);
    assert.match(ts, /uploadInvoiceCopy/);
    assert.match(ts, /shipment\.charges\?\s*\.currency/);
    assert.match(html, /Upload Invoice Copy/);
    assert.match(html, /View uploaded attachment|View Invoice Copy/);
  });
});
