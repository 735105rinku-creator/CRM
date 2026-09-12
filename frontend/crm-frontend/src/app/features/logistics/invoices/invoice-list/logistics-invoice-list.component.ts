import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { ApiService } from '../../../../core/services/api.service';


/* ============================================================
   CREATOR REFERENCES
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
   EDIT AUDIT
============================================================ */

interface EditAuditEntry {
  changedBy?: string | CreatorUser | null;
  changedByName?: string;
  changedAt?: string;
}


/* ============================================================
   INVOICE COPY
============================================================ */

interface InvoiceCopy {
  fileName?: string;
  originalName?: string;
  fileUrl?: string;

  /*
   * Current backend uses filePath.
   * storageKey is retained for compatibility with older/
   * alternate document metadata.
   */
  filePath?: string;
  storageKey?: string;

  mimeType?: string;
  fileSize?: number;

  uploadedBy?:
    | string
    | CreatorUser
    | null;

  uploadedAt?: string | null;
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
   INVOICE ROW
============================================================ */

interface InvoiceRow {

  _id?: string;

  invoiceNumber?: string;

  customerName?: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;

  shipmentNumber?: string;

  invoiceDate?: string;
  dueDate?: string;

  invoiceType?: string;
  currency?: string;

  invoiceTotal?: number;

  /*
   * Existing Logistics payment values.
   */
  amountReceived?: number;
  balanceDue?: number;

  paymentStatus?: string;

  paymentMode?: string;
  paymentReference?: string;
  paymentDate?: string;

  invoiceCopy?: InvoiceCopy | null;

  status?: string;


  /* ==========================================================
     CREATOR / OWNERSHIP
  ========================================================== */

  createdBy?:
    | string
    | CreatorUser
    | null;

  createdByEmployeeId?:
    | string
    | CreatorEmployee
    | null;

  createdByName?: string;
  createdByEmployeeCode?: string;

  editHistory?: EditAuditEntry[];


  /* ==========================================================
     ACCOUNTS HANDOFF
  ========================================================== */

  accountsHandoffId?: string | null;

  accountsStatus?: AccountsStatus;

  accountsHandedOffBy?: string | null;
  accountsHandedOffAt?: string | null;

  accountsPaidAmount?: number;
  accountsRemainingAmount?: number;

  accountsPaymentDate?: string | null;
  accountsPaymentReference?: string;
  accountsPaidByName?: string;

  createdAt?: string;
}


/* ============================================================
   PAGE RESPONSE
============================================================ */

interface PageResult<T> {
  data?: T[];

  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}


/* ============================================================
   SUMMARY
============================================================ */

interface InvoiceSummary {
  totalInvoices?: number;

  totalBilled?: number;
  totalReceived?: number;
  totalOutstanding?: number;

  draft?: number;
  issued?: number;
}


/* ============================================================
   COMPONENT
============================================================ */

@Component({
  selector: 'app-logistics-invoice-list',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl:
    './logistics-invoice-list.component.html',

  styleUrl:
    './logistics-invoice-list.component.scss'
})
export class LogisticsInvoiceListComponent implements OnInit {

  private readonly api =
    inject(ApiService);

  private readonly router =
    inject(Router);

  private readonly auth =
    inject(AuthService);


  /* ============================================================
     DATA
  ============================================================ */

  protected readonly invoices =
    signal<InvoiceRow[]>([]);

  protected readonly summary =
    signal<InvoiceSummary>({});


  /* ============================================================
     LOADING / MESSAGE
  ============================================================ */

  protected readonly isLoading =
    signal(false);

  protected readonly message =
    signal('');

  protected readonly errorMessage =
    signal('');


  /* ============================================================
     CURRENT LOGISTICS EMPLOYEE / USER
  ============================================================ */

  protected readonly currentEmployeeId =
    signal('');

  protected readonly currentUserId =
    signal('');

  protected readonly currentEmployeeName =
    signal('');

  protected readonly currentEmployeeCode =
    signal('');

  protected readonly currentOrganizationRole =
    signal('');

  protected readonly logisticsAccessResolved =
    signal(false);


  /* ============================================================
     ACCOUNTS HANDOFF
  ============================================================ */

  protected readonly canHandoffToAccounts =
    signal(false);

  protected readonly handingOffInvoiceId =
    signal<string | null>(null);


  /* ============================================================
     FILTERS
  ============================================================ */

  protected readonly searchTerm =
    signal('');

  protected readonly statusFilter =
    signal('');

  protected readonly paymentFilter =
    signal('');


  /* ============================================================
     PAGINATION
  ============================================================ */

  protected readonly currentPage =
    signal(1);

  protected readonly pageSize =
    signal(10);

  protected readonly totalRecords =
    signal(0);

  protected readonly serverTotalPages =
    signal(1);


  /* ============================================================
     FILTERED INVOICES
  ============================================================ */

  protected readonly filteredInvoices =
    computed(
      () => this.invoices()
    );


  /* ============================================================
     ACCOUNTS SUMMARY
  ============================================================ */

  protected readonly accountsSummary =
    computed(() => {

      const rows =
        this.invoices();

      const handedOff =
        rows.filter(
          invoice =>
            this.isHandedOff(
              invoice
            )
        );

      const accountsPaid =
        handedOff.reduce(
          (
            sum,
            invoice
          ) =>
            sum +
            this.number(
              invoice.accountsPaidAmount
            ),
          0
        );

      const accountsRemaining =
        handedOff.reduce(
          (
            sum,
            invoice
          ) =>
            sum +
            this.number(
              invoice.accountsRemainingAmount
            ),
          0
        );

      return {
        handedOffCount:
          handedOff.length,

        accountsPaid,

        accountsRemaining
      };
    });


  /* ============================================================
     INIT
  ============================================================ */

  ngOnInit(): void {

    /*
     * Backend is the final authority for workspace visibility.
     *
     * We load invoices immediately, then resolve frontend
     * ownership/senior context for action visibility.
     */

    this.resolveLogisticsAccess();

    this.loadSummary();

    this.loadInvoices();
  }


  /* ============================================================
     RESOLVE LOGISTICS EMPLOYEE ACCESS

     Uses the same employee dashboard endpoint already used by
     the Logistics/Vendor Payment flow.

     Important:
     Backend remains final authority.

     This information is only used for:
     - own-vs-review labels
     - edit button visibility
     - handoff button visibility
     - creator presentation
  ============================================================ */

  private resolveLogisticsAccess(): void {

    const authUser: any =
      this.auth.currentUser();


    /*
     * Safe User fallback while employee dashboard loads.
     */
    this.currentUserId.set(
      this.idValue(
        authUser?._id ||
        authUser?.id
      )
    );


    this.api
      .get<any>(
        '/hr/employees/dashboard'
      )
      .subscribe({

        next: response => {

          const employee =
            response?.employee ||
            response?.data?.employee ||
            null;


          const responseUser =
            response?.user ||
            response?.data?.user ||
            null;


          const employeeId =
            this.idValue(
              employee?._id ||
              employee?.id
            );


          const userId =
            this.idValue(
              responseUser?.id ||
              responseUser?._id ||
              authUser?.id ||
              authUser?._id
            );


          const organizationRole =
            this.normalizeRole(
              employee?.organizationRole ||
              employee?.organization_role ||
              responseUser?.organizationRole ||
              responseUser?.organization_role ||
              authUser?.organizationRole ||
              authUser?.organization_role
            );


          const employeeName =
            this.personName(
              employee
            ) ||
            this.personName(
              responseUser
            ) ||
            this.personName(
              authUser
            );


          this.currentEmployeeId.set(
            employeeId
          );

          this.currentUserId.set(
            userId
          );

          this.currentEmployeeName.set(
            employeeName
          );

          this.currentEmployeeCode.set(
            String(
              employee?.employeeCode ||
              ''
            ).trim()
          );

          this.currentOrganizationRole.set(
            organizationRole
          );


          this.canHandoffToAccounts.set(
            organizationRole ===
              'department_head' ||
            organizationRole ===
              'team_leader'
          );


          this.logisticsAccessResolved.set(
            true
          );
        },


        error: () => {

          /*
           * Do not grant senior rights from a failed employee
           * context request.
           *
           * Backend will still correctly authorize everything.
           */

          this.canHandoffToAccounts.set(
            false
          );

          this.logisticsAccessResolved.set(
            true
          );
        }
      });
  }


  /* ============================================================
     LOAD INVOICES
  ============================================================ */

  protected loadInvoices(): void {

    this.isLoading.set(
      true
    );

    this.errorMessage.set(
      ''
    );


    this.api
      .get<PageResult<InvoiceRow>>(
        '/logistics/invoices',
        {
          page:
            this.currentPage(),

          limit:
            this.pageSize(),

          search:
            this.searchTerm()
              .trim(),

          status:
            this.statusFilter(),

          paymentStatus:
            this.paymentFilter(),

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

        next: response => {

          const rows =
            response?.data ||
            [];


          const pagination =
            response?.pagination ||
            {};


          this.invoices.set(
            rows.map(
              row =>
                this.normalizeInvoice(
                  row
                )
            )
          );


          this.totalRecords.set(
            Number(
              pagination.total ??
              rows.length
            )
          );


          this.serverTotalPages.set(
            Math.max(
              1,
              Number(
                pagination.totalPages ||
                1
              )
            )
          );
        },


        error: error => {

          this.invoices.set(
            []
          );

          this.totalRecords.set(
            0
          );


          this.errorMessage.set(
            error?.error?.message ||
            error?.error?.errors?.[0]?.message ||
            'Unable to load logistics invoices.'
          );
        }
      });
  }


  /* ============================================================
     LOAD SUMMARY

     Backend automatically returns:
     Junior -> own summary
     Senior -> department summary
  ============================================================ */

  protected loadSummary(): void {

    this.api
      .get<InvoiceSummary>(
        '/logistics/invoices/summary'
      )
      .subscribe({

        next: response =>
          this.summary.set(
            response ||
            {}
          ),

        error: () =>
          this.summary.set(
            {}
          )
      });
  }


  /* ============================================================
     FILTERS
  ============================================================ */

  protected applyFilters(): void {

    this.currentPage.set(
      1
    );

    this.loadInvoices();
  }


  protected clearFilters(): void {

    this.searchTerm.set(
      ''
    );

    this.statusFilter.set(
      ''
    );

    this.paymentFilter.set(
      ''
    );

    this.currentPage.set(
      1
    );

    this.loadInvoices();
  }


  /* ============================================================
     PAGINATION
  ============================================================ */

  protected nextPage(): void {

    if (
      this.currentPage() >=
      this.serverTotalPages()
    ) {

      return;
    }


    this.currentPage.update(
      page =>
        page +
        1
    );


    this.loadInvoices();
  }


  protected previousPage(): void {

    if (
      this.currentPage() <=
      1
    ) {

      return;
    }


    this.currentPage.update(
      page =>
        page -
        1
    );


    this.loadInvoices();
  }


  /* ============================================================
     NEW INVOICE
  ============================================================ */

  protected newInvoice(): void {

    void this.router.navigate(
      [
        '/logistics/invoices/new'
      ]
    );
  }


  /* ============================================================
     CREATOR NAME
  ============================================================ */

  protected creatorName(
    invoice: InvoiceRow
  ): string {

    const employee =
      this.objectValue<CreatorEmployee>(
        invoice.createdByEmployeeId
      );


    const user =
      this.objectValue<CreatorUser>(
        invoice.createdBy
      );


    return (
      this.personName(
        employee
      ) ||
      String(
        invoice.createdByName ||
        ''
      ).trim() ||
      this.personName(
        user
      ) ||
      'Unknown'
    );
  }


  /* ============================================================
     CREATOR EMPLOYEE CODE
  ============================================================ */

  protected creatorEmployeeCode(
    invoice: InvoiceRow
  ): string {

    const employee =
      this.objectValue<CreatorEmployee>(
        invoice.createdByEmployeeId
      );


    return String(
      employee?.employeeCode ||
      invoice.createdByEmployeeCode ||
      ''
    ).trim();
  }


  /* ============================================================
     CREATOR DESIGNATION
  ============================================================ */

  protected creatorDesignation(
    invoice: InvoiceRow
  ): string {

    const employee =
      this.objectValue<CreatorEmployee>(
        invoice.createdByEmployeeId
      );


    return String(
      employee?.designation ||
      ''
    ).trim();
  }


  /* ============================================================
     IS OWN INVOICE

     Employee ownership is authoritative whenever
     createdByEmployeeId exists.

     createdBy is only a legacy fallback.
  ============================================================ */

  protected isOwnInvoice(
    invoice: InvoiceRow
  ): boolean {

    const recordEmployeeId =
      this.idValue(
        invoice.createdByEmployeeId
      );


    const currentEmployeeId =
      this.currentEmployeeId();


    if (
      recordEmployeeId
    ) {

      return Boolean(
        currentEmployeeId &&
        currentEmployeeId ===
          recordEmployeeId
      );
    }


    const recordUserId =
      this.idValue(
        invoice.createdBy
      );


    const currentUserId =
      this.currentUserId();


    return Boolean(
      recordUserId &&
      currentUserId &&
      recordUserId ===
        currentUserId
    );
  }


  /* ============================================================
     RECORD ACCESS LABEL
  ============================================================ */

  protected recordAccessLabel(
    invoice: InvoiceRow
  ): string {

    if (
      this.isHandedOff(
        invoice
      )
    ) {

      return 'Accounts controlled • Read only';
    }


    if (
      this.isOwnInvoice(
        invoice
      )
    ) {

      return 'Your Invoice';
    }


    if (
      this.canHandoffToAccounts()
    ) {

      return 'Department record • Review only';
    }


    return 'Read only';
  }


  /* ============================================================
     CAN EDIT

     Only creator can edit before Accounts handoff.
  ============================================================ */

  protected canEditInvoice(
    invoice: InvoiceRow
  ): boolean {

    return Boolean(
      invoice._id &&
      !this.isHandedOff(
        invoice
      ) &&
      this.isOwnInvoice(
        invoice
      )
    );
  }


  /* ============================================================
     EDIT INVOICE
  ============================================================ */

  protected editInvoice(
    invoice: InvoiceRow
  ): void {

    this.clearMessages();


    if (
      !invoice._id
    ) {

      return;
    }


    if (
      this.isHandedOff(
        invoice
      )
    ) {

      const text =
        'This invoice has already been sent to Accounts and cannot be edited from Logistics.';


      this.errorMessage.set(
        text
      );


      window.alert(
        text
      );

      return;
    }


    if (
      !this.isOwnInvoice(
        invoice
      )
    ) {

      const text =
        `This invoice was created by ${this.creatorName(
          invoice
        )}. You can review it, but only the creator can edit it.`;


      this.errorMessage.set(
        text
      );


      window.alert(
        text
      );

      return;
    }


    void this.router.navigate(
      [
        '/logistics/invoices/new'
      ],
      {
        queryParams: {
          invoiceId:
            invoice._id
        },

        info: {
          invoice,

          editContext:
            JSON.stringify(
              this.auth.currentUser()
            )
        }
      }
    );
  }


  /* ============================================================
     VIEW INVOICE
  ============================================================ */

  protected viewInvoice(
    invoice: InvoiceRow
  ): void {

    const creatorCode =
      this.creatorEmployeeCode(
        invoice
      );


    const creatorDesignation =
      this.creatorDesignation(
        invoice
      );


    const lines = [

      `Invoice: ${invoice.invoiceNumber || '-'}`,

      `Customer: ${invoice.customerName || '-'}`,

      `Shipment: ${invoice.shipmentNumber || '-'}`,

      `Created By: ${this.creatorName(invoice)}`,

      `Employee Code: ${creatorCode || '-'}`,

      `Designation: ${creatorDesignation || '-'}`,

      `Workspace: ${this.recordAccessLabel(invoice)}`,

      `Date: ${this.formatDate(invoice.invoiceDate)}`,

      `Total: ${this.formatCurrency(
        invoice.invoiceTotal,
        invoice.currency
      )}`,

      `Received: ${this.formatCurrency(
        invoice.amountReceived,
        invoice.currency
      )}`,

      `Balance: ${this.formatCurrency(
        this.getDisplayBalance(
          invoice
        ),
        invoice.currency
      )}`,

      `Status: ${this.label(
        invoice.status
      )}`,

      `Payment: ${this.label(
        invoice.paymentStatus
      )}`
    ];


    if (
      this.isHandedOff(
        invoice
      )
    ) {

      lines.push(

        '',

        '--- Accounts ---',

        `Accounts Status: ${this.accountsStatusLabel(
          invoice.accountsStatus
        )}`,

        `Sent At: ${this.formatDateTime(
          invoice.accountsHandedOffAt
        )}`,

        `Accounts Paid: ${this.formatCurrency(
          invoice.accountsPaidAmount,
          invoice.currency
        )}`,

        `Accounts Remaining: ${this.formatCurrency(
          invoice.accountsRemainingAmount,
          invoice.currency
        )}`,

        `Payment Reference: ${invoice.accountsPaymentReference || '-'}`,

        `Payment Date: ${this.formatDate(
          invoice.accountsPaymentDate ||
          undefined
        )}`,

        `Processed By: ${invoice.accountsPaidByName || '-'}`
      );
    }


    if (
      invoice.editHistory?.length
    ) {

      const lastEdit =
        invoice.editHistory[
          invoice.editHistory.length -
          1
        ];


      lines.push(

        '',

        '--- Last Edit ---',

        `Edited By: ${lastEdit.changedByName || '-'}`,

        `Edited At: ${this.formatDateTime(
          lastEdit.changedAt
        )}`
      );
    }


    window.alert(
      lines.join(
        '\n'
      )
    );
  }


  /* ============================================================
     SEND TO ACCOUNTS

     Ownership is intentionally NOT required.

     Senior can handoff an eligible junior-created invoice.
  ============================================================ */

  protected handoffToAccounts(
    invoice: InvoiceRow
  ): void {

    this.clearMessages();


    if (
      !invoice._id
    ) {

      this.errorMessage.set(
        'Invoice record is missing.'
      );

      return;
    }


    if (
      this.isHandedOff(
        invoice
      )
    ) {

      this.errorMessage.set(
        'This invoice has already been sent to Accounts.'
      );

      return;
    }


    if (
      !this.canHandoffToAccounts()
    ) {

      this.errorMessage.set(
        'Only the Logistics Department Head or Team Leader can send invoices to Accounts.'
      );

      return;
    }


    const status =
      String(
        invoice.status ||
        ''
      )
        .trim()
        .toLowerCase();


    if (
      status ===
      'cancelled'
    ) {

      this.errorMessage.set(
        'Cancelled invoices cannot be sent to Accounts.'
      );

      return;
    }


    if (
      status !==
      'issued'
    ) {

      this.errorMessage.set(
        'Only issued invoices can be sent to Accounts.'
      );

      return;
    }


    const balance =
      this.number(
        invoice.balanceDue
      );


    if (
      balance <=
      0
    ) {

      this.errorMessage.set(
        'This invoice has no outstanding amount to send to Accounts.'
      );

      return;
    }


    if (
      !invoice.invoiceCopy?.fileUrl
    ) {

      this.errorMessage.set(
        'The invoice creator must attach the Invoice Copy before this invoice can be sent to Accounts.'
      );

      return;
    }


    const creator =
      this.creatorName(
        invoice
      );


    const confirmed =
      window.confirm(
        `Send invoice ${invoice.invoiceNumber || ''} to Accounts?\n\n` +
        `Created By: ${creator}\n` +
        `Outstanding: ${this.formatCurrency(
          balance,
          invoice.currency
        )}\n\n` +
        'After handoff, Logistics financial editing will be locked.'
      );


    if (
      !confirmed
    ) {

      return;
    }


    const id =
      String(
        invoice._id
      );


    this.handingOffInvoiceId.set(
      id
    );


    this.api
      .post<any>(
        `/logistics/invoices/${id}/handoff`,
        {}
      )
      .pipe(
        finalize(
          () =>
            this.handingOffInvoiceId.set(
              null
            )
        )
      )
      .subscribe({

        next: () => {

          this.message.set(
            'Invoice sent to Accounts successfully.'
          );


          this.loadInvoices();

          this.loadSummary();
        },


        error: error => {

          this.errorMessage.set(
            error?.error?.message ||
            error?.error?.errors?.[0]?.message ||
            'Unable to send invoice to Accounts.'
          );
        }
      });
  }


  /* ============================================================
     CAN SEND TO ACCOUNTS

     Senior-only.

     No ownership restriction here by design.
  ============================================================ */

  protected canSendToAccounts(
    invoice: InvoiceRow
  ): boolean {

    const status =
      String(
        invoice.status ||
        ''
      )
        .trim()
        .toLowerCase();


    return Boolean(

      this.canHandoffToAccounts() &&

      invoice._id &&

      !this.isHandedOff(
        invoice
      ) &&

      status ===
        'issued' &&

      this.number(
        invoice.balanceDue
      ) >
        0 &&

      invoice.invoiceCopy?.fileUrl
    );
  }


  /* ============================================================
     HANDOFF BUTTON LABEL
  ============================================================ */

  protected handoffButtonLabel(
    invoice: InvoiceRow
  ): string {

    if (
      invoice._id &&
      this.handingOffInvoiceId() ===
        String(
          invoice._id
        )
    ) {

      return 'Sending...';
    }


    if (
      this.isHandedOff(
        invoice
      )
    ) {

      return 'Sent to Accounts';
    }


    return 'Send to Accounts';
  }


  /* ============================================================
     HANDED OFF
  ============================================================ */

  protected isHandedOff(
    invoice: InvoiceRow
  ): boolean {

    return Boolean(
      this.idValue(
        invoice.accountsHandoffId
      )
    );
  }


  /* ============================================================
     DISPLAY BALANCE
  ============================================================ */

  protected getDisplayBalance(
    invoice: InvoiceRow
  ): number {

    if (
      this.isHandedOff(
        invoice
      )
    ) {

      return this.number(
        invoice.accountsRemainingAmount
      );
    }


    return this.number(
      invoice.balanceDue
    );
  }


  /* ============================================================
     ACCOUNTS PAID
  ============================================================ */

  protected getAccountsPaidAmount(
    invoice: InvoiceRow
  ): number {

    return this.number(
      invoice.accountsPaidAmount
    );
  }


  /* ============================================================
     ACCOUNTS STATUS LABEL
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


  /* ============================================================
     ACCOUNTS STATUS CLASS
  ============================================================ */

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
     INVOICE COPY
  ============================================================ */

  protected invoiceCopyName(
    invoice: InvoiceRow
  ): string {

    return (
      invoice.invoiceCopy
        ?.originalName ||

      invoice.invoiceCopy
        ?.fileName ||

      'Invoice Copy'
    );
  }


  protected viewInvoiceCopy(
    invoice: InvoiceRow
  ): void {

    this.clearMessages();


    if (
      !invoice._id ||
      !invoice.invoiceCopy?.fileUrl
    ) {

      this.errorMessage.set(
        'Invoice Copy is not available.'
      );

      return;
    }


    const previewWindow =
      window.open(
        '',
        '_blank'
      );


    this.api
      .getBlob(
        `/logistics/invoices/${invoice._id}/invoice-copy/download`
      )
      .subscribe({

        next: blob => {

          const url =
            URL.createObjectURL(
              blob
            );


          if (
            previewWindow
          ) {

            previewWindow.location.href =
              url;

          } else {

            window.open(
              url,
              '_blank'
            );
          }


          window.setTimeout(
            () =>
              URL.revokeObjectURL(
                url
              ),
            60000
          );
        },


        error: error => {

          previewWindow?.close();


          this.errorMessage.set(
            error?.error?.message ||
            'Unable to open Invoice Copy.'
          );
        }
      });
  }


  protected downloadInvoiceCopy(
    invoice: InvoiceRow
  ): void {

    this.clearMessages();


    if (
      !invoice._id ||
      !invoice.invoiceCopy?.fileUrl
    ) {

      this.errorMessage.set(
        'Invoice Copy is not available.'
      );

      return;
    }


    this.api
      .getBlob(
        `/logistics/invoices/${invoice._id}/invoice-copy/download`
      )
      .subscribe({

        next: blob => {

          const url =
            URL.createObjectURL(
              blob
            );


          const anchor =
            document.createElement(
              'a'
            );


          anchor.href =
            url;


          anchor.download =
            this.invoiceCopyName(
              invoice
            );


          document.body.appendChild(
            anchor
          );


          anchor.click();

          anchor.remove();


          URL.revokeObjectURL(
            url
          );
        },


        error: () => {

          this.errorMessage.set(
            'Unable to download Invoice Copy.'
          );
        }
      });
  }


  /* ============================================================
     EXPORT

     Includes creator ownership + Accounts details.
  ============================================================ */

  protected exportInvoices(): void {

    this.clearMessages();


    const rows =
      this.invoices();


    if (
      !rows.length
    ) {

      this.errorMessage.set(
        'There are no invoices to export.'
      );

      return;
    }


    const header = [

      'Invoice Number',

      'Customer',

      'Shipment',

      'Created By',

      'Employee Code',

      'Workspace',

      'Invoice Date',

      'Due Date',

      'Currency',

      'Total',

      'Logistics Received',

      'Outstanding',

      'Invoice Status',

      'Payment Status',

      'Accounts Status',

      'Accounts Paid',

      'Accounts Remaining',

      'Accounts Payment Reference',

      'Accounts Payment Date',

      'Processed By',

      'Invoice Copy'
    ];


    const body =
      rows.map(
        row => [

          row.invoiceNumber ||
          '',

          row.customerName ||
          '',

          row.shipmentNumber ||
          '',

          this.creatorName(
            row
          ),

          this.creatorEmployeeCode(
            row
          ),

          this.recordAccessLabel(
            row
          ),

          this.formatDate(
            row.invoiceDate
          ),

          this.formatDate(
            row.dueDate
          ),

          row.currency ||
          'INR',

          this.number(
            row.invoiceTotal
          ),

          this.number(
            row.amountReceived
          ),

          this.getDisplayBalance(
            row
          ),

          this.label(
            row.status
          ),

          this.label(
            row.paymentStatus
          ),

          this.accountsStatusLabel(
            row.accountsStatus
          ),

          this.number(
            row.accountsPaidAmount
          ),

          this.number(
            row.accountsRemainingAmount
          ),

          row.accountsPaymentReference ||
          '',

          this.formatDate(
            row.accountsPaymentDate ||
            undefined
          ),

          row.accountsPaidByName ||
          '',

          row.invoiceCopy
            ?.originalName ||
          row.invoiceCopy
            ?.fileName ||
          ''
        ]
      );


    const csv =
      [
        header,
        ...body
      ]
        .map(
          line =>
            line
              .map(
                value =>
                  this.csvValue(
                    value
                  )
              )
              .join(
                ','
              )
        )
        .join(
          '\n'
        );


    const blob =
      new Blob(
        [
          '\ufeff',
          csv
        ],
        {
          type:
            'text/csv;charset=utf-8;'
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const anchor =
      document.createElement(
        'a'
      );


    anchor.href =
      url;


    anchor.download =
      `logistics-invoices-${new Date()
        .toISOString()
        .slice(
          0,
          10
        )}.csv`;


    document.body.appendChild(
      anchor
    );


    anchor.click();

    anchor.remove();


    URL.revokeObjectURL(
      url
    );
  }


  /* ============================================================
     CURRENCY
  ============================================================ */

  protected formatCurrency(
    value: unknown,
    currency = 'INR'
  ): string {

    const code =
      String(
        currency ||
        'INR'
      )
        .toUpperCase();


    try {

      return new Intl.NumberFormat(
        'en-IN',
        {
          style:
            'currency',

          currency:
            code,

          maximumFractionDigits:
            2
        }
      )
        .format(
          this.number(
            value
          )
        );

    } catch {

      return `${code} ${this.number(
        value
      ).toFixed(
        2
      )}`;
    }
  }


  /* ============================================================
     DATE
  ============================================================ */

  protected formatDate(
    value?: string
  ): string {

    if (
      !value
    ) {

      return '-';
    }


    const date =
      new Date(
        value
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return '-';
    }


    return date
      .toLocaleDateString(
        'en-IN',
        {
          day:
            '2-digit',

          month:
            'short',

          year:
            'numeric'
        }
      );
  }


  protected formatDateTime(
    value?: string | null
  ): string {

    if (
      !value
    ) {

      return '-';
    }


    const date =
      new Date(
        value
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return '-';
    }


    return date
      .toLocaleString(
        'en-IN',
        {
          day:
            '2-digit',

          month:
            'short',

          year:
            'numeric',

          hour:
            '2-digit',

          minute:
            '2-digit'
        }
      );
  }


  /* ============================================================
     LABEL
  ============================================================ */

  protected label(
    value?: string
  ): string {

    return String(
      value ||
      '-'
    )
      .replace(
        /[-_]+/g,
        ' '
      )
      .replace(
        /\b\w/g,
        letter =>
          letter.toUpperCase()
      );
  }


  /* ============================================================
     STATUS CLASS
  ============================================================ */

  protected statusClass(
    value?: string
  ): string {

    return String(
      value ||
      'draft'
    )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        '-'
      );
  }


  /* ============================================================
     NORMALIZE INVOICE
  ============================================================ */

  private normalizeInvoice(
    row: InvoiceRow
  ): InvoiceRow {

    const employee =
      this.objectValue<CreatorEmployee>(
        row.createdByEmployeeId
      );


    const user =
      this.objectValue<CreatorUser>(
        row.createdBy
      );


    return {

      ...row,


      createdBy:
        row.createdBy ||
        null,


      createdByEmployeeId:
        row.createdByEmployeeId ||
        null,


      createdByName:
        this.personName(
          employee
        ) ||
        String(
          row.createdByName ||
          ''
        ).trim() ||
        this.personName(
          user
        ),


      createdByEmployeeCode:
        String(
          employee?.employeeCode ||
          row.createdByEmployeeCode ||
          ''
        ).trim(),


      editHistory:
        Array.isArray(
          row.editHistory
        )
          ? row.editHistory
          : [],


      invoiceCopy:
        row.invoiceCopy?.fileUrl
          ? {
              ...row.invoiceCopy
            }
          : null,


      accountsHandoffId:
        row.accountsHandoffId
          ? this.idValue(
              row.accountsHandoffId
            )
          : null,


      accountsStatus:
        this.normalizeAccountsStatus(
          row.accountsStatus
        ),


      accountsPaidAmount:
        this.number(
          row.accountsPaidAmount
        ),


      accountsRemainingAmount:
        this.number(
          row.accountsRemainingAmount
        ),


      accountsPaymentReference:
        String(
          row.accountsPaymentReference ||
          ''
        ),


      accountsPaidByName:
        String(
          row.accountsPaidByName ||
          ''
        )
    };
  }


  /* ============================================================
     NORMALIZE ACCOUNTS STATUS
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
     PERSON NAME
  ============================================================ */

  private personName(
    value: unknown
  ): string {

    if (
      !value ||
      typeof value !==
        'object'
    ) {

      return '';
    }


    const person =
      value as any;


    const fullName =
      [
        String(
          person.firstName ||
          ''
        ).trim(),

        String(
          person.lastName ||
          ''
        ).trim()
      ]
        .filter(
          Boolean
        )
        .join(
          ' '
        )
        .trim();


    return String(
      person.name ||
      person.displayName ||
      fullName ||
      person.email ||
      ''
    ).trim();
  }


  /* ============================================================
     OBJECT VALUE
  ============================================================ */

  private objectValue<T>(
    value: unknown
  ): T | null {

    if (
      value &&
      typeof value ===
        'object'
    ) {

      return value as T;
    }


    return null;
  }


  /* ============================================================
     ID VALUE

     Supports:
     - string id
     - populated {_id}
     - populated {id}
  ============================================================ */

  private idValue(
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
        'object'
    ) {

      const object =
        value as any;


      if (
        object._id
      ) {

        return String(
          object._id
        );
      }


      if (
        object.id
      ) {

        return String(
          object.id
        );
      }


      return '';
    }


    return String(
      value
    );
  }


  /* ============================================================
     MESSAGES
  ============================================================ */

  private clearMessages(): void {

    this.message.set(
      ''
    );

    this.errorMessage.set(
      ''
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


  /* ============================================================
     CSV
  ============================================================ */

  private csvValue(
    value: unknown
  ): string {

    const text =
      String(
        value ??
        ''
      );


    return /[",\n]/
      .test(
        text
      )
        ? `"${text.replace(
            /"/g,
            '""'
          )}"`
        : text;
  }
}