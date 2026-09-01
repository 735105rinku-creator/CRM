import { Company } from './company.model';

export type UserRole = 'super_admin' | 'company_admin' | 'manager' | 'sales' | 'accounts' | 'support' | 'hr' | 'employee';
export type UserStatus = 'active' | 'invited' | 'blocked' | 'inactive';

export interface UserPermissions {
  leads: string[];
  contacts: string[];
  deals: string[];
  invoices: string[];
  reports: string[];
  settings: string[];
}

export interface UserProfile {
  avatarUrl?: string;
  designation?: string;
  department?: string;
  phone?: string;
}

export interface StructuredPermission {
  module?: string;
  subModule?: string;
  view?: boolean;
  viewScope?: 'own' | 'team' | 'all';
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  updateStatus?: boolean;
  [key: string]: unknown;
}

export type PermissionEntry = string | StructuredPermission;

export interface EnterpriseRoleRef {
  id?: string;
  _id?: string;
  name?: string;
  level?: number;
  permissions?: PermissionEntry[];
}

export interface DepartmentRef {
  _id?: string;
  id?: string;
  departmentName?: string;
  departmentCode?: string;
  featureKey?: string;
  dashboardKey?: string;
  accessModules?: string[];
}

export interface User {
  id: string;
  companyId: string;
  company?: Company;
  roleRef?: EnterpriseRoleRef;
  roleLevel?: number;
  departmentRef?: string | DepartmentRef;
  reportingTo?: string;
  name: string;
  email: string;
  role: UserRole | string;
  roles?: string[];
  permissions?: UserPermissions | PermissionEntry[];
  mobile?: string;
  profileImage?: string;
  department?: string;
  designation?: string;
  status: UserStatus;
  profile?: UserProfile;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JwtUserPayload {
  sub?: string;
  id?: string;
  companyId?: string;
  name?: string;
  email?: string;
  role?: string;
  roles?: string[];
  roleRef?: EnterpriseRoleRef | string | null;
  roleLevel?: number;
  permissions?: PermissionEntry[];
  exp?: number;
  iat?: number;
  [claim: string]: unknown;
}


