import ChartOfAccount
  from "../models/ChartOfAccount.js";


class ChartOfAccountRepository {

  /* ==========================================================
     CREATE
  ========================================================== */

  async create(
    payload
  ) {

    return ChartOfAccount
      .create(
        payload
      );
  }


  /* ==========================================================
     FIND ONE BY ID

     Always company scoped.

     parentAccountName is flattened for frontend use while
     preserving parentAccountId as an ID.
  ========================================================== */

  async findById({
    companyId,
    accountId,
  }) {

    const account =
      await ChartOfAccount
        .findOne({
          _id:
            accountId,

          companyId,
        })
        .populate({
          path:
            "parentAccountId",

          select:
            "_id accountCode accountName",

          match: {
            companyId,
          },
        })
        .lean();


    return this
      .flattenParent(
        account
      );
  }


  /* ==========================================================
     FIND BY ACCOUNT CODE

     Includes active + inactive records so account codes cannot
     be duplicated simply by deactivating an existing account.
  ========================================================== */

  async findByCode({
    companyId,
    accountCode,
  }) {

    return ChartOfAccount
      .findOne({
        companyId,

        accountCode:
          String(
            accountCode ||
            ""
          )
            .trim()
            .toUpperCase(),
      })
      .lean();
  }


  /* ==========================================================
     ACCOUNT CODE EXISTS
  ========================================================== */

  async codeExists({
    companyId,
    accountCode,
    excludeAccountId = null,
  }) {

    const filter = {
      companyId,

      accountCode:
        String(
          accountCode ||
          ""
        )
          .trim()
          .toUpperCase(),
    };


    if (
      excludeAccountId
    ) {

      filter._id = {
        $ne:
          excludeAccountId,
      };
    }


    return ChartOfAccount
      .exists(
        filter
      );
  }


  /* ==========================================================
     LIST ACCOUNTS

     Frontend currently expects ChartOfAccount[] directly,
     therefore this repository intentionally returns an array
     rather than a paginated object.

     Supported filters:
       search
       nature
       accountType
       status
       parentAccountId
       sortBy
       sortOrder
  ========================================================== */

  async list({
    companyId,

    search = "",

    nature = "",

    accountType = "",

    status = "",

    parentAccountId =
      undefined,

    sortBy =
      "accountCode",

    sortOrder =
      "asc",
  }) {

    const filter = {
      companyId,
    };


    /* --------------------------------------------------------
       NATURE
    -------------------------------------------------------- */

    if (
      nature
    ) {

      filter.nature =
        nature;
    }


    /* --------------------------------------------------------
       ACCOUNT TYPE
    -------------------------------------------------------- */

    if (
      accountType
    ) {

      filter.accountType =
        accountType;
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
       PARENT ACCOUNT

       undefined:
         do not filter by parent

       null / "":
         root accounts only

       ObjectId:
         children of that parent
    -------------------------------------------------------- */

    if (
      parentAccountId !==
      undefined
    ) {

      if (
        parentAccountId ===
          null ||
        parentAccountId ===
          ""
      ) {

        filter.parentAccountId =
          null;

      } else {

        filter.parentAccountId =
          parentAccountId;
      }
    }


    /* --------------------------------------------------------
       SEARCH
    -------------------------------------------------------- */

    const query =
      String(
        search ||
        ""
      )
        .trim();


    if (
      query
    ) {

      const regex =
        new RegExp(
          escapeRegex(
            query
          ),
          "i"
        );


      filter.$or = [

        {
          accountCode:
            regex,
        },

        {
          accountName:
            regex,
        },

        {
          description:
            regex,
        },

      ];
    }


    /* --------------------------------------------------------
       SORT
    -------------------------------------------------------- */

    const allowedSortFields =
      new Set([
        "accountCode",
        "accountName",
        "nature",
        "accountType",
        "status",
        "createdAt",
        "updatedAt",
      ]);


    const safeSortBy =
      allowedSortFields
        .has(
          sortBy
        )
        ? sortBy
        : "accountCode";


    const direction =
      sortOrder ===
        "desc"
        ? -1
        : 1;


    const accounts =
      await ChartOfAccount
        .find(
          filter
        )
        .populate({
          path:
            "parentAccountId",

          select:
            "_id accountCode accountName",

          match: {
            companyId,
          },
        })
        .sort({
          [safeSortBy]:
            direction,

          accountName:
            1,
        })
        .lean();


    return accounts
      .map(
        account =>
          this.flattenParent(
            account
          )
      );
  }


  /* ==========================================================
     UPDATE BY ID

     Uses returnDocument:'after' instead of deprecated new:true.
  ========================================================== */

  async updateById({
    companyId,
    accountId,
    payload,
  }) {

    const account =
      await ChartOfAccount
        .findOneAndUpdate(
          {
            _id:
              accountId,

            companyId,
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
        .populate({
          path:
            "parentAccountId",

          select:
            "_id accountCode accountName",

          match: {
            companyId,
          },
        })
        .lean();


    return this
      .flattenParent(
        account
      );
  }


  /* ==========================================================
     ACTIVE CHILD COUNT

     Used before operations such as deactivating a parent
     account.
  ========================================================== */

  async countActiveChildren({
    companyId,
    parentAccountId,
  }) {

    return ChartOfAccount
      .countDocuments({

        companyId,

        parentAccountId,

        status:
          "active",

      });
  }


  /* ==========================================================
     FIND CHILDREN

     Useful for hierarchy validation and later tree views.
  ========================================================== */

  async findChildren({
    companyId,
    parentAccountId,
    status = undefined,
  }) {

    const filter = {

      companyId,

      parentAccountId,

    };


    if (
      status
    ) {

      filter.status =
        status;
    }


    return ChartOfAccount
      .find(
        filter
      )
      .sort({
        accountCode:
          1,

        accountName:
          1,
      })
      .lean();
  }


  /* ==========================================================
     SUMMARY BY NATURE

     Read-only aggregation prepared for Accounts Dashboard.

     currentBalance is NOT calculated here yet.
     Journal/Ledger will provide that later.
  ========================================================== */

  async summaryByNature({
    companyId,
    status = "active",
  }) {

    const match = {
      companyId,
    };


    if (
      status
    ) {

      match.status =
        status;
    }


    return ChartOfAccount
      .aggregate([

        {
          $match:
            match,
        },

        {
          $group: {

            _id:
              "$nature",

            accountCount: {
              $sum:
                1,
            },

            openingBalance: {
              $sum:
                "$openingBalance",
            },

          },
        },

        {
          $sort: {
            _id:
              1,
          },
        },

      ]);
  }


  /* ==========================================================
     FLATTEN PARENT

     Mongoose populate produces:

       parentAccountId: {
         _id,
         accountCode,
         accountName
       }

     Angular expects:

       parentAccountId: string | null
       parentAccountName: string | null

     This converts the backend response to that contract.
  ========================================================== */

  flattenParent(
    account
  ) {

    if (
      !account
    ) {

      return null;
    }


    const parent =
      account.parentAccountId;


    /*
     * Not populated / already a raw ID.
     */

    if (
      !parent ||
      typeof parent !==
        "object"
    ) {

      return {
        ...account,

        parentAccountId:
          parent ||
          null,

        parentAccountName:
          null,
      };
    }


    return {
      ...account,

      parentAccountId:
        parent._id ||
        null,

      parentAccountName:
        parent.accountName ||
        null,
    };
  }

}


/* ============================================================
   HELPERS
============================================================ */

function escapeRegex(
  value
) {

  return String(
    value
  )
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
}


/* ============================================================
   EXPORT
============================================================ */

export const
  chartOfAccountRepository =
    new ChartOfAccountRepository();


export default
  chartOfAccountRepository;