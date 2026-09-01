import { CommonModule } from '@angular/common';

import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import {
  Router
} from '@angular/router';

import {
  finalize
} from 'rxjs';

import {
  ApiService
} from '../../../core/services/api.service';

import {
  AuthService
} from '../../../core/auth/auth.service';



import {
  apiUrl
} from '../../../core/config/api.config';
type LogisticsMenuGroup = {
  title: string;
  items: LogisticsMenuItem[];
};


type LogisticsMenuItem = {
  id: string;
  label: string;
  icon: string;

  children?: {
    id: string;
    label: string;
  }[];
};


interface LogisticsMetric {
  label: string;
  value: string;
  helper: string;
  icon: string;
  tone:
    | 'blue'
    | 'gold'
    | 'green'
    | 'purple';
}


interface DashboardShipment {
  _id?: string;

  shipmentNumber?: string;

  shipmentMode?: string;

  customerName?: string;

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

  status?: string;

  currentLocation?: string;

  estimatedArrival?: string;

  charges?: {
    totalAmount?: number;
  };

  createdAt?: string;
}


interface LogisticsDashboardApi {
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

  recentShipments?: DashboardShipment[];
}


interface RecentShipment {
  shipmentId: string;

  customer: string;

  mode: string;

  origin: string;

  destination: string;

  status: string;

  statusClass: string;
}

interface VendorPaymentApiRow {
  _id?: string;
  paymentCode?: string;
  vendor?: string;
  vendorInvoiceNo?: string;
  totalAmount?: number;
  paidAmount?: number;
  supplierBalance?: number;
  status?: string;
}

interface VendorPaymentListApi {
  data?: VendorPaymentApiRow[];
}

interface VendorPayment {
  vendor: string;
  invoice: string;
  total: number;
  paid: number;
  balance: number;
  status: string;
}

interface DashboardNotification {
  _id?: string;
  title?: string;
  message?: string;
  createdAt?: string;
  isRead?: boolean;
}

interface NotificationListApi {
  notifications?: DashboardNotification[];
}

interface NotificationUnreadApi {
  unreadCount?: number;
}

interface EmployeeDashboardSummary {
  employee?: {
    employeePhoto?: string;
  } | null;
  company?: {
    companyName?: string;
    logo?: string;
  } | null;
}

interface QuickActionItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  primary?: boolean;
}

interface ProgressStep {
  label: string;
  helper: string;
  count: number;
  state: 'complete' | 'current' | '';
}

interface TodayOperation {
  icon: string;
  tone: 'blue' | 'gold' | 'green' | 'purple';
  title: string;
  helper: string;
  count: number | string;
}

interface VendorPaymentSummary {
  total: number;
  paid: number;
  balance: number;
}

@Component({
  selector:
    'app-logistics-dashboard',

  standalone:
    true,

  imports: [
    CommonModule
  ],

  templateUrl:
    './logistics-dashboard.component.html',

  styleUrl:
    './logistics-dashboard.component.scss'
})
export class LogisticsDashboardComponent
  implements OnInit {

  private readonly router =
    inject(Router);

  private readonly api =
    inject(ApiService);

  private readonly auth =
    inject(AuthService);


  /* ============================================================
     UI STATE
  ============================================================ */

  protected readonly sidebarCollapsed =
    signal(false);

  protected readonly profileOpen =
    signal(false);

  protected readonly notificationsOpen =
    signal(false);

  protected readonly topAvatarFailed =
    signal(false);

  protected readonly isLoading =
    signal(false);

  protected readonly dashboardError =
    signal('');

  protected readonly expandedMenus =
    signal<Record<string, boolean>>({
      logistics: true,
      'air-cargo': true
    });

  protected readonly activeMenu =
    signal('dashboard');


  /* ============================================================
     USER
  ============================================================ */

  protected readonly userName =
    this.getUserName();

  protected readonly userDesignation =
    this.getUserDesignation();


  protected readonly timeGreeting =
    computed(() => this.getTimeGreeting());


  protected readonly currentDate =
    new Intl.DateTimeFormat(
      'en-IN',
      {
        weekday:
          'long',

        day:
          '2-digit',

        month:
          'long',

        year:
          'numeric'
      }
    ).format(
      new Date()
    );


  /* ============================================================
     DASHBOARD API DATA
  ============================================================ */

  protected readonly dashboard =
    signal<LogisticsDashboardApi>({
      totalShipments: 0,
      totalRevenue: 0,
      airCargo: 0,
      seaFreight: 0,
      road: 0,
      draft: 0,
      pending: 0,
      inTransit: 0,
      customs: 0,
      delivered: 0,
      hold: 0,
      cancelled: 0,
      recentShipments: []
    });


  protected readonly vendorPaymentRecords =
    signal<VendorPaymentApiRow[]>([]);


  protected readonly notifications =
    signal<DashboardNotification[]>([]);


  protected readonly unreadNotificationCount =
    signal(0);


  protected readonly employeeSummary =
    signal<EmployeeDashboardSummary | null>(null);


  protected readonly quickActions =
    computed<QuickActionItem[]>(
      () => [
        { id: 'air-new', icon: '\u2708', title: 'New Air Shipment', description: 'Create air cargo booking', primary: true },
        { id: 'sea-freight', icon: '\u25D2', title: 'Sea Freight', description: 'Create sea shipment', primary: true },
        { id: 'invoice', icon: '\u25A4', title: 'Create Invoice', description: 'Customer logistics invoice', primary: true },
        { id: 'vendor-payments', icon: '\u20B9', title: 'Vendor Payment', description: 'Record supplier payment', primary: true },
        { id: 'tracking', icon: '\u25CE', title: 'Track Shipment', description: 'Check movement status' },
        { id: 'logistics-documents', icon: '\u25B1', title: 'Documents', description: 'Manage shipment documents' }
      ]
    );


  protected readonly progressSteps =
    computed<ProgressStep[]>(() => {
      const data = this.dashboard();
      const steps = [
        { label: 'Booking', helper: 'Created', count: Number(data.draft || 0) + Number(data.pending || 0) },
        { label: 'Assigned', helper: 'Ready for movement', count: Number(data.pending || 0) },
        { label: 'In Transit', helper: 'In progress', count: Number(data.inTransit || 0) },
        { label: 'Customs', helper: 'Clearance', count: Number(data.customs || 0) },
        { label: 'Delivered', helper: 'Completed', count: Number(data.delivered || 0) },
        { label: 'Issues', helper: 'Hold/cancelled', count: Number(data.hold || 0) + Number(data.cancelled || 0) }
      ];
      const activeIndex = steps.findIndex((step) => step.count > 0);
      const currentIndex = activeIndex >= 0 ? activeIndex : 0;

      return steps.map((step, index) => ({
        ...step,
        state: index < currentIndex ? 'complete' : index === currentIndex ? 'current' : ''
      }));
    });


  protected readonly vendorPaymentSummary =
    computed<VendorPaymentSummary>(() => {
      return this.vendorPaymentRecords().reduce(
        (summary, payment) => ({
          total: summary.total + Number(payment.totalAmount || 0),
          paid: summary.paid + Number(payment.paidAmount || 0),
          balance: summary.balance + Number(payment.supplierBalance || 0)
        }),
        { total: 0, paid: 0, balance: 0 }
      );
    });


  protected readonly todayOperations =
    computed<TodayOperation[]>(() => {
      const data = this.dashboard();
      const byStatus = data.byStatus || {};
      const vendor = this.vendorPaymentSummary();
      const pickupCount = Number(byStatus['pickup_pending'] || 0) + Number(byStatus['picked_up'] || 0);
      const docsPending = Number(byStatus['documents_pending'] || 0);
      const pendingVendorPayments = this.vendorPaymentRecords()
        .filter((payment) => String(payment.status || '').toLowerCase() !== 'paid')
        .length;

      return [
        {
          icon: '\u2708',
          tone: 'blue',
          title: `${Number(data.airCargo || 0)} Air Shipments`,
          helper: `${Number(data.pending || 0)} pending booking confirmation`,
          count: Number(data.airCargo || 0)
        },
        {
          icon: '\u25C6',
          tone: 'gold',
          title: `${Number(data.customs || 0)} Customs Cases`,
          helper: `${docsPending} awaiting documentation`,
          count: Number(data.customs || 0)
        },
        {
          icon: '\u25B1',
          tone: 'green',
          title: `${pickupCount} Pickup Updates`,
          helper: `${Number(data.delivered || 0)} completed shipments`,
          count: pickupCount
        },
        {
          icon: '\u20B9',
          tone: 'purple',
          title: 'Vendor Payments',
          helper: `${this.compactCurrency(vendor.balance)} pending`,
          count: pendingVendorPayments
        }
      ];
    });


  protected readonly topAvatarUrl =
    computed(
      () => this.profilePhotoFromSummary()
    );


  protected readonly workspaceName =
    computed(
      () => this.employeeSummary()?.company?.companyName ||
        ((this.auth.currentUser() as { company?: { name?: string } } | null)?.company?.name) ||
        'Logistics'
    );


  protected readonly vendorPayments =
    computed<VendorPayment[]>(
      () =>
        this.vendorPaymentRecords()
          .slice(0, 5)
          .map((payment) => ({
            vendor:
              payment.vendor ||
              '-',

            invoice:
              payment.vendorInvoiceNo ||
              payment.paymentCode ||
              '-',

            total:
              Number(
                payment.totalAmount ||
                0
              ),

            paid:
              Number(
                payment.paidAmount ||
                0
              ),

            balance:
              Number(
                payment.supplierBalance ||
                0
              ),

            status:
              this.paymentStatusLabel(
                payment.status
              )
          }))
    );


  /* ============================================================
     METRICS

     These are now generated from backend dashboard data.
  ============================================================ */

  protected readonly metrics =
    computed<LogisticsMetric[]>(
      () => {

        const data =
          this.dashboard();

        const activeShipments =
          Math.max(
            0,
            Number(
              data.totalShipments ||
              0
            ) -
            Number(
              data.delivered ||
              0
            ) -
            Number(
              data.cancelled ||
              0
            )
          );


        return [
          {
            label:
              'Active Shipments',

            value:
              String(
                activeShipments
              ),

            helper:
              `${Number(data.pending || 0)} pending attention`,

            icon: '\u2708',

            tone:
              'blue'
          },

          {
            label:
              'In Transit',

            value:
              String(
                data.inTransit ||
                0
              ),

            helper:
              'Across air, sea & road',

            icon: '\u2197',

            tone:
              'gold'
          },

          {
            label:
              'Delivered',

            value:
              String(
                data.delivered ||
                0
              ),

            helper:
              'Completed shipments',

            icon: '\u2713',

            tone:
              'green'
          },

          {
            label:
              'Total Revenue',

            value:
              this.compactCurrency(
                data.totalRevenue ||
                0
              ),

            helper:
              'Shipment revenue',

            icon: '\u20B9',

            tone:
              'purple'
          }
        ];
      }
    );


  /* ============================================================
     MENU
  ============================================================ */

  protected readonly menuGroups:
    LogisticsMenuGroup[] = [

      {
        title:
          'Main',

        items: [

          {
            id:
              'dashboard',

            label:
              'Dashboard',

            icon: '\u2302'
          },

          {
            id:
              'logistics',

            label:
              'Logistics',

            icon: '\u25C8'
          },

          {
            id:
              'invoice',

            label:
              'Invoice',

            icon: '\u25A4'
          },

          {
            id:
              'vendor-payments',

            label:
              'Vendor Payments',

            icon: '\u20B9'
          }
        ]
      },


      {
        title:
          'Logistics',

        items: [

          {
            id:
              'air-cargo',

            label:
              'Air Cargo',

            icon: '\u2708',

            children: [

              {
                id:
                  'air-new',

                label:
                  'New Shipment'
              },

              {
                id:
                  'air-all',

                label:
                  'All Shipments'
              },

              {
                id:
                  'air-pending',

                label:
                  'Pending Shipments'
              },

              {
                id:
                  'air-delivered',

                label:
                  'Delivered Shipments'
              },

              {
                id:
                  'air-cancelled',

                label:
                  'Cancelled Shipments'
              }
            ]
          },

          {
            id:
              'sea-freight',

            label:
              'Sea Freight',

            icon: '\u25D2'
          },

          {
            id:
              'cha',

            label:
              'CHA',

            icon: '\u25C6'
          },

          {
            id:
              'transporters',

            label:
              'Transporters',

            icon: '\u25A3'
          },

          {
            id:
              'warehouse',

            label:
              'Warehouse',

            icon: '\u2302'
          },

          {
            id:
              'tracking',

            label:
              'Tracking',

            icon: '\u25CE'
          },

          {
            id:
              'logistics-documents',

            label:
              'Documents',

            icon: '\u25B1'
          },

          {
            id:
              'customers',

            label:
              'Customers',

            icon: '\u2659'
          },

          {
            id:
              'vendors',

            label:
              'Vendors',

            icon: '\u2659'
          },

          {
            id:
              'products-services',

            label:
              'Products / Services',

            icon: '\u25C7'
          }
        ]
      },


      {
        title:
          'Reports',

        items: [

          {
            id:
              'sales-report',

            label:
              'Sales Report',

            icon: '\u2301'
          },

          {
            id:
              'outstanding-report',

            label:
              'Outstanding Report',

            icon: '\u25A4'
          },

          {
            id:
              'gst-report',

            label:
              'GST Report',

            icon:
              '%'
          },

          {
            id:
              'payments-report',

            label:
              'Payments Report',

            icon: '\u20B9'
          }
        ]
      },


      {
        title:
          'My Employee',

        items: [

          {
            id:
              'my-profile',

            label:
              'My Profile',

            icon: '\u2659'
          },

          {
            id:
              'attendance',

            label:
              'Attendance',

            icon: '\u25F7'
          },

          {
            id:
              'leave',

            label:
              'Leave',

            icon: '\u25A1'
          },

          {
            id:
              'payslips',

            label:
              'Payslips',

            icon: '\u20B9'
          },

          {
            id:
              'employee-documents',

            label:
              'My Documents',

            icon: '\u25B1'
          },

          {
            id:
              'events',

            label:
              'Events',

            icon: '\u25C7'
          },

          {
            id:
              'holidays',

            label:
              'Holidays',

            icon: '\u2606'
          },

          {
            id:
              'meetings',

            label:
              'Meetings',

            icon: '\u2667'
          },

          {
            id:
              'messages',

            label:
              'Messages',

            icon: '\u2709'
          }
        ]
      }
    ];


  /* ============================================================
     RECENT SHIPMENTS FROM BACKEND
  ============================================================ */

  protected readonly recentShipments =
    computed<RecentShipment[]>(
      () => {

        return (
          this.dashboard()
            .recentShipments ||
          []
        ).map(
          (
            shipment
          ) => ({

            shipmentId:
              shipment.shipmentNumber ||
              '-',

            customer:
              shipment.customerName ||
              '-',

            mode:
              this.shipmentModeLabel(
                shipment.shipmentMode
              ),

            origin:
              this.locationLabel(
                shipment.origin
              ),

            destination:
              this.locationLabel(
                shipment.destination
              ),

            status:
              this.statusLabel(
                shipment.status
              ),

            statusClass:
              this.statusClass(
                shipment.status
              )
          })
        );
      }
    );


  /* ============================================================
     LIFECYCLE
  ============================================================ */

  ngOnInit():
    void {

    this.syncActiveMenuFromUrl();

    this.loadDashboard();

    this.loadVendorPayments();

    this.loadNotifications();

    this.loadEmployeeSummary();
  }


  /* ============================================================
     LOAD DASHBOARD
  ============================================================ */

  protected loadDashboard():
    void {

    this.isLoading.set(
      true
    );

    this.dashboardError.set(
      ''
    );


    this.api
      .get<LogisticsDashboardApi>(
        '/logistics/dashboard'
      )

      .pipe(
        finalize(
          () =>
            this.isLoading.set(
              false
            )
        )
      )

      .subscribe({

        next:
          (
            response
          ) => {

            this.dashboard.set({
              totalShipments:
                Number(
                  response?.totalShipments ||
                  0
                ),

              totalRevenue:
                Number(
                  response?.totalRevenue ||
                  0
                ),

              airCargo:
                Number(
                  response?.airCargo ||
                  0
                ),

              seaFreight:
                Number(
                  response?.seaFreight ||
                  0
                ),

              road:
                Number(
                  response?.road ||
                  0
                ),

              draft:
                Number(
                  response?.draft ||
                  0
                ),

              pending:
                Number(
                  response?.pending ||
                  0
                ),

              inTransit:
                Number(
                  response?.inTransit ||
                  0
                ),

              customs:
                Number(
                  response?.customs ||
                  0
                ),

              delivered:
                Number(
                  response?.delivered ||
                  0
                ),

              hold:
                Number(
                  response?.hold ||
                  0
                ),

              cancelled:
                Number(
                  response?.cancelled ||
                  0
                ),

              byMode:
                response?.byMode ||
                {},

              byStatus:
                response?.byStatus ||
                {},

              recentShipments:
                response?.recentShipments ||
                []
            });
          },


        error:
          (
            error
          ) => {

            console.error(
              'Unable to load Logistics dashboard:',
              error
            );

            this.dashboardError.set(
              error?.error?.message ||
              'Unable to load Logistics dashboard.'
            );
          }

      });
  }



  protected loadNotifications():
    void {

    this.api
      .get<NotificationListApi>(
        '/hr/communication/notifications',
        {
          limit: 3
        }
      )
      .subscribe({
        next: (response) =>
          this.notifications.set(
            response?.notifications ||
            []
          ),
        error: () =>
          this.notifications.set(
            []
          )
      });

    this.api
      .get<NotificationUnreadApi>(
        '/hr/communication/notifications/unread-count'
      )
      .subscribe({
        next: (response) =>
          this.unreadNotificationCount.set(
            Number(
              response?.unreadCount ||
              0
            )
          ),
        error: () =>
          this.unreadNotificationCount.set(
            0
          )
      });
  }


  private getTimeGreeting(): string {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return 'Good Morning';
    }

    if (hour >= 12 && hour < 17) {
      return 'Good Afternoon';
    }

    if (hour >= 17 && hour < 21) {
      return 'Good Evening';
    }

    return 'Good Night';
  }


  private profilePhotoFromSummary(): string {
    if (this.topAvatarFailed()) {
      return '';
    }

    const employeePhoto = this.employeeSummary()?.employee?.employeePhoto || '';
    const syncedEmployeePhoto = (this.auth.currentUser() as { profileImage?: string } | null)?.profileImage || '';
    const photo = employeePhoto || syncedEmployeePhoto;

    if (!photo || /opasbizz-crm|\/brand\//i.test(photo)) {
      return '';
    }

    return this.assetUrl(photo);
  }


  protected handleTopAvatarError(): void {
    this.topAvatarFailed.set(true);
  }


  protected loadEmployeeSummary():
    void {

    this.api
      .get<EmployeeDashboardSummary>(
        '/hr/employees/dashboard'
      )
      .subscribe({
        next: (response) => {
          this.topAvatarFailed.set(false);
          this.employeeSummary.set(
            response
          );
          if (response?.employee?.employeePhoto) {
            this.auth.updateCurrentUserProfileImage(response.employee.employeePhoto);
          }
        },
        error: () =>
          this.employeeSummary.set(
            null
          )
      });
  }

  /* ============================================================
     LOAD VENDOR PAYMENTS
  ============================================================ */

  protected loadVendorPayments():
    void {

    this.api
      .get<VendorPaymentListApi>(
        '/logistics/vendor-payments',
        {
          page: 1,
          limit: 5
        }
      )
      .subscribe({

        next:
          (
            response
          ) => {

            this.vendorPaymentRecords.set(
              response?.data ||
              []
            );
          },


        error:
          (
            error
          ) => {

            console.error(
              'Unable to load vendor payments:',
              error
            );

            this.vendorPaymentRecords.set(
              []
            );
          }

      });
  }


  /* ============================================================
     SIDEBAR
  ============================================================ */

  protected toggleSidebar():
    void {

    this.sidebarCollapsed.update(
      (
        value
      ) =>
        !value
    );
  }


  protected toggleMenu(
    id: string
  ): void {

    this.expandedMenus.update(
      (
        current
      ) => ({

        ...current,

        [id]:
          !current[id]
      })
    );
  }


  protected isExpanded(
    id: string
  ): boolean {

    return Boolean(
      this.expandedMenus()[
        id
      ]
    );
  }


  /* ============================================================
     MAIN NAVIGATION

     This is the important fix.
  ============================================================ */

  protected selectMenu(
    id: string
  ): void {

    this.activeMenu.set(
      id
    );


    const routeMap:
      Record<
        string,
        string
      > = {

      /* Main */

      dashboard:
        '/logistics/dashboard',

      logistics:
        '/logistics/dashboard',

      invoice:
        '/logistics/invoices',

      'vendor-payments':
        '/logistics/vendor-payments',


      /* Air Cargo */

      'air-cargo':
        '/logistics/air-cargo',

      'air-new':
        '/logistics/air-cargo/new',

      'air-all':
        '/logistics/air-cargo/all',

      'air-pending':
        '/logistics/air-cargo/pending',

      'air-delivered':
        '/logistics/air-cargo/delivered',

      'air-cancelled':
        '/logistics/air-cargo/cancelled',


      /* Logistics */

      'sea-freight':
        '/logistics/sea-freight',

      cha:
        '/logistics/cha',

      transporters:
        '/logistics/transporters',

      warehouse:
        '/logistics/warehouse',

      tracking:
        '/logistics/tracking',

      'logistics-documents':
        '/logistics/documents',

      customers:
        '/logistics/customers',

      vendors:
        '/logistics/vendors',

      'products-services':
        '/logistics/products-services',


      /* Reports */

      'sales-report':
        '/logistics/reports/sales',

      'outstanding-report':
        '/logistics/reports/outstanding',

      'gst-report':
        '/logistics/reports/gst',

      'payments-report':
        '/logistics/reports/vendor-payment',


      /* Employee */

      'my-profile':
        '/logistics/employee?feature=profile',

      attendance:
        '/logistics/employee?feature=attendance',

      leave:
        '/logistics/employee?feature=apply-leave',

      payslips:
        '/logistics/employee?feature=payslip',

      'employee-documents':
        '/logistics/employee?feature=documents',

      events:
        '/logistics/employee?feature=events',

      holidays:
        '/logistics/employee?feature=holidays',

      meetings:
        '/logistics/employee?feature=meetings',

      messages:
        '/logistics/employee?feature=messages'
    };


    const target =
      routeMap[id];


    if (!target) {

      console.warn(
        `No Logistics route configured for menu: ${id}`
      );

      return;
    }


    void this.router
      .navigateByUrl(
        target
      );
  }


  /* ============================================================
     PROFILE / NOTIFICATIONS
  ============================================================ */

  protected toggleNotifications():
    void {

    this.notificationsOpen.update(
      (
        value
      ) =>
        !value
    );

    this.profileOpen.set(
      false
    );
  }


  protected toggleProfile():
    void {

    this.profileOpen.update(
      (
        value
      ) =>
        !value
    );

    this.notificationsOpen.set(
      false
    );
  }


  protected openProfile():
    void {

    this.profileOpen.set(
      false
    );

    void this.router
      .navigate(
        ['/logistics/employee'],
        {
          queryParams: {
            feature:
              'profile'
          }
        }
      );
  }


  protected openSettings():
    void {

    this.profileOpen.set(
      false
    );

    void this.router
      .navigate(
        ['/logistics/employee'],
        {
          queryParams: {
            feature:
              'settings'
          }
        }
      );
  }


  protected logout():
    void {

    this.profileOpen.set(
      false
    );

    this.notificationsOpen.set(
      false
    );

    this.auth.logout();
  }



  protected notificationTime(
    value?: string
  ): string {

    if (!value) {
      return '-';
    }

    return new Intl.DateTimeFormat(
      'en-IN',
      {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    ).format(
      new Date(value)
    );
  }


  private assetUrl(
    value?: string
  ): string {

    const path = String(value || '').trim();
    if (!path) return '';
    if (/^data:/i.test(path) || /^https?:\/\//i.test(path)) return path;
    if (path.startsWith('/brand/') || path.startsWith('/assets/')) return path;
    return apiUrl(path);
  }

  /* ============================================================
     FORMATTERS
  ============================================================ */

  protected formatCurrency(
    value: number
  ): string {

    return new Intl
      .NumberFormat(
        'en-IN',
        {
          style:
            'currency',

          currency:
            'INR',

          maximumFractionDigits:
            0
        }
      )
      .format(
        Number(
          value ||
          0
        )
      );
  }


  private compactCurrency(
    value: number
  ): string {

    const amount =
      Number(
        value ||
        0
      );


    if (
      amount >=
      10000000
    ) {

      return `\u20B9 ${(amount / 10000000).toFixed(2)}Cr`;
    }


    if (
      amount >=
      100000
    ) {

      return `\u20B9 ${(amount / 100000).toFixed(2)}L`;
    }


    if (
      amount >=
      1000
    ) {

      return `\u20B9 ${(amount / 1000).toFixed(1)}K`;
    }


    return this.formatCurrency(
      amount
    );
  }


  private paymentStatusLabel(
    value?: string
  ): string {

    switch (
      String(
        value ||
        ''
      )
        .trim()
        .toLowerCase()
    ) {

      case 'paid':
        return 'Paid';

      case 'partial':
        return 'Partial';

      case 'pending':
        return 'Pending';

      case 'hold':
      case 'on-hold':
        return 'On Hold';

      case 'cancelled':
        return 'Cancelled';

      default:
        return value ||
          '-';
    }
  }


  private shipmentModeLabel(
    value?: string
  ): string {

    switch (
      String(
        value ||
        ''
      )
        .trim()
        .toLowerCase()
    ) {

      case 'air_cargo':
      case 'air-cargo':
        return 'Air Cargo';


      case 'sea_freight':
      case 'sea-freight':
        return 'Sea Freight';


      case 'road':
        return 'Road Transport';


      default:
        return value ||
          '-';
    }
  }


  private statusLabel(
    value?: string
  ): string {

    const normalized =
      String(
        value ||
        ''
      )
        .trim()
        .replace(
          /_/g,
          ' '
        )
        .replace(
          /-/g,
          ' '
        );


    if (!normalized) {

      return '-';
    }


    return normalized
      .split(' ')
      .filter(
        Boolean
      )
      .map(
        (
          word
        ) =>
          word.charAt(0)
            .toUpperCase() +
          word.slice(1)
      )
      .join(' ');
  }


  private statusClass(
    value?: string
  ): string {

    return String(
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
  }


  private locationLabel(
    location?:
      DashboardShipment[
        'origin'
      ]
  ): string {

    if (!location) {

      return '-';
    }


    return (
      location.city ||
      location.name ||
      location.country ||
      '-'
    );
  }


  /* ============================================================
     CURRENT MENU FROM URL
  ============================================================ */

  private syncActiveMenuFromUrl():
    void {

    const url =
      this.router.url;


    if (
      url.includes(
        '/air-cargo/new'
      )
    ) {

      this.activeMenu.set(
        'air-new'
      );

      return;
    }


    if (
      url.includes(
        '/air-cargo/pending'
      )
    ) {

      this.activeMenu.set(
        'air-pending'
      );

      return;
    }


    if (
      url.includes(
        '/air-cargo/delivered'
      )
    ) {

      this.activeMenu.set(
        'air-delivered'
      );

      return;
    }


    if (
      url.includes(
        '/air-cargo/cancelled'
      )
    ) {

      this.activeMenu.set(
        'air-cancelled'
      );

      return;
    }


    if (
      url.includes(
        '/air-cargo'
      )
    ) {

      this.activeMenu.set(
        'air-all'
      );

      return;
    }


    if (
      url.includes(
        '/vendor-payments'
      )
    ) {

      this.activeMenu.set(
        'vendor-payments'
      );

      return;
    }


    if (
      url.includes(
        '/invoices'
      )
    ) {

      this.activeMenu.set(
        'invoice'
      );

      return;
    }


    this.activeMenu.set(
      'dashboard'
    );
  }


  /* ============================================================
     CURRENT USER HELPERS
  ============================================================ */

  private getUserName():
    string {

    const user =
      this.auth.currentUser() as {
        name?: string;
      } | null;


    return (
      user?.name ||
      'Logistics Employee'
    );
  }


  private getUserDesignation():
    string {

    const user =
      this.auth.currentUser() as {
        designation?: string;
        role?: string;
      } | null;


    return (
      user?.designation ||
      (
        user?.role ===
        'hr'
          ? 'HR'
          : 'Logistics Executive'
      )
    );
  }

}












