import mongoose from "mongoose";

import repo
  from "../repositories/logisticsInvoice.repository.js";

import departmentInvoiceService
  from "./departmentInvoice.service.js";

import { ApiError }
  from "../utils/apiError.js";


class LogisticsInvoiceService {

  /* ============================================================
     ID VALIDATION
  ============================================================ */

  assertId(
    id
  ) {

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {

      throw new ApiError(
        400,
        "Invalid invoice ID"
      );
    }
  }


  /* ============================================================
     WORKSPACE READ VISIBILITY

     Employee:
       normal employee
         -> own workspace only

       department_head / team_leader
         -> department review visibility

     Management:
       existing monitoring visibility preserved

     canHandoffToAccounts is already derived from existing
     Logistics access middleware.

     We intentionally do NOT create any new DB permission.
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


    /*
     * Management retains existing Logistics monitoring access.
     */
    if (
      normalizedAccessType ===
      "management"
    ) {

      return false;
    }


    /*
     * Logistics Senior:
     * department_head / team_leader
     *
     * Senior needs department visibility so junior-created
     * invoices can be reviewed and sent to Accounts.
     */
    if (
      canHandoffToAccounts
    ) {

      return false;
    }


    /*
     * Normal Logistics employee:
     * own workspace only.
     */
    return true;
  }


  /* ============================================================
     GENERATE INVOICE NUMBER
  ============================================================ */

  async number(
    companyId
  ) {

    const d =
      new Date();


    const code =
      `${String(
        d.getFullYear()
      ).slice(
        -2
      )}${String(
        d.getMonth() +
        1
      ).padStart(
        2,
        "0"
      )}${String(
        d.getDate()
      ).padStart(
        2,
        "0"
      )}`;


    const prefix =
      `LINV-${code}-`;


    const last =
      await repo.findLatest({
        companyId,
        prefix,
      });


    const n =
      last?.invoiceNumber
        ? Number(
            last.invoiceNumber
              .split(
                "-"
              )
              .pop()
          ) +
          1
        : 1;


    return `${prefix}${String(
      n
    ).padStart(
      4,
      "0"
    )}`;
  }


  /* ============================================================
     CALCULATE INVOICE
  ============================================================ */

  calculate(
    payload
  ) {

    const items =
      (
        payload.items ||
        []
      )
        .map(
          (
            item
          ) => {

            const base =
              Number(
                item.quantity ||
                0
              ) *
              Number(
                item.rate ||
                0
              );


            const discount =
              Math.min(
                base,
                Number(
                  item.discount ||
                  0
                )
              );


            const taxable =
              Math.max(
                0,
                base -
                discount
              );


            const tax =
              taxable *
              Number(
                item.gstRate ||
                0
              ) /
              100;


            return {

              ...item,

              baseAmount:
                base,

              taxableAmount:
                taxable,

              taxAmount:
                tax,

              total:
                taxable +
                tax,
            };
          }
        );


    const charges =
      (
        payload.additionalCharges ||
        []
      )
        .map(
          (
            charge
          ) => ({

            ...charge,

            amount:
              Number(
                charge.amount ||
                0
              ),
          })
        );


    const itemsSubtotal =
      items.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.taxableAmount,
        0
      );


    const chargeSubtotal =
      charges.reduce(
        (
          sum,
          charge
        ) =>
          sum +
          charge.amount,
        0
      );


    const itemTax =
      items.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.taxAmount,
        0
      );


    const chargeTax =
      charges.reduce(
        (
          sum,
          charge
        ) =>
          sum +
          (
            charge.taxable
              ? charge.amount *
                0.18
              : 0
          ),
        0
      );


    const subtotal =
      itemsSubtotal +
      chargeSubtotal;


    const rawDiscount =
      Number(
        payload.overallDiscount ||
        0
      );


    const discountAmount =
      payload.discountType ===
        "percentage"

        ? Math.min(
            subtotal,
            subtotal *
            rawDiscount /
            100
          )

        : Math.min(
            subtotal,
            rawDiscount
          );


    const taxableAmount =
      Math.max(
        0,
        subtotal -
        discountAmount
      );


    const taxTotal =
      itemTax +
      chargeTax;


    const invoiceTotal =
      Math.max(
        0,
        taxableAmount +
        taxTotal +
        Number(
          payload.roundOff ||
          0
        )
      );


    const received =
      Number(
        payload.amountReceived ||
        0
      );


    if (
      received >
      invoiceTotal
    ) {

      throw new ApiError(
        400,
        "Amount Received cannot exceed Invoice Total"
      );
    }


    let paymentStatus =
      payload.paymentStatus ||
      "unpaid";


    if (
      paymentStatus !==
        "cancelled" &&
      paymentStatus !==
        "other"
    ) {

      paymentStatus =
        received <=
        0
          ? "unpaid"

          : received >=
              invoiceTotal
            ? "paid"

            : "partial";
    }


    return {

      ...payload,

      items,

      additionalCharges:
        charges,

      itemsSubtotal,

      additionalChargeSubtotal:
        chargeSubtotal,

      overallDiscountAmount:
        discountAmount,

      taxableAmount,

      taxTotal,

      invoiceTotal,

      amountReceived:
        received,

      balanceDue:
        Math.max(
          0,
          invoiceTotal -
          received
        ),

      paymentStatus,
    };
  }


  /* ============================================================
     CREATE
  ============================================================ */

  async create({
    companyId,
    userId,
    employeeId,
    payload,
  }) {

    const data =
      this.calculate(
        payload
      );


    if (
      data.status ===
        "issued" &&
      !data.items.length
    ) {

      throw new ApiError(
        400,
        "At least one invoice item is required"
      );
    }


    return repo.create({

      ...data,

      companyId,

      invoiceNumber:
        await this.number(
          companyId
        ),

      createdBy:
        userId,

      createdByEmployeeId:
        employeeId,

      updatedBy:
        userId,
    });
  }


  /* ============================================================
     LIST

     Junior:
       own invoices only

     Senior:
       department/company Logistics invoices for review

     Management:
       existing monitoring view preserved
  ============================================================ */

  async list({
    companyId,
    query,
    userId = null,
    employeeId = null,
    accessType = "",
    canHandoffToAccounts = false,
  }) {

    const restrictToOwner =
      this.restrictReadToOwner({
        accessType,
        canHandoffToAccounts,
      });


    return repo.paginate({

      companyId,

      ...query,

      restrictToOwner,

      employeeId,

      userId,
    });
  }


  /* ============================================================
     GET

     Public/request-facing read visibility.

     Junior cannot manually fetch another employee's invoice.

     Senior can fetch junior invoices for review.

     Management monitoring remains available.
  ============================================================ */

  async get({
    companyId,
    invoiceId,
    userId = null,
    employeeId = null,
    accessType = "",
    canHandoffToAccounts = false,
  }) {

    this.assertId(
      invoiceId
    );


    const restrictToOwner =
      this.restrictReadToOwner({
        accessType,
        canHandoffToAccounts,
      });


    const invoice =
      await repo.findById({

        companyId,

        invoiceId,

        restrictToOwner,

        employeeId,

        userId,
      });


    if (
      !invoice
    ) {

      throw new ApiError(
        404,
        "Logistics invoice not found"
      );
    }


    return invoice;
  }


  /* ============================================================
     INTERNAL COMPANY-SCOPED GET

     Used only by controlled service workflows.

     This avoids a problem where creator ownership checks need
     to inspect the actual record before deciding whether an
     operation is allowed.

     It remains company scoped and is NOT exposed directly as
     an unrestricted API operation.
  ============================================================ */

  async getInternal({
    companyId,
    invoiceId,
  }) {

    this.assertId(
      invoiceId
    );


    const invoice =
      await repo.findById({

        companyId,

        invoiceId,

        restrictToOwner:
          false,
      });


    if (
      !invoice
    ) {

      throw new ApiError(
        404,
        "Logistics invoice not found"
      );
    }


    return invoice;
  }


  /* ============================================================
     UPDATE

     Creator only.

     Senior reviewing a junior-created invoice does NOT receive
     edit authority.

     Accounts fields and ownership fields are protected.
  ============================================================ */

  async update({
    companyId,
    invoiceId,
    userId,
    employeeId = null,
    userName = "",
    payload,
  }) {

    const old =
      await this.getInternal({
        companyId,
        invoiceId,
      });


    this.assertNotHandedOff(
      old
    );


    this.assertRecordOwner({
      invoice:
        old,

      employeeId,

      userId,
    });


    const safePayload = {
      ...payload,
    };


    /* ========================================================
       ACCOUNTS-CONTROLLED FIELDS
    ======================================================== */

    delete safePayload.accountsHandoffId;
    delete safePayload.accountsStatus;
    delete safePayload.accountsHandedOffBy;
    delete safePayload.accountsHandedOffAt;
    delete safePayload.accountsPaidAmount;
    delete safePayload.accountsRemainingAmount;
    delete safePayload.accountsPaymentDate;
    delete safePayload.accountsPaymentReference;
    delete safePayload.accountsPaidByName;


    /* ========================================================
       OWNERSHIP / SYSTEM FIELDS
    ======================================================== */

    delete safePayload.createdBy;
    delete safePayload.createdByEmployeeId;
    delete safePayload.updatedBy;
    delete safePayload.editHistory;
    delete safePayload.invoiceCopy;


    const data =
      this.calculate({

        ...old,

        ...safePayload,

        items:
          safePayload.items ||
          old.items,

        additionalCharges:
          safePayload.additionalCharges ||
          old.additionalCharges,
      });


    /*
     * `old` contains populated creator objects.
     * Never persist those objects back into ObjectId fields.
     */

    delete data._id;
    delete data.companyId;
    delete data.invoiceNumber;
    delete data.createdAt;
    delete data.updatedAt;

    delete data.createdBy;
    delete data.createdByEmployeeId;
    delete data.updatedBy;
    delete data.editHistory;
    delete data.invoiceCopy;

    delete data.accountsHandoffId;
    delete data.accountsStatus;
    delete data.accountsHandedOffBy;
    delete data.accountsHandedOffAt;
    delete data.accountsPaidAmount;
    delete data.accountsRemainingAmount;
    delete data.accountsPaymentDate;
    delete data.accountsPaymentReference;
    delete data.accountsPaidByName;


    const auditEntry = {

      changedBy:
        userId,

      changedByName:
        String(
          userName ||
          ""
        ).trim(),

      changedAt:
        new Date(),
    };


    const invoice =
      await repo.update({

        companyId,

        invoiceId,

        employeeId,

        userId,

        auditEntry,

        payload: {

          ...data,

          updatedBy:
            userId,
        },
      });


    if (
      !invoice
    ) {

      await this.throwMutationFailure({

        companyId,

        invoiceId,

        employeeId,

        userId,
      });
    }


    return invoice;
  }


  /* ============================================================
     ATTACH / REPLACE INVOICE COPY

     Creator only.

     Senior:
       may review/download junior document
       may NOT upload or replace it

     Document replacement is added to editHistory.
  ============================================================ */

  async attachInvoiceCopy({
    companyId,
    invoiceId,
    userId,
    employeeId = null,
    userName = "",
    file,
  }) {

    const current =
      await this.getInternal({
        companyId,
        invoiceId,
      });


    this.assertNotHandedOff(
      current
    );


    this.assertRecordOwner({
      invoice:
        current,

      employeeId,

      userId,
    });


    if (
      !file
    ) {

      throw new ApiError(
        400,
        "Invoice copy file is required"
      );
    }


    const invoiceCopy = {

      fileName:
        file.filename,

      originalName:
        file.originalname,

      filePath:
        file.path,

      fileUrl:
        `/uploads/logistics-documents/${file.filename}`,

      mimeType:
        file.mimetype,

      fileSize:
        file.size,

      uploadedAt:
        new Date(),

      uploadedBy:
        userId,
    };


    const auditEntry = {

      changedBy:
        userId,

      changedByName:
        String(
          userName ||
          ""
        ).trim(),

      changedAt:
        new Date(),
    };


    const invoice =
      await repo.updateInvoiceCopy({

        companyId,

        invoiceId,

        invoiceCopy,

        updatedBy:
          userId,

        employeeId,

        userId,

        auditEntry,
      });


    if (
      !invoice
    ) {

      await this.throwMutationFailure({

        companyId,

        invoiceId,

        employeeId,

        userId,
      });
    }


    return invoice;
  }


  /* ============================================================
     HANDOFF CUSTOMER INVOICE TO ACCOUNTS

     IMPORTANT:

     Creator ownership is deliberately NOT required.

     Senior may send an eligible junior-created invoice to
     Accounts without editing the junior's work.

     Logistics Invoice = customer receivable.

     Accounts receives only current outstanding balance.
  ============================================================ */

  async handoffToAccounts({
    companyId,
    invoiceId,
    userId = null,
    employeeId = null,
    userName = "",
    canHandoffToAccounts = false,
  }) {

    if (
      !canHandoffToAccounts
    ) {

      throw new ApiError(
        403,
        "Only Logistics Department Head or Team Leader can send an Invoice to Accounts"
      );
    }


    /*
     * Senior authorization has already been established.
     *
     * Company-scoped internal read is intentional because
     * senior must be able to review/handoff junior invoices.
     */

    const invoice =
      await this.getInternal({
        companyId,
        invoiceId,
      });


    /* ========================================================
       IDEMPOTENT RETRY
    ======================================================== */

    if (
      invoice.accountsHandoffId
    ) {

      return invoice;
    }


    /* ========================================================
       INVOICE MUST BE ISSUED
    ======================================================== */

    if (
      invoice.status !==
      "issued"
    ) {

      throw new ApiError(
        409,
        "Only an issued Logistics Invoice can be sent to Accounts"
      );
    }


    if (
      invoice.paymentStatus ===
      "cancelled"
    ) {

      throw new ApiError(
        409,
        "Cancelled Logistics Invoice cannot be sent to Accounts"
      );
    }


    /* ========================================================
       CURRENT RECEIVABLE
    ======================================================== */

    const outstanding =
      money(
        invoice.balanceDue
      );


    if (
      outstanding <=
      0
    ) {

      throw new ApiError(
        409,
        "This Logistics Invoice has no outstanding balance to send to Accounts"
      );
    }


    /* ========================================================
       INVOICE COPY REQUIRED
    ======================================================== */

    if (
      !invoice.invoiceCopy?.fileUrl
    ) {

      throw new ApiError(
        409,
        "Upload the Invoice Copy before sending this invoice to Accounts"
      );
    }


    const documents = [

      {
        label:
          "Logistics Customer Invoice",

        fileName:
          invoice.invoiceCopy
            ?.originalName ||
          invoice.invoiceCopy
            ?.fileName ||
          invoice.invoiceNumber,

        fileUrl:
          invoice.invoiceCopy
            .fileUrl,

        filePath:
          invoice.invoiceCopy
            ?.filePath ||
          "",

        mimeType:
          invoice.invoiceCopy
            ?.mimeType ||
          "",
      },

    ];


    /* ========================================================
       CENTRAL ACCOUNTS REGISTER

       No ledger
       No journal
       No voucher

       DepartmentInvoice remains the central handoff register.
    ======================================================== */

    const centralInvoice =
      await departmentInvoiceService
        .handoff({

          companyId:
            invoice.companyId,

          sourceDepartment:
            "logistics",

          sourceModule:
            "logistics_invoice",

          sourceRecordId:
            invoice._id,

          invoiceNumber:
            invoice.invoiceNumber,

          invoiceDate:
            invoice.invoiceDate,

          partyName:
            invoice.customerName,

          currency:
            invoice.currency ||
            "INR",

          /*
           * Accounts receives current receivable only.
           */
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


    await departmentInvoiceService
      .syncSource(
        centralInvoice
      );


    /*
     * Return refreshed company-scoped record because this is an
     * already-authorized senior handoff operation.
     */

    return this.getInternal({
      companyId,
      invoiceId,
    });
  }


  /* ============================================================
     REMOVE

     Creator only.

     Senior cannot delete junior-created invoice.

     Accounts handoff remains an immutable lock.
  ============================================================ */

  async remove({
    companyId,
    invoiceId,
    userId,
    employeeId = null,
    userName = "",
  }) {

    const invoice =
      await this.getInternal({
        companyId,
        invoiceId,
      });


    this.assertNotHandedOff(
      invoice
    );


    this.assertRecordOwner({
      invoice,

      employeeId,

      userId,
    });


    const auditEntry = {

      changedBy:
        userId,

      changedByName:
        String(
          userName ||
          ""
        ).trim(),

      changedAt:
        new Date(),
    };


    const removed =
      await repo.softDelete({

        companyId,

        invoiceId,

        userId,

        employeeId,

        auditEntry,
      });


    if (
      !removed
    ) {

      await this.throwMutationFailure({

        companyId,

        invoiceId,

        employeeId,

        userId,
      });
    }


    return removed;
  }


  /* ============================================================
     SUMMARY

     Junior:
       own workspace totals

     Senior:
       department Logistics totals

     Management:
       existing monitoring totals
  ============================================================ */

  async summary({
    companyId,
    userId = null,
    employeeId = null,
    accessType = "",
    canHandoffToAccounts = false,
  }) {

    const restrictToOwner =
      this.restrictReadToOwner({
        accessType,
        canHandoffToAccounts,
      });


    const [
      result,
    ] =
      await repo.summary({

        companyId,

        restrictToOwner,

        employeeId,

        userId,
      });


    return result ||
      {

        totalInvoices:
          0,

        totalBilled:
          0,

        totalReceived:
          0,

        totalOutstanding:
          0,

        draft:
          0,

        issued:
          0,
      };
  }


  /* ============================================================
     CREATOR OWNERSHIP

     Preferred:
       createdByEmployeeId

     Legacy fallback:
       createdBy user id only when employee ownership was not
       stored on the older record.

     Works with both:
       ObjectId
       populated object
  ============================================================ */

  isRecordOwner({
    invoice,
    employeeId = null,
    userId = null,
  }) {

    if (
      !invoice
    ) {

      return false;
    }


    const recordEmployeeId =
      idValue(
        invoice.createdByEmployeeId
      );


    const requesterEmployeeId =
      idValue(
        employeeId
      );


    const recordUserId =
      idValue(
        invoice.createdBy
      );


    const requesterUserId =
      idValue(
        userId
      );


    /*
     * Employee ownership is authoritative once it exists.
     */
    if (
      recordEmployeeId
    ) {

      return Boolean(
        requesterEmployeeId &&
        requesterEmployeeId ===
          recordEmployeeId
      );
    }


    /*
     * Legacy record fallback.
     */
    return Boolean(
      requesterUserId &&
      recordUserId &&
      requesterUserId ===
        recordUserId
    );
  }


  assertRecordOwner({
    invoice,
    employeeId = null,
    userId = null,
  }) {

    if (
      !this.isRecordOwner({

        invoice,

        employeeId,

        userId,
      })
    ) {

      throw new ApiError(
        403,
        "You can modify only Logistics Invoices created in your own workspace"
      );
    }
  }


  /* ============================================================
     HANDOFF LOCK
  ============================================================ */

  assertNotHandedOff(
    invoice
  ) {

    if (
      invoice?.accountsHandoffId
    ) {

      throw new ApiError(
        409,
        "This Logistics Invoice has already been sent to Accounts and is read-only for Logistics financial changes"
      );
    }
  }


  /* ============================================================
     ATOMIC MUTATION FAILURE

     Distinguishes:

     404
       deleted / missing invoice

     409
       Accounts handoff happened concurrently

     403
       requester is not creator

     409
       another concurrent state change
  ============================================================ */

  async throwMutationFailure({
    companyId,
    invoiceId,
    employeeId = null,
    userId = null,
  }) {

    const current =
      await repo.findById({

        companyId,

        invoiceId,

        restrictToOwner:
          false,
      });


    if (
      !current
    ) {

      throw new ApiError(
        404,
        "Logistics invoice not found"
      );
    }


    if (
      current.accountsHandoffId
    ) {

      throw new ApiError(
        409,
        "This Logistics Invoice has already been sent to Accounts and is read-only for Logistics financial changes"
      );
    }


    if (
      !this.isRecordOwner({

        invoice:
          current,

        employeeId,

        userId,
      })
    ) {

      throw new ApiError(
        403,
        "You can modify only Logistics Invoices created in your own workspace"
      );
    }


    throw new ApiError(
      409,
      "Logistics invoice state changed. Please refresh and retry"
    );
  }
}


/* ============================================================
   OBJECT ID / POPULATED REFERENCE
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
      value.id
    ) {

      return String(
        value.id
      );
    }
  }


  return String(
    value
  );
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


export default new LogisticsInvoiceService();