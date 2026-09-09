import { CommonModule } from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  inject,
  signal
} from '@angular/core';

import {
  NavigationEnd,
  Router,
  RouterOutlet
} from '@angular/router';

import {
  filter
} from 'rxjs';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  PurchaseSidebarComponent
} from '../components/purchase-sidebar/purchase-sidebar.component';

import {
  ApiService
} from '../../../core/services/api.service';

import {
  AuthService
} from '../../../core/auth/auth.service';


interface PurchaseEmployeeDashboard {
  employee?: {
    _id?: string;
    employeeCode?: string;

    displayName?: string;
    firstName?: string;
    lastName?: string;

    employeePhoto?: string;
    profileImage?: string;

    designation?: string;

    designationId?: {
      designationName?: string;
      name?: string;
    } | null;
  } | null;

  user?: {
    _id?: string;

    name?: string;
    fullName?: string;
    displayName?: string;

    firstName?: string;
    lastName?: string;

    designation?: string;
    profileImage?: string;
  } | null;

  company?: {
    _id?: string;

    companyName?: string;
    name?: string;

    logo?: string;
    logoUrl?: string;
  } | null;
}

interface PurchaseNotification {
  _id?: string;
  title?: string;
  message?: string;
  createdAt?: string;
  isRead?: boolean;
  actionUrl?: string;
}

interface PurchaseSearchItem {
  label: string;
  description: string;
  route: string;
}


@Component({
  selector: 'app-purchase-shell',

  standalone: true,

  imports: [
    CommonModule,
    RouterOutlet,
    PurchaseSidebarComponent
  ],

  templateUrl:
    './purchase-shell.component.html',

  styleUrl:
    './purchase-shell.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class PurchaseShellComponent {

  private readonly router =
    inject(Router);

  private readonly api =
    inject(ApiService);

  private readonly auth =
    inject(AuthService);

  private readonly destroyRef =
    inject(DestroyRef);


  /* =========================================================
     UI STATE
  ========================================================= */

  readonly profileOpen =
    signal(false);

  readonly searchOpen =
    signal(false);

  readonly notificationOpen =
    signal(false);

  readonly searchTerm =
    signal('');

  readonly notifications =
    signal<PurchaseNotification[]>([]);

  readonly unreadNotificationCount =
    signal(0);

  readonly employeeDashboard =
    signal<PurchaseEmployeeDashboard | null>(
      null
    );

  readonly currentUrl =
    signal(
      this.router.url
    );

  readonly avatarLoadFailed =
    signal(false);

  private readonly searchItems: PurchaseSearchItem[] = [
    { label: 'Purchase Dashboard', description: 'Purchase overview', route: '/purchase/dashboard' },
    { label: 'Purchase Requests', description: 'Requests and approvals', route: '/purchase/purchase-requests' },
    { label: 'Vendor Enquiries / RFQ', description: 'Supplier enquiries', route: '/purchase/vendor-enquiries' },
    { label: 'Quotations', description: 'Vendor quotations', route: '/purchase/quotations' },
    { label: 'Quotation Comparison', description: 'Compare quotations', route: '/purchase/quotations/comparison' },
    { label: 'Purchase Orders', description: 'Orders and approvals', route: '/purchase/purchase-orders' },
    { label: 'Goods Receipt / GRN', description: 'Received goods', route: '/purchase/goods-receipts' },
    { label: 'Vendors', description: 'Purchase vendor directory', route: '/purchase/vendors' },
    { label: 'Reports', description: 'Purchase reports', route: '/purchase/reports' }
  ];

  readonly searchResults =
    computed(() => {
      const term = this.searchTerm().trim().toLowerCase();

      if (!term) {
        return this.searchItems;
      }

      return this.searchItems.filter(item =>
        `${item.label} ${item.description}`.toLowerCase().includes(term)
      );
    });


  /* =========================================================
     EMPLOYEE
  ========================================================= */

  readonly userName =
    computed(() => {

      const dashboard =
        this.employeeDashboard();

      const employee =
        dashboard?.employee;

      const user =
        dashboard?.user;


      const employeeDisplayName =
        employee?.displayName?.trim();

      if (employeeDisplayName) {
        return employeeDisplayName;
      }


      const employeeFullName =
        [
          employee?.firstName,
          employee?.lastName
        ]
          .filter(Boolean)
          .join(' ')
          .trim();

      if (employeeFullName) {
        return employeeFullName;
      }


      const userName =
        user?.displayName?.trim() ||
        user?.fullName?.trim() ||
        user?.name?.trim();

      if (userName) {
        return userName;
      }


      const userFullName =
        [
          user?.firstName,
          user?.lastName
        ]
          .filter(Boolean)
          .join(' ')
          .trim();


      return (
        userFullName ||
        'Purchase Employee'
      );
    });


  readonly userDesignation =
    computed(() => {

      const employee =
        this.employeeDashboard()
          ?.employee;

      const user =
        this.employeeDashboard()
          ?.user;


      return (
        employee?.designationId
          ?.designationName ||
        employee?.designationId
          ?.name ||
        employee?.designation ||
        user?.designation ||
        'Purchase Executive'
      );
    });


  readonly userInitial =
    computed(() => {

      return (
        this.userName()
          .trim()
          .charAt(0)
          .toUpperCase() ||
        'P'
      );
    });


  readonly employeePhotoUrl =
    computed(() => {

      if (
        this.avatarLoadFailed()
      ) {
        return '';
      }


      const employee =
        this.employeeDashboard()
          ?.employee;

      const user =
        this.employeeDashboard()
          ?.user;


      const photo =
        employee?.employeePhoto ||
        employee?.profileImage ||
        user?.profileImage ||
        '';


      return this.assetUrl(
        photo
      );
    });


  /* =========================================================
     COMPANY
  ========================================================= */

  readonly companyName =
    computed(() => {

      const company =
        this.employeeDashboard()
          ?.company;


      return (
        company?.companyName ||
        company?.name ||
        'Opas Bizz Pvt. Ltd'
      );
    });


  /* =========================================================
     PAGE TITLE
  ========================================================= */

  readonly pageTitle =
    computed(() => {

      const url =
        this.currentUrl()
          .split('?')[0];


      if (
        url.includes(
          '/purchase/purchase-requests'
        )
      ) {
        return 'Purchase Requests';
      }


      if (
        url.includes(
          '/purchase/vendor-enquiries'
        )
      ) {
        return 'Vendor Enquiries / RFQ';
      }


      if (
        url.includes(
          '/purchase/quotations/comparison'
        )
      ) {
        return 'Quotation Comparison';
      }


      if (
        url.includes(
          '/purchase/quotations'
        )
      ) {
        return 'Quotations';
      }


      if (
        url.includes(
          '/purchase/purchase-orders'
        )
      ) {
        return 'Purchase Orders';
      }


      if (
        url.includes(
          '/purchase/goods-receipts'
        )
      ) {
        return 'Goods Receipt / GRN';
      }


      if (
        url.includes(
          '/purchase/vendors'
        )
      ) {
        return 'Vendor Master';
      }


      if (
        url.includes(
          '/purchase/reports'
        )
      ) {
        return 'Purchase Reports';
      }


      return 'Purchase Dashboard';
    });


  /* =========================================================
     CONSTRUCTOR
  ========================================================= */

  constructor() {

    this.loadEmployeeDashboard();
    this.loadNotifications();


    this.router.events
      .pipe(
        filter(
          (
            event
          ):
            event is NavigationEnd =>
              event instanceof NavigationEnd
        ),

        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe(
        (
          event
        ) => {

          this.currentUrl.set(
            event.urlAfterRedirects
          );

          this.profileOpen.set(
            false
          );

          this.searchOpen.set(false);
          this.notificationOpen.set(false);
        }
      );
  }


  /* =========================================================
     PROFILE MENU
  ========================================================= */

  toggleProfile(
    event: MouseEvent
  ): void {

    event.stopPropagation();

    this.profileOpen.update(
      value =>
        !value
    );

    this.searchOpen.set(false);
    this.notificationOpen.set(false);
  }


  toggleSearch(event: MouseEvent): void {
    event.stopPropagation();
    this.searchOpen.update(value => !value);
    this.notificationOpen.set(false);
    this.profileOpen.set(false);
  }


  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();
    this.notificationOpen.update(value => !value);
    this.searchOpen.set(false);
    this.profileOpen.set(false);

    if (this.notificationOpen()) {
      this.loadNotifications();
    }
  }


  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }


  openSearchItem(item: PurchaseSearchItem): void {
    this.searchOpen.set(false);
    this.searchTerm.set('');
    void this.router.navigateByUrl(item.route);
  }


  openAllNotifications(): void {
    this.notificationOpen.set(false);
    void this.router.navigate(
      ['/purchase/employee'],
      { queryParams: { feature: 'notifications' } }
    );
  }


  openNotification(notification: PurchaseNotification): void {
    const navigate = () => {
      this.notificationOpen.set(false);

      if (notification.actionUrl?.startsWith('/')) {
        void this.router.navigateByUrl(notification.actionUrl);
      }
    };

    if (!notification._id || notification.isRead) {
      navigate();
      return;
    }

    this.api
      .patch<PurchaseNotification>(
        `/hr/communication/notifications/${encodeURIComponent(notification._id)}/read`,
        {}
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.update(rows =>
            rows.map(row =>
              row._id === notification._id
                ? { ...row, isRead: true }
                : row
            )
          );
          this.unreadNotificationCount.update(count =>
            Math.max(0, count - 1)
          );
          navigate();
        },
        error: navigate
      });
  }


  closeProfile(): void {

    this.profileOpen.set(
      false
    );
  }


  @HostListener(
    'document:click'
  )
  onDocumentClick(): void {
    this.profileOpen.set(false);
    this.searchOpen.set(false);
    this.notificationOpen.set(false);
  }


  openProfile(): void {

    this.closeProfile();

    void this.router.navigate(
      [
        '/purchase/employee'
      ],
      {
        queryParams: {
          feature:
            'profile'
        }
      }
    );
  }


  openSettings(): void {

    this.closeProfile();

    void this.router.navigate(
      [
        '/purchase/employee'
      ],
      {
        queryParams: {
          feature:
            'settings'
        }
      }
    );
  }


  logout(): void {

    this.closeProfile();

    this.auth.logout();
  }


  handleAvatarError(): void {

    this.avatarLoadFailed.set(
      true
    );
  }


  /* =========================================================
     EMPLOYEE DASHBOARD
  ========================================================= */

  private loadEmployeeDashboard():
    void {

    this.api
      .get<PurchaseEmployeeDashboard>(
        '/hr/employees/dashboard'
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next:
          (
            response
          ) => {

            this.employeeDashboard.set(
              response || null
            );

            this.avatarLoadFailed.set(
              false
            );
          },

        error:
          () => {

            /*
             * Purchase workspace should remain usable
             * even when employee profile loading fails.
             */
            this.employeeDashboard.set(
              null
            );
          }

      });
  }


  private loadNotifications(): void {
    this.api
      .get<{ notifications?: PurchaseNotification[] }>(
        '/hr/communication/notifications',
        { limit: 5 }
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: response =>
          this.notifications.set(response?.notifications || []),
        error: () =>
          this.notifications.set([])
      });

    this.api
      .get<{ unreadCount?: number }>(
        '/hr/communication/notifications/unread-count'
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: response =>
          this.unreadNotificationCount.set(
            Number(response?.unreadCount || 0)
          ),
        error: () =>
          this.unreadNotificationCount.set(0)
      });
  }


  notificationTime(value?: string): string {
    if (!value) {
      return '';
    }

    return new Intl.DateTimeFormat(
      'en-IN',
      {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    ).format(new Date(value));
  }


  /* =========================================================
     ASSET URL
  ========================================================= */

  private assetUrl(
    value:
      string |
      null |
      undefined
  ): string {

    const source =
      String(
        value ||
        ''
      )
        .trim();


    if (!source) {
      return '';
    }


    if (
      /^https?:\/\//i
        .test(source) ||
      source.startsWith(
        'data:'
      ) ||
      source.startsWith(
        'blob:'
      )
    ) {
      return source;
    }


    return source.startsWith('/')
      ? source
      : `/${source}`;
  }
}
