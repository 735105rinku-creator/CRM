import mongoose from "mongoose";

const employeeDailyTaskSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    employeeUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    employeeCode: { type: String, trim: true, uppercase: true, default: "", index: true },
    workDate: { type: Date, required: true, index: true },
    title: { type: String, trim: true, required: true, maxlength: 160 },
    description: { type: String, trim: true, default: "", maxlength: 2000 },
    category: { type: String, trim: true, default: "CRM" },
    status: { type: String, enum: ["planned", "in_progress", "completed", "blocked"], default: "completed", index: true },
    hoursSpent: { type: Number, min: 0, max: 24, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

employeeDailyTaskSchema.index({ companyId: 1, employeeCode: 1, workDate: -1 });
employeeDailyTaskSchema.index({ companyId: 1, workDate: -1 });

export const EmployeeDailyTask = mongoose.model("EmployeeDailyTask", employeeDailyTaskSchema);
