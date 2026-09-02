import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      enum: [
        "resume",
        "aadhaar",
        "pan",
        "passport",
        "driving_license",
        "offer_letter",
        "appointment_letter",
        "joining_letter",
        "experience_letter",
        "education_certificate",
        "salary_revision",
        "warning_letter",
        "other",
      ],
      required: true,
    },

    fileName: String,

    fileUrl: String,

    fileSize: Number,

    mimeType: String,

    expiryDate: Date,

    verified: {
      type: Boolean,
      default: false,
    },

    remarks: String,
  },
  { timestamps: true }
);

const employeeDocumentSchema = new mongoose.Schema(
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
      index: true,
    },

    documents: [documentSchema],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const EmployeeDocument = mongoose.model(
  "EmployeeDocument",
  employeeDocumentSchema
);