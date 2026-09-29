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


interface WarehouseMenuChild {
  id: string;
  label: string;
  route: string;
}


interface WarehouseMenuItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
  children?: WarehouseMenuChild[];
}


interface WarehouseMenuGroup {
  title: string;
  items: WarehouseMenuItem[];
}


interface WarehouseEmployeeDashboard {
  employee?: {
    employeePhoto?: string;
  } | null;
  company?: {
    companyName?: string;
    logo?: string;
  } | null;
}


@Component({
  selector: 'app-warehouse-sidebar',

  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl:
    './warehouse-sidebar.component.html',

  styleUrl:
    './warehouse-sidebar.component.scss'
})
export class WarehouseSidebarComponent {

  private readonly router =
    inject(Router);

  private readonly auth =
    inject(AuthService);

  private readonly api =
    inject(ApiService);


  protected readonly collapsed =
    signal(false);


  protected readonly expandedMenus =
    signal<Record<string, boolean>>({});


  protected readonly currentUrl =
    signal(
      this.router.url
    );


  protected readonly employeeDashboard =
    signal<WarehouseEmployeeDashboard | null>(null);


  protected readonly userName =
    computed(
      () => {
        const user =
          this.getCurrentUser();

        return (
          user?.name ||
          user?.fullName ||
          'Warehouse Employee'
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
          'W'
        );
      }
    );


   protected readonly menuGroups:
    WarehouseMenuGroup[] = [

      {
        title:
          'DASHBOARD',

        items: [

          {
            id:
              'warehouse-dashboard',

            label:
              'Dashboard',

            icon:
              '\u25A6',

            route:
              '/warehouse/dashboard'
          }
        ]
      },


      {
        title:
          'WAREHOUSE',

        items: [

          {
            id:
              'warehouse-master',

            label:
              'Warehouses',

            icon:
              '\u2302',

            route:
              '/warehouse/warehouse-master'
          },

          {
            id:
              'warehouse-inventory',

            label:
              'Inventory',

            icon:
              '\u2637',

            route:
              '/warehouse/inventory'
          },

          {
            id:
              'warehouse-incoming-goods',

            label:
              'Incoming Goods',

            icon:
              '\u2193',

            route:
              '/warehouse/incoming-goods'
          },

          {
            id:
              'warehouse-outgoing-goods',

            label:
              'Outgoing Goods',

            icon:
              '\u2191',

            route:
              '/warehouse/outgoing-goods'
          },

          {
            id:
              'warehouse-stock-transfer',

            label:
              'Stock Transfer',

            icon:
              '\u21C4',

            route:
              '/warehouse/stock-transfer'
          },

          {
            id:
              'warehouse-damaged-goods',

            label:
              'Damaged Goods',

            icon:
              '\u26A0',

            route:
              '/warehouse/damaged-goods'
          }
        ]
      },


      {
        title:
          'OPERATIONS',

        items: [

          {
            id:
              'warehouse-my-tasks',

            label:
              'My Tasks',

            icon:
              '\u2713',

            route:
              '/warehouse/my-tasks'
          },

          {
            id:
              'warehouse-activity',

            label:
              'Warehouse Activity',

            icon:
              '\u2261',

            route:
              '/warehouse/activity'
          }
        ]
      },


      {
        title:
          'MY EMPLOYEE',

        items: [

          { id: 'my-profile',          label: 'Personal Details',    icon: 'P',           route: '/warehouse/employee?feature=profile' },
          { id: 'attendance',          label: 'Attendance',          icon: '\u25F7',      route: '/warehouse/employee?feature=attendance' },
          { id: 'attendance-history',  label: 'Attendance History',  icon: 'A',           route: '/warehouse/employee?feature=attendance-history' },
          { id: 'leave',               label: 'Leave',               icon: '\u25A1',      route: '/warehouse/employee?feature=apply-leave' },
          { id: 'leave-history',       label: 'Leave History',       icon: 'Y',           route: '/warehouse/employee?feature=leave-history' },
          { id: 'leave-balance',       label: 'Leave Balance',       icon: 'B',           route: '/warehouse/employee?feature=leave-balance' },
          { id: 'payslips',            label: 'Payslips',            icon: '\u20B9',      route: '/warehouse/employee?feature=payslip' },
          { id: 'employee-documents',  label: 'Documents',           icon: 'D',           route: '/warehouse/employee?feature=documents' },
          { id: 'bank-details',        label: 'Bank Details',        icon: 'B',           route: '/warehouse/employee?feature=bank' },
          { id: 'events',              label: 'Company Events',      icon: 'E',           route: '/warehouse/employee?feature=events' },
          { id: 'holidays',            label: 'Holidays',            icon: '\u2606',      route: '/warehouse/employee?feature=holidays' },
          { id: 'meetings',            label: 'Meetings',            icon: '\u2667',      route: '/warehouse/employee?feature=meetings' },
          { id: 'messages',            label: 'Messages',            icon: '\u2709',      route: '/warehouse/employee?feature=messages' },
          { id: 'change-password',     label: 'Change Password',     icon: 'K',           route: '/warehouse/employee?feature=settings' }
        ]
      }
    ];


  protected readonly visibleMenuGroups =
    computed<WarehouseMenuGroup[]>(
      () => this.menuGroups
    );


  constructor() {

    this.loadEmployeeDashboard();

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
        }
      );
  }


  protected toggleSidebar():
    void {

    this.collapsed.update(
      value =>
        !value
    );
  }


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


  protected isActive(
    item: WarehouseMenuItem
  ): boolean {

    if (!item.route) {
      return false;
    }


    if (
      item.route.includes(
        '/warehouse/employee?'
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


    return (
      current ===
      target
    );
  }


  protected isChildActive(
    child:
      WarehouseMenuChild
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


  protected logout():
    void {

    this.auth.logout();
  }


  private loadEmployeeDashboard():
    void {

    this.api
      .get<WarehouseEmployeeDashboard>(
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
        return 'Warehouse Executive';

      default:
        return 'Warehouse Executive';
    }
  }

}