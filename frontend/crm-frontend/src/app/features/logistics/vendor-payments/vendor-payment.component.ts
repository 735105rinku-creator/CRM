import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';


/* ============================================================
   SELECT OPTION
============================================================ */

interface SelectOption {
  label: string;
  value: string;
}


/* ============================================================
   VENDOR LOOKUP ROW

   The user sees vendorName.
   _id stays internal and is sent automatically to backend.
============================================================ */

interface VendorApiRow {
  _id?: string;

  vendorCode?: string;

  vendorName?: string;
  companyName?: string;

  contactPerson?: string;
  mobile?: string;
  email?: string;

  gstNumber?: string;

  paymentTerms?: string;

  openingPayable?: number;

  status?: string;
}


/* ============================================================
   VENDOR PAYMENT ROW
============================================================ */

interface VendorPaymentRow {
  id: number | string;

  _id?: string;

  vendor: string;
  vendorOther: string;

  exportInvoiceNo: string;
  invoiceDate: string;

  from: string;
  fromOther: string;

  vendorInvoiceNo: string;
  vendorInvoiceDate: string;

  weight: number;

  totalAmount: number;
  previousAdvance: number;
  paidAmount: number;
  deduction: number;

  status: string;
  statusOther: string;

  remarks: string;
}


/* ============================================================
   COMPONENT
============================================================ */

@Component({
  selector: 'app-vendor-payment',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl:
    './vendor-payment.component.html',

  styleUrl:
    './vendor-payment.component.scss'
})
export class VendorPaymentComponent
  implements OnInit {

  private readonly api =
    inject(ApiService);


  /* ============================================================
     LOADING STATES
  ============================================================ */

  protected readonly isLoading =
    signal(false);

  protected readonly isSaving =
    signal(false);

  protected readonly isVendorLoading =
    signal(false);

  protected readonly vendorLoadError =
    signal('');


  /* ============================================================
     FILTERS
  ============================================================ */

  protected readonly searchTerm =
    signal('');

  protected readonly statusFilter =
    signal('all');


  /* ============================================================
     VENDOR OPTIONS

     IMPORTANT:
     No fake/hardcoded vendor IDs.

     Vendors are loaded only from backend Vendor Master.
  ============================================================ */

  protected vendors: SelectOption[] = [];


  private vendorRecords: VendorApiRow[] = [];


  /* ============================================================
     SOURCE OPTIONS
  ============================================================ */

  protected readonly sourceOptions:
    SelectOption[] = [

      {
        label:
          'Air Cargo',

        value:
          'air-cargo'
      },

      {
        label:
          'Sea Freight',

        value:
          'sea-freight'
      },

      {
        label:
          'Transporter',

        value:
          'transporter'
      },

      {
        label:
          'CHA',

        value:
          'cha'
      },

      {
        label:
          'Warehouse',

        value:
          'warehouse'
      },

      {
        label:
          'Other',

        value:
          'other'
      }
    ];


  /* ============================================================
     STATUS OPTIONS
  ============================================================ */

  protected readonly statusOptions:
    SelectOption[] = [

      {
        label:
          'Pending',

        value:
          'pending'
      },

      {
        label:
          'Partial',

        value:
          'partial'
      },

      {
        label:
          'Paid',

        value:
          'paid'
      },

      {
        label:
          'On Hold',

        value:
          'on-hold'
      },

      {
        label:
          'Cancelled',

        value:
          'cancelled'
      },

      {
        label:
          'Other',

        value:
          'other'
      }
    ];


  /* ============================================================
     FORM
  ============================================================ */

  protected form:
    VendorPaymentRow =
      this.emptyPayment();


  /* ============================================================
     PAYMENT LIST
  ============================================================ */

  protected readonly payments =
    signal<VendorPaymentRow[]>([]);


  /* ============================================================
     INIT
  ============================================================ */

  ngOnInit(): void {

    this.loadVendors();

    this.loadPayments();
  }


  /* ============================================================
     LOAD PAYMENT LIST
  ============================================================ */

  protected loadPayments(): void {

    this.isLoading.set(
      true
    );


    this.api
      .get<any>(
        '/logistics/vendor-payments',
        {
          page: 1,
          limit: 100,

          sortBy:
            'createdAt',

          sortOrder:
            'desc'
        }
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

        next: (
          response: any
        ) => {

          const rows =
            this.extractPaymentRows(
              response
            );


          this.payments.set(
            this.normalizePayments(
              rows
            )
          );
        },


        error: (
          error: any
        ) => {

          this.payments.set(
            []
          );


          window.alert(
            error?.error?.message ||
            'Unable to load vendor payments.'
          );
        }
      });
  }


  /* ============================================================
     LOAD REAL VENDORS

     Vendor Payment-specific endpoint.

     User sees:
       Skyline Cargo Services

     Internally Angular keeps:
       68xxxxxxxxxxxxxxxxxxxxxx

     Mongo ID is NEVER manually typed by the employee.
  ============================================================ */

  private loadVendors(): void {

    this.isVendorLoading.set(
      true
    );

    this.vendorLoadError.set(
      ''
    );


    /*
     * Never retain any stale/fake options while
     * the live Vendor Master request is running.
     */
    this.vendors = [];

    this.vendorRecords = [];


    this.api
      .get<any>(
        '/logistics/vendor-payments/vendor-options'
      )
      .pipe(
        finalize(
          () =>
            this.isVendorLoading.set(
              false
            )
        )
      )
      .subscribe({

        next: (
          response: any
        ) => {

          const rows =
            this.extractVendorRows(
              response
            );


          /*
           * Only records with valid Mongo ObjectId are usable
           * as Vendor Payment references.
           */
          const validRows =
            rows.filter(
              (
                row
              ) =>
                Boolean(
                  row?._id &&
                  this.isMongoObjectId(
                    row._id
                  )
                )
            );


          this.vendorRecords =
            validRows;


          this.vendors =
            validRows.map(
              (
                row
              ) => ({

                label:
                  this.vendorLabel(
                    row
                  ),

                value:
                  String(
                    row._id
                  )
              })
            );


          if (
            !this.vendors.length
          ) {

            this.vendorLoadError.set(
              'No active vendors found. Please add an active vendor in Vendor Master first.'
            );
          }
        },


        error: (
          error: any
        ) => {

          this.vendorRecords = [];

          this.vendors = [];


          const message =
            error?.error?.message ||
            'Unable to load vendors for payment.';


          this.vendorLoadError.set(
            message
          );


          /*
           * Do not silently fall back to fake vendor IDs.
           */
          window.alert(
            message
          );
        }
      });
  }


  /* ============================================================
     VENDOR SELECTED

     Autofill existing vendor information.
  ============================================================ */

  protected onVendorSelected(): void {

    const vendor =
      this.vendorRecords.find(
        (
          row
        ) =>
          String(
            row._id ||
            ''
          ) ===
          String(
            this.form.vendor ||
            ''
          )
      );


    if (!vendor) {

      this.form.vendorOther =
        '';


      /*
       * When vendor selection is removed,
       * clear vendor-derived advance.
       */
      if (
        !this.form.vendor
      ) {

        this.form.previousAdvance =
          0;
      }


      return;
    }


    this.form.vendorOther =
      vendor.vendorName ||
      vendor.companyName ||
      '';


    this.form.previousAdvance =
      this.number(
        vendor.openingPayable
      );
  }


  /* ============================================================
     FILTERED PAYMENTS
  ============================================================ */

  protected readonly filteredPayments =
    computed(
      () => {

        const search =
          this.searchTerm()
            .trim()
            .toLowerCase();


        const status =
          this.statusFilter();


        return this.payments()
          .filter(
            (
              payment
            ) => {

              const vendorName =
                this.resolveVendorName(
                  payment
                )
                  .toLowerCase();


              const exportInvoiceNo =
                String(
                  payment.exportInvoiceNo ||
                  ''
                )
                  .toLowerCase();


              const vendorInvoiceNo =
                String(
                  payment.vendorInvoiceNo ||
                  ''
                )
                  .toLowerCase();


              const matchesSearch =

                !search ||

                vendorName.includes(
                  search
                ) ||

                exportInvoiceNo.includes(
                  search
                ) ||

                vendorInvoiceNo.includes(
                  search
                );


              const matchesStatus =

                status ===
                  'all' ||

                payment.status ===
                  status;


              return (
                matchesSearch &&
                matchesStatus
              );
            }
          );
      }
    );


  /* ============================================================
     SUMMARY
  ============================================================ */

  protected readonly summary =
    computed(
      () => {

        const payments =
          this.payments();


        const totalAmount =
          payments.reduce(
            (
              sum,
              payment
            ) =>
              sum +
              this.number(
                payment.totalAmount
              ),

            0
          );


        const previousAdvance =
          payments.reduce(
            (
              sum,
              payment
            ) =>
              sum +
              this.number(
                payment.previousAdvance
              ),

            0
          );


        const paidAmount =
          payments.reduce(
            (
              sum,
              payment
            ) =>
              sum +
              this.number(
                payment.paidAmount
              ),

            0
          );


        const deduction =
          payments.reduce(
            (
              sum,
              payment
            ) =>
              sum +
              this.number(
                payment.deduction
              ),

            0
          );


        const supplierBalance =
          payments.reduce(
            (
              sum,
              payment
            ) =>
              sum +
              this.getSupplierBalance(
                payment
              ),

            0
          );


        return {

          totalAmount,

          previousAdvance,

          paidAmount,

          deduction,

          supplierBalance
        };
      }
    );


  /* ============================================================
     CURRENT CALCULATIONS
  ============================================================ */

  protected get currentPendingAmount():
    number {

    return this.getPendingAmount(
      this.form
    );
  }


  protected get currentSupplierBalance():
    number {

    return this.getSupplierBalance(
      this.form
    );
  }


  /* ============================================================
     PENDING AMOUNT

     Pending = Total - Previous Advance
  ============================================================ */

  protected getPendingAmount(
    payment:
      VendorPaymentRow
  ): number {

    return Math.max(

      0,

      this.number(
        payment.totalAmount
      ) -

      this.number(
        payment.previousAdvance
      )
    );
  }


  /* ============================================================
     SUPPLIER BALANCE

     Supplier Balance =
       Pending
       - Paid
       - Deduction
  ============================================================ */

  protected getSupplierBalance(
    payment:
      VendorPaymentRow
  ): number {

    return Math.max(

      0,

      this.getPendingAmount(
        payment
      ) -

      this.number(
        payment.paidAmount
      ) -

      this.number(
        payment.deduction
      )
    );
  }


  /* ============================================================
     SAVE PAYMENT
  ============================================================ */

  protected addPayment(): void {

    /* ----------------------------------------------------------
       VENDOR
    ---------------------------------------------------------- */

    if (
      !this.form.vendor
    ) {

      alert(
        'Please select a Vendor.'
      );

      return;
    }


    /*
     * Important:
     * Employee should never type MongoDB IDs.
     *
     * This check only protects against stale/invalid frontend
     * data. The employee only selects a normal Vendor name.
     */
    if (
      !this.isMongoObjectId(
        this.form.vendor
      )
    ) {

      alert(
        'Selected Vendor is not valid. Please refresh the page and select the Vendor again.'
      );

      return;
    }


    const selectedVendor =
      this.vendorRecords.find(
        (
          vendor
        ) =>
          String(
            vendor._id ||
            ''
          ) ===
          String(
            this.form.vendor
          )
      );


    if (
      !selectedVendor
    ) {

      alert(
        'Selected Vendor is not available. Please refresh the Vendor list.'
      );

      return;
    }


    /* ----------------------------------------------------------
       EXPORT INVOICE NO.
    ---------------------------------------------------------- */

    if (
      !this.form
        .exportInvoiceNo
        .trim()
    ) {

      alert(
        'Please enter Export Invoice No.'
      );

      return;
    }


    /* ----------------------------------------------------------
       INVOICE DATE
    ---------------------------------------------------------- */

    if (
      !this.form.invoiceDate
    ) {

      alert(
        'Please select Invoice Date.'
      );

      return;
    }


    /* ----------------------------------------------------------
       SOURCE
    ---------------------------------------------------------- */

    if (
      !this.form.from
    ) {

      alert(
        'Please select From.'
      );

      return;
    }


    if (
      this.form.from ===
        'other' &&
      !this.form
        .fromOther
        .trim()
    ) {

      alert(
        'Please enter source details for Other.'
      );

      return;
    }


    /* ----------------------------------------------------------
       VENDOR INVOICE NO.
    ---------------------------------------------------------- */

    if (
      !this.form
        .vendorInvoiceNo
        .trim()
    ) {

      alert(
        'Please enter Vendor Invoice No.'
      );

      return;
    }


    /* ----------------------------------------------------------
       VENDOR INVOICE DATE
    ---------------------------------------------------------- */

    if (
      !this.form.vendorInvoiceDate
    ) {

      alert(
        'Please select Vendor Invoice Date.'
      );

      return;
    }


    /* ----------------------------------------------------------
       TOTAL AMOUNT
    ---------------------------------------------------------- */

    if (
      this.number(
        this.form.totalAmount
      ) <= 0
    ) {

      alert(
        'Total Amount must be greater than zero.'
      );

      return;
    }


    /* ----------------------------------------------------------
       AMOUNT SAFETY
    ---------------------------------------------------------- */

    if (
      this.number(
        this.form.previousAdvance
      ) < 0 ||
      this.number(
        this.form.paidAmount
      ) < 0 ||
      this.number(
        this.form.deduction
      ) < 0
    ) {

      alert(
        'Advance, Paid Amount and Deduction cannot be negative.'
      );

      return;
    }


    /* ----------------------------------------------------------
       STATUS OTHER
    ---------------------------------------------------------- */

    if (
      this.form.status ===
        'other' &&
      !this.form
        .statusOther
        .trim()
    ) {

      alert(
        'Please enter payment status.'
      );

      return;
    }


    /* ----------------------------------------------------------
       REMARKS
    ---------------------------------------------------------- */

    if (
      !this.form
        .remarks
        .trim()
    ) {

      alert(
        'Please enter Remarks.'
      );

      return;
    }


    /* ==========================================================
       API PAYLOAD
    ========================================================== */

    const payload = {

      /*
       * Real Mongo ObjectId from Vendor Master.
       * Never typed by user.
       */
      vendorId:
        this.form.vendor,


      exportInvoiceNo:
        this.form
          .exportInvoiceNo
          .trim(),


      invoiceDate:
        this.form.invoiceDate,


      from:
        this.form.from ===
          'other'

          ? this.form
            .fromOther
            .trim()

          : this.form.from,


      vendorInvoiceNo:
        this.form
          .vendorInvoiceNo
          .trim(),


      vendorInvoiceDate:
        this.form
          .vendorInvoiceDate,


      weight:
        this.number(
          this.form.weight
        ),


      weightUnit:
        'kg',


      totalAmount:
        this.number(
          this.form.totalAmount
        ),


      previousAdvance:
        this.number(
          this.form.previousAdvance
        ),


      paidAmount:
        this.number(
          this.form.paidAmount
        ),


      deduction:
        this.number(
          this.form.deduction
        ),


      status:
        this.form.status ===
          'on-hold'

          ? 'hold'

          : this.form.status,


      statusOther:
        this.form.status ===
          'other'

          ? this.form
            .statusOther
            .trim()

          : '',


      /*
       * Existing backend currently expects shipmentNumber.
       *
       * Preserve current business flow.
       */
      // shipmentNumber:
      //   this.form
      //     .exportInvoiceNo
      //     .trim(),


      /*
       * Vendor Payment screen currently remains INR.
       * Do not change currency flow as part of ObjectId fix.
       */
      currency:
        'INR',


      remarks:
        this.form
          .remarks
          .trim()
    };


    /* ==========================================================
       CREATE PAYMENT
    ========================================================== */

    this.isSaving.set(
      true
    );


    this.api
      .post(
        '/logistics/vendor-payments',
        payload
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

        next: () => {

          this.resetForm();

          this.loadPayments();


          window.alert(
            'Vendor payment saved successfully.'
          );
        },


        error: (
          error: any
        ) => {

          window.alert(
            error?.error?.message ||
            'Unable to save vendor payment.'
          );
        }
      });
  }


  /* ============================================================
     RESET FORM
  ============================================================ */

  protected resetForm(): void {

    this.form =
      this.emptyPayment();
  }


  /* ============================================================
     EDIT PAYMENT

     Existing behavior preserved.
  ============================================================ */

  protected editPayment(
    payment:
      VendorPaymentRow
  ): void {

    this.form = {
      ...payment
    };


    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }


  /* ============================================================
     DELETE PAYMENT
  ============================================================ */

  protected deletePayment(
    payment:
      VendorPaymentRow
  ): void {

    const confirmed =
      window.confirm(
        `Delete vendor payment ${payment.vendorInvoiceNo}?`
      );


    if (
      !confirmed
    ) {

      return;
    }


    if (
      payment._id
    ) {

      this.api
        .delete(
          `/logistics/vendor-payments/${payment._id}`
        )
        .subscribe({

          next: () => {

            this.loadPayments();


            window.alert(
              'Vendor payment deleted successfully.'
            );
          },


          error: (
            error: any
          ) => {

            window.alert(
              error?.error?.message ||
              'Unable to delete vendor payment.'
            );
          }
        });


      return;
    }


    this.payments.update(
      (
        current
      ) =>
        current.filter(
          (
            item
          ) =>
            item.id !==
            payment.id
        )
    );
  }


  /* ============================================================
     VIEW PAYMENT

     Existing behavior preserved.
  ============================================================ */

  protected viewPayment(
    payment:
      VendorPaymentRow
  ): void {

    console.log(
      'View vendor payment',
      payment
    );
  }


  /* ============================================================
     EXPORT

     Existing behavior preserved.
  ============================================================ */

  protected exportPayments(): void {

    console.log(
      'Export vendor payment records',
      this.filteredPayments()
    );
  }


  /* ============================================================
     FILTER HELPERS
  ============================================================ */

  protected setSearch(
    value:
      string
  ): void {

    this.searchTerm.set(
      value
    );
  }


  protected setStatusFilter(
    value:
      string
  ): void {

    this.statusFilter.set(
      value
    );
  }


  protected clearFilters(): void {

    this.searchTerm.set(
      ''
    );

    this.statusFilter.set(
      'all'
    );
  }


  /* ============================================================
     PAYMENT RESPONSE EXTRACTION
  ============================================================ */

  private extractPaymentRows(
    response:
      any
  ): any[] {

    if (
      Array.isArray(
        response
      )
    ) {

      return response;
    }


    /*
     * ApiService may already unwrap ApiResponse.
     */
    if (
      Array.isArray(
        response?.data
      )
    ) {

      return response.data;
    }


    if (
      Array.isArray(
        response?.records
      )
    ) {

      return response.records;
    }


    if (
      Array.isArray(
        response?.payments
      )
    ) {

      return response.payments;
    }


    if (
      Array.isArray(
        response?.vendorPayments
      )
    ) {

      return response.vendorPayments;
    }


    /*
     * Support nested paginated response.
     */
    const nested =
      response?.data;


    if (
      nested &&
      typeof nested ===
        'object'
    ) {

      if (
        Array.isArray(
          nested.data
        )
      ) {

        return nested.data;
      }


      if (
        Array.isArray(
          nested.records
        )
      ) {

        return nested.records;
      }


      if (
        Array.isArray(
          nested.payments
        )
      ) {

        return nested.payments;
      }


      if (
        Array.isArray(
          nested.vendorPayments
        )
      ) {

        return nested.vendorPayments;
      }


      if (
        Array.isArray(
          nested.items
        )
      ) {

        return nested.items;
      }
    }


    if (
      Array.isArray(
        response?.items
      )
    ) {

      return response.items;
    }


    return [];
  }


  /* ============================================================
     VENDOR RESPONSE EXTRACTION
  ============================================================ */

  private extractVendorRows(
    response:
      any
  ): VendorApiRow[] {

    if (
      Array.isArray(
        response
      )
    ) {

      return response;
    }


    /*
     * With ApiService unwrapping, controller response:
     *
     * {
     *   vendors: [...]
     * }
     */
    if (
      Array.isArray(
        response?.vendors
      )
    ) {

      return response.vendors;
    }


    /*
     * Without unwrapping:
     *
     * {
     *   data: {
     *     vendors: [...]
     *   }
     * }
     */
    if (
      Array.isArray(
        response?.data?.vendors
      )
    ) {

      return response.data.vendors;
    }


    if (
      Array.isArray(
        response?.data
      )
    ) {

      return response.data;
    }


    if (
      Array.isArray(
        response?.items
      )
    ) {

      return response.items;
    }


    if (
      Array.isArray(
        response?.data?.items
      )
    ) {

      return response.data.items;
    }


    return [];
  }


  /* ============================================================
     NORMALIZE PAYMENTS
  ============================================================ */

  private normalizePayments(
    rows:
      any[]
  ): VendorPaymentRow[] {

    return rows.map(
      (
        row,
        index
      ) => ({

        _id:
          row._id,


        id:
          row._id ||
          index + 1,


        /*
         * When vendorId is populated:
         * vendorId._id
         *
         * When unpopulated:
         * vendorId
         */
        vendor:
          row.vendorId?._id ||
          row.vendorId ||
          '',


        vendorOther:
          row.vendorName ||
          row.vendorId?.vendorName ||
          row.vendorId?.companyName ||
          '',


        exportInvoiceNo:
          row.exportInvoiceNo ||
          row.shipmentNumber ||
          '',


        invoiceDate:
          row.invoiceDate

            ? String(
              row.invoiceDate
            )
              .slice(
                0,
                10
              )

            : '',


        from:
          row.from ||
          '',


        fromOther:
          '',


        vendorInvoiceNo:
          row.vendorInvoiceNo ||
          '',


        vendorInvoiceDate:
          row.vendorInvoiceDate

            ? String(
              row.vendorInvoiceDate
            )
              .slice(
                0,
                10
              )

            : '',


        weight:
          this.number(
            row.weight
          ),


        totalAmount:
          this.number(
            row.totalAmount
          ),


        previousAdvance:
          this.number(
            row.previousAdvance
          ),


        paidAmount:
          this.number(
            row.paidAmount
          ),


        deduction:
          this.number(
            row.deduction
          ),


        status:
          row.status ===
            'hold'

            ? 'on-hold'

            : row.status ||
              'pending',


        statusOther:
          row.statusOther ||
          '',


        remarks:
          row.remarks ||
          ''
      })
    );
  }


  /* ============================================================
     RESOLVE VENDOR NAME
  ============================================================ */

  protected resolveVendorName(
    payment:
      VendorPaymentRow
  ): string {

    const fromOptions =
      this.vendors.find(
        (
          vendor
        ) =>
          vendor.value ===
          payment.vendor
      )
        ?.label;


    if (
      fromOptions
    ) {

      return fromOptions;
    }


    if (
      payment.vendorOther
    ) {

      return payment.vendorOther;
    }


    /*
     * Do not display Mongo ObjectId to normal employee
     * when label cannot be resolved.
     */
    if (
      this.isMongoObjectId(
        payment.vendor
      )
    ) {

      return 'Vendor';
    }


    return (
      payment.vendor ||
      '-'
    );
  }


  /* ============================================================
     RESOLVE SOURCE
  ============================================================ */

  protected resolveSourceName(
    payment:
      VendorPaymentRow
  ): string {

    if (
      payment.from ===
        'other'
    ) {

      return (
        payment.fromOther ||
        'Other'
      );
    }


    return (
      this.sourceOptions.find(
        (
          option
        ) =>
          option.value ===
          payment.from
      )
        ?.label ||

      payment.from ||

      '-'
    );
  }


  /* ============================================================
     RESOLVE STATUS
  ============================================================ */

  protected resolveStatusName(
    payment:
      VendorPaymentRow
  ): string {

    if (
      payment.status ===
        'other'
    ) {

      return (
        payment.statusOther ||
        'Other'
      );
    }


    return (
      this.statusOptions.find(
        (
          option
        ) =>
          option.value ===
          payment.status
      )
        ?.label ||

      payment.status ||

      '-'
    );
  }


  /* ============================================================
     STATUS CSS CLASS
  ============================================================ */

  protected statusClass(
    status:
      string
  ): string {

    return String(
      status ||
      ''
    )
      .toLowerCase()
      .replace(
        /\s+/g,
        '-'
      );
  }


  /* ============================================================
     CURRENCY
  ============================================================ */

  protected formatCurrency(
    value:
      number
  ): string {

    return new Intl.NumberFormat(
      'en-IN',
      {
        style:
          'currency',

        currency:
          'INR',

        minimumFractionDigits:
          2
      }
    )
      .format(
        this.number(
          value
        )
      );
  }


  /* ============================================================
     DATE
  ============================================================ */

  protected formatDate(
    date:
      string
  ): string {

    if (
      !date
    ) {

      return '-';
    }


    const parsed =
      new Date(
        `${date}T00:00:00`
      );


    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {

      return '-';
    }


    return new Intl.DateTimeFormat(
      'en-IN',
      {
        day:
          '2-digit',

        month:
          '2-digit',

        year:
          'numeric'
      }
    )
      .format(
        parsed
      );
  }


  /* ============================================================
     EMPTY PAYMENT
  ============================================================ */

  private emptyPayment():
    VendorPaymentRow {

    return {

      id:
        0,


      vendor:
        '',


      vendorOther:
        '',


      exportInvoiceNo:
        '',


      invoiceDate:
        '',


      from:
        '',


      fromOther:
        '',


      vendorInvoiceNo:
        '',


      vendorInvoiceDate:
        '',


      weight:
        0,


      totalAmount:
        0,


      previousAdvance:
        0,


      paidAmount:
        0,


      deduction:
        0,


      status:
        'pending',


      statusOther:
        '',


      remarks:
        ''
    };
  }


  /* ============================================================
     VENDOR LABEL
  ============================================================ */

  private vendorLabel(
    vendor:
      VendorApiRow
  ): string {

    const name =
      vendor.vendorName ||
      vendor.companyName ||
      'Vendor';


    const code =
      String(
        vendor.vendorCode ||
        ''
      )
        .trim();


    return code

      ? `${name} (${code})`

      : name;
  }


  /* ============================================================
     OBJECT ID SAFETY

     Mongo ObjectId remains an internal implementation detail.

     This does NOT ask the employee to type it.
  ============================================================ */

  private isMongoObjectId(
    value:
      unknown
  ): boolean {

    return /^[a-f\d]{24}$/i
      .test(
        String(
          value ||
          ''
        )
          .trim()
      );
  }


  /* ============================================================
     NUMBER SAFETY
  ============================================================ */

  private number(
    value:
      unknown
  ): number {

    const result =
      Number(
        value
      );


    return Number.isFinite(
      result
    )

      ? result

      : 0;
  }
}