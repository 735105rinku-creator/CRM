import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { apiUrl } from '../../core/config/api.config';
import { AuthService } from '../../core/auth/auth.service';
import { ApiService } from '../../core/services/api.service';

interface CompanyRow {
  _id?: string;
  companyName?: string;
  companyCode?: string;
  email?: string;
  phone?: string;
  logo?: string;
  industry?: string;
  status?: string;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  maxEmployees?: number;
  hrAccountLimit?: number;
  subscriptionEndsAt?: string;
  createdAt?: string;
  createdBy?: string | null | { _id?: string };
  stats?: {
    users?: number;
    employees?: number;
    departments?: number;
  };
}

interface UserRow {
  _id?: string;
  companyId?: string | { _id?: string; companyName?: string; companyCode?: string } | null;
  name?: string;
  email?: string;
  mobile?: string;
  role?: string;
  status?: string;
  designation?: string;
}

interface BillingPlan {
  _id?: string;
  code: string;
  name: string;
  description?: string;
  priceInr: number;
  durationMonths: number;
  employeeLimit: number;
  hrAccountLimit: number;
  features?: string[];
  isActive?: boolean;
}

interface PlanOffer {
  _id?: string;
  title?: string;
  code?: string;
  description?: string;
  planCode?: string;
  discountType?: string;
  discountValue?: number;
  isActive?: boolean;
  startsAt?: string;
  endsAt?: string;
}

interface LoginAuditRow {
  _id?: string;
  email?: string;
  status?: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: string;
  user?: { name?: string; email?: string; role?: string } | null;
}

interface SubscriptionPaymentRow {
  _id?: string;
  companyId?: CompanyRow | string;
  planName?: string;
  planCode?: string;
  payableInr?: number;
  amountInr?: number;
  discountInr?: number;
  status?: string;
  gatewayMode?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paidAt?: string;
  createdAt?: string;
}

interface GatewaySettingsRow {
  provider?: string;
  keyConfigured?: boolean;
  secretConfigured?: boolean;
  mode?: string;
  checkoutScript?: string;
}

interface BillingSummary {
  companies?: number;
  activeCompanies?: number;
  trialCompanies?: number;
  suspendedCompanies?: number;
  signupsThisMonth?: number;
  subscriptionsActive?: number;
  subscriptionsExpired?: number;
  subscriptionsTrial?: number;
  totalUsers?: number;
  activeUsers?: number;
  inactiveUsers?: number;
  blockedUsers?: number;
  totalEmployees?: number;
  paidPayments?: number;
  pendingPayments?: number;
  failedPayments?: number;
  mrrInr?: number;
  totalRevenueInr?: number;
  currentMonthRevenueInr?: number;
}
interface SupportTicketRow { _id?: string; ticketNumber?: string; companyId?: CompanyRow | string | null; requesterName?: string; requesterEmail?: string; subject?: string; description?: string; category?: string; priority?: string; status?: string; resolutionNote?: string; createdAt?: string; }
interface SupportCategoryRow { _id?: string; name?: string; code?: string; description?: string; defaultPriority?: string; slaHours?: number; sortOrder?: number; isActive?: boolean; }
interface KnowledgeBaseRow { _id?: string; title?: string; slug?: string; category?: string; question?: string; answer?: string; tags?: string[]; isPublished?: boolean; sortOrder?: number; }
interface SupportOverview { tickets?: SupportTicketRow[]; categories?: SupportCategoryRow[]; articles?: KnowledgeBaseRow[]; stats?: Record<string, number>; }
interface PlatformAnnouncementRow { _id?: string; title?: string; message?: string; audience?: string; priority?: string; actionUrl?: string; startsAt?: string; endsAt?: string; isPublished?: boolean; createdAt?: string; }
interface NotificationTemplateRow { _id?: string; name?: string; code?: string; channel?: string; subject?: string; body?: string; variables?: string[]; isActive?: boolean; }
interface CommunicationGatewayRow { _id?: string; provider?: string; label?: string; channel?: string; config?: Record<string, unknown>; isActive?: boolean; isConfigured?: boolean; }
interface NotificationOverview { announcements?: PlatformAnnouncementRow[]; templates?: NotificationTemplateRow[]; gateways?: CommunicationGatewayRow[]; stats?: Record<string, number>; }
interface TopbarNotificationRow { _id?: string; title?: string; message?: string; type?: string; priority?: string; isRead?: boolean; actionUrl?: string; createdAt?: string; senderUserId?: { name?: string; email?: string; role?: string } | null; }
interface SystemActivityRow { module?: string; action?: string; actor?: string; status?: string; amountInr?: number; createdAt?: string; }
interface AuthSessionRow { _id?: string; user?: { name?: string; email?: string; role?: string }; ipAddress?: string; userAgent?: string; deviceName?: string; isRevoked?: boolean; expiresAt?: string; createdAt?: string; }
interface AuditOverview { systemLogs?: SystemActivityRow[]; authHistory?: LoginAuditRow[]; failedAttempts?: LoginAuditRow[]; sessions?: AuthSessionRow[]; stats?: Record<string, number>; }
interface PlatformSettingsRow { appName?: string; companyName?: string; supportEmail?: string; supportPhone?: string; defaultTimezone?: string; maintenanceMode?: boolean; registrationEnabled?: boolean; security?: Record<string, number | boolean>; updatedAt?: string; }
interface BackupExportRow { _id?: string; type?: string; format?: string; status?: string; fileName?: string; recordCount?: number; requestedBy?: { name?: string; email?: string }; notes?: string; createdAt?: string; }
interface ProfileActivityOverview { logins?: LoginAuditRow[]; sessions?: AuthSessionRow[]; backups?: BackupExportRow[]; }
interface ReportMetricRow { label?: string; value?: number; percent?: number; count?: number; module?: string; records?: number; active?: number; }
interface ReportAnalytics {
  usage?: { totals?: Record<string, number>; companyStatus?: ReportMetricRow[]; userRoles?: ReportMetricRow[]; recentLogins?: LoginAuditRow[]; topCompanies?: CompanyRow[] };
  revenue?: { totals?: Record<string, number>; trend?: ReportMetricRow[]; byPlan?: ReportMetricRow[]; recentPayments?: SubscriptionPaymentRow[] };
  growth?: { userTrend?: ReportMetricRow[]; companyTrend?: ReportMetricRow[]; employeeTrend?: ReportMetricRow[]; roleDistribution?: ReportMetricRow[] };
  modules?: { rows?: ReportMetricRow[]; crm?: { leads?: number; deals?: number; tasks?: number; pipelineValueInr?: number; leadSources?: ReportMetricRow[]; dealStages?: ReportMetricRow[]; taskStatuses?: ReportMetricRow[] } };
  exports?: { type: string; label: string; endpoint: string }[];
}
interface CrmSettingRow {
  _id?: string;
  type: 'lead_source' | 'pipeline_stage' | 'message_template';
  name: string;
  code?: string;
  description?: string;
  channel?: 'email' | 'sms' | 'both' | 'none';
  subject?: string;
  body?: string;
  color?: string;
  sortOrder?: number;
  isDefault?: boolean;
  isActive?: boolean;
}
interface PermissionItem {
  code: string;
  label: string;
}

interface PermissionGroup {
  module: string;
  label: string;
  permissions: PermissionItem[];
}

interface RoleRow {
  _id?: string;
  name: string;
  level: number;
  permissions: string[];
  company?: string | { _id?: string; companyName?: string; companyCode?: string } | null;
  isCustom?: boolean;
  isActive?: boolean;
  createdAt?: string;
}
interface ApiErrorDetail {
  field?: string;
  message?: string;
}

interface ApiHttpError {
  error?: {
    message?: string;
    errors?: ApiErrorDetail[];
  };
}
@Component({
  selector: 'app-super-admin-dashboard',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './super-admin-dashboard.component.html',
  styleUrls: ['../role-dashboard.scss', './super-admin-dashboard.component.scss']
})
export class SuperAdminDashboardComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly companies = signal<CompanyRow[]>([]);
  protected readonly allUsers = signal<UserRow[]>([]);
  protected readonly loginLogs = signal<LoginAuditRow[]>([]);
  protected readonly billingPayments = signal<SubscriptionPaymentRow[]>([]);
  protected readonly activeSubscriptionRows = signal<CompanyRow[]>([]);
  protected readonly expiredSubscriptionRows = signal<CompanyRow[]>([]);
  protected readonly expiringSoonRows = signal<CompanyRow[]>([]);
  protected readonly gatewaySettings = signal<GatewaySettingsRow>({});
  protected readonly billingSummary = signal<BillingSummary | null>(null);
  protected readonly companyAdmins = signal<UserRow[]>([]);
  protected readonly billingPlans = signal<BillingPlan[]>([]);
  protected readonly planOffers = signal<PlanOffer[]>([]);
  protected readonly roleRows = signal<RoleRow[]>([]);
  protected readonly permissionGroups = signal<PermissionGroup[]>([]);
  protected readonly roleCompanies = signal<CompanyRow[]>([]);
  protected readonly isRoleSaving = signal(false);
  protected readonly crmSettings = signal<CrmSettingRow[]>([]);
  protected readonly isCrmSettingSaving = signal(false);
  protected readonly reportAnalytics = signal<ReportAnalytics>({});
  protected readonly isReportLoading = signal(false);
  protected readonly supportOverview = signal<SupportOverview>({});
  protected readonly isSupportSaving = signal(false);
  protected readonly notificationOverview = signal<NotificationOverview>({});
  protected readonly isNotificationSaving = signal(false);
  protected readonly topbarNotifications = signal<TopbarNotificationRow[]>([]);
  protected readonly notificationUnreadCount = signal(0);
  protected readonly isNotificationPanelOpen = signal(false);
  protected readonly auditOverview = signal<AuditOverview>({});
  protected readonly platformSettings = signal<PlatformSettingsRow>({});
  protected readonly backupExports = signal<BackupExportRow[]>([]);
  protected readonly profileActivity = signal<ProfileActivityOverview>({});
  protected readonly isPlatformSaving = signal(false);
  protected readonly isBillingSaving = signal(false);
  protected readonly stats = signal({
    companies: 0,
    active: 0,
    trial: 0,
    suspended: 0,
    users: 0,
    signups: 0,
    mrr: 0,
    revenue: 0,
    subscriptionsActive: 0,
    subscriptionsExpired: 0,
    ticketsOpen: 0,
    ticketsPending: 0
  });
  protected readonly activeSection = signal('overview');
  protected readonly companySearch = signal('');
  protected readonly companyStatusFilter = signal('all');
  protected readonly companyPlanFilter = signal('all');
  protected readonly errorMessage = signal('');
  protected readonly isStatusSaving = signal(false);
  protected readonly isCreatingCompany = signal(false);
  protected readonly user = computed(() => this.auth.currentUser());
  protected readonly userName = computed(() => this.user()?.name || this.user()?.email || 'Super Admin');
  protected readonly userEmail = computed(() => this.user()?.email || '');
  protected readonly initials = computed(() =>
    this.userName()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
  );
  protected readonly planPrices: Record<string, number> = {
    basic: 999,
    standard: 2499,
    business: 4999
  };

  private readonly planPresets: Record<string, Omit<BillingPlan, '_id' | 'isActive'>> = {
    basic: {
      code: 'basic',
      name: 'Basic',
      description: 'Lean CRM + HRM access for early teams.',
      priceInr: 999,
      durationMonths: 1,
      employeeLimit: 20,
      hrAccountLimit: 1,
      features: ['20 employee profiles', '1 HR account', 'CRM pipeline', 'Attendance and leave basics', 'Email support']
    },
    standard: {
      code: 'standard',
      name: 'Standard',
      description: 'Balanced plan for growing operations.',
      priceInr: 2499,
      durationMonths: 1,
      employeeLimit: 100,
      hrAccountLimit: 2,
      features: ['100 employee profiles', '2 HR accounts', 'CRM + HRMS suite', 'Payroll records', 'Reports dashboard']
    },
    business: {
      code: 'business',
      name: 'Business',
      description: 'Unlimited company workspace for larger teams.',
      priceInr: 4999,
      durationMonths: 1,
      employeeLimit: -1,
      hrAccountLimit: -1,
      features: ['Unlimited employees', 'Unlimited HR accounts', 'All CRM and HRM modules', 'Priority support', 'Advanced reports']
    }
  };

  protected readonly menuGroups = [
    { title: 'Dashboard', items: [{ id: 'overview', label: 'Overview' }] },
    {
      title: 'Companies',
      items: [
        { id: 'companies', label: 'All Companies' },
        { id: 'add-company', label: 'Add New Company' },
        { id: 'company-details', label: 'Company Details' },
        { id: 'suspended-companies', label: 'Suspended/Blocked Companies' },
        { id: 'onboarding-requests', label: 'Company Onboarding Requests' }
      ]
    },
    {
      title: 'Subscriptions & Billing',
      items: [
        { id: 'plans', label: 'Plans Management' },
        { id: 'subscriptions', label: 'Active Subscriptions' },
        { id: 'expiring', label: 'Expired/Expiring Soon' },
        { id: 'invoices', label: 'Invoices & Payment History' },
        { id: 'payment-settings', label: 'Payment Gateway Settings' },
        { id: 'coupons', label: 'Coupons/Discounts' }
      ]
    },
    {
      title: 'Users Management',
      items: [
        { id: 'users', label: 'All Users' },
        { id: 'platform-admins', label: 'Platform Admins/Sub-admins' },
        { id: 'blocked-users', label: 'Blocked/Banned Users' },
        { id: 'login-logs', label: 'Login Activity Logs' }
      ]
    },
    {
      title: 'Roles & Permissions',
      items: [
        { id: 'roles', label: 'Role Management' },
        { id: 'permissions', label: 'Permission Matrix' },
        { id: 'custom-roles', label: 'Custom Role Builder' }
      ]
    },
    {
      title: 'CRM Module Settings',
      items: [
        { id: 'lead-sources', label: 'Lead Source Templates' },
        { id: 'pipeline-stages', label: 'Default Pipeline Stages' },
        { id: 'crm-templates', label: 'Email/SMS Templates' }
      ]
    },
    {
      title: 'HRM Module Settings',
      items: [
        { id: 'hr-templates', label: 'Departments/Designations' },
        { id: 'leave-policies', label: 'Leave Policy Templates' },
        { id: 'holiday-calendar', label: 'Holiday Calendar Templates' },
        { id: 'attendance-rules', label: 'Attendance Rules Defaults' }
      ]
    },
    {
      title: 'Reports & Analytics',
      items: [
        { id: 'usage-report', label: 'Platform Usage Report' },
        { id: 'revenue-report', label: 'Revenue Reports' },
        { id: 'growth-report', label: 'User Growth Reports' },
        { id: 'module-usage', label: 'Module-wise Usage' },
        { id: 'exports', label: 'Export Reports' }
      ]
    },
    {
      title: 'Support & Tickets',
      items: [
        { id: 'tickets', label: 'All Support Tickets' },
        { id: 'ticket-settings', label: 'Categories/Priority' },
        { id: 'knowledge-base', label: 'Knowledge Base / FAQ' }
      ]
    },
    {
      title: 'Notifications & Announcements',
      items: [
        { id: 'announcements', label: 'Platform Announcement' },
        { id: 'notification-templates', label: 'Notification Templates' },
        { id: 'email-sms', label: 'Email/SMS Configuration' }
      ]
    },
    {
      title: 'Audit Logs',
      items: [
        { id: 'system-logs', label: 'System Activity Logs' },
        { id: 'auth-history', label: 'Login/Logout History' },
        { id: 'failed-logins', label: 'Failed Login Attempts' }
      ]
    },
    {
      title: 'Settings',
      items: [
        { id: 'general-settings', label: 'Platform General Settings' },
        { id: 'domains', label: 'Domain/Subdomain Management' },
        { id: 'security', label: 'Security Settings' },
        { id: 'api-keys', label: 'API Keys Management' },
        { id: 'backup', label: 'Backup & Data Export' }
      ]
    },
    {
      title: 'My Profile',
      items: [
        { id: 'profile', label: 'Profile Settings' },
        { id: 'change-password', label: 'Change Password' },
        { id: 'my-activity', label: 'Activity Log' }
      ]
    }
  ];

  protected readonly billingPlanForm = this.fb.nonNullable.group({
    code: ['basic', [Validators.required]],
    name: ['Basic', [Validators.required]],
    description: ['Lean CRM + HRM access'],
    priceInr: [999, [Validators.required, Validators.min(1)]],
    durationMonths: [1, [Validators.required, Validators.min(1)]],
    employeeLimit: [20, [Validators.required, Validators.min(-1)]],
    hrAccountLimit: [1, [Validators.required, Validators.min(-1)]],
    features: ['20 employee profiles\n1 HR account\nCRM pipeline'],
    isActive: [true]
  });

  protected readonly planOfferForm = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    code: [''],
    description: [''],
    planCode: ['all', [Validators.required]],
    discountType: ['percent', [Validators.required]],
    discountValue: [10, [Validators.required, Validators.min(0)]],
    startsAt: [''],
    endsAt: [''],
    isActive: [true]
  });
  protected readonly supportTicketForm = this.fb.nonNullable.group({
    subject: ['', [Validators.required]], description: [''], requesterName: [''], requesterEmail: [''], category: ['General'], priority: ['medium'], status: ['open']
  });
  protected readonly supportCategoryForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]], code: [''], description: [''], defaultPriority: ['medium'], slaHours: [24], sortOrder: [0], isActive: [true]
  });
  protected readonly knowledgeBaseForm = this.fb.nonNullable.group({
    title: ['', [Validators.required]], slug: [''], category: ['General'], question: [''], answer: ['', [Validators.required]], tags: [''], sortOrder: [0], isPublished: [true]
  });
  protected readonly announcementForm = this.fb.nonNullable.group({
    title: ['', [Validators.required]], message: ['', [Validators.required]], audience: ['all'], priority: ['normal'], actionUrl: [''], startsAt: [''], endsAt: [''], isPublished: [true]
  });
  protected readonly notificationTemplateForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]], code: [''], channel: ['in_app'], subject: [''], body: ['', [Validators.required]], variables: [''], isActive: [true]
  });
  protected readonly gatewayForm = this.fb.nonNullable.group({
    provider: ['smtp', [Validators.required]], label: ['SMTP Email'], channel: ['email'], host: [''], port: ['587'], from: [''], senderId: [''], apiKey: [''], isActive: [false]
  });
  protected readonly leadSourceForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    code: [''],
    description: [''],
    color: ['#2563eb'],
    sortOrder: [0],
    isDefault: [false],
    isActive: [true]
  });

  protected readonly pipelineStageForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    code: [''],
    description: [''],
    color: ['#16a34a'],
    sortOrder: [0],
    isDefault: [false],
    isActive: [true]
  });

  protected readonly crmTemplateForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    code: [''],
    description: [''],
    channel: ['email', [Validators.required]],
    subject: [''],
    body: ['', [Validators.required]],
    sortOrder: [0],
    isDefault: [false],
    isActive: [true]
  });
  protected readonly customRoleForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    level: [4, [Validators.required, Validators.min(0), Validators.max(10)]],
    company: [''],
    permissions: [''],
    isActive: [true]
  });
  protected readonly companyForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    companyCode: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    adminName: ['', [Validators.required, Validators.minLength(2)]],
    adminEmail: ['', [Validators.required, Validators.email]],
    adminMobile: [''],
    adminPassword: ['Admin@12345', [Validators.required, Validators.minLength(8)]]
  });

  protected readonly platformThemeForm = this.fb.nonNullable.group({
    primaryColor: ['#1A2942', [Validators.required]],
    accentColor: ['#243B55', [Validators.required]],
    dangerColor: ['#C1121F', [Validators.required]],
    sidebarStart: ['#141E30', [Validators.required]],
    sidebarEnd: ['#243B55', [Validators.required]]
  });
  protected readonly platformGeneralForm = this.fb.nonNullable.group({
    appName: ['Opas Bizz CRM', [Validators.required]], companyName: ['Opas Bizz Pvt. Ltd.', [Validators.required]], supportEmail: ['support@opasbizz.com', [Validators.required, Validators.email]], supportPhone: [''], defaultTimezone: ['Asia/Kolkata'], maintenanceMode: [false], registrationEnabled: [true]
  });
  protected readonly securitySettingsForm = this.fb.nonNullable.group({
    passwordMinLength: [8, [Validators.required, Validators.min(8)]], sessionTimeoutMinutes: [60, [Validators.required, Validators.min(5)]], maxLoginAttempts: [5, [Validators.required, Validators.min(3)]], lockoutMinutes: [30, [Validators.required, Validators.min(5)]], requireStrongPassword: [true], enforceTwoFactor: [false]
  });
  protected readonly backupExportForm = this.fb.nonNullable.group({
    type: ['full'], format: ['json'], notes: ['']
  });
  protected readonly profileSettingsForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]], mobile: [''], department: ['Platform'], designation: ['Super Admin']
  });
  protected readonly superAdminPasswordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]], newPassword: ['', [Validators.required, Validators.minLength(8)]], confirmPassword: ['', [Validators.required]]
  });

  constructor() {
    this.loadPlatformTheme();
    this.refresh();
    this.loadBillingAdmin();
    this.loadUsersAdmin();
    this.loadLoginLogs();
    this.loadBillingOverview();
    this.loadNotificationOverview();
    this.loadTopbarNotifications(false);
    this.loadAuditOverview();
    this.loadPlatformSettings();
    this.loadBackupHistory();
    this.loadProfileActivity();
    this.patchProfileFormFromUser();
  }

  protected refresh(): void {
    this.errorMessage.set('');

    this.api
      .get<{ companies?: CompanyRow[] }>('/api/super-admin/companies')
      .pipe(
        catchError((error: { error?: { message?: string } }) => {
          this.errorMessage.set(error.error?.message || 'Unable to load registered companies.');
          return of({ companies: [], pagination: { total: 0 } });
        })
      )
      .subscribe((data) => {
        const rows = data.companies ?? [];
        this.companies.set(rows);
        this.applyRealOverviewStats();
      });

    this.api
      .get<{ users?: UserRow[] }>('/users', { role: 'company_admin', limit: 100 })
      .pipe(
        catchError((error: { error?: { message?: string } }) => {
          this.errorMessage.set(error.error?.message || 'Unable to load company admin users.');
          return of({ users: [] });
        })
      )
      .subscribe((data) => this.companyAdmins.set(data.users ?? []));
  }

  protected loadAuditOverview(): void {
    this.api.get<AuditOverview>('/api/super-admin/audit/overview')
      .pipe(catchError(() => of({} as AuditOverview)))
      .subscribe((data) => this.auditOverview.set(data || {}));
  }

  protected systemActivityLogs(): SystemActivityRow[] { return this.auditOverview().systemLogs || []; }
  protected authHistoryLogs(): LoginAuditRow[] { return this.auditOverview().authHistory || []; }
  protected failedLoginAttempts(): LoginAuditRow[] { return this.auditOverview().failedAttempts || []; }
  protected activeSessionRows(): AuthSessionRow[] { return this.auditOverview().sessions || []; }
  protected auditStat(key: string): number { return Number(this.auditOverview().stats?.[key] || 0); }

  protected loadPlatformSettings(): void {
    this.api.get<{ settings?: PlatformSettingsRow }>('/api/super-admin/settings/platform')
      .pipe(catchError(() => of({ settings: {} as PlatformSettingsRow })))
      .subscribe((data) => {
        const settings = data.settings || {};
        this.platformSettings.set(settings);
        this.platformGeneralForm.patchValue({
          appName: settings.appName || 'Opas Bizz CRM', companyName: settings.companyName || 'Opas Bizz Pvt. Ltd.', supportEmail: settings.supportEmail || 'support@opasbizz.com', supportPhone: settings.supportPhone || '', defaultTimezone: settings.defaultTimezone || 'Asia/Kolkata', maintenanceMode: settings.maintenanceMode === true, registrationEnabled: settings.registrationEnabled !== false
        });
        const security = settings.security || {};
        this.securitySettingsForm.patchValue({
          passwordMinLength: Number(security['passwordMinLength'] || 8), sessionTimeoutMinutes: Number(security['sessionTimeoutMinutes'] || 60), maxLoginAttempts: Number(security['maxLoginAttempts'] || 5), lockoutMinutes: Number(security['lockoutMinutes'] || 30), requireStrongPassword: security['requireStrongPassword'] !== false, enforceTwoFactor: security['enforceTwoFactor'] === true
        });
      });
  }

  protected savePlatformGeneralSettings(): void {
    if (this.platformGeneralForm.invalid || this.isPlatformSaving()) { this.platformGeneralForm.markAllAsTouched(); return; }
    this.isPlatformSaving.set(true); this.errorMessage.set('');
    this.api.patch<{ settings?: PlatformSettingsRow }>('/api/super-admin/settings/platform', this.platformGeneralForm.getRawValue())
      .pipe(finalize(() => this.isPlatformSaving.set(false)))
      .subscribe({ next: (data) => { this.platformSettings.set(data.settings || {}); this.loadAuditOverview(); }, error: (error: ApiHttpError) => this.errorMessage.set(this.apiErrorMessage(error, 'Unable to save platform settings.')) });
  }

  protected saveSecuritySettings(): void {
    if (this.securitySettingsForm.invalid || this.isPlatformSaving()) { this.securitySettingsForm.markAllAsTouched(); return; }
    this.isPlatformSaving.set(true); this.errorMessage.set('');
    this.api.patch<{ settings?: PlatformSettingsRow }>('/api/super-admin/settings/security', this.securitySettingsForm.getRawValue())
      .pipe(finalize(() => this.isPlatformSaving.set(false)))
      .subscribe({ next: (data) => { this.platformSettings.set(data.settings || {}); this.loadAuditOverview(); }, error: (error: ApiHttpError) => this.errorMessage.set(this.apiErrorMessage(error, 'Unable to save security settings.')) });
  }

  protected loadBackupHistory(): void {
    this.api.get<{ backups?: BackupExportRow[] }>('/api/super-admin/backup/history')
      .pipe(catchError(() => of({ backups: [] })))
      .subscribe((data) => this.backupExports.set(data.backups || []));
  }

  protected createBackupExport(): void {
    if (this.backupExportForm.invalid || this.isPlatformSaving()) return;
    this.isPlatformSaving.set(true); this.errorMessage.set('');
    this.api.post<{ backup?: BackupExportRow }>('/api/super-admin/backup/export', this.backupExportForm.getRawValue())
      .pipe(finalize(() => this.isPlatformSaving.set(false)))
      .subscribe({ next: () => { this.backupExportForm.patchValue({ notes: '' }); this.loadBackupHistory(); this.loadAuditOverview(); this.loadProfileActivity(); }, error: (error: ApiHttpError) => this.errorMessage.set(this.apiErrorMessage(error, 'Unable to create backup export.')) });
  }

  protected backupRows(): BackupExportRow[] { return this.backupExports(); }

  protected patchProfileFormFromUser(): void {
    const current = this.user() as { name?: string; mobile?: string; department?: string; designation?: string } | null;
    this.profileSettingsForm.patchValue({ name: current?.name || '', mobile: current?.mobile || '', department: current?.department || 'Platform', designation: current?.designation || 'Super Admin' });
  }

  protected saveProfileSettings(): void {
    if (this.profileSettingsForm.invalid || this.isPlatformSaving()) { this.profileSettingsForm.markAllAsTouched(); return; }
    this.isPlatformSaving.set(true); this.errorMessage.set('');
    this.api.patch('/auth/profile', this.profileSettingsForm.getRawValue())
      .pipe(finalize(() => this.isPlatformSaving.set(false)))
      .subscribe({ next: () => this.loadProfileActivity(), error: (error: ApiHttpError) => this.errorMessage.set(this.apiErrorMessage(error, 'Unable to save profile settings.')) });
  }

  protected changeSuperAdminPassword(): void {
    if (this.superAdminPasswordForm.invalid || this.isPlatformSaving()) { this.superAdminPasswordForm.markAllAsTouched(); return; }
    const payload = this.superAdminPasswordForm.getRawValue();
    if (payload.newPassword !== payload.confirmPassword) { this.errorMessage.set('New password and confirm password must match.'); return; }
    this.isPlatformSaving.set(true); this.errorMessage.set('');
    this.api.post('/auth/change-password', payload)
      .pipe(finalize(() => this.isPlatformSaving.set(false)))
      .subscribe({ next: () => { this.superAdminPasswordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' }); this.auth.logout(true); }, error: (error: ApiHttpError) => this.errorMessage.set(this.apiErrorMessage(error, 'Unable to change password.')) });
  }

  protected loadProfileActivity(): void {
    this.api.get<ProfileActivityOverview>('/api/super-admin/profile/activity')
      .pipe(catchError(() => of({} as ProfileActivityOverview)))
      .subscribe((data) => this.profileActivity.set(data || {}));
  }

  protected profileLoginRows(): LoginAuditRow[] { return this.profileActivity().logins || []; }
  protected profileSessionRows(): AuthSessionRow[] { return this.profileActivity().sessions || []; }
  protected profileBackupRows(): BackupExportRow[] { return this.profileActivity().backups || []; }
  protected toggleNotificationPanel(): void {
    const nextState = !this.isNotificationPanelOpen();
    this.isNotificationPanelOpen.set(nextState);
    if (nextState) {
      this.loadTopbarNotifications(true);
      this.markTopbarNotificationsRead();
    }
  }

  protected closeNotificationPanel(): void {
    this.isNotificationPanelOpen.set(false);
  }

  protected loadTopbarNotifications(markOnOpen = false): void {
    this.api.get<{ notifications?: TopbarNotificationRow[]; unreadCount?: number }>('/api/super-admin/notification-center', { limit: 8 })
      .pipe(catchError(() => of({ notifications: [], unreadCount: this.notificationUnreadCount() })))
      .subscribe((data) => {
        this.topbarNotifications.set(data.notifications || []);
        this.notificationUnreadCount.set(Number(data.unreadCount || 0));
        if (markOnOpen && Number(data.unreadCount || 0) > 0) this.markTopbarNotificationsRead();
      });
  }

  protected notificationPriorityClass(row: TopbarNotificationRow): string {
    return row.priority === 'urgent' || row.priority === 'high' ? 'danger' : row.isRead ? 'success' : '';
  }

  private markTopbarNotificationsRead(): void {
    if (this.notificationUnreadCount() === 0 && this.topbarNotifications().every((item) => item.isRead)) return;
    this.notificationUnreadCount.set(0);
    this.topbarNotifications.update((items) => items.map((item) => ({ ...item, isRead: true })));
    this.api.patch('/api/super-admin/notification-center/read-all', {}).subscribe({ error: () => undefined });
  }
  protected loadNotificationOverview(): void {
    this.api.get<NotificationOverview>('/api/super-admin/notifications/overview')
      .pipe(catchError(() => of({} as NotificationOverview)))
      .subscribe((data) => this.notificationOverview.set(data || {}));
  }

  protected announcements(): PlatformAnnouncementRow[] { return this.notificationOverview().announcements || []; }
  protected notificationTemplates(): NotificationTemplateRow[] { return this.notificationOverview().templates || []; }
  protected communicationGateways(): CommunicationGatewayRow[] { return this.notificationOverview().gateways || []; }
  protected notificationStat(key: string): number { return Number(this.notificationOverview().stats?.[key] || 0); }
  protected gatewayConfigLabel(row: CommunicationGatewayRow): string {
    const config = row.config || {};
    const host = String(config['host'] || config['from'] || config['senderId'] || config['providerName'] || '').trim();
    return host || (row.isConfigured ? 'Configured' : 'Missing config');
  }

  protected saveAnnouncement(): void {
    if (this.announcementForm.invalid || this.isNotificationSaving()) { this.announcementForm.markAllAsTouched(); return; }
    this.saveNotification('/api/super-admin/notifications/announcements', this.announcementForm.getRawValue(), () => this.announcementForm.reset({ title: '', message: '', audience: 'all', priority: 'normal', actionUrl: '', startsAt: '', endsAt: '', isPublished: true }));
  }

  protected saveNotificationTemplate(): void {
    if (this.notificationTemplateForm.invalid || this.isNotificationSaving()) { this.notificationTemplateForm.markAllAsTouched(); return; }
    this.saveNotification('/api/super-admin/notifications/templates', this.notificationTemplateForm.getRawValue(), () => this.notificationTemplateForm.reset({ name: '', code: '', channel: 'in_app', subject: '', body: '', variables: '', isActive: true }));
  }

  protected saveGatewaySetting(): void {
    if (this.gatewayForm.invalid || this.isNotificationSaving()) { this.gatewayForm.markAllAsTouched(); return; }
    const raw = this.gatewayForm.getRawValue();
    const payload = { provider: raw.provider, label: raw.label, channel: raw.channel, isActive: raw.isActive, config: { host: raw.host, port: raw.port, from: raw.from, senderId: raw.senderId, apiKey: raw.apiKey } };
    this.saveNotification('/api/super-admin/notifications/gateways', payload, () => this.gatewayForm.reset({ provider: 'smtp', label: 'SMTP Email', channel: 'email', host: '', port: '587', from: '', senderId: '', apiKey: '', isActive: false }));
  }

  protected toggleAnnouncement(row: PlatformAnnouncementRow): void { if (!row._id) return; this.patchNotification(`/api/super-admin/notifications/announcements/${row._id}`, { isPublished: row.isPublished === false }); }
  protected toggleNotificationTemplate(row: NotificationTemplateRow): void { if (!row._id) return; this.patchNotification(`/api/super-admin/notifications/templates/${row._id}`, { isActive: row.isActive === false }); }
  protected toggleGateway(row: CommunicationGatewayRow): void { if (!row._id) return; this.patchNotification(`/api/super-admin/notifications/gateways/${row._id}`, { isActive: row.isActive === false }); }

  private saveNotification(endpoint: string, payload: unknown, reset: () => void): void {
    this.isNotificationSaving.set(true); this.errorMessage.set('');
    this.api.post(endpoint, payload).pipe(finalize(() => this.isNotificationSaving.set(false))).subscribe({ next: () => { reset(); this.loadNotificationOverview(); }, error: (error: ApiHttpError) => this.errorMessage.set(this.apiErrorMessage(error, 'Unable to save notification data.')) });
  }

  private patchNotification(endpoint: string, payload: unknown): void {
    this.isNotificationSaving.set(true); this.errorMessage.set('');
    this.api.patch(endpoint, payload).pipe(finalize(() => this.isNotificationSaving.set(false))).subscribe({ next: () => this.loadNotificationOverview(), error: (error: ApiHttpError) => this.errorMessage.set(this.apiErrorMessage(error, 'Unable to update notification data.')) });
  }
  protected loadSupportOverview(): void {
    this.api.get<SupportOverview>('/api/super-admin/support/overview')
      .pipe(catchError(() => of({} as SupportOverview)))
      .subscribe((data) => {
        this.supportOverview.set(data || {});
        const current = this.stats();
        this.stats.set({ ...current, ticketsOpen: Number(data.stats?.['openTickets'] || 0), ticketsPending: Number(data.stats?.['pendingTickets'] || 0) });
      });
  }

  protected supportTickets(): SupportTicketRow[] { return this.supportOverview().tickets || []; }
  protected supportCategories(): SupportCategoryRow[] { return this.supportOverview().categories || []; }
  protected knowledgeArticles(): KnowledgeBaseRow[] { return this.supportOverview().articles || []; }
  protected supportStat(key: string): number { return Number(this.supportOverview().stats?.[key] || 0); }
  protected supportCompanyLabel(ticket: SupportTicketRow): string { const company = typeof ticket.companyId === 'object' ? ticket.companyId : null; return company?.companyName || company?.companyCode || '-'; }

  protected createSupportTicket(): void {
    if (this.supportTicketForm.invalid || this.isSupportSaving()) { this.supportTicketForm.markAllAsTouched(); return; }
    this.saveSupport('/api/super-admin/support/tickets', this.supportTicketForm.getRawValue(), () => this.supportTicketForm.reset({ subject: '', description: '', requesterName: '', requesterEmail: '', category: 'General', priority: 'medium', status: 'open' }));
  }

  protected saveSupportCategory(): void {
    if (this.supportCategoryForm.invalid || this.isSupportSaving()) { this.supportCategoryForm.markAllAsTouched(); return; }
    this.saveSupport('/api/super-admin/support/categories', this.supportCategoryForm.getRawValue(), () => this.supportCategoryForm.reset({ name: '', code: '', description: '', defaultPriority: 'medium', slaHours: 24, sortOrder: 0, isActive: true }));
  }

  protected saveKnowledgeArticle(): void {
    if (this.knowledgeBaseForm.invalid || this.isSupportSaving()) { this.knowledgeBaseForm.markAllAsTouched(); return; }
    this.saveSupport('/api/super-admin/support/articles', this.knowledgeBaseForm.getRawValue(), () => this.knowledgeBaseForm.reset({ title: '', slug: '', category: 'General', question: '', answer: '', tags: '', sortOrder: 0, isPublished: true }));
  }

  protected updateTicketStatus(ticket: SupportTicketRow, event: Event): void { if (!ticket._id) return; this.patchSupport(`/api/super-admin/support/tickets/${ticket._id}`, { status: (event.target as HTMLSelectElement).value }); }
  protected updateTicketPriority(ticket: SupportTicketRow, event: Event): void { if (!ticket._id) return; this.patchSupport(`/api/super-admin/support/tickets/${ticket._id}`, { priority: (event.target as HTMLSelectElement).value }); }
  protected toggleSupportCategory(row: SupportCategoryRow): void { if (!row._id) return; this.patchSupport(`/api/super-admin/support/categories/${row._id}`, { isActive: row.isActive === false }); }
  protected toggleKnowledgeArticle(row: KnowledgeBaseRow): void { if (!row._id) return; this.patchSupport(`/api/super-admin/support/articles/${row._id}`, { isPublished: row.isPublished === false }); }

  private saveSupport(endpoint: string, payload: unknown, reset: () => void): void {
    this.isSupportSaving.set(true); this.errorMessage.set('');
    this.api.post(endpoint, payload).pipe(finalize(() => this.isSupportSaving.set(false))).subscribe({ next: () => { reset(); this.loadSupportOverview(); }, error: (error: ApiHttpError) => this.errorMessage.set(this.apiErrorMessage(error, 'Unable to save support data.')) });
  }
  private patchSupport(endpoint: string, payload: unknown): void {
    this.isSupportSaving.set(true); this.errorMessage.set('');
    this.api.patch(endpoint, payload).pipe(finalize(() => this.isSupportSaving.set(false))).subscribe({ next: () => this.loadSupportOverview(), error: (error: ApiHttpError) => this.errorMessage.set(this.apiErrorMessage(error, 'Unable to update support data.')) });
  }
  protected loadReportAnalytics(): void {
    this.isReportLoading.set(true);
    this.api
      .get<ReportAnalytics>('/api/super-admin/reports/analytics')
      .pipe(
        catchError(() => of({} as ReportAnalytics)),
        finalize(() => this.isReportLoading.set(false))
      )
      .subscribe((data) => this.reportAnalytics.set(data || {}));
  }

  protected reportTotal(key: string): number {
    const usage = this.reportAnalytics().usage?.totals || {};
    const revenue = this.reportAnalytics().revenue?.totals || {};
    return Number(usage[key] ?? revenue[key] ?? 0);
  }

  protected reportRows(section: 'companyStatus' | 'userRoles' | 'roleDistribution' | 'revenueByPlan' | 'moduleRows' | 'leadSources' | 'dealStages' | 'taskStatuses'): ReportMetricRow[] {
    const data = this.reportAnalytics();
    const maps: Record<string, ReportMetricRow[] | undefined> = {
      companyStatus: data.usage?.companyStatus,
      userRoles: data.usage?.userRoles,
      roleDistribution: data.growth?.roleDistribution,
      revenueByPlan: data.revenue?.byPlan,
      moduleRows: data.modules?.rows,
      leadSources: data.modules?.crm?.leadSources,
      dealStages: data.modules?.crm?.dealStages,
      taskStatuses: data.modules?.crm?.taskStatuses
    };
    return maps[section] || [];
  }

  protected trendRows(section: 'revenue' | 'users' | 'companies' | 'employees'): ReportMetricRow[] {
    const data = this.reportAnalytics();
    if (section === 'revenue') return data.revenue?.trend || [];
    if (section === 'companies') return data.growth?.companyTrend || [];
    if (section === 'employees') return data.growth?.employeeTrend || [];
    return data.growth?.userTrend || [];
  }

  protected exportReport(type: string): void {
    const url = apiUrl(`/api/super-admin/reports/export?type=${encodeURIComponent(type)}`);
    window.open(url, '_blank', 'noopener');
  }
  protected loadCrmModuleSettings(): void {
    this.api
      .get<{ settings?: CrmSettingRow[] }>('/api/super-admin/crm-settings')
      .pipe(catchError(() => of({ settings: [] })))
      .subscribe((data) => this.crmSettings.set(data.settings ?? []));
  }

  protected crmRows(type: CrmSettingRow['type']): CrmSettingRow[] {
    return this.crmSettings().filter((row) => row.type === type);
  }

  protected saveLeadSource(): void {
    this.saveCrmSetting('lead_source', this.leadSourceForm, { color: '#2563eb', isActive: true, isDefault: false, sortOrder: 0 });
  }

  protected savePipelineStage(): void {
    this.saveCrmSetting('pipeline_stage', this.pipelineStageForm, { color: '#16a34a', isActive: true, isDefault: false, sortOrder: 0 });
  }

  protected saveCrmTemplate(): void {
    this.saveCrmSetting('message_template', this.crmTemplateForm, { channel: 'email', isActive: true, isDefault: false, sortOrder: 0 });
  }

  protected toggleCrmSetting(row: CrmSettingRow): void {
    if (!row._id || this.isCrmSettingSaving()) return;
    this.updateCrmSetting(row, { isActive: row.isActive === false });
  }

  protected markCrmDefault(row: CrmSettingRow): void {
    if (!row._id || this.isCrmSettingSaving()) return;
    this.updateCrmSetting(row, { isDefault: true });
  }

  protected crmTypeLabel(type?: string): string {
    const labels: Record<string, string> = { lead_source: 'Lead Source', pipeline_stage: 'Pipeline Stage', message_template: 'Email/SMS Template' };
    return labels[type || ''] || '-';
  }

  private saveCrmSetting(type: CrmSettingRow['type'], form: typeof this.leadSourceForm | typeof this.pipelineStageForm | typeof this.crmTemplateForm, resetValue: Record<string, unknown>): void {
    if (form.invalid || this.isCrmSettingSaving()) {
      form.markAllAsTouched();
      return;
    }

    const payload = { ...form.getRawValue(), type };
    this.isCrmSettingSaving.set(true);
    this.errorMessage.set('');
    this.api
      .post('/api/super-admin/crm-settings', payload)
      .pipe(finalize(() => this.isCrmSettingSaving.set(false)))
      .subscribe({
        next: () => {
          form.reset(resetValue as never);
          this.loadCrmModuleSettings();
    this.loadReportAnalytics();
        },
        error: (error: ApiHttpError) => this.errorMessage.set(this.apiErrorMessage(error, 'Unable to save CRM setting.'))
      });
  }

  private updateCrmSetting(row: CrmSettingRow, payload: Partial<CrmSettingRow>): void {
    if (!row._id) return;
    this.isCrmSettingSaving.set(true);
    this.errorMessage.set('');
    this.api
      .patch(`/api/super-admin/crm-settings/${row._id}`, payload)
      .pipe(finalize(() => this.isCrmSettingSaving.set(false)))
      .subscribe({
        next: () => this.loadCrmModuleSettings(),
        error: (error: ApiHttpError) => this.errorMessage.set(this.apiErrorMessage(error, 'Unable to update CRM setting.'))
      });
  }
  protected loadRolesAndPermissions(): void {
    this.api
      .get<{ roles?: RoleRow[]; companies?: CompanyRow[]; permissionGroups?: PermissionGroup[] }>('/api/super-admin/roles')
      .pipe(catchError(() => of({ roles: [], companies: [], permissionGroups: [] })))
      .subscribe((data) => {
        this.roleRows.set(data.roles ?? []);
        this.roleCompanies.set(data.companies ?? []);
        this.permissionGroups.set(data.permissionGroups ?? []);
      });
  }

  protected roleManagementRows(): RoleRow[] {
    return this.roleRows().filter((role) => !role.isCustom);
  }

  protected customRoleRows(): RoleRow[] {
    return this.roleRows().filter((role) => role.isCustom);
  }

  protected roleCompanyLabel(role: RoleRow): string {
    if (!role.company) return 'Platform';
    if (typeof role.company === 'string') return role.company;
    return role.company.companyName || role.company.companyCode || 'Company';
  }

  protected roleLabelText(name?: string): string {
    return String(name || '-')
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  protected permissionCount(role: RoleRow): number {
    return role.permissions?.length ?? 0;
  }

  protected roleHasPermission(role: RoleRow, permission: string): boolean {
    return (role.permissions || []).includes(permission);
  }

  protected toggleRolePermission(role: RoleRow, permission: string, event: Event): void {
    if (!role._id || this.isRoleSaving()) return;
    const checked = (event.target as HTMLInputElement).checked;
    const permissions = new Set(role.permissions || []);
    checked ? permissions.add(permission) : permissions.delete(permission);
    this.updateRole(role, { permissions: Array.from(permissions) });
  }

  protected toggleRoleActive(role: RoleRow): void {
    if (!role._id || this.isRoleSaving()) return;
    this.updateRole(role, { isActive: role.isActive === false });
  }

  protected saveCustomRole(): void {
    if (this.customRoleForm.invalid || this.isRoleSaving()) {
      this.customRoleForm.markAllAsTouched();
      return;
    }

    const raw = this.customRoleForm.getRawValue();
    const payload = {
      name: raw.name,
      level: Number(raw.level),
      company: raw.company || null,
      permissions: raw.permissions.split('\n').map((item) => item.trim()).filter(Boolean),
      isActive: raw.isActive,
      isCustom: true
    };

    this.isRoleSaving.set(true);
    this.errorMessage.set('');
    this.api
      .post('/api/super-admin/roles', payload)
      .pipe(finalize(() => this.isRoleSaving.set(false)))
      .subscribe({
        next: () => {
          this.customRoleForm.reset({ name: '', level: 4, company: '', permissions: '', isActive: true });
          this.loadRolesAndPermissions();
        },
        error: (error: ApiHttpError) => this.errorMessage.set(this.apiErrorMessage(error, 'Unable to save custom role.'))
      });
  }

  private updateRole(role: RoleRow, payload: Partial<RoleRow>): void {
    if (!role._id) return;
    this.isRoleSaving.set(true);
    this.errorMessage.set('');
    this.api
      .patch(`/api/super-admin/roles/${role._id}`, payload)
      .pipe(finalize(() => this.isRoleSaving.set(false)))
      .subscribe({
        next: () => this.loadRolesAndPermissions(),
        error: (error: ApiHttpError) => this.errorMessage.set(this.apiErrorMessage(error, 'Unable to update role.'))
      });
  }
  protected loadUsersAdmin(): void {
    this.api
      .get<{ users?: UserRow[] }>('/users', { limit: 200 })
      .pipe(catchError(() => of({ users: [] })))
      .subscribe((data) => {
        this.allUsers.set(data.users ?? []);
        this.applyRealOverviewStats();
      });
  }

  protected loadLoginLogs(): void {
    this.api
      .get<{ logs?: LoginAuditRow[] }>('/api/super-admin/login-audits', { limit: 150 })
      .pipe(catchError(() => of({ logs: [] })))
      .subscribe((data) => this.loginLogs.set(data.logs ?? []));
  }

  protected loadBillingOverview(): void {
    this.api
      .get<{
        payments?: SubscriptionPaymentRow[];
        activeSubscriptions?: CompanyRow[];
        expiredSubscriptions?: CompanyRow[];
        expiringSoon?: CompanyRow[];
        gateway?: GatewaySettingsRow;
        summary?: BillingSummary;
      }>('/api/billing/admin/overview')
      .pipe(catchError(() => of({ payments: [], activeSubscriptions: [], expiredSubscriptions: [], expiringSoon: [], gateway: {}, summary: null })))
      .subscribe((data) => {
        this.billingPayments.set(data.payments ?? []);
        this.activeSubscriptionRows.set(data.activeSubscriptions ?? []);
        this.expiredSubscriptionRows.set(data.expiredSubscriptions ?? []);
        this.expiringSoonRows.set(data.expiringSoon ?? []);
        this.gatewaySettings.set(data.gateway ?? {});
        this.billingSummary.set(data.summary ?? null);
        this.applyRealOverviewStats();
      });
  }

  protected allUserRows(): UserRow[] {
    return this.allUsers();
  }

  protected platformAdminRows(): UserRow[] {
    return this.allUsers().filter((user) => ['super_admin', 'company_admin'].includes(user.role || ''));
  }

  protected blockedUserRows(): UserRow[] {
    return this.allUsers().filter((user) => ['blocked', 'banned'].includes(user.status || ''));
  }

  protected expiringOrExpiredRows(): CompanyRow[] {
    const rows = [...this.expiringSoonRows(), ...this.expiredSubscriptionRows()];
    return rows.filter((row, index) => rows.findIndex((item) => (item._id || item.companyCode) === (row._id || row.companyCode)) === index);
  }

  protected paymentCompanyLabel(payment: SubscriptionPaymentRow): string {
    const company = typeof payment.companyId === 'object' ? payment.companyId : null;
    return company?.companyName || company?.companyCode || '-';
  }

  protected toggleUserStatus(user: UserRow): void {
    if (!user._id || this.isStatusSaving()) return;
    const nextStatus = (user.status || 'active') === 'active' ? 'inactive' : 'active';
    this.isStatusSaving.set(true);
    this.api.patch<UserRow>(`/users/${user._id}`, { status: nextStatus })
      .pipe(finalize(() => this.isStatusSaving.set(false)))
      .subscribe({
        next: () => this.loadUsersAdmin(),
        error: (error: { error?: { message?: string } }) => this.errorMessage.set(error.error?.message || 'Unable to update user status.')
      });
  }

  protected unblockUser(user: UserRow): void {
    if (!user._id || this.isStatusSaving()) return;
    this.isStatusSaving.set(true);
    this.api.patch<UserRow>(`/users/${user._id}`, { status: 'active' })
      .pipe(finalize(() => this.isStatusSaving.set(false)))
      .subscribe({
        next: () => this.loadUsersAdmin(),
        error: (error: { error?: { message?: string } }) => this.errorMessage.set(error.error?.message || 'Unable to unblock user.')
      });
  }

  protected loadBillingAdmin(): void {
    this.api
      .get<{ plans?: BillingPlan[]; offers?: PlanOffer[] }>('/api/billing/admin/plans')
      .pipe(catchError(() => of({ plans: [], offers: [] })))
      .subscribe((data) => {
        this.billingPlans.set(data.plans ?? []);
        this.planOffers.set(data.offers ?? []);
      });
  }

  protected billingPlanOptions(): BillingPlan[] {
    return this.billingPlans().filter((plan) => plan.isActive !== false);
  }

  protected limitLabel(value?: number): string {
    return Number(value) < 0 ? 'Unlimited' : String(value ?? 0);
  }

  protected saveBillingPlan(): void {
    if (this.billingPlanForm.invalid || this.isBillingSaving()) {
      this.billingPlanForm.markAllAsTouched();
      return;
    }

    const raw = this.billingPlanForm.getRawValue();
    const payload = {
      ...raw,
      code: raw.code.trim().toLowerCase(),
      name: raw.name.trim(),
      description: raw.description.trim(),
      priceInr: Number(raw.priceInr),
      durationMonths: Number(raw.durationMonths),
      employeeLimit: Number(raw.employeeLimit),
      hrAccountLimit: Number(raw.hrAccountLimit),
      features: raw.features.split('\n').map((item) => item.trim()).filter(Boolean)
    };

    this.isBillingSaving.set(true);
    this.errorMessage.set('');
    this.api
      .post('/api/billing/admin/plans', payload)
      .pipe(finalize(() => this.isBillingSaving.set(false)))
      .subscribe({
        next: () => {
          this.loadBillingAdmin();
          this.loadBillingOverview();
          this.refresh();
        },
        error: (error: ApiHttpError) => this.errorMessage.set(this.apiErrorMessage(error, 'Unable to save billing plan.'))
      });
  }

  protected savePlanOffer(): void {
    if (this.planOfferForm.invalid || this.isBillingSaving()) {
      this.planOfferForm.markAllAsTouched();
      return;
    }

    this.isBillingSaving.set(true);
    this.api
      .post('/api/billing/admin/offers', this.planOfferForm.getRawValue())
      .pipe(finalize(() => this.isBillingSaving.set(false)))
      .subscribe({
        next: () => {
          this.planOfferForm.reset({ title: '', code: '', description: '', planCode: 'all', discountType: 'percent', discountValue: 10, startsAt: '', endsAt: '', isActive: true });
          this.loadBillingAdmin();
        },
        error: (error: ApiHttpError) => this.errorMessage.set(this.apiErrorMessage(error, 'Unable to save plan offer.'))
      });
  }

  protected togglePlan(plan: BillingPlan): void {
    if (!plan._id) return;
    this.api.patch(`/api/billing/admin/plans/${plan._id}`, { isActive: plan.isActive === false }).subscribe(() => this.loadBillingAdmin());
  }

  protected toggleOffer(offer: PlanOffer): void {
    if (!offer._id) return;
    this.api.patch(`/api/billing/admin/offers/${offer._id}`, { isActive: offer.isActive === false }).subscribe(() => this.loadBillingAdmin());
  }

  protected changeCompanyPlan(company: CompanyRow, event: Event): void {
    const planCode = (event.target as HTMLSelectElement).value;
    if (!company._id || !planCode) return;

    this.api.patch(`/api/billing/admin/companies/${company._id}/plan`, { planCode }).subscribe({
      next: () => this.refresh(),
      error: (error: { error?: { message?: string } }) => this.errorMessage.set(error.error?.message || 'Unable to change company plan.')
    });
  }
  protected topCompanies(): CompanyRow[] {
    return [...this.companies()]
      .sort((a, b) => this.companyUsage(b) - this.companyUsage(a))
      .slice(0, 6);
  }

  protected activePercent(): number {
    const total = this.stats().companies || 1;
    return Math.round((this.stats().active / total) * 100);
  }

  protected capacityPercent(company: CompanyRow): number {
    const max = Math.max(...this.topCompanies().map((item) => this.companyUsage(item)), 1);
    return Math.round((this.companyUsage(company) / max) * 100);
  }

  protected setSection(section: string): void {
    this.activeSection.set(section);
  }

  protected goBack(): void {
    window.history.length > 1 ? window.history.back() : void this.router.navigate(['/dashboard']);
  }

  protected logout(): void {
    this.auth.logout();
  }

  protected savePlatformTheme(): void {
    const theme = this.platformThemeForm.getRawValue();
    this.applyPlatformTheme(theme);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('platformTheme', JSON.stringify(theme));
    }
  }

  protected resetPlatformTheme(): void {
    this.platformThemeForm.reset({
      primaryColor: '#1A2942',
      accentColor: '#243B55',
      dangerColor: '#C1121F',
      sidebarStart: '#141E30',
      sidebarEnd: '#243B55'
    });
    this.savePlatformTheme();
  }

  protected setCompanySearch(event: Event): void {
    this.companySearch.set((event.target as HTMLInputElement).value);
  }

  protected setCompanyStatusFilter(event: Event): void {
    this.companyStatusFilter.set((event.target as HTMLSelectElement).value);
  }

  protected setCompanyPlanFilter(event: Event): void {
    this.companyPlanFilter.set((event.target as HTMLSelectElement).value);
  }

  protected setCompanyPlanValue(plan: string): void {
    this.companyPlanFilter.set(plan);
  }

  protected filteredCompanies(): CompanyRow[] {
    const search = this.companySearch().trim().toLowerCase();
    const status = this.companyStatusFilter();
    const plan = this.companyPlanFilter();
    const section = this.activeSection();

    return this.companies().filter((company) => {
      const matchesSection = section !== 'onboarding-requests' || this.isOnboardingCompany(company);
      const matchesSearch = !search || [company.companyName, company.companyCode, company.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
      const matchesStatus = status === 'all' || (company.status || 'trial') === status;
      const matchesPlan = plan === 'all' || this.normalizedPlan(company.subscriptionPlan) === plan;
      return matchesSection && matchesSearch && matchesStatus && matchesPlan;
    });
  }

  protected sectionDescription(): string {
    if (this.activeSection() === 'suspended-companies') {
      return 'Review all companies and suspend, block or unblock tenant access.';
    }

    if (this.activeSection() === 'onboarding-requests') {
      return 'Only self-registered company onboarding requests are shown here.';
    }

    return "Search, filter and open a tenant's company admin context.";
  }

  protected canSuspendCompany(company: CompanyRow): boolean {
    return !['suspended', 'blocked'].includes(company.status || 'trial');
  }

  protected canBlockCompany(company: CompanyRow): boolean {
    return (company.status || 'trial') !== 'blocked';
  }

  protected canUnblockCompany(company: CompanyRow): boolean {
    return ['suspended', 'blocked'].includes(company.status || '');
  }

  protected planOptions(): string[] {
    return [...new Set(this.companies().map((company) => this.normalizedPlan(company.subscriptionPlan)))].sort();
  }

  protected signupTrend(): { label: string; value: number; percent: number }[] {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleString('en-US', { month: 'short' }),
        value: 0
      };
    });

    this.companies().forEach((company) => {
      const created = company.createdAt ? new Date(company.createdAt) : null;
      const bucket = created ? months.find((month) => month.key === `${created.getFullYear()}-${created.getMonth()}`) : null;
      if (bucket) bucket.value += 1;
    });

    const max = Math.max(...months.map((month) => month.value), 1);
    return months.map((month) => ({ ...month, percent: Math.max(8, Math.round((month.value / max) * 100)) }));
  }

  protected revenueTrend(): { label: string; value: number; percent: number }[] {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleString('en-US', { month: 'short' }),
        value: 0
      };
    });

    this.billingPayments()
      .filter((payment) => payment.status === 'paid')
      .forEach((payment) => {
        const paidAt = payment.paidAt || payment.createdAt ? new Date(payment.paidAt || payment.createdAt || '') : null;
        const bucket = paidAt ? months.find((month) => month.key === `${paidAt.getFullYear()}-${paidAt.getMonth()}`) : null;
        if (bucket) bucket.value += Number(payment.payableInr || 0);
      });

    const max = Math.max(...months.map((month) => month.value), 1);
    return months.map((month) => ({ ...month, percent: month.value ? Math.max(8, Math.round((month.value / max) * 100)) : 0 }));
  }

  protected planDistribution(): { label: string; value: number; percent: number }[] {
    const counts = this.companies().reduce<Record<string, number>>((total, company) => {
      const plan = this.normalizedPlan(company.subscriptionPlan);
      total[plan] = (total[plan] || 0) + 1;
      return total;
    }, {});
    const max = Math.max(...Object.values(counts), 1);

    return Object.entries(counts).map(([label, value]) => ({
      label,
      value,
      percent: Math.max(8, Math.round((value / max) * 100))
    }));
  }

  protected recentActivity(): { title: string; meta: string; status: string }[] {
    const companyEvents = [...this.companies()]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 4)
      .map((company) => ({
        title: `${company.companyName || 'Company'} registered`,
        meta: `${company.companyCode || 'Tenant'} • ${this.formatDate(company.createdAt)}`,
        status: company.status || 'trial'
      }));

    const paymentEvents = this.billingPayments()
      .filter((payment) => payment.status === 'paid')
      .slice(0, 3)
      .map((payment) => ({
        title: `${payment.planName || payment.planCode || 'Subscription'} payment received`,
        meta: `${this.paymentCompanyLabel(payment)} � ${this.formatCurrency(payment.payableInr || 0)}`,
        status: payment.status || 'paid'
      }));

    const adminEvents = this.companyAdmins().slice(0, 2).map((admin) => ({
      title: `${admin.name || 'Company admin'} account ${admin.status || 'active'}`,
      meta: this.companyLabel(admin),
      status: admin.status || 'active'
    }));

    return [...paymentEvents, ...companyEvents, ...adminEvents].slice(0, 6);
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      currency: 'INR',
      maximumFractionDigits: 0,
      style: 'currency'
    }).format(value);
  }

  protected formatDate(value?: string): string {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  protected formatDateTime(value?: string): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  }

  protected roleLabel(value?: string): string {
    return String(value || '-')
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  protected logoUrl(company: CompanyRow): string {
    if (!company.logo) return '/brand/opasbizz-crm.webp';
    return /^https?:\/\//i.test(company.logo) ? company.logo : apiUrl(company.logo);
  }

  protected companyLabel(admin: UserRow): string {
    const companyId = typeof admin.companyId === 'string' ? admin.companyId : admin.companyId?._id;
    const companyObject = admin.companyId && typeof admin.companyId === 'object' ? admin.companyId : null;
    const populatedName = companyObject ? companyObject.companyName || companyObject.companyCode : '';
    const company = this.companies().find((item) => item._id === companyId);

    return populatedName || company?.companyName || company?.companyCode || '-';
  }

  protected companyUsage(company: CompanyRow): number {
    return Number(company.stats?.users ?? company.stats?.employees ?? company.maxEmployees ?? 0);
  }

  protected sectionTitle(): string {
    return this.menuGroups.flatMap((group) => group.items).find((item) => item.id === this.activeSection())?.label || 'Overview';
  }

  protected phaseLabel(): string {
    return ['plans', 'subscriptions', 'roles', 'permissions', 'general-settings'].includes(this.activeSection()) ? 'Phase 1' : 'Phase 2';
  }

  protected placeholderRows(): string[] {
    const rows: Record<string, string[]> = {
      plans: ['Starter plan', 'Professional plan', 'Enterprise plan'],
      roles: ['Company Admin', 'HR', 'Manager', 'Employee'],
      permissions: ['Dashboard access', 'User management', 'Reports export'],
      'lead-sources': ['Website', 'Referral', 'Social media'],
      'pipeline-stages': ['New lead', 'Qualified', 'Proposal', 'Won'],
      'hr-templates': ['Operations', 'Sales', 'Support'],
      'leave-policies': ['Casual leave', 'Sick leave', 'Earned leave'],
      tickets: ['Open tickets', 'Pending tickets', 'Escalated tickets'],
      announcements: ['Maintenance notice', 'Product update', 'Policy update'],
      'general-settings': ['App name', 'Logo', 'Favicon'],
      security: ['Password policy', '2FA enforcement', 'Session timeout']
    };

    return rows[this.activeSection()] || ['Configuration screen', 'Search and filters', 'Audit-ready changes'];
  }

  private applyRealOverviewStats(): void {
    const rows = this.companies();
    const summary = this.billingSummary();
    const paidPayments = this.billingPayments().filter((payment) => payment.status === 'paid');
    const realRevenue = paidPayments.reduce((total, payment) => total + Number(payment.payableInr || 0), 0);

    this.stats.set({
      companies: summary?.companies ?? rows.length,
      active: summary?.activeCompanies ?? rows.filter((company) => company.status === 'active').length,
      trial: summary?.trialCompanies ?? rows.filter((company) => ['trial', 'pending_verification', 'inactive'].includes(company.status ?? '')).length,
      suspended: summary?.suspendedCompanies ?? rows.filter((company) => ['suspended', 'blocked'].includes(company.status ?? '')).length,
      users: summary?.totalUsers ?? this.allUsers().length,
      signups: summary?.signupsThisMonth ?? rows.filter((company) => this.isThisMonth(company.createdAt)).length,
      mrr: summary?.mrrInr ?? 0,
      revenue: summary?.totalRevenueInr ?? realRevenue,
      subscriptionsActive: summary?.subscriptionsActive ?? this.activeSubscriptionRows().length,
      subscriptionsExpired: summary?.subscriptionsExpired ?? this.expiringOrExpiredRows().length,
      ticketsOpen: 0,
      ticketsPending: 0
    });
  }
  private applyPlanPreset(code: string): void {
    const preset = this.planPresets[String(code || '').toLowerCase()];
    if (!preset) return;

    this.billingPlanForm.patchValue(
      {
        name: preset.name,
        description: preset.description || '',
        priceInr: preset.priceInr,
        durationMonths: preset.durationMonths,
        employeeLimit: preset.employeeLimit,
        hrAccountLimit: preset.hrAccountLimit,
        features: (preset.features || []).join('\n')
      },
      { emitEvent: false }
    );
  }

  private apiErrorMessage(error: ApiHttpError, fallback: string): string {
    const details = error.error?.errors?.map((item) => item.message).filter(Boolean).join(' ');
    return [error.error?.message, details].filter(Boolean).join(' ') || fallback;
  }
  private loadPlatformTheme(): void {
    if (typeof localStorage === 'undefined') {
      this.applyPlatformTheme(this.platformThemeForm.getRawValue());
      return;
    }

    const stored = localStorage.getItem('platformTheme');
    if (stored) {
      try {
        this.platformThemeForm.patchValue(JSON.parse(stored));
      } catch {
        localStorage.removeItem('platformTheme');
      }
    }

    this.applyPlatformTheme(this.platformThemeForm.getRawValue());
  }

  private applyPlatformTheme(theme: {
    primaryColor: string;
    accentColor: string;
    dangerColor: string;
    sidebarStart: string;
    sidebarEnd: string;
  }): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.primaryColor);
    root.style.setProperty('--color-primary-rgb', this.hexToRgb(theme.primaryColor));
    root.style.setProperty('--color-accent', theme.accentColor);
    root.style.setProperty('--color-accent-rgb', this.hexToRgb(theme.accentColor));
    root.style.setProperty('--color-danger', theme.dangerColor);
    root.style.setProperty('--color-danger-rgb', this.hexToRgb(theme.dangerColor));
    root.style.setProperty('--color-sidebar', theme.sidebarStart);
    root.style.setProperty('--color-sidebar-rgb', this.hexToRgb(theme.sidebarStart));
    root.style.setProperty('--platform-sidebar-start', theme.sidebarStart);
    root.style.setProperty('--platform-sidebar-end', theme.sidebarEnd);
  }

  private hexToRgb(hex: string): string {
    const value = hex.replace('#', '');
    const full = value.length === 3 ? value.split('').map((item) => item + item).join('') : value;
    const number = Number.parseInt(full, 16);
    return `${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}`;
  }

  private isOnboardingCompany(company: CompanyRow): boolean {
    return !company.createdBy || company.status === 'pending_verification';
  }
  private planPrice(plan?: string): number {
    return this.planPrices[this.normalizedPlan(plan)] || this.planPrices['business'];
  }

  private normalizedPlan(plan?: string): string {
    return String(plan || 'business').toLowerCase().replace(/\s+/g, '-');
  }

  private isThisMonth(value?: string): boolean {
    if (!value) return false;
    const date = new Date(value);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }

  protected updateCompanyStatus(company: CompanyRow, status: 'active' | 'suspended' | 'blocked'): void {
    if (!company._id || this.isStatusSaving()) {
      return;
    }

    this.isStatusSaving.set(true);
    this.errorMessage.set('');

    this.api
      .patch<CompanyRow>(`/api/super-admin/companies/${company._id}/status`, { status })
      .pipe(finalize(() => this.isStatusSaving.set(false)))
      .subscribe({
        next: () => this.refresh(),
        error: (error: { error?: { message?: string } }) => {
          this.errorMessage.set(error.error?.message || 'Unable to update company status.');
        }
      });
  }
  protected toggleCompanyAdminStatus(admin: UserRow): void {
    if (!admin._id || this.isStatusSaving()) {
      return;
    }

    const nextStatus = (admin.status || 'active') === 'active' ? 'inactive' : 'active';
    this.isStatusSaving.set(true);
    this.errorMessage.set('');

    this.api
      .patch<UserRow>(`/users/${admin._id}`, { status: nextStatus })
      .pipe(finalize(() => this.isStatusSaving.set(false)))
      .subscribe({
        next: () => this.refresh(),
        error: (error: { error?: { message?: string } }) => {
          this.errorMessage.set(error.error?.message || 'Unable to update company admin status.');
        }
      });
  }

  protected createCompany(): void {
    if (this.companyForm.invalid || this.isCreatingCompany()) {
      this.companyForm.markAllAsTouched();
      return;
    }

    this.isCreatingCompany.set(true);
    this.errorMessage.set('');
    this.api
      .post('/api/super-admin/companies', this.companyForm.getRawValue())
      .pipe(finalize(() => this.isCreatingCompany.set(false)))
      .subscribe({
        next: () => {
          this.companyForm.reset({
            name: '',
            companyCode: '',
            email: '',
            phone: '',
            adminName: '',
            adminEmail: '',
            adminMobile: '',
            adminPassword: 'Admin@12345'
          });
          this.refresh();
    this.loadBillingAdmin();
    this.loadUsersAdmin();
    this.loadLoginLogs();
    this.loadBillingOverview();
        },
        error: (error: { error?: { message?: string } }) => {
          this.errorMessage.set(error.error?.message || 'Unable to create company.');
        }
      });
  }

  protected openCompany(company: CompanyRow): void {
    void this.router.navigate(['/dashboard'], {
      queryParams: { companyId: company._id, companyName: company.companyName }
    });
  }

  protected openCompanyAdmin(): void {
    void this.router.navigate(['/dashboard']);
  }

  protected openHrDashboard(): void {
    const company = this.companies()[0];
    void this.router.navigate(['/hr-dashboard'], {
      queryParams: company?._id ? { companyId: company._id, companyName: company.companyName } : {}
    });
  }

  protected openEmployeeDashboard(): void {
    void this.router.navigate(['/employee-dashboard']);
  }

  protected openReports(): void {
    void this.router.navigate(['/reports/activity']);
  }
}












