import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { apiUrl } from '../../core/config/api.config';
import { Company } from '../../core/models/company.model';
import { ApiService } from '../../core/services/api.service';

import {
  AccountsDashboardComponent
} from '../accounts/pages/dashboard/accounts-dashboard.component';

import {
  ChartOfAccountsComponent
} from '../accounts/pages/chart-of-accounts/chart-of-accounts.component';

interface UserRow {
  _id?: string;
  name?: string;
  email?: string;
  mobile?: string;
  role?: string;
  department?: string;
  designation?: string;
  status?: string;
}

interface DepartmentRow {
  _id?: string;
  departmentName?: string;
  departmentCode?: string;
  featureKey?: string;
  isCustom?: boolean;
}

interface DesignationRow {
  _id?: string;
  designationName?: string;
  designationCode?: string;
  departmentId?: DepartmentRow | string;
  level?: number;
  isCustom?: boolean;
}

interface RoleRow {
  _id?: string;
  name?: string;
  level?: number;
  permissions?: string[];
}

interface OrgNode {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  designation?: string;
  children?: OrgNode[];
}

interface NotificationRow {
  _id?: string;
  title?: string;
  message?: string;
  createdAt?: string;
  isRead?: boolean;
}

interface CompanyProfile {
  _id?: string;
  companyName?: string;
  companyCode?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  status?: string;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  subscriptionEndsAt?: string;
  maxEmployees?: number;
  hrAccountLimit?: number;
  logo?: string;
  settings?: {
    smtp?: {
      host?: string;
      port?: string;
      username?: string;
      password?: string;
      fromEmail?: string;
      secure?: boolean;
      isActive?: boolean;
    };
    theme?: {
      primaryColor?: string;
      accentColor?: string;
      sidebarColor?: string;
    };
  };
}

interface PeriodSummary {
  totalCount?: number;
  todayCount?: number;
  monthCount?: number;
  totalAmount?: number;
  todayAmount?: number;
  monthAmount?: number;
  statusCounts?: Record<string, number>;
  employeeCounts?: {
    employeeCode?: string;
    employeeName?: string;
    total?: number;
    today?: number;
    month?: number;
    amount?: number;
  }[];
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

interface BillingPlan {
  _id?: string;
  code: 'basic' | 'standard' | 'business' | string;
  name: string;
  description?: string;
  priceInr: number;
  amountInr?: number;
  discountInr?: number;
  payableInr?: number;
  durationMonths: number;
  employeeLimit: number;
  hrAccountLimit: number;
  features?: string[];
  isActive?: boolean;
  activeOffer?: PlanOffer | null;
}

interface PlanOffer {
  _id?: string;
  title?: string;
  code?: string;
  planCode?: string;
  discountType?: 'percent' | 'flat' | string;
  discountValue?: number;
  isActive?: boolean;
}

interface SubscriptionPayment {
  _id?: string;
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
  changeType?: string;
}

interface BillingUsage {
  employeeCount?: number;
  hrCount?: number;
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
  attendees?: Array<{
    employeeId?: {
      displayName?: string;
      employeeCode?: string;
    };
    status?: string;
  }>;
}

interface MessageRow {
  _id?: string;
  subject?: string;
  body?: string;
  status?: string;
  createdAt?: string;
  senderUserId?: {
    _id?: string;
    name?: string;
    email?: string;
    role?: string;
  };
  recipientUserId?: {
    _id?: string;
    name?: string;
    email?: string;
    role?: string;
  };
  parentMessageId?: {
    _id?: string;
    subject?: string;
  } | string | null;
}

declare global {
  interface Window {
    Razorpay?: new (
      options: Record<string, unknown>
    ) => {
      open: () => void;
    };
  }
}

@Component({
  selector: 'app-company-admin-dashboard',

  imports: [
    CommonModule,
    ReactiveFormsModule,
    AccountsDashboardComponent,
    ChartOfAccountsComponent
  ],

  templateUrl:
    './company-admin-dashboard.component.html',

  styleUrls: [
    '../role-dashboard.scss',
    './company-admin-dashboard.component.scss'
  ]
})
export class CompanyAdminDashboardComponent {

  @ViewChild('profileCropImage')
  private profileCropImage?: ElementRef<HTMLImageElement>;

  private readonly api =
    inject(ApiService);

  private readonly fb =
    inject(FormBuilder);

  private readonly auth =
    inject(AuthService);

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);


  protected readonly hrUsers =
    signal<UserRow[]>([]);

  protected readonly departments =
    signal<DepartmentRow[]>([]);

  protected readonly designations =
    signal<DesignationRow[]>([]);

  protected readonly leavePolicies =
    signal<any[]>([]);

  protected readonly attendancePolicies =
    signal<any[]>([]);

  protected readonly holidays =
    signal<HolidayRow[]>([]);

  protected readonly events =
    signal<EventRow[]>([]);

  protected readonly meetings =
    signal<MeetingRow[]>([]);

  protected readonly roles =
    signal<RoleRow[]>([]);

  protected readonly orgTree =
    signal<OrgNode[]>([]);

  protected readonly companyUsers =
    signal<UserRow[]>([]);

  protected readonly companyProfile =
    signal<CompanyProfile | null>(null);

  protected readonly billingPlans =
    signal<BillingPlan[]>([]);

  protected readonly billingOffers =
    signal<PlanOffer[]>([]);

  protected readonly billingPayments =
    signal<SubscriptionPayment[]>([]);

  protected readonly billingUsage =
    signal<BillingUsage>({});

  protected readonly billingMessage =
    signal('');

  protected readonly isWfhPermissionSaving =
    signal(false);

  protected readonly isBillingLoading =
    signal(false);

  protected readonly isCheckoutLoading =
    signal(false);

  protected readonly notifications =
    signal<NotificationRow[]>([]);

  protected readonly logisticsMonitor =
    signal<any | null>(null);

  protected readonly logisticsShipments =
    signal<any[]>([]);

  protected readonly logisticsDocuments =
    signal<any[]>([]);

  protected readonly logisticsTransporters =
    signal<any[]>([]);

  protected readonly logisticsInvoices =
    signal<any[]>([]);

  protected readonly logisticsVendorPayments =
    signal<any[]>([]);

  protected readonly logisticsChaRows =
    signal<any[]>([]);

  protected readonly logisticsWarehouseRows =
    signal<any[]>([]);

  protected readonly logisticsCustomers =
    signal<any[]>([]);

  protected readonly logisticsVendors =
    signal<any[]>([]);

  protected readonly logisticsProductsServices =
    signal<any[]>([]);

  protected readonly isLogisticsMonitorLoading =
    signal(false);

  protected readonly logisticsMonitorError =
    signal('');

  protected readonly logisticsFromDate =
    signal('');

  protected readonly logisticsToDate =
    signal('');

  protected readonly salesFromDate =
    signal('');

  protected readonly salesToDate =
    signal('');

  protected readonly messages =
    signal<MessageRow[]>([]);

  protected readonly replyDrafts =
    signal<Record<string, string>>({});

  protected readonly unreadCount =
    signal(0);

  protected readonly isNotificationPanelOpen =
    signal(false);

  protected readonly isSaving =
    signal(false);

  protected readonly isThemeSaving =
    signal(false);

  protected readonly isHrPasswordVisible =
    signal(false);

  protected readonly isCurrentPasswordVisible =
    signal(false);

  protected readonly isNewPasswordVisible =
    signal(false);

  protected readonly isConfirmPasswordVisible =
    signal(false);

  protected readonly isStatusSaving =
    signal(false);

  protected readonly isDepartmentSaving =
    signal(false);

  protected readonly isUserSaving =
    signal(false);

  protected readonly isProfileSaving =
    signal(false);

  protected readonly isPasswordSaving =
    signal(false);

  protected readonly isMessageSending =
    signal(false);

  protected readonly isNotificationSending =
    signal(false);

  protected readonly isAnnouncementSaving =
    signal(false);

  protected readonly isHolidaySaving =
    signal(false);

  protected readonly isEventSaving =
    signal(false);

  protected readonly isMeetingSaving =
    signal(false);

  protected readonly editingHolidayId =
    signal<string | null>(null);

  protected readonly profileImagePreview =
    signal('');

  protected readonly cropImageSource =
    signal('');

  protected readonly cropZoom =
    signal(1);

  protected readonly cropOffsetX =
    signal(0);

  protected readonly cropOffsetY =
    signal(0);

  protected readonly cropImageTransform =
    computed(
      () =>
        `translate(${this.cropOffsetX()}%, ${this.cropOffsetY()}%) scale(${this.cropZoom()})`
    );

  protected readonly isCropperOpen =
    signal(false);

  protected readonly profileMessage =
    signal('');

  protected readonly passwordMessage =
    signal('');

  private selectedProfileImage:
    File |
    null =
    null;

  private pendingProfileImageName =
    'profile-image.png';

  private isCropDragging =
    false;

  private cropDragStart = {
    x: 0,
    y: 0,
    offsetX: 0,
    offsetY: 0
  };

  protected readonly message =
    signal('');

  protected readonly selectedCompanyId =
    signal<string | null>(null);

  protected readonly activeSection =
    signal('overview');

  protected readonly user =
    computed(
      () =>
        this.auth.currentUser()
    );

  protected readonly userName =
    computed(
      () =>
        this.user()?.name ||
        this.user()?.email ||
        'Company Admin'
    );

  protected readonly userEmail =
    computed(
      () =>
        this.user()?.email ||
        ''
    );

  protected readonly announcements =
    computed(
      () =>
        this.events()
          .filter(
            (
              event
            ) =>
              event.eventType ===
              'announcement'
          )
    );

  protected readonly initials =
    computed(
      () =>
        this.userName()
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map(
            (
              part
            ) =>
              part
                .charAt(0)
                .toUpperCase()
          )
          .join('')
    );


  /* ============================================================
     SIDEBAR MENU
  ============================================================ */

  protected readonly menuGroups = [

    {
      title: 'Dashboard',

      items: [
        {
          id: 'overview',
          label: 'Overview'
        }
      ]
    },


    {
      title: 'Logistics',

      items: [
        {
          id: 'logistics',
          label: 'Logistics Overview'
        },

        {
          id: 'logistics-air-cargo',
          label: 'Air Cargo'
        },

        {
          id: 'logistics-sea-freight',
          label: 'Sea Freight'
        },

        {
          id: 'logistics-cha',
          label: 'CHA'
        },

        {
          id: 'logistics-transporters',
          label: 'Transporters'
        },

        {
          id: 'logistics-warehouse',
          label: 'Warehouse'
        },

        {
          id: 'logistics-tracking',
          label: 'Tracking'
        },

        {
          id: 'logistics-documents',
          label: 'Documents'
        },

        {
          id: 'logistics-invoice',
          label: 'Invoice'
        },

        {
          id: 'logistics-vendor-payments',
          label: 'Vendor Payments'
        },

        {
          id: 'logistics-customers',
          label: 'Customers'
        },

        {
          id: 'logistics-vendors',
          label: 'Vendors'
        },

        {
          id: 'logistics-products-services',
          label: 'Products / Services'
        },

        {
          id: 'logistics-sales-report',
          label: 'Sales Report'
        },

        {
          id: 'logistics-outstanding-report',
          label: 'Outstanding Report'
        },

        {
          id: 'logistics-gst-report',
          label: 'GST Report'
        },

        {
          id: 'logistics-payments-report',
          label: 'Payments Report'
        }
      ]
    },


    {
      title: 'CRM',

      items: [
        {
          id: 'leads',
          label: 'Leads'
        },

        {
          id: 'contacts',
          label: 'Contacts'
        },

        {
          id: 'accounts',
          label: 'CRM Accounts'
        },

        {
          id: 'deals',
          label: 'Deals / Pipeline'
        },

        {
          id: 'tasks',
          label: 'Tasks / Follow-ups'
        },

        {
          id: 'quotations',
          label: 'Quotations'
        },

        {
          id: 'invoices',
          label: 'Invoices'
        },

        {
          id: 'payments',
          label: 'Payments'
        },

        {
          id: 'expenses',
          label: 'Expenses'
        }
      ]
    },


    /* ============================================================
       ACCOUNTS
    ============================================================ */

    {
      title: 'Accounts',

      items: [
        {
          id: 'accounts-dashboard',
          label: 'Accounts Dashboard'
        },

        {
          id: 'accounts-chart-of-accounts',
          label: 'Chart of Accounts'
        },

        {
          id: 'accounts-customers',
          label: 'Customers'
        },

        {
          id: 'accounts-vendors',
          label: 'Vendors'
        },

        {
          id: 'accounts-sales-invoices',
          label: 'Sales Invoices'
        },

        {
          id: 'accounts-receipts',
          label: 'Receipts'
        },

        {
          id: 'accounts-credit-notes',
          label: 'Credit Notes'
        },

        {
          id: 'accounts-purchase-bills',
          label: 'Purchase Bills'
        },

        {
          id: 'accounts-payments',
          label: 'Payments'
        },

        {
          id: 'accounts-debit-notes',
          label: 'Debit Notes'
        },

        {
          id: 'accounts-expenses',
          label: 'Expenses'
        },

        {
          id: 'accounts-journal',
          label: 'Journal Entries'
        },

        {
          id: 'accounts-general-ledger',
          label: 'General Ledger'
        },

        {
          id: 'accounts-customer-ledger',
          label: 'Customer Ledger'
        },

        {
          id: 'accounts-vendor-ledger',
          label: 'Vendor Ledger'
        },

        {
          id: 'accounts-cash-bank',
          label: 'Cash & Bank'
        },

        {
          id: 'accounts-tax',
          label: 'Tax / GST'
        },

        {
          id: 'accounts-financial-reports',
          label: 'Financial Reports'
        },

        {
          id: 'accounts-settings',
          label: 'Accounts Settings'
        }
      ]
    },


    {
      title: 'HRM',

      items: [
        {
          id: 'employees',
          label: 'Employees'
        },

        {
          id: 'recruitment',
          label: 'Recruitment'
        },

        {
          id: 'attendance',
          label: 'Attendance'
        },

        {
          id: 'leave',
          label: 'Leave Management'
        },

        {
          id: 'payroll',
          label: 'Payroll'
        },

        {
          id: 'departments',
          label: 'Departments & Designations'
        }
      ]
    },


    {
      title: 'Reports',

      items: [
        {
          id: 'hr-reports',
          label: 'HR Reports'
        },

        {
          id: 'crm-reports',
          label: 'CRM Reports'
        },

        {
          id: 'performance',
          label: 'Employee Performance'
        },

        {
          id: 'exports',
          label: 'Export PDF/Excel'
        }
      ]
    },


    {
      title: 'Communication',

      items: [
        {
          id: 'announcements',
          label: 'Announcements'
        },

        {
          id: 'messages',
          label: 'Internal Messaging'
        },

        {
          id: 'notifications',
          label: 'Notifications'
        }
      ]
    },


    {
      title: 'Events & Calendar',

      items: [
        {
          id: 'meetings',
          label: 'Meetings'
        },

        {
          id: 'events',
          label: 'Company Events'
        },

        {
          id: 'holidays',
          label: 'Holidays Calendar'
        }
      ]
    },


    {
      title: 'Company Settings',

      items: [
        {
          id: 'company-profile',
          label: 'Company Profile'
        },

        {
          id: 'settings-departments',
          label: 'Departments Setup'
        },

        {
          id: 'roles',
          label: 'Roles & Permissions'
        },

        {
          id: 'leave-policy',
          label: 'Leave Policy'
        },

        {
          id: 'attendance-rules',
          label: 'Attendance Rules'
        },

        {
          id: 'theme',
          label: 'Theme Settings'
        },

        {
          id: 'smtp',
          label: 'Email/SMTP Settings'
        }
      ]
    },


    {
      title: 'User Management',

      items: [
        {
          id: 'all-users',
          label: 'All Users'
        },

        {
          id: 'add-user',
          label: 'Add / Invite User'
        },

        {
          id: 'blocked-users',
          label: 'Blocked/Inactive Users'
        }
      ]
    },


    {
      title: 'Billing & Subscription',

      items: [
        {
          id: 'current-plan',
          label: 'Current Plan Details'
        },

        {
          id: 'upgrade-plan',
          label: 'Upgrade/Downgrade Plan'
        },

        {
          id: 'billing-history',
          label: 'Payment History'
        }
      ]
    },


    {
      title: 'My Profile',

      items: [
        {
          id: 'profile',
          label: 'Profile Settings'
        },

        {
          id: 'change-password',
          label: 'Change Password'
        }
      ]
    }
  ];


  protected readonly hrForm =
    this.fb.nonNullable.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      email: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ],

      mobile: [''],

      department: [
        'Human Resources'
      ],

      designation: [
        'HR Manager'
      ],

      password: [
        'Hr@12345',
        [
          Validators.required,
          Validators.minLength(8)
        ]
      ]
    });


  protected readonly themeForm =
    this.fb.nonNullable.group({
      primaryColor: [
        '#1A2942',
        [
          Validators.required
        ]
      ],

      accentColor: [
        '#243B55',
        [
          Validators.required
        ]
      ],

      sidebarColor: [
        '#141E30',
        [
          Validators.required
        ]
      ]
    });


  protected readonly departmentForm =
    this.fb.nonNullable.group({
      departmentName: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      departmentCode: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      featureKey: [
        'none'
      ],

      description: [
        ''
      ]
    });


  protected readonly designationForm =
    this.fb.nonNullable.group({
      designationName: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      designationCode: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      departmentCode: [
        ''
      ],

      level: [
        1
      ],

      description: [
        ''
      ]
    });


  protected readonly leavePolicyForm =
    this.fb.nonNullable.group({
      policyName: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      policyCode: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      description: [
        ''
      ],

      isDefault: [
        false
      ],

      isActive: [
        true
      ]
    });


  protected readonly attendancePolicyForm =
    this.fb.nonNullable.group({
      policyName: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      policyCode: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      graceMinutes: [
        10
      ],

      maxLateAllowedPerMonth: [
        3
      ],

      allowRegularization: [
        true
      ],

      isDefault: [
        false
      ]
    });


  protected readonly smtpForm =
    this.fb.nonNullable.group({
      host: [
        ''
      ],

      port: [
        '587'
      ],

      username: [
        ''
      ],

      password: [
        ''
      ],

      fromEmail: [
        '',
        [
          Validators.email
        ]
      ],

      secure: [
        false
      ],

      isActive: [
        false
      ]
    });


  protected readonly profileForm =
    this.fb.nonNullable.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      mobile: [
        ''
      ],

      department: [
        ''
      ],

      designation: [
        ''
      ],

      companyName: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      companyEmail: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ],

      companyPhone: [
        ''
      ],

      industry: [
        ''
      ]
    });


  protected readonly passwordForm =
    this.fb.nonNullable.group({
      currentPassword: [
        '',
        [
          Validators.required
        ]
      ],

      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8)
        ]
      ],

      confirmPassword: [
        '',
        [
          Validators.required
        ]
      ]
    });


  protected readonly announcementForm =
    this.fb.nonNullable.group({
      eventTitle: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      status: [
        'published'
      ],

      startDateTime: [
        this.toDateTimeInput(
          new Date()
        ),
        [
          Validators.required
        ]
      ],

      endDateTime: [
        this.toDateTimeInput(
          new Date(
            Date.now() +
            60 *
            60 *
            1000
          )
        ),
        [
          Validators.required
        ]
      ],

      description: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      notifyEmployees: [
        true
      ]
    });


  protected readonly messageForm =
    this.fb.nonNullable.group({
      recipientEmployeeCode: [
        '',
        [
          Validators.required
        ]
      ],

      body: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ]
    });


  protected readonly notificationForm =
    this.fb.nonNullable.group({
      recipientEmployeeCode: [
        '',
        [
          Validators.required
        ]
      ],

      title: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      message: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      type: [
        'system'
      ],

      priority: [
        'normal'
      ],

      actionUrl: [
        ''
      ]
    });


  protected readonly eventForm =
    this.fb.nonNullable.group({
      eventTitle: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      eventType: [
        'company_event'
      ],

      status: [
        'published'
      ],

      startDateTime: [
        this.toDateTimeInput(
          new Date()
        ),
        [
          Validators.required
        ]
      ],

      endDateTime: [
        this.toDateTimeInput(
          new Date(
            Date.now() +
            60 *
            60 *
            1000
          )
        ),
        [
          Validators.required
        ]
      ],

      venue: [
        ''
      ],

      meetingLink: [
        ''
      ],

      description: [
        ''
      ],

      notifyEmployees: [
        true
      ]
    });


  protected readonly meetingForm =
    this.fb.nonNullable.group({
      meetingTitle: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      meetingMode: [
        'online'
      ],

      status: [
        'scheduled'
      ],

      startDateTime: [
        this.toDateTimeInput(
          new Date()
        ),
        [
          Validators.required
        ]
      ],

      endDateTime: [
        this.toDateTimeInput(
          new Date(
            Date.now() +
            30 *
            60 *
            1000
          )
        ),
        [
          Validators.required
        ]
      ],

      venue: [
        ''
      ],

      attendeeEmployeeCodes: [
        [] as string[]
      ],

      inviteCompanyAdmins: [
        true
      ],

      agendaText: [
        ''
      ],

      notifyAttendees: [
        true
      ]
    });


  protected readonly holidayForm =
    this.fb.nonNullable.group({
      holidayName: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      date: [
        new Date()
          .toISOString()
          .slice(
            0,
            10
          ),
        [
          Validators.required
        ]
      ],

      type: [
        'company'
      ],

      description: [
        ''
      ],

      holidayColor: [
        '#2563eb',
        [
          Validators.required
        ]
      ],

      isPaid: [
        true
      ],

      isActive: [
        true
      ]
    });


  protected readonly crmLeads =
    signal<
      (
        any &
        AssignmentMeta
      )[]
    >([]);

  protected readonly crmDeals =
    signal<
      (
        any &
        AssignmentMeta
      )[]
    >([]);

  protected readonly crmTasks =
    signal<
      (
        any &
        AssignmentMeta
      )[]
    >([]);

  protected readonly crmQuotations =
    signal<
      (
        any &
        AssignmentMeta
      )[]
    >([]);

  protected readonly crmContacts =
    signal<any[]>([]);

  protected readonly crmEmployeeAccounts =
    signal<any[]>([]);

  protected readonly crmLeadSummary =
    signal<PeriodSummary>({});

  protected readonly crmDealSummary =
    signal<PeriodSummary>({});

  protected readonly crmTaskSummary =
    signal<PeriodSummary>({});

  protected readonly selectedCrmEmployeeCode =
    signal('');

  protected readonly selectedCrmEmployeeName =
    signal('');

  protected readonly employeeTodayLeads =
    signal<
      (
        any &
        AssignmentMeta
      )[]
    >([]);

  protected readonly employeeMonthLeads =
    signal<
      (
        any &
        AssignmentMeta
      )[]
    >([]);

  protected readonly employeeTodayDeals =
    signal<
      (
        any &
        AssignmentMeta
      )[]
    >([]);

  protected readonly employeeMonthDeals =
    signal<
      (
        any &
        AssignmentMeta
      )[]
    >([]);

  protected readonly quotationSummary =
    signal<PeriodSummary>({});

  protected readonly accountInvoices =
    signal<
      (
        any &
        AssignmentMeta
      )[]
    >([]);

  protected readonly accountPayments =
    signal<
      (
        any &
        AssignmentMeta
      )[]
    >([]);

  protected readonly accountExpenses =
    signal<
      (
        any &
        AssignmentMeta
      )[]
    >([]);

  protected readonly invoiceSummary =
    signal<PeriodSummary>({});

  protected readonly paymentSummary =
    signal<PeriodSummary>({});

  protected readonly expenseSummary =
    signal<PeriodSummary>({});

  protected readonly employeeRows =
    signal<any[]>([]);

  protected readonly attendanceToday =
    signal<any[]>([]);

  protected readonly attendanceMonth =
    signal<any[]>([]);

  protected readonly leaveToday =
    signal<any[]>([]);

  protected readonly leaveMonth =
    signal<any[]>([]);

  protected readonly leaveBalances =
    signal<any[]>([]);

  protected readonly payrollRuns =
    signal<any[]>([]);

  protected readonly payslips =
    signal<any[]>([]);

  protected readonly recruitmentJobs =
    signal<any[]>([]);

  protected readonly recruitmentCandidates =
    signal<any[]>([]);

  protected readonly recruitmentInterviews =
    signal<any[]>([]);

  protected readonly recruitmentOffers =
    signal<any[]>([]);


  protected readonly leadForm =
    this.fb.nonNullable.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      company: [
        ''
      ],

      phone: [
        ''
      ],

      email: [
        '',
        [
          Validators.email
        ]
      ],

      source: [
        'Website'
      ],

      status: [
        'New'
      ],

      notes: [
        ''
      ]
    });


  protected readonly dealForm =
    this.fb.nonNullable.group({
      leadId: [
        ''
      ],

      clientName: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      value: [
        0,
        [
          Validators.min(0)
        ]
      ],

      stage: [
        'Proposal'
      ],

      expectedClose: [
        new Date()
          .toISOString()
          .slice(
            0,
            10
          )
      ],

      notes: [
        ''
      ]
    });


  protected readonly taskForm =
    this.fb.nonNullable.group({
      title: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      relatedTo: [
        ''
      ],

      dueDate: [
        new Date()
          .toISOString()
          .slice(
            0,
            10
          )
      ],

      priority: [
        'Medium'
      ],

      status: [
        'Open'
      ]
    });


  protected readonly quotationForm =
    this.fb.nonNullable.group({
      quotationNumber: [
        `QT-${Date.now()}`,
        [
          Validators.required
        ]
      ],

      clientName: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      amount: [
        0,
        [
          Validators.min(0)
        ]
      ],

      validUntil: [
        new Date()
          .toISOString()
          .slice(
            0,
            10
          )
      ],

      status: [
        'Draft'
      ],

      notes: [
        ''
      ]
    });


  protected readonly userForm =
    this.fb.nonNullable.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      email: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ],

      mobile: [
        ''
      ],

      roleName: [
        'hr',
        [
          Validators.required
        ]
      ],

      departmentId: [
        ''
      ],

      designationCode: [
        ''
      ],

      designation: [
        ''
      ],

      reportingTo: [
        ''
      ],

      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8)
        ]
      ]
    });


  constructor() {

    this.applyTheme(
      this.platformDefaultTheme()
    );

    this.selectedCompanyId.set(
      this.route
        .snapshot
        .queryParamMap
        .get(
          'companyId'
        )
    );

    this.loadNotifications();

    this.patchProfileFormFromUser();


    if (
      this.auth.hasRole(
        'super_admin'
      ) &&
      !this.selectedCompanyId()
    ) {

      this.loadFirstCompanyContext();

      return;
    }


    this.loadCompanyProfile();

    this.loadHrUsers();

    this.loadEnterpriseData();

    this.loadNotifications(
      true
    );

    this.loadCrm();

    this.loadAccounting();

    this.loadHrm();

    this.loadCalendar();

    this.loadMessages();

    this.loadBilling();
  }


  protected onProfileImageSelected(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0];

    input.value =
      '';


    if (
      !file
    ) {

      return;
    }


    if (
      file.size >
      2 *
      1024 *
      1024
    ) {

      this.profileMessage.set(
        'Profile image must be 2 MB or smaller.'
      );

      return;
    }


    this.pendingProfileImageName =
      file.name ||
      'profile-image.png';


    const reader =
      new FileReader();


    reader.onload =
      () => {

        this.cropImageSource.set(
          String(
            reader.result ||
            ''
          )
        );

        this.cropZoom.set(
          1
        );

        this.isCropperOpen.set(
          true
        );

        this.profileMessage.set(
          'Adjust image crop, then apply crop before saving.'
        );
      };


    reader.readAsDataURL(
      file
    );
  }


  protected startCropDrag(
    event:
      MouseEvent |
      TouchEvent
  ): void {

    event.preventDefault();


    const point =
      this.cropPointerPoint(
        event
      );


    this.isCropDragging =
      true;


    this.cropDragStart = {
      x:
        point.x,

      y:
        point.y,

      offsetX:
        this.cropOffsetX(),

      offsetY:
        this.cropOffsetY()
    };
  }


  protected moveCropDrag(
    event:
      MouseEvent |
      TouchEvent
  ): void {

    if (
      !this.isCropDragging
    ) {

      return;
    }


    event.preventDefault();


    const point =
      this.cropPointerPoint(
        event
      );


    const deltaX =
      (
        (
          point.x -
          this.cropDragStart.x
        ) /
        130
      ) *
      100;


    const deltaY =
      (
        (
          point.y -
          this.cropDragStart.y
        ) /
        130
      ) *
      100;


    this.cropOffsetX.set(
      this.clamp(
        this.cropDragStart.offsetX +
        deltaX,

        -100,

        100
      )
    );


    this.cropOffsetY.set(
      this.clamp(
        this.cropDragStart.offsetY +
        deltaY,

        -100,

        100
      )
    );
  }


  protected stopCropDrag(): void {

    this.isCropDragging =
      false;
  }


  protected zoomProfileCrop(
    event: WheelEvent
  ): void {

    event.preventDefault();


    const nextZoom =
      this.cropZoom() +
      (
        event.deltaY <
        0
          ? 0.08
          : -0.08
      );


    this.cropZoom.set(
      this.clamp(
        Number(
          nextZoom.toFixed(
            2
          )
        ),

        1,

        3
      )
    );
  }


  protected resetProfileCropPosition(): void {

    this.cropZoom.set(
      1
    );

    this.cropOffsetX.set(
      0
    );

    this.cropOffsetY.set(
      0
    );
  }


  private cropPointerPoint(
    event:
      MouseEvent |
      TouchEvent
  ): {
    x: number;
    y: number;
  } {

    const touch =
      'touches' in event
        ? event.touches[0] ||
          event.changedTouches[0]
        : null;


    return touch
      ? {
          x:
            touch.clientX,

          y:
            touch.clientY
        }
      : {
          x:
            (
              event as MouseEvent
            ).clientX,

          y:
            (
              event as MouseEvent
            ).clientY
        };
  }


  protected cancelProfileCrop(): void {

    this.cropImageSource.set(
      ''
    );

    this.cropZoom.set(
      1
    );

    this.cropOffsetX.set(
      0
    );

    this.cropOffsetY.set(
      0
    );

    this.isCropDragging =
      false;

    this.isCropperOpen.set(
      false
    );
  }


  protected applyProfileCrop(): void {

    const image =
      this.profileCropImage
        ?.nativeElement;


    if (
      !image ||
      !image.complete ||
      !image.naturalWidth ||
      !image.naturalHeight
    ) {

      this.profileMessage.set(
        'Image is still loading. Please try again.'
      );

      return;
    }


    const zoom =
      Math.max(
        1,
        Number(
          this.cropZoom() ||
          1
        )
      );


    const sourceSize =
      Math.min(
        image.naturalWidth,
        image.naturalHeight
      ) /
      zoom;


    const maxSourceX =
      image.naturalWidth -
      sourceSize;


    const maxSourceY =
      image.naturalHeight -
      sourceSize;


    const sourceX =
      this.clamp(
        (
          image.naturalWidth -
          sourceSize
        ) /
        2 -
        (
          this.cropOffsetX() /
          100
        ) *
        (
          sourceSize /
          2
        ),

        0,

        maxSourceX
      );


    const sourceY =
      this.clamp(
        (
          image.naturalHeight -
          sourceSize
        ) /
        2 -
        (
          this.cropOffsetY() /
          100
        ) *
        (
          sourceSize /
          2
        ),

        0,

        maxSourceY
      );


    const canvas =
      document.createElement(
        'canvas'
      );


    canvas.width =
      512;

    canvas.height =
      512;


    const context =
      canvas.getContext(
        '2d'
      );


    if (
      !context
    ) {

      this.profileMessage.set(
        'Unable to crop this image.'
      );

      return;
    }


    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      canvas.width,
      canvas.height
    );


    canvas.toBlob(
      (
        blob
      ) => {

        if (
          !blob
        ) {

          this.profileMessage.set(
            'Unable to prepare cropped image.'
          );

          return;
        }


        const safeName =
          this.pendingProfileImageName
            .replace(
              /\.[^.]+$/,
              ''
            ) ||
          'profile-image';


        this.selectedProfileImage =
          new File(
            [
              blob
            ],

            `${safeName}-cropped.jpg`,

            {
              type:
                'image/jpeg'
            }
          );


        this.profileImagePreview.set(
          canvas.toDataURL(
            'image/jpeg',
            0.9
          )
        );


        this.cancelProfileCrop();


        this.profileMessage.set(
          'Cropped image ready. Click Save Profile to upload.'
        );
      },

      'image/jpeg',

      0.9
    );
  }


  private clamp(
    value: number,
    min: number,
    max: number
  ): number {

    return Math.min(
      Math.max(
        value,
        min
      ),

      max
    );
  }


  protected clearProfileMessage(): void {

    this.profileMessage.set(
      ''
    );
  }


  protected clearPasswordMessage(): void {

    this.passwordMessage.set(
      ''
    );
  }


  protected saveProfile(): void {

    if (
      this.isCropperOpen()
    ) {

      this.profileMessage.set(
        'Please apply or cancel image crop before saving.'
      );

      return;
    }


    if (
      this.profileForm.invalid ||
      this.isProfileSaving()
    ) {

      this.profileForm
        .markAllAsTouched();

      this.profileMessage.set(
        'Please fill required profile details correctly.'
      );

      return;
    }


    const body =
      new FormData();


    const raw =
      this.profileForm
        .getRawValue();


    const userProfileKeys =
      new Set(
        [
          'name',
          'mobile',
          'department',
          'designation'
        ]
      );


    Object.entries(
      raw
    )
      .forEach(
        (
          [
            key,
            value
          ]
        ) => {

          if (
            !userProfileKeys
              .has(
                key
              )
          ) {

            return;
          }


          const normalizedValue =
            key ===
            'mobile'
              ? String(
                  value ||
                  ''
                )
                  .replace(
                    /[\s-]/g,
                    ''
                  )
              : String(
                  value ||
                  ''
                );


          body.append(
            key,
            normalizedValue
          );
        }
      );


    if (
      this.selectedProfileImage
    ) {

      body.append(
        'profileImage',
        this.selectedProfileImage
      );
    }


    this.isProfileSaving.set(
      true
    );

    this.profileMessage.set(
      ''
    );


    this.api
      .patch<any>(
        '/auth/profile',
        body
      )
      .pipe(
        finalize(
          () =>
            this.isProfileSaving.set(
              false
            )
        )
      )
      .subscribe({
        next:
          (
            user
          ) => {

            this.selectedProfileImage =
              null;


            const updatedUser =
              this.withSyncedCompanyProfile(
                user,
                raw
              );


            this.saveCompanyProfileFromAdminProfile(
              raw,
              updatedUser
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.profileMessage.set(
              error.error?.message ||
              'Unable to update profile.'
            )
      });
  }


  protected changePassword(): void {

    if (
      this.passwordForm.invalid ||
      this.isPasswordSaving()
    ) {

      this.passwordForm
        .markAllAsTouched();

      return;
    }


    const raw =
      this.passwordForm
        .getRawValue();


    if (
      raw.newPassword !==
      raw.confirmPassword
    ) {

      this.passwordMessage.set(
        'New password and confirm password do not match.'
      );

      return;
    }


    this.isPasswordSaving.set(
      true
    );

    this.message.set(
      ''
    );

    this.passwordMessage.set(
      ''
    );


    this.api
      .post(
        '/auth/change-password',
        raw
      )
      .pipe(
        finalize(
          () =>
            this.isPasswordSaving.set(
              false
            )
        )
      )
      .subscribe({
        next:
          () => {

            this.passwordMessage.set(
              'Password changed successfully. Please login again.'
            );


            this.passwordForm.reset({
              currentPassword:
                '',

              newPassword:
                '',

              confirmPassword:
                ''
            });


            this.auth.logout();
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.passwordMessage.set(
              error.error?.message ||
              'Unable to change password.'
            )
      });
  }


  protected togglePasswordVisibility(
    field:
      'current' |
      'new' |
      'confirm'
  ): void {

    if (
      field ===
      'current'
    ) {

      this.isCurrentPasswordVisible.update(
        (
          value
        ) =>
          !value
      );
    }


    if (
      field ===
      'new'
    ) {

      this.isNewPasswordVisible.update(
        (
          value
        ) =>
          !value
      );
    }


    if (
      field ===
      'confirm'
    ) {

      this.isConfirmPasswordVisible.update(
        (
          value
        ) =>
          !value
      );
    }
  }


  protected profileImageUrl(): string {

    const preview =
      this.profileImagePreview();


    if (
      preview
    ) {

      return preview;
    }


    const user =
      this.auth.currentUser() as any;


    const image =
      user?.profileImage ||
      user?.profile?.avatarUrl;


    if (
      image
    ) {

      return /^https?:\/\//i
        .test(
          image
        )
        ? image
        : apiUrl(
            image
          );
    }


    return this.companyLogoUrl();
  }


  private patchProfileFormFromUser(): void {

    const user =
      this.auth.currentUser() as any;


    if (
      !user
    ) {

      return;
    }


    const company =
      this.companyProfile() ||
      user.company ||
      {};


    this.profileForm.patchValue({
      name:
        user.name ||
        '',

      mobile:
        user.mobile ||
        user.profile?.phone ||
        '',

      department:
        user.department ||
        user.profile?.department ||
        '',

      designation:
        user.designation ||
        user.profile?.designation ||
        '',

      companyName:
        company.companyName ||
        company.name ||
        '',

      companyEmail:
        company.email ||
        '',

      companyPhone:
        company.phone ||
        '',

      industry:
        company.industry ||
        ''
    });
  }


  private syncCompanyProfileFromForm(
    raw:
      ReturnType<
        typeof this.profileForm.getRawValue
      >,

    user: any
  ): void {

    const profileImage =
      user?.profileImage ||
      this.companyProfile()?.logo ||
      '';


    this.companyProfile.update(
      (
        company
      ) => ({
        ...(
          company ||
          {}
        ),

        companyName:
          raw.companyName ||
          company?.companyName,

        email:
          raw.companyEmail ||
          company?.email,

        phone:
          raw.companyPhone ||
          company?.phone,

        industry:
          raw.industry ||
          company?.industry,

        ...(
          profileImage
            ? {
                logo:
                  profileImage
              }
            : {}
        )
      })
    );
  }


  private saveCompanyProfileFromAdminProfile(
    raw:
      ReturnType<
        typeof this.profileForm.getRawValue
      >,

    user: any
  ): void {

    const companyPayload = {
      companyName:
        raw.companyName,

      email:
        raw.companyEmail,

      phone:
        String(
          raw.companyPhone ||
          ''
        )
          .replace(
            /[\s-]/g,
            ''
          ),

      industry:
        raw.industry,

      ...(
        user?.profileImage
          ? {
              logo:
                user.profileImage
            }
          : {}
      )
    };


    this.api
      .patch<CompanyProfile>(
        '/companies/my/profile',
        companyPayload
      )
      .pipe(
        catchError(
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) => {

            this.profileMessage.set(
              error.error?.message ||
              'Profile image saved, but company profile could not be updated.'
            );

            return of(
              null
            );
          }
        )
      )
      .subscribe(
        (
          profile
        ) => {

          if (
            !profile
          ) {

            return;
          }


          const updatedUser =
            this.withSyncedCompanyProfile(
              {
                ...user,

                profileImage:
                  profile.logo ||
                  user?.profileImage
              },

              raw
            );


          this.auth.currentUser.set(
            updatedUser
          );


          if (
            typeof localStorage !==
            'undefined'
          ) {

            localStorage.setItem(
              'user',
              JSON.stringify(
                updatedUser
              )
            );
          }


          this.companyProfile.set(
            profile
          );


          this.syncCompanyProfileFromForm(
            raw,
            updatedUser
          );


          this.patchProfileFormFromUser();


          this.profileMessage.set(
            'Profile updated successfully.'
          );


          this.message.set(
            ''
          );
        }
      );
  }


  private withSyncedCompanyProfile(
    user: any,

    raw:
      ReturnType<
        typeof this.profileForm.getRawValue
      >
  ): any {

    const currentUser =
      this.auth.currentUser() as any;


    const currentCompany =
      currentUser?.company ||
      {};


    const profileImage =
      user?.profileImage ||
      currentUser?.profileImage ||
      this.companyProfile()?.logo ||
      currentCompany.logoUrl ||
      currentCompany.logo ||
      '';


    const company = {
      ...currentCompany,

      companyName:
        raw.companyName ||
        currentCompany.companyName ||
        currentCompany.name,

      name:
        raw.companyName ||
        currentCompany.name ||
        currentCompany.companyName,

      email:
        raw.companyEmail ||
        currentCompany.email,

      phone:
        raw.companyPhone ||
        currentCompany.phone,

      industry:
        raw.industry ||
        currentCompany.industry,

      ...(
        profileImage
          ? {
              logo:
                profileImage,

              logoUrl:
                /^https?:\/\//i
                  .test(
                    profileImage
                  )
                  ? profileImage
                  : apiUrl(
                      profileImage
                    )
            }
          : {}
      )
    };


    return {
      ...user,
      company
    };
  }


  protected loadCrm(): void {

    const employeeCode =
      this.selectedCrmEmployeeCode()
        .trim()
        .toUpperCase();


    const params = {
      ...(
        employeeCode
          ? {
              employeeCode
            }
          : {}
      ),

      ...this.salesDateParams()
    };


    forkJoin({
      leads:
        this.api
          .get<
            {
              leads?: (
                any &
                AssignmentMeta
              )[];
            } &
            PeriodListResponse
          >(
            '/crm/leads',
            params
          ),

      deals:
        this.api
          .get<
            {
              deals?: (
                any &
                AssignmentMeta
              )[];
            } &
            PeriodListResponse
          >(
            '/crm/deals',
            params
          ),

      tasks:
        this.api
          .get<
            {
              tasks?: (
                any &
                AssignmentMeta
              )[];
            } &
            PeriodListResponse
          >(
            '/crm/tasks',
            params
          ),

      quotations:
        this.api
          .get<
            {
              quotations?: (
                any &
                AssignmentMeta
              )[];
            } &
            PeriodListResponse
          >(
            '/crm/quotations',
            params
          ),

      contacts:
        this.api
          .get<{
            contacts?: any[];
          }>(
            '/crm/contacts'
          ),

      accounts:
        this.api
          .get<{
            accounts?: any[];
          }>(
            '/crm/accounts'
          )
    })
      .subscribe({
        next:
          (
            {
              leads,
              deals,
              tasks,
              quotations,
              contacts,
              accounts
            }
          ) => {

            this.crmLeads.set(
              leads.leads ??
              []
            );

            this.crmDeals.set(
              deals.deals ??
              []
            );

            this.crmTasks.set(
              tasks.tasks ??
              []
            );

            this.crmQuotations.set(
              quotations.quotations ??
              []
            );

            this.crmContacts.set(
              contacts.contacts ??
              []
            );

            this.crmEmployeeAccounts.set(
              accounts.accounts ??
              []
            );

            this.crmLeadSummary.set(
              leads.summary ??
              {}
            );

            this.crmDealSummary.set(
              deals.summary ??
              {}
            );

            this.crmTaskSummary.set(
              tasks.summary ??
              {}
            );

            this.quotationSummary.set(
              quotations.summary ??
              {}
            );
          },

        error:
          (
            error
          ) => {

            this.crmLeads.set(
              []
            );

            this.crmDeals.set(
              []
            );

            this.crmTasks.set(
              []
            );

            this.crmQuotations.set(
              []
            );

            this.crmContacts.set(
              []
            );

            this.crmEmployeeAccounts.set(
              []
            );

            this.handleSectionError(
              'CRM',
              error
            );
          }
      });
  }


  protected createLead(): void {

    if (
      this.leadForm.invalid
    ) {

      return;
    }


    this.api
      .post(
        '/crm/leads',
        this.leadForm.getRawValue()
      )
      .subscribe(
        () => {

          this.leadForm.reset({
            name: '',
            company: '',
            phone: '',
            email: '',
            source: 'Website',
            status: 'New',
            notes: ''
          });


          this.loadCrm();
        }
      );
  }


  protected createDeal(): void {

    if (
      this.dealForm.invalid
    ) {

      return;
    }


    const value =
      this.dealForm.getRawValue();


    this.api
      .post(
        '/crm/deals',
        {
          ...value,

          value:
            Number(
              value.value ||
              0
            )
        }
      )
      .subscribe(
        () => {

          this.dealForm.reset({
            leadId: '',
            clientName: '',
            value: 0,
            stage: 'Proposal',
            expectedClose:
              new Date()
                .toISOString()
                .slice(
                  0,
                  10
                ),
            notes: ''
          });


          this.loadCrm();
        }
      );
  }


  protected createTask(): void {

    if (
      this.taskForm.invalid
    ) {

      return;
    }


    this.api
      .post(
        '/crm/tasks',
        this.taskForm.getRawValue()
      )
      .subscribe(
        () => {

          this.taskForm.reset({
            title: '',
            relatedTo: '',
            dueDate:
              new Date()
                .toISOString()
                .slice(
                  0,
                  10
                ),
            priority: 'Medium',
            status: 'Open'
          });


          this.loadCrm();
        }
      );
  }


  protected createQuotation(): void {

    if (
      this.quotationForm.invalid
    ) {

      return;
    }


    const value =
      this.quotationForm.getRawValue();


    this.api
      .post(
        '/crm/quotations',
        {
          ...value,

          amount:
            Number(
              value.amount ||
              0
            )
        }
      )
      .subscribe(
        () => {

          this.quotationForm.reset({
            quotationNumber:
              `QT-${Date.now()}`,

            clientName:
              '',

            amount:
              0,

            validUntil:
              new Date()
                .toISOString()
                .slice(
                  0,
                  10
                ),

            status:
              'Draft',

            notes:
              ''
          });


          this.loadCrm();
        }
      );
  }


  protected updateCrm(
    module:
      'leads' |
      'deals' |
      'tasks' |
      'quotations',

    id:
      string |
      undefined,

    body:
      Record<
        string,
        unknown
      >
  ): void {

    if (
      !id
    ) {

      return;
    }


    this.api
      .patch(
        '/crm/' +
        module +
        '/' +
        id,

        body
      )
      .subscribe({
        next:
          () => {

            this.message.set(
              `${module} updated successfully.`
            );


            this.loadCrm();
          },

        error:
          (
            error
          ) =>
            this.handleSectionError(
              'CRM update',
              error
            )
      });
  }


  protected loadAccounting(): void {

    forkJoin({
      invoices:
        this.api
          .get<
            {
              invoices?: (
                any &
                AssignmentMeta
              )[];
            } &
            PeriodListResponse
          >(
            '/accounting/invoices'
          )
          .pipe(
            catchError(
              () =>
                of({
                  invoices: [],
                  summary: {}
                })
            )
          ),

      payments:
        this.api
          .get<
            {
              payments?: (
                any &
                AssignmentMeta
              )[];
            } &
            PeriodListResponse
          >(
            '/accounting/payments'
          )
          .pipe(
            catchError(
              () =>
                of({
                  payments: [],
                  summary: {}
                })
            )
          ),

      expenses:
        this.api
          .get<
            {
              expenses?: (
                any &
                AssignmentMeta
              )[];
            } &
            PeriodListResponse
          >(
            '/accounting/expenses'
          )
          .pipe(
            catchError(
              () =>
                of({
                  expenses: [],
                  summary: {}
                })
            )
          )
    })
      .subscribe(
        (
          {
            invoices,
            payments,
            expenses
          }
        ) => {

          this.accountInvoices.set(
            invoices.invoices ??
            []
          );

          this.accountPayments.set(
            payments.payments ??
            []
          );

          this.accountExpenses.set(
            expenses.expenses ??
            []
          );

          this.invoiceSummary.set(
            invoices.summary ??
            {}
          );

          this.paymentSummary.set(
            payments.summary ??
            {}
          );

          this.expenseSummary.set(
            expenses.summary ??
            {}
          );
        }
      );
  }


  protected updateAccounting(
    module:
      'invoices' |
      'payments' |
      'expenses',

    id:
      string |
      undefined,

    body:
      Record<
        string,
        unknown
      >
  ): void {

    if (
      !id
    ) {

      return;
    }


    this.api
      .patch(
        `/accounting/${module}/${id}`,
        body
      )
      .subscribe(
        () =>
          this.loadAccounting()
      );
  }


  protected loadHrm(): void {

    const today =
      new Date()
        .toISOString()
        .slice(
          0,
          10
        );


    const now =
      new Date();


    const monthStart =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      )
        .toISOString()
        .slice(
          0,
          10
        );


    const monthEnd =
      new Date(
        now.getFullYear(),
        now.getMonth() +
        1,
        0
      )
        .toISOString()
        .slice(
          0,
          10
        );


    const month =
      now.getMonth() +
      1;


    const year =
      now.getFullYear();


    forkJoin({
      employees:
        this.api
          .get<{
            employees?: any[];
          }>(
            '/hr/employees',
            {
              limit: 100
            }
          )
          .pipe(
            catchError(
              () =>
                of({
                  employees: []
                })
            )
          ),

      attendanceToday:
        this.api
          .get<{
            attendance?: any[];
          }>(
            '/hr/attendance/records',
            {
              from: today,
              to: today,
              limit: 100
            }
          )
          .pipe(
            catchError(
              () =>
                of({
                  attendance: []
                })
            )
          ),

      attendanceMonth:
        this.api
          .get<{
            attendance?: any[];
          }>(
            '/hr/attendance/records',
            {
              from:
                monthStart,

              to:
                monthEnd,

              limit:
                100
            }
          )
          .pipe(
            catchError(
              () =>
                of({
                  attendance: []
                })
            )
          ),

      leaveRequests:
        this.api
          .get<{
            leaveRequests?: any[];
          }>(
            '/hr/leave/requests',
            {
              limit: 100
            }
          )
          .pipe(
            catchError(
              () =>
                of({
                  leaveRequests: []
                })
            )
          ),

      leaveBalances:
        this.api
          .get<{
            leaveBalances?: any[];
          }>(
            '/hr/leave/balances',
            {
              year,
              limit: 100
            }
          )
          .pipe(
            catchError(
              () =>
                of({
                  leaveBalances: []
                })
            )
          ),

      payrollRuns:
        this.api
          .get<{
            payrollRuns?: any[];
          }>(
            '/hr/payroll/runs',
            {
              month,
              year,
              limit: 50
            }
          )
          .pipe(
            catchError(
              () =>
                of({
                  payrollRuns: []
                })
            )
          ),

      payslips:
        this.api
          .get<{
            payslips?: any[];
          }>(
            '/hr/payroll/payslips',
            {
              month,
              year,
              limit: 100
            }
          )
          .pipe(
            catchError(
              () =>
                of({
                  payslips: []
                })
            )
          ),

      jobs:
        this.api
          .get<{
            jobs?: any[];
          }>(
            '/hr/recruitment/jobs',
            {
              limit: 50
            }
          )
          .pipe(
            catchError(
              () =>
                of({
                  jobs: []
                })
            )
          ),

      candidates:
        this.api
          .get<{
            candidates?: any[];
          }>(
            '/hr/recruitment/candidates',
            {
              limit: 100
            }
          )
          .pipe(
            catchError(
              () =>
                of({
                  candidates: []
                })
            )
          ),

      interviews:
        this.api
          .get<{
            interviews?: any[];
          }>(
            '/hr/recruitment/interviews',
            {
              limit: 100
            }
          )
          .pipe(
            catchError(
              () =>
                of({
                  interviews: []
                })
            )
          ),

      offers:
        this.api
          .get<{
            offers?: any[];
          }>(
            '/hr/recruitment/offers',
            {
              limit: 50
            }
          )
          .pipe(
            catchError(
              () =>
                of({
                  offers: []
                })
            )
          )
    })
      .subscribe(
        (
          {
            employees,
            attendanceToday,
            attendanceMonth,
            leaveRequests,
            leaveBalances,
            payrollRuns,
            payslips,
            jobs,
            candidates,
            interviews,
            offers
          }
        ) => {

          const requests =
            leaveRequests.leaveRequests ??
            [];


          this.employeeRows.set(
            employees.employees ??
            []
          );


          this.attendanceToday.set(
            attendanceToday.attendance ??
            []
          );


          this.attendanceMonth.set(
            attendanceMonth.attendance ??
            []
          );


          this.leaveToday.set(
            requests.filter(
              (
                item
              ) =>
                this.isSameDay(
                  item.createdAt ||
                  item.fromDate,

                  today
                )
            )
          );


          this.leaveMonth.set(
            requests.filter(
              (
                item
              ) =>
                this.isSameMonth(
                  item.createdAt ||
                  item.fromDate,

                  now
                )
            )
          );


          this.leaveBalances.set(
            leaveBalances.leaveBalances ??
            []
          );


          this.payrollRuns.set(
            payrollRuns.payrollRuns ??
            []
          );


          this.payslips.set(
            payslips.payslips ??
            []
          );


          this.recruitmentJobs.set(
            jobs.jobs ??
            []
          );


          this.recruitmentCandidates.set(
            candidates.candidates ??
            []
          );


          this.recruitmentInterviews.set(
            interviews.interviews ??
            []
          );


          this.recruitmentOffers.set(
            offers.offers ??
            []
          );
        }
      );
  }


  protected loadCalendar(): void {

    forkJoin({
      holidays:
        this.api
          .get<{
            holidays?: HolidayRow[];
          }>(
            '/hr/holidays',
            {
              limit:
                100,

              upcomingOnly:
                false
            }
          )
          .pipe(
            catchError(
              () =>
                of({
                  holidays: []
                })
            )
          ),

      events:
        this.api
          .get<{
            events?: EventRow[];
          }>(
            '/hr/events',
            {
              limit:
                100
            }
          )
          .pipe(
            catchError(
              () =>
                of({
                  events: []
                })
            )
          ),

      meetings:
        this.api
          .get<{
            meetings?: MeetingRow[];
          }>(
            '/hr/meetings',
            {
              limit:
                100
            }
          )
          .pipe(
            catchError(
              () =>
                of({
                  meetings: []
                })
            )
          )
    })
      .subscribe(
        (
          {
            holidays,
            events,
            meetings
          }
        ) => {

          this.holidays.set(
            holidays.holidays ??
            []
          );

          this.events.set(
            events.events ??
            []
          );

          this.meetings.set(
            meetings.meetings ??
            []
          );
        }
      );
  }


  protected createEvent(): void {

    if (
      this.eventForm.invalid ||
      this.isEventSaving()
    ) {

      this.eventForm
        .markAllAsTouched();

      return;
    }


    const value =
      this.eventForm
        .getRawValue();


    this.isEventSaving.set(
      true
    );


    this.message.set(
      ''
    );


    this.api
      .post(
        '/hr/events',
        {
          ...value,

          eventCode:
            this.generateRecordCode(
              'EVT'
            ),

          startDateTime:
            new Date(
              value.startDateTime
            )
              .toISOString(),

          endDateTime:
            new Date(
              value.endDateTime
            )
              .toISOString(),

          participants:
            []
        }
      )
      .pipe(
        finalize(
          () =>
            this.isEventSaving.set(
              false
            )
        )
      )
      .subscribe({
        next:
          () => {

            this.eventForm.patchValue({
              eventTitle:
                '',

              venue:
                '',

              meetingLink:
                '',

              description:
                ''
            });


            this.loadCalendar();


            this.message.set(
              'Company event created.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to create company event.'
            )
      });
  }


  protected updateEventStatus(
    event: EventRow,
    status: string
  ): void {

    if (
      !event._id ||
      this.isEventSaving()
    ) {

      return;
    }


    this.isEventSaving.set(
      true
    );


    this.api
      .patch(
        `/hr/events/${event._id}/status`,
        {
          status
        }
      )
      .pipe(
        finalize(
          () =>
            this.isEventSaving.set(
              false
            )
        )
      )
      .subscribe({
        next:
          () => {

            this.loadCalendar();

            this.message.set(
              'Company event updated.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to update company event.'
            )
      });
  }


  protected editEvent(
    event: EventRow
  ): void {

    const eventTitle =
      window.prompt(
        'Event title',
        event.eventTitle ||
        ''
      );


    if (
      !event._id ||
      !eventTitle
    ) {

      return;
    }


    this.api
      .patch(
        `/hr/events/${event._id}`,
        {
          eventTitle
        }
      )
      .subscribe({
        next:
          () => {

            this.loadCalendar();

            this.message.set(
              'Company event edited.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to edit company event.'
            )
      });
  }


  protected deleteEvent(
    event: EventRow
  ): void {

    if (
      !event._id ||
      !confirm(
        `Delete event ${event.eventTitle || ''}?`
      )
    ) {

      return;
    }


    this.api
      .delete(
        `/hr/events/${event._id}`
      )
      .subscribe({
        next:
          () => {

            this.loadCalendar();

            this.message.set(
              'Company event deleted.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to delete company event.'
            )
      });
  }


  protected createMeeting(): void {

    if (
      this.meetingForm.invalid ||
      this.isMeetingSaving()
    ) {

      this.meetingForm
        .markAllAsTouched();

      return;
    }


    const value =
      this.meetingForm
        .getRawValue();


    const meetingCode =
      this.generateRecordCode(
        'MTG'
      );


    const attendeeEmployeeCodes =
      this.normalizeSelectedEmployeeCodes(
        value.attendeeEmployeeCodes
      );


    this.isMeetingSaving.set(
      true
    );


    this.message.set(
      ''
    );


    this.api
      .post(
        '/hr/meetings',
        {
          meetingTitle:
            value.meetingTitle,

          meetingCode,

          meetingMode:
            value.meetingMode,

          meetingLink:
            this.meetingRoomUrl(
              meetingCode
            ),

          venue:
            value.venue,

          startDateTime:
            new Date(
              value.startDateTime
            )
              .toISOString(),

          endDateTime:
            new Date(
              value.endDateTime
            )
              .toISOString(),

          agenda:
            value.agendaText
              ? [
                  {
                    title:
                      value.agendaText,

                    description:
                      ''
                  }
                ]
              : [],

          attendees:
            attendeeEmployeeCodes
              .map(
                (
                  employeeCode
                ) => ({
                  employeeCode
                })
              ),

          inviteCompanyAdmins:
            value.inviteCompanyAdmins,

          status:
            value.status,

          notifyAttendees:
            value.notifyAttendees
        }
      )
      .pipe(
        finalize(
          () =>
            this.isMeetingSaving.set(
              false
            )
        )
      )
      .subscribe({
        next:
          () => {

            this.meetingForm.patchValue({
              meetingTitle:
                '',

              venue:
                '',

              attendeeEmployeeCodes:
                [],

              agendaText:
                ''
            });


            this.loadCalendar();


            this.message.set(
              'Meeting scheduled.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to schedule meeting.'
            )
      });
  }


  protected updateMeetingStatus(
    meeting: MeetingRow,
    status: string
  ): void {

    if (
      !meeting._id ||
      this.isMeetingSaving()
    ) {

      return;
    }


    this.isMeetingSaving.set(
      true
    );


    this.api
      .patch(
        `/hr/meetings/${meeting._id}/status`,
        {
          status
        }
      )
      .pipe(
        finalize(
          () =>
            this.isMeetingSaving.set(
              false
            )
        )
      )
      .subscribe({
        next:
          () => {

            this.loadCalendar();

            this.message.set(
              'Meeting updated.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to update meeting.'
            )
      });
  }


  protected editMeeting(
    meeting: MeetingRow
  ): void {

    const meetingTitle =
      window.prompt(
        'Meeting title',
        meeting.meetingTitle ||
        ''
      );


    if (
      !meeting._id ||
      !meetingTitle
    ) {

      return;
    }


    this.api
      .patch(
        `/hr/meetings/${meeting._id}`,
        {
          meetingTitle
        }
      )
      .subscribe({
        next:
          () => {

            this.loadCalendar();

            this.message.set(
              'Meeting edited.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to edit meeting.'
            )
      });
  }


  protected deleteMeeting(
    meeting: MeetingRow
  ): void {

    if (
      !meeting._id ||
      !confirm(
        `Delete meeting ${meeting.meetingTitle || ''}?`
      )
    ) {

      return;
    }


    this.api
      .delete(
        `/hr/meetings/${meeting._id}`
      )
      .subscribe({
        next:
          () => {

            this.loadCalendar();

            this.message.set(
              'Meeting deleted.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to delete meeting.'
            )
      });
  }


  protected saveHoliday(): void {

    if (
      this.holidayForm.invalid ||
      this.isHolidaySaving()
    ) {

      this.holidayForm
        .markAllAsTouched();

      return;
    }


    const holidayId =
      this.editingHolidayId();


    const request =
      holidayId
        ? this.api.patch<HolidayRow>(
            `/hr/holidays/${holidayId}`,
            this.holidayForm.getRawValue()
          )
        : this.api.post<HolidayRow>(
            '/hr/holidays',
            this.holidayForm.getRawValue()
          );


    this.isHolidaySaving.set(
      true
    );


    this.message.set(
      ''
    );


    request
      .pipe(
        finalize(
          () =>
            this.isHolidaySaving.set(
              false
            )
        )
      )
      .subscribe({
        next:
          () => {

            this.resetHolidayForm();

            this.loadCalendar();

            this.message.set(
              holidayId
                ? 'Holiday updated.'
                : 'Holiday created.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to save holiday.'
            )
      });
  }


  protected editHoliday(
    holiday: HolidayRow
  ): void {

    if (
      !holiday._id
    ) {

      return;
    }


    this.editingHolidayId.set(
      holiday._id
    );


    this.holidayForm.reset({
      holidayName:
        holiday.holidayName ||
        '',

      date:
        holiday.date
          ? this.toDateInput(
              new Date(
                holiday.date
              )
            )
          : new Date()
              .toISOString()
              .slice(
                0,
                10
              ),

      type:
        holiday.type ||
        'company',

      description:
        holiday.description ||
        '',

      holidayColor:
        holiday.holidayColor ||
        '#2563eb',

      isPaid:
        holiday.isPaid !==
        false,

      isActive:
        holiday.isActive !==
        false
    });
  }


  protected resetHolidayForm(): void {

    this.editingHolidayId.set(
      null
    );


    this.holidayForm.reset({
      holidayName:
        '',

      date:
        new Date()
          .toISOString()
          .slice(
            0,
            10
          ),

      type:
        'company',

      description:
        '',

      holidayColor:
        '#2563eb',

      isPaid:
        true,

      isActive:
        true
    });
  }


  protected deleteHoliday(
    holiday: HolidayRow
  ): void {

    if (
      !holiday._id ||
      !confirm(
        `Delete holiday ${holiday.holidayName || ''}?`
      )
    ) {

      return;
    }


    this.api
      .delete(
        `/hr/holidays/${holiday._id}`
      )
      .subscribe({
        next:
          () => {

            this.loadCalendar();

            this.message.set(
              'Holiday deleted.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to delete holiday.'
            )
      });
  }


  protected selectedMeetingInviteCount(): number {

    return this
      .normalizeSelectedEmployeeCodes(
        this.meetingForm
          .controls
          .attendeeEmployeeCodes
          .value
      )
      .length;
  }


  protected isMeetingInviteSelected(
    employeeCode?: string
  ): boolean {

    return !!employeeCode &&
      this
        .normalizeSelectedEmployeeCodes(
          this.meetingForm
            .controls
            .attendeeEmployeeCodes
            .value
        )
        .includes(
          employeeCode
        );
  }


  protected toggleMeetingInvite(
    employeeCode:
      string |
      undefined,

    checked:
      boolean
  ): void {

    if (
      !employeeCode
    ) {

      return;
    }


    const current =
      new Set(
        this.normalizeSelectedEmployeeCodes(
          this.meetingForm
            .controls
            .attendeeEmployeeCodes
            .value
        )
      );


    checked
      ? current.add(
          employeeCode
        )
      : current.delete(
          employeeCode
        );


    this.meetingForm
      .controls
      .attendeeEmployeeCodes
      .setValue(
        Array.from(
          current
        )
      );


    this.meetingForm
      .controls
      .attendeeEmployeeCodes
      .markAsDirty();
  }


  protected invitedPeopleLabel(
    meeting:
      MeetingRow
  ): string {

    const attendees =
      meeting.attendees ||
      [];


    if (
      !attendees.length
    ) {

      return 'No employee invitees';
    }


    return attendees
      .map(
        (
          item
        ) =>
          item.employeeId?.displayName ||
          item.employeeId?.employeeCode ||
          'Employee'
      )
      .join(
        ', '
      );
  }


  protected openMeetingRoom(
    link?: string
  ): void {

    if (
      !link
    ) {

      return;
    }


    window.open(
      link,
      '_blank',
      'noopener,noreferrer'
    );
  }


  protected openCrmEmployeeDetail(
    employee:
      AssignmentMeta & {
        employeeCode?: string;
        employeeName?: string;
      }
  ): void {

    const employeeCode =
      String(
        employee.assignedEmployeeCode ||
        employee.employeeCode ||
        ''
      )
        .trim()
        .toUpperCase();


    if (
      !employeeCode
    ) {

      return;
    }


    this.selectedCrmEmployeeCode.set(
      employeeCode
    );


    this.selectedCrmEmployeeName.set(
      employee.assignedEmployeeName ||
      employee.employeeName ||
      employeeCode
    );


    this.loadCrmEmployeeDetail(
      employeeCode
    );


    this.loadCrm();
  }


  protected clearCrmEmployeeDetail(): void {

    this.selectedCrmEmployeeCode.set(
      ''
    );

    this.selectedCrmEmployeeName.set(
      ''
    );

    this.employeeTodayLeads.set(
      []
    );

    this.employeeMonthLeads.set(
      []
    );

    this.employeeTodayDeals.set(
      []
    );

    this.employeeMonthDeals.set(
      []
    );

    this.loadCrm();
  }


  private loadCrmEmployeeDetail(
    employeeCode:
      string
  ): void {

    forkJoin({
      todayLeads:
        this.api
          .get<{
            leads?: (
              any &
              AssignmentMeta
            )[];
          }>(
            '/crm/leads',
            {
              employeeCode,
              period:
                'today'
            }
          )
          .pipe(
            catchError(
              () =>
                of({
                  leads: []
                })
            )
          ),

      monthLeads:
        this.api
          .get<{
            leads?: (
              any &
              AssignmentMeta
            )[];
          }>(
            '/crm/leads',
            {
              employeeCode,
              period:
                'month'
            }
          )
          .pipe(
            catchError(
              () =>
                of({
                  leads: []
                })
            )
          ),

      todayDeals:
        this.api
          .get<{
            deals?: (
              any &
              AssignmentMeta
            )[];
          }>(
            '/crm/deals',
            {
              employeeCode,
              period:
                'today'
            }
          )
          .pipe(
            catchError(
              () =>
                of({
                  deals: []
                })
            )
          ),

      monthDeals:
        this.api
          .get<{
            deals?: (
              any &
              AssignmentMeta
            )[];
          }>(
            '/crm/deals',
            {
              employeeCode,
              period:
                'month'
            }
          )
          .pipe(
            catchError(
              () =>
                of({
                  deals: []
                })
            )
          )
    })
      .subscribe(
        (
          {
            todayLeads,
            monthLeads,
            todayDeals,
            monthDeals
          }
        ) => {

          console.log(
            '[CRM][CompanyAdmin] loadCrmEmployeeDetail response',
            {
              employeeCode,

              todayLeads:
                todayLeads.leads ||
                [],

              monthLeads:
                monthLeads.leads ||
                [],

              todayDeals:
                todayDeals.deals ||
                [],

              monthDeals:
                monthDeals.deals ||
                []
            }
          );


          this.employeeTodayLeads.set(
            todayLeads.leads ||
            []
          );


          this.employeeMonthLeads.set(
            monthLeads.leads ||
            []
          );


          this.employeeTodayDeals.set(
            todayDeals.deals ||
            []
          );


          this.employeeMonthDeals.set(
            monthDeals.deals ||
            []
          );
        }
      );
  }


  protected assignmentLabel(
    row:
      AssignmentMeta
  ): string {

    const name =
      row.assignedEmployeeName
        ?.trim();


    const code =
      row.assignedEmployeeCode
        ?.trim();


    if (
      name &&
      code
    ) {

      return `${name} (${code})`;
    }


    if (
      name
    ) {

      return name;
    }


    if (
      code
    ) {

      return code;
    }


    return 'Unassigned';
  }


  protected periodLabel(
    row:
      AssignmentMeta
  ): string {

    return row.createdDateStatus ||
      (
        row.isToday
          ? 'Today'
          : row.isThisMonth
              ? 'This month'
              : 'Older'
      );
  }


  protected periodSummaryItems(
    summary:
      PeriodSummary,

    amountLabel =
      'Amount'
  ): {
    label:
      string;

    value:
      string;
  }[] {

    return [
      {
        label:
          'Today',

        value:
          String(
            summary.todayCount ||
            0
          )
      },

      {
        label:
          'This month',

        value:
          String(
            summary.monthCount ||
            0
          )
      },

      {
        label:
          amountLabel,

        value:
          this.formatCurrency(
            summary.monthAmount ||
            0
          )
      }
    ];
  }


  protected accountReceivableTotal(): number {

    return this.accountInvoices()
      .filter(
        (
          item
        ) =>
          item.status !==
          'Paid'
      )
      .reduce(
        (
          sum,
          item
        ) =>
          sum +
          Number(
            item.amount ||
            0
          ),

        0
      );
  }


  protected accountExpenseTotal(): number {

    return this.accountExpenses()
      .reduce(
        (
          sum,
          item
        ) =>
          sum +
          Number(
            item.amount ||
            0
          ),

        0
      );
  }


  protected pendingInvoiceCount(): number {

    return this.accountInvoices()
      .filter(
        (
          item
        ) =>
          item.status !==
          'Paid'
      )
      .length;
  }


  protected wonRevenueThisMonth(): number {

    return this.crmDeals()
      .filter(
        (
          deal
        ) =>
          deal.stage ===
          'Won' &&
          deal.isThisMonth
      )
      .reduce(
        (
          sum,
          deal
        ) =>
          sum +
          Number(
            deal.value ||
            0
          ),

        0
      );
  }


  protected quotationValue(): number {

    return this.crmQuotations()
      .reduce(
        (
          sum,
          item
        ) =>
          sum +
          Number(
            item.amount ||
            0
          ),

        0
      );
  }


  protected uploadedBankAccountCount(): number {

    return this.crmEmployeeAccounts()
      .filter(
        (
          account
        ) =>
          account.hasBankDetails
      )
      .length;
  }


  protected pendingBankAccountCount(): number {

    return this.crmEmployeeAccounts()
      .filter(
        (
          account
        ) =>
          !account.hasBankDetails
      )
      .length;
  }


  protected approvedLeaveCount(): number {

    return this.leaveMonth()
      .filter(
        (
          item
        ) =>
          item.status ===
          'approved'
      )
      .length;
  }


  protected pendingLeaveCount(): number {

    return this.leaveMonth()
      .filter(
        (
          item
        ) =>
          item.status ===
          'pending'
      )
      .length;
  }


  protected payrollNetTotal(): number {

    return this.payslips()
      .reduce(
        (
          sum,
          item
        ) =>
          sum +
          Number(
            item.netPay ||
            item.netSalary ||
            0
          ),

        0
      );
  }


  protected employeeDisplay(
    row: any
  ): string {

    return row?.displayName ||
      row?.employeeId?.displayName ||
      row?.employeeName ||
      [
        row?.firstName,
        row?.lastName
      ]
        .filter(
          Boolean
        )
        .join(
          ' '
        ) ||
      row?.employeeCode ||
      '-';
  }


  protected employeeCode(
    row: any
  ): string {

    return row?.employeeCode ||
      row?.employeeId?.employeeCode ||
      '-';
  }


  protected leaveRemaining(
    row: any
  ): number {

    return Number(
      row?.availableBalance ??
      row?.remaining ??
      row?.balance ??
      0
    );
  }


  protected leadEmployeePercent(
    total =
      0
  ): number {

    return this.crmLeadSummary().totalCount
      ? Math.max(
          8,

          Math.round(
            (
              total /
              (
                this.crmLeadSummary().totalCount ||
                1
              )
            ) *
            100
          )
        )
      : 8;
  }


  protected isSameDay(
    value:
      string |
      undefined,

    isoDate:
      string
  ): boolean {

    return Boolean(
      value &&
      new Date(
        value
      )
        .toISOString()
        .slice(
          0,
          10
        ) ===
      isoDate
    );
  }


  protected isSameMonth(
    value:
      string |
      undefined,

    date:
      Date
  ): boolean {

    if (
      !value
    ) {

      return false;
    }


    const parsed =
      new Date(
        value
      );


    return parsed.getFullYear() ===
      date.getFullYear() &&
      parsed.getMonth() ===
      date.getMonth();
  }


  protected presentTodayCount(): number {

    return this.attendanceToday()
      .filter(
        (
          item
        ) =>
          item.status ===
          'present'
      )
      .length;
  }


  protected payrollTodayCount(): number {

    const today =
      new Date()
        .toISOString()
        .slice(
          0,
          10
        );


    return this.payslips()
      .filter(
        (
          item
        ) =>
          this.isSameDay(
            item.createdAt ||
            item.updatedAt,

            today
          )
      )
      .length;
  }


  protected recruitmentOpenJobs(): number {

    return this.recruitmentJobs()
      .filter(
        (
          item
        ) =>
          (
            item.status ||
            'open'
          ) ===
          'open'
      )
      .length;
  }


  protected crmPipelineValue(): number {

    return this.crmDeals()
      .reduce(
        (
          sum,
          deal
        ) =>
          sum +
          Number(
            deal.value ||
            0
          ),

        0
      );
  }


  protected openCrmTaskCount(): number {

    return this.crmTasks()
      .filter(
        (
          task
        ) =>
          task.status !==
          'Done'
      )
      .length;
  }


  protected leadName(
    leadId?: string
  ): string {

    const lead =
      this.crmLeads()
        .find(
          (
            item
          ) =>
            item._id ===
            leadId
        );


    return lead
      ? `${lead.name}${lead.company ? ' - ' + lead.company : ''}`
      : '-';
  }


  protected canToggleWorkFromHomeAttendance(
    employee: any
  ): boolean {

    return [
      'remote',
      'hybrid',
      'field'
    ]
      .includes(
        String(
          employee?.workMode ||
          ''
        )
          .toLowerCase()
      );
  }


  protected toggleWorkFromHomeAttendance(
    employee: any
  ): void {

    if (
      !employee?._id ||
      !this.canToggleWorkFromHomeAttendance(
        employee
      )
    ) {

      this.message.set(
        'WFH punch permission can be enabled only for remote, hybrid or field employees.'
      );

      return;
    }


    const nextAllowed =
      employee.workFromHomeAttendanceAllowed !==
      true;


    this.isWfhPermissionSaving.set(
      true
    );


    this.api
      .patch<any>(
        `/hr/employees/${employee._id}/work-from-home-attendance`,

        {
          workFromHomeAttendanceAllowed:
            nextAllowed
        }
      )
      .pipe(
        finalize(
          () =>
            this.isWfhPermissionSaving.set(
              false
            )
        )
      )
      .subscribe({
        next:
          (
            updated
          ) => {

            this.employeeRows.set(
              this.employeeRows()
                .map(
                  (
                    row
                  ) =>
                    row._id ===
                    employee._id
                      ? {
                          ...row,
                          ...updated
                        }
                      : row
                )
            );


            this.message.set(
              nextAllowed
                ? 'Work From Home punch permission allowed.'
                : 'Work From Home punch permission removed.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to update WFH punch permission.'
            )
      });
  }


  protected activeHrCount(): number {

    return this.companyUsers()
      .filter(
        (
          user
        ) =>
          user.role ===
          'hr' &&
          this.userStatus(
            user
          ) ===
          'active'
      )
      .length;
  }


  protected activeEmployeeUserCount(): number {

    return this.companyUsers()
      .filter(
        (
          user
        ) =>
          user.role ===
          'employee' &&
          this.userStatus(
            user
          ) ===
          'active'
      )
      .length;
  }


  protected totalUsers(): number {

    return this.companyUsers()
      .length;
  }


  protected totalEmployees(): number {

    return this.employeeRows()
      .length ||
      this.activeEmployeeUserCount();
  }


  protected activeEmployees(): number {

    return this.employeeRows()
      .filter(
        (
          employee
        ) =>
          (
            employee.employeeStatus ||
            'active'
          ) ===
          'active' &&
          employee.isActive !==
          false
      )
      .length ||
      this.activeEmployeeUserCount();
  }


  protected inactiveUserCount(): number {

    return this.companyUsers()
      .filter(
        (
          user
        ) =>
          this.userStatus(
            user
          ) !==
          'active'
      )
      .length;
  }


  protected allUserRows(): UserRow[] {

    return this.companyUsers();
  }


  protected inactiveUserRows(): UserRow[] {

    return this.companyUsers()
      .filter(
        (
          user
        ) =>
          this.userStatus(
            user
          ) !==
          'active'
      );
  }


  protected hrUserRows(): UserRow[] {

    return this.companyUsers()
      .filter(
        (
          user
        ) =>
          user.role ===
          'hr'
      );
  }


  protected remainingHrSlots(): string {

    const limit =
      this.userLimit(
        'hr'
      );


    if (
      limit <
      0
    ) {

      return 'Unlimited';
    }


    return String(
      Math.max(
        limit -
        this.activeHrCount(),

        0
      )
    );
  }


  protected userStatus(
    user:
      UserRow
  ): string {

    return String(
      user.status ||
      'active'
    )
      .toLowerCase();
  }


  protected userLimit(
    role?: string
  ): number {

    const currentPlan =
      this.currentPlan();


    if (
      role ===
      'hr'
    ) {

      return Number(
        this.companyProfile()?.hrAccountLimit ??
        currentPlan?.hrAccountLimit ??
        0
      );
    }


    if (
      role ===
      'employee'
    ) {

      return Number(
        this.companyProfile()?.maxEmployees ??
        currentPlan?.employeeLimit ??
        0
      );
    }


    return -1;
  }


  protected selectedUserRoleLimitMessage(): string {

    const role =
      this.userForm
        .controls
        .roleName
        .value;


    const limit =
      this.userLimit(
        role
      );


    const used =
      role ===
      'hr'
        ? this.activeHrCount()
        : this.activeEmployeeUserCount();


    if (
      limit <
      0
    ) {

      return `${this.roleLabel(role)} users: ${used} active / Unlimited`;
    }


    return `${this.roleLabel(role)} users: ${used} active / ${limit} allowed`;
  }


  protected canCreateSelectedUserRole(): boolean {

    const role =
      this.userForm
        .controls
        .roleName
        .value;


    const limit =
      this.userLimit(
        role
      );


    if (
      limit <
      0
    ) {

      return true;
    }


    const used =
      role ===
      'hr'
        ? this.activeHrCount()
        : this.activeEmployeeUserCount();


    return used <
      limit;
  }


  protected departmentCount(): number {

    return new Set(
      this.companyUsers()
        .map(
          (
            user
          ) =>
            user.department
        )
        .filter(
          Boolean
        )
    )
      .size;
  }


  protected toggleNotificationPanel(): void {

    const nextState =
      !this.isNotificationPanelOpen();


    this.isNotificationPanelOpen.set(
      nextState
    );


    if (
      nextState
    ) {

      this.loadNotifications(
        true
      );

      this.loadCrm();

      this.loadAccounting();

      this.markNotificationsRead();
    }
  }


  protected closeNotificationPanel(): void {

    this.isNotificationPanelOpen.set(
      false
    );
  }


  private toDateInput(
    value:
      Date
  ): string {

    const offset =
      value.getTimezoneOffset() *
      60000;


    return new Date(
      value.getTime() -
      offset
    )
      .toISOString()
      .slice(
        0,
        10
      );
  }


  private toDateTimeInput(
    value:
      Date
  ): string {

    const offset =
      value.getTimezoneOffset() *
      60000;


    return new Date(
      value.getTime() -
      offset
    )
      .toISOString()
      .slice(
        0,
        16
      );
  }


  private generateRecordCode(
    prefix:
      string
  ): string {

    return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
  }


  private meetingRoomUrl(
    meetingCode:
      string
  ): string {

    return `${window.location.origin}/meeting-room/${meetingCode}`;
  }


  private normalizeSelectedEmployeeCodes(
    value:
      readonly string[] |
      string[] |
      null |
      undefined
  ): string[] {

    return Array.from(
      new Set(
        (
          value ??
          []
        )
          .map(
            (
              item
            ) =>
              String(
                item ||
                ''
              )
                .trim()
                .toUpperCase()
          )
          .filter(
            Boolean
          )
      )
    );
  }


  protected formatDate(
    value?: string
  ): string {

    if (
      !value
    ) {

      return '-';
    }


    return new Intl.DateTimeFormat(
      'en-IN',
      {
        day:
          '2-digit',

        month:
          'short',

        year:
          'numeric'
      }
    )
      .format(
        new Date(
          value
        )
      );
  }


  protected formatDateTime(
    value?: string
  ): string {

    if (
      !value
    ) {

      return '-';
    }


    return new Intl.DateTimeFormat(
      'en-IN',
      {
        day:
          '2-digit',

        month:
          'short',

        hour:
          '2-digit',

        minute:
          '2-digit'
      }
    )
      .format(
        new Date(
          value
        )
      );
  }


  protected pendingActions(): number {

    return this.inactiveUserCount();
  }


  protected attendancePercent(): number {

    const total =
      this.totalEmployees();


    if (
      !total
    ) {

      return 0;
    }


    return Math.round(
      (
        this.presentTodayCount() /
        total
      ) *
      100
    );
  }


  protected isLogisticsSection(
    section:
      string =
      this.activeSection()
  ): boolean {

    return section ===
      'logistics' ||
      section.startsWith(
        'logistics-'
      );
  }


  protected logisticsFeatureTabs(): Array<{
    id:
      string;

    label:
      string;

    icon:
      string;
  }> {

    return [
      {
        id:
          'logistics',

        label:
          'Overview',

        icon:
          'overview'
      },

      {
        id:
          'logistics-air-cargo',

        label:
          'Air Cargo',

        icon:
          'plane'
      },

      {
        id:
          'logistics-sea-freight',

        label:
          'Sea Freight',

        icon:
          'ship'
      },

      {
        id:
          'logistics-cha',

        label:
          'CHA',

        icon:
          'shield'
      },

      {
        id:
          'logistics-transporters',

        label:
          'Transporters',

        icon:
          'truck'
      },

      {
        id:
          'logistics-warehouse',

        label:
          'Warehouse',

        icon:
          'warehouse'
      },

      {
        id:
          'logistics-tracking',

        label:
          'Tracking',

        icon:
          'map'
      },

      {
        id:
          'logistics-documents',

        label:
          'Documents',

        icon:
          'document'
      },

      {
        id:
          'logistics-invoice',

        label:
          'Invoice',

        icon:
          'invoice'
      },

      {
        id:
          'logistics-vendor-payments',

        label:
          'Vendor Payments',

        icon:
          'currency'
      },

      {
        id:
          'logistics-customers',

        label:
          'Customers',

        icon:
          'people'
      },

      {
        id:
          'logistics-vendors',

        label:
          'Vendors',

        icon:
          'profile'
      },

      {
        id:
          'logistics-products-services',

        label:
          'Products / Services',

        icon:
          'package'
      },

      {
        id:
          'logistics-sales-report',

        label:
          'Sales Report',

        icon:
          'chart'
      },

      {
        id:
          'logistics-outstanding-report',

        label:
          'Outstanding Report',

        icon:
          'clock'
      },

      {
        id:
          'logistics-gst-report',

        label:
          'GST Report',

        icon:
          'invoice'
      },

      {
        id:
          'logistics-payments-report',

        label:
          'Payments Report',

        icon:
          'currency'
      }
    ];
  }


  protected loadLogisticsMonitor(): void {

    this.isLogisticsMonitorLoading.set(
      true
    );


    this.logisticsMonitorError.set(
      ''
    );


    const dateParams =
      this.logisticsDateParams();


    forkJoin({
      dashboard:
        this.api
          .get<any>(
            '/logistics/dashboard',
            dateParams
          )
          .pipe(
            catchError(
              () =>
                of(
                  null
                )
            )
          ),

      shipments:
        this.api
          .get<any>(
            '/logistics/shipments',
            {
              page:
                1,

              limit:
                100,

              sortBy:
                'createdAt',

              sortOrder:
                'desc',

              ...dateParams
            }
          )
          .pipe(
            catchError(
              () =>
                of(
                  null
                )
            )
          ),

      airCargoShipments:
        this.api
          .get<any>(
            '/logistics/shipments/air-cargo',
            {
              page:
                1,

              limit:
                100,

              sortBy:
                'createdAt',

              sortOrder:
                'desc',

              ...dateParams
            }
          )
          .pipe(
            catchError(
              () =>
                of(
                  null
                )
            )
          ),

      seaFreightShipments:
        this.api
          .get<any>(
            '/logistics/shipments/sea-freight',
            {
              page:
                1,

              limit:
                100,

              sortBy:
                'createdAt',

              sortOrder:
                'desc',

              ...dateParams
            }
          )
          .pipe(
            catchError(
              () =>
                of(
                  null
                )
            )
          ),

      documents:
        this.api
          .get<any>(
            '/logistics/documents',
            {
              page:
                1,

              limit:
                100,

              sortBy:
                'expiryDate',

              sortOrder:
                'asc',

              ...dateParams
            }
          )
          .pipe(
            catchError(
              () =>
                of(
                  null
                )
            )
          ),

      transporters:
        this.api
          .get<any>(
            '/logistics/transporters',
            {
              page:
                1,

              limit:
                100,

              ...dateParams
            }
          )
          .pipe(
            catchError(
              () =>
                of(
                  null
                )
            )
          ),

      invoices:
        this.api
          .get<any>(
            '/logistics/invoices',
            {
              page:
                1,

              limit:
                100,

              ...dateParams
            }
          )
          .pipe(
            catchError(
              () =>
                of(
                  null
                )
            )
          ),

      vendorPayments:
        this.api
          .get<any>(
            '/logistics/vendor-payments',
            {
              page:
                1,

              limit:
                100,

              ...dateParams
            }
          )
          .pipe(
            catchError(
              () =>
                of(
                  null
                )
            )
          ),

      cha:
        this.api
          .get<any>(
            '/logistics/cha',
            {
              page:
                1,

              limit:
                100,

              ...dateParams
            }
          )
          .pipe(
            catchError(
              () =>
                of(
                  null
                )
            )
          ),

      warehouse:
        this.api
          .get<any>(
            '/logistics/warehouse',
            {
              page:
                1,

              limit:
                100,

              ...dateParams
            }
          )
          .pipe(
            catchError(
              () =>
                of(
                  null
                )
            )
          ),

      customers:
        this.api
          .get<any>(
            '/logistics/customers',
            {
              page:
                1,

              limit:
                100,

              ...dateParams
            }
          )
          .pipe(
            catchError(
              () =>
                of(
                  null
                )
            )
          ),

      vendors:
        this.api
          .get<any>(
            '/logistics/vendors',
            {
              page:
                1,

              limit:
                100,

              ...dateParams
            }
          )
          .pipe(
            catchError(
              () =>
                of(
                  null
                )
            )
          ),

      productsServices:
        this.api
          .get<any>(
            '/logistics/products-services',
            {
              page:
                1,

              limit:
                100,

              ...dateParams
            }
          )
          .pipe(
            catchError(
              () =>
                of(
                  null
                )
            )
          )
    })
      .pipe(
        finalize(
          () =>
            this.isLogisticsMonitorLoading.set(
              false
            )
        )
      )
      .subscribe(
        (
          {
            dashboard,
            shipments,
            airCargoShipments,
            seaFreightShipments,
            documents,
            transporters,
            invoices,
            vendorPayments,
            cha,
            warehouse,
            customers,
            vendors,
            productsServices
          }
        ) => {

          const shipmentRows =
            this.uniqueLogisticsShipments(
              [
                ...this.responseRows<any>(
                  shipments,
                  [
                    'data',
                    'shipments',
                    'items'
                  ]
                ),

                ...this.responseRows<any>(
                  airCargoShipments,
                  [
                    'data',
                    'shipments',
                    'items'
                  ]
                ),

                ...this.responseRows<any>(
                  seaFreightShipments,
                  [
                    'data',
                    'shipments',
                    'items'
                  ]
                )
              ]
            );


          this.logisticsShipments.set(
            shipmentRows
          );


          this.logisticsDocuments.set(
            this.responseRows<any>(
              documents,
              [
                'documents',
                'data',
                'items'
              ]
            )
          );


          this.logisticsTransporters.set(
            this.responseRows<any>(
              transporters,
              [
                'transporters',
                'data',
                'items'
              ]
            )
          );


          this.logisticsInvoices.set(
            this.responseRows<any>(
              invoices,
              [
                'invoices',
                'data',
                'items'
              ]
            )
          );


          this.logisticsVendorPayments.set(
            this.responseRows<any>(
              vendorPayments,
              [
                'payments',
                'vendorPayments',
                'data',
                'items'
              ]
            )
          );


          this.logisticsChaRows.set(
            this.responseRows<any>(
              cha,
              [
                'cha',
                'agents',
                'data',
                'items'
              ]
            )
          );


          this.logisticsWarehouseRows.set(
            this.responseRows<any>(
              warehouse,
              [
                'warehouses',
                'warehouse',
                'data',
                'items'
              ]
            )
          );


          this.logisticsCustomers.set(
            this.responseRows<any>(
              customers,
              [
                'customers',
                'data',
                'items'
              ]
            )
          );


          this.logisticsVendors.set(
            this.responseRows<any>(
              vendors,
              [
                'vendors',
                'data',
                'items'
              ]
            )
          );


          this.logisticsProductsServices.set(
            this.responseRows<any>(
              productsServices,
              [
                'productsServices',
                'services',
                'data',
                'items'
              ]
            )
          );


          if (
            dashboard
          ) {

            this.logisticsMonitor.set({
              ...dashboard,

              ...this.toLogisticsMonitorData({
                data:
                  shipmentRows,

                pagination: {
                  total:
                    shipmentRows.length
                }
              }),

              recentShipments:
                dashboard.recentShipments?.length
                  ? dashboard.recentShipments
                  : shipmentRows.slice(
                      0,
                      8
                    )
            });
          }

          else if (
            shipmentRows.length
          ) {

            this.logisticsMonitor.set(
              this.toLogisticsMonitorData({
                data:
                  shipmentRows,

                pagination: {
                  total:
                    shipmentRows.length
                }
              })
            );
          }

          else {

            this.logisticsMonitor.set(
              null
            );

            this.logisticsMonitorError.set(
              'Unable to load Logistics monitoring data.'
            );
          }
        }
      );
  }


  protected logisticsMonitorMetrics(): Array<{
    label:
      string;

    value:
      string |
      number;

    icon:
      string;
  }> {

    const data =
      this.logisticsMonitor();


    return [
      {
        label:
          'Total Shipments',

        value:
          Number(
            data?.totalShipments ||
            0
          ),

        icon:
          'package'
      },

      {
        label:
          'Logistics Staff',

        value:
          this.logisticsStaffRows().length,

        icon:
          'people'
      },

      {
        label:
          'Air Cargo',

        value:
          Number(
            data?.airCargo ||
            this.logisticsModeCount(
              data,
              'air-cargo'
            )
          ),

        icon:
          'plane'
      },

      {
        label:
          'Sea Freight',

        value:
          Number(
            data?.seaFreight ||
            this.logisticsModeCount(
              data,
              'sea-freight'
            )
          ),

        icon:
          'ship'
      },

      {
        label:
          'In Transit',

        value:
          Number(
            data?.inTransit ||
            data?.byStatus?.['in-transit'] ||
            data?.byStatus?.['in_transit'] ||
            0
          ),

        icon:
          'map'
      },

      {
        label:
          'Alerts',

        value:
          Number(
            data?.hold ||
            0
          ) +
          this.logisticsIncidentRows().length,

        icon:
          'shield'
      },

      {
        label:
          'Delivered',

        value:
          Number(
            data?.delivered ||
            0
          ),

        icon:
          'check'
      },

      {
        label:
          'Revenue',

        value:
          this.formatCurrency(
            Number(
              data?.totalRevenue ||
              0
            )
          ),

        icon:
          'currency'
      }
    ];
  }


  protected logisticsRecentShipments(): any[] {

    return this.logisticsMonitor()?.recentShipments ||
      this.logisticsShipments()
        .slice(
          0,
          8
        );
  }


  protected applyLogisticsDateFilter(): void {

    this.loadLogisticsMonitor();
  }


  protected clearLogisticsDateFilter(): void {

    this.logisticsFromDate.set(
      ''
    );

    this.logisticsToDate.set(
      ''
    );

    this.loadLogisticsMonitor();
  }


  protected applySalesDateFilter(): void {

    this.loadCrm();
  }


  protected clearSalesDateFilter(): void {

    this.salesFromDate.set(
      ''
    );

    this.salesToDate.set(
      ''
    );

    this.loadCrm();
  }


  private logisticsDateParams(): Record<string, string> {

    return this.dateParams(
      this.logisticsFromDate(),
      this.logisticsToDate()
    );
  }


  private salesDateParams(): Record<string, string> {

    return this.dateParams(
      this.salesFromDate(),
      this.salesToDate()
    );
  }


  private dateParams(
    fromDate:
      string,

    toDate:
      string
  ): Record<string, string> {

    return {
      ...(
        fromDate
          ? {
              fromDate
            }
          : {}
      ),

      ...(
        toDate
          ? {
              toDate
            }
          : {}
      )
    };
  }


  protected logisticsStaffRows(): any[] {

    return this.employeeRows()
      .filter(
        (
          employee
        ) => {

          const department =
            employee.departmentId;


          const values = [
            department?.departmentName,
            department?.departmentCode,
            department?.featureKey,
            department?.dashboardKey,

            ...(
              department?.accessModules ||
              []
            ),

            employee.department
          ]
            .map(
              (
                value
              ) =>
                String(
                  value ||
                  ''
                )
                  .toLowerCase()
            );


          return values.some(
            (
              value
            ) =>
              value.includes(
                'logistics'
              )
          );
        }
      );
  }


  protected logisticsDailyWorkRows(): Array<{
    employeeName:
      string;

    employeeCode:
      string;

    trips:
      number;

    shipments:
      number;

    hours:
      string;

    modes:
      string;

    status:
      string;
  }> {

    const today =
      this.dayKey(
        new Date()
      );


    const rows =
      this.logisticsShipments()
        .filter(
          (
            shipment
          ) =>
            this.dayKey(
              shipment.createdAt
            ) ===
            today
        );


    return this.groupLogisticsShipmentsByEmployee(
      rows
    )
      .map(
        (
          row
        ) => ({
          employeeName:
            row.employeeName,

          employeeCode:
            row.employeeCode,

          trips:
            row.shipments,

          shipments:
            row.shipments,

          hours:
            row.shipments
              ? `${Math.max(1, row.shipments * 2)} hrs`
              : '0 hrs',

          modes:
            row.modes.join(', ') ||
            '-',

          status:
            row.statuses.join(', ') ||
            '-'
        })
      );
  }


  protected logisticsMonthlyPerformanceRows(): Array<{
    employeeName:
      string;

    employeeCode:
      string;

    deliveries:
      number;

    onTime:
      string;

    incidents:
      number;

    shipments:
      number;
  }> {

    const now =
      new Date();


    const rows =
      this.logisticsShipments()
        .filter(
          (
            shipment
          ) => {

            const date =
              new Date(
                shipment.createdAt ||
                ''
              );


            return date.getMonth() ===
              now.getMonth() &&
              date.getFullYear() ===
              now.getFullYear();
          }
        );


    return this.groupLogisticsShipmentsByEmployee(
      rows
    )
      .map(
        (
          row
        ) => ({
          employeeName:
            row.employeeName,

          employeeCode:
            row.employeeCode,

          deliveries:
            row.delivered,

          onTime:
            `${row.shipments ? Math.round((row.delivered / row.shipments) * 100) : 0}%`,

          incidents:
            row.incidents,

          shipments:
            row.shipments
        })
      );
  }


  protected logisticsShiftRosterRows(): Array<{
    employeeName:
      string;

    employeeCode:
      string;

    department:
      string;

    shift:
      string;

    schedule:
      string;

    status:
      string;
  }> {

    return this.logisticsStaffRows()
      .map(
        (
          employee
        ) => ({
          employeeName:
            this.employeeDisplay(
              employee
            ),

          employeeCode:
            employee.employeeCode ||
            '-',

          department:
            employee.departmentId?.departmentName ||
            employee.department ||
            'Logistics',

          shift:
            'General Shift',

          schedule:
            '09:30 - 18:30',

          status:
            employee.employeeStatus ||
            employee.status ||
            'active'
        })
      );
  }


  protected logisticsCertificationRows(): any[] {

    return this.logisticsDocuments()
      .filter(
        (
          doc
        ) =>
          /license|licence|cert|pass|driver|cha|airport|port/i
            .test(
              `${doc.documentType || ''} ${doc.documentName || ''}`
            )
      );
  }


  protected logisticsVehicleRows(): any[] {

    return this.logisticsTransporters();
  }


  protected logisticsIncidentRows(): any[] {

    return this.logisticsShipments()
      .filter(
        (
          shipment
        ) =>
          /hold|cancel|delay|damage|incident|spoil/i
            .test(
              String(
                shipment.status ||
                ''
              )
            )
      );
  }


  protected isLogisticsModuleSection(): boolean {

    return ![
      'logistics',
      'logistics-employees',
      'logistics-daily-work',
      'logistics-monthly-performance',
      'logistics-shift-roster',
      'logistics-certifications',
      'logistics-vehicle-assignment',
      'logistics-incidents'
    ]
      .includes(
        this.activeSection()
      );
  }


  protected logisticsModuleTitle(): string {

    return this.logisticsFeatureTabs()
      .find(
        (
          tab
        ) =>
          tab.id ===
          this.activeSection()
      )
      ?.label ||
      'Logistics';
  }


  protected logisticsModuleRows(): any[] {

    const section =
      this.activeSection();


    if (
      section ===
      'logistics-invoice' ||
      section ===
      'logistics-sales-report' ||
      section ===
      'logistics-gst-report'
    ) {

      return this.logisticsInvoices();
    }


    if (
      section ===
      'logistics-vendor-payments' ||
      section ===
      'logistics-payments-report' ||
      section ===
      'logistics-outstanding-report'
    ) {

      return this.logisticsVendorPayments();
    }


    if (
      section ===
      'logistics-air-cargo'
    ) {

      return this.logisticsShipments()
        .filter(
          (
            row
          ) =>
            this.normalizeLogisticsMode(
              row.shipmentMode
            ) ===
            'air-cargo'
        );
    }


    if (
      section ===
      'logistics-sea-freight'
    ) {

      return this.logisticsShipments()
        .filter(
          (
            row
          ) =>
            this.normalizeLogisticsMode(
              row.shipmentMode
            ) ===
            'sea-freight'
        );
    }


    if (
      section ===
      'logistics-tracking'
    ) {

      return this.logisticsShipments();
    }


    if (
      section ===
      'logistics-cha'
    ) {

      return this.logisticsChaRows();
    }


    if (
      section ===
      'logistics-transporters'
    ) {

      return this.logisticsTransporters();
    }


    if (
      section ===
      'logistics-warehouse'
    ) {

      return this.logisticsWarehouseRows();
    }


    if (
      section ===
      'logistics-documents'
    ) {

      return this.logisticsDocuments();
    }


    if (
      section ===
      'logistics-customers'
    ) {

      return this.logisticsCustomers();
    }


    if (
      section ===
      'logistics-vendors'
    ) {

      return this.logisticsVendors();
    }


    if (
      section ===
      'logistics-products-services'
    ) {

      return this.logisticsProductsServices();
    }


    return [];
  }


  protected logisticsModulePrimary(
    row: any
  ): string {

    return row?.shipmentNumber ||
      row?.invoiceNumber ||
      row?.paymentCode ||
      row?.transporterName ||
      row?.warehouseName ||
      row?.businessName ||
      row?.customerName ||
      row?.vendorName ||
      row?.productName ||
      row?.serviceName ||
      row?.documentName ||
      row?.chaName ||
      row?.name ||
      '-';
  }


  protected logisticsModuleSecondary(
    row: any
  ): string {

    return row?.customerName ||
      row?.vendor ||
      row?.vehicleNumber ||
      row?.documentType ||
      row?.email ||
      row?.mobile ||
      row?.status ||
      row?.createdAt ||
      '-';
  }


  protected logisticsModuleAmount(
    row: any
  ): string {

    const amount =
      row?.invoiceTotal ??
      row?.totalAmount ??
      row?.paidAmount ??
      row?.charges?.totalAmount ??
      row?.amount;


    return amount ===
      undefined ||
      amount ===
      null
        ? '-'
        : this.formatCurrency(
            Number(
              amount ||
              0
            )
          );
  }


  protected isLogisticsShipmentSection(): boolean {

    return [
      'logistics-air-cargo',
      'logistics-sea-freight',
      'logistics-tracking'
    ]
      .includes(
        this.activeSection()
      );
  }


  protected logisticsShipmentCustomer(
    row: any
  ): string {

    return row?.customerName ||
      row?.customerId?.customerName ||
      row?.customerId?.contactPerson ||
      '-';
  }


  protected logisticsShipmentRoute(
    row: any
  ): string {

    const origin =
      this.logisticsLocationLabel(
        row?.origin
      );


    const destination =
      this.logisticsLocationLabel(
        row?.destination
      );


    return `${origin} to ${destination}`;
  }


  protected logisticsShipmentCargo(
    row: any
  ): string {

    const cargo =
      row?.cargo ||
      {};


    const commodity =
      cargo.commodityOther ||
      cargo.commodity ||
      cargo.description ||
      '-';


    const packages =
      Number(
        cargo.packageCount ||
        0
      )
        ? `${cargo.packageCount} ${cargo.packageType || 'pkg'}`
        : '';


    const weight =
      Number(
        cargo.grossWeight ||
        0
      )
        ? `${cargo.grossWeight} ${cargo.weightUnit || ''}`.trim()
        : '';


    return [
      commodity,
      packages,
      weight
    ]
      .filter(
        Boolean
      )
      .join(
        ' / '
      ) ||
      '-';
  }


  protected logisticsShipmentCarrier(
    row: any
  ): string {

    if (
      this.normalizeLogisticsMode(
        row?.shipmentMode
      ) ===
      'air-cargo'
    ) {

      return row?.airFreight?.airlineOther ||
        row?.airFreight?.airline ||
        row?.airFreight?.awbNumber ||
        '-';
    }


    if (
      this.normalizeLogisticsMode(
        row?.shipmentMode
      ) ===
      'sea-freight'
    ) {

      return row?.seaFreight?.shippingLineOther ||
        row?.seaFreight?.shippingLine ||
        row?.seaFreight?.containerNumber ||
        row?.seaFreight?.blNumber ||
        '-';
    }


    return row?.transport?.transporterName ||
      row?.transport?.vehicleNumber ||
      '-';
  }


  protected logisticsShipmentTransport(
    row: any
  ): string {

    return row?.transport?.transporterName ||
      row?.transport?.vehicleNumber ||
      row?.transport?.driverName ||
      '-';
  }


  protected logisticsShipmentWarehouse(
    row: any
  ): string {

    return row?.warehouse?.warehouseName ||
      row?.warehouse?.warehouseId?.warehouseName ||
      row?.warehouse?.storageType ||
      '-';
  }


  protected logisticsShipmentCustoms(
    row: any
  ): string {

    return row?.customs?.chaName ||
      row?.customs?.chaVendorId?.vendorName ||
      row?.customs?.boeNumber ||
      row?.customs?.shippingBillNumber ||
      '-';
  }


  protected logisticsShipmentAssignee(
    row: any
  ): string {

    const assigned =
      row?.assignedTo;


    if (
      assigned &&
      typeof assigned ===
      'object'
    ) {

      return assigned.displayName ||
        [
          assigned.firstName,
          assigned.lastName
        ]
          .filter(
            Boolean
          )
          .join(
            ' '
          ) ||
        assigned.employeeCode ||
        '-';
    }


    return row?.assignedToName ||
      '-';
  }


  protected logisticsModeLabel(
    value?: string
  ): string {

    const mode =
      this.normalizeLogisticsMode(
        value
      );


    if (
      mode ===
      'air-cargo'
    ) {

      return 'Air Cargo';
    }


    if (
      mode ===
      'sea-freight'
    ) {

      return 'Sea Freight';
    }


    if (
      mode ===
      'road'
    ) {

      return 'Road Transport';
    }


    return value ||
      '-';
  }


  protected logisticsStatusLabel(
    value?: string
  ): string {

    const normalized =
      String(
        value ||
        ''
      )
        .trim()
        .replace(
          /[_-]+/g,
          ' '
        );


    return normalized
      ? normalized
          .split(
            ' '
          )
          .filter(
            Boolean
          )
          .map(
            (
              part
            ) =>
              part
                .charAt(0)
                .toUpperCase() +
              part.slice(
                1
              )
          )
          .join(
            ' '
          )
      : '-';
  }


  protected logisticsLocationLabel(
    value?: {
      name?: string;
      city?: string;
      country?: string;
    } |
    null
  ): string {

    return value?.city ||
      value?.name ||
      value?.country ||
      '-';
  }


  private toLogisticsMonitorData(
    response:
      any
  ): any {

    const rows =
      response?.data ||
      [];


    const byMode:
      Record<
        string,
        number
      > = {};


    const byStatus:
      Record<
        string,
        number
      > = {};


    let totalRevenue =
      0;


    rows.forEach(
      (
        row: any
      ) => {

        const mode =
          this.normalizeLogisticsMode(
            row.shipmentMode
          );


        const status =
          String(
            row.status ||
            ''
          )
            .trim();


        if (
          mode
        ) {

          byMode[mode] =
            (
              byMode[mode] ||
              0
            ) +
            1;
        }


        if (
          status
        ) {

          byStatus[status] =
            (
              byStatus[status] ||
              0
            ) +
            1;
        }


        totalRevenue +=
          Number(
            row.charges?.totalAmount ||
            0
          );
      }
    );


    return {
      totalShipments:
        Number(
          response?.pagination?.total ??
          rows.length
        ),

      totalRevenue,

      airCargo:
        byMode['air-cargo'] ||
        0,

      seaFreight:
        byMode['sea-freight'] ||
        0,

      road:
        byMode['road'] ||
        0,

      draft:
        byStatus['draft'] ||
        0,

      pending:
        (
          byStatus['booking_created'] ||
          0
        ) +
        (
          byStatus['pickup_pending'] ||
          0
        ) +
        (
          byStatus['documents_pending'] ||
          0
        ) +
        (
          byStatus['pending'] ||
          0
        ),

      inTransit:
        byStatus['in_transit'] ||
        byStatus['in-transit'] ||
        0,

      customs:
        byStatus['customs'] ||
        0,

      delivered:
        byStatus['delivered'] ||
        0,

      hold:
        byStatus['hold'] ||
        0,

      cancelled:
        byStatus['cancelled'] ||
        0,

      byMode,

      byStatus,

      recentShipments:
        rows.slice(
          0,
          8
        )
    };
  }


  private groupLogisticsShipmentsByEmployee(
    rows:
      any[]
  ): Array<{
    employeeName:
      string;

    employeeCode:
      string;

    shipments:
      number;

    delivered:
      number;

    incidents:
      number;

    modes:
      string[];

    statuses:
      string[];
  }> {

    const grouped =
      new Map<
        string,
        {
          employeeName:
            string;

          employeeCode:
            string;

          shipments:
            number;

          delivered:
            number;

          incidents:
            number;

          modes:
            Set<string>;

          statuses:
            Set<string>;
        }
      >();


    rows.forEach(
      (
        shipment
      ) => {

        const employee =
          typeof shipment.assignedTo ===
          'object' &&
          shipment.assignedTo
            ? shipment.assignedTo
            : null;


        const code =
          employee?.employeeCode ||
          'Unassigned';


        const name =
          employee?.displayName ||
          [
            employee?.firstName,
            employee?.lastName
          ]
            .filter(
              Boolean
            )
            .join(
              ' '
            ) ||
          code;


        const current =
          grouped.get(
            code
          ) || {
            employeeName:
              name,

            employeeCode:
              code,

            shipments:
              0,

            delivered:
              0,

            incidents:
              0,

            modes:
              new Set<string>(),

            statuses:
              new Set<string>()
          };


        current.shipments +=
          1;


        if (
          String(
            shipment.status ||
            ''
          )
            .toLowerCase() ===
          'delivered'
        ) {

          current.delivered +=
            1;
        }


        if (
          /hold|cancel|delay|damage|incident|spoil/i
            .test(
              String(
                shipment.status ||
                ''
              )
            )
        ) {

          current.incidents +=
            1;
        }


        current.modes.add(
          this.logisticsModeLabel(
            shipment.shipmentMode
          )
        );


        current.statuses.add(
          this.logisticsStatusLabel(
            shipment.status
          )
        );


        grouped.set(
          code,
          current
        );
      }
    );


    return Array.from(
      grouped.values()
    )
      .map(
        (
          row
        ) => ({
          ...row,

          modes:
            Array.from(
              row.modes
            ),

          statuses:
            Array.from(
              row.statuses
            )
        })
      );
  }


  private responseRows<T>(
    response:
      any,

    keys:
      string[]
  ): T[] {

    const containers = [
      response,
      response?.data,
      response?.result
    ];


    for (
      const container of containers
    ) {

      for (
        const key of keys
      ) {

        const value =
          container?.[key];


        if (
          Array.isArray(
            value
          )
        ) {

          return value;
        }
      }


      if (
        Array.isArray(
          container
        )
      ) {

        return container;
      }
    }


    return [];
  }


  private uniqueLogisticsShipments(
    rows:
      any[]
  ): any[] {

    const seen =
      new Set<string>();


    return rows.filter(
      (
        row,
        index
      ) => {

        const key =
          String(
            row?._id ||
            row?.shipmentNumber ||
            index
          )
            .trim();


        if (
          seen.has(
            key
          )
        ) {

          return false;
        }


        seen.add(
          key
        );


        return true;
      }
    );
  }


  private normalizeLogisticsMode(
    value?: string
  ): string {

    const mode =
      String(
        value ||
        ''
      )
        .trim()
        .toLowerCase()
        .replace(
          /_/g,
          '-'
        )
        .replace(
          /\s+/g,
          '-'
        );


    if (
      [
        'air',
        'air-cargo',
        'air-freight',
        'aircargo'
      ]
        .includes(
          mode
        )
    ) {

      return 'air-cargo';
    }


    if (
      [
        'sea',
        'sea-freight',
        'ocean',
        'ocean-freight',
        'seafreight'
      ]
        .includes(
          mode
        )
    ) {

      return 'sea-freight';
    }


    if (
      [
        'road',
        'road-transport',
        'surface',
        'truck'
      ]
        .includes(
          mode
        )
    ) {

      return 'road';
    }


    return mode;
  }


  private logisticsModeCount(
    data:
      any,

    mode:
      string
  ): number {

    const target =
      this.normalizeLogisticsMode(
        mode
      );


    return Object.entries(
      data?.byMode ||
      {}
    )
      .reduce(
        (
          total,
          [
            key,
            value
          ]
        ) =>
          this.normalizeLogisticsMode(
            key
          ) ===
          target
            ? total +
              Number(
                value ||
                0
              )
            : total,

        0
      );
  }


  protected logisticsIconClass(
    icon?: string
  ): string {

    return `icon-${String(icon || 'package')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}`;
  }


  protected sectionTitle(): string {

    return this.menuGroups
      .flatMap(
        (
          group
        ) =>
          group.items
      )
      .find(
        (
          item
        ) =>
          item.id ===
          this.activeSection()
      )
      ?.label ||
      'Overview';
  }


  /* ============================================================
     SIDEBAR SECTION CHANGE
  ============================================================ */

  protected setSection(
    section:
      string
  ): void {

    this.activeSection.set(
      section
    );


    this.message.set(
      ''
    );


    if (
      this.isLogisticsSection(
        section
      )
    ) {

      this.loadLogisticsMonitor();

      return;
    }


    switch (
      section
    ) {

      case 'overview':

        this.refresh();

        break;


      /* ========================================================
         CRM
      ======================================================== */

      case 'leads':

      case 'contacts':

      case 'accounts':

      case 'deals':

      case 'tasks':

      case 'quotations':

        this.loadCrm();

        break;


      case 'invoices':

      case 'payments':

      case 'expenses':

        this.loadAccounting();

        break;


      /* ========================================================
         ACCOUNTS
      ======================================================== */

      case 'accounts-dashboard':

      case 'accounts-chart-of-accounts':

        /*
         * Standalone Accounts components
         * handle their own page/API loading.
         */

        break;


      case 'accounts-sales-invoices':

      case 'accounts-payments':

      case 'accounts-expenses':

        this.loadAccounting();

        break;


      case 'accounts-customers':

      case 'accounts-vendors':

      case 'accounts-receipts':

      case 'accounts-credit-notes':

      case 'accounts-purchase-bills':

      case 'accounts-debit-notes':

      case 'accounts-journal':

      case 'accounts-general-ledger':

      case 'accounts-customer-ledger':

      case 'accounts-vendor-ledger':

      case 'accounts-cash-bank':

      case 'accounts-tax':

      case 'accounts-financial-reports':

      case 'accounts-settings':

        /*
         * Sidebar sections are ready.
         *
         * Their dedicated modules will be connected
         * as we implement each Accounts feature.
         */

        break;


      /* ========================================================
         HRM
      ======================================================== */

      case 'employees':

      case 'recruitment':

      case 'attendance':

      case 'leave':

      case 'payroll':

        this.loadHrm();

        break;


      case 'departments':

      case 'settings-departments':

      case 'roles':

      case 'leave-policy':

      case 'attendance-rules':

        this.loadEnterpriseData();

        break;


      case 'company-profile':

      case 'theme':

      case 'smtp':

        this.loadCompanyProfile();

        break;


      case 'all-users':

      case 'add-user':

      case 'blocked-users':

        this.loadHrUsers();

        break;


      case 'announcements':

      case 'meetings':

      case 'events':

      case 'holidays':

        this.loadCalendar();

        break;


      case 'messages':

        this.loadMessages();

        break;


      case 'notifications':

        this.loadNotifications(
          true
        );

        break;


      case 'current-plan':

      case 'upgrade-plan':

      case 'billing-history':

        this.loadBilling();

        break;


      case 'hr-reports':

      case 'crm-reports':

      case 'performance':

      case 'exports':

        this.loadHrm();

        this.loadCrm();

        this.loadAccounting();

        break;


      case 'profile':

        this.patchProfileFormFromUser();

        break;


      case 'change-password':

        this.passwordMessage.set(
          ''
        );

        break;
    }
  }


  private handleSectionError(
    section:
      string,

    error:
      any
  ): void {

    console.error(
      `[Company Admin][${section}] request failed`,
      {
        status:
          error?.status,

        url:
          error?.url,

        response:
          error?.error
      }
    );


    this.message.set(
      error?.error?.message ||
      error?.message ||
      `${section} data could not be loaded. HTTP ${error?.status || 'error'}`
    );
  }


  protected clearMessage(): void {

    this.message.set(
      ''
    );
  }


  protected goBack(): void {

    window.history.length >
    1
      ? window.history.back()
      : void this.router.navigate(
          [
            '/super-admin'
          ]
        );
  }


  protected logout(): void {

    this.auth.logout();
  }


  protected refresh(): void {

    this.loadCompanyProfile();

    this.loadHrUsers();

    this.loadEnterpriseData();

    this.loadNotifications(
      true
    );

    this.loadCrm();

    this.loadAccounting();

    this.loadHrm();

    this.loadCalendar();

    this.loadMessages();

    this.loadBilling();


    this.message.set(
      'Dashboard refreshed.'
    );
  }


  protected loadBilling(): void {

    this.isBillingLoading.set(
      true
    );


    this.api
      .get<{
        company?: CompanyProfile;
        plans?: BillingPlan[];
        offers?: PlanOffer[];
        payments?: SubscriptionPayment[];
        usage?: BillingUsage;
      }>(
        '/api/billing/my/subscription'
      )
      .pipe(
        catchError(
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) => {

            this.message.set(
              error.error?.message ||
              'Unable to load billing data.'
            );


            return of({
              company:
                undefined,

              plans:
                [],

              offers:
                [],

              payments:
                [],

              usage:
                {}
            });
          }
        ),

        finalize(
          () =>
            this.isBillingLoading.set(
              false
            )
        )
      )
      .subscribe(
        (
          data
        ) => {

          if (
            data.company
          ) {

            this.companyProfile.set(
              data.company
            );
          }


          this.billingPlans.set(
            data.plans ??
            []
          );


          this.billingOffers.set(
            data.offers ??
            []
          );


          this.billingPayments.set(
            data.payments ??
            []
          );


          this.billingUsage.set(
            data.usage ??
            {}
          );
        }
      );
  }


  protected currentPlan(): BillingPlan | undefined {

    const code =
      this.companyProfile()?.subscriptionPlan ||
      'basic';


    return this.billingPlans()
      .find(
        (
          plan
        ) =>
          plan.code ===
          code
      );
  }


  protected limitLabel(
    value?: number
  ): string {

    return Number(
      value
    ) <
    0
      ? 'Unlimited'
      : String(
          value ??
          0
        );
  }


  protected usagePercent(
    used =
      0,

    limit =
      0
  ): number {

    if (
      limit <
      0
    ) {

      return 100;
    }


    if (
      !limit
    ) {

      return 0;
    }


    return Math.min(
      100,

      Math.round(
        (
          used /
          limit
        ) *
        100
      )
    );
  }


  protected planActionType(
    plan:
      BillingPlan
  ): 'current' |
    'upgrade' |
    'downgrade' |
    'renew' {

    const currentCode =
      this.companyProfile()?.subscriptionPlan ||
      'basic';


    const nextRank =
      this.planRank(
        plan.code
      );


    const currentRank =
      this.planRank(
        currentCode
      );


    if (
      plan.code ===
      currentCode
    ) {

      return 'renew';
    }


    return nextRank >
      currentRank
        ? 'upgrade'
        : 'downgrade';
  }


  protected planActionLabel(
    plan:
      BillingPlan
  ): string {

    const action =
      this.planActionType(
        plan
      );


    if (
      action ===
      'renew'
    ) {

      return 'Current plan renewal';
    }


    return action ===
      'upgrade'
        ? 'Upgrade available'
        : 'Downgrade available';
  }


  protected planButtonLabel(
    plan:
      BillingPlan
  ): string {

    const action =
      this.planActionType(
        plan
      );


    if (
      action ===
      'renew'
    ) {

      return 'Renew Current Plan';
    }


    return action ===
      'upgrade'
        ? `Upgrade to ${plan.name}`
        : `Downgrade to ${plan.name}`;
  }


  protected latestBillingPayment(): SubscriptionPayment | undefined {

    return this.billingPayments()[0];
  }


  protected clearBillingMessage(): void {

    this.billingMessage.set(
      ''
    );
  }


  private planRank(
    code?: string
  ): number {

    const ranks:
      Record<
        string,
        number
      > = {
        basic:
          1,

        standard:
          2,

        business:
          3
      };


    return ranks[
      String(
        code ||
        ''
      )
        .toLowerCase()
    ] ||
    0;
  }


  protected activeOfferLabel(
    plan:
      BillingPlan
  ): string {

    const offer =
      plan.activeOffer;


    if (
      !offer
    ) {

      return '';
    }


    const value =
      offer.discountType ===
      'flat'
        ? this.formatCurrency(
            Number(
              offer.discountValue ||
              0
            )
          )
        : `${offer.discountValue || 0}%`;


    return `${value} off with ${offer.code}`;
  }


  protected buyPlan(
    plan:
      BillingPlan
  ): void {

    if (
      this.isCheckoutLoading()
    ) {

      return;
    }


    this.isCheckoutLoading.set(
      true
    );


    this.billingMessage.set(
      ''
    );


    this.message.set(
      ''
    );


    this.api
      .post<{
        order?: any;
        keyId?: string;
        plan?: BillingPlan;
        offer?: PlanOffer;
        changeType?: string;
      }>(
        '/api/billing/checkout/order',

        {
          planCode:
            plan.code,

          offerCode:
            plan.activeOffer?.code ||
            ''
        }
      )
      .pipe(
        finalize(
          () =>
            this.isCheckoutLoading.set(
              false
            )
        )
      )
      .subscribe({
        next:
          (
            data
          ) =>
            this.openRazorpayCheckout(
              data,
              plan
            ),

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) => {

            this.billingMessage.set(
              error.error?.message ||
              'Unable to start Razorpay checkout.'
            );
          }
      });
  }


  private openRazorpayCheckout(
    data: {
      order?: any;
      keyId?: string;
      plan?: BillingPlan;
    },

    plan:
      BillingPlan
  ): void {

    const order =
      data.order;


    if (
      !order
    ) {

      this.billingMessage.set(
        'Razorpay order could not be created.'
      );

      return;
    }


    const verify =
      (
        payload:
          Record<
            string,
            unknown
          >
      ) => {

        this.api
          .post(
            '/api/billing/checkout/verify',
            payload
          )
          .subscribe({
            next:
              () => {

                this.billingMessage.set(
                  `${plan.name} plan activated successfully.`
                );


                this.loadBilling();

                this.loadCompanyProfile();
              },

            error:
              (
                error: {
                  error?: {
                    message?: string;
                  };
                }
              ) =>
                this.billingMessage.set(
                  error.error?.message ||
                  'Payment verification failed.'
                )
          });
      };


    if (
      order.gatewayMode ===
      'demo' ||
      !window.Razorpay
    ) {

      verify({
        orderId:
          order.id,

        paymentId:
          `demo_payment_${Date.now()}`
      });


      return;
    }


    const checkout =
      new window.Razorpay({
        key:
          data.keyId,

        amount:
          order.amount,

        currency:
          'INR',

        name:
          'Opas Bizz Pvt. Ltd.',

        description:
          `${plan.name} subscription`,

        image:
          '/brand/opasbizz-crm.webp',

        order_id:
          order.id,

        handler:
          verify,

        prefill: {
          name:
            this.userName(),

          email:
            this.userEmail()
        },

        theme: {
          color:
            '#C1121F'
        }
      });


    checkout.open();
  }


  protected hasRevenueTrendData(): boolean {

    return this.revenueTrend()
      .some(
        (
          month
        ) =>
          month.value >
          0
      );
  }


  protected revenueTrend(): {
    label:
      string;

    value:
      number;

    percent:
      number;
  }[] {

    const months =
      this.lastMonths(
        6
      );


    const totals =
      new Map(
        months.map(
          (
            month
          ) => [
            month.key,
            0
          ]
        )
      );


    const addRevenue =
      (
        row:
          any,

        amount:
          number
      ): void => {

        if (
          !amount
        ) {

          return;
        }


        const key =
          this.monthKey(
            row?.paidAt ||
            row?.paymentDate ||
            row?.closedAt ||
            row?.createdAt ||
            row?.updatedAt ||
            row?.expectedClose
          );


        if (
          !key ||
          !totals.has(
            key
          )
        ) {

          return;
        }


        totals.set(
          key,

          (
            totals.get(
              key
            ) ||
            0
          ) +
          amount
        );
      };


    this.accountPayments()
      .forEach(
        (
          payment
        ) =>
          addRevenue(
            payment,

            Number(
              payment.paidAmount ??
              payment.amount ??
              payment.paymentAmount ??
              0
            )
          )
      );


    this.crmDeals()
      .forEach(
        (
          deal
        ) => {

          const status =
            String(
              deal.stage ||
              deal.status ||
              ''
            )
              .toLowerCase();


          if (
            status.includes(
              'won'
            )
          ) {

            addRevenue(
              deal,

              Number(
                deal.value ??
                deal.amount ??
                0
              )
            );
          }
        }
      );


    const max =
      Math.max(
        ...Array.from(
          totals.values()
        ),

        1
      );


    return months.map(
      (
        month
      ) => {

        const value =
          totals.get(
            month.key
          ) ||
          0;


        return {
          label:
            month.label,

          value,

          percent:
            value
              ? Math.max(
                  12,

                  Math.round(
                    (
                      value /
                      max
                    ) *
                    100
                  )
                )
              : 0
        };
      }
    );
  }


  protected hasAttendanceTrendData(): boolean {

    return this.attendanceTrend()
      .some(
        (
          day
        ) =>
          day.value >
          0
      );
  }


  protected attendanceTrend(): {
    label:
      string;

    value:
      number;

    percent:
      number;
  }[] {

    const days =
      this.lastDays(
        6
      );


    const total =
      Math.max(
        this.totalEmployees(),
        1
      );


    const presentByDay =
      new Map(
        days.map(
          (
            day
          ) => [
            day.key,
            0
          ]
        )
      );


    const rows = [
      ...this.attendanceMonth(),
      ...this.attendanceToday()
    ];


    rows.forEach(
      (
        row
      ) => {

        const key =
          this.dayKey(
            row?.attendanceDate ||
            row?.date ||
            row?.createdAt ||
            row?.updatedAt
          );


        if (
          !key ||
          !presentByDay.has(
            key
          )
        ) {

          return;
        }


        const status =
          String(
            row?.status ||
            row?.attendanceStatus ||
            ''
          )
            .toLowerCase();


        if (
          !status ||
          status.includes(
            'present'
          ) ||
          status ===
          'p'
        ) {

          presentByDay.set(
            key,

            (
              presentByDay.get(
                key
              ) ||
              0
            ) +
            1
          );
        }
      }
    );


    return days.map(
      (
        day
      ) => {

        const value =
          Math.min(
            100,

            Math.round(
              (
                (
                  presentByDay.get(
                    day.key
                  ) ||
                  0
                ) /
                total
              ) *
              100
            )
          );


        return {
          label:
            day.label,

          value,

          percent:
            value
              ? Math.max(
                  12,
                  value
                )
              : 0
        };
      }
    );
  }


  private lastMonths(
    count:
      number
  ): {
    key:
      string;

    label:
      string;
  }[] {

    const formatter =
      new Intl.DateTimeFormat(
        'en',
        {
          month:
            'short'
        }
      );


    return Array.from(
      {
        length:
          count
      },

      (
        _,
        index
      ) => {

        const date =
          new Date();


        date.setDate(
          1
        );


        date.setMonth(
          date.getMonth() -
          (
            count -
            1 -
            index
          )
        );


        return {
          key:
            this.monthKey(
              date
            ) ||
            '',

          label:
            formatter.format(
              date
            )
        };
      }
    );
  }


  private lastDays(
    count:
      number
  ): {
    key:
      string;

    label:
      string;
  }[] {

    const formatter =
      new Intl.DateTimeFormat(
        'en',
        {
          weekday:
            'short'
        }
      );


    return Array.from(
      {
        length:
          count
      },

      (
        _,
        index
      ) => {

        const date =
          new Date();


        date.setDate(
          date.getDate() -
          (
            count -
            1 -
            index
          )
        );


        return {
          key:
            this.dayKey(
              date
            ) ||
            '',

          label:
            formatter.format(
              date
            )
        };
      }
    );
  }


  private monthKey(
    value:
      unknown
  ): string {

    const date =
      this.toDate(
        value
      );


    if (
      !date
    ) {

      return '';
    }


    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }


  private dayKey(
    value:
      unknown
  ): string {

    const date =
      this.toDate(
        value
      );


    if (
      !date
    ) {

      return '';
    }


    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }


  private toDate(
    value:
      unknown
  ): Date | null {

    if (
      !value
    ) {

      return null;
    }


    const date =
      value instanceof
      Date
        ? value
        : new Date(
            String(
              value
            )
          );


    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  }


  protected departmentDistribution(): {
    label:
      string;

    value:
      number;

    percent:
      number;
  }[] {

    const users =
      this.companyUsers().length
        ? this.companyUsers()
        : this.hrUsers();


    const counts =
      users.reduce<
        Record<
          string,
          number
        >
      >(
        (
          total,
          user
        ) => {

          const department =
            user.department ||
            'Unassigned';


          total[department] =
            (
              total[department] ||
              0
            ) +
            1;


          return total;
        },

        {}
      );


    const max =
      Math.max(
        ...Object.values(
          counts
        ),

        1
      );


    return Object.entries(
      counts
    )
      .map(
        (
          [
            label,
            value
          ]
        ) => ({
          label,

          value,

          percent:
            Math.max(
              8,

              Math.round(
                (
                  value /
                  max
                ) *
                100
              )
            )
        })
      );
  }


  protected recentActivity(): {
    title:
      string;

    meta:
      string;

    status:
      string;
  }[] {

    const users = [
      ...this.companyUsers(),
      ...this.hrUsers()
    ]
      .filter(
        (
          user,
          index,
          rows
        ) =>
          rows.findIndex(
            (
              row
            ) =>
              (
                row._id ||
                row.email
              ) ===
              (
                user._id ||
                user.email
              )
          ) ===
          index
      )
      .slice(
        0,
        5
      )
      .map(
        (
          user
        ) => ({
          title:
            `${user.name || user.email || 'User'} added`,

          meta:
            `${this.roleLabel(user.role)} • ${user.department || 'No department'}`,

          status:
            user.status ||
            'active'
        })
      );


    const departments =
      this.departments()
        .slice(
          0,
          2
        )
        .map(
          (
            department
          ) => ({
            title:
              `${department.departmentName || 'Department'} configured`,

            meta:
              department.departmentCode ||
              'Department setup',

            status:
              department.isCustom
                ? 'custom'
                : 'default'
          })
        );


    return [
      ...users,
      ...departments
    ]
      .slice(
        0,
        6
      );
  }


  protected formatCurrency(
    value:
      number
  ): string {

    return new Intl.NumberFormat(
      'en-IN',
      {
        currency:
          'INR',

        maximumFractionDigits:
          0,

        style:
          'currency'
      }
    )
      .format(
        value
      );
  }


  protected hrReportCards(): {
    label:
      string;

    value:
      string;

    meta:
      string;
  }[] {

    return [
      {
        label:
          'Employees',

        value:
          String(
            this.employeeRows().length
          ),

        meta:
          `${this.activeEmployees()} active`
      },

      {
        label:
          'Today Attendance',

        value:
          `${this.attendancePercent()}%`,

        meta:
          `${this.presentTodayCount()} present`
      },

      {
        label:
          'Leave Requests',

        value:
          String(
            this.leaveMonth().length
          ),

        meta:
          `${this.pendingLeaveCount()} pending`
      },

      {
        label:
          'Payroll Net',

        value:
          this.formatCurrency(
            this.payrollNetTotal()
          ),

        meta:
          `${this.payslips().length} payslips`
      },

      {
        label:
          'Recruitment',

        value:
          String(
            this.recruitmentCandidates().length
          ),

        meta:
          `${this.recruitmentOpenJobs()} open jobs`
      },

      {
        label:
          'Holidays',

        value:
          String(
            this.holidays().length
          ),

        meta:
          `${this.meetings().length} meetings`
      }
    ];
  }


  protected crmReportCards(): {
    label:
      string;

    value:
      string;

    meta:
      string;
  }[] {

    return [
      {
        label:
          'Leads',

        value:
          String(
            this.crmLeads().length
          ),

        meta:
          `${this.crmLeadSummary().todayCount || 0} today`
      },

      {
        label:
          'Pipeline',

        value:
          this.formatCurrency(
            this.crmPipelineValue()
          ),

        meta:
          `${this.crmDeals().length} deals`
      },

      {
        label:
          'Won Revenue',

        value:
          this.formatCurrency(
            this.wonRevenueThisMonth()
          ),

        meta:
          'This month'
      },

      {
        label:
          'Quotations',

        value:
          this.formatCurrency(
            this.quotationValue()
          ),

        meta:
          `${this.crmQuotations().length} quotes`
      },

      {
        label:
          'Receivable',

        value:
          this.formatCurrency(
            this.accountReceivableTotal()
          ),

        meta:
          `${this.pendingInvoiceCount()} pending invoices`
      },

      {
        label:
          'Expenses',

        value:
          this.formatCurrency(
            this.accountExpenseTotal()
          ),

        meta:
          `${this.accountExpenses().length} rows`
      }
    ];
  }


  protected performanceRows(): {
    name:
      string;

    code:
      string;

    department:
      string;

    attendance:
      number;

    leads:
      number;

    deals:
      number;

    tasks:
      number;

    revenue:
      number;

    score:
      number;
  }[] {

    const attendanceByCode =
      new Map<
        string,
        number
      >();


    this.attendanceMonth()
      .forEach(
        (
          row
        ) => {

          const code =
            this.employeeCode(
              row
            );


          if (
            String(
              row.status ||
              ''
            )
              .toLowerCase() ===
            'present'
          ) {

            attendanceByCode.set(
              code,

              (
                attendanceByCode.get(
                  code
                ) ||
                0
              ) +
              1
            );
          }
        }
      );


    return this.employeeRows()
      .map(
        (
          employee
        ) => {

          const code =
            employee.employeeCode ||
            this.employeeCode(
              employee
            );


          const leads =
            this.crmLeads()
              .filter(
                (
                  row
                ) =>
                  row.assignedEmployeeCode ===
                  code
              )
              .length;


          const deals =
            this.crmDeals()
              .filter(
                (
                  row
                ) =>
                  row.assignedEmployeeCode ===
                  code
              )
              .length;


          const doneTasks =
            this.crmTasks()
              .filter(
                (
                  row
                ) =>
                  row.assignedEmployeeCode ===
                  code &&
                  String(
                    row.status
                  )
                    .toLowerCase() ===
                  'done'
              )
              .length;


          const revenue =
            this.crmDeals()
              .filter(
                (
                  row
                ) =>
                  row.assignedEmployeeCode ===
                  code &&
                  String(
                    row.stage
                  )
                    .toLowerCase() ===
                  'won'
              )
              .reduce(
                (
                  sum,
                  row
                ) =>
                  sum +
                  Number(
                    row.value ||
                    0
                  ),

                0
              );


          const attendance =
            attendanceByCode.get(
              code
            ) ||
            0;


          const score =
            Math.min(
              100,

              Math.round(
                attendance *
                2 +
                leads *
                4 +
                deals *
                8 +
                doneTasks *
                5 +
                revenue /
                10000
              )
            );


          return {
            name:
              this.employeeDisplay(
                employee
              ),

            code,

            department:
              employee.departmentId?.departmentName ||
              employee.department ||
              'Unassigned',

            attendance,

            leads,

            deals,

            tasks:
              doneTasks,

            revenue,

            score
          };
        }
      )
      .sort(
        (
          a,
          b
        ) =>
          b.score -
          a.score ||
          a.name.localeCompare(
            b.name
          )
      );
  }


  protected exportReport(
    type:
      'hr' |
      'crm' |
      'performance',

    format:
      'csv' |
      'json' =
      'csv'
  ): void {

    this.api
      .getBlob(
        `/company/reports/export?type=${type}&format=${format}`
      )
      .subscribe({
        next:
          (
            blob
          ) => {

            const url =
              URL.createObjectURL(
                blob
              );


            const anchor =
              document.createElement(
                'a'
              );


            anchor.href =
              url;


            anchor.download =
              `company-${type}-report.${format === 'json' ? 'json' : 'csv'}`;


            anchor.click();


            URL.revokeObjectURL(
              url
            );


            this.message.set(
              `${type.toUpperCase()} report exported.`
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to export report.'
            )
      });
  }


  protected printReport(): void {

    window.print();
  }


  protected phaseLabel(): string {

    return [
      'overview',
      'leads',
      'contacts',
      'deals',
      'invoices',
      'employees',
      'attendance',
      'leave',
      'company-profile',
      'settings-departments',
      'all-users',
      'add-user',
      'accounts-dashboard',
      'accounts-chart-of-accounts'
    ]
      .includes(
        this.activeSection()
      )
      ? 'Phase 1'
      : 'Phase 2';
  }


  /* ============================================================
     PLACEHOLDER CONTENT
  ============================================================ */

  protected placeholderRows(): string[] {

    const rows:
      Record<
        string,
        string[]
      > = {

      leads: [
        'Lead list',
        'Source tracking',
        'Lead conversion'
      ],

      contacts: [
        'Contact list',
        'Company mapping',
        'Follow-up history'
      ],

      accounts: [
        'Account list',
        'GST details',
        'Relationship owner'
      ],

      deals: [
        'Pipeline board',
        'Deal stages',
        'Won/lost tracking'
      ],

      quotations: [
        'Quotation list',
        'Create quotation',
        'Approval status'
      ],

      invoices: [
        'Pending invoices',
        'Paid invoices',
        'Invoice amount'
      ],

      payments: [
        'Payment received',
        'Payment failed',
        'Gateway reference'
      ],

      expenses: [
        'Expense list',
        'Approval flow',
        'Monthly spend'
      ],


      /* ========================================================
         ACCOUNTS PLACEHOLDERS
      ======================================================== */

      'accounts-customers': [
        'Customer accounts',
        'Receivable balance',
        'Transaction history'
      ],

      'accounts-vendors': [
        'Vendor accounts',
        'Payable balance',
        'Transaction history'
      ],

      'accounts-sales-invoices': [
        'Sales invoices',
        'Invoice status',
        'Outstanding amount'
      ],

      'accounts-receipts': [
        'Customer receipts',
        'Payment mode',
        'Receipt references'
      ],

      'accounts-credit-notes': [
        'Credit note list',
        'Customer adjustment',
        'Reference invoice'
      ],

      'accounts-purchase-bills': [
        'Purchase bills',
        'Vendor invoices',
        'Outstanding payable'
      ],

      'accounts-payments': [
        'Vendor payments',
        'Payment mode',
        'Payment references'
      ],

      'accounts-debit-notes': [
        'Debit note list',
        'Vendor adjustment',
        'Reference bill'
      ],

      'accounts-expenses': [
        'Expense transactions',
        'Expense category',
        'Payment status'
      ],

      'accounts-journal': [
        'Journal entries',
        'Debit / Credit',
        'Posting status'
      ],

      'accounts-general-ledger': [
        'Account ledger',
        'Debit / Credit transactions',
        'Running balance'
      ],

      'accounts-customer-ledger': [
        'Customer ledger',
        'Invoices & receipts',
        'Outstanding balance'
      ],

      'accounts-vendor-ledger': [
        'Vendor ledger',
        'Bills & payments',
        'Outstanding payable'
      ],

      'accounts-cash-bank': [
        'Cash accounts',
        'Bank accounts',
        'Bank transactions'
      ],

      'accounts-tax': [
        'GST accounts',
        'Input GST',
        'Output GST'
      ],

      'accounts-financial-reports': [
        'Trial Balance',
        'Profit & Loss',
        'Balance Sheet'
      ],

      'accounts-settings': [
        'Financial year',
        'Invoice settings',
        'Accounting preferences'
      ],


      recruitment: [
        'Job postings',
        'Candidates',
        'Interview pipeline'
      ],

      payroll: [
        'Salary structure',
        'Payslips',
        'Payroll processing'
      ],

      'hr-reports': [
        'Attendance report',
        'Leave report',
        'Payroll summary'
      ],

      'crm-reports': [
        'Sales performance',
        'Revenue report',
        'Lead conversion'
      ],

      performance: [
        'Employee scorecard',
        'Manager review',
        'Goal tracking'
      ],

      exports: [
        'PDF export',
        'Excel export',
        'Scheduled reports'
      ],

      announcements: [
        'Company notices',
        'Audience targeting',
        'Publish history'
      ],

      messages: [
        'Internal chat',
        'Team rooms',
        'Read receipts'
      ],

      notifications: [
        'Notification center',
        'Templates',
        'Delivery status'
      ],

      meetings: [
        'Meeting list',
        'Room links',
        'Participants'
      ],

      events: [
        'Company events',
        'Calendar sync',
        'RSVP status'
      ],

      holidays: [
        'Holiday calendar',
        'Optional holidays',
        'Region mapping'
      ],

      roles: [
        'HR role',
        'Manager role',
        'Employee role'
      ],

      'leave-policy': [
        'Leave types',
        'Approval levels',
        'Carry forward'
      ],

      'attendance-rules': [
        'Shift timing',
        'Late marking',
        'Regularization'
      ],

      smtp: [
        'SMTP host',
        'Sender email',
        'Test email'
      ],

      'current-plan': [
        'Plan details',
        'Usage limits',
        'Renewal date'
      ],

      'upgrade-plan': [
        'Plan comparison',
        'Upgrade request',
        'Downgrade request'
      ],

      'billing-history': [
        'Platform invoices',
        'Payment history',
        'Receipts'
      ],

      profile: [
        'Profile settings',
        'Contact details',
        'Login activity'
      ],

      'change-password': [
        'Current password',
        'New password',
        'Session reset'
      ]
    };


    return rows[
      this.activeSection()
    ] || [
      'Workspace list',
      'Filters',
      'Actions'
    ];
  }


  protected openHrDashboard(): void {

    const companyId =
      this.selectedCompanyId();


    void this.router.navigate(
      [
        '/hr-dashboard'
      ],

      {
        queryParams:
          companyId
            ? {
                companyId
              }
            : {}
      }
    );
  }


  protected toggleHrPassword(): void {

    this.isHrPasswordVisible.update(
      (
        isVisible
      ) =>
        !isVisible
    );
  }


  protected loadHrUsers(): void {

    const query:
      Record<
        string,
        string |
        number
      > = {
        limit:
          100
      };


    const companyId =
      this.selectedCompanyId();


    if (
      companyId
    ) {

      query['companyId'] =
        companyId;
    }


    this.api
      .get<{
        users?: UserRow[];
      }>(
        '/users',
        query
      )
      .pipe(
        catchError(
          () =>
            of({
              users: []
            })
        )
      )
      .subscribe(
        (
          data
        ) => {

          const users =
            data.users ??
            [];


          this.companyUsers.set(
            users
          );


          this.hrUsers.set(
            users.filter(
              (
                user
              ) =>
                user.role ===
                'hr'
            )
          );
        }
      );
  }


  protected loadEnterpriseData(): void {

    forkJoin({
      departments:
        this.api
          .get<DepartmentRow[]>(
            '/company-settings/departments'
          )
          .pipe(
            catchError(
              () =>
                of(
                  []
                )
            )
          ),

      designations:
        this.api
          .get<DesignationRow[]>(
            '/company-settings/designations'
          )
          .pipe(
            catchError(
              () =>
                of(
                  []
                )
            )
          ),

      roles:
        this.api
          .get<{
            roles?: RoleRow[];
          }>(
            '/api/company/roles'
          )
          .pipe(
            catchError(
              () =>
                of({
                  roles: []
                })
            )
          ),

      tree:
        this.api
          .get<{
            tree?: OrgNode[];
          }>(
            '/api/company/org-chart'
          )
          .pipe(
            catchError(
              () =>
                of({
                  tree: []
                })
            )
          ),

      leavePolicies:
        this.api
          .get<{
            leavePolicies?: any[];
          }>(
            '/hr/leave/policies',
            {
              limit:
                100
            }
          )
          .pipe(
            catchError(
              () =>
                of({
                  leavePolicies: []
                })
            )
          ),

      attendancePolicies:
        this.api
          .get<{
            attendancePolicies?: any[];
          }>(
            '/hr/attendance/policies',
            {
              limit:
                100
            }
          )
          .pipe(
            catchError(
              () =>
                of({
                  attendancePolicies: []
                })
            )
          )
    })
      .subscribe(
        (
          {
            departments,
            designations,
            roles,
            tree,
            leavePolicies,
            attendancePolicies
          }
        ) => {

          this.departments.set(
            departments ??
            []
          );


          this.designations.set(
            designations ??
            []
          );


          this.roles.set(
            roles.roles ??
            []
          );


          this.orgTree.set(
            tree.tree ??
            []
          );


          this.leavePolicies.set(
            leavePolicies.leavePolicies ??
            []
          );


          this.attendancePolicies.set(
            attendancePolicies.attendancePolicies ??
            []
          );
        }
      );
  }


  protected createDepartment(): void {

    const payload =
      this.departmentPayload();


    if (
      !payload.departmentName ||
      !payload.departmentCode ||
      this.departmentForm.invalid ||
      this.isDepartmentSaving()
    ) {

      this.departmentForm
        .markAllAsTouched();


      this.message.set(
        'Department name and code are required.'
      );


      return;
    }


    this.isDepartmentSaving.set(
      true
    );


    this.api
      .post<DepartmentRow>(
        '/company-settings/departments',

        this.departmentCreatePayload(
          payload
        )
      )
      .pipe(
        finalize(
          () =>
            this.isDepartmentSaving.set(
              false
            )
        )
      )
      .subscribe({
        next:
          () => {

            this.departmentForm.reset({
              departmentName:
                '',

              departmentCode:
                '',

              featureKey:
                'none',

              description:
                ''
            });


            this.loadEnterpriseData();


            this.message.set(
              'Department added.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
                errors?: {
                  message?: string;
                }[];
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              error.error?.errors?.[0]?.message ||
              'Unable to add department.'
            )
      });
  }


  private departmentPayload(): {
    departmentName:
      string;

    departmentCode:
      string;

    featureKey:
      string;

    description:
      string;
  } {

    const value =
      this.departmentForm
        .getRawValue();


    return {
      departmentName:
        value.departmentName
          .trim(),

      departmentCode:
        value.departmentCode
          .trim()
          .toUpperCase(),

      featureKey:
        value.featureKey ||
        'none',

      description:
        value.description
          .trim()
    };
  }


  private departmentCreatePayload(
    payload: {
      departmentName:
        string;

      departmentCode:
        string;
    }
  ): {
    departmentName:
      string;

    departmentCode:
      string;
  } {

    return {
      departmentName:
        payload.departmentName,

      departmentCode:
        payload.departmentCode
    };
  }


  protected updateDepartment(
    row:
      DepartmentRow
  ): void {

    const departmentName =
      window.prompt(
        'Department name',
        row.departmentName ||
        ''
      );


    if (
      !row._id ||
      !departmentName
    ) {

      return;
    }


    this.api
      .patch<DepartmentRow>(
        `/company-settings/departments/${row._id}`,

        {
          departmentName
        }
      )
      .subscribe({
        next:
          () => {

            this.loadEnterpriseData();

            this.message.set(
              'Department updated.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to update department.'
            )
      });
  }


  protected deleteDepartment(
    row:
      DepartmentRow
  ): void {

    if (
      !row._id ||
      !confirm(
        `Delete department ${row.departmentName || ''}?`
      )
    ) {

      return;
    }


    this.api
      .delete(
        `/company-settings/departments/${row._id}`
      )
      .subscribe({
        next:
          () => {

            this.loadEnterpriseData();

            this.message.set(
              'Department deleted.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to delete department.'
            )
      });
  }


  protected createDesignation(): void {

    if (
      this.designationForm.invalid
    ) {

      this.designationForm
        .markAllAsTouched();

      return;
    }


    this.api
      .post<DesignationRow>(
        '/company-settings/designations',

        this.designationForm
          .getRawValue()
      )
      .subscribe({
        next:
          () => {

            this.designationForm.reset({
              designationName:
                '',

              designationCode:
                '',

              departmentCode:
                '',

              level:
                1,

              description:
                ''
            });


            this.loadEnterpriseData();


            this.message.set(
              'Designation added.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to add designation.'
            )
      });
  }


  protected updateDesignation(
    row:
      DesignationRow
  ): void {

    const designationName =
      window.prompt(
        'Designation name',
        row.designationName ||
        ''
      );


    if (
      !row._id ||
      !designationName
    ) {

      return;
    }


    this.api
      .patch<DesignationRow>(
        `/company-settings/designations/${row._id}`,

        {
          designationName
        }
      )
      .subscribe({
        next:
          () => {

            this.loadEnterpriseData();

            this.message.set(
              'Designation updated.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to update designation.'
            )
      });
  }


  protected deleteDesignation(
    row:
      DesignationRow
  ): void {

    if (
      !row._id ||
      !confirm(
        `Delete designation ${row.designationName || ''}?`
      )
    ) {

      return;
    }


    this.api
      .delete(
        `/company-settings/designations/${row._id}`
      )
      .subscribe({
        next:
          () => {

            this.loadEnterpriseData();

            this.message.set(
              'Designation deleted.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to delete designation.'
            )
      });
  }


  protected filteredUserDesignations(): DesignationRow[] {

    const departmentId =
      this.userForm
        .controls
        .departmentId
        .value;


    if (
      !departmentId
    ) {

      return [];
    }


    return this.designations()
      .filter(
        (
          designation
        ) => {

          const designationDepartmentId =
            typeof designation.departmentId ===
            'object'
              ? designation.departmentId?._id
              : designation.departmentId;


          return !designationDepartmentId ||
            designationDepartmentId ===
            departmentId;
        }
      );
  }


  protected onUserDepartmentChanged(): void {

    if (
      !this.userForm
        .controls
        .departmentId
        .value
    ) {

      this.userForm.patchValue({
        designationCode:
          '',

        designation:
          ''
      });


      return;
    }


    const currentDesignationCode =
      this.userForm
        .controls
        .designationCode
        .value;


    const filteredDesignations =
      this.filteredUserDesignations();


    const matchingDesignation =
      filteredDesignations
        .find(
          (
            designation
          ) =>
            designation.designationCode ===
            currentDesignationCode
        );


    if (
      matchingDesignation
    ) {

      this.patchUserDesignation(
        matchingDesignation
      );


      return;
    }


    const firstDesignation =
      filteredDesignations[0];


    if (
      firstDesignation
    ) {

      this.userForm.patchValue({
        designationCode:
          firstDesignation.designationCode ||
          '',

        designation:
          firstDesignation.designationName ||
          firstDesignation.designationCode ||
          ''
      });


      return;
    }


    this.userForm.patchValue({
      designationCode:
        '',

      designation:
        ''
    });
  }


  protected onUserDesignationChanged(): void {

    const designationCode =
      this.userForm
        .controls
        .designationCode
        .value;


    const designation =
      this.filteredUserDesignations()
        .find(
          (
            item
          ) =>
            item.designationCode ===
            designationCode
        );


    this.patchUserDesignation(
      designation
    );
  }


  private patchUserDesignation(
    designation?:
      DesignationRow
  ): void {

    this.userForm
      .controls
      .designation
      .setValue(
        designation?.designationName ||
        designation?.designationCode ||
        ''
      );
  }


  protected createLeavePolicy(): void {

    if (
      this.leavePolicyForm.invalid
    ) {

      this.leavePolicyForm
        .markAllAsTouched();

      return;
    }


    this.api
      .post(
        '/hr/leave/policies',
        this.leavePolicyForm.getRawValue()
      )
      .subscribe({
        next:
          () => {

            this.leavePolicyForm.reset({
              policyName:
                '',

              policyCode:
                '',

              description:
                '',

              isDefault:
                false,

              isActive:
                true
            });


            this.loadEnterpriseData();


            this.message.set(
              'Leave policy saved.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to save leave policy.'
            )
      });
  }


  protected updateLeavePolicy(
    row:
      any
  ): void {

    const policyName =
      window.prompt(
        'Leave policy name',
        row.policyName ||
        ''
      );


    if (
      !row._id ||
      !policyName
    ) {

      return;
    }


    this.api
      .patch(
        `/hr/leave/policies/${row._id}`,

        {
          policyName
        }
      )
      .subscribe({
        next:
          () => {

            this.loadEnterpriseData();

            this.message.set(
              'Leave policy updated.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to update leave policy.'
            )
      });
  }


  protected deleteLeavePolicy(
    row:
      any
  ): void {

    if (
      !row._id ||
      !confirm(
        `Delete leave policy ${row.policyName || ''}?`
      )
    ) {

      return;
    }


    this.api
      .delete(
        `/hr/leave/policies/${row._id}`
      )
      .subscribe({
        next:
          () => {

            this.loadEnterpriseData();

            this.message.set(
              'Leave policy deleted.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to delete leave policy.'
            )
      });
  }


  protected createAttendancePolicy(): void {

    if (
      this.attendancePolicyForm.invalid
    ) {

      this.attendancePolicyForm
        .markAllAsTouched();

      return;
    }


    this.api
      .post(
        '/hr/attendance/policies',

        this.attendancePolicyForm
          .getRawValue()
      )
      .subscribe({
        next:
          () => {

            this.attendancePolicyForm.reset({
              policyName:
                '',

              policyCode:
                '',

              graceMinutes:
                10,

              maxLateAllowedPerMonth:
                3,

              allowRegularization:
                true,

              isDefault:
                false
            });


            this.loadEnterpriseData();


            this.message.set(
              'Attendance rule saved.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to save attendance rule.'
            )
      });
  }


  protected updateAttendancePolicy(
    row:
      any
  ): void {

    const policyName =
      window.prompt(
        'Attendance rule name',
        row.policyName ||
        ''
      );


    if (
      !row._id ||
      !policyName
    ) {

      return;
    }


    this.api
      .patch(
        `/hr/attendance/policies/${row._id}`,

        {
          policyName
        }
      )
      .subscribe({
        next:
          () => {

            this.loadEnterpriseData();

            this.message.set(
              'Attendance rule updated.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to update attendance rule.'
            )
      });
  }


  protected deleteAttendancePolicy(
    row:
      any
  ): void {

    if (
      !row._id ||
      !confirm(
        `Delete attendance rule ${row.policyName || ''}?`
      )
    ) {

      return;
    }


    this.api
      .delete(
        `/hr/attendance/policies/${row._id}`
      )
      .subscribe({
        next:
          () => {

            this.loadEnterpriseData();

            this.message.set(
              'Attendance rule deleted.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to delete attendance rule.'
            )
      });
  }


  protected createEnterpriseUser(): void {

    if (
      this.userForm.invalid ||
      this.isUserSaving()
    ) {

      this.userForm
        .markAllAsTouched();

      return;
    }


    if (
      !this.canCreateSelectedUserRole()
    ) {

      this.message.set(
        `Plan limit reached. ${this.selectedUserRoleLimitMessage()}.`
      );


      return;
    }


    const raw =
      this.userForm
        .getRawValue();


    this.isUserSaving.set(
      true
    );


    this.message.set(
      ''
    );


    this.api
      .post<UserRow>(
        '/users',

        {
          name:
            raw.name,

          email:
            raw.email,

          mobile:
            raw.mobile,

          password:
            raw.password,

          role:
            'hr',

          department:
            this.departmentNameById(
              raw.departmentId
            ),

          designation:
            raw.designation,

          ...(
            this.selectedCompanyId()
              ? {
                  companyId:
                    this.selectedCompanyId()
                }
              : {}
          )
        }
      )
      .pipe(
        finalize(
          () =>
            this.isUserSaving.set(
              false
            )
        )
      )
      .subscribe({
        next:
          (
            user
          ) => {

            this.message.set(
              `${user.name || 'User'} created successfully.`
            );


            this.userForm.reset({
              name:
                '',

              email:
                '',

              mobile:
                '',

              roleName:
                'hr',

              departmentId:
                '',

              designationCode:
                '',

              designation:
                '',

              reportingTo:
                '',

              password:
                ''
            });


            this.loadHrUsers();

            this.loadBilling();
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) => {

            this.message.set(
              error.error?.message ||
              'Unable to create user.'
            );
          }
      });
  }


  private departmentNameById(
    departmentId?: string
  ): string {

    if (
      !departmentId
    ) {

      return '';
    }


    const department =
      this.departments()
        .find(
          (
            item
          ) =>
            item._id ===
            departmentId
        );


    return department?.departmentName ||
      '';
  }


  protected roleLabel(
    value?: string
  ): string {

    return String(
      value ||
      'employee'
    )
      .split(
        '_'
      )
      .map(
        (
          part
        ) =>
          part
            .charAt(0)
            .toUpperCase() +
          part.slice(
            1
          )
      )
      .join(
        ' '
      );
  }


  protected toggleUserStatus(
    user:
      UserRow
  ): void {

    if (
      !user._id ||
      this.isStatusSaving()
    ) {

      return;
    }


    const nextStatus =
      (
        user.status ||
        'active'
      ) ===
      'active'
        ? 'inactive'
        : 'active';


    this.isStatusSaving.set(
      true
    );


    this.message.set(
      ''
    );


    this.api
      .patch<UserRow>(
        `/users/${user._id}`,

        {
          status:
            nextStatus
        }
      )
      .pipe(
        finalize(
          () =>
            this.isStatusSaving.set(
              false
            )
        )
      )
      .subscribe({
        next:
          () => {

            this.message.set(
              `${user.name || user.email || 'User'} marked ${nextStatus}.`
            );


            this.loadHrUsers();

            this.loadBilling();
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) => {

            this.message.set(
              error.error?.message ||
              'Unable to update user status.'
            );
          }
      });
  }


  protected companyLogoUrl(): string {

    const logo =
      this.companyProfile()?.logo;


    if (
      logo
    ) {

      return /^https?:\/\//i
        .test(
          logo
        )
        ? logo
        : apiUrl(
            logo
          );
    }


    const currentUser =
      this.auth.currentUser();


    const currentLogo =
      currentUser &&
      'company' in currentUser
        ? (
            currentUser.company as Company | undefined
          )?.logoUrl
        : undefined;


    return currentLogo ||
      '/brand/opasbizz-crm.webp';
  }


  protected loadCompanyProfile(): void {

    const companyId =
      this.selectedCompanyId();


    const endpoint =
      companyId
        ? `/companies/${companyId}`
        : '/companies/my/profile';


    this.api
      .get<CompanyProfile>(
        endpoint
      )
      .pipe(
        catchError(
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) => {

            this.message.set(
              error.error?.message ||
              'Unable to load company profile.'
            );


            return of(
              null
            );
          }
        )
      )
      .subscribe(
        (
          profile
        ) => {

          if (
            !profile
          ) {

            return;
          }


          const theme =
            profile.settings?.theme ??
            {};


          this.companyProfile.set(
            profile
          );


          this.patchProfileFormFromUser();


          const defaultTheme =
            this.platformDefaultTheme();


          this.themeForm.patchValue({
            primaryColor:
              theme.primaryColor ||
              defaultTheme.primaryColor,

            accentColor:
              theme.accentColor ||
              defaultTheme.accentColor,

            sidebarColor:
              theme.sidebarColor ||
              defaultTheme.sidebarColor
          });


          this.applyTheme(
            this.themeForm.getRawValue()
          );
        }
      );
  }


  private loadFirstCompanyContext(): void {

    this.api
      .get<{
        companies?: CompanyProfile[];
      }>(
        '/companies',
        {
          limit:
            1
        }
      )
      .pipe(
        catchError(
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) => {

            this.message.set(
              error.error?.message ||
              'Super admin company list could not be loaded.'
            );


            return of({
              companies:
                []
            });
          }
        )
      )
      .subscribe(
        (
          data
        ) => {

          const firstCompany =
            data.companies?.[0];


          if (
            !firstCompany?._id
          ) {

            this.message.set(
              'No registered company found. Register a company first.'
            );


            return;
          }


          this.selectedCompanyId.set(
            firstCompany._id
          );


          this.loadCompanyProfile();

          this.loadHrUsers();

          this.loadEnterpriseData();

          this.loadCrm();

          this.loadAccounting();

          this.loadHrm();

          this.loadCalendar();

          this.loadMessages();

          this.loadBilling();
        }
      );
  }


  private flattenOrgTree(
    nodes:
      OrgNode[]
  ): UserRow[] {

    return nodes.flatMap(
      (
        node
      ) => [
        {
          _id:
            node.id,

          name:
            node.name,

          email:
            node.email,

          role:
            node.role,

          department:
            node.department,

          designation:
            node.designation,

          status:
            'active'
        },

        ...this.flattenOrgTree(
          node.children ??
          []
        )
      ]
    );
  }


  protected saveCompanyProfileSettings(): void {

    const raw =
      this.profileForm
        .getRawValue();


    this.api
      .patch<CompanyProfile>(
        '/companies/my/profile',

        {
          companyName:
            raw.companyName,

          email:
            raw.companyEmail,

          phone:
            raw.companyPhone,

          industry:
            raw.industry
        }
      )
      .subscribe({
        next:
          (
            profile
          ) => {

            this.companyProfile.set(
              profile
            );


            this.patchProfileFormFromUser();


            this.message.set(
              'Company profile updated.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to update company profile.'
            )
      });
  }


  protected saveSmtpSettings(): void {

    if (
      this.smtpForm.invalid
    ) {

      this.smtpForm
        .markAllAsTouched();

      return;
    }


    const smtp =
      this.smtpForm
        .getRawValue();


    this.api
      .patch<CompanyProfile>(
        '/companies/my/profile',

        {
          settings: {
            smtp
          }
        }
      )
      .subscribe({
        next:
          (
            profile
          ) => {

            this.companyProfile.set(
              profile
            );


            this.message.set(
              'SMTP settings saved for this company.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to save SMTP settings.'
            )
      });
  }


  protected saveTheme(): void {

    if (
      this.selectedCompanyId()
    ) {

      this.message.set(
        'Theme editing is available inside the company admin account.'
      );


      return;
    }


    if (
      this.themeForm.invalid ||
      this.isThemeSaving()
    ) {

      this.themeForm
        .markAllAsTouched();


      return;
    }


    const theme =
      this.themeForm
        .getRawValue();


    this.isThemeSaving.set(
      true
    );


    this.message.set(
      ''
    );


    this.api
      .patch<CompanyProfile>(
        '/companies/my/profile',

        {
          settings: {
            theme
          }
        }
      )
      .pipe(
        finalize(
          () =>
            this.isThemeSaving.set(
              false
            )
        )
      )
      .subscribe({
        next:
          (
            profile
          ) => {

            this.companyProfile.set(
              profile
            );


            this.syncThemeToStoredUser(
              profile
            );


            this.applyTheme(
              theme
            );


            this.message.set(
              'Company theme updated successfully.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) => {

            this.message.set(
              error.error?.message ||
              'Unable to update company theme.'
            );
          }
      });
  }


  protected createHr(): void {

    if (
      this.hrForm.invalid ||
      this.isSaving()
    ) {

      this.hrForm
        .markAllAsTouched();


      return;
    }


    this.isSaving.set(
      true
    );


    this.message.set(
      ''
    );


    this.api
      .post<UserRow>(
        '/users',

        {
          ...this.hrForm
            .getRawValue(),

          role:
            'hr',

          ...(
            this.selectedCompanyId()
              ? {
                  companyId:
                    this.selectedCompanyId()
                }
              : {}
          )
        }
      )
      .pipe(
        finalize(
          () =>
            this.isSaving.set(
              false
            )
        )
      )
      .subscribe({
        next:
          (
            user
          ) => {

            this.message.set(
              `HR user ${user.name ?? 'created'} is active and ready to login.`
            );


            this.hrForm.reset({
              name:
                '',

              email:
                '',

              mobile:
                '',

              department:
                'Human Resources',

              designation:
                'HR Manager',

              password:
                'Hr@12345'
            });


            this.loadHrUsers();

            this.loadBilling();
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) => {

            this.message.set(
              error.error?.message ||
              'Unable to create HR user.'
            );
          }
      });
  }


  protected createAnnouncement(): void {

    if (
      this.announcementForm.invalid ||
      this.isAnnouncementSaving()
    ) {

      this.announcementForm
        .markAllAsTouched();


      return;
    }


    const value =
      this.announcementForm
        .getRawValue();


    this.isAnnouncementSaving.set(
      true
    );


    this.message.set(
      ''
    );


    this.api
      .post(
        '/hr/events',

        {
          eventTitle:
            value.eventTitle,

          eventCode:
            this.generateRecordCode(
              'ANN'
            ),

          eventType:
            'announcement',

          status:
            value.status,

          startDateTime:
            new Date(
              value.startDateTime
            )
              .toISOString(),

          endDateTime:
            new Date(
              value.endDateTime
            )
              .toISOString(),

          description:
            value.description,

          notifyEmployees:
            value.notifyEmployees,

          participants:
            []
        }
      )
      .pipe(
        finalize(
          () =>
            this.isAnnouncementSaving.set(
              false
            )
        )
      )
      .subscribe({
        next:
          () => {

            this.announcementForm.patchValue({
              eventTitle:
                '',

              description:
                ''
            });


            this.loadCalendar();


            this.message.set(
              'Announcement created.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to create announcement.'
            )
      });
  }


  protected updateAnnouncementStatus(
    row:
      EventRow,

    status:
      string
  ): void {

    if (
      !row._id ||
      this.isAnnouncementSaving()
    ) {

      return;
    }


    this.isAnnouncementSaving.set(
      true
    );


    this.api
      .patch(
        `/hr/events/${row._id}/status`,

        {
          status
        }
      )
      .pipe(
        finalize(
          () =>
            this.isAnnouncementSaving.set(
              false
            )
        )
      )
      .subscribe({
        next:
          () => {

            this.loadCalendar();


            this.message.set(
              'Announcement updated.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to update announcement.'
            )
      });
  }


  protected editAnnouncement(
    row:
      EventRow
  ): void {

    const eventTitle =
      window.prompt(
        'Announcement title',
        row.eventTitle ||
        ''
      );


    if (
      !row._id ||
      !eventTitle
    ) {

      return;
    }


    this.api
      .patch(
        `/hr/events/${row._id}`,

        {
          eventTitle
        }
      )
      .subscribe({
        next:
          () => {

            this.loadCalendar();


            this.message.set(
              'Announcement edited.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to edit announcement.'
            )
      });
  }


  protected deleteAnnouncement(
    row:
      EventRow
  ): void {

    if (
      !row._id ||
      !confirm(
        `Delete announcement ${row.eventTitle || ''}?`
      )
    ) {

      return;
    }


    this.api
      .delete(
        `/hr/events/${row._id}`
      )
      .subscribe({
        next:
          () => {

            this.loadCalendar();


            this.message.set(
              'Announcement deleted.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to delete announcement.'
            )
      });
  }


  protected loadMessages(): void {

    this.api
      .get<{
        messages?: MessageRow[];
      }>(
        '/hr/communication/messages',
        {
          limit:
            50
        }
      )
      .pipe(
        catchError(
          () =>
            of({
              messages:
                []
            })
        )
      )
      .subscribe(
        (
          data
        ) =>
          this.messages.set(
            data.messages ??
            []
          )
      );
  }


  protected sendMessage(): void {

    if (
      this.messageForm.invalid ||
      this.isMessageSending()
    ) {

      this.messageForm
        .markAllAsTouched();


      return;
    }


    this.isMessageSending.set(
      true
    );


    this.message.set(
      ''
    );


    this.api
      .post<{
        message?: MessageRow;
      }>(
        '/hr/communication/messages',

        this.messageForm
          .getRawValue()
      )
      .pipe(
        finalize(
          () =>
            this.isMessageSending.set(
              false
            )
        )
      )
      .subscribe({
        next:
          () => {

            this.messageForm.reset({
              recipientEmployeeCode:
                '',

              body:
                ''
            });


            this.loadMessages();


            this.loadNotifications(
              true
            );


            this.message.set(
              'Message sent.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to send message.'
            )
      });
  }


  protected replyDraft(
    messageId?: string
  ): string {

    return messageId
      ? this.replyDrafts()[
          messageId
        ] ||
        ''
      : '';
  }


  protected setReplyDraft(
    messageId:
      string |
      undefined,

    value:
      string
  ): void {

    if (
      !messageId
    ) {

      return;
    }


    this.replyDrafts.update(
      (
        drafts
      ) => ({
        ...drafts,

        [
          messageId
        ]:
          value
      })
    );
  }


  protected sendReply(
    row:
      MessageRow
  ): void {

    const body =
      this.replyDraft(
        row._id
      )
        .trim();


    if (
      !row._id ||
      !body ||
      this.isMessageSending()
    ) {

      return;
    }


    this.isMessageSending.set(
      true
    );


    this.api
      .post<{
        message?: MessageRow;
      }>(
        '/hr/communication/messages',

        {
          parentMessageId:
            row._id,

          body
        }
      )
      .pipe(
        finalize(
          () =>
            this.isMessageSending.set(
              false
            )
        )
      )
      .subscribe({
        next:
          () => {

            this.replyDrafts.update(
              (
                drafts
              ) => ({
                ...drafts,

                [
                  row._id as string
                ]:
                  ''
              })
            );


            this.loadMessages();
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to send reply.'
            )
      });
  }


  protected chatMessages(): MessageRow[] {

    return [
      ...this.messages()
    ]
      .sort(
        (
          a,
          b
        ) =>
          new Date(
            a.createdAt ||
            ''
          )
            .getTime() -
          new Date(
            b.createdAt ||
            ''
          )
            .getTime()
      );
  }


  protected userLabel(
    user?: {
      name?: string;
      email?: string;
      role?: string;
    } |
    null
  ): string {

    return user?.name ||
      user?.email ||
      user?.role ||
      '-';
  }


  protected isOwnMessage(
    row:
      MessageRow
  ): boolean {

    const current =
      this.user() as {
        id?: string;
        _id?: string;
        sub?: string;
      } |
      null;


    const currentId =
      current?.id ||
      current?._id ||
      current?.sub;


    return Boolean(
      currentId &&
      row.senderUserId?._id ===
      currentId
    );
  }


  protected sendNotification(): void {

    if (
      this.notificationForm.invalid ||
      this.isNotificationSending()
    ) {

      this.notificationForm
        .markAllAsTouched();


      return;
    }


    this.isNotificationSending.set(
      true
    );


    this.message.set(
      ''
    );


    this.api
      .post<NotificationRow>(
        '/hr/communication/notifications',

        this.notificationForm
          .getRawValue()
      )
      .pipe(
        finalize(
          () =>
            this.isNotificationSending.set(
              false
            )
        )
      )
      .subscribe({
        next:
          () => {

            this.notificationForm.reset({
              recipientEmployeeCode:
                '',

              title:
                '',

              message:
                '',

              type:
                'system',

              priority:
                'normal',

              actionUrl:
                ''
            });


            this.loadNotifications(
              true,
              50
            );


            this.message.set(
              'Notification sent.'
            );
          },

        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) =>
            this.message.set(
              error.error?.message ||
              'Unable to send notification.'
            )
      });
  }


  protected markNotificationRead(
    row:
      NotificationRow
  ): void {

    if (
      !row._id ||
      row.isRead
    ) {

      return;
    }


    this.api
      .patch(
        `/hr/communication/notifications/${row._id}/read`,
        {}
      )
      .subscribe({
        next:
          () =>
            this.loadNotifications(
              true,
              50
            ),

        error:
          () =>
            undefined
      });
  }


  protected loadNotifications(
    silent =
      false,

    limit =
      50
  ): void {

    this.api
      .get<{
        notifications?: NotificationRow[];
      }>(
        '/hr/communication/notifications',

        {
          limit
        }
      )
      .pipe(
        catchError(
          () =>
            of({
              notifications:
                []
            })
        )
      )
      .subscribe(
        (
          data
        ) => {

          this.notifications.set(
            data.notifications ||
            []
          );


          if (
            !silent
          ) {

            this.unreadCount.set(
              (
                data.notifications ||
                []
              )
                .filter(
                  (
                    item
                  ) =>
                    !item.isRead
                )
                .length
            );
          }
        }
      );


    this.api
      .get<{
        unreadCount?: number;
      }>(
        '/hr/communication/notifications/unread-count'
      )
      .pipe(
        catchError(
          () =>
            of({
              unreadCount:
                this.unreadCount()
            })
        )
      )
      .subscribe(
        (
          data
        ) =>
          this.unreadCount.set(
            data.unreadCount ||
            0
          )
      );
  }


  protected markNotificationsRead(): void {

    if (
      this.unreadCount() ===
      0 &&
      this.notifications()
        .every(
          (
            item
          ) =>
            item.isRead
        )
    ) {

      return;
    }


    this.unreadCount.set(
      0
    );


    this.notifications.update(
      (
        items
      ) =>
        items.map(
          (
            item
          ) => ({
            ...item,
            isRead:
              true
          })
        )
    );


    this.api
      .patch(
        '/hr/communication/notifications/read-all',
        {}
      )
      .subscribe({
        error:
          () =>
            undefined
      });
  }


  private syncThemeToStoredUser(
    profile:
      CompanyProfile
  ): void {

    if (
      typeof localStorage ===
      'undefined'
    ) {

      return;
    }


    const stored =
      localStorage.getItem(
        'user'
      );


    if (
      !stored
    ) {

      return;
    }


    try {

      const user =
        JSON.parse(
          stored
        ) as any;


      const currentCompany =
        user.company ||
        {};


      user.company = {
        ...currentCompany,

        ...profile,

        settings:
          profile.settings ||
          currentCompany.settings ||
          {}
      };


      localStorage.setItem(
        'user',
        JSON.stringify(
          user
        )
      );


      this.auth.currentUser.set(
        user
      );
    }

    catch {

      /*
       * Ignore malformed local cache;
       * fresh login will pick up backend theme.
       */
    }
  }


  private applyTheme(
    theme: {
      primaryColor:
        string;

      accentColor:
        string;

      sidebarColor:
        string;
    }
  ): void {

    const root =
      document.documentElement;


    root.style.setProperty(
      '--color-primary',
      theme.primaryColor
    );


    root.style.setProperty(
      '--color-primary-rgb',
      this.hexToRgb(
        theme.primaryColor
      )
    );


    root.style.setProperty(
      '--color-accent',
      theme.accentColor
    );


    root.style.setProperty(
      '--color-accent-rgb',
      this.hexToRgb(
        theme.accentColor
      )
    );


    root.style.setProperty(
      '--color-sidebar',
      theme.sidebarColor
    );


    root.style.setProperty(
      '--color-sidebar-rgb',
      this.hexToRgb(
        theme.sidebarColor
      )
    );


    root.style.setProperty(
      '--platform-sidebar-start',
      theme.sidebarColor
    );


    root.style.setProperty(
      '--platform-sidebar-end',
      theme.accentColor
    );
  }


  private platformDefaultTheme(): {
    primaryColor:
      string;

    accentColor:
      string;

    sidebarColor:
      string;
  } {

    if (
      typeof localStorage !==
      'undefined'
    ) {

      const stored =
        localStorage.getItem(
          'platformTheme'
        );


      if (
        stored
      ) {

        try {

          const theme =
            JSON.parse(
              stored
            ) as {
              primaryColor?: string;
              accentColor?: string;
              sidebarStart?: string;
            };


          return {
            primaryColor:
              theme.primaryColor ||
              '#1A2942',

            accentColor:
              theme.accentColor ||
              '#243B55',

            sidebarColor:
              theme.sidebarStart ||
              '#141E30'
          };
        }

        catch {

          localStorage.removeItem(
            'platformTheme'
          );
        }
      }
    }


    return {
      primaryColor:
        '#1A2942',

      accentColor:
        '#243B55',

      sidebarColor:
        '#141E30'
    };
  }


  private hexToRgb(
    hex:
      string
  ): string {

    const value =
      hex.replace(
        '#',
        ''
      );


    const full =
      value.length ===
      3
        ? value
            .split(
              ''
            )
            .map(
              (
                item
              ) =>
                item +
                item
            )
            .join(
              ''
            )
        : value;


    const number =
      Number.parseInt(
        full,
        16
      );


    return `${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}`;
  }
}