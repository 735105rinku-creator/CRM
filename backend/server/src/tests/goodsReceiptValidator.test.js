import assert from "node:assert/strict";
import test from "node:test";


test(
  "Goods Receipt create validator accepts valid GRN input",
  async () => {

    const module =
      await import(
        "../validators/goodsReceipt.validator.js"
      );


    const {
      createGoodsReceiptSchema
    } =
      module;


    const payload = {

      purchaseOrderId:
        "64b64c7f2f9d8b0012a4f111",

      receiptDate:
        "2026-09-08",

      warehouseId:
        "64b64c7f2f9d8b0012a4f222",

      deliveryChallanNumber:
        "DC-1001",

      items: [
        {
          purchaseOrderItemId:
            "64b64c7f2f9d8b0012a4f333",

          currentReceivedQuantity:
            5,

          acceptedQuantity:
            5,

          rejectedQuantity:
            0,

          rejectionReason:
            ""
        }
      ],

      remarks:
        "Material received in good condition."
    };


    const {
      error,
      value
    } =
      createGoodsReceiptSchema
        .validate(
          payload,
          {
            abortEarly:
              false,

            stripUnknown:
              true,

            convert:
              true
          }
        );


    assert.equal(
      error,
      undefined
    );


    assert.equal(
      value.purchaseOrderId,
      payload.purchaseOrderId
    );


    assert.equal(
      value.items.length,
      1
    );
  }
);


test(
  "Goods Receipt validator rejects rejected quantity without rejection reason",
  async () => {

    const {
      createGoodsReceiptSchema
    } =
      await import(
        "../validators/goodsReceipt.validator.js"
      );


    const {
      error
    } =
      createGoodsReceiptSchema
        .validate(
          {
            purchaseOrderId:
              "64b64c7f2f9d8b0012a4f111",

            receiptDate:
              "2026-09-08",

            warehouseId:
              "64b64c7f2f9d8b0012a4f222",

            items: [
              {
                purchaseOrderItemId:
                  "64b64c7f2f9d8b0012a4f333",

                currentReceivedQuantity:
                  5,

                acceptedQuantity:
                  4,

                rejectedQuantity:
                  1,

                rejectionReason:
                  ""
              }
            ]
          },
          {
            abortEarly:
              false
          }
        );


    assert.ok(
      error,
      "Validation should fail when rejected quantity has no reason."
    );
  }
);


test(
  "Goods Receipt validator rejects accepted plus rejected quantity mismatch",
  async () => {

    const {
      createGoodsReceiptSchema
    } =
      await import(
        "../validators/goodsReceipt.validator.js"
      );


    const {
      error
    } =
      createGoodsReceiptSchema
        .validate(
          {
            purchaseOrderId:
              "64b64c7f2f9d8b0012a4f111",

            receiptDate:
              "2026-09-08",

            warehouseId:
              "64b64c7f2f9d8b0012a4f222",

            items: [
              {
                purchaseOrderItemId:
                  "64b64c7f2f9d8b0012a4f333",

                currentReceivedQuantity:
                  5,

                acceptedQuantity:
                  3,

                rejectedQuantity:
                  1
              }
            ]
          },
          {
            abortEarly:
              false
          }
        );


    assert.ok(
      error,
      "Accepted + rejected must equal current received quantity."
    );
  }
);


test(
  "Goods Receipt validator forbids backend controlled quantity snapshots",
  async () => {

    const {
      createGoodsReceiptSchema
    } =
      await import(
        "../validators/goodsReceipt.validator.js"
      );


    const {
      error
    } =
      createGoodsReceiptSchema
        .validate(
          {
            purchaseOrderId:
              "64b64c7f2f9d8b0012a4f111",

            warehouseId:
              "64b64c7f2f9d8b0012a4f222",

            items: [
              {
                purchaseOrderItemId:
                  "64b64c7f2f9d8b0012a4f333",

                currentReceivedQuantity:
                  5,

                acceptedQuantity:
                  5,

                rejectedQuantity:
                  0,

                orderedQuantity:
                  10,

                previouslyReceivedQuantity:
                  3,

                remainingQuantity:
                  2
              }
            ]
          },
          {
            abortEarly:
              false
          }
        );


    assert.ok(
      error,
      "Backend controlled quantity snapshot fields must be forbidden."
    );
  }
);


test(
  "Goods Receipt validator forbids payment and accounting fields",
  async () => {

    const {
      createGoodsReceiptSchema
    } =
      await import(
        "../validators/goodsReceipt.validator.js"
      );


    const {
      error
    } =
      createGoodsReceiptSchema
        .validate(
          {
            purchaseOrderId:
              "64b64c7f2f9d8b0012a4f111",

            warehouseId:
              "64b64c7f2f9d8b0012a4f222",

            paidAmount:
              5000,

            paymentReference:
              "PAY-01",

            items: [
              {
                purchaseOrderItemId:
                  "64b64c7f2f9d8b0012a4f333",

                currentReceivedQuantity:
                  5,

                acceptedQuantity:
                  5,

                rejectedQuantity:
                  0
              }
            ]
          },
          {
            abortEarly:
              false
          }
        );


    assert.ok(
      error,
      "Purchase GRN must not accept payment/accounting fields."
    );
  }
);