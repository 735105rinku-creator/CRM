import crypto from "crypto";

import LogisticsVendor from "../models/LogisticsVendor.js";
import PurchaseRequest from "../models/PurchaseRequest.js";
import VendorEnquiry from "../models/VendorEnquiry.js";

import purchaseQuotationRepository
  from "../repositories/purchaseQuotation.repository.js";

import {
  ApiError
} from "../utils/apiError.js";

import {
  findPurchaseSeniorUserId,
  sendPurchaseWorkflowNotification,
} from "./purchaseWorkflowNotification.service.js";


/* ============================================================
   HELPERS
============================================================ */

const roundMoney =
  value => {

    const number =
      Number(
        value || 0
      );

    if (
      !Number.isFinite(
        number
      )
    ) {

      return 0;
    }

    return Math.round(
      (
        number +
        Number.EPSILON
      ) *
      100
    ) / 100;
  };


const normalizeText =
  value =>
    String(
      value || ""
    ).trim();


const objectIdString =
  value => {

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
  };


/* ============================================================
   SERVICE
============================================================ */

class PurchaseQuotationService {

  constructor(
    repository =
      purchaseQuotationRepository
  ) {

    this.repository =
      repository;
  }


  /* ==========================================================
     USER
  ========================================================== */

  userIdOf(
    user
  ) {

    return (
      user?._id ||
      user?.id ||
      null
    );
  }


  /* ==========================================================
     NUMBER
  ========================================================== */

  async generateQuotationNumber(
    companyId
  ) {

    for (
      let attempt = 0;
      attempt < 10;
      attempt += 1
    ) {

      const now =
        new Date();


      const year =
        String(
          now.getFullYear()
        );


      const month =
        String(
          now.getMonth() + 1
        ).padStart(
          2,
          "0"
        );


      const random =
        crypto
          .randomBytes(
            3
          )
          .toString(
            "hex"
          )
          .toUpperCase();


      const quotationNumber =
        `PQ-${year}${month}-${random}`;


      const existing =
        await this.repository
          .findByQuotationNumber(
            companyId,
            quotationNumber
          );


      if (
        !existing
      ) {

        return quotationNumber;
      }

    }


    throw new ApiError(
      500,
      "Unable to generate quotation number."
    );
  }


  /* ==========================================================
     VENDOR
  ========================================================== */

  async resolveVendor(
    companyId,
    vendorId
  ) {

    const vendor =
      await LogisticsVendor
        .findOne({
          _id:
            vendorId,

          companyId,

          isActive:
            true
        })
        .lean();


    if (
      !vendor
    ) {

      throw new ApiError(
        404,
        "Selected vendor was not found or is inactive."
      );
    }


    const vendorName =
      normalizeText(
        vendor.vendorName ||
        vendor.companyName ||
        vendor.name
      );


    if (
      !vendorName
    ) {

      throw new ApiError(
        400,
        "Selected vendor does not have a valid name."
      );
    }


    return {
      vendor,

      vendorName,

      vendorCode:
        normalizeText(
          vendor.vendorCode ||
          vendor.code
        )
    };
  }


  /* ==========================================================
     PURCHASE REQUEST
  ========================================================== */

  async resolvePurchaseRequest(
    companyId,
    purchaseRequestId
  ) {

    if (
      !purchaseRequestId
    ) {

      return null;
    }


    const purchaseRequest =
      await PurchaseRequest
        .findOne({
          _id:
            purchaseRequestId,

          companyId
        })
        .lean();


    if (
      !purchaseRequest
    ) {

      throw new ApiError(
        404,
        "Purchase Request was not found."
      );
    }


    if (
      purchaseRequest.status !==
      "approved"
    ) {

      throw new ApiError(
        400,
        "Only an approved Purchase Request can be linked to a quotation."
      );
    }


    return purchaseRequest;
  }


  /* ==========================================================
     VENDOR ENQUIRY / RFQ
  ========================================================== */

  async resolveVendorEnquiry(
    companyId,
    vendorEnquiryId
  ) {

    if (
      !vendorEnquiryId
    ) {

      return null;
    }


    const enquiry =
      await VendorEnquiry
        .findOne({
          _id:
            vendorEnquiryId,

          companyId
        })
        .lean();


    if (
      !enquiry
    ) {

      throw new ApiError(
        404,
        "Vendor Enquiry / RFQ was not found."
      );
    }


    if (
      ![
        "requested",
        "received"
      ].includes(
        enquiry.status
      )
    ) {

      throw new ApiError(
        400,
        "Only requested or received Vendor Enquiries can be linked to a quotation."
      );
    }


    return enquiry;
  }


  /* ==========================================================
     REFERENCE CONSISTENCY
  ========================================================== */

  validateReferences({
    purchaseRequest,
    vendorEnquiry,
    vendorId
  }) {

    if (
      !vendorEnquiry
    ) {

      return;
    }


    if (
      objectIdString(
        vendorEnquiry.vendorId
      ) !==
      objectIdString(
        vendorId
      )
    ) {

      throw new ApiError(
        400,
        "Quotation vendor does not match the Vendor Enquiry vendor."
      );
    }


    const enquiryPurchaseRequestId =
      objectIdString(
        vendorEnquiry.purchaseRequestId
      );


    const purchaseRequestId =
      objectIdString(
        purchaseRequest?._id
      );


    if (
      enquiryPurchaseRequestId &&
      purchaseRequestId &&
      enquiryPurchaseRequestId !==
      purchaseRequestId
    ) {

      throw new ApiError(
        400,
        "Vendor Enquiry does not belong to the selected Purchase Request."
      );
    }

  }


  /* ==========================================================
     CALCULATE ITEMS
  ========================================================== */

  calculateItems(
    items
  ) {

    if (
      !Array.isArray(
        items
      ) ||
      items.length ===
        0
    ) {

      throw new ApiError(
        400,
        "At least one quotation item is required."
      );
    }


    let subtotal =
      0;


    let taxTotal =
      0;


    const calculatedItems =
      items.map(
        (
          item,
          index
        ) => {

          const quantity =
            Number(
              item.quantity
            );


          const unitPrice =
            Number(
              item.unitPrice
            );


          const taxPercent =
            Number(
              item.taxPercent ||
              0
            );


          if (
            !Number.isFinite(
              quantity
            ) ||
            quantity <=
              0
          ) {

            throw new ApiError(
              400,
              `Item ${index + 1}: quantity must be greater than zero.`
            );
          }


          if (
            !Number.isFinite(
              unitPrice
            ) ||
            unitPrice <
              0
          ) {

            throw new ApiError(
              400,
              `Item ${index + 1}: unit price cannot be negative.`
            );
          }


          if (
            !Number.isFinite(
              taxPercent
            ) ||
            taxPercent <
              0 ||
            taxPercent >
              100
          ) {

            throw new ApiError(
              400,
              `Item ${index + 1}: tax percentage must be between 0 and 100.`
            );
          }


          const lineSubtotal =
            roundMoney(
              quantity *
              unitPrice
            );


          const lineTax =
            roundMoney(
              lineSubtotal *
              taxPercent /
              100
            );


          const lineTotal =
            roundMoney(
              lineSubtotal +
              lineTax
            );


          subtotal =
            roundMoney(
              subtotal +
              lineSubtotal
            );


          taxTotal =
            roundMoney(
              taxTotal +
              lineTax
            );


          return {
            ...(item.itemId
              ? {
                  itemId:
                    item.itemId
                }
              : {}),

            itemName:
              normalizeText(
                item.itemName
              ),

            description:
              normalizeText(
                item.description
              ),

            quantity,

            unit:
              normalizeText(
                item.unit
              ),

            unitPrice:
              roundMoney(
                unitPrice
              ),

            taxPercent,

            lineSubtotal,

            lineTax,

            lineTotal
          };
        }
      );


    return {
      items:
        calculatedItems,

      subtotal,

      taxTotal
    };
  }


  /* ==========================================================
     TOTALS
  ========================================================== */

  calculateTotals(
    items,
    freightCharges = 0,
    otherCharges = 0
  ) {

    const calculated =
      this.calculateItems(
        items
      );


    const safeFreight =
      roundMoney(
        freightCharges
      );


    const safeOther =
      roundMoney(
        otherCharges
      );


    if (
      safeFreight <
      0
    ) {

      throw new ApiError(
        400,
        "Freight charges cannot be negative."
      );
    }


    if (
      safeOther <
      0
    ) {

      throw new ApiError(
        400,
        "Other charges cannot be negative."
      );
    }


    const grandTotal =
      roundMoney(
        calculated.subtotal +
        calculated.taxTotal +
        safeFreight +
        safeOther
      );


    return {
      items:
        calculated.items,

      subtotal:
        calculated.subtotal,

      taxTotal:
        calculated.taxTotal,

      freightCharges:
        safeFreight,

      otherCharges:
        safeOther,

      grandTotal
    };
  }


  /* ==========================================================
     CREATE
  ========================================================== */

  async create(
    companyId,
    user,
    payload
  ) {

    const userId =
      this.userIdOf(
        user
      );


    if (
      !userId
    ) {

      throw new ApiError(
        401,
        "Authenticated user could not be resolved."
      );
    }


    const vendorEnquiry =
  await this.resolveVendorEnquiry(
    companyId,
    payload.vendorEnquiryId
  );


const effectivePurchaseRequestId =
  payload.purchaseRequestId ||
  vendorEnquiry?.purchaseRequestId ||
  null;


const [
  vendorResult,
  purchaseRequest
] =
  await Promise.all([

    this.resolveVendor(
      companyId,
      payload.vendorId
    ),

    this.resolvePurchaseRequest(
      companyId,
      effectivePurchaseRequestId
    )

  ]);


    this.validateReferences({
      purchaseRequest,
      vendorEnquiry,
      vendorId:
        payload.vendorId
    });


    if (
      vendorEnquiry
    ) {

      const duplicate =
        await this.repository
          .findByVendorEnquiry(
            companyId,
            vendorEnquiry._id
          );


      if (
        duplicate
      ) {

        throw new ApiError(
          409,
          "A quotation has already been created for this Vendor Enquiry."
        );
      }

    }


    const totals =
      this.calculateTotals(
        payload.items,
        payload.freightCharges,
        payload.otherCharges
      );


    const quotationNumber =
      await this.generateQuotationNumber(
        companyId
      );


    const quotationDate =
      payload.quotationDate
        ? new Date(
            payload.quotationDate
          )
        : new Date();


    const validUntil =
      payload.validUntil
        ? new Date(
            payload.validUntil
          )
        : null;


    if (
      validUntil &&
      validUntil.getTime() <
      quotationDate.getTime()
    ) {

      throw new ApiError(
        400,
        "Quotation validity date cannot be before quotation date."
      );
    }


    const created =
      await this.repository
        .create({
          companyId,

          quotationNumber,

          rfqNumber:
            normalizeText(
              vendorEnquiry?.rfqNumber ||
              vendorEnquiry?.enquiryNumber
            ),

          purchaseRequestId:
            purchaseRequest?._id ||
            null,

          vendorEnquiryId:
            vendorEnquiry?._id ||
            null,

          vendorId:
            vendorResult.vendor._id,

          vendorName:
            vendorResult.vendorName,

          vendorCode:
            vendorResult.vendorCode,

          quotationDate,

          ...totals,

          deliveryTime:
            normalizeText(
              payload.deliveryTime ||
              vendorEnquiry?.deliveryTime
            ),

          paymentTerms:
            normalizeText(
              payload.paymentTerms ||
              vendorEnquiry?.paymentTerms
            ),

          validUntil,

          remarks:
            normalizeText(
              payload.remarks
            ),

          status:
            "received",

          createdBy:
            userId,

          updatedBy:
            userId
        });


    const approverUserId =
      await findPurchaseSeniorUserId({
        companyId,
        requesterUserId: userId,
      });


    await sendPurchaseWorkflowNotification({
      companyId,
      recipientUserId: approverUserId,
      senderUserId: userId,
      title: "Quotation awaiting selection",
      message: `${created.quotationNumber || "Purchase quotation"} requires your review and selection.`,
      entityType: "PurchaseQuotation",
      entityId: created._id,
      actionUrl: `/purchase/quotations/${created._id}`,
    });


    return created;
  }


  /* ==========================================================
     LIST
  ========================================================== */

  async list(
    companyId,
    query
  ) {

    return this.repository
      .list(
        companyId,
        query
      );
  }


  /* ==========================================================
     GET
  ========================================================== */

  async getById(
    companyId,
    quotationId
  ) {

    const quotation =
      await this.repository
        .findById(
          companyId,
          quotationId
        );


    if (
      !quotation
    ) {

      throw new ApiError(
        404,
        "Purchase quotation was not found."
      );
    }


    return quotation;
  }


  /* ==========================================================
     UPDATE
  ========================================================== */

  async update(
    companyId,
    quotationId,
    user,
    payload
  ) {

    const existing =
      await this.repository
        .findById(
          companyId,
          quotationId
        );


    if (
      !existing
    ) {

      throw new ApiError(
        404,
        "Purchase quotation was not found."
      );
    }


    if (
      ![
        "requested",
        "received"
      ].includes(
        existing.status
      )
    ) {

      throw new ApiError(
        409,
        "Selected or rejected quotations cannot be edited."
      );
    }


    const nextVendorId =
      payload.vendorId ||
      existing.vendorId;


    const nextPurchaseRequestId =
      Object.prototype.hasOwnProperty.call(
        payload,
        "purchaseRequestId"
      )
        ? payload.purchaseRequestId
        : existing.purchaseRequestId;


    const nextVendorEnquiryId =
      Object.prototype.hasOwnProperty.call(
        payload,
        "vendorEnquiryId"
      )
        ? payload.vendorEnquiryId
        : existing.vendorEnquiryId;


    const [
      vendorResult,
      purchaseRequest,
      vendorEnquiry
    ] =
      await Promise.all([

        this.resolveVendor(
          companyId,
          nextVendorId
        ),

        this.resolvePurchaseRequest(
          companyId,
          nextPurchaseRequestId
        ),

        this.resolveVendorEnquiry(
          companyId,
          nextVendorEnquiryId
        )

      ]);


    this.validateReferences({
      purchaseRequest,
      vendorEnquiry,
      vendorId:
        nextVendorId
    });


    if (
      vendorEnquiry
    ) {

      const duplicate =
        await this.repository
          .findByVendorEnquiry(
            companyId,
            vendorEnquiry._id
          );


      if (
        duplicate &&
        objectIdString(
          duplicate._id
        ) !==
        objectIdString(
          existing._id
        )
      ) {

        throw new ApiError(
          409,
          "Another quotation already exists for this Vendor Enquiry."
        );
      }

    }


    const nextItems =
      payload.items ||
      existing.items;


    const nextFreight =
      Object.prototype.hasOwnProperty.call(
        payload,
        "freightCharges"
      )
        ? payload.freightCharges
        : existing.freightCharges;


    const nextOther =
      Object.prototype.hasOwnProperty.call(
        payload,
        "otherCharges"
      )
        ? payload.otherCharges
        : existing.otherCharges;


    const totals =
      this.calculateTotals(
        nextItems,
        nextFreight,
        nextOther
      );


    const nextQuotationDate =
      payload.quotationDate
        ? new Date(
            payload.quotationDate
          )
        : new Date(
            existing.quotationDate
          );


    const nextValidUntil =
      Object.prototype.hasOwnProperty.call(
        payload,
        "validUntil"
      )
        ? (
            payload.validUntil
              ? new Date(
                  payload.validUntil
                )
              : null
          )
        : existing.validUntil;


    if (
      nextValidUntil &&
      new Date(
        nextValidUntil
      ).getTime() <
      nextQuotationDate.getTime()
    ) {

      throw new ApiError(
        400,
        "Quotation validity date cannot be before quotation date."
      );
    }


    const updated =
      await this.repository
        .updateEditableById(
          companyId,
          quotationId,
          {
            purchaseRequestId:
              purchaseRequest?._id ||
              null,

            vendorEnquiryId:
              vendorEnquiry?._id ||
              null,

            vendorId:
              vendorResult.vendor._id,

            vendorName:
              vendorResult.vendorName,

            vendorCode:
              vendorResult.vendorCode,

            rfqNumber:
              normalizeText(
                vendorEnquiry?.rfqNumber ||
                vendorEnquiry?.enquiryNumber
              ),

            quotationDate:
              nextQuotationDate,

            ...totals,

            deliveryTime:
              Object.prototype.hasOwnProperty.call(
                payload,
                "deliveryTime"
              )
                ? normalizeText(
                    payload.deliveryTime
                  )
                : existing.deliveryTime,

            paymentTerms:
              Object.prototype.hasOwnProperty.call(
                payload,
                "paymentTerms"
              )
                ? normalizeText(
                    payload.paymentTerms
                  )
                : existing.paymentTerms,

            validUntil:
              nextValidUntil,

            remarks:
              Object.prototype.hasOwnProperty.call(
                payload,
                "remarks"
              )
                ? normalizeText(
                    payload.remarks
                  )
                : existing.remarks,

            updatedBy:
              this.userIdOf(
                user
              )
          }
        );


    if (
      !updated
    ) {

      throw new ApiError(
        409,
        "Quotation could not be updated because its workflow state changed."
      );
    }


    return updated;
  }


  /* ==========================================================
     OPERATIONAL STATUS
  ========================================================== */

  async updateStatus(
    companyId,
    quotationId,
    user,
    status
  ) {

    const existing =
      await this.getById(
        companyId,
        quotationId
      );


    if (
      [
        "selected",
        "rejected"
      ].includes(
        existing.status
      )
    ) {

      throw new ApiError(
        409,
        "Selected or rejected quotation status cannot be changed."
      );
    }


    let fromStatuses;


    if (
      status ===
      "requested"
    ) {

      fromStatuses = [
        "received"
      ];
    } else if (
      status ===
      "received"
    ) {

      fromStatuses = [
        "requested"
      ];
    } else {

      throw new ApiError(
        400,
        "Invalid operational quotation status."
      );
    }


    const updated =
      await this.repository
        .transitionOperationalStatusById(
          companyId,
          quotationId,
          fromStatuses,
          status,
          this.userIdOf(
            user
          )
        );


    if (
      !updated
    ) {

      throw new ApiError(
        409,
        "Quotation status could not be changed from its current state."
      );
    }


    return updated;
  }


  /* ==========================================================
     SELECT
     Permission is also enforced by route middleware.
  ========================================================== */

  async select(
    companyId,
    quotationId,
    user
  ) {

    const quotation =
      await this.getById(
        companyId,
        quotationId
      );


    if (
      quotation.status ===
      "selected"
    ) {

      return quotation;
    }


    if (
      quotation.status ===
      "rejected"
    ) {

      throw new ApiError(
        409,
        "Rejected quotation cannot be selected."
      );
    }


    if (
      !quotation.purchaseRequestId
    ) {

      throw new ApiError(
        400,
        "Quotation must be linked to an approved Purchase Request before selection."
      );
    }


    await this.resolvePurchaseRequest(
      companyId,
      quotation.purchaseRequestId
    );


    const alreadySelected =
      await this.repository
        .findSelectedForPurchaseRequest(
          companyId,
          quotation.purchaseRequestId
        );


    if (
      alreadySelected &&
      objectIdString(
        alreadySelected._id
      ) !==
      objectIdString(
        quotation._id
      )
    ) {

      throw new ApiError(
        409,
        "Another quotation has already been selected for this Purchase Request."
      );
    }


    const userId =
      this.userIdOf(
        user
      );


    const selected =
      await this.repository
        .selectById(
          companyId,
          quotationId,
          userId
        );


    if (
      !selected
    ) {

      throw new ApiError(
        409,
        "Quotation could not be selected because its workflow state changed."
      );
    }


    /*
     * Once one quotation is selected, remaining open quotations
     * of the same PR are rejected for a clear comparison outcome.
     */

    await this.repository
      .rejectOtherQuotationsForPurchaseRequest(
        companyId,
        quotation.purchaseRequestId,
        quotationId,
        userId
      );


    await sendPurchaseWorkflowNotification({
      companyId,
      recipientUserId: quotation.createdBy,
      senderUserId: userId,
      title: "Purchase quotation selected",
      message: `${quotation.quotationNumber || "Purchase quotation"} has been selected.`,
      entityType: "PurchaseQuotation",
      entityId: quotation._id,
      actionUrl: `/purchase/quotations/${quotation._id}`,
    });


    return this.getById(
      companyId,
      quotationId
    );
  }


  /* ==========================================================
     REJECT
     Permission is also enforced by route middleware.
  ========================================================== */

  async reject(
    companyId,
    quotationId,
    user,
    reason = ""
  ) {

    const quotation =
      await this.getById(
        companyId,
        quotationId
      );


    if (
      quotation.status ===
      "rejected"
    ) {

      return quotation;
    }


    if (
      quotation.status ===
      "selected"
    ) {

      throw new ApiError(
        409,
        "Selected quotation cannot be rejected."
      );
    }


    const rejected =
      await this.repository
        .rejectById(
          companyId,
          quotationId,
          this.userIdOf(
            user
          ),
          normalizeText(
            reason
          )
        );


    if (
      !rejected
    ) {

      throw new ApiError(
        409,
        "Quotation could not be rejected because its workflow state changed."
      );
    }


    await sendPurchaseWorkflowNotification({
      companyId,
      recipientUserId: quotation.createdBy,
      senderUserId: this.userIdOf(user),
      title: "Purchase quotation rejected",
      message: `${quotation.quotationNumber || "Purchase quotation"} has been rejected.`,
      entityType: "PurchaseQuotation",
      entityId: quotation._id,
      actionUrl: `/purchase/quotations/${quotation._id}`,
    });


    return rejected;
  }


  /* ==========================================================
     COMPARISON
  ========================================================== */

  async comparison(
    companyId,
    purchaseRequestId
  ) {

    await this.resolvePurchaseRequest(
      companyId,
      purchaseRequestId
    );


    const quotations =
      await this.repository
        .findForComparison(
          companyId,
          purchaseRequestId
        );


    return quotations.map(
      quotation => {

        const firstItem =
          Array.isArray(
            quotation.items
          )
            ? quotation.items[0]
            : null;


        return {
          quotationId:
            quotation._id,

          quotationNumber:
            quotation.quotationNumber,

          vendorId:
            quotation.vendorId,

          vendorName:
            quotation.vendorName,

          itemName:
            firstItem?.itemName ||
            "",

          quantity:
            firstItem?.quantity ||
            0,

          unit:
            firstItem?.unit ||
            "",

          unitPrice:
            roundMoney(
              firstItem?.unitPrice
            ),

          subtotal:
            roundMoney(
              quotation.subtotal
            ),

          taxTotal:
            roundMoney(
              quotation.taxTotal
            ),

          freightCharges:
            roundMoney(
              quotation.freightCharges
            ),

          otherCharges:
            roundMoney(
              quotation.otherCharges
            ),

          grandTotal:
            roundMoney(
              quotation.grandTotal
            ),

          deliveryTime:
            quotation.deliveryTime ||
            "",

          paymentTerms:
            quotation.paymentTerms ||
            "",

          validUntil:
            quotation.validUntil ||
            null,

          status:
            quotation.status
        };
      }
    );
  }


  /* ==========================================================
     STATUS COUNTS
  ========================================================== */

  async statusCounts(
    companyId
  ) {

    return this.repository
      .countByStatus(
        companyId
      );
  }

}


export default new PurchaseQuotationService();
