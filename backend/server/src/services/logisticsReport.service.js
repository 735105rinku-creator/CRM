import mongoose from "mongoose";

import LogisticsShipment
  from "../models/LogisticsShipment.js";

import LogisticsInvoice
  from "../models/LogisticsInvoice.js";

import LogisticsVendorPayment
  from "../models/LogisticsVendorPayment.js";

import { ApiError }
  from "../utils/apiError.js";


class LogisticsReportService {

  /* ============================================================
     NORMALIZE MODE
  ============================================================ */

  normalizeMode(
    value
  ) {

    return (
      {
        air_cargo:
          "air-cargo",

        sea_freight:
          "sea-freight",

        road_transport:
          "road",
      }[
        value
      ] ||
      value ||
      "other"
    );
  }


  /* ============================================================
     NORMALIZE STATUS
  ============================================================ */

  normalizeStatus(
    value
  ) {

    return String(
      value ||
      ""
    )
      .replaceAll(
        "_",
        "-"
      );
  }


  /* ============================================================
     GENERATE REPORT
  ============================================================ */

  async generate({
    companyId,
    query = {},
    requester = {},
  }) {

    if (
      !companyId
    ) {

      throw new ApiError(
        400,
        "Company ID is required"
      );
    }


    /* ==========================================================
       DATE FILTERS
    ========================================================== */

    const from =
      query.fromDate
        ? new Date(
            query.fromDate
          )
        : null;


    const to =
      query.toDate
        ? new Date(
            query.toDate
          )
        : null;


    if (
      from &&
      Number.isNaN(
        from.getTime()
      )
    ) {

      throw new ApiError(
        400,
        "Invalid from date"
      );
    }


    if (
      to &&
      Number.isNaN(
        to.getTime()
      )
    ) {

      throw new ApiError(
        400,
        "Invalid to date"
      );
    }


    if (
      to
    ) {

      to.setHours(
        23,
        59,
        59,
        999
      );
    }


    /* ==========================================================
       BASE SHIPMENT FILTER

       Important:
       Employee scope is NOT applied here yet because senior
       employee dropdown options must come from department data.
    ========================================================== */

    const baseShipmentFilter = {
      companyId,
      isActive:
        true,
    };


    if (
      from ||
      to
    ) {

      baseShipmentFilter.createdAt =
        {};


      if (
        from
      ) {

        baseShipmentFilter
          .createdAt
          .$gte =
            from;
      }


      if (
        to
      ) {

        baseShipmentFilter
          .createdAt
          .$lte =
            to;
      }
    }


    if (
      query.mode &&
      query.mode !==
        "all"
    ) {

      baseShipmentFilter.shipmentMode =
        {
          "air-cargo":
            "air_cargo",

          "sea-freight":
            "sea_freight",

          road:
            "road",
        }[
          query.mode
        ] ||
        query.mode;
    }


    if (
      query.status &&
      query.status !==
        "all"
    ) {

      baseShipmentFilter.status =
        String(
          query.status
        )
          .replaceAll(
            "-",
            "_"
          );
    }


    /* ==========================================================
       REQUESTER / REPORT SCOPE
    ========================================================== */

    const reportScope =
      this.resolveReportScope({
        requester,
        query,
      });


    /*
     * Employee options are department-wide and are returned
     * only for users allowed to filter department reports.
     *
     * This query does NOT change report totals.
     */
    const employeeOptions =
      reportScope.canFilterEmployees
        ? await this.loadEmployeeOptions({
            baseShipmentFilter,
          })
        : [];


    const shipmentFilter = {
      ...baseShipmentFilter,
    };


    /* ==========================================================
       JUNIOR EMPLOYEE:
       OWN WORKSPACE ONLY

       Preferred:
         createdByEmployeeId

       Legacy fallback:
         createdBy user when employee creator is absent
    ========================================================== */

    if (
      reportScope.type ===
      "own"
    ) {

      const ownershipConditions =
        [];


      if (
        requester.employeeId &&
        mongoose.isValidObjectId(
          requester.employeeId
        )
      ) {

        ownershipConditions.push({
          createdByEmployeeId:
            requester.employeeId,
        });
      }


      if (
        requester.userId &&
        mongoose.isValidObjectId(
          requester.userId
        )
      ) {

        ownershipConditions.push({
          createdByEmployeeId:
            null,

          createdBy:
            requester.userId,
        });
      }


      /*
       * Never fall back to department-wide data if requester
       * identity is unavailable.
       */
      if (
        ownershipConditions.length ===
        0
      ) {

        shipmentFilter._id =
          null;

      } else if (
        ownershipConditions.length ===
        1
      ) {

        Object.assign(
          shipmentFilter,
          ownershipConditions[0]
        );

      } else {

        shipmentFilter.$or =
          ownershipConditions;
      }
    }


    /* ==========================================================
       SENIOR / MANAGEMENT:
       OPTIONAL EMPLOYEE FILTER
    ========================================================== */

    if (
      reportScope.type ===
        "department" &&
      reportScope.selectedEmployeeId
    ) {

      shipmentFilter.createdByEmployeeId =
        reportScope.selectedEmployeeId;
    }


    /* ==========================================================
       LOAD SHIPMENTS + CREATOR ATTRIBUTION
    ========================================================== */

    const shipments =
      await LogisticsShipment
        .find(
          shipmentFilter
        )
        .populate(
          "createdByEmployeeId",
          "employeeCode firstName lastName name displayName designation organizationRole"
        )
        .populate(
          "createdBy",
          "name displayName firstName lastName email"
        )
        .sort({
          createdAt:
            -1,
        })
        .lean();


    const shipmentNumbers =
      shipments
        .map(
          (
            shipment
          ) =>
            shipment.shipmentNumber
        )
        .filter(
          Boolean
        );


    /* ==========================================================
       FINANCIAL DATA

       Existing calculations are preserved.
       The only difference is that source records are loaded
       only for shipments already allowed by report scope.
    ========================================================== */

    let invoices =
      [];

    let vendorPayments =
      [];


    if (
      shipmentNumbers.length >
      0
    ) {

      [
        invoices,
        vendorPayments,
      ] =
        await Promise.all([

          LogisticsInvoice
            .find({
              companyId,

              isActive:
                true,

              shipmentNumber: {
                $in:
                  shipmentNumbers,
              },
            })
            .lean(),


          LogisticsVendorPayment
            .find({
              companyId,

              isActive:
                true,

              shipmentNumber: {
                $in:
                  shipmentNumbers,
              },
            })
            .lean(),

        ]);
    }


    /* ==========================================================
       INVOICE AGGREGATION
    ========================================================== */

    const invoiceMap =
      new Map();


    for (
      const invoice of invoices
    ) {

      const key =
        invoice.shipmentNumber ||
        "";


      const value =
        invoiceMap.get(
          key
        ) || {
          invoiceAmount:
            0,

          receivedAmount:
            0,

          outstandingAmount:
            0,

          gstAmount:
            0,
        };


      value.invoiceAmount +=
        Number(
          invoice.invoiceTotal ||
          0
        );


      value.receivedAmount +=
        Number(
          invoice.amountReceived ||
          0
        );


      value.outstandingAmount +=
        Number(
          invoice.balanceDue ||
          0
        );


      value.gstAmount +=
        Number(
          invoice.taxTotal ||
          0
        );


      invoiceMap.set(
        key,
        value
      );
    }


    /* ==========================================================
       VENDOR PAYMENT AGGREGATION
    ========================================================== */

    const vendorMap =
      new Map();


    for (
      const payment of vendorPayments
    ) {

      const key =
        payment.shipmentNumber ||
        "";


      const value =
        vendorMap.get(
          key
        ) || {
          vendor:
            "",

          vendorAmount:
            0,

          vendorPaid:
            0,

          vendorBalance:
            0,
        };


      if (
        !value.vendor
      ) {

        value.vendor =
          payment.vendor ||
          "";
      }


      value.vendorAmount +=
        Number(
          payment.totalAmount ||
          0
        );


      value.vendorPaid +=
        Number(
          payment.paidAmount ||
          0
        ) +
        Number(
          payment.previousAdvance ||
          0
        );


      value.vendorBalance +=
        Number(
          payment.supplierBalance ||
          payment.pendingAmount ||
          0
        );


      vendorMap.set(
        key,
        value
      );
    }


    /* ==========================================================
       SEARCH
    ========================================================== */

    const search =
      String(
        query.search ||
        ""
      )
        .trim()
        .toLowerCase();


    /* ==========================================================
       REPORT ROWS
    ========================================================== */

    const rows =
      shipments
        .map(
          (
            shipment,
            index
          ) => {

            const invoice =
              invoiceMap.get(
                shipment.shipmentNumber
              ) ||
              {};


            const vendor =
              vendorMap.get(
                shipment.shipmentNumber
              ) ||
              {};


            const creator =
              this.resolveCreator(
                shipment
              );


            return {

              id:
                String(
                  shipment._id ||
                  index +
                    1
                ),


              shipmentNo:
                shipment.shipmentNumber ||
                "",


              date:
                shipment.createdAt
                  ? new Date(
                      shipment.createdAt
                    )
                      .toISOString()
                      .slice(
                        0,
                        10
                      )
                  : "",


              customer:
                shipment.customerName ||
                "",


              vendor:
                vendor.vendor ||
                "",


              mode:
                this.normalizeMode(
                  shipment.shipmentMode
                ),


              origin:
                shipment.origin ||
                shipment.route
                  ?.origin ||
                shipment.airFreight
                  ?.departureAirport ||
                shipment.seaFreight
                  ?.originPort ||
                "",


              destination:
                shipment.destination ||
                shipment.route
                  ?.destination ||
                shipment.airFreight
                  ?.arrivalAirport ||
                shipment.seaFreight
                  ?.destinationPort ||
                "",


              invoiceAmount:
                Number(
                  invoice.invoiceAmount ||
                  0
                ),


              receivedAmount:
                Number(
                  invoice.receivedAmount ||
                  0
                ),


              outstandingAmount:
                Number(
                  invoice.outstandingAmount ||
                  0
                ),


              vendorAmount:
                Number(
                  vendor.vendorAmount ||
                  0
                ),


              vendorPaid:
                Number(
                  vendor.vendorPaid ||
                  0
                ),


              vendorBalance:
                Number(
                  vendor.vendorBalance ||
                  0
                ),


              gstAmount:
                Number(
                  invoice.gstAmount ||
                  0
                ),


              status:
                this.normalizeStatus(
                  shipment.status
                ),


              /* ===============================================
                 EMPLOYEE / CREATOR ATTRIBUTION
              =============================================== */

              createdByEmployeeId:
                creator.employeeId,

              createdByName:
                creator.name,

              createdByEmployeeCode:
                creator.employeeCode,

              createdByDesignation:
                creator.designation,

              createdByDisplay:
                creator.display,
            };
          }
        )
        .filter(
          (
            row
          ) => {

            if (
              !search
            ) {

              return true;
            }


            return [
              row.shipmentNo,
              row.customer,
              row.vendor,
              row.origin,
              row.destination,
              row.createdByName,
              row.createdByEmployeeCode,
              row.createdByDisplay,
            ]
              .some(
                (
                  value
                ) =>
                  String(
                    value ||
                    ""
                  )
                    .toLowerCase()
                    .includes(
                      search
                    )
              );
          }
        );


    /* ==========================================================
       SUMMARY

       Existing calculation preserved.
    ========================================================== */

    const summary =
      rows.reduce(
        (
          accumulator,
          row
        ) => {

          accumulator.shipments +=
            1;


          accumulator.sales +=
            row.invoiceAmount;


          accumulator.received +=
            row.receivedAmount;


          accumulator.outstanding +=
            row.outstandingAmount;


          accumulator.vendorPayable +=
            row.vendorBalance;


          accumulator.gst +=
            row.gstAmount;


          return accumulator;
        },
        {
          shipments:
            0,

          sales:
            0,

          received:
            0,

          outstanding:
            0,

          vendorPayable:
            0,

          gst:
            0,
        }
      );


    /* ==========================================================
       MODE SUMMARY
    ========================================================== */

    const modeSummary = {

      air:
        rows
          .filter(
            (
              row
            ) =>
              row.mode ===
              "air-cargo"
          )
          .length,


      sea:
        rows
          .filter(
            (
              row
            ) =>
              row.mode ===
              "sea-freight"
          )
          .length,


      road:
        rows
          .filter(
            (
              row
            ) =>
              row.mode ===
              "road"
          )
          .length,
    };


    /* ==========================================================
       DELIVERY SUMMARY
    ========================================================== */

    const deliverySummary = {

      delivered:
        rows
          .filter(
            (
              row
            ) =>
              row.status ===
              "delivered"
          )
          .length,


      transit:
        rows
          .filter(
            (
              row
            ) =>
              row.status ===
              "in-transit"
          )
          .length,


      customs:
        rows
          .filter(
            (
              row
            ) =>
              row.status ===
              "customs"
          )
          .length,


      cancelled:
        rows
          .filter(
            (
              row
            ) =>
              row.status ===
              "cancelled"
          )
          .length,
    };


    /* ==========================================================
       RESPONSE
    ========================================================== */

    return {

      reportType:
        query.reportType ||
        "shipment-performance",


      rows,


      summary,


      modeSummary,


      deliverySummary,


      scope: {

        type:
          reportScope.type,

        label:
          reportScope.type ===
          "department"
            ? "Logistics Department Report"
            : "My Logistics Report",

        description:
          reportScope.type ===
          "department"
            ? "Includes records created by Logistics employees."
            : "Only records from your Logistics workspace.",

        scopeLabel:
          reportScope.type ===
          "department"
            ? "Department"
            : "My Workspace",

        canFilterEmployees:
          reportScope.canFilterEmployees,

        selectedEmployeeId:
          reportScope.selectedEmployeeId ||
          "",
      },


      employeeOptions,
    };
  }


  /* ============================================================
     RESOLVE REPORT SCOPE
  ============================================================ */

  resolveReportScope({
    requester = {},
    query = {},
  }) {

    const accessType =
      String(
        requester.accessType ||
        ""
      )
        .trim()
        .toLowerCase();


    const userRole =
      String(
        requester.userRole ||
        ""
      )
        .trim()
        .toLowerCase();


    const organizationRole =
      String(
        requester.organizationRole ||
        ""
      )
        .trim()
        .toLowerCase()
        .replaceAll(
          "-",
          "_"
        )
        .replaceAll(
          " ",
          "_"
        );


    const isSeniorEmployee =
      accessType ===
        "employee" &&
      (
        requester.canHandoffToAccounts ===
          true ||
        organizationRole ===
          "department_head" ||
        organizationRole ===
          "team_leader"
      );


    const isManagement =
      accessType ===
        "management" ||
      requester.canMonitor ===
        true ||
      (
        requester.canManage ===
          true &&
        accessType !==
          "employee"
      );


    const isSuperAdmin =
      userRole ===
      "super_admin";


    const canViewDepartment =
      isSeniorEmployee ||
      isManagement ||
      isSuperAdmin;


    if (
      !canViewDepartment
    ) {

      return {
        type:
          "own",

        canFilterEmployees:
          false,

        selectedEmployeeId:
          "",
      };
    }


    const requestedEmployeeId =
      String(
        query.employeeId ||
        query.createdByEmployeeId ||
        ""
      )
        .trim();


    if (
      requestedEmployeeId &&
      requestedEmployeeId !==
        "all"
    ) {

      if (
        !mongoose.isValidObjectId(
          requestedEmployeeId
        )
      ) {

        throw new ApiError(
          400,
          "Invalid employee filter"
        );
      }


      return {
        type:
          "department",

        canFilterEmployees:
          true,

        selectedEmployeeId:
          requestedEmployeeId,
      };
    }


    return {
      type:
        "department",

      canFilterEmployees:
        true,

      selectedEmployeeId:
        "",
    };
  }


  /* ============================================================
     EMPLOYEE FILTER OPTIONS

     Uses shipment creators because report ownership is based on
     shipment workspace creator.
  ============================================================ */

  async loadEmployeeOptions({
    baseShipmentFilter,
  }) {

    const records =
      await LogisticsShipment
        .find(
          baseShipmentFilter
        )
        .select(
          "createdByEmployeeId"
        )
        .populate(
          "createdByEmployeeId",
          "employeeCode firstName lastName name displayName designation organizationRole"
        )
        .lean();


    const map =
      new Map();


    for (
      const record of records
    ) {

      const employee =
        record
          ?.createdByEmployeeId;


      if (
        !employee ||
        typeof employee !==
          "object"
      ) {

        continue;
      }


      const employeeId =
        this.idValue(
          employee
        );


      if (
        !employeeId
      ) {

        continue;
      }


      const name =
        this.personName(
          employee
        ) ||
        "Employee";


      const employeeCode =
        String(
          employee.employeeCode ||
          ""
        )
          .trim();


      if (
        !map.has(
          employeeId
        )
      ) {

        map.set(
          employeeId,
          {
            value:
              employeeId,

            employeeId,

            name,

            employeeCode,

            label:
              employeeCode
                ? `${name} (${employeeCode})`
                : name,
          }
        );
      }
    }


    return Array
      .from(
        map.values()
      )
      .sort(
        (
          first,
          second
        ) =>
          first.label
            .localeCompare(
              second.label
            )
      );
  }


  /* ============================================================
     CREATOR RESOLUTION

     Preferred:
       createdByEmployeeId

     Legacy:
       createdBy User

     Old unresolved:
       Not Available
  ============================================================ */

  resolveCreator(
    shipment
  ) {

    const employee =
      shipment
        ?.createdByEmployeeId;


    if (
      employee &&
      typeof employee ===
        "object"
    ) {

      const employeeId =
        this.idValue(
          employee
        );


      const name =
        this.personName(
          employee
        );


      const employeeCode =
        String(
          employee.employeeCode ||
          ""
        )
          .trim();


      const designation =
        String(
          employee.designation ||
          employee.organizationRole ||
          ""
        )
          .trim();


      if (
        name ||
        employeeCode
      ) {

        const safeName =
          name ||
          "Employee";


        return {

          employeeId,

          name:
            safeName,

          employeeCode,

          designation,

          display:
            employeeCode
              ? `${safeName} • ${employeeCode}`
              : safeName,
        };
      }
    }


    const user =
      shipment
        ?.createdBy;


    if (
      user &&
      typeof user ===
        "object"
    ) {

      const name =
        this.personName(
          user
        ) ||
        String(
          user.email ||
          ""
        )
          .trim();


      if (
        name
      ) {

        return {

          employeeId:
            "",

          name,

          employeeCode:
            "",

          designation:
            "",

          display:
            name,
        };
      }
    }


    return {

      employeeId:
        "",

      name:
        "Not Available",

      employeeCode:
        "",

      designation:
        "",

      display:
        "Not Available",
    };
  }


  /* ============================================================
     PERSON NAME
  ============================================================ */

  personName(
    person
  ) {

    if (
      !person
    ) {

      return "";
    }


    const displayName =
      String(
        person.displayName ||
        ""
      )
        .trim();


    if (
      displayName
    ) {

      return displayName;
    }


    const name =
      String(
        person.name ||
        ""
      )
        .trim();


    if (
      name
    ) {

      return name;
    }


    const firstName =
      String(
        person.firstName ||
        ""
      )
        .trim();


    const lastName =
      String(
        person.lastName ||
        ""
      )
        .trim();


    return [
      firstName,
      lastName,
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      )
      .trim();
  }


  /* ============================================================
     ID VALUE
  ============================================================ */

  idValue(
    value
  ) {

    if (
      !value
    ) {

      return "";
    }


    if (
      typeof value ===
      "string"
    ) {

      return value;
    }


    if (
      value._id
    ) {

      return String(
        value._id
      );
    }


    return String(
      value
    );
  }


  /* ============================================================
     CSV
  ============================================================ */

  toCsv(
    result
  ) {

    const headers = [
      "Shipment",
      "Date",
      "Employee",
      "Employee Code",
      "Customer",
      "Vendor",
      "Mode",
      "Origin",
      "Destination",
      "Invoice Amount",
      "Received Amount",
      "Outstanding Amount",
      "Vendor Amount",
      "Vendor Paid",
      "Vendor Balance",
      "GST Amount",
      "Status",
    ];


    const escape =
      (
        value
      ) =>
        `"${String(
          value ??
          ""
        )
          .replaceAll(
            '"',
            '""'
          )}"`;


    const lines =
      result.rows
        .map(
          (
            row
          ) =>
            [
              row.shipmentNo,
              row.date,
              row.createdByName,
              row.createdByEmployeeCode,
              row.customer,
              row.vendor,
              row.mode,
              row.origin,
              row.destination,
              row.invoiceAmount,
              row.receivedAmount,
              row.outstandingAmount,
              row.vendorAmount,
              row.vendorPaid,
              row.vendorBalance,
              row.gstAmount,
              row.status,
            ]
              .map(
                escape
              )
              .join(
                ","
              )
        );


    return [
      headers
        .map(
          escape
        )
        .join(
          ","
        ),

      ...lines,
    ]
      .join(
        "\n"
      );
  }
}


export default
  new LogisticsReportService();