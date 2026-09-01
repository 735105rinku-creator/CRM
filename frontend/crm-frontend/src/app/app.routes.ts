import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { companyAdminGuard } from './core/auth/company-admin.guard';
import { employeeDashboardGuard } from './core/auth/employee-dashboard.guard';
import { logisticsGuard } from './core/auth/logistics.guard';
import { permissionGuard } from './core/auth/permission.guard';
import { superAdminGuard } from './core/auth/super-admin.guard';

import { AboutComponent } from './features/about/about.component';
import { CheckoutComponent } from './features/checkout/checkout.component';
import { CompanyAdminDashboardComponent } from './features/company-admin/company-admin-dashboard.component';
import { ContactComponent } from './features/contact/contact.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { EmployeeDashboardComponent } from './features/employee/employee-dashboard.component';
import { HomeComponent } from './features/home/home.component';
import { HrDashboardComponent } from './features/hr/hr-dashboard.component';

import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { LoginComponent } from './features/auth/login/login.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';

import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

import { MeetingRoomComponent } from './features/meeting-room/meeting-room.component';
import { PlaceholderPageComponent } from './features/placeholder-page.component';
import { PricingComponent } from './features/pricing/pricing.component';

import { RegisterCompanyComponent } from './features/auth/register/register-company.component';

import { SuperAdminDashboardComponent } from './features/super-admin/super-admin-dashboard.component';


/* ==========================================================
   LOGISTICS
========================================================== */

import { LogisticsDashboardComponent } from './features/logistics/dashboard/logistics-dashboard.component';
import { LogisticsOverviewComponent } from './features/logistics/overview/logistics-overview.component';
import { LogisticsLayoutComponent } from './features/logistics/logistics-layout/logistics-layout.component';


/* ==========================================================
   AIR CARGO
========================================================== */

import { AirCargoNewComponent } from './features/logistics/shipments/air-cargo/air-cargo-new/air-cargo-new.component';
import { AirCargoListComponent } from './features/logistics/shipments/air-cargo/air-cargo-list/air-cargo-list.component';


/* ==========================================================
   SEA FREIGHT
========================================================== */

import { SeaFreightComponent } from './features/logistics/shipments/sea-freight/sea-freight.component';


/* ==========================================================
   CHA / CUSTOMS
========================================================== */

import { ChaComponent } from './features/logistics/cha/cha.component';
import { ChaMasterComponent } from './features/logistics/cha-master/cha-master.component';


/* ==========================================================
   TRANSPORTERS
========================================================== */

import { TransporterComponent } from './features/logistics/transporters/transporter.component';


/* ==========================================================
   WAREHOUSE
========================================================== */

import { WarehouseComponent } from './features/logistics/warehouse/warehouse.component';
import { WarehouseMasterComponent } from './features/logistics/warehouse-master/warehouse-master.component';


/* ==========================================================
   TRACKING
========================================================== */

import { TrackingComponent } from './features/logistics/tracking/tracking.component';


/* ==========================================================
   DOCUMENTS
========================================================== */

import { LogisticsDocumentsComponent } from './features/logistics/documents/logistics-documents.component';


/* ==========================================================
   CUSTOMER MASTER
========================================================== */

import { LogisticsCustomersComponent } from './features/logistics/customers/logistics-customers.component';


/* ==========================================================
   VENDOR MASTER
========================================================== */

import { LogisticsVendorsComponent } from './features/logistics/vendors/logistics-vendors.component';


/* ==========================================================
   PRODUCTS / SERVICES
========================================================== */

import { ProductsServicesComponent } from './features/logistics/products-services/products-services.component';


/* ==========================================================
   VENDOR PAYMENTS
========================================================== */

import { VendorPaymentComponent } from './features/logistics/vendor-payments/vendor-payment.component';


/* ==========================================================
   LOGISTICS INVOICE
========================================================== */

import { LogisticsInvoiceNewComponent } from './features/logistics/invoices/invoice-new/logistics-invoice-new.component';
import { LogisticsInvoiceListComponent } from './features/logistics/invoices/invoice-list/logistics-invoice-list.component';


/* ==========================================================
   LOGISTICS REPORTS
========================================================== */

import { LogisticsReportsComponent } from './features/logistics/reports/logistics-reports.component';


/* ==========================================================
   APPLICATION ROUTES
========================================================== */

export const routes: Routes = [

  /* ========================================================
     PUBLIC
  ======================================================== */

  {
    path: '',
    pathMatch: 'full',
    component: HomeComponent
  },

  {
    path: 'login',
    component: LoginComponent
  },

  {
    path: 'opasbizz/admin',
    component: LoginComponent
  },

  {
    path: 'register-company',
    component: RegisterCompanyComponent
  },

  {
    path: 'about',
    component: AboutComponent
  },

  {
    path: 'pricing',
    component: PricingComponent
  },

  {
    path: 'checkout',
    component: CheckoutComponent,
    canActivate: [authGuard]
  },

  {
    path: 'contact',
    component: ContactComponent
  },

  {
    path: 'privacy-policy',
    redirectTo: 'about'
  },

  {
    path: 'terms',
    redirectTo: 'about'
  },

  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },

  {
    path: 'reset-password',
    component: ResetPasswordComponent
  },

  {
    path: 'meeting-room/:code',
    component: MeetingRoomComponent,
    canActivate: [authGuard],
    data: {
      title: 'Online Meeting',
      section: 'Meeting'
    }
  },


  /* ========================================================
     ACCOUNTS / FINANCE WORKSPACE
  ======================================================== */

  {
    path: 'accounts',

    canActivate: [
      authGuard
    ],

    loadChildren: () =>
      import(
        './features/accounts/accounts.routes'
      ).then(
        (module) =>
          module.ACCOUNTS_ROUTES
      )
  },


  /* ========================================================
     MAIN CRM / HRM / COMPANY WORKSPACE
  ======================================================== */

  {
    path: '',

    component:
      MainLayoutComponent,

    canActivate: [
      authGuard
    ],

    children: [

      /* ====================================================
         COMPANY ADMIN DASHBOARD
      ==================================================== */

      {
        path: 'dashboard',

        component:
          CompanyAdminDashboardComponent,

        canActivate: [
          companyAdminGuard
        ],

        data: {
          title:
            'Admin Dashboard',

          section:
            'Company',

          roles: [
            'company_admin',
            'super_admin'
          ]
        }
      },


      {
        path: 'company/dashboard',

        component:
          CompanyAdminDashboardComponent,

        canActivate: [
          companyAdminGuard
        ],

        data: {
          title:
            'Company Dashboard',

          section:
            'Company',

          permission:
            'manage_company'
        }
      },


      /* ====================================================
         SALES DASHBOARD
      ==================================================== */

      {
        path:
          'sales-dashboard',

        component:
          DashboardComponent,

        data: {
          title:
            'Sales Dashboard',

          section:
            'Sales'
        }
      },


      /* ====================================================
         SUPER ADMIN
      ==================================================== */

      {
        path:
          'super-admin',

        component:
          SuperAdminDashboardComponent,

        canActivate: [
          superAdminGuard
        ],

        data: {
          title:
            'Super Admin',

          section:
            'Opas Bizz',

          role:
            'super_admin'
        }
      },


      {
        path:
          'super-admin/dashboard',

        component:
          SuperAdminDashboardComponent,

        canActivate: [
          superAdminGuard
        ],

        data: {
          title:
            'Super Admin Dashboard',

          section:
            'Opas Bizz',

          permission:
            'manage_all_companies'
        }
      },


      {
        path:
          'opasbizz/admin/dashboard',

        component:
          SuperAdminDashboardComponent,

        canActivate: [
          authGuard
        ],

        data: {
          title:
            'Super Admin',

          section:
            'Opas Bizz',

          role:
            'super_admin'
        }
      },


      /* ====================================================
         HRM
      ==================================================== */

      {
        path:
          'hr-dashboard',

        component:
          HrDashboardComponent,

        canActivate: [
          authGuard
        ],

        data: {
          title:
            'HR Dashboard',

          section:
            'HR',

          roles: [
            'hr',
            'company_admin',
            'super_admin'
          ]
        }
      },


      /* ====================================================
         LOGISTICS OVERVIEW
         Legacy Main Layout Route
      ==================================================== */

      {
        path:
          'logistics-overview',

        component:
          LogisticsOverviewComponent,

        canActivate: [
          authGuard
        ],

        data: {
          title:
            'Logistics Overview',

          section:
            'Logistics'
        }
      },


      /* ====================================================
         EMPLOYEE
      ==================================================== */

      {
        path:
          'employee-dashboard',

        component:
          EmployeeDashboardComponent,

        canActivate: [
          authGuard,
          employeeDashboardGuard
        ],

        data: {
          title:
            'Employee Dashboard',

          section:
            'Employee',

          roles: [
            'employee',
            'hr',
            'company_admin',
            'super_admin'
          ]
        }
      },


      {
        path:
          'employee/dashboard',

        component:
          EmployeeDashboardComponent,

        canActivate: [
          permissionGuard,
          employeeDashboardGuard
        ],

        data: {
          title:
            'Employee Dashboard',

          section:
            'Employee',

          permission:
            'view_self'
        }
      },


      /* ====================================================
         LOGISTICS WORKSPACE
      ==================================================== */

      {
        path:
          'logistics',

        component:
          LogisticsLayoutComponent,

        canActivate: [
          logisticsGuard
        ],

        children: [

          /* --------------------------------------------------
             DASHBOARD
          -------------------------------------------------- */

          {
            path: '',

            pathMatch:
              'full',

            redirectTo:
              'dashboard'
          },


          {
            path:
              'dashboard',

            component:
              LogisticsDashboardComponent,

            data: {
              title:
                'Logistics Dashboard',

              section:
                'Logistics'
            }
          },


          {
            path:
              'overview',

            component:
              LogisticsOverviewComponent,

            data: {
              title:
                'Logistics Overview',

              section:
                'Logistics'
            }
          },


          {
            path:
              'employee',

            component:
              EmployeeDashboardComponent,

            data: {
              title:
                'Employee Workspace',

              section:
                'Logistics'
            }
          },


          /* --------------------------------------------------
             AIR CARGO
          -------------------------------------------------- */

          {
            path:
              'air-cargo',

            component:
              AirCargoListComponent,

            data: {
              title:
                'Air Cargo',

              section:
                'Logistics'
            }
          },


          {
            path:
              'air-cargo/new',

            component:
              AirCargoNewComponent,

            data: {
              title:
                'New Air Cargo Shipment',

              section:
                'Logistics'
            }
          },


          {
            path:
              'air-cargo/all',

            component:
              AirCargoListComponent,

            data: {
              title:
                'All Air Cargo Shipments',

              section:
                'Logistics',

              shipmentStatus:
                'all'
            }
          },


          {
            path:
              'air-cargo/pending',

            component:
              AirCargoListComponent,

            data: {
              title:
                'Pending Air Cargo',

              section:
                'Logistics',

              shipmentStatus:
                'pending'
            }
          },


          {
            path:
              'air-cargo/delivered',

            component:
              AirCargoListComponent,

            data: {
              title:
                'Delivered Air Cargo',

              section:
                'Logistics',

              shipmentStatus:
                'delivered'
            }
          },


          {
            path:
              'air-cargo/cancelled',

            component:
              AirCargoListComponent,

            data: {
              title:
                'Cancelled Air Cargo',

              section:
                'Logistics',

              shipmentStatus:
                'cancelled'
            }
          },


          /* --------------------------------------------------
             SEA FREIGHT
          -------------------------------------------------- */

          {
            path:
              'sea-freight',

            component:
              SeaFreightComponent,

            data: {
              title:
                'Sea Freight',

              section:
                'Logistics'
            }
          },


          /* --------------------------------------------------
             CHA / CUSTOMS
          -------------------------------------------------- */

          {
            path:
              'cha',

            component:
              ChaComponent,

            data: {
              title:
                'CHA / Customs',

              section:
                'Logistics'
            }
          },


          {
            path:
              'cha/master',

            component:
              ChaMasterComponent,

            data: {
              title:
                'CHA Master',

              section:
                'Logistics'
            }
          },


          {
            path:
              'cha/master/new',

            component:
              ChaMasterComponent,

            data: {
              title:
                'Add CHA',

              section:
                'Logistics'
            }
          },


          {
            path:
              'cha/master/:id',

            component:
              ChaMasterComponent,

            data: {
              title:
                'CHA Details',

              section:
                'Logistics'
            }
          },


          {
            path:
              'cha/clearance/new',

            component:
              ChaComponent,

            data: {
              title:
                'New Clearance Job',

              section:
                'Logistics'
            }
          },


          {
            path:
              'customs',

            redirectTo:
              'cha',

            pathMatch:
              'full'
          },


          /* --------------------------------------------------
             TRANSPORTERS
          -------------------------------------------------- */

          {
            path:
              'transporters',

            component:
              TransporterComponent,

            data: {
              title:
                'Transporters',

              section:
                'Logistics'
            }
          },


          /* --------------------------------------------------
             WAREHOUSE
          -------------------------------------------------- */

          {
            path:
              'warehouse',

            component:
              WarehouseComponent,

            data: {
              title:
                'Warehouse',

              section:
                'Logistics'
            }
          },


          {
            path:
              'warehouse/master',

            component:
              WarehouseMasterComponent,

            data: {
              title:
                'Warehouse Master',

              section:
                'Logistics'
            }
          },


          {
            path:
              'warehouse/master/new',

            component:
              WarehouseMasterComponent,

            data: {
              title:
                'Add Warehouse',

              section:
                'Logistics'
            }
          },


          {
            path:
              'warehouse/master/:id',

            component:
              WarehouseMasterComponent,

            data: {
              title:
                'Warehouse Details',

              section:
                'Logistics'
            }
          },


          {
            path:
              'warehouse/receipt/new',

            component:
              WarehouseComponent,

            data: {
              title:
                'New Warehouse Receipt',

              section:
                'Logistics'
            }
          },


          {
            path:
              'warehouse/stock',

            component:
              WarehouseComponent,

            data: {
              title:
                'Current Stock',

              section:
                'Logistics'
            }
          },


          {
            path:
              'warehouse/inspection',

            component:
              WarehouseComponent,

            data: {
              title:
                'Warehouse Inspection',

              section:
                'Logistics'
            }
          },


          {
            path:
              'warehouse/ready-dispatch',

            component:
              WarehouseComponent,

            data: {
              title:
                'Ready for Dispatch',

              section:
                'Logistics'
            }
          },


          {
            path:
              'warehouse/dispatch-history',

            component:
              WarehouseComponent,

            data: {
              title:
                'Dispatch History',

              section:
                'Logistics'
            }
          },


          /* --------------------------------------------------
             TRACKING
          -------------------------------------------------- */

          {
            path:
              'tracking',

            component:
              TrackingComponent,

            data: {
              title:
                'Shipment Tracking',

              section:
                'Logistics'
            }
          },


          /* --------------------------------------------------
             DOCUMENTS
          -------------------------------------------------- */

          {
            path:
              'documents',

            component:
              LogisticsDocumentsComponent,

            data: {
              title:
                'Logistics Documents',

              section:
                'Logistics'
            }
          },


          /* --------------------------------------------------
             CUSTOMER MASTER
          -------------------------------------------------- */

          {
            path:
              'customers',

            component:
              LogisticsCustomersComponent,

            data: {
              title:
                'Logistics Customers',

              section:
                'Logistics'
            }
          },


          /* --------------------------------------------------
             VENDOR MASTER
          -------------------------------------------------- */

          {
            path:
              'vendors',

            component:
              LogisticsVendorsComponent,

            data: {
              title:
                'Logistics Vendors',

              section:
                'Logistics'
            }
          },


          /* --------------------------------------------------
             PRODUCTS / SERVICES
          -------------------------------------------------- */

          {
            path:
              'products-services',

            component:
              ProductsServicesComponent,

            data: {
              title:
                'Products / Services',

              section:
                'Logistics'
            }
          },


          /* --------------------------------------------------
             VENDOR PAYMENTS
          -------------------------------------------------- */

          {
            path:
              'vendor-payments',

            component:
              VendorPaymentComponent,

            data: {
              title:
                'Vendor / Supplier Payments',

              section:
                'Logistics'
            }
          },


          /* --------------------------------------------------
             LOGISTICS INVOICE
          -------------------------------------------------- */

          {
            path:
              'invoices/new',

            component:
              LogisticsInvoiceNewComponent,

            data: {
              title:
                'New Logistics Invoice',

              section:
                'Logistics'
            }
          },


          {
            path:
              'invoices',

            component:
              LogisticsInvoiceListComponent,

            data: {
              title:
                'Logistics Invoices',

              section:
                'Logistics'
            }
          },


          /* --------------------------------------------------
             REPORTS
          -------------------------------------------------- */

          {
            path:
              'reports',

            component:
              LogisticsReportsComponent,

            data: {
              title:
                'Logistics Reports',

              section:
                'Logistics'
            }
          },


          {
            path:
              'reports/shipment-performance',

            component:
              LogisticsReportsComponent,

            data: {
              title:
                'Shipment Performance Report',

              section:
                'Logistics',

              reportType:
                'shipment-performance'
            }
          },


          {
            path:
              'reports/sales',

            component:
              LogisticsReportsComponent,

            data: {
              title:
                'Logistics Sales Report',

              section:
                'Logistics',

              reportType:
                'sales'
            }
          },


          {
            path:
              'reports/outstanding',

            component:
              LogisticsReportsComponent,

            data: {
              title:
                'Outstanding Report',

              section:
                'Logistics',

              reportType:
                'outstanding'
            }
          },


          {
            path:
              'reports/gst',

            component:
              LogisticsReportsComponent,

            data: {
              title:
                'GST Report',

              section:
                'Logistics',

              reportType:
                'gst'
            }
          },


          {
            path:
              'reports/vendor-payment',

            component:
              LogisticsReportsComponent,

            data: {
              title:
                'Vendor Payment Report',

              section:
                'Logistics',

              reportType:
                'vendor-payment'
            }
          },


          /* --------------------------------------------------
             LOGISTICS FALLBACK
          -------------------------------------------------- */

          {
            path:
              '**',

            redirectTo:
              'dashboard'
          }
        ]
      },


      /* ====================================================
         CRM
      ==================================================== */

      {
        path:
          'leads',

        component:
          PlaceholderPageComponent,

        data: {
          title:
            'Leads',

          section:
            'Sales'
        }
      },


      {
        path:
          'contacts',

        component:
          PlaceholderPageComponent,

        data: {
          title:
            'Contacts',

          section:
            'Sales'
        }
      },


      /* ====================================================
         CRM ACCOUNTS
         Old /accounts Sales route moved here.
      ==================================================== */

      {
        path:
          'crm/accounts',

        component:
          PlaceholderPageComponent,

        data: {
          title:
            'CRM Accounts',

          section:
            'Sales'
        }
      },


      {
        path:
          'deals',

        component:
          PlaceholderPageComponent,

        data: {
          title:
            'Deals',

          section:
            'Sales'
        }
      },


      /* ====================================================
         LEGACY FINANCE URL REDIRECTS

         These routes preserve existing frontend links while
         moving Finance into the dedicated Accounts workspace.
      ==================================================== */

      {
        path:
          'invoices',

        pathMatch:
          'full',

        redirectTo:
          '/accounts/invoices'
      },


      {
        path:
          'payments',

        pathMatch:
          'full',

        redirectTo:
          '/accounts/payments'
      },


      {
        path:
          'expenses',

        pathMatch:
          'full',

        redirectTo:
          '/accounts/expenses'
      },


      /* ====================================================
         QUOTATIONS
      ==================================================== */

      {
        path:
          'quotations',

        component:
          PlaceholderPageComponent,

        data: {
          title:
            'Quotations',

          section:
            'Finance'
        }
      },


      /* ====================================================
         REPORTS
      ==================================================== */

      {
        path:
          'reports/sales',

        component:
          PlaceholderPageComponent,

        data: {
          title:
            'Sales Report',

          section:
            'Reports'
        }
      },


      {
        path:
          'reports/financial',

        pathMatch:
          'full',

        redirectTo:
          '/accounts/reports'
      },


      {
        path:
          'reports/activity',

        component:
          PlaceholderPageComponent,

        data: {
          title:
            'Activity Log',

          section:
            'Reports'
        }
      },


      /* ====================================================
         CALENDAR
      ==================================================== */

      {
        path:
          'calendar',

        component:
          PlaceholderPageComponent,

        data: {
          title:
            'Calendar',

          section:
            'HR'
        }
      },


      /* ====================================================
         SETTINGS
      ==================================================== */

      {
        path:
          'settings/company',

        component:
          PlaceholderPageComponent,

        data: {
          title:
            'Company Settings',

          section:
            'Settings'
        }
      },


      {
        path:
          'settings/users',

        component:
          PlaceholderPageComponent,

        data: {
          title:
            'Users & Roles',

          section:
            'Settings'
        }
      },


      {
        path:
          'settings/profile',

        component:
          PlaceholderPageComponent,

        data: {
          title:
            'Profile',

          section:
            'Settings'
        }
      }
    ]
  },


  /* ========================================================
     GLOBAL FALLBACK
  ======================================================== */

  {
    path:
      '**',

    redirectTo:
      'dashboard'
  }
];