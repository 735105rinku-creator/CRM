import mongoose from "mongoose";

const familyMemberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    relation: {
      type: String,
      required: true,
      enum: [
        "father",
        "mother",
        "spouse",
        "son",
        "daughter",
        "brother",
        "sister",
        "guardian",
        "other",
      ],
    },

    dateOfBirth: {
      type: Date,
      default: null,
    },

    mobile: {
      type: String,
      trim: true,
      default: "",
    },

    occupation: {
      type: String,
      trim: true,
      default: "",
    },

    isDependent: {
      type: Boolean,
      default: false,
    },

    isNominee: {
      type: Boolean,
      default: false,
    },

    nomineePercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  { _id: true }
);

const employeeFamilySchema = new mongoose.Schema(
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

    members: {
      type: [familyMemberSchema],
      default: [],
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

employeeFamilySchema.index({ companyId: 1, employeeId: 1 }, { unique: true });

export const EmployeeFamily = mongoose.model(
  "EmployeeFamily",
  employeeFamilySchema
);