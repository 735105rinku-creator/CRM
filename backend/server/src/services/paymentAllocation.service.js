import mongoose from "mongoose";
import crypto from "node:crypto";

import paymentAllocationRepository from "../repositories/paymentAllocation.repository.js";
import PurchaseInvoice from "../models/PurchaseInvoice.js";
import Voucher from "../models/Voucher.js";
import DepartmentInvoice from "../models/DepartmentInvoice.js";
import { ApiError } from "../utils/apiError.js";


const money = value =>
  Math.round(Number(value || 0) * 100) / 100;


const allocationId = (
  companyId,
  paymentVoucherId,
  purchaseInvoiceId
) =>
  new mongoose.Types.ObjectId(
    crypto
      .createHash("sha256")
      .update(
        `${companyId}:${paymentVoucherId}:${purchaseInvoiceId}`
      )
      .digest()
      .subarray(0, 12)
  );


class PaymentAllocationService {

  /* ==========================================================
     COMPANY ADMIN APPROVAL CHECK BEFORE POSTING
  ========================================================== */

  async assertApprovedForPosting(
    companyId,
    paymentVoucherId
  ) {

    const rows =
      await paymentAllocationRepository
        .listByPayment(
          companyId,
          paymentVoucherId
        );


    if (!rows.length) {
      return;
    }


    const purchaseInvoiceIds =
      rows.map(
        row =>
          row.purchaseInvoiceId
      );


    const expectedCount =
      new Set(
        purchaseInvoiceIds.map(
          String
        )
      ).size;


    const approvedCount =
      await DepartmentInvoice
        .countDocuments({

          companyId,

          sourceModule:
            "purchase_invoice",

          sourceRecordId: {
            $in:
              purchaseInvoiceIds
          },

          companyAdminApprovalStatus:
            "approved",

          status: {
            $in: [
              "verified",
              "partially_paid"
            ]
          }

        });


    if (
      approvedCount !==
      expectedCount
    ) {

      throw new ApiError(
        409,
        "Every allocated Purchase Invoice requires current Company Admin approval before posting."
      );

    }
  }


  /* ==========================================================
     PURCHASE PAYMENT CONTEXT

     Read-only helper used BEFORE creating the Payment Voucher.

     This resolves trusted accounting information from the
     existing Purchase Invoice + Purchase Voucher.

     Frontend must never guess or hardcode the Vendor/AP ledger.

     Required state:
       Purchase Invoice handed off
       ->
       Accounts verified / partially paid
       ->
       Company Admin approved
       ->
       Purchase Voucher exists
       ->
       Purchase Voucher has partyAccountId
       ->
       Outstanding amount > 0
  ========================================================== */

  async purchasePaymentContext(
    companyId,
    purchaseInvoiceId
  ) {

    if (!companyId) {

      throw new ApiError(
        400,
        "Company ID is required."
      );

    }


    if (
      !mongoose.isValidObjectId(
        purchaseInvoiceId
      )
    ) {

      throw new ApiError(
        400,
        "Invalid Purchase Invoice ID."
      );

    }


    const invoice =
      await PurchaseInvoice
        .findOne({

          _id:
            purchaseInvoiceId,

          companyId

        })
        .select(
          [
            "vendorName",
            "vendorInvoiceNumber",
            "invoiceDate",
            "invoiceTotal",
            "poNumber",
            "handoffStatus",
            "accountsStatus"
          ].join(" ")
        )
        .lean();


    if (!invoice) {

      throw new ApiError(
        404,
        "Purchase Invoice not found."
      );

    }


    if (
      invoice.handoffStatus !==
        "handed_off"
    ) {

      throw new ApiError(
        409,
        "Purchase Invoice has not been handed off to Accounts."
      );

    }


    if (
      ![
        "verified",
        "partially_paid"
      ].includes(
        invoice.accountsStatus
      )
    ) {

      throw new ApiError(
        409,
        "Purchase Invoice must be verified by Accounts before payment."
      );

    }


    const centralInvoice =
      await DepartmentInvoice
        .findOne({

          companyId,

          sourceModule:
            "purchase_invoice",

          sourceRecordId:
            invoice._id

        })
        .select(
          [
            "status",
            "companyAdminApprovalStatus"
          ].join(" ")
        )
        .lean();


    if (!centralInvoice) {

      throw new ApiError(
        409,
        "Purchase Invoice is not registered in the Accounts invoice workflow."
      );

    }


    if (
      ![
        "verified",
        "partially_paid"
      ].includes(
        centralInvoice.status
      )
    ) {

      throw new ApiError(
        409,
        "Purchase Invoice is not currently eligible for payment."
      );

    }


    if (
      centralInvoice
        .companyAdminApprovalStatus !==
      "approved"
    ) {

      throw new ApiError(
        409,
        "Purchase Invoice requires Company Admin approval before payment."
      );

    }


    const purchaseVoucher =
      await Voucher
        .findOne({

          companyId,

          voucherType:
            "purchase",

          sourceModule:
            "purchase_invoice",

          sourceReferenceId:
            invoice._id

        })
        .select(
          [
            "voucherNumber",
            "partyAccountId",
            "partyAccountCode",
            "partyAccountName"
          ].join(" ")
        )
        .lean();


    if (!purchaseVoucher) {

      throw new ApiError(
        409,
        "Purchase payable voucher is not available for this Purchase Invoice."
      );

    }


    if (
      !purchaseVoucher
        .partyAccountId
    ) {

      throw new ApiError(
        409,
        "Purchase payable voucher does not have a Vendor/AP account."
      );

    }


    const totals =
      await paymentAllocationRepository
        .validTotalsByInvoices(
          companyId,
          [
            invoice._id
          ]
        );


    const paidAmount =
      money(
        totals.get(
          String(
            invoice._id
          )
        ) || 0
      );


    const invoiceTotal =
      money(
        invoice.invoiceTotal
      );


    const outstandingAmount =
      money(
        Math.max(
          0,
          invoiceTotal -
            paidAmount
        )
      );


    if (
      outstandingAmount <=
      0
    ) {

      throw new ApiError(
        409,
        "Purchase Invoice has no outstanding amount."
      );

    }


    return {

      purchaseInvoiceId:
        invoice._id,

      vendorName:
        invoice.vendorName || "",

      vendorInvoiceNumber:
        invoice.vendorInvoiceNumber || "",

      invoiceDate:
        invoice.invoiceDate,

      poNumber:
        invoice.poNumber || "",

      invoiceTotal,

      paidAmount,

      outstandingAmount,

      accountsVoucherNumber:
        purchaseVoucher.voucherNumber || "",

      partyAccountId:
        purchaseVoucher.partyAccountId,

      partyAccountCode:
        purchaseVoucher.partyAccountCode || "",

      partyAccountName:
        purchaseVoucher.partyAccountName || "",

      companyAdminApprovalStatus:
        centralInvoice
          .companyAdminApprovalStatus

    };
  }


  /* ==========================================================
     PURCHASE INVOICE IDS FOR PAYMENT VOUCHER

     Read-only helper.

     Used after Payment Voucher POST / VOID so the
     DepartmentInvoice workflow can refresh only the Purchase
     Invoices affected by that Payment Voucher.

     This method does not change allocation or accounting data.
  ========================================================== */

  async purchaseInvoiceIdsForPayment(
    companyId,
    paymentVoucherId
  ) {

    if (!companyId) {

      throw new ApiError(
        400,
        "Company ID is required."
      );

    }


    if (
      !mongoose.isValidObjectId(
        paymentVoucherId
      )
    ) {

      throw new ApiError(
        400,
        "Invalid payment voucher ID."
      );

    }


    const rows =
      await paymentAllocationRepository
        .listByPayment(
          companyId,
          paymentVoucherId
        );


    return [
      ...new Set(
        (rows || [])
          .map(
            row =>
              String(
                row.purchaseInvoiceId ||
                ""
              )
          )
          .filter(
            id =>
              mongoose.isValidObjectId(
                id
              )
          )
      )
    ];
  }


  /* ==========================================================
     PURCHASE ALLOCATION OPTIONS
  ========================================================== */

  async options(
    companyId,
    paymentVoucherId
  ) {

    const payment =
      await this.payment(
        companyId,
        paymentVoucherId
      );


    const payableAmounts =
      new Map(
        (payment.lines || [])
          .filter(
            line =>
              Number(
                line.debit || 0
              ) >
              0
          )
          .map(
            line => [
              String(
                line.accountId
              ),
              money(
                line.debit
              )
            ]
          )
      );


    if (
      payment.partyAccountId
    ) {

      payableAmounts.set(
        String(
          payment.partyAccountId
        ),
        money(
          payment.totalDebit
        )
      );

    }


    const partyAccountIds =
      [
        ...payableAmounts.keys()
      ]
        .filter(
          id =>
            mongoose.isValidObjectId(
              id
            )
        )
        .map(
          id =>
            new mongoose.Types.ObjectId(
              id
            )
        );


    if (
      !partyAccountIds.length
    ) {

      return [];

    }


    const purchaseVouchers =
      await Voucher
        .find({

          companyId,

          voucherType:
            "purchase",

          partyAccountId: {
            $in:
              partyAccountIds
          },

          sourceModule:
            "purchase_invoice",

          sourceReferenceId: {
            $ne:
              null
          }

        })
        .select(
          "sourceReferenceId voucherNumber partyAccountId"
        )
        .lean();


    const voucherByInvoice =
      new Map(
        purchaseVouchers.map(
          row => [
            String(
              row.sourceReferenceId
            ),
            row
          ]
        )
      );


    const invoiceIds =
      [
        ...voucherByInvoice.keys()
      ]
        .filter(
          id =>
            mongoose.isValidObjectId(
              id
            )
        )
        .map(
          id =>
            new mongoose.Types.ObjectId(
              id
            )
        );


    if (
      !invoiceIds.length
    ) {

      return [];

    }


    const approvedCentralInvoices =
      await DepartmentInvoice
        .find({

          companyId,

          sourceModule:
            "purchase_invoice",

          sourceRecordId: {
            $in:
              invoiceIds
          },

          companyAdminApprovalStatus:
            "approved",

          status: {
            $in: [
              "verified",
              "partially_paid"
            ]
          }

        })
        .select(
          "sourceRecordId"
        )
        .lean();


    const approvedInvoiceIds =
      new Set(
        approvedCentralInvoices.map(
          row =>
            String(
              row.sourceRecordId
            )
        )
      );


    /*
     * IMPORTANT:
     *
     * A Purchase Invoice becomes payable through the
     * Accounts Payment Allocation workflow only after:
     *
     * 1. Purchase has successfully handed it off to Accounts.
     * 2. Accounts has verified the central DepartmentInvoice.
     * 3. Company Admin has approved final payment authorization.
     *
     * "verified" allows the first payment.
     * "partially_paid" allows subsequent payments.
     *
     * "sent", "under_review" and "rejected" must never be
     * available for payment allocation.
     */
    const invoices =
      await PurchaseInvoice
        .find({

          companyId,

          _id: {
            $in:
              invoiceIds.filter(
                id =>
                  approvedInvoiceIds.has(
                    String(
                      id
                    )
                  )
              )
          },

          handoffStatus:
            "handed_off",

          accountsStatus: {
            $in: [
              "verified",
              "partially_paid"
            ]
          }

        })
        .select(
          [
            "vendorName",
            "vendorInvoiceNumber",
            "invoiceDate",
            "invoiceTotal",
            "poNumber",
            "accountsStatus"
          ].join(" ")
        )
        .sort({
          invoiceDate:
            1
        })
        .lean();


    const eligibleInvoiceIds =
      invoices.map(
        invoice =>
          invoice._id
      );


    const paid =
      eligibleInvoiceIds.length

        ? await paymentAllocationRepository
            .validTotalsByInvoices(
              companyId,
              eligibleInvoiceIds
            )

        : new Map();


    return invoices
      .map(
        invoice => {

          const paidAmount =
            money(
              paid.get(
                String(
                  invoice._id
                )
              ) || 0
            );


          const outstandingAmount =
            money(
              Math.max(
                0,
                Number(
                  invoice.invoiceTotal ||
                  0
                ) -
                  paidAmount
              )
            );


          const voucher =
            voucherByInvoice.get(
              String(
                invoice._id
              )
            );


          return {

            purchaseInvoiceId:
              invoice._id,

            vendorName:
              invoice.vendorName,

            vendorInvoiceNumber:
              invoice.vendorInvoiceNumber,

            invoiceDate:
              invoice.invoiceDate,

            poNumber:
              invoice.poNumber,

            invoiceTotal:
              money(
                invoice.invoiceTotal
              ),

            paidAmount,

            outstandingAmount,

            accountsVoucherNumber:
              voucher
                ?.voucherNumber ||
              "",

            companyAdminApprovalStatus:
              "approved",

            partyAccountId:
              voucher
                ?.partyAccountId

          };
        }
      )
      .filter(
        row =>
          row.outstandingAmount >
          0
      );
  }


  /* ==========================================================
     CREATE PURCHASE PAYMENT ALLOCATIONS
  ========================================================== */

  async allocate({
    companyId,
    paymentVoucherId,
    userId,
    allocations
  }) {

    const payment =
      await this.payment(
        companyId,
        paymentVoucherId
      );


    if (
      payment.status !==
      "draft"
    ) {

      throw new ApiError(
        409,
        "Allocations can only be recorded before the payment voucher is posted."
      );

    }


    const existing =
      await paymentAllocationRepository
        .listByPayment(
          companyId,
          paymentVoucherId
        );


    const normalized =
      allocations.map(
        row => ({

          purchaseInvoiceId:
            String(
              row.purchaseInvoiceId
            ),

          allocatedAmount:
            money(
              row.allocatedAmount
            )

        })
      );


    if (
      existing.length
    ) {

      const same =
        existing.length ===
          normalized.length &&
        existing.every(
          saved =>
            normalized.some(
              row =>
                row.purchaseInvoiceId ===
                  String(
                    saved.purchaseInvoiceId
                  ) &&
                row.allocatedAmount ===
                  money(
                    saved.allocatedAmount
                  )
            )
        );


      if (same) {

        return existing;

      }


      throw new ApiError(
        409,
        "Payment allocations are already recorded for this voucher."
      );
    }


    const total =
      money(
        normalized.reduce(
          (
            sum,
            row
          ) =>
            sum +
            row.allocatedAmount,
          0
        )
      );


    if (
      total <=
        0 ||
      total >
        money(
          payment.totalDebit
        )
    ) {

      throw new ApiError(
        400,
        "Allocation total must be positive and cannot exceed the payment voucher amount."
      );

    }


    /*
     * options() is intentionally called again here.
     *
     * This is both display/business validation and a
     * server-side authorization gate.
     */
    const options =
      await this.options(
        companyId,
        paymentVoucherId
      );


    const byId =
      new Map(
        options.map(
          row => [
            String(
              row.purchaseInvoiceId
            ),
            row
          ]
        )
      );


    const seen =
      new Set();

    const byParty =
      new Map();


    for (
      const row
      of normalized
    ) {

      if (
        !mongoose.isValidObjectId(
          row.purchaseInvoiceId
        )
      ) {

        throw new ApiError(
          400,
          "Invalid Purchase Invoice ID."
        );

      }


      if (
        seen.has(
          row.purchaseInvoiceId
        )
      ) {

        throw new ApiError(
          400,
          "A Purchase Invoice can be allocated only once per payment voucher."
        );

      }


      seen.add(
        row.purchaseInvoiceId
      );


      const invoice =
        byId.get(
          row.purchaseInvoiceId
        );


      if (!invoice) {

        throw new ApiError(
          400,
          "Selected Purchase Invoice is not verified by Accounts, not approved by Company Admin, or is not an outstanding payable for this vendor."
        );

      }


      if (
        row.allocatedAmount <=
          0 ||
        row.allocatedAmount >
          invoice.outstandingAmount
      ) {

        throw new ApiError(
          400,
          `Allocation for ${invoice.vendorInvoiceNumber} exceeds its outstanding amount.`
        );

      }


      const partyKey =
        String(
          invoice.partyAccountId
        );


      byParty.set(
        partyKey,
        money(
          (
            byParty.get(
              partyKey
            ) ||
            0
          ) +
            row.allocatedAmount
        )
      );
    }


    const payableAmounts =
      new Map(
        (payment.lines || [])
          .filter(
            line =>
              Number(
                line.debit ||
                0
              ) >
              0
          )
          .map(
            line => [
              String(
                line.accountId
              ),
              money(
                line.debit
              )
            ]
          )
      );


    if (
      payment.partyAccountId
    ) {

      payableAmounts.set(
        String(
          payment.partyAccountId
        ),
        money(
          payment.totalDebit
        )
      );

    }


    for (
      const [
        partyAccountId,
        allocated
      ]
      of byParty
    ) {

      if (
        allocated >
        Number(
          payableAmounts.get(
            partyAccountId
          ) ||
          0
        )
      ) {

        throw new ApiError(
          400,
          "Vendor allocation exceeds the related payable debit in this payment voucher."
        );

      }

    }


    const rows =
      normalized.map(
        row => ({

          _id:
            allocationId(
              companyId,
              paymentVoucherId,
              row.purchaseInvoiceId
            ),

          companyId,

          paymentVoucherId,

          purchaseInvoiceId:
            row.purchaseInvoiceId,

          allocatedAmount:
            row.allocatedAmount,

          createdBy:
            userId ||
            null

        })
      );


    try {

      return await paymentAllocationRepository
        .createMany(
          rows
        );

    } catch (error) {

      if (
        error?.code !==
        11000
      ) {

        throw error;

      }


      const saved =
        await paymentAllocationRepository
          .listByPayment(
            companyId,
            paymentVoucherId
          );


      const same =
        saved.length ===
          normalized.length &&
        saved.every(
          item =>
            normalized.some(
              row =>
                row.purchaseInvoiceId ===
                  String(
                    item.purchaseInvoiceId
                  ) &&
                row.allocatedAmount ===
                  money(
                    item.allocatedAmount
                  )
            )
        );


      if (same) {

        return saved;

      }


      throw new ApiError(
        409,
        "Payment allocations are already recorded for this voucher."
      );

    }
  }


  /* ==========================================================
     PURCHASE SETTLEMENT SUMMARY
  ========================================================== */

  async settlementForInvoices(
    companyId,
    invoices
  ) {

    const ids =
      invoices.map(
        row =>
          row._id
      );


    const totals =
      await paymentAllocationRepository
        .validTotalsByInvoices(
          companyId,
          ids
        );


    return new Map(
      invoices.map(
        invoice => {

          const invoiceTotal =
            money(
              invoice.invoiceTotal
            );


          const paidAmount =
            money(
              Math.min(
                invoiceTotal,
                totals.get(
                  String(
                    invoice._id
                  )
                ) ||
                  0
              )
            );


          const outstandingAmount =
            money(
              Math.max(
                0,
                invoiceTotal -
                  paidAmount
              )
            );


          return [
            String(
              invoice._id
            ),

            {

              invoiceTotal,

              paidAmount,

              outstandingAmount,

              paymentStatus:
                paidAmount <=
                0

                  ? "unpaid"

                  : outstandingAmount >
                    0

                    ? "partially_paid"

                    : "paid"

            }
          ];
        }
      )
    );
  }


  /* ==========================================================
     PAYMENT VOUCHER LOOKUP
  ========================================================== */

  async payment(
    companyId,
    paymentVoucherId
  ) {

    if (
      !mongoose.isValidObjectId(
        paymentVoucherId
      )
    ) {

      throw new ApiError(
        400,
        "Invalid payment voucher ID."
      );

    }


    const payment =
      await paymentAllocationRepository
        .findPayment(
          companyId,
          paymentVoucherId
        );


    if (!payment) {

      throw new ApiError(
        404,
        "Payment voucher not found."
      );

    }


    if (
      !payment.partyAccountId &&
      !(payment.lines || [])
        .some(
          line =>
            Number(
              line.debit ||
              0
            ) >
            0
        )
    ) {

      throw new ApiError(
        409,
        "Payment voucher must debit a vendor payable account before allocation."
      );

    }


    return payment;
  }
}


export default new PaymentAllocationService();