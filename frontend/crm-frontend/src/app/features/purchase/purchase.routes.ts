import {
  Routes
} from '@angular/router';

import {
  purchaseGuard
} from '../../core/auth/purchase.guard';

import {
  PurchaseShellComponent
} from './layout/purchase-shell.component';


export const PURCHASE_ROUTES:
  Routes = [

  {
    path: '',

    component:
      PurchaseShellComponent,

    canActivate: [
      purchaseGuard
    ],

    children: [

      /* ======================================================
         DEFAULT
      ====================================================== */

      {
        path: '',

        pathMatch: 'full',

        redirectTo:
          'dashboard'
      },


      /* ======================================================
         DASHBOARD
      ====================================================== */

      {
        path:
          'dashboard',

        loadComponent:
          () =>
            import(
              './pages/purchase-dashboard/purchase-dashboard.component'
            )
              .then(
                (
                  module
                ) =>
                  module
                    .PurchaseDashboardComponent
              ),

        data: {
          title:
            'Purchase Dashboard',

          section:
            'Purchase',

          feature:
            'dashboard'
        }
      },


      /* ======================================================
         PURCHASE REQUESTS
      ====================================================== */

      {
        path:
          'purchase-requests',

        loadComponent:
          () =>
            import(
              './pages/purchase-requests/purchase-requests.component'
            )
              .then(
                (
                  module
                ) =>
                  module
                    .PurchaseRequestsComponent
              ),

        data: {
          title:
            'Purchase Requests',

          section:
            'Purchase',

          feature:
            'purchase-requests'
        }
      },


      {
        path:
          'purchase-requests/new',

        loadComponent:
          () =>
            import(
              './pages/purchase-request-form/purchase-request-form.component'
            )
              .then(
                (
                  module
                ) =>
                  module
                    .PurchaseRequestFormComponent
              ),

        data: {
          title:
            'New Purchase Request',

          section:
            'Purchase',

          feature:
            'purchase-requests'
        }
      },


      {
        path:
          'purchase-requests/:id',

        loadComponent:
          () =>
            import(
              './pages/purchase-request-form/purchase-request-form.component'
            )
              .then(
                (
                  module
                ) =>
                  module
                    .PurchaseRequestFormComponent
              ),

        data: {
          title:
            'Purchase Request Details',

          section:
            'Purchase',

          feature:
            'purchase-requests'
        }
      },


      /* ======================================================
         VENDOR ENQUIRIES / RFQ
      ====================================================== */

      {
        path:
          'vendor-enquiries',

        loadComponent:
          () =>
            import(
              './pages/vendor-enquiries/vendor-enquiries.component'
            )
              .then(
                (
                  module
                ) =>
                  module
                    .VendorEnquiriesComponent
              ),

        data: {
          title:
            'Vendor Enquiries / RFQ',

          section:
            'Purchase',

          feature:
            'vendor-enquiries'
        }
      },


      {
        path:
          'vendor-enquiries/new',

        loadComponent:
          () =>
            import(
              './pages/vendor-enquiry-form/vendor-enquiry-form.component'
            )
              .then(
                (
                  module
                ) =>
                  module
                    .VendorEnquiryFormComponent
              ),

        data: {
          title:
            'New Vendor Enquiry',

          section:
            'Purchase',

          feature:
            'vendor-enquiries'
        }
      },


      {
        path:
          'vendor-enquiries/:id',

        loadComponent:
          () =>
            import(
              './pages/vendor-enquiry-form/vendor-enquiry-form.component'
            )
              .then(
                (
                  module
                ) =>
                  module
                    .VendorEnquiryFormComponent
              ),

        data: {
          title:
            'Vendor Enquiry Details',

          section:
            'Purchase',

          feature:
            'vendor-enquiries'
        }
      },


      /* ======================================================
         QUOTATIONS
      ====================================================== */

      {
        path:
          'quotations',

        loadComponent:
          () =>
            import(
              './pages/quotations/quotations.component'
            )
              .then(
                (
                  module
                ) =>
                  module
                    .QuotationsComponent
              ),

        data: {
          title:
            'Purchase Quotations',

          section:
            'Purchase',

          feature:
            'quotations'
        }
      },


      {
        path:
          'quotations/new',

        loadComponent:
          () =>
            import(
              './pages/quotation-form/quotation-form.component'
            )
              .then(
                (
                  module
                ) =>
                  module
                    .QuotationFormComponent
              ),

        data: {
          title:
            'New Quotation',

          section:
            'Purchase',

          feature:
            'quotations'
        }
      },


      /*
       * IMPORTANT:
       * comparison must stay before :id
       */

      {
        path:
          'quotations/comparison',

        loadComponent:
          () =>
            import(
              './pages/quotation-comparison/quotation-comparison.component'
            )
              .then(
                (
                  module
                ) =>
                  module
                    .QuotationComparisonComponent
              ),

        data: {
          title:
            'Quotation Comparison',

          section:
            'Purchase',

          feature:
            'quotation-comparison'
        }
      },


      {
        path:
          'quotations/:id',

        loadComponent:
          () =>
            import(
              './pages/quotation-form/quotation-form.component'
            )
              .then(
                (
                  module
                ) =>
                  module
                    .QuotationFormComponent
              ),

        data: {
          title:
            'Quotation Details',

          section:
            'Purchase',

          feature:
            'quotations'
        }
      },


      /* ======================================================
         PURCHASE ORDERS
      ====================================================== */

      {
        path:
          'purchase-orders',

        loadComponent:
          () =>
            import(
              './pages/purchase-orders/purchase-orders.component'
            )
              .then(
                (
                  module
                ) =>
                  module
                    .PurchaseOrdersComponent
              ),

        data: {
          title:
            'Purchase Orders',

          section:
            'Purchase',

          feature:
            'purchase-orders'
        }
      },


      {
        path:
          'purchase-orders/new',

        loadComponent:
          () =>
            import(
              './pages/purchase-order-form/purchase-order-form.component'
            )
              .then(
                (
                  module
                ) =>
                  module
                    .PurchaseOrderFormComponent
              ),

        data: {
          title:
            'New Purchase Order',

          section:
            'Purchase',

          feature:
            'purchase-orders'
        }
      },


      {
        path:
          'purchase-orders/:id',

        loadComponent:
          () =>
            import(
              './pages/purchase-order-form/purchase-order-form.component'
            )
              .then(
                (
                  module
                ) =>
                  module
                    .PurchaseOrderFormComponent
              ),

        data: {
          title:
            'Purchase Order Details',

          section:
            'Purchase',

          feature:
            'purchase-orders'
        }
      },


      /* ======================================================
         GOODS RECEIPTS / GRN
      ====================================================== */

      {
        path:
          'goods-receipts',

        loadComponent:
          () =>
            import(
              './pages/goods-receipts/goods-receipts.component'
            )
              .then(
                (
                  module
                ) =>
                  module
                    .GoodsReceiptsComponent
              ),

        data: {
          title:
            'Goods Receipt / GRN',

          section:
            'Purchase',

          feature:
            'goods-receipts'
        }
      },


      /*
       * IMPORTANT:
       * "new" must stay before ":id".
       *
       * Otherwise Angular can interpret:
       * /goods-receipts/new
       * as:
       * /goods-receipts/:id
       */

      {
        path:
          'goods-receipts/new',

        loadComponent:
          () =>
            import(
              './pages/goods-receipt-form/goods-receipt-form.component'
            )
              .then(
                (
                  module
                ) =>
                  module
                    .GoodsReceiptFormComponent
              ),

        data: {
          title:
            'Create Goods Receipt',

          section:
            'Purchase',

          feature:
            'goods-receipts'
        }
      },


      {
        path:
          'goods-receipts/:id',

        loadComponent:
          () =>
            import(
              './pages/goods-receipt-form/goods-receipt-form.component'
            )
              .then(
                (
                  module
                ) =>
                  module
                    .GoodsReceiptFormComponent
              ),

        data: {
          title:
            'Goods Receipt Details',

          section:
            'Purchase',

          feature:
            'goods-receipts'
        }
      },


      /* ======================================================
         VENDORS
      ====================================================== */

      {
        path:
          'invoices',

        loadComponent:
          () =>
            import(
              './pages/purchase-invoices/purchase-invoices.component'
            )
              .then(
                module =>
                  module.PurchaseInvoicesComponent
              ),

        data: {
          title:
            'Vendor Invoices',

          section:
            'Purchase',

          feature:
            'invoices'
        }
      },

      {
        path:
          'vendors',

        loadComponent:
          () =>
            import(
              './pages/vendors/vendors.component'
            )
              .then(
                (
                  module
                ) =>
                  module
                    .VendorsComponent
              ),

        data: {
          title:
            'Purchase Vendors',

          section:
            'Purchase',

          feature:
            'vendors'
        }
      },


      /* ======================================================
         REPORTS
      ====================================================== */

      {
        path:
          'reports',

        loadComponent:
          () =>
            import(
              './pages/purchase-reports/purchase-reports.component'
            )
              .then(
                (
                  module
                ) =>
                  module
                    .PurchaseReportsComponent
              ),

        data: {
          title:
            'Purchase Reports',

          section:
            'Purchase',

          feature:
            'reports'
        }
      },


      /* ======================================================
         EMPLOYEE SELF-SERVICE
      ====================================================== */

      {
        path:
          'employee',

        loadComponent:
          () =>
            import(
              '../employee/employee-dashboard.component'
            )
              .then(
                (
                  module
                ) =>
                  module
                    .EmployeeDashboardComponent
              ),

        data: {
          title:
            'Employee Workspace',

          section:
            'Purchase'
        }
      },


      /* ======================================================
         UNKNOWN PURCHASE ROUTE
      ====================================================== */

      {
        path:
          '**',

        redirectTo:
          'dashboard'
      }

    ]
  }

];
