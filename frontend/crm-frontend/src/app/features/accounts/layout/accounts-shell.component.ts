import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  Router,
  RouterOutlet
} from '@angular/router';

import {
  AuthService
} from '../../../core/auth/auth.service';

import {
  apiUrl
} from '../../../core/config/api.config';
import { ApiService } from '../../../core/services/api.service';
import { DepartmentInvoiceRealtimeService } from '../../../core/services/department-invoice-realtime.service';
import { navigateToNotification } from '../../../core/services/notification-navigation.service';

import {
  AccountsSidebarComponent
} from '../components/accounts-sidebar/accounts-sidebar.component';
import { SupportTicketFormComponent } from '../../../shared/components/support-ticket-form/support-ticket-form.component';

interface EmployeePhotoResponse {
  user?: { id?: string };
  employee?: {
    _id?: string;
    userId?: string | null;
    companyId?: string;
    employeePhoto?: string;
  } | null;
}

interface AccountsNotification {
  _id?: string;
  title?: string;
  message?: string;
  createdAt?: string;
  isRead?: boolean;
  actionUrl?: string;
  entityType?: string;
  entityId?: string | null;
}

@Component({
  selector: 'app-accounts-shell',

  standalone: true,

  imports: [
    RouterOutlet,
    AccountsSidebarComponent,
    SupportTicketFormComponent
  ],

  templateUrl:
    './accounts-shell.component.html',

  styleUrl:
    './accounts-shell.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class AccountsShellComponent implements OnInit {

  private readonly router =
    inject(Router);

  private readonly auth =
    inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly realtime = inject(DepartmentInvoiceRealtimeService);
  private readonly employeeProfileImage = signal<{
    userId: string;
    companyId: string;
    photo: string;
  } | null>(null);

  ngOnInit(): void {
    this.loadNotifications();
    this.realtime.connect();
    this.realtime.notifications$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notification) => this.addRealtimeNotification(notification as AccountsNotification));

    const user = this.auth.getCurrentUser();
    if (!user?.id || !user.companyId) return;

    const userId = user.id;
    const companyId = user.companyId;
    const employeeId = (user as { employee?: string }).employee;

    // Existing self endpoint: the backend resolves the employee from req.user,
    // with company scoping and the authenticated user link taking priority.
    this.api.get<EmployeePhotoResponse>('/hr/employees/dashboard')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const employee = response?.employee;
          if (response?.user?.id !== userId || employee?.companyId !== companyId) return;
          if (employee.userId ? employee.userId !== userId : !employeeId || employee._id !== employeeId) return;

          this.employeeProfileImage.set({
            userId,
            companyId,
            photo: employee.employeePhoto || ''
          });
        },
        // Keep initials when the authenticated employee photo is unavailable.
        error: () => {}
      });
  }

  readonly notificationOpen = signal(false);
  readonly notifications = signal<AccountsNotification[]>([]);
  protected readonly visibleNotifications = computed(() =>
    this.notifications().filter((n) => !n.isRead).slice(0, 4)
  );
  readonly unreadCount = signal(0);

  toggleNotifications(): void {
    this.notificationOpen.update(value => !value);
    if (this.notificationOpen()) this.loadNotifications();
  }

  protected clearNotifications(): void {
    this.notifications.set([]);
    this.unreadCount.set(0);
    this.api.patch('/hr/communication/notifications/read-all', {})
      .subscribe({ error: () => undefined });
  }

  protected openNotification(notification: AccountsNotification): void {
    const current = this.notifications().find((item) =>
      notification._id ? item._id === notification._id : item === notification
    );
    if (current && !current.isRead) {
      this.notifications.update((items) =>
        items.map((item) => item === current ? { ...item, isRead: true } : item)
      );
      this.unreadCount.update((count) => Math.max(0, count - 1));
    }
    if (notification._id && !notification.isRead) {
      this.api.patch(`/hr/communication/notifications/${encodeURIComponent(notification._id)}/read`, {})
        .subscribe({ error: () => undefined });
    }
    navigateToNotification(this.router, notification, this.auth.currentUser()?.role);
    this.notificationOpen.set(false);
  }

  notificationTime(value?: string): string {
    if (!value) return '';
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }

  private loadNotifications(): void {
    this.api.get<{ notifications?: AccountsNotification[] }>('/hr/communication/notifications', { limit: 5 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: response => this.notifications.set(response?.notifications || []), error: () => this.notifications.set([]) });
    this.api.get<{ unreadCount?: number }>('/hr/communication/notifications/unread-count')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: response => this.unreadCount.set(Number(response?.unreadCount || 0)), error: () => this.unreadCount.set(0) });
  }

  private addRealtimeNotification(notification: AccountsNotification): void {
    if (!notification || !notification.title && !notification.message) return;
    this.notifications.update(rows => [notification, ...rows.filter(row => row._id !== notification._id)].slice(0, 5));
    if (!notification.isRead) this.unreadCount.update(count => count + 1);
  }


  /* =========================================================
     CURRENT USER
  ========================================================= */

  readonly userMenuOpen =
    signal(false);

  private readonly failedProfileImage =
    signal('');


  readonly companyName =
    computed(() => {

      const user =
        this.auth.currentUser() as {
          company?: {
            name?: string;
            companyName?: string;
          };
          companyId?:
            | string
            | {
                name?: string;
                companyName?: string;
              };
        } | null;

      const company =
        user?.company ||
        (
          typeof user?.companyId === 'object'
            ? user.companyId
            : undefined
        );

      return String(
        company?.name ||
        company?.companyName ||
        'Registered Company'
      ).trim();

    });


  readonly userName =
    computed(() => {

      const user =
        this.auth.currentUser() as {
          name?: string;
          fullName?: string;
          displayName?: string;
          email?: string;
          profile?: {
            fullName?: string;
            displayName?: string;
          };
        } | null;

      return String(
        user?.name ||
        user?.fullName ||
        user?.displayName ||
        user?.profile?.fullName ||
        user?.profile?.displayName ||
        user?.email ||
        'Accountant'
      ).trim();

    });


  readonly userDesignation =
    computed(() => {

      const user =
        this.auth.currentUser() as {
          designation?: string;
          department?: string;
          role?: string;
          roleRef?: {
            name?: string;
          };
          profile?: {
            designation?: string;
            department?: string;
          };
        } | null;

      const label =
        String(
          user?.designation ||
          user?.profile?.designation ||
          user?.roleRef?.name ||
          user?.profile?.department ||
          user?.department ||
          user?.role ||
          'Accounts'
        )
          .trim()
          .replace(
            /_/g,
            ' '
          );

      return label.replace(
        /\b\w/g,
        character =>
          character.toUpperCase()
      );

    });


  readonly userInitial =
    computed(
      () =>
        this.userName()
          .trim()
          .charAt(0)
          .toUpperCase() ||
        'A'
    );


  readonly userProfileImage =
    computed(() => {

      const user =
        this.auth.currentUser() as {
          id?: string;
          companyId?: string;
        } | null;

      const employeeImage = this.employeeProfileImage();
      const employeePhoto = employeeImage?.userId === user?.id &&
        employeeImage?.companyId === user?.companyId ? employeeImage?.photo : '';

      const image =
        String(
          employeePhoto ||
          ''
        ).trim();

      if (!image) {
        return '';
      }

      const resolved =
        this.assetUrl(image);

      return this.failedProfileImage() === resolved
        ? ''
        : resolved;

    });


  onProfileImageError(): void {

    const currentImage =
      this.userProfileImage();

    if (currentImage) {
      this.failedProfileImage.set(
        currentImage
      );
    }

  }


  /* =========================================================
     ASSET URL
  ========================================================= */

  private assetUrl(
    value?: string
  ): string {

    const asset =
      String(value || '').trim();

    if (!asset) {
      return '';
    }

    if (
      /^https?:\/\//i.test(asset) ||
      asset.startsWith('data:') ||
      asset.startsWith('blob:') ||
      asset.startsWith('/brand/')
    ) {
      return asset;
    }

    return apiUrl(asset);

  }


  /* =========================================================
     MOBILE SIDEBAR
  ========================================================= */

  readonly mobileSidebarOpen =
    signal(false);


  openMobileSidebar(): void {

    this.mobileSidebarOpen.set(
      true
    );

  }


  closeMobileSidebar(): void {

    this.mobileSidebarOpen.set(
      false
    );

  }


  toggleMobileSidebar(): void {

    this.mobileSidebarOpen.update(
      value => !value
    );

  }


  /* =========================================================
     USER MENU
  ========================================================= */

  toggleUserMenu(): void {

    this.userMenuOpen.update(
      value => !value
    );

  }


  openProfile(): void {

    this.userMenuOpen.set(
      false
    );

    void this.router.navigate(
      [
        '/accounts/employee'
      ],
      {
        queryParams: {
          feature: 'profile'
        }
      }
    );

  }


  openSettings(): void {

    this.userMenuOpen.set(
      false
    );

    void this.router.navigate(
      [
        '/accounts/settings'
      ]
    );

  }


  logout(): void {

    this.userMenuOpen.set(
      false
    );

    this.auth.logout();

  }

}
