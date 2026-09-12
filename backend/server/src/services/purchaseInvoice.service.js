import PurchaseOrder from "../models/PurchaseOrder.js";
import GoodsReceipt from "../models/GoodsReceipt.js";

import purchaseInvoiceRepository from "../repositories/purchaseInvoice.repository.js";

import voucherService from "./voucher.service.js";
import paymentAllocationService from "./paymentAllocation.service.js";
import departmentInvoiceService from "./departmentInvoice.service.js";

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


const purchaseInvoiceDocumentLabel = attachment => {

  if (
    attachment?.documentType ===
    "other"
  ) {

    return String(
      attachment?.otherDocumentType ||
      "Other Document"
    )
      .trim();

  }


  const labels = {

    vendor_invoice:
      "Vendor Invoice",

    e_way_bill:
      "E-Way Bill",

    delivery_challan:
      "Delivery Challan",

    supporting_document:
      "Supporting Document"

  };


  return (
    labels[
      attachment?.documentType
    ] ||
    "Invoice Document"
  );
};


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
     ADD PURCHASE INVOICE ATTACHMENT
  ========================================================== */

  async addAttachment(
    companyId,
    invoiceId,
    userId,
    attachment
  ) {

    const invoice =
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
        "handing_off" ||
      invoice.handoffStatus ===
        "handed_off" ||
      invoice.accountsVoucherId
    ) {

      throw new ApiError(
        409,
        "Purchase Invoice attachments cannot be modified after Accounts handoff has started."
      );
    }


    const attachments =
      Array.isArray(
        invoice.attachments
      )
        ? invoice.attachments
        : [];


    if (
      attachments.length >=
      5
    ) {

      throw new ApiError(
        409,
        "A maximum of 5 attachments is allowed for each Purchase Invoice."
      );
    }


    const attachmentData = {

      ...attachment,

      uploadedBy:
        attachment?.uploadedBy ||
        userId,

      uploadedAt:
        attachment?.uploadedAt ||
        new Date()

    };


    const updated =
      await purchaseInvoiceRepository
        .addAttachment(
          companyId,
          invoiceId,
          attachmentData,
          userId
        );


    if (
      updated
    ) {

      return updated;
    }


    const latest =
      await purchaseInvoiceRepository
        .findById(
          companyId,
          invoiceId
        );


    if (
      !latest
    ) {

      throw new ApiError(
        404,
        "Purchase Invoice not found."
      );
    }


    if (
      latest.handoffStatus ===
        "handing_off" ||
      latest.handoffStatus ===
        "handed_off" ||
      latest.accountsVoucherId
    ) {

      throw new ApiError(
        409,
        "Purchase Invoice attachments cannot be modified after Accounts handoff has started."
      );
    }


    if (
      (
        Array.isArray(
          latest.attachments
        )
          ? latest.attachments.length
          : 0
      ) >=
      5
    ) {

      throw new ApiError(
        409,
        "A maximum of 5 attachments is allowed for each Purchase Invoice."
      );
    }


    throw new ApiError(
      409,
      "Purchase Invoice attachment could not be added because the invoice changed. Please refresh and try again."
    );
  }


  /* ==========================================================
     REMOVE PURCHASE INVOICE ATTACHMENT
  ========================================================== */

  async removeAttachment(
    companyId,
    invoiceId,
    attachmentId,
    userId
  ) {

    const invoice =
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
        "handing_off" ||
      invoice.handoffStatus ===
        "handed_off" ||
      invoice.accountsVoucherId
    ) {

      throw new ApiError(
        409,
        "Purchase Invoice attachments cannot be modified after Accounts handoff has started."
      );
    }


    const attachment =
      (
        Array.isArray(
          invoice.attachments
        )
          ? invoice.attachments
          : []
      )
        .find(
          row =>
            id(
              row
            ) ===
            id(
              attachmentId
            )
        );


    if (
      !attachment
    ) {

      throw new ApiError(
        404,
        "Purchase Invoice attachment not found."
      );
    }


    const updated =
      await purchaseInvoiceRepository
        .removeAttachment(
          companyId,
          invoiceId,
          attachmentId,
          userId
        );


    if (
      updated
    ) {

      return {

        invoice:
          updated,

        attachment,

        removedAttachment:
          attachment

      };
    }


    const latest =
      await purchaseInvoiceRepository
        .findById(
          companyId,
          invoiceId
        );


    if (
      !latest
    ) {

      throw new ApiError(
        404,
        "Purchase Invoice not found."
      );
    }


    if (
      latest.handoffStatus ===
        "handing_off" ||
      latest.handoffStatus ===
        "handed_off" ||
      latest.accountsVoucherId
    ) {

      throw new ApiError(
        409,
        "Purchase Invoice attachments cannot be modified after Accounts handoff has started."
      );
    }


    const stillExists =
      (
        Array.isArray(
          latest.attachments
        )
          ? latest.attachments
          : []
      )
        .some(
          row =>
            id(
              row
            ) ===
            id(
              attachmentId
            )
        );


    if (
      !stillExists
    ) {

      throw new ApiError(
        404,
        "Purchase Invoice attachment not found."
      );
    }


    throw new ApiError(
      409,
      "Purchase Invoice attachment could not be removed because the invoice changed. Please refresh and try again."
    );
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

     Existing Purchase accounting flow is preserved:

       Purchase Invoice
          ->
       Purchase Payable Voucher
          ->
       Payment Voucher
          ->
       PaymentAllocation

     DepartmentInvoice is only the central Accounts register.
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


    /*
     * Existing handed-off records may pre-date the new central
     * DepartmentInvoice register.
     *
     * Do not return immediately. First ensure the central
     * register exists idempotently.
     */

    if (
      invoice.handoffStatus ===
        "handed_off" &&
      invoice.accountsVoucherId
    ) {

      await this.registerWithAccounts(
        companyId,
        invoice,
        userId
      );


      return this.getById(
        companyId,
        invoiceId
      );
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


    let voucher;


    try {

      voucher =
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


      const completed =
        await purchaseInvoiceRepository
          .completeHandoff(
            companyId,
            invoiceId,
            userId,
            voucher
          );


      if (
        !completed
      ) {

        throw new ApiError(
          409,
          "Purchase Invoice handoff state changed. Please refresh and try again."
        );
      }


      invoice =
        completed;

    }
    catch (
      error
    ) {

      /*
       * Only failures belonging to the existing Purchase
       * voucher/handoff phase are marked as Purchase handoff
       * failures.
       *
       * Central DepartmentInvoice registration happens below
       * after Purchase handoff is already complete.
       */

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


    /*
     * The Purchase payable voucher is now successfully linked.
     *
     * Register the invoice in the central Accounts inbox.
     * This operation is idempotent by:
     *
     * companyId + sourceModule + sourceRecordId
     *
     * If this operation fails, DO NOT roll Purchase back to
     * "failed" because the accounting voucher already exists.
     * A retry of handoff() will enter the handed_off branch
     * above and safely retry only this registration.
     */

    await this.registerWithAccounts(
      companyId,
      invoice,
      userId
    );


    return this.getById(
      companyId,
      invoiceId
    );
  }


  /* ==========================================================
     REGISTER PURCHASE INVOICE IN CENTRAL ACCOUNTS INBOX

     No binary data is copied.

     DepartmentInvoice receives references to the same physical
     Purchase Invoice attachments already stored by Purchase.
  ========================================================== */

  async registerWithAccounts(
    companyId,
    invoice,
    userId
  ) {

    const documents =
      (
        Array.isArray(
          invoice.attachments
        )
          ? invoice.attachments
          : []
      )
        .filter(
          attachment =>
            attachment?.fileUrl
        )
        .map(
          attachment => ({

            label:
              purchaseInvoiceDocumentLabel(
                attachment
              ),

            fileName:
              String(
                attachment.originalName ||
                attachment.fileName ||
                ""
              )
                .trim(),

            fileUrl:
              String(
                attachment.fileUrl ||
                ""
              )
                .trim(),

            filePath:
              "",

            mimeType:
              String(
                attachment.mimeType ||
                ""
              )
                .trim()

          })
        );


    const centralInvoice =
      await departmentInvoiceService
        .handoff({

          companyId,

          sourceDepartment:
            "purchase",

          sourceModule:
            "purchase_invoice",

          sourceRecordId:
            invoice._id,

          invoiceNumber:
            invoice.vendorInvoiceNumber,

          partyName:
            invoice.vendorName,

          invoiceDate:
            invoice.invoiceDate,

          totalAmount:
            invoice.invoiceTotal,

          documents,

          sentToAccountsBy:
            userId,

          sentToAccountsByEmployeeId:
            null,

          sentToAccountsByName:
            ""

        });


    /*
     * DepartmentInvoice.handoff() creates/reuses the central
     * record. syncSource is used here so Purchase immediately
     * receives accountsHandoffId and the central status
     * snapshot.
     */

    await departmentInvoiceService
      .syncSource(
        centralInvoice
      );


    return centralInvoice;
  }

}


export default new PurchaseInvoiceService();