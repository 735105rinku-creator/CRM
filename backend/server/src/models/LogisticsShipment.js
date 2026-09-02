import mongoose from "mongoose";

/* ============================================================
   SUB SCHEMAS
============================================================ */

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },

    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    state: {
      type: String,
      trim: true,
      default: "",
    },

    country: {
      type: String,
      trim: true,
      default: "",
    },

    pincode: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  }
);


const otherValueSchema = new mongoose.Schema(
  {
    value: {
      type: String,
      trim: true,
      default: "",
    },

    otherValue: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  }
);


const cargoSchema = new mongoose.Schema(
  {
    commodity: {
      type: String,
      trim: true,
      default: "",
    },

    commodityOther: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    packageCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    packageType: {
      type: String,
      trim: true,
      default: "",
    },

    packageTypeOther: {
      type: String,
      trim: true,
      default: "",
    },

    grossWeight: {
      type: Number,
      min: 0,
      default: 0,
    },

    netWeight: {
      type: Number,
      min: 0,
      default: 0,
    },

    weightUnit: {
      type: String,
      enum: [
        "kg",
        "mt",
        "ton",
        "lb",
        "other",
      ],
      default: "kg",
    },

    weightUnitOther: {
      type: String,
      trim: true,
      default: "",
    },

    volume: {
      type: Number,
      min: 0,
      default: 0,
    },

    volumeUnit: {
      type: String,
      enum: [
        "cbm",
        "cft",
        "other",
      ],
      default: "cbm",
    },

    volumeUnitOther: {
      type: String,
      trim: true,
      default: "",
    },

    chargeableWeight: {
      type: Number,
      min: 0,
      default: 0,
    },

    hazardous: {
      type: Boolean,
      default: false,
    },

    temperatureControlled: {
      type: Boolean,
      default: false,
    },

    minTemperature: {
      type: Number,
      default: null,
    },

    maxTemperature: {
      type: Number,
      default: null,
    },
  },
  {
    _id: false,
  }
);


const airFreightSchema =
  new mongoose.Schema(
    {
      airline: {
        type: String,
        trim: true,
        default: "",
      },

      airlineOther: {
        type: String,
        trim: true,
        default: "",
      },

      awbNumber: {
        type: String,
        trim: true,
        uppercase: true,
        default: "",
      },

      masterAwbNumber: {
        type: String,
        trim: true,
        uppercase: true,
        default: "",
      },

      houseAwbNumber: {
        type: String,
        trim: true,
        uppercase: true,
        default: "",
      },

      flightNumber: {
        type: String,
        trim: true,
        uppercase: true,
        default: "",
      },

      departureAirport: {
        type: String,
        trim: true,
        default: "",
      },

      departureAirportOther: {
        type: String,
        trim: true,
        default: "",
      },

      arrivalAirport: {
        type: String,
        trim: true,
        default: "",
      },

      arrivalAirportOther: {
        type: String,
        trim: true,
        default: "",
      },

      departureDate: {
        type: Date,
        default: null,
      },

      arrivalDate: {
        type: Date,
        default: null,
      },
    },
    {
      _id: false,
    }
  );


const seaFreightSchema =
  new mongoose.Schema(
    {
      shipmentType: {
        type: String,
        enum: [
          "fcl",
          "lcl",
          "break-bulk",
          "ro-ro",
          "other",
          "",
        ],
        default: "",
      },

      shipmentTypeOther: {
        type: String,
        trim: true,
        default: "",
      },

      containerType: {
        type: String,
        trim: true,
        default: "",
      },

      containerTypeOther: {
        type: String,
        trim: true,
        default: "",
      },

      containerCount: {
        type: Number,
        min: 0,
        default: 0,
      },

      containerNumber: {
        type: String,
        trim: true,
        uppercase: true,
        default: "",
      },

      sealNumber: {
        type: String,
        trim: true,
        uppercase: true,
        default: "",
      },

      shippingLine: {
        type: String,
        trim: true,
        default: "",
      },

      shippingLineOther: {
        type: String,
        trim: true,
        default: "",
      },

      vesselName: {
        type: String,
        trim: true,
        default: "",
      },

      voyageNumber: {
        type: String,
        trim: true,
        uppercase: true,
        default: "",
      },

      bookingNumber: {
        type: String,
        trim: true,
        uppercase: true,
        default: "",
      },

      billOfLading: {
        type: String,
        trim: true,
        uppercase: true,
        default: "",
      },

      originPort: {
        type: String,
        trim: true,
        default: "",
      },

      originPortOther: {
        type: String,
        trim: true,
        default: "",
      },

      destinationPort: {
        type: String,
        trim: true,
        default: "",
      },

      destinationPortOther: {
        type: String,
        trim: true,
        default: "",
      },

      etd: {
        type: Date,
        default: null,
      },

      eta: {
        type: Date,
        default: null,
      },
    },
    {
      _id: false,
    }
  );


const customsSchema =
  new mongoose.Schema(
    {
      chaRequired: {
        type: Boolean,
        default: false,
      },

      chaVendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LogisticsVendor",
        default: null,
      },

      customsLocation: {
        type: String,
        trim: true,
        default: "",
      },

      customsLocationOther: {
        type: String,
        trim: true,
        default: "",
      },

      shippingBillNumber: {
        type: String,
        trim: true,
        uppercase: true,
        default: "",
      },

      shippingBillDate: {
        type: Date,
        default: null,
      },

      billOfEntryNumber: {
        type: String,
        trim: true,
        uppercase: true,
        default: "",
      },

      billOfEntryDate: {
        type: Date,
        default: null,
      },

      status: {
        type: String,
        enum: [
          "not_required",
          "documents_pending",
          "filed",
          "assessment",
          "examination",
          "duty_pending",
          "cleared",
          "hold",
          "other",
        ],
        default: "not_required",
      },

      statusOther: {
        type: String,
        trim: true,
        default: "",
      },
    },
    {
      _id: false,
    }
  );


const transportSchema =
  new mongoose.Schema(
    {
      required: {
        type: Boolean,
        default: false,
      },

      transporterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LogisticsTransporter",
        default: null,
      },

      driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LogisticsTransporter",
        default: null,
      },

      vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LogisticsTransporter",
        default: null,
      },

      pickupDate: {
        type: Date,
        default: null,
      },

      expectedDeliveryDate: {
        type: Date,
        default: null,
      },
    },
    {
      _id: false,
    }
  );


const warehouseSchema =
  new mongoose.Schema(
    {
      required: {
        type: Boolean,
        default: false,
      },

      warehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LogisticsWarehouse",
        default: null,
      },

      warehouseReceiptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LogisticsWarehouse",
        default: null,
      },

      entryDate: {
        type: Date,
        default: null,
      },

      exitDate: {
        type: Date,
        default: null,
      },
    },
    {
      _id: false,
    }
  );


const chargeSchema =
  new mongoose.Schema(
    {
      freightAmount: {
        type: Number,
        min: 0,
        default: 0,
      },

      chaCharge: {
        type: Number,
        min: 0,
        default: 0,
      },

      documentationCharge: {
        type: Number,
        min: 0,
        default: 0,
      },

      transportationCharge: {
        type: Number,
        min: 0,
        default: 0,
      },

      warehouseCharge: {
        type: Number,
        min: 0,
        default: 0,
      },

      handlingCharge: {
        type: Number,
        min: 0,
        default: 0,
      },

      insuranceCharge: {
        type: Number,
        min: 0,
        default: 0,
      },

      otherCharge: {
        type: Number,
        min: 0,
        default: 0,
      },

      otherChargeDescription: {
        type: String,
        trim: true,
        default: "",
      },

      currency: {
        type: String,
        trim: true,
        uppercase: true,
        default: "INR",
      },

      totalAmount: {
        type: Number,
        min: 0,
        default: 0,
      },
    },
    {
      _id: false,
    }
  );


const statusHistorySchema =
  new mongoose.Schema(
    {
      status: {
        type: String,
        required: true,
      },

      location: {
        type: String,
        trim: true,
        default: "",
      },

      remarks: {
        type: String,
        trim: true,
        default: "",
      },

      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      changedAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      _id: false,
    }
  );


/* ============================================================
   MAIN SCHEMA
============================================================ */

const logisticsShipmentSchema =
  new mongoose.Schema(
    {
      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true,
      },

      branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        default: null,
        index: true,
      },

      shipmentNumber: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        maxlength: 50,
      },

      shipmentMode: {
        type: String,
        required: true,
        enum: [
          "air_cargo",
          "sea_freight",
          "road",
          "other",
        ],
        index: true,
      },

      shipmentModeOther: {
        type: String,
        trim: true,
        default: "",
      },

      customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LogisticsCustomer",
        default: null,
        index: true,
      },

      customerName: {
        type: String,
        trim: true,
        required: true,
      },

      contactPerson: {
        type: String,
        trim: true,
        default: "",
      },

      mobile: {
        type: String,
        trim: true,
        default: "",
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: "",
      },

      customerReference: {
        type: String,
        trim: true,
        default: "",
      },

      origin: {
        type: locationSchema,
        default: () => ({}),
      },

      destination: {
        type: locationSchema,
        default: () => ({}),
      },

      cargo: {
        type: cargoSchema,
        default: () => ({}),
      },

      airFreight: {
        type: airFreightSchema,
        default: () => ({}),
      },

      seaFreight: {
        type: seaFreightSchema,
        default: () => ({}),
      },

      customs: {
        type: customsSchema,
        default: () => ({}),
      },

      transport: {
        type: transportSchema,
        default: () => ({}),
      },

      warehouse: {
        type: warehouseSchema,
        default: () => ({}),
      },

      charges: {
        type: chargeSchema,
        default: () => ({}),
      },

      currentLocation: {
        type: String,
        trim: true,
        default: "",
      },

      trackingReference: {
        type: String,
        trim: true,
        default: "",
      },

      estimatedDeparture: {
        type: Date,
        default: null,
      },

      estimatedArrival: {
        type: Date,
        default: null,
      },

      actualDeparture: {
        type: Date,
        default: null,
      },

      actualArrival: {
        type: Date,
        default: null,
      },

      status: {
        type: String,

        enum: [
          "draft",
          "booking_created",
          "container_pending",
          "pickup_pending",
          "stuffing",
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
          "other",
        ],

        default: "draft",

        index: true,
      },

      statusOther: {
        type: String,
        trim: true,
        default: "",
      },

      statusHistory: {
        type: [statusHistorySchema],
        default: [],
      },

      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        default: null,
        index: true,
      },

      createdByEmployeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        default: null,
      },

      isActive: {
        type: Boolean,
        default: true,
        index: true,
      },

      /**
       * IMPORTANT:
       * As requested by Logistics Manager,
       * Remarks remains compulsory in the data model.
       */
      remarks: {
        type: String,
        trim: true,
        required: true,
        minlength: 2,
        maxlength: 3000,
      },

      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );


/* ============================================================
   INDEXES
============================================================ */

logisticsShipmentSchema.index(
  {
    companyId: 1,
    shipmentNumber: 1,
  },
  {
    unique: true,
  }
);

logisticsShipmentSchema.index({
  companyId: 1,
  shipmentMode: 1,
  status: 1,
});

logisticsShipmentSchema.index({
  companyId: 1,
  customerId: 1,
  createdAt: -1,
});

logisticsShipmentSchema.index({
  companyId: 1,
  assignedTo: 1,
  status: 1,
});

logisticsShipmentSchema.index({
  companyId: 1,
  createdAt: -1,
});


/* ============================================================
   PRE VALIDATE
============================================================ */

logisticsShipmentSchema.pre(
  "validate",
  function () {

    /*
     * Validate Other values.
     */

    if (
      this.shipmentMode === "other" &&
      !String(
        this.shipmentModeOther || ""
      ).trim()
    ) {
      this.invalidate(
        "shipmentModeOther",
        "Shipment mode is required when Other is selected"
      );
    }


    /*
     * Air-specific requirement.
     */
    if (
      this.shipmentMode ===
      "air_cargo"
    ) {

      if (
        this.airFreight?.airline ===
          "other" &&
        !String(
          this.airFreight
            ?.airlineOther || ""
        ).trim()
      ) {

        this.invalidate(
          "airFreight.airlineOther",
          "Airline name is required when Other is selected"
        );
      }
    }


    /*
     * Sea-specific requirements.
     */
    if (
      this.shipmentMode ===
      "sea_freight"
    ) {

      if (
        this.seaFreight
          ?.shipmentType ===
          "other" &&
        !String(
          this.seaFreight
            ?.shipmentTypeOther || ""
        ).trim()
      ) {

        this.invalidate(
          "seaFreight.shipmentTypeOther",
          "Sea shipment type is required when Other is selected"
        );
      }

      if (
        this.seaFreight
          ?.shippingLine ===
          "other" &&
        !String(
          this.seaFreight
            ?.shippingLineOther || ""
        ).trim()
      ) {

        this.invalidate(
          "seaFreight.shippingLineOther",
          "Shipping line is required when Other is selected"
        );
      }
    }


    /*
     * Status Other.
     */
    if (
      this.status === "other" &&
      !String(
        this.statusOther || ""
      ).trim()
    ) {

      this.invalidate(
        "statusOther",
        "Status description is required when Other is selected"
      );
    }


    /*
     * Automatically maintain total charges.
     */
    if (this.charges) {

      this.charges.totalAmount =
        Number(
          this.charges
            .freightAmount || 0
        ) +
        Number(
          this.charges
            .chaCharge || 0
        ) +
        Number(
          this.charges
            .documentationCharge || 0
        ) +
        Number(
          this.charges
            .transportationCharge || 0
        ) +
        Number(
          this.charges
            .warehouseCharge || 0
        ) +
        Number(
          this.charges
            .handlingCharge || 0
        ) +
        Number(
          this.charges
            .insuranceCharge || 0
        ) +
        Number(
          this.charges
            .otherCharge || 0
        );
    }

  }
);


/* ============================================================
   EXPORT
============================================================ */

export const LogisticsShipment =
  mongoose.model(
    "LogisticsShipment",
    logisticsShipmentSchema
  );

export default LogisticsShipment;

