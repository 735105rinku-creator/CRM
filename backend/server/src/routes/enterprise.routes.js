import { Router } from "express";

import { Company } from "../models/Company.js";
import { CrmModuleSetting, CRM_SETTING_TYPES } from "../models/CrmModuleSetting.js";
import { Department } from "../models/Department.js";
import { Employee } from "../models/Employee.js";
import { LoginAudit } from "../models/LoginAudit.js";
import { AuthSession } from "../models/AuthSession.js";
import { Role, ROLE_LEVEL } from "../models/Role.js";
import { SubscriptionPayment } from "../models/SubscriptionPayment.js";
import { CrmLead } from "../models/CrmLead.js";
import { CrmDeal } from "../models/CrmDeal.js";
import { CrmTask } from "../models/CrmTask.js";
import { User } from "../models/User.js";
import { SupportTicket, SUPPORT_TICKET_PRIORITY, SUPPORT_TICKET_STATUS } from "../models/SupportTicket.js";
import { SupportCategory } from "../models/SupportCategory.js";
import { KnowledgeBaseArticle } from "../models/KnowledgeBaseArticle.js";
import { PlatformAnnouncement } from "../models/PlatformAnnouncement.js";
import { NotificationTemplate } from "../models/NotificationTemplate.js";
import { CommunicationGatewaySetting } from "../models/CommunicationGatewaySetting.js";
import { PlatformSetting } from "../models/PlatformSetting.js";
import { BackupExport } from "../models/BackupExport.js";
import { Notification, NOTIFICATION_TYPE, NOTIFICATION_PRIORITY } from "../models/Notification.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { checkHierarchyLevel, checkPermission, canManageTargetLevel } from "../middleware/checkPermission.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { COMPANY_STATUS, ROLE_PERMISSIONS, ROLES, SUBSCRIPTION_STATUS, USER_STATUS } from "../constants/roles.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { withLogisticsRolePermissions } from "../constants/logisticsPermissions.js";
import { ensureEmployeeLimit, ensureHrLimit } from "../services/subscriptionLimit.service.js";
import { countEmployees, withVisibleEmployeeFilter } from "../repositories/employee.repository.js";

const router = Router();

router.use(requireAuth);

const defaultDepartments = ["IT", "Sales", "HR", "Accounts", "Marketing", "Support", "Purchase", "Production", "Store"];

const companyStatusValues = Object.values(COMPANY_STATUS);
const subscriptionStatusValues = Object.values(SUBSCRIPTION_STATUS);
const permissionValues = Object.values(PERMISSIONS);
const roleLevelValues = Object.values(ROLE_LEVEL);
const platformRoleNames = Object.values(ROLES);
const crmSettingTypeValues = Object.values(CRM_SETTING_TYPES);


const defaultCrmSettings = [
  { type: CRM_SETTING_TYPES.LEAD_SOURCE, name: "Website", code: "website", description: "Leads captured from website forms.", color: "#2563eb", sortOrder: 1, isDefault: true },
  { type: CRM_SETTING_TYPES.LEAD_SOURCE, name: "Referral", code: "referral", description: "Leads referred by customers or partners.", color: "#16a34a", sortOrder: 2 },
  { type: CRM_SETTING_TYPES.LEAD_SOURCE, name: "Social Media", code: "social_media", description: "Leads from social channels and campaigns.", color: "#db2777", sortOrder: 3 },
  { type: CRM_SETTING_TYPES.PIPELINE_STAGE, name: "New", code: "new", description: "Fresh lead or deal created.", color: "#0284c7", sortOrder: 1, isDefault: true },
  { type: CRM_SETTING_TYPES.PIPELINE_STAGE, name: "Qualified", code: "qualified", description: "Lead qualification completed.", color: "#7c3aed", sortOrder: 2 },
  { type: CRM_SETTING_TYPES.PIPELINE_STAGE, name: "Proposal", code: "proposal", description: "Commercial proposal shared.", color: "#f59e0b", sortOrder: 3 },
  { type: CRM_SETTING_TYPES.PIPELINE_STAGE, name: "Won", code: "won", description: "Deal successfully closed.", color: "#16a34a", sortOrder: 4 },
  { type: CRM_SETTING_TYPES.MESSAGE_TEMPLATE, name: "Lead Welcome Email", code: "lead_welcome_email", description: "Default email sent to a new lead.", channel: "email", subject: "Thanks for contacting Opas Bizz", body: "Hello {{leadName}},\n\nThank you for contacting us. Our team will connect with you shortly.\n\nRegards,\nOpas Bizz Pvt. Ltd.", sortOrder: 1, isDefault: true },
  { type: CRM_SETTING_TYPES.MESSAGE_TEMPLATE, name: "Follow-up SMS", code: "follow_up_sms", description: "Short follow-up SMS for qualified leads.", channel: "sms", body: "Hi {{leadName}}, this is a quick follow-up from Opas Bizz. Please reply with a suitable time to connect.", sortOrder: 2 },
];

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const seedCrmModuleSettings = async () => {
  await Promise.all(
    defaultCrmSettings.map((item) =>
      CrmModuleSetting.findOneAndUpdate(
        { type: item.type, code: item.code },
        { $setOnInsert: item },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      )
    )
  );
};

const buildCrmSettingPayload = (body, userId, existingType = null) => {
  const type = String(body.type || existingType || "").trim();
  if (!crmSettingTypeValues.includes(type)) throw new ApiError(400, "Valid CRM setting type is required.");

  const name = String(body.name || "").trim();
  const code = slugify(body.code || name);
  if (!name) throw new ApiError(400, "Name is required.");
  if (!code) throw new ApiError(400, "Code is required.");

  const payload = {
    type,
    name,
    code,
    description: String(body.description || "").trim(),
    color: String(body.color || "#2563eb").trim(),
    sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
    isDefault: body.isDefault === true,
    isActive: body.isActive !== false,
    updatedBy: userId,
  };

  if (type === CRM_SETTING_TYPES.MESSAGE_TEMPLATE) {
    const channel = String(body.channel || "email").toLowerCase().trim();
    if (!["email", "sms", "both"].includes(channel)) throw new ApiError(400, "Template channel must be email, sms or both.");
    payload.channel = channel;
    payload.subject = String(body.subject || "").trim();
    payload.body = String(body.body || "").trim();
    if (["email", "both"].includes(channel) && !payload.subject) throw new ApiError(400, "Email subject is required.");
    if (!payload.body) throw new ApiError(400, "Template body is required.");
  } else {
    payload.channel = "none";
    payload.subject = "";
    payload.body = "";
  }

  return payload;
};
const permissionGroups = () =>
  permissionValues.reduce((groups, permission) => {
    const [moduleName] = permission.split(":");
    const group = groups.find((item) => item.module === moduleName);
    const row = {
      code: permission,
      label: permission
        .split(":")
        .join(" ")
        .split("-")
        .join(" ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    };

    if (group) {
      group.permissions.push(row);
    } else {
      groups.push({ module: moduleName, label: moduleName.replace(/\b\w/g, (letter) => letter.toUpperCase()), permissions: [row] });
    }

    return groups;
  }, []);

const sanitizePermissions = (permissions = []) => {
  const requested = Array.isArray(permissions) ? permissions : String(permissions || "").split(/[,\n]/);
  return Array.from(new Set(requested.map((permission) => String(permission).trim()).filter((permission) => permissionValues.includes(permission))));
};

const normalizeRoleName = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_\s-]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeCompanyScope = async (company) => {
  if (!company) return null;
  const existing = await Company.findById(company).select("_id").lean();
  if (!existing) throw new ApiError(400, "Valid company scope is required.");
  return existing._id;
};

const syncUsersForRole = async (role) => {
  await User.updateMany({ roleRef: role._id }, { $set: { permissions: role.permissions } });
};

const seedPlatformRoles = async () => {
  await Promise.all(
    platformRoleNames.map((name) =>
      ensureRole({
        name,
        level: name === ROLES.SUPER_ADMIN ? ROLE_LEVEL.SUPER_ADMIN : name === ROLES.COMPANY_ADMIN ? ROLE_LEVEL.COMPANY_ADMIN : name === ROLES.HR ? ROLE_LEVEL.HR_MANAGER : name === ROLES.SUPPORT ? ROLE_LEVEL.TEAM_LEADER : ROLE_LEVEL.EMPLOYEE,
        company: null,
        permissions: withLogisticsRolePermissions(name, ROLE_PERMISSIONS[name] || []),
        isCustom: false,
      })
    )
  );
};


const monthsBack = (count = 6) =>
  Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    date.setMonth(date.getMonth() - (count - 1 - index));
    return { key: `${date.getFullYear()}-${date.getMonth()}`, label: date.toLocaleString("en-US", { month: "short" }), value: 0, count: 0 };
  });

const bucketByMonth = (rows, dateKey = "createdAt", valueKey = null, count = 6) => {
  const months = monthsBack(count);
  rows.forEach((row) => {
    const date = row[dateKey] ? new Date(row[dateKey]) : null;
    const bucket = date ? months.find((month) => month.key === `${date.getFullYear()}-${date.getMonth()}`) : null;
    if (bucket) {
      bucket.count += 1;
      bucket.value += valueKey ? Number(row[valueKey] || 0) : 1;
    }
  });
  const max = Math.max(...months.map((month) => month.value), 1);
  return months.map((month) => ({ ...month, percent: month.value ? Math.max(8, Math.round((month.value / max) * 100)) : 0 }));
};

const toCsvValue = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const toCsv = (headers, rows) => [headers.map(toCsvValue).join(","), ...rows.map((row) => headers.map((header) => toCsvValue(row[header])).join(","))].join("\n");

const countByField = (rows, field, fallback = "Unknown") =>
  Object.entries(
    rows.reduce((total, row) => {
      const key = String(row[field] || fallback);
      total[key] = (total[key] || 0) + 1;
      return total;
    }, {})
  ).map(([label, value]) => ({ label, value }));

const buildReportAnalytics = async () => {
  const [companies, users, employees, payments, logins, leads, deals, tasks] = await Promise.all([
    Company.find().sort({ createdAt: -1 }).lean(),
    User.find().select("name email role status companyId createdAt lastLoginAt").sort({ createdAt: -1 }).lean(),
    Employee.find(await withVisibleEmployeeFilter({})).select("companyId employeeCode firstName lastName employmentStatus createdAt").sort({ createdAt: -1 }).lean(),
    SubscriptionPayment.find().populate("companyId", "companyName companyCode").sort({ createdAt: -1 }).lean(),
    LoginAudit.find().sort({ createdAt: -1 }).limit(500).lean(),
    CrmLead.find().sort({ createdAt: -1 }).lean(),
    CrmDeal.find().sort({ createdAt: -1 }).lean(),
    CrmTask.find().sort({ createdAt: -1 }).lean(),
  ]);

  const paidPayments = payments.filter((payment) => payment.status === "paid");
  const activeCompanies = companies.filter((company) => company.status === "active").length;
  const activeUsers = users.filter((user) => user.status === "active").length;
  const successfulLogins = logins.filter((login) => login.status === "success").length;
  const failedLogins = logins.filter((login) => ["failed", "locked"].includes(login.status)).length;
  const totalRevenueInr = paidPayments.reduce((sum, payment) => sum + Number(payment.payableInr || 0), 0);
  const pipelineValueInr = deals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);

  const moduleUsage = [
    { module: "Companies", records: companies.length, active: activeCompanies },
    { module: "Users", records: users.length, active: activeUsers },
    { module: "Employees", records: employees.length, active: employees.filter((employee) => String(employee.employmentStatus || "").toLowerCase() === "active").length },
    { module: "CRM Leads", records: leads.length, active: leads.filter((lead) => !["Won", "Lost"].includes(lead.status)).length },
    { module: "CRM Deals", records: deals.length, active: deals.filter((deal) => !["Won", "Lost"].includes(deal.stage)).length },
    { module: "CRM Tasks", records: tasks.length, active: tasks.filter((task) => !["Done", "Closed"].includes(task.status)).length },
    { module: "Billing", records: payments.length, active: paidPayments.length },
    { module: "Login Activity", records: logins.length, active: successfulLogins },
  ];

  return {
    usage: {
      totals: { companies: companies.length, activeCompanies, users: users.length, activeUsers, employees: employees.length, logins: logins.length, successfulLogins, failedLogins },
      companyStatus: countByField(companies, "status"),
      userRoles: countByField(users, "role"),
      recentLogins: logins.slice(0, 25),
      topCompanies: companies.slice(0, 10).map((company) => ({ companyName: company.companyName, companyCode: company.companyCode, status: company.status, plan: company.subscriptionPlan, createdAt: company.createdAt })),
    },
    revenue: {
      totals: { totalRevenueInr, paidPayments: paidPayments.length, pendingPayments: payments.filter((payment) => payment.status === "created").length, failedPayments: payments.filter((payment) => payment.status === "failed").length, pipelineValueInr },
      trend: bucketByMonth(paidPayments, "paidAt", "payableInr"),
      byPlan: Object.entries(paidPayments.reduce((total, payment) => { const key = payment.planName || payment.planCode || "Unknown"; total[key] = (total[key] || 0) + Number(payment.payableInr || 0); return total; }, {})).map(([label, value]) => ({ label, value })),
      recentPayments: payments.slice(0, 25),
    },
    growth: {
      userTrend: bucketByMonth(users),
      companyTrend: bucketByMonth(companies),
      employeeTrend: bucketByMonth(employees),
      roleDistribution: countByField(users, "role"),
    },
    modules: { rows: moduleUsage, crm: { leads: leads.length, deals: deals.length, tasks: tasks.length, pipelineValueInr, leadSources: countByField(leads, "source"), dealStages: countByField(deals, "stage"), taskStatuses: countByField(tasks, "status") } },
    exports: [
      { type: "usage", label: "Platform Usage CSV", endpoint: "/api/super-admin/reports/export?type=usage" },
      { type: "revenue", label: "Revenue Payments CSV", endpoint: "/api/super-admin/reports/export?type=revenue" },
      { type: "growth", label: "User Growth CSV", endpoint: "/api/super-admin/reports/export?type=growth" },
      { type: "modules", label: "Module Usage CSV", endpoint: "/api/super-admin/reports/export?type=modules" },
    ],
  };
};


const announcementAudiences = ["all", "companies", "admins", "users"];
const communicationChannels = ["in_app", "email", "sms", "both"];
const seedCommunicationGatewaySettings = async () => {
  const defaults = [
    { provider: "smtp", label: "SMTP Email", channel: "email", config: { host: process.env.SMTP_HOST || "", port: process.env.SMTP_PORT || "587", from: process.env.SMTP_FROM || "" }, isConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS), isActive: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) },
    { provider: "sms", label: "SMS Gateway", channel: "sms", config: { providerName: process.env.SMS_PROVIDER || "manual", senderId: process.env.SMS_SENDER_ID || "" }, isConfigured: Boolean(process.env.SMS_API_KEY), isActive: Boolean(process.env.SMS_API_KEY) },
  ];
  await Promise.all(defaults.map((item) => CommunicationGatewaySetting.findOneAndUpdate({ provider: item.provider }, { $setOnInsert: item }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true })));
};

const notifyAnnouncementRecipients = async (announcement, senderId) => {
  if (!announcement.isPublished) return 0;
  const filter = { status: USER_STATUS.ACTIVE };
  if (announcement.audience === "admins") filter.role = { $in: [ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN] };
  if (announcement.audience === "users") filter.role = { $ne: ROLES.SUPER_ADMIN };
  const users = await User.find(filter).select("_id companyId").limit(500).lean();
  const payloads = users.filter((user) => user.companyId).map((user) => ({ companyId: user.companyId, recipientUserId: user._id, senderUserId: senderId, type: NOTIFICATION_TYPE.SYSTEM, title: announcement.title, message: announcement.message, priority: announcement.priority === "normal" ? NOTIFICATION_PRIORITY.NORMAL : announcement.priority, actionUrl: announcement.actionUrl || "", entityType: "platform_announcement", entityId: announcement._id, createdBy: senderId }));
  if (!payloads.length) return 0;
  const inserted = await Notification.insertMany(payloads, { ordered: false });
  return inserted.length;
};

const slugCode = (value = "") => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const supportPriorityValues = Object.values(SUPPORT_TICKET_PRIORITY);
const supportStatusValues = Object.values(SUPPORT_TICKET_STATUS);
const defaultSupportCategories = [
  { name: "Technical", code: "technical", description: "Product bugs, access and module issues.", defaultPriority: SUPPORT_TICKET_PRIORITY.HIGH, slaHours: 8, sortOrder: 1 },
  { name: "Billing", code: "billing", description: "Invoices, plans and payment related tickets.", defaultPriority: SUPPORT_TICKET_PRIORITY.HIGH, slaHours: 12, sortOrder: 2 },
  { name: "General", code: "general", description: "General help and operational support.", defaultPriority: SUPPORT_TICKET_PRIORITY.MEDIUM, slaHours: 24, sortOrder: 3 },
];

const seedSupportCategories = async () => {
  await Promise.all(defaultSupportCategories.map((item) => SupportCategory.findOneAndUpdate({ code: item.code }, { $setOnInsert: item }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true })));
};

const nextTicketNumber = () => `SUP-${Date.now().toString(36).toUpperCase()}`;
const supportSlug = (value = "") => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const supportSummary = async () => {
  const [tickets, categories, articles] = await Promise.all([
    SupportTicket.find().populate("companyId", "companyName companyCode").populate("assignedTo", "name email role").sort({ createdAt: -1 }).lean(),
    SupportCategory.find().sort({ sortOrder: 1, name: 1 }).lean(),
    KnowledgeBaseArticle.find().sort({ sortOrder: 1, title: 1 }).lean(),
  ]);
  return {
    tickets,
    categories,
    articles,
    stats: {
      totalTickets: tickets.length,
      openTickets: tickets.filter((ticket) => ticket.status === SUPPORT_TICKET_STATUS.OPEN).length,
      pendingTickets: tickets.filter((ticket) => ticket.status === SUPPORT_TICKET_STATUS.PENDING).length,
      resolvedTickets: tickets.filter((ticket) => [SUPPORT_TICKET_STATUS.RESOLVED, SUPPORT_TICKET_STATUS.CLOSED].includes(ticket.status)).length,
      urgentTickets: tickets.filter((ticket) => ticket.priority === SUPPORT_TICKET_PRIORITY.URGENT).length,
      activeCategories: categories.filter((item) => item.isActive !== false).length,
      publishedArticles: articles.filter((item) => item.isPublished !== false).length,
    },
  };
};
const getPlatformSetting = async () =>
  PlatformSetting.findOneAndUpdate(
    { key: "platform" },
    { $setOnInsert: { key: "platform" } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

const buildSystemActivityRows = async () => {
  const [companies, users, payments, tickets, announcements, backups] = await Promise.all([
    Company.find().select("companyName companyCode status createdAt updatedAt").sort({ updatedAt: -1 }).limit(30).lean(),
    User.find().select("name email role status createdAt updatedAt").sort({ updatedAt: -1 }).limit(30).lean(),
    SubscriptionPayment.find().populate("companyId", "companyName companyCode").sort({ updatedAt: -1 }).limit(30).lean(),
    SupportTicket.find().populate("companyId", "companyName companyCode").sort({ updatedAt: -1 }).limit(30).lean(),
    PlatformAnnouncement.find().sort({ updatedAt: -1 }).limit(30).lean(),
    BackupExport.find().populate("requestedBy", "name email role").sort({ createdAt: -1 }).limit(30).lean(),
  ]);

  return [
    ...companies.map((row) => ({ module: "Company", action: "Company status/profile update", actor: row.companyName || row.companyCode, status: row.status, createdAt: row.updatedAt || row.createdAt })),
    ...users.map((row) => ({ module: "User", action: `${row.role || "user"} account update`, actor: row.name || row.email, status: row.status, createdAt: row.updatedAt || row.createdAt })),
    ...payments.map((row) => ({ module: "Billing", action: `${row.planName || row.planCode || "Plan"} payment`, actor: row.companyId?.companyName || row.razorpayOrderId || "Payment", status: row.status, amountInr: row.payableInr, createdAt: row.updatedAt || row.createdAt })),
    ...tickets.map((row) => ({ module: "Support", action: row.subject || row.ticketNumber, actor: row.companyId?.companyName || row.requesterEmail || "Support", status: row.status, createdAt: row.updatedAt || row.createdAt })),
    ...announcements.map((row) => ({ module: "Notification", action: row.title, actor: row.audience, status: row.isPublished ? "published" : "draft", createdAt: row.updatedAt || row.createdAt })),
    ...backups.map((row) => ({ module: "Backup", action: `${row.type} ${row.format} export`, actor: row.requestedBy?.name || row.requestedBy?.email || "Super Admin", status: row.status, createdAt: row.createdAt })),
  ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 100);
};

const backupRowsForType = async (type) => {
  const [companies, users, payments, audits] = await Promise.all([
    Company.find().select("companyName companyCode email status subscriptionPlan subscriptionStatus createdAt").lean(),
    User.find().select("name email role status isPlatformUser lastLoginAt createdAt").lean(),
    SubscriptionPayment.find().select("planName planCode payableInr status gatewayMode paidAt createdAt").lean(),
    LoginAudit.find().select("email status reason ipAddress createdAt").sort({ createdAt: -1 }).limit(1000).lean(),
  ]);
  if (type === "companies") return companies;
  if (type === "users") return users;
  if (type === "billing") return payments;
  if (type === "audit") return audits;
  return { companies, users, payments, audits };
};
const buildSuperAdminCompanyFilter = (query = {}) => {
  const filter = {};
  const view = String(query.view || "all").toLowerCase();

  if (view === "onboarding") {
    filter.$or = [
      { createdBy: null },
      { createdBy: { $exists: false } },
      { status: COMPANY_STATUS.PENDING_VERIFICATION },
    ];
  } else if (view === "suspended-blocked") {
    filter.status = { $in: [COMPANY_STATUS.SUSPENDED, COMPANY_STATUS.BLOCKED] };
  } else if (query.status) {
    const statuses = String(query.status)
      .split(",")
      .map((status) => status.trim())
      .filter(Boolean);

    filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
  }

  if (query.subscriptionStatus) {
    filter.subscriptionStatus = query.subscriptionStatus;
  }

  if (query.search) {
    filter.$text = { $search: String(query.search).trim() };
  }

  return filter;
};

const ensureRole = async ({ name, level, permissions, company = null, isCustom = false, isActive = true }) =>
  Role.findOneAndUpdate(
    { name, company },
    { $setOnInsert: { name, company, isActive }, $set: { level, permissions, isCustom } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

const seedCompanyRoles = async (companyId) => {
  const [companyAdminRole, hrRole, departmentHeadRole, teamLeaderRole, employeeRole] = await Promise.all([
    ensureRole({ name: "company_admin", level: ROLE_LEVEL.COMPANY_ADMIN, company: companyId, permissions: withLogisticsRolePermissions("company_admin", ["manage_company", "manage_users", "manage_departments", "view_reports"]) }),
    ensureRole({ name: "hr_manager", level: ROLE_LEVEL.HR_MANAGER, company: companyId, permissions: withLogisticsRolePermissions("hr_manager", ["manage_users", "manage_employees", "approve_leaves", "view_reports"]) }),
    ensureRole({ name: "department_head", level: ROLE_LEVEL.DEPARTMENT_HEAD, company: companyId, permissions: withLogisticsRolePermissions("department_head", ["manage_department_users", "approve_leaves", "view_reports"]) }),
    ensureRole({ name: "team_leader", level: ROLE_LEVEL.TEAM_LEADER, company: companyId, permissions: withLogisticsRolePermissions("team_leader", ["view_team", "approve_team_updates"]) }),
    ensureRole({ name: "employee", level: ROLE_LEVEL.EMPLOYEE, company: companyId, permissions: withLogisticsRolePermissions("employee", ["view_self", "apply_leave"]) }),
  ]);

  return { companyAdminRole, hrRole, departmentHeadRole, teamLeaderRole, employeeRole };
};

router.get(
  "/super-admin/notification-center",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit || 8), 50);
    const notifications = await Notification.find({ recipientUserId: req.user._id })
      .populate("senderUserId", "name email role")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    const unreadCount = await Notification.countDocuments({ recipientUserId: req.user._id, isRead: false });
    res.json(new ApiResponse(200, { notifications, unreadCount }, "Super admin notifications fetched."));
  })
);

router.patch(
  "/super-admin/notification-center/read-all",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    await Notification.updateMany(
      { recipientUserId: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    res.json(new ApiResponse(200, null, "Super admin notifications marked as read."));
  })
);

router.patch(
  "/super-admin/notification-center/:id/read",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientUserId: req.user._id },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true, runValidators: true }
    );
    if (!notification) throw new ApiError(404, "Notification not found.");
    res.json(new ApiResponse(200, notification, "Notification marked as read."));
  })
);
router.get(
  "/super-admin/notifications/overview",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (_req, res) => {
    await seedCommunicationGatewaySettings();
    const [announcements, templates, gateways] = await Promise.all([
      PlatformAnnouncement.find().sort({ createdAt: -1 }).lean(),
      NotificationTemplate.find().sort({ channel: 1, name: 1 }).lean(),
      CommunicationGatewaySetting.find().sort({ channel: 1, provider: 1 }).lean(),
    ]);

    res.json(new ApiResponse(200, {
      announcements,
      templates,
      gateways,
      stats: {
        totalAnnouncements: announcements.length,
        publishedAnnouncements: announcements.filter((item) => item.isPublished !== false).length,
        activeTemplates: templates.filter((item) => item.isActive !== false).length,
        activeGateways: gateways.filter((item) => item.isActive !== false).length,
        configuredGateways: gateways.filter((item) => item.isConfigured === true).length,
      },
    }, "Notifications and announcements fetched."));
  })
);

router.post(
  "/super-admin/notifications/announcements",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const title = String(req.body.title || "").trim();
    const message = String(req.body.message || "").trim();
    const audience = String(req.body.audience || "all").trim();
    const priority = String(req.body.priority || "normal").trim();
    if (!title) throw new ApiError(400, "Announcement title is required.");
    if (!message) throw new ApiError(400, "Announcement message is required.");
    if (!announcementAudiences.includes(audience)) throw new ApiError(400, "Valid announcement audience is required.");
    if (!["low", "normal", "medium", "high", "urgent"].includes(priority)) throw new ApiError(400, "Valid announcement priority is required.");

    const announcement = await PlatformAnnouncement.create({
      title,
      message,
      audience,
      priority,
      actionUrl: String(req.body.actionUrl || "").trim(),
      startsAt: req.body.startsAt || undefined,
      endsAt: req.body.endsAt || undefined,
      isPublished: req.body.isPublished !== false,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });
    const delivered = await notifyAnnouncementRecipients(announcement, req.user._id);
    res.status(201).json(new ApiResponse(201, { announcement, delivered }, "Platform announcement saved."));
  })
);

router.patch(
  "/super-admin/notifications/announcements/:id",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const update = { updatedBy: req.user._id };
    if (req.body.title !== undefined) update.title = String(req.body.title || "").trim();
    if (req.body.message !== undefined) update.message = String(req.body.message || "").trim();
    if (req.body.audience !== undefined) {
      const audience = String(req.body.audience || "").trim();
      if (!announcementAudiences.includes(audience)) throw new ApiError(400, "Valid announcement audience is required.");
      update.audience = audience;
    }
    if (req.body.priority !== undefined) {
      const priority = String(req.body.priority || "").trim();
      if (!["low", "normal", "medium", "high", "urgent"].includes(priority)) throw new ApiError(400, "Valid announcement priority is required.");
      update.priority = priority;
    }
    if (req.body.actionUrl !== undefined) update.actionUrl = String(req.body.actionUrl || "").trim();
    if (req.body.startsAt !== undefined) update.startsAt = req.body.startsAt || null;
    if (req.body.endsAt !== undefined) update.endsAt = req.body.endsAt || null;
    if (req.body.isPublished !== undefined) update.isPublished = req.body.isPublished === true;
    const announcement = await PlatformAnnouncement.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!announcement) throw new ApiError(404, "Announcement not found.");
    res.json(new ApiResponse(200, announcement, "Platform announcement updated."));
  })
);

router.post(
  "/super-admin/notifications/templates",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || "").trim();
    const code = slugCode(req.body.code || name);
    const channel = String(req.body.channel || "in_app").trim();
    const subject = String(req.body.subject || "").trim();
    const body = String(req.body.body || "").trim();
    if (!name) throw new ApiError(400, "Template name is required.");
    if (!code) throw new ApiError(400, "Template code is required.");
    if (!communicationChannels.includes(channel)) throw new ApiError(400, "Valid template channel is required.");
    if (["email", "both"].includes(channel) && !subject) throw new ApiError(400, "Email subject is required.");
    if (!body) throw new ApiError(400, "Template body is required.");
    const variables = Array.isArray(req.body.variables) ? req.body.variables : String(req.body.variables || "").split(/[,\n]/);
    const payload = { name, code, channel, subject, body, variables: variables.map((item) => String(item).trim()).filter(Boolean), isActive: req.body.isActive !== false, updatedBy: req.user._id };
    const template = await NotificationTemplate.findOneAndUpdate({ code }, { $set: payload, $setOnInsert: { createdBy: req.user._id } }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
    res.status(201).json(new ApiResponse(201, template, "Notification template saved."));
  })
);

router.patch(
  "/super-admin/notifications/templates/:id",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const update = { updatedBy: req.user._id };
    if (req.body.name !== undefined) update.name = String(req.body.name || "").trim();
    if (req.body.code !== undefined) update.code = slugCode(req.body.code);
    if (req.body.channel !== undefined) {
      const channel = String(req.body.channel || "").trim();
      if (!communicationChannels.includes(channel)) throw new ApiError(400, "Valid template channel is required.");
      update.channel = channel;
    }
    if (req.body.subject !== undefined) update.subject = String(req.body.subject || "").trim();
    if (req.body.body !== undefined) update.body = String(req.body.body || "").trim();
    if (req.body.variables !== undefined) {
      const variables = Array.isArray(req.body.variables) ? req.body.variables : String(req.body.variables || "").split(/[,\n]/);
      update.variables = variables.map((item) => String(item).trim()).filter(Boolean);
    }
    if (req.body.isActive !== undefined) update.isActive = req.body.isActive === true;
    const template = await NotificationTemplate.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!template) throw new ApiError(404, "Notification template not found.");
    res.json(new ApiResponse(200, template, "Notification template updated."));
  })
);

router.post(
  "/super-admin/notifications/gateways",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const provider = slugCode(req.body.provider || req.body.label || "gateway");
    const label = String(req.body.label || provider).trim();
    const channel = String(req.body.channel || "email").trim();
    if (!["email", "sms"].includes(channel)) throw new ApiError(400, "Gateway channel must be email or sms.");
    const config = typeof req.body.config === "object" && req.body.config !== null ? req.body.config : {
      host: String(req.body.host || "").trim(),
      port: String(req.body.port || "").trim(),
      from: String(req.body.from || "").trim(),
      senderId: String(req.body.senderId || "").trim(),
      apiKey: String(req.body.apiKey || "").trim(),
    };
    const isConfigured = channel === "email" ? Boolean(config.host || config.from || config.apiKey) : Boolean(config.senderId || config.apiKey);
    const gateway = await CommunicationGatewaySetting.findOneAndUpdate(
      { provider },
      { $set: { provider, label, channel, config, isConfigured, isActive: req.body.isActive === true, updatedBy: req.user._id } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(new ApiResponse(201, gateway, "Communication gateway saved."));
  })
);

router.patch(
  "/super-admin/notifications/gateways/:id",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const update = { updatedBy: req.user._id };
    if (req.body.provider !== undefined) update.provider = slugCode(req.body.provider);
    if (req.body.label !== undefined) update.label = String(req.body.label || "").trim();
    if (req.body.channel !== undefined) {
      const channel = String(req.body.channel || "").trim();
      if (!["email", "sms"].includes(channel)) throw new ApiError(400, "Gateway channel must be email or sms.");
      update.channel = channel;
    }
    if (req.body.config !== undefined) update.config = req.body.config;
    if (req.body.isActive !== undefined) update.isActive = req.body.isActive === true;
    if (req.body.isConfigured !== undefined) update.isConfigured = req.body.isConfigured === true;
    const gateway = await CommunicationGatewaySetting.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!gateway) throw new ApiError(404, "Communication gateway not found.");
    res.json(new ApiResponse(200, gateway, "Communication gateway updated."));
  })
);
router.get(
  "/super-admin/support/overview",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (_req, res) => {
    await seedSupportCategories();
    res.json(new ApiResponse(200, await supportSummary(), "Support overview fetched."));
  })
);

router.post(
  "/super-admin/support/tickets",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const subject = String(req.body.subject || "").trim();
    if (!subject) throw new ApiError(400, "Ticket subject is required.");
    const priority = supportPriorityValues.includes(req.body.priority) ? req.body.priority : SUPPORT_TICKET_PRIORITY.MEDIUM;
    const status = supportStatusValues.includes(req.body.status) ? req.body.status : SUPPORT_TICKET_STATUS.OPEN;
    const ticket = await SupportTicket.create({
      ticketNumber: nextTicketNumber(),
      companyId: req.body.companyId || null,
      requesterName: req.body.requesterName || req.user.name || "Super Admin",
      requesterEmail: req.body.requesterEmail || req.user.email || "",
      subject,
      description: req.body.description || "",
      category: req.body.category || "General",
      priority,
      status,
      assignedTo: req.body.assignedTo || null,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });
    res.status(201).json(new ApiResponse(201, ticket, "Support ticket created."));
  })
);

router.patch(
  "/super-admin/support/tickets/:id",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const update = { updatedBy: req.user._id };
    ["subject", "description", "category", "requesterName", "requesterEmail", "resolutionNote"].forEach((field) => { if (req.body[field] !== undefined) update[field] = req.body[field]; });
    if (req.body.priority !== undefined) {
      if (!supportPriorityValues.includes(req.body.priority)) throw new ApiError(400, "Valid priority is required.");
      update.priority = req.body.priority;
    }
    if (req.body.status !== undefined) {
      if (!supportStatusValues.includes(req.body.status)) throw new ApiError(400, "Valid ticket status is required.");
      update.status = req.body.status;
      if ([SUPPORT_TICKET_STATUS.RESOLVED, SUPPORT_TICKET_STATUS.CLOSED].includes(req.body.status)) update.resolvedAt = new Date();
    }
    if (req.body.assignedTo !== undefined) update.assignedTo = req.body.assignedTo || null;
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).populate("companyId", "companyName companyCode").populate("assignedTo", "name email role");
    if (!ticket) throw new ApiError(404, "Support ticket not found.");
    res.json(new ApiResponse(200, ticket, "Support ticket updated."));
  })
);

router.post(
  "/super-admin/support/categories",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || "").trim();
    if (!name) throw new ApiError(400, "Category name is required.");
    const code = supportSlug(req.body.code || name);
    const categoryPayload = { name, code, description: req.body.description || "", defaultPriority: supportPriorityValues.includes(req.body.defaultPriority) ? req.body.defaultPriority : SUPPORT_TICKET_PRIORITY.MEDIUM, slaHours: Number(req.body.slaHours || 24), sortOrder: Number(req.body.sortOrder || 0), isActive: req.body.isActive !== false, updatedBy: req.user._id };
    const category = await SupportCategory.findOneAndUpdate({ code }, { $set: categoryPayload, $setOnInsert: { createdBy: req.user._id } }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
    res.status(201).json(new ApiResponse(201, category, "Support category saved."));
  })
);

router.patch(
  "/super-admin/support/categories/:id",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const update = { ...req.body, updatedBy: req.user._id };
    if (update.defaultPriority && !supportPriorityValues.includes(update.defaultPriority)) throw new ApiError(400, "Valid priority is required.");
    const category = await SupportCategory.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!category) throw new ApiError(404, "Support category not found.");
    res.json(new ApiResponse(200, category, "Support category updated."));
  })
);

router.post(
  "/super-admin/support/articles",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const title = String(req.body.title || "").trim();
    const answer = String(req.body.answer || "").trim();
    if (!title || !answer) throw new ApiError(400, "Article title and answer are required.");
    const slug = supportSlug(req.body.slug || title);
    const articlePayload = { title, slug, category: req.body.category || "General", question: req.body.question || title, answer, tags: Array.isArray(req.body.tags) ? req.body.tags : String(req.body.tags || "").split(",").map((item) => item.trim()).filter(Boolean), isPublished: req.body.isPublished !== false, sortOrder: Number(req.body.sortOrder || 0), updatedBy: req.user._id };
    const article = await KnowledgeBaseArticle.findOneAndUpdate({ slug }, { $set: articlePayload, $setOnInsert: { createdBy: req.user._id } }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
    res.status(201).json(new ApiResponse(201, article, "Knowledge base article saved."));
  })
);

router.patch(
  "/super-admin/support/articles/:id",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const update = { ...req.body, updatedBy: req.user._id };
    if (update.slug) update.slug = supportSlug(update.slug);
    if (typeof update.tags === "string") update.tags = update.tags.split(",").map((item) => item.trim()).filter(Boolean);
    const article = await KnowledgeBaseArticle.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!article) throw new ApiError(404, "Knowledge base article not found.");
    res.json(new ApiResponse(200, article, "Knowledge base article updated."));
  })
);
router.get(
  "/super-admin/reports/analytics",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (_req, res) => {
    const analytics = await buildReportAnalytics();
    res.json(new ApiResponse(200, analytics, "Reports and analytics fetched."));
  })
);

router.get(
  "/super-admin/reports/export",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const type = String(req.query.type || "usage").toLowerCase();
    const analytics = await buildReportAnalytics();
    let headers = [];
    let rows = [];

    if (type === "revenue") {
      headers = ["company", "plan", "amount", "discount", "status", "mode", "order", "payment", "date"];
      rows = analytics.revenue.recentPayments.map((payment) => ({
        company: payment.companyId?.companyName || payment.companyId?.companyCode || "",
        plan: payment.planName || payment.planCode || "",
        amount: payment.payableInr || 0,
        discount: payment.discountInr || 0,
        status: payment.status || "",
        mode: payment.gatewayMode || "",
        order: payment.razorpayOrderId || "",
        payment: payment.razorpayPaymentId || "",
        date: payment.paidAt || payment.createdAt || "",
      }));
    } else if (type === "growth") {
      headers = ["month", "users", "companies", "employees"];
      rows = analytics.growth.userTrend.map((item, index) => ({ month: item.label, users: item.value, companies: analytics.growth.companyTrend[index]?.value || 0, employees: analytics.growth.employeeTrend[index]?.value || 0 }));
    } else if (type === "modules") {
      headers = ["module", "records", "active"];
      rows = analytics.modules.rows.map((row) => ({ module: row.module, records: row.records, active: row.active }));
    } else {
      headers = ["metric", "value"];
      rows = Object.entries(analytics.usage.totals).map(([metric, value]) => ({ metric, value }));
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=super-admin-${type}-report.csv`);
    res.send(toCsv(headers, rows));
  })
);

router.post(
  "/super-admin/companies",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const { name, email, phone, address, logo, subscriptionPlan, adminName, adminEmail, adminPassword, adminMobile } = req.body;
    if (!name || !email || !adminName || !adminEmail || !adminPassword) {
      throw new ApiError(400, "Company name, email, admin name, admin email and admin password are required.");
    }

    const companyCode = String(req.body.companyCode || name).replace(/[^a-z0-9]/gi, "").slice(0, 12).toUpperCase() || `CO${Date.now()}`;
    const company = await Company.create({
      companyName: name,
      companyCode,
      email,
      phone,
      logo,
      subscriptionPlan: subscriptionPlan || "business",
      address: typeof address === "object" ? address : { addressLine1: address || "" },
      status: "active",
      createdBy: req.user._id,
    });

    const { companyAdminRole } = await seedCompanyRoles(company._id);
    await Promise.all(defaultDepartments.map((departmentName) =>
      Department.findOneAndUpdate(
        { companyId: company._id, departmentName },
        {
          $setOnInsert: {
            companyId: company._id,
            departmentName,
            departmentCode: departmentName.replace(/\s+/g, "_").toUpperCase(),
            isCustom: false,
            createdBy: req.user._id,
          },
        },
        { upsert: true, new: true }
      )
    ));

    const admin = new User({
      companyId: company._id,
      name: adminName,
      email: adminEmail,
      mobile: adminMobile || "",
      role: ROLES.COMPANY_ADMIN,
      roleRef: companyAdminRole._id,
      permissions: companyAdminRole.permissions,
      status: USER_STATUS.ACTIVE,
      isEmailVerified: true,
      forcePasswordChange: false,
      createdBy: req.user._id,
    });
    await admin.setPassword(adminPassword);
    await admin.save();

    res.status(201).json(new ApiResponse(201, { company, admin: admin.toSafeObject() }, "Company and company admin created."));
  })
);

router.get(
  "/super-admin/companies",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const companies = await Company.find(buildSuperAdminCompanyFilter(req.query)).sort({ createdAt: -1 }).lean();
    const rows = await Promise.all(companies.map(async (company) => ({
      ...company,
      stats: {
        users: await User.countDocuments({ companyId: company._id }),
        departments: await Department.countDocuments({ companyId: company._id }),
        employees: await countEmployees({ companyId: company._id }),
      },
    })));
    res.json(new ApiResponse(200, { companies: rows }, "Companies fetched."));
  })
);

router.patch(
  "/super-admin/companies/:id/status",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const status = String(req.body.status || "").trim();
    if (!companyStatusValues.includes(status)) {
      throw new ApiError(400, "Valid company status is required.");
    }

    const update = { status, updatedBy: req.user._id };
    if (req.body.subscriptionStatus !== undefined) {
      const subscriptionStatus = String(req.body.subscriptionStatus || "").trim();
      if (!subscriptionStatusValues.includes(subscriptionStatus)) {
        throw new ApiError(400, "Valid subscription status is required.");
      }
      update.subscriptionStatus = subscriptionStatus;
    }

    const company = await Company.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!company) throw new ApiError(404, "Company not found.");
    res.json(new ApiResponse(200, company, "Company status updated."));
  })
);

router.get(
  "/super-admin/login-audits",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit || 100), 200);
    const filter = {};

    if (req.query.status) filter.status = req.query.status;
    if (req.query.email) filter.email = { $regex: String(req.query.email), $options: "i" };

    const logs = await LoginAudit.find(filter)
      .populate("user", "name email role companyId")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json(new ApiResponse(200, { logs }, "Login activity logs fetched."));
  })
);

router.get(
  "/super-admin/audit/overview",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (_req, res) => {
    const [systemRows, loginRows, sessions] = await Promise.all([
      buildSystemActivityRows(),
      LoginAudit.find().populate("user", "name email role").sort({ createdAt: -1 }).limit(300).lean(),
      AuthSession.find().populate("user", "name email role").sort({ createdAt: -1 }).limit(150).lean(),
    ]);
    const failedRows = loginRows.filter((row) => ["failed", "locked"].includes(row.status));
    res.json(new ApiResponse(200, {
      systemLogs: systemRows,
      authHistory: loginRows.filter((row) => ["success", "logout"].includes(row.status)),
      failedAttempts: failedRows,
      sessions,
      stats: {
        systemLogs: systemRows.length,
        logins: loginRows.filter((row) => row.status === "success").length,
        logouts: loginRows.filter((row) => row.status === "logout").length,
        failedAttempts: failedRows.length,
        activeSessions: sessions.filter((row) => row.isRevoked === false && row.expiresAt > new Date()).length,
      },
    }, "Audit logs fetched."));
  })
);

router.get(
  "/super-admin/audit/system-logs",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (_req, res) => res.json(new ApiResponse(200, { logs: await buildSystemActivityRows() }, "System activity logs fetched.")))
);

router.get(
  "/super-admin/audit/auth-history",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (_req, res) => {
    const logs = await LoginAudit.find({ status: { $in: ["success", "logout"] } }).populate("user", "name email role").sort({ createdAt: -1 }).limit(300).lean();
    res.json(new ApiResponse(200, { logs }, "Login/logout history fetched."));
  })
);

router.get(
  "/super-admin/audit/failed-logins",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (_req, res) => {
    const logs = await LoginAudit.find({ status: { $in: ["failed", "locked"] } }).populate("user", "name email role").sort({ createdAt: -1 }).limit(300).lean();
    res.json(new ApiResponse(200, { logs }, "Failed login attempts fetched."));
  })
);

router.get(
  "/super-admin/settings/platform",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (_req, res) => res.json(new ApiResponse(200, { settings: await getPlatformSetting() }, "Platform settings fetched.")))
);

router.patch(
  "/super-admin/settings/platform",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const update = { updatedBy: req.user._id };
    ["appName", "companyName", "supportEmail", "supportPhone", "defaultTimezone"].forEach((key) => {
      if (req.body[key] !== undefined) update[key] = String(req.body[key] || "").trim();
    });
    if (req.body.maintenanceMode !== undefined) update.maintenanceMode = req.body.maintenanceMode === true;
    if (req.body.registrationEnabled !== undefined) update.registrationEnabled = req.body.registrationEnabled === true;
    const settings = await PlatformSetting.findOneAndUpdate({ key: "platform" }, { $set: update, $setOnInsert: { key: "platform" } }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
    res.json(new ApiResponse(200, { settings }, "Platform settings updated."));
  })
);

router.patch(
  "/super-admin/settings/security",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const security = {};
    ["passwordMinLength", "sessionTimeoutMinutes", "maxLoginAttempts", "lockoutMinutes"].forEach((key) => {
      if (req.body[key] !== undefined && Number.isFinite(Number(req.body[key]))) security[`security.${key}`] = Number(req.body[key]);
    });
    ["requireStrongPassword", "enforceTwoFactor"].forEach((key) => {
      if (req.body[key] !== undefined) security[`security.${key}`] = req.body[key] === true;
    });
    security.updatedBy = req.user._id;
    const settings = await PlatformSetting.findOneAndUpdate({ key: "platform" }, { $set: security, $setOnInsert: { key: "platform" } }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
    res.json(new ApiResponse(200, { settings }, "Security settings updated."));
  })
);

router.get(
  "/super-admin/backup/history",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (_req, res) => {
    const backups = await BackupExport.find().populate("requestedBy", "name email role").sort({ createdAt: -1 }).limit(100).lean();
    res.json(new ApiResponse(200, { backups }, "Backup history fetched."));
  })
);

router.post(
  "/super-admin/backup/export",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const type = String(req.body.type || "full").trim();
    const format = String(req.body.format || "json").trim();
    if (!["full", "companies", "users", "billing", "audit"].includes(type)) throw new ApiError(400, "Valid export type is required.");
    if (!["json", "csv"].includes(format)) throw new ApiError(400, "Valid export format is required.");
    const rows = await backupRowsForType(type);
    const recordCount = Array.isArray(rows) ? rows.length : Object.values(rows).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
    const backup = await BackupExport.create({ type, format, status: "ready", fileName: `opas-${type}-${Date.now()}.${format}`, recordCount, requestedBy: req.user._id, notes: String(req.body.notes || "").trim() });
    res.status(201).json(new ApiResponse(201, { backup, data: rows }, "Backup export generated."));
  })
);

router.get(
  "/super-admin/profile/activity",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const [logins, sessions, backups] = await Promise.all([
      LoginAudit.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100).lean(),
      AuthSession.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean(),
      BackupExport.find({ requestedBy: req.user._id }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);
    res.json(new ApiResponse(200, { logins, sessions, backups }, "Profile activity fetched."));
  })
);
router.get(
  "/super-admin/roles",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (_req, res) => {
    await seedPlatformRoles();
    const [roles, companies] = await Promise.all([
      Role.find().populate("company", "companyName companyCode").sort({ company: 1, level: 1, name: 1 }).lean(),
      Company.find().select("companyName companyCode").sort({ companyName: 1 }).lean(),
    ]);

    res.json(new ApiResponse(200, { roles, companies, permissionGroups: permissionGroups(), permissions: permissionValues }, "Roles and permissions fetched."));
  })
);

router.get(
  "/super-admin/permissions/matrix",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (_req, res) => {
    await seedPlatformRoles();
    const roles = await Role.find().populate("company", "companyName companyCode").sort({ company: 1, level: 1, name: 1 }).lean();
    res.json(new ApiResponse(200, { roles, permissionGroups: permissionGroups(), permissions: permissionValues }, "Permission matrix fetched."));
  })
);

router.post(
  "/super-admin/roles",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const name = normalizeRoleName(req.body.name);
    const level = Number(req.body.level ?? ROLE_LEVEL.EMPLOYEE);
    const company = await normalizeCompanyScope(req.body.company || null);
    const permissions = sanitizePermissions(req.body.permissions);

    if (!name) throw new ApiError(400, "Role name is required.");
    if (!roleLevelValues.includes(level)) throw new ApiError(400, "Valid role level is required.");
    if (!permissions.length) throw new ApiError(400, "At least one valid permission is required.");

    const role = await Role.findOneAndUpdate(
      { name, company },
      {
        name,
        level,
        company,
        permissions,
        isCustom: req.body.isCustom !== false,
        isActive: req.body.isActive !== false,
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).populate("company", "companyName companyCode");

    await syncUsersForRole(role);
    res.status(201).json(new ApiResponse(201, role, "Role saved."));
  })
);

router.patch(
  "/super-admin/roles/:id",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const existing = await Role.findById(req.params.id);
    if (!existing) throw new ApiError(404, "Role not found.");

    const update = {};
    if (req.body.name !== undefined) {
      const name = normalizeRoleName(req.body.name);
      if (!name) throw new ApiError(400, "Role name is required.");
      update.name = name;
    }
    if (req.body.level !== undefined) {
      const level = Number(req.body.level);
      if (!roleLevelValues.includes(level)) throw new ApiError(400, "Valid role level is required.");
      update.level = level;
    }
    if (req.body.company !== undefined) update.company = await normalizeCompanyScope(req.body.company || null);
    if (req.body.permissions !== undefined) {
      const permissions = sanitizePermissions(req.body.permissions);
      if (!permissions.length) throw new ApiError(400, "At least one valid permission is required.");
      update.permissions = permissions;
    }
    if (req.body.isActive !== undefined) update.isActive = req.body.isActive === true;
    if (req.body.isCustom !== undefined) update.isCustom = req.body.isCustom === true;

    const role = await Role.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).populate("company", "companyName companyCode");
    await syncUsersForRole(role);
    res.json(new ApiResponse(200, role, "Role updated."));
  })
);
router.get(
  "/super-admin/crm-settings",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    await seedCrmModuleSettings();
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.active !== undefined) filter.isActive = String(req.query.active) === "true";
    const settings = await CrmModuleSetting.find(filter).sort({ type: 1, sortOrder: 1, name: 1 }).lean();
    res.json(new ApiResponse(200, { settings, types: CRM_SETTING_TYPES }, "CRM module settings fetched."));
  })
);

router.post(
  "/super-admin/crm-settings",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const payload = buildCrmSettingPayload(req.body, req.user._id);
    const setting = await CrmModuleSetting.findOneAndUpdate(
      { type: payload.type, code: payload.code },
      { $set: payload, $setOnInsert: { createdBy: req.user._id } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(new ApiResponse(201, setting, "CRM module setting saved."));
  })
);

router.patch(
  "/super-admin/crm-settings/:id",
  checkPermission("manage_all_companies"),
  checkHierarchyLevel(0),
  asyncHandler(async (req, res) => {
    const existing = await CrmModuleSetting.findById(req.params.id);
    if (!existing) throw new ApiError(404, "CRM module setting not found.");
    const payload = buildCrmSettingPayload({ ...existing.toObject(), ...req.body }, req.user._id, existing.type);
    const setting = await CrmModuleSetting.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    res.json(new ApiResponse(200, setting, "CRM module setting updated."));
  })
);
router.get(
  "/company/departments",
  checkPermission("manage_departments"),
  checkHierarchyLevel(2),
  asyncHandler(async (req, res) => {
    const departments = await Department.find({ companyId: req.auth.companyId, isActive: true })
      .sort({ departmentName: 1 })
      .lean();

    res.json(new ApiResponse(200, { departments }, "Departments fetched."));
  })
);

router.post(
  "/company/departments",
  checkPermission("manage_departments"),
  checkHierarchyLevel(1),
  asyncHandler(async (req, res) => {
    const companyId = req.auth.companyId;
    const departmentName = String(req.body.name || req.body.departmentName || "").trim();
    if (!departmentName) throw new ApiError(400, "Department name is required.");
    const department = await Department.create({
      companyId,
      departmentName,
      departmentCode: String(req.body.code || departmentName).replace(/[^a-z0-9]/gi, "_").toUpperCase(),
      isCustom: true,
      createdBy: req.user._id,
    });
    res.status(201).json(new ApiResponse(201, department, "Department created."));
  })
);

router.get(
  "/company/roles",
  checkPermission(PERMISSIONS.USER_READ),
  checkHierarchyLevel(2),
  asyncHandler(async (req, res) => {
    const roles = await Role.find({ company: req.auth.companyId }).sort({ level: 1, name: 1 }).lean();

    res.json(new ApiResponse(200, { roles }, "Roles fetched."));
  })
);

router.post(
  "/company/users",
  checkPermission("manage_users"),
  checkHierarchyLevel(2),
  asyncHandler(async (req, res) => {
    const companyId = req.auth.companyId;
    const requestedRole = req.body.roleId
      ? await Role.findOne({ _id: req.body.roleId, company: companyId })
      : await Role.findOne({ name: String(req.body.roleName || "employee").toLowerCase(), company: companyId });
    if (!requestedRole) throw new ApiError(400, "Valid company role is required.");
    if (!canManageTargetLevel(req.user, requestedRole.level)) throw new ApiError(403, "You can only create lower hierarchy users.");

    const normalizedRoleName = requestedRole.name === "hr_manager" ? ROLES.HR : requestedRole.name === "company_admin" ? ROLES.COMPANY_ADMIN : ROLES.EMPLOYEE;

    if (normalizedRoleName === ROLES.HR) {
      await ensureHrLimit(companyId);
    } else if (normalizedRoleName === ROLES.EMPLOYEE) {
      await ensureEmployeeLimit(companyId);
    }

    const user = new User({
      companyId,
      name: req.body.name,
      email: req.body.email,
      mobile: req.body.mobile || "",
      role: normalizedRoleName,
      roleRef: requestedRole._id,
      permissions: requestedRole.permissions,
      departmentRef: req.body.departmentId || null,
      designation: req.body.designation || "",
      reportingTo: req.body.reportingTo || null,
      status: USER_STATUS.ACTIVE,
      isEmailVerified: true,
      forcePasswordChange: false,
      createdBy: req.user._id,
    });
    await user.setPassword(req.body.password || "Employee@123");
    await user.save();
    res.status(201).json(new ApiResponse(201, user.toSafeObject(), "User created."));
  })
);

router.get(
  "/company/org-chart",
  checkPermission(PERMISSIONS.REPORT_READ),
  checkHierarchyLevel(2),
  asyncHandler(async (req, res) => {
    const companyId = req.auth.companyId;
    const [company, departments, users] = await Promise.all([
      Company.findById(companyId).lean(),
      Department.find({ companyId }).lean(),
      User.find({ companyId }).populate("roleRef", "name level").populate("departmentRef", "departmentName departmentCode").lean(),
    ]);
    const usersByManager = users.reduce((acc, user) => {
      const key = user.reportingTo ? String(user.reportingTo) : "root";
      acc[key] = acc[key] || [];
      acc[key].push(user);
      return acc;
    }, {});
    const toNode = (user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.roleRef?.name || user.role,
      level: user.roleRef?.level,
      department: user.departmentRef?.departmentName || user.department || "",
      designation: user.designation || "",
      children: (usersByManager[String(user._id)] || []).map(toNode),
    });
    res.json(new ApiResponse(200, {
      company,
      departments,
      tree: (usersByManager.root || []).map(toNode),
    }, "Org chart fetched."));
  })
);

export default router;










