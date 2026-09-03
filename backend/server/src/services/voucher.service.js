import mongoose from "mongoose";

import {
  VOUCHER_PREFIXES,
  VOUCHER_TYPES,
} from "../constants/accounting.js";

import voucherRepository
  from "../repositories/voucher.repository.js";

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

      sessionProvider:
        sessions =
          mongoose,
    } = {}
  ) {

    this.voucherRepository =
      repository;


    this.journalService =
      journal;


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


    const financialYear =
      this.resolveFinancialYear(
        payload.voucherDate
      );


    const voucherNumber =
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

      createdBy:
        userId ||
        null,

      updatedBy:
        userId ||
        null,

    };


    return this
      .voucherRepository
      .create(
        createPayload
      );

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
     * If voucher date changes, financial year may change.
     *
     * Voucher number remains immutable in this phase.
     * Later settings will control renumbering policy.
     */

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          payload,
          "voucherDate"
        )
    ) {

      updatePayload.financialYear =
        this.resolveFinancialYear(
          payload.voucherDate
        );

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






