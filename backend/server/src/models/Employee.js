import mongoose from "mongoose";

export const EMPLOYEE_STATUS = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
  PROBATION: "probation",
  CONFIRMED: "confirmed",
  NOTICE_PERIOD: "notice_period",
  RESIGNED: "resigned",
  TERMINATED: "terminated",
  ABSCONDED: "absconded",
  RETIRED: "retired",
});

export const EMPLOYMENT_TYPE = Object.freeze({
  PERMANENT: "permanent",
  PROBATION: "probation",
  CONTRACT: "contract",
  INTERN: "intern",
  CONSULTANT: "consultant",
  PART_TIME: "part_time",
  FREELANCER: "freelancer",
});

export const WORK_MODE = Object.freeze({
  OFFICE: "office",
  REMOTE: "remote",
  HYBRID: "hybrid",
  FIELD: "field",
});

export const ORGANIZATION_ROLE = Object.freeze({
  DEPARTMENT_HEAD: "department_head",
  TEAM_LEADER: "team_leader",
  EMPLOYEE: "employee",
  CUSTOM: "custom",
});

const addressSchema = new mongoose.Schema(
  {
    addressLine1: { type: String, trim: true, default: "" },
    addressLine2: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "India" },
    pincode: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    relation: { type: String, trim: true, default: "" },
    mobile: { type: String, trim: true, default: "" },
    alternateMobile: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const employeeSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    employeeCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    employeePhoto: {
      type: String,
      trim: true,
      default: "",
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    middleName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 80,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    displayName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 180,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
      default: "prefer_not_to_say",
    },

    dateOfBirth: {
      type: Date,
      default: null,
    },

    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""],
      default: "",
    },

    maritalStatus: {
      type: String,
      enum: ["single", "married", "divorced", "widowed", ""],
      default: "",
    },

    nationality: {
      type: String,
      trim: true,
      default: "Indian",
    },

    officialEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },

    personalEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },

    mobile: {
      type: String,
      trim: true,
      required: true,
    },

    alternateMobile: {
      type: String,
      trim: true,
      default: "",
    },

    currentAddress: {
      type: addressSchema,
      default: {},
    },

    permanentAddress: {
      type: addressSchema,
      default: {},
    },

    emergencyContact: {
      type: emergencyContactSchema,
      default: {},
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
      index: true,
    },

    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
      default: null,
      index: true,
    },

    reportingManagerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
      index: true,
    },

    organizationRole: {
      type: String,
      enum: Object.values(ORGANIZATION_ROLE),
      default: ORGANIZATION_ROLE.EMPLOYEE,
      index: true,
    },

    customRoleTitle: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },

    employmentType: {
      type: String,
      enum: Object.values(EMPLOYMENT_TYPE),
      default: EMPLOYMENT_TYPE.PERMANENT,
    },

    workMode: {
      type: String,
      enum: Object.values(WORK_MODE),
      default: WORK_MODE.OFFICE,
    },

    attendanceAllowedDevices: {
      type: [String],
      enum: ["mobile", "tablet", "laptop", "desktop"],
      default: ["desktop"],
    },

    workLocation: {
      type: String,
      trim: true,
      default: "",
    },

    workFromHomeAttendanceAllowed: {
      type: Boolean,
      default: false,
      index: true,
    },

    workFromHomeAttendanceAllowedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    workFromHomeAttendanceAllowedAt: {
      type: Date,
      default: null,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      default: null,
    },

    joiningDate: {
      type: Date,
      required: true,
    },

    confirmationDate: {
      type: Date,
      default: null,
    },

    probationEndDate: {
      type: Date,
      default: null,
    },

    noticePeriodDays: {
      type: Number,
      default: 30,
      min: 0,
    },

    exitDate: {
      type: Date,
      default: null,
    },

    exitReason: {
      type: String,
      trim: true,
      default: "",
    },

    employeeStatus: {
      type: String,
      enum: Object.values(EMPLOYEE_STATUS),
      default: EMPLOYEE_STATUS.ACTIVE,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    salaryStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalaryStructure",
      default: null,
    },

    attendancePolicyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttendancePolicy",
      default: null,
    },

    leavePolicyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeavePolicy",
      default: null,
    },

    tags: {
      type: [String],
      default: [],
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

employeeSchema.pre("validate", async function () {
  if (!this.displayName) {
    this.displayName = [this.firstName, this.middleName, this.lastName]
      .filter(Boolean)
      .join(" ");
  }
});

employeeSchema.index({ companyId: 1, employeeCode: 1 }, { unique: true });
employeeSchema.index({ companyId: 1, officialEmail: 1 }, { sparse: true });
employeeSchema.index({ companyId: 1, mobile: 1 });
employeeSchema.index({ companyId: 1, departmentId: 1 });
employeeSchema.index({ companyId: 1, branchId: 1 });
employeeSchema.index({ companyId: 1, employeeStatus: 1 });

export const Employee = mongoose.model("Employee", employeeSchema);






