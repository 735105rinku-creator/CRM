import mongoose from "mongoose";

import {
  WAREHOUSE_ITEM_UNITS,
} from "./WarehouseItem.js";

export const WAREHOUSE_OUTGOING_DESTINATION_TYPES =
  Object.freeze([
    "customer",
    "export_shipment",
    "distributor",
    "other_warehouse",
    "other",
  ]);

export const WAREHOUSE_OUTGOING_STATUSES =
  Object.freeze([
    "preparing",
    "dispatched",
    "delivered",
    "cancelled",
  ]);

const warehouseOutgoingSchema =
  new mongoose.Schema(
    {
      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true,
      },

      warehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
        index: true,
      },

      shipmentNumber: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        maxlength: 60,
      },

      destinationType: {
        type: String,
        enum:
          WAREHOUSE_OUTGOING_DESTINATION_TYPES,
        default: "customer",
        index: true,
      },

      destinationTypeOther: {
        type: String,
        trim: true,
        default: "",
      },

      destinationWarehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
        default: null,
      },

      customerName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 200,
        index: true,
      },

      productName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 200,
        index: true,
      },

      sku: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        maxlength: 60,
      },

      itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WarehouseItem",
        default: null,
        index: true,
      },

      quantity: {
        type: Number,
        required: true,
        min: 0,
      },

      unit: {
        type: String,
        trim: true,
        lowercase: true,
        enum: WAREHOUSE_ITEM_UNITS,
        default: "unit",
      },

      dispatchDate: {
        type: Date,
        default: Date.now,
      },

      destination: {
        type: String,
        trim: true,
        default: "",
      },

      remarks: {
        type: String,
        trim: true,
        default: "",
        maxlength: 3000,
      },

      status: {
        type: String,
        enum:
          WAREHOUSE_OUTGOING_STATUSES,
        default: "preparing",
        index: true,
      },

      dispatchedAt: {
        type: Date,
        default: null,
      },

      deliveredAt: {
        type: Date,
        default: null,
      },

      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      createdByEmployeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        default: null,
      },

      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      isActive: {
        type: Boolean,
        default: true,
        index: true,
      },
    },
    { timestamps: true }
  );

warehouseOutgoingSchema.index(
  { companyId: 1, shipmentNumber: 1 },
  { unique: true }
);

warehouseOutgoingSchema.index({
  companyId: 1,
  warehouseId: 1,
  status: 1,
  isActive: 1,
});

warehouseOutgoingSchema.index({
  companyId: 1,
  status: 1,
  isActive: 1,
});

warehouseOutgoingSchema.index({
  companyId: 1,
  sku: 1,
  isActive: 1,
});

warehouseOutgoingSchema.pre(
  "validate",
  function () {
    if (
      this.destinationType === "other" &&
      !String(
        this.destinationTypeOther || ""
      ).trim()
    ) {
      this.invalidate(
        "destinationTypeOther",
        "Destination type is required when Other is selected"
      );
    }
  }
);

export const WarehouseOutgoing =
  mongoose.model(
    "WarehouseOutgoing",
    warehouseOutgoingSchema
  );

export default WarehouseOutgoing;