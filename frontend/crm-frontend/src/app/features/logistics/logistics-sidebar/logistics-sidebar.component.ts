import { CommonModule } from '@angular/common';

import {
  Component,
  computed,
  inject,
  signal
} from '@angular/core';

import {
  NavigationEnd,
  Router
} from '@angular/router';

import {
  filter
} from 'rxjs';

import {
  AuthService
} from '../../../core/auth/auth.service';

import {
  apiUrl
} from '../../../core/config/api.config';

import {
  ApiService
} from '../../../core/services/api.service';


interface LogisticsMenuChild {
  id: string;
  label: string;
  route: string;
  permissionAction?: 'view' | 'create';
}


interface LogisticsMenuItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
  subModule?: string;
  permissionAction?: 'view' | 'create';
  children?: LogisticsMenuChild[];
}


interface LogisticsMenuGroup {
  title: string;
  items: LogisticsMenuItem[];
}

interface LogisticsPermission {
  module: 'logistics';
  subModule: string;
  view: boolean;
  viewScope: 'own' | 'team' | 'all';
  create: boolean;
  edit: boolean;
  delete: boolean;
  updateStatus: boolean;
}

interface LogisticsEmployeeDashboard {
  employee?: {
    employeePhoto?: string;
  } | null;
  company?: {
    companyName?: string;
    logo?: string;
  } | null;
}


@Component({
  selector: 'app-logistics-sidebar',

  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl:
    './logistics-sidebar.component.html',

  styleUrl:
    './logistics-sidebar.component.scss'
})
export class LogisticsSidebarComponent {

  private readonly router =
    inject(Router);

  private readonly auth =
    inject(AuthService);

  private readonly api =
    inject(ApiService);


  /* ============================================================
     SIDEBAR STATE
  ============================================================ */

  protected readonly collapsed =
    signal(false);


  protected readonly expandedMenus =
    signal<Record<string, boolean>>({
      'air-cargo': true
    });


  protected readonly currentUrl =
    signal(
      this.router.url
    );


  protected readonly employeeDashboard =
    signal<LogisticsEmployeeDashboard | null>(null);


  protected readonly logisticsPermissions =
    signal<LogisticsPermission[]>([]);


  private readonly logisticsPermissionsLoaded =
    signal(false);


  /* ============================================================
     CURRENT USER
  ============================================================ */

  protected readonly userName =
    computed(
      () => {

        const user =
          this.getCurrentUser();

        return (
          user?.name ||
          user?.fullName ||
          'Logistics Employee'
        );
      }
    );


  protected readonly userDesignation =
    computed(
      () => {

        const user =
          this.getCurrentUser();

        return (
          user?.designation ||
          this.roleLabel(
            user?.role
          )
        );
      }
    );


  protected readonly companyName =
    computed(
      () => {

        const user =
          this.getCurrentUser();

        const company =
          user && 'company' in user
            ? user.company
            : null;

        return (
          this.employeeDashboard()?.company?.companyName ||
          company?.name ||
          'OPAS'
        );
      }
    );


  protected readonly companyLogoUrl =
    computed(
      () => {

        const user =
          this.getCurrentUser();

        const company =
          user && 'company' in user
            ? user.company
            : null;

        return this.assetUrl(
          this.employeeDashboard()?.company?.logo ||
          company?.logoUrl ||
          user?.profileImage ||
          '/brand/opasbizz-crm.webp'
        );
      }
    );


  protected readonly employeePhotoUrl =
    computed(
      () => {
        const photo =
          this.employeeDashboard()?.employee?.employeePhoto ||
          this.getCurrentUser()?.profileImage ||
          '';

        if (!photo || /opasbizz-crm|\/brand\//i.test(photo)) {
          return '';
        }

        return this.assetUrl(photo);
      }
    );

  protected readonly userInitial =
    computed(
      () => {

        const name =
          this.userName()
            .trim();

        return (
          name
            .charAt(0)
            .toUpperCase() ||
          'L'
        );
      }
    );


  /* ============================================================
     MENU
  ============================================================ */

  protected readonly menuGroups:
    LogisticsMenuGroup[] = [

      {
        title:
          'MAIN',

        items: [

          {
            id:
              'dashboard',

            label:
              'Dashboard',

            icon:
              '\u2302',

            route:
              '/logistics/dashboard',

            subModule:
              'airCargo'
          },

          {
            id:
              'logistics',

            label:
              'Logistics',

            icon:
              '\u25C8',

            route:
              '/logistics/air-cargo',

            subModule:
              'airCargo'
          },

          {
            id:
              'invoice',

            label:
              'Invoice',

            icon:
              '\u25A4',

            route:
              '/logistics/invoices',

            subModule:
              'airCargo'
          },

          {
            id:
              'vendor-payments',

            label:
              'Vendor Payments',

            icon:
              '\u20B9',

            route:
              '/logistics/vendor-payments',

            subModule:
              'airCargo'
          }
        ]
      },


      {
        title:
          'LOGISTICS',

        items: [

          {
            id:
              'air-cargo',

            label:
              'Air Cargo',

            icon:
              '\u2708',

            route:
              '/logistics/air-cargo',

            subModule:
              'airCargo',

            children: [

              {
                id:
                  'air-new',

                label:
                  'New Shipment',

                route:
                  '/logistics/air-cargo/new',

                permissionAction:
                  'create'
              },

              {
                id:
                  'air-all',

                label:
                  'All Shipments',

                route:
                  '/logistics/air-cargo/all'
              },

              {
                id:
                  'air-pending',

                label:
                  'Pending Shipments',

                route:
                  '/logistics/air-cargo/pending'
              },

              {
                id:
                  'air-delivered',

                label:
                  'Delivered Shipments',

                route:
                  '/logistics/air-cargo/delivered'
              },

              {
                id:
                  'air-cancelled',

                label:
                  'Cancelled Shipments',

                route:
                  '/logistics/air-cargo/cancelled'
              }
            ]
          },

          {
            id:
              'sea-freight',

            label:
              'Sea Freight',

            icon:
              '\u25D2',

            route:
              '/logistics/sea-freight',

            subModule:
              'seaFreight'
          },



          {
            id:
              'tracking',

            label:
              'Tracking',

            icon:
              '\u25CE',

            route:
              '/logistics/tracking',

            subModule:
              'tracking'
          },

          {
            id:
              'documents',

            label:
              'Documents',

            icon:
              '\u25B1',

            route:
              '/logistics/documents',

            subModule:
              'documents'
          },
          {
            id:
              'cha',

            label:
              'CHA',

            icon:
              '\u25C6',

            route:
              '/logistics/cha',

            subModule:
              'cha',

            children: [
              { id: 'cha-dashboard', label: 'Dashboard', route: '/logistics/cha' },
              { id: 'cha-master', label: 'CHA Master', route: '/logistics/cha/master' },
              { id: 'cha-clearance-new', label: 'New Clearance', route: '/logistics/cha/clearance/new', permissionAction: 'create' },
              { id: 'cha-pending', label: 'Pending', route: '/logistics/cha?status=documents_pending' },
              { id: 'cha-cleared', label: 'Cleared', route: '/logistics/cha?status=cleared' }
            ]
          },



          {
            id:
              'transporters',

            label:
              'Transporters',

            icon:
              '\u25A3',

            route:
              '/logistics/transporters',

            subModule:
              'transporters'
          },

          {
            id:
              'warehouse',

            label:
              'Warehouse',

            icon:
              '\u2302',

            route:
              '/logistics/warehouse',

            subModule:
              'warehouse'
          },


          {
            id:
              'customers',

            label:
              'Customers',

            icon:
              '\u2659',

            route:
              '/logistics/customers',

            subModule:
              'airCargo'
          },

          {
            id:
              'vendors',

            label:
              'Vendors',

            icon:
              '\u2659',

            route:
              '/logistics/vendors',

            subModule:
              'airCargo'
          },

          {
            id:
              'products-services',

            label:
              'Products / Services',

            icon:
              '\u25C7',

            route:
              '/logistics/products-services',

            subModule:
              'airCargo'
          }
        ]
      },


      {
        title:
          'REPORTS',

        items: [

          {
            id:
              'sales-report',

            label:
              'Sales Report',

            icon:
              '\u2301',

            route:
              '/logistics/reports/sales',

            subModule:
              'airCargo'
          },

          {
            id:
              'outstanding-report',

            label:
              'Outstanding Report',

            icon:
              '\u25A4',

            route:
              '/logistics/reports/outstanding',

            subModule:
              'airCargo'
          },

          {
            id:
              'gst-report',

            label:
              'GST Report',

            icon:
              '%',

            route:
              '/logistics/reports/gst',

            subModule:
              'airCargo'
          },

          {
            id:
              'payments-report',

            label:
              'Payments Report',

            icon:
              '\u20B9',

            route:
              '/logistics/reports/vendor-payment',

            subModule:
              'airCargo'
          }
        ]
      },


      {
        title:
          'MY EMPLOYEE',

        items: [

          {
            id:
              'my-profile',

            label:
              'Personal Details',

            icon:
              'P',

            route:
              '/logistics/employee?feature=profile',

            subModule:
              'documents'
          },

          {
            id:
              'attendance',

            label:
              'Attendance',

            icon:
              '\u25F7',

            route:
              '/logistics/employee?feature=attendance',

            subModule:
              'documents'
          },

          {
            id:
              'attendance-history',

            label:
              'Attendance History',

            icon:
              'A',

            route:
              '/logistics/employee?feature=attendance-history',

            subModule:
              'documents'
          },

          {
            id:
              'leave',

            label:
              'Leave',

            icon:
              '\u25A1',

            route:
              '/logistics/employee?feature=apply-leave',

            subModule:
              'documents'
          },

          {
            id:
              'leave-history',

            label:
              'Leave History',

            icon:
              'Y',

            route:
              '/logistics/employee?feature=leave-history',

            subModule:
              'documents'
          },

          {
            id:
              'leave-balance',

            label:
              'Leave Balance',

            icon:
              'B',

            route:
              '/logistics/employee?feature=leave-balance',

            subModule:
              'documents'
          },

          {
            id:
              'payslips',

            label:
              'Payslips',

            icon:
              '\u20B9',

            route:
              '/logistics/employee?feature=payslip',

            subModule:
              'documents'
          },

          {
            id:
              'employee-documents',

            label:
              'Documents',

            icon:
              'D',

            route:
              '/logistics/employee?feature=documents',

            subModule:
              'documents'
          },

          {
            id:
              'bank-details',

            label:
              'Bank Details',

            icon:
              'B',

            route:
              '/logistics/employee?feature=bank',

            subModule:
              'documents'
          },

          {
            id:
              'events',

            label:
              'Company Events',

            icon:
              'E',

            route:
              '/logistics/employee?feature=events',

            subModule:
              'documents'
          },

          {
            id:
              'holidays',

            label:
              'Holidays',

            icon:
              '\u2606',

            route:
              '/logistics/employee?feature=holidays',

            subModule:
              'documents'
          },

          {
            id:
              'meetings',

            label:
              'Meetings',

            icon:
              '\u2667',

            route:
              '/logistics/employee?feature=meetings',

            subModule:
              'documents'
          },

          {
            id:
              'messages',

            label:
              'Messages',

            icon:
              '\u2709',

            route:
              '/logistics/employee?feature=messages',

            subModule:
              'documents'
          },

          {
            id:
              'change-password',

            label:
              'Change Password',

            icon:
              'K',

            route:
              '/logistics/employee?feature=settings',

            subModule:
              'documents'
          }
        ]
      }
    ];




  protected readonly visibleMenuGroups =
    computed<LogisticsMenuGroup[]>(
      () => this.menuGroups
        .map((group) => ({
          ...group,
          items: group.items
            .filter((item) => this.canViewItem(item))
            .map((item) => ({
              ...item,
              children: item.children?.filter((child) => this.canViewChild(item, child))
            }))
        }))
        .filter((group) => group.items.length > 0)
    );


  /* ============================================================
     CONSTRUCTOR
  ============================================================ */

  constructor() {

    this.loadEmployeeDashboard();
    this.loadLogisticsPermissions();

    this.router.events
      .pipe(
        filter(
          (
            event
          ):
            event is NavigationEnd =>
            event instanceof
            NavigationEnd
        )
      )
      .subscribe(
        (
          event
        ) => {

          this.currentUrl.set(
            event.urlAfterRedirects
          );


          if (
            event.urlAfterRedirects
              .includes(
                '/logistics/air-cargo'
              )
          ) {

            this.expandedMenus.update(
              (
                current
              ) => ({

                ...current,

                'air-cargo':
                  true
              })
            );
          }
        }
      );
  }


  /* ============================================================
     COLLAPSE
  ============================================================ */

  protected toggleSidebar():
    void {

    this.collapsed.update(
      value =>
        !value
    );
  }


  /* ============================================================
     CHILD MENU
  ============================================================ */

  protected toggleMenu(
    id: string,
    event?: Event
  ): void {

    event?.stopPropagation();


    this.expandedMenus.update(
      current => ({

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
     NAVIGATION
  ============================================================ */

  protected navigate(
    route?: string
  ): void {

    if (!route) {
      return;
    }


    void this.router
      .navigateByUrl(
        route
      );
  }


  /* ============================================================
     ACTIVE ROUTE
  ============================================================ */

  protected isActive(
    item: LogisticsMenuItem
  ): boolean {

    if (!item.route) {
      return false;
    }


    if (
      item.route.includes(
        '/logistics/employee?'
      )
    ) {

      return (
        this.cleanUrlWithQuery(
          this.currentUrl()
        ) ===
        this.cleanUrlWithQuery(
          item.route
        )
      );
    }


    const current =
      this.cleanUrl(
        this.currentUrl()
      );


    const target =
      this.cleanUrl(
        item.route
      );


    /*
     * Dashboard must only be active on the
     * exact dashboard route.
     */
    if (
      item.id ===
      'dashboard'
    ) {

      return (
        current ===
        '/logistics/dashboard'
      );
    }


    /*
     * Air Cargo parent remains active while
     * browsing any Air Cargo child screen.
     */
    if (
      item.id ===
      'air-cargo'
    ) {

      return current.startsWith(
        '/logistics/air-cargo'
      );
    }


    return (
      current ===
      target
    );
  }


  protected isChildActive(
    child:
      LogisticsMenuChild
  ): boolean {

    const current =
      this.cleanUrl(
        this.currentUrl()
      );


    const target =
      this.cleanUrl(
        child.route
      );


    return (
      current ===
      target
    );
  }




  private loadLogisticsPermissions():
    void {

    this.api
      .get<{ permissions?: LogisticsPermission[] }>(
        '/logistics/overview'
      )
      .subscribe({
        next: (overview) => {
          this.logisticsPermissions.set(
            Array.isArray(overview?.permissions)
              ? overview.permissions
              : []
          );
          this.logisticsPermissionsLoaded.set(true);
        },
        error: () => {
          this.logisticsPermissions.set([]);
          this.logisticsPermissionsLoaded.set(true);
        }
      });
  }


  private canViewItem(
    item: LogisticsMenuItem
  ): boolean {

    /*
     * These core logistics master menus must always remain visible.
     * Their page/API can still enforce authorization separately.
     */
    if (
      [
        'cha',
        'transporters',
        'warehouse'
      ].includes(item.id)
    ) {
      return true;
    }

    if (!item.subModule) {
      return true;
    }

    return this.hasPermission(
      item.subModule,
      item.permissionAction || 'view'
    );
  }


  private canViewChild(
    parent: LogisticsMenuItem,
    child: LogisticsMenuChild
  ): boolean {

    return this.hasPermission(
      parent.subModule || '',
      child.permissionAction || 'view'
    );
  }


  private hasPermission(
    subModule: string,
    action: 'view' | 'create'
  ): boolean {

    const permissions =
      this.logisticsPermissions();

    if (!this.logisticsPermissionsLoaded() || permissions.length === 0) {
      return this.fallbackCanView(subModule, action);
    }

    const permission =
      permissions.find((item) =>
        item.module === 'logistics' &&
        item.subModule === subModule
      );

    return Boolean(
      permission?.[action]
    );
  }


  private fallbackCanView(
    subModule: string,
    action: 'view' | 'create'
  ): boolean {

    if (action === 'create') {
      return true;
    }

    const role =
      String(this.getCurrentUser()?.role || '')
        .toLowerCase();

    const designation =
      String(this.getCurrentUser()?.designation || '')
        .toLowerCase();

    const isLogisticsEmployee =
      role === 'employee' ||
      designation.includes('logistics');

    if (!isLogisticsEmployee) {
      return true;
    }

    return [
      'airCargo',
      'seaFreight',
      'tracking',
      'documents',
      'cha',
      'transporters',
      'warehouse'
    ].includes(subModule);
  }


  private loadEmployeeDashboard():
    void {

    this.api
      .get<LogisticsEmployeeDashboard>(
        '/hr/employees/dashboard'
      )
      .subscribe({
        next: (dashboard) => {
          this.employeeDashboard.set(
            dashboard
          );
          if (dashboard?.employee?.employeePhoto) {
            this.auth.updateCurrentUserProfileImage(dashboard.employee.employeePhoto);
          }
        },
        error: () =>
          this.employeeDashboard.set(
            null
          )
      });
  }


  private assetUrl(
    value?: string
  ): string {

    const path =
      String(
        value ||
        ''
      )
        .trim();

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

    return apiUrl(
      path
    );
  }

  /* ============================================================
     LOGOUT
  ============================================================ */

  protected logout():
    void {

    this.auth.logout();
  }


  /* ============================================================
     HELPERS
  ============================================================ */

  private cleanUrl(
    value: string
  ): string {

    return String(
      value ||
      ''
    )
      .split('?')[0]
      .split('#')[0]
      .replace(
        /\/+$/,
        ''
      );
  }




  private cleanUrlWithQuery(
    value: string
  ): string {

    return String(
      value ||
      ''
    )
      .split('#')[0]
      .replace(
        /\/+$/,
        ''
      );
  }


  private getCurrentUser():
    any {

    try {

      return (
        this.auth.currentUser() ||
        null
      );

    } catch {

      return null;
    }
  }


  private roleLabel(
    role?: string
  ): string {

    switch (
    String(
      role ||
      ''
    )
      .trim()
      .toLowerCase()
    ) {

      case 'company_admin':
        return 'Company Admin';

      case 'super_admin':
        return 'Super Admin';

      case 'hr':
        return 'HR Manager';

      case 'employee':
        return 'Logistics Executive';

      default:
        return 'Logistics Executive';
    }
  }

}