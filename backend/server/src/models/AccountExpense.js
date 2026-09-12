import mongoose from "mongoose";


const accountExpenseAttachmentSchema =
  new mongoose.Schema(
    {
      originalName: {
        type: String,
        trim: true,
        required: true,
      },

      storedName: {
        type: String,
        trim: true,
        required: true,
      },

      fileUrl: {
        type: String,
        trim: true,
        required: true,
      },

      storageKey: {
        type: String,
        trim: true,
        required: true,
      },

      mimeType: {
        type: String,
        trim: true,
        required: true,
      },

      fileSize: {
        type: Number,
        required: true,
        min: 0,
      },

      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      _id: true,
      id: false,
      versionKey: false,
    }
  );


const accountExpenseSchema =
  new mongoose.Schema(
    {
      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true,
      },

      title: {
        type: String,
        trim: true,
        required: true,
      },

      category: {
        type: String,
        trim: true,
        default: "General",
      },

      expenseType: {
        type: String,
        trim: true,
        default: "Operations",
      },

      businessCategory: {
        type: String,
        trim: true,
        default: "General",
      },

      routeType: {
        type: String,
        trim: true,
        default: "Domestic",
      },

      amount: {
        type: Number,
        default: 0,
      },

      expenseDate: {
        type: Date,
        default: null,
      },

      status: {
        type: String,
        trim: true,
        default: "Pending",
      },

      notes: {
        type: String,
        trim: true,
        default: "",
      },

      attachments: {
        type: [accountExpenseAttachmentSchema],
        default: [],
      },

      assignedUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true,
      },

      assignedEmployeeCode: {
        type: String,
        trim: true,
        uppercase: true,
        default: "",
        index: true,
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


accountExpenseSchema.index({
  companyId: 1,
  createdAt: -1,
});


export const AccountExpense =
  mongoose.model(
    "AccountExpense",
    accountExpenseSchema
  );
