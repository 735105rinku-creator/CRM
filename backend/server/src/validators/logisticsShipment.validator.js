import Joi from "joi";


/* ============================================================
   HELPERS
============================================================ */

const objectId =Joi.string().hex().length(24);
const optionalObjectId =objectId.allow("", null);
const optionalText =Joi.string().trim().allow("", null);
const positiveNumber =Joi.number().min(0).default(0);
/* ============================================================
   LOCATION
============================================================ */
const locationSchema =
  Joi.object({ 
    name:optionalText,
    code:optionalText,
    address:optionalText,
    city:optionalText,
    state:optionalText,
    country:optionalText,
    pincode:optionalText,
  }).default({});


/* ============================================================
   CARGO
============================================================ */

const cargoSchema =
  Joi.object({

    commodity:
      optionalText,

    commodityOther:
      optionalText,

    description:
      optionalText,

    packageCount:
      positiveNumber,

    packageType:
      optionalText,

    packageTypeOther:
      optionalText,

    grossWeight:
      positiveNumber,

    netWeight:
      positiveNumber,

    weightUnit:
      Joi.string()
        .valid(
          "kg",
          "mt",
          "ton",
          "lb",
          "other"
        )
        .default("kg"),

    weightUnitOther:
      optionalText,

    volume:
      positiveNumber,

    volumeUnit:
      Joi.string()
        .valid(
          "cbm",
          "cft",
          "other"
        )
        .default("cbm"),

    volumeUnitOther:
      optionalText,

    chargeableWeight:
      positiveNumber,

    hazardous:
      Joi.boolean()
        .default(false),

    temperatureControlled:
      Joi.boolean()
        .default(false),

    minTemperature:
      Joi.number()
        .allow(null),

    maxTemperature:
      Joi.number()
        .allow(null),

  }).default({});


/* ============================================================
   AIR FREIGHT
============================================================ */

const airFreightSchema =
  Joi.object({

    airline:
      optionalText,

    airlineOther:
      optionalText,

    awbNumber:
      optionalText,

    masterAwbNumber:
      optionalText,

    houseAwbNumber:
      optionalText,

    flightNumber:
      optionalText,

    departureAirport:
      optionalText,

    departureAirportOther:
      optionalText,

    arrivalAirport:
      optionalText,

    arrivalAirportOther:
      optionalText,

    departureDate:
      Joi.date()
        .allow(null),

    arrivalDate:
      Joi.date()
        .allow(null),

  }).default({});


/* ============================================================
   SEA FREIGHT
============================================================ */

const seaFreightSchema =
  Joi.object({

    shipmentType:
      Joi.string()
        .valid(
          "",
          "fcl",
          "lcl",
          "break-bulk",
          "ro-ro",
          "other"
        )
        .default(""),

    shipmentTypeOther:
      optionalText,

    containerType:
      optionalText,

    containerTypeOther:
      optionalText,

    containerCount:
      positiveNumber,

    containerNumber:
      optionalText,

    sealNumber:
      optionalText,

    shippingLine:
      optionalText,

    shippingLineOther:
      optionalText,

    vesselName:
      optionalText,

    voyageNumber:
      optionalText,

    bookingNumber:
      optionalText,

    billOfLading:
      optionalText,

    originPort:
      optionalText,

    originPortOther:
      optionalText,

    destinationPort:
      optionalText,

    destinationPortOther:
      optionalText,

    etd:
      Joi.date()
        .allow(null),

    eta:
      Joi.date()
        .allow(null),

  }).default({});


/* ============================================================
   CUSTOMS
============================================================ */

const customsSchema =
  Joi.object({

    chaRequired:
      Joi.boolean()
        .default(false),

    chaVendorId:
      optionalObjectId,

    customsLocation:
      optionalText,

    customsLocationOther:
      optionalText,

    shippingBillNumber:
      optionalText,

    shippingBillDate:
      Joi.date()
        .allow(null),

    billOfEntryNumber:
      optionalText,

    billOfEntryDate:
      Joi.date()
        .allow(null),

    status:
      Joi.string()
        .valid(
          "not_required",
          "documents_pending",
          "filed",
          "assessment",
          "examination",
          "duty_pending",
          "cleared",
          "hold",
          "other"
        )
        .default(
          "not_required"
        ),

    statusOther:
      optionalText,

  }).default({});


/* ============================================================
   TRANSPORT
============================================================ */

const transportSchema =
  Joi.object({

    required:
      Joi.boolean()
        .default(false),

    transporterId:
      optionalObjectId,

    driverId:
      optionalObjectId,

    vehicleId:
      optionalObjectId,

    pickupDate:
      Joi.date()
        .allow(null),

    expectedDeliveryDate:
      Joi.date()
        .allow(null),

  }).default({});


/* ============================================================
   WAREHOUSE
============================================================ */

const warehouseSchema =
  Joi.object({

    required:
      Joi.boolean()
        .default(false),

    warehouseId:
      optionalObjectId,

    warehouseReceiptId:
      optionalObjectId,

    entryDate:
      Joi.date()
        .allow(null),

    exitDate:
      Joi.date()
        .allow(null),

  }).default({});


/* ============================================================
   CHARGES
============================================================ */

const chargesSchema =
  Joi.object({

    freightAmount:
      positiveNumber,

    chaCharge:
      positiveNumber,

    documentationCharge:
      positiveNumber,

    transportationCharge:
      positiveNumber,

    warehouseCharge:
      positiveNumber,

    handlingCharge:
      positiveNumber,

    insuranceCharge:
      positiveNumber,

    otherCharge:
      positiveNumber,

    otherChargeDescription:
      optionalText,

    currency:
      Joi.string()
        .trim()
        .uppercase()
        .max(10)
        .default("INR"),

  }).default({});


/* ============================================================
   BASE SCHEMA
============================================================ */

const logisticsShipmentBaseSchema =
  Joi.object({

    branchId:
      optionalObjectId,


      shipmentNumber:
      Joi.string()
        .trim()
        .uppercase()
        .max(50)
        .allow("", null)
        .optional(),


    shipmentMode:
      Joi.string()
        .valid(
          "air_cargo",
          "sea_freight",
          "road",
          "other"
        )
        .required(),


    shipmentModeOther:
      optionalText,


    customerId:
      optionalObjectId,


    customerName:
      Joi.string()
        .trim()
        .min(2)
        .max(200)
        .required(),


    contactPerson:
      optionalText,


    mobile:
      optionalText,


    email:
      Joi.string()
        .trim()
        .email()
        .allow("", null),


    customerReference:
      optionalText,


    origin:
      locationSchema,


    destination:
      locationSchema,


    cargo:
      cargoSchema,


    airFreight:
      airFreightSchema,


    seaFreight:
      seaFreightSchema,


    customs:
      customsSchema,


    transport:
      transportSchema,


    warehouse:
      warehouseSchema,


    charges:
      chargesSchema,


    currentLocation:
      optionalText,


    trackingReference:
      optionalText,


    estimatedDeparture:
      Joi.date()
        .allow(null),


    estimatedArrival:
      Joi.date()
        .allow(null),


    actualDeparture:
      Joi.date()
        .allow(null),


    actualArrival:
      Joi.date()
        .allow(null),


    status:
      Joi.string()
        .valid(
          "draft",
          "booking_created",
          "container_pending",
          "stuffing",
          "pickup_pending",
          "picked_up",
          "at_warehouse",
          "documents_pending",
          "customs",
          "loaded",
          "in_transit",
          "arrived",
          "out_for_delivery",
          "delivered",
          "hold",
          "cancelled",
          "other"
        )
        .default("draft"),


    statusOther:
      optionalText,


    assignedTo:
      optionalObjectId,


    /*
     * Remarks is intentionally required.
     */
    remarks:
      Joi.string()
        .trim()
        .min(2)
        .max(3000)
        .required(),

  })
    .custom(
      (
        value,
        helpers
      ) => {

        /* ==============================
           SHIPMENT MODE - OTHER
        ============================== */

        if (
          value.shipmentMode ===
            "other" &&
          !String(
            value
              .shipmentModeOther ||
              ""
          ).trim()
        ) {

          return helpers.error(
            "any.custom",
            {
              message:
                "shipmentModeOther is required when shipmentMode is other",
            }
          );
        }


        /* ==============================
           AIR CARGO
        ============================== */

        if (
          value.shipmentMode ===
          "air_cargo"
        ) {

          if (
            value.airFreight
              ?.airline ===
              "other" &&
            !String(
              value.airFreight
                ?.airlineOther ||
                ""
            ).trim()
          ) {

            return helpers.error(
              "any.custom",
              {
                message:
                  "airFreight.airlineOther is required when airline is other",
              }
            );
          }
        }


        /* ==============================
           SEA FREIGHT
        ============================== */

        if (
          value.shipmentMode ===
          "sea_freight"
        ) {

          if (
            value.seaFreight
              ?.shipmentType ===
              "other" &&
            !String(
              value.seaFreight
                ?.shipmentTypeOther ||
                ""
            ).trim()
          ) {

            return helpers.error(
              "any.custom",
              {
                message:
                  "seaFreight.shipmentTypeOther is required when shipmentType is other",
              }
            );
          }
        }


        /* ==============================
           STATUS OTHER
        ============================== */

        if (
          value.status ===
            "other" &&
          !String(
            value.statusOther ||
            ""
          ).trim()
        ) {

          return helpers.error(
            "any.custom",
            {
              message:
                "statusOther is required when status is other",
            }
          );
        }


        return value;
      }
    )
    .messages({
      "any.custom":
        "{{#message}}",
    });


/* ============================================================
   CREATE
============================================================ */

export const createLogisticsShipmentSchema =
  logisticsShipmentBaseSchema;


/* ============================================================
   UPDATE
============================================================ */

export const updateLogisticsShipmentSchema =
  logisticsShipmentBaseSchema
    .fork(
      [
        "shipmentNumber",
        "shipmentMode",
        "customerName",
        "remarks",
      ],
      (
        schema
      ) =>
        schema.optional()
    );


/* ============================================================
   STATUS UPDATE
============================================================ */

export const updateLogisticsShipmentStatusSchema =
  Joi.object({

    status:
      Joi.string()
        .valid(
          "draft",
          "booking_created",
          "pickup_pending",
          "picked_up",
          "at_warehouse",
          "documents_pending",
          "customs",
          "loaded",
          "in_transit",
          "arrived",
          "out_for_delivery",
          "delivered",
          "hold",
          "cancelled",
          "other"
        )
        .required(),

    statusOther:
      optionalText,

    currentLocation:
      optionalText,


    trackingReference:
      optionalText,

    estimatedDeparture:
      Joi.date()
        .allow(null),

    estimatedArrival:
      Joi.date()
        .allow(null),
    remarks:
      Joi.string()
        .trim()
        .min(2)
        .max(3000)
        .required(),

  })
    .custom(
      (
        value,
        helpers
      ) => {

        if (
          value.status ===
            "other" &&
          !String(
            value.statusOther ||
            ""
          ).trim()
        ) {

          return helpers.error(
            "any.custom",
            {
              message:
                "statusOther is required when status is other",
            }
          );
        }

        return value;
      }
    )
    .messages({
      "any.custom":
        "{{#message}}",
    });


/* ============================================================
   LIST QUERY
============================================================ */

export const logisticsShipmentQuerySchema =
  Joi.object({

    page:
      Joi.number()
        .integer()
        .min(1)
        .default(1),

    limit:
      Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20),

    search:
      Joi.string()
        .trim()
        .allow("", null),

    shipmentMode:
      Joi.string()
        .valid(
          "air_cargo",
          "sea_freight",
          "road",
          "other"
        )
        .allow("", null),

    status:
      Joi.string()
        .valid(
          "draft",
          "booking_created",
          "pickup_pending",
          "picked_up",
          "at_warehouse",
          "documents_pending",
          "customs",
          "loaded",
          "in_transit",
          "arrived",
          "out_for_delivery",
          "delivered",
          "hold",
          "cancelled",
          "other"
        )
        .allow("", null),

    customerId:
      optionalObjectId,

    assignedTo:
      optionalObjectId,

    fromDate:
      Joi.date()
        .allow(null),

    toDate:
      Joi.date()
        .allow(null),

    sortBy:
      Joi.string()
        .valid(
          "createdAt",
          "updatedAt",
          "shipmentNumber",
          "estimatedArrival",
          "status"
        )
        .default("createdAt"),

    sortOrder:
      Joi.string()
        .valid(
          "asc",
          "desc"
        )
        .default("desc"),

  });

