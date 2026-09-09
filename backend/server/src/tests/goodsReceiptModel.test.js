import assert from "node:assert/strict";
import test from "node:test";


test(
  "Goods Receipt model defines GRN contract without automatic database setup",
  async () => {

    const module =
      await import(
        "../models/GoodsReceipt.js"
      );

    const GoodsReceipt =
      module.default;

    assert.ok(
      GoodsReceipt,
      "GoodsReceipt default export is required."
    );


    const schema =
      GoodsReceipt.schema;


    assert.ok(
      schema,
      "GoodsReceipt schema is required."
    );


    assert.equal(
      schema.options.autoCreate,
      false,
      "GoodsReceipt must not automatically create database collections."
    );


    assert.equal(
      schema.options.autoIndex,
      false,
      "GoodsReceipt must not automatically create indexes."
    );


    assert.equal(
      schema.options.versionKey,
      false,
      "GoodsReceipt must disable __v."
    );


    assert.equal(
      schema.options.timestamps,
      true,
      "GoodsReceipt must use timestamps."
    );
  }
);


test(
  "Goods Receipt model supports required GRN statuses",
  async () => {

    const {
      default:
        GoodsReceipt
    } =
      await import(
        "../models/GoodsReceipt.js"
      );


    const statusPath =
      GoodsReceipt
        .schema
        .path(
          "status"
        );


    assert.ok(
      statusPath,
      "GoodsReceipt.status field is required."
    );


    assert.deepEqual(
      statusPath.enumValues,
      [
        "received",
        "partial",
        "rejected",
        "completed"
      ]
    );
  }
);


test(
  "Goods Receipt model contains PO vendor warehouse and receipt references",
  async () => {

    const {
      default:
        GoodsReceipt
    } =
      await import(
        "../models/GoodsReceipt.js"
      );


    const schema =
      GoodsReceipt.schema;


    const requiredPaths = [
      "companyId",
      "grnNumber",
      "purchaseOrderId",
      "poNumber",
      "receiptDate",
      "vendorId",
      "vendorName",
      "warehouseId",
      "warehouseName",
      "deliveryChallanNumber",
      "receivedBy",
      "remarks",
      "status",
      "createdBy",
      "updatedBy"
    ];


    for (
      const pathName
      of requiredPaths
    ) {

      assert.ok(
        schema.path(
          pathName
        ),
        `GoodsReceipt.${pathName} is required.`
      );
    }
  }
);


test(
  "Goods Receipt item schema tracks ordered received accepted rejected and remaining quantities",
  async () => {

    const {
      default:
        GoodsReceipt
    } =
      await import(
        "../models/GoodsReceipt.js"
      );


    const itemsPath =
      GoodsReceipt
        .schema
        .path(
          "items"
        );


    assert.ok(
      itemsPath,
      "GoodsReceipt.items is required."
    );


    const itemSchema =
      itemsPath.schema;


    assert.ok(
      itemSchema,
      "GoodsReceipt item sub-schema is required."
    );


    const requiredItemPaths = [
      "purchaseOrderItemId",
      "itemId",
      "itemName",
      "unit",
      "orderedQuantity",
      "previouslyReceivedQuantity",
      "currentReceivedQuantity",
      "acceptedQuantity",
      "rejectedQuantity",
      "remainingQuantity",
      "rejectionReason"
    ];


    for (
      const pathName
      of requiredItemPaths
    ) {

      assert.ok(
        itemSchema.path(
          pathName
        ),
        `GoodsReceipt.items.${pathName} is required.`
      );
    }
  }
);


test(
  "Goods Receipt model does not expose client controlled payment fields",
  async () => {

    const {
      default:
        GoodsReceipt
    } =
      await import(
        "../models/GoodsReceipt.js"
      );


    const schema =
      GoodsReceipt.schema;


    const forbiddenPaths = [
      "paidAmount",
      "outstandingAmount",
      "paymentReference",
      "ledgerId",
      "journalEntryId"
    ];


    for (
      const pathName
      of forbiddenPaths
    ) {

      assert.equal(
        schema.path(
          pathName
        ),
        undefined,
        `GoodsReceipt must not define Purchase payment field ${pathName}.`
      );
    }
  }
);