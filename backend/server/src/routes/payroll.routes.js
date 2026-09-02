import { Router } from "express";

import {
  getPayrollDashboard,

  createSalaryComponent,
  getSalaryComponents,
  updateSalaryComponent,
  deleteSalaryComponent,

  createSalaryStructure,
  getSalaryStructures,
  updateSalaryStructure,
  deleteSalaryStructure,

  assignEmployeeSalary,
  getEmployeeSalaries,
  updateEmployeeSalary,

  createPayrollRun,
  getPayrollRuns,
  processPayrollRun,
  updatePayrollStatus,

  getPayslips,
  getPayslipById,
  updatePayslipStatus,
  generatePayslipPdf,
  downloadPayslipPdf,
} from "../controllers/payroll.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

import { requireTenant } from "../middleware/tenant.middleware.js";

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

/* ================= DASHBOARD ================= */

router.get(
  "/dashboard",
  getPayrollDashboard
);

/* ================= SALARY COMPONENT ================= */

router.post(
  "/components",
  createSalaryComponent
);

router.get(
  "/components",
  getSalaryComponents
);

router.patch(
  "/components/:id",
  updateSalaryComponent
);

router.delete(
  "/components/:id",
  deleteSalaryComponent
);

/* ================= SALARY STRUCTURE ================= */

router.post(
  "/structures",
  createSalaryStructure
);

router.get(
  "/structures",
  getSalaryStructures
);

router.patch(
  "/structures/:id",
  updateSalaryStructure
);

router.delete(
  "/structures/:id",
  deleteSalaryStructure
);

/* ================= EMPLOYEE SALARY ================= */

router.post(
  "/employee-salaries",
  assignEmployeeSalary
);

router.get(
  "/employee-salaries",
  getEmployeeSalaries
);

router.patch(
  "/employee-salaries/:id",
  updateEmployeeSalary
);

/* ================= PAYROLL RUN ================= */

router.post(
  "/runs",
  createPayrollRun
);

router.get(
  "/runs",
  getPayrollRuns
);

router.post(
  "/runs/:id/process",
  processPayrollRun
);

router.patch(
  "/runs/:id/status",
  updatePayrollStatus
);

/* ================= PAYSLIP ================= */

router.get(
  "/payslips",
  getPayslips
);

router.get(
  "/payslips/:id",
  getPayslipById
);

router.patch(
  "/payslips/:id/status",
  updatePayslipStatus
);

router.post(
    "/payslips/:id/generate-pdf",
    generatePayslipPdf
  );
  router.get(
    "/payslips/:id/pdf",
    downloadPayslipPdf
  );

export default router;
