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