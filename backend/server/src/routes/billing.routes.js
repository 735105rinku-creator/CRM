import crypto from "crypto";
import { Router } from "express";

import { Company } from "../models/Company.js";
import { BillingPlan, BILLING_PLAN_CODES } from "../models/BillingPlan.js";
import { PlanOffer } from "../models/PlanOffer.js";
import { SubscriptionPayment } from "../models/SubscriptionPayment.js";
import { Employee } from "../models/Employee.js";
import { countEmployees } from "../repositories/employee.repository.js";
import { User } from "../models/User.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { ROLES, SUBSCRIPTION_STATUS } from "../constants/roles.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const DEFAULT_PLANS = [
  {
    code: BILLING_PLAN_CODES.BASIC,
    name: "Basic",
    description: "Lean CRM + HRM access for early teams.",
    priceInr: 999,
    durationMonths: 1,
    employeeLimit: 20,
    hrAccountLimit: 1,
    sortOrder: 1,
    features: ["20 employee profiles", "1 HR account", "CRM pipeline", "Attendance and leave basics", "Email support"],
  },
  {
    code: BILLING_PLAN_CODES.STANDARD,
    name: "Standard",
    description: "Balanced plan for growing operations.",
    priceInr: 2499,
    durationMonths: 1,
    employeeLimit: 100,
    hrAccountLimit: 2,
    sortOrder: 2,
    features: ["100 employee profiles", "2 HR accounts", "CRM + HRMS suite", "Payroll records", "Reports dashboard"],
  },
  {
    code: BILLING_PLAN_CODES.BUSINESS,
    name: "Business",
    description: "Unlimited company workspace for larger teams.",
    priceInr: 4999,
    durationMonths: 1,
    employeeLimit: -1,
    hrAccountLimit: -1,
    sortOrder: 3,
    features: ["Unlimited employees", "Unlimited HR accounts", "All CRM and HRM modules", "Priority support", "Advanced reports"],
  },
];

const isSuperAdmin = (user) => user?.role === ROLES.SUPER_ADMIN;
const isCompanyAdmin = (user) => user?.role === ROLES.COMPANY_ADMIN;
const getCompanyId = (user) => user?.companyId?._id || user?.companyId;

const ensureSuperAdmin = (user) => {
  if (!isSuperAdmin(user)) throw new ApiError(403, "Only super admin can manage billing settings.");
};

const ensureCompanyAdmin = (user) => {
  if (!isCompanyAdmin(user)) throw new ApiError(403, "Only company admin can purchase a plan.");
};

const seedDefaultPlans = async () => {
  await Promise.all(
    DEFAULT_PLANS.map((plan) =>
      BillingPlan.findOneAndUpdate(
        { code: plan.code },
        { $setOnInsert: plan },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  );
};

const activeOfferFilter = (planCode) => {
  const now = new Date();
  return {
    isActive: true,
    planCode: { $in: ["all", planCode] },
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  };
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const planDefaultsByCode = () =>
  DEFAULT_PLANS.reduce((defaults, plan) => {
    defaults[plan.code] = plan;
    return defaults;
  }, {});

const sanitizeFeatures = (features) => {
  const rows = Array.isArray(features) ? features : String(features || "").split("\n");
  return rows.map((item) => String(item).trim()).filter(Boolean);
};

const normalizePlanCode = (value) => {
  const code = String(value || "").toLowerCase().trim();
  const aliases = {
    standred: BILLING_PLAN_CODES.STANDARD,
    standart: BILLING_PLAN_CODES.STANDARD,
    busness: BILLING_PLAN_CODES.BUSINESS,
    bussiness: BILLING_PLAN_CODES.BUSINESS,
  };
  return aliases[code] || code;
};

const planRank = (code) => {
  const order = {
    [BILLING_PLAN_CODES.BASIC]: 1,
    [BILLING_PLAN_CODES.STANDARD]: 2,
    [BILLING_PLAN_CODES.BUSINESS]: 3,
  };
  return order[normalizePlanCode(code)] || 0;
};

const planChangeType = (currentCode, nextCode) => {
  const current = normalizePlanCode(currentCode);
  const next = normalizePlanCode(nextCode);
  if (!current) return "new";
  if (current === next) return "renew";
  return planRank(next) > planRank(current) ? "upgrade" : "downgrade";
};
const buildPlanPayload = (body, userId) => {
  const code = normalizePlanCode(body.code);
  if (!Object.values(BILLING_PLAN_CODES).includes(code)) {
    throw new ApiError(400, "Plan code must be basic, standard or business.", [
      { field: "code", message: "Allowed values: basic, standard, business." },
    ]);
  }

  const defaults = planDefaultsByCode()[code];
  const priceInr = toNumber(body.priceInr, defaults.priceInr);
  const durationMonths = toNumber(body.durationMonths, defaults.durationMonths);
  const employeeLimit = toNumber(body.employeeLimit, defaults.employeeLimit);
  const hrAccountLimit = toNumber(body.hrAccountLimit, defaults.hrAccountLimit);

  const errors = [];
  if (!String(body.name || defaults.name).trim()) errors.push({ field: "name", message: "Plan name is required." });
  if (priceInr < 1) errors.push({ field: "priceInr", message: "Price must be at least 1 INR." });
  if (durationMonths < 1) errors.push({ field: "durationMonths", message: "Duration must be at least 1 month." });
  if (employeeLimit < -1) errors.push({ field: "employeeLimit", message: "Employee limit must be -1 or greater." });
  if (hrAccountLimit < -1) errors.push({ field: "hrAccountLimit", message: "HR account limit must be -1 or greater." });

  if (errors.length) throw new ApiError(400, "Invalid billing plan details.", errors);

  return {
    code,
    name: String(body.name || defaults.name).trim(),
    description: String(body.description ?? defaults.description ?? "").trim(),
    priceInr,
    durationMonths,
    employeeLimit,
    hrAccountLimit,
    features: sanitizeFeatures(body.features).length ? sanitizeFeatures(body.features) : defaults.features,
    isActive: body.isActive !== false,
    sortOrder: toNumber(body.sortOrder, defaults.sortOrder),
    updatedBy: userId,
  };
};

const computePayable = (plan, offer = null) => {
  const amountInr = Number(plan.priceInr || 0);
  let discountInr = 0;

  if (offer) {
    discountInr = offer.discountType === "flat"
      ? Number(offer.discountValue || 0)
      : Math.round((amountInr * Number(offer.discountValue || 0)) / 100);
  }

  discountInr = Math.min(discountInr, amountInr);
  return {
    amountInr,
    discountInr,
    payableInr: Math.max(0, amountInr - discountInr),
  };
};

const publicPlan = async (plan) => {
  const offer = await PlanOffer.findOne(activeOfferFilter(plan.code)).sort({ updatedAt: -1 }).lean();
  const pricing = computePayable(plan, offer);
  return { ...plan, ...pricing, activeOffer: offer || null };
};

const addMonths = (date, months) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + Number(months || 1));
  return next;
};

const applyPlanToCompany = async ({ companyId, plan, updatedBy }) => {
  return Company.findByIdAndUpdate(
    companyId,
    {
      subscriptionPlan: plan.code,
      subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE,
      subscriptionEndsAt: addMonths(new Date(), plan.durationMonths),
      maxEmployees: plan.employeeLimit,
      hrAccountLimit: plan.hrAccountLimit,
      updatedBy,
    },
    { new: true, runValidators: true }
  );
};

const monthWindow = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
};

const buildBillingSummary = async ({ companies, payments, now = new Date() }) => {
  const { start: monthStart, end: monthEnd } = monthWindow(now);
  const paidPayments = payments.filter((payment) => payment.status === "paid");
  const plans = await BillingPlan.find().lean();
  const planMap = new Map(plans.map((plan) => [plan.code, plan]));
  const latestPaidByCompany = new Map();

  paidPayments.forEach((payment) => {
    const companyId = String(payment.companyId?._id || payment.companyId || "");
    const current = latestPaidByCompany.get(companyId);
    const paidAt = new Date(payment.paidAt || payment.createdAt || 0).getTime();
    const currentPaidAt = current ? new Date(current.paidAt || current.createdAt || 0).getTime() : 0;
    if (companyId && paidAt >= currentPaidAt) latestPaidByCompany.set(companyId, payment);
  });

  const activeCompanies = companies.filter(
    (company) =>
      company.subscriptionStatus === SUBSCRIPTION_STATUS.ACTIVE &&
      (!company.subscriptionEndsAt || new Date(company.subscriptionEndsAt) >= now)
  );

  const mrrInr = activeCompanies.reduce((total, company) => {
    const payment = latestPaidByCompany.get(String(company._id));
    if (payment) return total + Math.round(Number(payment.payableInr || 0) / Math.max(Number(payment.durationMonths || 1), 1));

    const plan = planMap.get(company.subscriptionPlan);
    return total + Math.round(Number(plan?.priceInr || 0) / Math.max(Number(plan?.durationMonths || 1), 1));
  }, 0);

  const totalRevenueInr = paidPayments.reduce((total, payment) => total + Number(payment.payableInr || 0), 0);
  const currentMonthRevenueInr = paidPayments
    .filter((payment) => {
      const paidAt = new Date(payment.paidAt || payment.createdAt || 0);
      return paidAt >= monthStart && paidAt < monthEnd;
    })
    .reduce((total, payment) => total + Number(payment.payableInr || 0), 0);

  const [totalUsers, activeUsers, inactiveUsers, blockedUsers, totalEmployees] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: "active" }),
    User.countDocuments({ status: "inactive" }),
    User.countDocuments({ status: { $in: ["blocked", "banned"] } }),
    Employee.countDocuments(),
  ]);

  return {
    companies: companies.length,
    activeCompanies: companies.filter((company) => company.status === "active").length,
    trialCompanies: companies.filter((company) => ["trial", "pending_verification", "inactive"].includes(company.status || "")).length,
    suspendedCompanies: companies.filter((company) => ["suspended", "blocked"].includes(company.status || "")).length,
    signupsThisMonth: companies.filter((company) => company.createdAt >= monthStart && company.createdAt < monthEnd).length,
    subscriptionsActive: activeCompanies.length,
    subscriptionsExpired: companies.filter(
      (company) => company.subscriptionStatus === SUBSCRIPTION_STATUS.EXPIRED || (company.subscriptionEndsAt && new Date(company.subscriptionEndsAt) < now)
    ).length,
    subscriptionsTrial: companies.filter((company) => company.subscriptionStatus === SUBSCRIPTION_STATUS.TRIAL).length,
    totalUsers,
    activeUsers,
    inactiveUsers,
    blockedUsers,
    totalEmployees,
    paidPayments: paidPayments.length,
    pendingPayments: payments.filter((payment) => payment.status === "created").length,
    failedPayments: payments.filter((payment) => payment.status === "failed").length,
    mrrInr,
    totalRevenueInr,
    currentMonthRevenueInr,
  };
};

const createRazorpayOrder = async ({ amountPaise, receipt }) => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return {
      id: `demo_order_${Date.now()}`,
      amount: amountPaise,
      currency: "INR",
      receipt,
      gatewayMode: "demo",
      keyId: "rzp_test_demo",
    };
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(502, body.error?.description || "Unable to create Razorpay order.");
  }

  return { ...body, gatewayMode: "live", keyId };
};

const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret || orderId.startsWith("demo_order_")) return true;

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return expected === signature;
};

router.get(
  "/plans",
  asyncHandler(async (_req, res) => {
    await seedDefaultPlans();
    const plans = await BillingPlan.find({ isActive: true }).sort({ sortOrder: 1, priceInr: 1 }).lean();
    const rows = await Promise.all(plans.map(publicPlan));
    res.json(new ApiResponse(200, { plans: rows }, "Billing plans fetched."));
  })
);

router.use(requireAuth);

router.get(
  "/my/subscription",
  asyncHandler(async (req, res) => {
    const companyId = getCompanyId(req.user);
    if (!companyId) throw new ApiError(400, "Company context missing.");

    await seedDefaultPlans();
    const [company, plans, offers, payments, employeeCount, hrCount] = await Promise.all([
      Company.findById(companyId).lean(),
      BillingPlan.find({ isActive: true }).sort({ sortOrder: 1, priceInr: 1 }).lean(),
      PlanOffer.find({ isActive: true }).sort({ updatedAt: -1 }).lean(),
      SubscriptionPayment.find({ companyId }).sort({ createdAt: -1 }).limit(20).lean(),
      countEmployees({ companyId, isActive: true }),
      User.countDocuments({ companyId, role: ROLES.HR, status: "active" }),
    ]);

    if (!company) throw new ApiError(404, "Company not found.");
    const planRows = await Promise.all(plans.map(publicPlan));
    res.json(new ApiResponse(200, { company, plans: planRows, offers, payments, usage: { employeeCount, hrCount } }, "Subscription fetched."));
  })
);

router.get(
  "/my/payments",
  asyncHandler(async (req, res) => {
    const companyId = getCompanyId(req.user);
    if (!companyId) throw new ApiError(400, "Company context missing.");
    const payments = await SubscriptionPayment.find({ companyId }).sort({ createdAt: -1 }).limit(50).lean();
    res.json(new ApiResponse(200, { payments }, "Payment history fetched."));
  })
);

router.post(
  "/checkout/order",
  asyncHandler(async (req, res) => {
    ensureCompanyAdmin(req.user);
    await seedDefaultPlans();

    const planCode = normalizePlanCode(req.body.planCode);
    const companyId = getCompanyId(req.user);
    const [plan, company] = await Promise.all([
      BillingPlan.findOne({ code: planCode, isActive: true }).lean(),
      Company.findById(companyId).select("subscriptionPlan").lean(),
    ]);
    if (!plan) throw new ApiError(404, "Active billing plan not found.");
    if (!company) throw new ApiError(404, "Company not found.");
    const changeType = planChangeType(company.subscriptionPlan, plan.code);

    const requestedOffer = String(req.body.offerCode || "").toUpperCase().trim();
    const offer = requestedOffer
      ? await PlanOffer.findOne({ ...activeOfferFilter(plan.code), code: requestedOffer }).lean()
      : await PlanOffer.findOne(activeOfferFilter(plan.code)).sort({ updatedAt: -1 }).lean();

    const pricing = computePayable(plan, offer);
    const receipt = `sub_${companyId}_${Date.now()}`.slice(0, 40);
    const order = await createRazorpayOrder({ amountPaise: pricing.payableInr * 100, receipt });

    const payment = await SubscriptionPayment.create({
      companyId,
      planCode: plan.code,
      planName: plan.name,
      offerCode: offer?.code || "",
      changeType,
      amountInr: pricing.amountInr,
      discountInr: pricing.discountInr,
      payableInr: pricing.payableInr,
      durationMonths: plan.durationMonths,
      gatewayMode: order.gatewayMode,
      razorpayOrderId: order.id,
      createdBy: req.user._id,
    });

    res.status(201).json(new ApiResponse(201, { order, payment, plan, offer, changeType, keyId: order.keyId, companyName: req.user.companyId?.companyName || "Opas Bizz CRM" }, "Razorpay order created."));
  })
);

router.post(
  "/checkout/verify",
  asyncHandler(async (req, res) => {
    ensureCompanyAdmin(req.user);
    const orderId = String(req.body.razorpay_order_id || req.body.orderId || "").trim();
    const paymentId = String(req.body.razorpay_payment_id || req.body.paymentId || "demo_payment").trim();
    const signature = String(req.body.razorpay_signature || req.body.signature || "").trim();

    const payment = await SubscriptionPayment.findOne({ razorpayOrderId: orderId, companyId: getCompanyId(req.user) });
    if (!payment) throw new ApiError(404, "Subscription payment not found.");

    if (!verifyRazorpaySignature({ orderId, paymentId, signature })) {
      payment.status = "failed";
      await payment.save();
      throw new ApiError(400, "Razorpay payment verification failed.");
    }

    const plan = await BillingPlan.findOne({ code: payment.planCode });
    if (!plan) throw new ApiError(404, "Billing plan not found.");

    payment.status = "paid";
    payment.razorpayPaymentId = paymentId;
    payment.razorpaySignature = signature;
    payment.paidAt = new Date();
    await payment.save();

    const company = await applyPlanToCompany({ companyId: payment.companyId, plan, updatedBy: req.user._id });
    res.json(new ApiResponse(200, { payment, company }, "Subscription activated."));
  })
);

router.get(
  "/admin/plans",
  asyncHandler(async (req, res) => {
    ensureSuperAdmin(req.user);
    await seedDefaultPlans();
    const [plans, offers] = await Promise.all([
      BillingPlan.find().sort({ sortOrder: 1, priceInr: 1 }).lean(),
      PlanOffer.find().sort({ createdAt: -1 }).lean(),
    ]);
    res.json(new ApiResponse(200, { plans, offers }, "Billing admin data fetched."));
  })
);

router.get(
  "/admin/overview",
  asyncHandler(async (req, res) => {
    ensureSuperAdmin(req.user);

    const payments = await SubscriptionPayment.find()
      .populate("companyId", "companyName companyCode email subscriptionPlan subscriptionStatus subscriptionEndsAt")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const now = new Date();
    const soon = new Date(now);
    soon.setDate(soon.getDate() + 15);

    const companies = await Company.find().sort({ createdAt: -1 }).lean();
    const [activeSubscriptions, expiredSubscriptions, expiringSoon, summary] = await Promise.all([
      Company.find({ subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE, $or: [{ subscriptionEndsAt: null }, { subscriptionEndsAt: { $gte: now } }] }).sort({ subscriptionEndsAt: 1 }).lean(),
      Company.find({ $or: [{ subscriptionStatus: SUBSCRIPTION_STATUS.EXPIRED }, { subscriptionEndsAt: { $lt: now } }] }).sort({ subscriptionEndsAt: 1 }).lean(),
      Company.find({ subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE, subscriptionEndsAt: { $gte: now, $lte: soon } }).sort({ subscriptionEndsAt: 1 }).lean(),
      buildBillingSummary({ companies, payments, now }),
    ]);

    res.json(
      new ApiResponse(
        200,
        {
          summary,
          payments,
          activeSubscriptions,
          expiredSubscriptions,
          expiringSoon,
          gateway: {
            provider: "Razorpay",
            keyConfigured: Boolean(process.env.RAZORPAY_KEY_ID),
            secretConfigured: Boolean(process.env.RAZORPAY_KEY_SECRET),
            mode: process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET ? "live" : "demo",
            checkoutScript: "https://checkout.razorpay.com/v1/checkout.js",
          },
        },
        "Billing overview fetched."
      )
    );
  })
);
router.post(
  "/admin/plans",
  asyncHandler(async (req, res) => {
    ensureSuperAdmin(req.user);
    const payload = buildPlanPayload(req.body, req.user._id);
    const plan = await BillingPlan.findOneAndUpdate(
      { code: payload.code },
      { $set: payload, $setOnInsert: { createdBy: req.user._id } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(new ApiResponse(201, plan, "Billing plan saved."));
  })
);

router.patch(
  "/admin/plans/:id",
  asyncHandler(async (req, res) => {
    ensureSuperAdmin(req.user);
    const payload = { ...req.body, updatedBy: req.user._id };
    if (payload.features && !Array.isArray(payload.features)) payload.features = String(payload.features).split("\n").filter(Boolean);
    const plan = await BillingPlan.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!plan) throw new ApiError(404, "Billing plan not found.");
    res.json(new ApiResponse(200, plan, "Billing plan updated."));
  })
);

router.post(
  "/admin/offers",
  asyncHandler(async (req, res) => {
    ensureSuperAdmin(req.user);
    const offer = await PlanOffer.findOneAndUpdate(
      { code: String(req.body.code || req.body.title || "").replace(/[^a-z0-9]/gi, "").toUpperCase() },
      {
        title: req.body.title,
        description: req.body.description || "",
        planCode: String(req.body.planCode || "all").toLowerCase(),
        discountType: req.body.discountType || "percent",
        discountValue: Number(req.body.discountValue || 0),
        startsAt: req.body.startsAt || null,
        endsAt: req.body.endsAt || null,
        isActive: req.body.isActive !== false,
        createdBy: req.user._id,
        updatedBy: req.user._id,
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(new ApiResponse(201, offer, "Plan offer saved."));
  })
);

router.patch(
  "/admin/offers/:id",
  asyncHandler(async (req, res) => {
    ensureSuperAdmin(req.user);
    const offer = await PlanOffer.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user._id }, { new: true, runValidators: true });
    if (!offer) throw new ApiError(404, "Plan offer not found.");
    res.json(new ApiResponse(200, offer, "Plan offer updated."));
  })
);

router.patch(
  "/admin/companies/:companyId/plan",
  asyncHandler(async (req, res) => {
    ensureSuperAdmin(req.user);
    await seedDefaultPlans();
    const plan = await BillingPlan.findOne({ code: normalizePlanCode(req.body.planCode), isActive: true });
    if (!plan) throw new ApiError(404, "Active billing plan not found.");
    const company = await applyPlanToCompany({ companyId: req.params.companyId, plan, updatedBy: req.user._id });
    if (!company) throw new ApiError(404, "Company not found.");
    res.json(new ApiResponse(200, company, "Company plan changed by super admin."));
  })
);

export default router;







