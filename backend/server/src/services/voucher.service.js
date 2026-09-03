import {
  VOUCHER_PREFIXES,
  VOUCHER_TYPES,
} from "../constants/accounting.js";

import voucherRepository
  from "../repositories/voucher.repository.js";


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
    } = {}
  ) {

    this.voucherRepository =
      repository;

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

}


/* ============================================================
   DEFAULT SERVICE
============================================================ */

const voucherService =
  new VoucherService();


export default
  voucherService;
