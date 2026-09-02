import mongoose from "mongoose";

const platformSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    appName: { type: String, trim: true, default: "Opas Bizz CRM" },
    companyName: { type: String, trim: true, default: "Opas Bizz Pvt. Ltd." },
    supportEmail: { type: String, trim: true, lowercase: true, default: "support@opasbizz.com" },
    supportPhone: { type: String, trim: true, default: "" },
    defaultTimezone: { type: String, trim: true, default: "Asia/Kolkata" },
    maintenanceMode: { type: Boolean, default: false },
    registrationEnabled: { type: Boolean, default: true },
    security: {
      passwordMinLength: { type: Number, min: 8, max: 64, default: 8 },
      requireStrongPassword: { type: Boolean, default: true },
      sessionTimeoutMinutes: { type: Number, min: 5, max: 1440, default: 60 },
      maxLoginAttempts: { type: Number, min: 3, max: 20, default: 5 },
      enforceTwoFactor: { type: Boolean, default: false },
      lockoutMinutes: { type: Number, min: 5, max: 1440, default: 30 },
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export const PlatformSetting = mongoose.model("PlatformSetting", platformSettingSchema);
