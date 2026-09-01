import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { apiUrl } from '../../core/config/api.config';
import { Company } from '../../core/models/company.model';
import { User } from '../../core/models/user.model';
import { ApiService } from '../../core/services/api.service';

type HrFeature =
  | 'dashboard'
  | 'profile'
  | 'hr'
  | 'attendance'
  | 'logistics'
  | 'logistics-employees'
  | 'logistics-daily-work'
  | 'logistics-monthly-performance'
  | 'logistics-shift-roster'
  | 'logistics-certifications'
  | 'logistics-vehicle-assignment'
  | 'logistics-incidents'
  | 'logistics-invoice'
  | 'logistics-vendor-payments'
  | 'logistics-air-cargo'
  | 'logistics-sea-freight'
  | 'logistics-cha'
  | 'logistics-transporters'
  | 'logistics-warehouse'
  | 'logistics-tracking'
  | 'logistics-documents'
  | 'logistics-customers'
  | 'logistics-vendors'
  | 'logistics-products-services'
  | 'logistics-sales-report'
  | 'logistics-outstanding-report'
  | 'logistics-gst-report'
  | 'logistics-payments-report'
  | 'employee'
  | 'add-employee'
  | 'employee-profile'
  | 'departments'
  | 'payroll'
  | 'salary-structure'
  | 'payslip-generation'
  | 'payroll-processing'
  | 'payroll-reports'
  | 'leave'
  | 'leave-requests'
  | 'leave-calendar'
  | 'leave-balance'
  | 'leave-types'
  | 'recruitment'
  | 'crm-leads'
  | 'crm-deals'
  | 'crm-tasks'
  | 'account-invoices'
  | 'account-payments'
  | 'account-expenses'
  | 'job-postings'
  | 'candidates'
  | 'interviews'
  | 'offers'
  | 'events'
  | 'meetings'
  | 'company-events'
  | 'messages'
  | 'announcements'
  | 'holidays'
  | 'reports'
  | 'attendance-reports'
  | 'leave-reports'
  | 'recruitment-reports'
  | 'payroll-summary'
  | 'exports'
  | 'analytics'
  | 'settings'
  | 'access';

interface EmployeeRow {
  _id?: string;
  companyId?: string | { _id?: string };
  employeeCode?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  officialEmail?: string;
  mobile?: string;
  employeeStatus?: string;
  workMode?: string;
  attendanceAllowedDevices?: string[];
  joiningDate?: string;
  departmentId?: { _id?: string; departmentName?: string; departmentCode?: string; featureKey?: string; dashboardKey?: string; accessModules?: string[] };
  designationId?: { designationName?: string; designationCode?: string };
  reportingManagerId?: { displayName?: string; employeeCode?: string };
  organizationRole?: string;
  customRoleTitle?: string;
  name?: string;
  email?: string;
  status?: string;
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

interface EmployeeStatutoryDetails {
  panNumber?: string;
  aadhaarNumber?: string;
  uanNumber?: string;
  pfNumber?: string;
  esiNumber?: string;
  professionalTaxNumber?: string;
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

type EmployeeFormTab = 'personal' | 'contact' | 'employment' | 'bank' | 'leave' | 'documents';

interface CompanyRow {
  _id?: string;
  companyName?: string;
  companyCode?: string;
}

interface LeaveRequestRow {
  _id?: string;
  employeeId?: { displayName?: string; employeeCode?: string };
  fromDate?: string;
  toDate?: string;
  totalDays?: number;
  reason?: string;
  status?: string;
  approverRemarks?: string;
  leaveTypeId?: { leaveName?: string; leaveCode?: string };
}

interface LeaveBalanceRow {
  _id?: string;
  employeeId?: { displayName?: string; employeeCode?: string };
  leaveTypeId?: { leaveName?: string; leaveCode?: string };
  year?: number;
  openingBalance?: number;
  credited?: number;
  carryForward?: number;
  availed?: number;
  pending?: number;
  rejected?: number;
  availableBalance?: number;
}


interface LeaveTypeRow {
  _id?: string;
  leaveName?: string;
  leaveCode?: string;
  category?: string;
  description?: string;
  paid?: boolean;
  allowHalfDay?: boolean;
  requireDocument?: boolean;
  requireApproval?: boolean;
  colorCode?: string;
  isActive?: boolean;
}

interface LeaveCalendarDay {
  day: number;
  dateKey: string;
  leaves: LeaveRequestRow[];
}
interface EmployeeLeaveSummary {
  employeeName: string;
  employeeCode: string;
  totalLeave: number;
  usedLeave: number;
  pendingLeave: number;
  remainingLeave: number;
  balances: LeaveBalanceRow[];
}

interface AttendanceRecord {
  _id?: string;
  employeeId?: { displayName?: string; employeeCode?: string } | string;
  shiftId?: { shiftName?: string; shiftCode?: string } | string | null;
  attendancePolicyId?: string | null;
  attendanceDate?: string;
  checkInTime?: string;
  checkOutTime?: string;
  totalWorkMinutes?: number;
  lateByMinutes?: number;
  isLate?: boolean;
  status?: string;
  punchLogs?: PunchLog[];
}

interface ShiftRow {
  _id?: string;
  shiftName?: string;
  shiftCode?: string;
  startTime?: string;
  endTime?: string;
  graceMinutes?: number;
  halfDayAfterMinutes?: number;
  fullDayMinutes?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

interface AttendancePolicyRow {
  _id?: string;
  policyName?: string;
  policyCode?: string;
  graceMinutes?: number;
  maxLateAllowedPerMonth?: number;
  lateMarkAction?: string;
  halfDayAfterMinutes?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

interface AttendanceDisplayRow {
  employeeName: string;
  employeeCode: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  totalWorkMinutes?: number;
  status: string;
  lateByMinutes: number;
  lateCountThisMonth: number;
  allowedLateDays: number;
  shiftName: string;
}

interface PunchLog {
  checkInTime?: string;
  checkOutTime?: string;
  totalWorkMinutes?: number;
}

interface NotificationRow {
  _id?: string;
  title?: string;
  message?: string;
  isRead?: boolean;
  createdAt?: string;
}

interface PeriodSummary {
  totalCount?: number;
  todayCount?: number;
  monthCount?: number;
  totalAmount?: number;
  todayAmount?: number;
  monthAmount?: number;
  statusCounts?: Record<string, number>;
  employeeCounts?: { employeeCode?: string; employeeName?: string; total?: number; today?: number; month?: number; amount?: number }[];
}

interface PeriodListResponse {
  summary?: PeriodSummary;
}

interface AssignmentMeta {
  assignedEmployeeCode?: string;
  assignedEmployeeName?: string;
  createdDateStatus?: string;
  isToday?: boolean;
  isThisMonth?: boolean;
  createdAt?: string;
}
interface CrmLeadRow extends AssignmentMeta {
  _id?: string;
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  price?: number;
  priceType?: string;
  packagingOption?: string;
  source?: string;
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
  status?: string;
  notes?: string;
}

interface CrmDealRow extends AssignmentMeta {
  _id?: string;
  leadId?: string;
  clientName?: string;
  value?: number;
  stage?: string;
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
  expectedClose?: string;
  notes?: string;
}

interface CrmTaskRow extends AssignmentMeta {
  _id?: string;
  title?: string;
  relatedTo?: string;
  taskType?: string;
  businessCategory?: string;
  routeType?: string;
  dueDate?: string;
  priority?: string;
  status?: string;
}

interface EmployeeCodeAvailability {
  employeeCode?: string;
  available?: boolean;
}

interface BranchRow {
  _id?: string;
  branchName?: string;
  branchCode?: string;
}

interface DepartmentRow {
  _id?: string;
  departmentName?: string;
  departmentCode?: string;
  featureKey?: string;
  dashboardKey?: string;
  accessModules?: string[];
  description?: string;
}

interface DesignationRow {
  _id?: string;
  designationName?: string;
  designationCode?: string;
  departmentId?: string | { _id?: string; departmentCode?: string; departmentName?: string; featureKey?: string; dashboardKey?: string; accessModules?: string[] };
  level?: number;
  description?: string;
}


interface AccountInvoiceRow extends AssignmentMeta {
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

interface AccountPaymentRow extends AssignmentMeta {
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

interface AccountExpenseRow extends AssignmentMeta {
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
interface HolidayRow {
  _id?: string;
  holidayName?: string;
  date?: string;
  type?: string;
  description?: string;
  holidayColor?: string;
  isPaid?: boolean;
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
  employeeId?: { displayName?: string; employeeCode?: string };
  payrollRunId?: { payrollCode?: string; status?: string };
}

interface PayrollRunRow {
  _id?: string;
  payrollCode?: string;
  month?: number;
  year?: number;
  fromDate?: string;
  toDate?: string;
  paymentDate?: string;
  status?: string;
  summary?: {
    totalEmployees?: number;
    totalGrossSalary?: number;
    totalDeductions?: number;
    totalNetSalary?: number;
  };
}

interface EmployeeSalaryRow {
  _id?: string;
  employeeId?: { displayName?: string; employeeCode?: string };
  monthlyCTC?: number;
  grossSalary?: number;
  totalDeductions?: number;
  netSalary?: number;
  status?: string;
  effectiveFrom?: string;
}

interface EventRow {
  _id?: string;
  eventTitle?: string;
  eventCode?: string;
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
  meetingCode?: string;
  meetingMode?: string;
  meetingLink?: string;
  venue?: string;
  startDateTime?: string;
  endDateTime?: string;
  status?: string;
  minutesOfMeeting?: string;
  remarks?: string;
  attendees?: Array<{ employeeId?: { displayName?: string; employeeCode?: string }; status?: string }>;
}

type CompanyTheme = { primaryColor?: string; accentColor?: string; sidebarColor?: string };

interface HrDashboardData {
  company?: { companyName?: string; companyCode?: string; logo?: string; settings?: { theme?: CompanyTheme } };
  employees?: {
    summary?: {
      totalEmployees?: number;
      activeEmployees?: number;
      inactiveEmployees?: number;
      newJoinings?: number;
    };
    upcomingBirthdays?: Array<{ displayName?: string; employeeCode?: string; dateOfBirth?: string }>;
    upcomingWorkAnniversaries?: Array<{ displayName?: string; employeeCode?: string; joiningDate?: string }>;
    departmentWiseEmployees?: Array<{ _id?: string | null; total?: number }>;
  };
  attendance?: {
    today?: {
      present?: number;
      absent?: number;
      late?: number;
      halfDay?: number;
      onLeave?: number;
    };
  };
  leave?: {
    summary?: {
      pending?: number;
      approved?: number;
      rejected?: number;
      cancelled?: number;
    };
    employeesOnLeaveToday?: LeaveRequestRow[];
  };
  recruitment?: {
    openJobs?: number;
    totalCandidates?: number;
    interviewsToday?: number;
  };
  payroll?: {
    currentMonthPayrollStatus?: string;
    payslipsGenerated?: number;
    summary?: Record<string, number>;
  };
  holidays?: { upcoming?: HolidayRow[] };
  events?: { upcoming?: Array<{ _id?: string; title?: string; startDateTime?: string }> };
  meetings?: { todayMeetings?: number; upcomingMeetings?: Array<{ _id?: string; title?: string; startDateTime?: string }> };
}

interface LogisticsMonitorShipment {
  _id?: string;
  shipmentNumber?: string;
  shipmentMode?: string;
  customerName?: string;
  status?: string;
  currentLocation?: string;
  origin?: {
    name?: string;
    city?: string;
    country?: string;
  } | null;
  destination?: {
    name?: string;
    city?: string;
    country?: string;
  } | null;
  charges?: {
    totalAmount?: number;
  } | null;
  assignedTo?: { employeeCode?: string; firstName?: string; lastName?: string; displayName?: string } | string | null;
  estimatedArrival?: string;
  actualArrival?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface LogisticsMonitorData {
  totalShipments?: number;
  totalRevenue?: number;
  airCargo?: number;
  seaFreight?: number;
  road?: number;
  draft?: number;
  pending?: number;
  inTransit?: number;
  customs?: number;
  delivered?: number;
  hold?: number;
  cancelled?: number;
  byMode?: Record<string, number>;
  byStatus?: Record<string, number>;
  recentShipments?: LogisticsMonitorShipment[];
}

interface LogisticsDocumentRow {
  _id?: string;
  documentType?: string;
  documentName?: string;
  documentNumber?: string;
  expiryDate?: string;
  status?: string;
  employeeName?: string;
  employeeCode?: string;
  createdAt?: string;
}

interface LogisticsTransporterRow {
  _id?: string;
  transporterName?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverMobile?: string;
  vehicleType?: string;
  status?: string;
  createdAt?: string;
}
interface LogisticsShipmentListResponse {
  data?: LogisticsMonitorShipment[];
  pagination?: {
    total?: number;
  };
}

interface FeatureItem {
  id: HrFeature;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-hr-dashboard',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './hr-dashboard.component.html',
  styleUrls: ['../role-dashboard.scss', './hr-dashboard.component.scss']
})
export class HrDashboardComponent implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private timerId: ReturnType<typeof setInterval> | null = null;
  private messagePollId: ReturnType<typeof setInterval> | null = null;
  private popupTimerId: ReturnType<typeof setTimeout> | null = null;
  private employeeCodeCheckTimer: ReturnType<typeof setTimeout> | null = null;
  private hasLoadedMessages = false;

  protected readonly mainMenu: FeatureItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '▦' },
    { id: 'profile', label: 'Profile', icon: 'P' },
    { id: 'hr', label: 'HR', icon: '♙' },
    { id: 'attendance', label: 'Attendance', icon: '▣' },
    { id: 'logistics', label: 'Logistics', icon: 'L' }
  ];
  protected readonly managementMenu: FeatureItem[] = [
    { id: 'employee', label: 'Employee setup', icon: '♙' },
    { id: 'payroll', label: 'Payroll setup', icon: '▤' },
    { id: 'leave', label: 'Leave management', icon: '▦' },
    { id: 'recruitment', label: 'Recruitment setup', icon: '▱' },
    { id: 'events', label: 'Event setup', icon: '✧' },
    { id: 'meetings', label: 'Meeting setup', icon: '♧' },
    { id: 'messages', label: 'Messages', icon: 'M' },
    { id: 'holidays', label: 'Calendar', icon: '□' }
  ];
  protected readonly reportsMenu: FeatureItem[] = [
    { id: 'reports', label: 'HR Reports', icon: '▥' },
    { id: 'analytics', label: 'Analytics', icon: '▤' }
  ];
  protected readonly settingsMenu: FeatureItem[] = [
    { id: 'settings', label: 'HR Settings', icon: '⚙' },
    { id: 'access', label: 'Access & Roles', icon: '◇' }
  ];

  protected readonly currentCompany = computed(() => {
    const user = this.auth.currentUser();
    return user && 'company' in user ? (user.company as Company | undefined) : undefined;
  });
  protected readonly currentUser = computed(() => this.auth.currentUser() as User | null);
  protected readonly companyName = computed(() => this.currentCompany()?.name || 'OPAS BIZZ PRIVATE LIMITED');
  protected readonly companyLogoUrl = computed(() => this.currentCompany()?.logoUrl || '/brand/opasbizz-crm.webp');
  protected readonly activeFeature = signal<HrFeature>('dashboard');
  protected readonly dashboard = signal<HrDashboardData | null>(null);
  protected readonly employees = signal<EmployeeRow[]>([]);
  protected readonly holidays = signal<HolidayRow[]>([]);
  protected readonly events = signal<EventRow[]>([]);
  protected readonly meetings = signal<MeetingRow[]>([]);
  protected readonly messages = signal<MessageRow[]>([]);
  protected readonly payslips = signal<PayslipRow[]>([]);
  protected readonly payrollRuns = signal<PayrollRunRow[]>([]);
  protected readonly employeeSalaries = signal<EmployeeSalaryRow[]>([]);
  protected readonly branches = signal<BranchRow[]>([]);
  protected readonly departments = signal<DepartmentRow[]>([]);
  protected readonly designations = signal<DesignationRow[]>([]);
  protected readonly leaveRequests = signal<LeaveRequestRow[]>([]);
  protected readonly allLeaveRequests = signal<LeaveRequestRow[]>([]);
  protected readonly leaveBalances = signal<LeaveBalanceRow[]>([]);
  protected readonly leaveTypes = signal<LeaveTypeRow[]>([]);
  protected readonly myLeaves = signal<LeaveRequestRow[]>([]);
  protected readonly todayAttendance = signal<AttendanceRecord | null>(null);
  protected readonly attendanceHistory = signal<AttendanceRecord[]>([]);
  protected readonly attendanceRecords = signal<AttendanceRecord[]>([]);
  protected readonly shifts = signal<ShiftRow[]>([]);
  protected readonly attendancePolicies = signal<AttendancePolicyRow[]>([]);
  protected readonly isAttendanceSettingsSaving = signal(false);
  protected readonly notifications = signal<NotificationRow[]>([]);
  protected readonly crmLeads = signal<CrmLeadRow[]>([]);
  protected readonly crmDeals = signal<CrmDealRow[]>([]);
  protected readonly crmTasks = signal<CrmTaskRow[]>([]);
  protected readonly crmLeadSummary = signal<PeriodSummary>({});
  protected readonly crmDealSummary = signal<PeriodSummary>({});
  protected readonly crmTaskSummary = signal<PeriodSummary>({});
  protected readonly logisticsMonitor = signal<LogisticsMonitorData | null>(null);
  protected readonly logisticsShipments = signal<LogisticsMonitorShipment[]>([]);
  protected readonly logisticsDocuments = signal<LogisticsDocumentRow[]>([]);
  protected readonly logisticsTransporters = signal<LogisticsTransporterRow[]>([]);
  protected readonly logisticsInvoices = signal<any[]>([]);
  protected readonly logisticsVendorPayments = signal<any[]>([]);
  protected readonly logisticsChaRows = signal<any[]>([]);
  protected readonly logisticsWarehouseRows = signal<any[]>([]);
  protected readonly logisticsCustomers = signal<any[]>([]);
  protected readonly logisticsVendors = signal<any[]>([]);
  protected readonly logisticsProductsServices = signal<any[]>([]);
  protected readonly isLogisticsMonitorLoading = signal(false);
  protected readonly logisticsMonitorError = signal('');
  protected readonly logisticsFromDate = signal('');
  protected readonly logisticsToDate = signal('');
  protected readonly salesFromDate = signal('');
  protected readonly salesToDate = signal('');

  protected readonly selectedCrmEmployeeCode = signal('');
  protected readonly selectedCrmEmployeeName = signal('');
  protected readonly employeeTodayLeads = signal<CrmLeadRow[]>([]);
  protected readonly employeeMonthLeads = signal<CrmLeadRow[]>([]);
  protected readonly employeeTodayDeals = signal<CrmDealRow[]>([]);
  protected readonly employeeMonthDeals = signal<CrmDealRow[]>([]);
  protected readonly accountInvoices = signal<AccountInvoiceRow[]>([]);
  protected readonly accountPayments = signal<AccountPaymentRow[]>([]);
  protected readonly accountExpenses = signal<AccountExpenseRow[]>([]);
  protected readonly invoiceSummary = signal<PeriodSummary>({});
  protected readonly paymentSummary = signal<PeriodSummary>({});
  protected readonly expenseSummary = signal<PeriodSummary>({});
  protected readonly workTimer = signal('00:00:00');
  protected readonly unreadCount = signal(0);
  protected readonly isRefreshing = signal(false);
  protected readonly dismissedNotificationIds = signal<Set<string>>(new Set(this.readDismissedNotificationIds()));
  protected readonly visibleNotifications = computed(() => {
    const dismissed = this.dismissedNotificationIds();
    return this.notifications().filter((notification) => !dismissed.has(this.notificationIdentity(notification))).slice(0, 4);
  });
  protected readonly isSaving = signal(false);
  protected readonly isLeaveActionSaving = signal(false);
  protected readonly isPunching = signal(false);
  protected readonly isLeaveSaving = signal(false);
  protected readonly isLeaveTypeSaving = signal(false);
  protected readonly isHolidaySaving = signal(false);
  protected readonly isMessageSending = signal(false);
  protected readonly isPayrollSaving = signal(false);
  protected readonly isEventSaving = signal(false);
  protected readonly isMeetingSaving = signal(false);
  protected readonly isProfileImageSaving = signal(false);
  protected readonly profileImagePreview = signal('');
  protected readonly isDepartmentSaving = signal(false);
  protected readonly isDesignationSaving = signal(false);
  protected readonly isPasswordChanging = signal(false);
  protected readonly isEmployeeModalOpen = signal(false);
  protected readonly isEmployeePasswordVisible = signal(false);
  protected readonly isNotificationPanelOpen = signal(false);
  protected readonly message = signal('');
  private selectedProfileImage: File | null = null;
  protected readonly messagePopup = signal('');
  protected readonly selfMessage = signal('');
  protected readonly leaveRemark = signal('');
  protected readonly leaveCalendarMonth = signal(new Date().toISOString().slice(0, 7));
  protected readonly editingHolidayId = signal<string | null>(null);
  protected readonly editingDepartmentId = signal<string | null>(null);
  protected readonly editingDesignationId = signal<string | null>(null);
  protected readonly editingEmployeeId = signal<string | null>(null);
  protected readonly originalEmployeeCode = signal('');
  protected readonly savedEmployeeForDocuments = signal<EmployeeRow | null>(null);
  protected readonly employeeDocuments = signal<EmployeeDocumentItem[]>([]);
  protected readonly selectedDocumentFiles = signal<File[]>([]);
  protected readonly isDocumentUploading = signal(false);
  protected readonly employeeCodeCheckStatus = signal<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  protected readonly employeeCodeMessage = signal('');
  protected readonly employeeFormTab = signal<EmployeeFormTab>('personal');
  protected readonly selectedCompanyId = signal<string | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly replyDrafts = signal<Record<string, string>>({});
  protected readonly businessCategories = ['Vegetables', 'Grains', 'Fruits', 'Logistics', 'Export', 'Import', 'General'] as const;
  protected readonly tradeTypes = ['Sell', 'Purchase'] as const;
  protected readonly routeTypes = ['Domestic', 'Export', 'Import'] as const;
  protected readonly shipmentModes = ['Road', 'Rail', 'Air', 'Sea', 'Courier'] as const;
  protected readonly expenseTypes = ['Operations', 'Purchase', 'Logistics', 'Export', 'Import', 'Packaging', 'Freight', 'Customs', 'General'] as const;
  protected readonly taskTypes = ['Follow-up', 'Call', 'Meeting', 'Quotation', 'Purchase', 'Dispatch', 'Logistics', 'Export Docs', 'Import Docs', 'Payment'] as const;
  protected readonly employeeFormTabs = [
    { id: 'personal', label: 'Personal', icon: 'P' },
    { id: 'contact', label: 'Contact', icon: 'C' },
    { id: 'employment', label: 'Employment', icon: 'E' },
    { id: 'bank', label: 'Bank & statutory', icon: 'B' },
    { id: 'leave', label: 'Leave Balance', icon: 'L' },
    { id: 'documents', label: 'Employee Documents', icon: 'D' }
  ] as const;

  protected readonly departmentFeatureOptions = [
    { value: 'none', label: 'No extra feature' },
    { value: 'sales', label: 'Sales CRM' },
    { value: 'accounts', label: 'Accounts / Finance' },
    { value: 'logistics', label: 'Logistics Management' },
    { value: 'hr', label: 'HR features' },
    { value: 'support', label: 'Support' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'operations', label: 'Operations' },
    { value: 'purchase', label: 'Purchase' },
    { value: 'production', label: 'Production' },
    { value: 'store', label: 'Store' }
  ] as const;


  protected readonly departmentDashboardOptions = [
    { value: 'employee', label: 'Employee Dashboard' },
    { value: 'sales', label: 'Sales CRM Dashboard' },
    { value: 'accounts', label: 'Accounts Dashboard' },
    { value: 'logistics', label: 'Logistics Dashboard' },
    { value: 'hr', label: 'HR Dashboard' },
    { value: 'none', label: 'No dashboard shortcut' }
  ] as const;

  protected readonly attendanceDeviceOptions = [
    { value: 'desktop', label: 'Desktop' },
    { value: 'laptop', label: 'Laptop' },
    { value: 'mobile', label: 'Mobile' },
    { value: 'tablet', label: 'Tablet' }
  ] as const;

  protected readonly departmentAccessOptions = [
    { value: 'profile', label: 'Profile' },
    { value: 'attendance', label: 'Attendance' },
    { value: 'leave', label: 'Leave' },
    { value: 'payroll', label: 'Payslip' },
    { value: 'documents', label: 'Documents' },
    { value: 'bank', label: 'Bank' },
    { value: 'events', label: 'Events' },
    { value: 'holidays', label: 'Holidays' },
    { value: 'meetings', label: 'Meetings' },
    { value: 'messages', label: 'Messages' },
    { value: 'sales-crm', label: 'Sales CRM' },
    { value: 'accounts', label: 'Accounts' },
    { value: 'logistics', label: 'Logistics' },
    { value: 'settings', label: 'Settings' },
    { value: 'notifications', label: 'Notifications' }
  ] as const;

  protected readonly employeeForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    employeeCode: [''],
    firstName: [''],
    lastName: [''],
    gender: ['prefer_not_to_say'],
    dateOfBirth: [''],
    bloodGroup: [''],
    maritalStatus: [''],
    nationality: ['Indian'],
    officialEmail: ['', [Validators.email]],
    personalEmail: ['', [Validators.email]],
    mobile: ['', [Validators.required]],
    alternateMobile: [''],
    emergencyContactName: [''],
    emergencyContactMobile: [''],
    emergencyContactRelation: [''],
    currentAddressLine1: [''],
    currentCity: [''],
    currentState: [''],
    currentPincode: [''],
    sameAsCurrentAddress: [false],
    permanentAddressLine1: [''],
    permanentCity: [''],
    permanentState: [''],
    permanentPincode: [''],
    departmentCode: [''],
    designationCode: [''],
    branchCode: [''],
    reportingManagerEmployeeCode: [''],
    joiningDate: [new Date().toISOString().slice(0, 10), [Validators.required]],
    probationMonths: [6],
    employmentType: ['permanent'],
    organizationRole: ['employee'],
    customRoleTitle: [''],
    workMode: ['office'],
    attendanceAllowedDevices: [['desktop'] as string[]],
    employeeStatus: ['active'],
    bankName: [''],
    branchName: [''],
    accountHolderName: [''],
    accountNumber: [''],
    ifscCode: [''],
    upiId: [''],
    panNumber: [''],
    aadhaarNumber: [''],
    uanNumber: [''],
    pfNumber: [''],
    esiNumber: [''],
    professionalTaxNumber: [''],
    casualLeaveBalance: [7],
    sickLeaveBalance: [10],
    earnedLeaveBalance: [0],
    leaveWithoutPay: [0],
    paymentMode: ['bank_transfer'],
    isSalaryAccount: [true],
    password: ['', [
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_\-+=]).{8,32}$/)
    ]],
    createLoginAccount: [false]
  });



  protected readonly employeeDocumentForm = this.fb.nonNullable.group({
    documentType: ['other'],
    remarks: ['']
  });

  protected readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  });
  protected readonly departmentForm = this.fb.nonNullable.group({
    departmentName: ['', [Validators.required, Validators.minLength(2)]],
    departmentCode: ['', [Validators.required, Validators.minLength(2)]],
    featureKey: ['none'],
    dashboardKey: ['employee'],
    accessModules: [[] as string[]],
    description: ['']
  });

  protected readonly designationForm = this.fb.nonNullable.group({
    departmentCode: ['', [Validators.required]],
    designationName: ['', [Validators.required, Validators.minLength(2)]],
    designationCode: ['', [Validators.required, Validators.minLength(2)]],
    level: [1, [Validators.required, Validators.min(1)]],
    description: ['']
  });
  protected readonly leaveForm = this.fb.nonNullable.group({
    leaveCode: ['CL', [Validators.required]],
    fromDate: [new Date().toISOString().slice(0, 10), [Validators.required]],
    toDate: [new Date().toISOString().slice(0, 10), [Validators.required]],
    dayType: ['full_day', [Validators.required]],
    reason: ['', [Validators.required, Validators.minLength(2)]]
  });

  protected readonly hrLeaveForm = this.fb.nonNullable.group({
    employeeCode: ['', [Validators.required]],
    leaveCode: ['CL', [Validators.required]],
    fromDate: [new Date().toISOString().slice(0, 10), [Validators.required]],
    toDate: [new Date().toISOString().slice(0, 10), [Validators.required]],
    dayType: ['full_day', [Validators.required]],
    reason: ['', [Validators.required, Validators.minLength(2)]]
  });

  protected readonly leaveTypeForm = this.fb.nonNullable.group({
    leaveName: ['', [Validators.required, Validators.minLength(2)]],
    leaveCode: ['', [Validators.required, Validators.minLength(1)]],
    category: ['casual', [Validators.required]],
    description: [''],
    paid: [true],
    allowHalfDay: [true],
    requireDocument: [false],
    requireApproval: [true],
    colorCode: ['#4F46E5'],
    isActive: [true]
  });

  protected readonly holidayForm = this.fb.nonNullable.group({
    holidayName: ['', [Validators.required, Validators.minLength(2)]],
    date: [new Date().toISOString().slice(0, 10), [Validators.required]],
    type: ['company'],
    description: [''],
    holidayColor: ['#2563eb', [Validators.required]],
    isPaid: [true],
    isActive: [true]
  });

  protected readonly messageForm = this.fb.nonNullable.group({
    recipientEmployeeCode: ['', [Validators.required]],
    body: ['', [Validators.required, Validators.minLength(2)]]
  });

  protected readonly leadForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    company: [''],
    phone: [''],
    email: ['', [Validators.email]],
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

  protected readonly eventForm = this.fb.nonNullable.group({
    eventTitle: ['', [Validators.required, Validators.minLength(2)]],
    eventType: ['company_event'],
    status: ['published'],
    startDateTime: [this.toDateTimeInput(new Date()), [Validators.required]],
    endDateTime: [this.toDateTimeInput(new Date(Date.now() + 60 * 60 * 1000)), [Validators.required]],
    venue: [''],
    meetingLink: [''],
    description: [''],
    notifyEmployees: [true]
  });

  protected readonly meetingForm = this.fb.nonNullable.group({
    meetingTitle: ['', [Validators.required, Validators.minLength(2)]],
    meetingMode: ['online'],
    status: ['scheduled'],
    startDateTime: [this.toDateTimeInput(new Date()), [Validators.required]],
    endDateTime: [this.toDateTimeInput(new Date(Date.now() + 30 * 60 * 1000)), [Validators.required]],
    venue: [''],
    attendeeEmployeeCodes: [[] as string[]],
    inviteCompanyAdmins: [true],
    agendaText: [''],
    notifyAttendees: [true]
  });

  protected readonly salaryForm = this.fb.nonNullable.group({
    employeeCode: ['', [Validators.required]],
    basic: [0, [Validators.required, Validators.min(0)]],
    hra: [0, [Validators.min(0)]],
    allowance: [0, [Validators.min(0)]],
    pf: [0, [Validators.min(0)]],
    tax: [0, [Validators.min(0)]],
    effectiveFrom: [new Date().toISOString().slice(0, 10), [Validators.required]]
  });

  protected readonly payrollRunForm = this.fb.nonNullable.group({
    month: [new Date().getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
    year: [new Date().getFullYear(), [Validators.required, Validators.min(2000)]],
    fromDate: [this.toDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), [Validators.required]],
    toDate: [this.toDateInput(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)), [Validators.required]],
    paymentDate: [this.toDateInput(new Date())]
  });

  protected readonly shiftForm = this.fb.nonNullable.group({
    shiftName: ['General Shift', [Validators.required, Validators.minLength(2)]],
    shiftCode: ['GENERAL', [Validators.required, Validators.minLength(2)]],
    startTime: ['09:30', [Validators.required]],
    endTime: ['18:30', [Validators.required]],
    graceMinutes: [10, [Validators.required, Validators.min(0)]],
    halfDayAfterMinutes: [240, [Validators.required, Validators.min(0)]],
    fullDayMinutes: [480, [Validators.required, Validators.min(0)]],
    isDefault: [true]
  });

  protected readonly attendancePolicyForm = this.fb.nonNullable.group({
    policyName: ['Standard Attendance Policy', [Validators.required, Validators.minLength(2)]],
    policyCode: ['STANDARD', [Validators.required, Validators.minLength(2)]],
    graceMinutes: [10, [Validators.required, Validators.min(0)]],
    maxLateAllowedPerMonth: [3, [Validators.required, Validators.min(0)]],
    lateMarkAction: ['warning'],
    halfDayAfterMinutes: [240, [Validators.required, Validators.min(0)]],
    isDefault: [true]
  });
  constructor() {
    this.selectedCompanyId.set(this.route.snapshot.queryParamMap.get('companyId'));
    const requestedFeature = this.route.snapshot.queryParamMap.get('feature');
    if (this.isHrFeature(requestedFeature)) {
      this.activeFeature.set(requestedFeature);
    }
    this.applyCompanyTheme((this.currentCompany() as any)?.settings?.theme);
    this.refreshAll();
    this.timerId = setInterval(() => this.updateTimer(), 1000);
    this.messagePollId = setInterval(() => this.loadMessages(true), 10000);
  }

  ngOnDestroy(): void {
    if (this.timerId) clearInterval(this.timerId);
    if (this.messagePollId) clearInterval(this.messagePollId);
    if (this.popupTimerId) clearTimeout(this.popupTimerId);
    if (this.employeeCodeCheckTimer) clearTimeout(this.employeeCodeCheckTimer);
  }

  protected loadCrm(): void {
  const employeeCode = this.selectedCrmEmployeeCode()
    .trim()
    .toUpperCase();

  const params = {
    ...(employeeCode ? { employeeCode } : {}),
    ...this.salesDateParams()
  };

  forkJoin({
    leads: this.api.get<
      { leads?: CrmLeadRow[] } & PeriodListResponse
    >('/crm/leads', params),

    deals: this.api.get<
      { deals?: CrmDealRow[] } & PeriodListResponse
    >('/crm/deals', params),

    tasks: this.api.get<
      { tasks?: CrmTaskRow[] } & PeriodListResponse
    >('/crm/tasks', params)
  }).subscribe({
    next: ({ leads, deals, tasks }) => {
      console.log('[CRM][HR] Successful CRM response', {
        params,
        leads,
        deals,
        tasks
      });

      this.crmLeads.set(leads.leads ?? []);
      this.crmDeals.set(deals.deals ?? []);
      this.crmTasks.set(tasks.tasks ?? []);

      this.crmLeadSummary.set(leads.summary ?? {});
      this.crmDealSummary.set(deals.summary ?? {});
      this.crmTaskSummary.set(tasks.summary ?? {});
    },

    error: (error) => {
      console.error('[CRM][HR] CRM API failed', {
        status: error?.status,
        url: error?.url,
        response: error?.error
      });

      this.crmLeads.set([]);
      this.crmDeals.set([]);
      this.crmTasks.set([]);

      this.crmLeadSummary.set({});
      this.crmDealSummary.set({});
      this.crmTaskSummary.set({});

      this.message.set(
        error?.error?.message ||
        `CRM data load failed. Status: ${error?.status || 'Unknown'}`
      );
    }
  });
}

  protected createLead(): void {
    if (this.leadForm.invalid) return;
    this.api.post('/crm/leads', this.leadForm.getRawValue()).subscribe(() => {
      this.leadForm.reset({ name: '', company: '', phone: '', email: '', source: 'Website', status: 'New', notes: '' });
      this.loadCrm();
    });
  }

  protected createDeal(): void {
    if (this.dealForm.invalid) return;
    const value = this.dealForm.getRawValue();
    this.api.post('/crm/deals', { ...value, value: Number(value.value || 0) }).subscribe(() => {
      this.dealForm.reset({ leadId: '', clientName: '', value: 0, stage: 'Proposal', expectedClose: new Date().toISOString().slice(0, 10), notes: '' });
      this.loadCrm();
    });
  }

  protected createTask(): void {
    if (this.taskForm.invalid) return;
    this.api.post('/crm/tasks', this.taskForm.getRawValue()).subscribe(() => {
      this.taskForm.reset({ title: '', relatedTo: '', dueDate: new Date().toISOString().slice(0, 10), priority: 'Medium', status: 'Open' });
      this.loadCrm();
    });
  }

  protected updateCrm(module: 'leads' | 'deals' | 'tasks', id: string | undefined, body: Record<string, unknown>): void {
    if (!id) return;
    this.api.patch(`/crm/${module}/${id}`, body).subscribe(() => this.loadCrm());
  }


  protected openCrmEmployeeDetail(employee: AssignmentMeta & { employeeCode?: string; employeeName?: string }): void {
    const employeeCode = String(employee.assignedEmployeeCode || employee.employeeCode || '').trim().toUpperCase();
    if (!employeeCode) return;
    this.selectedCrmEmployeeCode.set(employeeCode);
    this.selectedCrmEmployeeName.set(employee.assignedEmployeeName || employee.employeeName || employeeCode);
    this.loadCrmEmployeeDetail(employeeCode);
    this.loadCrm();
  }

  protected clearCrmEmployeeDetail(): void {
    this.selectedCrmEmployeeCode.set('');
    this.selectedCrmEmployeeName.set('');
    this.employeeTodayLeads.set([]);
    this.employeeMonthLeads.set([]);
    this.employeeTodayDeals.set([]);
    this.employeeMonthDeals.set([]);
    this.loadCrm();
  }

  private loadCrmEmployeeDetail(employeeCode: string): void {
    forkJoin({
      todayLeads: this.api.get<{ leads?: CrmLeadRow[] }>('/crm/leads', { employeeCode, period: 'today' }).pipe(catchError(() => of({ leads: [] }))),
      monthLeads: this.api.get<{ leads?: CrmLeadRow[] }>('/crm/leads', { employeeCode, period: 'month' }).pipe(catchError(() => of({ leads: [] }))),
      todayDeals: this.api.get<{ deals?: CrmDealRow[] }>('/crm/deals', { employeeCode, period: 'today' }).pipe(catchError(() => of({ deals: [] }))),
      monthDeals: this.api.get<{ deals?: CrmDealRow[] }>('/crm/deals', { employeeCode, period: 'month' }).pipe(catchError(() => of({ deals: [] })))
    }).subscribe(({ todayLeads, monthLeads, todayDeals, monthDeals }) => {
      console.log('[CRM][HR] loadCrmEmployeeDetail response', {
        employeeCode,
        todayLeads: todayLeads.leads || [],
        monthLeads: monthLeads.leads || [],
        todayDeals: todayDeals.deals || [],
        monthDeals: monthDeals.deals || []
      });
      this.employeeTodayLeads.set(todayLeads.leads || []);
      this.employeeMonthLeads.set(monthLeads.leads || []);
      this.employeeTodayDeals.set(todayDeals.deals || []);
      this.employeeMonthDeals.set(monthDeals.deals || []);
    });
  }
  protected assignmentLabel(row: AssignmentMeta): string {
    const name = row.assignedEmployeeName?.trim();
    const code = row.assignedEmployeeCode?.trim();
    if (name && code) return `${name} (${code})`;
    if (name) return name;
    if (code) return code;
    return 'Unassigned';
  }

  protected periodLabel(row: AssignmentMeta): string {
    return row.createdDateStatus || (row.isToday ? 'Today' : row.isThisMonth ? 'This month' : 'Older');
  }

  protected periodSummaryItems(summary: PeriodSummary, amountLabel = 'Amount'): { label: string; value: string }[] {
    return [
      { label: 'Today', value: String(summary.todayCount || 0) },
      { label: 'This month', value: String(summary.monthCount || 0) },
      { label: amountLabel, value: this.formatCurrency(summary.monthAmount || 0) }
    ];
  }
  protected crmPipelineValue(): number {
    return this.crmDeals().reduce((sum, deal) => sum + Number(deal.value || 0), 0);
  }

  protected openCrmTaskCount(): number {
    return this.crmTasks().filter((task) => task.status !== 'Done').length;
  }

  protected leadName(leadId?: string): string {
    const lead = this.crmLeads().find((item) => item._id === leadId);
    return lead ? `${lead.name}${lead.company ? ' - ' + lead.company : ''}` : '-';
  }

  protected loadAccounting(): void {
    forkJoin({
      invoices: this.api.get<{ invoices?: AccountInvoiceRow[] } & PeriodListResponse>('/accounting/invoices').pipe(catchError(() => of({ invoices: [], summary: {} }))),
      payments: this.api.get<{ payments?: AccountPaymentRow[] } & PeriodListResponse>('/accounting/payments').pipe(catchError(() => of({ payments: [], summary: {} }))),
      expenses: this.api.get<{ expenses?: AccountExpenseRow[] } & PeriodListResponse>('/accounting/expenses').pipe(catchError(() => of({ expenses: [], summary: {} })))
    }).subscribe(({ invoices, payments, expenses }) => {
      this.accountInvoices.set(invoices.invoices ?? []);
      this.accountPayments.set(payments.payments ?? []);
      this.accountExpenses.set(expenses.expenses ?? []);
      this.invoiceSummary.set(invoices.summary ?? {});
      this.paymentSummary.set(payments.summary ?? {});
      this.expenseSummary.set(expenses.summary ?? {});
    });
  }

  protected createInvoice(): void {
    if (this.invoiceForm.invalid) return;
    const value = this.invoiceForm.getRawValue();
    this.api.post('/accounting/invoices', { ...value, amount: Number(value.amount || 0) }).subscribe(() => {
      this.invoiceForm.reset({ invoiceNumber: '', clientName: '', amount: 0, status: 'Pending', dueDate: new Date().toISOString().slice(0, 10), notes: '' });
      this.loadAccounting();
    });
  }

  protected createPayment(): void {
    if (this.paymentForm.invalid) return;
    const value = this.paymentForm.getRawValue();
    this.api.post('/accounting/payments', { ...value, amount: Number(value.amount || 0) }).subscribe(() => {
      this.paymentForm.reset({ payerName: '', amount: 0, mode: 'Bank Transfer', status: 'Received', paymentDate: new Date().toISOString().slice(0, 10), reference: '' });
      this.loadAccounting();
    });
  }

  protected createExpense(): void {
    if (this.expenseForm.invalid) return;
    const value = this.expenseForm.getRawValue();
    this.api.post('/accounting/expenses', { ...value, amount: Number(value.amount || 0) }).subscribe(() => {
      this.expenseForm.reset({ title: '', category: 'General', amount: 0, expenseDate: new Date().toISOString().slice(0, 10), status: 'Pending', notes: '' });
      this.loadAccounting();
    });
  }

  protected updateAccounting(module: 'invoices' | 'payments' | 'expenses', id: string | undefined, body: Record<string, unknown>): void {
    if (!id) return;
    this.api.patch(`/accounting/${module}/${id}`, body).subscribe(() => this.loadAccounting());
  }

  protected accountReceivableTotal(): number {
    return this.accountInvoices().filter((item) => item.status !== 'Paid').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }

  protected accountExpenseTotal(): number {
    return this.accountExpenses().reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }

  protected filteredManagerEmployees(): EmployeeRow[] {
    const departmentCode = this.employeeForm.controls.departmentCode.value;
    const editingId = this.editingEmployeeId();

    if (!departmentCode) {
      return this.employees().filter((employee) => employee._id !== editingId);
    }

    return this.employees().filter((employee) => {
      if (employee._id === editingId) return false;
      const department = employee.departmentId;
      const employeeDepartmentCode = typeof department === 'object' ? department?.departmentCode : '';
      return employeeDepartmentCode === departmentCode;
    });
  }


  protected filteredDesignations(): DesignationRow[] {
    const departmentCode = this.employeeForm.controls.departmentCode.value;
    if (!departmentCode) return this.designations();
    const department = this.departments().find((item) => item.departmentCode === departmentCode);
    if (!department?._id) return this.designations();
    return this.designations().filter((item) => {
      const designationDepartmentId = typeof item.departmentId === 'object' ? item.departmentId?._id : item.departmentId;
      return !designationDepartmentId || designationDepartmentId === department._id;
    });
  }
  protected onEmployeeDepartmentChanged(): void {
    const currentDesignation = this.employeeForm.controls.designationCode.value;
    if (!currentDesignation) return;
    const isAllowed = this.filteredDesignations().some((designation) => designation.designationCode === currentDesignation);
    if (!isAllowed) this.employeeForm.controls.designationCode.setValue('');
  }

  protected onSameAsCurrentAddressChanged(): void {
    if (this.employeeForm.controls.sameAsCurrentAddress.value) {
      this.copyCurrentAddressToPermanent();
    }
  }

  protected syncPermanentAddressFromCurrent(): void {
    if (this.employeeForm.controls.sameAsCurrentAddress.value) {
      this.copyCurrentAddressToPermanent();
    }
  }

  private copyCurrentAddressToPermanent(): void {
    this.employeeForm.patchValue({
      permanentAddressLine1: this.employeeForm.controls.currentAddressLine1.value,
      permanentCity: this.employeeForm.controls.currentCity.value,
      permanentState: this.employeeForm.controls.currentState.value,
      permanentPincode: this.employeeForm.controls.currentPincode.value
    });
  }

  protected setFeature(feature: HrFeature): void {
    this.activeFeature.set(feature);

    if (this.isLogisticsFeature(feature)) {
      this.loadLogisticsMonitor();
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { feature: feature === 'dashboard' ? null : feature },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  protected loadLogisticsMonitor(): void {
    this.isLogisticsMonitorLoading.set(true);
    this.logisticsMonitorError.set('');
    const dateParams = this.logisticsDateParams();

    forkJoin({
      dashboard: this.api
        .get<LogisticsMonitorData>('/logistics/dashboard', dateParams)
        .pipe(
          catchError((error) => {
            console.error('[LOGISTICS][HR] Dashboard failed', error);
            return of(null);
          })
        ),
    
      shipments: this.api
        .get<LogisticsShipmentListResponse>(
          '/logistics/shipments',
          {
            page: 1,
            limit: 100,
            sortBy: 'createdAt',
            sortOrder: 'desc',
            ...dateParams
          }
        )
        .pipe(
          catchError((error) => {
            console.error('[LOGISTICS][HR] All shipments failed', error);
            return of(null);
          })
        ),
    
      airCargoShipments: this.api
        .get<LogisticsShipmentListResponse>(
          '/logistics/shipments/air-cargo',
          {
            page: 1,
            limit: 100,
            sortBy: 'createdAt',
            sortOrder: 'desc',
            ...dateParams
          }
        )
        .pipe(
          catchError((error) => {
            console.error('[LOGISTICS][HR] Air Cargo shipments failed', error);
            return of(null);
          })
        ),
    
      seaFreightShipments: this.api
        .get<LogisticsShipmentListResponse>(
          '/logistics/shipments/sea-freight',
          {
            page: 1,
            limit: 100,
            sortBy: 'createdAt',
            sortOrder: 'desc',
            ...dateParams
          }
        )
        .pipe(
          catchError((error) => {
            console.error('[LOGISTICS][HR] Sea Freight shipments failed', error);
            return of(null);
          })
        ),
    
      documents: this.api
        .get<any>(
          '/logistics/documents',
          {
            page: 1,
            limit: 100,
            sortBy: 'expiryDate',
            sortOrder: 'asc',
            ...dateParams
          }
        )
        .pipe(
          catchError((error) => {
            console.error('[LOGISTICS][HR] Documents failed', error);
            return of(null);
          })
        ),
    
      transporters: this.api
        .get<any>(
          '/logistics/transporters',
          {
            page: 1,
            limit: 100,
            ...dateParams
          }
        )
        .pipe(
          catchError((error) => {
            console.error('[LOGISTICS][HR] Transporters failed', error);
            return of(null);
          })
        ),
    
      invoices: this.api
        .get<any>(
          '/logistics/invoices',
          {
            page: 1,
            limit: 100,
            ...dateParams
          }
        )
        .pipe(
          catchError((error) => {
            console.error('[LOGISTICS][HR] Invoices failed', error);
            return of(null);
          })
        ),
    
      vendorPayments: this.api
        .get<any>(
          '/logistics/vendor-payments',
          {
            page: 1,
            limit: 100,
            ...dateParams
          }
        )
        .pipe(
          catchError((error) => {
            console.error('[LOGISTICS][HR] Vendor Payments failed', error);
            return of(null);
          })
        ),
    
      cha: this.api
        .get<any>(
          '/logistics/cha',
          {
            page: 1,
            limit: 100,
            ...dateParams
          }
        )
        .pipe(
          catchError((error) => {
            console.error('[LOGISTICS][HR] CHA failed', error);
            return of(null);
          })
        ),
    
      warehouse: this.api
        .get<any>(
          '/logistics/warehouse',
          {
            page: 1,
            limit: 100,
            ...dateParams
          }
        )
        .pipe(
          catchError((error) => {
            console.error('[LOGISTICS][HR] Warehouse failed', error);
            return of(null);
          })
        ),
    
      customers: this.api
        .get<any>(
          '/logistics/customers',
          {
            page: 1,
            limit: 100,
            ...dateParams
          }
        )
        .pipe(
          catchError((error) => {
            console.error('[LOGISTICS][HR] Customers failed', error);
            return of(null);
          })
        ),
    
      vendors: this.api
        .get<any>(
          '/logistics/vendors',
          {
            page: 1,
            limit: 100,
            ...dateParams
          }
        )
        .pipe(
          catchError((error) => {
            console.error('[LOGISTICS][HR] Vendors failed', error);
            return of(null);
          })
        ),
    
      productsServices: this.api
        .get<any>(
          '/logistics/products-services',
          {
            page: 1,
            limit: 100,
            ...dateParams
          }
        )
        .pipe(
          catchError((error) => {
            console.error('[LOGISTICS][HR] Products / Services failed', error);
            return of(null);
          })
        )
    })
      .pipe(finalize(() => this.isLogisticsMonitorLoading.set(false)))
      .subscribe(({ dashboard, shipments, airCargoShipments, seaFreightShipments, documents, transporters, invoices, vendorPayments, cha, warehouse, customers, vendors, productsServices }) => {
        const shipmentRows = this.uniqueLogisticsShipments([
          ...this.responseRows<LogisticsMonitorShipment>(shipments, ['data', 'shipments', 'items']),
          ...this.responseRows<LogisticsMonitorShipment>(airCargoShipments, ['data', 'shipments', 'items']),
          ...this.responseRows<LogisticsMonitorShipment>(seaFreightShipments, ['data', 'shipments', 'items'])
        ]);
        this.logisticsShipments.set(shipmentRows);
        this.logisticsDocuments.set(this.responseRows<LogisticsDocumentRow>(documents, ['documents', 'data', 'items']));
        this.logisticsTransporters.set(this.responseRows<LogisticsTransporterRow>(transporters, ['transporters', 'data', 'items']));
        this.logisticsInvoices.set(this.responseRows<any>(invoices, ['invoices', 'data', 'items']));
        this.logisticsVendorPayments.set(this.responseRows<any>(vendorPayments, ['payments', 'vendorPayments', 'data', 'items']));
        this.logisticsChaRows.set(this.responseRows<any>(cha, ['data', 'cases', 'cha', 'chas', 'chaCases', 'agents', 'items']));
        this.logisticsWarehouseRows.set(this.responseRows<any>(warehouse, ['warehouses', 'warehouse', 'data', 'items']));
        this.logisticsCustomers.set(this.responseRows<any>(customers, ['customers', 'data', 'items']));
        this.logisticsVendors.set(this.responseRows<any>(vendors, ['vendors', 'data', 'items']));
        this.logisticsProductsServices.set(this.responseRows<any>(productsServices, ['productsServices', 'services', 'data', 'items']));

        if (dashboard) {
          this.logisticsMonitor.set({ ...dashboard, ...this.toLogisticsMonitorData({ data: shipmentRows, pagination: { total: shipmentRows.length } }), recentShipments: shipmentRows.slice(0, 8) });
        } else if (shipments) {
          this.logisticsMonitor.set(this.toLogisticsMonitorData(shipments));
        } else {
          this.logisticsMonitor.set(null);
          this.logisticsMonitorError.set('Unable to load Logistics monitoring data.');
        }
      });
  }

  private loadLogisticsMonitorFallback(originalError: any) {
    return this.api
      .get<LogisticsShipmentListResponse>('/logistics/shipments', {
        page: 1,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })
      .pipe(
        map((response) => this.toLogisticsMonitorData(response)),
        catchError((fallbackError) => {
          console.error('[LOGISTICS][HR] Monitoring API failed', {
            dashboard: {
              status: originalError?.status,
              url: originalError?.url,
              response: originalError?.error
            },
            fallback: {
              status: fallbackError?.status,
              url: fallbackError?.url,
              response: fallbackError?.error
            }
          });

          this.logisticsMonitor.set(null);
          this.logisticsMonitorError.set(
            fallbackError?.error?.message ||
            originalError?.error?.message ||
            'Unable to load Logistics monitoring data.'
          );

          return of(null);
        })
      );
  }

  private toLogisticsMonitorData(response: LogisticsShipmentListResponse | null): LogisticsMonitorData {
    const rows = response?.data || [];
    const byMode: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalRevenue = 0;

    rows.forEach((row) => {
      const mode = this.normalizeLogisticsMode(row.shipmentMode);
      const status = String(row.status || '').trim();

      if (mode) byMode[mode] = (byMode[mode] || 0) + 1;
      if (status) byStatus[status] = (byStatus[status] || 0) + 1;

      totalRevenue += Number(row.charges?.totalAmount || 0);
    });

    return {
      totalShipments: Number(response?.pagination?.total ?? rows.length),
      totalRevenue,
      airCargo: byMode['air-cargo'] || 0,
      seaFreight: byMode['sea-freight'] || 0,
      road: byMode['road'] || 0,
      draft: byStatus['draft'] || 0,
      pending:
        (byStatus['booking_created'] || 0) +
        (byStatus['pickup_pending'] || 0) +
        (byStatus['documents_pending'] || 0) +
        (byStatus['pending'] || 0),
      inTransit: byStatus['in_transit'] || byStatus['in-transit'] || 0,
      customs: byStatus['customs'] || 0,
      delivered: byStatus['delivered'] || 0,
      hold: byStatus['hold'] || 0,
      cancelled: byStatus['cancelled'] || 0,
      byMode,
      byStatus,
      recentShipments: rows.slice(0, 8)
    };
  }

  protected isLogisticsFeature(feature: string = this.activeFeature()): boolean {
    return feature === 'logistics' || feature.startsWith('logistics-');
  }

  protected logisticsFeatureTabs(): Array<{ id: HrFeature; label: string; icon: string }> {
    return [
      { id: 'logistics', label: 'Overview', icon: 'overview' },
      { id: 'logistics-air-cargo', label: 'Air Cargo', icon: 'plane' },
      { id: 'logistics-sea-freight', label: 'Sea Freight', icon: 'ship' },
      { id: 'logistics-cha', label: 'CHA', icon: 'shield' },
      { id: 'logistics-transporters', label: 'Transporters', icon: 'truck' },
      { id: 'logistics-warehouse', label: 'Warehouse', icon: 'warehouse' },
      { id: 'logistics-tracking', label: 'Tracking', icon: 'map' },
      { id: 'logistics-documents', label: 'Documents', icon: 'document' }
    ];
  }

  protected logisticsStaffRows(): EmployeeRow[] {
    return this.employees().filter((employee) => {
      const department = employee.departmentId;
      const values = [department?.departmentName, department?.departmentCode, department?.featureKey, department?.dashboardKey, ...(department?.accessModules || [])]
        .map((value) => String(value || '').toLowerCase());
      return values.some((value) => value.includes('logistics'));
    });
  }

  protected logisticsDailyWorkRows(): Array<{ employeeName: string; employeeCode: string; trips: number; shipments: number; hours: string; modes: string; status: string }> {
    const today = this.toDateInput(new Date());
    const rows = this.logisticsShipments().filter((shipment) => this.toDateInput(new Date(shipment.createdAt || '')) === today);
    return this.groupLogisticsShipmentsByEmployee(rows).map((row) => ({
      employeeName: row.employeeName,
      employeeCode: row.employeeCode,
      trips: row.shipments,
      shipments: row.shipments,
      hours: row.shipments ? `${Math.max(1, row.shipments * 2)} hrs` : '0 hrs',
      modes: row.modes.join(', ') || '-',
      status: row.statuses.join(', ') || '-'
    }));
  }

  protected logisticsMonthlyPerformanceRows(): Array<{ employeeName: string; employeeCode: string; deliveries: number; onTime: string; incidents: number; shipments: number }> {
    const now = new Date();
    const rows = this.logisticsShipments().filter((shipment) => {
      const date = new Date(shipment.createdAt || '');
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    return this.groupLogisticsShipmentsByEmployee(rows).map((row) => ({
      employeeName: row.employeeName,
      employeeCode: row.employeeCode,
      deliveries: row.delivered,
      onTime: `${row.shipments ? Math.round((row.delivered / row.shipments) * 100) : 0}%`,
      incidents: row.incidents,
      shipments: row.shipments
    }));
  }

  protected logisticsShiftRosterRows(): Array<{ employeeName: string; employeeCode: string; department: string; shift: string; schedule: string; status: string }> {
    const shift = this.defaultShift();
    return this.logisticsStaffRows().map((employee) => ({
      employeeName: this.employeeDisplayName(employee),
      employeeCode: employee.employeeCode || '-',
      department: employee.departmentId?.departmentName || 'Logistics',
      shift: shift?.shiftName || 'General Shift',
      schedule: `${shift?.startTime || '09:30'} - ${shift?.endTime || '18:30'}`,
      status: employee.employeeStatus || employee.status || 'active'
    }));
  }

  protected logisticsCertificationRows(): LogisticsDocumentRow[] {
    return this.logisticsDocuments().filter((doc) => /license|licence|cert|pass|driver|cha|airport|port/i.test(`${doc.documentType || ''} ${doc.documentName || ''}`));
  }

  protected logisticsVehicleRows(): LogisticsTransporterRow[] {
    return this.logisticsTransporters();
  }

  protected logisticsIncidentRows(): LogisticsMonitorShipment[] {
    return this.logisticsShipments().filter((shipment) => /hold|cancel|delay|damage|incident|spoil/i.test(String(shipment.status || '')));
  }

  private groupLogisticsShipmentsByEmployee(rows: LogisticsMonitorShipment[]): Array<{ employeeName: string; employeeCode: string; shipments: number; delivered: number; incidents: number; modes: string[]; statuses: string[] }> {
    const grouped = new Map<string, { employeeName: string; employeeCode: string; shipments: number; delivered: number; incidents: number; modes: Set<string>; statuses: Set<string> }>();
    rows.forEach((shipment) => {
      const employee = typeof shipment.assignedTo === 'object' && shipment.assignedTo ? shipment.assignedTo : null;
      const code = employee?.employeeCode || 'Unassigned';
      const name = employee?.displayName || [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') || code;
      const current = grouped.get(code) || { employeeName: name, employeeCode: code, shipments: 0, delivered: 0, incidents: 0, modes: new Set<string>(), statuses: new Set<string>() };
      current.shipments += 1;
      if (String(shipment.status || '').toLowerCase() === 'delivered') current.delivered += 1;
      if (/hold|cancel|delay|damage|incident|spoil/i.test(String(shipment.status || ''))) current.incidents += 1;
      current.modes.add(this.logisticsModeLabel(shipment.shipmentMode));
      current.statuses.add(this.logisticsStatusLabel(shipment.status));
      grouped.set(code, current);
    });
    return Array.from(grouped.values()).map((row) => ({ ...row, modes: Array.from(row.modes), statuses: Array.from(row.statuses) }));
  }

  private responseRows<T>(response: any, keys: string[]): T[] {
    if (Array.isArray(response)) return response;

    const candidates = [response, response?.data, response?.result].filter(Boolean);
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
      for (const key of keys) {
        const value = candidate?.[key];
        if (Array.isArray(value)) return value;
      }
    }

    return [];
  }

  private uniqueLogisticsShipments(rows: LogisticsMonitorShipment[]): LogisticsMonitorShipment[] {
    const seen = new Set<string>();
    return rows.filter((row, index) => {
      const key = String(row._id || row.shipmentNumber || index).trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private normalizeLogisticsMode(value?: string): string {
    const mode = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, '-');

    if (['air', 'air-cargo', 'air-freight', 'aircargo'].includes(mode)) return 'air-cargo';
    if (['sea', 'sea-freight', 'ocean', 'ocean-freight', 'seafreight'].includes(mode)) return 'sea-freight';
    if (['road', 'truck', 'transport', 'road-transport'].includes(mode)) return 'road';
    return mode;
  }

  private logisticsModeCount(data: LogisticsMonitorData | null, mode: string): number {
    const byMode = data?.byMode || {};
    return Object.entries(byMode).reduce((total, [key, value]) => {
      return this.normalizeLogisticsMode(key) === mode ? total + Number(value || 0) : total;
    }, 0);
  }

  private isChaShipment(row: LogisticsMonitorShipment): boolean {
    const status = String(row.status || '').toLowerCase();
    const mode = this.normalizeLogisticsMode(row.shipmentMode);
    const currentLocation = String(row.currentLocation || '').toLowerCase();
    const rowAny = row as any;
    return mode.includes('cha') || status.includes('custom') || status.includes('cha') || currentLocation.includes('custom') || Boolean(rowAny.customs || rowAny.chaAgent || rowAny.chaVendorId);
  }

  protected logisticsIconClass(icon?: string): string {
    const normalized = String(icon || 'package').trim().toLowerCase();
    return `icon-${normalized.replace(/[^a-z0-9-]/g, '') || 'package'}`;
  }
  protected sidebarIconClass(feature: HrFeature): string {
    const map: Partial<Record<HrFeature, string>> = {
      dashboard: 'overview',
      employee: 'people',
      'add-employee': 'plus',
      'employee-profile': 'profile',
      departments: 'department',
      'crm-leads': 'lead',
      'crm-deals': 'deal',
      'crm-tasks': 'task',
      'account-invoices': 'invoice',
      'account-payments': 'currency',
      'account-expenses': 'expense',
      logistics: 'overview',
      'logistics-air-cargo': 'plane',
      'logistics-sea-freight': 'ship',
      'logistics-cha': 'shield',
      'logistics-transporters': 'truck',
      'logistics-warehouse': 'warehouse',
      'logistics-tracking': 'map',
      'logistics-documents': 'document',
      attendance: 'clock',
      'attendance-reports': 'chart',
      'leave-requests': 'leave',
      'leave-calendar': 'calendar',
      'leave-balance': 'balance',
      'leave-types': 'settings',
      'salary-structure': 'currency',
      'payslip-generation': 'document',
      'payroll-processing': 'process',
      'payroll-reports': 'chart',
      meetings: 'meeting',
      'company-events': 'calendar',
      holidays: 'calendar',
      announcements: 'megaphone',
      messages: 'message',
      profile: 'profile',
      access: 'lock'
    };

    return this.logisticsIconClass(map[feature] || 'package');
  }

  protected logisticsModuleIcon(): string {
    return this.logisticsFeatureTabs().find((tab) => tab.id === this.activeFeature())?.icon || 'package';
  }

  protected isLogisticsModuleFeature(): boolean {
    return !['logistics', 'logistics-employees', 'logistics-daily-work', 'logistics-monthly-performance', 'logistics-shift-roster', 'logistics-certifications', 'logistics-vehicle-assignment', 'logistics-incidents'].includes(this.activeFeature());
  }

  protected logisticsModuleTitle(): string {
    return this.logisticsFeatureTabs().find((tab) => tab.id === this.activeFeature())?.label || 'Logistics';
  }

  protected logisticsModuleRows(): any[] {
    const feature = this.activeFeature();
    if (feature === 'logistics-invoice' || feature === 'logistics-sales-report' || feature === 'logistics-gst-report') return this.logisticsInvoices();
    if (feature === 'logistics-vendor-payments' || feature === 'logistics-payments-report' || feature === 'logistics-outstanding-report') return this.logisticsVendorPayments();
    if (feature === 'logistics-air-cargo') return this.logisticsShipments().filter((row) => this.normalizeLogisticsMode(row.shipmentMode) === 'air-cargo');
    if (feature === 'logistics-sea-freight') return this.logisticsShipments().filter((row) => this.normalizeLogisticsMode(row.shipmentMode) === 'sea-freight');
    if (feature === 'logistics-tracking') return this.logisticsShipments();
    if (feature === 'logistics-cha') return this.logisticsChaRows().length ? this.logisticsChaRows() : this.logisticsShipments().filter((row) => this.isChaShipment(row));
    if (feature === 'logistics-transporters') return this.logisticsTransporters();
    if (feature === 'logistics-warehouse') return this.logisticsWarehouseRows();
    if (feature === 'logistics-documents') return this.logisticsDocuments();
    if (feature === 'logistics-customers') return this.logisticsCustomers();
    if (feature === 'logistics-vendors') return this.logisticsVendors();
    if (feature === 'logistics-products-services') return this.logisticsProductsServices();
    return [];
  }

  protected logisticsModulePrimary(row: any): string {
    return row?.shipmentNumber || row?.invoiceNumber || row?.paymentCode || row?.transporterName || row?.warehouseName || row?.businessName || row?.customerName || row?.vendorName || row?.productName || row?.serviceName || row?.documentName || row?.chaName || row?.name || '-';
  }

  protected logisticsModuleSecondary(row: any): string {
    return row?.customerName || row?.vendor || row?.vehicleNumber || row?.documentType || row?.email || row?.mobile || row?.status || row?.createdAt || '-';
  }

  protected logisticsModuleAmount(row: any): string {
    const amount = row?.invoiceTotal ?? row?.totalAmount ?? row?.paidAmount ?? row?.charges?.totalAmount ?? row?.amount;
    return amount === undefined || amount === null ? '-' : this.formatCurrency(Number(amount || 0));
  }
  protected isLogisticsShipmentFeature(): boolean {
    return ['logistics-air-cargo', 'logistics-sea-freight', 'logistics-tracking'].includes(this.activeFeature());
  }

  protected logisticsShipmentCustomer(row: any): string {
    return row?.customerName || row?.customerId?.customerName || row?.customerId?.contactPerson || '-';
  }

  protected logisticsShipmentRoute(row: any): string {
    const origin = this.logisticsLocationLabel(row?.origin);
    const destination = this.logisticsLocationLabel(row?.destination);
    return `${origin} to ${destination}`;
  }

  protected logisticsShipmentCargo(row: any): string {
    const cargo = row?.cargo || {};
    const commodity = cargo.commodityOther || cargo.commodity || cargo.description || '-';
    const packages = Number(cargo.packageCount || 0) ? `${cargo.packageCount} ${cargo.packageType || 'pkg'}` : '';
    const weight = Number(cargo.grossWeight || 0) ? `${cargo.grossWeight} ${cargo.weightUnit || ''}`.trim() : '';
    return [commodity, packages, weight].filter(Boolean).join(' / ') || '-';
  }

  protected logisticsShipmentCarrier(row: any): string {
    if (this.normalizeLogisticsMode(row?.shipmentMode) === 'air-cargo') return row?.airFreight?.airlineOther || row?.airFreight?.airline || row?.airFreight?.awbNumber || '-';
    if (this.normalizeLogisticsMode(row?.shipmentMode) === 'sea-freight') return row?.seaFreight?.shippingLineOther || row?.seaFreight?.shippingLine || row?.seaFreight?.containerNumber || row?.seaFreight?.blNumber || '-';
    return row?.transport?.transporterName || row?.transport?.vehicleNumber || '-';
  }

  protected logisticsShipmentTransport(row: any): string {
    return row?.transport?.transporterName || row?.transport?.vehicleNumber || row?.transport?.driverName || '-';
  }

  protected logisticsShipmentWarehouse(row: any): string {
    return row?.warehouse?.warehouseName || row?.warehouse?.warehouseId?.warehouseName || row?.warehouse?.storageType || '-';
  }

  protected logisticsShipmentCustoms(row: any): string {
    return row?.customs?.chaName || row?.customs?.chaVendorId?.vendorName || row?.customs?.boeNumber || row?.customs?.shippingBillNumber || '-';
  }

  protected logisticsShipmentAssignee(row: any): string {
    const assigned = row?.assignedTo;
    if (assigned && typeof assigned === 'object') return assigned.displayName || [assigned.firstName, assigned.lastName].filter(Boolean).join(' ') || assigned.employeeCode || '-';
    return row?.assignedToName || '-';
  }
  protected logisticsMonitorMetrics(): Array<{
    label: string;
    value: string | number;
    icon: string;
  }> {
    const data = this.logisticsMonitor();

    return [
      { label: 'Total Shipments', value: Number(data?.totalShipments || 0), icon: 'package' },
      { label: 'Air Cargo', value: Number(data?.airCargo || this.logisticsModeCount(data, 'air-cargo')), icon: 'plane' },
      { label: 'Sea Freight', value: Number(data?.seaFreight || this.logisticsModeCount(data, 'sea-freight')), icon: 'ship' },
      { label: 'In Transit', value: Number(data?.inTransit || data?.byStatus?.['in-transit'] || data?.byStatus?.['in_transit'] || 0), icon: 'route' },
      { label: 'Customs', value: Number(data?.customs || data?.byStatus?.['customs'] || 0), icon: 'shield' },
      { label: 'Delivered', value: Number(data?.delivered || data?.byStatus?.['delivered'] || 0), icon: 'check' },
      { label: 'Pending', value: Number(data?.pending || data?.byStatus?.['pending'] || 0), icon: 'clock' },
      { label: 'Revenue', value: this.formatCurrency(Number(data?.totalRevenue || 0)), icon: 'currency' }
    ];
  }

  protected logisticsRecentShipments(): LogisticsMonitorShipment[] {
    return this.logisticsMonitor()?.recentShipments || [];
  }

  protected applyLogisticsDateFilter(): void {
    this.loadLogisticsMonitor();
  }

  protected clearLogisticsDateFilter(): void {
    this.logisticsFromDate.set('');
    this.logisticsToDate.set('');
    this.loadLogisticsMonitor();
  }

  protected applySalesDateFilter(): void {
    this.loadCrm();
  }

  protected clearSalesDateFilter(): void {
    this.salesFromDate.set('');
    this.salesToDate.set('');
    this.loadCrm();
  }

  private logisticsDateParams(): Record<string, string> {
    return this.dateParams(this.logisticsFromDate(), this.logisticsToDate());
  }

  private salesDateParams(): Record<string, string> {
    return this.dateParams(this.salesFromDate(), this.salesToDate());
  }

  private dateParams(fromDate: string, toDate: string): Record<string, string> {
    return {
      ...(fromDate ? { fromDate } : {}),
      ...(toDate ? { toDate } : {})
    };
  }

  protected logisticsModeLabel(value?: string): string {
    const mode = this.normalizeLogisticsMode(value);

    if (mode === 'air-cargo') return 'Air Cargo';
    if (mode === 'sea-freight') return 'Sea Freight';
    if (mode === 'road') return 'Road Transport';

    return value || '-';
  }

  protected logisticsStatusLabel(value?: string): string {
    const normalized = String(value || '')
      .trim()
      .replace(/[_-]+/g, ' ');

    if (!normalized) return '-';

    return normalized
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  protected logisticsLocationLabel(
    value?: LogisticsMonitorShipment['origin']
  ): string {
    if (!value) return '-';

    return value.city || value.name || value.country || '-';
  }

  protected refreshAll(): void {
    if (this.isRefreshing()) return;
    if (this.auth.hasRole('super_admin') && !this.selectedCompanyId()) {
      this.loadFirstCompanyContext();
      return;
    }

    this.isRefreshing.set(true);
    this.message.set('Refreshing dashboard...');

    forkJoin({
      dashboard: this.api.get<HrDashboardData>('/hr/dashboard').pipe(catchError(() => {
        this.message.set('Refresh failed. Please check the live backend API.');
        return of(this.dashboard());
      })),
      attendance: this.api.get<AttendanceRecord | null>('/hr/attendance/self/today').pipe(catchError(() => of(this.todayAttendance()))),
      leaves: this.api.get<{ leaveRequests?: LeaveRequestRow[] }>('/hr/leave/self/requests', { limit: 20 }).pipe(catchError(() => of({ leaveRequests: this.myLeaves() }))),
      notifications: this.api.get<{ notifications?: NotificationRow[] }>('/hr/communication/notifications', { limit: 4 }).pipe(catchError(() => of({ notifications: this.notifications() }))),
      unread: this.api.get<{ unreadCount?: number }>('/hr/communication/notifications/unread-count').pipe(catchError(() => of({ unreadCount: this.unreadCount() }))),
      history: this.api.get<{ attendance?: AttendanceRecord[] }>('/hr/attendance/self/records', this.historyQuery()).pipe(catchError(() => of({ attendance: this.attendanceHistory() }))),
      payslips: this.api.get<{ payslips?: PayslipRow[] }>('/hr/payroll/payslips', { limit: 40 }).pipe(catchError(() => of({ payslips: this.payslips() })))
    }).pipe(finalize(() => this.isRefreshing.set(false))).subscribe(({ dashboard, attendance, leaves, notifications, unread, history, payslips }) => {
      if (dashboard) {
        this.dashboard.set(dashboard);
        this.applyCompanyTheme(dashboard.company?.settings?.theme || (this.currentCompany() as any)?.settings?.theme);
        if (this.message() === 'Refreshing dashboard...') this.message.set('Dashboard refreshed.');
      }
      this.todayAttendance.set(attendance);
      this.myLeaves.set(leaves.leaveRequests ?? []);
      const activeNotifications = this.filterDismissedNotifications(notifications.notifications ?? []);
      this.notifications.set(activeNotifications);
      this.unreadCount.set(Math.min(unread.unreadCount ?? 0, activeNotifications.filter((item) => !item.isRead).length));
      this.attendanceHistory.set(history.attendance ?? []);
      this.payslips.set(payslips.payslips ?? []);
      this.updateTimer();
    });

    this.loadEmployees();
    this.loadCompanySettings();
    this.loadLeaveRequests();
    this.loadLeaveTypes();
    this.loadHolidays();
    this.loadMessages();
    this.loadPayrollData();
    this.loadEvents();
    this.loadMeetings();
    this.loadAttendanceManagement();
    this.loadCrm();
    this.loadLogisticsMonitor();
  }

  protected dashboardMetrics(): Array<{ label: string; value: number; icon: string }> {
    const summary = this.dashboard()?.employees?.summary;
    const attendance = this.dashboard()?.attendance?.today;
    const birthdayCount = (this.dashboard()?.employees?.upcomingBirthdays || []).length + (this.dashboard()?.employees?.upcomingWorkAnniversaries || []).length;
    return [
      { label: 'Total Employees', value: summary?.totalEmployees ?? this.employees().length, icon: 'E' },
      { label: 'Active Employees', value: summary?.activeEmployees ?? this.activeEmployees(), icon: 'A' },
      { label: 'Today Present', value: attendance?.present ?? 0, icon: 'P' },
      { label: 'Pending Leaves', value: this.dashboard()?.leave?.summary?.pending ?? 0, icon: 'L' },
      { label: 'Open Positions', value: this.dashboard()?.recruitment?.openJobs ?? 0, icon: 'J' },
      { label: 'Birthdays/Anniv.', value: birthdayCount, icon: 'B' },
      { label: 'New Joinees', value: summary?.newJoinings ?? 0, icon: 'N' },
      { label: 'On Leave Today', value: attendance?.onLeave ?? 0, icon: 'O' }
    ];
  }

  protected attendanceMetrics(): Array<{ label: string; value: number; icon: string }> {
    const rows = this.attendanceDailyRows();
    const statusCount = (status: string) => rows.filter((row) => row.status === status).length;
    const lateCount = rows.filter((row) => row.status === 'late' || row.lateByMinutes > 0).length;

    return [
      { label: 'Present', value: statusCount('present'), icon: 'P' },
      { label: 'Late', value: lateCount, icon: 'L' },
      { label: 'On leave', value: statusCount('on_leave'), icon: 'O' },
      { label: 'Absent', value: statusCount('absent'), icon: 'A' },
      { label: 'Half day', value: statusCount('half_day'), icon: 'H' }
    ];
  }

  protected attendanceReportRows(): Array<{ name: string; period: string; records: number | string; description: string }> {
    const today = this.dashboard()?.attendance?.today;
    const monthLabel = new Date().toLocaleString('en-IN', { month: 'short', year: 'numeric' });

    return [
      {
        name: 'Daily Attendance Report',
        period: this.formatDate(this.todayIso()),
        records: this.employees().length,
        description: 'Employee-wise present, absent, leave, late and half-day summary.'
      },
      {
        name: 'Monthly Attendance Report',
        period: monthLabel,
        records: this.attendanceHistory().length,
        description: 'Month-wise attendance records available for HR review.'
      },
      {
        name: 'Late Coming Report',
        period: this.formatDate(this.todayIso()),
        records: today?.late ?? 0,
        description: 'Employees marked late for the selected day.'
      },
      {
        name: 'Absence Report',
        period: this.formatDate(this.todayIso()),
        records: today?.absent ?? 0,
        description: 'Employees not present and not marked on leave.'
      },
      {
        name: 'Leave Attendance Report',
        period: this.formatDate(this.todayIso()),
        records: today?.onLeave ?? 0,
        description: 'Employees whose attendance is linked with approved leave.'
      }
    ];
  }
  protected defaultShift(): ShiftRow | null {
    return this.shifts().find((shift) => shift.isDefault) || this.shifts()[0] || null;
  }

  protected defaultAttendancePolicy(): AttendancePolicyRow | null {
    return this.attendancePolicies().find((policy) => policy.isDefault) || this.attendancePolicies()[0] || null;
  }

  protected attendanceDailyRows(): AttendanceDisplayRow[] {
    const todayKey = this.toDateInput(new Date());
    const records = this.attendanceRecords().filter((record) => this.toDateInput(new Date(record.attendanceDate || '')) === todayKey);
    const byCode = new Map(records.map((record) => [this.attendanceEmployeeCode(record), record]));
    const rows = this.employees().map((employee) => this.toAttendanceDisplayRow(employee, byCode.get(employee.employeeCode || ''), todayKey));

    for (const record of records) {
      const code = this.attendanceEmployeeCode(record);
      if (code && !rows.some((row) => row.employeeCode === code)) {
        rows.push(this.toAttendanceDisplayRow(null, record, todayKey));
      }
    }

    return rows.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }

  protected attendanceMonthlyRows(): AttendanceDisplayRow[] {
    return this.attendanceRecords()
      .map((record) => this.toAttendanceDisplayRow(null, record, this.toDateInput(new Date(record.attendanceDate || new Date()))))
      .sort((a, b) => `${b.date}${b.employeeName}`.localeCompare(`${a.date}${a.employeeName}`));
  }

  protected latePolicySummary(): string {
    const shift = this.defaultShift();
    const policy = this.defaultAttendancePolicy();
    return `${shift?.startTime || '09:30'} start, ${policy?.graceMinutes ?? shift?.graceMinutes ?? 0} min grace, ${policy?.maxLateAllowedPerMonth ?? 0} late days/month allowed`;
  }

  protected saveAttendanceSettings(): void {
    if (this.shiftForm.invalid || this.attendancePolicyForm.invalid) return;

    const shift = this.defaultShift();
    const policy = this.defaultAttendancePolicy();
    const shiftPayload = this.shiftForm.getRawValue();
    const policyPayload = this.attendancePolicyForm.getRawValue();

    this.isAttendanceSettingsSaving.set(true);
    forkJoin({
      shift: shift?._id
        ? this.api.patch<ShiftRow>(`/hr/attendance/shifts/${shift._id}`, shiftPayload)
        : this.api.post<ShiftRow>('/hr/attendance/shifts', shiftPayload),
      policy: policy?._id
        ? this.api.patch<AttendancePolicyRow>(`/hr/attendance/policies/${policy._id}`, policyPayload)
        : this.api.post<AttendancePolicyRow>('/hr/attendance/policies', policyPayload)
    }).pipe(finalize(() => this.isAttendanceSettingsSaving.set(false))).subscribe({
      next: () => {
        this.message.set('Attendance shift and late policy saved.');
        this.loadAttendanceManagement();
      },
      error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to save attendance settings.')
    });
  }

  private loadAttendanceManagement(): void {
    forkJoin({
      records: this.api.get<{ attendance?: AttendanceRecord[] }>('/hr/attendance/records', { ...this.historyQuery(), limit: 200 }).pipe(catchError(() => of({ attendance: [] }))),
      shifts: this.api.get<{ shifts?: ShiftRow[] }>('/hr/attendance/shifts', { limit: 50 }).pipe(catchError(() => of({ shifts: [] }))),
      policies: this.api.get<{ policies?: AttendancePolicyRow[] }>('/hr/attendance/policies', { limit: 50 }).pipe(catchError(() => of({ policies: [] })))
    }).subscribe(({ records, shifts, policies }) => {
      this.attendanceRecords.set(records.attendance ?? []);
      this.shifts.set(shifts.shifts ?? []);
      this.attendancePolicies.set(policies.policies ?? []);
      this.patchAttendanceSettingsForms();
    });
  }

  private patchAttendanceSettingsForms(): void {
    const shift = this.defaultShift();
    if (shift) {
      this.shiftForm.patchValue({
        shiftName: shift.shiftName || 'General Shift',
        shiftCode: shift.shiftCode || 'GENERAL',
        startTime: shift.startTime || '09:30',
        endTime: shift.endTime || '18:30',
        graceMinutes: shift.graceMinutes ?? 10,
        halfDayAfterMinutes: shift.halfDayAfterMinutes ?? 240,
        fullDayMinutes: shift.fullDayMinutes ?? 480,
        isDefault: shift.isDefault !== false
      });
    }

    const policy = this.defaultAttendancePolicy();
    if (policy) {
      this.attendancePolicyForm.patchValue({
        policyName: policy.policyName || 'Standard Attendance Policy',
        policyCode: policy.policyCode || 'STANDARD',
        graceMinutes: policy.graceMinutes ?? 10,
        maxLateAllowedPerMonth: policy.maxLateAllowedPerMonth ?? 3,
        lateMarkAction: policy.lateMarkAction || 'warning',
        halfDayAfterMinutes: policy.halfDayAfterMinutes ?? 240,
        isDefault: policy.isDefault !== false
      });
    }
  }

  private toAttendanceDisplayRow(employee: EmployeeRow | null, record: AttendanceRecord | undefined, fallbackDate: string): AttendanceDisplayRow {
    const employeeCode = employee?.employeeCode || this.attendanceEmployeeCode(record) || '-';
    const employeeName = employee ? this.employeeDisplayName(employee) : this.attendanceEmployeeName(record);
    const shift = this.defaultShift();
    const policy = this.defaultAttendancePolicy();

    return {
      employeeName,
      employeeCode,
      date: this.formatDate(record?.attendanceDate || fallbackDate),
      checkInTime: record?.checkInTime,
      checkOutTime: record?.checkOutTime,
      totalWorkMinutes: record?.totalWorkMinutes,
      status: record?.status || 'absent',
      lateByMinutes: record?.lateByMinutes || 0,
      lateCountThisMonth: this.lateCountForEmployee(employeeCode),
      allowedLateDays: policy?.maxLateAllowedPerMonth ?? 0,
      shiftName: this.attendanceShiftName(record) || shift?.shiftName || 'General Shift'
    };
  }

  private attendanceEmployeeCode(record?: AttendanceRecord): string {
    const employee = record?.employeeId;
    return typeof employee === 'object' ? employee.employeeCode || '' : '';
  }

  private attendanceEmployeeName(record?: AttendanceRecord): string {
    const employee = record?.employeeId;
    return typeof employee === 'object' ? employee.displayName || employee.employeeCode || 'Employee' : 'Employee';
  }

  private attendanceShiftName(record?: AttendanceRecord): string {
    const shift = record?.shiftId;
    return typeof shift === 'object' && shift ? shift.shiftName || shift.shiftCode || '' : '';
  }

  private lateCountForEmployee(employeeCode: string): number {
    if (!employeeCode || employeeCode === '-') return 0;
    return this.attendanceRecords().filter((record) => this.attendanceEmployeeCode(record) === employeeCode && (record.isLate || record.status === 'late' || (record.lateByMinutes || 0) > 0)).length;
  }
  protected filteredEmployees(): EmployeeRow[] {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.employees();
    return this.employees().filter((employee) =>
      [
        employee.displayName,
        employee.firstName,
        employee.lastName,
        employee.officialEmail,
        employee.employeeCode,
        employee.departmentId?.departmentName,
        employee.designationId?.designationName
      ].some((value) => String(value || '').toLowerCase().includes(term))
    );
  }


  protected globalSearchResults(): Array<{ title: string; meta: string; feature: HrFeature }> {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return [];

    const matches = (values: unknown[]) => values.some((value) => String(value || '').toLowerCase().includes(term));
    const results: Array<{ title: string; meta: string; feature: HrFeature }> = [];

    this.employees().forEach((employee) => {
      if (matches([employee.displayName, employee.name, employee.firstName, employee.lastName, employee.employeeCode, employee.officialEmail, employee.mobile, employee.departmentId?.departmentName, employee.designationId?.designationName])) {
        results.push({ title: this.employeeDisplayName(employee), meta: `Employee - ${employee.employeeCode || employee.officialEmail || '-'}`, feature: 'employee' });
      }
    });

    this.crmLeads().forEach((lead: any) => {
      if (matches([lead.name, lead.company, lead.phone, lead.email, lead.status, lead.source])) results.push({ title: lead.name || lead.company || 'Lead', meta: `CRM Lead - ${lead.phone || lead.status || '-'}`, feature: 'crm-leads' });
    });

    this.crmDeals().forEach((deal: any) => {
      if (matches([deal.clientName, deal.stage, deal.value, deal.notes])) results.push({ title: deal.clientName || 'Deal', meta: `CRM Deal - ${deal.stage || this.formatCurrency(deal.value || 0)}`, feature: 'crm-deals' });
    });

    this.crmTasks().forEach((task: any) => {
      if (matches([task.title, task.relatedTo, task.priority, task.status])) results.push({ title: task.title || 'CRM Task', meta: `Task - ${task.status || task.priority || '-'}`, feature: 'crm-tasks' });
    });

    this.accountInvoices().forEach((invoice: any) => {
      if (matches([invoice.invoiceNumber, invoice.clientName, invoice.status, invoice.amount])) results.push({ title: invoice.invoiceNumber || invoice.clientName || 'Invoice', meta: `Invoice - ${this.formatCurrency(invoice.amount || 0)}`, feature: 'account-invoices' });
    });

    this.accountPayments().forEach((payment: any) => {
      if (matches([payment.payerName, payment.mode, payment.status, payment.reference, payment.amount])) results.push({ title: payment.payerName || 'Payment', meta: `Payment - ${this.formatCurrency(payment.amount || 0)}`, feature: 'account-payments' });
    });

    this.accountExpenses().forEach((expense: any) => {
      if (matches([expense.title, expense.category, expense.status, expense.amount])) results.push({ title: expense.title || 'Expense', meta: `Expense - ${this.formatCurrency(expense.amount || 0)}`, feature: 'account-expenses' });
    });

    this.logisticsRecentShipments().forEach((shipment: any) => {
      if (matches([shipment.shipmentNumber, shipment.customerName, shipment.shipmentMode, shipment.status, shipment.origin?.city, shipment.destination?.city])) results.push({ title: shipment.shipmentNumber || shipment.customerName || 'Shipment', meta: `Logistics - ${this.logisticsStatusLabel(shipment.status)}`, feature: 'logistics' });
    });

    this.notifications().forEach((notification) => {
      if (matches([notification.title, notification.message, notification.createdAt])) results.push({ title: notification.title || 'Notification', meta: notification.message || this.formatDateTime(notification.createdAt), feature: 'dashboard' });
    });

    this.holidays().forEach((holiday: any) => {
      if (matches([holiday.holidayName, holiday.type, holiday.description])) results.push({ title: holiday.holidayName || 'Holiday', meta: `Holiday - ${this.formatDate(holiday.date)}`, feature: 'holidays' });
    });

    this.meetings().forEach((meeting: any) => {
      if (matches([meeting.meetingTitle, meeting.title, meeting.status, meeting.venue])) results.push({ title: meeting.meetingTitle || meeting.title || 'Meeting', meta: `Meeting - ${this.formatDateTime(meeting.startDateTime)}`, feature: 'meetings' });
    });

    return results.slice(0, 12);
  }

  protected hasGlobalSearchTerm(): boolean {
    return this.searchTerm().trim().length > 0;
  }

  protected openSearchResult(result: { feature: HrFeature }): void {
    this.setFeature(result.feature);
    this.searchTerm.set('');
  }

  protected clearGlobalSearch(): void {
    this.searchTerm.set('');
  }

  protected activeEmployees(): number {
    return this.employees().filter((employee) => this.isEmployeeActive(employee)).length;
  }

  protected inactiveEmployees(): number {
    return this.employees().filter((employee) => !this.isEmployeeActive(employee)).length;
  }

  protected employeeDisplayName(employee: EmployeeRow): string {
    const combinedName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
    return employee.displayName || employee.name || combinedName || employee.officialEmail || employee.email || employee.employeeCode || 'Employee';
  }

  protected employeeStatusLabel(employee: EmployeeRow): string {
    return this.isEmployeeActive(employee) ? 'active' : 'inactive';
  }

  protected employeeActionLabel(employee: EmployeeRow): string {
    return this.isEmployeeActive(employee) ? 'Deactivate' : 'Activate';
  }

  protected toggleEmployeeStatus(employee: EmployeeRow): void {
    if (!employee._id) return;
    const nextStatus = this.isEmployeeActive(employee) ? 'inactive' : 'active';
    this.message.set('');
    this.api.patch<EmployeeRow>(`/hr/employees/${employee._id}/status`, { employeeStatus: nextStatus }).subscribe({
      next: (updated) => {
        this.employees.update((rows) => rows.map((row) => row._id === employee._id ? { ...row, ...updated } : row));
        this.message.set(nextStatus === 'active' ? 'Employee activated.' : 'Employee deactivated. Login is blocked.');
        this.refreshDashboardOnly();
      },
      error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to update employee status.')
    });
  }

  protected departmentFeatureLabel(featureKey?: string): string {
    return this.departmentFeatureOptions.find((option) => option.value === (featureKey || 'none'))?.label || 'No extra feature';
  }

  private isEmployeeActive(employee: EmployeeRow): boolean {
    const status = (employee.employeeStatus || employee.status || 'active').toLowerCase();
    return ['active', 'probation', 'confirmed', 'notice_period'].includes(status);
  }

  protected probationEmployees(): number {
    return this.employees().filter((employee) => (employee.employeeStatus ?? '').includes('probation')).length;
  }

  protected attendanceTrendBars(): Array<{ label: string; value: number; percent: number }> {
    const present = this.dashboard()?.attendance?.today?.present ?? 0;
    const total = Math.max(
      present + Number(this.dashboard()?.attendance?.today?.absent ?? 0) + Number(this.dashboard()?.attendance?.today?.onLeave ?? 0),
      1
    );
    const percent = Math.max(8, Math.round((present / total) * 100));
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => ({ label, value: present, percent }));
  }

  protected departmentDisplayLabel(value?: string | null): string {
    if (!value) return 'Unassigned';
    const normalized = String(value).trim();
    const department = this.departments().find((item) =>
      item._id === normalized || item.departmentCode === normalized || item.departmentName === normalized
    );
    if (department) return department.departmentName || department.departmentCode || normalized;

    const employeeDepartment = this.employees()
      .map((employee) => employee.departmentId)
      .find((item) => item?._id === normalized || item?.departmentCode === normalized || item?.departmentName === normalized);

    return employeeDepartment?.departmentName || employeeDepartment?.departmentCode || normalized;
  }

  protected departmentDistribution(): Array<{ label: string; value: number; percent: number }> {
    const rows = this.dashboard()?.employees?.departmentWiseEmployees || [];
    const max = Math.max(...rows.map((item) => Number(item.total || 0)), 1);
    return rows.map((item) => ({
      label: this.departmentDisplayLabel(item._id),
      value: Number(item.total || 0),
      percent: Math.max(8, Math.round((Number(item.total || 0) / max) * 100))
    }));
  }

  protected leaveBreakdown(): Array<{ label: string; value: number; percent: number }> {
    const summary = this.dashboard()?.leave?.summary;
    const rows = [
      { label: 'Approved', value: summary?.approved || 0 },
      { label: 'Pending', value: summary?.pending || 0 },
      { label: 'Rejected', value: summary?.rejected || 0 }
    ];
    const max = Math.max(...rows.map((item) => item.value), 1);
    return rows.map((item) => ({ ...item, percent: Math.max(8, Math.round((item.value / max) * 100)) }));
  }

  protected recruitmentPipeline(): Array<{ label: string; value: number; percent: number }> {
    const candidates = this.dashboard()?.recruitment?.totalCandidates || 0;
    const interviews = this.dashboard()?.recruitment?.interviewsToday || 0;
    const openJobs = this.dashboard()?.recruitment?.openJobs || 0;
    const rows = [
      { label: 'Applied', value: candidates },
      { label: 'Screened', value: Math.max(interviews, 0) },
      { label: 'Interview', value: interviews },
      { label: 'Offered', value: 0 },
      { label: 'Hired', value: openJobs ? 0 : 0 }
    ];
    const max = Math.max(...rows.map((item) => item.value), 1);
    return rows.map((item) => ({ ...item, percent: Math.max(8, Math.round((item.value / max) * 100)) }));
  }

  protected canSubmitEmployeeForm(): boolean {
    const employeeCode = this.employeeForm.controls.employeeCode.value.trim();
    if (!employeeCode) return true;
    if (this.editingEmployeeId() && employeeCode.toUpperCase() === this.originalEmployeeCode().toUpperCase()) return true;
    return this.employeeCodeCheckStatus() === 'available';
  }

  protected isAttendanceDeviceSelected(device: string): boolean {
    return this.normalizeAttendanceDevices(this.employeeForm.controls.attendanceAllowedDevices.value).includes(device);
  }

  protected toggleAttendanceDevice(device: string): void {
    const current = this.normalizeAttendanceDevices(this.employeeForm.controls.attendanceAllowedDevices.value);
    const next = current.includes(device)
      ? current.filter((item) => item !== device)
      : [...current, device];

    this.employeeForm.controls.attendanceAllowedDevices.setValue(next.length ? next : ['desktop']);
    this.employeeForm.controls.attendanceAllowedDevices.markAsDirty();
  }

  private normalizeAttendanceDevices(value: unknown): string[] {
    const allowed = ['mobile', 'tablet', 'laptop', 'desktop'];
    const rows = Array.isArray(value) ? value : [];
    const normalized = rows
      .map((item) => String(item || '').trim().toLowerCase())
      .filter((item) => allowed.includes(item));

    return normalized.length ? Array.from(new Set(normalized)) : ['desktop'];
  }
  protected visibleEmployeeFormTabs(): Array<(typeof this.employeeFormTabs)[number]> {
    if (this.editingEmployeeId() || this.savedEmployeeForDocuments()?._id) return [...this.employeeFormTabs];
    return this.employeeFormTabs.filter((tab) => tab.id !== 'documents');
  }

  protected isFirstEmployeeFormTab(): boolean {
    return this.employeeFormTab() === this.visibleEmployeeFormTabs()[0].id;
  }

  protected isLastEmployeeFormTab(): boolean {
    const tabs = this.visibleEmployeeFormTabs();
    return this.employeeFormTab() === tabs[tabs.length - 1].id;
  }

  protected nextEmployeeFormTab(): void {
    const tabs = this.visibleEmployeeFormTabs();
    const index = tabs.findIndex((tab) => tab.id === this.employeeFormTab());
    tabs.slice(0, index + 1).flatMap((tab) => this.employeeSectionControls(tab.id)).forEach((controlName) => this.employeeForm.get(controlName)?.markAsTouched());
    const next = tabs[index + 1]?.id;
    if (next) this.setEmployeeFormTab(next);
  }

  protected previousEmployeeFormTab(): void {
    const tabs = this.visibleEmployeeFormTabs();
    const index = tabs.findIndex((tab) => tab.id === this.employeeFormTab());
    const previous = tabs[index - 1]?.id;
    if (previous) this.setEmployeeFormTab(previous);
  }

  protected setEmployeeFormTab(tab: EmployeeFormTab): void {
    const nextTab = tab === 'documents' && !this.editingEmployeeId() && !this.savedEmployeeForDocuments()?._id ? 'leave' : tab;
    this.employeeFormTab.set(nextTab);
    setTimeout(() => {
      document.querySelector(nextTab === 'documents' ? '#employeeDocumentsSection' : `[data-employee-section="${nextTab}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  protected controlError(controlName: string): string {
    const control = this.employeeForm.get(controlName);
    if (!control || !control.touched || !control.errors) return '';
    if (control.errors['required']) return 'This field is required.';
    if (control.errors['email']) return 'Enter a valid email address.';
    if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters required.`;
    if (control.errors['pattern']) return 'Password must include upper, lower, number and special character.';
    return 'Invalid value.';
  }

  protected activeFeatureLabel(): string {
    const labels: Partial<Record<HrFeature, string>> = {
      'add-employee': 'Add New Employee',
      'employee-profile': 'Employee Profile',
      departments: 'Departments & Designations',
      'job-postings': 'Job Postings',
      candidates: 'Candidates',
      interviews: 'Interview Scheduling',
      offers: 'Offer Management',
      'attendance-reports': 'Attendance Reports',
      'leave-requests': 'Leave Requests',
      'leave-calendar': 'Leave Calendar',
      'leave-balance': 'Leave Balance',
      'leave-types': 'Leave Types Configuration',
      'salary-structure': 'Salary Structure',
      'payslip-generation': 'Payslip Generation',
      'payroll-processing': 'Payroll Processing',
      'payroll-reports': 'Payroll Reports',
      'company-events': 'Company Events',
      announcements: 'Announcements',
      'leave-reports': 'Leave Reports',
      'recruitment-reports': 'Recruitment Reports',
      'payroll-summary': 'Payroll Summary Reports',
      exports: 'Export PDF/Excel',
      access: 'Change Password'
    };
    return labels[this.activeFeature()] || [...this.mainMenu, ...this.managementMenu, ...this.reportsMenu, ...this.settingsMenu].find((item) => item.id === this.activeFeature())?.label || 'HR';
  }

  protected activeFeatureDescription(): string {
    const copy: Partial<Record<HrFeature, string>> = {
      dashboard: 'People, attendance, leave, birthdays, and workforce activity',
      profile: 'HR profile, contact and workspace access',
      hr: 'People, attendance, hiring, and approvals',
      attendance: 'Mark check-in, check-out, leave, and daily status',
      logistics: 'Summary cards, mode-wise counts, alerts and recent Logistics movement',
      'logistics-employees': 'All Logistics staff with Air, Sea, Truck, Warehouse, CHA and QC filters',
      'logistics-daily-work': 'Today work log per employee with trips, shipments and hours',
      'logistics-monthly-performance': 'Month-wise delivery, on-time and incident summary by employee',
      'logistics-shift-roster': 'Warehouse and cold-storage shift schedule assignment',
      'logistics-certifications': 'License, CHA, airport and port pass expiry tracking',
      'logistics-vehicle-assignment': 'Truck and driver mapping for logistics fleet tracking',
      'logistics-incidents': 'Spoilage, delay, damage and hold reports per employee',
      employee: 'Profiles, documents, employment and statutory records',
      payroll: 'Salary runs, payslips, monthly payroll status and approvals',
      leave: 'Leave balances, requests, approvals and policy-backed leave',
      recruitment: 'Job openings, candidates, interviews and hiring pipeline',
      'crm-leads': 'Company leads with contact status and source tracking',
      'crm-deals': 'Pipeline deals, revenue value and close stages',
      'crm-tasks': 'Follow-ups and CRM tasks assigned across the company',
      'account-invoices': 'Create and manage company invoices',
      'account-payments': 'Track received, pending and failed payments',
      'account-expenses': 'Create and review company expenses',
      events: 'HR events, announcements and employee engagement',
      meetings: 'HR meetings, schedules and workforce conversations',
      messages: 'Send employee messages and read replies',
      holidays: 'Company holidays and upcoming calendar',
      reports: 'Employee, attendance, leave, payroll and recruitment reports',
      analytics: 'Live HR insights from employee and workflow records',
      settings: 'HR preferences, policies and workspace setup',
      access: 'Role access, security and HR permissions',
      'add-employee': 'Create an employee profile and optional login account',
      'employee-profile': 'View and edit employee details, documents and employment records',
      departments: 'Department and designation structure for the company',
      'job-postings': 'Create and manage open hiring positions',
      candidates: 'Applicant list, resume review and candidate status',
      interviews: 'Schedule interviews and track interview pipeline',
      offers: 'Offer letters, approvals and hiring decisions',
      'attendance-reports': 'Attendance reports and exports for HR review',
      'leave-requests': 'Pending leave approvals and employee leave decisions',
      'leave-calendar': 'Team-wide leave calendar',
      'leave-balance': 'Employee-wise leave balance',
      'leave-types': 'Sick, casual, earned and custom leave types',
      'salary-structure': 'Salary structure assigned to employees',
      'payslip-generation': 'Generate and view employee payslips',
      'payroll-processing': 'Run monthly payroll processing',
      'payroll-reports': 'Payroll reports and payout summaries',
      'company-events': 'Company events and engagement calendar',
      announcements: 'HR notices and company-wide announcements',
      'leave-reports': 'Leave usage and approval reports',
      'recruitment-reports': 'Hiring funnel and time-to-hire reports',
      'payroll-summary': 'Monthly payroll summary reports',
      exports: 'Export HR data to PDF or Excel'
    };
    return copy[this.activeFeature()] || 'HR workspace module';
  }

  protected featureSummary(): Array<{ label: string; value: string | number }> {
    const data = this.dashboard();
    const map: Partial<Record<HrFeature, Array<{ label: string; value: string | number }>>> = {
      dashboard: [],
      profile: [{ label: 'Name', value: this.hrDisplayName() }, { label: 'Role', value: this.hrProfileSubtitle() }],
      hr: [],
      attendance: this.attendanceMetrics().map((item) => ({ label: item.label, value: item.value })),
      logistics: this.logisticsMonitorMetrics().map((item) => ({ label: item.label, value: item.value })),
      employee: [{ label: 'Employees', value: this.employees().length }, { label: 'Active', value: this.activeEmployees() }],
      payroll: [{ label: 'Payroll status', value: data?.payroll?.currentMonthPayrollStatus || 'not_created' }, { label: 'Payslips', value: data?.payroll?.payslipsGenerated || 0 }],
      leave: [{ label: 'Pending', value: data?.leave?.summary?.pending || 0 }, { label: 'Approved', value: data?.leave?.summary?.approved || 0 }],
      recruitment: [{ label: 'Open jobs', value: data?.recruitment?.openJobs || 0 }, { label: 'Candidates', value: data?.recruitment?.totalCandidates || 0 }],
      events: [{ label: 'Upcoming events', value: data?.events?.upcoming?.length || 0 }],
      meetings: [{ label: 'Today meetings', value: data?.meetings?.todayMeetings || 0 }, { label: 'Upcoming', value: data?.meetings?.upcomingMeetings?.length || 0 }],
      messages: [{ label: 'Messages', value: this.messages().length }, { label: 'Unread alerts', value: this.unreadCount() }],
      holidays: [{ label: 'Upcoming holidays', value: data?.holidays?.upcoming?.length || 0 }],
      reports: [{ label: 'Employees', value: data?.employees?.summary?.totalEmployees || 0 }, { label: 'Leave pending', value: data?.leave?.summary?.pending || 0 }],
      analytics: this.dashboardMetrics().slice(0, 4).map((item) => ({ label: item.label, value: item.value })),
      settings: [{ label: 'MFA', value: 'Available' }, { label: 'Session', value: 'Protected' }],
      access: [{ label: 'Current role', value: this.auth.currentUser()?.role || 'hr' }, { label: 'Unread alerts', value: this.unreadCount() }]
    };
    return map[this.activeFeature()] || [
      { label: 'Employees', value: data?.employees?.summary?.totalEmployees || this.employees().length },
      { label: 'Pending leave', value: data?.leave?.summary?.pending || 0 }
    ];
  }

  protected featureList(): Array<{ title: string; meta: string }> {
    const data = this.dashboard();
    if (this.activeFeature() === 'holidays') {
      return (data?.holidays?.upcoming || []).map((item) => ({ title: item.holidayName || 'Holiday', meta: this.formatDate(item.date) }));
    }
    if (this.activeFeature() === 'events') {
      return (data?.events?.upcoming || []).map((item) => ({ title: item.title || 'HR Event', meta: this.formatDateTime(item.startDateTime) }));
    }
    if (this.activeFeature() === 'meetings') {
      return (data?.meetings?.upcomingMeetings || []).map((item) => ({ title: item.title || 'HR Meeting', meta: this.formatDateTime(item.startDateTime) }));
    }
    return this.notifications().map((item) => ({ title: item.title || 'HR update', meta: item.message || this.formatDateTime(item.createdAt) }));
  }
  protected openEmployeeModal(employee?: EmployeeRow): void {
    this.message.set('');
    this.employeeDocuments.set([]);
    this.selectedDocumentFiles.set([]);
    this.employeeDocumentForm.reset({ documentType: 'other', remarks: '' });

    if (!employee?._id) {
      this.editingEmployeeId.set(null);
      this.originalEmployeeCode.set('');
      this.savedEmployeeForDocuments.set(null);
      this.resetEmployeeForm();
      this.isEmployeeModalOpen.set(true);
      return;
    }

    this.editingEmployeeId.set(employee._id);
    this.savedEmployeeForDocuments.set(employee);
    this.originalEmployeeCode.set(employee.employeeCode || '');
    this.isEmployeeModalOpen.set(true);
    this.employeeCodeCheckStatus.set('available');
    this.employeeCodeMessage.set('');
    this.prefillEmployeeForm(employee);

    forkJoin({
      profile: this.api.get<EmployeeRow>(`/hr/employees/${employee._id}`).pipe(catchError(() => of(employee))),
      bank: this.api.get<EmployeeBankDetails | null>(`/hr/employees/${employee._id}/bank`).pipe(catchError(() => of(null))),
      statutory: this.api.get<EmployeeStatutoryDetails | null>(`/hr/employees/${employee._id}/statutory`).pipe(catchError(() => of(null))),
      documents: this.api.get<EmployeeDocumentsResponse | null>(`/hr/employees/${employee._id}/documents`).pipe(catchError(() => of(null)))
    }).subscribe(({ profile, bank, statutory, documents }) => {
      this.prefillEmployeeForm(profile, bank, statutory);
      this.savedEmployeeForDocuments.set(profile);
      this.employeeDocuments.set(documents?.documents ?? []);
    });
  }

  protected closeEmployeeModal(): void {
    if (this.isSaving()) return;
    this.closeEmployeeModalAfterSave();
  }

  private closeEmployeeModalAfterSave(): void {
    this.isEmployeeModalOpen.set(false);
    this.resetEmployeeForm();
    this.editingEmployeeId.set(null);
    this.originalEmployeeCode.set('');
    this.savedEmployeeForDocuments.set(null);
    this.employeeDocuments.set([]);
    this.selectedDocumentFiles.set([]);
    this.employeeDocumentForm.reset({ documentType: 'other', remarks: '' });
  }
  protected toggleEmployeePassword(): void {
    this.isEmployeePasswordVisible.update((value) => !value);
  }

  protected employeeModalTitle(): string {
    return this.editingEmployeeId() ? 'Edit employee profile' : 'Create employee profile';
  }

  protected employeeSubmitLabel(): string {
    if (this.isSaving()) return this.editingEmployeeId() ? 'Saving...' : 'Creating...';
    return this.editingEmployeeId() ? 'Save employee' : 'Create employee';
  }

  protected editEmployee(employee: EmployeeRow): void {
    this.setFeature('employee-profile');
    this.openEmployeeModal(employee);
  }

  protected deleteEmployee(employee: EmployeeRow): void {
    if (!employee._id || this.isSaving()) return;
    const label = this.employeeDisplayName(employee);
    if (!window.confirm(`Mark ${label} inactive and block login?`)) return;

    this.isSaving.set(true);
    this.message.set('');
    this.api
      .delete<EmployeeRow>(`/hr/employees/${employee._id}`)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (updated) => {
          this.employees.update((rows) => rows.map((row) => row._id === employee._id ? { ...row, ...updated, employeeStatus: 'inactive', status: 'inactive' } : row));
          this.message.set('Employee marked inactive. Login is blocked.');
          this.refreshDashboardOnly();
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to deactivate employee.')
      });
  }

  protected onEmployeeDocumentFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedDocumentFiles.set(Array.from(input.files || []));
  }

  protected uploadEmployeeDocuments(): void {
    const employeeId = this.editingEmployeeId() || this.savedEmployeeForDocuments()?._id;
    const files = this.selectedDocumentFiles();

    if (!employeeId) {
      this.message.set('Save employee profile before uploading documents.');
      return;
    }

    if (!files.length || this.isDocumentUploading()) {
      this.message.set('Please choose at least one document.');
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('documents', file));
    const formValue = this.employeeDocumentForm.getRawValue();
    formData.append('documentType', formValue.documentType || 'other');
    formData.append('remarks', formValue.remarks || '');

    this.isDocumentUploading.set(true);
    this.message.set('');
    this.api
      .post<EmployeeDocumentsResponse>(`/hr/employees/${employeeId}/documents/upload`, formData)
      .pipe(finalize(() => this.isDocumentUploading.set(false)))
      .subscribe({
        next: (documents) => {
          this.employeeDocuments.set(documents.documents ?? []);
          this.selectedDocumentFiles.set([]);
          this.employeeDocumentForm.reset({ documentType: 'other', remarks: '' });
          this.message.set('Employee documents uploaded.');
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to upload employee documents.')
      });
  }

  protected documentUrl(value?: string): string {
    return this.assetUrl(value);
  }

  protected documentLabel(document: EmployeeDocumentItem): string {
    return (document.documentType || 'document').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  protected fileSizeLabel(value?: number): string {
    if (!value) return '-';
    if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected checkEmployeeCode(): void {
    const employeeCode = this.employeeForm.controls.employeeCode.value.trim();

    if (this.employeeCodeCheckTimer) {
      clearTimeout(this.employeeCodeCheckTimer);
    }

    if (!employeeCode) {
      this.employeeCodeCheckStatus.set('idle');
      this.employeeCodeMessage.set('');
      return;
    }

    this.employeeCodeCheckStatus.set('checking');
    this.employeeCodeMessage.set('Checking employee ID...');

    this.employeeCodeCheckTimer = setTimeout(() => {
      this.api
        .get<EmployeeCodeAvailability>('/hr/employees/code-availability', {
          employeeCode,
          ...(this.selectedCompanyId() ? { companyId: this.selectedCompanyId() } : {})
        })
        .pipe(catchError(() => of({ employeeCode } as EmployeeCodeAvailability)))
        .subscribe((result) => {
          if (result.available) {
            this.employeeCodeCheckStatus.set('available');
            this.employeeCodeMessage.set('Employee ID is available.');
            return;
          }

          if (result.available === undefined) {
            this.employeeCodeCheckStatus.set('error');
            this.employeeCodeMessage.set('Unable to check Employee ID right now.');
            return;
          }

          this.employeeCodeCheckStatus.set('taken');
          this.employeeCodeMessage.set('Employee ID already exists.');
        });
    }, 350);
  }

  protected togglePunch(): void {
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
    if (this.activePunch()) return 'Working';
    if (this.todayAttendance()?.checkInTime) return 'Start next session';
    return 'Start day';
  }

  protected punchStateClass(): string {
    if (this.activePunch()) return 'in';
    if (this.todayAttendance()?.checkInTime) return 'out';
    return 'start';
  }

  protected punchIn(): void {
    this.isPunching.set(true);
    this.selfMessage.set('');
    this.api
      .post<AttendanceRecord>('/hr/attendance/self/check-in', {})
      .pipe(finalize(() => this.isPunching.set(false)))
      .subscribe({
        next: (record) => {
          this.todayAttendance.set(record);
          this.selfMessage.set('Punch in recorded.');
          this.applyCompanyTheme((this.currentCompany() as any)?.settings?.theme);
          this.refreshAll();
        },
        error: (error: { error?: { message?: string } }) => this.selfMessage.set(error.error?.message || 'Unable to punch in.')
      });
  }

  protected punchOut(): void {
    this.isPunching.set(true);
    this.selfMessage.set('');
    this.api
      .post<AttendanceRecord>('/hr/attendance/self/check-out', {})
      .pipe(finalize(() => this.isPunching.set(false)))
      .subscribe({
        next: (record) => {
          this.todayAttendance.set(record);
          this.selfMessage.set('Punch out recorded.');
          this.applyCompanyTheme((this.currentCompany() as any)?.settings?.theme);
          this.refreshAll();
        },
        error: (error: { error?: { message?: string } }) => this.selfMessage.set(error.error?.message || 'Unable to punch out.')
      });
  }

  protected applyLeave(): void {
    if (this.leaveForm.invalid || this.isLeaveSaving()) {
      this.leaveForm.markAllAsTouched();
      return;
    }
    this.isLeaveSaving.set(true);
    this.selfMessage.set('');
    this.api
      .post<LeaveRequestRow>('/hr/leave/self/requests', this.leaveForm.getRawValue())
      .pipe(finalize(() => this.isLeaveSaving.set(false)))
      .subscribe({
        next: () => {
          this.selfMessage.set('Leave applied. Admin/HR approver has been notified.');
          this.leaveForm.patchValue({ reason: '' });
          this.applyCompanyTheme((this.currentCompany() as any)?.settings?.theme);
          this.refreshAll();
        },
        error: (error: { error?: { message?: string } }) => this.selfMessage.set(error.error?.message || 'Unable to apply leave.')
      });
  }

  protected addEmployeeLeave(): void {
    if (this.hrLeaveForm.invalid || this.isLeaveSaving()) {
      this.hrLeaveForm.markAllAsTouched();
      return;
    }
    const value = this.hrLeaveForm.getRawValue();
    this.isLeaveSaving.set(true);
    this.message.set('');
    this.api
      .post<LeaveRequestRow>('/hr/leave/requests', {
        ...value,
        leaveCode: value.leaveCode.toUpperCase()
      })
      .pipe(finalize(() => this.isLeaveSaving.set(false)))
      .subscribe({
        next: () => {
          this.message.set('Leave added to calendar.');
          this.hrLeaveForm.patchValue({ reason: '' });
          this.loadLeaveRequests();
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to add leave.')
      });
  }

  protected createLeaveType(): void {
    if (this.leaveTypeForm.invalid || this.isLeaveTypeSaving()) {
      this.leaveTypeForm.markAllAsTouched();
      return;
    }
    const value = this.leaveTypeForm.getRawValue();
    this.isLeaveTypeSaving.set(true);
    this.message.set('');
    this.api
      .post<LeaveTypeRow>('/hr/leave/types', {
        ...value,
        leaveCode: value.leaveCode.toUpperCase()
      })
      .pipe(finalize(() => this.isLeaveTypeSaving.set(false)))
      .subscribe({
        next: () => {
          this.message.set('Leave type saved.');
          this.leaveTypeForm.reset({ leaveName: '', leaveCode: '', category: 'casual', description: '', paid: true, allowHalfDay: true, requireDocument: false, requireApproval: true, colorCode: '#4F46E5', isActive: true });
          this.loadLeaveTypes();
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to save leave type.')
      });
  }

  protected employeeLeaveSummaries(): EmployeeLeaveSummary[] {
    const grouped = new Map<string, EmployeeLeaveSummary>();

    for (const employee of this.employees()) {
      const employeeCode = employee.employeeCode || employee._id || 'NA';
      grouped.set(employeeCode, {
        employeeName: employee.displayName || employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employeeCode,
        employeeCode,
        totalLeave: 0,
        usedLeave: 0,
        pendingLeave: 0,
        remainingLeave: 0,
        balances: []
      });
    }

    for (const balance of this.leaveBalances()) {
      const employeeCode = balance.employeeId?.employeeCode || 'NA';
      const current = grouped.get(employeeCode) || {
        employeeName: balance.employeeId?.displayName || employeeCode,
        employeeCode,
        totalLeave: 0,
        usedLeave: 0,
        pendingLeave: 0,
        remainingLeave: 0,
        balances: []
      };
      const total = Number(balance.openingBalance || 0) + Number(balance.credited || 0) + Number(balance.carryForward || 0);
      current.totalLeave += total;
      current.usedLeave += Number(balance.availed || 0);
      current.pendingLeave += Number(balance.pending || 0);
      current.remainingLeave += Number(balance.availableBalance ?? Math.max(0, total - Number(balance.availed || 0) - Number(balance.pending || 0)));
      current.balances.push(balance);
      grouped.set(employeeCode, current);
    }

    return Array.from(grouped.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }

  protected leaveTypeBreakdown(summary: EmployeeLeaveSummary): string {
    return summary.balances
      .map((balance) => {
        const code = balance.leaveTypeId?.leaveCode || balance.leaveTypeId?.leaveName || 'Leave';
        return `${code}: ${Number(balance.availableBalance || 0)} left`;
      })
      .join(' | ') || '-';
  }

  protected selectedMonthLeaveRequests(): LeaveRequestRow[] {
    const [year, month] = this.leaveCalendarMonth().split('-').map((value) => Number(value));
    if (!year || !month) return this.allLeaveRequests();
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    return this.allLeaveRequests().filter((leave) => {
      const from = leave.fromDate ? new Date(leave.fromDate) : null;
      const to = leave.toDate ? new Date(leave.toDate) : from;
      return !!from && from <= monthEnd && (to || from) >= monthStart;
    });
  }

  protected leaveCalendarDays(): LeaveCalendarDay[] {
    const [year, month] = this.leaveCalendarMonth().split('-').map((value) => Number(value));
    if (!year || !month) return [];
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthLeaves = this.selectedMonthLeaveRequests();
    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(dateKey);
      const leaves = monthLeaves.filter((leave) => {
        const from = leave.fromDate ? new Date(leave.fromDate) : null;
        const to = leave.toDate ? new Date(leave.toDate) : from;
        return !!from && date >= this.startOfDay(from) && date <= this.startOfDay(to || from);
      });
      return { day, dateKey, leaves };
    });
  }

  protected leaveCalendarMonthLabel(): string {
    const [year, month] = this.leaveCalendarMonth().split('-').map((value) => Number(value));
    if (!year || !month) return 'Selected month';
    return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  protected onHrProfileImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.message.set('Please select a valid image file.');
      input.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.message.set('Profile image must be 2 MB or smaller.');
      input.value = '';
      return;
    }

    this.selectedProfileImage = file;
    const reader = new FileReader();
    reader.onload = () => this.profileImagePreview.set(String(reader.result || ''));
    reader.readAsDataURL(file);
    this.message.set('Image selected. Click Save Photo to update your HR profile.');
  }

  protected saveHrProfileImage(): void {
    if (!this.selectedProfileImage || this.isProfileImageSaving()) return;

    const body = new FormData();
    body.append('profileImage', this.selectedProfileImage);

    this.isProfileImageSaving.set(true);
    this.api.patch<User>('/auth/profile', body).pipe(finalize(() => this.isProfileImageSaving.set(false))).subscribe({
      next: (user) => {
        this.selectedProfileImage = null;
        this.syncCurrentUser(user);
        this.profileImagePreview.set('');
        this.message.set('HR profile image updated successfully.');
      },
      error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to update HR profile image.')
    });
  }

  protected cancelHrProfileImage(): void {
    this.selectedProfileImage = null;
    this.profileImagePreview.set('');
    this.message.set('');
  }
  protected changePassword(): void {
    if (this.passwordForm.invalid || this.isPasswordChanging()) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const value = this.passwordForm.getRawValue();
    if (value.newPassword !== value.confirmPassword) {
      this.message.set('New password and confirm password do not match.');
      return;
    }
    this.isPasswordChanging.set(true);
    this.message.set('');
    this.api.post('/auth/change-password', {
      currentPassword: value.currentPassword,
      newPassword: value.newPassword
    }).pipe(finalize(() => this.isPasswordChanging.set(false))).subscribe({
      next: () => {
        this.passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
        this.message.set('Password changed successfully. Please login again.');
        setTimeout(() => this.auth.logout(), 800);
      },
      error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to change password.')
    });
  }

  protected createDepartment(): void {
    const payload = this.departmentPayload();

    if (!payload.departmentName || !payload.departmentCode || this.departmentForm.invalid || this.isDepartmentSaving()) {
      this.departmentForm.markAllAsTouched();
      this.message.set('Department name and code are required.');
      return;
    }

    const departmentId = this.editingDepartmentId();
    const request = departmentId
      ? this.api.patch<DepartmentRow>(`/company-settings/departments/${departmentId}`, payload)
      : this.api.post<DepartmentRow>('/company-settings/departments', payload);

    this.isDepartmentSaving.set(true);
    this.message.set('');
    request.pipe(finalize(() => this.isDepartmentSaving.set(false))).subscribe({
      next: () => {
        this.resetDepartmentForm();
        this.message.set(departmentId ? 'Department updated.' : 'Department added.');
        this.loadCompanySettings();
      },
      error: (error: { error?: { message?: string; errors?: { message?: string }[] } }) => this.message.set(error.error?.message || error.error?.errors?.[0]?.message || 'Unable to save department.')
    });
  }

  protected editDepartment(department: DepartmentRow): void {
    if (!department._id) return;
    this.editingDepartmentId.set(department._id);
    this.departmentForm.reset({
      departmentName: department.departmentName || '',
      departmentCode: department.departmentCode || '',
      featureKey: department.featureKey || 'none',
      dashboardKey: department.dashboardKey || this.defaultDepartmentDashboard(department.featureKey),
      accessModules: department.accessModules?.length ? department.accessModules : this.defaultDepartmentAccess(department.featureKey),
      description: department.description || ''
    });
  }

  protected resetDepartmentForm(): void {
    this.editingDepartmentId.set(null);
    this.departmentForm.reset({ departmentName: '', departmentCode: '', featureKey: 'none', dashboardKey: 'employee', accessModules: this.defaultDepartmentAccess('none'), description: '' });
  }

  protected deleteDepartment(department: DepartmentRow): void {
    if (!department._id || this.isDepartmentSaving()) return;
    const label = department.departmentName || department.departmentCode || 'this department';
    if (!window.confirm(`Delete ${label}?`)) return;

    this.isDepartmentSaving.set(true);
    this.message.set('');
    this.api.delete<null>(`/company-settings/departments/${department._id}`)
      .pipe(finalize(() => this.isDepartmentSaving.set(false)))
      .subscribe({
        next: () => {
          if (this.editingDepartmentId() === department._id) this.resetDepartmentForm();
          this.message.set('Department deleted.');
          this.loadCompanySettings();
        },
        error: (error: { error?: { message?: string; errors?: { message?: string }[] } }) => this.message.set(error.error?.message || error.error?.errors?.[0]?.message || 'Unable to delete department.')
      });
  }

  protected departmentSubmitLabel(): string {
    if (this.isDepartmentSaving()) return this.editingDepartmentId() ? 'Saving...' : 'Adding...';
    return this.editingDepartmentId() ? 'Save department' : 'Add department';
  }

  protected createDesignation(): void {
    if (this.designationForm.invalid || this.isDesignationSaving()) {
      this.designationForm.markAllAsTouched();
      return;
    }

    const designationId = this.editingDesignationId();
    const payload = this.designationPayload();
    const request = designationId
      ? this.api.patch<DesignationRow>(`/company-settings/designations/${designationId}`, payload)
      : this.api.post<DesignationRow>('/company-settings/designations', payload);

    this.isDesignationSaving.set(true);
    this.message.set('');
    request.pipe(finalize(() => this.isDesignationSaving.set(false))).subscribe({
      next: () => {
        this.resetDesignationForm();
        this.message.set(designationId ? 'Designation updated.' : 'Designation added.');
        this.loadCompanySettings();
      },
      error: (error: { error?: { message?: string; errors?: { message?: string }[] } }) => this.message.set(error.error?.message || error.error?.errors?.[0]?.message || 'Unable to save designation.')
    });
  }

  protected editDesignation(designation: DesignationRow): void {
    if (!designation._id) return;
    this.editingDesignationId.set(designation._id);
    this.designationForm.reset({
      departmentCode: this.designationDepartmentCode(designation),
      designationName: designation.designationName || '',
      designationCode: designation.designationCode || '',
      level: Number(designation.level || 1),
      description: designation.description || ''
    });
  }

  protected resetDesignationForm(): void {
    this.editingDesignationId.set(null);
    this.designationForm.reset({ departmentCode: '', designationName: '', designationCode: '', level: 1, description: '' });
  }

  protected deleteDesignation(designation: DesignationRow): void {
    if (!designation._id || this.isDesignationSaving()) return;
    const label = designation.designationName || designation.designationCode || 'this designation';
    if (!window.confirm(`Delete ${label}?`)) return;

    this.isDesignationSaving.set(true);
    this.message.set('');
    this.api.delete<null>(`/company-settings/designations/${designation._id}`)
      .pipe(finalize(() => this.isDesignationSaving.set(false)))
      .subscribe({
        next: () => {
          if (this.editingDesignationId() === designation._id) this.resetDesignationForm();
          this.message.set('Designation deleted.');
          this.loadCompanySettings();
        },
        error: (error: { error?: { message?: string; errors?: { message?: string }[] } }) => this.message.set(error.error?.message || error.error?.errors?.[0]?.message || 'Unable to delete designation.')
      });
  }

  protected designationSubmitLabel(): string {
    if (this.isDesignationSaving()) return this.editingDesignationId() ? 'Saving...' : 'Adding...';
    return this.editingDesignationId() ? 'Save designation' : 'Add designation';
  }

  protected departmentDashboardLabel(dashboardKey?: string): string {
    return this.departmentDashboardOptions.find((option) => option.value === (dashboardKey || 'employee'))?.label || 'Employee Dashboard';
  }

  protected departmentAccessLabel(accessModules?: string[]): string {
    const modules = accessModules?.length ? accessModules : this.defaultDepartmentAccess('none');
    return modules
      .map((module) => this.departmentAccessOptions.find((option) => option.value === module)?.label || module)
      .join(', ');
  }

  protected onDepartmentFeatureChanged(): void {
    const featureKey = this.departmentForm.controls.featureKey.value;
    this.departmentForm.patchValue({
      dashboardKey: this.defaultDepartmentDashboard(featureKey),
      accessModules: this.defaultDepartmentAccess(featureKey)
    });
  }

  protected toggleDepartmentAccess(module: string, event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked === true;
    const modules = new Set(this.departmentForm.controls.accessModules.value || []);
    checked ? modules.add(module) : modules.delete(module);
    this.departmentForm.controls.accessModules.setValue(Array.from(modules));
  }

  protected departmentAccessChecked(module: string): boolean {
    return (this.departmentForm.controls.accessModules.value || []).includes(module);
  }

  private defaultDepartmentDashboard(featureKey?: string): string {
    const key = String(featureKey || 'none').toLowerCase();
    return ['sales', 'accounts', 'logistics', 'hr', 'support', 'operations'].includes(key) ? key : 'employee';
  }

  private defaultDepartmentAccess(featureKey?: string): string[] {
    const base = ['profile', 'attendance', 'leave', 'payroll', 'documents', 'bank', 'events', 'holidays', 'meetings', 'messages', 'settings', 'notifications'];
    const key = String(featureKey || 'none').toLowerCase();
    if (key === 'sales') return [...base, 'sales-crm'];
    if (key === 'accounts') return [...base, 'accounts'];
    if (key === 'logistics') return [...base, 'logistics'];
    return base;
  }

  private departmentPayload(): { departmentName: string; departmentCode: string; featureKey: string; dashboardKey: string; accessModules: string[]; description: string } {
    const value = this.departmentForm.getRawValue();
    return {
      departmentName: value.departmentName.trim(),
      departmentCode: value.departmentCode.trim().toUpperCase(),
      featureKey: value.featureKey || 'none',
      dashboardKey: value.dashboardKey || this.defaultDepartmentDashboard(value.featureKey),
      accessModules: value.accessModules?.length ? value.accessModules : this.defaultDepartmentAccess(value.featureKey),
      description: value.description.trim()
    };
  }
  private designationPayload(): { departmentCode: string; designationName: string; designationCode: string; level: number; description: string } {
    const value = this.designationForm.getRawValue();
    return {
      departmentCode: value.departmentCode.trim().toUpperCase(),
      designationName: value.designationName.trim(),
      designationCode: value.designationCode.trim().toUpperCase(),
      level: Number(value.level || 1),
      description: value.description.trim()
    };
  }

  protected designationDepartmentName(row: DesignationRow): string {
    if (typeof row.departmentId === 'object') return row.departmentId?.departmentName || row.departmentId?.departmentCode || '-';
    return this.departments().find((department) => department._id === row.departmentId)?.departmentName || '-';
  }

  protected designationDepartmentCode(row: DesignationRow): string {
    if (typeof row.departmentId === 'object') return row.departmentId?.departmentCode || '';
    return this.departments().find((department) => department._id === row.departmentId)?.departmentCode || '';
  }

  protected loadEmployees(): void {
    this.api
      .get<{ employees?: EmployeeRow[] }>('/hr/employees', {
        limit: 100,
        includeInactive: 'true',
        ...(this.selectedCompanyId() ? { companyId: this.selectedCompanyId() } : {})
      })
      .pipe(catchError(() => of({ employees: [] })))
      .subscribe((data) => this.employees.set(data.employees ?? []));
  }

  protected loadCompanySettings(): void {
    const companyQuery = this.selectedCompanyId() ? { companyId: this.selectedCompanyId() } : {};

    forkJoin({
      branches: this.api.get<BranchRow[]>('/company-settings/branches', companyQuery).pipe(catchError(() => of([]))),
      departments: this.api.get<DepartmentRow[]>('/company-settings/departments', companyQuery).pipe(catchError(() => of([]))),
      designations: this.api.get<DesignationRow[]>('/company-settings/designations', companyQuery).pipe(catchError(() => of([])))
    }).subscribe(({ branches, departments, designations }) => {
      this.branches.set(branches ?? []);
      this.departments.set(departments ?? []);
      this.designations.set(designations ?? []);
    });
  }

  protected openEmployeeDashboard(employee: EmployeeRow): void {
    if (!employee._id) {
      this.message.set('Employee profile is not ready yet.');
      return;
    }
    const rowCompanyId = typeof employee.companyId === 'object' ? employee.companyId?._id : employee.companyId;
    const companyId = this.selectedCompanyId() || rowCompanyId;
    void this.router.navigate(['/employee-dashboard'], {
      queryParams: {
        employeeId: employee._id,
        ...(companyId ? { companyId } : {})
      }
    });
  }

  protected loadLeaveRequests(): void {
    const companyQuery = this.selectedCompanyId() ? { companyId: this.selectedCompanyId() } : {};
    forkJoin({
      pending: this.api.get<{ leaveRequests?: LeaveRequestRow[] }>('/hr/leave/requests', {
        status: 'pending',
        limit: 40,
        ...companyQuery
      }).pipe(catchError(() => of({ leaveRequests: [] }))),
      all: this.api.get<{ leaveRequests?: LeaveRequestRow[] }>('/hr/leave/requests', {
        limit: 100,
        ...companyQuery
      }).pipe(catchError(() => of({ leaveRequests: [] }))),
      balances: this.api.get<{ leaveBalances?: LeaveBalanceRow[] }>('/hr/leave/balances', {
        year: new Date().getFullYear(),
        limit: 100,
        ...companyQuery
      }).pipe(catchError(() => of({ leaveBalances: [] })))
    }).subscribe(({ pending, all, balances }) => {
      this.leaveRequests.set(pending.leaveRequests ?? []);
      this.allLeaveRequests.set(all.leaveRequests ?? []);
      this.leaveBalances.set(balances.leaveBalances ?? []);
    });
  }

  protected loadLeaveTypes(): void {
    this.api
      .get<{ leaveTypes?: LeaveTypeRow[] }>('/hr/leave/types', {
        limit: 100,
        ...(this.selectedCompanyId() ? { companyId: this.selectedCompanyId() } : {})
      })
      .pipe(catchError(() => of({ leaveTypes: [] })))
      .subscribe((data) => {
        this.leaveTypes.set(data.leaveTypes ?? []);
        if (!this.hrLeaveForm.controls.leaveCode.value && data.leaveTypes?.[0]?.leaveCode) {
          this.hrLeaveForm.patchValue({ leaveCode: data.leaveTypes[0].leaveCode });
        }
      });
  }

  protected loadHolidays(): void {
    this.api
      .get<{ holidays?: HolidayRow[] }>('/hr/holidays', {
        limit: 40,
        ...(this.selectedCompanyId() ? { companyId: this.selectedCompanyId() } : {})
      })
      .pipe(catchError(() => of({ holidays: this.dashboard()?.holidays?.upcoming ?? [] })))
      .subscribe((data) => this.holidays.set(data.holidays ?? []));
  }

  protected loadEvents(): void {
    this.api
      .get<{ events?: EventRow[] }>('/hr/events', { limit: 40 })
      .pipe(catchError(() => of({ events: [] })))
      .subscribe((data) => this.events.set(data.events ?? []));
  }

  protected createEvent(): void {
    if (this.eventForm.invalid || this.isEventSaving()) {
      this.eventForm.markAllAsTouched();
      return;
    }
    const value = this.eventForm.getRawValue();
    this.isEventSaving.set(true);
    this.message.set('');
    this.api
      .post('/hr/events', {
        ...value,
        eventCode: this.generateRecordCode('EVT'),
        startDateTime: new Date(value.startDateTime).toISOString(),
        endDateTime: new Date(value.endDateTime).toISOString(),
        participants: []
      })
      .pipe(finalize(() => this.isEventSaving.set(false)))
      .subscribe({
        next: () => {
          this.message.set('Event created.');
          this.eventForm.patchValue({ eventTitle: '', venue: '', meetingLink: '', description: '' });
          this.loadEvents();
          this.refreshDashboardOnly();
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to create event.')
      });
  }

  protected updateEventStatus(event: EventRow, status: string): void {
    if (!event._id || this.isEventSaving()) return;
    this.isEventSaving.set(true);
    this.message.set('');
    this.api
      .patch(`/hr/events/${event._id}/status`, { status })
      .pipe(finalize(() => this.isEventSaving.set(false)))
      .subscribe({
        next: () => {
          this.message.set('Event status updated.');
          this.loadEvents();
          this.refreshDashboardOnly();
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to update event.')
      });
  }

  protected loadMeetings(): void {
    this.api
      .get<{ meetings?: MeetingRow[] }>('/hr/meetings', { limit: 40 })
      .pipe(catchError(() => of({ meetings: [] })))
      .subscribe((data) => this.meetings.set(data.meetings ?? []));
  }

  protected createMeeting(): void {
    if (this.meetingForm.invalid || this.isMeetingSaving()) {
      this.meetingForm.markAllAsTouched();
      return;
    }
    const value = this.meetingForm.getRawValue();
    const meetingCode = this.generateRecordCode('MTG');
    const attendeeEmployeeCodes = this.normalizeSelectedEmployeeCodes(value.attendeeEmployeeCodes);
    this.isMeetingSaving.set(true);
    this.message.set('');
    this.api
      .post('/hr/meetings', {
        meetingTitle: value.meetingTitle,
        meetingCode,
        meetingMode: value.meetingMode,
        meetingLink: this.meetingRoomUrl(meetingCode),
        venue: value.venue,
        startDateTime: new Date(value.startDateTime).toISOString(),
        endDateTime: new Date(value.endDateTime).toISOString(),
        agenda: value.agendaText ? [{ title: value.agendaText, description: '' }] : [],
        attendees: attendeeEmployeeCodes.map((employeeCode) => ({ employeeCode })),
        inviteCompanyAdmins: value.inviteCompanyAdmins,
        status: value.status,
        notifyAttendees: value.notifyAttendees
      })
      .pipe(finalize(() => this.isMeetingSaving.set(false)))
      .subscribe({
        next: () => {
          this.message.set('Meeting scheduled.');
          this.meetingForm.patchValue({ meetingTitle: '', venue: '', attendeeEmployeeCodes: [], agendaText: '' });
          this.loadMeetings();
          this.refreshDashboardOnly();
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to schedule meeting.')
      });
  }

  protected updateMeetingStatus(meeting: MeetingRow, status: string): void {
    if (!meeting._id || this.isMeetingSaving()) return;
    this.isMeetingSaving.set(true);
    this.message.set('');
    this.api
      .patch(`/hr/meetings/${meeting._id}/status`, { status })
      .pipe(finalize(() => this.isMeetingSaving.set(false)))
      .subscribe({
        next: () => {
          this.message.set('Meeting status updated.');
          this.loadMeetings();
          this.refreshDashboardOnly();
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to update meeting.')
      });
  }

  protected loadPayrollData(): void {
    forkJoin({
      runs: this.api.get<{ payrollRuns?: PayrollRunRow[] }>('/hr/payroll/runs', { limit: 50 }).pipe(catchError(() => of({ payrollRuns: [] }))),
      salaries: this.api.get<{ employeeSalaries?: EmployeeSalaryRow[] }>('/hr/payroll/employee-salaries', { limit: 40 }).pipe(catchError(() => of({ employeeSalaries: [] }))),
      payslips: this.api.get<{ payslips?: PayslipRow[] }>('/hr/payroll/payslips', { limit: 40 }).pipe(catchError(() => of({ payslips: [] })))
    }).subscribe(({ runs, salaries, payslips }) => {
      this.payrollRuns.set(runs.payrollRuns ?? []);
      this.employeeSalaries.set(salaries.employeeSalaries ?? []);
      this.payslips.set(payslips.payslips ?? []);
    });
  }

  protected toggleNotificationPanel(): void {
    this.isNotificationPanelOpen.update((value) => !value);
    if (!this.isNotificationPanelOpen()) return;
    this.markNotificationsSeen();
  }

  protected closeNotificationPanel(): void {
    this.isNotificationPanelOpen.set(false);
  }

  protected clearNotifications(): void {
    const visible = this.visibleNotifications();
    if (!visible.length) {
      this.unreadCount.set(0);
      return;
    }

    const dismissed = new Set(this.dismissedNotificationIds());
    visible.forEach((notification) => dismissed.add(this.notificationIdentity(notification)));
    this.dismissedNotificationIds.set(dismissed);
    this.saveDismissedNotificationIds(dismissed);
    this.notifications.update((items) => items.filter((item) => !dismissed.has(this.notificationIdentity(item))));
    this.unreadCount.set(0);
  }

  protected markNotificationsSeen(): void {
    if (this.unreadCount() === 0 && this.notifications().every((item) => item.isRead)) return;

    this.unreadCount.set(0);
    this.notifications.update((items) => items.map((item) => ({ ...item, isRead: true })));
    this.api
      .patch('/hr/communication/notifications/read-all', {})
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  private filterDismissedNotifications(notifications: NotificationRow[]): NotificationRow[] {
    const dismissed = this.dismissedNotificationIds();
    return notifications.filter((notification) => !dismissed.has(this.notificationIdentity(notification)));
  }

  private notificationIdentity(notification: NotificationRow): string {
    const fallback = [notification.title || '', notification.message || '', notification.createdAt || ''].join('|');
    return String(notification._id || fallback)
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private readDismissedNotificationIds(): string[] {
    try {
      const stored = JSON.parse(localStorage.getItem('opas.hr.dismissed.notifications') || '[]');
      return Array.isArray(stored) ? stored.map((item) => String(item || '')).filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  private saveDismissedNotificationIds(ids: Set<string>): void {
    localStorage.setItem('opas.hr.dismissed.notifications', JSON.stringify(Array.from(ids).slice(-200)));
  }

  protected assignSalary(): void {
    if (this.salaryForm.invalid || this.isPayrollSaving()) {
      this.salaryForm.markAllAsTouched();
      return;
    }

    const value = this.salaryForm.getRawValue();
    const earnings = [
      { componentCode: 'BASIC', componentName: 'Basic Salary', type: 'earning', amount: Number(value.basic || 0) },
      { componentCode: 'HRA', componentName: 'House Rent Allowance', type: 'earning', amount: Number(value.hra || 0) },
      { componentCode: 'ALLOWANCE', componentName: 'Allowance', type: 'earning', amount: Number(value.allowance || 0) }
    ].filter((item) => item.amount > 0);
    const deductions = [
      { componentCode: 'PF', componentName: 'Provident Fund', type: 'deduction', amount: Number(value.pf || 0) },
      { componentCode: 'TDS', componentName: 'TDS / Tax', type: 'deduction', amount: Number(value.tax || 0) }
    ].filter((item) => item.amount > 0);
    const grossSalary = earnings.reduce((sum, item) => sum + item.amount, 0);
    const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);

    this.isPayrollSaving.set(true);
    this.message.set('');
    this.api
      .post('/hr/payroll/employee-salaries', {
        employeeCode: value.employeeCode,
        earnings,
        deductions,
        grossSalary,
        totalDeductions,
        netSalary: Math.max(0, grossSalary - totalDeductions),
        monthlyCTC: grossSalary,
        annualCTC: grossSalary * 12,
        effectiveFrom: value.effectiveFrom,
        status: 'active'
      })
      .pipe(finalize(() => this.isPayrollSaving.set(false)))
      .subscribe({
        next: () => {
          this.message.set('Employee salary saved.');
          this.salaryForm.patchValue({ employeeCode: '', basic: 0, hra: 0, allowance: 0, pf: 0, tax: 0 });
          this.loadPayrollData();
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to save salary.')
      });
  }

  protected createPayrollRun(): void {
    if (this.payrollRunForm.invalid || this.isPayrollSaving()) {
      this.payrollRunForm.markAllAsTouched();
      return;
    }

    if (!this.canCreatePayrollRun()) {
      this.message.set('Please save at least one salary structure before creating payroll.');
      return;
    }

    const value = this.payrollRunForm.getRawValue();
    const existingLocalRun = this.payrollRuns().find((run) =>
      Number(run.month) === Number(value.month) && Number(run.year) === Number(value.year)
    );

    if (existingLocalRun) {
      this.message.set(`Payroll run already exists for ${this.payrollMonthLabel(existingLocalRun)}.`);
      return;
    }

    this.isPayrollSaving.set(true);
    this.message.set('');
    this.api
      .get<{ payrollRuns?: PayrollRunRow[] }>('/hr/payroll/runs', {
        month: value.month,
        year: value.year,
        limit: 1
      })
      .subscribe({
        next: (result) => {
          const existingRun = result.payrollRuns?.[0];
          if (existingRun) {
            this.message.set(`Payroll run already exists for ${this.payrollMonthLabel(existingRun)}.`);
            this.loadPayrollData();
            this.isPayrollSaving.set(false);
            return;
          }

          this.api
            .post('/hr/payroll/runs', value)
            .pipe(finalize(() => this.isPayrollSaving.set(false)))
            .subscribe({
              next: () => {
                this.message.set('Payroll run created.');
                this.loadPayrollData();
              },
              error: (error: { status?: number; error?: { message?: string } }) => {
                if (error.status === 409) {
                  this.message.set(error.error?.message || 'Payroll run already exists for this month.');
                  this.loadPayrollData();
                  return;
                }
                this.message.set(error.error?.message || 'Unable to create payroll run.');
              }
            });
        },
        error: (error: { error?: { message?: string } }) => {
          this.isPayrollSaving.set(false);
          this.message.set(error.error?.message || 'Unable to check payroll run.');
        }
      });
  }

  protected processPayrollRun(run: PayrollRunRow): void {
    if (!run._id || this.isPayrollSaving()) return;
    if (!this.canProcessRun(run)) {
      this.message.set(this.canCreatePayrollRun() ? 'Only draft payroll runs can be processed.' : 'Please save salary structure before processing payroll.');
      return;
    }
    this.isPayrollSaving.set(true);
    this.message.set('');
    this.api
      .post(`/hr/payroll/runs/${run._id}/process`, {})
      .pipe(finalize(() => this.isPayrollSaving.set(false)))
      .subscribe({
        next: () => {
          this.message.set('Payroll processed and payslips generated.');
          this.loadPayrollData();
          this.refreshDashboardOnly();
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to process payroll.')
      });
  }

  protected approvePayrollRun(run: PayrollRunRow): void {
    if (!run._id || this.isPayrollSaving()) return;
    if (!this.canApproveRun(run)) {
      this.message.set('Process payroll before approval.');
      return;
    }
    this.isPayrollSaving.set(true);
    this.message.set('');
    this.api
      .patch(`/hr/payroll/runs/${run._id}/status`, { status: 'approved' })
      .pipe(finalize(() => this.isPayrollSaving.set(false)))
      .subscribe({
        next: () => {
          this.message.set('Payroll approved.');
          this.loadPayrollData();
          this.refreshDashboardOnly();
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to approve payroll.')
      });
  }

  protected loadMessages(showPopup = false): void {
    this.api
      .get<{ messages?: MessageRow[] }>('/hr/communication/messages', { limit: 50 })
      .pipe(catchError(() => of({ messages: [] })))
      .subscribe((data) => this.applyMessages(data.messages ?? [], showPopup));
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
          this.message.set('Message sent to employee.');
          this.messageForm.reset({ recipientEmployeeCode: '', body: '' });
          this.loadMessages();
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to send message.')
      });
  }

  protected replyDraft(messageId?: string): string {
    return messageId ? this.replyDrafts()[messageId] || '' : '';
  }

  protected setReplyDraft(messageId: string | undefined, value: string): void {
    if (!messageId) return;
    this.replyDrafts.update((drafts) => ({ ...drafts, [messageId]: value }));
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
          this.loadMessages();
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
    const current = this.currentUser() as { id?: string; _id?: string; sub?: string } | null;
    const currentId = current?.id || current?._id || current?.sub;
    return Boolean(currentId && message.senderUserId?._id === currentId);
  }

  private applyMessages(rows: MessageRow[], showPopup: boolean): void {
    const previousIds = new Set(this.messages().map((item) => item._id).filter(Boolean));
    this.messages.set(rows);

    if (!this.hasLoadedMessages) {
      this.hasLoadedMessages = true;
      return;
    }

    if (!showPopup) return;

    const current = this.currentUser() as { id?: string; _id?: string; sub?: string; email?: string } | null;
    const currentId = current?.id || current?._id || current?.sub;
    const incoming = rows.find((item) =>
      item._id &&
      !previousIds.has(item._id) &&
      (item.recipientUserId?._id === currentId || item.recipientUserId?.email === current?.email)
    );

    if (incoming) {
      this.showMessagePopup('Message aaya hai: New message');
    }
  }

  private showMessagePopup(text: string): void {
    this.messagePopup.set(text);
    if (this.popupTimerId) clearTimeout(this.popupTimerId);
    this.popupTimerId = setTimeout(() => this.messagePopup.set(''), 1000);
  }

  protected editHoliday(holiday: HolidayRow): void {
    if (!holiday._id) return;
    this.editingHolidayId.set(holiday._id);
    this.holidayForm.reset({
      holidayName: holiday.holidayName || '',
      date: holiday.date ? this.toDateInput(new Date(holiday.date)) : new Date().toISOString().slice(0, 10),
      type: holiday.type || 'company',
      description: holiday.description || '',
      holidayColor: holiday.holidayColor || '#2563eb',
      isPaid: holiday.isPaid !== false,
      isActive: holiday.isActive !== false
    });
  }

  protected resetHolidayForm(): void {
    this.editingHolidayId.set(null);
    this.holidayForm.reset({
      holidayName: '',
      date: new Date().toISOString().slice(0, 10),
      type: 'company',
      description: '',
      holidayColor: '#2563eb',
      isPaid: true,
      isActive: true
    });
  }

  protected saveHoliday(): void {
    if (this.holidayForm.invalid || this.isHolidaySaving()) {
      this.holidayForm.markAllAsTouched();
      return;
    }

    const holidayId = this.editingHolidayId();
    const request = holidayId
      ? this.api.patch<HolidayRow>(`/hr/holidays/${holidayId}`, this.holidayForm.getRawValue())
      : this.api.post<HolidayRow>('/hr/holidays', this.holidayForm.getRawValue());

    this.isHolidaySaving.set(true);
    this.message.set('');
    request.pipe(finalize(() => this.isHolidaySaving.set(false))).subscribe({
      next: () => {
        this.message.set(holidayId ? 'Holiday updated.' : 'Holiday added.');
        this.resetHolidayForm();
        this.loadHolidays();
        this.applyCompanyTheme((this.currentCompany() as any)?.settings?.theme);
        this.refreshAll();
      },
      error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to save holiday.')
    });
  }

  protected updateLeaveStatus(leave: LeaveRequestRow, status: 'approved' | 'rejected'): void {
    if (!leave._id || this.isLeaveActionSaving()) return;
    this.isLeaveActionSaving.set(true);
    this.api
      .patch<LeaveRequestRow>(`/hr/leave/requests/${leave._id}/status`, {
        status,
        approverRemarks: this.leaveRemark() || (status === 'approved' ? 'Approved by HR.' : 'Rejected by HR.')
      })
      .pipe(finalize(() => this.isLeaveActionSaving.set(false)))
      .subscribe({
        next: () => {
          this.message.set(`Leave ${status}. Employee has been notified.`);
          this.leaveRemark.set('');
          this.loadLeaveRequests();
          this.loadLeaveTypes();
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to update leave request.')
      });
  }

  protected createEmployee(): void {
    if (this.employeeForm.invalid || this.isSaving()) {
      this.employeeForm.markAllAsTouched();
      return;
    }
    if (!this.canSubmitEmployeeForm()) {
      this.message.set('Please enter an available Employee ID before saving employee.');
      return;
    }

    this.isSaving.set(true);
    this.message.set('');
    const formValue = this.employeeForm.getRawValue();
    const {
      bankName,
      branchName,
      accountHolderName,
      accountNumber,
      ifscCode,
      upiId,
      paymentMode,
      isSalaryAccount,
      panNumber,
      aadhaarNumber,
      uanNumber,
      pfNumber,
      esiNumber,
      professionalTaxNumber,
      casualLeaveBalance,
      sickLeaveBalance,
      earnedLeaveBalance,
      leaveWithoutPay,
      emergencyContactName,
      emergencyContactMobile,
      emergencyContactRelation,
      currentAddressLine1,
      currentCity,
      currentState,
      currentPincode,
      sameAsCurrentAddress,
      permanentAddressLine1,
      permanentCity,
      permanentState,
      permanentPincode,
      probationMonths,
      fullName,
      ...employeePayload
    } = formValue;
    void sameAsCurrentAddress;
    const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || firstName;
    const joiningDate = employeePayload.joiningDate;
    const probationEndDate = joiningDate
      ? new Date(new Date(joiningDate).setMonth(new Date(joiningDate).getMonth() + Number(probationMonths || 0))).toISOString().slice(0, 10)
      : '';
    const cleanedEmployeePayload = this.cleanEmployeePayload(employeePayload);
    const bankDetails = {
      bankName,
      branchName,
      accountHolderName,
      accountNumber,
      ifscCode,
      upiId,
      paymentMode,
      isSalaryAccount
    };
    const statutoryDetails = {
      panNumber,
      aadhaarNumber,
      uanNumber,
      pfNumber,
      esiNumber,
      professionalTaxNumber
    };
    const employeeBody = {
      ...cleanedEmployeePayload,
      firstName,
      lastName,
      displayName: fullName.trim(),
      probationEndDate,
      currentAddress: {
        addressLine1: currentAddressLine1,
        city: currentCity,
        state: currentState,
        pincode: currentPincode,
        country: 'India'
      },
      permanentAddress: {
        addressLine1: permanentAddressLine1,
        city: permanentCity,
        state: permanentState,
        pincode: permanentPincode,
        country: 'India'
      },
      emergencyContact: {
        name: emergencyContactName,
        mobile: emergencyContactMobile,
        relation: emergencyContactRelation
      },
      ...(this.selectedCompanyId() ? { companyId: this.selectedCompanyId() } : {})
    };
    const editingId = this.editingEmployeeId();
    const request = editingId
      ? forkJoin({
        employee: this.api.patch<EmployeeRow>(`/hr/employees/${editingId}`, employeeBody),
        bank: this.api.put<EmployeeBankDetails>(`/hr/employees/${editingId}/bank`, bankDetails),
        statutory: this.api.put<EmployeeStatutoryDetails>(`/hr/employees/${editingId}/statutory`, statutoryDetails)
      }).pipe(map(({ employee }) => employee))
      : this.api.post<EmployeeRow>('/hr/employees', {
        ...employeeBody,
        createLoginAccount: Boolean(cleanedEmployeePayload['createLoginAccount'] && cleanedEmployeePayload['officialEmail']),
        bankDetails,
        statutoryDetails,
        leaveBalances: {
          casual: Number(casualLeaveBalance || 0),
          sick: Number(sickLeaveBalance || 0),
          earned: Number(earnedLeaveBalance || 0),
          lwp: Number(leaveWithoutPay || 0),
          year: new Date().getFullYear()
        }
      });

    request
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (employee) => {
          const savedEmployee = employee || this.savedEmployeeForDocuments();
          const successMessage = editingId
            ? 'Employee updated. Documents can be uploaded below.'
            : `Employee ${savedEmployee?.displayName ?? savedEmployee?.name ?? 'created'} saved successfully.`;

          this.message.set(successMessage);
          this.editingEmployeeId.set(savedEmployee?._id || editingId || null);
          this.savedEmployeeForDocuments.set(savedEmployee || null);
          this.originalEmployeeCode.set(savedEmployee?.employeeCode || this.employeeForm.controls.employeeCode.value || '');
          this.employeeCodeCheckStatus.set('available');
          this.loadEmployees();
          this.refreshDashboardOnly();
          this.showMessagePopup(successMessage);
          this.closeEmployeeModalAfterSave();
        },
        error: (error: { error?: { message?: string } }) => {
          const errorMessage = error.error?.message || 'Unable to save employee.';
          this.message.set(errorMessage);
          this.showMessagePopup(errorMessage);
        }
      });
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
    return logs.map((log, index) => `${index + 1}. ${this.formatTime(log.checkInTime)} - ${this.formatTime(log.checkOutTime)}`).join(' | ');
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
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  protected formatCurrency(value?: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  protected payslipMonthLabel(slip: PayslipRow): string {
    if (!slip.month || !slip.year) return '-';
    return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date(slip.year, slip.month - 1, 1));
  }

  protected payrollMonthLabel(run: PayrollRunRow): string {
    if (!run.month || !run.year) return '-';
    return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date(run.year, run.month - 1, 1));
  }

  protected canCreatePayrollRun(): boolean {
    return this.employeeSalaries().some((salary) => (salary.status || 'active') === 'active');
  }

  protected canProcessRun(run: PayrollRunRow): boolean {
    return this.canCreatePayrollRun() && (run.status || 'draft') === 'draft';
  }

  protected canApproveRun(run: PayrollRunRow): boolean {
    return (run.status || '') === 'processed';
  }

  protected payrollFlowStatus(step: 'salary' | 'processing' | 'payslip' | 'reports'): string {
    const hasSalary = this.canCreatePayrollRun();
    const hasRun = this.payrollRuns().length > 0;
    const hasProcessed = this.payrollRuns().some((run) => ['processed', 'approved', 'locked'].includes(run.status || ''));
    const hasPayslip = this.payslips().length > 0;
    if (step === 'salary') return hasSalary ? 'complete' : 'current';
    if (step === 'processing') return hasProcessed ? 'complete' : hasSalary ? 'current' : 'locked';
    if (step === 'payslip') return hasPayslip ? 'complete' : hasRun && hasProcessed ? 'current' : 'locked';
    return hasPayslip ? 'current' : 'locked';
  }

  protected autoMeetingLink(): string {
    return this.meetingRoomUrl('AUTO');
  }

  protected selectedMeetingInviteCount(): number {
    return this.normalizeSelectedEmployeeCodes(this.meetingForm.controls.attendeeEmployeeCodes.value).length;
  }

  protected isMeetingInviteSelected(employeeCode?: string): boolean {
    if (!employeeCode) return false;
    return this.normalizeSelectedEmployeeCodes(this.meetingForm.controls.attendeeEmployeeCodes.value).includes(employeeCode);
  }

  protected toggleMeetingInvite(employeeCode: string | undefined, checked: boolean): void {
    if (!employeeCode) return;
    const current = new Set(this.normalizeSelectedEmployeeCodes(this.meetingForm.controls.attendeeEmployeeCodes.value));
    if (checked) {
      current.add(employeeCode);
    } else {
      current.delete(employeeCode);
    }
    this.meetingForm.controls.attendeeEmployeeCodes.setValue(Array.from(current));
    this.meetingForm.controls.attendeeEmployeeCodes.markAsDirty();
  }

  protected invitedPeopleLabel(meeting: MeetingRow): string {
    const attendees = meeting.attendees || [];
    if (!attendees.length) return 'No employee attendees';
    return attendees
      .map((item) => item.employeeId?.displayName || item.employeeId?.employeeCode)
      .filter(Boolean)
      .join(', ');
  }

  protected openMeetingRoom(meetingLink?: string): void {
    if (!meetingLink) return;
    const path = this.routePathFromUrl(meetingLink);
    void this.router.navigateByUrl(path);
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

  protected payrollNetTotal(): number {
    return this.payslips().reduce((sum, slip) => sum + Number(slip.netSalary || 0), 0);
  }

  protected userEmail(): string {
    return this.auth.currentUser()?.email || 'hr@opasbizz.local';
  }

  private assetUrl(value?: string): string {
    if (!value) return '';
    if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('/brand/')) return value;
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

  protected hrDisplayName(): string {
    return this.currentUser()?.name || this.currentUser()?.email || 'HR Manager';
  }

  protected hrProfileSubtitle(): string {
    const profile = this.currentUser()?.profile;
    return profile?.designation || profile?.department || 'People operations';
  }

  protected hrProfileImage(): string {
    const preview = this.profileImagePreview();
    if (preview) return preview;
    const user = this.currentUser() as any;
    const image = user?.profileImage || user?.profile?.avatarUrl;
    return image ? this.assetUrl(image) : this.companyLogoUrl();
  }

  private syncCurrentUser(user: User): void {
    const current = this.auth.currentUser() as any;
    const updated = { ...current, ...user };
    this.auth.currentUser.set(updated);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(updated));
    }
  }

  protected employeeRoleLabel(employee: EmployeeRow): string {
    const labels: Record<string, string> = {
      department_head: 'Department Head',
      team_leader: 'Team Leader',
      employee: 'Employee',
      custom: employee.customRoleTitle || 'Custom Role'
    };
    return employee.customRoleTitle || labels[employee.organizationRole || 'employee'] || 'Employee';
  }

  protected todayIso(): string {
    return new Date().toISOString();
  }

  protected goBack(): void {
    window.history.length > 1 ? window.history.back() : void this.router.navigate(['/hr-dashboard']);
  }

  protected logout(): void {
    this.auth.logout();
  }

  private historyQuery(): Record<string, string | number> {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: this.toDateInput(from), to: this.toDateInput(to), limit: 31 };
  }

  private refreshDashboardOnly(): void {
    this.api
      .get<HrDashboardData>('/hr/dashboard')
      .pipe(catchError(() => of(this.dashboard())))
      .subscribe((dashboard) => {
        if (!dashboard) return;
        this.dashboard.set(dashboard);
        this.applyCompanyTheme(dashboard.company?.settings?.theme || (this.currentCompany() as any)?.settings?.theme);
      });
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
  private employeeSectionControls(tab: EmployeeFormTab): string[] {
    const controls: Record<EmployeeFormTab, string[]> = {
      personal: ['fullName', 'employeeCode', 'gender', 'dateOfBirth', 'bloodGroup', 'maritalStatus', 'nationality'],
      contact: ['officialEmail', 'personalEmail', 'mobile', 'alternateMobile', 'emergencyContactName', 'emergencyContactMobile', 'emergencyContactRelation', 'currentAddressLine1', 'currentCity', 'currentState', 'currentPincode', 'sameAsCurrentAddress', 'permanentAddressLine1', 'permanentCity', 'permanentState', 'permanentPincode'],
      employment: ['departmentCode', 'designationCode', 'branchCode', 'joiningDate', 'probationMonths', 'employmentType', 'reportingManagerEmployeeCode', 'organizationRole', 'customRoleTitle', 'workMode', 'attendanceAllowedDevices', 'employeeStatus'],
      bank: ['bankName', 'branchName', 'accountHolderName', 'accountNumber', 'ifscCode', 'panNumber', 'aadhaarNumber', 'uanNumber', 'pfNumber', 'esiNumber', 'professionalTaxNumber', 'upiId', 'paymentMode', 'isSalaryAccount'],
      leave: ['casualLeaveBalance', 'sickLeaveBalance', 'earnedLeaveBalance', 'leaveWithoutPay', 'password', 'createLoginAccount'],
      documents: []
    };
    return controls[tab];
  }

  private cleanEmployeePayload(payload: Record<string, unknown>): Record<string, unknown> {
    const cleaned: Record<string, unknown> = { ...payload };
    const optionalCodeFields = [
      'branchCode',
      'departmentCode',
      'designationCode',
      'reportingManagerEmployeeCode'
    ] as const;

    for (const field of optionalCodeFields) {
      if (typeof cleaned[field] === 'string') {
        const value = cleaned[field].trim();
        if (value) {
          cleaned[field] = value;
        } else {
          delete cleaned[field];
        }
      }
    }

    return cleaned;
  }

  private loadFirstCompanyContext(): void {
    this.api
      .get<{ companies?: CompanyRow[] }>('/companies', { limit: 1 })
      .pipe(catchError(() => of({ companies: [] })))
      .subscribe((data) => {
        const firstCompany = data.companies?.[0];
        if (!firstCompany?._id) {
          this.message.set('No registered company found for HR dashboard.');
          return;
        }
        this.selectedCompanyId.set(firstCompany._id);
        this.applyCompanyTheme((this.currentCompany() as any)?.settings?.theme);
        this.refreshAll();
      });
  }

  private toDateInput(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private toDateTimeInput(date: Date): string {
    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  }

  private generateRecordCode(prefix: string): string {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
  }

  private meetingRoomUrl(code: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/meeting-room/${code}`;
  }

  private normalizeSelectedEmployeeCodes(value: unknown): string[] {
    const rows = Array.isArray(value) ? value : value ? [value] : [];
    return Array.from(new Set(rows.map((item) => String(item || '').trim()).filter(Boolean)));
  }

  private prefillEmployeeForm(employee: EmployeeRow, bank?: EmployeeBankDetails | null, statutory?: EmployeeStatutoryDetails | null): void {
    const row = employee as EmployeeRow & {
      gender?: string;
      dateOfBirth?: string;
      bloodGroup?: string;
      maritalStatus?: string;
      nationality?: string;
      personalEmail?: string;
      alternateMobile?: string;
      currentAddress?: { addressLine1?: string; city?: string; state?: string; pincode?: string };
      permanentAddress?: { addressLine1?: string; city?: string; state?: string; pincode?: string };
      emergencyContact?: { name?: string; mobile?: string; relation?: string };
      employmentType?: string;
      probationEndDate?: string;
    };
    const fullName = row.displayName || [row.firstName, row.lastName].filter(Boolean).join(' ') || row.name || '';

    this.employeeForm.patchValue({
      fullName,
      employeeCode: row.employeeCode || '',
      firstName: row.firstName || '',
      lastName: row.lastName || '',
      gender: row.gender || 'prefer_not_to_say',
      dateOfBirth: row.dateOfBirth ? this.toDateInput(new Date(row.dateOfBirth)) : '',
      bloodGroup: row.bloodGroup || '',
      maritalStatus: row.maritalStatus || '',
      nationality: row.nationality || 'Indian',
      officialEmail: row.officialEmail || row.email || '',
      personalEmail: row.personalEmail || '',
      mobile: row.mobile || '',
      alternateMobile: row.alternateMobile || '',
      emergencyContactName: row.emergencyContact?.name || '',
      emergencyContactMobile: row.emergencyContact?.mobile || '',
      emergencyContactRelation: row.emergencyContact?.relation || '',
      currentAddressLine1: row.currentAddress?.addressLine1 || '',
      currentCity: row.currentAddress?.city || '',
      currentState: row.currentAddress?.state || '',
      currentPincode: row.currentAddress?.pincode || '',
      sameAsCurrentAddress: false,
      permanentAddressLine1: row.permanentAddress?.addressLine1 || '',
      permanentCity: row.permanentAddress?.city || '',
      permanentState: row.permanentAddress?.state || '',
      permanentPincode: row.permanentAddress?.pincode || '',
      departmentCode: row.departmentId?.departmentCode || '',
      designationCode: row.designationId?.designationCode || '',
      reportingManagerEmployeeCode: row.reportingManagerId?.employeeCode || '',
      joiningDate: row.joiningDate ? this.toDateInput(new Date(row.joiningDate)) : new Date().toISOString().slice(0, 10),
      employmentType: row.employmentType || 'permanent',
      organizationRole: row.organizationRole || 'employee',
      customRoleTitle: row.customRoleTitle || '',
      workMode: row.workMode || 'office',
      attendanceAllowedDevices: this.normalizeAttendanceDevices(row.attendanceAllowedDevices),
      employeeStatus: row.employeeStatus || row.status || 'active',
      bankName: bank?.bankName || '',
      branchName: bank?.branchName || '',
      accountHolderName: bank?.accountHolderName || '',
      accountNumber: bank?.accountNumber || '',
      ifscCode: bank?.ifscCode || '',
      upiId: bank?.upiId || '',
      paymentMode: bank?.paymentMode || 'bank_transfer',
      isSalaryAccount: bank?.isSalaryAccount !== false,
      panNumber: statutory?.panNumber || '',
      aadhaarNumber: statutory?.aadhaarNumber || '',
      uanNumber: statutory?.uanNumber || '',
      pfNumber: statutory?.pfNumber || '',
      esiNumber: statutory?.esiNumber || '',
      professionalTaxNumber: statutory?.professionalTaxNumber || '',
      password: '',
      createLoginAccount: false
    });
  }
  private resetEmployeeForm(): void {
    this.employeeForm.reset({
      fullName: '',
      employeeCode: '',
      firstName: '',
      lastName: '',
      gender: 'prefer_not_to_say',
      dateOfBirth: '',
      bloodGroup: '',
      maritalStatus: '',
      nationality: 'Indian',
      officialEmail: '',
      personalEmail: '',
      mobile: '',
      alternateMobile: '',
      emergencyContactName: '',
      emergencyContactMobile: '',
      emergencyContactRelation: '',
      currentAddressLine1: '',
      currentCity: '',
      currentState: '',
      currentPincode: '',
      sameAsCurrentAddress: false,
      permanentAddressLine1: '',
      permanentCity: '',
      permanentState: '',
      permanentPincode: '',
      departmentCode: '',
      designationCode: '',
      branchCode: '',
      reportingManagerEmployeeCode: '',
      joiningDate: new Date().toISOString().slice(0, 10),
      probationMonths: 6,
      employmentType: 'permanent',
      organizationRole: 'employee',
      customRoleTitle: '',
      workMode: 'office',
      attendanceAllowedDevices: ['desktop'],
      employeeStatus: 'active',
      bankName: '',
      branchName: '',
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      upiId: '',
      panNumber: '',
      aadhaarNumber: '',
      uanNumber: '',
      pfNumber: '',
      esiNumber: '',
      professionalTaxNumber: '',
      casualLeaveBalance: 7,
      sickLeaveBalance: 10,
      earnedLeaveBalance: 0,
      leaveWithoutPay: 0,
      paymentMode: 'bank_transfer',
      isSalaryAccount: true,
      password: '',
      createLoginAccount: false
    });
    this.isEmployeePasswordVisible.set(false);
    this.employeeFormTab.set('personal');
    this.employeeCodeCheckStatus.set('idle');
    this.employeeCodeMessage.set('');
  }

  private isHrFeature(value: string | null): value is HrFeature {
    return Boolean(
      value &&
      [...this.mainMenu, ...this.managementMenu, ...this.reportsMenu, ...this.settingsMenu].some((item) => item.id === value) || ['departments', 'crm-leads', 'crm-deals', 'crm-tasks', 'account-invoices', 'account-payments', 'account-expenses', 'add-employee', 'employee-profile', 'leave-requests', 'leave-calendar', 'leave-balance', 'leave-types', 'salary-structure', 'payslip-generation', 'payroll-processing', 'payroll-reports', 'company-events', 'announcements', 'attendance-reports', 'logistics-employees', 'logistics-daily-work', 'logistics-monthly-performance', 'logistics-shift-roster', 'logistics-certifications', 'logistics-vehicle-assignment', 'logistics-incidents'].includes(value || '')
    );
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




















































