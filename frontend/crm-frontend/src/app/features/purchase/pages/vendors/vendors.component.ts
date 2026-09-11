import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnInit
  } from '@angular/core';
  
  import {
    CommonModule
  } from '@angular/common';
  
  import {
    FormsModule
  } from '@angular/forms';
  
  import {
    finalize
  } from 'rxjs/operators';
  
  import {
    PurchaseVendorOption
  } from '../../models/purchase.models';
  
  import {
    PurchaseReferenceService
  } from '../../services/purchase-reference.service';
  
  
  /* ============================================================
     PURCHASE VENDOR VIEW MODEL
  
     Existing PurchaseVendorOption is preserved.
  
     These optional fields are returned by the read-only
     /purchase/vendors endpoint and are required only for the
     Purchase Vendor Master display.
  ============================================================ */
  
  interface PurchaseVendorView
    extends PurchaseVendorOption {
  
    gstNumber?: string;
  
    paymentTerms?: string;
  
    currency?: string;
  
    status?: string;

    addedBy?: string;

    sourceDepartment?: string;

    addedOn?: string | null;
  
  }
  
  
  @Component({
    selector: 'app-vendors',
  
    standalone: true,
  
    imports: [
      CommonModule,
      FormsModule
    ],
  
    templateUrl:
      './vendors.component.html',
  
    styleUrl:
      './vendors.component.scss',
  
    changeDetection:
      ChangeDetectionStrategy.OnPush
  })
  export class VendorsComponent
    implements OnInit {
  
  
    /* ============================================================
       STATE
    ============================================================ */
  
    loading =
      false;
  
    errorMessage =
      '';
  
    searchTerm =
      '';

    saving = false;

    formOpen = false;

    successMessage = '';

    vendorForm = this.emptyVendorForm();
  
  
    /* ============================================================
       DATA
    ============================================================ */
  
    vendors:
      PurchaseVendorView[] = [];
  
  
    constructor(
      private readonly purchaseReferenceService:
        PurchaseReferenceService,
  
      private readonly cdr:
        ChangeDetectorRef
    ) {}
  
  
    /* ============================================================
       INIT
    ============================================================ */
  
    ngOnInit():
      void {
  
      this.loadVendors();
    }
  
  
    /* ============================================================
       LOAD VENDORS
    ============================================================ */
  
    loadVendors():
      void {
  
      if (
        this.loading
      ) {
  
        return;
      }
  
  
      this.loading =
        true;
  
      this.errorMessage =
        '';
  
  
      this.purchaseReferenceService
        .getVendors(
          this.searchTerm
        )
        .pipe(
          finalize(
            () => {
  
              this.loading =
                false;
  
              this.cdr.markForCheck();
  
            }
          )
        )
        .subscribe({
  
          next:
            (
              vendors
            ) => {
  
              this.vendors =
                Array.isArray(
                  vendors
                )
                  ? vendors as PurchaseVendorView[]
                  : [];
  
              this.cdr.markForCheck();
  
            },
  
          error:
            (
              error
            ) => {
  
              this.vendors =
                [];
  
              this.errorMessage =
                this.resolveErrorMessage(
                  error,
                  'Unable to load vendors.'
                );
  
              this.cdr.markForCheck();
  
            }
  
        });
    }
  
  
    /* ============================================================
       SEARCH
    ============================================================ */
  
    search():
      void {
  
      if (
        this.loading
      ) {
  
        return;
      }
  
  
      this.searchTerm =
        String(
          this.searchTerm ||
          ''
        )
          .trim();
  
  
      this.loadVendors();
    }
  
  
    onSearchKeydown(
      event:
        KeyboardEvent
    ):
      void {
  
      if (
        event.key !==
        'Enter'
      ) {
  
        return;
      }
  
  
      event.preventDefault();
  
      this.search();
    }
  
  
    clearSearch():
      void {
  
      if (
        this.loading
      ) {
  
        return;
      }
  
  
      if (
        !String(
          this.searchTerm ||
          ''
        )
          .trim()
      ) {
  
        return;
      }
  
  
      this.searchTerm =
        '';
  
      this.loadVendors();
    }
  
  
    refresh():
      void {
  
      if (
        this.loading
      ) {
  
        return;
      }
  
  
      this.loadVendors();
    }


    openVendorForm(): void {
      this.vendorForm = this.emptyVendorForm();
      this.errorMessage = '';
      this.successMessage = '';
      this.formOpen = true;
    }


    closeVendorForm(): void {
      if (!this.saving) this.formOpen = false;
    }


    createVendor(): void {
      if (this.saving) return;

      this.saving = true;
      this.errorMessage = '';

      const value = this.vendorForm;
      this.purchaseReferenceService.createVendor({
        vendorType: 'supplier',
        vendorName: value.vendorName,
        companyName: value.companyName,
        contactPerson: value.contactPerson,
        mobile: value.mobile,
        email: value.email,
        gstType: value.gstType,
        gstNumber: value.gstNumber,
        panNumber: value.panNumber,
        address: { addressLine1: value.addressLine1, city: value.city, state: value.state, country: 'India', pincode: value.pincode },
        serviceCategory: 'goods',
        paymentTerms: value.paymentTerms,
        creditDays: Number(value.creditDays || 0),
        openingPayable: Number(value.openingPayable || 0),
        currency: 'INR',
        preferredPaymentMode: value.preferredPaymentMode,
        preferredPaymentModeOther: value.preferredPaymentMode === 'other' ? value.preferredPaymentModeOther : '',
        bankDetails: { accountHolderName: value.accountHolderName, bankName: value.bankName, accountNumber: value.accountNumber, ifscCode: value.ifscCode },
        remarks: value.remarks,
        status: 'active'
      }).pipe(finalize(() => { this.saving = false; this.cdr.markForCheck(); })).subscribe({
        next: () => { this.formOpen = false; this.successMessage = 'Vendor added to the shared Vendor Master.'; this.loadVendors(); },
        error: error => { this.errorMessage = this.resolveErrorMessage(error, 'Unable to add vendor.'); this.cdr.markForCheck(); }
      });
    }
  
  
    /* ============================================================
       SUMMARY
    ============================================================ */
  
    get totalVendors():
      number {
  
      return this.vendors.length;
    }
  
  
    get activeVendors():
      number {
  
      return this.vendors
        .filter(
          (
            vendor
          ) =>
            this.isVendorActive(
              vendor
            )
        )
        .length;
    }
  
  
    get vendorsWithGst():
      number {
  
      return this.vendors
        .filter(
          (
            vendor
          ) =>
            Boolean(
              String(
                vendor.gstNumber ||
                ''
              )
                .trim()
            )
        )
        .length;
    }
  
  
    get vendorsWithEmail():
      number {
  
      return this.vendors
        .filter(
          (
            vendor
          ) =>
            Boolean(
              String(
                vendor.email ||
                ''
              )
                .trim()
            )
        )
        .length;
    }
  
  
    /* ============================================================
       DISPLAY HELPERS
    ============================================================ */
  
    vendorDisplayName(
      vendor:
        PurchaseVendorView
    ):
      string {
  
      const vendorName =
        String(
          vendor.vendorName ||
          ''
        )
          .trim();
  
  
      if (
        vendorName
      ) {
  
        return vendorName;
      }
  
  
      const companyName =
        String(
          vendor.companyName ||
          ''
        )
          .trim();
  
  
      if (
        companyName
      ) {
  
        return companyName;
      }
  
  
      const name =
        String(
          vendor.name ||
          ''
        )
          .trim();
  
  
      return (
        name ||
        'Vendor'
      );
    }
  
  
    vendorCompanyName(
      vendor:
        PurchaseVendorView
    ):
      string {
  
      const companyName =
        String(
          vendor.companyName ||
          ''
        )
          .trim();
  
  
      const vendorName =
        String(
          vendor.vendorName ||
          vendor.name ||
          ''
        )
          .trim();
  
  
      if (
        !companyName
      ) {
  
        return '—';
      }
  
  
      if (
        companyName
          .toLowerCase() ===
        vendorName
          .toLowerCase()
      ) {
  
        return '—';
      }
  
  
      return companyName;
    }
  
  
    vendorCode(
      vendor:
        PurchaseVendorView
    ):
      string {
  
      return (
        String(
          vendor.vendorCode ||
          ''
        )
          .trim() ||
        '—'
      );
    }
  
  
    contactPerson(
      vendor:
        PurchaseVendorView
    ):
      string {
  
      return (
        String(
          vendor.contactPerson ||
          ''
        )
          .trim() ||
        '—'
      );
    }
  
  
    mobile(
      vendor:
        PurchaseVendorView
    ):
      string {
  
      const mobile =
        String(
          vendor.mobile ||
          ''
        )
          .trim();
  
  
      if (
        mobile
      ) {
  
        return mobile;
      }
  
  
      const phone =
        String(
          vendor.phone ||
          ''
        )
          .trim();
  
  
      return (
        phone ||
        '—'
      );
    }
  
  
    email(
      vendor:
        PurchaseVendorView
    ):
      string {
  
      return (
        String(
          vendor.email ||
          ''
        )
          .trim() ||
        '—'
      );
    }
  
  
    gstNumber(
      vendor:
        PurchaseVendorView
    ):
      string {
  
      return (
        String(
          vendor.gstNumber ||
          ''
        )
          .trim()
          .toUpperCase() ||
        '—'
      );
    }
  
  
    paymentTerms(
      vendor:
        PurchaseVendorView
    ):
      string {
  
      return (
        String(
          vendor.paymentTerms ||
          ''
        )
          .trim() ||
        '—'
      );
    }
  
  
    currency(
      vendor:
        PurchaseVendorView
    ):
      string {
  
      return (
        String(
          vendor.currency ||
          ''
        )
          .trim()
          .toUpperCase() ||
        'INR'
      );
    }
  
  
    vendorStatus(
      vendor:
        PurchaseVendorView
    ):
      string {
  
      if (
        vendor.isActive ===
        false
      ) {
  
        return 'Inactive';
      }
  
  
      const status =
        String(
          vendor.status ||
          ''
        )
          .trim();
  
  
      if (
        status
      ) {
  
        return this.toTitleCase(
          status
        );
      }
  
  
      return 'Active';
    }
  
  
    isVendorActive(
      vendor:
        PurchaseVendorView
    ):
      boolean {
  
      if (
        vendor.isActive ===
        false
      ) {
  
        return false;
      }
  
  
      const status =
        String(
          vendor.status ||
          ''
        )
          .trim()
          .toLowerCase()
          .replace(
            /[\s_-]+/g,
            ''
          );
  
  
      if (
        !status
      ) {
  
        return true;
      }
  
  
      return [
        'active',
        'approved',
        'verified'
      ]
        .includes(
          status
        );
    }
  
  
    trackByVendorId(
      index:
        number,
  
      vendor:
        PurchaseVendorView
    ):
      string {
  
      return (
        String(
          vendor._id ||
          ''
        )
          .trim() ||
        String(
          index
        )
      );
    }


    addedBy(vendor: PurchaseVendorView): string {
      return String(vendor.addedBy || '').trim() || 'Not Available';
    }


    sourceDepartment(vendor: PurchaseVendorView): string {
      return String(vendor.sourceDepartment || '').trim() || 'Not Available';
    }


    private emptyVendorForm() {
      return {
        vendorName: '', companyName: '', contactPerson: '', mobile: '', email: '',
        gstType: 'registered', gstNumber: '', panNumber: '', addressLine1: '', city: '', state: '', pincode: '',
        paymentTerms: '', creditDays: 0, openingPayable: 0, preferredPaymentMode: 'bank_transfer', preferredPaymentModeOther: '',
        accountHolderName: '', bankName: '', accountNumber: '', ifscCode: '', remarks: ''
      };
    }
  
  
    /* ============================================================
       PRIVATE HELPERS
    ============================================================ */
  
    private toTitleCase(
      value:
        string
    ):
      string {
  
      return String(
        value ||
        ''
      )
        .replace(
          /[_-]+/g,
          ' '
        )
        .replace(
          /\s+/g,
          ' '
        )
        .trim()
        .replace(
          /\b\w/g,
          (
            character
          ) =>
            character
              .toUpperCase()
        );
    }
  
  
    private resolveErrorMessage(
      error:
        any,
  
      fallback:
        string
    ):
      string {
  
      return (
        error?.error?.message ||
        error?.error?.error?.message ||
        error?.message ||
        fallback
      );
    }
  
  }
