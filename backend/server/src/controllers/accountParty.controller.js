import {
  ApiResponse,
} from "../utils/apiResponse.js";

import {
  ApiError,
} from "../utils/apiError.js";

import accountPartyServiceDefault
  from "../services/accountParty.service.js";

import {
  createAccountPartySchema,
  updateAccountPartySchema,
  accountPartyIdParamSchema,
} from "../validators/accountParty.validator.js";


export class AccountPartyController {

  constructor({
    accountPartyService =
      accountPartyServiceDefault,
  } = {}) {

    this.accountPartyService =
      accountPartyService;


    this.listCustomers =
      this.listCustomers.bind(
        this
      );

    this.createCustomer =
      this.createCustomer.bind(
        this
      );

    this.getCustomer =
      this.getCustomer.bind(
        this
      );

    this.updateCustomer =
      this.updateCustomer.bind(
        this
      );


    this.listVendors =
      this.listVendors.bind(
        this
      );

    this.createVendor =
      this.createVendor.bind(
        this
      );

    this.getVendor =
      this.getVendor.bind(
        this
      );

    this.updateVendor =
      this.updateVendor.bind(
        this
      );
  }


  /* ==========================================================
     COMPANY CONTEXT
  ========================================================== */

  companyIdForRequest(
    req
  ) {

    const companyId =
      req.accountingAccess
        ?.companyId;


    if (
      !companyId
    ) {

      throw new ApiError(
        403,
        "Accounting company context missing."
      );

    }


    return companyId;
  }


  /* ==========================================================
     VALIDATION
  ========================================================== */

  validate(
    schema,
    source
  ) {

    const {
      value,
      error,
    } =
      schema.validate(
        source ?? {},
        {
          abortEarly:
            false,

          stripUnknown:
            false,

          convert:
            true,
        }
      );


    if (
      error
    ) {

      const errors =
        error.details.map(
          detail => ({
            message:
              detail.message,

            path:
              detail.path,

            type:
              detail.type,
          })
        );


      throw new ApiError(
        400,
        error.details[0]
          ?.message ||
          "Invalid request.",
        errors
      );

    }


    return value;
  }


  /* ==========================================================
     GENERIC PARTY OPERATIONS
  ========================================================== */

  async list(
    type,
    req,
    res
  ) {

    const companyId =
      this.companyIdForRequest(
        req
      );


    const data =
      await this
        .accountPartyService
        .listParties({
          companyId,

          type,

          query:
            req.query || {},
        });


    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          data,
          `${this.capitalize(
            type
          )} list fetched successfully.`
        )
      );
  }


  async create(
    type,
    req,
    res
  ) {

    const companyId =
      this.companyIdForRequest(
        req
      );


    const payload =
      this.validate(
        createAccountPartySchema,
        req.body
      );


    const data =
      await this
        .accountPartyService
        .createParty({
          companyId,

          userId:
            req.user?._id ||
            null,

          type,

          payload,
        });


    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          data,
          `${this.capitalize(
            type
          )} created successfully.`
        )
      );
  }


  async getOne(
    type,
    req,
    res
  ) {

    const companyId =
      this.companyIdForRequest(
        req
      );


    const params =
      this.validate(
        accountPartyIdParamSchema,
        req.params
      );


    const data =
      await this
        .accountPartyService
        .getParty({
          companyId,

          accountId:
            params.id,

          type,
        });


    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          data,
          `${this.capitalize(
            type
          )} fetched successfully.`
        )
      );
  }


  async update(
    type,
    req,
    res
  ) {

    const companyId =
      this.companyIdForRequest(
        req
      );


    const params =
      this.validate(
        accountPartyIdParamSchema,
        req.params
      );


    const payload =
      this.validate(
        updateAccountPartySchema,
        req.body
      );


    const data =
      await this
        .accountPartyService
        .updateParty({
          companyId,

          accountId:
            params.id,

          userId:
            req.user?._id ||
            null,

          type,

          payload,
        });


    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          data,
          `${this.capitalize(
            type
          )} updated successfully.`
        )
      );
  }


  /* ==========================================================
     CUSTOMER
  ========================================================== */

  async listCustomers(
    req,
    res
  ) {

    return this.list(
      "customer",
      req,
      res
    );
  }


  async createCustomer(
    req,
    res
  ) {

    return this.create(
      "customer",
      req,
      res
    );
  }


  async getCustomer(
    req,
    res
  ) {

    return this.getOne(
      "customer",
      req,
      res
    );
  }


  async updateCustomer(
    req,
    res
  ) {

    return this.update(
      "customer",
      req,
      res
    );
  }


  /* ==========================================================
     VENDOR
  ========================================================== */

  async listVendors(
    req,
    res
  ) {

    return this.list(
      "vendor",
      req,
      res
    );
  }


  async createVendor(
    req,
    res
  ) {

    return this.create(
      "vendor",
      req,
      res
    );
  }


  async getVendor(
    req,
    res
  ) {

    return this.getOne(
      "vendor",
      req,
      res
    );
  }


  async updateVendor(
    req,
    res
  ) {

    return this.update(
      "vendor",
      req,
      res
    );
  }


  /* ==========================================================
     UTILITIES
  ========================================================== */

  capitalize(
    value
  ) {

    if (
      !value
    ) {
      return "";
    }


    return (
      value
        .charAt(0)
        .toUpperCase() +
      value.slice(1)
    );
  }
}


const accountPartyController =
  new AccountPartyController();


export const listCustomers =
  accountPartyController
    .listCustomers;


export const createCustomer =
  accountPartyController
    .createCustomer;


export const getCustomer =
  accountPartyController
    .getCustomer;


export const updateCustomer =
  accountPartyController
    .updateCustomer;


export const listVendors =
  accountPartyController
    .listVendors;


export const createVendor =
  accountPartyController
    .createVendor;


export const getVendor =
  accountPartyController
    .getVendor;


export const updateVendor =
  accountPartyController
    .updateVendor;


export default
  accountPartyController;
