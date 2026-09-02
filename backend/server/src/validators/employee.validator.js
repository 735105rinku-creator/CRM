import Joi from "joi";
import {
  EMPLOYEE_STATUS,
  EMPLOYMENT_TYPE,
  ORGANIZATION_ROLE,
  WORK_MODE,
} from "../models/Employee.js";

const optionalCode = Joi.string().trim().uppercase().max(50).allow("", null);

const addressSchema = Joi.object({
  addressLine1: Joi.string().trim().allow("", null),
  addressLine2: Joi.string().trim().allow("", null),
  city: Joi.string().trim().allow("", null),
  state: Joi.string().trim().allow("", null),
  country: Joi.string().trim().allow("", null),
  pincode: Joi.string().trim().allow("", null),
});

const emergencyContactSchema = Joi.object({
  name: Joi.string().trim().allow("", null),
  relation: Joi.string().trim().allow("", null),
  mobile: Joi.string().trim().allow("", null),
  alternateMobile: Joi.string().trim().allow("", null),
  address: Joi.string().trim().allow("", null),
});

const bankDetailsSchema = Joi.object({
  bankName: Joi.string().trim().allow("", null),
  branchName: Joi.string().trim().allow("", null),
  accountHolderName: Joi.string().trim().allow("", null),
  accountNumber: Joi.string().trim().allow("", null),
  ifscCode: Joi.string().trim().uppercase().allow("", null),
  upiId: Joi.string().trim().allow("", null),
  paymentMode: Joi.string()
    .valid("bank_transfer", "upi", "cash", "cheque", "")
    .default("bank_transfer"),
  isSalaryAccount: Joi.boolean().default(true),
  cancelledChequeUrl: Joi.string().trim().allow("", null),
}).default({});

const statutoryDetailsSchema = Joi.object({
  aadhaarNumber: Joi.string().trim().allow("", null),
  panNumber: Joi.string().trim().uppercase().allow("", null),
  uanNumber: Joi.string().trim().allow("", null),
  pfNumber: Joi.string().trim().allow("", null),
  esiNumber: Joi.string().trim().allow("", null),
  professionalTaxNumber: Joi.string().trim().allow("", null),
}).default({});

const leaveBalancesSchema = Joi.object({
  casual: Joi.number().min(0).default(7),
  sick: Joi.number().min(0).default(10),
  earned: Joi.number().min(0).default(0),
  lwp: Joi.number().min(0).default(0),
  year: Joi.number().integer().allow(null),
}).default({});

/**
 * Frontend-safe aliases.
 * This lets frontend accidentally send lower/snake-case names without breaking.
 * MongoDB ObjectId fields are intentionally not accepted.
 */
const withEmployeeAliases = (schema) => {
  return schema
    .rename("useremail", "userEmail", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("user_email", "userEmail", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("employeecode", "employeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("employee_code", "employeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("branchcode", "branchCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("branch_code", "branchCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("departmentcode", "departmentCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("department_code", "departmentCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("designationcode", "designationCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("designation_code", "designationCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("reportingmanagercode", "reportingManagerCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("reporting_manager_code", "reportingManagerCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("reportingmanageremployeecode", "reportingManagerEmployeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("reporting_manager_employee_code", "reportingManagerEmployeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("shiftcode", "shiftCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("shift_code", "shiftCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("salarystructurecode", "salaryStructureCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("salary_structure_code", "salaryStructureCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("structurecode", "structureCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("structure_code", "structureCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("attendancepolicycode", "attendancePolicyCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("attendance_policy_code", "attendancePolicyCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("leavepolicycode", "leavePolicyCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("leave_policy_code", "leavePolicyCode", {
      ignoreUndefined: true,
      override: true,
    });
};

const baseEmployeeSchema = Joi.object({
  companyId: Joi.string().trim().allow("", null),

  userEmail: Joi.string().email().lowercase().trim().allow("", null),

  employeeCode: optionalCode,
  employeePhoto: Joi.string().trim().allow("", null),

  firstName: Joi.string().trim().min(2).max(80).required(),
  middleName: Joi.string().trim().max(80).allow("", null),
  lastName: Joi.string().trim().min(2).max(80).required(),
  displayName: Joi.string().trim().max(180).allow("", null),

  gender: Joi.string()
    .valid("male", "female", "other", "prefer_not_to_say")
    .default("prefer_not_to_say"),

  dateOfBirth: Joi.date().allow("", null),

  bloodGroup: Joi.string()
    .valid("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "")
    .allow("", null),

  maritalStatus: Joi.string()
    .valid("single", "married", "divorced", "widowed", "")
    .allow("", null),

  nationality: Joi.string().trim().allow("", null),

  officialEmail: Joi.string().email().lowercase().trim().allow("", null),
  personalEmail: Joi.string().email().lowercase().trim().allow("", null),

  mobile: Joi.string().trim().required(),
  alternateMobile: Joi.string().trim().allow("", null),

  currentAddress: addressSchema.default({}),
  permanentAddress: addressSchema.default({}),
  emergencyContact: emergencyContactSchema.default({}),

  branchCode: optionalCode,
  departmentCode: optionalCode,
  designationCode: optionalCode,

  reportingManagerCode: optionalCode,
  reportingManagerEmployeeCode: optionalCode,

  organizationRole: Joi.string()
    .valid(...Object.values(ORGANIZATION_ROLE))
    .default(ORGANIZATION_ROLE.EMPLOYEE),
  customRoleTitle: Joi.string().trim().max(120).allow("", null),

  employmentType: Joi.string()
    .valid(...Object.values(EMPLOYMENT_TYPE))
    .default(EMPLOYMENT_TYPE.PERMANENT),

  workMode: Joi.string()
    .valid(...Object.values(WORK_MODE))
    .default(WORK_MODE.OFFICE),

  attendanceAllowedDevices: Joi.array()
    .items(Joi.string().valid("mobile", "tablet", "laptop", "desktop"))
    .min(1)
    .default(["desktop"]),

  workLocation: Joi.string().trim().allow("", null),

  shiftCode: optionalCode,

  joiningDate: Joi.date().required(),
  confirmationDate: Joi.date().allow("", null),
  probationEndDate: Joi.date().allow("", null),

  noticePeriodDays: Joi.number().integer().min(0).default(30),

  employeeStatus: Joi.string()
    .valid(...Object.values(EMPLOYEE_STATUS))
    .default(EMPLOYEE_STATUS.ACTIVE),

  salaryStructureCode: optionalCode,
  structureCode: optionalCode,

  attendancePolicyCode: optionalCode,

  leavePolicyCode: optionalCode,

  tags: Joi.array().items(Joi.string().trim()).default([]),
  notes: Joi.string().trim().allow("", null),

  bankDetails: bankDetailsSchema,
  statutoryDetails: statutoryDetailsSchema,
  leaveBalances: leaveBalancesSchema,

  createLoginAccount: Joi.boolean().default(false),
  password: Joi.string().trim().min(6).max(128).allow("", null),
});

export const createEmployeeSchema = withEmployeeAliases(baseEmployeeSchema);

export const updateEmployeeSchema = withEmployeeAliases(
  baseEmployeeSchema.fork(
    ["firstName", "lastName", "mobile", "joiningDate"],
    (schema) => schema.optional()
  )
);

export const updateWorkFromHomeAttendanceSchema = Joi.object({
  workFromHomeAttendanceAllowed: Joi.boolean().required(),
});

export const updateEmployeeStatusSchema = Joi.object({
  employeeStatus: Joi.string()
    .valid(...Object.values(EMPLOYEE_STATUS))
    .required(),

  exitDate: Joi.date().allow("", null),

  exitReason: Joi.string().trim().allow("", null),
});

export const employeeFamilySchema = Joi.object({
  members: Joi.array()
    .items(
      Joi.object({
        relation: Joi.string()
          .valid(
            "father",
            "mother",
            "spouse",
            "son",
            "daughter",
            "guardian",
            "other"
          )
          .required(),

        fullName: Joi.string().trim().min(2).required(),

        dateOfBirth: Joi.date().allow("", null),

        occupation: Joi.string().trim().allow("", null),

        mobile: Joi.string().trim().allow("", null),

        dependent: Joi.boolean().default(false),
      })
    )
    .default([]),
});

export const employeeBankSchema = Joi.object({
  bankName: Joi.string().trim().allow("", null),

  branchName: Joi.string().trim().allow("", null),

  accountHolderName: Joi.string().trim().allow("", null),

  accountNumber: Joi.string().trim().allow("", null),

  ifscCode: Joi.string().trim().uppercase().allow("", null),

  accountType: Joi.string().valid("saving", "current", "").default("saving"),

  upiId: Joi.string().trim().allow("", null),

  paymentMode: Joi.string()
    .valid("bank_transfer", "upi", "cash", "cheque", "")
    .default("bank_transfer"),

  isSalaryAccount: Joi.boolean().default(true),
  salaryAccount: Joi.boolean(),

  cancelledChequeUrl: Joi.string().trim().allow("", null),
  cancelledCheque: Joi.string().trim().allow("", null),
  passbookCopy: Joi.string().trim().allow("", null),
});

export const employeeStatutorySchema = Joi.object({
  aadhaarNumber: Joi.string().trim().allow("", null),

  panNumber: Joi.string().trim().uppercase().allow("", null),

  passportNumber: Joi.string().trim().uppercase().allow("", null),

  drivingLicenseNumber: Joi.string().trim().uppercase().allow("", null),

  uanNumber: Joi.string().trim().allow("", null),

  pfNumber: Joi.string().trim().allow("", null),

  esiNumber: Joi.string().trim().allow("", null),

  professionalTaxNumber: Joi.string().trim().allow("", null),

  labourWelfareNumber: Joi.string().trim().allow("", null),

  voterId: Joi.string().trim().uppercase().allow("", null),
});

export const employeeDocumentSchema = Joi.object({
  documents: Joi.array()
    .items(
      Joi.object({
        documentType: Joi.string()
          .valid(
            "resume",
            "aadhaar",
            "pan",
            "passport",
            "driving_license",
            "offer_letter",
            "appointment_letter",
            "joining_letter",
            "experience_letter",
            "education_certificate",
            "salary_revision",
            "warning_letter",
            "other"
          )
          .required(),

        fileName: Joi.string().trim().allow("", null),

        fileUrl: Joi.string().trim().required(),

        fileSize: Joi.number().allow(null),

        mimeType: Joi.string().trim().allow("", null),

        expiryDate: Joi.date().allow("", null),

        verified: Joi.boolean().default(false),

        remarks: Joi.string().trim().allow("", null),
      })
    )
    .default([]),
});





