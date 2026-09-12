import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { ApiService } from '../../../../core/services/api.service';


/* ============================================================
   SELECT OPTION
============================================================ */

interface SelectOption {
  label: string;
  value: string;
}


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
   INVOICE ITEM
============================================================ */

interface InvoiceItem {
  itemId: string;

  description: string;
  descriptionOther: string;

  hsnSac: string;

  quantity: number;

  unit: string;
  unitOther: string;

  rate: number;
  discount: number;

  gstRate: string;
  gstRateOther: string;
}


/* ============================================================
   ADDITIONAL CHARGE
============================================================ */

interface AdditionalCharge {
  description: string;
  descriptionOther: string;

  amount: number;

  taxable: string;
}


/* ============================================================
   CUSTOMER
============================================================ */

interface CustomerRow {
  _id?: string;

  customerName?: string;
  companyName?: string;

  contactPerson?: string;

  mobile?: string;
  email?: string;

  gstNumber?: string;

  currency?: string;

  billingAddress?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };

  pickupAddress?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
}


/* ============================================================
   SHIPMENT
============================================================ */

interface ShipmentLocation {
  name?: string;
  locationName?: string;

  address?: string;
  addressLine1?: string;
  addressLine2?: string;

  city?: string;
  state?: string;
  country?: string;

  pincode?: string;
  postalCode?: string;
}


interface ShipmentRow {
  _id?: string;

  shipmentNumber?: string;

  customerName?: string;

  origin?:
    | string
    | ShipmentLocation;

  destination?:
    | string
    | ShipmentLocation;

  route?: {
    origin?:
      | string
      | ShipmentLocation;

    destination?:
      | string
      | ShipmentLocation;
  };

  charges?: {
    currency?: string;
  };
}


/* ============================================================
   ITEM / SERVICE MASTER
============================================================ */

interface ItemRow {
  _id?: string;

  name?: string;

  itemCode?: string;
  itemType?: string;

  hsnSacCode?: string;

  unit?: string;
  unitOther?: string;

  salePrice?: number;
  taxPercent?: number;

  description?: string;
}


/* ============================================================
   EDIT AUDIT
============================================================ */

interface EditAuditEntry {
  changedBy?:
    | string
    | CreatorUser
    | null;

  changedByName?: string;

  changedAt?: string;
}


/* ============================================================
   INVOICE COPY
============================================================ */

interface InvoiceCopy {
  fileUrl?: string;

  fileName?: string;
  originalName?: string;

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

  invoiceTotal?: number;


  /* ==========================================================
     OWNERSHIP
  ========================================================== */

  createdBy?:
    | string
    | CreatorUser
    | null;

  createdByEmployeeId?:
    | string
    | CreatorEmployee
    | null;


  /* ==========================================================
     AUDIT
  ========================================================== */

  editHistory?: EditAuditEntry[];


  /* ==========================================================
     DOCUMENT
  ========================================================== */

  invoiceCopy?: InvoiceCopy | null;


  /* ==========================================================
     ACCOUNTS
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
}


/* ============================================================
   PAGE RESPONSE
============================================================ */

interface PageResult<T> {

  data?:
    | T[]
    | {
        data?: T[];

        records?: T[];

        customers?: T[];

        shipments?: T[];

        productsServices?: T[];

        services?: T[];

        items?: T[];
      };

  records?: T[];

  customers?: T[];

  shipments?: T[];

  productsServices?: T[];

  services?: T[];

  items?: T[];
}


/* ============================================================
   COMPONENT
============================================================ */

@Component({
  selector:
    'app-logistics-invoice-new',

  standalone:
    true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl:
    './logistics-invoice-new.component.html',

  styleUrl:
    './logistics-invoice-new.component.scss'
})
export class LogisticsInvoiceNewComponent implements OnInit {

  private readonly api =
    inject(ApiService);

  private readonly route =
    inject(ActivatedRoute);

  private readonly auth =
    inject(AuthService);

  private readonly router =
    inject(Router);


  private readonly editNavigation =
    this.router
      .getCurrentNavigation()
      ?.extras
      .info as
        | Record<string, any>
        | undefined;


  /* ============================================================
     LOAD / SAVE STATE
  ============================================================ */

  protected readonly isLoadingInvoice =
    signal(false);

  protected readonly invoiceLoadFailed =
    signal(false);

  protected readonly isSaving =
    signal(false);


  /* ============================================================
     MESSAGES
  ============================================================ */

  protected readonly message =
    signal('');

  protected readonly errorMessage =
    signal('');


  /* ============================================================
     RECENT
  ============================================================ */

  protected readonly recentInvoices =
    signal<InvoiceRow[]>([]);


  /* ============================================================
     CURRENT EMPLOYEE / USER
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

  protected readonly canHandoffToAccounts =
    signal(false);

  protected readonly logisticsAccessResolved =
    signal(false);


  /* ============================================================
     CURRENT RECORD CREATOR
  ============================================================ */

  protected readonly creatorUserId =
    signal('');

  protected readonly creatorEmployeeId =
    signal('');

  protected readonly creatorName =
    signal('');

  protected readonly creatorEmployeeCode =
    signal('');

  protected readonly creatorDesignation =
    signal('');


  /* ============================================================
     ACCOUNTS STATE
  ============================================================ */

  protected readonly accountsHandoffId =
    signal<string | null>(null);

  protected readonly accountsStatus =
    signal<AccountsStatus>(null);

  protected readonly accountsHandedOffAt =
    signal<string | null>(null);

  protected readonly accountsPaidAmount =
    signal(0);

  protected readonly accountsRemainingAmount =
    signal(0);

  protected readonly accountsPaymentReference =
    signal('');

  protected readonly accountsPaymentDate =
    signal<string | null>(null);

  protected readonly accountsPaidByName =
    signal('');


  /* ============================================================
     EDIT HISTORY
  ============================================================ */

  protected editHistory:
    EditAuditEntry[] = [];


  /* ============================================================
     INVOICE COPY
  ============================================================ */

  protected selectedInvoiceCopy:
    File | null = null;

  protected invoiceCopyUrl =
    '';

  protected invoiceCopyName =
    '';


  /* ============================================================
     MASTER DATA
  ============================================================ */

  private customerRecords:
    CustomerRow[] = [];

  private shipmentRecords:
    ShipmentRow[] = [];

  private itemRecords:
    ItemRow[] = [];


  protected customers:
    SelectOption[] = [
      {
        label:
          'Other',

        value:
          'other'
      }
    ];


  protected shipmentOptions:
    SelectOption[] = [
      {
        label:
          'Other',

        value:
          'other'
      }
    ];


  protected readonly invoiceTypes:
    SelectOption[] = [
      {
        label:
          'Tax Invoice',

        value:
          'tax-invoice'
      },
      {
        label:
          'Proforma Invoice',

        value:
          'proforma'
      },
      {
        label:
          'Commercial Invoice',

        value:
          'commercial'
      },
      {
        label:
          'Debit Note',

        value:
          'debit-note'
      },
      {
        label:
          'Credit Note',

        value:
          'credit-note'
      },
      {
        label:
          'Other',

        value:
          'other'
      }
    ];


  protected readonly currencies:
    SelectOption[] = [
      {
        label:
          'INR - Indian Rupee',

        value:
          'INR'
      },
      {
        label:
          'USD - US Dollar',

        value:
          'USD'
      },
      {
        label:
          'AED - UAE Dirham',

        value:
          'AED'
      },
      {
        label:
          'EUR - Euro',

        value:
          'EUR'
      },
      {
        label:
          'GBP - British Pound',

        value:
          'GBP'
      },
      {
        label:
          'SAR - Saudi Riyal',

        value:
          'SAR'
      },
      {
        label:
          'SGD - Singapore Dollar',

        value:
          'SGD'
      },
      {
        label:
          'JPY - Japanese Yen',

        value:
          'JPY'
      },
      {
        label:
          'QAR - Qatari Riyal',

        value:
          'QAR'
      },
      {
        label:
          'OMR - Omani Rial',

        value:
          'OMR'
      },
      {
        label:
          'BHD - Bahraini Dinar',

        value:
          'BHD'
      },
      {
        label:
          'KWD - Kuwaiti Dinar',

        value:
          'KWD'
      },
      {
        label:
          'CNY - Chinese Yuan',

        value:
          'CNY'
      },
      {
        label:
          'Other',

        value:
          'other'
      }
    ];


  protected serviceOptions:
    SelectOption[] = [
      {
        label:
          'Air Freight',

        value:
          'preset:air-freight'
      },
      {
        label:
          'Sea Freight',

        value:
          'preset:sea-freight'
      },
      {
        label:
          'CHA Charges',

        value:
          'preset:cha-charges'
      },
      {
        label:
          'Transportation Charges',

        value:
          'preset:transportation'
      },
      {
        label:
          'Warehouse Charges',

        value:
          'preset:warehouse'
      },
      {
        label:
          'Documentation Charges',

        value:
          'preset:documentation'
      },
      {
        label:
          'Terminal Handling Charges',

        value:
          'preset:terminal-handling'
      },
      {
        label:
          'Fuel Surcharge',

        value:
          'preset:fuel-surcharge'
      },
      {
        label:
          'Security Charges',

        value:
          'preset:security'
      },
      {
        label:
          'Other',

        value:
          'other'
      }
    ];


  protected readonly units:
    SelectOption[] = [
      {
        label:
          'Service',

        value:
          'service'
      },
      {
        label:
          'Kg',

        value:
          'kg'
      },
      {
        label:
          'MT',

        value:
          'mt'
      },
      {
        label:
          'Ton',

        value:
          'ton'
      },
      {
        label:
          'Piece',

        value:
          'piece'
      },
      {
        label:
          'Shipment',

        value:
          'shipment'
      },
      {
        label:
          'Container',

        value:
          'container'
      },
      {
        label:
          'Day',

        value:
          'day'
      },
      {
        label:
          'Package',

        value:
          'package'
      },
      {
        label:
          'Other',

        value:
          'other'
      }
    ];


  protected readonly gstRates:
    SelectOption[] = [
      {
        label:
          '0%',

        value:
          '0'
      },
      {
        label:
          '5%',

        value:
          '5'
      },
      {
        label:
          '12%',

        value:
          '12'
      },
      {
        label:
          '18%',

        value:
          '18'
      },
      {
        label:
          '28%',

        value:
          '28'
      },
      {
        label:
          'Other',

        value:
          'other'
      }
    ];


  protected readonly paymentModes:
    SelectOption[] = [
      {
        label:
          'Bank Transfer',

        value:
          'bank-transfer'
      },
      {
        label:
          'NEFT',

        value:
          'neft'
      },
      {
        label:
          'RTGS',

        value:
          'rtgs'
      },
      {
        label:
          'IMPS',

        value:
          'imps'
      },
      {
        label:
          'UPI',

        value:
          'upi'
      },
      {
        label:
          'Cheque',

        value:
          'cheque'
      },
      {
        label:
          'Cash',

        value:
          'cash'
      },
      {
        label:
          'Other',

        value:
          'other'
      }
    ];


  protected readonly paymentStatuses:
    SelectOption[] = [
      {
        label:
          'Unpaid',

        value:
          'unpaid'
      },
      {
        label:
          'Partially Paid',

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
          'Overdue',

        value:
          'overdue'
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

  protected form =
    this.emptyForm();


  protected items:
    InvoiceItem[] = [
      this.emptyItem()
    ];


  protected additionalCharges:
    AdditionalCharge[] = [];


  /* ============================================================
     INIT
  ============================================================ */

  ngOnInit(): void {

    this.resolveLogisticsAccess();


    const invoiceId =
      this.route
        .snapshot
        .queryParamMap
        .get(
          'invoiceId'
        );


    const cached =
      this.editNavigation
        ?.['invoice'];


    if (
      invoiceId
    ) {

      /*
       * Cached navigation is retained for speed.
       *
       * Ownership still gets evaluated from the creator fields
       * in the record and backend remains final authority.
       */

      if (
        cached?._id ===
          invoiceId &&
        Array.isArray(
          cached.items
        ) &&
        this.editNavigation
          ?.['editContext'] ===
          JSON.stringify(
            this.auth.currentUser()
          )
      ) {

        this.populateInvoice(
          cached,
          invoiceId
        );

      } else {

        this.loadInvoice(
          invoiceId
        );
      }

    } else {

      const shipmentNumber =
        this.route
          .snapshot
          .queryParamMap
          .get(
            'shipmentNumber'
          );


      if (
        shipmentNumber
      ) {

        this.form.shipment =
          shipmentNumber;
      }
    }


    this.loadCustomers();

    this.loadShipments();

    this.loadItems();

    this.loadRecentInvoices();
  }


  /* ============================================================
     RESOLVE EMPLOYEE ACCESS

     Backend is final authority.

     Frontend uses this context to:
     - determine own invoice
     - show review-only mode
     - prevent accidental edits
  ============================================================ */

  private resolveLogisticsAccess(): void {

    const authUser:
      any =
        this.auth.currentUser();


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


          this.currentEmployeeId.set(
            employeeId
          );


          this.currentUserId.set(
            userId
          );


          this.currentEmployeeName.set(
            this.personName(
              employee
            ) ||
            this.personName(
              responseUser
            ) ||
            this.personName(
              authUser
            )
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


          this.applyOwnershipMessage();
        },


        error: () => {

          this.canHandoffToAccounts.set(
            false
          );


          this.logisticsAccessResolved.set(
            true
          );


          this.applyOwnershipMessage();
        }
      });
  }


  /* ============================================================
     OWNERSHIP / EDIT STATE
  ============================================================ */

  protected isExistingInvoice(): boolean {

    return Boolean(
      String(
        this.form.invoiceId ||
        ''
      ).trim()
    );
  }


  protected isHandedOff(): boolean {

    return Boolean(
      String(
        this.accountsHandoffId() ||
        ''
      ).trim()
    );
  }


  protected isOwnInvoice(): boolean {

    /*
     * New invoice belongs to the current employee once saved.
     */
    if (
      !this.isExistingInvoice()
    ) {

      return true;
    }


    const recordEmployeeId =
      this.creatorEmployeeId();


    if (
      recordEmployeeId
    ) {

      return Boolean(
        this.currentEmployeeId() &&
        this.currentEmployeeId() ===
          recordEmployeeId
      );
    }


    /*
     * Legacy record fallback.
     */
    return Boolean(
      this.creatorUserId() &&
      this.currentUserId() &&
      this.creatorUserId() ===
        this.currentUserId()
    );
  }


  protected isReviewOnly(): boolean {

    return Boolean(
      this.isExistingInvoice() &&
      !this.isHandedOff() &&
      !this.isOwnInvoice()
    );
  }


  protected canEditInvoice(): boolean {

    /*
     * New invoice stays editable even while employee context is
     * resolving.
     */
    if (
      !this.isExistingInvoice()
    ) {

      return true;
    }


    /*
     * Existing invoice must wait for employee identity before
     * frontend can safely decide ownership.
     */
    if (
      !this.logisticsAccessResolved()
    ) {

      return false;
    }


    return Boolean(
      !this.isHandedOff() &&
      this.isOwnInvoice()
    );
  }


  protected ownershipLabel(): string {

    if (
      this.isHandedOff()
    ) {

      return 'Accounts controlled • Read only';
    }


    if (
      !this.isExistingInvoice()
    ) {

      return 'New Invoice';
    }


    if (
      this.isOwnInvoice()
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


  protected creatorDisplayName(): string {

    return (
      this.creatorName() ||
      (
        this.isExistingInvoice()
          ? 'Unknown'
          : this.currentEmployeeName() ||
            'Current Employee'
      )
    );
  }


  /* ============================================================
     OWNERSHIP MESSAGE
  ============================================================ */

  private applyOwnershipMessage(): void {

    if (
      !this.isExistingInvoice()
    ) {

      return;
    }


    if (
      this.isHandedOff()
    ) {

      this.message.set(
        'This invoice has been sent to Accounts. Logistics financial editing is locked.'
      );

      return;
    }


    if (
      this.logisticsAccessResolved() &&
      !this.isOwnInvoice()
    ) {

      this.message.set(
        `Review mode: this invoice was created by ${this.creatorDisplayName()}. Only the creator can edit it.`
      );
    }
  }


  /* ============================================================
     ACCOUNTS STATUS
  ============================================================ */

  protected accountsStatusLabel(): string {

    switch (
      this.accountsStatus()
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


  protected accountsStatusClass(): string {

    return String(
      this.accountsStatus() ||
      'not-sent'
    )
      .trim()
      .toLowerCase()
      .replace(
        /_/g,
        '-'
      );
  }


  protected accountsStateDescription(): string {

    switch (
      this.accountsStatus()
    ) {

      case 'sent':
        return 'Invoice is waiting for Accounts review.';

      case 'under_review':
        return 'Accounts is reviewing this invoice.';

      case 'verified':
        return 'Invoice has been verified by Accounts.';

      case 'partially_paid':
        return 'Accounts has recorded a partial customer payment.';

      case 'paid':
        return 'Customer payment has been fully recorded by Accounts.';

      case 'rejected':
        return 'Accounts rejected this invoice handoff.';

      default:
        return 'Invoice has not been sent to Accounts.';
    }
  }


  protected formatAccountsDate(
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
     CALCULATIONS
  ============================================================ */

  protected get itemsSubtotal(): number {

    return this.items.reduce(
      (
        sum,
        item
      ) =>
        sum +
        this.itemTaxableAmount(
          item
        ),
      0
    );
  }


  protected get itemTaxTotal(): number {

    return this.items.reduce(
      (
        sum,
        item
      ) =>
        sum +
        this.itemTaxAmount(
          item
        ),
      0
    );
  }


  protected get additionalChargeSubtotal(): number {

    return this.additionalCharges.reduce(
      (
        sum,
        charge
      ) =>
        sum +
        this.number(
          charge.amount
        ),
      0
    );
  }


  protected get taxableAdditionalCharges(): number {

    return this.additionalCharges.reduce(
      (
        sum,
        charge
      ) =>
        sum +
        (
          charge.taxable ===
            'yes'
            ? this.number(
                charge.amount
              )
            : 0
        ),
      0
    );
  }


  protected get additionalChargeTax(): number {

    return (
      this.taxableAdditionalCharges *
      0.18
    );
  }


  protected get overallDiscountAmount(): number {

    const subtotal =
      this.itemsSubtotal +
      this.additionalChargeSubtotal;


    return this.form.discountType ===
      'percentage'

      ? Math.min(
          subtotal,

          (
            subtotal *
            this.number(
              this.form.overallDiscount
            )
          ) /
            100
        )

      : Math.min(
          subtotal,

          this.number(
            this.form.overallDiscount
          )
        );
  }


  protected get totalBeforeTax(): number {

    return Math.max(
      0,

      this.itemsSubtotal +
      this.additionalChargeSubtotal -
      this.overallDiscountAmount
    );
  }


  protected get taxTotal(): number {

    return (
      this.itemTaxTotal +
      this.additionalChargeTax
    );
  }


  protected get invoiceTotal(): number {

    return Math.max(
      0,

      this.totalBeforeTax +
      this.taxTotal +
      this.number(
        this.form.roundOff
      )
    );
  }


  protected get balanceDue(): number {

    return Math.max(
      0,

      this.invoiceTotal -
      this.number(
        this.form.amountReceived
      )
    );
  }


  /* ============================================================
     ITEMS
  ============================================================ */

  protected addItem(): void {

    if (
      !this.ensureEditable()
    ) {

      return;
    }


    this.items.push(
      this.emptyItem()
    );
  }


  protected removeItem(
    index: number
  ): void {

    if (
      !this.ensureEditable()
    ) {

      return;
    }


    if (
      this.items.length >
      1
    ) {

      this.items.splice(
        index,
        1
      );
    }
  }


  protected addAdditionalCharge(): void {

    if (
      !this.ensureEditable()
    ) {

      return;
    }


    this.additionalCharges.push({
      description:
        '',

      descriptionOther:
        '',

      amount:
        0,

      taxable:
        'yes'
    });
  }


  protected removeAdditionalCharge(
    index: number
  ): void {

    if (
      !this.ensureEditable()
    ) {

      return;
    }


    this.additionalCharges.splice(
      index,
      1
    );
  }


  protected itemBaseAmount(
    item: InvoiceItem
  ): number {

    return (
      this.number(
        item.quantity
      ) *
      this.number(
        item.rate
      )
    );
  }


  protected itemDiscountAmount(
    item: InvoiceItem
  ): number {

    return Math.min(
      this.itemBaseAmount(
        item
      ),

      this.number(
        item.discount
      )
    );
  }


  protected itemTaxableAmount(
    item: InvoiceItem
  ): number {

    return Math.max(
      0,

      this.itemBaseAmount(
        item
      ) -
      this.itemDiscountAmount(
        item
      )
    );
  }


  protected itemGstRate(
    item: InvoiceItem
  ): number {

    return item.gstRate ===
      'other'

      ? this.number(
          item.gstRateOther
        )

      : this.number(
          item.gstRate
        );
  }


  protected itemTaxAmount(
    item: InvoiceItem
  ): number {

    return (
      this.itemTaxableAmount(
        item
      ) *
      this.itemGstRate(
        item
      ) /
      100
    );
  }


  protected itemTotal(
    item: InvoiceItem
  ): number {

    return (
      this.itemTaxableAmount(
        item
      ) +
      this.itemTaxAmount(
        item
      )
    );
  }


  /* ============================================================
     CUSTOMER
  ============================================================ */

  protected onCustomerSelected(): void {

    if (
      !this.ensureEditable(
        false
      )
    ) {

      return;
    }


    const customer =
      this.customerRecords.find(
        row =>
          row._id ===
          this.form.customer
      );


    if (
      !customer
    ) {

      if (
        !this.form.customer ||
        this.form.customer ===
          'other'
      ) {

        this.form.contactPerson =
          '';

        this.form.mobile =
          '';

        this.form.email =
          '';

        this.form.gstNumber =
          '';

        this.form.billingAddress =
          '';

        this.form.shippingAddress =
          '';
      }


      return;
    }


    this.form.contactPerson =
      customer.contactPerson ||
      this.form.contactPerson;


    this.form.mobile =
      customer.mobile ||
      this.form.mobile;


    this.form.email =
      customer.email ||
      this.form.email;


    this.form.gstNumber =
      customer.gstNumber ||
      this.form.gstNumber;


    this.form.billingAddress =
      this.formatAddress(
        customer.billingAddress
      ) ||
      this.form.billingAddress;


    this.form.shippingAddress =
      this.formatAddress(
        customer.pickupAddress
      ) ||
      this.form.shippingAddress;


    this.form.currency =
      customer.currency ||
      this.form.currency;
  }


  /* ============================================================
     SHIPMENT
  ============================================================ */

  protected onShipmentSelected(): void {

    if (
      !this.ensureEditable(
        false
      )
    ) {

      return;
    }


    const shipment =
      this.shipmentRecords.find(
        row =>
          row.shipmentNumber ===
          this.form.shipment
      );


    if (
      !shipment
    ) {

      return;
    }


    this.form.customer =
      shipment.customerName
        ? 'other'
        : this.form.customer;


    this.form.customerOther =
      shipment.customerName ||
      this.form.customerOther;


    this.form.currency =
      shipment.charges?.currency ||
      this.form.currency ||
      'INR';


    this.form.currencyOther =
      '';
  }


  /* ============================================================
     PRODUCT / SERVICE
  ============================================================ */

  protected onProductServiceSelected(
    item: InvoiceItem
  ): void {

    if (
      !this.ensureEditable(
        false
      )
    ) {

      return;
    }


    const live =
      this.itemRecords.find(
        row =>
          row._id ===
          item.description
      );


    if (
      !live
    ) {

      if (
        !item.description
      ) {

        item.itemId =
          '';

        item.hsnSac =
          '';

        item.unit =
          'service';

        item.unitOther =
          '';

        item.rate =
          0;

        item.gstRate =
          '18';

        item.gstRateOther =
          '';
      }


      return;
    }


    item.itemId =
      live._id ||
      item.itemId;


    item.descriptionOther =
      live.description ||
      item.descriptionOther;


    item.hsnSac =
      live.hsnSacCode ||
      item.hsnSac;


    item.unit =
      live.unit ||
      item.unit;


    item.unitOther =
      live.unitOther ||
      item.unitOther;


    item.rate =
      live.salePrice ??
      item.rate;


    if (
      live.taxPercent !==
        undefined &&
      live.taxPercent !==
        null
    ) {

      const gst =
        String(
          live.taxPercent
        );


      item.gstRate =
        this.gstRates.some(
          rate =>
            rate.value ===
            gst
        )
          ? gst
          : 'other';


      item.gstRateOther =
        item.gstRate ===
          'other'
          ? gst
          : '';
    }
  }


  /* ============================================================
     SAVE
  ============================================================ */

  protected saveDraft(): void {

    if (
      !this.ensureEditable()
    ) {

      return;
    }


    this.persistInvoice(
      'draft'
    );
  }


  protected submitInvoice(): void {

    if (
      !this.ensureEditable()
    ) {

      return;
    }


    this.persistInvoice(
      'issued'
    );
  }


  /* ============================================================
     PDF / PRINT
  ============================================================ */

  /* ============================================================
  PDF / PRINT

  Preview:
    Opens clean invoice document only.

  Download PDF:
    Opens clean invoice document and browser
    Save as PDF dialog.

  Print:
    Prints clean invoice document only.

  The CRM screen is NEVER printed.
============================================================ */

protected previewPdf(): void {

 if (
   !this.form.invoiceId
 ) {

   this.setError(
     'Save the invoice before PDF Preview.'
   );

   return;
 }


 this.openInvoiceDocument(
   'preview'
 );
}


protected downloadPdf(): void {

 if (
   !this.form.invoiceId
 ) {

   this.setError(
     'Save the invoice before downloading PDF.'
   );

   return;
 }


 this.openInvoiceDocument(
   'pdf'
 );
}


protected printInvoice(): void {

 if (
   !this.form.invoiceId
 ) {

   this.setError(
     'Save the invoice before printing.'
   );

   return;
 }


 this.openInvoiceDocument(
   'print'
 );
}


/* ============================================================
  OPEN INVOICE DOCUMENT
============================================================ */

private openInvoiceDocument(
 mode:
   | 'preview'
   | 'pdf'
   | 'print'
): void {

 const popup =
   window.open(
     '',
     '_blank',
     'width=1200,height=900'
   );


 if (
   !popup
 ) {

   const message =
     'Please allow pop-ups to preview, download or print the invoice.';


   this.setError(
     message
   );


   window.alert(
     message
   );


   return;
 }


 popup.document.open();


 popup.document.write(
   this.buildInvoiceDocumentHtml(
     mode
   )
 );


 popup.document.close();


 popup.focus();


 /*
  * Preview must NOT immediately print.
  */
 if (
   mode ===
     'preview'
 ) {

   return;
 }


 /*
  * PDF and Print both use the browser print engine,
  * but they print the CLEAN invoice document,
  * never the CRM screen.
  */
 setTimeout(
   () => {

     popup.print();

   },
   350
 );
}


/* ============================================================
  BUILD CLEAN INVOICE DOCUMENT
============================================================ */

private buildInvoiceDocumentHtml(
 mode:
   | 'preview'
   | 'pdf'
   | 'print'
): string {

 const customerName =
   this.selectedCustomerName() ||
   this.form.customerOther ||
   '-';


 const invoiceNumber =
   this.form.invoiceNumber &&
   this.form.invoiceNumber !==
     'AUTO'

     ? this.form.invoiceNumber

     : 'Draft Invoice';


 const shipmentNumber =
   this.form.shipment ===
     'other'

     ? this.form.shipmentOther

     : this.form.shipment;


 const invoiceType =
   this.form.invoiceType ===
     'other'

     ? this.form.invoiceTypeOther

     : (
         this.invoiceTypes.find(
           option =>
             option.value ===
             this.form.invoiceType
         )
           ?.label ||
         this.form.invoiceType
       );


 const currencyCode =
   this.form.currency ===
     'other'

     ? (
         this.form.currencyOther
           .trim()
           .toUpperCase() ||
         'INR'
       )

     : (
         this.form.currency ||
         'INR'
       );


 const paymentMode =
   this.form.paymentMode ===
     'other'

     ? this.form.paymentModeOther

     : (
         this.paymentModes.find(
           option =>
             option.value ===
             this.form.paymentMode
         )
           ?.label ||
         this.form.paymentMode ||
         '-'
       );


 const paymentStatus =
   this.form.paymentStatus ===
     'other'

     ? this.form.paymentStatusOther

     : (
         this.paymentStatuses.find(
           option =>
             option.value ===
             this.form.paymentStatus
         )
           ?.label ||
         this.form.paymentStatus ||
         '-'
       );


 const generatedAt =
   new Intl.DateTimeFormat(
     'en-IN',
     {
       dateStyle:
         'medium',

       timeStyle:
         'short'
     }
   )
     .format(
       new Date()
     );


 const creator =
   this.creatorDisplayName();


 const creatorCode =
   this.creatorEmployeeCode();


 /* ========================================================
    INVOICE ITEMS
 ======================================================== */

 const itemRows =
   this.items
     .map(
       (
         item,
         index
       ) => {

         const description =
           this.itemDescription(
             item
           ) ||
           item.descriptionOther ||
           '-';


         const unit =
           item.unit ===
             'other'

             ? item.unitOther

             : (
                 this.units.find(
                   option =>
                     option.value ===
                     item.unit
                 )
                   ?.label ||
                 item.unit ||
                 '-'
               );


         return `
           <tr>

             <td class="center">
               ${index + 1}
             </td>

             <td>

               <strong>
                 ${this.escapeInvoiceHtml(
                   description
                 )}
               </strong>

               ${
                 item.hsnSac

                   ? `
                     <small>
                       HSN/SAC:
                       ${this.escapeInvoiceHtml(
                         item.hsnSac
                       )}
                     </small>
                   `

                   : ''
               }

             </td>

             <td class="right">
               ${this.escapeInvoiceHtml(
                 this.number(
                   item.quantity
                 )
                   .toString()
               )}
             </td>

             <td>
               ${this.escapeInvoiceHtml(
                 unit
               )}
             </td>

             <td class="right money">
               ${this.escapeInvoiceHtml(
                 this.formatCurrency(
                   item.rate
                 )
               )}
             </td>

             <td class="right money">
               ${this.escapeInvoiceHtml(
                 this.formatCurrency(
                   this.itemDiscountAmount(
                     item
                   )
                 )
               )}
             </td>

             <td class="right">
               ${this.escapeInvoiceHtml(
                 `${this.itemGstRate(item)}%`
               )}
             </td>

             <td class="right money">

               <strong>
                 ${this.escapeInvoiceHtml(
                   this.formatCurrency(
                     this.itemTotal(
                       item
                     )
                   )
                 )}
               </strong>

             </td>

           </tr>
         `;
       }
     )
     .join('');


 /* ========================================================
    ADDITIONAL CHARGES
 ======================================================== */

 const additionalChargeRows =
   this.additionalCharges
     .map(
       charge => {

         const description =
           charge.description ===
             'other'

             ? charge.descriptionOther

             : charge.description;


         return `
           <tr>

             <td>
               ${this.escapeInvoiceHtml(
                 description ||
                 'Additional Charge'
               )}
             </td>

             <td class="right">
               ${
                 charge.taxable ===
                   'yes'

                   ? 'Taxable'

                   : 'Non-taxable'
               }
             </td>

             <td class="right money">
               ${this.escapeInvoiceHtml(
                 this.formatCurrency(
                   charge.amount
                 )
               )}
             </td>

           </tr>
         `;
       }
     )
     .join('');


 /* ========================================================
    ACCOUNTS INFORMATION
 ======================================================== */

 const accountsSection =
   this.isHandedOff() ||
   this.accountsStatus()

     ? `
       <section class="accounts-section">

         <div class="section-title">
           Accounts Status
         </div>

         <div class="info-grid four">

           <div>

             <small>
               Status
             </small>

             <strong>
               ${this.escapeInvoiceHtml(
                 this.accountsStatusLabel()
               )}
             </strong>

           </div>


           <div>

             <small>
               Paid Amount
             </small>

             <strong>
               ${this.escapeInvoiceHtml(
                 this.formatCurrency(
                   this.accountsPaidAmount()
                 )
               )}
             </strong>

           </div>


           <div>

             <small>
               Remaining
             </small>

             <strong>
               ${this.escapeInvoiceHtml(
                 this.formatCurrency(
                   this.accountsRemainingAmount()
                 )
               )}
             </strong>

           </div>


           <div>

             <small>
               Paid By
             </small>

             <strong>
               ${this.escapeInvoiceHtml(
                 this.accountsPaidByName() ||
                 '-'
               )}
             </strong>

           </div>

         </div>

       </section>
     `

     : '';


 /* ========================================================
    PREVIEW TOOLBAR
 ======================================================== */

 const previewToolbar =
   mode ===
     'preview'

     ? `
       <div class="preview-toolbar no-print">

         <button
           type="button"
           onclick="window.print()"
         >
           Print / Save PDF
         </button>

         <button
           type="button"
           class="secondary"
           onclick="window.close()"
         >
           Close Preview
         </button>

       </div>
     `

     : '';


 /* ========================================================
    PDF NOTICE
 ======================================================== */

 const pdfNotice =
   mode ===
     'pdf'

     ? `
       <div class="pdf-notice">

         To download the PDF,
         choose

         <strong>
           Save as PDF
         </strong>

         in the print dialog.

       </div>
     `

     : '';


 return `
<!DOCTYPE html>

<html>

<head>

<meta charset="utf-8">

<meta
 name="viewport"
 content="width=device-width, initial-scale=1"
>

<title>
 ${this.escapeInvoiceHtml(
   invoiceNumber
 )}
</title>


<style>

 @page {
   size: A4;
   margin: 10mm;
 }


 * {
   box-sizing: border-box;
 }


 html,
 body {
   margin: 0;
   padding: 0;

   background:
     #eef2f6;

   color:
     #172033;

   font-family:
     Arial,
     Helvetica,
     sans-serif;
 }


 body {
   padding:
     24px;
 }


 .preview-toolbar {
   max-width:
     960px;

   display:
     flex;

   justify-content:
     flex-end;

   gap:
     8px;

   margin:
     0
     auto
     12px;
 }


 .preview-toolbar button {
   padding:
     10px
     15px;

   border:
     0;

   border-radius:
     8px;

   background:
     #0d2038;

   color:
     #ffffff;

   cursor:
     pointer;

   font-size:
     12px;

   font-weight:
     700;
 }


 .preview-toolbar button.secondary {
   background:
     #dfe5eb;

   color:
     #26374a;
 }


 .pdf-notice {
   max-width:
     960px;

   margin:
     0
     auto
     12px;

   padding:
     10px
     12px;

   border:
     1px solid #e4cfaa;

   border-radius:
     8px;

   background:
     #fffaf0;

   color:
     #775c32;

   font-size:
     11px;

   text-align:
     center;
 }


 .invoice-document {
   max-width:
     960px;

   margin:
     0
     auto;

   padding:
     28px;

   background:
     #ffffff;

   box-shadow:
     0
     12px
     40px
     rgba(
       15,
       32,
       56,
       0.12
     );
 }


 /* ================================================
    HEADER
 ================================================= */

 .invoice-header {
   display:
     flex;

   align-items:
     flex-start;

   justify-content:
     space-between;

   gap:
     25px;

   padding-bottom:
     18px;

   border-bottom:
     2px solid #c9a86a;
 }


 .company-name {
   margin-bottom:
     5px;

   color:
     #98703a;

   font-size:
     12px;

   font-weight:
     800;

   letter-spacing:
     1.5px;
 }


 .invoice-header h1 {
   margin:
     0
     0
     5px;

   color:
     #07111f;

   font-family:
     Georgia,
     "Times New Roman",
     serif;

   font-size:
     28px;
 }


 .invoice-header p {
   margin: 0;

   color:
     #74808d;

   font-size:
     11px;
 }


 .invoice-number-box {
   min-width:
     245px;

   padding:
     14px;

   border:
     1px solid #dfe4e9;

   border-radius:
     9px;

   background:
     #f7f9fb;
 }


 .invoice-number-box small,
 .info-grid small {
   display:
     block;

   margin-bottom:
     4px;

   color:
     #818c98;

   font-size:
     8px;

   font-weight:
     700;

   letter-spacing:
     0.4px;

   text-transform:
     uppercase;
 }


 .invoice-number-box strong {
   display:
     block;

   margin-bottom:
     7px;

   color:
     #07111f;

   font-size:
     15px;
 }


 .document-meta {
   color:
     #697686;

   font-size:
     9px;

   line-height:
     1.7;
 }


 /* ================================================
    INFO
 ================================================= */

 .info-grid {
   display:
     grid;

   grid-template-columns:
     repeat(
       3,
       minmax(0, 1fr)
     );

   gap:
     10px;

   margin-top:
     15px;
 }


 .info-grid.four {
   grid-template-columns:
     repeat(
       4,
       minmax(0, 1fr)
     );
 }


 .info-grid > div {
   padding:
     10px;

   border:
     1px solid #e1e6eb;

   border-radius:
     7px;

   background:
     #fafbfc;
 }


 .info-grid strong {
   display:
     block;

   color:
     #1c2b3d;

   font-size:
     10px;

   line-height:
     1.5;
 }


 /* ================================================
    CUSTOMER
 ================================================= */

 .billing-grid {
   display:
     grid;

   grid-template-columns:
     repeat(
       2,
       minmax(0, 1fr)
     );

   gap:
     12px;

   margin-top:
     18px;
 }


 .party-card {
   min-height:
     125px;

   padding:
     13px;

   border:
     1px solid #dfe4e9;

   border-radius:
     8px;
 }


 .party-card h3,
 .section-title {
   margin:
     0
     0
     8px;

   color:
     #98703a;

   font-size:
     9px;

   font-weight:
     800;

   letter-spacing:
     0.7px;

   text-transform:
     uppercase;
 }


 .party-card strong {
   display:
     block;

   margin-bottom:
     5px;

   color:
     #07111f;

   font-size:
     12px;
 }


 .party-card p {
   margin:
     3px
     0;

   color:
     #596778;

   font-size:
     9px;

   line-height:
     1.45;
 }


 /* ================================================
    TABLE
 ================================================= */

 .items-section,
 .charges-section,
 .totals-section,
 .payment-section,
 .accounts-section,
 .notes-section {
   margin-top:
     18px;
 }


 table {
   width:
     100%;

   border-collapse:
     collapse;
 }


 thead {
   display:
     table-header-group;
 }


 tr {
   page-break-inside:
     avoid;
 }


 th,
 td {
   padding:
     8px
     7px;

   border:
     1px solid #dfe4e9;

   vertical-align:
     top;

   text-align:
     left;
 }


 th {
   background:
     #07111f;

   color:
     #ffffff;

   font-size:
     8px;

   text-transform:
     uppercase;

   white-space:
     nowrap;
 }


 td {
   color:
     #465467;

   font-size:
     9px;

   line-height:
     1.4;
 }


 td strong {
   color:
     #172033;
 }


 td small {
   display:
     block;

   margin-top:
     3px;

   color:
     #88929d;

   font-size:
     7px;
 }


 .right {
   text-align:
     right;
 }


 .center {
   text-align:
     center;
 }


 .money {
   white-space:
     nowrap;
 }


 .charges-table {
   max-width:
     500px;

   margin-left:
     auto;
 }


 /* ================================================
    TOTALS
 ================================================= */

 .totals-wrap {
   display:
     flex;

   justify-content:
     flex-end;
 }


 .totals {
   width:
     360px;

   overflow:
     hidden;

   border:
     1px solid #dfe4e9;

   border-radius:
     8px;
 }


 .totals-row {
   display:
     flex;

   justify-content:
     space-between;

   gap:
     12px;

   padding:
     8px
     11px;

   border-bottom:
     1px solid #e5e9ed;

   font-size:
     9px;
 }


 .totals-row:last-child {
   border-bottom: 0;
 }


 .totals-row span {
   color:
     #697686;
 }


 .totals-row strong {
   color:
     #132034;

   white-space:
     nowrap;
 }


 .totals-row.grand {
   padding:
     11px;

   background:
     #07111f;
 }


 .totals-row.grand span,
 .totals-row.grand strong {
   color:
     #ffffff;

   font-size:
     11px;
 }


 /* ================================================
    PAYMENT
 ================================================= */

 .payment-grid {
   display:
     grid;

   grid-template-columns:
     repeat(
       3,
       minmax(0, 1fr)
     );

   gap:
     10px;
 }


 .payment-grid > div {
   padding:
     10px;

   border:
     1px solid #e1e6eb;

   border-radius:
     7px;

   background:
     #fafbfc;
 }


 .payment-grid small {
   display:
     block;

   margin-bottom:
     4px;

   color:
     #818c98;

   font-size:
     8px;

   text-transform:
     uppercase;
 }


 .payment-grid strong {
   color:
     #172033;

   font-size:
     10px;
 }


 /* ================================================
    NOTES
 ================================================= */

 .notes-grid {
   display:
     grid;

   grid-template-columns:
     repeat(
       2,
       minmax(0, 1fr)
     );

   gap:
     12px;
 }


 .note-card {
   min-height:
     95px;

   padding:
     11px;

   border:
     1px solid #e1e6eb;

   border-radius:
     7px;
 }


 .note-card p {
   margin:
     0;

   color:
     #596778;

   font-size:
     9px;

   line-height:
     1.5;

   white-space:
     pre-wrap;
 }


 /* ================================================
    FOOTER
 ================================================= */

 .invoice-footer {
   display:
     flex;

   justify-content:
     space-between;

   gap:
     15px;

   margin-top:
     22px;

   padding-top:
     10px;

   border-top:
     1px solid #dfe4e9;

   color:
     #89939f;

   font-size:
     8px;
 }


 /* ================================================
    PRINT
 ================================================= */

 @media print {

   html,
   body {
     background:
       #ffffff;
   }


   body {
     padding: 0;
   }


   .no-print,
   .pdf-notice {
     display:
       none !important;
   }


   .invoice-document {
     max-width:
       none;

     padding: 0;

     box-shadow:
       none;
   }

 }

</style>

</head>


<body>

${previewToolbar}

${pdfNotice}


<main class="invoice-document">

 <!-- =============================================
      HEADER
 ============================================== -->

 <header class="invoice-header">

   <div>

     <div class="company-name">
       OPAS BIZZ PRIVATE LIMITED
     </div>

     <h1>
       ${this.escapeInvoiceHtml(
         invoiceType ||
         'Invoice'
       )}
     </h1>

     <p>
       Logistics Department
     </p>

   </div>


   <div class="invoice-number-box">

     <small>
       Invoice Number
     </small>

     <strong>
       ${this.escapeInvoiceHtml(
         invoiceNumber
       )}
     </strong>


     <div class="document-meta">

       Invoice Date:
       ${this.escapeInvoiceHtml(
         this.formatInvoiceDocumentDate(
           this.form.invoiceDate
         )
       )}

       <br>

       Due Date:
       ${this.escapeInvoiceHtml(
         this.formatInvoiceDocumentDate(
           this.form.dueDate
         )
       )}

       <br>

       Currency:
       ${this.escapeInvoiceHtml(
         currencyCode
       )}

     </div>

   </div>

 </header>


 <!-- =============================================
      META
 ============================================== -->

 <section class="info-grid">

   <div>

     <small>
       Shipment
     </small>

     <strong>
       ${this.escapeInvoiceHtml(
         shipmentNumber ||
         '-'
       )}
     </strong>

   </div>


   <div>

     <small>
       Customer Reference
     </small>

     <strong>
       ${this.escapeInvoiceHtml(
         this.form.customerReference ||
         '-'
       )}
     </strong>

   </div>


   <div>

     <small>
       Place of Supply
     </small>

     <strong>
       ${this.escapeInvoiceHtml(
         this.form.placeOfSupply ||
         '-'
       )}
     </strong>

   </div>


   <div>

     <small>
       Reverse Charge
     </small>

     <strong>
       ${
         this.form.reverseCharge ===
           'yes'
           ? 'Yes'
           : 'No'
       }
     </strong>

   </div>


   <div>

     <small>
       Created By
     </small>

     <strong>

       ${this.escapeInvoiceHtml(
         creator
       )}

       ${
         creatorCode

           ? ` (${this.escapeInvoiceHtml(
               creatorCode
             )})`

           : ''
       }

     </strong>

   </div>


   <div>

     <small>
       Generated
     </small>

     <strong>
       ${this.escapeInvoiceHtml(
         generatedAt
       )}
     </strong>

   </div>

 </section>


 <!-- =============================================
      BILL TO / SHIP TO
 ============================================== -->

 <section class="billing-grid">

   <div class="party-card">

     <h3>
       Bill To
     </h3>

     <strong>
       ${this.escapeInvoiceHtml(
         customerName
       )}
     </strong>


     ${
       this.form.contactPerson

         ? `
           <p>
             Contact:
             ${this.escapeInvoiceHtml(
               this.form.contactPerson
             )}
           </p>
         `

         : ''
     }


     ${
       this.form.mobile

         ? `
           <p>
             Mobile:
             ${this.escapeInvoiceHtml(
               this.form.mobile
             )}
           </p>
         `

         : ''
     }


     ${
       this.form.email

         ? `
           <p>
             Email:
             ${this.escapeInvoiceHtml(
               this.form.email
             )}
           </p>
         `

         : ''
     }


     ${
       this.form.gstNumber

         ? `
           <p>
             GSTIN:
             ${this.escapeInvoiceHtml(
               this.form.gstNumber
             )}
           </p>
         `

         : ''
     }


     ${
       this.form.billingAddress

         ? `
           <p>
             ${this.escapeInvoiceHtml(
               this.form.billingAddress
             )}
           </p>
         `

         : ''
     }

   </div>


   <div class="party-card">

     <h3>
       Ship To
     </h3>

     <strong>
       ${this.escapeInvoiceHtml(
         customerName
       )}
     </strong>

     <p>
       ${this.escapeInvoiceHtml(
         this.form.shippingAddress ||
         this.form.billingAddress ||
         '-'
       )}
     </p>

   </div>

 </section>


 <!-- =============================================
      ITEMS
 ============================================== -->

 <section class="items-section">

   <div class="section-title">
     Invoice Items
   </div>


   <table>

     <thead>

       <tr>
         <th>#</th>
         <th>Description</th>
         <th class="right">Qty</th>
         <th>Unit</th>
         <th class="right">Rate</th>
         <th class="right">Discount</th>
         <th class="right">GST</th>
         <th class="right">Total</th>
       </tr>

     </thead>


     <tbody>
       ${itemRows}
     </tbody>

   </table>

 </section>


 <!-- =============================================
      ADDITIONAL CHARGES
 ============================================== -->

 ${
   additionalChargeRows

     ? `
       <section class="charges-section">

         <div class="section-title">
           Additional Charges
         </div>


         <table class="charges-table">

           <thead>

             <tr>
               <th>Description</th>
               <th class="right">Tax</th>
               <th class="right">Amount</th>
             </tr>

           </thead>


           <tbody>
             ${additionalChargeRows}
           </tbody>

         </table>

       </section>
     `

     : ''
 }


 <!-- =============================================
      TOTALS
 ============================================== -->

 <section class="totals-section">

   <div class="totals-wrap">

     <div class="totals">


       <div class="totals-row">

         <span>
           Items Subtotal
         </span>

         <strong>
           ${this.escapeInvoiceHtml(
             this.formatCurrency(
               this.itemsSubtotal
             )
           )}
         </strong>

       </div>


       <div class="totals-row">

         <span>
           Additional Charges
         </span>

         <strong>
           ${this.escapeInvoiceHtml(
             this.formatCurrency(
               this.additionalChargeSubtotal
             )
           )}
         </strong>

       </div>


       <div class="totals-row">

         <span>
           Overall Discount
         </span>

         <strong>
           -
           ${this.escapeInvoiceHtml(
             this.formatCurrency(
               this.overallDiscountAmount
             )
           )}
         </strong>

       </div>


       <div class="totals-row">

         <span>
           Taxable Amount
         </span>

         <strong>
           ${this.escapeInvoiceHtml(
             this.formatCurrency(
               this.totalBeforeTax
             )
           )}
         </strong>

       </div>


       <div class="totals-row">

         <span>
           Tax Total
         </span>

         <strong>
           ${this.escapeInvoiceHtml(
             this.formatCurrency(
               this.taxTotal
             )
           )}
         </strong>

       </div>


       <div class="totals-row">

         <span>
           Round Off
         </span>

         <strong>
           ${this.escapeInvoiceHtml(
             this.formatCurrency(
               this.form.roundOff
             )
           )}
         </strong>

       </div>


       <div class="totals-row grand">

         <span>
           Invoice Total
         </span>

         <strong>
           ${this.escapeInvoiceHtml(
             this.formatCurrency(
               this.invoiceTotal
             )
           )}
         </strong>

       </div>


       <div class="totals-row">

         <span>
           Amount Received
         </span>

         <strong>
           ${this.escapeInvoiceHtml(
             this.formatCurrency(
               this.form.amountReceived
             )
           )}
         </strong>

       </div>


       <div class="totals-row">

         <span>
           Balance Due
         </span>

         <strong>
           ${this.escapeInvoiceHtml(
             this.formatCurrency(
               this.balanceDue
             )
           )}
         </strong>

       </div>

     </div>

   </div>

 </section>


 <!-- =============================================
      PAYMENT
 ============================================== -->

 <section class="payment-section">

   <div class="section-title">
     Payment Information
   </div>


   <div class="payment-grid">

     <div>

       <small>
         Payment Status
       </small>

       <strong>
         ${this.escapeInvoiceHtml(
           paymentStatus
         )}
       </strong>

     </div>


     <div>

       <small>
         Payment Mode
       </small>

       <strong>
         ${this.escapeInvoiceHtml(
           paymentMode
         )}
       </strong>

     </div>


     <div>

       <small>
         Payment Reference
       </small>

       <strong>
         ${this.escapeInvoiceHtml(
           this.form.paymentReference ||
           '-'
         )}
       </strong>

     </div>


     <div>

       <small>
         Payment Date
       </small>

       <strong>
         ${this.escapeInvoiceHtml(
           this.formatInvoiceDocumentDate(
             this.form.paymentDate
           )
         )}
       </strong>

     </div>


     <div>

       <small>
         Bank
       </small>

       <strong>
         ${this.escapeInvoiceHtml(
           this.form.bankName ||
           '-'
         )}
       </strong>

     </div>


     <div>

       <small>
         Account Number
       </small>

       <strong>
         ${this.escapeInvoiceHtml(
           this.form.accountNumber ||
           '-'
         )}
       </strong>

     </div>

   </div>

 </section>


 ${accountsSection}


 <!-- =============================================
      NOTES
 ============================================== -->

 <section class="notes-section">

   <div class="notes-grid">


     <div class="note-card">

       <div class="section-title">
         Terms & Conditions
       </div>

       <p>
         ${this.escapeInvoiceHtml(
           this.form.termsAndConditions ||
           '-'
         )}
       </p>

     </div>


     <div class="note-card">

       <div class="section-title">
         Remarks
       </div>

       <p>
         ${this.escapeInvoiceHtml(
           this.form.remarks ||
           '-'
         )}
       </p>

     </div>

   </div>

 </section>


 <footer class="invoice-footer">

   <span>
     OPAS BIZZ PRIVATE LIMITED
   </span>

   <span>
     ${this.escapeInvoiceHtml(
       invoiceNumber
     )}
   </span>

 </footer>

</main>

</body>

</html>
 `;
}


/* ============================================================
  INVOICE DOCUMENT DATE
============================================================ */

private formatInvoiceDocumentDate(
 value: unknown
): string {

 if (
   !value
 ) {

   return '-';
 }


 const date =
   new Date(
     String(
       value
     )
   );


 if (
   Number.isNaN(
     date.getTime()
   )
 ) {

   return String(
     value
   );
 }


 return new Intl.DateTimeFormat(
   'en-GB',
   {
     day:
       '2-digit',

     month:
       'short',

     year:
       'numeric'
   }
 )
   .format(
     date
   );
}


/* ============================================================
  ESCAPE HTML FOR INVOICE DOCUMENT
============================================================ */

private escapeInvoiceHtml(
 value: unknown
): string {

 return String(
   value ??
   ''
 )
   .replace(
     /&/g,
     '&amp;'
   )
   .replace(
     /</g,
     '&lt;'
   )
   .replace(
     />/g,
     '&gt;'
   )
   .replace(
     /"/g,
     '&quot;'
   )
   .replace(
     /'/g,
     '&#039;'
   );
}


  /* ============================================================
     SEND CUSTOMER INVOICE
  ============================================================ */

  protected sendInvoice(): void {

    if (
      !this.form.invoiceId
    ) {

      return this.setError(
        'Save the invoice before sending it.'
      );
    }


    if (
      !this.form.email.trim()
    ) {

      return this.setError(
        'Customer email is required.'
      );
    }


    this.message.set(
      'Invoice saved. Email sending endpoint is not configured yet.'
    );


    this.errorMessage.set(
      ''
    );
  }


  /* ============================================================
     INVOICE COPY
  ============================================================ */

  protected onInvoiceCopySelected(
    event: Event
  ): void {

    if (
      !this.ensureEditable()
    ) {

      const input =
        event.target as
          HTMLInputElement;


      input.value =
        '';


      return;
    }


    const input =
      event.target as
        HTMLInputElement;


    const file =
      input.files?.[0] ||
      null;


    if (
      !file
    ) {

      this.selectedInvoiceCopy =
        null;


      return;
    }


    if (
      file.type !==
      'image/jpeg'
    ) {

      this.selectedInvoiceCopy =
        null;


      input.value =
        '';


      this.setError(
        'Only JPG/JPEG invoice copy files are allowed.'
      );


      return;
    }


    this.selectedInvoiceCopy =
      file;


    this.invoiceCopyName =
      file.name;


    this.errorMessage.set(
      ''
    );
  }


  protected uploadInvoiceCopy(): void {

    if (
      !this.ensureEditable()
    ) {

      return;
    }


    if (
      !this.form.invoiceId
    ) {

      this.setError(
        'Save the invoice before uploading invoice copy.'
      );


      return;
    }


    if (
      !this.selectedInvoiceCopy
    ) {

      this.setError(
        'Select an invoice copy first.'
      );


      return;
    }


    this.uploadInvoiceCopyFor(
      this.form.invoiceId,
      true
    );
  }


  /* ============================================================
     RESET

     Existing review records cannot be cleared because this page
     is displaying somebody else's invoice.

     A new unsaved invoice can always be cleared.
  ============================================================ */

  protected resetInvoice(): void {

    if (
      this.isExistingInvoice() &&
      !this.canEditInvoice()
    ) {

      if (
        this.isHandedOff()
      ) {

        this.setError(
          'This invoice has already been sent to Accounts and cannot be cleared or edited.'
        );

      } else {

        this.setError(
          `This invoice was created by ${this.creatorDisplayName()}. Review mode does not allow changes.`
        );
      }


      return;
    }


    if (
      !window.confirm(
        'Clear all invoice details?'
      )
    ) {

      return;
    }


    this.form =
      this.emptyForm();


    this.items = [
      this.emptyItem()
    ];


    this.additionalCharges =
      [];


    this.selectedInvoiceCopy =
      null;


    this.invoiceCopyUrl =
      '';


    this.invoiceCopyName =
      '';


    this.editHistory =
      [];


    this.resetCreatorState();

    this.resetAccountsState();


    this.message.set(
      ''
    );


    this.errorMessage.set(
      ''
    );
  }


  /* ============================================================
     CURRENCY
  ============================================================ */

  protected formatCurrency(
    value: number
  ): string {

    const currency =
      this.form.currency ===
        'other'

        ? (
            this.form.currencyOther
              .trim()
              .toUpperCase() ||
            'INR'
          )

        : (
            this.form.currency ||
            'INR'
          );


    try {

      return new Intl.NumberFormat(
        'en-IN',
        {
          style:
            'currency',

          currency,

          minimumFractionDigits:
            2
        }
      )
        .format(
          this.number(
            value
          )
        );

    } catch {

      return `${currency} ${this.number(
        value
      ).toFixed(
        2
      )}`;
    }
  }


  /* ============================================================
     PERSIST
  ============================================================ */

  private persistInvoice(
    status:
      | 'draft'
      | 'issued'
  ): void {

    if (
      this.isSaving() ||
      this.isLoadingInvoice() ||
      this.invoiceLoadFailed()
    ) {

      return;
    }


    if (
      !this.canEditInvoice()
    ) {

      if (
        this.isHandedOff()
      ) {

        this.setError(
          'This invoice has already been sent to Accounts and cannot be edited from Logistics.'
        );


        window.alert(
          'This invoice has already been sent to Accounts and cannot be edited from Logistics.'
        );

      } else {

        const text =
          `This invoice was created by ${this.creatorDisplayName()}. Only the creator can edit it.`;


        this.setError(
          text
        );


        window.alert(
          text
        );
      }


      return;
    }


    const error =
      this.validate(
        status
      );


    if (
      error
    ) {

      this.setError(
        error
      );


      window.alert(
        error
      );


      return;
    }


    this.isSaving.set(
      true
    );


    this.message.set(
      ''
    );


    this.errorMessage.set(
      ''
    );


    const payload =
      this.buildPayload(
        status
      );


    const request =
      this.form.invoiceId

        ? this.api.patch<InvoiceRow>(
            `/logistics/invoices/${this.form.invoiceId}`,
            payload
          )

        : this.api.post<InvoiceRow>(
            '/logistics/invoices',
            payload
          );


    request.subscribe({

      next: invoice => {

        this.editHistory =
          invoice?.editHistory ||
          [];


        this.form.invoiceId =
          invoice?._id ||
          this.form.invoiceId;


        this.form.invoiceNumber =
          invoice?.invoiceNumber ||
          this.form.invoiceNumber;


        this.applyCreatorState(
          invoice
        );


        this.applyAccountsState(
          invoice
        );


        if (
          invoice?.invoiceCopy
            ?.fileUrl
        ) {

          this.invoiceCopyUrl =
            invoice.invoiceCopy
              .fileUrl;


          this.invoiceCopyName =
            invoice.invoiceCopy
              .originalName ||
            invoice.invoiceCopy
              .fileName ||
            this.invoiceCopyName;
        }


        const text =
          status ===
            'draft'
            ? `Invoice ${this.form.invoiceNumber} saved as draft.`
            : `Invoice ${this.form.invoiceNumber} created successfully.`;


        if (
          this.selectedInvoiceCopy &&
          this.form.invoiceId
        ) {

          this.uploadInvoiceCopyFor(
            this.form.invoiceId,
            false,
            text
          );


          return;
        }


        this.isSaving.set(
          false
        );


        this.message.set(
          text
        );


        window.alert(
          text
        );


        this.loadRecentInvoices();
      },


      error: (
        e: any
      ) => {

        this.isSaving.set(
          false
        );


        const text =
          e?.error?.message ||
          e?.error?.errors?.[0]?.message ||
          'Unable to save Logistics invoice.';


        this.setError(
          text
        );


        window.alert(
          text
        );
      }
    });
  }


  /* ============================================================
     UPLOAD INVOICE COPY
  ============================================================ */

  private uploadInvoiceCopyFor(
    invoiceId: string,
    alertOnSuccess: boolean,
    prefix = ''
  ): void {

    if (
      !this.selectedInvoiceCopy
    ) {

      return;
    }


    if (
      !this.canEditInvoice()
    ) {

      if (
        this.isHandedOff()
      ) {

        this.setError(
          'Invoice Copy cannot be changed after the invoice is sent to Accounts.'
        );

      } else {

        this.setError(
          `Only ${this.creatorDisplayName()} can replace this invoice copy.`
        );
      }


      return;
    }


    const data =
      new FormData();


    data.append(
      'file',
      this.selectedInvoiceCopy
    );


    this.isSaving.set(
      true
    );


    this.api
      .post<InvoiceRow>(
        `/logistics/invoices/${invoiceId}/invoice-copy`,
        data
      )
      .subscribe({

        next: invoice => {

          this.isSaving.set(
            false
          );


          this.selectedInvoiceCopy =
            null;


          this.invoiceCopyUrl =
            invoice?.invoiceCopy?.fileUrl ||
            this.invoiceCopyUrl;


          this.invoiceCopyName =
            invoice?.invoiceCopy?.originalName ||
            invoice?.invoiceCopy?.fileName ||
            this.invoiceCopyName;


          this.applyCreatorState(
            invoice
          );


          this.applyAccountsState(
            invoice
          );


          this.editHistory =
            Array.isArray(
              invoice?.editHistory
            )
              ? invoice.editHistory
              : this.editHistory;


          const text =
            prefix
              ? `${prefix} Invoice copy uploaded.`
              : 'Invoice copy uploaded.';


          this.message.set(
            text
          );


          this.loadRecentInvoices();


          if (
            alertOnSuccess
          ) {

            window.alert(
              text
            );
          }
        },


        error: error => {

          this.isSaving.set(
            false
          );


          const text =
            error?.error?.message ||
            error?.error?.errors?.[0]?.message ||
            'Invoice upload failed.';


          this.setError(
            text
          );


          window.alert(
            text
          );
        }
      });
  }


  /* ============================================================
     VALIDATION
  ============================================================ */

  private validate(
    status:
      | 'draft'
      | 'issued'
  ): string {

    if (
      !this.selectedCustomerName()
    ) {

      return 'Customer is required.';
    }


    if (
      this.form.customer ===
        'other' &&
      !this.form.customerOther
        .trim()
    ) {

      return 'Enter Customer Name because Other is selected.';
    }


    if (
      !this.form.remarks
        .trim()
    ) {

      return 'Remarks are compulsory.';
    }


    if (
      status ===
      'draft'
    ) {

      return '';
    }


    if (
      !this.form.invoiceDate
    ) {

      return 'Invoice Date is required.';
    }


    if (
      !this.form.dueDate
    ) {

      return 'Due Date is required.';
    }


    if (
      new Date(
        this.form.dueDate
      ) <
      new Date(
        this.form.invoiceDate
      )
    ) {

      return 'Due Date cannot be before Invoice Date.';
    }


    if (
      this.form.invoiceType ===
        'other' &&
      !this.form.invoiceTypeOther
        .trim()
    ) {

      return 'Enter Invoice Type because Other is selected.';
    }


    if (
      this.form.shipment ===
        'other' &&
      !this.form.shipmentOther
        .trim()
    ) {

      return 'Enter Shipment Reference because Other is selected.';
    }


    if (
      this.form.currency ===
        'other' &&
      !/^[A-Za-z]{3}$/
        .test(
          this.form.currencyOther
            .trim()
        )
    ) {

      return 'Enter a valid 3-letter Currency Code.';
    }


    if (
      this.form.paymentStatus ===
        'other' &&
      !this.form.paymentStatusOther
        .trim()
    ) {

      return 'Enter Payment Status because Other is selected.';
    }


    if (
      this.form.paymentMode ===
        'other' &&
      !this.form.paymentModeOther
        .trim()
    ) {

      return 'Enter Payment Mode because Other is selected.';
    }


    if (
      !this.items.length
    ) {

      return 'Add at least one invoice item.';
    }


    for (
      let i =
        0;
      i <
        this.items.length;
      i++
    ) {

      const item =
        this.items[i];


      const n =
        i +
        1;


      if (
        !item.description
      ) {

        return `Item ${n}: Service / Charge is required.`;
      }


      if (
        item.description ===
          'other' &&
        !item.descriptionOther
          .trim()
      ) {

        return `Item ${n}: enter Service / Charge because Other is selected.`;
      }


      if (
        this.number(
          item.quantity
        ) <=
        0
      ) {

        return `Item ${n}: Quantity must be greater than zero.`;
      }


      if (
        !item.unit
      ) {

        return `Item ${n}: Unit is required.`;
      }


      if (
        item.unit ===
          'other' &&
        !item.unitOther
          .trim()
      ) {

        return `Item ${n}: enter Unit because Other is selected.`;
      }


      if (
        item.gstRate ===
          'other' &&
        (
          this.itemGstRate(
            item
          ) <
            0 ||
          this.itemGstRate(
            item
          ) >
            100
        )
      ) {

        return `Item ${n}: enter valid GST %.`;
      }
    }


    if (
      this.number(
        this.form.amountReceived
      ) >
      this.invoiceTotal
    ) {

      return 'Amount Received cannot exceed Invoice Total.';
    }


    return '';
  }


  /* ============================================================
     PAYLOAD
  ============================================================ */

  private buildPayload(
    status:
      | 'draft'
      | 'issued'
  ): Record<string, unknown> {

    const customer =
      this.customerRecords.find(
        x =>
          x._id ===
          this.form.customer
      );


    const shipment =
      this.shipmentRecords.find(
        x =>
          x.shipmentNumber ===
          this.form.shipment
      );


    return {

      customerId:
        customer?._id ||
        null,


      customerName:
        this.selectedCustomerName(),


      contactPerson:
        this.form.contactPerson
          .trim(),


      mobile:
        this.form.mobile
          .trim(),


      email:
        this.form.email
          .trim(),


      gstNumber:
        this.form.gstNumber
          .trim(),


      billingAddress:
        this.form.billingAddress
          .trim(),


      shippingAddress:
        this.form.shippingAddress
          .trim(),


      invoiceDate:
        this.form.invoiceDate,


      dueDate:
        this.form.dueDate,


      invoiceType:
        this.form.invoiceType,


      invoiceTypeOther:
        this.form.invoiceType ===
          'other'
          ? this.form.invoiceTypeOther
              .trim()
          : '',


      shipmentId:
        shipment?._id ||
        null,


      shipmentNumber:
        this.form.shipment ===
          'other'
          ? this.form.shipmentOther
              .trim()
              .toUpperCase()
          : this.form.shipment,


      customerReference:
        this.form.customerReference
          .trim(),


      placeOfSupply:
        this.form.placeOfSupply
          .trim(),


      currency:
        this.form.currency ===
          'other'
          ? this.form.currencyOther
              .trim()
              .toUpperCase()
          : this.form.currency,


      reverseCharge:
        this.form.reverseCharge,


      items:
        this.items.map(
          item => ({

            productServiceId:
              item.itemId ||
              null,


            description:
              this.itemDescription(
                item
              ),


            hsnSac:
              item.hsnSac
                .trim(),


            quantity:
              this.number(
                item.quantity
              ),


            unit:
              item.unit,


            unitOther:
              item.unit ===
                'other'
                ? item.unitOther
                    .trim()
                : '',


            rate:
              this.number(
                item.rate
              ),


            discount:
              this.number(
                item.discount
              ),


            gstRate:
              this.itemGstRate(
                item
              ),


            baseAmount:
              this.itemBaseAmount(
                item
              ),


            taxableAmount:
              this.itemTaxableAmount(
                item
              ),


            taxAmount:
              this.itemTaxAmount(
                item
              ),


            total:
              this.itemTotal(
                item
              )
          })
        ),


      additionalCharges:
        this.additionalCharges.map(
          charge => ({

            description:
              charge.description ===
                'other'
                ? charge.descriptionOther
                    .trim()
                : charge.description,


            amount:
              this.number(
                charge.amount
              ),


            taxable:
              charge.taxable ===
              'yes'
          })
        ),


      discountType:
        this.form.discountType,


      overallDiscount:
        this.number(
          this.form.overallDiscount
        ),


      roundOff:
        this.number(
          this.form.roundOff
        ),


      paymentStatus:
        this.form.paymentStatus,


      paymentStatusOther:
        this.form.paymentStatus ===
          'other'
          ? this.form.paymentStatusOther
              .trim()
          : '',


      paymentMode:
        this.form.paymentMode,


      paymentModeOther:
        this.form.paymentMode ===
          'other'
          ? this.form.paymentModeOther
              .trim()
          : '',


      paymentReference:
        this.form.paymentReference
          .trim(),


      paymentDate:
        this.form.paymentDate ||
        null,


      amountReceived:
        this.number(
          this.form.amountReceived
        ),


      bankDetails: {

        bankName:
          this.form.bankName
            .trim(),


        accountName:
          this.form.accountName
            .trim(),


        accountNumber:
          this.form.accountNumber
            .trim(),


        ifscCode:
          this.form.ifscCode
            .trim()
            .toUpperCase(),


        branchName:
          this.form.branchName
            .trim()
      },


      termsAndConditions:
        this.form.termsAndConditions
          .trim(),


      remarks:
        this.form.remarks
          .trim(),


      status,


      itemsSubtotal:
        this.itemsSubtotal,


      additionalChargeSubtotal:
        this.additionalChargeSubtotal,


      overallDiscountAmount:
        this.overallDiscountAmount,


      taxableAmount:
        this.totalBeforeTax,


      taxTotal:
        this.taxTotal,


      invoiceTotal:
        this.invoiceTotal,


      balanceDue:
        this.balanceDue
    };
  }


  /* ============================================================
     LOAD ONE INVOICE

     Backend now applies requester-aware visibility:
     Junior -> own only
     Senior -> department review
  ============================================================ */

  private loadInvoice(
    invoiceId: string
  ): void {

    this.isLoadingInvoice.set(
      true
    );


    this.invoiceLoadFailed.set(
      false
    );


    this.errorMessage.set(
      ''
    );


    this.api
      .get<any>(
        `/logistics/invoices/${invoiceId}`
      )
      .pipe(
        finalize(
          () =>
            this.isLoadingInvoice.set(
              false
            )
        )
      )
      .subscribe({

        next: invoice =>
          this.populateInvoice(
            invoice,
            invoiceId
          ),


        error: (
          error: any
        ) => {

          this.invoiceLoadFailed.set(
            true
          );


          this.setError(
            error?.error?.message ||
            error?.error?.errors?.[0]?.message ||
            'Unable to load invoice.'
          );
        }
      });
  }


  /* ============================================================
     POPULATE EDIT / REVIEW FORM
  ============================================================ */

  private populateInvoice(
    invoice: any,
    invoiceId: string
  ): void {

    this.editHistory =
      Array.isArray(
        invoice?.editHistory
      )
        ? invoice.editHistory
        : [];


    this.applyCreatorState(
      invoice
    );


    this.applyAccountsState(
      invoice
    );


    this.form = {
      ...this.emptyForm(),


      invoiceId:
        invoice?._id ||
        invoiceId,


      customer:
        this.idValue(
          invoice?.customerId
        ) ||
        'other',


      customerOther:
        invoice?.customerName ||
        '',


      contactPerson:
        invoice?.contactPerson ||
        '',


      mobile:
        invoice?.mobile ||
        '',


      email:
        invoice?.email ||
        '',


      gstNumber:
        invoice?.gstNumber ||
        '',


      billingAddress:
        invoice?.billingAddress ||
        '',


      shippingAddress:
        invoice?.shippingAddress ||
        '',


      invoiceNumber:
        invoice?.invoiceNumber ||
        'AUTO',


      invoiceDate:
        this.dateInput(
          invoice?.invoiceDate
        ) ||
        this.today(),


      dueDate:
        this.dateInput(
          invoice?.dueDate
        ) ||
        this.afterDays(
          15
        ),


      invoiceType:
        invoice?.invoiceType ||
        'tax-invoice',


      invoiceTypeOther:
        invoice?.invoiceTypeOther ||
        '',


      shipment:
        invoice?.shipmentNumber ||
        '',


      shipmentOther:
        '',


      customerReference:
        invoice?.customerReference ||
        '',


      placeOfSupply:
        invoice?.placeOfSupply ||
        '',


      currency:
        invoice?.currency ||
        'INR',


      currencyOther:
        '',


      reverseCharge:
        invoice?.reverseCharge ||
        'no',


      discountType:
        invoice?.discountType ||
        'amount',


      overallDiscount:
        Number(
          invoice?.overallDiscount ||
          0
        ),


      roundOff:
        Number(
          invoice?.roundOff ||
          0
        ),


      paymentStatus:
        invoice?.paymentStatus ||
        'unpaid',


      paymentStatusOther:
        invoice?.paymentStatusOther ||
        '',


      paymentMode:
        invoice?.paymentMode ||
        '',


      paymentModeOther:
        invoice?.paymentModeOther ||
        '',


      paymentReference:
        invoice?.paymentReference ||
        '',


      paymentDate:
        this.dateInput(
          invoice?.paymentDate
        ),


      amountReceived:
        Number(
          invoice?.amountReceived ||
          0
        ),


      bankName:
        invoice?.bankDetails
          ?.bankName ||
        '',


      accountName:
        invoice?.bankDetails
          ?.accountName ||
        '',


      accountNumber:
        invoice?.bankDetails
          ?.accountNumber ||
        '',


      ifscCode:
        invoice?.bankDetails
          ?.ifscCode ||
        '',


      branchName:
        invoice?.bankDetails
          ?.branchName ||
        '',


      termsAndConditions:
        invoice?.termsAndConditions ||
        '',


      remarks:
        invoice?.remarks ||
        ''
    };


    this.invoiceCopyUrl =
      invoice?.invoiceCopy
        ?.fileUrl ||
      '';


    this.invoiceCopyName =
      invoice?.invoiceCopy
        ?.originalName ||
      invoice?.invoiceCopy
        ?.fileName ||
      '';


    this.selectedInvoiceCopy =
      null;


    this.items =
      Array.isArray(
        invoice?.items
      ) &&
      invoice.items.length

        ? invoice.items.map(
            (
              item: any
            ) => {

              const productServiceId =
                this.idValue(
                  item?.productServiceId
                );


              const normalizedGst =
                this.normalizeGstRate(
                  item?.gstRate
                );


              return {

                itemId:
                  productServiceId,


                description:
                  productServiceId ||
                  'other',


                descriptionOther:
                  item?.description ||
                  '',


                hsnSac:
                  item?.hsnSac ||
                  '',


                quantity:
                  Number(
                    item?.quantity ||
                    1
                  ),


                unit:
                  item?.unit ||
                  'service',


                unitOther:
                  item?.unitOther ||
                  '',


                rate:
                  Number(
                    item?.rate ||
                    0
                  ),


                discount:
                  Number(
                    item?.discount ||
                    0
                  ),


                gstRate:
                  normalizedGst,


                gstRateOther:
                  normalizedGst ===
                    'other'
                    ? String(
                        item?.gstRate ??
                        ''
                      )
                    : ''
              };
            }
          )

        : [
            this.emptyItem()
          ];


    this.additionalCharges =
      Array.isArray(
        invoice
          ?.additionalCharges
      )

        ? invoice.additionalCharges
            .map(
              (
                charge: any
              ) => ({

                description:
                  'other',


                descriptionOther:
                  charge?.description ||
                  '',


                amount:
                  Number(
                    charge?.amount ||
                    0
                  ),


                taxable:
                  charge?.taxable ===
                    false
                    ? 'no'
                    : 'yes'
              })
            )

        : [];


    /* ========================================================
       SEED CUSTOMER
    ======================================================== */

    const customerId =
      this.idValue(
        invoice?.customerId
      );


    if (
      customerId &&
      !this.customerRecords.some(
        x =>
          x._id ===
          customerId
      )
    ) {

      this.customerRecords.push({
        _id:
          customerId,

        customerName:
          invoice.customerName
      });


      this.customers.unshift({
        value:
          customerId,

        label:
          invoice.customerName ||
          'Customer'
      });
    }


    /* ========================================================
       SEED SHIPMENT
    ======================================================== */

    if (
      invoice.shipmentNumber &&
      !this.shipmentRecords.some(
        x =>
          x.shipmentNumber ===
          invoice.shipmentNumber
      )
    ) {

      this.shipmentRecords.push({
        _id:
          this.idValue(
            invoice.shipmentId
          ) ||
          undefined,

        shipmentNumber:
          invoice.shipmentNumber
      });


      this.shipmentOptions.unshift({
        value:
          invoice.shipmentNumber,

        label:
          invoice.shipmentNumber
      });
    }


    /* ========================================================
       SEED PRODUCT / SERVICE OPTIONS
    ======================================================== */

    for (
      const item of
      invoice.items ||
      []
    ) {

      const productServiceId =
        this.idValue(
          item?.productServiceId
        );


      if (
        productServiceId &&
        !this.serviceOptions.some(
          x =>
            x.value ===
            productServiceId
        )
      ) {

        this.serviceOptions.unshift({
          value:
            productServiceId,

          label:
            item.description ||
            'Item'
        });
      }
    }


    this.applyOwnershipMessage();
  }


  /* ============================================================
     CREATOR STATE
  ============================================================ */

  private applyCreatorState(
    invoice: any
  ): void {

    const employee =
      this.objectValue<CreatorEmployee>(
        invoice
          ?.createdByEmployeeId
      );


    const user =
      this.objectValue<CreatorUser>(
        invoice?.createdBy
      );


    this.creatorEmployeeId.set(
      this.idValue(
        invoice
          ?.createdByEmployeeId
      )
    );


    this.creatorUserId.set(
      this.idValue(
        invoice?.createdBy
      )
    );


    this.creatorName.set(
      this.personName(
        employee
      ) ||
      this.personName(
        user
      ) ||
      ''
    );


    this.creatorEmployeeCode.set(
      String(
        employee?.employeeCode ||
        ''
      ).trim()
    );


    this.creatorDesignation.set(
      String(
        employee?.designation ||
        ''
      ).trim()
    );
  }


  private resetCreatorState(): void {

    this.creatorUserId.set(
      ''
    );

    this.creatorEmployeeId.set(
      ''
    );

    this.creatorName.set(
      ''
    );

    this.creatorEmployeeCode.set(
      ''
    );

    this.creatorDesignation.set(
      ''
    );
  }


  /* ============================================================
     ACCOUNTS STATE
  ============================================================ */

  private applyAccountsState(
    invoice: any
  ): void {

    this.accountsHandoffId.set(
      invoice?.accountsHandoffId
        ? this.idValue(
            invoice
              .accountsHandoffId
          )
        : null
    );


    this.accountsStatus.set(
      this.normalizeAccountsStatus(
        invoice?.accountsStatus
      )
    );


    this.accountsHandedOffAt.set(
      invoice?.accountsHandedOffAt ||
      null
    );


    this.accountsPaidAmount.set(
      this.number(
        invoice
          ?.accountsPaidAmount
      )
    );


    this.accountsRemainingAmount.set(
      this.number(
        invoice
          ?.accountsRemainingAmount
      )
    );


    this.accountsPaymentReference.set(
      String(
        invoice
          ?.accountsPaymentReference ||
        ''
      )
    );


    this.accountsPaymentDate.set(
      invoice?.accountsPaymentDate ||
      null
    );


    this.accountsPaidByName.set(
      String(
        invoice
          ?.accountsPaidByName ||
        ''
      )
    );
  }


  private resetAccountsState(): void {

    this.accountsHandoffId.set(
      null
    );

    this.accountsStatus.set(
      null
    );

    this.accountsHandedOffAt.set(
      null
    );


    this.accountsPaidAmount.set(
      0
    );

    this.accountsRemainingAmount.set(
      0
    );


    this.accountsPaymentReference.set(
      ''
    );

    this.accountsPaymentDate.set(
      null
    );

    this.accountsPaidByName.set(
      ''
    );
  }


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
      ? status as
          AccountsStatus
      : null;
  }


  /* ============================================================
     EDIT PROTECTION

     New invoice:
       editable

     Own existing invoice:
       editable until handoff

     Senior viewing junior invoice:
       review-only

     Handed-off:
       read-only
  ============================================================ */

  private ensureEditable(
    showMessage =
      true
  ): boolean {

    if (
      this.canEditInvoice()
    ) {

      return true;
    }


    if (
      showMessage
    ) {

      if (
        this.isHandedOff()
      ) {

        this.setError(
          'This invoice has already been sent to Accounts and cannot be edited from Logistics.'
        );

      } else if (
        this.isExistingInvoice()
      ) {

        this.setError(
          `This invoice was created by ${this.creatorDisplayName()}. Only the creator can edit it.`
        );

      } else {

        this.setError(
          'Invoice editing is currently unavailable.'
        );
      }
    }


    return false;
  }


  /* ============================================================
     DATE
  ============================================================ */

  private dateInput(
    value: unknown
  ): string {

    if (
      !value
    ) {

      return '';
    }


    const date =
      new Date(
        String(
          value
        )
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return '';
    }


    return date
      .toISOString()
      .slice(
        0,
        10
      );
  }


  /* ============================================================
     CUSTOMERS
  ============================================================ */

  private loadCustomers(): void {

    this.api
      .get<PageResult<CustomerRow>>(
        '/logistics/customers',
        {
          page:
            1,

          limit:
            100,

          status:
            'active'
        }
      )
      .subscribe({

        next: response => {

          const rows =
            this.extractRows<CustomerRow>(
              response
            );


          this.customerRecords = [
            ...rows,

            ...this.customerRecords.filter(
              existing =>
                !rows.some(
                  row =>
                    row._id ===
                    existing._id
                )
            )
          ];


          this.customers = [

            ...this.customerRecords
              .filter(
                row =>
                  row._id
              )
              .map(
                row => ({
                  label:
                    row.customerName ||
                    row.companyName ||
                    'Customer',

                  value:
                    row._id!
                })
              ),

            {
              label:
                'Other',

              value:
                'other'
            }
          ];
        },


        error: () => {

          /*
           * Preserve seeded/current references.
           */
        }
      });
  }


  /* ============================================================
     SHIPMENTS
  ============================================================ */

  private loadShipments(): void {

    this.api
      .get<PageResult<ShipmentRow>>(
        '/logistics/shipments',
        {
          page:
            1,

          limit:
            100,

          sortBy:
            'createdAt',

          sortOrder:
            'desc'
        }
      )
      .subscribe({

        next: response => {

          const rows =
            this.extractRows<ShipmentRow>(
              response
            );


          this.shipmentRecords = [
            ...rows,

            ...this.shipmentRecords.filter(
              existing =>
                !rows.some(
                  row =>
                    row.shipmentNumber ===
                    existing.shipmentNumber
                )
            )
          ];


          this.shipmentOptions = [

            ...this.shipmentRecords
              .filter(
                row =>
                  row.shipmentNumber
              )
              .map(
                row => ({
                  label:
                    this.shipmentLabel(
                      row
                    ),

                  value:
                    row.shipmentNumber!
                })
              ),

            {
              label:
                'Other',

              value:
                'other'
            }
          ];
        },


        error: () => {

          /*
           * Preserve currently seeded shipment options.
           */
        }
      });
  }


  /* ============================================================
     PRODUCTS / SERVICES
  ============================================================ */

  private loadItems(): void {

    this.api
      .get<PageResult<ItemRow>>(
        '/logistics/products-services',
        {
          page:
            1,

          limit:
            100,

          status:
            'active'
        }
      )
      .subscribe({

        next: response => {

          this.itemRecords =
            this.extractRows<ItemRow>(
              response
            );


          this.serviceOptions = [

            ...this.itemRecords
              .filter(
                row =>
                  row._id
              )
              .map(
                row => ({
                  label:
                    `${row.name || row.itemCode || 'Item'}${row.itemType ? ` (${row.itemType})` : ''}`,

                  value:
                    row._id!
                })
              ),

            ...this.serviceOptions.filter(
              option =>
                !this.itemRecords.some(
                  row =>
                    row._id ===
                    option.value
                )
            )
          ];
        },


        error: () => {

          /*
           * Existing preset service options remain available.
           */
        }
      });
  }


  /* ============================================================
     RECENT INVOICES

     Backend now automatically returns:
     Junior -> own records
     Senior -> department review records
  ============================================================ */

  private loadRecentInvoices(): void {

    this.api
      .get<PageResult<InvoiceRow>>(
        '/logistics/invoices',
        {
          page:
            1,

          limit:
            3,

          sortBy:
            'createdAt',

          sortOrder:
            'desc'
        }
      )
      .subscribe({

        next: response =>
          this.recentInvoices.set(
            this.extractRows<InvoiceRow>(
              response
            )
          ),


        error: () =>
          this.recentInvoices.set(
            []
          )
      });
  }


  /* ============================================================
     GENERIC ROW EXTRACTION
  ============================================================ */

  private extractRows<T>(
    response:
      | PageResult<T>
      | T[]
      | null
      | undefined
  ): T[] {

    if (
      Array.isArray(
        response
      )
    ) {

      return response;
    }


    const data =
      response?.data;


    if (
      Array.isArray(
        data
      )
    ) {

      return data;
    }


    return (
      data?.data ||
      data?.records ||
      data?.customers ||
      data?.shipments ||
      data?.productsServices ||
      data?.services ||
      data?.items ||
      response?.records ||
      response?.customers ||
      response?.shipments ||
      response?.productsServices ||
      response?.services ||
      response?.items ||
      []
    );
  }


  /* ============================================================
     ADDRESS
  ============================================================ */

  private formatAddress(
    address:
      CustomerRow['billingAddress']
  ): string {

    if (
      !address
    ) {

      return '';
    }


    return [
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.country,
      address.pincode
    ]
      .filter(
        Boolean
      )
      .join(
        ', '
      );
  }


  /* ============================================================
     CUSTOMER NAME
  ============================================================ */

  private selectedCustomerName(): string {

    if (
      this.form.customer ===
      'other'
    ) {

      return this.form
        .customerOther
        .trim();
    }


    const customer =
      this.customerRecords.find(
        row =>
          row._id ===
          this.form.customer
      );


    return (
      customer?.customerName ||
      customer?.companyName ||
      ''
    )
      .trim();
  }


  /* ============================================================
     ITEM DESCRIPTION
  ============================================================ */

  private itemDescription(
    item: InvoiceItem
  ): string {

    if (
      item.description ===
      'other'
    ) {

      return item
        .descriptionOther
        .trim();
    }


    const live =
      this.itemRecords.find(
        row =>
          row._id ===
          item.description
      );


    if (
      live?.name
    ) {

      return live.name;
    }


    return (
      this.serviceOptions.find(
        option =>
          option.value ===
          item.description
      )?.label ||
      item.description
    );
  }


  /* ============================================================
     SHIPMENT LABEL

     Supports both strings and location objects.

     Prevents [object Object] in dropdown.
  ============================================================ */

  private shipmentLabel(
    shipment: ShipmentRow
  ): string {

    const from =
      this.formatShipmentLocation(
        shipment.route?.origin ||
        shipment.origin
      );


    const to =
      this.formatShipmentLocation(
        shipment.route?.destination ||
        shipment.destination
      );


    const shipmentNumber =
      shipment.shipmentNumber ||
      'Shipment';


    if (
      !from &&
      !to
    ) {

      return shipmentNumber;
    }


    return `${shipmentNumber} - ${from || '?'} → ${to || '?'}`;
  }


  private formatShipmentLocation(
    location:
      | string
      | ShipmentLocation
      | null
      | undefined
  ): string {

    if (
      !location
    ) {

      return '';
    }


    if (
      typeof location ===
      'string'
    ) {

      return location
        .trim();
    }


    const directName =
      location.locationName ||
      location.name;


    if (
      directName
    ) {

      return String(
        directName
      ).trim();
    }


    const parts = [
      location.address,
      location.addressLine1,
      location.addressLine2,
      location.city,
      location.state,
      location.country,
      location.pincode ||
        location.postalCode
    ]
      .map(
        value =>
          String(
            value ||
            ''
          ).trim()
      )
      .filter(
        Boolean
      );


    return [
      ...new Set(
        parts
      )
    ]
      .join(
        ', '
      );
  }


  /* ============================================================
     GST NORMALIZATION
  ============================================================ */

  private normalizeGstRate(
    value: unknown
  ): string {

    const gst =
      String(
        value ??
        '18'
      );


    return this.gstRates.some(
      rate =>
        rate.value ===
        gst
    )
      ? gst
      : 'other';
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
    )
      .trim();
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
     EMPTY FORM
  ============================================================ */

  private emptyForm() {

    return {
      invoiceId:
        '',


      customer:
        '',

      customerOther:
        '',


      contactPerson:
        '',

      mobile:
        '',

      email:
        '',

      gstNumber:
        '',


      billingAddress:
        '',

      shippingAddress:
        '',


      invoiceNumber:
        'AUTO',


      invoiceDate:
        this.today(),


      dueDate:
        this.afterDays(
          15
        ),


      invoiceType:
        'tax-invoice',


      invoiceTypeOther:
        '',


      shipment:
        '',


      shipmentOther:
        '',


      customerReference:
        '',


      placeOfSupply:
        '',


      currency:
        'INR',


      currencyOther:
        '',


      reverseCharge:
        'no',


      discountType:
        'amount',


      overallDiscount:
        0,


      roundOff:
        0,


      paymentStatus:
        'unpaid',


      paymentStatusOther:
        '',


      paymentMode:
        '',


      paymentModeOther:
        '',


      paymentReference:
        '',


      paymentDate:
        '',


      amountReceived:
        0,


      bankName:
        '',


      accountName:
        '',


      accountNumber:
        '',


      ifscCode:
        '',


      branchName:
        '',


      termsAndConditions:
        'Payment is due within the agreed credit period. Subject to applicable jurisdiction.',


      remarks:
        ''
    };
  }


  /* ============================================================
     EMPTY ITEM
  ============================================================ */

  private emptyItem(): InvoiceItem {

    return {
      itemId:
        '',

      description:
        '',

      descriptionOther:
        '',

      hsnSac:
        '',

      quantity:
        1,

      unit:
        'service',

      unitOther:
        '',

      rate:
        0,

      discount:
        0,

      gstRate:
        '18',

      gstRateOther:
        ''
    };
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
     DATE HELPERS
  ============================================================ */

  private today(): string {

    return new Date()
      .toISOString()
      .slice(
        0,
        10
      );
  }


  private afterDays(
    days: number
  ): string {

    const date =
      new Date();


    date.setDate(
      date.getDate() +
      days
    );


    return date
      .toISOString()
      .slice(
        0,
        10
      );
  }


  /* ============================================================
     ERROR
  ============================================================ */

  private setError(
    text: string
  ): void {

    this.message.set(
      ''
    );


    this.errorMessage.set(
      text
    );
  }
}