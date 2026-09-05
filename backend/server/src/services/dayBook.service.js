import {
  ApiError,
} from "../utils/apiError.js";


const ALLOWED_VOUCHER_TYPES =
  new Set([
    "journal",
    "payment",
    "receipt",
    "contra",
    "sales",
    "purchase",
    "credit_note",
    "debit_note",
  ]);


const isValidDateString =
  (value) => {

    const text =
      String(value || "");

    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return false;
    }

    const [year, month, day] =
      text.split("-").map(Number);

    const date =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      );

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );

  };


const DISPLAY_TYPES = {
  journal: "Journal Voucher",
  payment: "Payment Voucher",
  receipt: "Receipt Voucher",
  contra: "Contra Voucher",
  sales: "Sales Voucher",
  purchase: "Purchase Voucher",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
};


const roundMoney =
  (value) =>
    Math.round(
      (Number(value || 0) + Number.EPSILON) * 100
    ) / 100;


export class DayBookService {

  constructor({
    dayBookRepository,
  } = {}) {

    this.dayBookRepository =
      dayBookRepository;

  }


  resolveIndianFinancialYear(
    now = new Date()
  ) {

    const year =
      now.getUTCFullYear();

    const month =
      now.getUTCMonth() + 1;

    const startYear =
      month >= 4
        ? year
        : year - 1;

    return {
      from:
        `${startYear}-04-01`,

      to:
        `${startYear + 1}-03-31`,
    };

  }


  normalizeQuery(
    query = {},
    now = new Date()
  ) {

    const financialYear =
      this.resolveIndianFinancialYear(
        now
      );

    const from =
      String(
        query.from ??
        financialYear.from
      );

    const to =
      String(
        query.to ??
        financialYear.to
      );

    if (
      !isValidDateString(from) ||
      !isValidDateString(to)
    ) {
      throw new ApiError(
        400,
        "From and To must be valid dates in YYYY-MM-DD format."
      );
    }

    if (from > to) {
      throw new ApiError(
        400,
        "From date cannot be after To date."
      );
    }

    const sort =
      String(
        query.sort ??
        "desc"
      )
        .trim()
        .toLowerCase();

    if (
      sort !== "asc" &&
      sort !== "desc"
    ) {
      throw new ApiError(
        400,
        "Sort must be asc or desc."
      );
    }

    const voucherType =
      query.voucherType == null ||
      String(query.voucherType).trim() === ""
        ? null
        : String(query.voucherType)
            .trim()
            .toLowerCase();

    if (
      voucherType &&
      !ALLOWED_VOUCHER_TYPES.has(
        voucherType
      )
    ) {
      throw new ApiError(
        400,
        "Unsupported voucher type."
      );
    }

    const page =
      Number(
        query.page ??
        1
      );

    if (
      !Number.isInteger(page) ||
      page < 1
    ) {
      throw new ApiError(
        400,
        "Page must be an integer greater than or equal to 1."
      );
    }

    const limit =
      Number(
        query.limit ??
        25
      );

    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      throw new ApiError(
        400,
        "Limit must be an integer between 1 and 100."
      );
    }

    return {
      from,
      to,
      voucherType,
      sort,
      page,
      limit,
    };

  }



  mapRow(row = {}) {

    const voucherType =
      row.resolvedVoucherType ||
      row.linkedVoucher?.voucherType ||
      "journal";

    return {
      journalEntryId:
        String(row._id || ""),

      date:
        row.journalDate ||
        null,

      displayType:
        DISPLAY_TYPES[voucherType] ||
        "Journal Voucher",

      voucherType,

      voucherNumber:
        row.linkedVoucher?.voucherNumber ||
        row.referenceNo ||
        row.journalNumber ||
        "",

      journalNumber:
        row.journalNumber ||
        "",

      referenceType:
        row.referenceType ||
        "manual",

      referenceNo:
        row.referenceNo ||
        "",

      narration:
        row.narration ||
        "",

      totalDebit:
        roundMoney(row.totalDebit),

      totalCredit:
        roundMoney(row.totalCredit),

      lines:
        (row.lines || []).map(
          (line) => ({
            accountId:
              String(line.accountId || ""),

            accountCode:
              line.accountCode ||
              "",

            accountName:
              line.accountName ||
              "",

            debit:
              roundMoney(line.debit),

            credit:
              roundMoney(line.credit),
          })
        ),
    };

  }


  async getDayBook({
    companyId,
    query = {},
    now = new Date(),
  } = {}) {

    const normalizedCompanyId =
      String(companyId || "").trim();

    if (!normalizedCompanyId) {
      throw new ApiError(
        403,
        "Accounting company context missing."
      );
    }

    const normalized =
      this.normalizeQuery(
        query,
        now
      );

    if (
      !this.dayBookRepository ||
      typeof this.dayBookRepository.listPosted !== "function"
    ) {
      throw new ApiError(
        500,
        "Day Book repository is not configured."
      );
    }

    const report =
      await this.dayBookRepository.listPosted({
        companyId:
          normalizedCompanyId,

        ...normalized,
      });

    const total =
      Number(report?.total || 0);

    const summary = {
      voucherCount:
        Number(report?.totals?.voucherCount || 0),

      totalDebit:
        roundMoney(report?.totals?.totalDebit),

      totalCredit:
        roundMoney(report?.totals?.totalCredit),
    };

    return {
      period: {
        from:
          normalized.from,

        to:
          normalized.to,
      },

      filters: {
        voucherType:
          normalized.voucherType,

        sort:
          normalized.sort,
      },

      rows:
        (report?.rows || []).map(
          (row) => this.mapRow(row)
        ),

      summary,

      pagination: {
        page:
          normalized.page,

        limit:
          normalized.limit,

        total,

        totalPages:
          total > 0
            ? Math.ceil(total / normalized.limit)
            : 0,
      },
    };

  }
}
