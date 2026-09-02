export const PERMISSIONS = Object.freeze({
  AUTH_ME: "auth:me",

  PROFILE_READ: "profile:read",
  PROFILE_UPDATE: "profile:update",

  COMPANY_CREATE: "company:create",
  COMPANY_READ: "company:read",
  COMPANY_UPDATE: "company:update",
  COMPANY_DELETE: "company:delete",
  COMPANY_STATUS_UPDATE: "company:status-update",
  COMPANY_ADMIN_CREATE: "company:admin-create",
  COMPANY_PROFILE_READ: "company:profile-read",
  COMPANY_PROFILE_UPDATE: "company:profile-update",

  USER_CREATE: "user:create",
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  USER_BLOCK: "user:block",
  USER_UNBLOCK: "user:unblock",
  USER_RESET_PASSWORD: "user:reset-password",
  USER_ASSIGN_ROLE: "user:assign-role",
  USER_ASSIGN_PERMISSION: "user:assign-permission",

  HR_CREATE: "hr:create",
  HR_READ: "hr:read",
  HR_UPDATE: "hr:update",

  SUPPORT_CREATE: "support:create",
  SUPPORT_READ: "support:read",
  SUPPORT_UPDATE: "support:update",

  EMPLOYEE_CREATE: "employee:create",
  EMPLOYEE_READ: "employee:read",
  EMPLOYEE_UPDATE: "employee:update",
  EMPLOYEE_DELETE: "employee:delete",

  ATTENDANCE_MANAGE: "attendance:manage",
  ATTENDANCE_SELF: "attendance:self",

  LEAVE_MANAGE: "leave:manage",
  LEAVE_SELF: "leave:self",

  PAYROLL_MANAGE: "payroll:manage",
  PAYROLL_READ: "payroll:read",

  TICKET_CREATE: "ticket:create",
  TICKET_READ: "ticket:read",
  TICKET_UPDATE: "ticket:update",
  TICKET_SELF: "ticket:self",
  TICKET_MANAGE: "ticket:manage",

  NOTIFICATION_READ: "notification:read",
  NOTIFICATION_MANAGE: "notification:manage",

  REPORT_READ: "report:read",
  REPORT_MANAGE: "report:manage",

  SETTING_MANAGE: "setting:manage",

  PLATFORM_DASHBOARD_READ: "platform:dashboard-read",
  PLATFORM_SETTING_MANAGE: "platform:setting-manage",
});