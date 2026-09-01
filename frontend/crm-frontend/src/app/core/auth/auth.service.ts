import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Router } from '@angular/router';
import { map, Observable, of, tap } from 'rxjs';

import { Company } from '../models/company.model';
import { API_BASE_URL, ENABLE_DEMO_LOGIN, apiUrl } from '../config/api.config';
import { DepartmentRef, JwtUserPayload, User } from '../models/user.model';

export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  user?: User;
  sessionId?: string;
}

export interface ApiResponse<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

export interface CompanyRegistrationResponse extends AuthResponse {
  company?: unknown;
  admin?: unknown;
  nextStep?: string;
  verificationEmailSent?: boolean;
}

export interface CompanyRegistrationPayload {
  companyName: string;
  companyCode: string;
  companyEmail: string;
  companyPhone: string;
  companyCountryCode?: string;
  country: string;
  adminName: string;
  adminEmail: string;
  adminMobile: string;
  adminCountryCode?: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  companyPan?: string;
  companyGst?: string;
  industry?: string;
  employeeCount?: string;
  registeredAddress?: string;
  website?: string;
  logo?: File;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly demoEmail = 'admin@opasbizz.com';
  private readonly demoPassword = 'Admin@123';
  private readonly accessTokenKey = 'accessToken';
  private readonly refreshTokenKey = 'refreshToken';
  private readonly userKey = 'user';
  private readonly isBrowser: boolean;

  readonly currentUser = signal<User | JwtUserPayload | null>(null);

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.currentUser.set(this.loadStoredUser());
  }

  login(email: string, password: string, role = 'company_admin'): Observable<AuthResponse> {
    if (this.isDemoLogin(email, password)) {
      return of(this.createDemoSession(role)).pipe(tap((response) => this.storeSession(response)));
    }

    return this.http.post<ApiResponse<AuthResponse> | AuthResponse>(apiUrl('/auth/login'), { email, password, role }, { withCredentials: true }).pipe(
      map((response) => this.unwrapAuthResponse(response)),
      tap((response) => this.storeSession(response))
    );
  }

  registerCompany(payload: CompanyRegistrationPayload): Observable<ApiResponse<CompanyRegistrationResponse>> {
    const body = this.toRegistrationBody(payload);

    return this.http
      .post<ApiResponse<CompanyRegistrationResponse>>(apiUrl('/auth/register-company'), body, { withCredentials: true })
      .pipe(tap((response) => {
        if (response.data?.accessToken || response.data?.user) {
          this.storeSession(this.unwrapAuthResponse(response.data));
        }
      }));
  }

  logout(redirect = true): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.accessTokenKey);
      localStorage.removeItem(this.refreshTokenKey);
      localStorage.removeItem(this.userKey);
    }

    this.currentUser.set(null);

    if (redirect) {
      void this.router.navigate(['/login']);
    }
  }

  refreshToken(): Observable<AuthResponse> {
    return this.http
      .post<ApiResponse<AuthResponse> | AuthResponse>(
        apiUrl('/auth/refresh-token'),
        { refreshToken: this.getRefreshToken() },
        { withCredentials: true }
      )
      .pipe(
        map((response) => this.unwrapAuthResponse(response)),
        tap((response) => this.storeSession(response))
      );
  }

  updateCurrentUserProfileImage(profileImage: string): void {
    const image = String(profileImage || '').trim();
    if (!image) return;

    const current = this.getCurrentUser();
    if (!current) return;

    const next = { ...current, profileImage } as User | JwtUserPayload;
    this.currentUser.set(next);

    if (this.isBrowser) {
      localStorage.setItem(this.userKey, JSON.stringify(next));
    }
  }

  getCurrentUser(): User | JwtUserPayload | null {
    const tokenUser = this.decodeAccessToken();
    const storedUser = this.loadStoredUser();
    const user = storedUser ?? tokenUser;

    this.currentUser.set(user);
    return user;
  }

  isLoggedIn(): boolean {
    const token = this.getAccessToken();

    if (!token) {
      return Boolean(this.loadStoredUser());
    }

    const payload = this.decodeJwt(token);
    const expiresAt = payload?.exp;

    return !expiresAt || expiresAt * 1000 > Date.now();
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();

    if (!user) {
      return false;
    }

    const roles = new Set<string>();
    const primaryRole = 'role' in user ? user.role : undefined;

    if (primaryRole) {
      roles.add(String(primaryRole));
    }

    if ('roles' in user && Array.isArray(user.roles)) {
      user.roles.forEach((userRole) => roles.add(userRole));
    }

    return roles.has('super_admin') || roles.has(role);
  }

  hasStructuredPermission(module: string, subModule: string, action: 'view' | 'create' | 'edit' | 'delete' | 'updateStatus' = 'view'): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    const entries = [
      ...(('permissions' in user && Array.isArray(user.permissions)) ? user.permissions : []),
      ...(('roleRef' in user && user.roleRef && typeof user.roleRef === 'object' && Array.isArray(user.roleRef.permissions)) ? user.roleRef.permissions : [])
    ];

    const structuredEntries = entries.filter((entry) => entry && typeof entry === 'object') as Array<Record<string, unknown>>;
    const explicit = structuredEntries.find((permission) => permission['module'] === module && permission['subModule'] === subModule);
    if (explicit) return explicit[action] === true;

    return this.hasDefaultStructuredPermission(module, subModule, action);
  }

  private hasDefaultStructuredPermission(module: string, subModule: string, action: 'view' | 'create' | 'edit' | 'delete' | 'updateStatus'): boolean {
    if (module !== 'logistics') return false;

    const role = String(this.getCurrentUser()?.role || '').toLowerCase();
    const roleRef = this.getCurrentUser() && 'roleRef' in this.getCurrentUser()! && this.getCurrentUser()!.roleRef && typeof this.getCurrentUser()!.roleRef === 'object'
      ? String((this.getCurrentUser()!.roleRef as { name?: string }).name || '').toLowerCase()
      : '';
    const roleNames = [role, roleRef];
    const fullAccess = roleNames.some((name) => ['super_admin', 'company_admin', 'manager', 'department_head', 'team_leader'].includes(name));
    const hrReadOnly = roleNames.some((name) => ['hr', 'hr_manager'].includes(name));
    const employeeModules = ['airCargo', 'seaFreight', 'tracking', 'documents'];
    const employee = roleNames.includes('employee');

    if (fullAccess) return true;
    if (hrReadOnly) return action === 'view';
    if (employee) return employeeModules.includes(subModule) && (action === 'view' || action === 'updateStatus');
    return false;
  }

  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (this.getRoleLevel() === 0 || this.hasRole('super_admin')) return true;
    const roleFallbacks: Record<string, string[]> = {
      company_admin: ['manage_company', 'manage_departments', 'manage_users', 'view_reports'],
      hr: ['manage_users', 'approve_leaves', 'view_reports'],
      employee: ['view_self', 'request_leave', 'mark_attendance']
    };
    const permissions = new Set<string>();
    if ('permissions' in user && Array.isArray(user.permissions)) {
      user.permissions.forEach((item) => { if (typeof item === 'string') permissions.add(item); });
    }
    const roleRef = 'roleRef' in user && user.roleRef && typeof user.roleRef === 'object' ? user.roleRef : null;
    if (roleRef && Array.isArray(roleRef.permissions)) {
      roleRef.permissions.forEach((item) => { if (typeof item === 'string') permissions.add(item); });
    }
    const role = 'role' in user ? String(user.role || '') : '';
    (roleFallbacks[role] || []).forEach((item) => permissions.add(item));
    return permissions.has(permission);
  }

  getRoleLevel(): number {
    const user = this.getCurrentUser();
    if (!user) return 99;
    if ('roleLevel' in user && typeof user.roleLevel === 'number') return user.roleLevel;
    const roleRef = 'roleRef' in user && user.roleRef && typeof user.roleRef === 'object' ? user.roleRef : null;
    if (roleRef && typeof roleRef.level === 'number') return roleRef.level;
    if ('role' in user && user.role === 'super_admin') return 0;
    if ('role' in user && user.role === 'company_admin') return 1;
    if ('role' in user && user.role === 'hr') return 2;
    return 4;
  }

  getDefaultRedirectUrl(): string {
    const level = this.getRoleLevel();
    if (level === 0) return '/super-admin/dashboard';
    if (level === 1) return '/company/dashboard';
    if (this.hasRole('employee') && this.isLogisticsUser()) return '/logistics/dashboard';
    if (level >= 2 && level < 99) return '/employee/dashboard';

    if (this.hasRole('super_admin')) {
      return '/super-admin';
    }

    if (this.hasRole('hr')) {
      return '/hr-dashboard';
    }

    if (this.hasRole('employee')) {
      return '/employee-dashboard';
    }

    if (this.hasRole('accounts')) {
      return '/invoices';
    }

    return '/dashboard';
  }

  isLogisticsUser(user = this.getCurrentUser()): boolean {
    if (!user) {
      return false;
    }

    const userWithDepartment = user as {
      department?: string;
      departmentRef?: DepartmentRef | string | null;
      profile?: { department?: string };
    };

    return this.hasLogisticsDepartment([
      userWithDepartment.department,
      userWithDepartment.profile?.department,
      userWithDepartment.departmentRef
    ]);
  }

  hasLogisticsDepartment(values: unknown[]): boolean {
    return values
      .flatMap((value) => this.departmentValues(value))
      .map((value) => String(value ?? '').trim().toLowerCase())
      .filter(Boolean)
      .some((value) =>
        value === 'logistics' ||
        value === 'logistic' ||
        value === 'logistics-department' ||
        value === 'logistics department' ||
        /\blogistics?\b/i.test(value)
      );
  }

  getAccessToken(): string | null {
    return this.isBrowser ? localStorage.getItem(this.accessTokenKey) : null;
  }

  getRefreshToken(): string | null {
    return this.isBrowser ? localStorage.getItem(this.refreshTokenKey) : null;
  }

  private unwrapAuthResponse(response: ApiResponse<AuthResponse> | AuthResponse): AuthResponse {
    const authResponse = 'data' in response && response.data ? response.data : (response as AuthResponse);

    if (authResponse.user) {
      authResponse.user = this.normalizeUser(authResponse.user);
    }

    return authResponse;
  }

  private normalizeUser(user: User & { _id?: string; companyId?: string | Company }): User {
    const companyIdValue = user.companyId;
    const backendCompany =
      companyIdValue && typeof companyIdValue === 'object'
        ? (companyIdValue as Company & { _id?: string; companyName?: string; companyCode?: string })
        : undefined;
    const userCompany =
      user.company && typeof user.company === 'object'
        ? (user.company as Company & { _id?: string; companyName?: string; companyCode?: string; logo?: string })
        : undefined;
    const rawCompany = userCompany || backendCompany;

    const primaryRole = String(user.role || '');

    return {
      ...user,
      id: user.id || user._id || '',
      roleLevel: user.roleLevel ?? user.roleRef?.level,
      roleRef: user.roleRef
        ? {
            ...user.roleRef,
            id: user.roleRef.id || user.roleRef._id || ''
          }
        : undefined,
      companyId: typeof companyIdValue === 'string' ? companyIdValue : rawCompany?.id || rawCompany?._id || '',
      company: rawCompany
        ? {
            ...rawCompany,
            id: rawCompany.id || rawCompany._id || '',
            name: rawCompany.name || rawCompany.companyName || 'Registered Company',
            slug: rawCompany.slug || rawCompany.companyCode || 'company',
            logoUrl: this.resolveAssetUrl(rawCompany.logoUrl || rawCompany.logo)
          }
        : undefined,
      roles: primaryRole === 'super_admin' ? ['super_admin'] : user.roles || [primaryRole]
    } as User;
  }

  private toRegistrationBody(payload: CompanyRegistrationPayload): FormData | CompanyRegistrationPayload {
    if (!payload.logo) {
      return payload;
    }

    const formData = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }

      formData.append(key, value instanceof File ? value : String(value));
    });

    return formData;
  }

  private resolveAssetUrl(value?: string): string | undefined {
    if (!value) return undefined;
    if (/^https?:\/\//i.test(value)) return value;
    return apiUrl(value);
  }

  private departmentValues(value: unknown): unknown[] {
    if (!value) {
      return [];
    }

    if (typeof value === 'string') {
      return [value];
    }

    if (typeof value !== 'object') {
      return [value];
    }

    const department = value as DepartmentRef;

    return [
      department.departmentName,
      department.departmentCode,
      department.featureKey,
      department.dashboardKey,
      ...(Array.isArray(department.accessModules) ? department.accessModules : [])
    ];
  }

  private storeSession(response: AuthResponse): void {
    if (!this.isBrowser) {
      return;
    }

    if (response.accessToken) {
      localStorage.setItem(this.accessTokenKey, response.accessToken);
    } else {
      localStorage.removeItem(this.accessTokenKey);
    }

    if (response.refreshToken) {
      localStorage.setItem(this.refreshTokenKey, response.refreshToken);
    } else {
      localStorage.removeItem(this.refreshTokenKey);
    }

    if (response.user) {
      localStorage.setItem(this.userKey, JSON.stringify(response.user));
      this.currentUser.set(response.user);
    }
  }

  private loadStoredUser(): User | null {
    if (!this.isBrowser) {
      return null;
    }

    const storedUser = localStorage.getItem(this.userKey);

    if (!storedUser) {
      return null;
    }

    try {
      return this.normalizeUser(JSON.parse(storedUser) as User & { _id?: string; companyId?: string | Company });
    } catch {
      localStorage.removeItem(this.userKey);
      return null;
    }
  }

  private decodeAccessToken(): JwtUserPayload | null {
    const token = this.getAccessToken();
    return token ? this.decodeJwt(token) : null;
  }

  private decodeJwt(token: string): JwtUserPayload | null {
    try {
      const payload = token.split('.')[1];
      const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decodedPayload = atob(normalizedPayload);
      const jsonPayload = decodeURIComponent(
        decodedPayload
          .split('')
          .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join('')
      );

      return JSON.parse(jsonPayload) as JwtUserPayload;
    } catch {
      return null;
    }
  }

  private isDemoLogin(email: string, password: string): boolean {
    return this.canUseDemoLogin() && email.trim().toLowerCase() === this.demoEmail && password === this.demoPassword;
  }

  private canUseDemoLogin(): boolean {
    return ENABLE_DEMO_LOGIN || /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(API_BASE_URL);
  }
  private createDemoSession(selectedRole: string): AuthResponse {
    const roleMap: Record<string, { role: string; name: string; designation: string; roles: string[] }> = {
      super_admin: {
        role: 'super_admin',
        name: 'Opas Bizz Super Admin',
        designation: 'Platform Super Admin',
        roles: ['super_admin']
      },
      company_admin: {
        role: 'company_admin',
        name: 'Company Admin',
        designation: 'Company Administrator',
        roles: ['company_admin', 'manager']
      },
      hr: {
        role: 'hr',
        name: 'HR Manager',
        designation: 'Human Resources',
        roles: ['hr', 'employee']
      },
      employee: {
        role: 'employee',
        name: 'Employee User',
        designation: 'Employee',
        roles: ['employee']
      },
      accounts: {
        role: 'accounts',
        name: 'Accounts User',
        designation: 'Accountant',
        roles: ['accounts']
      }
    };
    const demoRole = roleMap[selectedRole] ?? roleMap['company_admin'];
    const company: Company = {
      id: 'company_opasbizz',
      name: selectedRole === 'super_admin' ? 'Opas Bizz Pvt. Ltd.' : 'Registered Company Workspace',
      slug: 'opasbizz',
      email: 'admin@opasbizz.com',
      phone: '+91-9111001049',
      logoUrl: '/brand/opasbizz-crm.webp',
      industry: 'CRM Solutions',
      status: 'active',
      ownerUserId: 'user_demo_admin',
      billing: {
        currency: 'INR',
        plan: 'professional'
      },
      settings: {
        timezone: 'Asia/Kolkata',
        dateFormat: 'dd MMM yyyy',
        financialYearStartMonth: 4,
        invoicePrefix: 'OPB',
        leadAutoAssignment: true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const user: User = {
      id: 'user_demo_admin',
      companyId: company.id,
      company,
      name: demoRole.name,
      email: this.demoEmail,
      role: demoRole.role,
      roles: demoRole.roles,
      status: 'active',
      profile: {
        designation: demoRole.designation
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return {
      accessToken: this.createDemoToken(user, 60 * 60),
      refreshToken: this.createDemoToken(user, 60 * 60 * 24 * 7),
      user
    };
  }

  private createDemoToken(user: User, expiresInSeconds: number): string {
    const header = this.base64UrlEncode({ alg: 'HS256', typ: 'JWT' });
    const payload = this.base64UrlEncode({
      sub: user.id,
      companyId: user.companyId,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
      iat: Math.floor(Date.now() / 1000),
      name: user.name,
      role: user.role,
      roles: user.roles
    });

    return `${header}.${payload}.demo-signature`;
  }

  private base64UrlEncode(value: Record<string, unknown>): string {
    return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /*
   * Unused old local-only registration session helper.
   * The production flow now registers through the backend, redirects to login,
   * and lets the backend-issued role decide the dashboard route.
   */
  // private createCompanyAdminSession(payload: CompanyRegistrationPayload): AuthResponse {
  //   ...
  // }
}



