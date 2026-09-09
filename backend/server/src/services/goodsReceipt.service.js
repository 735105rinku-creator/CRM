import crypto from "crypto";
import mongoose from "mongoose";

import PurchaseOrder from "../models/PurchaseOrder.js";
import LogisticsWarehouse from "../models/LogisticsWarehouse.js";

import goodsReceiptRepository from "../repositories/goodsReceipt.repository.js";
import purchaseOrderRepository from "../repositories/purchaseOrder.repository.js";

import { ApiError } from "../utils/apiError.js";


/* ============================================================
   HELPERS
============================================================ */

const clean = (
  value
) =>
  String(
    value ??
    ""
  )
    .trim();


const idString = (
  value
) =>
  clean(
    value?._id ??
    value
  );


const roundQuantity = (
  value
) =>
  Number(
    Number(
      value ||
      0
    )
      .toFixed(
        4
      )
  );


const sameId = (
  first,
  second
) =>
  Boolean(
    idString(
      first
    )
  ) &&
  idString(
    first
  ) ===
  idString(
    second
  );


/* ============================================================
   SERVICE
============================================================ */

class GoodsReceiptService {

  constructor(
    {
      goodsReceiptRepo =
        goodsReceiptRepository,

      purchaseOrderRepo =
        purchaseOrderRepository
    } = {}
  ) {

    this.goodsReceiptRepo =
      goodsReceiptRepo;

    this.purchaseOrderRepo =
      purchaseOrderRepo;
  }


  /* ==========================================================
     USER
  ========================================================== */

  userIdOf(
    user
  ) {

    const userId =
      user?._id ||
      user?.id;


    if (
      !userId
    ) {

      throw new ApiError(
        401,
        "Authenticated user is required."
      );
    }


    return userId;
  }


  userDisplayName(
    user
  ) {

    return (
      clean(
        user?.name
      ) ||
      clean(
        user?.fullName
      ) ||
      [
        clean(
          user?.firstName
        ),
        clean(
          user?.lastName
        )
      ]
        .filter(
          Boolean
        )
        .join(
          " "
        ) ||
      clean(
        user?.email
      )
    );
  }


  /* ==========================================================
     GRN NUMBER
  ========================================================== */

  async generateGrnNumber(
    companyId,
    {
      session = null
    } = {}
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


    for (
      let attempt =
        0;
      attempt <
        10;
      attempt +=
        1
    ) {

      const suffix =
        crypto
          .randomBytes(
            3
          )
          .toString(
            "hex"
          )
          .toUpperCase();


      const grnNumber =
        `GRN-${year}${month}-${suffix}`;


      const existing =
        await this
          .goodsReceiptRepo
          .findByGrnNumber(
            companyId,
            grnNumber,
            {
              session
            }
          );


      if (
        !existing
      ) {

        return grnNumber;
      }
    }


    throw new ApiError(
      500,
      "Unable to generate a unique GRN number."
    );
  }


  /* ==========================================================
     PURCHASE ORDER
  ========================================================== */

  async resolvePurchaseOrder(
    companyId,
    purchaseOrderId,
    {
      session = null
    } = {}
  ) {

    const purchaseOrder =
      await this
        .purchaseOrderRepo
        .findById(
          companyId,
          purchaseOrderId,
          {
            session
          }
        );


    if (
      !purchaseOrder
    ) {

      throw new ApiError(
        404,
        "Purchase Order was not found."
      );
    }


    if (
      purchaseOrder.status ===
      "draft"
    ) {

      throw new ApiError(
        409,
        "Goods Receipt cannot be created for a Draft Purchase Order."
      );
    }


    if (
      purchaseOrder.status ===
      "cancelled"
    ) {

      throw new ApiError(
        409,
        "Goods Receipt cannot be created for a Cancelled Purchase Order."
      );
    }


    if (
      purchaseOrder.status ===
      "received"
    ) {

      throw new ApiError(
        409,
        "Purchase Order is already fully received."
      );
    }


    if (
      ![
        "approved",
        "sent",
        "partially_received"
      ]
        .includes(
          purchaseOrder.status
        )
    ) {

      throw new ApiError(
        409,
        "Purchase Order is not available for Goods Receipt."
      );
    }


    if (
      !Array.isArray(
        purchaseOrder.items
      ) ||
      purchaseOrder.items.length ===
        0
    ) {

      throw new ApiError(
        409,
        "Purchase Order does not contain receivable items."
      );
    }


    return purchaseOrder;
  }


  /* ==========================================================
     WAREHOUSE
  ========================================================== */

  async resolveWarehouse(
    companyId,
    warehouseId,
    {
      session = null
    } = {}
  ) {

    let query =
      LogisticsWarehouse
        .findOne({
          _id:
            warehouseId,

          companyId,

          isActive:
            true
        })
        .lean();


    if (
      session
    ) {

      query =
        query.session(
          session
        );
    }


    const warehouse =
      await query;


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


  warehouseDisplayName(
    warehouse
  ) {

    return (
      clean(
        warehouse?.warehouseName
      ) ||
      clean(
        warehouse?.name
      ) ||
      clean(
        warehouse?.warehouseCode
      ) ||
      clean(
        warehouse?.code
      ) ||
      "Warehouse"
    );
  }


  warehouseCode(
    warehouse
  ) {

    return (
      clean(
        warehouse?.warehouseCode
      ) ||
      clean(
        warehouse?.code
      )
    );
  }


  /* ==========================================================
     EXISTING RECEIPT QUANTITIES
  ========================================================== */

  async existingReceiptMap(
    companyId,
    purchaseOrderId,
    {
      session = null
    } = {}
  ) {

    const rows =
      await this
        .goodsReceiptRepo
        .aggregateReceivedByPurchaseOrder(
          companyId,
          purchaseOrderId,
          {
            session
          }
        );


    const map =
      new Map();


    for (
      const row
      of rows
    ) {

      map.set(
        idString(
          row.purchaseOrderItemId
        ),
        {
          receivedQuantity:
            roundQuantity(
              row.receivedQuantity
            ),

          acceptedQuantity:
            roundQuantity(
              row.acceptedQuantity
            ),

          rejectedQuantity:
            roundQuantity(
              row.rejectedQuantity
            )
        }
      );
    }


    return map;
  }


  /* ==========================================================
     BUILD GRN ITEMS
  ========================================================== */

  buildReceiptItems(
    purchaseOrder,
    inputItems,
    receiptMap
  ) {

    if (
      !Array.isArray(
        inputItems
      ) ||
      inputItems.length ===
        0
    ) {

      throw new ApiError(
        400,
        "At least one Goods Receipt item is required."
      );
    }


    const poItemMap =
      new Map();


    for (
      const item
      of purchaseOrder.items
    ) {

      const key =
        idString(
          item._id
        );


      if (
        key
      ) {

        poItemMap.set(
          key,
          item
        );
      }
    }


    const seen =
      new Set();


    return inputItems.map(
      (
        input,
        index
      ) => {

        const purchaseOrderItemId =
          idString(
            input.purchaseOrderItemId
          );


        if (
          !purchaseOrderItemId
        ) {

          throw new ApiError(
            400,
            `Purchase Order item reference is required for GRN item ${index + 1}.`
          );
        }


        if (
          seen.has(
            purchaseOrderItemId
          )
        ) {

          throw new ApiError(
            400,
            "The same Purchase Order item cannot appear more than once in one GRN."
          );
        }


        seen.add(
          purchaseOrderItemId
        );


        const poItem =
          poItemMap.get(
            purchaseOrderItemId
          );


        if (
          !poItem
        ) {

          throw new ApiError(
            400,
            `GRN item ${index + 1} does not belong to the selected Purchase Order.`
          );
        }


        const orderedQuantity =
          roundQuantity(
            poItem.orderedQuantity
          );


        const previous =
          receiptMap.get(
            purchaseOrderItemId
          ) || {
            receivedQuantity:
              0
          };


        const previouslyReceivedQuantity =
          roundQuantity(
            previous.receivedQuantity
          );


        const availableQuantity =
          roundQuantity(
            orderedQuantity -
            previouslyReceivedQuantity
          );


        if (
          availableQuantity <=
          0
        ) {

          throw new ApiError(
            409,
            `${clean(poItem.itemName) || "Item"} is already fully received.`
          );
        }


        const currentReceivedQuantity =
          roundQuantity(
            input.currentReceivedQuantity
          );


        const acceptedQuantity =
          roundQuantity(
            input.acceptedQuantity
          );


        const rejectedQuantity =
          roundQuantity(
            input.rejectedQuantity
          );


        if (
          currentReceivedQuantity <=
          0
        ) {

          throw new ApiError(
            400,
            `Received quantity must be greater than zero for ${clean(poItem.itemName) || `item ${index + 1}`}.`
          );
        }


        if (
          currentReceivedQuantity >
          availableQuantity
        ) {

          throw new ApiError(
            409,
            `Received quantity for ${clean(poItem.itemName) || `item ${index + 1}`} cannot exceed remaining quantity ${availableQuantity}.`
          );
        }


        if (
          Math.abs(
            (
              acceptedQuantity +
              rejectedQuantity
            ) -
            currentReceivedQuantity
          ) >
          0.000001
        ) {

          throw new ApiError(
            400,
            `Accepted plus rejected quantity must equal received quantity for ${clean(poItem.itemName) || `item ${index + 1}`}.`
          );
        }


        if (
          rejectedQuantity >
            0 &&
          !clean(
            input.rejectionReason
          )
        ) {

          throw new ApiError(
            400,
            `Rejection reason is required for ${clean(poItem.itemName) || `item ${index + 1}`}.`
          );
        }


        const remainingQuantity =
          roundQuantity(
            orderedQuantity -
            previouslyReceivedQuantity -
            currentReceivedQuantity
          );


        return {

          purchaseOrderItemId:
            poItem._id,

          itemId:
            poItem.itemId ||
            null,

          itemName:
            clean(
              poItem.itemName
            ),

          description:
            clean(
              poItem.description
            ),

          unit:
            clean(
              poItem.unit
            ),

          orderedQuantity,

          previouslyReceivedQuantity,

          currentReceivedQuantity,

          acceptedQuantity,

          rejectedQuantity,

          remainingQuantity,

          rejectionReason:
            clean(
              input.rejectionReason
            )

        };
      }
    );
  }


  /* ==========================================================
     CALCULATE UPDATED PO RECEIPT STATE
  ========================================================== */

  buildUpdatedPurchaseOrderItems(
    purchaseOrder,
    grnItems,
    existingReceiptMap
  ) {

    const currentReceiptMap =
      new Map();


    for (
      const grnItem
      of grnItems
    ) {

      currentReceiptMap.set(
        idString(
          grnItem.purchaseOrderItemId
        ),
        roundQuantity(
          grnItem.currentReceivedQuantity
        )
      );
    }


    return purchaseOrder.items.map(
      (
        poItem
      ) => {

        const key =
          idString(
            poItem._id
          );


        const existing =
          existingReceiptMap.get(
            key
          ) || {
            receivedQuantity:
              0
          };


        const priorReceived =
          roundQuantity(
            existing.receivedQuantity
          );


        const currentReceived =
          roundQuantity(
            currentReceiptMap.get(
              key
            ) ||
            0
          );


        const ordered =
          roundQuantity(
            poItem.orderedQuantity
          );


        const received =
          roundQuantity(
            priorReceived +
            currentReceived
          );


        const remaining =
          roundQuantity(
            ordered -
            received
          );


        if (
          received >
          ordered
        ) {

          throw new ApiError(
            409,
            `Receipt quantity exceeds ordered quantity for ${clean(poItem.itemName) || "Purchase Order item"}.`
          );
        }


        return {

          ...(
            typeof poItem.toObject ===
            "function"
              ? poItem.toObject()
              : poItem
          ),

          receivedQuantity:
            received,

          remainingQuantity:
            remaining

        };
      }
    );
  }


  determinePurchaseOrderStatus(
    updatedItems
  ) {

    const allReceived =
      updatedItems.every(
        (
          item
        ) =>
          roundQuantity(
            item.remainingQuantity
          ) <=
          0
      );


    if (
      allReceived
    ) {

      return "received";
    }


    const hasAnyReceipt =
      updatedItems.some(
        (
          item
        ) =>
          roundQuantity(
            item.receivedQuantity
          ) >
          0
      );


    if (
      hasAnyReceipt
    ) {

      return "partially_received";
    }


    return null;
  }


  determineGrnStatus(
    grnItems,
    updatedPurchaseOrderItems
  ) {

    const currentReceived =
      grnItems.reduce(
        (
          total,
          item
        ) =>
          total +
          roundQuantity(
            item.currentReceivedQuantity
          ),
        0
      );


    const currentAccepted =
      grnItems.reduce(
        (
          total,
          item
        ) =>
          total +
          roundQuantity(
            item.acceptedQuantity
          ),
        0
      );


    const currentRejected =
      grnItems.reduce(
        (
          total,
          item
        ) =>
          total +
          roundQuantity(
            item.rejectedQuantity
          ),
        0
      );


    const allPoItemsComplete =
      updatedPurchaseOrderItems.every(
        (
          item
        ) =>
          roundQuantity(
            item.remainingQuantity
          ) <=
          0
      );


    if (
      currentRejected >
        0 &&
      currentAccepted ===
        0 &&
      Math.abs(
        currentRejected -
        currentReceived
      ) <=
        0.000001
    ) {

      return "rejected";
    }


    if (
      allPoItemsComplete
    ) {

      return "completed";
    }


    return "partial";
  }


  /* ==========================================================
     CREATE GRN
  ========================================================== */

  async create(
    companyId,
    payload,
    user
  ) {

    const userId =
      this.userIdOf(
        user
      );


    const session =
      await mongoose
        .startSession();


    try {

      let createdGrn =
        null;


      await session.withTransaction(
        async () => {

          const purchaseOrder =
            await this
              .resolvePurchaseOrder(
                companyId,
                payload.purchaseOrderId,
                {
                  session
                }
              );


          const warehouse =
            await this
              .resolveWarehouse(
                companyId,
                payload.warehouseId,
                {
                  session
                }
              );


          /*
           * If PO already has a warehouse,
           * GRN must use the same warehouse.
           */
          if (
            purchaseOrder.warehouseId &&
            !sameId(
              purchaseOrder.warehouseId,
              warehouse._id
            )
          ) {

            throw new ApiError(
              409,
              "Goods Receipt warehouse must match the Purchase Order warehouse."
            );
          }


          const duplicateChallan =
            await this
              .goodsReceiptRepo
              .findByDeliveryChallan(
                companyId,
                purchaseOrder.vendorId,
                payload.deliveryChallanNumber,
                {
                  session
                }
              );


          if (
            duplicateChallan
          ) {

            throw new ApiError(
              409,
              "This delivery challan number has already been used for the vendor."
            );
          }


          const existingReceiptMap =
            await this
              .existingReceiptMap(
                companyId,
                purchaseOrder._id,
                {
                  session
                }
              );


          const grnItems =
            this
              .buildReceiptItems(
                purchaseOrder,
                payload.items,
                existingReceiptMap
              );


          const updatedPurchaseOrderItems =
            this
              .buildUpdatedPurchaseOrderItems(
                purchaseOrder,
                grnItems,
                existingReceiptMap
              );


          const purchaseOrderStatus =
            this
              .determinePurchaseOrderStatus(
                updatedPurchaseOrderItems
              );


          if (
            !purchaseOrderStatus
          ) {

            throw new ApiError(
              409,
              "Unable to determine Purchase Order receipt status."
            );
          }


          const grnStatus =
            this
              .determineGrnStatus(
                grnItems,
                updatedPurchaseOrderItems
              );


          const grnNumber =
            await this
              .generateGrnNumber(
                companyId,
                {
                  session
                }
              );


          createdGrn =
            await this
              .goodsReceiptRepo
              .create(
                {

                  companyId,

                  grnNumber,

                  purchaseOrderId:
                    purchaseOrder._id,

                  poNumber:
                    clean(
                      purchaseOrder.poNumber
                    ),

                  receiptDate:
                    payload.receiptDate
                      ? new Date(
                          payload.receiptDate
                        )
                      : new Date(),

                  vendorId:
                    purchaseOrder.vendorId,

                  vendorName:
                    clean(
                      purchaseOrder.vendorName
                    ),

                  vendorCode:
                    clean(
                      purchaseOrder.vendorCode
                    ),

                  warehouseId:
                    warehouse._id,

                  warehouseName:
                    this
                      .warehouseDisplayName(
                        warehouse
                      ),

                  warehouseCode:
                    this
                      .warehouseCode(
                        warehouse
                      ),

                  deliveryChallanNumber:
                    clean(
                      payload.deliveryChallanNumber
                    ),

                  items:
                    grnItems,

                  receivedBy:
                    userId,

                  receivedByName:
                    this
                      .userDisplayName(
                        user
                      ),

                  remarks:
                    clean(
                      payload.remarks
                    ),

                  status:
                    grnStatus,

                  createdBy:
                    userId,

                  updatedBy:
                    userId

                },
                {
                  session
                }
              );


          const updatedPurchaseOrder =
            await this
              .purchaseOrderRepo
              .updateReceiptStateById(
                companyId,
                purchaseOrder._id,
                {
                  items:
                    updatedPurchaseOrderItems,

                  status:
                    purchaseOrderStatus,

                  updatedBy:
                    userId
                },
                {
                  session
                }
              );


          if (
            !updatedPurchaseOrder
          ) {

            throw new ApiError(
              409,
              "Purchase Order receipt quantities changed. Please refresh and try again."
            );
          }

        }
      );


      if (
        !createdGrn
      ) {

        throw new ApiError(
          500,
          "Goods Receipt could not be created."
        );
      }


      return this
        .getById(
          companyId,
          createdGrn._id
        );

    } finally {

      await session
        .endSession();

    }
  }


  /* ==========================================================
     LIST
  ========================================================== */

  async list(
    companyId,
    filters
  ) {

    return this
      .goodsReceiptRepo
      .list(
        companyId,
        filters
      );
  }


  /* ==========================================================
     GET BY ID
  ========================================================== */

  async getById(
    companyId,
    id
  ) {

    const goodsReceipt =
      await this
        .goodsReceiptRepo
        .findById(
          companyId,
          id
        );


    if (
      !goodsReceipt
    ) {

      throw new ApiError(
        404,
        "Goods Receipt was not found."
      );
    }


    return goodsReceipt;
  }


  /* ==========================================================
     GET BY PURCHASE ORDER
  ========================================================== */

  async getByPurchaseOrder(
    companyId,
    purchaseOrderId
  ) {

    const purchaseOrder =
      await PurchaseOrder
        .findOne({
          _id:
            purchaseOrderId,

          companyId
        })
        .select(
          "_id"
        )
        .lean();


    if (
      !purchaseOrder
    ) {

      throw new ApiError(
        404,
        "Purchase Order was not found."
      );
    }


    return this
      .goodsReceiptRepo
      .findByPurchaseOrder(
        companyId,
        purchaseOrderId
      );
  }


  /* ==========================================================
     STATUS COUNTS
  ========================================================== */

  async statusCounts(
    companyId
  ) {

    return this
      .goodsReceiptRepo
      .countByStatus(
        companyId
      );
  }


  /* ==========================================================
     RECEIPT SUMMARY FOR PO
  ========================================================== */

  async purchaseOrderReceiptSummary(
    companyId,
    purchaseOrderId
  ) {

    const purchaseOrder =
      await this
        .purchaseOrderRepo
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


    const aggregates =
      await this
        .goodsReceiptRepo
        .aggregateReceivedByPurchaseOrder(
          companyId,
          purchaseOrderId
        );


    const aggregateMap =
      new Map();


    for (
      const row
      of aggregates
    ) {

      aggregateMap.set(
        idString(
          row.purchaseOrderItemId
        ),
        row
      );
    }


    const items =
      purchaseOrder.items.map(
        (
          item
        ) => {

          const aggregate =
            aggregateMap.get(
              idString(
                item._id
              )
            ) || {
              receivedQuantity:
                0,

              acceptedQuantity:
                0,

              rejectedQuantity:
                0
            };


          const orderedQuantity =
            roundQuantity(
              item.orderedQuantity
            );


          const receivedQuantity =
            roundQuantity(
              aggregate.receivedQuantity
            );


          return {

            purchaseOrderItemId:
              item._id,

            itemId:
              item.itemId ||
              null,

            itemName:
              clean(
                item.itemName
              ),

            unit:
              clean(
                item.unit
              ),

            orderedQuantity,

            receivedQuantity,

            acceptedQuantity:
              roundQuantity(
                aggregate.acceptedQuantity
              ),

            rejectedQuantity:
              roundQuantity(
                aggregate.rejectedQuantity
              ),

            remainingQuantity:
              roundQuantity(
                orderedQuantity -
                receivedQuantity
              )

          };
        }
      );


    const grnCount =
      await this
        .goodsReceiptRepo
        .countForPurchaseOrder(
          companyId,
          purchaseOrderId
        );


    return {

      purchaseOrderId:
        purchaseOrder._id,

      poNumber:
        purchaseOrder.poNumber,

      status:
        purchaseOrder.status,

      vendorId:
        purchaseOrder.vendorId,

      vendorName:
        purchaseOrder.vendorName,

      warehouseId:
        purchaseOrder.warehouseId ||
        null,

      warehouseName:
        purchaseOrder.warehouseName ||
        "",

      grnCount,

      items

    };
  }

}


const goodsReceiptService =
  new GoodsReceiptService();


export {
  GoodsReceiptService
};


export default goodsReceiptService;