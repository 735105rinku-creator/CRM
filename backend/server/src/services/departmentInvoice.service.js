import mongoose from "mongoose";

import repository
  from "../repositories/departmentInvoice.repository.js";

import PurchaseInvoice
  from "../models/PurchaseInvoice.js";

import LogisticsVendorPayment
  from "../models/LogisticsVendorPayment.js";

import LogisticsInvoice
  from "../models/LogisticsInvoice.js";

import { Employee }
  from "../models/Employee.js";

import paymentAllocationService
  from "./paymentAllocation.service.js";

import { ApiError }
  from "../utils/apiError.js";

import { emitDepartmentInvoiceUpdated }
  from "../utils/departmentInvoiceRealtime.js";


/* ============================================================
   HELPERS
============================================================ */

const money = (
  value
) =>
  Math.round(
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


const nameOf = (
  user
) =>
  String(
    user?.name ||
    user?.displayName ||
    [
      user?.firstName,
      user?.lastName,
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      ) ||
    user?.email ||
    ""
  )
    .trim();


const SOURCE_DEPARTMENT_MAP =
  Object.freeze({

    purchase_invoice:
      "purchase",

    logistics_vendor_payment:
      "logistics",

    logistics_invoice:
      "logistics",

  });


/* ============================================================
   SERVICE
============================================================ */

class DepartmentInvoiceService {

  assertSettlementApproved(row) {
    if (row?.companyAdminApprovalStatus !== "approved") {
      throw new ApiError(
        409,
        row?.companyAdminApprovalStatus === "rejected"
          ? "Company Admin rejected this invoice. Settlement is blocked."
          : "Company Admin approval is required before settlement."
      );
    }
  }

  async actorIdentity(
    companyId,
    user
  ) {

    let employee = null;

    if (user?._id) {
      employee = await Employee.findOne({
        companyId,
        $or: [
          { userId: user._id },
          ...(user.employeeCode ? [{ employeeCode: String(user.employeeCode).toUpperCase() }] : []),
        ],
      })
        .select("_id displayName firstName lastName officialEmail employeeCode")
        .lean();
    }

    return {
      userId: user?._id || null,
      employeeId: employee?._id || user?.employeeId || null,
      name: String(
        employee?.displayName ||
        [employee?.firstName, employee?.lastName].filter(Boolean).join(" ") ||
        nameOf(user) ||
        employee?.officialEmail ||
        employee?.employeeCode ||
        ""
      ).trim(),
    };
  }


  /* ==========================================================
     VALIDATE SOURCE IDENTITY
  ========================================================== */

  validateSourceIdentity(
    sourceDepartment,
    sourceModule
  ) {

    const expectedDepartment =
      SOURCE_DEPARTMENT_MAP[
        sourceModule
      ];


    if (
      !expectedDepartment
    ) {

      throw new ApiError(
        400,
        "Unsupported department invoice source module."
      );
    }


    if (
      sourceDepartment !==
      expectedDepartment
    ) {

      throw new ApiError(
        400,
        "Source department does not match the selected source module."
      );
    }
  }


  /* ==========================================================
     HANDOFF / REGISTER IN ACCOUNTS

     Important:
     - Idempotent per company + source module + source record.
     - Does NOT create accounting ledger entries.
     - Purchase's existing payable voucher flow remains separate.
     - Logistics handoff amount represents the outstanding amount
       at the moment Accounts takes financial authority.
  ========================================================== */

  async handoff(
    data
  ) {

    if (
      !data?.companyId
    ) {

      throw new ApiError(
        400,
        "Company ID is required."
      );
    }


    if (
      !mongoose.isValidObjectId(
        data.sourceRecordId
      )
    ) {

      throw new ApiError(
        400,
        "Invalid source record ID."
      );
    }


    this.validateSourceIdentity(
      data.sourceDepartment,
      data.sourceModule
    );


    const existing =
      await repository
        .findBySource(
          data.companyId,
          data.sourceModule,
          data.sourceRecordId
        );


    if (
      existing
    ) {

      return this.refreshPurchaseSettlement(
        existing
      );
    }


    const totalAmount =
      money(
        data.totalAmount
      );


    if (
      totalAmount <=
      0
    ) {

      throw new ApiError(
        400,
        "Invoice amount must be greater than zero."
      );
    }


    const row =
      await repository
        .createIdempotent({

          ...data,

          currency:
            String(
              data.currency ||
              "INR"
            )
              .trim()
              .toUpperCase(),

          totalAmount,

          paidAmount:
            0,

          remainingAmount:
            totalAmount,

          status:
            "sent",

          sentToAccountsAt:
            new Date(),

          documents:
            (
              Array.isArray(
                data.documents
              )
                ? data.documents
                : []
            )
              .filter(
                item =>
                  item?.fileUrl ||
                  item?.filePath
              ),

        });


    const refreshed = await this.refreshPurchaseSettlement(row);
    emitDepartmentInvoiceUpdated(refreshed, "handed_off");
    return refreshed;
  }


  /* ==========================================================
     LIST
  ========================================================== */

  async list(
    companyId,
    query
  ) {

    const result =
      await repository
        .list(
          companyId,
          query
        );


    result.rows =
      await this.refreshPurchaseSettlements(
        companyId,
        result.rows
      );


    return result;
  }


  /* ==========================================================
     GET
  ========================================================== */

  async get(
    companyId,
    id
  ) {

    let row =
      await repository
        .findById(
          companyId,
          id
        );


    if (
      !row
    ) {

      throw new ApiError(
        404,
        "Department invoice was not found."
      );
    }


    row =
      await this.refreshPurchaseSettlement(
        row
      );


    return row;
  }


  /* ==========================================================
  GET DOCUMENT

  Returns metadata/reference only.

  Physical file resolution and streaming remain in the
  controller so this service does not become HTTP-aware.

  Document index is used because DepartmentInvoice document
  subdocuments intentionally have _id disabled.
========================================================== */

async getDocument(
 companyId,
 id,
 index
) {

 const documentIndex =
   Number(
     index
   );


 if (
   !Number.isInteger(
     documentIndex
   ) ||
   documentIndex <
     0
 ) {

   throw new ApiError(
     400,
     "Invalid invoice document index."
   );
 }


 const row =
   await this.get(
     companyId,
     id
   );


 const documents =
   Array.isArray(
     row?.documents
   )
     ? row.documents
     : [];


 const document =
   documents[
     documentIndex
   ];


 if (
   !document ||
   (
     !String(
       document.fileUrl ||
       ""
     ).trim() &&
     !String(
       document.filePath ||
       ""
     ).trim()
   )
 ) {

   throw new ApiError(
     404,
     "Invoice document was not found."
   );
 }


 return {

   index:
     documentIndex,

   sourceModule:
     row.sourceModule,

   sourceRecordId:
     row.sourceRecordId,

   label:
     String(
       document.label ||
       "Invoice Document"
     )
       .trim(),

   fileName:
     String(
       document.fileName ||
       ""
     )
       .trim(),

   fileUrl:
     String(
       document.fileUrl ||
       ""
     )
       .trim(),

   filePath:
     String(
       document.filePath ||
       ""
     )
       .trim(),

   mimeType:
     String(
       document.mimeType ||
       ""
     )
       .trim(),

 };
}

  /* ==========================================================
     VERIFY
  ========================================================== */

  async verify(
    companyId,
    id,
    payload,
    user
  ) {

    if (
      !user?._id
    ) {

      throw new ApiError(
        401,
        "Authenticated Accounts user is required."
      );
    }


    const session =
      await mongoose
        .startSession();


    let updated =
      null;


    try {

      await session
        .withTransaction(
          async () => {

            updated =
              await repository
                .updateById(
                  companyId,
                  id,
                  {

                    status: {
                      $in: [
                        "sent",
                        "under_review",
                      ],
                    },

                  },
                  {

                    $set: {

                      status:
                        "verified",

                      verifiedBy:
                        user._id,

                      verifiedByName:
                        nameOf(
                          user
                        ),

                      verifiedAt:
                        new Date(),

                      companyAdminApprovalStatus:
                        "pending",

                      companyAdminApprovalBy:
                        null,

                      companyAdminApprovalByEmployeeId:
                        null,

                      companyAdminApprovalByName:
                        "",

                      companyAdminApprovalAt:
                        null,

                      companyAdminApprovalRemarks:
                        "",

                      accountsRemarks:
                        String(
                          payload?.remarks ||
                          ""
                        )
                          .trim(),

                      rejectedBy:
                        null,

                      rejectedByName:
                        "",

                      rejectedAt:
                        null,

                      rejectionReason:
                        "",

                    },

                  },
                  {
                    session,
                  }
                );


            if (
              !updated
            ) {

              throw new ApiError(
                409,
                "Only a submitted invoice can be verified."
              );
            }


            await this.syncSource(
              updated,
              session
            );

          }
        );


      return updated;

    } finally {

      await session
        .endSession();
    }
  }


  async decideCompanyAdminApproval(
    companyId,
    id,
    payload,
    user
  ) {

    if (!user?._id) {
      throw new ApiError(401, "Authenticated Company Admin is required.");
    }

    const decision = String(payload?.decision || "").trim();
    const remarks = String(payload?.remarks || "").trim();
    let current = await repository.findById(companyId, id);

    if (!current) {
      throw new ApiError(404, "Department invoice was not found.");
    }

    if (
      current.companyAdminApprovalStatus === decision &&
      String(current.companyAdminApprovalRemarks || "").trim() === remarks
    ) {
      return current;
    }

    if (current.companyAdminApprovalStatus !== "pending" || current.status !== "verified") {
      throw new ApiError(409, "Invoice approval state has already changed.");
    }

    const identity = await this.actorIdentity(companyId, user);
    const decidedAt = new Date();
    const session = await mongoose.startSession();
    let updated = null;

    try {
      await session.withTransaction(async () => {
        updated = await repository.updateById(
          companyId,
          id,
          { status: "verified", companyAdminApprovalStatus: "pending" },
          {
            $set: {
              companyAdminApprovalStatus: decision,
              companyAdminApprovalBy: identity.userId,
              companyAdminApprovalByEmployeeId: identity.employeeId,
              companyAdminApprovalByName: identity.name,
              companyAdminApprovalAt: decidedAt,
              companyAdminApprovalRemarks: remarks,
            },
          },
          { session }
        );

        if (!updated) {
          throw new ApiError(409, "Invoice approval state changed. Please refresh and retry.");
        }

        await this.syncSource(updated, session);
      });

      return updated;
    } finally {
      await session.endSession();
    }
  }


  /* ==========================================================
     REJECT
  ========================================================== */

  async reject(
    companyId,
    id,
    reason,
    user
  ) {

    if (
      !user?._id
    ) {

      throw new ApiError(
        401,
        "Authenticated Accounts user is required."
      );
    }


    let current =
      await repository
        .findById(
          companyId,
          id
        );


    if (
      !current
    ) {

      throw new ApiError(
        404,
        "Department invoice was not found."
      );
    }


    current =
      await this.refreshPurchaseSettlement(
        current
      );


    if (
      money(
        current.paidAmount
      ) >
      0 ||
      [
        "partially_paid",
        "paid",
      ]
        .includes(
          current.status
        )
    ) {

      throw new ApiError(
        409,
        "Paid invoices cannot be rejected."
      );
    }


    const session =
      await mongoose
        .startSession();


    let updated =
      null;


    try {

      await session
        .withTransaction(
          async () => {

            updated =
              await repository
                .updateById(
                  companyId,
                  id,
                  {

                    status: {
                      $in: [
                        "sent",
                        "under_review",
                      ],
                    },

                    paidAmount:
                      0,

                    companyAdminApprovalStatus:
                      "not_submitted",

                  },
                  {

                    $set: {

                      status:
                        "rejected",

                      rejectedBy:
                        user._id,

                      rejectedByName:
                        nameOf(
                          user
                        ),

                      rejectedAt:
                        new Date(),

                      rejectionReason:
                        String(
                          reason ||
                          ""
                        )
                          .trim(),

                    },

                  },
                  {
                    session,
                  }
                );


            if (
              !updated
            ) {

              throw new ApiError(
                409,
                "Invoice cannot be rejected because its state has changed."
              );
            }


            await this.syncSource(
              updated,
              session
            );

          }
        );


      return updated;

    } finally {

      await session
        .endSession();
    }
  }


  /* ==========================================================
     RECORD PAYMENT

     Purchase:
       Payment Voucher -> PaymentAllocation

     Logistics Vendor Payment:
       Accounts records payable settlement here.

     Logistics Invoice:
       Accounts records customer receipt here.
  ========================================================== */

  async pay(
    companyId,
    id,
    payload,
    user
  ) {

    if (
      !user?._id
    ) {

      throw new ApiError(
        401,
        "Authenticated Accounts user is required."
      );
    }


    const beforePayment =
      await repository
        .findById(
          companyId,
          id
        );


    if (
      !beforePayment
    ) {

      throw new ApiError(
        404,
        "Department invoice was not found."
      );
    }


    if (
      beforePayment.sourceModule ===
      "purchase_invoice"
    ) {

      throw new ApiError(
        409,
        "Purchase Invoice payments must be recorded through the existing Accounts Payment Voucher and Payment Allocation flow."
      );
    }


    if (
      ![
        "logistics_vendor_payment",
        "logistics_invoice",
      ]
        .includes(
          beforePayment.sourceModule
        )
    ) {

      throw new ApiError(
        409,
        "Direct payment is not supported for this invoice source."
      );
    }


    const session =
      await mongoose
        .startSession();


    let updated =
      null;


    try {

      await session
        .withTransaction(
          async () => {

            const current =
              await repository
                .findById(
                  companyId,
                  id,
                  {
                    session,
                  }
                );


            if (
              !current
            ) {

              throw new ApiError(
                404,
                "Department invoice was not found."
              );
            }


            if (
              ![
                "verified",
                "partially_paid",
              ]
                .includes(
                  current.status
                )
            ) {

              throw new ApiError(
                409,
                "Invoice must be verified before payment."
              );
            }

            this.assertSettlementApproved(current);


            const amount =
              money(
                payload.amount
              );


            const remaining =
              money(
                current.remainingAmount
              );


            if (
              amount <=
              0
            ) {

              throw new ApiError(
                400,
                "Payment amount must be greater than zero."
              );
            }


            if (
              amount >
              remaining
            ) {

              throw new ApiError(
                400,
                "Payment cannot exceed the remaining amount."
              );
            }


            const paidAmount =
              money(
                Number(
                  current.paidAmount ||
                  0
                ) +
                amount
              );


            const remainingAmount =
              money(
                Math.max(
                  0,
                  Number(
                    current.totalAmount ||
                    0
                  ) -
                  paidAmount
                )
              );


            const paymentDate =
              new Date(
                payload.paymentDate
              );


            const payment = {

              amount,

              paymentDate,

              paymentReference:
                String(
                  payload.paymentReference ||
                  ""
                )
                  .trim(),

              paymentMode:
                String(
                  payload.paymentMode ||
                  ""
                )
                  .trim(),

              remarks:
                String(
                  payload.remarks ||
                  ""
                )
                  .trim(),

              recordedBy:
                user._id,

              recordedByName:
                nameOf(
                  user
                ),

              recordedAt:
                new Date(),

            };


            updated =
              await repository
                .updateById(
                  companyId,
                  id,
                  {

                    sourceModule:
                      current.sourceModule,

                    paidAmount:
                      current.paidAmount,

                    remainingAmount:
                      current.remainingAmount,

                    status:
                      current.status,

                  },
                  {

                    $set: {

                      paidAmount,

                      remainingAmount,

                      status:
                        remainingAmount >
                        0
                          ? "partially_paid"
                          : "paid",

                      lastPaymentAt:
                        payment.paymentDate,

                      lastPaymentReference:
                        payment.paymentReference,

                      lastPaidBy:
                        user._id,

                      lastPaidByName:
                        payment.recordedByName,

                    },

                    $push: {

                      payments:
                        payment,

                    },

                  },
                  {
                    session,
                  }
                );


            if (
              !updated
            ) {

              throw new ApiError(
                409,
                "Invoice payment state changed. Please refresh and retry."
              );
            }


            await this.syncSource(
              updated,
              session
            );

          }
        );


      return updated;

    } finally {

      await session
        .endSession();
    }
  }


  /* ==========================================================
     REFRESH PURCHASE SETTLEMENTS FOR PAYMENT VOUCHER

     Called after an Accounts Payment Voucher is posted or
     voided.

     Flow:

       Payment Voucher
            ↓
       PaymentAllocation rows
            ↓
       affected Purchase Invoice IDs
            ↓
       DepartmentInvoice rows
            ↓
       recalculate posted settlement
            ↓
       sync Accounts state back to Purchase Invoice

     Important:
     - Only affected Purchase invoices are refreshed.
     - PaymentAllocation settlement logic counts only posted
       Payment Vouchers.
     - Therefore voiding a Payment Voucher automatically removes
       that voucher from the effective paid total.
  ========================================================== */

  async refreshPurchaseSettlementsForPayment(
    companyId,
    paymentVoucherId,
    action = "payment_posted"
  ) {

    if (
      !companyId
    ) {

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


    const purchaseInvoiceIds =
      await paymentAllocationService
        .purchaseInvoiceIdsForPayment(
          companyId,
          paymentVoucherId
        );


    if (
      !purchaseInvoiceIds.length
    ) {

      return [];
    }


    const sourceIds =
      purchaseInvoiceIds
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
      !sourceIds.length
    ) {

      return [];
    }


    /*
     * We intentionally query the central register directly
     * instead of calling list().
     *
     * list() is paginated and would also refresh unrelated
     * Purchase invoices.
     */
    const rows =
      await repository
        .findBySources(
          companyId,
          "purchase_invoice",
          sourceIds
        );


    if (
      !rows.length
    ) {

      return [];
    }


    const refreshed = await this.refreshPurchaseSettlements(companyId, rows);
    for (const item of refreshed) {
      emitDepartmentInvoiceUpdated(item, action);
    }
    return refreshed;
  }


  /* ==========================================================
     REFRESH ONE PURCHASE SETTLEMENT
  ========================================================== */

  async refreshPurchaseSettlement(
    row
  ) {

    if (
      !row ||
      row.sourceModule !==
      "purchase_invoice"
    ) {

      return row;
    }


    const rows =
      await this.refreshPurchaseSettlements(
        row.companyId,
        [
          row,
        ]
      );


    return rows[0] ||
      row;
  }


  /* ==========================================================
     REFRESH PURCHASE SETTLEMENTS
  ========================================================== */

  async refreshPurchaseSettlements(
    companyId,
    rows
  ) {

    const inputRows =
      Array.isArray(
        rows
      )
        ? rows
        : [];


    const purchaseRows =
      inputRows
        .filter(
          row =>
            row?.sourceModule ===
            "purchase_invoice"
        );


    if (
      !purchaseRows.length
    ) {

      return inputRows;
    }


    const purchaseInvoiceIds =
      purchaseRows
        .map(
          row =>
            row.sourceRecordId
        )
        .filter(
          value =>
            mongoose.isValidObjectId(
              value
            )
        );


    if (
      !purchaseInvoiceIds.length
    ) {

      return inputRows;
    }


    const purchaseInvoices =
      await PurchaseInvoice
        .find({

          companyId,

          _id: {
            $in:
              purchaseInvoiceIds,
          },

        })
        .select(
          "_id invoiceTotal"
        )
        .lean();


    if (
      !purchaseInvoices.length
    ) {

      return inputRows;
    }


    const settlements =
      await paymentAllocationService
        .settlementForInvoices(
          companyId,
          purchaseInvoices
        );


    const invoiceById =
      new Map(
        purchaseInvoices
          .map(
            invoice => [
              String(
                invoice._id
              ),
              invoice,
            ]
          )
      );


    const output =
      [];


    for (
      const row of
      inputRows
    ) {

      if (
        row?.sourceModule !==
        "purchase_invoice"
      ) {

        output.push(
          row
        );

        continue;
      }


      const invoice =
        invoiceById.get(
          String(
            row.sourceRecordId
          )
        );


      if (
        !invoice
      ) {

        output.push(
          row
        );

        continue;
      }


      const settlement =
        settlements.get(
          String(
            invoice._id
          )
        );


      if (
        !settlement
      ) {

        output.push(
          row
        );

        continue;
      }


      const paidAmount =
        money(
          settlement.paidAmount
        );


      const remainingAmount =
        money(
          settlement.outstandingAmount
        );


      let status =
        row.status;


      if (
        row.status !==
        "rejected"
      ) {

        if (
          paidAmount >
          0
        ) {

          status =
            remainingAmount >
            0
              ? "partially_paid"
              : "paid";

        } else if (
          [
            "partially_paid",
            "paid",
          ]
            .includes(
              row.status
            )
        ) {

          status =
            row.verifiedAt
              ? "verified"
              : "sent";
        }
      }


      const needsUpdate =
        money(
          row.paidAmount
        ) !==
          paidAmount ||
        money(
          row.remainingAmount
        ) !==
          remainingAmount ||
        row.status !==
          status;


      if (
        !needsUpdate
      ) {

        output.push(
          row
        );

        continue;
      }


      const refreshed =
        await repository
          .updateById(
            companyId,
            row._id,
            {
              sourceModule:
                "purchase_invoice",
            },
            {
              $set: {

                paidAmount,

                remainingAmount,

                status,

              },
            }
          );


      const effective =
        refreshed ||
        {
          ...row,
          paidAmount,
          remainingAmount,
          status,
        };


      await this.syncSource(
        effective
      );


      output.push(
        effective
      );
    }


    return output;
  }


  /* ==========================================================
     SYNC CENTRAL ACCOUNTS STATE BACK TO SOURCE
  ========================================================== */

  async syncSource(
    row,
    session = null
  ) {

    if (
      !row
    ) {

      throw new ApiError(
        500,
        "Department invoice source synchronization requires a central invoice."
      );
    }


    if (
      !row.sourceRecordId ||
      !mongoose.isValidObjectId(
        row.sourceRecordId
      )
    ) {

      throw new ApiError(
        500,
        "Department invoice contains an invalid source record."
      );
    }


    const genericUpdate = {

      accountsHandoffId:
        row._id,

      accountsStatus:
        row.status,

      accountsPaidAmount:
        money(
          row.paidAmount
        ),

      accountsRemainingAmount:
        money(
          row.remainingAmount
        ),

      accountsPaymentDate:
        row.lastPaymentAt ||
        null,

      accountsPaymentReference:
        row.lastPaymentReference ||
        "",

      accountsPaidByName:
        row.lastPaidByName ||
        "",

      companyAdminApprovalStatus:
        row.companyAdminApprovalStatus ||
        "not_submitted",

      companyAdminApprovalByName:
        row.companyAdminApprovalByName ||
        "",

      companyAdminApprovalAt:
        row.companyAdminApprovalAt ||
        null,

      companyAdminApprovalRemarks:
        row.companyAdminApprovalRemarks ||
        "",

    };


    const options =
      session
        ? {
            session,
          }
        : {};


    /* ========================================================
       PURCHASE INVOICE
    ======================================================== */

    if (
      row.sourceModule ===
      "purchase_invoice"
    ) {

      const result =
        await PurchaseInvoice
          .updateOne(
            {

              _id:
                row.sourceRecordId,

              companyId:
                row.companyId,

            },
            {

              $set:
                genericUpdate,

            },
            options
          );


      if (
        !result?.matchedCount
      ) {

        throw new ApiError(
          409,
          "Purchase Invoice source record could not be synchronized with Accounts."
        );
      }


      return;
    }


    /* ========================================================
       LOGISTICS VENDOR PAYMENT

       Historical Logistics-side payment/advance/deduction
       fields remain untouched.
    ======================================================== */

    if (
      row.sourceModule ===
      "logistics_vendor_payment"
    ) {

      const result =
        await LogisticsVendorPayment
          .updateOne(
            {

              _id:
                row.sourceRecordId,

              companyId:
                row.companyId,

            },
            {

              $set: {

                ...genericUpdate,

                accountsHandedOffBy:
                  row.sentToAccountsBy ||
                  null,

                accountsHandedOffAt:
                  row.sentToAccountsAt ||
                  null,

              },

            },
            options
          );


      if (
        !result?.matchedCount
      ) {

        throw new ApiError(
          409,
          "Logistics Vendor Payment source record could not be synchronized with Accounts."
        );
      }


      return;
    }


    /* ========================================================
       LOGISTICS CUSTOMER INVOICE

       Central totalAmount is the balance that was outstanding
       at handoff.

       Existing amount received before handoff is therefore:

         invoiceTotal - central totalAmount

       Accounts-side receipts are added to that opening amount.
    ======================================================== */

    if (
      row.sourceModule ===
      "logistics_invoice"
    ) {

      let sourceQuery =
        LogisticsInvoice
          .findOne({

            _id:
              row.sourceRecordId,

            companyId:
              row.companyId,

          })
          .select(
            "invoiceTotal status"
          );


      if (
        session
      ) {

        sourceQuery =
          sourceQuery.session(
            session
          );
      }


      const sourceInvoice =
        await sourceQuery
          .lean();


      if (
        !sourceInvoice
      ) {

        throw new ApiError(
          409,
          "Logistics Invoice source record could not be synchronized with Accounts."
        );
      }


      const invoiceTotal =
        money(
          sourceInvoice.invoiceTotal
        );


      const handedOffAmount =
        money(
          row.totalAmount
        );


      const openingReceived =
        money(
          Math.max(
            0,
            invoiceTotal -
            handedOffAmount
          )
        );


      const accountsReceived =
        money(
          row.paidAmount
        );


      const amountReceived =
        money(
          Math.min(
            invoiceTotal,
            openingReceived +
            accountsReceived
          )
        );


      const balanceDue =
        money(
          Math.max(
            0,
            invoiceTotal -
            amountReceived
          )
        );


      let paymentStatus =
        amountReceived <=
        0
          ? "unpaid"
          : balanceDue <=
              0
            ? "paid"
            : "partial";


      if (
        sourceInvoice.status ===
        "cancelled"
      ) {

        paymentStatus =
          "cancelled";
      }


      const result =
        await LogisticsInvoice
          .updateOne(
            {

              _id:
                row.sourceRecordId,

              companyId:
                row.companyId,

            },
            {

              $set: {

                ...genericUpdate,

                accountsHandedOffBy:
                  row.sentToAccountsBy ||
                  null,

                accountsHandedOffAt:
                  row.sentToAccountsAt ||
                  null,

                amountReceived,

                balanceDue,

                paymentStatus,

                ...(
                  accountsReceived >
                  0
                    ? {

                        paymentDate:
                          row.lastPaymentAt ||
                          null,

                        paymentReference:
                          row.lastPaymentReference ||
                          "",

                      }
                    : {}
                ),

              },

            },
            options
          );


      if (
        !result?.matchedCount
      ) {

        throw new ApiError(
          409,
          "Logistics Invoice source record could not be synchronized with Accounts."
        );
      }


      return;
    }


    throw new ApiError(
      400,
      "Unsupported department invoice source module."
    );
  }

}


export default
  new DepartmentInvoiceService();
