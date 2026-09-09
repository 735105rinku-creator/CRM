import {
  CommonModule
} from '@angular/common';

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
} from '../../../../core/auth/auth.service';

import {
  apiUrl
} from '../../../../core/config/api.config';

import {
  ApiService
} from '../../../../core/services/api.service';


export interface PurchaseNavItem {
  label: string;
  route: string;
  icon: string;
  description: string;
}


interface PurchaseMenuItem {
  id: string;
  label: string;
  icon: string;
  route: string;
}


interface PurchaseMenuGroup {
  title: string;
  items: PurchaseMenuItem[];
}


interface PurchaseEmployeeDashboard {
  employee?: {
    employeePhoto?: string;
    employeeCode?: string;

    designation?: string;

    designationId?: {
      _id?: string;
      designationName?: string;
      designationCode?: string;
    } | string | null;

    firstName?: string;
    middleName?: string;
    lastName?: string;
    displayName?: string;
    name?: string;
  } | null;

  company?: {
    companyName?: string;
    logo?: string;
  } | null;
}


@Component({
  selector: 'app-purchase-sidebar',

  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl:
    './purchase-sidebar.component.html',

  styleUrl:
    './purchase-sidebar.component.scss'
})
export class PurchaseSidebarComponent {

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


  protected readonly currentUrl =
    signal(
      this.router.url
    );


  protected readonly employeeDashboard =
    signal<PurchaseEmployeeDashboard | null>(
      null
    );


  /* ============================================================
     CURRENT USER
  ============================================================ */

  protected readonly userName =
    computed(
      () => {

        const dashboardEmployee =
          this.employeeDashboard()?.employee;

        const dashboardName =
          dashboardEmployee?.displayName ||
          dashboardEmployee?.name ||
          [
            dashboardEmployee?.firstName,
            dashboardEmployee?.middleName,
            dashboardEmployee?.lastName
          ]
            .filter(Boolean)
            .join(' ')
            .trim();

        if (dashboardName) {
          return dashboardName;
        }

        const user =
          this.getCurrentUser();

        return (
          user?.name ||
          user?.fullName ||
          'Purchase Employee'
        );
      }
    );


  protected readonly userDesignation =
    computed(
      () => {

        const dashboardEmployee =
          this.employeeDashboard()?.employee;

        const designationReference =
          dashboardEmployee?.designationId;

        const designationFromReference =
          designationReference &&
          typeof designationReference === 'object'
            ? designationReference.designationName
            : '';

        const dashboardDesignation =
          designationFromReference ||
          dashboardEmployee?.designation;

        if (dashboardDesignation) {
          return dashboardDesignation;
        }

        const user =
          this.getCurrentUser();

        if (user?.designation) {
          return user.designation;
        }

        return this.roleLabel(
          user?.role
        );
      }
    );


  protected readonly employeeCode =
    computed(
      () => {

        const dashboardEmployeeCode =
          this.employeeDashboard()
            ?.employee
            ?.employeeCode;

        if (dashboardEmployeeCode) {
          return dashboardEmployeeCode;
        }

        const user =
          this.getCurrentUser();

        return (
          user?.employeeCode ||
          ''
        );
      }
    );


  protected readonly companyName =
    computed(
      () => {

        const user =
          this.getCurrentUser();

        const company =
          user &&
          'company' in user
            ? user.company
            : null;

        return (
          this.employeeDashboard()
            ?.company
            ?.companyName ||
          company?.name ||
          'Opas Bizz Pvt. Ltd'
        );
      }
    );


  protected readonly companyLogoUrl =
    computed(
      () => {

        const user =
          this.getCurrentUser();

        const company =
          user &&
          'company' in user
            ? user.company
            : null;

        return this.assetUrl(
          this.employeeDashboard()
            ?.company
            ?.logo ||
          company?.logoUrl ||
          '/brand/opasbizz-crm.webp'
        );
      }
    );


  protected readonly employeePhotoUrl =
    computed(
      () => {

        const photo =
          this.employeeDashboard()
            ?.employee
            ?.employeePhoto ||
          this.getCurrentUser()
            ?.profileImage ||
          '';

        if (
          !photo ||
          /opasbizz-crm|\/brand\//i.test(
            photo
          )
        ) {
          return '';
        }

        return this.assetUrl(
          photo
        );
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
          'P'
        );
      }
    );


  /* ============================================================
     PURCHASE MENU

     Same employee-workspace structure as Logistics:
     MAIN
     PURCHASE
     MY EMPLOYEE
  ============================================================ */

  protected readonly menuGroups:
    PurchaseMenuGroup[] = [

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
              '⌂',

            route:
              '/purchase/dashboard'
          }

        ]
      },


      {
        title:
          'PURCHASE',

        items: [

          {
            id:
              'purchase-requests',

            label:
              'Purchase Requests',

            icon:
              'P',

            route:
              '/purchase/purchase-requests'
          },


          {
            id:
              'vendor-enquiries',

            label:
              'Vendor Enquiries / RFQ',

            icon:
              'E',

            route:
              '/purchase/vendor-enquiries'
          },


          {
            id:
              'quotations',

            label:
              'Quotations',

            icon:
              'Q',

            route:
              '/purchase/quotations'
          },


          {
            id:
              'purchase-orders',

            label:
              'Purchase Orders',

            icon:
              'O',

            route:
              '/purchase/purchase-orders'
          },


          {
            id:
              'goods-receipts',

            label:
              'Goods Receipt / GRN',

            icon:
              'G',

            route:
              '/purchase/goods-receipts'
          },


          {
            id:
              'vendors',

            label:
              'Vendors',

            icon:
              'V',

            route:
              '/purchase/vendors'
          },


          {
            id:
              'reports',

            label:
              'Reports',

            icon:
              'R',

            route:
              '/purchase/reports'
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
              '/purchase/employee?feature=profile'
          },


          {
            id:
              'attendance',

            label:
              'Attendance',

            icon:
              '◷',

            route:
              '/purchase/employee?feature=attendance'
          },


          {
            id:
              'attendance-history',

            label:
              'Attendance History',

            icon:
              'A',

            route:
              '/purchase/employee?feature=attendance-history'
          },


          {
            id:
              'leave',

            label:
              'Leave',

            icon:
              '□',

            route:
              '/purchase/employee?feature=apply-leave'
          },


          {
            id:
              'leave-history',

            label:
              'Leave History',

            icon:
              'Y',

            route:
              '/purchase/employee?feature=leave-history'
          },


          {
            id:
              'leave-balance',

            label:
              'Leave Balance',

            icon:
              'B',

            route:
              '/purchase/employee?feature=leave-balance'
          },


          {
            id:
              'payslips',

            label:
              'Payslips',

            icon:
              '₹',

            route:
              '/purchase/employee?feature=payslip'
          },


          {
            id:
              'employee-documents',

            label:
              'Documents',

            icon:
              'D',

            route:
              '/purchase/employee?feature=documents'
          },


          {
            id:
              'bank-details',

            label:
              'Bank Details',

            icon:
              'B',

            route:
              '/purchase/employee?feature=bank'
          },


          {
            id:
              'events',

            label:
              'Company Events',

            icon:
              'E',

            route:
              '/purchase/employee?feature=events'
          },


          {
            id:
              'holidays',

            label:
              'Holidays',

            icon:
              '☆',

            route:
              '/purchase/employee?feature=holidays'
          },


          {
            id:
              'meetings',

            label:
              'Meetings',

            icon:
              '♧',

            route:
              '/purchase/employee?feature=meetings'
          },


          {
            id:
              'messages',

            label:
              'Messages',

            icon:
              '✉',

            route:
              '/purchase/employee?feature=messages'
          },


          {
            id:
              'change-password',

            label:
              'Change Password',

            icon:
              'K',

            route:
              '/purchase/employee?feature=settings'
          }

        ]
      }

    ];


  /* ============================================================
     TEMPORARY COMPATIBILITY

     Current old Purchase HTML still reads navItems.
     We keep this until the next HTML replacement.
  ============================================================ */

  readonly navItems:
    PurchaseNavItem[] = [

      {
        label:
          'Dashboard',

        route:
          '/purchase/dashboard',

        icon:
          'dashboard',

        description:
          'Purchase overview'
      },


      {
        label:
          'Purchase Requests',

        route:
          '/purchase/purchase-requests',

        icon:
          'request',

        description:
          'Create and manage purchase requests'
      },


      {
        label:
          'Vendor Enquiries',

        route:
          '/purchase/vendor-enquiries',

        icon:
          'enquiry',

        description:
          'Supplier enquiries and RFQs'
      },


      {
        label:
          'Quotations',

        route:
          '/purchase/quotations',

        icon:
          'quotation',

        description:
          'Vendor quotations and comparison'
      },


      {
        label:
          'Purchase Orders',

        route:
          '/purchase/purchase-orders',

        icon:
          'order',

        description:
          'Create and manage purchase orders'
      },


      {
        label:
          'Goods Receipt',

        route:
          '/purchase/goods-receipts',

        icon:
          'receipt',

        description:
          'GRN and received quantity'
      },


      {
        label:
          'Vendors',

        route:
          '/purchase/vendors',

        icon:
          'vendor',

        description:
          'Existing vendor directory'
      },


      {
        label:
          'Reports',

        route:
          '/purchase/reports',

        icon:
          'report',

        description:
          'Purchase reports'
      }

    ];


  /* ============================================================
     CONSTRUCTOR
  ============================================================ */

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


  /* ============================================================
     SIDEBAR COLLAPSE
  ============================================================ */

  protected toggleSidebar():
    void {

    this.collapsed.update(
      value =>
        !value
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
    item: PurchaseMenuItem
  ): boolean {

    const current =
      this.currentUrl();

    const target =
      item.route;


    if (
      target.includes(
        '/purchase/employee?'
      )
    ) {

      return (
        this.cleanUrlWithQuery(
          current
        ) ===
        this.cleanUrlWithQuery(
          target
        )
      );
    }


    const currentPath =
      this.cleanUrl(
        current
      );


    const targetPath =
      this.cleanUrl(
        target
      );


    if (
      item.id ===
      'dashboard'
    ) {

      return (
        currentPath ===
        '/purchase/dashboard'
      );
    }


    if (
      item.id ===
      'purchase-requests'
    ) {

      return currentPath.startsWith(
        '/purchase/purchase-requests'
      );
    }


    if (
      item.id ===
      'vendor-enquiries'
    ) {

      return currentPath.startsWith(
        '/purchase/vendor-enquiries'
      );
    }


    if (
      item.id ===
      'quotations'
    ) {

      return currentPath.startsWith(
        '/purchase/quotations'
      );
    }


    if (
      item.id ===
      'purchase-orders'
    ) {

      return currentPath.startsWith(
        '/purchase/purchase-orders'
      );
    }


    if (
      item.id ===
      'goods-receipts'
    ) {

      return currentPath.startsWith(
        '/purchase/goods-receipts'
      );
    }


    return (
      currentPath ===
      targetPath
    );
  }


  /* ============================================================
     EMPLOYEE DASHBOARD / PROFILE DATA

     Same existing endpoint used by Logistics.
     Read-only. No database modification.
  ============================================================ */

  private loadEmployeeDashboard():
    void {

    this.api
      .get<PurchaseEmployeeDashboard>(
        '/hr/employees/dashboard'
      )
      .subscribe({

        next:
          (
            dashboard
          ) => {

            this.employeeDashboard.set(
              dashboard
            );


            const employeePhoto =
              dashboard
                ?.employee
                ?.employeePhoto;


            if (
              employeePhoto
            ) {

              this.auth
                .updateCurrentUserProfileImage(
                  employeePhoto
                );
            }
          },


        error:
          () => {

            this.employeeDashboard.set(
              null
            );
          }

      });
  }


  /* ============================================================
     ASSET URL
  ============================================================ */

  private assetUrl(
    value?: string
  ): string {

    const path =
      String(
        value ||
        ''
      )
        .trim();


    if (
      !path
    ) {
      return '';
    }


    if (
      /^data:/i.test(
        path
      ) ||
      /^https?:\/\//i.test(
        path
      )
    ) {

      return path;
    }


    if (
      path.startsWith(
        '/brand/'
      ) ||
      path.startsWith(
        '/assets/'
      )
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
     URL HELPERS
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


  /* ============================================================
     CURRENT USER
  ============================================================ */

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


  /* ============================================================
     ROLE LABEL
  ============================================================ */

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

      case 'employee':
        return 'Purchase Employee';

      case 'hr':
        return 'HR Manager';

      case 'company_admin':
        return 'Company Admin';

      case 'super_admin':
        return 'Super Admin';

      default:
        return 'Purchase Employee';
    }
  }

}