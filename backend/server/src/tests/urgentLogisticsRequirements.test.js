import assert from "node:assert/strict";

import {
  describe,
  test,
} from "node:test";


describe("Urgent Logistics backend requirements", () => {
  test("shipment validator accepts shipmentDate and foreign currency", async () => {
    const { createLogisticsShipmentSchema } = await import(
      "../validators/logisticsShipment.validator.js"
    );

    const payload = {
      shipmentMode: "air_cargo",
      customerName: "Acme Exports",
      shipmentDate: "2026-09-03",
      charges: {
        freightAmount: 1000,
        currency: "USD",
      },
      remarks: "Urgent logistics regression",
    };

    const { error, value } = createLogisticsShipmentSchema.validate(payload);

    assert.equal(error, undefined);
    assert.equal(value.shipmentDate instanceof Date, true);
    assert.equal(value.charges.currency, "USD");
  });

  test("shipment validator keeps old records compatible without shipmentDate", async () => {
    const { updateLogisticsShipmentSchema } = await import(
      "../validators/logisticsShipment.validator.js"
    );

    const { error } = updateLogisticsShipmentSchema.validate({
      remarks: "Legacy shipment update",
      charges: {
        currency: "AED",
      },
    });

    assert.equal(error, undefined);
  });

  test("logistics document validator supports delivered receipt document type", async () => {
    const { createLogisticsDocumentSchema } = await import(
      "../validators/logisticsDocument.validator.js"
    );

    const { error, value } = createLogisticsDocumentSchema.validate({
      shipmentNo: "SHP-001",
      customer: "Acme Exports",
      documentType: "delivery-receipt",
      remarks: "Delivered shipment POD",
    });

    assert.equal(error, undefined);
    assert.equal(value.documentType, "delivery-receipt");
  });

  test("invoice model exposes invoice copy attachment metadata", async () => {
    const { default: LogisticsInvoice } = await import(
      "../models/LogisticsInvoice.js"
    );

    const invoiceCopy = LogisticsInvoice.schema.path("invoiceCopy").schema;

    assert.ok(invoiceCopy.path("fileName"));
    assert.ok(invoiceCopy.path("originalName"));
    assert.ok(invoiceCopy.path("mimeType"));
    assert.ok(invoiceCopy.path("fileSize"));
    assert.ok(invoiceCopy.path("fileUrl"));
    assert.ok(invoiceCopy.path("uploadedAt"));
    assert.ok(invoiceCopy.path("uploadedBy"));
  });
});
