import mongoose from "mongoose";

import {
  VOUCHER_PREFIXES,
  VOUCHER_TYPES,
} from "../constants/accounting.js";

import voucherRepository
  from "../repositories/voucher.repository.js";


import chartOfAccountRepository
  from "../repositories/chartOfAccount.repository.js";
import journalEntryService
  from "./journalEntry.service.js";


/* ============================================================
   HELPERS
============================================================ */

const roundMoney =
  (
    value
  ) =>
    Math.round(
      Number(
        value ||
        0
      ) * 100
    ) / 100;


/* ============================================================
   VOUCHER SERVICE
============================================================ */

export class VoucherService {

  constructor(
    {
      voucherRepository:
        repository =
          voucherRepository,

      journalService:
        journal =
          journalEntryService,

      chartRepository:
        chart =
          chartOfAccountRepository,


      sessionProvider:
        sessions =
          mongoose,
    } = {}
  ) {

    this.voucherRepository =
      repository;


    this.journalService =
      journal;


    this.chartRepository =
      chart;


    this.sessionProvider =
      sessions;

  }


  /* ==========================================================
     INDIA FINANCIAL YEAR

     01 April -> 31 March
  ========================================================== */

  resolveFinancialYear(
    value
  ) {

    const date =
      new Date(
        value
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      throw new Error(
        "Invalid Voucher date."
      );
    }


    const year =
      date.getUTCFullYear();


    const month =
      date.getUTCMonth() + 1;


    const startYear =
      month >= 4
        ? year
        : year - 1;


    const endYear =
      startYear + 1;


    const endYearShort =
      String(
        endYear
      )
        .slice(
          -2
        );


    return (
      `${startYear}-${endYearShort}`
    );

  }


  /* ==========================================================
     TALLY-STYLE VOUCHER NUMBER
  ========================================================== */

  async buildVoucherNumber({
    companyId,
    voucherType,
    voucherDate,
  }) {

    if (
      !companyId
    ) {

      throw new Error(
        "Company ID is required."
      );
    }


    if (
      !VOUCHER_TYPES.includes(
        voucherType
      )
    ) {

      throw new Error(
        "Invalid voucher type."
      );
    }


    const prefix =
      VOUCHER_PREFIXES[
        voucherType
      ];


    const financialYear =
      this.resolveFinancialYear(
        voucherDate
      );


    const lastVoucher =
      await this
        .voucherRepository
        .findLastVoucherNumber({

          companyId,

          financialYear,

          voucherType,

          prefix,

        });


    let nextSequence =
      1;


    if (
      lastVoucher?.voucherNumber
    ) {

      const parts =
        String(
          lastVoucher.voucherNumber
        )
          .split(
            "/"
          );


      const lastSequence =
        Number(
          parts[
            parts.length - 1
          ]
        );


      if (
        Number.isFinite(
          lastSequence
        ) &&
        lastSequence >= 0
      ) {

        nextSequence =
          lastSequence + 1;

      }

    }


    const sequence =
      String(
        nextSequence
      )
        .padStart(
          6,
          "0"
        );


    return [
      prefix,
      financialYear,
      sequence,
    ].join("/");

  }


  /* ==========================================================
     CALCULATE TOTALS

     Client totals are never trusted.
  ========================================================== */

  calculateTotals(
    lines
  ) {

    const totalDebit =
      roundMoney(
        (
          Array.isArray(
            lines
          )
            ? lines
            : []
        )
          .reduce(
            (
              total,
              line
            ) =>
              total +
              Number(
                line.debit ||
                0
              ),
            0
          )
      );


    const totalCredit =
      roundMoney(
        (
          Array.isArray(
            lines
          )
            ? lines
            : []
        )
          .reduce(
            (
              total,
              line
            ) =>
              total +
              Number(
                line.credit ||
                0
              ),
            0
          )
      );


    return {
      totalDebit,
      totalCredit,
    };

  }


  /* ==========================================================
     LIST VOUCHERS
  ========================================================== */

  async getVouchers({
    companyId,
    query = {},
  }) {

    if (
      !companyId
    ) {

      throw new Error(
        "Company ID is required."
      );
    }


    return this
      .voucherRepository
      .list({

        companyId,

        ...query,

      });

  }


  /* ==========================================================
     GET VOUCHER
  ========================================================== */

  async getVoucherById({
    companyId,
    voucherId,
  }) {

    if (
      !companyId
    ) {

      throw new Error(
        "Company ID is required."
      );
    }


    if (
      !voucherId
    ) {

      throw new Error(
        "Voucher ID is required."
      );
    }


    const voucher =
      await this
        .voucherRepository
        .findById({

          companyId,

          voucherId,

        });


    if (
      !voucher
    ) {

      throw new Error(
        "Voucher not found."
      );
    }


    return voucher;

  }


  async validatePaymentVoucher({
    companyId,
    lines,
    session = null,
  }) {

    let hasCashOrBankCredit =
      false;


    for (const line of lines || []) {

      const account =
        await this.chartRepository
          .findById({
            companyId,
            accountId:
              line.accountId,
            session,
          });


      if (!account) {
        throw new Error(
          "Payment Voucher account not found."
        );
      }


      if (account.status !== "active") {
        throw new Error(
          "Payment Voucher requires active accounts."
        );
      }


      const isCashOrBank =
        account.accountType === "cash" ||
        account.accountType === "bank";


      const debit =
        roundMoney(line.debit);

      const credit =
        roundMoney(line.credit);


      if (
        isCashOrBank &&
        debit > 0
      ) {
        throw new Error(
          "Cash or Bank account cannot be debited in a Payment Voucher."
        );
      }


      if (
        credit > 0 &&
        !isCashOrBank
      ) {
        throw new Error(
          "Only Cash or Bank accounts may be credited in a Payment Voucher."
        );
      }


      if (
        isCashOrBank &&
        credit > 0
      ) {
        hasCashOrBankCredit =
          true;
      }

    }


    if (!hasCashOrBankCredit) {
      throw new Error(
        "Payment Voucher requires a Cash or Bank credit line."
      );
    }

  }


  async validateReceiptVoucher({
    companyId,
    lines,
    session = null,
  }) {

    let hasCashOrBankDebit =
      false;


    for (const line of lines || []) {

      const account =
        await this.chartRepository
          .findById({
            companyId,
            accountId:
              line.accountId,
            session,
          });


      if (!account) {
        throw new Error(
          "Receipt Voucher account not found."
        );
      }


      if (account.status !== "active") {
        throw new Error(
          "Receipt Voucher requires active accounts."
        );
      }


      const isCashOrBank =
        account.accountType === "cash" ||
        account.accountType === "bank";


      const debit =
        roundMoney(line.debit);

      const credit =
        roundMoney(line.credit);


      if (
        debit > 0 &&
        !isCashOrBank
      ) {
        throw new Error(
          "Only Cash or Bank accounts may be debited in a Receipt Voucher."
        );
      }


      if (
        isCashOrBank &&
        credit > 0
      ) {
        throw new Error(
          "Cash or Bank account cannot be credited in a Receipt Voucher."
        );
      }


      if (
        isCashOrBank &&
        debit > 0
      ) {
        hasCashOrBankDebit =
          true;
      }

    }


    if (!hasCashOrBankDebit) {
      throw new Error(
        "Receipt Voucher requires a Cash or Bank debit line."
      );
    }

  }


  async validateContraVoucher({
    companyId,
    lines,
    session = null,
  }) {

    for (const line of lines || []) {

      const account =
        await this.chartRepository
          .findById({
            companyId,
            accountId:
              line.accountId,
            session,
          });


      if (!account) {
        throw new Error(
          "Contra Voucher account not found."
        );
      }


      if (account.status !== "active") {
        throw new Error(
          "Contra Voucher requires active accounts."
        );
      }


      const isCashOrBank =
        account.accountType === "cash" ||
        account.accountType === "bank";


      const debit =
        roundMoney(line.debit);

      const credit =
        roundMoney(line.credit);


      if (
        debit > 0 &&
        !isCashOrBank
      ) {
        throw new Error(
          "Only Cash or Bank accounts may be debited in a Contra Voucher."
        );
      }


      if (
        credit > 0 &&
        !isCashOrBank
      ) {
        throw new Error(
          "Only Cash or Bank accounts may be credited in a Contra Voucher."
        );
      }

    }

  }


  async validateSalesVoucher({
    companyId,
    lines,
    session = null,
  }) {

    let hasSalesOrIncomeCredit =
      false;


    for (const line of lines || []) {

      const account =
        await this.chartRepository
          .findById({
            companyId,
            accountId:
              line.accountId,
            session,
          });


      if (!account) {
        throw new Error(
          "Sales Voucher account not found."
        );
      }


      if (account.status !== "active") {
        throw new Error(
          "Sales Voucher requires active accounts."
        );
      }


      const isDebitAllowed =
        account.accountType ===
          "accounts_receivable" ||
        account.accountType ===
          "cash" ||
        account.accountType ===
          "bank";


      const isSalesOrIncome =
        account.accountType ===
          "sales" ||
        account.accountType ===
          "direct_income" ||
        account.accountType ===
          "indirect_income";


      const isCreditAllowed =
        isSalesOrIncome ||
        account.accountType ===
          "tax";


      const debit =
        roundMoney(line.debit);

      const credit =
        roundMoney(line.credit);


      if (
        debit > 0 &&
        !isDebitAllowed
      ) {
        throw new Error(
          "Only Customer/Accounts Receivable, Cash or Bank accounts may be debited in a Sales Voucher."
        );
      }


      if (
        credit > 0 &&
        !isCreditAllowed
      ) {
        throw new Error(
          "Only Sales, Income or Tax accounts may be credited in a Sales Voucher."
        );
      }


      if (
        credit > 0 &&
        isSalesOrIncome
      ) {
        hasSalesOrIncomeCredit =
          true;
      }

    }


    if (!hasSalesOrIncomeCredit) {
      throw new Error(
        "Sales Voucher requires a Sales or Income credit line."
      );
    }

  }


  async validatePurchaseVoucher({
    companyId,
    lines,
    session = null,
  }) {

    let hasPurchaseDebit =
      false;


    for (const line of lines || []) {

      const account =
        await this.chartRepository
          .findById({
            companyId,
            accountId:
              line.accountId,
            session,
          });


      if (!account) {
        throw new Error(
          "Purchase Voucher account not found."
        );
      }


      if (account.status !== "active") {
        throw new Error(
          "Purchase Voucher requires active accounts."
        );
      }


      const isPurchase =
        account.accountType ===
          "purchase";


      const isDebitAllowed =
        isPurchase ||
        account.accountType ===
          "tax";


      const isCreditAllowed =
        account.accountType ===
          "accounts_payable" ||
        account.accountType ===
          "cash" ||
        account.accountType ===
          "bank";


      const debit =
        roundMoney(line.debit);

      const credit =
        roundMoney(line.credit);


      if (
        debit > 0 &&
        !isDebitAllowed
      ) {
        throw new Error(
          "Only Purchase or Tax accounts may be debited in a Purchase Voucher."
        );
      }


      if (
        credit > 0 &&
        !isCreditAllowed
      ) {
        throw new Error(
          "Only Accounts Payable, Cash or Bank accounts may be credited in a Purchase Voucher."
        );
      }


      if (
        debit > 0 &&
        isPurchase
      ) {
        hasPurchaseDebit =
          true;
      }

    }


    if (!hasPurchaseDebit) {
      throw new Error(
        "Purchase Voucher requires a Purchase debit line."
      );
    }

  }


  async validateCreditNoteVoucher({
    companyId,
    lines,
    session = null,
  }) {

    let hasSalesOrIncomeDebit =
      false;


    for (const line of lines || []) {

      const account =
        await this.chartRepository
          .findById({
            companyId,
            accountId:
              line.accountId,
            session,
          });


      if (!account) {
        throw new Error(
          "Credit Note account not found."
        );
      }


      if (account.status !== "active") {
        throw new Error(
          "Credit Note requires active accounts."
        );
      }


      const isSalesOrIncome =
        account.accountType ===
          "sales" ||
        account.accountType ===
          "direct_income" ||
        account.accountType ===
          "indirect_income";


      const isDebitAllowed =
        isSalesOrIncome ||
        account.accountType ===
          "tax";


      const isCreditAllowed =
        account.accountType ===
          "accounts_receivable" ||
        account.accountType ===
          "cash" ||
        account.accountType ===
          "bank";


      const debit =
        roundMoney(line.debit);

      const credit =
        roundMoney(line.credit);


      if (
        debit > 0 &&
        !isDebitAllowed
      ) {
        throw new Error(
          "Only Sales, Income or Tax accounts may be debited in a Credit Note."
        );
      }


      if (
        credit > 0 &&
        !isCreditAllowed
      ) {
        throw new Error(
          "Only Accounts Receivable, Cash or Bank accounts may be credited in a Credit Note."
        );
      }


      if (
        debit > 0 &&
        isSalesOrIncome
      ) {
        hasSalesOrIncomeDebit =
          true;
      }

    }


    if (!hasSalesOrIncomeDebit) {
      throw new Error(
        "Credit Note requires a Sales or Income debit line."
      );
    }

  }


  async validateDebitNoteVoucher({
    companyId,
    lines,
    session = null,
  }) {

    let hasPurchaseCredit =
      false;


    for (const line of lines || []) {

      const account =
        await this.chartRepository
          .findById({
            companyId,
            accountId:
              line.accountId,
            session,
          });


      if (!account) {
        throw new Error(
          "Debit Note account not found."
        );
      }


      if (account.status !== "active") {
        throw new Error(
          "Debit Note requires active accounts."
        );
      }


      const isDebitAllowed =
        account.accountType ===
          "accounts_payable" ||
        account.accountType ===
          "cash" ||
        account.accountType ===
          "bank";


      const isPurchase =
        account.accountType ===
          "purchase";


      const isCreditAllowed =
        isPurchase ||
        account.accountType ===
          "tax";


      const debit =
        roundMoney(line.debit);

      const credit =
        roundMoney(line.credit);


      if (
        debit > 0 &&
        !isDebitAllowed
      ) {
        throw new Error(
          "Only Accounts Payable, Cash or Bank accounts may be debited in a Debit Note."
        );
      }


      if (
        credit > 0 &&
        !isCreditAllowed
      ) {
        throw new Error(
          "Only Purchase or Tax accounts may be credited in a Debit Note."
        );
      }


      if (
        credit > 0 &&
        isPurchase
      ) {
        hasPurchaseCredit =
          true;
      }

    }


    if (!hasPurchaseCredit) {
      throw new Error(
        "Debit Note requires a Purchase credit line."
      );
    }

  }


  /* ==========================================================
     CREATE VOUCHER

     New vouchers always start as DRAFT.
  ========================================================== */

  async createVoucher({
    companyId,
    userId,
    payload,
  }) {

    if (
      !companyId
    ) {

      throw new Error(
        "Company ID is required."
      );
    }


    if (
      !payload
    ) {

      throw new Error(
        "Voucher payload is required."
      );
    }


    if (
      !VOUCHER_TYPES.includes(
        payload.voucherType
      )
    ) {

      throw new Error(
        "Invalid voucher type."
      );
    }


    if (
      !Array.isArray(
        payload.lines
      ) ||
      payload.lines.length < 2
    ) {

      throw new Error(
        "Voucher must contain at least two lines."
      );
    }


    const {
      totalDebit,
      totalCredit,
    } =
      this.calculateTotals(
        payload.lines
      );


    if (
      totalDebit <= 0 ||
      totalCredit <= 0
    ) {

      throw new Error(
        "Voucher must contain debit and credit amounts."
      );
    }


    if (
      totalDebit !==
      totalCredit
    ) {

      throw new Error(
        "Voucher must be balanced: total debit must equal total credit."
      );
    }


    if (
      payload.voucherType ===
        "payment"
    ) {

      await this.validatePaymentVoucher({
        companyId,
        lines:
          payload.lines,
      });

    }


    if (
      payload.voucherType ===
        "receipt"
    ) {

      await this.validateReceiptVoucher({
        companyId,
        lines:
          payload.lines,
      });

    }


    if (
      payload.voucherType ===
        "contra"
    ) {

      await this.validateContraVoucher({
        companyId,
        lines:
          payload.lines,
      });

    }


    if (
      payload.voucherType ===
        "sales"
    ) {

      await this.validateSalesVoucher({
        companyId,
        lines:
          payload.lines,
      });

    }


    if (
      payload.voucherType ===
        "purchase"
    ) {

      await this.validatePurchaseVoucher({
        companyId,
        lines:
          payload.lines,
      });

    }


    if (
      payload.voucherType ===
        "credit_note"
    ) {

      await this.validateCreditNoteVoucher({
        companyId,
        lines:
          payload.lines,
      });

    }


    if (
      payload.voucherType ===
        "debit_note"
    ) {

      await this.validateDebitNoteVoucher({
        companyId,
        lines:
          payload.lines,
      });

    }


    const financialYear =
      this.resolveFinancialYear(
        payload.voucherDate
      );


    let voucherNumber =
      await this
        .buildVoucherNumber({

          companyId,

          voucherType:
            payload.voucherType,

          voucherDate:
            payload.voucherDate,

        });


    const createPayload = {

      companyId,

      voucherNumber,

      voucherType:
        payload.voucherType,

      financialYear,

      voucherDate:
        payload.voucherDate,

      narration:
        String(
          payload.narration ||
          ""
        )
          .trim(),

      referenceNo:
        String(
          payload.referenceNo ||
          ""
        )
          .trim(),

      referenceDate:
        payload.referenceDate ||
        null,

      partyAccountId:
        payload.partyAccountId ||
        null,

      lines:
        payload.lines,

      totalDebit,

      totalCredit,

      status:
        "draft",

      sourceModule:
        payload.sourceModule ||
        "accounts",

      sourceReferenceId:
        payload.sourceReferenceId ||
        null,

      createdBy:
        userId ||
        null,

      updatedBy:
        userId ||
        null,

    };


    const maxCreateAttempts =
      3;


    for (
      let attempt = 1;
      attempt <= maxCreateAttempts;
      attempt += 1
    ) {

      try {

        return await this
          .voucherRepository
          .create({
            ...createPayload,
            voucherNumber,
          });

      } catch (
        error
      ) {

        const canRetry =
          error?.code === 11000 &&
          attempt < maxCreateAttempts;


        if (
          !canRetry
        ) {

          throw error;
        }


        voucherNumber =
          await this
            .buildVoucherNumber({

              companyId,

              voucherType:
                payload.voucherType,

              voucherDate:
                payload.voucherDate,

            });

      }

    }
  }


  async createPurchasePayableFromSource({
    companyId,
    userId,
    sourceReferenceId,
    vendorName,
    invoiceNumber,
    invoiceDate,
    amount,
  }) {

    const existing =
      await this.voucherRepository
        .findBySource({
          companyId,
          sourceModule: "purchase_invoice",
          sourceReferenceId,
        });

    if (existing) {
      return existing;
    }

    const [payableAccounts, purchaseAccounts] =
      await Promise.all([
        this.chartRepository.list({ companyId, accountType: "accounts_payable", status: "active", search: vendorName }),
        this.chartRepository.list({ companyId, accountType: "purchase", status: "active" }),
      ]);

    const payableAccount =
      payableAccounts.find(account =>
        String(account.accountName || "").trim().toLowerCase() ===
        String(vendorName || "").trim().toLowerCase()
      );

    const purchaseAccount =
      purchaseAccounts[0];

    if (!payableAccount || !purchaseAccount) {
      throw new Error(
        "Accounts requires an active vendor Accounts Payable account and Purchase account before handoff."
      );
    }

    return this.createVoucher({
      companyId,
      userId,
      payload: {
        voucherType: "purchase",
        voucherDate: invoiceDate,
        narration: `Purchase invoice ${invoiceNumber}`,
        referenceNo: invoiceNumber,
        referenceDate: invoiceDate,
        partyAccountId: payableAccount._id,
        sourceModule: "purchase_invoice",
        sourceReferenceId,
        lines: [
          { accountId: purchaseAccount._id, description: invoiceNumber, debit: amount, credit: 0 },
          { accountId: payableAccount._id, description: vendorName, debit: 0, credit: amount },
        ],
      },
    });
  }


  /* ==========================================================
     UPDATE DRAFT VOUCHER

     Repository enforces status === draft.
  ========================================================== */

  async updateDraftVoucher({
    companyId,
    voucherId,
    userId,
    payload,
  }) {

    if (
      !companyId
    ) {

      throw new Error(
        "Company ID is required."
      );
    }


    if (
      !voucherId
    ) {

      throw new Error(
        "Voucher ID is required."
      );
    }


    if (
      !payload
    ) {

      throw new Error(
        "Voucher payload is required."
      );
    }


    const updatePayload = {

      ...payload,

      updatedBy:
        userId ||
        null,

    };


    if (
      Object.prototype
        .hasOwnProperty
        .call(
          payload,
          "lines"
        )
    ) {

      if (
        !Array.isArray(
          payload.lines
        ) ||
        payload.lines.length < 2
      ) {

        throw new Error(
          "Voucher must contain at least two lines."
        );
      }


      const {
        totalDebit,
        totalCredit,
      } =
        this.calculateTotals(
          payload.lines
        );


      if (
        totalDebit <= 0 ||
        totalCredit <= 0
      ) {

        throw new Error(
          "Voucher must contain debit and credit amounts."
        );
      }


      if (
        totalDebit !==
        totalCredit
      ) {

        throw new Error(
          "Voucher must be balanced: total debit must equal total credit."
        );
      }


      updatePayload.totalDebit =
        totalDebit;


      updatePayload.totalCredit =
        totalCredit;

    }


    /*
     * If voucher date crosses into another financial year,
     * keep the financial year and voucher number consistent.
     */

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          payload,
          "voucherDate"
        )
    ) {

      const financialYear =
        this.resolveFinancialYear(
          payload.voucherDate
        );


      updatePayload.financialYear =
        financialYear;


      const existingVoucher =
        await this
          .voucherRepository
          .findById({
            companyId,
            voucherId,
          });


      if (
        existingVoucher &&
        existingVoucher.financialYear !==
          financialYear
      ) {

        updatePayload.voucherNumber =
          await this.buildVoucherNumber({
            companyId,
            voucherType:
              existingVoucher.voucherType,
            voucherDate:
              payload.voucherDate,
          });

      }

    }


    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "lines"
      )
    ) {

      const existingVoucher =
        await this.voucherRepository
          .findById({
            companyId,
            voucherId,
          });


      if (
        existingVoucher?.voucherType ===
          "payment"
      ) {

        await this.validatePaymentVoucher({
          companyId,
          lines:
            payload.lines,
        });

      }

      if (
        existingVoucher?.voucherType ===
          "receipt"
      ) {

        await this.validateReceiptVoucher({
          companyId,
          lines:
            payload.lines,
        });

      }


      if (
        existingVoucher?.voucherType ===
          "contra"
      ) {

        await this.validateContraVoucher({
          companyId,
          lines:
            payload.lines,
        });

      }


      if (
        existingVoucher?.voucherType ===
          "sales"
      ) {

        await this.validateSalesVoucher({
          companyId,
          lines:
            payload.lines,
        });

      }


      if (
        existingVoucher?.voucherType ===
          "purchase"
      ) {

        await this.validatePurchaseVoucher({
          companyId,
          lines:
            payload.lines,
        });

      }


      if (
        existingVoucher?.voucherType ===
          "credit_note"
      ) {

        await this.validateCreditNoteVoucher({
          companyId,
          lines:
            payload.lines,
        });

      }


      if (
        existingVoucher?.voucherType ===
          "debit_note"
      ) {

        await this.validateDebitNoteVoucher({
          companyId,
          lines:
            payload.lines,
        });

      }


    }


    const voucher =
      await this
        .voucherRepository
        .updateDraftById({

          companyId,

          voucherId,

          payload:
            updatePayload,

        });


    if (
      !voucher
    ) {

      throw new Error(
        "Voucher not found or is no longer editable."
      );
    }


    return voucher;

  }

  /* ==========================================================
     POST VOUCHER

     Draft Voucher
        ?
     Create JournalEntry
        ?
     Post JournalEntry
        ?
     Mark Voucher posted and link JournalEntry

     General Ledger remains derived from posted JournalEntry.
  ========================================================== */

  async postVoucher({
    companyId,
    voucherId,
    userId,
  }) {

    if (!companyId) {
      throw new Error(
        "Company ID is required."
      );
    }


    if (!voucherId) {
      throw new Error(
        "Voucher ID is required."
      );
    }


    const session =
      await this.sessionProvider
        .startSession();


    try {

      let postedVoucherResult =
        null;


      await session.withTransaction(
        async () => {

          const voucher =
            await this.voucherRepository
              .findById({
                companyId,
                voucherId,
                session,
              });


          if (!voucher) {
            throw new Error(
              "Voucher not found."
            );
          }


          if (
            voucher.status !==
              "draft"
          ) {
            throw new Error(
              "Voucher is not available for posting."
            );
          }


          if (
            voucher.voucherType ===
              "payment"
          ) {

            await this.validatePaymentVoucher({
              companyId,
              lines:
                voucher.lines,
              session,
            });

          }


          if (
            voucher.voucherType ===
              "receipt"
          ) {

            await this.validateReceiptVoucher({
              companyId,
              lines:
                voucher.lines,
              session,
            });

          }


          if (
            voucher.voucherType ===
              "contra"
          ) {

            await this.validateContraVoucher({
              companyId,
              lines:
                voucher.lines,
              session,
            });

          }


          if (
            voucher.voucherType ===
              "sales"
          ) {

            await this.validateSalesVoucher({
              companyId,
              lines:
                voucher.lines,
              session,
            });

          }


          if (
            voucher.voucherType ===
              "purchase"
          ) {

            await this.validatePurchaseVoucher({
              companyId,
              lines:
                voucher.lines,
              session,
            });

          }


          if (
            voucher.voucherType ===
              "credit_note"
          ) {

            await this.validateCreditNoteVoucher({
              companyId,
              lines:
                voucher.lines,
              session,
            });

          }


          if (
            voucher.voucherType ===
              "debit_note"
          ) {

            await this.validateDebitNoteVoucher({
              companyId,
              lines:
                voucher.lines,
              session,
            });

          }


          const journal =
            await this.journalService
              .createJournal({
                companyId,

                userId:
                  userId || null,

                session,

                payload: {
                  journalDate:
                    voucher.voucherDate,

                  narration:
                    String(
                      voucher.narration || ""
                    ).trim(),

                  referenceType:
                    "voucher",

                  referenceId:
                    voucher._id,

                  referenceNo:
                    voucher.voucherNumber,

                  lines:
                    (
                      voucher.lines || []
                    ).map(
                      (line) => ({
                        accountId:
                          line.accountId,

                        description:
                          String(
                            line.description ||
                              ""
                          ).trim(),

                        debit:
                          roundMoney(
                            line.debit
                          ),

                        credit:
                          roundMoney(
                            line.credit
                          ),
                      })
                    ),
                },
              });


          if (!journal?._id) {
            throw new Error(
              "Journal Entry could not be created for Voucher."
            );
          }


          const postedJournal =
            await this.journalService
              .postJournal({
                companyId,

                journalEntryId:
                  journal._id,

                userId:
                  userId || null,

                session,
              });


          if (
            !postedJournal ||
            postedJournal.status !==
              "posted"
          ) {
            throw new Error(
              "Journal Entry could not be posted for Voucher."
            );
          }


          const postedVoucher =
            await this.voucherRepository
              .postById({
                companyId,
                voucherId,

                journalEntryId:
                  journal._id,

                userId:
                  userId || null,

                session,
              });


          if (!postedVoucher) {
            throw new Error(
              "Voucher not found or cannot be posted."
            );
          }


          postedVoucherResult =
            postedVoucher;

        }
      );


      return postedVoucherResult;

    } finally {

      await session.endSession();

    }

  }
  /* ==========================================================
     VOID VOUCHER

     Posted Voucher
        ->
     Void linked JournalEntry
        ->
     Mark Voucher void

     Both changes run inside one Mongo transaction.
  ========================================================== */

  async voidVoucher({
    companyId,
    voucherId,
    userId,
    reason,
  }) {

    if (!companyId) {
      throw new Error(
        "Company ID is required."
      );
    }


    if (!voucherId) {
      throw new Error(
        "Voucher ID is required."
      );
    }


    const cleanReason =
      String(
        reason || ""
      ).trim();


    if (cleanReason.length < 3) {
      throw new Error(
        "Void reason is required."
      );
    }


    const session =
      await this.sessionProvider
        .startSession();


    try {

      let voidedVoucherResult =
        null;


      await session.withTransaction(
        async () => {

          const voucher =
            await this.voucherRepository
              .findById({
                companyId,
                voucherId,
                session,
              });


          if (!voucher) {
            throw new Error(
              "Voucher not found."
            );
          }


          if (
            voucher.status !==
              "posted"
          ) {
            throw new Error(
              "Voucher is not available for voiding."
            );
          }


          if (!voucher.journalEntryId) {
            throw new Error(
              "Posted Voucher has no linked Journal Entry."
            );
          }


          const voidedJournal =
            await this.journalService
              .voidJournal({
                companyId,

                journalEntryId:
                  voucher.journalEntryId,

                userId:
                  userId || null,

                reason:
                  cleanReason,

                session,
              });


          if (
            !voidedJournal ||
            voidedJournal.status !==
              "void"
          ) {
            throw new Error(
              "Linked Journal Entry could not be voided."
            );
          }


          const voidedVoucher =
            await this.voucherRepository
              .voidById({
                companyId,
                voucherId,

                userId:
                  userId || null,

                reason:
                  cleanReason,

                session,
              });


          if (!voidedVoucher) {
            throw new Error(
              "Voucher not found or cannot be voided."
            );
          }


          voidedVoucherResult =
            voidedVoucher;

        }
      );


      return voidedVoucherResult;

    } finally {

      await session.endSession();

    }

  }

}

/* ============================================================
   DEFAULT SERVICE
============================================================ */

const voucherService =
  new VoucherService();


export default
  voucherService;
