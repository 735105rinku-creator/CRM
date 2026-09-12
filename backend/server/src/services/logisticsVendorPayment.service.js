import mongoose from "mongoose";

import LogisticsVendor
  from "../models/LogisticsVendor.js";

import LogisticsShipment
  from "../models/LogisticsShipment.js";

import logisticsVendorPaymentRepository
  from "../repositories/logisticsVendorPayment.repository.js";

import departmentInvoiceService
  from "./departmentInvoice.service.js";

import { ApiError }
  from "../utils/apiError.js";


class LogisticsVendorPaymentService {

  /* ============================================================
     READ ACCESS POLICY

     Normal Logistics employee:
     - own workspace only

     Logistics Department Head / Team Leader:
     - all Logistics Vendor Payments for review
     - does NOT automatically receive edit/payment/delete rights

     Management monitoring:
     - all Logistics Vendor Payments
     - handoff authority remains controlled separately by
       canHandoffToAccounts

     Unknown/non-management access:
     - owner scoped by default
  ============================================================ */

  restrictReadToOwner({
    accessType = "",
    canHandoffToAccounts = false,
  }) {

    const normalizedAccessType =
      String(
        accessType ||
        ""
      )
        .trim()
        .toLowerCase();


    if (
      normalizedAccessType ===
      "management"
    ) {

      return false;
    }


    if (
      canHandoffToAccounts ===
      true
    ) {

      return false;
    }


    return true;
  }


  /* ============================================================
     CREATE VENDOR PAYMENT
  ============================================================ */

  async createPaymentRecord({
    companyId,
    userId = null,
    employeeId = null,
    payload,
    paymentProof = undefined,
  }) {

    this.assertCompanyId(
      companyId
    );


    const vendor =
      await this.resolveVendor({
        companyId,

        vendorId:
          payload.vendorId,
      });


    const shipment =
      await this.resolveShipment({
        companyId,

        shipmentId:
          payload.shipmentId,

        shipmentNumber:
          payload.shipmentNumber,
      });


    const paymentCode =
      await this.generatePaymentCode({
        companyId,
      });


    const serialNumber =
      await logisticsVendorPaymentRepository
        .nextSerialNumber(
          companyId
        );


    const amounts =
      calculateAmounts({

        totalAmount:
          payload.totalAmount,

        previousAdvance:
          payload.previousAdvance,

        paidAmount:
          payload.paidAmount,

        deduction:
          payload.deduction,
      });


    const status =
      deriveStatus({

        requestedStatus:
          payload.status,

        ...amounts,
      });


    const paymentHistory =
      [];


    if (
      Number(
        payload.paidAmount ||
        0
      ) >
      0
    ) {

      paymentHistory
        .push({

          amount:
            Number(
              payload.paidAmount
            ),

          paymentDate:
            new Date(),

          paymentMode:
            "bank_transfer",

          paymentModeOther:
            "",

          referenceNumber:
            "",

          remarks:
            `Opening paid amount for ${payload.vendorInvoiceNo}`,

          paidBy:
            userId,

          createdAt:
            new Date(),
        });
    }


    const createPayload = {

      companyId,

      paymentCode,

      serialNumber,

      vendorId:
        vendor._id,

      vendor:
        vendor.vendorName,

      exportInvoiceNo:
        payload.exportInvoiceNo,

      invoiceDate:
        new Date(
          payload.invoiceDate
        ),

      from:
        payload.from,

      vendorInvoiceNo:
        payload.vendorInvoiceNo,

      vendorInvoiceDate:
        new Date(
          payload.vendorInvoiceDate
        ),

      weight:
        Number(
          payload.weight ||
          0
        ),

      weightUnit:
        payload.weightUnit ||
        "mt",

      weightUnitOther:
        payload.weightUnit ===
          "other"

          ? payload.weightUnitOther ||
            ""

          : "",

      totalAmount:
        amounts.totalAmount,

      previousAdvance:
        amounts.previousAdvance,

      pendingAmount:
        amounts.pendingAmount,

      paidAmount:
        amounts.paidAmount,

      deduction:
        amounts.deduction,

      supplierBalance:
        amounts.supplierBalance,

      status,

      statusOther:
        status ===
          "other"

          ? payload.statusOther ||
            ""

          : "",

      shipmentId:
        shipment?._id ||
        null,

      shipmentNumber:
        shipment?.shipmentNumber ||
        String(
          payload.shipmentNumber ||
          ""
        )
          .trim()
          .toUpperCase(),

      currency:
        String(
          payload.currency ||
          vendor.currency ||
          "INR"
        )
          .trim()
          .toUpperCase(),

      paymentHistory,

      remarks:
        payload.remarks,

      createdBy:
        userId,

      createdByEmployeeId:
        employeeId,

      updatedBy:
        userId,
    };


    /* ==========================================================
       OPTIONAL PAYMENT PROOF
    ========================================================== */

    if (
      paymentProof
    ) {

      createPayload.paymentProof = {

        url:
          String(
            paymentProof.url ||
            ""
          ),

        originalName:
          String(
            paymentProof.originalName ||
            ""
          ),

        mimeType:
          String(
            paymentProof.mimeType ||
            ""
          ),

        size:
          Number(
            paymentProof.size ||
            0
          ),
      };
    }


    return logisticsVendorPaymentRepository
      .create(
        createPayload
      );
  }


  /* ============================================================
     LIST VENDOR PAYMENTS

     Requester-aware read scope:

     Junior / Executive:
     - only own records

     Department Head / Team Leader:
     - all Logistics records for review

     Management:
     - department monitoring visibility
  ============================================================ */

  async listPaymentRecords({
    companyId,
    query,
    userId = null,
    employeeId = null,
    accessType = "",
    canHandoffToAccounts = false,
  }) {

    this.assertCompanyId(
      companyId
    );


    const restrictToOwner =
      this.restrictReadToOwner({
        accessType,
        canHandoffToAccounts,
      });


    return logisticsVendorPaymentRepository
      .paginate({

        companyId,

        ...query,

        restrictToOwner,

        employeeId,

        userId,
      });
  }


  /* ============================================================
     GET VENDOR PAYMENT

     Public/requester-aware read.

     Junior:
     - own record only

     Senior:
     - can review junior-created records

     Management:
     - can monitor department records
  ============================================================ */

  async getPaymentRecord({
    companyId,
    paymentId,
    userId = null,
    employeeId = null,
    accessType = "",
    canHandoffToAccounts = false,
  }) {

    this.assertCompanyId(
      companyId
    );


    this.assertObjectId(
      paymentId,
      "Invalid Vendor Payment ID"
    );


    const restrictToOwner =
      this.restrictReadToOwner({
        accessType,
        canHandoffToAccounts,
      });


    const record =
      await logisticsVendorPaymentRepository
        .findById({

          companyId,

          paymentId,

          restrictToOwner,

          employeeId,

          userId,
        });


    if (
      !record
    ) {

      throw new ApiError(
        404,
        "Vendor payment record not found"
      );
    }


    return record;
  }


  /* ============================================================
     INTERNAL COMPANY-SCOPED GET

     IMPORTANT:

     Controlled mutation and Senior handoff logic must be able
     to inspect the source record before applying their own
     authorization rules.

     Therefore internal mutation/handoff code must NOT use the
     public requester-scoped getPaymentRecord().

     This method:
     - remains company scoped
     - does not itself grant mutation rights
     - is used only before explicit ownership / handoff checks
  ============================================================ */

  async getInternal({
    companyId,
    paymentId,
  }) {

    this.assertCompanyId(
      companyId
    );


    this.assertObjectId(
      paymentId,
      "Invalid Vendor Payment ID"
    );


    const record =
      await logisticsVendorPaymentRepository
        .findById({

          companyId,

          paymentId,

          restrictToOwner:
            false,
        });


    if (
      !record
    ) {

      throw new ApiError(
        404,
        "Vendor payment record not found"
      );
    }


    return record;
  }


  /* ============================================================
     UPDATE VENDOR PAYMENT

     Rules:

     - creator may edit own record
     - another junior may NOT edit it
     - senior may NOT edit junior-created record
     - Accounts handoff makes it read-only
     - audit history is preserved
  ============================================================ */

  async updatePaymentRecord({
    companyId,
    paymentId,
    userId = null,
    employeeId = null,
    userName = "",
    payload,
    paymentProof = undefined,
  }) {

    const current =
      await this.getInternal({
        companyId,
        paymentId,
      });


    this.assertNotHandedOff(
      current
    );


    this.assertRecordOwner({
      record:
        current,

      employeeId,

      userId,
    });


    const update = {

      ...payload,

      updatedBy:
        userId,
    };


    delete update.editHistory;
    delete update.paymentHistory;

    /*
     * Accounts-controlled fields must never be writable through
     * the normal Logistics edit endpoint.
     */

    delete update.accountsHandoffId;
    delete update.accountsStatus;
    delete update.accountsHandedOffBy;
    delete update.accountsHandedOffAt;
    delete update.accountsPaidAmount;
    delete update.accountsRemainingAmount;
    delete update.accountsPaymentDate;
    delete update.accountsPaymentReference;
    delete update.accountsPaidByName;

    delete update.vendorBillDocument;

    delete update.createdBy;
    delete update.createdByEmployeeId;


    /* ==========================================================
       OPTIONAL PAYMENT PROOF
    ========================================================== */

    if (
      paymentProof
    ) {

      update.paymentProof = {

        url:
          String(
            paymentProof.url ||
            ""
          ),

        originalName:
          String(
            paymentProof.originalName ||
            ""
          ),

        mimeType:
          String(
            paymentProof.mimeType ||
            ""
          ),

        size:
          Number(
            paymentProof.size ||
            0
          ),
      };
    }


    /* ==========================================================
       VENDOR
    ========================================================== */

    if (
      payload.vendorId
    ) {

      const vendor =
        await this.resolveVendor({
          companyId,

          vendorId:
            payload.vendorId,
        });


      update.vendorId =
        vendor._id;


      update.vendor =
        vendor.vendorName;
    }


    /* ==========================================================
       SHIPMENT
    ========================================================== */

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          payload,
          "shipmentId"
        ) ||

      Object.prototype
        .hasOwnProperty
        .call(
          payload,
          "shipmentNumber"
        )
    ) {

      const shipment =
        await this.resolveShipment({
          companyId,

          shipmentId:
            payload.shipmentId,

          shipmentNumber:
            payload.shipmentNumber,
        });


      update.shipmentId =
        shipment?._id ||
        null;


      update.shipmentNumber =
        shipment?.shipmentNumber ||
        "";
    }


    /* ==========================================================
       MONETARY FIELDS
    ========================================================== */

    const monetaryFields = [

      "totalAmount",

      "previousAdvance",

      "paidAmount",

      "deduction",
    ];


    const amountChanged =
      monetaryFields.some(
        (
          field
        ) =>
          Object.prototype
            .hasOwnProperty
            .call(
              payload,
              field
            )
      );


    if (
      amountChanged
    ) {

      const amounts =
        calculateAmounts({

          totalAmount:
            payload.totalAmount ??
            current.totalAmount,

          previousAdvance:
            payload.previousAdvance ??
            current.previousAdvance,

          paidAmount:
            payload.paidAmount ??
            current.paidAmount,

          deduction:
            payload.deduction ??
            current.deduction,
        });


      Object.assign(
        update,
        amounts
      );


      update.status =
        deriveStatus({

          requestedStatus:
            payload.status ??
            current.status,

          ...amounts,
        });
    }


    /* ==========================================================
       STATUS ONLY UPDATE
    ========================================================== */

    if (
      payload.status &&
      !amountChanged
    ) {

      update.status =
        deriveStatus({

          requestedStatus:
            payload.status,

          totalAmount:
            current.totalAmount,

          previousAdvance:
            current.previousAdvance,

          paidAmount:
            current.paidAmount,

          deduction:
            current.deduction,

          pendingAmount:
            current.pendingAmount,

          supplierBalance:
            current.supplierBalance,
        });
    }


    if (
      update.status !==
      "other"
    ) {

      update.statusOther =
        "";
    }


    if (
      payload.weightUnit &&
      payload.weightUnit !==
        "other"
    ) {

      update.weightUnitOther =
        "";
    }


    const record =
      await logisticsVendorPaymentRepository
        .updateById({

          companyId,

          paymentId,

          employeeId,

          userId,

          auditEntry: {

            changedBy:
              userId,

            changedByName:
              String(
                userName ||
                ""
              )
                .trim(),

            changedAt:
              new Date(),
          },

          payload:
            update,
        });


    if (
      !record
    ) {

      await this.throwMutationFailure({

        companyId,

        paymentId,

        employeeId,

        userId,
      });
    }


    return record;
  }


  /* ============================================================
     ADD PAYMENT

     Direct Logistics payment remains valid only:

     - before Accounts handoff
     - for the creator's own Vendor Payment

     Senior's ability to Send to Accounts does NOT provide
     authority to directly pay or change junior-created records.
  ============================================================ */

  async addPayment({
    companyId,
    paymentId,
    userId = null,
    employeeId = null,
    payload,
  }) {

    const current =
      await this.getInternal({
        companyId,
        paymentId,
      });


    this.assertNotHandedOff(
      current
    );


    this.assertRecordOwner({
      record:
        current,

      employeeId,

      userId,
    });


    const amount =
      Number(
        payload.amount ||
        0
      );


    if (
      amount <=
      0
    ) {

      throw new ApiError(
        400,
        "Payment amount must be greater than zero"
      );
    }


    if (
      amount >
      Number(
        current.supplierBalance ||
        0
      )
    ) {

      throw new ApiError(
        400,
        "Payment amount cannot exceed Supplier Balance"
      );
    }


    const mode =
      normalizePaymentMode(
        payload.paymentMode
      );


    if (
      mode ===
        "other" &&
      !String(
        payload.paymentModeOther ||
        ""
      )
        .trim()
    ) {

      throw new ApiError(
        400,
        "Other payment mode details are required"
      );
    }


    const record =
      await logisticsVendorPaymentRepository
        .addPaymentTransaction({

          companyId,

          paymentId,

          amount,

          userId,

          employeeId,

          transaction: {

            amount,

            paymentDate:
              new Date(
                payload.paymentDate
              ),

            paymentMode:
              mode,

            paymentModeOther:
              mode ===
                "other"

                ? String(
                    payload.paymentModeOther ||
                    ""
                  )
                    .trim()

                : "",

            referenceNumber:
              payload.referenceNumber ||
              "",

            remarks:
              payload.remarks,

            paidBy:
              userId,

            createdAt:
              new Date(),
          },
        });


    if (
      !record
    ) {

      await this.throwMutationFailure({

        companyId,

        paymentId,

        employeeId,

        userId,
      });
    }


    /*
     * Existing model hook recalculates:
     *
     * - pendingAmount
     * - supplierBalance
     * - status
     */

    await record.save();


    return record;
  }


  /* ============================================================
     DELETE VENDOR PAYMENT

     Only creator can remove own record before Accounts handoff.

     Senior cannot remove junior-created records.
  ============================================================ */

  async deletePaymentRecord({
    companyId,
    paymentId,
    userId = null,
    employeeId = null,
  }) {

    const current =
      await this.getInternal({
        companyId,
        paymentId,
      });


    this.assertNotHandedOff(
      current
    );


    this.assertRecordOwner({
      record:
        current,

      employeeId,

      userId,
    });


    const deleted =
      await logisticsVendorPaymentRepository
        .softDelete({

          companyId,

          paymentId,

          userId,

          employeeId,
        });


    if (
      !deleted
    ) {

      await this.throwMutationFailure({

        companyId,

        paymentId,

        employeeId,

        userId,
      });
    }


    return {

      paymentId:
        current._id,

      paymentCode:
        current.paymentCode,

      deleted:
        true,
    };
  }


  /* ============================================================
     SAVE / REPLACE VENDOR BILL DOCUMENT

     Vendor Bill remains separate from paymentProof.

     Rules:

     - creator uploads/replaces Vendor Bill
     - Senior may review/view/download it
     - Senior does NOT replace junior's document
     - Accounts handoff locks the document
     - upload/replacement is added to edit history
  ============================================================ */

  async saveVendorBill({
    companyId,
    paymentId,
    userId = null,
    employeeId = null,
    userName = "",
    vendorBillDocument,
  }) {

    const current =
      await this.getInternal({
        companyId,
        paymentId,
      });


    this.assertNotHandedOff(
      current
    );


    this.assertRecordOwner({
      record:
        current,

      employeeId,

      userId,
    });


    if (
      !vendorBillDocument?.fileUrl
    ) {

      throw new ApiError(
        400,
        "Vendor bill file is required"
      );
    }


    const document = {

      fileName:
        String(
          vendorBillDocument.fileName ||
          ""
        )
          .trim(),

      originalName:
        String(
          vendorBillDocument.originalName ||
          ""
        )
          .trim(),

      fileUrl:
        String(
          vendorBillDocument.fileUrl ||
          ""
        )
          .trim(),

      storageKey:
        String(
          vendorBillDocument.storageKey ||
          ""
        )
          .trim(),

      mimeType:
        String(
          vendorBillDocument.mimeType ||
          ""
        )
          .trim(),

      fileSize:
        Number(
          vendorBillDocument.fileSize ||
          0
        ),

      uploadedBy:
        userId,

      uploadedAt:
        new Date(),
    };


    if (
      !document.mimeType
    ) {

      throw new ApiError(
        400,
        "Vendor bill MIME type is required"
      );
    }


    const record =
      await logisticsVendorPaymentRepository
        .updateById({

          companyId,

          paymentId,

          employeeId,

          userId,

          payload: {

            vendorBillDocument:
              document,

            updatedBy:
              userId,
          },

          auditEntry: {

            changedBy:
              userId,

            changedByName:
              String(
                userName ||
                ""
              )
                .trim(),

            changedAt:
              new Date(),
          },
        });


    if (
      !record
    ) {

      await this.throwMutationFailure({

        companyId,

        paymentId,

        employeeId,

        userId,
      });
    }


    return record;
  }


  /* ============================================================
     HANDOFF TO ACCOUNTS

     Only Logistics Department Head / Team Leader may hand off.

     IMPORTANT:

     Handoff permission is NOT creator ownership.

     Senior may send a junior-created eligible payable to
     Accounts without receiving edit rights over that employee's
     Logistics workspace.

     Logistics can already contain:
     - previousAdvance
     - direct Logistics payments
     - deduction

     Accounts therefore receives CURRENT supplierBalance only.
  ============================================================ */

  async handoffToAccounts({
    companyId,
    paymentId,
    userId = null,
    employeeId = null,
    userName = "",
    canHandoffToAccounts = false,
  }) {

    this.assertCompanyId(
      companyId
    );


    if (
      !canHandoffToAccounts
    ) {

      throw new ApiError(
        403,
        "Only Logistics Department Head or Team Leader can send Vendor Payment to Accounts"
      );
    }


    /*
     * Deliberately unrestricted by creator ownership.
     *
     * Department Head / Team Leader must be able to review and
     * hand off an eligible junior-created Vendor Payment.
     */

    const current =
      await this.getInternal({
        companyId,
        paymentId,
      });


    /* ========================================================
       IDEMPOTENT RETRY
    ======================================================== */

    if (
      current.accountsHandoffId
    ) {

      return current;
    }


    /* ========================================================
       CANCELLED RECORD
    ======================================================== */

    if (
      String(
        current.status ||
        ""
      )
        .trim()
        .toLowerCase() ===
      "cancelled"
    ) {

      throw new ApiError(
        409,
        "Cancelled Vendor Payment cannot be sent to Accounts"
      );
    }


    /* ========================================================
       CURRENT OUTSTANDING PAYABLE
    ======================================================== */

    const outstanding =
      money(
        current.supplierBalance
      );


    if (
      outstanding <=
      0
    ) {

      throw new ApiError(
        409,
        "Vendor Payment has no outstanding Supplier Balance to send to Accounts"
      );
    }


    /* ========================================================
       VENDOR BILL REQUIRED
    ======================================================== */

    if (
      !current.vendorBillDocument?.fileUrl
    ) {

      throw new ApiError(
        409,
        "Upload the Vendor Bill before sending this payable to Accounts"
      );
    }


    const documents = [

      {

        label:
          "Vendor Bill",

        fileName:
          current.vendorBillDocument
            ?.originalName ||
          current.vendorBillDocument
            ?.fileName ||
          "Vendor Bill",

        fileUrl:
          current.vendorBillDocument
            .fileUrl,

        filePath:
          "",

        mimeType:
          current.vendorBillDocument
            ?.mimeType ||
          "",
      },

    ];


    /* ========================================================
       CENTRAL ACCOUNTS REGISTER

       No ledger, voucher or journal is created here.
    ======================================================== */

    const centralInvoice =
      await departmentInvoiceService
        .handoff({

          companyId,

          sourceDepartment:
            "logistics",

          sourceModule:
            "logistics_vendor_payment",

          sourceRecordId:
            current._id,

          invoiceNumber:
            current.vendorInvoiceNo,

          invoiceDate:
            current.vendorInvoiceDate,

          partyName:
            current.vendor,

          currency:
            current.currency ||
            "INR",

          totalAmount:
            outstanding,

          documents,

          sentToAccountsBy:
            userId,

          sentToAccountsByEmployeeId:
            employeeId,

          sentToAccountsByName:
            String(
              userName ||
              ""
            )
              .trim(),
        });


    /* ========================================================
       CENTRAL STATE -> LOGISTICS SOURCE
    ======================================================== */

    await departmentInvoiceService
      .syncSource(
        centralInvoice
      );


    const synced =
      await logisticsVendorPaymentRepository
        .findById({

          companyId,

          paymentId,

          restrictToOwner:
            false,
        });


    if (
      !synced
    ) {

      throw new ApiError(
        404,
        "Vendor payment record not found after Accounts handoff"
      );
    }


    if (
      !synced.accountsHandoffId
    ) {

      throw new ApiError(
        409,
        "Vendor Payment could not be synchronized with Accounts"
      );
    }


    return synced;
  }


  /* ============================================================
     SUMMARY

     Summary follows the same requester visibility as list/get.

     Junior:
     - own totals only

     Senior:
     - department totals

     Management:
     - department totals
  ============================================================ */

  async getSummary({
    companyId,
    userId = null,
    employeeId = null,
    accessType = "",
    canHandoffToAccounts = false,
  }) {

    this.assertCompanyId(
      companyId
    );


    const restrictToOwner =
      this.restrictReadToOwner({
        accessType,
        canHandoffToAccounts,
      });


    const rows =
      await logisticsVendorPaymentRepository
        .summary({

          companyId:
            new mongoose.Types.ObjectId(
              String(
                companyId
              )
            ),

          restrictToOwner,

          employeeId,

          userId,
        });


    const summary = {

      totalRecords:
        0,

      pending:
        0,

      partial:
        0,

      paid:
        0,

      hold:
        0,

      cancelled:
        0,

      other:
        0,

      totalAmount:
        0,

      previousAdvance:
        0,

      paidAmount:
        0,

      deduction:
        0,

      pendingAmount:
        0,

      supplierBalance:
        0,
    };


    for (
      const row of rows
    ) {

      const count =
        Number(
          row.count ||
          0
        );


      summary.totalRecords +=
        count;


      if (
        Object.prototype
          .hasOwnProperty
          .call(
            summary,
            row._id
          )
      ) {

        summary[
          row._id
        ] =
          count;
      }


      summary.totalAmount +=
        Number(
          row.totalAmount ||
          0
        );


      summary.previousAdvance +=
        Number(
          row.previousAdvance ||
          0
        );


      summary.paidAmount +=
        Number(
          row.paidAmount ||
          0
        );


      summary.deduction +=
        Number(
          row.deduction ||
          0
        );


      summary.pendingAmount +=
        Number(
          row.pendingAmount ||
          0
        );


      summary.supplierBalance +=
        Number(
          row.supplierBalance ||
          0
        );
    }


    return summary;
  }


  /* ============================================================
     SOURCE MUTATION FAILURE

     Distinguishes:

     404
       actual missing record

     403
       record belongs to another employee

     409
       record already handed to Accounts or mutation conflict

     IMPORTANT:
     Lookup here is intentionally unrestricted by creator read
     scope so a real ownership conflict can return 403 instead
     of incorrectly appearing as 404.
  ============================================================ */

  async throwMutationFailure({
    companyId,
    paymentId,
    employeeId = null,
    userId = null,
  }) {

    const latest =
      await logisticsVendorPaymentRepository
        .findById({

          companyId,

          paymentId,

          restrictToOwner:
            false,
        });


    if (
      !latest
    ) {

      throw new ApiError(
        404,
        "Vendor payment record not found"
      );
    }


    if (
      latest.accountsHandoffId
    ) {

      throw new ApiError(
        409,
        "Vendor Payment has already been sent to Accounts and financial changes must now be made from Accounts"
      );
    }


    if (
      !this.isRecordOwner({
        record:
          latest,

        employeeId,

        userId,
      })
    ) {

      throw new ApiError(
        403,
        "You can modify only Vendor Payments created in your own workspace"
      );
    }


    throw new ApiError(
      409,
      "Vendor payment record could not be updated"
    );
  }


  /* ============================================================
     CREATOR OWNERSHIP CHECK

     New records:
       createdByEmployeeId is primary ownership identity.

     Older records:
       createdByEmployeeId may be missing.
       createdBy user becomes fallback.

     Senior review/handoff is intentionally NOT considered
     ownership.
  ============================================================ */

  isRecordOwner({
    record,
    employeeId = null,
    userId = null,
  }) {

    if (
      !record
    ) {

      return false;
    }


    const recordEmployeeId =
      idValue(
        record.createdByEmployeeId
      );


    const recordUserId =
      idValue(
        record.createdBy
      );


    const requestEmployeeId =
      idValue(
        employeeId
      );


    const requestUserId =
      idValue(
        userId
      );


    /*
     * Preferred ownership:
     * employee workspace identity.
     */

    if (
      requestEmployeeId &&
      recordEmployeeId
    ) {

      return (
        requestEmployeeId ===
        recordEmployeeId
      );
    }


    /*
     * Legacy fallback:
     * old records may not have createdByEmployeeId.
     */

    if (
      !recordEmployeeId &&
      requestUserId &&
      recordUserId
    ) {

      return (
        requestUserId ===
        recordUserId
      );
    }


    /*
     * Non-employee creator fallback.
     *
     * This preserves legitimate records created through an
     * existing user context where employeeId was not available.
     */

    if (
      !requestEmployeeId &&
      requestUserId &&
      recordUserId
    ) {

      return (
        requestUserId ===
        recordUserId
      );
    }


    return false;
  }


  /* ============================================================
     ASSERT RECORD OWNER
  ============================================================ */

  assertRecordOwner({
    record,
    employeeId = null,
    userId = null,
  }) {

    if (
      !this.isRecordOwner({
        record,
        employeeId,
        userId,
      })
    ) {

      throw new ApiError(
        403,
        "You can modify only Vendor Payments created in your own workspace"
      );
    }
  }


  /* ============================================================
     ACCOUNTS HANDOFF LOCK
  ============================================================ */

  assertNotHandedOff(
    record
  ) {

    if (
      record?.accountsHandoffId
    ) {

      throw new ApiError(
        409,
        "Vendor Payment has already been sent to Accounts and is read-only for Logistics financial changes"
      );
    }
  }


  /* ============================================================
     RESOLVE VENDOR
  ============================================================ */

  async resolveVendor({
    companyId,
    vendorId,
  }) {

    this.assertObjectId(
      vendorId,
      "Invalid vendor ID"
    );


    const vendor =
      await LogisticsVendor
        .findOne({

          _id:
            vendorId,

          companyId,

          isActive:
            true,
        })
        .select(
          "_id vendorCode vendorName currency status"
        )
        .lean();


    if (
      !vendor
    ) {

      throw new ApiError(
        404,
        "Logistics vendor not found"
      );
    }


    return vendor;
  }


  /* ============================================================
     RESOLVE SHIPMENT
  ============================================================ */

  async resolveShipment({
    companyId,
    shipmentId,
    shipmentNumber,
  }) {

    if (
      !shipmentId &&
      !shipmentNumber
    ) {

      return null;
    }


    const filter = {

      companyId,

      isActive:
        true,
    };


    if (
      shipmentId
    ) {

      this.assertObjectId(
        shipmentId,
        "Invalid shipment ID"
      );


      filter._id =
        shipmentId;

    } else {

      filter.shipmentNumber =
        String(
          shipmentNumber ||
          ""
        )
          .trim()
          .toUpperCase();
    }


    const shipment =
      await LogisticsShipment
        .findOne(
          filter
        )
        .select(
          "_id shipmentNumber shipmentMode customerName status"
        )
        .lean();


    if (
      !shipment
    ) {

      throw new ApiError(
        404,
        "Logistics shipment not found"
      );
    }


    return shipment;
  }


  /* ============================================================
     GENERATE PAYMENT CODE
  ============================================================ */

  async generatePaymentCode({
    companyId,
  }) {

    const now =
      new Date();


    const dateCode =
      `${String(
        now.getFullYear()
      ).slice(
        -2
      )}${String(
        now.getMonth() +
        1
      ).padStart(
        2,
        "0"
      )}${String(
        now.getDate()
      ).padStart(
        2,
        "0"
      )}`;


    const latest =
      await logisticsVendorPaymentRepository
        .latestCode({
          companyId,
          dateCode,
        });


    let next =
      1;


    if (
      latest?.paymentCode
    ) {

      const last =
        Number(
          latest.paymentCode
            .split(
              "-"
            )
            .pop()
        );


      if (
        Number.isFinite(
          last
        )
      ) {

        next =
          last +
          1;
      }
    }


    for (
      let attempt =
        0;

      attempt <
      100;

      attempt +=
      1
    ) {

      const candidate =
        `VPM-${dateCode}-${String(
          next +
          attempt
        ).padStart(
          4,
          "0"
        )}`;


      const exists =
        await logisticsVendorPaymentRepository
          .codeExists({

            companyId,

            paymentCode:
              candidate,
          });


      if (
        !exists
      ) {

        return candidate;
      }
    }


    throw new ApiError(
      500,
      "Unable to generate Vendor Payment code"
    );
  }


  /* ============================================================
     COMPANY ID SAFETY
  ============================================================ */

  assertCompanyId(
    companyId
  ) {

    if (
      !companyId ||
      !mongoose.isValidObjectId(
        companyId
      )
    ) {

      throw new ApiError(
        400,
        "Invalid company ID"
      );
    }
  }


  /* ============================================================
     OBJECT ID SAFETY
  ============================================================ */

  assertObjectId(
    value,
    message
  ) {

    if (
      !mongoose.isValidObjectId(
        value
      )
    ) {

      throw new ApiError(
        400,
        message
      );
    }
  }
}


/* ============================================================
   OBJECT / ID NORMALIZER

   Handles:
   - ObjectId
   - populated Mongoose object
   - plain object with _id
   - string ID
============================================================ */

function idValue(
  value
) {

  if (
    value ===
      null ||
    value ===
      undefined
  ) {

    return "";
  }


  if (
    typeof value ===
      "object"
  ) {

    if (
      value._id
    ) {

      return String(
        value._id
      );
    }


    if (
      typeof value.toHexString ===
      "function"
    ) {

      return value
        .toHexString();
    }
  }


  return String(
    value
  );
}


/* ============================================================
   PAYMENT CALCULATIONS
============================================================ */

function calculateAmounts({
  totalAmount,
  previousAdvance,
  paidAmount,
  deduction,
}) {

  const total =
    money(
      totalAmount
    );


  const advance =
    money(
      previousAdvance
    );


  const paid =
    money(
      paidAmount
    );


  const deduct =
    money(
      deduction
    );


  if (
    total <
      0 ||
    advance <
      0 ||
    paid <
      0 ||
    deduct <
      0
  ) {

    throw new ApiError(
      400,
      "Vendor Payment amounts cannot be negative"
    );
  }


  if (
    money(
      advance +
      paid +
      deduct
    ) >
    total
  ) {

    throw new ApiError(
      400,
      "Previous Advance + Paid Amount + Deduction cannot exceed Total Amount"
    );
  }


  const balance =
    money(
      Math.max(
        0,
        total -
        advance -
        paid -
        deduct
      )
    );


  return {

    totalAmount:
      total,

    previousAdvance:
      advance,

    paidAmount:
      paid,

    deduction:
      deduct,

    pendingAmount:
      balance,

    supplierBalance:
      balance,
  };
}


/* ============================================================
   STATUS
============================================================ */

function deriveStatus({
  requestedStatus,
  totalAmount,
  previousAdvance,
  paidAmount,
  deduction,
  supplierBalance,
}) {

  if (
    [
      "hold",
      "cancelled",
      "other",
    ]
      .includes(
        requestedStatus
      )
  ) {

    return requestedStatus;
  }


  if (
    Number(
      totalAmount ||
      0
    ) >
      0 &&

    Number(
      supplierBalance ||
      0
    ) <=
      0
  ) {

    return "paid";
  }


  if (
    Number(
      previousAdvance ||
      0
    ) >
      0 ||

    Number(
      paidAmount ||
      0
    ) >
      0 ||

    Number(
      deduction ||
      0
    ) >
      0
  ) {

    return "partial";
  }


  return "pending";
}


/* ============================================================
   PAYMENT MODE
============================================================ */

function normalizePaymentMode(
  value
) {

  return value ===
    "bank-transfer"

    ? "bank_transfer"

    : value;
}


/* ============================================================
   MONEY
============================================================ */

function money(
  value
) {

  return Math.round(
    (
      Number(
        value ||
        0
      ) +
      Number.EPSILON
    ) *
    100
  ) /
    100;
}


/* ============================================================
   EXPORT
============================================================ */

export const
  logisticsVendorPaymentService =
    new LogisticsVendorPaymentService();


export default
  logisticsVendorPaymentService;