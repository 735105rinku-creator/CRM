import Voucher
  from "../models/Voucher.js";


/* ============================================================
   HELPERS
============================================================ */

const escapeRegex =
  (
    value
  ) =>
    String(
      value ||
      ""
    )
      .replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );


/* ============================================================
   VOUCHER REPOSITORY
============================================================ */

class VoucherRepository {

  /* ==========================================================
     CREATE
  ========================================================== */

  async create(
    payload
  ) {

    return Voucher
      .create(
        payload
      );
  }


  /* ==========================================================
     FIND ONE

     Every lookup is company-scoped.
  ========================================================== */

  async findById({
    companyId,
    voucherId,
  }) {

    return Voucher
      .findOne({

        _id:
          voucherId,

        companyId,

      })
      .lean();
  }


  /* ==========================================================
     LIST VOUCHERS
  ========================================================== */

  async list({
    companyId,

    search = "",

    voucherType = "",

    status = "",

    financialYear = "",

    from = null,

    to = null,

    sortBy = "voucherDate",

    sortOrder = "desc",
  }) {

    const filter = {
      companyId,
    };


    /* --------------------------------------------------------
       VOUCHER TYPE
    -------------------------------------------------------- */

    if (
      voucherType
    ) {

      filter.voucherType =
        voucherType;
    }


    /* --------------------------------------------------------
       STATUS
    -------------------------------------------------------- */

    if (
      status
    ) {

      filter.status =
        status;
    }


    /* --------------------------------------------------------
       FINANCIAL YEAR
    -------------------------------------------------------- */

    if (
      financialYear
    ) {

      filter.financialYear =
        financialYear;
    }


    /* --------------------------------------------------------
       DATE RANGE
    -------------------------------------------------------- */

    if (
      from ||
      to
    ) {

      filter.voucherDate =
        {};


      if (
        from
      ) {

        filter.voucherDate.$gte =
          new Date(
            from
          );
      }


      if (
        to
      ) {

        const endDate =
          new Date(
            to
          );


        endDate.setHours(
          23,
          59,
          59,
          999
        );


        filter.voucherDate.$lte =
          endDate;
      }

    }


    /* --------------------------------------------------------
       SEARCH
    -------------------------------------------------------- */

    const searchValue =
      String(
        search ||
        ""
      )
        .trim();


    if (
      searchValue
    ) {

      const regex =
        new RegExp(
          escapeRegex(
            searchValue
          ),
          "i"
        );


      filter.$or = [

        {
          voucherNumber:
            regex,
        },

        {
          narration:
            regex,
        },

        {
          referenceNo:
            regex,
        },

        {
          "lines.accountCode":
            regex,
        },

        {
          "lines.accountName":
            regex,
        },

      ];

    }


    /* --------------------------------------------------------
       SAFE SORTING
    -------------------------------------------------------- */

    const allowedSortFields =
      new Set([
        "voucherNumber",
        "voucherDate",
        "voucherType",
        "financialYear",
        "status",
        "totalDebit",
        "totalCredit",
        "createdAt",
        "updatedAt",
      ]);


    const safeSortBy =
      allowedSortFields
        .has(
          sortBy
        )
        ? sortBy
        : "voucherDate";


    const direction =
      sortOrder ===
        "asc"
        ? 1
        : -1;


    return Voucher
      .find(
        filter
      )
      .sort({

        [safeSortBy]:
          direction,

        createdAt:
          direction,

      })
      .lean();
  }


  /* ==========================================================
     UPDATE DRAFT

     Posted / void vouchers cannot pass this filter.
  ========================================================== */

  async updateDraftById({
    companyId,
    voucherId,
    payload,
  }) {

    return Voucher
      .findOneAndUpdate(

        {
          _id:
            voucherId,

          companyId,

          status:
            "draft",
        },

        {
          $set:
            payload,
        },

        {
          returnDocument:
            "after",

          runValidators:
            true,
        }

      )
      .lean();
  }


  /* ==========================================================
     POST VOUCHER

     Atomic transition:

       draft -> posted
  ========================================================== */

  async postById({
    companyId,
    voucherId,
    journalEntryId,
    userId = null,
    postedAt = new Date(),
  }) {

    return Voucher
      .findOneAndUpdate(

        {
          _id:
            voucherId,

          companyId,

          status:
            "draft",
        },

        {
          $set: {

            status:
              "posted",

            journalEntryId,

            postedBy:
              userId,

            postedAt,

            updatedBy:
              userId,

          },
        },

        {
          returnDocument:
            "after",

          runValidators:
            true,
        }

      )
      .lean();
  }


  /* ==========================================================
     VOID VOUCHER

     Atomic transition:

       posted -> void
  ========================================================== */

  async voidById({
    companyId,
    voucherId,
    userId = null,
    reason,
    voidedAt = new Date(),
  }) {

    return Voucher
      .findOneAndUpdate(

        {
          _id:
            voucherId,

          companyId,

          status:
            "posted",
        },

        {
          $set: {

            status:
              "void",

            voidReason:
              String(
                reason ||
                ""
              )
                .trim(),

            voidedBy:
              userId,

            voidedAt,

            updatedBy:
              userId,

          },
        },

        {
          returnDocument:
            "after",

          runValidators:
            true,
        }

      )
      .lean();
  }


  /* ==========================================================
     LAST VOUCHER NUMBER

     Used to determine the next sequence for a specific:

       company
       + financial year
       + voucher type
       + prefix

     Example:

       PV/2026-27/000001
  ========================================================== */

  async findLastVoucherNumber({
    companyId,
    financialYear,
    voucherType,
    prefix,
  }) {

    const safePrefix =
      escapeRegex(
        prefix
      );


    const safeFinancialYear =
      escapeRegex(
        financialYear
      );


    const voucherNumberPattern =
      new RegExp(
        `^${safePrefix}\\/${safeFinancialYear}\\/\\d{6}$`
      );


    return Voucher
      .findOne({

        companyId,

        financialYear,

        voucherType,

        voucherNumber:
          voucherNumberPattern,

      })
      .select({
        _id:
          0,

        voucherNumber:
          1,
      })
      .sort({
        voucherNumber:
          -1,
      })
      .lean();
  }

}


/* ============================================================
   EXPORT
============================================================ */

export const voucherRepository =
  new VoucherRepository();


export default
  voucherRepository;
