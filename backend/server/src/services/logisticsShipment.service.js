import mongoose from "mongoose";

import LogisticsShipment from "../models/LogisticsShipment.js";

import logisticsShipmentRepository
  from "../repositories/logisticsShipment.repository.js";

import {
    ApiError
  } from "../utils/apiError.js";


class LogisticsShipmentService {

  /* ==========================================================
     CREATE SHIPMENT
  ========================================================== */

  async createShipment({
    companyId,
    userId = null,
    employeeId = null,
    payload,
  }) {

    this.assertCompanyId(
      companyId
    );


    const normalizedPayload =
      this.normalizePayload(
        payload
      );


    /*
     * Generate shipment number when frontend has
     * not supplied one.
     *
     * Examples:
     *
     * AC-260808-0001
     * SF-260808-0001
     * RD-260808-0001
     */
    if (
      !normalizedPayload
        .shipmentNumber
    ) {

      normalizedPayload.shipmentNumber =
        await this.generateShipmentNumber({
          companyId,

          shipmentMode:
            normalizedPayload
              .shipmentMode,
        });
    }


    const exists =
      await logisticsShipmentRepository
        .shipmentNumberExists({
          companyId,

          shipmentNumber:
            normalizedPayload
              .shipmentNumber,
        });


    if (exists) {

      throw new ApiError(
        409,
        "Shipment number already exists"
      );
    }


    /*
     * Initial status event.
     */
    const initialStatus =
      normalizedPayload.status ||
      "draft";


    normalizedPayload.statusHistory = [
      {
        status:
          initialStatus,

        location:
          normalizedPayload
            .currentLocation ||
          "",

        remarks:
          normalizedPayload
            .remarks,

        changedBy:
          userId,

        changedAt:
          new Date(),
      },
    ];


    normalizedPayload.companyId =
      companyId;


    normalizedPayload.createdBy =
      userId;


    normalizedPayload.updatedBy =
      userId;


    normalizedPayload
      .createdByEmployeeId =
        employeeId ||
        null;


    if (
      employeeId &&
      !normalizedPayload.assignedTo
    ) {

      normalizedPayload.assignedTo =
        employeeId;
    }


    try {
      return await logisticsShipmentRepository
        .create(
          normalizedPayload
        );
    } catch (error) {
      throw this.normalizeCreateError(error);
    }
  }


  /* ==========================================================
     GET ONE
  ========================================================== */

  async getShipment({
    companyId,
    shipmentId,
    scopeFilter = {},
  }) {

    this.assertCompanyId(
      companyId
    );


    this.assertObjectId(
      shipmentId,
      "Invalid shipment ID"
    );


    const shipment =
      await logisticsShipmentRepository
        .findById({
          companyId,
          shipmentId,
          scopeFilter,
        });


    if (!shipment) {

      throw new ApiError(
        404,
        "Logistics shipment not found"
      );
    }


    return shipment;
  }


  /* ==========================================================
     GET BY SHIPMENT NUMBER
  ========================================================== */

  async getShipmentByNumber({
    companyId,
    shipmentNumber,
  }) {

    this.assertCompanyId(
      companyId
    );


    if (
      !String(
        shipmentNumber || ""
      ).trim()
    ) {

      throw new ApiError(
        400,
        "Shipment number is required"
      );
    }


    const shipment =
      await logisticsShipmentRepository
        .findByShipmentNumber({
          companyId,
          shipmentNumber,
        });


    if (!shipment) {

      throw new ApiError(
        404,
        "Logistics shipment not found"
      );
    }


    return shipment;
  }


  /* ==========================================================
     LIST SHIPMENTS
  ========================================================== */

  async listShipments({
    companyId,
    query = {},
    scopeFilter = {},
  }) {

    this.assertCompanyId(
      companyId
    );


    return logisticsShipmentRepository
      .paginate({
        companyId,

        page:
          query.page,

        limit:
          query.limit,

        search:
          query.search,

        shipmentMode:
          query.shipmentMode,

        status:
          query.status,

        customerId:
          query.customerId,

        assignedTo:
          query.assignedTo,

        fromDate:
          query.fromDate,

        toDate:
          query.toDate,

        sortBy:
          query.sortBy,

        sortOrder:
          query.sortOrder,

        scopeFilter,
      });
  }


  /* ==========================================================
     LIST AIR CARGO
  ========================================================== */

  async listAirCargo({
    companyId,
    query = {},
    scopeFilter = {},
  }) {

    return this.listShipments({
      companyId,

      query: {
        ...query,

        shipmentMode:
          "air_cargo",
      },

      scopeFilter,
    });
  }


  /* ==========================================================
     LIST SEA FREIGHT
  ========================================================== */

  async listSeaFreight({
    companyId,
    query = {},
    scopeFilter = {},
  }) {

    return this.listShipments({
      companyId,

      query: {
        ...query,

        shipmentMode:
          "sea_freight",
      },

      scopeFilter,
    });
  }


  /* ==========================================================
     UPDATE SHIPMENT
  ========================================================== */

  async updateShipment({
    companyId,
    shipmentId,
    userId = null,
    payload,
    scopeFilter = {},
  }) {

    this.assertCompanyId(
      companyId
    );


    this.assertObjectId(
      shipmentId,
      "Invalid shipment ID"
    );


    const current =
      await logisticsShipmentRepository
        .findById({
          companyId,
          shipmentId,
          scopeFilter,
        });


    if (!current) {

      throw new ApiError(
        404,
        "Logistics shipment not found"
      );
    }


    const normalizedPayload =
      this.normalizePayload(
        payload
      );


    /*
     * Company isolation fields can never be changed
     * from request body.
     */
    delete normalizedPayload.companyId;
    delete normalizedPayload.createdBy;
    delete normalizedPayload.createdByEmployeeId;
    delete normalizedPayload.statusHistory;
    delete normalizedPayload.isActive;


    if (
      normalizedPayload
        .shipmentNumber
    ) {

      const exists =
        await logisticsShipmentRepository
          .shipmentNumberExists({
            companyId,

            shipmentNumber:
              normalizedPayload
                .shipmentNumber,

            excludeId:
              shipmentId,
          });


      if (exists) {

        throw new ApiError(
          409,
          "Shipment number already exists"
        );
      }
    }


    /*
     * Status must go through updateShipmentStatus()
     * so history is never silently skipped.
     */
    if (
      Object.prototype
        .hasOwnProperty.call(
          normalizedPayload,
          "status"
        )
    ) {

      delete normalizedPayload.status;
      delete normalizedPayload.statusOther;
    }


    normalizedPayload.updatedBy =
      userId;


    const updated =
      await logisticsShipmentRepository
        .updateById({
          companyId,
          shipmentId,
          payload:
            normalizedPayload,
          scopeFilter,
        });


    if (!updated) {

      throw new ApiError(
        404,
        "Logistics shipment not found"
      );
    }


    return updated;
  }


  /* ==========================================================
     UPDATE STATUS
  ========================================================== */

  async updateShipmentStatus({
    companyId,
    shipmentId,
    userId = null,
    scopeFilter = {},

    status,
    statusOther = "",

    currentLocation = "",
    trackingReference = "",
    estimatedDeparture = null,
    estimatedArrival = null,
    remarks,
  }) {

    this.assertCompanyId(
      companyId
    );


    this.assertObjectId(
      shipmentId,
      "Invalid shipment ID"
    );


    const current =
      await logisticsShipmentRepository
        .findById({
          companyId,
          shipmentId,
          scopeFilter,
        });


    if (!current) {

      throw new ApiError(
        404,
        "Logistics shipment not found"
      );
    }


    if (
      status ===
        "other" &&
      !String(
        statusOther || ""
      ).trim()
    ) {

      throw new ApiError(
        400,
        "Status details are required when Other is selected"
      );
    }


    if (
      !String(
        remarks || ""
      ).trim()
    ) {

      throw new ApiError(
        400,
        "Remarks are required for shipment status updates"
      );
    }


    const updated =
      await logisticsShipmentRepository
        .updateStatus({
          companyId,
          shipmentId,
          scopeFilter,

          status,

          statusOther:
            String(
              statusOther || ""
            ).trim(),

          currentLocation:
            String(
              currentLocation || ""
            ).trim(),

          trackingReference:
            String(
              trackingReference || ""
            ).trim(),

          estimatedDeparture,

          estimatedArrival,

          remarks:
            String(
              remarks
            ).trim(),

          changedBy:
            userId,

          updatedBy:
            userId,
          scopeFilter,
        });


    if (!updated) {

      throw new ApiError(
        404,
        "Logistics shipment not found"
      );
    }


    return updated;
  }


  /* ==========================================================
     DELETE
  ========================================================== */

  async deleteShipment({
    companyId,
    shipmentId,
    userId = null,
    scopeFilter = {},
  }) {

    this.assertCompanyId(
      companyId
    );


    this.assertObjectId(
      shipmentId,
      "Invalid shipment ID"
    );


    const current =
      await logisticsShipmentRepository
        .findById({
          companyId,
          shipmentId,
          scopeFilter,
        });


    if (!current) {

      throw new ApiError(
        404,
        "Logistics shipment not found"
      );
    }


    /*
     * Delivered shipment should remain as permanent
     * commercial/audit history.
     */
    if (
      current.status ===
      "delivered"
    ) {

      throw new ApiError(
        409,
        "Delivered shipment cannot be deleted"
      );
    }


    const deleted =
      await logisticsShipmentRepository
        .softDelete({
          companyId,
          shipmentId,
          updatedBy:
            userId,
          scopeFilter,
        });


    if (!deleted) {

      throw new ApiError(
        404,
        "Logistics shipment not found"
      );
    }


    return {
      shipmentId:
        deleted._id,

      shipmentNumber:
        deleted.shipmentNumber,

      deleted:
        true,
    };
  }


  /* ==========================================================
     DASHBOARD
  ========================================================== */

  async getDashboard({
    companyId,
    scopeFilter = {},
  }) {

    this.assertCompanyId(
      companyId
    );


    const raw =
      await logisticsShipmentRepository
        .dashboardSummary(
          companyId,
          scopeFilter
        );


    const totals =
      raw.totals?.[0] || {
        totalShipments:
          0,

        totalRevenue:
          0,
      };


    const byMode =
      this.groupCounts(
        raw.byMode
      );


    const byStatus =
      this.groupCounts(
        raw.byStatus
      );


    return {

      totalShipments:
        totals.totalShipments ||
        0,

      totalRevenue:
        totals.totalRevenue ||
        0,


      airCargo:
        byMode.air_cargo ||
        0,

      seaFreight:
        byMode.sea_freight ||
        0,

      road:
        byMode.road ||
        0,


      draft:
        byStatus.draft ||
        0,

      pending:
        (
          byStatus.booking_created ||
          0
        ) +
        (
          byStatus.pickup_pending ||
          0
        ) +
        (
          byStatus.documents_pending ||
          0
        ),

      inTransit:
        byStatus.in_transit ||
        0,

      customs:
        byStatus.customs ||
        0,

      delivered:
        byStatus.delivered ||
        0,

      hold:
        byStatus.hold ||
        0,

      cancelled:
        byStatus.cancelled ||
        0,


      byMode,

      byStatus,

      recentShipments:
        raw.recentShipments ||
        [],
    

      employeeBreakdown:
        raw.employeeBreakdown ||
        [],
    };
  }



  async getOverview({
    companyId,
    scopeFilter = {},
    viewScope = "own",
    permissions = [],
  }) {
    const dashboard = await this.getDashboard({ companyId, scopeFilter });

    return {
      ...dashboard,
      viewScope,
      permissions,
      canShowEmployeeBreakdown: viewScope === "team" || viewScope === "all",
    };
  }

  async getStatusHistory({
    companyId,
    shipmentId,
    scopeFilter = {},
  }) {
    this.assertCompanyId(companyId);
    this.assertObjectId(shipmentId, "Invalid shipment ID");

    const shipment = await logisticsShipmentRepository.statusHistory({
      companyId,
      shipmentId,
      scopeFilter,
    });

    if (!shipment) {
      throw new ApiError(404, "Logistics shipment not found");
    }

    return shipment;
  }


  /* ==========================================================
     GENERATE NUMBER
  ========================================================== */

  async generateShipmentNumber({
    companyId,
    shipmentMode,
  }) {

    const prefix =
      this.shipmentPrefix(
        shipmentMode
      );


    const now =
      new Date();


    const year =
      String(
        now.getFullYear()
      ).slice(-2);


    const month =
      String(
        now.getMonth() + 1
      ).padStart(
        2,
        "0"
      );


    const day =
      String(
        now.getDate()
      ).padStart(
        2,
        "0"
      );


    const dateCode =
      `${year}${month}${day}`;


    const latest =
      await logisticsShipmentRepository
        .findLatestShipmentNumber({
          companyId,
          prefix,
          dateCode,
        });


    let nextSequence =
      1;


    if (
      latest
        ?.shipmentNumber
    ) {

      const parts =
        latest
          .shipmentNumber
          .split("-");


      const last =
        Number(
          parts[
            parts.length - 1
          ]
        );


      if (
        Number.isFinite(
          last
        )
      ) {

        nextSequence =
          last + 1;
      }
    }


    /*
     * Protect against concurrent requests.
     *
     * Unique database index on:
     *
     * companyId + shipmentNumber
     *
     * remains the final protection.
     */
    for (
      let attempt = 0;
      attempt < 100;
      attempt += 1
    ) {

      const sequence =
        String(
          nextSequence +
          attempt
        ).padStart(
          4,
          "0"
        );


      const candidate =
        `${prefix}-${dateCode}-${sequence}`;


      const exists =
        await logisticsShipmentRepository
          .shipmentNumberExists({
            companyId,

            shipmentNumber:
              candidate,
          });


      if (!exists) {

        return candidate;
      }
    }


    throw new ApiError(
      500,
      "Unable to generate shipment number"
    );
  }


  /* ==========================================================
     NORMALIZE PAYLOAD
  ========================================================== */

  normalizePayload(
    payload = {}
  ) {

    const normalized = {
      ...payload,
    };


    if (
      normalized
        .shipmentNumber
    ) {

      normalized.shipmentNumber =
        String(
          normalized
            .shipmentNumber
        )
          .trim()
          .toUpperCase();
    }


    if (
      normalized
        .customerName !==
      undefined
    ) {

      normalized.customerName =
        String(
          normalized
            .customerName ||
          ""
        ).trim();
    }


    if (
      normalized
        .shipmentModeOther !==
      undefined
    ) {

      normalized.shipmentModeOther =
        String(
          normalized
            .shipmentModeOther ||
          ""
        ).trim();
    }


    if (
      normalized
        .statusOther !==
      undefined
    ) {

      normalized.statusOther =
        String(
          normalized
            .statusOther ||
          ""
        ).trim();
    }


    if (
      normalized
        .remarks !==
      undefined
    ) {

      normalized.remarks =
        String(
          normalized
            .remarks ||
          ""
        ).trim();
    }


    /*
     * Calculate charges at service layer too.
     *
     * Mongoose pre-validation also performs the
     * calculation as final server-side protection.
     */
    if (
      normalized.charges
    ) {

      normalized.charges = {
        ...normalized.charges,

        totalAmount:
          this.calculateCharges(
            normalized.charges
          ),
      };
    }


    return normalized;
  }


  /* ==========================================================
     CALCULATE CHARGES
  ========================================================== */

  calculateCharges(
    charges = {}
  ) {

    return (
      this.number(
        charges.freightAmount
      ) +

      this.number(
        charges.chaCharge
      ) +

      this.number(
        charges.documentationCharge
      ) +

      this.number(
        charges.transportationCharge
      ) +

      this.number(
        charges.warehouseCharge
      ) +

      this.number(
        charges.handlingCharge
      ) +

      this.number(
        charges.insuranceCharge
      ) +

      this.number(
        charges.otherCharge
      )
    );
  }


  /* ==========================================================
     PREFIX
  ========================================================== */

  shipmentPrefix(
    shipmentMode
  ) {

    switch (
      shipmentMode
    ) {

      case "air_cargo":
        return "AC";


      case "sea_freight":
        return "SF";


      case "road":
        return "RD";


      default:
        return "LG";
    }
  }


  /* ==========================================================
     HELPERS
  ========================================================== */

  groupCounts(
    rows = []
  ) {

    return rows.reduce(
      (
        result,
        row
      ) => {

        if (
          row?._id
        ) {

          result[row._id] =
            Number(
              row.count ||
              0
            );
        }


        return result;
      },

      {}
    );
  }


  assertCompanyId(
    companyId
  ) {

    if (
      !companyId
    ) {

      throw new ApiError(
        400,
        "Company ID is required"
      );
    }


    if (
      !mongoose.isValidObjectId(
        companyId
      )
    ) {

      throw new ApiError(
        400,
        "Invalid company ID"
      );
    }
  }


  assertObjectId(
    value,
    message =
      "Invalid ID"
  ) {

    if (
      !mongoose
        .isValidObjectId(
          value
        )
    ) {

      throw new ApiError(
        400,
        message
      );
    }
  }


  number(
    value
  ) {

    const result =
      Number(value);


    return Number.isFinite(
      result
    )
      ? result
      : 0;
  }
}


export const
  logisticsShipmentService =
    new LogisticsShipmentService();


export default
  logisticsShipmentService;





