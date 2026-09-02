import mongoose from "mongoose";

const knowledgeBaseArticleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  slug: { type: String, required: true, lowercase: true, trim: true, unique: true },
  category: { type: String, trim: true, default: "General", index: true },
  question: { type: String, trim: true, default: "", maxlength: 500 },
  answer: { type: String, required: true, trim: true, maxlength: 10000 },
  tags: { type: [String], default: [] },
  isPublished: { type: Boolean, default: true, index: true },
  sortOrder: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

knowledgeBaseArticleSchema.index({ isPublished: 1, sortOrder: 1 });
export const KnowledgeBaseArticle = mongoose.model("KnowledgeBaseArticle", knowledgeBaseArticleSchema);
