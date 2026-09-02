import { ROLES }
  from "../constants/roles.js";

import {
  createLogisticsCustomerSchema,
  updateLogisticsCustomerSchema,
  logisticsCustomerQuerySchema,
} from "../validators/logisticsCustomer.validator.js";

import logisticsCustomerService
  from "../services/logisticsCustomer.service.js";

import { ApiResponse }
  from "../utils/apiResponse.js";

import { ApiError }
  from "../utils/apiError.js";

import { asyncHandler }
  from "../utils/asyncHandler.js";

const companyIdForRequest = (
  req
) => {
  const authCompanyId =
    req.auth?.companyId ||
    req.user?.companyId?._id ||
    req.user?.companyId;

  if (
    req.user?.role !==
    ROLES.SUPER_ADMIN
  ) {
    if (
      !authCompanyId
    ) {
      throw new ApiError(
        403,
        "Company context missing"
      );
    }

    return authCompanyId;
  }

  const requestedCompanyId =
    req.query?.companyId ||
    req.body?.companyId ||
    authCompanyId;

  if (
    !requestedCompanyId
  ) {
    throw new ApiError(
      400,
      "companyId is required for Super Admin"
    );
  }

  return requestedCompanyId;
};

function validate(
  schema,
  source
) {
  const {
    value,
    error,
  } =
    schema.validate(
      source,
      {
        abortEarly:
          false,

        stripUnknown:
          true,
      }
    );

  if (
    error
  ) {
    throw new ApiError(
      400,
      error.details[0]
        .message,
      error.details
    );
  }

  return value;
}

export const createLogisticsCustomer =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const payload =
        validate(
          createLogisticsCustomerSchema,
          req.body
        );

      const result =
        await logisticsCustomerService
          .createCustomer({
            companyId:
              companyIdForRequest(
                req
              ),

            userId:
              req.user?._id ||
              null,

            employeeId:
              req.logisticsAccess
                ?.employeeId ||
              null,

            payload,
          });

      res
        .status(201)
        .json(
          new ApiResponse(
            201,
            result,
            "Logistics customer created successfully"
          )
        );
    }
  );

export const getLogisticsCustomers =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const query =
        validate(
          logisticsCustomerQuerySchema,
          req.query
        );

      const result =
        await logisticsCustomerService
          .listCustomers({
            companyId:
              companyIdForRequest(
                req
              ),

            query,
          });

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Logistics customers fetched successfully"
          )
        );
    }
  );

export const getLogisticsCustomerSummary =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const result =
        await logisticsCustomerService
          .getSummary({
            companyId:
              companyIdForRequest(
                req
              ),
          });

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Logistics customer summary fetched successfully"
          )
        );
    }
  );

export const getLogisticsCustomerById =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const result =
        await logisticsCustomerService
          .getCustomer({
            companyId:
              companyIdForRequest(
                req
              ),

            customerId:
              req.params.id,
          });

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Logistics customer fetched successfully"
          )
        );
    }
  );

export const updateLogisticsCustomer =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const payload =
        validate(
          updateLogisticsCustomerSchema,
          req.body
        );

      const result =
        await logisticsCustomerService
          .updateCustomer({
            companyId:
              companyIdForRequest(
                req
              ),

            customerId:
              req.params.id,

            userId:
              req.user?._id ||
              null,

            payload,
          });

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Logistics customer updated successfully"
          )
        );
    }
  );

export const deleteLogisticsCustomer =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const result =
        await logisticsCustomerService
          .deleteCustomer({
            companyId:
              companyIdForRequest(
                req
              ),

            customerId:
              req.params.id,

            userId:
              req.user?._id ||
              null,
          });

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Logistics customer deleted successfully"
          )
        );
    }
  );