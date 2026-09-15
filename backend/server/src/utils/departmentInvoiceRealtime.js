import { emitNotificationToUser, emitToCompany } from "../socket/socket.js";
import { Notification, NOTIFICATION_PRIORITY, NOTIFICATION_TYPE } from "../models/Notification.js";
import { User } from "../models/User.js";
import { Employee } from "../models/Employee.js";
import { ROLES } from "../constants/roles.js";

export const DEPARTMENT_INVOICE_UPDATED_EVENT = "department-invoice:updated";

const scalar = value => value?._id || value || null;

export const buildDepartmentInvoiceEvent = (row, action) => ({
  departmentInvoiceId: String(scalar(row?._id) || ""),
  sourceDepartment: row?.sourceDepartment || "",
  sourceModule: row?.sourceModule || "",
  sourceRecordId: String(scalar(row?.sourceRecordId) || ""),
  invoiceNumber: row?.invoiceNumber || "",
  status: row?.status || "",
  paidAmount: Number(row?.paidAmount || 0),
  remainingAmount: Number(row?.remainingAmount || 0),
  companyAdminApprovalStatus: row?.companyAdminApprovalStatus || "not_submitted",
  updatedAt: row?.updatedAt || new Date().toISOString(),
  action,
});

export const emitDepartmentInvoiceUpdated = (row, action) => {
  const companyId = scalar(row?.companyId);
  if (!companyId || !row?._id) return;
  emitToCompany(
    String(companyId),
    DEPARTMENT_INVOICE_UPDATED_EVENT,
    buildDepartmentInvoiceEvent(row, action)
  );
  void persistWorkflowNotifications(row, action);
};

const money = value => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
}).format(Number(value || 0));

const notificationCopy = (row, action) => {
  if (action === "handed_off") return [`New ${row.sourceDepartment === "purchase" ? "Purchase" : "Logistics"} invoice received`, `${row.invoiceNumber} was received from ${row.sourceDepartment}.`];
  if (action === "verified") return ["Invoice requires approval", `${row.invoiceNumber} was verified by Accounts and requires your approval.`];
  if (action === "admin_approved") return ["Invoice approved", `Company Admin approved ${row.invoiceNumber}. Payment can now be processed.`];
  if (action === "admin_rejected") return ["Invoice rejected", `Company Admin rejected ${row.invoiceNumber}.`];
  if (["paid", "partially_paid", "payment_posted", "payment_voided"].includes(action)) return [
    action === "payment_voided" ? "Invoice payment reversed" : "Invoice payment updated",
    `${row.invoiceNumber} is ${String(row.status || "updated").replaceAll("_", " ")}. Paid ${money(row.paidAmount)}; remaining ${money(row.remainingAmount)}.`,
  ];
  return null;
};

const accountUserIds = async companyId => {
  const employees = await Employee.find({ companyId, userId: { $ne: null } })
    .populate("departmentId", "departmentName departmentCode")
    .select("userId departmentId")
    .lean();
  return employees
    .filter(row => /accounts?|finance/i.test(`${row.departmentId?.departmentName || ""} ${row.departmentId?.departmentCode || ""}`))
    .map(row => row.userId);
};

const persistWorkflowNotifications = async (row, action) => {
  try {
    const copy = notificationCopy(row, action);
    if (!copy || !row?.companyId) return;
    let recipientIds = [];
    if (action === "verified") {
      const admins = await User.find({ companyId: row.companyId, role: ROLES.COMPANY_ADMIN }).select("_id").lean();
      recipientIds = admins.map(user => user._id);
    } else if (["handed_off", "admin_approved", "admin_rejected"].includes(action)) {
      recipientIds = await accountUserIds(row.companyId);
    } else if (row.sentToAccountsBy) {
      recipientIds = [row.sentToAccountsBy];
    }
    recipientIds = [...new Map(recipientIds.filter(Boolean).map(id => [String(id), id])).values()];
    for (const recipientUserId of recipientIds) {
      const existing = await Notification.findOne({
        companyId: row.companyId,
        recipientUserId,
        entityType: "DepartmentInvoice",
        entityId: row._id,
        title: copy[0],
        message: copy[1],
      }).select("_id").lean();
      if (existing) continue;
      const notification = await Notification.create({
        companyId: row.companyId,
        recipientUserId,
        senderUserId: null,
        type: NOTIFICATION_TYPE.SYSTEM,
        title: copy[0],
        message: copy[1],
        priority: action === "admin_rejected" ? NOTIFICATION_PRIORITY.HIGH : NOTIFICATION_PRIORITY.NORMAL,
        entityType: "DepartmentInvoice",
        entityId: row._id,
        actionUrl: action === "verified" ? "/dashboard?section=invoice-approvals" : "/accounts/department-invoices",
      });
      emitNotificationToUser(String(recipientUserId), notification.toObject());
    }
  } catch (error) {
    console.error("Unable to create invoice workflow notification:", error?.message || error);
  }
};
