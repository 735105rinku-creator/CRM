import crypto from "node:crypto";

import {
  JOURNAL_NUMBER_PREFIX,
} from "../constants/accounting.js";

import journalEntryRepository
  from "../repositories/journalEntry.repository.js";

import chartOfAccountRepository
  from "../repositories/chartOfAccount.repository.js";


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


const journalDatePart =
  (
    value
  ) => {

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
        "Invalid Journal date."
      );
    }


    const year =
      String(
        date.getUTCFullYear()
      );


    const month =
      String(
        date.getUTCMonth() + 1
      )
        .padStart(
          2,
          "0"
        );


    const day =
      String(
        date.getUTCDate()
      )
        .padStart(
          2,
          "0"
        );


    return `${year}${month}${day}`;
  };


const generateJournalNumber =
  (
    journalDate
  ) => {

    const datePart =
      journalDatePart(
        journalDate
      );


    const randomPart =
      crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase();


    return [
      JOURNAL_NUMBER_PREFIX,
      datePart,
      randomPart,
    ].join("-");
  };


/* ============================================================
   JOURNAL ENTRY SERVICE
============================================================ */

export class JournalEntryService {

  constructor(
    {
      journalRepository =
        journalEntryRepository,

      chartRepository =
        chartOfAccountRepository,
    } = {}
  ) {

    this.journalRepository =
      journalRepository;


    this.chartRepository =
      chartRepository;

  }


  /* ==========================================================
     CREATE JOURNAL
  ========================================================== */

  async createJournal({
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
        "Journal Entry payload is required."
      );
    }


    const lines =
      await this
        .buildAccountSnapshots({
          companyId,

          referenceType:
            payload.referenceType ||
            "manual",

          lines:
            payload.lines ||
            [],
        });


    const {
      totalDebit,
      totalCredit,
    } =
      this.calculateTotals(
        lines
      );


    if (
      totalDebit <= 0 ||
      totalCredit <= 0
    ) {

      throw new Error(
        "Journal Entry must contain debit and credit amounts."
      );
    }


    if (
      totalDebit !==
      totalCredit
    ) {

      throw new Error(
        "Journal Entry must be balanced: total debit must equal total credit."
      );
    }


    const createPayload = {

      companyId,

      journalNumber:
        generateJournalNumber(
          payload.journalDate
        ),

      journalDate:
        payload.journalDate,

      narration:
        String(
          payload.narration ||
          ""
        )
          .trim(),

      referenceType:
        payload.referenceType ||
        "manual",

      referenceId:
        payload.referenceId ||
        null,

      referenceNo:
        String(
          payload.referenceNo ||
          ""
        )
          .trim(),

      status:
        "draft",

      totalDebit,

      totalCredit,

      lines,

      createdBy:
        userId ||
        null,

      updatedBy:
        userId ||
        null,

    };


    return this
      .journalRepository
      .create(
        createPayload
      );
  }


  /* ==========================================================
     LIST JOURNALS
  ========================================================== */

  async listJournals({
    companyId,
    query = {},
  }) {

    return this
      .journalRepository
      .list({

        companyId,

        ...query,

      });
  }


  /* ==========================================================
     GET JOURNAL
  ========================================================== */

  async getJournal({
    companyId,
    journalEntryId,
  }) {

    const journal =
      await this
        .journalRepository
        .findById({
          companyId,
          journalEntryId,
        });


    if (
      !journal
    ) {

      throw new Error(
        "Journal Entry not found."
      );
    }


    return journal;
  }


  /* ==========================================================
     UPDATE JOURNAL

     Repository guarantees:
       status === draft

     Posted / void entries therefore cannot be updated.
  ========================================================== */

  async updateJournal({
    companyId,
    journalEntryId,
    userId,
    payload,
  }) {

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

      updatePayload.lines =
        await this
          .buildAccountSnapshots({
            companyId,

            referenceType:
              payload.referenceType ||
              "manual",

            lines:
              payload.lines ||
              [],
          });


      const totals =
        this.calculateTotals(
          updatePayload.lines
        );


      if (
        totals.totalDebit <= 0 ||
        totals.totalCredit <= 0
      ) {

        throw new Error(
          "Journal Entry must contain debit and credit amounts."
        );
      }


      if (
        totals.totalDebit !==
        totals.totalCredit
      ) {

        throw new Error(
          "Journal Entry must be balanced: total debit must equal total credit."
        );
      }


      updatePayload.totalDebit =
        totals.totalDebit;


      updatePayload.totalCredit =
        totals.totalCredit;

    }


    const journal =
      await this
        .journalRepository
        .updateDraftById({
          companyId,
          journalEntryId,
          payload:
            updatePayload,
        });


    if (
      !journal
    ) {

      throw new Error(
        "Journal Entry not found or is no longer editable."
      );
    }


    return journal;
  }


  /* ==========================================================
     POST JOURNAL

     Repository performs atomic:
       draft -> posted
  ========================================================== */

  async postJournal({
    companyId,
    journalEntryId,
    userId,
  }) {

    const journal =
      await this
        .journalRepository
        .postById({
          companyId,
          journalEntryId,
          userId:
            userId ||
            null,
        });


    if (
      !journal
    ) {

      throw new Error(
        "Journal Entry not found or cannot be posted."
      );
    }


    return journal;
  }


  /* ==========================================================
     VOID JOURNAL

     Repository performs atomic:
       posted -> void
  ========================================================== */

  async voidJournal({
    companyId,
    journalEntryId,
    userId,
    reason,
  }) {

    const cleanReason =
      String(
        reason ||
        ""
      )
        .trim();


    if (
      cleanReason.length < 3
    ) {

      throw new Error(
        "Void reason is required."
      );
    }


    const journal =
      await this
        .journalRepository
        .voidById({
          companyId,
          journalEntryId,

          userId:
            userId ||
            null,

          reason:
            cleanReason,
        });


    if (
      !journal
    ) {

      throw new Error(
        "Journal Entry not found or cannot be voided."
      );
    }


    return journal;
  }


  /* ==========================================================
     ACCOUNT SNAPSHOTS
  ========================================================== */

  async buildAccountSnapshots({
    companyId,
    referenceType,
    lines,
  }) {

    if (
      !Array.isArray(
        lines
      ) ||
      lines.length < 2
    ) {

      throw new Error(
        "Journal Entry must contain at least two lines."
      );
    }


    const result =
      [];


    for (
      const line of
        lines
    ) {

      const account =
        await this
          .chartRepository
          .findById({
            companyId,

            accountId:
              line.accountId,
          });


      /*
       * Repository lookup is company-scoped.
       * Therefore null also protects cross-company access.
       */

      if (
        !account
      ) {

        throw new Error(
          "Journal account not found."
        );
      }


      if (
        account.status !==
        "active"
      ) {

        throw new Error(
          `Inactive account cannot be used in Journal Entry: ${account.accountName || account.accountCode}.`
        );
      }


      /*
       * System-controlled accounts may later be used by
       * automatic invoice/payment posting even when manual
       * entry is disabled.
       */

      if (
        referenceType ===
          "manual" &&
        account.allowManualEntry ===
          false
      ) {

        throw new Error(
          `Manual entry is not allowed for account: ${account.accountName || account.accountCode}.`
        );
      }


      result.push({

        accountId:
          line.accountId,

        accountCode:
          account.accountCode,

        accountName:
          account.accountName,

        description:
          String(
            line.description ||
            ""
          )
            .trim(),

        debit:
          roundMoney(
            line.debit
          ),

        credit:
          roundMoney(
            line.credit
          ),

      });

    }


    return result;
  }


  /* ==========================================================
     TOTAL CALCULATION

     Client totals are never trusted.
  ========================================================== */

  calculateTotals(
    lines
  ) {

    const totalDebit =
      roundMoney(
        lines.reduce(
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
        lines.reduce(
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

}


/* ============================================================
   DEFAULT SERVICE
============================================================ */

const journalEntryService =
  new JournalEntryService();


export default
  journalEntryService;