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
  finalize,
  forkJoin,
  of,
  catchError
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


interface WarehouseSummary {
  total?: number;
  active?: number;
  inactive?: number;
  maintenance?: number;
  totalCapacity?: number;
}

interface WarehouseItemSummary {
  total?: number;
  inStock?: number;
  lowStock?: number;
  outOfStock?: number;
  reserved?: number;
  damaged?: number;
}

interface WarehouseIncomingSummary {
  total?: number;
  expected?: number;
  received?: number;
  confirmed?: number;
  cancelled?: number;
}

interface WarehouseOutgoingSummary {
  total?: number;
  preparing?: number;
  dispatched?: number;
  delivered?: number;
  cancelled?: number;
}

interface WarehouseTaskSummary {
  total?: number;
  open?: number;
  inProgress?: number;
  completed?: number;
  cancelled?: number;
  overdue?: number;
  mine?: number;
}

interface WarehouseRecord {
  _id?: string;
  code?: string;
  name?: string;
}

interface WarehouseListResponse {
  data?: WarehouseRecord[];
}

interface WarehouseActivityRow {
  _id?: string;
  warehouseId?: string | null;
  itemId?: string | null;
  type?: string;
  productName?: string;
  sku?: string;
  quantity?: number;
  unit?: string;
  employeeId?: string | null;
  referenceNumber?: string;
  notes?: string;
  occurredAt?: string;
}

interface WarehouseActivityResponse {
  data?: WarehouseActivityRow[];
}

interface WarehouseTaskRow {
  _id?: string;
  title?: string;
  priority?: string;
  status?: string;
  dueDate?: string;
  createdAt?: string;
}

interface WarehouseTaskListResponse {
  data?: WarehouseTaskRow[];
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

interface WarehouseMetric {
  label: string;
  value: string;
  helper: string;
  icon: string;
  tone: 'blue' | 'gold' | 'green' | 'purple';
}

interface QuickActionItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  primary?: boolean;
}

interface RecentActivityItem {
  activityId: string;
  product: string;
  warehouse: string;
  quantity: string;
  status: string;
  statusClass: string;
}

interface TodayOperation {
  icon: string;
  tone: 'blue' | 'gold' | 'green' | 'purple';
  title: string;
  helper: string;
  count: number | string;
}


@Component({
  selector: 'app-warehouse-dashboard',

  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl:
    './warehouse-dashboard.component.html',

  styleUrl:
    './warehouse-dashboard.component.scss'
})
export class WarehouseDashboardComponent
  implements OnInit {

  private readonly api =
    inject(ApiService);

  private readonly auth =
    inject(AuthService);

  private readonly router =
    inject(Router);


  /* ============================================================
     UI STATE
  ============================================================ */

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


  /* ============================================================
     USER
  ============================================================ */

  protected readonly userName =
    this.getUserName();

  protected readonly userDesignation =
    this.getUserDesignation();

  protected readonly timeGreeting =
    computed(
      () =>
        this.getTimeGreeting()
    );

  protected readonly currentDate =
    new Intl.DateTimeFormat(
      'en-IN',
      {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }
    ).format(
      new Date()
    );


  /* ============================================================
     DATA SIGNALS
  ============================================================ */

  protected readonly summary =
    signal<WarehouseSummary>({});

  protected readonly itemsSummary =
    signal<WarehouseItemSummary>({});

  protected readonly incomingSummary =
    signal<WarehouseIncomingSummary>({});

  protected readonly outgoingSummary =
    signal<WarehouseOutgoingSummary>({});

  protected readonly tasksSummary =
    signal<WarehouseTaskSummary>({});

  protected readonly warehouses =
    signal<WarehouseRecord[]>([]);

  protected readonly activityRows =
    signal<WarehouseActivityRow[]>([]);

  protected readonly taskRows =
    signal<WarehouseTaskRow[]>([]);

  protected readonly notifications =
    signal<DashboardNotification[]>([]);

  protected readonly unreadNotificationCount =
    signal(0);

  protected readonly employeeSummary =
    signal<EmployeeDashboardSummary | null>(null);


  protected readonly topAvatarUrl =
    computed(
      () =>
        this.profilePhotoFromSummary()
    );

  protected readonly workspaceName =
    computed(
      () =>
        this.employeeSummary()?.company?.companyName ||
        (
          this.auth.currentUser() as {
            company?: { name?: string };
          } | null
        )?.company?.name ||
        'Warehouse'
    );


  /* ============================================================
     KPI CARDS
  ============================================================ */

  protected readonly metrics =
    computed<WarehouseMetric[]>(
      () => {
        const s = this.summary();
        const items = this.itemsSummary();
        const incoming = this.incomingSummary();
        const outgoing = this.outgoingSummary();
        const tasks = this.tasksSummary();

        return [
          {
            label: 'Total Warehouses',
            value: String(
              Number(s.total || 0)
            ),
            helper:
              `${Number(s.active || 0)} active`,
            icon: '\u2302',
            tone: 'blue'
          },
          {
            label: 'Active Warehouses',
            value: String(
              Number(s.active || 0)
            ),
            helper:
              'Ready for operations',
            icon: '\u2713',
            tone: 'green'
          },
          {
            label: 'Total Capacity',
            value: this.compactNumber(
              Number(s.totalCapacity || 0)
            ),
            helper:
              'Sum of warehouse capacity',
            icon: '\u25A4',
            tone: 'gold'
          },
          {
            label: 'Total Products',
            value: String(
              Number(items.total || 0)
            ),
            helper:
              'Active inventory items',
            icon: '\u25A6',
            tone: 'purple'
          },
          {
            label: 'Incoming Shipments',
            value: String(
              Number(incoming.expected || 0) +
              Number(incoming.received || 0)
            ),
            helper:
              'Expected or received',
            icon: '\u2193',
            tone: 'blue'
          },
          {
            label: 'Outgoing Shipments',
            value: String(
              Number(outgoing.preparing || 0) +
              Number(outgoing.dispatched || 0)
            ),
            helper:
              'Preparing or dispatched',
            icon: '\u2191',
            tone: 'gold'
          },
          {
            label: 'Low Stock Items',
            value: String(
              Number(items.lowStock || 0)
            ),
            helper:
              'At or below reorder level',
            icon: '\u26A0',
            tone: 'green'
          },
          {
            label: 'Pending Tasks',
            value: String(
              Number(tasks.open || 0) +
              Number(tasks.inProgress || 0)
            ),
            helper:
              'Open or in progress',
            icon: '\u25A3',
            tone: 'purple'
          }
        ];
      }
    );


  /* ============================================================
     QUICK ACTIONS
  ============================================================ */

  protected readonly quickActions =
    computed<QuickActionItem[]>(
      () => [
        {
          id: 'warehouse-new',
          icon: '\u2302',
          title: 'New Warehouse',
          description: 'Add a new warehouse record',
          primary: true
        },
        {
          id: 'item-new',
          icon: '\u25A6',
          title: 'Add Item',
          description: 'Add stock to inventory',
          primary: true
        },
        {
          id: 'incoming',
          icon: '\u2193',
          title: 'Incoming Goods',
          description: 'Record goods arriving',
          primary: true
        },
        {
          id: 'outgoing',
          icon: '\u2191',
          title: 'Outgoing Goods',
          description: 'Dispatch goods out',
          primary: true
        },
        {
          id: 'stock-transfer',
          icon: '\u21C4',
          title: 'Stock Transfer',
          description: 'Move stock between warehouses'
        },
        {
          id: 'damaged',
          icon: '\u26A0',
          title: 'Damaged Goods',
          description: 'Report damaged stock'
        }
      ]
    );


  /* ============================================================
     RECENT ACTIVITY
  ============================================================ */

  protected readonly recentActivity =
    computed<RecentActivityItem[]>(
      () =>
        this.activityRows()
          .slice(0, 10)
          .map((row) => ({
            activityId:
              row._id || '',
            product:
              this.activityProduct(row),
            warehouse:
              this.warehouseLabel(
                row.warehouseId
              ),
            quantity:
              this.activityQuantity(row),
            status:
              this.activityTypeLabel(
                row.type
              ),
            statusClass:
              this.activityStatusClass(
                row.type
              )
          }))
    );


  /* ============================================================
     OPERATIONS SIDE PANEL
  ============================================================ */

  protected readonly operations =
    computed<TodayOperation[]>(
      () => {
        const s = this.tasksSummary();

        return [
          {
            icon: '\u2713',
            tone: 'blue',
            title: 'Open Tasks',
            helper: 'Awaiting action',
            count: Number(s.open || 0)
          },
          {
            icon: '\u25F7',
            tone: 'gold',
            title: 'In Progress',
            helper: 'Being worked on',
            count: Number(s.inProgress || 0)
          },
          {
            icon: '\u26A0',
            tone: 'green',
            title: 'Overdue Tasks',
            helper: 'Past due date',
            count: Number(s.overdue || 0)
          },
          {
            icon: '\u25A3',
            tone: 'purple',
            title: 'Completed',
            helper: 'Closed tasks',
            count: Number(s.completed || 0)
          }
        ];
      }
    );


  /* ============================================================
     LIFECYCLE
  ============================================================ */

  ngOnInit(): void {
    this.loadDashboard();
    this.loadNotifications();
    this.loadEmployeeSummary();
  }


  /* ============================================================
     LOADERS
  ============================================================ */

  protected loadDashboard(): void {
    this.isLoading.set(true);
    this.dashboardError.set('');

    forkJoin({
      summary:
        this.api
          .get<WarehouseSummary>(
            '/warehouse/summary'
          )
          .pipe(catchError(() => of({}))),

      itemsSummary:
        this.api
          .get<WarehouseItemSummary>(
            '/warehouse/items/summary'
          )
          .pipe(catchError(() => of({}))),

      incomingSummary:
        this.api
          .get<WarehouseIncomingSummary>(
            '/warehouse/incoming/summary'
          )
          .pipe(catchError(() => of({}))),

      outgoingSummary:
        this.api
          .get<WarehouseOutgoingSummary>(
            '/warehouse/outgoing/summary'
          )
          .pipe(catchError(() => of({}))),

      tasksSummary:
        this.api
          .get<WarehouseTaskSummary>(
            '/warehouse/tasks/summary'
          )
          .pipe(catchError(() => of({}))),

      warehouses:
        this.api
          .get<WarehouseListResponse>(
            '/warehouse/warehouses',
            {
              page: 1,
              limit: 100,
              sortBy: 'name',
              sortOrder: 'asc'
            }
          )
          .pipe(catchError(() => of({ data: [] }))),

      activity:
        this.api
          .get<WarehouseActivityResponse>(
            '/warehouse/activity',
            {
              page: 1,
              limit: 10,
              sortBy: 'occurredAt',
              sortOrder: 'desc'
            }
          )
          .pipe(catchError(() => of({ data: [] }))),

      tasks:
        this.api
          .get<WarehouseTaskListResponse>(
            '/warehouse/tasks',
            {
              page: 1,
              limit: 5,
              status: 'open',
              sortBy: 'dueDate',
              sortOrder: 'asc'
            }
          )
          .pipe(catchError(() => of({ data: [] })))
    })
      .pipe(
        finalize(
          () =>
            this.isLoading.set(false)
        )
      )
      .subscribe({
        next: (result) => {
          this.summary.set(
            result.summary || {}
          );

          this.itemsSummary.set(
            result.itemsSummary || {}
          );

          this.incomingSummary.set(
            result.incomingSummary || {}
          );

          this.outgoingSummary.set(
            result.outgoingSummary || {}
          );

          this.tasksSummary.set(
            result.tasksSummary || {}
          );

          this.warehouses.set(
            Array.isArray(result.warehouses?.data)
              ? result.warehouses.data
              : []
          );

          this.activityRows.set(
            Array.isArray(result.activity?.data)
              ? result.activity.data
              : []
          );

          this.taskRows.set(
            Array.isArray(result.tasks?.data)
              ? result.tasks.data
              : []
          );
        },
        error: (error: any) => {
          this.dashboardError.set(
            error?.error?.message ||
            'Unable to load warehouse dashboard.'
          );
        }
      });
  }


  protected loadNotifications(): void {
    this.api
      .get<NotificationListApi>(
        '/hr/communication/notifications',
        { limit: 3 }
      )
      .subscribe({
        next: (response) =>
          this.notifications.set(
            response?.notifications || []
          ),
        error: () =>
          this.notifications.set([])
      });

    this.api
      .get<NotificationUnreadApi>(
        '/hr/communication/notifications/unread-count'
      )
      .subscribe({
        next: (response) =>
          this.unreadNotificationCount.set(
            Number(response?.unreadCount || 0)
          ),
        error: () =>
          this.unreadNotificationCount.set(0)
      });
  }


  protected loadEmployeeSummary(): void {
    this.api
      .get<EmployeeDashboardSummary>(
        '/hr/employees/dashboard'
      )
      .subscribe({
        next: (response) => {
          this.topAvatarFailed.set(false);
          this.employeeSummary.set(response);

          if (response?.employee?.employeePhoto) {
            this.auth.updateCurrentUserProfileImage(
              response.employee.employeePhoto
            );
          }
        },
        error: () =>
          this.employeeSummary.set(null)
      });
  }


  /* ============================================================
     TOPBAR INTERACTIONS
  ============================================================ */

  protected toggleNotifications(): void {
    this.notificationsOpen.update(
      (value) => !value
    );

    this.profileOpen.set(false);
  }


  protected toggleProfile(): void {
    this.profileOpen.update(
      (value) => !value
    );

    this.notificationsOpen.set(false);
  }


  protected openProfile(): void {
    this.profileOpen.set(false);

    void this.router.navigate(
      ['/warehouse/employee'],
      { queryParams: { feature: 'profile' } }
    );
  }


  protected openSettings(): void {
    this.profileOpen.set(false);

    void this.router.navigate(
      ['/warehouse/employee'],
      { queryParams: { feature: 'settings' } }
    );
  }


  protected logout(): void {
    this.profileOpen.set(false);
    this.notificationsOpen.set(false);

    this.auth.logout();
  }


  /* ============================================================
     ROUTING
  ============================================================ */

  protected selectMenu(id: string): void {
    const routeMap: Record<string, string> = {
      dashboard: '/warehouse/dashboard',
      warehouses: '/warehouse/warehouse-master',
      'warehouse-new': '/warehouse/warehouse-master/new',
      inventory: '/warehouse/inventory',
      'item-new': '/warehouse/inventory/new',
      incoming: '/warehouse/incoming-goods',
      'incoming-new': '/warehouse/incoming-goods/new',
      outgoing: '/warehouse/outgoing-goods',
      'stock-transfer': '/warehouse/stock-transfer',
      damaged: '/warehouse/damaged-goods',
      tasks: '/warehouse/my-tasks',
      activity: '/warehouse/activity'
    };

    const target = routeMap[id];

    if (!target) {
      return;
    }

    void this.router.navigateByUrl(target);
  }


  /* ============================================================
     FORMATTERS
  ============================================================ */

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


  protected handleTopAvatarError(): void {
    this.topAvatarFailed.set(true);
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

    const employeePhoto =
      this.employeeSummary()?.employee?.employeePhoto || '';

    const syncedEmployeePhoto =
      (
        this.auth.currentUser() as {
          profileImage?: string;
        } | null
      )?.profileImage || '';

    const photo =
      employeePhoto ||
      syncedEmployeePhoto;

    if (
      !photo ||
      /opasbizz-crm|\/brand\//i.test(photo)
    ) {
      return '';
    }

    return this.assetUrl(photo);
  }


  private assetUrl(value?: string): string {
    const path = String(value || '').trim();

    if (!path) {
      return '';
    }

    if (
      /^data:/i.test(path) ||
      /^https?:\/\//i.test(path)
    ) {
      return path;
    }

    if (
      path.startsWith('/brand/') ||
      path.startsWith('/assets/')
    ) {
      return path;
    }

    return apiUrl(path);
  }


  private compactNumber(value: number): string {
    const amount = Number(value || 0);

    if (amount >= 10000000) {
      return `${(amount / 10000000).toFixed(2)}Cr`;
    }

    if (amount >= 100000) {
      return `${(amount / 100000).toFixed(2)}L`;
    }

    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }

    return new Intl.NumberFormat('en-IN').format(amount);
  }


  private warehouseLabel(
    warehouseId?: string | null
  ): string {
    if (!warehouseId) {
      return '-';
    }

    const match =
      this.warehouses()
        .find((w) => w._id === warehouseId);

    if (!match) {
      return '-';
    }

    return (
      `${match.name || '-'}` +
      (match.code ? ` (${match.code})` : '')
    );
  }


  private activityProduct(
    row: WarehouseActivityRow
  ): string {
    const name = String(
      row.productName || ''
    ).trim();

    const sku = String(
      row.sku || ''
    ).trim();

    if (!name && !sku) {
      return '-';
    }

    if (name && sku) {
      return `${name} (${sku})`;
    }

    return name || sku;
  }


  private activityQuantity(
    row: WarehouseActivityRow
  ): string {
    const quantity = Number(
      row.quantity || 0
    );

    if (!quantity) {
      return '-';
    }

    const unit =
      row.unit || 'unit';

    return `${this.compactNumber(quantity)} ${unit}`;
  }


  private activityTypeLabel(
    value?: string
  ): string {
    switch (value) {
      case 'goods_received':
        return 'Goods Received';
      case 'goods_dispatched':
        return 'Goods Dispatched';
      case 'stock_added':
        return 'Stock Added';
      case 'stock_removed':
        return 'Stock Removed';
      case 'stock_transferred':
        return 'Stock Transferred';
      case 'damaged_goods_reported':
        return 'Damaged Goods Reported';
      case 'warehouse_created':
        return 'Warehouse Created';
      default:
        return String(value || '-')
          .replace(/[_-]+/g, ' ')
          .replace(/\b\w/g, (l) =>
            l.toUpperCase()
          );
    }
  }


  private activityStatusClass(
    value?: string
  ): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/_/g, '-');
  }


  private getUserName(): string {
    const user =
      this.auth.currentUser() as {
        name?: string;
      } | null;

    return user?.name || 'Warehouse Employee';
  }


  private getUserDesignation(): string {
    const user =
      this.auth.currentUser() as {
        designation?: string;
        role?: string;
      } | null;

    if (user?.designation) {
      return user.designation;
    }

    if (user?.role === 'company_admin') {
      return 'Company Admin';
    }

    if (user?.role === 'super_admin') {
      return 'Super Admin';
    }

    if (user?.role === 'hr') {
      return 'HR Manager';
    }

    return 'Warehouse Executive';
  }

}