import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import path from "path";

import { env } from "./config/env.js";
import { corsOptions } from "./config/cors.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import companyRoutes from "./routes/company.routes.js";
import companySettingsRoutes from "./routes/companySettings.routes.js";

import employeeRoutes from "./routes/employee.routes.js";
import recruitmentRoutes from "./routes/recruitment.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import leaveRoutes from "./routes/leave.routes.js";
import payrollRoutes from "./routes/payroll.routes.js";
import eventRoutes from "./routes/event.routes.js";
import holidayRoutes from "./routes/holiday.routes.js";
import meetingRoutes from "./routes/meeting.routes.js";
import hrDashboardRoutes from "./routes/hrDashboard.routes.js";
import hrReportRoutes from "./routes/hrReport.routes.js";
import communicationRoutes from "./routes/communication.routes.js";

import companyReportRoutes from "./routes/companyReport.routes.js";

import crmRoutes from "./routes/crm.routes.js";
import accountingRoutes from "./routes/accounting.routes.js";
import enterpriseRoutes from "./routes/enterprise.routes.js";
import billingRoutes from "./routes/billing.routes.js";

import logisticsRoutes from "./routes/logistics.routes.js";

import {
  requireAuth,
} from "./middleware/auth.middleware.js";

import {
  notFound,
  errorHandler,
} from "./middleware/error.middleware.js";


const app =
  express();

app.get("/test",
  (
    req,
    res
  ) => {
    console.log("Test endpoint hit.");
    res.send("Opas Bizz CRM API is running.");
  })
/* ============================================================
   HEALTH / VERSION
============================================================ */

app.get(
  "/health/version",
  (
    req,
    res
  ) => {

    res
      .status(200)
      .json({
        success:
          true,

        service:
          "Opas Bizz CRM API",

        version:
          "company-admin-sidebar-2026-08-05-v1",

        environment:
          process.env.NODE_ENV ||
          "development",

        timestamp:
          new Date()
            .toISOString(),
      });
  }
);


/* ============================================================
   PROXY
============================================================ */

/*
 * Trust first proxy hop so req.ip reflects
 * the real client IP behind cPanel / proxy.
 */
app.set(
  "trust proxy",
  1
);


/* ============================================================
   SECURITY
============================================================ */

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy:
        "cross-origin",
    },
  })
);


/* ============================================================
   CORS
============================================================ */

app.use(
  cors(
    corsOptions(
      env
    )
  )
);


/* ============================================================
   COMPRESSION
============================================================ */

app.use(
  compression()
);


/* ============================================================
   COOKIES
============================================================ */

app.use(
  cookieParser()
);


/* ============================================================
   BODY PARSERS
============================================================ */

app.use(
  express.json({
    limit:
      "256kb",
  })
);


app.use(
  express.urlencoded({
    extended:
      true,

    limit:
      "256kb",
  })
);


/* ============================================================
   STATIC UPLOADS
============================================================ */

/*
 * Existing CRM uploads.
 */
app.use(
  "/uploads",

  express.static(
    path.join(
      process.cwd(),
      "public",
      "uploads"
    ),

    {
      setHeaders: (
        res
      ) => {

        res.setHeader(
          "Access-Control-Allow-Origin",
          "*"
        );

        res.setHeader(
          "Cross-Origin-Resource-Policy",
          "cross-origin"
        );

        res.setHeader(
          "Cache-Control",
          "public, max-age=86400"
        );
      },
    }
  )
);


/*
 * Logistics Documents middleware currently stores files here:
 *
 * uploads/logistics-documents
 *
 * This is separate from:
 *
 * public/uploads
 *
 * Therefore expose it explicitly.
 *
 * Preview/download APIs remain protected;
 * this static path is only required if fileUrl
 * is used elsewhere in the CRM.
 */
app.use(
  "/uploads/logistics-documents",

  express.static(
    path.join(
      process.cwd(),
      "uploads",
      "logistics-documents"
    ),

    {
      setHeaders: (
        res
      ) => {

        res.setHeader(
          "Access-Control-Allow-Origin",
          "*"
        );

        res.setHeader(
          "Cross-Origin-Resource-Policy",
          "cross-origin"
        );

        res.setHeader(
          "Cache-Control",
          "private, max-age=3600"
        );
      },
    }
  )
);


/* ============================================================
   SAFE REQUEST LOGGER
============================================================ */

const SENSITIVE_KEYS = [
  "password",
  "oldPassword",
  "newPassword",
  "confirmPassword",
  "temporaryPassword",

  "token",
  "accessToken",
  "refreshToken",
  "resetToken",
  "verificationToken",
  "emailVerificationToken",
  "unlockToken",

  "otp",
  "secret",
  "apiKey",

  "authorization",
  "cookie",
];


const isSensitiveKey = (
  key
) => {

  const normalizedKey =
    String(
      key ||
      ""
    )
      .toLowerCase();


  return SENSITIVE_KEYS
    .some(
      (
        sensitiveKey
      ) =>
        normalizedKey
          .includes(
            sensitiveKey
              .toLowerCase()
          )
    );
};


const maskSensitiveData = (
  data
) => {

  if (
    !data ||
    typeof data !==
    "object"
  ) {

    return data;
  }


  if (
    Array.isArray(
      data
    )
  ) {

    return data.map(
      (
        item
      ) =>
        maskSensitiveData(
          item
        )
    );
  }


  const masked = {};


  for (
    const [
      key,
      value,
    ] of Object.entries(
      data
    )
  ) {

    if (
      isSensitiveKey(
        key
      )
    ) {

      masked[key] =
        "***MASKED***";

      continue;
    }


    if (
      value &&
      typeof value ===
      "object"
    ) {

      masked[key] =
        maskSensitiveData(
          value
        );

      continue;
    }


    masked[key] =
      value;
  }


  return masked;
};


app.use(
  (
    req,
    res,
    next
  ) => {

    const start =
      process
        .hrtime
        .bigint();


    console.log("");

    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

    console.log(
      `📥 ${req.method} ${req.originalUrl}`
    );

    console.log(
      `🕒 ${new Date().toLocaleString()}`
    );

    console.log(
      `🌐 IP          : ${req.ip}`
    );

    console.log(
      `🖥️ User-Agent  : ${req.get("user-agent") || "Unknown"}`
    );


    if (
      Object.keys(
        req.query ||
        {}
      ).length
    ) {

      console.log(
        "🔎 Query       :",
        maskSensitiveData(
          req.query
        )
      );
    }


    if (
      Object.keys(
        req.params ||
        {}
      ).length
    ) {

      console.log(
        "📌 Params      :",
        maskSensitiveData(
          req.params
        )
      );
    }


    if (
      req.body &&
      Object.keys(
        req.body
      ).length &&
      req.method !==
      "GET"
    ) {

      console.log(
        "📦 Body        :",
        maskSensitiveData(
          req.body
        )
      );
    }


    res.on(
      "finish",
      () => {

        const end =
          process
            .hrtime
            .bigint();


        const duration =
          Number(
            end -
            start
          ) /
          1e6;


        console.log(
          `📤 Status      : ${res.statusCode}`
        );

        console.log(
          `⏱️ Response    : ${duration.toFixed(2)} ms`
        );

        console.log(
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        );
      }
    );


    next();
  }
);


/* ============================================================
   ROOT
============================================================ */

app.get(
  "/",
  (
    req,
    res
  ) => {

    res.json({
      success:
        true,

      message:
        "OPAS CRM Backend Running",

      version:
        "1.0.0",

      apiUrl:
        env.API_PUBLIC_URL ||
        `${req.protocol}://${req.get("host")}`,
    });
  }
);


app.get(
  "/favicon.ico",
  (
    req,
    res
  ) => {

    res
      .status(204)
      .end();
  }
);


/* ============================================================
   AUTH / USER / COMPANY
============================================================ */

app.use(
  "/auth",
  authRoutes
);


app.use(
  "/users",
  userRoutes
);


app.use(
  "/companies",
  companyRoutes
);


app.use(
  "/company-settings",
  companySettingsRoutes
);


/* ============================================================
   HR
============================================================ */

app.use(
  "/hr/employees",
  employeeRoutes
);


app.use(
  "/hr/recruitment",
  recruitmentRoutes
);


app.use(
  "/hr/attendance",
  attendanceRoutes
);


app.use(
  "/hr/leave",
  leaveRoutes
);


app.use(
  "/hr/payroll",
  payrollRoutes
);


app.use(
  "/hr/events",
  eventRoutes
);


app.use(
  "/hr/holidays",
  holidayRoutes
);


app.use(
  "/hr/meetings",
  meetingRoutes
);


app.use(
  "/hr/dashboard",
  hrDashboardRoutes
);


app.use(
  "/hr/reports",
  hrReportRoutes
);


app.use(
  "/hr/communication",
  communicationRoutes
);


/* ============================================================
   COMPANY REPORTS
============================================================ */

app.use(
  "/company/reports",
  companyReportRoutes
);


/* ============================================================
   CRM
============================================================ */

app.use(
  "/crm",
  crmRoutes
);


/* ============================================================
   ACCOUNTING
============================================================ */

app.use(
  "/accounting",
  accountingRoutes
);


/* ============================================================
   LOGISTICS
============================================================ */

/*
 * All Logistics submodules are mounted here:
 *
 * /logistics/dashboard
 * /logistics/shipments
 * /logistics/shipments/air-cargo
 * /logistics/shipments/sea-freight
 * /logistics/documents
 * /logistics/documents/summary
 * /logistics/documents/:id
 * etc.
 */
app.use(
  "/logistics",
  logisticsRoutes
);


/* ============================================================
   BILLING
============================================================ */

app.use(
  "/billing",
  billingRoutes
);


app.use(
  "/api/billing",
  billingRoutes
);


/* ============================================================
   ENTERPRISE
============================================================ */

app.use(
  "/api",
  enterpriseRoutes
);


/* ============================================================
   LEGACY / PLACEHOLDER CRM ENDPOINTS
============================================================ */

const crmModuleResponse = (
  moduleName
) => ({
  items: [],
  total: 0,
  module:
    moduleName,

  message:
    `${moduleName} module is ready for implementation.`,
});


app.get(
  "/dashboard/stats",

  requireAuth,

  (
    req,
    res
  ) => {

    res.json({
      stats: {
        totalLeadsThisMonth:
          128,

        leadsChangePercent:
          18,

        dealsWon:
          24,

        dealsWonRevenue:
          842000,

        pendingInvoices:
          16,

        pendingInvoicesAmount:
          356000,

        monthlyRevenue:
          1240000,

        revenueSparkline: [
          42,
          55,
          48,
          68,
          72,
          91,
          84,
          104,
        ],
      },


      revenueLastSixMonths: [
        {
          month:
            "Jan",

          revenue:
            640000,
        },

        {
          month:
            "Feb",

          revenue:
            720000,
        },

        {
          month:
            "Mar",

          revenue:
            690000,
        },

        {
          month:
            "Apr",

          revenue:
            940000,
        },

        {
          month:
            "May",

          revenue:
            1080000,
        },

        {
          month:
            "Jun",

          revenue:
            1240000,
        },
      ],


      leadsBySource: [
        {
          source:
            "Website",

          count:
            44,
        },

        {
          source:
            "Referral",

          count:
            31,
        },

        {
          source:
            "Cold Call",

          count:
            22,
        },

        {
          source:
            "Social Media",

          count:
            19,
        },

        {
          source:
            "Other",

          count:
            12,
        },
      ],


      recentLeads: [
        {
          id:
            "lead_1",

          name:
            "Rohit Mehta",

          company:
            "Apex Traders",

          status:
            "New",

          assignedTo:
            "Priya",

          date:
            "2026-06-28",
        },

        {
          id:
            "lead_2",

          name:
            "Sneha Kapoor",

          company:
            "Bluewave Tech",

          status:
            "Qualified",

          assignedTo:
            "Amit",

          date:
            "2026-06-27",
        },
      ],


      recentInvoices: [
        {
          id:
            "inv_1",

          invoiceNumber:
            "OPB-1008",

          client:
            "Apex Traders",

          amount:
            84000,

          status:
            "Pending",

          dueDate:
            "2026-07-05",
        },

        {
          id:
            "inv_2",

          invoiceNumber:
            "OPB-1007",

          client:
            "Bluewave Tech",

          amount:
            126000,

          status:
            "Paid",

          dueDate:
            "2026-07-02",
        },
      ],


      activities: [
        {
          id:
            "act_1",

          type:
            "lead",

          title:
            "New lead added",

          description:
            "Rohit Mehta was added from website enquiry.",

          timestamp:
            "2026-06-29T10:15:00+05:30",

          user: {
            name:
              "Priya Shah",
          },
        },

        {
          id:
            "act_2",

          type:
            "invoice",

          title:
            "Invoice paid",

          description:
            "OPB-1007 payment marked as received.",

          timestamp:
            "2026-06-28T17:20:00+05:30",

          user: {
            name:
              "Neha Singh",
          },
        },
      ],
    });
  }
);


[
  "leads",
  "contacts",
  "accounts",
  "deals",
  "invoices",
  "payments",
  "expenses",
  "quotations",
]
  .forEach(
    (
      moduleName
    ) => {

      app.get(
        `/${moduleName}`,

        requireAuth,

        (
          req,
          res
        ) => {

          res.json(
            crmModuleResponse(
              moduleName
            )
          );
        }
      );
    }
  );


/* ============================================================
   ERROR HANDLERS
============================================================ */

app.use(
  notFound
);


app.use(
  errorHandler
);


export default app;
