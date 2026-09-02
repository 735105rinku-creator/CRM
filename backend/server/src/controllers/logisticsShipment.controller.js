import { ROLES } from "../constants/roles.js";
import { resolveLogisticsPermissions } from "../middleware/logisticsPermission.middleware.js";

import {
  createLogisticsShipmentSchema,
  updateLogisticsShipmentSchema,
  updateLogisticsShipmentStatusSchema,
  logisticsShipmentQuerySchema,
} from "../validators/logisticsShipment.validator.js";

import logisticsShipmentService
  from "../services/logisticsShipment.service.js";

import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const logisticsScopeFilterForRequest = (req) => {
  if (!req.logisticsScope || !req.logisticsPermission) {
    throw new ApiError(403, "Logistics permission scope was not resolved");
  }

  return req.logisticsScope.filter;
};

/* ============================================================
   COMPANY CONTEXT
============================================================ */

const companyIdForRequest = (
  req
) => {

  /*
   * Normal company users MUST use the company
   * from authenticated context.
   */
  const authCompanyId =
    req.auth?.companyId ||
    req.user?.companyId?._id ||
    req.user?.companyId;


  if (
    req.user?.role !==
    ROLES.SUPER_ADMIN
  ) {

    if (!authCompanyId) {
      throw new ApiError(
        403,
        "Company context missing"
      );
    }

    return authCompanyId;
  }


  /*
   * Super Admin can select a company explicitly.
   */
  const requestedCompanyId =
    req.query?.companyId ||
    req.body?.companyId ||
    authCompanyId;


  if (!requestedCompanyId) {
    throw new ApiError(
      400,
      "companyId is required for Super Admin"
    );
  }


  return requestedCompanyId;
};



/* ============================================================
   OVERVIEW
============================================================ */

export const getLogisticsOverview = asyncHandler(async (req, res) => {
  const overview = await logisticsShipmentService.getOverview({
    companyId: companyIdForRequest(req),
    scopeFilter: logisticsScopeFilterForRequest(req),
    viewScope: req.logisticsScope.viewScope,
    permissions: req.logisticsPermissions || resolveLogisticsPermissions(req),
  });

  res.status(200).json(new ApiResponse(200, overview, "Logistics overview fetched successfully"));
});

export const getLogisticsShipmentHistory = asyncHandler(async (req, res) => {
  const history = await logisticsShipmentService.getStatusHistory({
    companyId: companyIdForRequest(req),
    shipmentId: req.params.id,
    scopeFilter: logisticsScopeFilterForRequest(req),
  });

  res.status(200).json(new ApiResponse(200, history, "Shipment status history fetched successfully"));
});


/* ============================================================
   CREATE
============================================================ */

export const createLogisticsShipment =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const {
        value,
        error,
      } =
        createLogisticsShipmentSchema
          .validate(
            req.body,
            {
              abortEarly:
                false,

              stripUnknown:
                true,
            }
          );


      if (error) {

        throw new ApiError(
          400,
          error.details[0]
            .message,
          error.details
        );
      }


      const shipment =
        await logisticsShipmentService
          .createShipment({

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

            payload:
              value,

            scopeFilter:
              logisticsScopeFilterForRequest(req),
          });


      res
        .status(201)
        .json(
          new ApiResponse(
            201,
            shipment,
            "Logistics shipment created successfully"
          )
        );
    }
  );


/* ============================================================
   LIST ALL
============================================================ */

export const getLogisticsShipments =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const {
        value,
        error,
      } =
        logisticsShipmentQuerySchema
          .validate(
            req.query,
            {
              abortEarly:
                false,

              stripUnknown:
                true,
            }
          );


      if (error) {

        throw new ApiError(
          400,
          error.details[0]
            .message,
          error.details
        );
      }


      const result =
        await logisticsShipmentService
          .listShipments({

            companyId:
              companyIdForRequest(
                req
              ),

            query:
              value,

            scopeFilter:
              logisticsScopeFilterForRequest(req),
          });


      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Logistics shipments fetched successfully"
          )
        );
    }
  );


/* ============================================================
   AIR CARGO
============================================================ */

export const getAirCargoShipments =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const {
        value,
        error,
      } =
        logisticsShipmentQuerySchema
          .validate(
            {
              ...req.query,

              shipmentMode:
                "air_cargo",
            },
            {
              stripUnknown:
                true,
            }
          );


      if (error) {
        throw new ApiError(
          400,
          error.details[0]
            .message
        );
      }


      let result;

      try {
        result =
          await logisticsShipmentService
            .listAirCargo({

              companyId:
                companyIdForRequest(
                  req
                ),

              query:
                value,

              scopeFilter:
                logisticsScopeFilterForRequest(req),
            });
      } catch (error) {
        console.error("[API][Air Cargo Shipments][ERROR]", {
          message: error?.message,
          name: error?.name,
          stack: error?.stack,
          query: value,
          scope: req.logisticsScope?.viewScope,
          scopeFilter: req.logisticsScope?.filter,
        });

        throw error;
      }


      console.info("[API][Air Cargo Shipments]", {
        query: value,
        scope: req.logisticsScope?.viewScope,
        scopeFilter: req.logisticsScope?.filter,
        total: result?.pagination?.total ?? result?.data?.length ?? 0,
        returned: result?.data?.length ?? 0,
        rows: (result?.data || []).map((shipment) => ({
          shipmentNumber: shipment.shipmentNumber,
          shipmentMode: shipment.shipmentMode,
          status: shipment.status,
          customerName: shipment.customerName,
        })),
      });

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Air cargo shipments fetched successfully"
          )
        );
    }
  );


/* ============================================================
   SEA FREIGHT
============================================================ */

export const getSeaFreightShipments =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const {
        value,
        error,
      } =
        logisticsShipmentQuerySchema
          .validate(
            {
              ...req.query,

              shipmentMode:
                "sea_freight",
            },
            {
              stripUnknown:
                true,
            }
          );


      if (error) {
        throw new ApiError(
          400,
          error.details[0]
            .message
        );
      }


      let result;

      try {
        result =
          await logisticsShipmentService
            .listSeaFreight({

              companyId:
                companyIdForRequest(
                  req
                ),

              query:
                value,

              scopeFilter:
                logisticsScopeFilterForRequest(req),
            });
      } catch (error) {
        console.error("[API][Sea Freight Shipments][ERROR]", {
          message: error?.message,
          name: error?.name,
          stack: error?.stack,
          query: value,
          scope: req.logisticsScope?.viewScope,
          scopeFilter: req.logisticsScope?.filter,
        });

        throw error;
      }


      console.info("[API][Sea Freight Shipments]", {
        query: value,
        scope: req.logisticsScope?.viewScope,
        scopeFilter: req.logisticsScope?.filter,
        total: result?.pagination?.total ?? result?.data?.length ?? 0,
        returned: result?.data?.length ?? 0,
        rows: (result?.data || []).map((shipment) => ({
          shipmentNumber: shipment.shipmentNumber,
          shipmentMode: shipment.shipmentMode,
          status: shipment.status,
          customerName: shipment.customerName,
        })),
      });

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Sea freight shipments fetched successfully"
          )
        );
    }
  );


/* ============================================================
   DASHBOARD
============================================================ */

export const getLogisticsDashboard =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const dashboard =
        await logisticsShipmentService
          .getDashboard({

            companyId:
              companyIdForRequest(
                req
              ),

            scopeFilter:
              logisticsScopeFilterForRequest(req),
          });


      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            dashboard,
            "Logistics dashboard fetched successfully"
          )
        );
    }
  );


/* ============================================================
   GET BY SHIPMENT NUMBER
============================================================ */

export const getLogisticsShipmentByNumber =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const shipment =
        await logisticsShipmentService
          .getShipmentByNumber({

            companyId:
              companyIdForRequest(
                req
              ),

            shipmentNumber:
              req.params
                .shipmentNumber,
          });


      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            shipment,
            "Logistics shipment fetched successfully"
          )
        );
    }
  );


/* ============================================================
   GET ONE
============================================================ */

export const getLogisticsShipmentById =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const shipment =
        await logisticsShipmentService
          .getShipment({

            companyId:
              companyIdForRequest(
                req
              ),

            shipmentId:
              req.params.id,

            scopeFilter:
              logisticsScopeFilterForRequest(req),
          });


      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            shipment,
            "Logistics shipment fetched successfully"
          )
        );
    }
  );


/* ============================================================
   UPDATE
============================================================ */

export const updateLogisticsShipment =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const {
        value,
        error,
      } =
        updateLogisticsShipmentSchema
          .validate(
            req.body,
            {
              abortEarly:
                false,

              stripUnknown:
                true,
            }
          );


      if (error) {

        throw new ApiError(
          400,
          error.details[0]
            .message,
          error.details
        );
      }


      const shipment =
        await logisticsShipmentService
          .updateShipment({

            companyId:
              companyIdForRequest(
                req
              ),

            shipmentId:
              req.params.id,

            userId:
              req.user?._id ||
              null,

            payload:
              value,

            scopeFilter:
              logisticsScopeFilterForRequest(req),
          });


      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            shipment,
            "Logistics shipment updated successfully"
          )
        );
    }
  );


/* ============================================================
   UPDATE STATUS
============================================================ */

export const updateLogisticsShipmentStatus =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const {
        value,
        error,
      } =
        updateLogisticsShipmentStatusSchema
          .validate(
            req.body,
            {
              abortEarly:
                false,

              stripUnknown:
                true,
            }
          );


      if (error) {

        throw new ApiError(
          400,
          error.details[0]
            .message,
          error.details
        );
      }


      const shipment =
        await logisticsShipmentService
          .updateShipmentStatus({

            companyId:
              companyIdForRequest(
                req
              ),

            shipmentId:
              req.params.id,

            userId:
              req.user?._id ||
              null,

            status:
              value.status,

            statusOther:
              value.statusOther,

            currentLocation:
              value.currentLocation,

            trackingReference:
              value.trackingReference,

            estimatedDeparture:
              value.estimatedDeparture,

            estimatedArrival:
              value.estimatedArrival,

            remarks:
              value.remarks,

            scopeFilter:
              logisticsScopeFilterForRequest(req),
          });


      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            shipment,
            "Shipment status updated successfully"
          )
        );
    }
  );


/* ============================================================
   DELETE
============================================================ */

export const deleteLogisticsShipment =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const result =
        await logisticsShipmentService
          .deleteShipment({

            companyId:
              companyIdForRequest(
                req
              ),

            shipmentId:
              req.params.id,

            userId:
              req.user?._id ||
              null,

            scopeFilter:
              logisticsScopeFilterForRequest(req),
          });


      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Logistics shipment removed successfully"
          )
        );
    }
  );



