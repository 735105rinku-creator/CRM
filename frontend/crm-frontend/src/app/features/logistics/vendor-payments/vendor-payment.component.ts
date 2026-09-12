import { CommonModule } from '@angular/common';

import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
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
   VENDOR LOOKUP
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
   USER CREATOR
============================================================ */

interface CreatorUser {
  _id?: string;
  id?: string;

  name?: string;
  displayName?: string;

  firstName?: string;
  lastName?: string;

  email?: string;
}

/* ============================================================
   EMPLOYEE CREATOR
============================================================ */

interface CreatorEmployee {
  _id?: string;
  id?: string;

  employeeCode?: string;

  firstName?: string;
  lastName?: string;

  name?: string;
  displayName?: string;

  designation?: string;
  organizationRole?: string;
}

/* ============================================================
   PAYMENT PROOF
============================================================ */

interface PaymentProof {
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

/* ============================================================
   VENDOR BILL
============================================================ */

interface VendorBillDocument {
  fileName: string;
  originalName: string;

  fileUrl: string;
  storageKey: string;

  mimeType: string;
  fileSize: number;

  uploadedBy?: string | null;
  uploadedAt?: string | null;
}

/* ============================================================
   EDIT AUDIT
============================================================ */

interface EditAuditEntry {
  changedBy?: string;
  changedByName?: string;
  changedAt?: string;
}

/* ============================================================
   ACCOUNTS STATUS
============================================================ */

type AccountsStatus =
  | 'sent'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'partially_paid'
  | 'paid'
  | null;

/* ============================================================
   VENDOR PAYMENT ROW
============================================================ */

interface VendorPaymentRow {
  editHistory?: EditAuditEntry[];

  id: number | string;
  _id?: string;

  /* ----------------------------------------------------------
     CREATOR / OWNERSHIP
  ---------------------------------------------------------- */

  createdBy?:
    | CreatorUser
    | string
    | null;

  createdByEmployeeId?:
    | CreatorEmployee
    | string
    | null;

  createdByName?: string;
  createdByEmployeeCode?: string;

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

  paymentProof?: PaymentProof | null;

  vendorBillDocument?: VendorBillDocument | null;

  accountsHandoffId?: string | null;

  accountsStatus?: AccountsStatus;

  accountsHandedOffBy?: string | null;
  accountsHandedOffAt?: string | null;

  accountsPaidAmount?: number;
  accountsRemainingAmount?: number;

  accountsPaymentDate?: string | null;
  accountsPaymentReference?: string;
  accountsPaidByName?: string;

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

  templateUrl: './vendor-payment.component.html',
  styleUrl: './vendor-payment.component.scss'
})
export class VendorPaymentComponent implements OnInit {

  private readonly api =
    inject(ApiService);

  /* ============================================================
     ELEMENT REFERENCES
  ============================================================ */

  @ViewChild('paymentForm')
  private paymentFormRef?:
    ElementRef<HTMLElement>;

  @ViewChild('fileInput')
  private fileInputRef?:
    ElementRef<HTMLInputElement>;

  @ViewChild('vendorBillInput')
  private vendorBillInputRef?:
    ElementRef<HTMLInputElement>;

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
     CURRENT EMPLOYEE / USER IDENTITY

     employee._id
       -> preferred ownership identity

     user.id
       -> legacy createdBy fallback
  ============================================================ */

  protected readonly currentEmployeeId =
    signal('');

  protected readonly currentUserId =
    signal('');

  protected readonly currentEmployeeName =
    signal('');

  protected readonly currentEmployeeCode =
    signal('');

  /* ============================================================
     PAYMENT PROOF
  ============================================================ */

  protected readonly selectedPaymentProof =
    signal<File | null>(null);

  protected readonly paymentProofError =
    signal('');

  /* ============================================================
     VENDOR BILL
  ============================================================ */

  protected readonly selectedVendorBill =
    signal<File | null>(null);

  protected readonly vendorBillError =
    signal('');

  protected readonly uploadingVendorBillId =
    signal<string | null>(null);

  /* ============================================================
     ACCOUNTS HANDOFF
  ============================================================ */

  protected readonly canHandoffToAccounts =
    signal(false);

  protected readonly handingOffPaymentId =
    signal<string | null>(null);

  /* ============================================================
     DETAIL MODAL
  ============================================================ */

  protected readonly selectedPayment =
    signal<VendorPaymentRow | null>(null);

  /* ============================================================
     EDIT MODE
  ============================================================ */

  protected readonly editingPaymentId =
    signal<string | null>(null);

  protected readonly isEditMode =
    computed(
      () =>
        this.editingPaymentId() !== null
    );

  /* ============================================================
     FILTERS
  ============================================================ */

  protected readonly searchTerm =
    signal('');

  protected readonly statusFilter =
    signal('all');

  /* ============================================================
     VENDOR OPTIONS
  ============================================================ */

  protected vendors:
    SelectOption[] = [];

  private vendorRecords:
    VendorApiRow[] = [];

  /* ============================================================
     SOURCE OPTIONS
  ============================================================ */

  protected readonly sourceOptions:
    SelectOption[] = [
      {
        label: 'Air Cargo',
        value: 'air-cargo'
      },
      {
        label: 'Sea Freight',
        value: 'sea-freight'
      },
      {
        label: 'Transporter',
        value: 'transporter'
      },
      {
        label: 'CHA',
        value: 'cha'
      },
      {
        label: 'Warehouse',
        value: 'warehouse'
      },
      {
        label: 'Other',
        value: 'other'
      }
    ];

  /* ============================================================
     STATUS OPTIONS
  ============================================================ */

  protected readonly statusOptions:
    SelectOption[] = [
      {
        label: 'Pending',
        value: 'pending'
      },
      {
        label: 'Partial',
        value: 'partial'
      },
      {
        label: 'Paid',
        value: 'paid'
      },
      {
        label: 'On Hold',
        value: 'on-hold'
      },
      {
        label: 'Cancelled',
        value: 'cancelled'
      },
      {
        label: 'Other',
        value: 'other'
      }
    ];

  /* ============================================================
     FORM
  ============================================================ */

  protected form:
    VendorPaymentRow =
      this.emptyPayment();

  /* ============================================================
     PAYMENTS
  ============================================================ */

  protected readonly payments =
    signal<VendorPaymentRow[]>([]);

  /* ============================================================
     INIT
  ============================================================ */

  ngOnInit(): void {
    this.loadHandoffAccess();
    this.loadVendors();
    this.loadPayments();
  }

  /* ============================================================
     ACCOUNTS HANDOFF ACCESS + CURRENT EMPLOYEE IDENTITY
  ============================================================ */

  private loadHandoffAccess(): void {

    this.canHandoffToAccounts.set(false);

    this.currentEmployeeId.set('');
    this.currentUserId.set('');

    this.currentEmployeeName.set('');
    this.currentEmployeeCode.set('');

    this.api
      .get<any>(
        '/hr/employees/dashboard'
      )
      .subscribe({

        next: (
          response: any
        ) => {

          /*
           * ApiResponse:
           *
           * {
           *   data: {
           *     employee,
           *     user
           *   }
           * }
           *
           * Existing fallback shapes are retained.
           */

          const employee =
            response?.employee ||
            response?.data?.employee ||
            null;

          const responseUser =
            response?.user ||
            response?.data?.user ||
            null;

          /* ----------------------------------------------------
             CURRENT EMPLOYEE ID
          ---------------------------------------------------- */

          this.currentEmployeeId.set(
            this.entityId(
              employee
            )
          );

          /*
           * Employee dashboard intentionally returns user.id,
           * not only user._id.
           */

          this.currentUserId.set(
            String(
              responseUser?.id ||
              responseUser?._id ||
              ''
            ).trim()
          );

          this.currentEmployeeCode.set(
            String(
              employee?.employeeCode ||
              responseUser?.employeeCode ||
              ''
            ).trim()
          );

          this.currentEmployeeName.set(
            this.resolvePersonName(
              employee
            ) ||
            String(
              responseUser?.name ||
              ''
            ).trim() ||
            this.currentEmployeeCode()
          );

          /* ----------------------------------------------------
             SENIOR ACCESS
          ---------------------------------------------------- */

          const organizationRole =
            this.normalizeRole(
              employee?.organizationRole ||
              employee?.organization_role
            );

          const userRole =
            this.normalizeRole(
              responseUser?.role
            );

          const allowed =
            organizationRole ===
              'department_head' ||
            organizationRole ===
              'team_leader' ||
            userRole ===
              'department_head' ||
            userRole ===
              'team_leader';

          this.canHandoffToAccounts.set(
            allowed
          );
        },

        error: () => {

          this.canHandoffToAccounts.set(
            false
          );

          this.currentEmployeeId.set('');
          this.currentUserId.set('');

          this.currentEmployeeName.set('');
          this.currentEmployeeCode.set('');
        }
      });
  }

  /* ============================================================
     LOAD PAYMENTS
  ============================================================ */

  protected loadPayments(): void {

    this.isLoading.set(true);

    this.api
      .get<any>(
        '/logistics/vendor-payments',
        {
          page: 1,
          limit: 100,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }
      )
      .pipe(
        finalize(
          () =>
            this.isLoading.set(false)
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

          const normalized =
            this.normalizePayments(
              rows
            );

          this.payments.set(
            normalized
          );

          const selected =
            this.selectedPayment();

          if (
            selected?._id
          ) {

            const refreshed =
              normalized.find(
                row =>
                  String(
                    row._id ||
                    ''
                  ) ===
                  String(
                    selected._id ||
                    ''
                  )
              ) ||
              null;

            this.selectedPayment.set(
              refreshed
            );
          }
        },

        error: (
          error: any
        ) => {

          this.payments.set([]);

          window.alert(
            error?.error?.message ||
            'Unable to load vendor payments.'
          );
        }
      });
  }

  /* ============================================================
     LOAD VENDORS
  ============================================================ */

  private loadVendors(): void {

    this.isVendorLoading.set(true);
    this.vendorLoadError.set('');

    this.vendors = [];
    this.vendorRecords = [];

    this.api
      .get<any>(
        '/logistics/vendor-payments/vendor-options'
      )
      .pipe(
        finalize(
          () =>
            this.isVendorLoading.set(false)
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

          const validRows =
            rows.filter(
              row =>
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
              row => ({
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

          this.ensureSelectedVendor();

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

          window.alert(
            message
          );
        }
      });
  }

  /* ============================================================
     VENDOR SELECTED
  ============================================================ */

  protected onVendorSelected(): void {

    const vendor =
      this.vendorRecords.find(
        row =>
          String(
            row._id ||
            ''
          ) ===
          String(
            this.form.vendor ||
            ''
          )
      );

    if (
      !vendor
    ) {

      this.form.vendorOther = '';

      if (
        !this.form.vendor
      ) {
        this.form.previousAdvance = 0;
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
     PAYMENT PROOF SELECTED
  ============================================================ */

  protected onPaymentProofSelected(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0] ||
      null;

    this.paymentProofError.set('');

    if (
      !file
    ) {

      this.selectedPaymentProof.set(
        null
      );

      return;
    }

    if (
      !this.isAllowedDocument(
        file
      )
    ) {

      this.paymentProofError.set(
        'Only JPG, JPEG, PNG or PDF files are allowed.'
      );

      this.selectedPaymentProof.set(
        null
      );

      input.value = '';

      return;
    }

    const maxSize =
      10 *
      1024 *
      1024;

    if (
      file.size >
      maxSize
    ) {

      this.paymentProofError.set(
        'Payment proof cannot exceed 10 MB.'
      );

      this.selectedPaymentProof.set(
        null
      );

      input.value = '';

      return;
    }

    this.selectedPaymentProof.set(
      file
    );
  }

  /* ============================================================
     VENDOR BILL SELECTED
  ============================================================ */

  protected onVendorBillSelected(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0] ||
      null;

    this.vendorBillError.set('');

    if (
      !file
    ) {

      this.selectedVendorBill.set(
        null
      );

      return;
    }

    if (
      !this.isAllowedDocument(
        file
      )
    ) {

      this.vendorBillError.set(
        'Only JPG, JPEG, PNG or PDF files are allowed.'
      );

      this.selectedVendorBill.set(
        null
      );

      input.value = '';

      return;
    }

    const maxSize =
      1 *
      1024 *
      1024;

    if (
      file.size >
      maxSize
    ) {

      this.vendorBillError.set(
        'Vendor Bill cannot exceed 1 MB.'
      );

      this.selectedVendorBill.set(
        null
      );

      input.value = '';

      return;
    }

    this.selectedVendorBill.set(
      file
    );
  }

  /* ============================================================
     UPLOAD VENDOR BILL

     Ownership rule:
     - Creator can upload / replace before handoff.
     - Senior can review junior bill but cannot replace it.
  ============================================================ */

  protected uploadVendorBill(
    payment: VendorPaymentRow
  ): void {

    if (
      !payment._id
    ) {

      window.alert(
        'Vendor payment record is required before uploading the Vendor Bill.'
      );

      return;
    }

    if (
      !this.canModifyVendorBill(
        payment
      )
    ) {

      if (
        this.isHandedOff(
          payment
        )
      ) {

        window.alert(
          'This Vendor Payment has already been sent to Accounts. Vendor Bill cannot be changed.'
        );

      } else {

        window.alert(
          'You can upload or replace the Vendor Bill only for Vendor Payments created in your own workspace.'
        );
      }

      return;
    }

    const file =
      this.selectedVendorBill();

    if (
      !file
    ) {

      window.alert(
        'Please select a Vendor Bill first.'
      );

      return;
    }

    const id =
      String(
        payment._id
      );

    const formData =
      new FormData();

    formData.append(
      'vendorBill',
      file,
      file.name
    );

    this.uploadingVendorBillId.set(
      id
    );

    this.api
      .post<any>(
        `/logistics/vendor-payments/${id}/vendor-bill`,
        formData
      )
      .pipe(
        finalize(
          () =>
            this.uploadingVendorBillId.set(
              null
            )
        )
      )
      .subscribe({

        next: () => {

          this.clearVendorBillSelection();

          this.loadPayments();

          window.alert(
            payment.vendorBillDocument?.fileUrl
              ? 'Vendor Bill replaced successfully.'
              : 'Vendor Bill uploaded successfully.'
          );
        },

        error: (
          error: any
        ) => {

          window.alert(
            error?.error?.message ||
            'Unable to upload Vendor Bill.'
          );
        }
      });
  }

  /* ============================================================
     VIEW VENDOR BILL
  ============================================================ */

  protected viewVendorBill(
    payment: VendorPaymentRow
  ): void {

    if (
      !payment._id ||
      !payment.vendorBillDocument?.fileUrl
    ) {

      window.alert(
        'No Vendor Bill available.'
      );

      return;
    }

    this.openDocument(
      `/logistics/vendor-payments/${payment._id}/vendor-bill/download`,
      'Unable to open Vendor Bill.'
    );
  }

  /* ============================================================
     DOWNLOAD VENDOR BILL
  ============================================================ */

  protected downloadVendorBill(
    payment: VendorPaymentRow
  ): void {

    if (
      !payment._id ||
      !payment.vendorBillDocument?.fileUrl
    ) {

      window.alert(
        'No Vendor Bill available.'
      );

      return;
    }

    this.downloadDocument(
      `/logistics/vendor-payments/${payment._id}/vendor-bill/download`,

      payment.vendorBillDocument
        .originalName ||
      payment.vendorBillDocument
        .fileName ||
      'vendor-bill',

      'Unable to download Vendor Bill.'
    );
  }

  /* ============================================================
     HANDOFF TO ACCOUNTS

     Important:
     ownership is intentionally NOT required.

     Senior can handoff junior-created eligible records.
  ============================================================ */

  protected handoffToAccounts(
    payment: VendorPaymentRow
  ): void {

    if (
      !payment._id
    ) {
      return;
    }

    if (
      this.isHandedOff(
        payment
      )
    ) {

      window.alert(
        'This Vendor Payment has already been sent to Accounts.'
      );

      return;
    }

    if (
      !this.canHandoffToAccounts()
    ) {

      window.alert(
        'Only Logistics Department Head or Team Leader can send Vendor Payments to Accounts.'
      );

      return;
    }

    if (
      String(
        payment.status ||
        ''
      ).toLowerCase() ===
      'cancelled'
    ) {

      window.alert(
        'Cancelled Vendor Payments cannot be sent to Accounts.'
      );

      return;
    }

    const supplierBalance =
      this.getSupplierBalance(
        payment
      );

    if (
      supplierBalance <=
      0
    ) {

      window.alert(
        'There is no Supplier Balance to send to Accounts.'
      );

      return;
    }

    if (
      !payment.vendorBillDocument?.fileUrl
    ) {

      window.alert(
        'Please upload the Vendor Bill before sending this payable to Accounts.'
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Send ${this.formatCurrency(
          supplierBalance
        )} to Accounts?\n\nCreated By: ${this.creatorName(
          payment
        )}\n\nAfter handoff, Logistics financial editing will be locked.`
      );

    if (
      !confirmed
    ) {
      return;
    }

    const id =
      String(
        payment._id
      );

    this.handingOffPaymentId.set(
      id
    );

    this.api
      .post<any>(
        `/logistics/vendor-payments/${id}/handoff`,
        {}
      )
      .pipe(
        finalize(
          () =>
            this.handingOffPaymentId.set(
              null
            )
        )
      )
      .subscribe({

        next: () => {

          if (
            this.editingPaymentId() ===
            id
          ) {

            this.resetForm(
              false
            );
          }

          this.loadPayments();

          window.alert(
            'Vendor Payment sent to Accounts successfully.'
          );
        },

        error: (
          error: any
        ) => {

          window.alert(
            error?.error?.message ||
            'Unable to send Vendor Payment to Accounts.'
          );
        }
      });
  }

  /* ============================================================
     CAN SEND
  ============================================================ */

  protected canSendToAccounts(
    payment: VendorPaymentRow
  ): boolean {

    return (
      this.canHandoffToAccounts() &&
      !!payment._id &&
      !this.isHandedOff(payment) &&
      payment.status !== 'cancelled' &&
      this.getSupplierBalance(payment) > 0 &&
      !!payment.vendorBillDocument?.fileUrl
    );
  }

  /* ============================================================
     HANDOFF LABEL
  ============================================================ */

  protected handoffButtonLabel(
    payment: VendorPaymentRow
  ): string {

    if (
      payment._id &&
      this.handingOffPaymentId() ===
      String(
        payment._id
      )
    ) {

      return 'Sending...';
    }

    if (
      this.isHandedOff(
        payment
      )
    ) {

      return 'Sent to Accounts';
    }

    return 'Send to Accounts';
  }

  /* ============================================================
     VENDOR BILL LABEL
  ============================================================ */

  protected vendorBillUploadLabel(
    payment: VendorPaymentRow
  ): string {

    if (
      payment._id &&
      this.uploadingVendorBillId() ===
      String(
        payment._id
      )
    ) {

      return 'Uploading...';
    }

    return payment.vendorBillDocument?.fileUrl
      ? 'Replace Vendor Bill'
      : 'Upload Vendor Bill';
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
            payment => {

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

              const accountsStatus =
                this.accountsStatusLabel(
                  payment.accountsStatus
                )
                  .toLowerCase();

              const createdBy =
                this.creatorName(
                  payment
                )
                  .toLowerCase();

              const createdByCode =
                this.creatorEmployeeCode(
                  payment
                )
                  .toLowerCase();

              const matchesSearch =
                !search ||
                vendorName.includes(search) ||
                exportInvoiceNo.includes(search) ||
                vendorInvoiceNo.includes(search) ||
                accountsStatus.includes(search) ||
                createdBy.includes(search) ||
                createdByCode.includes(search);

              const matchesStatus =
                status === 'all' ||
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

        const accountsPaidAmount =
          payments.reduce(
            (
              sum,
              payment
            ) =>
              sum +
              this.number(
                payment.accountsPaidAmount
              ),
            0
          );

        const accountsRemainingAmount =
          payments.reduce(
            (
              sum,
              payment
            ) =>
              sum +
              (
                this.isHandedOff(
                  payment
                )
                  ? this.number(
                      payment.accountsRemainingAmount
                    )
                  : 0
              ),
            0
          );

        const handedOffCount =
          payments.filter(
            payment =>
              this.isHandedOff(
                payment
              )
          ).length;

        return {
          totalAmount,
          previousAdvance,
          paidAmount,
          deduction,
          supplierBalance,
          accountsPaidAmount,
          accountsRemainingAmount,
          handedOffCount
        };
      }
    );

  /* ============================================================
     CALCULATIONS
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

  protected getPendingAmount(
    payment: VendorPaymentRow
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

  protected getSupplierBalance(
    payment: VendorPaymentRow
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

  protected getDisplayOutstanding(
    payment: VendorPaymentRow
  ): number {

    if (
      this.isHandedOff(
        payment
      )
    ) {

      return this.number(
        payment.accountsRemainingAmount
      );
    }

    return this.getSupplierBalance(
      payment
    );
  }

  protected getAccountsPaidAmount(
    payment: VendorPaymentRow
  ): number {

    return this.number(
      payment.accountsPaidAmount
    );
  }

  /* ============================================================
     HANDOFF CHECK
  ============================================================ */

  protected isHandedOff(
    payment: VendorPaymentRow
  ): boolean {

    return Boolean(
      String(
        payment.accountsHandoffId ||
        ''
      ).trim()
    );
  }

  /* ============================================================
     OWNERSHIP CHECK

     Rule matches backend:

     1. If record has createdByEmployeeId:
        compare employee IDs.

     2. Legacy record without createdByEmployeeId:
        compare createdBy user ID.
  ============================================================ */

  protected isOwnPayment(
    payment: VendorPaymentRow
  ): boolean {

    const recordEmployeeId =
      this.entityId(
        payment.createdByEmployeeId
      );

    const employeeId =
      String(
        this.currentEmployeeId() ||
        ''
      ).trim();

    if (
      recordEmployeeId &&
      employeeId
    ) {

      return (
        recordEmployeeId ===
        employeeId
      );
    }

    /*
     * A record that has employee ownership must not fall through
     * to user ownership when the current employee differs.
     */

    if (
      recordEmployeeId
    ) {

      return false;
    }

    const recordUserId =
      this.entityId(
        payment.createdBy
      );

    const userId =
      String(
        this.currentUserId() ||
        ''
      ).trim();

    return Boolean(
      recordUserId &&
      userId &&
      recordUserId ===
        userId
    );
  }

  /* ============================================================
     CREATOR NAME

     Used in senior review/handoff UI.
  ============================================================ */

  protected creatorName(
    payment: VendorPaymentRow
  ): string {

    if (
      payment.createdByName
    ) {

      return payment.createdByName;
    }

    const employeeName =
      this.resolvePersonName(
        payment.createdByEmployeeId
      );

    if (
      employeeName
    ) {
      return employeeName;
    }

    const userName =
      this.resolvePersonName(
        payment.createdBy
      );

    if (
      userName
    ) {
      return userName;
    }

    const code =
      this.creatorEmployeeCode(
        payment
      );

    return code ||
      'Employee';
  }

  /* ============================================================
     CREATOR EMPLOYEE CODE
  ============================================================ */

  protected creatorEmployeeCode(
    payment: VendorPaymentRow
  ): string {

    if (
      payment.createdByEmployeeCode
    ) {

      return payment.createdByEmployeeCode;
    }

    const employee =
      payment.createdByEmployeeId;

    if (
      employee &&
      typeof employee ===
        'object'
    ) {

      return String(
        employee.employeeCode ||
        ''
      ).trim();
    }

    return '';
  }

  /* ============================================================
     CREATOR DESIGNATION
  ============================================================ */

  protected creatorDesignation(
    payment: VendorPaymentRow
  ): string {

    const employee =
      payment.createdByEmployeeId;

    if (
      !employee ||
      typeof employee !==
        'object'
    ) {

      return '';
    }

    return String(
      employee.designation ||
      ''
    ).trim();
  }

  /* ============================================================
     CAN EDIT PAYMENT

     Creator only + before handoff.
  ============================================================ */

  protected canEditPayment(
    payment: VendorPaymentRow
  ): boolean {

    return (
      !!payment._id &&
      this.isOwnPayment(
        payment
      ) &&
      !this.isHandedOff(
        payment
      )
    );
  }

  /* ============================================================
     CAN MODIFY VENDOR BILL

     Creator only + before handoff.
  ============================================================ */

  protected canModifyVendorBill(
    payment: VendorPaymentRow
  ): boolean {

    return (
      !!payment._id &&
      this.isOwnPayment(
        payment
      ) &&
      !this.isHandedOff(
        payment
      )
    );
  }

  /* ============================================================
     RECORD ACCESS DESCRIPTION
  ============================================================ */

  protected recordAccessLabel(
    payment: VendorPaymentRow
  ): string {

    if (
      this.isHandedOff(
        payment
      )
    ) {

      return 'Read-only after Accounts handoff';
    }

    if (
      this.isOwnPayment(
        payment
      )
    ) {

      return 'Your Vendor Payment';
    }

    if (
      this.canHandoffToAccounts()
    ) {

      return 'Department record - review only';
    }

    return 'Read-only';
  }

  /* ============================================================
     VALIDATE FORM
  ============================================================ */

  private validateForm(): boolean {

    const editingId =
      this.editingPaymentId();

    if (
      editingId
    ) {

      const editingRecord =
        this.payments()
          .find(
            row =>
              String(
                row._id ||
                ''
              ) ===
              String(
                editingId
              )
          );

      if (
        editingRecord &&
        !this.canEditPayment(
          editingRecord
        )
      ) {

        if (
          this.isHandedOff(
            editingRecord
          )
        ) {

          window.alert(
            'This Vendor Payment has already been sent to Accounts and cannot be edited from Logistics.'
          );

        } else {

          window.alert(
            'You can edit only Vendor Payments created in your own workspace.'
          );
        }

        return false;
      }
    }

    if (
      !this.form.vendor
    ) {

      window.alert(
        'Please select a Vendor.'
      );

      return false;
    }

    if (
      !this.isMongoObjectId(
        this.form.vendor
      )
    ) {

      window.alert(
        'Selected Vendor is not valid. Please refresh and select the Vendor again.'
      );

      return false;
    }

    const selectedVendor =
      this.vendorRecords.find(
        vendor =>
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

      window.alert(
        'Selected Vendor is not available. Please refresh the Vendor list.'
      );

      return false;
    }

    if (
      !this.form.exportInvoiceNo.trim()
    ) {

      window.alert(
        'Please enter Export Invoice No.'
      );

      return false;
    }

    if (
      !this.form.invoiceDate
    ) {

      window.alert(
        'Please select Invoice Date.'
      );

      return false;
    }

    if (
      !this.form.from
    ) {

      window.alert(
        'Please select From.'
      );

      return false;
    }

    if (
      this.form.from ===
        'other' &&
      !this.form.fromOther.trim()
    ) {

      window.alert(
        'Please enter source details for Other.'
      );

      return false;
    }

    if (
      !this.form.vendorInvoiceNo.trim()
    ) {

      window.alert(
        'Please enter Vendor Invoice No.'
      );

      return false;
    }

    if (
      !this.form.vendorInvoiceDate
    ) {

      window.alert(
        'Please select Vendor Invoice Date.'
      );

      return false;
    }

    if (
      this.number(
        this.form.totalAmount
      ) <=
      0
    ) {

      window.alert(
        'Total Amount must be greater than zero.'
      );

      return false;
    }

    if (
      this.number(
        this.form.previousAdvance
      ) <
        0 ||
      this.number(
        this.form.paidAmount
      ) <
        0 ||
      this.number(
        this.form.deduction
      ) <
        0
    ) {

      window.alert(
        'Advance, Paid Amount and Deduction cannot be negative.'
      );

      return false;
    }

    if (
      this.form.status ===
        'other' &&
      !this.form.statusOther.trim()
    ) {

      window.alert(
        'Please enter payment status.'
      );

      return false;
    }

    if (
      !this.form.remarks.trim()
    ) {

      window.alert(
        'Please enter Remarks.'
      );

      return false;
    }

    return true;
  }

  /* ============================================================
     BUILD FORM DATA
  ============================================================ */

  private buildFormData():
    FormData {

    const payload = {

      vendorId:
        this.form.vendor,

      exportInvoiceNo:
        this.form.exportInvoiceNo
          .trim(),

      invoiceDate:
        this.form.invoiceDate,

      from:
        this.form.from ===
          'other'

          ? this.form.fromOther
              .trim()

          : this.form.from,

      vendorInvoiceNo:
        this.form.vendorInvoiceNo
          .trim(),

      vendorInvoiceDate:
        this.form.vendorInvoiceDate,

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

          ? this.form.statusOther
              .trim()

          : '',

      currency:
        'INR',

      remarks:
        this.form.remarks
          .trim()
    };

    const formData =
      new FormData();

    Object.entries(
      payload
    )
      .forEach(
        (
          [
            key,
            value
          ]
        ) => {

          if (
            value !==
              null &&
            value !==
              undefined
          ) {

            formData.append(
              key,
              String(
                value
              )
            );
          }
        }
      );

    const paymentProof =
      this.selectedPaymentProof();

    if (
      paymentProof
    ) {

      formData.append(
        'paymentProof',
        paymentProof,
        paymentProof.name
      );
    }

    return formData;
  }

  /* ============================================================
     SAVE
  ============================================================ */

  protected savePayment(): void {

    if (
      !this.validateForm()
    ) {
      return;
    }

    const formData =
      this.buildFormData();

    const editingId =
      this.editingPaymentId();

    this.isSaving.set(
      true
    );

    const request =
      editingId

        ? this.api.patch(
            `/logistics/vendor-payments/${editingId}`,
            formData
          )

        : this.api.post(
            '/logistics/vendor-payments',
            formData
          );

    request
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

          this.resetForm(
            false
          );

          this.loadPayments();

          window.alert(
            editingId
              ? 'Vendor payment updated successfully.'
              : 'Vendor payment saved successfully.'
          );
        },

        error: (
          error: any
        ) => {

          window.alert(
            error?.error?.message ||
            (
              editingId
                ? 'Unable to update vendor payment.'
                : 'Unable to save vendor payment.'
            )
          );
        }
      });
  }

  /* ============================================================
     RESET / NEW ENTRY
  ============================================================ */

  protected resetForm(
    scrollToForm = true
  ): void {

    this.form =
      this.emptyPayment();

    this.editingPaymentId.set(
      null
    );

    this.selectedPaymentProof.set(
      null
    );

    this.paymentProofError.set('');

    this.clearVendorBillSelection();

    this.selectedPayment.set(
      null
    );

    if (
      this.fileInputRef
        ?.nativeElement
    ) {

      this.fileInputRef
        .nativeElement
        .value = '';
    }

    if (
      scrollToForm
    ) {

      window.setTimeout(
        () => {

          this.paymentFormRef
            ?.nativeElement
            .scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
        },
        0
      );
    }
  }

  /* ============================================================
     EDIT

     UI protection mirrors backend ownership enforcement.
  ============================================================ */

  protected editPayment(
    payment: VendorPaymentRow
  ): void {

    if (
      !payment._id
    ) {
      return;
    }

    if (
      !this.canEditPayment(
        payment
      )
    ) {

      if (
        this.isHandedOff(
          payment
        )
      ) {

        window.alert(
          'This Vendor Payment has already been sent to Accounts and cannot be edited from Logistics.'
        );

      } else {

        window.alert(
          `This Vendor Payment was created by ${this.creatorName(
            payment
          )}. You can review it, but you cannot edit another employee's workspace record.`
        );
      }

      return;
    }

    this.form = {
      ...payment
    };

    this.ensureSelectedVendor();

    this.editingPaymentId.set(
      String(
        payment._id
      )
    );

    this.selectedPaymentProof.set(
      null
    );

    this.paymentProofError.set('');

    if (
      this.fileInputRef
        ?.nativeElement
    ) {

      this.fileInputRef
        .nativeElement
        .value = '';
    }

    this.selectedPayment.set(
      null
    );

    window.setTimeout(
      () => {

        this.paymentFormRef
          ?.nativeElement
          .scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
      },
      0
    );
  }

  /* ============================================================
     KEEP HISTORICAL VENDOR VISIBLE
  ============================================================ */

  private ensureSelectedVendor(): void {

    if (
      !this.form._id ||
      !this.form.vendor
    ) {
      return;
    }

    if (
      !this.vendorRecords.some(
        row =>
          row._id ===
          this.form.vendor
      )
    ) {

      this.vendorRecords.push({
        _id:
          this.form.vendor,

        vendorName:
          this.form.vendorOther
      });
    }

    if (
      !this.vendors.some(
        row =>
          row.value ===
          this.form.vendor
      )
    ) {

      this.vendors = [
        {
          value:
            this.form.vendor,

          label:
            this.form.vendorOther ||
            'Vendor'
        },

        ...this.vendors
      ];
    }
  }

  protected cancelEdit(): void {
    this.resetForm(
      false
    );
  }

  /* ============================================================
     VIEW DETAILS

     Read is allowed independently from creator ownership.
  ============================================================ */

  protected viewPayment(
    payment: VendorPaymentRow
  ): void {

    this.clearVendorBillSelection();

    this.selectedPayment.set(
      payment
    );
  }

  protected closePaymentDetail(): void {

    this.selectedPayment.set(
      null
    );

    this.clearVendorBillSelection();
  }

  /* ============================================================
     PAYMENT PROOF VIEW
  ============================================================ */

  protected viewPaymentProof(
    payment: VendorPaymentRow
  ): void {

    if (
      !payment._id ||
      !payment.paymentProof?.url
    ) {

      window.alert(
        'No payment proof available.'
      );

      return;
    }

    this.openDocument(
      `/logistics/vendor-payments/${payment._id}/payment-proof/download`,
      'Unable to open payment proof.'
    );
  }

  /* ============================================================
     PAYMENT PROOF DOWNLOAD
  ============================================================ */

  protected downloadPaymentProof(
    payment: VendorPaymentRow
  ): void {

    if (
      !payment._id ||
      !payment.paymentProof?.url
    ) {

      window.alert(
        'No payment proof available.'
      );

      return;
    }

    this.downloadDocument(
      `/logistics/vendor-payments/${payment._id}/payment-proof/download`,

      payment.paymentProof
        .originalName ||
      'payment-proof',

      'Unable to download payment proof.'
    );
  }

  /* ============================================================
     EXPORT
  ============================================================ */

  protected exportPayments(): void {

    const rows =
      this.filteredPayments();

    if (
      !rows.length
    ) {

      window.alert(
        'No vendor payment records available to export.'
      );

      return;
    }

    const headers = [
      'S.No.',
      'Created By',
      'Employee Code',
      'Vendor',
      'Export Invoice No.',
      'Invoice Date',
      'Source',
      'Vendor Invoice No.',
      'Vendor Invoice Date',
      'Weight KG',
      'Total Amount',
      'Previous Advance',
      'Pending Amount',
      'Logistics Paid',
      'Deduction',
      'Supplier Balance',
      'Logistics Status',
      'Accounts Status',
      'Accounts Paid',
      'Accounts Remaining',
      'Payment Reference',
      'Accounts Payment Date',
      'Processed By',
      'Vendor Bill',
      'Payment Proof',
      'Remarks'
    ];

    const csvRows =
      rows.map(
        (
          payment,
          index
        ) => [
          index + 1,

          this.creatorName(
            payment
          ),

          this.creatorEmployeeCode(
            payment
          ),

          this.resolveVendorName(
            payment
          ),

          payment.exportInvoiceNo,

          payment.invoiceDate,

          this.resolveSourceName(
            payment
          ),

          payment.vendorInvoiceNo,

          payment.vendorInvoiceDate,

          this.number(
            payment.weight
          ),

          this.number(
            payment.totalAmount
          ),

          this.number(
            payment.previousAdvance
          ),

          this.getPendingAmount(
            payment
          ),

          this.number(
            payment.paidAmount
          ),

          this.number(
            payment.deduction
          ),

          this.getSupplierBalance(
            payment
          ),

          this.resolveStatusName(
            payment
          ),

          this.accountsStatusLabel(
            payment.accountsStatus
          ),

          this.number(
            payment.accountsPaidAmount
          ),

          this.number(
            payment.accountsRemainingAmount
          ),

          payment.accountsPaymentReference ||
          '',

          payment.accountsPaymentDate ||
          '',

          payment.accountsPaidByName ||
          '',

          payment.vendorBillDocument
            ?.originalName ||
          '',

          payment.paymentProof
            ?.originalName ||
          '',

          payment.remarks ||
          ''
        ]
      );

    const csv =
      [
        headers,
        ...csvRows
      ]
        .map(
          row =>
            row
              .map(
                value =>
                  this.csvValue(
                    value
                  )
              )
              .join(',')
        )
        .join('\r\n');

    const blob =
      new Blob(
        [
          '\uFEFF',
          csv
        ],
        {
          type:
            'text/csv;charset=utf-8;'
        }
      );

    const objectUrl =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        'a'
      );

    const date =
      new Date()
        .toISOString()
        .slice(
          0,
          10
        );

    link.href =
      objectUrl;

    link.download =
      `vendor-payments-${date}.csv`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(
      objectUrl
    );
  }

  /* ============================================================
     FILTER HELPERS
  ============================================================ */

  protected setSearch(
    value: string
  ): void {

    this.searchTerm.set(
      value
    );
  }

  protected setStatusFilter(
    value: string
  ): void {

    this.statusFilter.set(
      value
    );
  }

  protected clearFilters(): void {

    this.searchTerm.set('');
    this.statusFilter.set(
      'all'
    );
  }

  /* ============================================================
     PAYMENT RESPONSE EXTRACTION
  ============================================================ */

  private extractPaymentRows(
    response: any
  ): any[] {

    if (
      Array.isArray(
        response
      )
    ) {
      return response;
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
    response: any
  ): VendorApiRow[] {

    if (
      Array.isArray(
        response
      )
    ) {
      return response;
    }

    if (
      Array.isArray(
        response?.vendors
      )
    ) {
      return response.vendors;
    }

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
    rows: any[]
  ): VendorPaymentRow[] {

    return rows.map(
      (
        row,
        index
      ) => {

        const source =
          this.normalizeSource(
            row.from
          );

        const createdBy:
          CreatorUser |
          string |
          null =
            this.normalizeCreatorUser(
              row.createdBy
            );

        const createdByEmployeeId:
          CreatorEmployee |
          string |
          null =
            this.normalizeCreatorEmployee(
              row.createdByEmployeeId
            );

        const createdByName =
          this.resolvePersonName(
            createdByEmployeeId
          ) ||
          this.resolvePersonName(
            createdBy
          ) ||
          '';

        const createdByEmployeeCode =
          createdByEmployeeId &&
          typeof createdByEmployeeId ===
            'object'

            ? String(
                createdByEmployeeId
                  .employeeCode ||
                ''
              ).trim()

            : '';

        return {

          _id:
            row._id,

          editHistory:
            Array.isArray(
              row.editHistory
            )
              ? row.editHistory
              : [],

          id:
            row._id ||
            index + 1,

          /* ----------------------------------------------------
             OWNERSHIP
          ---------------------------------------------------- */

          createdBy,

          createdByEmployeeId,

          createdByName,

          createdByEmployeeCode,

          vendor:
            row.vendorId?._id ||
            row.vendorId ||
            '',

          vendorOther:
            row.vendorName ||
            row.vendorId?.vendorName ||
            row.vendorId?.companyName ||
            row.vendor ||
            '',

          exportInvoiceNo:
            row.exportInvoiceNo ||
            row.shipmentNumber ||
            '',

          invoiceDate:
            row.invoiceDate

              ? String(
                  row.invoiceDate
                ).slice(
                  0,
                  10
                )

              : '',

          from:
            source.value,

          fromOther:
            source.other,

          vendorInvoiceNo:
            row.vendorInvoiceNo ||
            '',

          vendorInvoiceDate:
            row.vendorInvoiceDate

              ? String(
                  row.vendorInvoiceDate
                ).slice(
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

          paymentProof:
            row.paymentProof?.url

              ? {
                  url:
                    String(
                      row.paymentProof.url ||
                      ''
                    ),

                  originalName:
                    String(
                      row.paymentProof.originalName ||
                      ''
                    ),

                  mimeType:
                    String(
                      row.paymentProof.mimeType ||
                      ''
                    ),

                  size:
                    this.number(
                      row.paymentProof.size
                    )
                }

              : null,

          vendorBillDocument:
            row.vendorBillDocument?.fileUrl

              ? {
                  fileName:
                    String(
                      row.vendorBillDocument.fileName ||
                      ''
                    ),

                  originalName:
                    String(
                      row.vendorBillDocument.originalName ||
                      ''
                    ),

                  fileUrl:
                    String(
                      row.vendorBillDocument.fileUrl ||
                      ''
                    ),

                  storageKey:
                    String(
                      row.vendorBillDocument.storageKey ||
                      ''
                    ),

                  mimeType:
                    String(
                      row.vendorBillDocument.mimeType ||
                      ''
                    ),

                  fileSize:
                    this.number(
                      row.vendorBillDocument.fileSize
                    ),

                  uploadedBy:
                    row.vendorBillDocument.uploadedBy

                      ? String(
                          row.vendorBillDocument.uploadedBy
                        )

                      : null,

                  uploadedAt:
                    row.vendorBillDocument.uploadedAt

                      ? String(
                          row.vendorBillDocument.uploadedAt
                        )

                      : null
                }

              : null,

          accountsHandoffId:
            row.accountsHandoffId

              ? String(
                  row.accountsHandoffId
                )

              : null,

          accountsStatus:
            this.normalizeAccountsStatus(
              row.accountsStatus
            ),

          accountsHandedOffBy:
            row.accountsHandedOffBy

              ? String(
                  row.accountsHandedOffBy
                )

              : null,

          accountsHandedOffAt:
            row.accountsHandedOffAt

              ? String(
                  row.accountsHandedOffAt
                )

              : null,

          accountsPaidAmount:
            this.number(
              row.accountsPaidAmount
            ),

          accountsRemainingAmount:
            this.number(
              row.accountsRemainingAmount
            ),

          accountsPaymentDate:
            row.accountsPaymentDate

              ? String(
                  row.accountsPaymentDate
                )

              : null,

          accountsPaymentReference:
            String(
              row.accountsPaymentReference ||
              ''
            ),

          accountsPaidByName:
            String(
              row.accountsPaidByName ||
              ''
            ),

          remarks:
            row.remarks ||
            ''
        };
      }
    );
  }

  /* ============================================================
     NORMALIZE CREATOR USER
  ============================================================ */

  private normalizeCreatorUser(
    value: unknown
  ):
    CreatorUser |
    string |
    null {

    if (
      value ===
        null ||
      value ===
        undefined ||
      value ===
        ''
    ) {
      return null;
    }

    if (
      typeof value ===
        'string'
    ) {
      return value;
    }

    if (
      typeof value ===
        'object'
    ) {

      const row =
        value as any;

      return {
        _id:
          row._id
            ? String(
                row._id
              )
            : undefined,

        id:
          row.id
            ? String(
                row.id
              )
            : undefined,

        name:
          row.name,

        displayName:
          row.displayName,

        firstName:
          row.firstName,

        lastName:
          row.lastName,

        email:
          row.email
      };
    }

    return String(
      value
    );
  }

  /* ============================================================
     NORMALIZE CREATOR EMPLOYEE
  ============================================================ */

  private normalizeCreatorEmployee(
    value: unknown
  ):
    CreatorEmployee |
    string |
    null {

    if (
      value ===
        null ||
      value ===
        undefined ||
      value ===
        ''
    ) {
      return null;
    }

    if (
      typeof value ===
        'string'
    ) {
      return value;
    }

    if (
      typeof value ===
        'object'
    ) {

      const row =
        value as any;

      return {
        _id:
          row._id
            ? String(
                row._id
              )
            : undefined,

        id:
          row.id
            ? String(
                row.id
              )
            : undefined,

        employeeCode:
          row.employeeCode,

        firstName:
          row.firstName,

        lastName:
          row.lastName,

        name:
          row.name,

        displayName:
          row.displayName,

        designation:
          row.designation,

        organizationRole:
          row.organizationRole
      };
    }

    return String(
      value
    );
  }

  /* ============================================================
     VENDOR NAME
  ============================================================ */

  protected resolveVendorName(
    payment: VendorPaymentRow
  ): string {

    const option =
      this.vendors.find(
        vendor =>
          vendor.value ===
          payment.vendor
      );

    if (
      option?.label
    ) {
      return option.label;
    }

    if (
      payment.vendorOther
    ) {
      return payment.vendorOther;
    }

    if (
      this.isMongoObjectId(
        payment.vendor
      )
    ) {
      return 'Vendor';
    }

    return payment.vendor ||
      '-';
  }

  /* ============================================================
     SOURCE
  ============================================================ */

  protected resolveSourceName(
    payment: VendorPaymentRow
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
        option =>
          option.value ===
          payment.from
      )?.label ||
      payment.from ||
      '-'
    );
  }

  /* ============================================================
     STATUS
  ============================================================ */

  protected resolveStatusName(
    payment: VendorPaymentRow
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
        option =>
          option.value ===
          payment.status
      )?.label ||
      payment.status ||
      '-'
    );
  }

  protected statusClass(
    status: string
  ): string {

    return String(
      status ||
      ''
    )
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

  /* ============================================================
     ACCOUNTS STATUS
  ============================================================ */

  protected accountsStatusLabel(
    status:
      AccountsStatus |
      undefined
  ): string {

    switch (
      status
    ) {

      case 'sent':
        return 'Sent to Accounts';

      case 'under_review':
        return 'Under Review';

      case 'verified':
        return 'Verified';

      case 'rejected':
        return 'Rejected';

      case 'partially_paid':
        return 'Partially Paid';

      case 'paid':
        return 'Paid';

      default:
        return 'Not Sent';
    }
  }

  protected accountsStatusDescription(
    payment: VendorPaymentRow
  ): string {

    switch (
      payment.accountsStatus
    ) {

      case 'sent':
        return 'The payable has reached Accounts and is waiting for review.';

      case 'under_review':
        return 'Accounts is currently reviewing this vendor payable.';

      case 'verified':
        return 'Accounts has verified this payable.';

      case 'rejected':
        return 'Accounts rejected this payable.';

      case 'partially_paid':
        return 'Accounts has recorded a partial payment.';

      case 'paid':
        return 'Accounts has fully settled this vendor payable.';

      default:
        return 'This payable has not yet been sent to Accounts.';
    }
  }

  protected accountsStatusClass(
    status:
      AccountsStatus |
      undefined
  ): string {

    return String(
      status ||
      'not-sent'
    )
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

  /* ============================================================
     CURRENCY
  ============================================================ */

  protected formatCurrency(
    value: number
  ): string {

    return new Intl.NumberFormat(
      'en-IN',
      {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
      }
    ).format(
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
      string |
      null |
      undefined
  ): string {

    if (
      !date
    ) {
      return '-';
    }

    const value =
      String(
        date
      );

    const parsed =
      /^\d{4}-\d{2}-\d{2}$/
        .test(
          value
        )

          ? new Date(
              `${value}T00:00:00`
            )

          : new Date(
              value
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
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }
    ).format(
      parsed
    );
  }

  protected formatDateTime(
    date:
      string |
      null |
      undefined
  ): string {

    if (
      !date
    ) {
      return '-';
    }

    const parsed =
      new Date(
        date
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
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    ).format(
      parsed
    );
  }

  /* ============================================================
     FILE SIZE
  ============================================================ */

  protected fileSizeLabel(
    bytes:
      number |
      null |
      undefined
  ): string {

    const size =
      this.number(
        bytes
      );

    if (
      size <=
      0
    ) {
      return '-';
    }

    if (
      size <
      1024
    ) {

      return `${Math.round(
        size
      )} B`;
    }

    if (
      size <
      1024 *
      1024
    ) {

      return `${(
        size /
        1024
      ).toFixed(
        1
      )} KB`;
    }

    return `${(
      size /
      (
        1024 *
        1024
      )
    ).toFixed(
      2
    )} MB`;
  }

  protected vendorBillFileName(
    payment: VendorPaymentRow
  ): string {

    return (
      payment.vendorBillDocument
        ?.originalName ||
      payment.vendorBillDocument
        ?.fileName ||
      'Vendor Bill'
    );
  }

  protected paymentProofFileName(
    payment: VendorPaymentRow
  ): string {

    return (
      payment.paymentProof
        ?.originalName ||
      'Payment Proof'
    );
  }

  /* ============================================================
     EMPTY PAYMENT
  ============================================================ */

  private emptyPayment():
    VendorPaymentRow {

    return {
      id: 0,

      createdBy: null,
      createdByEmployeeId: null,

      createdByName: '',
      createdByEmployeeCode: '',

      vendor: '',
      vendorOther: '',

      exportInvoiceNo: '',
      invoiceDate: '',

      from: '',
      fromOther: '',

      vendorInvoiceNo: '',
      vendorInvoiceDate: '',

      weight: 0,

      totalAmount: 0,

      previousAdvance: 0,
      paidAmount: 0,
      deduction: 0,

      status: 'pending',
      statusOther: '',

      paymentProof: null,

      vendorBillDocument: null,

      accountsHandoffId: null,

      accountsStatus: null,

      accountsHandedOffBy: null,
      accountsHandedOffAt: null,

      accountsPaidAmount: 0,
      accountsRemainingAmount: 0,

      accountsPaymentDate: null,
      accountsPaymentReference: '',
      accountsPaidByName: '',

      remarks: ''
    };
  }

  /* ============================================================
     VENDOR LABEL
  ============================================================ */

  private vendorLabel(
    vendor: VendorApiRow
  ): string {

    const name =
      vendor.vendorName ||
      vendor.companyName ||
      'Vendor';

    const code =
      String(
        vendor.vendorCode ||
        ''
      ).trim();

    return code
      ? `${name} (${code})`
      : name;
  }

  /* ============================================================
     CUSTOM SOURCE NORMALIZATION
  ============================================================ */

  private normalizeSource(
    value: unknown
  ): {
    value: string;
    other: string;
  } {

    const source =
      String(
        value ||
        ''
      ).trim();

    if (
      !source
    ) {

      return {
        value: '',
        other: ''
      };
    }

    const known =
      this.sourceOptions.some(
        option =>
          option.value ===
          source
      );

    if (
      known
    ) {

      return {
        value:
          source,

        other:
          ''
      };
    }

    return {
      value:
        'other',

      other:
        source
    };
  }

  /* ============================================================
     CLEAR VENDOR BILL
  ============================================================ */

  private clearVendorBillSelection():
    void {

    this.selectedVendorBill.set(
      null
    );

    this.vendorBillError.set('');

    if (
      this.vendorBillInputRef
        ?.nativeElement
    ) {

      this.vendorBillInputRef
        .nativeElement
        .value = '';
    }
  }

  /* ============================================================
     EDIT HANDOFF CHECK
  ============================================================ */

  private isEditingHandedOffRecord():
    boolean {

    const id =
      this.editingPaymentId();

    if (
      !id
    ) {
      return false;
    }

    const payment =
      this.payments()
        .find(
          row =>
            String(
              row._id ||
              ''
            ) ===
            String(
              id
            )
        );

    return payment
      ? this.isHandedOff(
          payment
        )
      : false;
  }

  /* ============================================================
     ENTITY ID

     Supports:
     - raw string ObjectId
     - {_id}
     - {id}
  ============================================================ */

  private entityId(
    value: unknown
  ): string {

    if (
      value ===
        null ||
      value ===
        undefined
    ) {

      return '';
    }

    if (
      typeof value ===
        'string'
    ) {

      return value.trim();
    }

    if (
      typeof value ===
        'object'
    ) {

      const row =
        value as any;

      return String(
        row._id ||
        row.id ||
        ''
      ).trim();
    }

    return String(
      value
    ).trim();
  }

  /* ============================================================
     PERSON NAME
  ============================================================ */

  private resolvePersonName(
    value: unknown
  ): string {

    if (
      !value ||
      typeof value !==
        'object'
    ) {

      return '';
    }

    const row =
      value as any;

    const firstName =
      String(
        row.firstName ||
        ''
      ).trim();

    const lastName =
      String(
        row.lastName ||
        ''
      ).trim();

    const fullName =
      [
        firstName,
        lastName
      ]
        .filter(
          Boolean
        )
        .join(
          ' '
        )
        .trim();

    return String(
      row.displayName ||
      row.name ||
      fullName ||
      row.email ||
      ''
    ).trim();
  }

  /* ============================================================
     DOCUMENT VALIDATION
  ============================================================ */

  private isAllowedDocument(
    file: File
  ): boolean {

    const extension =
      file.name
        .toLowerCase()
        .split('.')
        .pop();

    const allowedExtensions = [
      'jpg',
      'jpeg',
      'png',
      'pdf'
    ];

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'application/pdf'
    ];

    return Boolean(
      extension &&
      allowedExtensions.includes(
        extension
      ) &&
      allowedMimeTypes.includes(
        file.type
      )
    );
  }

  /* ============================================================
     OPEN DOCUMENT
  ============================================================ */

  private openDocument(
    endpoint: string,
    errorMessage: string
  ): void {

    const previewWindow =
      window.open(
        '',
        '_blank'
      );

    this.api
      .getBlob(
        endpoint
      )
      .subscribe({

        next: blob => {

          const objectUrl =
            URL.createObjectURL(
              blob
            );

          if (
            previewWindow
          ) {

            previewWindow.location.href =
              objectUrl;

          } else {

            window.open(
              objectUrl,
              '_blank'
            );
          }

          window.setTimeout(
            () =>
              URL.revokeObjectURL(
                objectUrl
              ),
            60000
          );
        },

        error: () => {

          previewWindow?.close();

          window.alert(
            errorMessage
          );
        }
      });
  }

  /* ============================================================
     DOWNLOAD DOCUMENT
  ============================================================ */

  private downloadDocument(
    endpoint: string,
    fileName: string,
    errorMessage: string
  ): void {

    this.api
      .getBlob(
        endpoint
      )
      .subscribe({

        next: blob => {

          const objectUrl =
            URL.createObjectURL(
              blob
            );

          const link =
            document.createElement(
              'a'
            );

          link.href =
            objectUrl;

          link.download =
            fileName;

          document.body.appendChild(
            link
          );

          link.click();

          document.body.removeChild(
            link
          );

          URL.revokeObjectURL(
            objectUrl
          );
        },

        error: () => {

          window.alert(
            errorMessage
          );
        }
      });
  }

  /* ============================================================
     ACCOUNTS STATUS NORMALIZATION
  ============================================================ */

  private normalizeAccountsStatus(
    value: unknown
  ): AccountsStatus {

    const status =
      String(
        value ||
        ''
      )
        .trim()
        .toLowerCase();

    const allowed = [
      'sent',
      'under_review',
      'verified',
      'rejected',
      'partially_paid',
      'paid'
    ];

    return allowed.includes(
      status
    )
      ? status as AccountsStatus
      : null;
  }

  /* ============================================================
     ROLE NORMALIZATION
  ============================================================ */

  private normalizeRole(
    value: unknown
  ): string {

    return String(
      value ||
      ''
    )
      .trim()
      .toLowerCase()
      .replace(
        /[\s-]+/g,
        '_'
      );
  }

  /* ============================================================
     CSV VALUE
  ============================================================ */

  private csvValue(
    value: unknown
  ): string {

    const text =
      String(
        value ??
        ''
      );

    return `"${text.replace(
      /"/g,
      '""'
    )}"`;
  }

  /* ============================================================
     OBJECT ID
  ============================================================ */

  private isMongoObjectId(
    value: unknown
  ): boolean {

    return /^[a-f\d]{24}$/i
      .test(
        String(
          value ||
          ''
        ).trim()
      );
  }

  /* ============================================================
     NUMBER
  ============================================================ */

  private number(
    value: unknown
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