import { ApiError } from "../utils/apiError.js";

import chartOfAccountRepositoryDefault
  from "../repositories/chartOfAccount.repository.js";

import chartOfAccountServiceDefault
  from "./chartOfAccount.service.js";


const PARTY_TYPES =
  Object.freeze({

    customer: {
      accountType:
        "accounts_receivable",

      nature:
        "asset",
    },

    vendor: {
      accountType:
        "accounts_payable",

      nature:
        "liability",
    },

  });


const PROTECTED_UPDATE_FIELDS =
  Object.freeze([
    "nature",
    "accountType",
    "companyId",
    "createdBy",
    "updatedBy",
    "isSystemAccount",
  ]);


export class AccountPartyService {

  constructor({
    chartOfAccountRepository =
      chartOfAccountRepositoryDefault,

    chartOfAccountService =
      chartOfAccountServiceDefault,
  } = {}) {

    this.chartOfAccountRepository =
      chartOfAccountRepository;

    this.chartOfAccountService =
      chartOfAccountService;

  }


  /* ==========================================================
     PARTY TYPE
  ========================================================== */

  getPartyDefinition(
    type
  ) {

    const normalizedType =
      String(
        type ||
        ""
      )
        .trim()
        .toLowerCase();


    const definition =
      PARTY_TYPES[
        normalizedType
      ];


    if (
      !definition
    ) {

      throw new ApiError(
        400,
        'Party type must be either "customer" or "vendor".'
      );

    }


    return {
      partyType:
        normalizedType,

      ...definition,
    };

  }


  /* ==========================================================
     MAP ACCOUNT TO PARTY
  ========================================================== */

  mapParty({
    account,
    definition,
  }) {

    if (
      !account
    ) {

      return account;

    }


    const plainAccount =
      typeof account.toObject ===
      "function"
        ? account.toObject()
        : account;


    return {
      ...plainAccount,

      partyType:
        definition.partyType,

      accountType:
        plainAccount.accountType ||
        definition.accountType,

      nature:
        plainAccount.nature ||
        definition.nature,
    };

  }


  /* ==========================================================
     VALIDATE ACCOUNT PARTY TYPE
  ========================================================== */

  assertPartyAccount({
    account,
    definition,
  }) {

    if (
      !account
    ) {

      throw new ApiError(
        404,
        `${this.capitalize(
          definition.partyType
        )} account not found.`
      );

    }


    if (
      account.accountType !==
      definition.accountType
    ) {

      throw new ApiError(
        400,
        definition.partyType ===
          "customer"
          ? "Selected account is not a Customer/Accounts Receivable ledger."
          : "Selected account is not a Vendor/Accounts Payable ledger."
      );

    }


    if (
      account.nature !==
      definition.nature
    ) {

      throw new ApiError(
        400,
        `${this.capitalize(
          definition.partyType
        )} ledger has an invalid account nature.`
      );

    }


    return account;

  }


  /* ==========================================================
     LIST PARTIES
  ========================================================== */

  async listParties({
    companyId,
    type,
    query = {},
  }) {

    if (
      !companyId
    ) {

      throw new ApiError(
        403,
        "Accounting company context missing."
      );

    }


    const definition =
      this.getPartyDefinition(
        type
      );


    const accounts =
      await this.chartOfAccountRepository
        .list({

          companyId,

          accountType:
            definition.accountType,

          search:
            query.search ||
            "",

          status:
            query.status ||
            "",

        });


    const rows =
      Array.isArray(
        accounts
      )
        ? accounts
        : accounts?.items ||
          accounts?.data ||
          [];


    return rows.map(
      (
        account
      ) =>
        this.mapParty({
          account,
          definition,
        })
    );

  }


  /* ==========================================================
     CREATE PARTY
  ========================================================== */

  async createParty({
    companyId,
    userId = null,
    type,
    payload = {},
  }) {

    if (
      !companyId
    ) {

      throw new ApiError(
        403,
        "Accounting company context missing."
      );

    }


    const definition =
      this.getPartyDefinition(
        type
      );


    const safePayload = {
      ...payload,

      nature:
        definition.nature,

      accountType:
        definition.accountType,

    };


    const created =
      await this.chartOfAccountService
        .createAccount({

          companyId,

          userId,

          payload:
            safePayload,

        });


    return this.mapParty({
      account:
        created,

      definition,
    });

  }


  /* ==========================================================
     GET ONE PARTY
  ========================================================== */

  async getParty({
    companyId,
    accountId,
    type,
  }) {

    if (
      !companyId
    ) {

      throw new ApiError(
        403,
        "Accounting company context missing."
      );

    }


    const definition =
      this.getPartyDefinition(
        type
      );


    const account =
      await this.chartOfAccountService
        .getAccount({

          companyId,

          accountId,

        });


    this.assertPartyAccount({
      account,
      definition,
    });


    return this.mapParty({
      account,
      definition,
    });

  }


  /* ==========================================================
     UPDATE PARTY
  ========================================================== */

  async updateParty({
    companyId,
    accountId,
    userId = null,
    type,
    payload = {},
  }) {

    if (
      !companyId
    ) {

      throw new ApiError(
        403,
        "Accounting company context missing."
      );

    }


    const definition =
      this.getPartyDefinition(
        type
      );


    const current =
      await this.chartOfAccountService
        .getAccount({

          companyId,

          accountId,

        });


    this.assertPartyAccount({
      account:
        current,

      definition,
    });


    const safePayload =
      this.sanitizeUpdatePayload(
        payload
      );


    const updated =
      await this.chartOfAccountService
        .updateAccount({

          companyId,

          accountId,

          userId,

          payload:
            safePayload,

        });


    this.assertPartyAccount({
      account:
        updated,

      definition,
    });


    return this.mapParty({
      account:
        updated,

      definition,
    });

  }


  /* ==========================================================
     SANITIZE UPDATE

     Customer/Vendor identity is defined by its accounting
     ledger type. Client must never convert:

       Customer -> Vendor
       Vendor   -> Customer
  ========================================================== */

  sanitizeUpdatePayload(
    payload = {}
  ) {

    const safePayload = {
      ...payload,
    };


    for (
      const field of
        PROTECTED_UPDATE_FIELDS
    ) {

      delete safePayload[
        field
      ];

    }


    return safePayload;

  }


  /* ==========================================================
     UTILITY
  ========================================================== */

  capitalize(
    value
  ) {

    const text =
      String(
        value ||
        ""
      );


    if (
      !text
    ) {

      return "";

    }


    return (
      text.charAt(
        0
      ).toUpperCase() +
      text.slice(
        1
      )
    );

  }

}


export const accountPartyService =
  new AccountPartyService();


export default
  accountPartyService;
