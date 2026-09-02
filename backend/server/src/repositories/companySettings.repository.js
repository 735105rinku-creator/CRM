import { Branch } from "../models/Branch.js";
import { Department } from "../models/Department.js";
import { Designation } from "../models/Designation.js";
import { Holiday } from "../models/Holiday.js";

/* ---------------- Branch ---------------- */

export const createBranch = (payload) => Branch.create(payload);

export const updateBranch = (id, payload) =>
  Branch.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

export const deleteBranch = (id) => Branch.findByIdAndDelete(id);

export const findBranch = (id) => Branch.findById(id);

export const findBranchByCode = (companyId, branchCode) => {
  if (!branchCode) return null;

  return Branch.findOne({
    companyId,
    branchCode: String(branchCode).trim().toUpperCase(),
  });
};

export const listBranches = (companyId) =>
  Branch.find({ companyId }).sort({ branchName: 1 });

/* ---------------- Department ---------------- */

export const createDepartment = (payload) => Department.create(payload);

export const updateDepartment = (id, payload) =>
  Department.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

export const deleteDepartment = (id) => Department.findByIdAndDelete(id);

export const findDepartment = (id) => Department.findById(id);

export const findDepartmentByCode = (companyId, departmentCode) => {
  if (!departmentCode) return null;

  return Department.findOne({
    companyId,
    departmentCode: String(departmentCode).trim().toUpperCase(),
  });
};

export const listDepartments = (companyId) =>
  Department.find({ companyId }).populate("branchId").sort({ departmentName: 1 });

/* ---------------- Designation ---------------- */

export const createDesignation = (payload) => Designation.create(payload);

export const updateDesignation = (id, payload) =>
  Designation.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

export const deleteDesignation = (id) => Designation.findByIdAndDelete(id);

export const findDesignation = (id) => Designation.findById(id);

export const findDesignationByCode = (companyId, designationCode) => {
  if (!designationCode) return null;

  return Designation.findOne({
    companyId,
    designationCode: String(designationCode).trim().toUpperCase(),
  });
};

export const listDesignations = (companyId) =>
  Designation.find({ companyId })
    .populate("departmentId")
    .sort({ level: 1, designationName: 1 });

/* ---------------- Holiday ---------------- */

export const createHoliday = (payload) => Holiday.create(payload);

export const updateHoliday = (id, payload) =>
  Holiday.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

export const deleteHoliday = (id) => Holiday.findByIdAndDelete(id);

export const findHoliday = (id) => Holiday.findById(id);

export const listHolidays = (companyId) =>
  Holiday.find({ companyId })
    .populate("branchId")
    .sort({ date: 1 });
