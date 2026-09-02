import mongoose from "mongoose";

export const ANNOUNCEMENT_AUDIENCE = Object.freeze({ ALL: "all", COMPANIES: "companies", ADMINS: "admins", USERS: "users" });

const platformAnnouncementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  message: { type: String, required: true, trim: true, maxlength: 5000 },
  audience: { type: String, enum: Object.values(ANNOUNCEMENT_AUDIENCE), default: ANNOUNCEMENT_AUDIENCE.ALL, index: true },
  priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal", index: true },
  actionUrl: { type: String, trim: true, default: "" },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  isPublished: { type: Boolean, default: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

platformAnnouncementSchema.index({ isPublished: 1, startsAt: 1, endsAt: 1 });
export const PlatformAnnouncement = mongoose.model("PlatformAnnouncement", platformAnnouncementSchema);
