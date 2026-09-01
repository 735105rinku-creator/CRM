import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { apiUrl } from '../../core/config/api.config';
import { ApiService } from '../../core/services/api.service';
import { ImageCropperService } from '../../shared/services/image-cropper.service';

type EmployeeFeature =
  | 'dashboard'
  | 'profile'
  | 'documents'
  | 'bank'
  | 'attendance'
  | 'attendance-history'
  | 'leave'
  | 'apply-leave'
  | 'leave-history'
  | 'leave-balance'
  | 'payslip'
  | 'messages'
  | 'meetings'
  | 'events'
  | 'announcements'
  | 'holidays'
  | 'calendar'
  | 'my-leads'
  | 'my-deals'
  | 'my-tasks'
  | 'account-invoices'
  | 'account-payments'
  | 'account-expenses'
  | 'settings'
  | 'notifications';

interface CrmLeadRow {
  _id?: string;
  id?: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  address?: string;
  price?: number;
  priceType?: string;
  packagingOption?: string;
  source: string;
  businessCategory?: string;
  tradeType?: string;
  commodity?: string;
  quantity?: string;
  originLocation?: string;
  destinationLocation?: string;
  routeType?: string;
  logisticsRequired?: boolean;
  shipmentMode?: string;
  incoterm?: string;
  status: string;
  notes: string;
  createdAt: string;
}

interface CrmDealRow {
  _id?: string;
  id?: string;
  leadId: string;
  clientName: string;
  value: number;
  stage: string;
  businessCategory?: string;
  tradeType?: string;
  commodity?: string;
  quantity?: string;
  originLocation?: string;
  destinationLocation?: string;
  routeType?: string;
  logisticsRequired?: boolean;
  shipmentMode?: string;
  incoterm?: string;
  expectedClose: string;
  notes: string;
  createdAt: string;
}

interface CrmTaskRow {
  _id?: string;
  id?: string;
  title: string;
  relatedTo: string;
  taskType?: string;
  businessCategory?: string;
  routeType?: string;
  dueDate: string;
  priority: string;
  status: string;
  createdAt: string;
}

interface EmployeeCrmStore {
  leads: CrmLeadRow[];
  deals: CrmDealRow[];
  tasks: CrmTaskRow[];
}


interface AccountInvoiceRow {
  _id?: string;
  invoiceNumber?: string;
  clientName?: string;
  amount?: number;
  transactionType?: string;
  businessCategory?: string;
  commodity?: string;
  quantity?: string;
  routeType?: string;
  shipmentMode?: string;
  status?: string;
  dueDate?: string;
  notes?: string;
}

interface AccountPaymentRow {
  _id?: string;
  invoiceId?: string;
  payerName?: string;
  amount?: number;
  mode?: string;
  transactionType?: string;
  routeType?: string;
  status?: string;
  paymentDate?: string;
  reference?: string;
}

interface AccountExpenseRow {
  _id?: string;
  title?: string;
  category?: string;
  expenseType?: string;
  businessCategory?: string;
  routeType?: string;
  amount?: number;
  expenseDate?: string;
  status?: string;
  notes?: string;
}
interface AttendanceRecord {
  _id?: string;
  attendanceDate?: string;
  checkInTime?: string;
  checkOutTime?: string;
  totalWorkMinutes?: number;
  lateByMinutes?: number;
  isLate?: boolean;
  status?: string;
  punchLogs?: PunchLog[];
}

interface PunchLog {
  checkInTime?: string;
  checkOutTime?: string;
  totalWorkMinutes?: number;
}

interface LeaveRequest {
  _id?: string;
  fromDate?: string;
  toDate?: string;
  totalDays?: number;
  reason?: string;
  status?: string;
  approverRemarks?: string;
  leaveTypeId?: { leaveName?: string; leaveCode?: string };
}

interface EmployeeBankDetails {
  bankName?: string;
  branchName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  paymentMode?: string;
  isSalaryAccount?: boolean;
  cancelledChequeUrl?: string;
}

interface EmployeeDocumentItem {
  _id?: string;
  documentType?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  expiryDate?: string;
  verified?: boolean;
  remarks?: string;
}

interface EmployeeDocumentsResponse {
  documents?: EmployeeDocumentItem[];
}

interface LeaveBalanceRow {
  _id?: string;
  leaveTypeId?: { leaveName?: string; leaveCode?: string; category?: string };
  year?: number;
  openingBalance?: number;
  credited?: number;
  carryForward?: number;
  availed?: number;
  pending?: number;
  rejected?: number;
  availableBalance?: number;
}

interface NotificationRow {
  _id?: string;
  title?: string;
  message?: string;
  isRead?: boolean;
  createdAt?: string;
  actionUrl?: string;
}

interface HolidayRow {
  _id?: string;
  holidayName?: string;
  date?: string;
  type?: string;
  description?: string;
  holidayColor?: string;
  isActive?: boolean;
}

interface MessageRow {
  _id?: string;
  subject?: string;
  body?: string;
  status?: string;
  createdAt?: string;
  senderUserId?: { _id?: string; name?: string; email?: string; role?: string };
  recipientUserId?: { _id?: string; name?: string; email?: string; role?: string };
  parentMessageId?: { _id?: string; subject?: string } | string | null;
}

interface EmployeeRecipientRow {
  _id?: string;
  userId?: string;
  inviteType?: 'employee' | 'user';
  role?: string;
  employeeCode?: string;
  displayName?: string;
  officialEmail?: string;
  departmentId?: NamedRef;
  designationId?: NamedRef;
}

interface PayslipRow {
  _id?: string;
  payslipNumber?: string;
  month?: number;
  year?: number;
  grossSalary?: number;
  totalDeductions?: number;
  netSalary?: number;
  status?: string;
  pdfUrl?: string;
  payrollRunId?: { payrollCode?: string; status?: string };
}

interface EventRow {
  _id?: string;
  eventTitle?: string;
  eventType?: string;
  description?: string;
  venue?: string;
  meetingLink?: string;
  startDateTime?: string;
  endDateTime?: string;
  status?: string;
}

interface MeetingRow {
  _id?: string;
  meetingTitle?: string;
  meetingMode?: string;
  meetingLink?: string;
  venue?: string;
  startDateTime?: string;
  endDateTime?: string;
  status?: string;
}

interface CalendarDay {
  day: number | null;
  dateKey?: string;
  holidays: HolidayRow[];
}

interface NamedRef {
  branchName?: string;
  departmentName?: string;
  departmentCode?: string;
  featureKey?: string;
  dashboardKey?: string;
  accessModules?: string[];
  designationName?: string;
  displayName?: string;
  employeeCode?: string;
  shiftName?: string;
  startTime?: string;
  endTime?: string;
}

interface EmployeeProfile {
  _id?: string;
  employeeCode?: string;
  employeePhoto?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  officialEmail?: string;
  mobile?: string;
  joiningDate?: string;
  employeeStatus?: string;
  employmentType?: string;
  workMode?: string;
  attendanceAllowedDevices?: string[];
  workFromHomeAttendanceAllowed?: boolean;
  workFromHomeAttendanceAllowedAt?: string;
  workLocation?: string;
  branchId?: NamedRef;
  departmentId?: NamedRef;
  designationId?: NamedRef;
  reportingManagerId?: NamedRef;
  shiftId?: NamedRef;
}

type CompanyTheme = { primaryColor?: string; accentColor?: string; sidebarColor?: string };

interface EmployeeDashboardData {
  employee?: EmployeeProfile | null;
  company?: {
    companyName?: string;
    companyCode?: string;
    logo?: string;
    settings?: { theme?: CompanyTheme };
  } | null;
  user?: {
    name?: string;
    email?: string;
    mobile?: string;
    employeeCode?: string;
    department?: string;
    designation?: string;
    status?: string;
  };
  summary?: {
    totalEmployees?: number;
    activeEmployees?: number;
    inactiveEmployees?: number;
    resignedEmployees?: number;
  };
  upcomingBirthdays?: Array<{ displayName?: string; employeeCode?: string; dateOfBirth?: string }>;
  holidays?: { upcoming?: HolidayRow[] };
}

interface FeatureItem {
  id: EmployeeFeature;
  label: string;
  icon: string;
}

interface LogisticsMenuItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-employee-dashboard',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './employee-dashboard.component.html',
  styleUrls: ['../role-dashboard.scss', './employee-dashboard.component.scss']
})
export class EmployeeDashboardComponent implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly imageCropper = inject(ImageCropperService);
  private timerId: ReturnType<typeof setInterval> | null = null;
  private messagePollId: ReturnType<typeof setInterval> | null = null;
  private notificationPollId: ReturnType<typeof setInterval> | null = null;
  private popupTimerId: ReturnType<typeof setTimeout> | null = null;
  private hasLoadedMessages = false;
  private hasLoadedNotifications = false;

  protected readonly dashboard = signal<EmployeeDashboardData | null>(null);
  protected readonly todayAttendance = signal<AttendanceRecord | null>(null);
  protected readonly leaves = signal<LeaveRequest[]>([]);
  protected readonly leaveBalances = signal<LeaveBalanceRow[]>([]);
  protected readonly employeeBank = signal<EmployeeBankDetails | null>(null);
  protected readonly employeeDocuments = signal<EmployeeDocumentItem[]>([]);
  protected readonly attendanceHistory = signal<AttendanceRecord[]>([]);
  protected readonly notifications = signal<NotificationRow[]>([]);
  protected readonly holidays = signal<HolidayRow[]>([]);
  protected readonly messages = signal<MessageRow[]>([]);
  protected readonly employeeRecipients = signal<EmployeeRecipientRow[]>([]);
  protected readonly payslips = signal<PayslipRow[]>([]);
  protected readonly events = signal<EventRow[]>([]);
  protected readonly meetings = signal<MeetingRow[]>([]);
  protected readonly crmLeads = signal<CrmLeadRow[]>([]);
  protected readonly crmDeals = signal<CrmDealRow[]>([]);
  protected readonly crmTasks = signal<CrmTaskRow[]>([]);
  protected readonly editingLeadId = signal<string | null>(null);
  protected readonly accountInvoices = signal<AccountInvoiceRow[]>([]);
  protected readonly accountPayments = signal<AccountPaymentRow[]>([]);
  protected readonly accountExpenses = signal<AccountExpenseRow[]>([]);
  protected readonly businessCategories = ['Vegetables', 'Grains', 'Fruits', 'Logistics', 'Export', 'Import', 'General'] as const;
  protected readonly tradeTypes = ['Sell', 'Purchase'] as const;
  protected readonly routeTypes = ['Domestic', 'Export', 'Import'] as const;
  protected readonly shipmentModes = ['Road', 'Rail', 'Air', 'Sea', 'Courier'] as const;
  protected readonly expenseTypes = ['Operations', 'Purchase', 'Logistics', 'Export', 'Import', 'Packaging', 'Freight', 'Customs', 'General'] as const;
  protected readonly taskTypes = ['Follow-up', 'Call', 'Meeting', 'Quotation', 'Purchase', 'Dispatch', 'Logistics', 'Export Docs', 'Import Docs', 'Payment'] as const;
  protected readonly workTimer = signal('00:00:00');
  protected readonly leaveBalance = signal(0);
  protected readonly unreadCount = signal(0);
  protected readonly isNotificationPanelOpen = signal(false);
  protected readonly isRefreshing = signal(false);
  protected readonly isPunching = signal(false);
  protected readonly isLeaveSaving = signal(false);
  protected readonly isMessageSending = signal(false);
  protected readonly isMeetingSaving = signal(false);
  protected readonly isPhotoUploading = signal(false);
  protected readonly isPasswordChanging = signal(false);
  protected readonly visiblePasswordFields = signal<Record<string, boolean>>({});
  protected readonly message = signal('');
  protected readonly messagePopup = signal('');
  protected readonly activeSection = signal<EmployeeFeature>('dashboard');
  protected readonly viewEmployeeId = signal<string | null>(null);
  protected readonly viewCompanyId = signal<string | null>(null);
  protected readonly historyRange = signal<'month' | 'year'>('month');
  protected readonly historyMonth = signal(new Date().getMonth() + 1);
  protected readonly historyYear = signal(new Date().getFullYear());
  protected readonly holidayMonthFilter = signal<number | 'all'>(new Date().getMonth() + 1);
  protected readonly replyDrafts = signal<Record<string, string>>({});
  protected readonly weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  protected readonly employeeMenu: FeatureItem[] = [
    { id: 'dashboard', label: 'Overview', icon: 'D' },
    { id: 'attendance', label: 'Check-in/Check-out', icon: 'A' },
    { id: 'attendance-history', label: 'Attendance History', icon: 'H' },
    { id: 'apply-leave', label: 'Apply Leave', icon: 'L' },
    { id: 'leave-history', label: 'Leave History', icon: 'Y' },
    { id: 'leave-balance', label: 'Leave Balance', icon: 'B' },
    { id: 'payslip', label: 'Payslips', icon: 'P' },
    { id: 'profile', label: 'Personal Details', icon: 'P' },
    { id: 'documents', label: 'Documents', icon: 'D' },
    { id: 'bank', label: 'Bank Details', icon: 'B' },
    { id: 'events', label: 'Company Events', icon: 'E' },
    { id: 'holidays', label: 'Holiday Calendar', icon: 'H' },
    { id: 'meetings', label: 'Meetings', icon: 'M' },
    { id: 'announcements', label: 'Announcements', icon: 'N' },
    { id: 'my-leads', label: 'My Leads', icon: 'L' },
    { id: 'my-deals', label: 'My Deals', icon: 'D' },
    { id: 'my-tasks', label: 'My Tasks/Follow-ups', icon: 'T' },
    { id: 'account-invoices', label: 'Invoices', icon: 'I' },
    { id: 'account-payments', label: 'Payments', icon: 'P' },
    { id: 'account-expenses', label: 'Expenses', icon: 'E' },
    { id: 'messages', label: 'Internal Messaging', icon: 'C' },
    { id: 'settings', label: 'Settings', icon: 'S' },
    { id: 'notifications', label: 'Notification Preferences', icon: 'N' }
  ];

  protected readonly visibleEmployeeMenu = computed(() =>
    this.employeeMenu.filter((item) => this.canShowMenuItem(item.id))
  );

  protected readonly logisticsMenu: LogisticsMenuItem[] = [
    { label: 'Logistics Dashboard', icon: 'D', route: '/logistics/dashboard' },
    { label: 'New Air Cargo', icon: 'A', route: '/logistics/air-cargo/new' },
    { label: 'All Air Cargo', icon: 'L', route: '/logistics/air-cargo' },
    { label: 'Sea Freight', icon: 'S', route: '/logistics/sea-freight' },
    { label: 'CHA / Customs', icon: 'C', route: '/logistics/cha' },
    { label: 'Transporters', icon: 'T', route: '/logistics/transporters' },
    { label: 'Warehouse', icon: 'W', route: '/logistics/warehouse' },
    { label: 'Tracking', icon: 'G', route: '/logistics/tracking' },
    { label: 'Documents', icon: 'D', route: '/logistics/documents' },
    { label: 'Customers', icon: 'C', route: '/logistics/customers' },
    { label: 'Vendors', icon: 'V', route: '/logistics/vendors' },
    { label: 'Products / Services', icon: 'P', route: '/logistics/products-services' },
    { label: 'Vendor Payments', icon: '₹', route: '/logistics/vendor-payments' },
    { label: 'Logistics Invoice', icon: 'I', route: '/logistics/invoices/new' },
    { label: 'Reports', icon: 'R', route: '/logistics/reports' }
  ];

  protected readonly months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  protected readonly leaveForm = this.fb.nonNullable.group({
    leaveCode: ['CL', [Validators.required]],
    fromDate: [new Date().toISOString().slice(0, 10), [Validators.required]],
    toDate: [new Date().toISOString().slice(0, 10), [Validators.required]],
    dayType: ['full_day', [Validators.required]],
    reason: ['', [Validators.required, Validators.minLength(2)]]
  });

  protected readonly messageForm = this.fb.nonNullable.group({
    recipientEmployeeCode: [''],
    body: ['', [Validators.required, Validators.minLength(2)]]
  });

  protected readonly meetingForm = this.fb.nonNullable.group({
    meetingTitle: ['Team Meeting', [Validators.required, Validators.minLength(2)]],
    startDateTime: [new Date().toISOString().slice(0, 16), [Validators.required]],
    endDateTime: [new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16), [Validators.required]],
    attendeeInviteKeys: [[] as string[]]
  });

  protected readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  });
  protected readonly leadForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    company: [''],
    phone: [''],
    email: ['', [Validators.email]],
    address: [''],
    price: [0, [Validators.min(0)]],
    priceType: ['per kg'],
    packagingOption: ['No'],
    source: ['Website'],
    businessCategory: ['Vegetables'],
    tradeType: ['Sell'],
    commodity: [''],
    quantity: [''],
    originLocation: [''],
    destinationLocation: [''],
    routeType: ['Domestic'],
    logisticsRequired: [false],
    shipmentMode: ['Road'],
    incoterm: [''],
    status: ['New'],
    notes: ['']
  });

  protected readonly dealForm = this.fb.nonNullable.group({
    leadId: [''],
    clientName: ['', [Validators.required, Validators.minLength(2)]],
    value: [0, [Validators.min(0)]],
    stage: ['Proposal'],
    businessCategory: ['Vegetables'],
    tradeType: ['Sell'],
    commodity: [''],
    quantity: [''],
    originLocation: [''],
    destinationLocation: [''],
    routeType: ['Domestic'],
    logisticsRequired: [false],
    shipmentMode: ['Road'],
    incoterm: [''],
    expectedClose: [new Date().toISOString().slice(0, 10)],
    notes: ['']
  });

  protected readonly taskForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    relatedTo: [''],
    taskType: ['Follow-up'],
    businessCategory: ['General'],
    routeType: ['Domestic'],
    dueDate: [new Date().toISOString().slice(0, 10)],
    priority: ['Medium'],
    status: ['Open']
  });


  protected readonly invoiceForm = this.fb.nonNullable.group({
    invoiceNumber: ['', [Validators.required, Validators.minLength(2)]],
    clientName: ['', [Validators.required, Validators.minLength(2)]],
    amount: [0, [Validators.min(0)]],
    transactionType: ['Sell'],
    businessCategory: ['Vegetables'],
    commodity: [''],
    quantity: [''],
    routeType: ['Domestic'],
    shipmentMode: ['Road'],
    status: ['Pending'],
    dueDate: [new Date().toISOString().slice(0, 10)],
    notes: ['']
  });

  protected readonly paymentForm = this.fb.nonNullable.group({
    payerName: ['', [Validators.required, Validators.minLength(2)]],
    amount: [0, [Validators.min(0)]],
    mode: ['Bank Transfer'],
    transactionType: ['Sell'],
    routeType: ['Domestic'],
    status: ['Received'],
    paymentDate: [new Date().toISOString().slice(0, 10)],
    reference: ['']
  });

  protected readonly expenseForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    category: ['General'],
    expenseType: ['Operations'],
    businessCategory: ['General'],
    routeType: ['Domestic'],
    amount: [0, [Validators.min(0)]],
    expenseDate: [new Date().toISOString().slice(0, 10)],
    status: ['Pending'],
    notes: ['']
  });
  constructor() {
    this.viewEmployeeId.set(this.route.snapshot.queryParamMap.get('employeeId'));
    this.viewCompanyId.set(this.route.snapshot.queryParamMap.get('companyId'));
    if (!this.isPreviewMode() && !this.isLogisticsEmbedded() && this.auth.isLogisticsUser()) {
      void this.router.navigateByUrl('/logistics/dashboard');
      return;
    }
    this.route.queryParamMap.subscribe((params) => {
      const requestedFeature = params.get('feature');
      if (this.isEmployeeFeature(requestedFeature)) {
        this.activeSection.set(requestedFeature);
      }
    });
    this.applyCompanyTheme(this.currentCompanyFallback().settings?.theme);
    this.refresh();
    this.timerId = setInterval(() => this.updateTimer(), 1000);
    this.messagePollId = setInterval(() => this.loadMessages(true), 10000);
    this.notificationPollId = setInterval(() => this.loadNotifications(true), 10000);
  }

  ngOnDestroy(): void {
    if (this.timerId) clearInterval(this.timerId);
    if (this.messagePollId) clearInterval(this.messagePollId);
    if (this.notificationPollId) clearInterval(this.notificationPollId);
    if (this.popupTimerId) clearTimeout(this.popupTimerId);
  }

  protected isLogisticsEmbedded(): boolean {
    const path = this.router.url.split('?')[0].split('#')[0];
    return path === '/logistics/employee';
  }

  protected refreshDashboard(): void {
    this.refresh(true);
  }

  protected refresh(showSuccess = false): void {
    if (this.isPreviewMode()) {
      this.refreshEmployeePreview();
      return;
    }

    this.isRefreshing.set(true);
    forkJoin({
      dashboard: this.api.get<EmployeeDashboardData>('/hr/employees/dashboard').pipe(catchError(() => of(null))),
      attendance: this.api.get<AttendanceRecord | null>('/hr/attendance/self/today').pipe(catchError(() => of(null))),
      leaves: this.api.get<{ leaveRequests?: LeaveRequest[] }>('/hr/leave/self/requests', { limit: 40 }).pipe(catchError(() => of({ leaveRequests: [] }))),
      balances: this.api.get<{ leaveBalances?: LeaveBalanceRow[] }>('/hr/leave/self/balances', {
        year: new Date().getFullYear(),
        limit: 40
      }).pipe(catchError(() => of({ leaveBalances: [] }))),
      notifications: this.api.get<{ notifications?: NotificationRow[] }>('/hr/communication/notifications', { limit: 4 }).pipe(catchError(() => of({ notifications: [] }))),
      unread: this.api.get<{ unreadCount?: number }>('/hr/communication/notifications/unread-count').pipe(catchError(() => of({ unreadCount: 0 }))),
      history: this.api.get<{ attendance?: AttendanceRecord[] }>('/hr/attendance/self/records', this.historyQuery()).pipe(catchError(() => of({ attendance: [] }))),
      messages: this.api.get<{ messages?: MessageRow[] }>('/hr/communication/messages', { limit: 50 }).pipe(catchError(() => of({ messages: [] }))),
      recipients: this.api.get<{ employees?: EmployeeRecipientRow[] }>('/hr/communication/messages/employee-recipients', { limit: 40 }).pipe(catchError(() => of({ employees: [] }))),
      payslips: this.api.get<{ payslips?: PayslipRow[] }>('/hr/payroll/payslips', { limit: 50 }).pipe(catchError(() => of({ payslips: [] }))),
      holidays: this.api.get<{ holidays?: HolidayRow[] }>('/hr/holidays', { limit: 40 }).pipe(catchError(() => of({ holidays: [] }))),
      events: this.api.get<{ events?: EventRow[] }>('/hr/events', { status: 'published', limit: 50 }).pipe(catchError(() => of({ events: [] }))),
      meetings: this.api.get<{ meetings?: MeetingRow[] }>('/hr/meetings', { status: 'scheduled', limit: 50 }).pipe(catchError(() => of({ meetings: [] })))
    }).pipe(finalize(() => this.isRefreshing.set(false))).subscribe(({ dashboard, attendance, leaves, balances, notifications, unread, history, messages, recipients, payslips, holidays, events, meetings }) => {
      this.dashboard.set(dashboard);
      this.applyCompanyTheme(dashboard?.company?.settings?.theme || this.currentCompanyFallback().settings?.theme);
      if (!this.isLogisticsEmbedded() && this.isEmployeeLogin() && this.isLogisticsDepartment()) {
        void this.router.navigateByUrl('/logistics/dashboard');
        return;
      }
      this.loadEmployeeExtras(dashboard?.employee?._id);
      this.todayAttendance.set(attendance);
      this.leaves.set(leaves.leaveRequests ?? []);
      this.setLeaveBalances(balances.leaveBalances ?? []);
      this.attendanceHistory.set(history.attendance ?? []);
      this.payslips.set(payslips.payslips ?? []);
      this.employeeRecipients.set(recipients.employees ?? []);
      this.events.set(events.events ?? []);
      this.meetings.set(meetings.meetings ?? []);
      this.applyNotifications(notifications.notifications ?? [], unread.unreadCount ?? 0, false);
      this.holidays.set(holidays.holidays?.length ? holidays.holidays : dashboard?.holidays?.upcoming ?? []);
      this.applyMessages(messages.messages ?? [], false);
      this.updateTimer();
      this.ensureAllowedActiveSection();
      if (this.isSalesDepartment()) {
        this.loadCrmWorkspace();
      } else {
        this.crmLeads.set([]);
        this.crmDeals.set([]);
        this.crmTasks.set([]);
      }
      if (this.isAccountsDepartment()) {
        this.loadAccountingWorkspace();
      } else {
        this.accountInvoices.set([]);
        this.accountPayments.set([]);
        this.accountExpenses.set([]);
      }
      if (showSuccess) this.message.set('Dashboard refreshed.');
    });
  }

  private loadCrmWorkspace(): void {
    forkJoin({
      leads: this.api.get<{ leads?: CrmLeadRow[] }>('/crm/leads').pipe(catchError(() => of({ leads: [] }))),
      deals: this.api.get<{ deals?: CrmDealRow[] }>('/crm/deals').pipe(catchError(() => of({ deals: [] }))),
      tasks: this.api.get<{ tasks?: CrmTaskRow[] }>('/crm/tasks').pipe(catchError(() => of({ tasks: [] })))
    }).subscribe(({ leads, deals, tasks }) => {
      this.crmLeads.set(leads.leads ?? []);
      this.crmDeals.set(deals.deals ?? []);
      this.crmTasks.set(tasks.tasks ?? []);
    });
  }

  private saveCrmWorkspace(): void {}

  private loadAccountingWorkspace(): void {
    forkJoin({
      invoices: this.api.get<{ invoices?: AccountInvoiceRow[] }>('/accounting/invoices').pipe(catchError(() => of({ invoices: [] }))),
      payments: this.api.get<{ payments?: AccountPaymentRow[] }>('/accounting/payments').pipe(catchError(() => of({ payments: [] }))),
      expenses: this.api.get<{ expenses?: AccountExpenseRow[] }>('/accounting/expenses').pipe(catchError(() => of({ expenses: [] })))
    }).subscribe(({ invoices, payments, expenses }) => {
      this.accountInvoices.set(invoices.invoices ?? []);
      this.accountPayments.set(payments.payments ?? []);
      this.accountExpenses.set(expenses.expenses ?? []);
    });
  }

  protected createInvoice(): void {
    if (this.invoiceForm.invalid) return;
    const value = this.invoiceForm.getRawValue();
    this.api.post('/accounting/invoices', { ...value, amount: Number(value.amount || 0) }).subscribe(() => {
      this.invoiceForm.reset({ invoiceNumber: '', clientName: '', amount: 0, status: 'Pending', dueDate: new Date().toISOString().slice(0, 10), notes: '' });
      this.loadAccountingWorkspace();
    });
  }

  protected createPayment(): void {
    if (this.paymentForm.invalid) return;
    const value = this.paymentForm.getRawValue();
    this.api.post('/accounting/payments', { ...value, amount: Number(value.amount || 0) }).subscribe(() => {
      this.paymentForm.reset({ payerName: '', amount: 0, mode: 'Bank Transfer', status: 'Received', paymentDate: new Date().toISOString().slice(0, 10), reference: '' });
      this.loadAccountingWorkspace();
    });
  }

  protected createExpense(): void {
    if (this.expenseForm.invalid) return;
    const value = this.expenseForm.getRawValue();
    this.api.post('/accounting/expenses', { ...value, amount: Number(value.amount || 0) }).subscribe(() => {
      this.expenseForm.reset({ title: '', category: 'General', amount: 0, expenseDate: new Date().toISOString().slice(0, 10), status: 'Pending', notes: '' });
      this.loadAccountingWorkspace();
    });
  }

  protected updateAccounting(module: 'invoices' | 'payments' | 'expenses', id: string | undefined, body: Record<string, unknown>): void {
    if (!id) return;
    this.api.patch(`/accounting/${module}/${id}`, body).subscribe(() => this.loadAccountingWorkspace());
  }

  protected accountReceivableTotal(): number {
    return this.accountInvoices().filter((item) => item.status !== 'Paid').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }

  protected accountExpenseTotal(): number {
    return this.accountExpenses().reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }

  protected createLead(): void {
    if (this.leadForm.invalid) {
      this.leadForm.markAllAsTouched();
      return;
    }

    const currentUser = this.auth.currentUser() as { id?: string; _id?: string; sub?: string } | null;
    const formValue = this.leadForm.getRawValue();
    const payload = {
      ...formValue,
      price: Number(formValue.price || 0),
      assignedEmployeeCode: this.employeeCode(),
      assignedUserId: currentUser?.id || currentUser?._id || currentUser?.sub || ''
    };

    if (this.editingLeadId()) {
      this.api.patch<CrmLeadRow>(`/crm/leads/${this.editingLeadId()}`, payload).subscribe({
        next: () => {
          this.resetLeadForm();
          this.loadCrmWorkspace();
          this.message.set('Lead updated.');
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to update lead.')
      });
      return;
    }

    this.api.post<CrmLeadRow>('/crm/leads', payload).subscribe({
      next: () => {
        this.resetLeadForm();
        this.loadCrmWorkspace();
        this.message.set('Lead added.');
      },
      error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to add lead.')
    });
  }

  protected resetLeadForm(): void {
    this.leadForm.reset({
      name: '',
      company: '',
      phone: '',
      email: '',
      address: '',
      price: 0,
      priceType: 'per kg',
      packagingOption: 'No',
      source: 'Website',
      businessCategory: 'Vegetables',
      tradeType: 'Sell',
      commodity: '',
      quantity: '',
      originLocation: '',
      destinationLocation: '',
      routeType: 'Domestic',
      logisticsRequired: false,
      shipmentMode: 'Road',
      incoterm: '',
      status: 'New',
      notes: ''
    });
    this.editingLeadId.set(null);
  }

  protected startLeadEdit(lead: CrmLeadRow): void {
    const leadId = lead.id || lead._id;
    if (!leadId) return;

    this.api.get<CrmLeadRow>(`/crm/leads/${leadId}`).subscribe({
      next: (row) => {
        this.editingLeadId.set(leadId);
        this.leadForm.patchValue({
          name: row.name || '',
          company: row.company || '',
          phone: row.phone || '',
          email: row.email || '',
          address: row.address || '',
          price: row.price ?? 0,
          priceType: row.priceType || 'per kg',
          packagingOption: row.packagingOption || 'No',
          source: row.source || 'Website',
          businessCategory: row.businessCategory || 'Vegetables',
          tradeType: row.tradeType || 'Sell',
          commodity: row.commodity || '',
          quantity: row.quantity || '',
          originLocation: row.originLocation || '',
          destinationLocation: row.destinationLocation || '',
          routeType: row.routeType || 'Domestic',
          logisticsRequired: row.logisticsRequired ?? false,
          shipmentMode: row.shipmentMode || 'Road',
          incoterm: row.incoterm || '',
          status: row.status || 'New',
          notes: row.notes || ''
        });
      },
      error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to load lead for editing.')
    });
  }

  protected cancelLeadEdit(): void {
    this.resetLeadForm();
  }

  protected createDeal(): void {
    if (this.dealForm.invalid) {
      this.dealForm.markAllAsTouched();
      return;
    }

    const currentUser = this.auth.currentUser() as { id?: string; _id?: string; sub?: string } | null;
    const value = this.dealForm.getRawValue();
    this.api.post<CrmDealRow>('/crm/deals', {
      ...value,
      value: Number(value.value || 0),
      assignedEmployeeCode: this.employeeCode(),
      assignedUserId: currentUser?.id || currentUser?._id || currentUser?.sub || ''
    }).subscribe({
      next: () => {
        this.dealForm.reset({ leadId: '', clientName: '', value: 0, stage: 'Proposal', expectedClose: new Date().toISOString().slice(0, 10), notes: '' });
        this.loadCrmWorkspace();
        this.message.set('Deal added.');
      },
      error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to add deal.')
    });
  }

  protected createTask(): void {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const currentUser = this.auth.currentUser() as { id?: string; _id?: string; sub?: string } | null;
    const payload = {
      ...this.taskForm.getRawValue(),
      assignedEmployeeCode: this.employeeCode(),
      assignedUserId: currentUser?.id || currentUser?._id || currentUser?.sub || ''
    };

    this.api.post<CrmTaskRow>('/crm/tasks', payload).subscribe({
      next: () => {
        this.taskForm.reset({ title: '', relatedTo: '', dueDate: new Date().toISOString().slice(0, 10), priority: 'Medium', status: 'Open' });
        this.loadCrmWorkspace();
        this.message.set('Follow-up task added.');
      },
      error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to add task.')
    });
  }

  protected updateLeadStatus(lead: CrmLeadRow, status: string): void {
    this.api.patch<CrmLeadRow>(`/crm/leads/${lead.id || lead._id}`, { status }).subscribe(() => this.loadCrmWorkspace());
  }

  protected updateDealStage(deal: CrmDealRow, stage: string): void {
    this.api.patch<CrmDealRow>(`/crm/deals/${deal.id || deal._id}`, { stage }).subscribe(() => this.loadCrmWorkspace());
  }

  protected updateTaskStatus(task: CrmTaskRow, status: string): void {
    this.api.patch<CrmTaskRow>(`/crm/tasks/${task.id || task._id}`, { status }).subscribe(() => this.loadCrmWorkspace());
  }

  protected crmPipelineValue(): number {
    return this.crmDeals().reduce((sum, deal) => sum + Number(deal.value || 0), 0);
  }

  protected openTaskCount(): number {
    return this.crmTasks().filter((task) => task.status !== 'Done').length;
  }

  protected leadName(leadId?: string): string {
    const lead = this.crmLeads().find((item) => (item.id || item._id) === leadId);
    return lead ? `${lead.name}${lead.company ? ' - ' + lead.company : ''}` : '-';
  }

  private recordId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}`;
  }

  private loadEmployeeExtras(employeeId?: string): void {
    if (!employeeId) {
      this.employeeBank.set(null);
      this.employeeDocuments.set([]);
      return;
    }

    forkJoin({
      bank: this.api.get<EmployeeBankDetails | null>(`/hr/employees/${employeeId}/bank`).pipe(catchError(() => of(null))),
      documents: this.api.get<EmployeeDocumentsResponse | null>(`/hr/employees/${employeeId}/documents`).pipe(catchError(() => of(null)))
    }).subscribe(({ bank, documents }) => {
      this.employeeBank.set(bank);
      this.employeeDocuments.set(documents?.documents ?? []);
    });
  }

  protected changePassword(): void {
    if (this.passwordForm.invalid || this.isPasswordChanging()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const body = this.passwordForm.getRawValue();
    if (body.newPassword !== body.confirmPassword) {
      this.message.set('New password and confirm password do not match.');
      return;
    }

    this.isPasswordChanging.set(true);
    this.message.set('');
    this.api
      .post('/auth/change-password', body)
      .pipe(finalize(() => this.isPasswordChanging.set(false)))
      .subscribe({
        next: () => {
          this.passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
          this.message.set('Password changed successfully. Please login again.');
          setTimeout(() => this.auth.logout(), 800);
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to change password.')
      });
  }

  protected setActiveSection(section: EmployeeFeature): void {
    if (!this.canAccessSection(section)) {
      this.message.set('This option is not available for your department.');
      section = 'dashboard';
    }
    this.isNotificationPanelOpen.set(false);
    this.activeSection.set(section);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { feature: section === 'dashboard' ? null : section },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    if (section === 'messages') {
      this.loadMessages(false);
      this.markMessageNotificationsSeen();
    }
    if (section === 'notifications') {
      this.markNotificationsSeen();
    }
  }

  protected toggleNotificationPanel(): void {
    this.isNotificationPanelOpen.update((value) => !value);
    if (!this.isNotificationPanelOpen()) return;
    this.loadNotifications(false);
    this.markNotificationsSeen();
  }

  protected closeNotificationPanel(): void {
    this.isNotificationPanelOpen.set(false);
  }

  private isEmployeeFeature(value: string | null): value is EmployeeFeature {
    return [
      'dashboard', 'profile', 'documents', 'bank', 'attendance', 'attendance-history',
      'leave', 'apply-leave', 'leave-history', 'leave-balance', 'payslip', 'messages',
      'meetings', 'events', 'announcements', 'holidays', 'calendar', 'my-leads', 'my-deals',
      'my-tasks', 'account-invoices', 'account-payments', 'account-expenses', 'settings', 'notifications'
    ].includes(value || '');
  }

  protected loadMessages(showPopup: boolean): void {
    this.api
      .get<{ messages?: MessageRow[] }>('/hr/communication/messages', { limit: 50 })
      .pipe(catchError(() => of({ messages: [] })))
      .subscribe((data) => {
        const rows = data.messages ?? [];
        this.applyMessages(rows, showPopup);
        if (this.activeSection() === 'messages') {
          this.markMessageNotificationsSeen(rows);
        }
      });
  }

  protected replyDraft(messageId?: string): string {
    return messageId ? this.replyDrafts()[messageId] || '' : '';
  }

  protected setReplyDraft(messageId: string | undefined, value: string): void {
    if (!messageId) return;
    this.replyDrafts.update((drafts) => ({ ...drafts, [messageId]: value }));
  }

  protected sendMessage(): void {
    if (this.messageForm.invalid || this.isMessageSending()) {
      this.messageForm.markAllAsTouched();
      return;
    }

    this.isMessageSending.set(true);
    this.message.set('');
    this.api
      .post<{ message?: MessageRow }>('/hr/communication/messages', this.messageForm.getRawValue())
      .pipe(finalize(() => this.isMessageSending.set(false)))
      .subscribe({
        next: () => {
          this.message.set('Message sent to HR.');
          this.message.set(this.messageForm.controls.recipientEmployeeCode.value ? 'Message sent to employee.' : 'Message sent to HR.');
          this.messageForm.reset({ recipientEmployeeCode: '', body: '' });
          this.loadMessages(false);
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to send message.')
      });
  }

  protected sendReply(message: MessageRow): void {
    const body = this.replyDraft(message._id).trim();
    if (!message._id || !body || this.isMessageSending()) return;

    this.isMessageSending.set(true);
    this.api
      .post<{ message?: MessageRow }>('/hr/communication/messages', {
        parentMessageId: message._id,
        body
      })
      .pipe(finalize(() => this.isMessageSending.set(false)))
      .subscribe({
        next: () => {
          this.replyDrafts.update((drafts) => ({ ...drafts, [message._id as string]: '' }));
          this.loadMessages(false);
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to send reply.')
      });
  }

  protected userLabel(user?: { name?: string; email?: string; role?: string } | null): string {
    return user?.name || user?.email || user?.role || '-';
  }

  protected chatMessages(): MessageRow[] {
    return [...this.messages()].sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());
  }

  protected isOwnMessage(message: MessageRow): boolean {
    const current = this.auth.currentUser() as { id?: string; _id?: string; sub?: string } | null;
    const currentId = current?.id || current?._id || current?.sub;
    return Boolean(currentId && message.senderUserId?._id === currentId);
  }

  protected togglePunch(): void {
    if (!this.canUsePunch()) return;

    if (this.activePunch()) {
      this.punchOut();
      return;
    }

    this.punchIn();
  }

  protected isPunchComplete(): boolean {
    return Boolean(this.todayAttendance()?.checkInTime && !this.activePunch());
  }

  protected punchButtonText(): string {
    return this.activePunch() ? 'Punch Out' : 'Punch In';
  }

  protected punchSubText(): string {
    if (this.isLunchTime()) return 'Lunch time';
    if (this.activePunch()) return 'Working';
    if (this.todayAttendance()?.checkInTime) return 'Start next session';
    return 'Start day';
  }

  protected punchStateClass(): string {
    if (this.isLunchTime() && this.activePunch()) {
      return 'lunch';
    }

    if (this.activePunch()) return 'in';
    if (this.todayAttendance()?.checkInTime) return 'out';
    return 'start';
  }

  protected setHistoryRange(value: 'month' | 'year'): void {
    this.historyRange.set(value);
    this.applyCompanyTheme(this.currentCompanyFallback().settings?.theme);
    this.refresh();
  }

  protected setHistoryMonth(value: string): void {
    this.historyMonth.set(Number(value));
    this.applyCompanyTheme(this.currentCompanyFallback().settings?.theme);
    this.refresh();
  }

  protected setHolidayMonthFilter(value: string): void {
    this.holidayMonthFilter.set(value === 'all' ? 'all' : Number(value));
  }

  protected setHistoryYear(value: string): void {
    this.historyYear.set(Number(value));
    this.applyCompanyTheme(this.currentCompanyFallback().settings?.theme);
    this.refresh();
  }

  protected years(): number[] {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 2 }, (_, index) => currentYear - index);
  }

  protected lateCountThisMonth(): number {
    return this.attendanceHistory().filter((record) => record.isLate || record.status === 'late' || (record.lateByMinutes || 0) > 0).length;
  }
  protected monthlyAttendancePercent(): number {
    const rows = this.attendanceHistory();
    if (!rows.length) return 0;
    const present = rows.filter((record) => ['present', 'late', 'half_day'].includes(record.status || '') || record.checkInTime).length;
    return Math.round((present / rows.length) * 100);
  }

  protected leaveBalanceByCode(code: string): number {
    const balance = this.leaveBalances().find((item) =>
      String(item.leaveTypeId?.leaveCode || item.leaveTypeId?.category || '').toLowerCase().includes(code.toLowerCase())
    );
    return balance ? this.leaveBalanceAvailable(balance) : 0;
  }

  protected attendanceTrend(): Array<{ label: string; status: string }> {
    return this.attendanceHistory().slice(-12).map((record) => ({
      label: record.attendanceDate ? new Date(record.attendanceDate).getDate().toString() : '-',
      status: record.status || (record.checkInTime ? 'present' : 'absent')
    }));
  }

  protected leaveHistoryBars(): Array<{ label: string; value: number; percent: number }> {
    const counts = this.leaves().reduce<Record<string, number>>((total, leave) => {
      const label = leave.leaveTypeId?.leaveCode || 'Leave';
      total[label] = (total[label] || 0) + Number(leave.totalDays || 0);
      return total;
    }, {});
    const max = Math.max(...Object.values(counts), 1);
    return Object.entries(counts).map(([label, value]) => ({
      label,
      value,
      percent: Math.max(8, Math.round((value / max) * 100))
    }));
  }

  protected recentActivity(): Array<{ title: string; meta: string }> {
    const leaveUpdates = this.leaves().slice(0, 3).map((leave) => ({
      title: `Leave ${leave.status || 'pending'}`,
      meta: `${leave.leaveTypeId?.leaveName || 'Leave'} | ${this.formatDate(leave.fromDate)}`
    }));
    const alerts = this.notifications().slice(0, 3).map((item) => ({
      title: item.title || 'Announcement',
      meta: item.message || this.formatDateTime(item.createdAt)
    }));
    const payslip = this.payslips()[0]
      ? [{ title: 'Payslip generated', meta: this.payslipMonthLabel(this.payslips()[0]) }]
      : [];
    return [...leaveUpdates, ...alerts, ...payslip].slice(0, 6);
  }

  protected leaveHistory(): LeaveRequest[] {
    return this.leaves()
      .sort((a, b) => new Date(b.fromDate || '').getTime() - new Date(a.fromDate || '').getTime());
  }

  protected leaveCodeOptions(): Array<{ code: string; label: string }> {
    const options = this.leaveBalances()
      .map((balance) => ({
        code: balance.leaveTypeId?.leaveCode || '',
        label: this.leaveBalanceLabel(balance)
      }))
      .filter((item) => Boolean(item.code));

    return options.length ? options : [{ code: 'CL', label: 'Casual Leave (CL)' }];
  }

  protected leaveBalanceLabel(balance: LeaveBalanceRow): string {
    const code = balance.leaveTypeId?.leaveCode || 'Leave';
    const name = balance.leaveTypeId?.leaveName || code;
    return `${name} (${code})`;
  }

  protected leaveBalanceTotal(balance: LeaveBalanceRow): number {
    const opening = Number(balance.openingBalance || 0);
    const credited = Number(balance.credited || 0);
    const carryForward = Number(balance.carryForward || 0);
    const used = Number(balance.availed || 0);
    const pending = Number(balance.pending || 0);
    const available = Number(balance.availableBalance || 0);

    if (opening > 0 && opening === credited && available + used + pending <= opening + carryForward) {
      return opening + carryForward;
    }

    return opening + credited + carryForward;
  }

  protected leaveBalanceAvailable(balance: LeaveBalanceRow): number {
    const available = Number(balance.availableBalance ?? Math.max(0, this.leaveBalanceTotal(balance) - Number(balance.availed || 0)));
    return Math.max(0, available - Number(balance.pending || 0));
  }

  protected leaveBalanceUsed(balance: LeaveBalanceRow): number {
    return Number(balance.availed || 0);
  }

  protected leaveBalancePending(balance: LeaveBalanceRow): number {
    return Number(balance.pending || 0);
  }

  protected leaveBalanceRemainingText(balance: LeaveBalanceRow): string {
    return `${this.leaveBalanceAvailable(balance)} / ${this.leaveBalanceTotal(balance)}`;
  }

  protected selectedLeaveBalance(): LeaveBalanceRow | undefined {
    const selectedCode = this.leaveForm.controls.leaveCode.value;
    return this.leaveBalances().find((balance) => balance.leaveTypeId?.leaveCode === selectedCode);
  }

  protected requestedLeaveDays(): number {
    const fromDate = this.leaveForm.controls.fromDate.value;
    const toDate = this.leaveForm.controls.toDate.value;
    const dayType = this.leaveForm.controls.dayType.value;

    if (!fromDate || !toDate) return 0;
    if (dayType !== 'full_day') return 0.5;

    const from = new Date(fromDate);
    const to = new Date(toDate);
    from.setHours(0, 0, 0, 0);
    to.setHours(0, 0, 0, 0);

    return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000) + 1);
  }

  protected canApplySelectedLeave(): boolean {
    const balance = this.selectedLeaveBalance();
    const requestedDays = this.requestedLeaveDays();
    return Boolean(balance && requestedDays > 0 && this.leaveBalanceAvailable(balance) >= requestedDays);
  }

  protected leaveBalancePercent(balance: LeaveBalanceRow): number {
    const total = this.leaveBalanceTotal(balance);
    if (!total) return 0;
    return Math.min(100, Math.max(0, (this.leaveBalanceAvailable(balance) / total) * 100));
  }

  protected punchIn(): void {
    if (!this.canUsePunch()) return;

    this.isPunching.set(true);
    this.message.set('');
    this.api
      .post<AttendanceRecord>('/hr/attendance/check-in', {})
      .pipe(finalize(() => this.isPunching.set(false)))
      .subscribe({
        next: (record) => {
          this.todayAttendance.set(record);
          this.message.set('Punch in recorded.');
          this.updateTimer();
          this.applyCompanyTheme(this.currentCompanyFallback().settings?.theme);
    this.refresh();
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to punch in.')
      });
  }

  protected punchOut(): void {
    if (!this.canUsePunch()) return;

    this.isPunching.set(true);
    this.message.set('');
    this.api
      .post<AttendanceRecord>('/hr/attendance/check-out', {})
      .pipe(finalize(() => this.isPunching.set(false)))
      .subscribe({
        next: (record) => {
          this.todayAttendance.set(record);
          this.message.set('Punch out recorded.');
          this.updateTimer();
          this.applyCompanyTheme(this.currentCompanyFallback().settings?.theme);
    this.refresh();
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to punch out.')
      });
  }

  protected applyLeave(): void {
    if (this.isPreviewMode()) return;

    if (this.leaveForm.invalid || this.isLeaveSaving()) {
      this.leaveForm.markAllAsTouched();
      return;
    }

    const selectedBalance = this.selectedLeaveBalance();
    const requestedDays = this.requestedLeaveDays();

    if (!selectedBalance) {
      this.message.set('Selected leave type is not assigned to you.');
      return;
    }

    if (requestedDays <= 0) {
      this.message.set('Please select a valid leave date range.');
      return;
    }

    if (this.leaveBalanceAvailable(selectedBalance) < requestedDays) {
      this.message.set(
        `Insufficient ${selectedBalance.leaveTypeId?.leaveCode || 'leave'} balance. Available: ${this.leaveBalanceAvailable(selectedBalance)}, requested: ${requestedDays}.`
      );
      return;
    }

    this.isLeaveSaving.set(true);
    this.message.set('');
    this.api
      .post<LeaveRequest>('/hr/leave/self/requests', this.leaveForm.getRawValue())
      .pipe(finalize(() => this.isLeaveSaving.set(false)))
      .subscribe({
        next: () => {
          this.message.set('Leave applied. HR has been notified.');
          this.leaveForm.patchValue({ reason: '' });
          this.applyCompanyTheme(this.currentCompanyFallback().settings?.theme);
    this.refresh();
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to apply leave.')
      });
  }

  private setLeaveBalances(balances: LeaveBalanceRow[]): void {
    this.leaveBalances.set(
      [...balances].sort((a, b) =>
        (a.leaveTypeId?.leaveCode || '').localeCompare(b.leaveTypeId?.leaveCode || '')
      )
    );
    this.leaveBalance.set(
      balances.reduce((sum, balance) => sum + this.leaveBalanceAvailable(balance), 0)
    );
    const currentCode = this.leaveForm.controls.leaveCode.value;
    const hasCurrentCode = balances.some((balance) => balance.leaveTypeId?.leaveCode === currentCode);
    const firstCode = balances[0]?.leaveTypeId?.leaveCode;
    if (!hasCurrentCode && firstCode) {
      this.leaveForm.patchValue({ leaveCode: firstCode });
    }
  }

  protected async uploadEmployeePhoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const employeeId = this.dashboard()?.employee?._id;

    if (!file || !employeeId || this.isPhotoUploading()) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.message.set('Please select a valid image file.');
      input.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.message.set('Profile photo source must be 10 MB or smaller.');
      input.value = '';
      return;
    }

    let croppedFile: File | null = null;

    try {
      croppedFile = await this.imageCropper.cropImage(file, {
        title: 'Crop profile photo',
        outputSize: 512
      });
    } catch {
      this.message.set('Unable to crop selected image.');
      input.value = '';
      return;
    }

    if (!croppedFile) {
      input.value = '';
      return;
    }

    if (croppedFile.size > 2 * 1024 * 1024) {
      this.message.set('Cropped profile photo must be 2 MB or smaller.');
      input.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('photo', croppedFile);

    this.isPhotoUploading.set(true);
    this.message.set('');
    this.api
      .patch<EmployeeProfile>(`/hr/employees/${employeeId}/photo`, formData)
      .pipe(finalize(() => {
        this.isPhotoUploading.set(false);
        input.value = '';
      }))
      .subscribe({
        next: (employee) => {
          const currentDashboard = this.dashboard();
          this.dashboard.set({
            ...(currentDashboard ?? {}),
            employee: {
              ...(currentDashboard?.employee ?? {}),
              ...employee
            }
          });
          this.message.set('Profile photo updated.');
          this.applyCompanyTheme(this.currentCompanyFallback().settings?.theme);
    this.refresh();
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to upload profile photo.')
      });
  }

  protected isPasswordFieldVisible(field: string): boolean {
    return Boolean(this.visiblePasswordFields()[field]);
  }

  protected togglePasswordField(field: string): void {
    this.visiblePasswordFields.update((fields) => ({
      ...fields,
      [field]: !fields[field]
    }));
  }
  protected isPreviewMode(): boolean {
    return Boolean(this.viewEmployeeId()) && !this.isEmployeeLogin();
  }

  protected canUsePunch(): boolean {
    return this.isEmployeeLogin() && !this.isPreviewMode();
  }

  protected userName(): string {
    const employee = this.dashboard()?.employee;
    const fullName = [employee?.firstName, employee?.lastName].filter(Boolean).join(' ');
    return employee?.displayName || fullName || this.dashboard()?.user?.name || this.auth.currentUser()?.name || 'Employee';
  }

  protected userEmail(): string {
    return this.dashboard()?.employee?.officialEmail || this.dashboard()?.user?.email || this.auth.currentUser()?.email || 'employee@company.com';
  }

  protected employeeCode(): string {
    return this.dashboard()?.employee?.employeeCode || this.dashboard()?.user?.employeeCode || '-';
  }

  protected workModeLabel(): string {
    const mode = String(this.dashboard()?.employee?.workMode || '').trim().toLowerCase();
    const labels: Record<string, string> = {
      office: 'Office',
      hybrid: 'Hybrid',
      remote: 'Remote',
      field: 'Field'
    };
    return labels[mode] || '-';
  }

  protected attendanceDeviceLabels(): string {
    const devices = this.normalizeAttendanceDevices(this.dashboard()?.employee?.attendanceAllowedDevices);
    const labels: Record<string, string> = {
      desktop: 'Desktop',
      laptop: 'Laptop',
      mobile: 'Mobile',
      tablet: 'Tablet'
    };
    return devices.map((device) => labels[device] || device).join(', ');
  }

  protected wfhPunchApprovalLabel(): string {
    return this.dashboard()?.employee?.workFromHomeAttendanceAllowed ? 'Approved' : 'Not approved';
  }

  private normalizeAttendanceDevices(value: unknown): string[] {
    const allowed = ['mobile', 'tablet', 'laptop', 'desktop'];
    const rows = Array.isArray(value) ? value : [];
    const normalized = rows
      .map((item) => String(item || '').trim().toLowerCase())
      .filter((item) => allowed.includes(item));

    return normalized.length ? Array.from(new Set(normalized)) : ['desktop'];
  }
  protected companyName(): string {
    return this.dashboard()?.company?.companyName || this.currentCompanyFallback().name || 'Company';
  }

  protected companyLogo(): string {
    const logo = this.dashboard()?.company?.logo || this.currentCompanyFallback().logoUrl;
    return logo ? this.assetUrl(logo) : '/brand/opasbizz-crm.webp';
  }

  protected employeePhotoUrl(): string {
    const photo = this.dashboard()?.employee?.employeePhoto || '';
    if (!photo || /opasbizz-crm|\/brand\//i.test(photo)) {
      return this.defaultAvatarUrl();
    }
    return this.assetUrl(photo) || this.defaultAvatarUrl();
  }

  protected departmentName(): string {
    return this.dashboard()?.employee?.departmentId?.departmentName || this.dashboard()?.user?.department || '-';
  }

  protected isSalesDepartment(): boolean {
    return this.departmentAccessModules().includes('sales-crm') || this.departmentFeatureKey() === 'sales' || this.isDepartmentMatch(/sales/i);
  }

  protected isAccountsDepartment(): boolean {
    return this.departmentAccessModules().includes('accounts') || ['accounts', 'account', 'finance'].includes(this.departmentFeatureKey()) || this.isDepartmentMatch(/accounts?|finance/i);
  }

  protected isLogisticsDepartment(): boolean {
    return this.departmentAccessModules().includes('logistics') || this.departmentFeatureKey() === 'logistics' || this.isDepartmentMatch(/logistics?/i);
  }

  private departmentValues(): string[] {
    const employeeDepartment = this.dashboard()?.employee?.departmentId as (NamedRef & { departmentCode?: string; featureKey?: string; dashboardKey?: string; accessModules?: string[] }) | undefined;
    const currentUser = this.auth.currentUser() as { department?: string; departmentRef?: string | { departmentName?: string; departmentCode?: string; featureKey?: string; dashboardKey?: string; accessModules?: string[] } } | null;
    const departmentRef = typeof currentUser?.departmentRef === 'object' ? currentUser.departmentRef : null;
    return [
      employeeDepartment?.departmentName,
      employeeDepartment?.departmentCode,
      employeeDepartment?.featureKey,
      employeeDepartment?.dashboardKey,
      this.dashboard()?.user?.department,
      currentUser?.department,
      departmentRef?.departmentName,
      departmentRef?.departmentCode,
      departmentRef?.featureKey,
      departmentRef?.dashboardKey
    ].map((value) => String(value || ''));
  }

  private departmentAccessModules(): string[] {
    const employeeDepartment = this.dashboard()?.employee?.departmentId as (NamedRef & { accessModules?: string[] }) | undefined;
    const currentUser = this.auth.currentUser() as { departmentRef?: string | { accessModules?: string[] } } | null;
    const departmentRef = typeof currentUser?.departmentRef === 'object' ? currentUser.departmentRef : null;
    const modules = employeeDepartment?.accessModules?.length ? employeeDepartment.accessModules : departmentRef?.accessModules || [];
    return modules.map((module) => String(module || '').trim().toLowerCase()).filter(Boolean);
  }

  private departmentFeatureKey(): string {
    return this.departmentValues().find((value) => ['sales', 'accounts', 'account', 'finance', 'logistics'].includes(value.toLowerCase()))?.toLowerCase() || 'none';
  }

  private isDepartmentMatch(pattern: RegExp): boolean {
    return this.departmentValues().some((value) => pattern.test(value));
  }

  private isSalesOnlyFeature(section: EmployeeFeature): boolean {
    return ['my-leads', 'my-deals', 'my-tasks'].includes(section);
  }

  private isAccountsOnlyFeature(section: EmployeeFeature): boolean {
    return ['account-invoices', 'account-payments', 'account-expenses'].includes(section);
  }

  private menuAccessModule(section: EmployeeFeature): string | null {
    if (['profile'].includes(section)) return 'profile';
    if (['attendance', 'attendance-history'].includes(section)) return 'attendance';
    if (['apply-leave', 'leave-history', 'leave-balance'].includes(section)) return 'leave';
    if (section === 'payslip') return 'payroll';
    if (section === 'documents') return 'documents';
    if (section === 'bank') return 'bank';
    if (section === 'events') return 'events';
    if (section === 'holidays') return 'holidays';
    if (section === 'meetings') return 'meetings';
    if (section === 'messages') return 'messages';
    if (section === 'settings') return 'settings';
    if (section === 'notifications') return 'notifications';
    if (this.isSalesOnlyFeature(section)) return 'sales-crm';
    if (this.isAccountsOnlyFeature(section)) return 'accounts';
    return null;
  }

  private canShowMenuItem(section: EmployeeFeature): boolean {
    if (section === 'dashboard') return true;
    const modules = this.departmentAccessModules();
    if (modules.length) {
      const module = this.menuAccessModule(section);
      return module ? modules.includes(module) : true;
    }
    if (this.isSalesOnlyFeature(section)) return this.isSalesDepartment();
    if (this.isAccountsOnlyFeature(section)) return this.isAccountsDepartment();
    return true;
  }

  private canAccessSection(section: EmployeeFeature): boolean {
    return this.canShowMenuItem(section);
  }

  private ensureAllowedActiveSection(): void {
    if (this.canAccessSection(this.activeSection())) return;
    this.setActiveSection('dashboard');
  }
  protected designationName(): string {
    return this.dashboard()?.employee?.designationId?.designationName || this.dashboard()?.user?.designation || '-';
  }

  protected formatDate(value?: string): string {
    return value ? new Intl.DateTimeFormat('en-IN').format(new Date(value)) : '-';
  }

  protected formatDateTime(value?: string): string {
    return value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-';
  }

  protected formatTime(value?: string): string {
    return value ? new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '-';
  }

  protected formatMinutes(value?: number, checkIn?: string, checkOut?: string): string {
    const minutes = value ?? (checkIn && checkOut ? Math.max(0, Math.floor((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000)) : 0);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  protected todayWorkingTime(): string {
    const attendance = this.todayAttendance();
    return this.formatMinutes(this.totalWorkedMinutes(attendance, true));
  }

  protected formatCurrency(value?: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  protected hasBankDetails(): boolean {
    const bank = this.employeeBank();
    return Boolean(bank && Object.values(bank).some((value) => value !== null && value !== undefined && value !== ''));
  }

  protected documentLabel(document: EmployeeDocumentItem): string {
    return (document.documentType || 'document').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  protected documentUrl(value?: string): string {
    return this.assetUrl(value);
  }

  protected fileSizeLabel(value?: number): string {
    if (!value) return '-';
    if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected payslipMonthLabel(slip: PayslipRow): string {
    if (!slip.month || !slip.year) return '-';
    return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date(slip.year, slip.month - 1, 1));
  }

  protected payslipPdfUrl(slip: PayslipRow): string {
    return slip.pdfUrl ? this.assetUrl(slip.pdfUrl) : apiUrl(`/hr/payroll/payslips/${slip._id}/pdf`);
  }

  protected downloadPayslipPdf(slip: PayslipRow): void {
    const url = this.payslipPdfUrl(slip);
    if (!url) return;

    this.message.set('');
    this.api.getBlob(url).subscribe({
      next: (blob) => this.downloadBlob(blob, this.payslipFileName(slip)),
      error: () => this.message.set('Unable to download payslip. Please login again and try.')
    });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }

  private payslipFileName(slip: PayslipRow): string {
    const label = slip.payslipNumber || this.payslipMonthLabel(slip).replace(/\s+/g, '-').toLowerCase() || slip._id || 'payslip';
    return `${label}.pdf`;
  }


  protected autoMeetingLink(): string {
    return this.meetingRoomUrl('AUTO');
  }

  protected selectedMeetingInviteCount(): number {
    return this.normalizeSelectedInviteKeys(this.meetingForm.controls.attendeeInviteKeys.value).length;
  }

  protected isMeetingInviteSelected(recipient: EmployeeRecipientRow): boolean {
    const key = this.meetingInviteKey(recipient);
    return !!key && this.normalizeSelectedInviteKeys(this.meetingForm.controls.attendeeInviteKeys.value).includes(key);
  }

  protected toggleMeetingInvite(recipient: EmployeeRecipientRow, checked: boolean): void {
    const key = this.meetingInviteKey(recipient);
    if (!key) return;
    const current = new Set(this.normalizeSelectedInviteKeys(this.meetingForm.controls.attendeeInviteKeys.value));
    checked ? current.add(key) : current.delete(key);
    this.meetingForm.controls.attendeeInviteKeys.setValue(Array.from(current));
  }

  protected createMeeting(): void {
    if (this.meetingForm.invalid || this.isMeetingSaving()) {
      this.meetingForm.markAllAsTouched();
      return;
    }

    const raw = this.meetingForm.getRawValue();
    const meetingCode = `EMP-${Date.now().toString(36).toUpperCase()}`;
    this.isMeetingSaving.set(true);
    this.message.set('');
    this.api.post<MeetingRow>('/hr/meetings', {
      meetingTitle: raw.meetingTitle,
      meetingCode,
      meetingMode: 'online',
      meetingLink: this.meetingRoomUrl(meetingCode),
      startDateTime: raw.startDateTime,
      endDateTime: raw.endDateTime,
      attendees: this.meetingAttendeePayload(raw.attendeeInviteKeys),
      notifyAttendees: true
    }).pipe(finalize(() => this.isMeetingSaving.set(false))).subscribe({
      next: () => {
        this.message.set('Meeting room created and invite notifications sent.');
        this.meetingForm.reset({
          meetingTitle: 'Team Meeting',
          startDateTime: new Date().toISOString().slice(0, 16),
          endDateTime: new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16),
          attendeeInviteKeys: []
        });
        this.applyCompanyTheme(this.currentCompanyFallback().settings?.theme);
    this.refresh();
      },
      error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to create meeting.')
    });
  }

  private meetingRoomUrl(code: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/meeting-room/${code}`;
  }

  private normalizeSelectedInviteKeys(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && !!item) : [];
  }

  protected meetingInviteKey(recipient: EmployeeRecipientRow): string {
    if (recipient.inviteType === 'user' || !recipient.employeeCode) {
      return recipient.userId ? `user:${recipient.userId}` : '';
    }

    return `employee:${recipient.employeeCode}`;
  }

  protected recipientRoleLabel(recipient: EmployeeRecipientRow): string {
    const role = String(recipient.role || '').replace(/_/g, ' ').trim();
    return role ? role.replace(/\b\w/g, (char) => char.toUpperCase()) : 'Employee';
  }

  private meetingAttendeePayload(value: unknown): Array<{ employeeCode?: string; attendeeUserId?: string }> {
    const attendees: Array<{ employeeCode?: string; attendeeUserId?: string }> = [];

    for (const key of this.normalizeSelectedInviteKeys(value)) {
      const [type, id] = key.split(':');
      if (!id) continue;
      attendees.push(type === 'user' ? { attendeeUserId: id } : { employeeCode: id });
    }

    return attendees;
  }
  protected openActionUrl(actionUrl?: string): void {
    if (!actionUrl) return;
    const path = this.routePathFromUrl(actionUrl);
    void this.router.navigateByUrl(path);
  }

  protected openLogisticsRoute(route: string): void {
    if (!this.isLogisticsDepartment()) {
      this.message.set('Logistics workspace is not available for your department.');
      return;
    }
    void this.router.navigateByUrl(route);
  }

  protected activePunch(record = this.todayAttendance()): PunchLog | null {
    const logs = record?.punchLogs ?? [];
    for (let index = logs.length - 1; index >= 0; index -= 1) {
      if (logs[index].checkInTime && !logs[index].checkOutTime) return logs[index];
    }
    if (record?.checkInTime && !record.checkOutTime) return { checkInTime: record.checkInTime };
    return null;
  }

  protected punchSummary(record?: AttendanceRecord | null): string {
    const logs = record?.punchLogs?.length
      ? record.punchLogs
      : record?.checkInTime
        ? [{ checkInTime: record.checkInTime, checkOutTime: record.checkOutTime }]
        : [];

    if (!logs.length) return '-';

    return logs
      .map((log, index) => `${index + 1}. ${this.formatTime(log.checkInTime)} - ${this.formatTime(log.checkOutTime)}`)
      .join(' | ');
  }

  private totalWorkedMinutes(record?: AttendanceRecord | null, includeActive = false): number {
    if (!record) return 0;

    const logs = record.punchLogs?.length
      ? record.punchLogs
      : record.checkInTime
        ? [{ checkInTime: record.checkInTime, checkOutTime: record.checkOutTime, totalWorkMinutes: record.totalWorkMinutes }]
        : [];

    if (!logs.length) {
      return Number(record.totalWorkMinutes || 0);
    }

    return logs.reduce((sum, log) => {
      if (log.checkInTime && log.checkOutTime) {
        return sum + Number(log.totalWorkMinutes || this.minutesBetween(log.checkInTime, log.checkOutTime));
      }

      if (includeActive && log.checkInTime && !log.checkOutTime) {
        return sum + this.minutesBetween(log.checkInTime, new Date().toISOString());
      }

      return sum;
    }, 0);
  }

  private minutesBetween(from?: string, to?: string): number {
    if (!from || !to) return 0;
    return Math.max(0, Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 60000));
  }

  protected holidayCalendar(): HolidayRow[] {
    return this.holidays().length ? this.holidays() : this.dashboard()?.holidays?.upcoming ?? [];
  }

  protected visibleHolidayRows(): HolidayRow[] {
    const rows = this.holidayCalendar();
    const month = this.holidayMonthFilter();
    return rows
      .filter((holiday) => month === 'all' || this.isSameMonth(holiday.date, this.selectedHolidayMonthDate()))
      .sort((a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime());
  }

  protected currentMonthLabel(): string {
    return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date());
  }

  protected holidayMonthLabel(): string {
    return this.holidayMonthFilter() === 'all'
      ? 'All months'
      : new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(this.selectedHolidayMonthDate());
  }

  protected calendarDays(): CalendarDay[] {
    const selected = this.selectedHolidayMonthDate();
    const firstDay = new Date(selected.getFullYear(), selected.getMonth(), 1);
    const totalDays = new Date(selected.getFullYear(), selected.getMonth() + 1, 0).getDate();
    const cells: CalendarDay[] = Array.from({ length: firstDay.getDay() }, () => ({ day: null, holidays: [] }));

    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(selected.getFullYear(), selected.getMonth(), day);
      const dateKey = this.toDateInput(date);
      cells.push({
        day,
        dateKey,
        holidays: this.holidayCalendar().filter((holiday) => holiday.date && this.toDateInput(new Date(holiday.date)) === dateKey)
      });
    }

    return cells;
  }

  protected holidayTextColor(color?: string): string {
    const hex = (color || '#2563eb').replace('#', '');
    const normalized = hex.length === 3 ? hex.split('').map((part) => part + part).join('') : hex;
    const value = Number.parseInt(normalized, 16);
    if (Number.isNaN(value)) return '#ffffff';

    const red = (value >> 16) & 255;
    const green = (value >> 8) & 255;
    const blue = value & 255;
    const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
    return brightness > 150 ? '#0f172a' : '#ffffff';
  }

  protected goBack(): void {
    window.history.length > 1 ? window.history.back() : void this.router.navigate(['/employee-dashboard']);
  }

  protected logout(): void {
    this.auth.logout();
  }

  private isSameMonth(value: string | undefined, compareDate: Date): boolean {
    if (!value) return false;
    const date = new Date(value);
    return date.getMonth() === compareDate.getMonth() && date.getFullYear() === compareDate.getFullYear();
  }

  private selectedHolidayMonthDate(): Date {
    const month = this.holidayMonthFilter();
    const today = new Date();
    return new Date(today.getFullYear(), month === 'all' ? today.getMonth() : month - 1, 1);
  }

  private applyMessages(rows: MessageRow[], showPopup: boolean): void {
    const previousIds = new Set(this.messages().map((item) => item._id).filter(Boolean));
    this.messages.set(rows);

    if (!this.hasLoadedMessages) {
      this.hasLoadedMessages = true;
      return;
    }

    if (!showPopup) return;

    const currentUserEmail = this.auth.currentUser()?.email;
    const incoming = rows.find((item) =>
      item._id &&
      !previousIds.has(item._id) &&
      item.recipientUserId?.email === currentUserEmail
    );

    if (incoming) {
      this.showMessagePopup('Message aaya hai: New message');
      this.loadNotifications(false);
    }
  }

  private loadNotifications(showPopup: boolean): void {
    forkJoin({
      notifications: this.api.get<{ notifications?: NotificationRow[] }>('/hr/communication/notifications', { limit: 4 }).pipe(catchError(() => of({ notifications: [] }))),
      unread: this.api.get<{ unreadCount?: number }>('/hr/communication/notifications/unread-count').pipe(catchError(() => of({ unreadCount: this.unreadCount() })))
    }).subscribe(({ notifications, unread }) => {
      this.applyNotifications(notifications.notifications ?? [], unread.unreadCount ?? 0, showPopup);
    });
  }

  private applyNotifications(rows: NotificationRow[], unreadCount: number, showPopup: boolean): void {
    const previousIds = new Set(this.notifications().map((item) => item._id).filter(Boolean));
    this.notifications.set(rows);
    this.unreadCount.set(unreadCount);

    if (!this.hasLoadedNotifications) {
      this.hasLoadedNotifications = true;
      return;
    }

    if (!showPopup) return;

    const incoming = rows.find((item) => item._id && !previousIds.has(item._id) && !item.isRead);
    if (incoming) {
      this.showMessagePopup(`${incoming.title || 'Notification'}: ${incoming.message || 'New update'}`);
    }
  }

  private markMessageNotificationsSeen(rows = this.messages()): void {
    const currentUserEmail = this.auth.currentUser()?.email;
    const unreadIncoming = rows.filter((item) =>
      item._id &&
      item.status !== 'read' &&
      item.recipientUserId?.email === currentUserEmail
    );

    if (unreadIncoming.length) {
      forkJoin(unreadIncoming.map((item) =>
        this.api.patch<MessageRow>(`/hr/communication/messages/${item._id}/read`, {}).pipe(catchError(() => of(null)))
      )).subscribe(() => {
        this.messages.update((items) => items.map((item) =>
          unreadIncoming.some((incoming) => incoming._id === item._id)
            ? { ...item, status: 'read' }
            : item
        ));
      });
    }

    this.markNotificationsSeen();
  }

  private markNotificationsSeen(): void {
    if (this.unreadCount() === 0 && this.notifications().every((item) => item.isRead)) return;

    this.unreadCount.set(0);
    this.notifications.update((items) => items.map((item) => ({ ...item, isRead: true })));
    this.api
      .patch('/hr/communication/notifications/read-all', {})
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  private showMessagePopup(text: string): void {
    this.messagePopup.set(text);
    if (this.popupTimerId) clearTimeout(this.popupTimerId);
    this.popupTimerId = setTimeout(() => this.messagePopup.set(''), 1000);
  }

  private historyQuery(): Record<string, string | number> {
    const year = this.historyYear();

    if (this.historyRange() === 'year') {
      return {
        from: `${year}-01-01`,
        to: `${year}-12-31`,
        limit: 366
      };
    }

    const month = this.historyMonth();
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0);

    return {
      from: this.toDateInput(from),
      to: this.toDateInput(to),
      limit: 31
    };
  }

  private refreshEmployeePreview(): void {
    const employeeId = this.viewEmployeeId();
    if (!employeeId) return;

    this.message.set('');
    this.api
      .get<EmployeeProfile>(`/hr/employees/${employeeId}`)
      .pipe(catchError(() => of(null)))
      .subscribe((employee) => {
        if (!employee) {
          this.dashboard.set(null);
          this.todayAttendance.set(null);
          this.leaves.set([]);
          this.leaveBalances.set([]);
          this.attendanceHistory.set([]);
          this.notifications.set([]);
          this.holidays.set([]);
          this.unreadCount.set(0);
          this.leaveBalance.set(0);
          this.message.set('Employee record not found.');
          this.updateTimer();
          return;
        }

        this.dashboard.set({
          employee,
          company: {
            companyName: this.currentCompanyFallback().name,
            logo: this.currentCompanyFallback().logoUrl,
            settings: this.currentCompanyFallback().settings
          },
          user: {
            name: employee.displayName || [employee.firstName, employee.lastName].filter(Boolean).join(' '),
            email: employee.officialEmail,
            mobile: employee.mobile,
            employeeCode: employee.employeeCode,
            status: employee.employeeStatus
          }
        });

        this.loadEmployeeExtras(employee._id);

        if (!employee.employeeCode) {
          this.todayAttendance.set(null);
          this.attendanceHistory.set([]);
          this.leaves.set([]);
          this.leaveBalances.set([]);
          this.notifications.set([]);
          this.holidays.set([]);
          this.unreadCount.set(0);
          this.leaveBalance.set(0);
          this.updateTimer();
          return;
        }

        const today = this.toDateInput(new Date());
        const companyQuery = this.viewCompanyId() ? { companyId: this.viewCompanyId() as string } : {};
        forkJoin({
          today: this.api.get<{ attendance?: AttendanceRecord[] }>('/hr/attendance/records', {
            ...companyQuery,
            employeeCode: employee.employeeCode,
            from: today,
            to: today,
            limit: 1
          }).pipe(catchError(() => of({ attendance: [] }))),
          history: this.api.get<{ attendance?: AttendanceRecord[] }>('/hr/attendance/records', {
            ...companyQuery,
            ...this.historyQuery(),
            employeeCode: employee.employeeCode
          }).pipe(catchError(() => of({ attendance: [] }))),
          leaves: this.api.get<{ leaveRequests?: LeaveRequest[] }>('/hr/leave/requests', {
            ...companyQuery,
            employeeCode: employee.employeeCode,
            limit: 40
          }).pipe(catchError(() => of({ leaveRequests: [] }))),
          balances: this.api.get<{ leaveBalances?: LeaveBalanceRow[] }>('/hr/leave/balances', {
            ...companyQuery,
            employeeCode: employee.employeeCode,
            year: new Date().getFullYear(),
            limit: 40
          }).pipe(catchError(() => of({ leaveBalances: [] }))),
          holidays: this.api.get<{ holidays?: HolidayRow[] }>('/hr/holidays', {
            ...companyQuery,
            limit: 40
          }).pipe(catchError(() => of({ holidays: [] })))
        }).subscribe(({ today: todayResponse, history, leaves, balances, holidays }) => {
          this.todayAttendance.set(todayResponse.attendance?.[0] ?? null);
          this.attendanceHistory.set(history.attendance ?? []);
          this.leaves.set(leaves.leaveRequests ?? []);
          this.setLeaveBalances(balances.leaveBalances ?? []);
          this.notifications.set([]);
          this.holidays.set(holidays.holidays ?? []);
          this.unreadCount.set(0);
          this.updateTimer();
        });
      });
  }

  private toDateInput(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private isLunchTime(): boolean {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    return minutes >= 13 * 60 && minutes <= 13 * 60 + 40;
  }

  private assetUrl(value?: string): string {
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    return apiUrl(value);
  }

  private routePathFromUrl(value: string): string {
    try {
      const url = new URL(value, window.location.origin);
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return value.startsWith('/') ? value : `/${value}`;
    }
  }

  private defaultAvatarUrl(): string {
    const initials = this.userName()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'E';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="32" fill="#e8f0fb"/><circle cx="80" cy="62" r="30" fill="#356398"/><path d="M28 140c8-31 28-47 52-47s44 16 52 47" fill="#356398"/><text x="80" y="88" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#fff">${initials}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  private isEmployeeLogin(): boolean {
    const user = this.auth.currentUser();
    const primaryRole = user && 'role' in user ? String(user.role || '') : '';
    const roleRef = user && 'roleRef' in user && user.roleRef && typeof user.roleRef === 'object' ? user.roleRef : null;
    return primaryRole === 'employee' && roleRef?.name !== 'hr_manager';
  }

  private currentCompanyFallback(): { name?: string; logoUrl?: string; settings?: { theme?: CompanyTheme } } {
    const user = this.auth.currentUser();
    const company = user && 'company' in user ? user.company : undefined;
    return company && typeof company === 'object' ? company as { name?: string; logoUrl?: string; settings?: { theme?: CompanyTheme } } : {};
  }

  private applyCompanyTheme(theme?: CompanyTheme): void {
    if (typeof document === 'undefined' || !theme) return;
    const primaryColor = theme.primaryColor || '#1A2942';
    const accentColor = theme.accentColor || '#243B55';
    const sidebarColor = theme.sidebarColor || '#141E30';
    document.documentElement.style.setProperty('--color-primary', primaryColor);
    document.documentElement.style.setProperty('--color-accent', accentColor);
    document.documentElement.style.setProperty('--color-sidebar', sidebarColor);
    document.documentElement.style.setProperty('--platform-sidebar-start', sidebarColor);
    document.documentElement.style.setProperty('--platform-sidebar-end', accentColor);
    document.documentElement.style.setProperty('--color-primary-rgb', this.hexToRgb(primaryColor));
  }

  private hexToRgb(hex: string): string {
    const normalized = hex.replace('#', '');
    if (normalized.length !== 6) return '26, 41, 66';
    const value = Number.parseInt(normalized, 16);
    return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
  }
  private updateTimer(): void {
    const activePunch = this.activePunch();
    if (!activePunch?.checkInTime) {
      this.workTimer.set('00:00:00');
      return;
    }
    const totalSeconds = Math.max(0, Math.floor((Date.now() - new Date(activePunch.checkInTime).getTime()) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    this.workTimer.set([hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':'));
  }
}













