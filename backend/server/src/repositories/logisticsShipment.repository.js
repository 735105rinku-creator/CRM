import mongoose from "mongoose";

import "../models/Employee.js";
import "../models/LogisticsCustomer.js";
import "../models/LogisticsTransporter.js";
import "../models/LogisticsVendor.js";
import "../models/LogisticsWarehouse.js";
import LogisticsShipment from "../models/LogisticsShipment.js";


class LogisticsShipmentRepository {

  /* ==========================================================
     CREATE
  ========================================================== */

  async create(payload) {
    return LogisticsShipment.create(payload);
  }


  /* ==========================================================
     FIND BY ID
  ========================================================== */

  async findById({
    shipmentId,
    companyId,
    includeInactive = false,
    scopeFilter = {},
  }) {

    const filter = {
      _id: shipmentId,
      companyId,
      ...scopeFilter,
    };

    if (!includeInactive) {
      filter.isActive = true;
    }

    return LogisticsShipment
      .findOne(filter)
      .populate(
        "customerId",
        "customerCode customerName customerType contactPerson mobile email"
      )
      .populate(
        "assignedTo",
        "employeeCode firstName lastName"
      )
      .populate(
        "createdByEmployeeId",
        "employeeCode firstName lastName"
      )
      .populate(
        "transport.transporterId",
        "transporterCode transporterName contactPerson mobile email"
      )
      .populate(
        "transport.driverId",
        "transporterCode transporterName defaultDriverName defaultDriverMobile status"
      )
      .populate(
        "transport.vehicleId",
        "transporterCode transporterName vehicleTypes defaultVehicleNumber status"
      )
      .populate(
        "warehouse.warehouseId",
        "warehouseCode warehouseName city state status"
      )
      .populate(
        "customs.chaVendorId",
        "vendorCode vendorName vendorType contactPerson mobile email"
      )
      .lean();
  }


  /* ==========================================================
     FIND BY SHIPMENT NUMBER
  ========================================================== */

  async findByShipmentNumber({
    shipmentNumber,
    companyId,
  }) {

    return LogisticsShipment
      .findOne({
        companyId,
        shipmentNumber:
          String(shipmentNumber)
            .trim()
            .toUpperCase(),
        isActive: true,
      })
      .lean();
  }


  /* ==========================================================
     EXISTS
  ========================================================== */

  async shipmentNumberExists({
    companyId,
    shipmentNumber,
    excludeId = null,
  }) {

    const filter = {
      companyId,

      shipmentNumber:
        String(shipmentNumber)
          .trim()
          .toUpperCase(),

      isActive: true,
    };

    if (excludeId) {
      filter._id = {
        $ne: excludeId,
      };
    }

    return LogisticsShipment.exists(
      filter
    );
  }


  /* ==========================================================
     LIST / PAGINATION
  ========================================================== */

  async paginate({
    companyId,

    page = 1,
    limit = 20,

    search = "",
    shipmentMode = "",
    status = "",

    customerId = null,
    assignedTo = null,
    scopeFilter = {},

    fromDate = null,
    toDate = null,

    sortBy = "createdAt",
    sortOrder = "desc",
  }) {

    const filter =
      this.buildFilter({
        companyId,

        search,
        shipmentMode,
        status,

        customerId,
        assignedTo,

        fromDate,
        toDate,

        scopeFilter,
      });


    const safePage =
      Math.max(
        Number(page) || 1,
        1
      );


    const safeLimit =
      Math.min(
        Math.max(
          Number(limit) || 20,
          1
        ),
        100
      );


    const skip =
      (safePage - 1) *
      safeLimit;


    const allowedSortFields =
      new Set([
        "createdAt",
        "updatedAt",
        "shipmentNumber",
        "estimatedArrival",
        "status",
      ]);


    const safeSortBy =
      allowedSortFields.has(
        sortBy
      )
        ? sortBy
        : "createdAt";


    const direction =
      sortOrder === "asc"
        ? 1
        : -1;


    const sort = {
      [safeSortBy]:
        direction,
    };


    const [
      data,
      total,
    ] =
      await Promise.all([

        LogisticsShipment
          .find(filter)

          .populate(
            "customerId",
            "customerCode customerName customerType contactPerson mobile email"
          )

          .populate(
            "assignedTo",
            "employeeCode firstName lastName"
          )


          .populate(
            "transport.transporterId",
            "transporterCode transporterName contactPerson mobile email"
          )

          .populate(
            "transport.driverId",
            "transporterCode transporterName defaultDriverName defaultDriverMobile status"
          )

          .populate(
            "transport.vehicleId",
            "transporterCode transporterName vehicleTypes defaultVehicleNumber status"
          )

          .populate(
            "warehouse.warehouseId",
            "warehouseCode warehouseName city state status"
          )

          .populate(
            "customs.chaVendorId",
            "vendorCode vendorName vendorType contactPerson mobile email"
          )

          .sort(sort)

          .skip(skip)

          .limit(safeLimit)

          .lean(),


        LogisticsShipment
          .countDocuments(
            filter
          ),
      ]);


    const totalPages =
      Math.max(
        Math.ceil(
          total /
          safeLimit
        ),
        1
      );


    return {
      data,

      pagination: {
        page:
          safePage,

        limit:
          safeLimit,

        total,

        totalPages,

        hasNextPage:
          safePage <
          totalPages,

        hasPreviousPage:
          safePage >
          1,
      },
    };
  }


  /* ==========================================================
     UPDATE
  ========================================================== */

  async updateById({
    shipmentId,
    companyId,
    payload,
    scopeFilter = {},
  }) {

    return LogisticsShipment
      .findOneAndUpdate(
        {
          _id:
            shipmentId,

          companyId,

          isActive:
            true,

          ...scopeFilter,
        },

        {
          $set:
            payload,
        },

        {
          new: true,
          runValidators: true,
        }
      )

      .populate(
        "customerId",
        "customerCode customerName customerType contactPerson mobile email"
      )

      .populate(
        "assignedTo",
        "employeeCode firstName lastName"
      );
  }


  /* ==========================================================
     STATUS UPDATE
  ========================================================== */

  async updateStatus({
    shipmentId,
    companyId,
    scopeFilter = {},

    status,
    statusOther = "",

    currentLocation = "",

    trackingReference = "",
    estimatedDeparture = null,
    estimatedArrival = null,

    remarks,

    changedBy = null,
    updatedBy = null,
  }) {

    const history = {
      status,

      location:
        currentLocation,

      remarks,

      changedBy,

      changedAt:
        new Date(),
    };


    const setPayload = {
      status,

      statusOther,

      currentLocation,

      updatedBy,
    };

    if (String(trackingReference || "").trim()) {
      setPayload.trackingReference = String(trackingReference).trim();
    }

    if (estimatedDeparture !== undefined) {
      setPayload.estimatedDeparture = estimatedDeparture || null;
    }

    if (estimatedArrival !== undefined) {
      setPayload.estimatedArrival = estimatedArrival || null;
    }


    /*
     * Maintain key actual timestamps automatically.
     */
    if (
      status ===
      "in_transit"
    ) {

      setPayload.actualDeparture =
        new Date();
    }


    if (
      status ===
      "arrived"
    ) {

      setPayload.actualArrival =
        new Date();
    }


    if (
      status ===
      "delivered"
    ) {

      setPayload.actualArrival =
        new Date();
    }


    return LogisticsShipment
      .findOneAndUpdate(
        {
          _id:
            shipmentId,

          companyId,

          isActive:
            true,

          ...scopeFilter,
        },

        {
          $set:
            setPayload,

          $push: {
            statusHistory:
              history,
          },
        },

        {
          new: true,
          runValidators: true,
        }
      )

      .populate(
        "customerId",
        "customerCode customerName"
      )

      .populate(
        "assignedTo",
        "employeeCode firstName lastName"
      );
  }


  /* ==========================================================
     SOFT DELETE
  ========================================================== */

  async softDelete({
    shipmentId,
    companyId,
    updatedBy = null,
    scopeFilter = {},
  }) {

    return LogisticsShipment
      .findOneAndUpdate(
        {
          _id:
            shipmentId,

          companyId,

          isActive:
            true,

          ...scopeFilter,
        },

        {
          $set: {
            isActive:
              false,

            updatedBy,
          },
        },

        {
          new:
            true,
        }
      )
      .lean();
  }


  /* ==========================================================
     COUNT
  ========================================================== */

  async count({
    companyId,
    shipmentMode = "",
    status = "",
    scopeFilter = {},
  }) {

    const filter = {
      companyId,
      isActive: true,
      ...scopeFilter,
    };


    if (shipmentMode) {
      filter.shipmentMode = {
        $in:
          shipmentModeAliases(
            shipmentMode
          ),
      };
    }


    if (status) {

      const normalizedStatus =
        String(status)
          .trim()
          .toLowerCase();

      if (normalizedStatus === "pending") {
        filter.status = {
          $nin: [
            "delivered",
            "cancelled",
          ],
        };
      } else {
        filter.status =
          normalizedStatus;
      }
    }


    return LogisticsShipment
      .countDocuments(
        filter
      );
  }


  /* ==========================================================
     DASHBOARD SUMMARY
  ========================================================== */

  async dashboardSummary(
    companyId,
    scopeFilter = {}
  ) {

    const companyObjectId =
      new mongoose.Types.ObjectId(
        String(companyId)
      );


    const scopedMatch = this.toAggregationMatch(scopeFilter);

    const result =
      await LogisticsShipment.aggregate([
        {
          $match: {
            companyId:
              companyObjectId,

            isActive:
              true,

            ...scopedMatch,
          },
        },

        {
          $facet: {

            totals: [
              {
                $group: {
                  _id:
                    null,

                  totalShipments: {
                    $sum: 1,
                  },

                  totalRevenue: {
                    $sum:
                      "$charges.totalAmount",
                  },
                },
              },
            ],


            byMode: [
              {
                $group: {
                  _id:
                    "$shipmentMode",

                  count: {
                    $sum: 1,
                  },
                },
              },
            ],


            byStatus: [
              {
                $group: {
                  _id:
                    "$status",

                  count: {
                    $sum: 1,
                  },
                },
              },
            ],


            employeeBreakdown: [
              {
                $group: {
                  _id: "$assignedTo",
                  total: { $sum: 1 },
                  pending: {
                    $sum: {
                      $cond: [
                        { $in: ["$status", ["draft", "booking_created", "container_pending", "pickup_pending", "documents_pending", "hold"]] },
                        1,
                        0
                      ]
                    }
                  },
                  inProgress: {
                    $sum: {
                      $cond: [
                        { $in: ["$status", ["stuffing", "picked_up", "at_warehouse", "customs", "loaded", "in_transit", "arrived", "out_for_delivery"]] },
                        1,
                        0
                      ]
                    }
                  },
                  completed: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
                  cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
                },
              },
              {
                $lookup: {
                  from: "employees",
                  localField: "_id",
                  foreignField: "_id",
                  as: "employee",
                },
              },
              { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
              {
                $project: {
                  _id: 0,
                  employeeId: "$_id",
                  employeeCode: "$employee.employeeCode",
                  employeeName: {
                    $trim: { input: { $concat: [{ $ifNull: ["$employee.firstName", ""] }, " ", { $ifNull: ["$employee.lastName", ""] }] } }
                  },
                  total: 1,
                  pending: 1,
                  inProgress: 1,
                  completed: 1,
                  cancelled: 1,
                },
              },
              { $sort: { total: -1 } },
            ],

            recentShipments: [
              {
                $sort: {
                  createdAt: -1,
                },
              },

              {
                $limit: 8,
              },

              {
                $project: {
                  shipmentNumber: 1,
                  shipmentMode: 1,
                  customerName: 1,

                  origin: 1,
                  destination: 1,

                  status: 1,
                  currentLocation: 1,

                  estimatedArrival: 1,

                  "charges.totalAmount":
                    1,

                  createdAt: 1,
                },
              },
            ],
          },
        },
      ]);


    return result[0] || {
      totals: [],
      byMode: [],
      byStatus: [],
      employeeBreakdown: [],
      recentShipments: [],
    };
  }


  /* ==========================================================
     NEXT RUNNING NUMBER
  ========================================================== */

  async findLatestShipmentNumber({
    companyId,
    prefix,
    dateCode,
  }) {

    const regex =
      new RegExp(
        `^${prefix}-${dateCode}-`,
        "i"
      );


    return LogisticsShipment
      .findOne({
        companyId,

        shipmentNumber: {
          $regex:
            regex,
        },
      })

      .sort({
        shipmentNumber:
          -1,
      })

      .select(
        "shipmentNumber"
      )

      .lean();
  }



  async statusHistory({
    shipmentId,
    companyId,
    scopeFilter = {},
  }) {
    return LogisticsShipment
      .findOne({
        _id: shipmentId,
        companyId,
        isActive: true,
        ...scopeFilter,
      })
      .select("shipmentNumber customerName shipmentMode status statusHistory")
      .populate("statusHistory.changedBy", "name email role")
      .lean();
  }

  toAggregationMatch(scopeFilter = {}) {
    if (!scopeFilter || !Object.keys(scopeFilter).length) {
      return {};
    }

    const normalizeValue = (value) => {
      if (value && typeof value === "object" && value.$in) {
        return {
          $in: value.$in.map((id) => new mongoose.Types.ObjectId(String(id))),
        };
      }

      return new mongoose.Types.ObjectId(String(value));
    };

    if (Array.isArray(scopeFilter.$or)) {
      const conditions = scopeFilter.$or
        .map((condition) => {
          const normalized = {};

          if (condition.assignedTo) {
            normalized.assignedTo = normalizeValue(condition.assignedTo);
          }

          if (condition.createdByEmployeeId) {
            normalized.createdByEmployeeId = normalizeValue(condition.createdByEmployeeId);
          }

          return normalized;
        })
        .filter((condition) => Object.keys(condition).length);

      return conditions.length ? { $or: conditions } : {};
    }

    const match = {};

    if (scopeFilter.assignedTo) {
      match.assignedTo = normalizeValue(scopeFilter.assignedTo);
    }

    if (scopeFilter.createdByEmployeeId) {
      match.createdByEmployeeId = normalizeValue(scopeFilter.createdByEmployeeId);
    }

    return match;
  }


  /* ==========================================================
     BUILD FILTER
  ========================================================== */

  buildFilter({
    companyId,

    search = "",
    shipmentMode = "",
    status = "",

    customerId = null,
    assignedTo = null,
    scopeFilter = {},

    fromDate = null,
    toDate = null,
  }) {

    const filter = {
      companyId,
      isActive: true,
    };

    if (
      scopeFilter &&
      Object.keys(scopeFilter).length
    ) {
      filter.$and = [
        scopeFilter,
      ];
    }


    if (shipmentMode) {
      filter.shipmentMode = {
        $in:
          shipmentModeAliases(
            shipmentMode
          ),
      };
    }


    if (status) {

      const normalizedStatus =
        String(status)
          .trim()
          .toLowerCase();

      if (normalizedStatus === "pending") {
        filter.status = {
          $nin: [
            "delivered",
            "cancelled",
          ],
        };
      } else {
        filter.status =
          normalizedStatus;
      }
    }


    if (customerId) {

      filter.customerId =
        customerId;
    }


    if (assignedTo) {

      filter.assignedTo =
        assignedTo;
    }


    if (
      fromDate ||
      toDate
    ) {

      filter.createdAt = {};


      if (fromDate) {

        filter.createdAt.$gte =
          new Date(
            fromDate
          );
      }


      if (toDate) {

        const end =
          new Date(
            toDate
          );

        end.setHours(
          23,
          59,
          59,
          999
        );

        filter.createdAt.$lte =
          end;
      }
    }


    const normalizedSearch =
      String(
        search || ""
      ).trim();


    if (normalizedSearch) {

      const regex =
        new RegExp(
          escapeRegex(
            normalizedSearch
          ),
          "i"
        );


      const searchConditions = [

        {
          shipmentNumber:
            regex,
        },

        {
          customerName:
            regex,
        },

        {
          contactPerson:
            regex,
        },

        {
          mobile:
            regex,
        },

        {
          trackingReference:
            regex,
        },

        {
          currentLocation:
            regex,
        },

        {
          "origin.name":
            regex,
        },

        {
          "origin.city":
            regex,
        },

        {
          "destination.name":
            regex,
        },

        {
          "destination.city":
            regex,
        },

        {
          "airFreight.awbNumber":
            regex,
        },

        {
          "airFreight.flightNumber":
            regex,
        },

        {
          "seaFreight.containerNumber":
            regex,
        },

        {
          "seaFreight.billOfLading":
            regex,
        },

        {
          "seaFreight.vesselName":
            regex,
        },
      ];

      if (filter.$and) {
        filter.$and.push({
          $or: searchConditions,
        });
      } else {
        filter.$or =
          searchConditions;
      }


    }

    return filter;
  }
}


function escapeRegex(
  value
) {

  return String(value)
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
}


export const
  logisticsShipmentRepository =
    new LogisticsShipmentRepository();


export default
  logisticsShipmentRepository;








function shipmentModeAliases(value) {
  const normalized =
    String(value || "")
      .trim()
      .toLowerCase();

  const aliases = {
    air_cargo: ["air_cargo", "air-cargo"],
    "air-cargo": ["air_cargo", "air-cargo"],
    sea_freight: ["sea_freight", "sea-freight"],
    "sea-freight": ["sea_freight", "sea-freight"],
    road: ["road", "road_transport", "road-transport"],
    road_transport: ["road", "road_transport", "road-transport"],
    "road-transport": ["road", "road_transport", "road-transport"],
  };

  return aliases[normalized] || [normalized];
}






