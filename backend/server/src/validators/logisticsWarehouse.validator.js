import Joi from "joi";


const optionalText =
  Joi.string()
    .trim()
    .allow("", null);


const objectId =
  Joi.string()
    .hex()
    .length(24);


/* ============================================================
   WAREHOUSE MASTER
============================================================ */

const addressSchema =
  Joi.object({
    addressLine1:
      optionalText,

    addressLine2:
      optionalText,

    city:
      optionalText,

    state:
      optionalText,

    country:
      optionalText.default("India"),

    pincode:
      optionalText,
  })
    .default({});


const contactSchema =
  Joi.object({
    contactPerson:
      optionalText,

    mobile:
      optionalText,

    alternateMobile:
      optionalText,

    email:
      Joi.string()
        .trim()
        .allow("", null),
  })
    .default({});


const storageSchema =
  Joi.object({
    totalCapacity:
      Joi.number()
        .min(0)
        .default(0),

    occupiedCapacity:
      Joi.number()
        .min(0)
        .default(0),

    capacityUnit:
      optionalText.default("sq_ft"),

    capacityUnitOther:
      optionalText,

    storageType:
      optionalText.default("general"),

    storageTypeOther:
      optionalText,

    minTemperature:
      Joi.number()
        .allow(null),

    maxTemperature:
      Joi.number()
        .allow(null),
  })
    .default({});


const ratesSchema =
  Joi.object({
    storageRate:
      Joi.number()
        .min(0)
        .default(0),

    storageRateUnit:
      optionalText.default("per_day"),

    storageRateUnitOther:
      optionalText,

    inwardHandlingCharge:
      Joi.number()
        .min(0)
        .default(0),

    outwardHandlingCharge:
      Joi.number()
        .min(0)
        .default(0),

    loadingCharge:
      Joi.number()
        .min(0)
        .default(0),

    unloadingCharge:
      Joi.number()
        .min(0)
        .default(0),

    otherCharge:
      Joi.number()
        .min(0)
        .default(0),

    otherChargeDescription:
      optionalText,

    currency:
      optionalText.default("INR"),
  })
    .default({});


export const createLogisticsWarehouseSchema =
  Joi.object({
    warehouseName:
      Joi.string()
        .trim()
        .required(),

    address:
      addressSchema,

    contact:
      contactSchema,

    storage:
      storageSchema,

    rates:
      ratesSchema,

    gstNumber:
      optionalText,

    licenseNumber:
      optionalText,

    status:
      optionalText.default("active"),

    statusOther:
      optionalText,

    remarks:
      optionalText,
  });


export const updateLogisticsWarehouseSchema =
  createLogisticsWarehouseSchema
    .fork(
      [
        "warehouseName",
      ],
      (
        schema
      ) =>
        schema.optional()
    )
    .min(1);


/* ============================================================
   WAREHOUSE RECEIPT
============================================================ */

export const createWarehouseReceiptSchema =
  Joi.object({
    shipmentId:
      objectId.required(),

    shipmentNo:
      Joi.string()
        .trim()
        .required(),

    commodity:
      optionalText,

    receivedDate:
      Joi.date()
        .allow("", null),

    inwardReference:
      optionalText,

    movementType:
      optionalText,

    storageType:
      optionalText,

    zone:
      optionalText,

    rackLocation:
      optionalText,

    binLocation:
      optionalText,

    expectedQuantity:
      Joi.number()
        .min(0)
        .default(0),

    receivedQuantity:
      Joi.number()
        .min(0)
        .default(0),

    acceptedQuantity:
      Joi.number()
        .min(0)
        .default(0),

    rejectedQuantity:
      Joi.number()
        .min(0)
        .default(0),

    damagedQuantity:
      Joi.number()
        .min(0)
        .default(0),

    quantityUnit:
      optionalText,

    expectedWeight:
      Joi.number()
        .min(0)
        .default(0),

    receivedWeight:
      Joi.number()
        .min(0)
        .default(0),

    weightUnit:
      optionalText.default("kg"),

    weightUnitOther:
      optionalText,

    temperature:
      Joi.number()
        .allow(null),

    humidity:
      Joi.number()
        .min(0)
        .allow(null),

    batchNumber:
      optionalText,

    lotNumber:
      optionalText,

    qualityRemarks:
      optionalText,


    /* ========================================================
       RECEIPT CHARGES
    ======================================================== */

    storageDays:
      Joi.number()
        .min(0)
        .default(0),

    storageRatePerDay:
      Joi.number()
        .min(0)
        .default(0),

    storageCharge:
      Joi.number()
        .min(0)
        .default(0),

    handlingCharge:
      Joi.number()
        .min(0)
        .default(0),

    loadingCharge:
      Joi.number()
        .min(0)
        .default(0),

    unloadingCharge:
      Joi.number()
        .min(0)
        .default(0),

    labourCharge:
      Joi.number()
        .min(0)
        .default(0),

    miscellaneousCharge:
      Joi.number()
        .min(0)
        .default(0),

    totalCharge:
      Joi.number()
        .min(0)
        .default(0),


    /* ========================================================
       STATUS
    ======================================================== */

    status:
      optionalText.default("received"),

    statusOther:
      optionalText,

    remarks:
      optionalText,
  });


export const updateWarehouseReceiptSchema =
  createWarehouseReceiptSchema
    .fork(
      [
        "shipmentId",
        "shipmentNo",
      ],
      (
        schema
      ) =>
        schema.optional()
    )
    .append({
      outwardReference:
        optionalText,

      releasedDate:
        Joi.date()
          .allow("", null),
    })
    .min(1);


/* ============================================================
   LIST QUERY
============================================================ */

export const logisticsWarehouseQuerySchema =
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
      optionalText,

    status:
      optionalText,

    storageType:
      optionalText,

    fromDate:
      Joi.date()
        .allow(null, ""),

    toDate:
      Joi.date()
        .allow(null, ""),

    sortBy:
      optionalText.default(
        "createdAt"
      ),

    sortOrder:
      optionalText.default(
        "desc"
      ),
  });
