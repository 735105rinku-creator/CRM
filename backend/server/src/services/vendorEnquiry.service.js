import crypto from "crypto";
import mongoose from "mongoose";

import LogisticsVendor
  from "../models/LogisticsVendor.js";

import PurchaseRequest
  from "../models/PurchaseRequest.js";

import vendorEnquiryRepository
  from "../repositories/vendorEnquiry.repository.js";

import { ApiError }
  from "../utils/apiError.js";


/* ============================================================
   HELPERS
============================================================ */

const cleanText = (
  value,
  fallback = ""
) => {

  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  return String(value)
    .trim();
};


const cleanOptionalDate = (
  value
) => {

  if (
    !value
  ) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    throw new ApiError(
      400,
      "Invalid date value."
    );
  }

  return date;
};


const normalizeSource = (
  source
) =>
  cleanText(source)
    .toLowerCase();


const normalizeStatus = (
  status
) =>
  cleanText(status)
    .toLowerCase();


const generateReferenceSuffix =
  () =>
    crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase();


const dateCode = (
  date = new Date()
) => {

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
      1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}${month}${day}`;
};


/* ============================================================
   SERVICE
============================================================ */

class VendorEnquiryService {

  constructor(
    repository =
      vendorEnquiryRepository,

    vendorModel =
      LogisticsVendor,

    purchaseRequestModel =
      PurchaseRequest
  ) {

    this.repository =
      repository;

    this.vendorModel =
      vendorModel;

    this.purchaseRequestModel =
      purchaseRequestModel;
  }


  /* ==========================================================
     COMMON VALIDATION
  ========================================================== */

  assertCompanyId(
    companyId
  ) {

    if (
      !companyId ||
      !mongoose.Types.ObjectId
        .isValid(
          companyId
        )
    ) {

      throw new ApiError(
        403,
        "Valid company context is required."
      );
    }
  }


  assertObjectId(
    value,
    message =
      "Invalid record ID."
  ) {

    if (
      !value ||
      !mongoose.Types.ObjectId
        .isValid(
          value
        )
    ) {

      throw new ApiError(
        400,
        message
      );
    }
  }


  /* ==========================================================
     NUMBER GENERATION
  ========================================================== */

  async generateEnquiryNumber({
    companyId,
  }) {

    const today =
      new Date();

    const prefix =
      `VE-${dateCode(
        today
      )}`;


    /*
     * Random suffix keeps generation server-side
     * without needing a sequence collection or DB migration.
     */
    for (
      let attempt = 0;
      attempt < 20;
      attempt += 1
    ) {

      const enquiryNumber =
        `${prefix}-${generateReferenceSuffix()}`;


      const existing =
        await this.repository
          .findByEnquiryNumber({
            companyId,
            enquiryNumber,
          });


      if (
        !existing
      ) {
        return enquiryNumber;
      }
    }


    throw new ApiError(
      500,
      "Unable to generate vendor enquiry number."
    );
  }


  generateRfqNumber() {

    return (
      `RFQ-${dateCode(
        new Date()
      )}-${generateReferenceSuffix()}`
    );
  }


  /* ==========================================================
     VENDOR MASTER REUSE
  ========================================================== */

  async resolveVendor({
    companyId,
    vendorId,
  }) {

    this.assertObjectId(
      vendorId,
      "Invalid vendor ID."
    );


    const vendor =
      await this.vendorModel
        .findOne({
          _id:
            vendorId,

          companyId,

          isActive:
            true,
        })
        .select(
          [
            "_id",
            "vendorCode",
            "vendorName",
            "companyName",
            "contactPerson",
            "mobile",
            "phone",
            "email",
            "status",
            "isActive",
          ].join(" ")
        )
        .lean();


    if (
      !vendor
    ) {

      throw new ApiError(
        404,
        "Active vendor was not found in Vendor Master."
      );
    }


    return {
      _id:
        vendor._id,

      vendorCode:
        cleanText(
          vendor.vendorCode
        ),

      vendorName:
        cleanText(
          vendor.vendorName ||
          vendor.companyName
        ),

      contactPerson:
        cleanText(
          vendor.contactPerson
        ),

      phone:
        cleanText(
          vendor.mobile ||
          vendor.phone
        ),

      email:
        cleanText(
          vendor.email
        ).toLowerCase(),
    };
  }


  /* ==========================================================
     PURCHASE REQUEST REFERENCE
  ========================================================== */

  async resolvePurchaseRequest({
    companyId,
    purchaseRequestId,
  }) {

    if (
      !purchaseRequestId
    ) {
      return null;
    }


    this.assertObjectId(
      purchaseRequestId,
      "Invalid Purchase Request ID."
    );


    const request =
      await this.purchaseRequestModel
        .findOne({
          _id:
            purchaseRequestId,

          companyId,
        })
        .select(
          [
            "_id",
            "prNumber",
            "itemName",
            "requiredQuantity",
            "unit",
            "status",
          ].join(" ")
        )
        .lean();


    if (
      !request
    ) {

      throw new ApiError(
        404,
        "Purchase Request was not found."
      );
    }


    /*
     * RFQ/enquiry should normally originate
     * from an approved requirement.
     */
    if (
      request.status !==
      "approved"
    ) {

      throw new ApiError(
        409,
        "Vendor enquiry can only reference an approved Purchase Request."
      );
    }


    return request;
  }


  /* ==========================================================
     CREATE
  ========================================================== */

  async createVendorEnquiry({
    companyId,
    userId = null,
    payload,
  }) {

    this.assertCompanyId(
      companyId
    );


    if (
      !payload
    ) {

      throw new ApiError(
        400,
        "Vendor enquiry payload is required."
      );
    }


    const vendor =
      await this.resolveVendor({
        companyId,

        vendorId:
          payload.vendorId,
      });


    const purchaseRequest =
      await this.resolvePurchaseRequest({
        companyId,

        purchaseRequestId:
          payload.purchaseRequestId,
      });


    const source =
      normalizeSource(
        payload.source
      );


    const otherSource =
      source ===
      "other"
        ? cleanText(
            payload.otherSource
          )
        : "";


    if (
      source ===
        "other" &&
      !otherSource
    ) {

      throw new ApiError(
        400,
        "Other source is required when Source is Other."
      );
    }


    const enquiryNumber =
      await this.generateEnquiryNumber({
        companyId,
      });


    const rfqNumber =
      this.generateRfqNumber();


    return this.repository
      .create({

        companyId,

        enquiryNumber,

        rfqNumber,

        purchaseRequestId:
          purchaseRequest?._id ||
          null,


        /* Existing Vendor Master reference */
        vendorId:
          vendor._id,

        vendorName:
          vendor.vendorName,

        vendorCode:
          vendor.vendorCode,


        /*
         * User can override contact details for
         * this enquiry only. Vendor Master itself
         * is NOT modified.
         */
        contactPerson:
          cleanText(
            payload.contactPerson ||
            vendor.contactPerson
          ),

        phone:
          cleanText(
            payload.phone ||
            vendor.phone
          ),

        email:
          cleanText(
            payload.email ||
            vendor.email
          ).toLowerCase(),


        source,

        otherSource,


        /*
         * If linked PR exists, its item/quantity/unit
         * can act as safe defaults.
         */
        itemName:
          cleanText(
            payload.itemName ||
            purchaseRequest?.itemName
          ),

        quantity:
          Number(
            payload.quantity ??
            purchaseRequest
              ?.requiredQuantity
          ),

        unit:
          cleanText(
            payload.unit ||
            purchaseRequest?.unit
          ),


        quotedPrice:
          payload.quotedPrice ===
            null ||
          payload.quotedPrice ===
            undefined
            ? null
            : Number(
                payload.quotedPrice
              ),

        taxPercent:
          payload.taxPercent ===
            null ||
          payload.taxPercent ===
            undefined
            ? null
            : Number(
                payload.taxPercent
              ),

        deliveryTime:
          cleanText(
            payload.deliveryTime
          ),

        paymentTerms:
          cleanText(
            payload.paymentTerms
          ),

        validUntil:
          cleanOptionalDate(
            payload.validUntil
          ),

        remarks:
          cleanText(
            payload.remarks
          ),

        status:
          "draft",

        createdBy:
          userId ||
          null,

        updatedBy:
          userId ||
          null,
      });
  }


  /* ==========================================================
     LIST
  ========================================================== */

  async listVendorEnquiries({
    companyId,
    query = {},
  }) {

    this.assertCompanyId(
      companyId
    );


    return this.repository
      .list({
        companyId,

        search:
          query.search,

        status:
          query.status,

        source:
          query.source,

        vendorId:
          query.vendorId,

        purchaseRequestId:
          query.purchaseRequestId,

        from:
          query.from,

        to:
          query.to,

        page:
          query.page,

        limit:
          query.limit,

        sortBy:
          query.sortBy,

        sortOrder:
          query.sortOrder,
      });
  }


  /* ==========================================================
     GET ONE
  ========================================================== */

  async getVendorEnquiry({
    companyId,
    vendorEnquiryId,
  }) {

    this.assertCompanyId(
      companyId
    );

    this.assertObjectId(
      vendorEnquiryId,
      "Invalid Vendor Enquiry ID."
    );


    const record =
      await this.repository
        .findById({
          companyId,
          vendorEnquiryId,
        });


    if (
      !record
    ) {

      throw new ApiError(
        404,
        "Vendor enquiry was not found."
      );
    }


    return record;
  }


  /* ==========================================================
     UPDATE DRAFT
  ========================================================== */

  async updateVendorEnquiry({
    companyId,
    vendorEnquiryId,
    userId = null,
    payload,
  }) {

    this.assertCompanyId(
      companyId
    );

    this.assertObjectId(
      vendorEnquiryId,
      "Invalid Vendor Enquiry ID."
    );


    const current =
      await this.getVendorEnquiry({
        companyId,
        vendorEnquiryId,
      });


    if (
      current.status !==
      "draft"
    ) {

      throw new ApiError(
        409,
        "Only a draft vendor enquiry can be edited."
      );
    }


    const update =
      {};


    /* --------------------------------------------------------
       VENDOR
    -------------------------------------------------------- */

    if (
      payload.vendorId !==
      undefined
    ) {

      const vendor =
        await this.resolveVendor({
          companyId,

          vendorId:
            payload.vendorId,
        });


      update.vendorId =
        vendor._id;

      update.vendorName =
        vendor.vendorName;

      update.vendorCode =
        vendor.vendorCode;


      if (
        payload.contactPerson ===
        undefined
      ) {

        update.contactPerson =
          vendor.contactPerson;
      }


      if (
        payload.phone ===
        undefined
      ) {

        update.phone =
          vendor.phone;
      }


      if (
        payload.email ===
        undefined
      ) {

        update.email =
          vendor.email;
      }
    }


    /* --------------------------------------------------------
       PURCHASE REQUEST
    -------------------------------------------------------- */

    if (
      payload.purchaseRequestId !==
      undefined
    ) {

      if (
        payload.purchaseRequestId
      ) {

        const request =
          await this.resolvePurchaseRequest({
            companyId,

            purchaseRequestId:
              payload.purchaseRequestId,
          });


        update.purchaseRequestId =
          request._id;

      } else {

        update.purchaseRequestId =
          null;
      }
    }


    /* --------------------------------------------------------
       SOURCE + OTHER
    -------------------------------------------------------- */

    if (
      payload.source !==
      undefined
    ) {

      const source =
        normalizeSource(
          payload.source
        );


      update.source =
        source;


      if (
        source ===
        "other"
      ) {

        const otherSource =
          cleanText(
            payload.otherSource
          );


        if (
          !otherSource
        ) {

          throw new ApiError(
            400,
            "Other source is required when Source is Other."
          );
        }


        update.otherSource =
          otherSource;

      } else {

        update.otherSource =
          "";
      }

    } else if (
      current.source ===
        "other" &&
      payload.otherSource !==
        undefined
    ) {

      const otherSource =
        cleanText(
          payload.otherSource
        );


      if (
        !otherSource
      ) {

        throw new ApiError(
          400,
          "Other source cannot be empty while Source is Other."
        );
      }


      update.otherSource =
        otherSource;
    }


    /* --------------------------------------------------------
       EDITABLE DATA
    -------------------------------------------------------- */

    if (
      payload.contactPerson !==
      undefined
    ) {
      update.contactPerson =
        cleanText(
          payload.contactPerson
        );
    }


    if (
      payload.phone !==
      undefined
    ) {
      update.phone =
        cleanText(
          payload.phone
        );
    }


    if (
      payload.email !==
      undefined
    ) {
      update.email =
        cleanText(
          payload.email
        ).toLowerCase();
    }


    if (
      payload.itemName !==
      undefined
    ) {
      update.itemName =
        cleanText(
          payload.itemName
        );
    }


    if (
      payload.quantity !==
      undefined
    ) {
      update.quantity =
        Number(
          payload.quantity
        );
    }


    if (
      payload.unit !==
      undefined
    ) {
      update.unit =
        cleanText(
          payload.unit
        );
    }


    if (
      payload.quotedPrice !==
      undefined
    ) {

      update.quotedPrice =
        payload.quotedPrice ===
        null
          ? null
          : Number(
              payload.quotedPrice
            );
    }


    if (
      payload.taxPercent !==
      undefined
    ) {

      update.taxPercent =
        payload.taxPercent ===
        null
          ? null
          : Number(
              payload.taxPercent
            );
    }


    if (
      payload.deliveryTime !==
      undefined
    ) {
      update.deliveryTime =
        cleanText(
          payload.deliveryTime
        );
    }


    if (
      payload.paymentTerms !==
      undefined
    ) {
      update.paymentTerms =
        cleanText(
          payload.paymentTerms
        );
    }


    if (
      payload.validUntil !==
      undefined
    ) {
      update.validUntil =
        cleanOptionalDate(
          payload.validUntil
        );
    }


    if (
      payload.remarks !==
      undefined
    ) {
      update.remarks =
        cleanText(
          payload.remarks
        );
    }


    update.updatedBy =
      userId ||
      null;


    const updated =
      await this.repository
        .updateDraftById({
          companyId,
          vendorEnquiryId,
          update,
        });


    if (
      !updated
    ) {

      throw new ApiError(
        409,
        "Vendor enquiry could not be updated because it is no longer in Draft status."
      );
    }


    return updated;
  }


  /* ==========================================================
     DRAFT -> REQUESTED
  ========================================================== */

  async requestVendorEnquiry({
    companyId,
    vendorEnquiryId,
    userId = null,
    remarks,
  }) {

    this.assertCompanyId(
      companyId
    );


    const updated =
      await this.repository
        .requestById({
          companyId,

          vendorEnquiryId,

          userId,

          remarks:
            remarks ===
            undefined
              ? undefined
              : cleanText(
                  remarks
                ),
        });


    if (
      !updated
    ) {

      throw new ApiError(
        409,
        "Only a Draft vendor enquiry can be sent as an RFQ."
      );
    }


    return updated;
  }


  /* ==========================================================
     REQUESTED -> RECEIVED
  ========================================================== */

  async receiveVendorEnquiry({
    companyId,
    vendorEnquiryId,
    userId = null,
    payload,
  }) {

    this.assertCompanyId(
      companyId
    );


    const quotationData = {

      quotedPrice:
        Number(
          payload.quotedPrice
        ),

      taxPercent:
        payload.taxPercent ===
          null ||
        payload.taxPercent ===
          undefined
          ? null
          : Number(
              payload.taxPercent
            ),

      deliveryTime:
        cleanText(
          payload.deliveryTime
        ),

      paymentTerms:
        cleanText(
          payload.paymentTerms
        ),

      validUntil:
        cleanOptionalDate(
          payload.validUntil
        ),

      remarks:
        cleanText(
          payload.remarks
        ),
    };


    const updated =
      await this.repository
        .receiveById({
          companyId,

          vendorEnquiryId,

          userId,

          quotationData,
        });


    if (
      !updated
    ) {

      throw new ApiError(
        409,
        "Only a Requested vendor enquiry can be marked as Received."
      );
    }


    return updated;
  }


  /* ==========================================================
     CONTROLLED STATUS UPDATE
  ========================================================== */

  async updateVendorEnquiryStatus({
    companyId,
    vendorEnquiryId,
    userId = null,
    status,
    remarks,
  }) {

    this.assertCompanyId(
      companyId
    );


    const current =
      await this.getVendorEnquiry({
        companyId,
        vendorEnquiryId,
      });


    const nextStatus =
      normalizeStatus(
        status
      );


    if (
      current.status ===
      nextStatus
    ) {
      return current;
    }


    /*
     * Dedicated endpoint should be used when
     * quotation details are being received.
     */
    const allowedTransitions = {
      draft: [
        "requested",
        "cancelled",
      ],

      requested: [
        "cancelled",
      ],

      received: [
        "closed",
        "cancelled",
      ],

      closed: [],

      cancelled: [],
    };


    const allowed =
      allowedTransitions[
        current.status
      ] ||
      [];


    if (
      !allowed.includes(
        nextStatus
      )
    ) {

      throw new ApiError(
        409,
        `Vendor enquiry cannot move from ${current.status} to ${nextStatus}.`
      );
    }


    const updated =
      await this.repository
        .transitionStatusById({
          companyId,

          vendorEnquiryId,

          currentStatus:
            current.status,

          nextStatus,

          userId,

          remarks:
            remarks ===
            undefined
              ? undefined
              : cleanText(
                  remarks
                ),
        });


    if (
      !updated
    ) {

      throw new ApiError(
        409,
        "Vendor enquiry status changed before this request could be completed. Please refresh and try again."
      );
    }


    return updated;
  }


  /* ==========================================================
     STATUS COUNTS
  ========================================================== */

  async getStatusCounts({
    companyId,
  }) {

    this.assertCompanyId(
      companyId
    );


    const rows =
      await this.repository
        .countByStatus({
          companyId,
        });


    const result = {
      total:
        0,

      draft:
        0,

      requested:
        0,

      received:
        0,

      closed:
        0,

      cancelled:
        0,
    };


    for (
      const row
      of rows
    ) {

      const status =
        String(
          row?._id ||
          ""
        );


      const count =
        Number(
          row?.count ||
          0
        );


      result.total +=
        count;


      if (
        Object.prototype
          .hasOwnProperty
          .call(
            result,
            status
          )
      ) {

        result[
          status
        ] =
          count;
      }
    }


    return result;
  }

}


/* ============================================================
   EXPORT
============================================================ */

export const vendorEnquiryService =
  new VendorEnquiryService();


export {
  VendorEnquiryService
};


export default vendorEnquiryService;