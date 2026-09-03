import mongoose from "mongoose";

import chartOfAccountRepository
  from "../repositories/chartOfAccount.repository.js";

import {
  ACCOUNT_TYPE_NATURE,
  NORMAL_BALANCE_BY_NATURE,
} from "../constants/accounting.js";

import {
  ApiError,
} from "../utils/apiError.js";


class ChartOfAccountService {

  /* ==========================================================
     CREATE ACCOUNT
  ========================================================== */

  async createAccount({
    companyId,
    userId = null,
    payload,
  }) {

    this.assertCompanyId(
      companyId
    );


    const accountCode =
      this.normalizeAccountCode(
        payload.accountCode
      );


    /* --------------------------------------------------------
       ACCOUNT TYPE ↔ NATURE
    -------------------------------------------------------- */

    this.assertAccountTypeNature({
      accountType:
        payload.accountType,

      nature:
        payload.nature,
    });


    /* --------------------------------------------------------
       DUPLICATE CODE
    -------------------------------------------------------- */

    const duplicate =
      await chartOfAccountRepository
        .codeExists({
          companyId,
          accountCode,
        });


    if (
      duplicate
    ) {

      throw new ApiError(
        409,
        `Account code "${accountCode}" already exists.`
      );
    }


    /* --------------------------------------------------------
       PARENT ACCOUNT
    -------------------------------------------------------- */

    let parentAccountId =
      payload.parentAccountId ||
      null;


    if (
      parentAccountId
    ) {

      await this.validateParentAccount({
        companyId,

        parentAccountId,

        nature:
          payload.nature,
      });

    }


    /* --------------------------------------------------------
       OPENING BALANCE
    -------------------------------------------------------- */

    const openingBalance =
      Number(
        payload.openingBalance ||
        0
      );


    const openingBalanceType =
      payload.openingBalanceType ||
      NORMAL_BALANCE_BY_NATURE[
        payload.nature
      ] ||
      "debit";


    /* --------------------------------------------------------
       CREATE
    -------------------------------------------------------- */

    try {

      return await
        chartOfAccountRepository
          .create({

            companyId,

            accountCode,

            accountName:
              String(
                payload.accountName
              )
                .trim(),

            description:
              this.normalizeDescription(
                payload.description
              ),

            nature:
              payload.nature,

            accountType:
              payload.accountType,

            parentAccountId,

            openingBalance,

            openingBalanceType,

            status:
              payload.status ||
              "active",

            /*
             * Controlled by backend.
             * Normal public API cannot create system accounts.
             */
            isSystemAccount:
              false,

            allowManualEntry:
              true,

            createdBy:
              userId,

            updatedBy:
              userId,

          });

    } catch (
      error
    ) {

      this.handleDuplicateKey(
        error,
        accountCode
      );


      throw error;
    }

  }


  /* ==========================================================
     LIST ACCOUNTS
  ========================================================== */

  async listAccounts({
    companyId,
    query = {},
  }) {

    this.assertCompanyId(
      companyId
    );


    return chartOfAccountRepository
      .list({

        companyId,

        search:
          query.search ||
          "",

        nature:
          query.nature ||
          "",

        accountType:
          query.accountType ||
          "",

        status:
          query.status ||
          "",

        parentAccountId:
          query.parentAccountId,

        sortBy:
          query.sortBy ||
          "accountCode",

        sortOrder:
          query.sortOrder ||
          "asc",

      });

  }


  /* ==========================================================
     GET ONE ACCOUNT
  ========================================================== */

  async getAccount({
    companyId,
    accountId,
  }) {

    this.assertCompanyId(
      companyId
    );


    this.assertObjectId(
      accountId,
      "Invalid account ID."
    );


    const account =
      await chartOfAccountRepository
        .findById({
          companyId,
          accountId,
        });


    if (
      !account
    ) {

      throw new ApiError(
        404,
        "Chart of Account record not found."
      );
    }


    return account;
  }


  /* ==========================================================
     UPDATE ACCOUNT
  ========================================================== */

  async updateAccount({
    companyId,
    accountId,
    userId = null,
    payload,
  }) {

    const current =
      await this.getAccount({
        companyId,
        accountId,
      });


    const update = {};


    /* --------------------------------------------------------
       ACCOUNT NAME
    -------------------------------------------------------- */

    if (
      this.hasOwn(
        payload,
        "accountName"
      )
    ) {

      update.accountName =
        String(
          payload.accountName
        )
          .trim();
    }


    /* --------------------------------------------------------
       DESCRIPTION
    -------------------------------------------------------- */

    if (
      this.hasOwn(
        payload,
        "description"
      )
    ) {

      update.description =
        this.normalizeDescription(
          payload.description
        );
    }


    /* --------------------------------------------------------
       ACCOUNT TYPE

       Nature itself is immutable.
       New account type must belong to existing nature.
    -------------------------------------------------------- */

    if (
      this.hasOwn(
        payload,
        "accountType"
      )
    ) {

      this.assertAccountTypeNature({
        accountType:
          payload.accountType,

        nature:
          current.nature,
      });


      update.accountType =
        payload.accountType;
    }


    /* --------------------------------------------------------
       PARENT
    -------------------------------------------------------- */

    if (
      this.hasOwn(
        payload,
        "parentAccountId"
      )
    ) {

      const parentAccountId =
        payload.parentAccountId ||
        null;


      if (
        parentAccountId
      ) {

        await this.validateParentAccount({

          companyId,

          parentAccountId,

          nature:
            current.nature,

          accountId,

        });

      }


      update.parentAccountId =
        parentAccountId;
    }


    /* --------------------------------------------------------
       STATUS
    -------------------------------------------------------- */

    if (
      this.hasOwn(
        payload,
        "status"
      )
    ) {

      await this.validateStatusChange({

        companyId,

        account:
          current,

        newStatus:
          payload.status,

      });


      update.status =
        payload.status;
    }


    /* --------------------------------------------------------
       AUDIT
    -------------------------------------------------------- */

    update.updatedBy =
      userId;


    const updated =
      await chartOfAccountRepository
        .updateById({

          companyId,

          accountId,

          payload:
            update,

        });


    if (
      !updated
    ) {

      throw new ApiError(
        404,
        "Chart of Account record not found."
      );
    }


    return updated;
  }


  /* ==========================================================
     SUMMARY

     Opening-balance summary only.

     Live balance must later come from Journal + Ledger.
  ========================================================== */

  async getSummary({
    companyId,
  }) {

    this.assertCompanyId(
      companyId
    );


    const rows =
      await chartOfAccountRepository
        .summaryByNature({
          companyId:
            new mongoose.Types.ObjectId(
              String(
                companyId
              )
            ),

          status:
            "active",
        });


    const summary = {

      totalAccounts:
        0,

      asset: {
        accountCount:
          0,

        openingBalance:
          0,
      },

      liability: {
        accountCount:
          0,

        openingBalance:
          0,
      },

      equity: {
        accountCount:
          0,

        openingBalance:
          0,
      },

      income: {
        accountCount:
          0,

        openingBalance:
          0,
      },

      expense: {
        accountCount:
          0,

        openingBalance:
          0,
      },

    };


    for (
      const row of
        rows
    ) {

      const nature =
        row._id;


      if (
        !summary[
          nature
        ]
      ) {

        continue;
      }


      const accountCount =
        Number(
          row.accountCount ||
          0
        );


      summary[
        nature
      ].accountCount =
        accountCount;


      summary[
        nature
      ].openingBalance =
        Number(
          row.openingBalance ||
          0
        );


      summary.totalAccounts +=
        accountCount;
    }


    return summary;
  }


  /* ==========================================================
     PARENT VALIDATION
  ========================================================== */

  async validateParentAccount({
    companyId,
    parentAccountId,
    nature,
    accountId = null,
  }) {

    this.assertObjectId(
      parentAccountId,
      "Invalid parent account ID."
    );


    /* --------------------------------------------------------
       SELF PARENT
    -------------------------------------------------------- */

    if (
      accountId &&
      String(
        accountId
      ) ===
      String(
        parentAccountId
      )
    ) {

      throw new ApiError(
        400,
        "An account cannot be its own parent."
      );
    }


    /* --------------------------------------------------------
       PARENT EXISTS INSIDE SAME COMPANY
    -------------------------------------------------------- */

    const parent =
      await chartOfAccountRepository
        .findById({
          companyId,

          accountId:
            parentAccountId,
        });


    if (
      !parent
    ) {

      throw new ApiError(
        400,
        "Parent account was not found in this company."
      );
    }


    /* --------------------------------------------------------
       SAME NATURE
    -------------------------------------------------------- */

    if (
      parent.nature !==
      nature
    ) {

      throw new ApiError(
        400,
        "Parent account must belong to the same account nature."
      );
    }


    /* --------------------------------------------------------
       ACTIVE PARENT
    -------------------------------------------------------- */

    if (
      parent.status !==
      "active"
    ) {

      throw new ApiError(
        400,
        "An inactive account cannot be selected as a parent."
      );
    }


    /* --------------------------------------------------------
       CIRCULAR HIERARCHY

       Example:

       A → B
       B → C

       Updating A → parent C must be rejected.
    -------------------------------------------------------- */

    if (
      accountId
    ) {

      await this.assertNoCircularHierarchy({

        companyId,

        accountId,

        proposedParentId:
          parentAccountId,

      });

    }


    return parent;
  }


  /* ==========================================================
     CIRCULAR HIERARCHY PROTECTION
  ========================================================== */

  async assertNoCircularHierarchy({
    companyId,
    accountId,
    proposedParentId,
  }) {

    let currentParentId =
      proposedParentId;


    /*
     * Safety guard prevents endless traversal if existing
     * historical data somehow already contains a cycle.
     */

    const visited =
      new Set();


    for (
      let depth = 0;
      depth < 100;
      depth += 1
    ) {

      if (
        !currentParentId
      ) {

        return;
      }


      const currentId =
        String(
          currentParentId
        );


      if (
        currentId ===
        String(
          accountId
        )
      ) {

        throw new ApiError(
          400,
          "Circular account hierarchy is not allowed."
        );
      }


      if (
        visited.has(
          currentId
        )
      ) {

        throw new ApiError(
          400,
          "Existing account hierarchy contains a circular reference."
        );
      }


      visited.add(
        currentId
      );


      const parent =
        await chartOfAccountRepository
          .findById({

            companyId,

            accountId:
              currentParentId,

          });


      if (
        !parent
      ) {

        return;
      }


      currentParentId =
        parent.parentAccountId ||
        null;
    }


    throw new ApiError(
      400,
      "Account hierarchy is too deep."
    );
  }


  /* ==========================================================
     STATUS CHANGE VALIDATION
  ========================================================== */

  async validateStatusChange({
    companyId,
    account,
    newStatus,
  }) {

    if (
      newStatus ===
      account.status
    ) {

      return;
    }


    /* --------------------------------------------------------
       SYSTEM ACCOUNT
    -------------------------------------------------------- */

    if (
      account.isSystemAccount
    ) {

      throw new ApiError(
        400,
        "System accounts cannot be activated or deactivated manually."
      );
    }


    /* --------------------------------------------------------
       DEACTIVATE

       Parent account cannot be deactivated while active child
       accounts still depend on it.
    -------------------------------------------------------- */

    if (
      newStatus ===
      "inactive"
    ) {

      const activeChildren =
        await chartOfAccountRepository
          .countActiveChildren({

            companyId,

            parentAccountId:
              account._id,

          });


      if (
        activeChildren >
        0
      ) {

        throw new ApiError(
          409,
          "Deactivate or move active child accounts before deactivating this account."
        );
      }


      return;
    }


    /* --------------------------------------------------------
       ACTIVATE

       If this account has a parent, the parent must itself
       currently be active.
    -------------------------------------------------------- */

    if (
      newStatus ===
        "active" &&
      account.parentAccountId
    ) {

      const parent =
        await chartOfAccountRepository
          .findById({

            companyId,

            accountId:
              account.parentAccountId,

          });


      if (
        !parent
      ) {

        throw new ApiError(
          400,
          "Parent account was not found."
        );
      }


      if (
        parent.status !==
        "active"
      ) {

        throw new ApiError(
          400,
          "Activate the parent account before activating this account."
        );
      }
    }

  }


  /* ==========================================================
     ACCOUNT TYPE ↔ NATURE
  ========================================================== */

  assertAccountTypeNature({
    accountType,
    nature,
  }) {

    const expectedNature =
      ACCOUNT_TYPE_NATURE[
        accountType
      ];


    if (
      !expectedNature
    ) {

      throw new ApiError(
        400,
        "Invalid account type."
      );
    }


    if (
      expectedNature !==
      nature
    ) {

      throw new ApiError(
        400,
        `Account type "${accountType}" belongs to "${expectedNature}" nature, not "${nature}".`
      );
    }

  }


  /* ==========================================================
     COMPANY VALIDATION
  ========================================================== */

  assertCompanyId(
    companyId
  ) {

    if (
      !companyId ||
      !mongoose.isValidObjectId(
        companyId
      )
    ) {

      throw new ApiError(
        403,
        "Valid company context is required."
      );
    }

  }


  /* ==========================================================
     OBJECT ID VALIDATION
  ========================================================== */

  assertObjectId(
    value,
    message =
      "Invalid ID."
  ) {

    if (
      !value ||
      !mongoose.isValidObjectId(
        value
      )
    ) {

      throw new ApiError(
        400,
        message
      );
    }

  }


  /* ==========================================================
     DUPLICATE MONGO KEY HANDLING
  ========================================================== */

  handleDuplicateKey(
    error,
    accountCode
  ) {

    if (
      Number(
        error?.code
      ) ===
      11000
    ) {

      throw new ApiError(
        409,
        `Account code "${accountCode}" already exists.`
      );
    }

  }


  /* ==========================================================
     NORMALIZATION
  ========================================================== */

  normalizeAccountCode(
    value
  ) {

    return String(
      value ||
      ""
    )
      .trim()
      .toUpperCase();
  }


  normalizeDescription(
    value
  ) {

    return String(
      value ||
      ""
    )
      .trim();
  }


  /* ==========================================================
     OWN PROPERTY
  ========================================================== */

  hasOwn(
    object,
    key
  ) {

    return Object.prototype
      .hasOwnProperty
      .call(
        object,
        key
      );
  }

}


/* ============================================================
   EXPORT
============================================================ */

export const
  chartOfAccountService =
    new ChartOfAccountService();


export default
  chartOfAccountService;