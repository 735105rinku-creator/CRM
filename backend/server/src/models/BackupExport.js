import mongoose from "mongoose";

const backupExportSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["full", "companies", "users", "billing", "audit"], default: "full", index: true },
    format: { type: String, enum: ["json", "csv"], default: "json" },
    status: { type: String, enum: ["ready", "processing", "failed"], default: "ready", index: true },
    fileName: { type: String, trim: true, default: "" },
    recordCount: { type: Number, default: 0 },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

export const BackupExport = mongoose.model("BackupExport", backupExportSchema);
