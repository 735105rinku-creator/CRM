import Joi from "joi";


/* ============================================================
   COMMON
============================================================ */

const objectId =
  Joi.string()
    .hex()
    .length(24);


const optionalText = (max = 500) =>
  Joi.string()
    .trim()
    .allow("")
    .max(max);


const sourceSchema =
  Joi.string()
    .valid(
      "indiamart",
      "direct_supplier",
      "other"
    );


const statusSchema =
  Joi.string()
    .valid(
      "draft",
      "requested",
      "received",
      "closed",
      "cancelled"
    );


/* ============================================================
   CREATE
============================================================ */

export const createVendorEnquirySchema =
  Joi.object({

    purchaseRequestId:
      objectId
        .allow(null, ""),


    vendorId:
      objectId
        .required(),


    contactPerson:
      optionalText(150),


    phone:
      optionalText(50),


    email:
      Joi.string()
        .trim()
        .lowercase()
        .email({
          tlds: {
            allow: false
          }
        })
        .allow(""),


    source:
      sourceSchema
        .required(),


    otherSource:
      Joi.when(
        "source",
        {
          is: "other",

          then:
            Joi.string()
              .trim()
              .min(2)
              .max(150)
              .required()
              .messages({
                "any.required":
                  "Please enter the other enquiry source.",

                "string.empty":
                  "Please enter the other enquiry source."
              }),

          otherwise:
            Joi.forbidden()
        }
      ),


    itemName:
      Joi.string()
        .trim()
        .min(2)
        .max(250)
        .required(),


    quantity:
      Joi.number()
        .positive()
        .required(),


    unit:
      optionalText(50),


    quotedPrice:
      Joi.number()
        .min(0)
        .allow(null),


    taxPercent:
      Joi.number()
        .min(0)
        .max(100)
        .allow(null),


    deliveryTime:
      optionalText(150),


    paymentTerms:
      optionalText(500),


    validUntil:
      Joi.date()
        .iso()
        .allow(null, ""),


    remarks:
      optionalText(1000),


    /*
     * Backend-controlled fields
     */
    companyId:
      Joi.forbidden(),

    enquiryNumber:
      Joi.forbidden(),

    rfqNumber:
      Joi.forbidden(),

    vendorName:
      Joi.forbidden(),

    vendorCode:
      Joi.forbidden(),

    status:
      Joi.forbidden(),

    requestedAt:
      Joi.forbidden(),

    requestedBy:
      Joi.forbidden(),

    receivedAt:
      Joi.forbidden(),

    receivedBy:
      Joi.forbidden(),

    createdBy:
      Joi.forbidden(),

    updatedBy:
      Joi.forbidden()

  });


/* ============================================================
   UPDATE
============================================================ */

export const updateVendorEnquirySchema =
  Joi.object({

    purchaseRequestId:
      objectId
        .allow(null, ""),


    vendorId:
      objectId,


    contactPerson:
      optionalText(150),


    phone:
      optionalText(50),


    email:
      Joi.string()
        .trim()
        .lowercase()
        .email({
          tlds: {
            allow: false
          }
        })
        .allow(""),


    source:
      sourceSchema,


    otherSource:
      Joi.when(
        "source",
        {
          is: "other",

          then:
            Joi.string()
              .trim()
              .min(2)
              .max(150)
              .required()
              .messages({
                "any.required":
                  "Please enter the other enquiry source.",

                "string.empty":
                  "Please enter the other enquiry source."
              }),

          otherwise:
            Joi.string()
              .trim()
              .allow("")
              .max(150)
        }
      ),


    itemName:
      Joi.string()
        .trim()
        .min(2)
        .max(250),


    quantity:
      Joi.number()
        .positive(),


    unit:
      optionalText(50),


    quotedPrice:
      Joi.number()
        .min(0)
        .allow(null),


    taxPercent:
      Joi.number()
        .min(0)
        .max(100)
        .allow(null),


    deliveryTime:
      optionalText(150),


    paymentTerms:
      optionalText(500),


    validUntil:
      Joi.date()
        .iso()
        .allow(null, ""),


    remarks:
      optionalText(1000),


    /*
     * Backend-controlled fields
     */
    companyId:
      Joi.forbidden(),

    enquiryNumber:
      Joi.forbidden(),

    rfqNumber:
      Joi.forbidden(),

    vendorName:
      Joi.forbidden(),

    vendorCode:
      Joi.forbidden(),

    status:
      Joi.forbidden(),

    requestedAt:
      Joi.forbidden(),

    requestedBy:
      Joi.forbidden(),

    receivedAt:
      Joi.forbidden(),

    receivedBy:
      Joi.forbidden(),

    createdBy:
      Joi.forbidden(),

    updatedBy:
      Joi.forbidden()

  })
  .min(1);


/* ============================================================
   QUERY
============================================================ */

export const vendorEnquiryQuerySchema =
  Joi.object({

    search:
      Joi.string()
        .trim()
        .allow("")
        .max(200),


    status:
      statusSchema
        .allow(""),


    source:
      sourceSchema
        .allow(""),


    vendorId:
      objectId
        .allow(""),


    purchaseRequestId:
      objectId
        .allow(""),


    from:
      Joi.date()
        .iso()
        .allow(""),


    to:
      Joi.date()
        .iso()
        .allow(""),


    page:
      Joi.number()
        .integer()
        .min(1)
        .default(1),


    limit:
      Joi.number()
        .integer()
        .min(1)
        .max(200)
        .default(25),


    sortBy:
      Joi.string()
        .valid(
          "createdAt",
          "updatedAt",
          "enquiryNumber",
          "status",
          "vendorName",
          "itemName"
        )
        .default("createdAt"),


    sortOrder:
      Joi.string()
        .valid(
          "asc",
          "desc"
        )
        .default("desc")

  });


/* ============================================================
   PARAMS
============================================================ */

export const vendorEnquiryIdParamSchema =
  Joi.object({

    id:
      objectId
        .required()

  });


/* ============================================================
   STATUS WORKFLOW
============================================================ */

export const requestVendorEnquirySchema =
  Joi.object({

    remarks:
      optionalText(1000)

  });


export const receiveVendorEnquirySchema =
  Joi.object({

    quotedPrice:
      Joi.number()
        .min(0)
        .required(),


    taxPercent:
      Joi.number()
        .min(0)
        .max(100)
        .allow(null),


    deliveryTime:
      optionalText(150),


    paymentTerms:
      optionalText(500),


    validUntil:
      Joi.date()
        .iso()
        .allow(null, ""),


    remarks:
      optionalText(1000)

  });


export const updateVendorEnquiryStatusSchema =
  Joi.object({

    status:
      statusSchema
        .required(),


    remarks:
      optionalText(1000)

  });