import crypto from "crypto";

import PurchaseRequest
  from "../models/PurchaseRequest.js";

import PurchaseQuotation
  from "../models/PurchaseQuotation.js";

  import LogisticsWarehouse
  from "../models/LogisticsWarehouse.js";;

import purchaseOrderRepository
  from "../repositories/purchaseOrder.repository.js";

import {
  ApiError
} from "../utils/apiError.js";


/* ============================================================
   HELPERS
============================================================ */

const clean =
  value =>
    String(
      value ||
      ""
    )
      .trim();


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
      value?._id
    ) {

      return String(
        value._id
      );
    }


    return String(
      value
    );
  };


const roundMoney =
  value => {

    const number =
      Number(
        value ||
        0
      );


    if (
      !Number.isFinite(
        number
      )
    ) {

      return 0;
    }


    return (
      Math.round(
        (
          number +
          Number.EPSILON
        ) *
        100
      ) /
      100
    );
  };


/* ============================================================
   SERVICE
============================================================ */

class PurchaseOrderService {

  constructor(
    repository =
      purchaseOrderRepository
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
     PO NUMBER
  ========================================================== */

  async generatePoNumber(
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
        now
          .getFullYear();


      const month =
        String(
          now.getMonth() +
          1
        )
          .padStart(
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


      const poNumber =
        `PO-${year}${month}-${random}`;


      const existing =
        await this.repository
          .findByPoNumber(
            companyId,
            poNumber
          );


      if (
        !existing
      ) {

        return poNumber;
      }

    }


    throw new ApiError(
      500,
      "Unable to generate Purchase Order number."
    );
  }


  /* ==========================================================
     PURCHASE REQUEST
  ========================================================== */

  async resolvePurchaseRequest(
    companyId,
    purchaseRequestId
  ) {

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
        409,
        "Purchase Order can be created only for an approved Purchase Request."
      );
    }


    return purchaseRequest;
  }


  /* ==========================================================
     SELECTED QUOTATION
  ========================================================== */

  async resolveQuotation(
    companyId,
    quotationId
  ) {

    const quotation =
      await PurchaseQuotation
        .findOne({
          _id:
            quotationId,

          companyId
        })
        .lean();


    if (
      !quotation
    ) {

      throw new ApiError(
        404,
        "Selected Purchase quotation was not found."
      );
    }


    if (
      quotation.status !==
      "selected"
    ) {

      throw new ApiError(
        409,
        "Purchase Order can be created only from a selected quotation."
      );
    }


    return quotation;
  }


  /* ==========================================================
     WAREHOUSE
     Existing Logistics Warehouse master is reused.
  ========================================================== */

  async resolveWarehouse(
    companyId,
    warehouseId
  ) {
  
    if (
      !warehouseId
    ) {
  
      return null;
    }
  
  
    const warehouse =
      await LogisticsWarehouse
        .findOne({
          _id:
            warehouseId,
  
          companyId,
  
          isActive:
            true
        })
        .lean();
  
  
    if (
      !warehouse
    ) {
  
      throw new ApiError(
        404,
        "Selected warehouse was not found or is inactive."
      );
    }
  
  
    return warehouse;
  }

  /* ==========================================================
     WAREHOUSE DISPLAY NAME
  ========================================================== */

  warehouseDisplayName(
    warehouse
  ) {

    if (
      !warehouse
    ) {

      return "";
    }


    const name =
      clean(
        warehouse.warehouseName ||
        warehouse.name
      );


    const code =
      clean(
        warehouse.warehouseCode ||
        warehouse.code
      );


    if (
      name &&
      code
    ) {

      return `${name} (${code})`;
    }


    return (
      name ||
      code
    );
  }


  /* ==========================================================
     REFERENCE CONSISTENCY
  ========================================================== */

  validateReferences({
    purchaseRequest,
    quotation,
    payloadVendorId = null
  }) {

    if (
      objectIdString(
        quotation.purchaseRequestId
      ) !==
      objectIdString(
        purchaseRequest._id
      )
    ) {

      throw new ApiError(
        409,
        "Selected quotation does not belong to the selected Purchase Request."
      );
    }


    if (
      payloadVendorId &&
      objectIdString(
        payloadVendorId
      ) !==
      objectIdString(
        quotation.vendorId
      )
    ) {

      throw new ApiError(
        409,
        "Selected vendor does not match the selected quotation."
      );
    }


    if (
      !quotation.vendorId
    ) {

      throw new ApiError(
        409,
        "Selected quotation does not contain a valid vendor."
      );
    }

  }


  /* ==========================================================
     CALCULATE PO ITEMS
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
        "At least one Purchase Order item is required."
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

          const orderedQuantity =
            Number(
              item.orderedQuantity
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
              orderedQuantity
            ) ||
            orderedQuantity <=
              0
          ) {

            throw new ApiError(
              400,
              `Item ${index + 1}: ordered quantity must be greater than zero.`
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


          const itemName =
            clean(
              item.itemName
            );


          const unit =
            clean(
              item.unit
            );


          if (
            !itemName
          ) {

            throw new ApiError(
              400,
              `Item ${index + 1}: item name is required.`
            );
          }


          if (
            !unit
          ) {

            throw new ApiError(
              400,
              `Item ${index + 1}: unit is required.`
            );
          }


          const lineSubtotal =
            roundMoney(
              orderedQuantity *
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

            itemName,

            description:
              clean(
                item.description
              ),

            orderedQuantity,

            unit,

            unitPrice:
              roundMoney(
                unitPrice
              ),

            taxPercent,

            lineSubtotal,

            lineTax,

            lineTotal,

            receivedQuantity:
              0,

            remainingQuantity:
              orderedQuantity
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
     CALCULATE TOTALS
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


    const freight =
      Number(
        freightCharges ||
        0
      );


    const other =
      Number(
        otherCharges ||
        0
      );


    if (
      !Number.isFinite(
        freight
      ) ||
      freight <
        0
    ) {

      throw new ApiError(
        400,
        "Freight charges cannot be negative."
      );
    }


    if (
      !Number.isFinite(
        other
      ) ||
      other <
        0
    ) {

      throw new ApiError(
        400,
        "Other charges cannot be negative."
      );
    }


    const safeFreight =
      roundMoney(
        freight
      );


    const safeOther =
      roundMoney(
        other
      );


    return {
      ...calculated,

      freightCharges:
        safeFreight,

      otherCharges:
        safeOther,

      grandTotal:
        roundMoney(
          calculated.subtotal +
          calculated.taxTotal +
          safeFreight +
          safeOther
        )
    };
  }


  /* ==========================================================
     VALIDATE ITEMS AGAINST QUOTATION
  ========================================================== */

  validateItemsAgainstQuotation(
    quotation,
    poItems
  ) {

    const quotationItems =
      Array.isArray(
        quotation.items
      )
        ? quotation.items
        : [];


    if (
      quotationItems.length ===
        0
    ) {

      throw new ApiError(
        409,
        "Selected quotation does not contain any items."
      );
    }


    if (
      poItems.length !==
      quotationItems.length
    ) {

      throw new ApiError(
        409,
        "Purchase Order items must match the selected quotation."
      );
    }


    for (
      let index = 0;
      index < quotationItems.length;
      index += 1
    ) {

      const quotationItem =
        quotationItems[index];


      const poItem =
        poItems[index];


      const sameItemId =
        quotationItem.itemId &&
        poItem.itemId
          ? (
              objectIdString(
                quotationItem.itemId
              ) ===
              objectIdString(
                poItem.itemId
              )
            )
          : true;


      const sameName =
        clean(
          quotationItem.itemName
        )
          .toLowerCase() ===
        clean(
          poItem.itemName
        )
          .toLowerCase();


      const sameUnit =
        clean(
          quotationItem.unit
        )
          .toLowerCase() ===
        clean(
          poItem.unit
        )
          .toLowerCase();


      const quotationQuantity =
        Number(
          quotationItem.quantity
        );


      const orderedQuantity =
        Number(
          poItem.orderedQuantity
        );


      const quotationUnitPrice =
        roundMoney(
          quotationItem.unitPrice
        );


      const poUnitPrice =
        roundMoney(
          poItem.unitPrice
        );


      const quotationTax =
        Number(
          quotationItem.taxPercent ||
          0
        );


      const poTax =
        Number(
          poItem.taxPercent ||
          0
        );


      if (
        !sameItemId ||
        !sameName ||
        !sameUnit
      ) {

        throw new ApiError(
          409,
          `Purchase Order item ${index + 1} does not match the selected quotation.`
        );
      }


      if (
        orderedQuantity >
        quotationQuantity
      ) {

        throw new ApiError(
          409,
          `Purchase Order item ${index + 1} quantity cannot exceed the selected quotation quantity.`
        );
      }


      if (
        poUnitPrice !==
        quotationUnitPrice
      ) {

        throw new ApiError(
          409,
          `Purchase Order item ${index + 1} unit price must match the selected quotation.`
        );
      }


      if (
        poTax !==
        quotationTax
      ) {

        throw new ApiError(
          409,
          `Purchase Order item ${index + 1} tax must match the selected quotation.`
        );
      }

    }

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


    const [
      purchaseRequest,
      quotation,
      warehouse
    ] =
      await Promise.all([

        this.resolvePurchaseRequest(
          companyId,
          payload.purchaseRequestId
        ),

        this.resolveQuotation(
          companyId,
          payload.quotationId
        ),

        this.resolveWarehouse(
            companyId,
            payload.warehouseId
          )

      ]);


    this.validateReferences({
      purchaseRequest,
      quotation,
      payloadVendorId:
        payload.vendorId ||
        null
    });


    const existingPo =
      await this.repository
        .findByQuotation(
          companyId,
          quotation._id
        );


    if (
      existingPo
    ) {

      throw new ApiError(
        409,
        "A Purchase Order has already been created from this quotation."
      );
    }


    const totals =
      this.calculateTotals(
        payload.items,
        payload.freightCharges,
        payload.otherCharges
      );


    this.validateItemsAgainstQuotation(
      quotation,
      totals.items
    );


    const poDate =
      payload.poDate
        ? new Date(
            payload.poDate
          )
        : new Date();


    const expectedDeliveryDate =
      payload.expectedDeliveryDate
        ? new Date(
            payload.expectedDeliveryDate
          )
        : null;


    if (
      expectedDeliveryDate &&
      expectedDeliveryDate.getTime() <
      poDate.getTime()
    ) {

      throw new ApiError(
        400,
        "Expected delivery date cannot be before PO date."
      );
    }


    const poNumber =
      await this.generatePoNumber(
        companyId
      );


    return this.repository
      .create({
        companyId,

        poNumber,

        poDate,

        purchaseRequestId:
          purchaseRequest._id,

        purchaseRequestNumber:
          clean(
            purchaseRequest.prNumber
          ),

        quotationId:
          quotation._id,

        quotationNumber:
          clean(
            quotation.quotationNumber
          ),

        vendorEnquiryId:
          quotation.vendorEnquiryId ||
          null,

        rfqNumber:
          clean(
            quotation.rfqNumber
          ),

        vendorId:
          quotation.vendorId,

        vendorName:
          clean(
            quotation.vendorName
          ),

        vendorCode:
          clean(
            quotation.vendorCode
          ),

        ...totals,

        deliveryAddress:
          clean(
            payload.deliveryAddress
          ),

        warehouseId:
          warehouse?._id ||
          null,

        warehouseName:
          this.warehouseDisplayName(
            warehouse
          ),

        expectedDeliveryDate,

        paymentTerms:
          clean(
            payload.paymentTerms ||
            quotation.paymentTerms
          ),

        remarks:
          clean(
            payload.remarks
          ),

        status:
          "draft",

        createdBy:
          userId,

        updatedBy:
          userId
      });
  }


  /* ==========================================================
     LIST
  ========================================================== */

  async list(
    companyId,
    query = {}
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
    purchaseOrderId
  ) {

    const purchaseOrder =
      await this.repository
        .findById(
          companyId,
          purchaseOrderId
        );


    if (
      !purchaseOrder
    ) {

      throw new ApiError(
        404,
        "Purchase Order was not found."
      );
    }


    return purchaseOrder;
  }


  /* ==========================================================
     UPDATE DRAFT
  ========================================================== */

  async update(
    companyId,
    purchaseOrderId,
    user,
    payload
  ) {

    const existing =
      await this.getById(
        companyId,
        purchaseOrderId
      );


    if (
      existing.status !==
      "draft"
    ) {

      throw new ApiError(
        409,
        "Only draft Purchase Orders can be edited."
      );
    }


    const quotation =
      await this.resolveQuotation(
        companyId,
        existing.quotationId
      );


    let warehouse =
      null;


    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "warehouseId"
      )
    ) {

        warehouse =
        await this.resolveWarehouse(
          companyId,
          payload.warehouseId
        );

    } else if (
      existing.warehouseId
    ) {

        warehouse =
        await this.resolveWarehouse(
          companyId,
          existing.warehouseId
        );
    }


    const nextItems =
      payload.items ||
      existing.items;


    const freightCharges =
      Object.prototype.hasOwnProperty.call(
        payload,
        "freightCharges"
      )
        ? payload.freightCharges
        : existing.freightCharges;


    const otherCharges =
      Object.prototype.hasOwnProperty.call(
        payload,
        "otherCharges"
      )
        ? payload.otherCharges
        : existing.otherCharges;


    const totals =
      this.calculateTotals(
        nextItems,
        freightCharges,
        otherCharges
      );


    this.validateItemsAgainstQuotation(
      quotation,
      totals.items
    );


    const poDate =
      payload.poDate
        ? new Date(
            payload.poDate
          )
        : new Date(
            existing.poDate
          );


    const expectedDeliveryDate =
      Object.prototype.hasOwnProperty.call(
        payload,
        "expectedDeliveryDate"
      )
        ? (
            payload.expectedDeliveryDate
              ? new Date(
                  payload.expectedDeliveryDate
                )
              : null
          )
        : existing.expectedDeliveryDate;


    if (
      expectedDeliveryDate &&
      new Date(
        expectedDeliveryDate
      ).getTime() <
      poDate.getTime()
    ) {

      throw new ApiError(
        400,
        "Expected delivery date cannot be before PO date."
      );
    }


    const updated =
      await this.repository
        .updateDraftById(
          companyId,
          purchaseOrderId,
          {
            poDate,

            ...totals,

            deliveryAddress:
              Object.prototype.hasOwnProperty.call(
                payload,
                "deliveryAddress"
              )
                ? clean(
                    payload.deliveryAddress
                  )
                : existing.deliveryAddress,

            warehouseId:
              warehouse?._id ||
              null,

            warehouseName:
              this.warehouseDisplayName(
                warehouse
              ),

            expectedDeliveryDate,

            paymentTerms:
              Object.prototype.hasOwnProperty.call(
                payload,
                "paymentTerms"
              )
                ? clean(
                    payload.paymentTerms
                  )
                : existing.paymentTerms,

            remarks:
              Object.prototype.hasOwnProperty.call(
                payload,
                "remarks"
              )
                ? clean(
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
        "Purchase Order could not be updated because its workflow state changed."
      );
    }


    return updated;
  }


  /* ==========================================================
     APPROVE
     Route must enforce Purchase Senior.
  ========================================================== */

  async approve(
    companyId,
    purchaseOrderId,
    user
  ) {

    const purchaseOrder =
      await this.getById(
        companyId,
        purchaseOrderId
      );


    if (
      purchaseOrder.status ===
      "approved"
    ) {

      return purchaseOrder;
    }


    if (
      purchaseOrder.status !==
      "draft"
    ) {

      throw new ApiError(
        409,
        "Only a draft Purchase Order can be approved."
      );
    }


    /*
     * Revalidate source documents before approval.
     */

    await Promise.all([

      this.resolvePurchaseRequest(
        companyId,
        purchaseOrder.purchaseRequestId
      ),

      this.resolveQuotation(
        companyId,
        purchaseOrder.quotationId
      )

    ]);


    const approved =
      await this.repository
        .approveById(
          companyId,
          purchaseOrderId,
          this.userIdOf(
            user
          )
        );


    if (
      !approved
    ) {

      throw new ApiError(
        409,
        "Purchase Order could not be approved because its workflow state changed."
      );
    }


    return approved;
  }


  /* ==========================================================
     SEND TO VENDOR
  ========================================================== */

  async send(
    companyId,
    purchaseOrderId,
    user
  ) {

    const purchaseOrder =
      await this.getById(
        companyId,
        purchaseOrderId
      );


    if (
      purchaseOrder.status ===
      "sent"
    ) {

      return purchaseOrder;
    }


    if (
      purchaseOrder.status !==
      "approved"
    ) {

      throw new ApiError(
        409,
        "Only an approved Purchase Order can be marked as sent."
      );
    }


    const sent =
      await this.repository
        .markSentById(
          companyId,
          purchaseOrderId,
          this.userIdOf(
            user
          )
        );


    if (
      !sent
    ) {

      throw new ApiError(
        409,
        "Purchase Order could not be marked as sent because its workflow state changed."
      );
    }


    return sent;
  }


  /* ==========================================================
     CANCEL
  ========================================================== */

  async cancel(
    companyId,
    purchaseOrderId,
    user,
    reason
  ) {

    const purchaseOrder =
      await this.getById(
        companyId,
        purchaseOrderId
      );


    if (
      purchaseOrder.status ===
      "cancelled"
    ) {

      return purchaseOrder;
    }


    if (
      [
        "partially_received",
        "received"
      ].includes(
        purchaseOrder.status
      )
    ) {

      throw new ApiError(
        409,
        "A Purchase Order with received goods cannot be cancelled."
      );
    }


    const cleanReason =
      clean(
        reason
      );


    if (
      !cleanReason
    ) {

      throw new ApiError(
        400,
        "Cancellation reason is required."
      );
    }


    const cancelled =
      await this.repository
        .cancelById(
          companyId,
          purchaseOrderId,
          this.userIdOf(
            user
          ),
          cleanReason
        );


    if (
      !cancelled
    ) {

      throw new ApiError(
        409,
        "Purchase Order could not be cancelled from its current state."
      );
    }


    return cancelled;
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


  /* ==========================================================
     DELIVERY SUMMARY
  ========================================================== */

  async deliverySummary(
    companyId
  ) {

    return this.repository
      .countDeliverySummary(
        companyId
      );
  }

}


export default new PurchaseOrderService();