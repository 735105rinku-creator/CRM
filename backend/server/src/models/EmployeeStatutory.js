import mongoose from "mongoose";

const employeeStatutorySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      unique: true,
      index: true,
    },

    panNumber: {
      type: String,
      uppercase: true,
      trim: true,
      default: "",
    },

    aadhaarNumber: {
      type: String,
      trim: true,
      default: "",
    },

    uanNumber: {
      type: String,
      trim: true,
      default: "",
    },

    pfNumber: {
      type: String,
      trim: true,
      default: "",
    },

    esiNumber: {
      type: String,
      trim: true,
      default: "",
    },

    professionalTaxNumber: {
      type: String,
      trim: true,
      default: "",
    },

    labourWelfareNumber: {
      type: String,
      trim: true,
      default: "",
    },

    passportNumber: {
      type: String,
      uppercase: true,
      trim: true,
      default: "",
    },

    passportExpiryDate: {
      type: Date,
      default: null,
    },

    drivingLicenseNumber: {
      type: String,
      uppercase: true,
      trim: true,
      default: "",
    },

    drivingLicenseExpiryDate: {
      type: Date,
      default: null,
    },

    isPfApplicable: {
      type: Boolean,
      default: false,
    },

    isEsiApplicable: {
      type: Boolean,
      default: false,
    },

    isTdsApplicable: {
      type: Boolean,
      default: false,
    },

    isProfessionalTaxApplicable: {
      type: Boolean,
      default: false,
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
  { timestamps: true }
);

employeeStatutorySchema.index(
  { companyId: 1, employeeId: 1 },
  { unique: true }
);

export const EmployeeStatutory = mongoose.model(
  "EmployeeStatutory",
  employeeStatutorySchema
);