import mongoose from "mongoose";
import logisticsVendorRepository from "../repositories/logisticsVendor.repository.js";
import { ApiError } from "../utils/apiError.js";

class LogisticsVendorService {
  async createVendor({ companyId, userId = null, employeeId = null, payload }) {
    this.assertCompanyId(companyId);
    const vendorCode = await this.generateVendorCode({ companyId });

    return logisticsVendorRepository.create({
      companyId, vendorCode,
      vendorType: payload.vendorType || "supplier",
      vendorTypeOther: payload.vendorType === "other" ? payload.vendorTypeOther || "" : "",
      vendorName: payload.vendorName,
      companyName: payload.companyName || payload.vendorName,
      contactPerson: payload.contactPerson,
      mobile: payload.mobile,
      alternateMobile: payload.alternateMobile || "",
      email: payload.email || "",
      gstType: payload.gstType || "registered",
      gstTypeOther: payload.gstType === "other" ? payload.gstTypeOther || "" : "",
      gstNumber: payload.gstNumber || "",
      panNumber: payload.panNumber || "",
      iecNumber: payload.iecNumber || "",
      address: normalizeAddress(payload.address),
      serviceCategory: normalizeCategory(payload.serviceCategory || "goods"),
      serviceCategoryOther: payload.serviceCategory === "other" ? payload.serviceCategoryOther || "" : "",
      productsServices: normalizeArray(payload.productsServices),

      paymentTerms: payload.paymentTerms,
      paymentTermsOther: payload.paymentTerms === "other" ? payload.paymentTermsOther || "" : "",
      creditDays: Number(payload.creditDays || 0),
      openingPayable: Number(payload.openingPayable || 0),
      currency: String(payload.currency || "INR").trim().toUpperCase(),
      preferredPaymentMode: normalizePaymentMode(payload.preferredPaymentMode),
      preferredPaymentModeOther:
        payload.preferredPaymentMode === "other" ? payload.preferredPaymentModeOther || "" : "",
      bankDetails: normalizeBank(payload.bankDetails),

      status: payload.status || "active",
      statusOther: payload.status === "other" ? payload.statusOther || "" : "",
      remarks: payload.remarks,
      createdBy: userId,
      createdByEmployeeId: employeeId,
      updatedBy: userId,
    });
  }

  async listVendors({ companyId, query }) {
    this.assertCompanyId(companyId);
    return logisticsVendorRepository.paginate({ companyId, ...query });
  }

  async getVendor({ companyId, vendorId }) {
    this.assertCompanyId(companyId);
    this.assertObjectId(vendorId, "Invalid vendor ID");
    const vendor = await logisticsVendorRepository.findById({ companyId, vendorId });
    if (!vendor) throw new ApiError(404, "Logistics vendor not found");
    return vendor;
  }

  async updateVendor({ companyId, vendorId, userId = null, payload }) {
    await this.getVendor({ companyId, vendorId });
    const update = { ...payload, updatedBy: userId };

    if (Object.prototype.hasOwnProperty.call(update, "serviceCategory")) {
      update.serviceCategory = normalizeCategory(update.serviceCategory);
      if (update.serviceCategory !== "other") update.serviceCategoryOther = "";
    }
    if (Object.prototype.hasOwnProperty.call(update, "preferredPaymentMode")) {
      update.preferredPaymentMode = normalizePaymentMode(update.preferredPaymentMode);
      if (update.preferredPaymentMode !== "other") update.preferredPaymentModeOther = "";
    }

    clearOther(update, "vendorType", "vendorTypeOther");
    clearOther(update, "gstType", "gstTypeOther");
    clearOther(update, "paymentTerms", "paymentTermsOther");
    clearOther(update, "status", "statusOther");

    if (Object.prototype.hasOwnProperty.call(update, "address")) update.address = normalizeAddress(update.address);
    if (Object.prototype.hasOwnProperty.call(update, "bankDetails")) update.bankDetails = normalizeBank(update.bankDetails);
    if (Array.isArray(update.productsServices)) update.productsServices = normalizeArray(update.productsServices);

    const vendor = await logisticsVendorRepository.updateById({ companyId, vendorId, payload: update });
    if (!vendor) throw new ApiError(404, "Logistics vendor not found");
    return vendor;
  }

  async deleteVendor({ companyId, vendorId, userId = null }) {
    const current = await this.getVendor({ companyId, vendorId });
    await logisticsVendorRepository.softDelete({ companyId, vendorId, userId });
    return { vendorId: current._id, vendorCode: current.vendorCode, deleted: true };
  }

  async getSummary({ companyId }) {
    this.assertCompanyId(companyId);
    const rows = await logisticsVendorRepository.summary(
      new mongoose.Types.ObjectId(String(companyId))
    );
    const summary = { total: 0, active: 0, inactive: 0, blocked: 0, other: 0, openingPayable: 0 };
    for (const row of rows) {
      const count = Number(row.count || 0);
      summary.total += count;
      summary.openingPayable += Number(row.openingPayable || 0);
      if (Object.prototype.hasOwnProperty.call(summary, row._id)) summary[row._id] = count;
    }
    return summary;
  }

  async generateVendorCode({ companyId }) {
    const now = new Date();
    const dateCode = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
    const latest = await logisticsVendorRepository.latestCode({ companyId, dateCode });
    let next = 1;
    if (latest?.vendorCode) {
      const last = Number(latest.vendorCode.split("-").pop());
      if (Number.isFinite(last)) next = last + 1;
    }
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const candidate = `VEN-${dateCode}-${String(next + attempt).padStart(4, "0")}`;
      const exists = await logisticsVendorRepository.codeExists({ companyId, vendorCode: candidate });
      if (!exists) return candidate;
    }
    throw new ApiError(500, "Unable to generate vendor code");
  }

  assertCompanyId(companyId) {
    if (!companyId || !mongoose.isValidObjectId(companyId)) throw new ApiError(400, "Invalid company ID");
  }
  assertObjectId(value, message) {
    if (!mongoose.isValidObjectId(value)) throw new ApiError(400, message);
  }
}

function normalizeAddress(v={}) {
  return { addressLine1:v.addressLine1||"", addressLine2:v.addressLine2||"", city:v.city||"",
    state:v.state||"", country:v.country||"India", pincode:v.pincode||"" };
}
function normalizeBank(v={}) {
  return { accountHolderName:v.accountHolderName||"", bankName:v.bankName||"", accountNumber:v.accountNumber||"",
    ifscCode:String(v.ifscCode||"").trim().toUpperCase(), branchName:v.branchName||"",
    swiftCode:String(v.swiftCode||"").trim().toUpperCase(), upiId:v.upiId||"" };
}
function normalizeArray(v) { return Array.isArray(v) ? v.map(x=>String(x||"").trim()).filter(Boolean) : []; }
function normalizeCategory(v) {
  return ({"air-cargo":"air_cargo","sea-freight":"sea_freight","road-transport":"road_transport",
    "customs-cha":"customs_cha","multi-service":"multi_service"})[v] || v;
}
function normalizePaymentMode(v) { return v === "bank-transfer" ? "bank_transfer" : v; }
function clearOther(obj, field, other) {
  if (Object.prototype.hasOwnProperty.call(obj, field) && obj[field] !== "other") obj[other] = "";
}

export const logisticsVendorService = new LogisticsVendorService();
export default logisticsVendorService;
