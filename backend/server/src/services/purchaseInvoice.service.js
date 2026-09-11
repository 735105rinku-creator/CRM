import PurchaseOrder from "../models/PurchaseOrder.js";
import GoodsReceipt from "../models/GoodsReceipt.js";

import purchaseInvoiceRepository from "../repositories/purchaseInvoice.repository.js";

import voucherService from "./voucher.service.js";
import paymentAllocationService from "./paymentAllocation.service.js";

import { ApiError } from "../utils/apiError.js";


/* ============================================================
   HELPERS
============================================================ */

const roundMoney = value =>
  Math.round(
    (
      Number(
        value || 0
      ) +
      Number.EPSILON
    ) *
    100
  ) /
  100;


const id = value =>
  String(
    value?._id ||
    value ||
    ""
  );


/* ============================================================
   SERVICE
============================================================ */

class PurchaseInvoiceService {


  /* ==========================================================
     REFERENCES
  ========================================================== */

  async references(
    companyId
  ) {

    const purchaseOrders =
      await PurchaseOrder
        .find({
          companyId,

          status: {
            $in: [
              "partially_received",
              "received"
            ]
          }
        })
        .select(
          [
            "poNumber",
            "vendorId",
            "vendorName",
            "vendorCode",
            "items",
            "grandTotal",
            "freightCharges",
            "otherCharges",
            "status"
          ]
            .join(
              " "
            )
        )
        .sort({
          poDate:
            -1
        })
        .lean();


    return {
      purchaseOrders
    };
  }


  /* ==========================================================
     ELIGIBLE GRNs
  ========================================================== */

  async receipts(
    companyId,
    purchaseOrderId
  ) {

    const purchaseOrder =
      await PurchaseOrder
        .findOne({
          _id:
            purchaseOrderId,

          companyId
        })
        .select(
          "_id"
        )
        .lean();


    if (
      !purchaseOrder
    ) {

      throw new ApiError(
        404,
        "Purchase Order not found."
      );
    }


    return GoodsReceipt
      .find({
        companyId,

        purchaseOrderId,

        status: {
          $in: [
            "received",
            "partial",
            "completed"
          ]
        }
      })
      .select(
        "grnNumber receiptDate items status"
      )
      .sort({
        receiptDate:
          1
      })
      .lean();
  }


  /* ==========================================================
     RESOLVE PURCHASE ORDER
  ========================================================== */

  async resolvePurchaseOrder(
    companyId,
    purchaseOrderId
  ) {

    const purchaseOrder =
      await PurchaseOrder
        .findOne({
          _id:
            purchaseOrderId,

          companyId
        })
        .lean();


    if (
      !purchaseOrder
    ) {

      throw new ApiError(
        404,
        "Purchase Order not found."
      );
    }


    if (
      ![
        "partially_received",
        "received"
      ]
        .includes(
          purchaseOrder.status
        )
    ) {

      throw new ApiError(
        409,
        "Vendor Invoice requires a Purchase Order with received goods."
      );
    }


    return purchaseOrder;
  }


  /* ==========================================================
     RESOLVE SELECTED GRNs
  ========================================================== */

  async resolveGoodsReceipts(
    companyId,
    purchaseOrder,
    goodsReceiptIds
  ) {

    const requestedIds =
      Array.from(
        new Set(
          (
            goodsReceiptIds ||
            []
          )
            .map(
              value =>
                id(
                  value
                )
            )
            .filter(
              Boolean
            )
        )
      );


    if (
      !requestedIds.length
    ) {

      throw new ApiError(
        400,
        "At least one Goods Receipt is required."
      );
    }


    const receipts =
      await GoodsReceipt
        .find({

          _id: {
            $in:
              requestedIds
          },

          companyId,

          purchaseOrderId:
            purchaseOrder._id,

          vendorId:
            purchaseOrder.vendorId,

          status: {
            $in: [
              "received",
              "partial",
              "completed"
            ]
          }

        })
        .lean();


    if (
      receipts.length !==
      requestedIds.length
    ) {

      throw new ApiError(
        400,
        "One or more selected GRNs are not eligible for this Purchase Order and vendor."
      );
    }


    return receipts;
  }


  /* ==========================================================
     BUILD MATCH RESULT

     Complete PO + GRN + Invoice 3-way matching is performed
     here so create and update use exactly the same rules.
  ========================================================== */

  buildMatchResult(
    purchaseOrder,
    receipts,
    payload
  ) {

    const receivedByItem =
      new Map();


    for (
      const receipt of
      receipts
    ) {

      for (
        const item of
        receipt.items ||
        []
      ) {

        const key =
          id(
            item.purchaseOrderItemId
          );


        receivedByItem.set(
          key,
          roundMoney(
            (
              receivedByItem.get(
                key
              ) ||
              0
            ) +
            Number(
              item.acceptedQuantity ||
              0
            )
          )
        );

      }

    }


    const poItems =
      new Map(
        (
          purchaseOrder.items ||
          []
        )
          .map(
            item => [
              id(
                item._id
              ),
              item
            ]
          )
      );


    const invoiceItems =
      [];


    const mismatchReasons =
      [];


    for (
      const input of
      payload.items ||
      []
    ) {

      const poItem =
        poItems.get(
          id(
            input.purchaseOrderItemId
          )
        );


      if (
        !poItem
      ) {

        throw new ApiError(
          400,
          "Invoice contains an item that is not present on the Purchase Order."
        );
      }


      const quantity =
        Number(
          input.invoicedQuantity
        );


      const unitPrice =
        roundMoney(
          input.unitPrice
        );


      const taxPercent =
        Number(
          input.taxPercent ||
          0
        );


      const taxableAmount =
        roundMoney(
          quantity *
          unitPrice
        );


      const taxAmount =
        roundMoney(
          taxableAmount *
          taxPercent /
          100
        );


      const lineTotal =
        roundMoney(
          taxableAmount +
          taxAmount
        );


      const receivedQuantity =
        Number(
          receivedByItem.get(
            id(
              poItem._id
            )
          ) ||
          0
        );


      const reasons =
        [];


      if (
        quantity >
        Number(
          poItem.orderedQuantity ||
          0
        )
      ) {

        reasons.push(
          "Invoiced quantity exceeds PO quantity."
        );
      }


      if (
        quantity >
        receivedQuantity
      ) {

        reasons.push(
          "Invoiced quantity exceeds accepted GRN quantity."
        );
      }


      if (
        unitPrice !==
        roundMoney(
          poItem.unitPrice
        )
      ) {

        reasons.push(
          "Invoice unit price differs from PO unit price."
        );
      }


      if (
        taxPercent !==
        Number(
          poItem.taxPercent ||
          0
        )
      ) {

        reasons.push(
          "Invoice tax rate differs from PO tax rate."
        );
      }


      if (
        !receivedQuantity
      ) {

        reasons.push(
          "No accepted GRN quantity is available for this item."
        );
      }


      mismatchReasons.push(
        ...reasons.map(
          reason =>
            `${poItem.itemName}: ${reason}`
        )
      );


      invoiceItems.push({

        purchaseOrderItemId:
          poItem._id,

        itemName:
          poItem.itemName,

        unit:
          poItem.unit,

        invoicedQuantity:
          quantity,

        unitPrice,

        taxableAmount,

        taxPercent,

        taxAmount,

        lineTotal,

        poQuantity:
          Number(
            poItem.orderedQuantity ||
            0
          ),

        receivedQuantity,

        poUnitPrice:
          roundMoney(
            poItem.unitPrice
          ),

        matchStatus:
          reasons.length
            ? "exception"
            : "matched",

        mismatchReasons:
          reasons

      });

    }


    const taxableAmount =
      roundMoney(
        invoiceItems.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.taxableAmount,
          0
        )
      );


    const taxTotal =
      roundMoney(
        invoiceItems.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.taxAmount,
          0
        )
      );


    const freightCharges =
      roundMoney(
        payload.freightCharges
      );


    const otherCharges =
      roundMoney(
        payload.otherCharges
      );


    const invoiceTotal =
      roundMoney(
        taxableAmount +
        taxTotal +
        freightCharges +
        otherCharges
      );


    const declaredInvoiceTotal =
      roundMoney(
        payload.declaredInvoiceTotal
      );


    if (
      declaredInvoiceTotal !==
      invoiceTotal
    ) {

      mismatchReasons.push(
        "Declared invoice total differs from the calculated invoice total."
      );
    }


    const matchStatus =
      mismatchReasons.length
        ? "exception"
        : "matched";


    return {

      invoiceItems,

      taxableAmount,

      taxTotal,

      freightCharges,

      otherCharges,

      invoiceTotal,

      declaredInvoiceTotal,

      matchStatus,

      mismatchReasons

    };
  }


  /* ==========================================================
     BUILD INVOICE DATA
  ========================================================== */

  buildInvoiceData(
    purchaseOrder,
    receipts,
    payload,
    userId
  ) {

    const match =
      this.buildMatchResult(
        purchaseOrder,
        receipts,
        payload
      );


    return {

      vendorId:
        purchaseOrder.vendorId,

      vendorName:
        purchaseOrder.vendorName,

      vendorCode:
        purchaseOrder.vendorCode,

      purchaseRequestId:
        purchaseOrder.purchaseRequestId,

      vendorEnquiryId:
        purchaseOrder.vendorEnquiryId,

      quotationId:
        purchaseOrder.quotationId,

      purchaseOrderId:
        purchaseOrder._id,

      poNumber:
        purchaseOrder.poNumber,

      goodsReceiptIds:
        receipts.map(
          row =>
            row._id
        ),

      grnNumbers:
        receipts.map(
          row =>
            row.grnNumber
        ),

      vendorInvoiceNumber:
        String(
          payload.vendorInvoiceNumber
        )
          .trim()
          .toUpperCase(),

      invoiceDate:
        payload.invoiceDate,

      receivedDate:
        payload.receivedDate,

      items:
        match.invoiceItems,

      taxableAmount:
        match.taxableAmount,

      taxTotal:
        match.taxTotal,

      freightCharges:
        match.freightCharges,

      otherCharges:
        match.otherCharges,

      invoiceTotal:
        match.invoiceTotal,

      declaredInvoiceTotal:
        match.declaredInvoiceTotal,

      remarks:
        payload.remarks,

      status:
        match.matchStatus,

      matchStatus:
        match.matchStatus,

      mismatchReasons:
        match.mismatchReasons,

      updatedBy:
        userId

    };
  }


  /* ==========================================================
     CREATE
  ========================================================== */

  async create(
    companyId,
    userId,
    payload
  ) {

    const purchaseOrder =
      await this.resolvePurchaseOrder(
        companyId,
        payload.purchaseOrderId
      );


    const vendorInvoiceNumber =
      String(
        payload.vendorInvoiceNumber
      )
        .trim()
        .toUpperCase();


    const duplicate =
      await purchaseInvoiceRepository
        .findDuplicate(
          companyId,
          purchaseOrder.vendorId,
          vendorInvoiceNumber
        );


    if (
      duplicate
    ) {

      throw new ApiError(
        409,
        "This vendor invoice number already exists for the selected vendor."
      );
    }


    const receipts =
      await this.resolveGoodsReceipts(
        companyId,
        purchaseOrder,
        payload.goodsReceiptIds
      );


    const invoiceData =
      this.buildInvoiceData(
        purchaseOrder,
        receipts,
        payload,
        userId
      );


    return purchaseInvoiceRepository
      .create({

        companyId,

        ...invoiceData,

        createdBy:
          userId

      });
  }


  /* ==========================================================
     UPDATE / CORRECT INVOICE

     Rules:
     - Existing invoice must belong to current company.
     - Verified invoice cannot be edited.
     - Handed-off invoice cannot be edited.
     - Invoice is re-matched completely after correction.
     - Same invoice number is allowed for the current record.
     - Duplicate vendor invoice number remains blocked.
  ========================================================== */

  async update(
    companyId,
    invoiceId,
    userId,
    payload
  ) {

    const existingInvoice =
      await purchaseInvoiceRepository
        .findById(
          companyId,
          invoiceId
        );


    if (
      !existingInvoice
    ) {

      throw new ApiError(
        404,
        "Purchase Invoice not found."
      );
    }


    if (
      existingInvoice.status ===
      "verified" ||
      existingInvoice.verifiedAt
    ) {

      throw new ApiError(
        409,
        "Verified Purchase Invoice cannot be edited."
      );
    }


    if (
      existingInvoice.handoffStatus ===
        "handed_off" ||
      existingInvoice.handoffStatus ===
        "handing_off" ||
      existingInvoice.accountsVoucherId
    ) {

      throw new ApiError(
        409,
        "Purchase Invoice cannot be edited after Accounts handoff has started."
      );
    }


    if (
      ![
        "matched",
        "exception"
      ]
        .includes(
          existingInvoice.status
        )
    ) {

      throw new ApiError(
        409,
        "Only matched or exception Purchase Invoices can be edited."
      );
    }


    const purchaseOrder =
      await this.resolvePurchaseOrder(
        companyId,
        payload.purchaseOrderId
      );


    const vendorInvoiceNumber =
      String(
        payload.vendorInvoiceNumber
      )
        .trim()
        .toUpperCase();


    const duplicate =
      await purchaseInvoiceRepository
        .findDuplicate(
          companyId,
          purchaseOrder.vendorId,
          vendorInvoiceNumber,
          invoiceId
        );


    if (
      duplicate
    ) {

      throw new ApiError(
        409,
        "This vendor invoice number already exists for the selected vendor."
      );
    }


    const receipts =
      await this.resolveGoodsReceipts(
        companyId,
        purchaseOrder,
        payload.goodsReceiptIds
      );


    const invoiceData =
      this.buildInvoiceData(
        purchaseOrder,
        receipts,
        payload,
        userId
      );


    const updated =
      await purchaseInvoiceRepository
        .updateEditableById(
          companyId,
          invoiceId,
          invoiceData
        );


    if (
      !updated
    ) {

      throw new ApiError(
        409,
        "Purchase Invoice is no longer editable. Please refresh and try again."
      );
    }


    return updated;
  }


  /* ==========================================================
     LIST
  ========================================================== */

  async list(
    companyId,
    query
  ) {

    const result =
      await purchaseInvoiceRepository
        .list(
          companyId,
          query
        );


    const settlements =
      await paymentAllocationService
        .settlementForInvoices(
          companyId,
          result.rows
        );


    result.rows =
      result.rows.map(
        row => ({
          ...row,

          ...settlements.get(
            String(
              row._id
            )
          )
        })
      );


    return result;
  }


  /* ==========================================================
     GET BY ID
  ========================================================== */

  async getById(
    companyId,
    invoiceId
  ) {

    const row =
      await purchaseInvoiceRepository
        .findById(
          companyId,
          invoiceId
        );


    if (
      !row
    ) {

      return null;
    }


    const settlements =
      await paymentAllocationService
        .settlementForInvoices(
          companyId,
          [
            row
          ]
        );


    return {

      ...row,

      ...settlements.get(
        String(
          row._id
        )
      )

    };
  }


  /* ==========================================================
     METRICS
  ========================================================== */

  async metrics(
    companyId
  ) {

    const [
      base,
      invoices
    ] =
      await Promise.all([

        purchaseInvoiceRepository
          .metrics(
            companyId
          ),

        purchaseInvoiceRepository
          .settlementRows(
            companyId
          )

      ]);


    const settlements =
      await paymentAllocationService
        .settlementForInvoices(
          companyId,
          invoices
        );


    const values =
      [
        ...settlements.values()
      ];


    return {

      ...base,

      paidAmount:
        roundMoney(
          values.reduce(
            (
              sum,
              row
            ) =>
              sum +
              row.paidAmount,
            0
          )
        ),

      outstandingAmount:
        roundMoney(
          values.reduce(
            (
              sum,
              row
            ) =>
              sum +
              row.outstandingAmount,
            0
          )
        ),

      unpaid:
        values.filter(
          row =>
            row.paymentStatus ===
            "unpaid"
        )
          .length,

      partiallyPaid:
        values.filter(
          row =>
            row.paymentStatus ===
            "partially_paid"
        )
          .length,

      paid:
        values.filter(
          row =>
            row.paymentStatus ===
            "paid"
        )
          .length

    };
  }


  /* ==========================================================
     VERIFY
  ========================================================== */

  async verify(
    companyId,
    invoiceId,
    userId
  ) {

    const verified =
      await purchaseInvoiceRepository
        .verify(
          companyId,
          invoiceId,
          userId
        );


    if (
      !verified
    ) {

      throw new ApiError(
        409,
        "Only a matched, unverified invoice can be verified."
      );
    }


    return verified;
  }


  /* ==========================================================
     HANDOFF TO ACCOUNTS
  ========================================================== */

  async handoff(
    companyId,
    invoiceId,
    userId
  ) {

    let invoice =
      await purchaseInvoiceRepository
        .findById(
          companyId,
          invoiceId
        );


    if (
      !invoice
    ) {

      throw new ApiError(
        404,
        "Purchase Invoice not found."
      );
    }


    if (
      invoice.handoffStatus ===
        "handed_off" &&
      invoice.accountsVoucherId
    ) {

      return invoice;
    }


    if (
      invoice.status !==
      "verified"
    ) {

      throw new ApiError(
        409,
        "Only a verified invoice can be handed to Accounts."
      );
    }


    if (
      invoice.handoffStatus !==
      "handing_off"
    ) {

      invoice =
        await purchaseInvoiceRepository
          .claimHandoff(
            companyId,
            invoiceId,
            userId
          );


      if (
        !invoice
      ) {

        throw new ApiError(
          409,
          "Invoice handoff is already being processed."
        );
      }

    }


    try {

      const voucher =
        await voucherService
          .createPurchasePayableFromSource({

            companyId,

            userId,

            sourceReferenceId:
              invoice._id,

            vendorName:
              invoice.vendorName,

            invoiceNumber:
              invoice.vendorInvoiceNumber,

            invoiceDate:
              invoice.invoiceDate,

            amount:
              invoice.invoiceTotal

          });


      return purchaseInvoiceRepository
        .completeHandoff(
          companyId,
          invoiceId,
          userId,
          voucher
        );

    } catch (
      error
    ) {

      await purchaseInvoiceRepository
        .failHandoff(
          companyId,
          invoiceId,
          error?.message ||
            "Accounts handoff failed.",
          userId
        );


      throw error;

    }
  }

}


export default new PurchaseInvoiceService();