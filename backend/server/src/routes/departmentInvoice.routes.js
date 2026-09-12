import { Router } from "express";
import { listDepartmentInvoices, getDepartmentInvoice, verifyDepartmentInvoice, rejectDepartmentInvoice, payDepartmentInvoice } from "../controllers/departmentInvoice.controller.js";

const router = Router();
router.get("/", listDepartmentInvoices);
router.get("/:id", getDepartmentInvoice);
router.patch("/:id/verify", verifyDepartmentInvoice);
router.patch("/:id/reject", rejectDepartmentInvoice);
router.post("/:id/payments", payDepartmentInvoice);
export default router;
