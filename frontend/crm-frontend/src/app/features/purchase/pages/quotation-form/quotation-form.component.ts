import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import {
  Observable,
  finalize,
  forkJoin
} from 'rxjs';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  PurchaseQuotation,
  PurchaseQuotationPayload,
  PurchaseRequest,
  PurchaseVendorOption,
  VendorEnquiry
} from '../../models/purchase.models';

import {
  PurchaseQuotationService
} from '../../services/purchase-quotation.service';

import {
  PurchaseRequestService
} from '../../services/purchase-request.service';

import {
  VendorEnquiryService
} from '../../services/vendor-enquiry.service';

import {
  ApiService
} from '../../../../core/services/api.service';


type QuotationItemForm =
  FormGroup<{

    itemId:
      FormControl<string | null>;

    itemName:
      FormControl<string>;

    description:
      FormControl<string>;

    quantity:
      FormControl<number>;

    unit:
      FormControl<string>;

    unitPrice:
      FormControl<number>;

    taxPercent:
      FormControl<number>;

  }>;


@Component({
  selector: 'app-quotation-form',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],

  templateUrl:
    './quotation-form.component.html',

  styleUrl:
    './quotation-form.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class QuotationFormComponent
  implements OnInit {

  /* ============================================================
     DEPENDENCIES
  ============================================================ */

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly cdr =
    inject(ChangeDetectorRef);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly quotationService =
    inject(PurchaseQuotationService);

  private readonly purchaseRequestService =
    inject(PurchaseRequestService);

  private readonly vendorEnquiryService =
    inject(VendorEnquiryService);

  private readonly api =
    inject(ApiService);


  /* ============================================================
     DATA
  ============================================================ */

  approvedPurchaseRequests:
    PurchaseRequest[] = [];


  receivedVendorEnquiries:
    VendorEnquiry[] = [];


  vendors:
    PurchaseVendorOption[] = [];


  currentQuotation:
    PurchaseQuotation |
    null = null;


  quotationId:
    string |
    null = null;


  isEditMode =
    false;


  /* ============================================================
     STATE
  ============================================================ */

  isLoading =
    false;


  isReferenceLoading =
    false;


  isSaving =
    false;


  errorMessage =
    '';


  successMessage =
    '';


  /* ============================================================
     FORM
  ============================================================ */

  readonly form =
    new FormGroup({

      purchaseRequestId:
        new FormControl<string>(
          '',
          {
            nonNullable: true
          }
        ),

      vendorEnquiryId:
        new FormControl<string>(
          '',
          {
            nonNullable: true
          }
        ),

      vendorId:
        new FormControl<string>(
          '',
          {
            nonNullable: true,
            validators: [
              Validators.required
            ]
          }
        ),

      quotationDate:
        new FormControl<string>(
          this.todayInputValue(),
          {
            nonNullable: true
          }
        ),

      items:
        new FormArray<
          QuotationItemForm
        >([]),

      freightCharges:
        new FormControl<number>(
          0,
          {
            nonNullable: true,
            validators: [
              Validators.min(0)
            ]
          }
        ),

      otherCharges:
        new FormControl<number>(
          0,
          {
            nonNullable: true,
            validators: [
              Validators.min(0)
            ]
          }
        ),

      deliveryTime:
        new FormControl<string>(
          '',
          {
            nonNullable: true
          }
        ),

      paymentTerms:
        new FormControl<string>(
          '',
          {
            nonNullable: true
          }
        ),

      validUntil:
        new FormControl<string>(
          '',
          {
            nonNullable: true
          }
        ),

      remarks:
        new FormControl<string>(
          '',
          {
            nonNullable: true
          }
        )

    });


  /* ============================================================
     GETTERS
  ============================================================ */

  get items():
    FormArray<QuotationItemForm> {

    return this.form.controls.items;
  }


  get pageTitle():
    string {

    return this.isEditMode
      ? 'Edit Purchase Quotation'
      : 'New Purchase Quotation';
  }


  get pageSubtitle():
    string {

    return this.isEditMode
      ? 'Update vendor quotation details and pricing.'
      : 'Record vendor pricing, taxes and commercial terms.';
  }


  /* ============================================================
     INIT
  ============================================================ */

  ngOnInit():
    void {

    this.quotationId =
      this.route
        .snapshot
        .paramMap
        .get('id');


    this.isEditMode =
      Boolean(
        this.quotationId
      );


    this.setupReferenceChanges();

    this.setupCalculationChanges();

    this.loadReferences();


    if (
      this.quotationId
    ) {

      this.loadQuotation(
        this.quotationId
      );

    } else {

      this.addItem();
    }
  }


  /* ============================================================
     ITEM FORM
  ============================================================ */

  private createItemForm(
    item?: {
      itemId?: string | null;
      itemName?: string;
      description?: string;
      quantity?: number;
      unit?: string;
      unitPrice?: number;
      taxPercent?: number;
    }
  ):
    QuotationItemForm {

    return new FormGroup({

      itemId:
        new FormControl<
          string |
          null
        >(
          item?.itemId ??
          null
        ),

      itemName:
        new FormControl<string>(
          item?.itemName ??
          '',
          {
            nonNullable: true,
            validators: [
              Validators.required,
              Validators.maxLength(180)
            ]
          }
        ),

      description:
        new FormControl<string>(
          item?.description ??
          '',
          {
            nonNullable: true
          }
        ),

      quantity:
        new FormControl<number>(
          Number(
            item?.quantity ??
            1
          ),
          {
            nonNullable: true,
            validators: [
              Validators.required,
              Validators.min(
                0.000001
              )
            ]
          }
        ),

      unit:
        new FormControl<string>(
          item?.unit ??
          '',
          {
            nonNullable: true,
            validators: [
              Validators.required
            ]
          }
        ),

      unitPrice:
        new FormControl<number>(
          Number(
            item?.unitPrice ??
            0
          ),
          {
            nonNullable: true,
            validators: [
              Validators.required,
              Validators.min(0)
            ]
          }
        ),

      taxPercent:
        new FormControl<number>(
          Number(
            item?.taxPercent ??
            0
          ),
          {
            nonNullable: true,
            validators: [
              Validators.min(0),
              Validators.max(100)
            ]
          }
        )

    });
  }


  addItem():
    void {

    this.items.push(
      this.createItemForm()
    );


    this.cdr.markForCheck();
  }


  removeItem(
    index:
      number
  ):
    void {

    if (
      this.items.length <=
      1
    ) {

      this.errorMessage =
        'At least one quotation item is required.';

      this.cdr.markForCheck();

      return;
    }


    this.items.removeAt(
      index
    );


    this.cdr.markForCheck();
  }


  /* ============================================================
     REFERENCE CHANGE EVENTS
  ============================================================ */

  private setupReferenceChanges():
    void {

    this.form.controls
      .purchaseRequestId
      .valueChanges
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe(
        purchaseRequestId => {

          if (
            !purchaseRequestId
          ) {

            return;
          }


          const request =
            this.approvedPurchaseRequests
              .find(
                item =>
                  item._id ===
                  purchaseRequestId
              );


          if (
            !request
          ) {

            return;
          }


          this.populateFromPurchaseRequest(
            request
          );
        }
      );


    this.form.controls
      .vendorEnquiryId
      .valueChanges
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe(
        enquiryId => {

          if (
            !enquiryId
          ) {

            return;
          }


          const enquiry =
            this.receivedVendorEnquiries
              .find(
                item =>
                  item._id ===
                  enquiryId
              );


          if (
            !enquiry
          ) {

            return;
          }


          this.populateFromVendorEnquiry(
            enquiry
          );
        }
      );
  }


  /* ============================================================
     CALCULATION CHANGE
  ============================================================ */

  private setupCalculationChanges():
    void {

    this.form.valueChanges
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe(
        () => {

          this.cdr.markForCheck();
        }
      );
  }


  /* ============================================================
     PURCHASE REQUEST AUTO FILL
  ============================================================ */

  private populateFromPurchaseRequest(
    request:
      PurchaseRequest
  ):
    void {

    if (
      this.items.length ===
      0
    ) {

      this.addItem();
    }


    const firstItem =
      this.items.at(0);


    firstItem.patchValue({

      itemName:
        request.itemName ||
        '',

      quantity:
        Number(
          request.requiredQuantity ||
          1
        ),

      unit:
        request.unit ||
        ''

    }, {
      emitEvent:
        false
    });


    this.cdr.markForCheck();
  }


  /* ============================================================
     VENDOR ENQUIRY AUTO FILL
  ============================================================ */

  private populateFromVendorEnquiry(
    enquiry:
      VendorEnquiry
  ):
    void {

    const vendorId =
      this.extractVendorIdFromEnquiry(
        enquiry
      );


    if (
      vendorId
    ) {

      this.form.controls
        .vendorId
        .setValue(
          vendorId,
          {
            emitEvent:
              false
          }
        );
    }


    const purchaseRequestId =
      this.extractPurchaseRequestIdFromEnquiry(
        enquiry
      );


    if (
      purchaseRequestId
    ) {

      this.form.controls
        .purchaseRequestId
        .setValue(
          purchaseRequestId,
          {
            emitEvent:
              false
          }
        );
    }


    while (
      this.items.length >
      1
    ) {

      this.items.removeAt(
        this.items.length -
        1
      );
    }


    if (
      this.items.length ===
      0
    ) {

      this.addItem();
    }


    this.items
      .at(0)
      .patchValue({

        itemName:
          enquiry.itemName ||
          '',

        quantity:
          Number(
            enquiry.quantity ||
            1
          ),

        unit:
          enquiry.unit ||
          '',

        unitPrice:
          Number(
            enquiry.quotedPrice ??
            0
          ),

        taxPercent:
          Number(
            enquiry.taxPercent ??
            0
          )

      }, {
        emitEvent:
          false
      });


    this.form.patchValue({

      deliveryTime:
        enquiry.deliveryTime ||
        '',

      paymentTerms:
        enquiry.paymentTerms ||
        '',

      validUntil:
        this.toDateInputValue(
          enquiry.validUntil
        ),

      remarks:
        enquiry.remarks ||
        ''

    }, {
      emitEvent:
        false
    });


    this.cdr.markForCheck();
  }


  /* ============================================================
     LOAD REFERENCES
  ============================================================ */

  private loadReferences():
    void {

    this.isReferenceLoading =
      true;


    this.cdr.markForCheck();


    forkJoin({

      purchaseRequests:
        this.purchaseRequestService
          .getPurchaseRequests({

            status:
              'approved',

            page:
              1,

            limit:
              100

          }),

      vendorEnquiries:
        this.vendorEnquiryService
          .getVendorEnquiries({

            status:
              'received',

            page:
              1,

            limit:
              100

          }),

      vendors:
        this.loadVendorOptions()

    })
      .pipe(

        finalize(
          () => {

            this.isReferenceLoading =
              false;

            this.cdr.markForCheck();
          }
        ),

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe({

        next:
          response => {

            const prRows =
              response
                .purchaseRequests
                ?.rows;


            this.approvedPurchaseRequests =
              Array.isArray(
                prRows
              )
                ? prRows
                : [];


            this.receivedVendorEnquiries =
              Array.isArray(
                response
                  .vendorEnquiries
                  ?.rows
              )
                ? response
                    .vendorEnquiries
                    .rows
                : [];


            this.vendors =
              Array.isArray(
                response.vendors
              )
                ? response.vendors
                : [];


            if (
              this.currentQuotation
            ) {

              this.patchQuotation(
                this.currentQuotation
              );
            }


            this.cdr.markForCheck();
          },


        error:
          error => {

            this.errorMessage =
              this.getErrorMessage(
                error,
                'Unable to load quotation reference data.'
              );


            this.cdr.markForCheck();
          }

      });
  }


  /* ============================================================
     EXISTING VENDOR MASTER REUSE
  ============================================================ */

  private loadVendorOptions():
  Observable<PurchaseVendorOption[]> {

  return new Observable<
    PurchaseVendorOption[]
  >(
    subscriber => {

      const subscription =
        this.api
          .get<any>(
            '/purchase/vendors',
            {
              page:
                1,

              limit:
                100
            }
          )
          .subscribe({

            next:
              response => {

                const rows =
                  this.extractVendorRows(
                    response
                  );


                const vendors =
                  rows
                    .map(
                      vendor =>
                        this.mapVendor(
                          vendor
                        )
                    )
                    .filter(
                      (
                        vendor
                      ):
                        vendor is
                          PurchaseVendorOption =>
                        vendor !==
                        null
                    );


                subscriber.next(
                  vendors
                );


                subscriber.complete();
              },


            error:
              error => {

                subscriber.error(
                  error
                );
              }

          });


      return () =>
        subscription.unsubscribe();
    }
  );
}


  private extractVendorRows(
    response:
      any
  ):
    any[] {

    if (
      Array.isArray(
        response
      )
    ) {

      return response;
    }


    if (
      Array.isArray(
        response?.rows
      )
    ) {

      return response.rows;
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
        response?.data
      )
    ) {

      return response.data;
    }


    if (
      Array.isArray(
        response?.data?.rows
      )
    ) {

      return response.data.rows;
    }


    if (
      Array.isArray(
        response?.data?.vendors
      )
    ) {

      return response.data.vendors;
    }


    return [];
  }


  private mapVendor(
    vendor:
      any
  ):
    PurchaseVendorOption |
    null {

    const id =
      String(
        vendor?._id ||
        vendor?.id ||
        ''
      ).trim();


    if (
      !id
    ) {

      return null;
    }


    return {

      _id:
        id,

      name:
        String(
          vendor?.vendorName ||
          vendor?.companyName ||
          vendor?.name ||
          'Vendor'
        ),

      vendorName:
        vendor?.vendorName,

      vendorCode:
        vendor?.vendorCode,

      companyName:
        vendor?.companyName,

      contactPerson:
        vendor?.contactPerson,

      phone:
        vendor?.phone ||
        vendor?.mobile,

      mobile:
        vendor?.mobile,

      email:
        vendor?.email,

      address:
        vendor?.address,

      city:
        vendor?.city,

      state:
        vendor?.state,

      country:
        vendor?.country,

      isActive:
        vendor?.isActive

    };
  }


  /* ============================================================
     LOAD QUOTATION
  ============================================================ */

  private loadQuotation(
    quotationId:
      string
  ):
    void {

    this.isLoading =
      true;


    this.cdr.markForCheck();


    this.quotationService
      .getQuotationById(
        quotationId
      )
      .pipe(

        finalize(
          () => {

            this.isLoading =
              false;

            this.cdr.markForCheck();
          }
        ),

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe({

        next:
          quotation => {

            this.currentQuotation =
              quotation;


            this.patchQuotation(
              quotation
            );


            this.cdr.markForCheck();
          },


        error:
          error => {

            this.errorMessage =
              this.getErrorMessage(
                error,
                'Unable to load quotation.'
              );


            this.cdr.markForCheck();
          }

      });
  }


  /* ============================================================
     PATCH QUOTATION
  ============================================================ */

  private patchQuotation(
    quotation:
      PurchaseQuotation
  ):
    void {

    this.items.clear();


    const quotationItems =
      Array.isArray(
        quotation.items
      )
        ? quotation.items
        : [];


    for (
      const item of
      quotationItems
    ) {

      this.items.push(
        this.createItemForm({

          itemId:
            item.itemId ??
            null,

          itemName:
            item.itemName,

          description:
            item.description,

          quantity:
            item.quantity,

          unit:
            item.unit,

          unitPrice:
            item.unitPrice,

          taxPercent:
            item.taxPercent

        })
      );
    }


    if (
      this.items.length ===
      0
    ) {

      this.addItem();
    }


    this.form.patchValue({

      purchaseRequestId:
        this.extractReferenceId(
          quotation.purchaseRequest
        ),

      vendorEnquiryId:
        this.extractReferenceId(
          quotation.vendorEnquiry
        ),

      vendorId:
        this.extractReferenceId(
          quotation.vendor
        ),

      quotationDate:
        this.toDateInputValue(
          quotation.quotationDate
        ) ||
        this.todayInputValue(),

      freightCharges:
        Number(
          quotation.freightCharges ||
          0
        ),

      otherCharges:
        Number(
          quotation.otherCharges ||
          0
        ),

      deliveryTime:
        quotation.deliveryTime ||
        '',

      paymentTerms:
        quotation.paymentTerms ||
        '',

      validUntil:
        this.toDateInputValue(
          quotation.validUntil
        ),

      remarks:
        quotation.remarks ||
        ''

    }, {
      emitEvent:
        false
    });


    /*
     * Requested quotations may still be editable.
     * Selected / rejected quotations are read-only.
     */

    if (
      quotation.status ===
        'selected' ||
      quotation.status ===
        'rejected'
    ) {

      this.form.disable({
        emitEvent:
          false
      });

    } else {

      this.form.enable({
        emitEvent:
          false
      });
    }


    this.cdr.markForCheck();
  }


  /* ============================================================
     CALCULATIONS
  ============================================================ */

  getLineSubtotal(
    index:
      number
  ):
    number {

    const item =
      this.items
        .at(index)
        .getRawValue();


    return (
      this.toNumber(
        item.quantity
      ) *
      this.toNumber(
        item.unitPrice
      )
    );
  }


  getLineTax(
    index:
      number
  ):
    number {

    const subtotal =
      this.getLineSubtotal(
        index
      );


    const taxPercent =
      this.toNumber(
        this.items
          .at(index)
          .controls
          .taxPercent
          .value
      );


    return (
      subtotal *
      taxPercent /
      100
    );
  }


  getLineTotal(
    index:
      number
  ):
    number {

    return (
      this.getLineSubtotal(
        index
      ) +
      this.getLineTax(
        index
      )
    );
  }


  get subtotal():
    number {

    return this.items.controls
      .reduce(
        (
          total,
          _item,
          index
        ) =>
          total +
          this.getLineSubtotal(
            index
          ),
        0
      );
  }


  get taxTotal():
    number {

    return this.items.controls
      .reduce(
        (
          total,
          _item,
          index
        ) =>
          total +
          this.getLineTax(
            index
          ),
        0
      );
  }


  get freightCharges():
    number {

    return this.toNumber(
      this.form.controls
        .freightCharges
        .value
    );
  }


  get otherCharges():
    number {

    return this.toNumber(
      this.form.controls
        .otherCharges
        .value
    );
  }


  get grandTotal():
    number {

    return (
      this.subtotal +
      this.taxTotal +
      this.freightCharges +
      this.otherCharges
    );
  }


  /* ============================================================
     SAVE
  ============================================================ */

  save():
    void {

    if (
      this.isSaving ||
      this.isReadOnly
    ) {

      return;
    }


    this.clearMessages();


    if (
      this.form.invalid ||
      this.items.length ===
        0
    ) {

      this.form.markAllAsTouched();


      this.errorMessage =
        'Please complete all required quotation fields correctly.';


      this.cdr.markForCheck();

      return;
    }


    const value =
      this.form.getRawValue();


    const payload:
      PurchaseQuotationPayload = {

        purchaseRequestId:
          value.purchaseRequestId ||
          null,

        vendorEnquiryId:
          value.vendorEnquiryId ||
          null,

        vendorId:
          value.vendorId.trim(),

        quotationDate:
          value.quotationDate ||
          undefined,

        items:
          value.items.map(
            item => ({

              itemId:
                item.itemId ||
                null,

              itemName:
                item.itemName.trim(),

              description:
                item.description.trim(),

              quantity:
                Number(
                  item.quantity
                ),

              unit:
                item.unit.trim(),

              unitPrice:
                Number(
                  item.unitPrice
                ),

              taxPercent:
                Number(
                  item.taxPercent ||
                  0
                )

            })
          ),

        freightCharges:
          Number(
            value.freightCharges ||
            0
          ),

        otherCharges:
          Number(
            value.otherCharges ||
            0
          ),

        deliveryTime:
          value.deliveryTime.trim(),

        paymentTerms:
          value.paymentTerms.trim(),

        validUntil:
          value.validUntil ||
          null,

        remarks:
          value.remarks.trim()

      };


    this.isSaving =
      true;


    this.cdr.markForCheck();


    const request$ =
      this.isEditMode &&
      this.quotationId

        ? this.quotationService
            .updateQuotation(
              this.quotationId,
              payload
            )

        : this.quotationService
            .createQuotation(
              payload
            );


    request$
      .pipe(

        finalize(
          () => {

            this.isSaving =
              false;

            this.cdr.markForCheck();
          }
        ),

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe({

        next:
          quotation => {

            this.currentQuotation =
              quotation;


            this.successMessage =
              this.isEditMode
                ? 'Quotation updated successfully.'
                : 'Quotation created successfully.';


            this.cdr.markForCheck();


            void this.router.navigate([
              '/purchase/quotations'
            ]);
          },


        error:
          error => {

            this.errorMessage =
              this.getErrorMessage(
                error,
                this.isEditMode
                  ? 'Unable to update quotation.'
                  : 'Unable to create quotation.'
              );


            this.cdr.markForCheck();
          }

      });
  }


  /* ============================================================
     DISPLAY HELPERS
  ============================================================ */

  get isReadOnly():
    boolean {

    return Boolean(
      this.currentQuotation &&
      (
        this.currentQuotation.status ===
          'selected' ||
        this.currentQuotation.status ===
          'rejected'
      )
    );
  }


  get selectedVendor():
    PurchaseVendorOption |
    null {

    const vendorId =
      this.form.controls
        .vendorId
        .value;


    return (
      this.vendors.find(
        vendor =>
          vendor._id ===
          vendorId
      ) ||
      null
    );
  }


  formatMoney(
    value:
      number |
      null |
      undefined
  ):
    string {

    return new Intl.NumberFormat(
      'en-IN',
      {
        style:
          'currency',

        currency:
          'INR',

        maximumFractionDigits:
          2
      }
    ).format(
      this.toNumber(
        value
      )
    );
  }


  cancel():
    void {

    void this.router.navigate([
      '/purchase/quotations'
    ]);
  }


  clearMessages():
    void {

    this.successMessage =
      '';

    this.errorMessage =
      '';
  }


  /* ============================================================
     REFERENCE HELPERS
  ============================================================ */

  private extractReferenceId(
    value:
      any
  ):
    string {

    if (
      !value
    ) {

      return '';
    }


    if (
      typeof value ===
      'string'
    ) {

      return value;
    }


    return String(
      value?._id ||
      value?.id ||
      ''
    );
  }


  private extractVendorIdFromEnquiry(
    enquiry:
      VendorEnquiry
  ):
    string {

    const directId =
      (enquiry as any)
        ?.vendorId;


    if (
      directId
    ) {

      return String(
        directId
      );
    }


    return this.extractReferenceId(
      enquiry.vendor
    );
  }


  private extractPurchaseRequestIdFromEnquiry(
    enquiry:
      VendorEnquiry
  ):
    string {

    const directId =
      (enquiry as any)
        ?.purchaseRequestId;


    if (
      directId
    ) {

      return String(
        directId
      );
    }


    return this.extractReferenceId(
      enquiry.purchaseRequest
    );
  }


  /* ============================================================
     NUMBER
  ============================================================ */

  private toNumber(
    value:
      unknown
  ):
    number {

    const number =
      Number(
        value
      );


    return Number.isFinite(
      number
    )
      ? number
      : 0;
  }


  /* ============================================================
     ERROR
  ============================================================ */

  private getErrorMessage(
    error:
      any,
    fallback:
      string
  ):
    string {

    return (
      error?.error?.message ||
      error?.message ||
      fallback
    );
  }


  /* ============================================================
     DATE HELPERS
  ============================================================ */

  private todayInputValue():
    string {

    const date =
      new Date();


    return this.dateToInputValue(
      date
    );
  }


  private toDateInputValue(
    value:
      string |
      null |
      undefined
  ):
    string {

    if (
      !value
    ) {

      return '';
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

      return '';
    }


    return this.dateToInputValue(
      date
    );
  }


  private dateToInputValue(
    date:
      Date
  ):
    string {

    const year =
      date.getFullYear();


    const month =
      String(
        date.getMonth() +
        1
      ).padStart(
        2,
        '0'
      );


    const day =
      String(
        date.getDate()
      ).padStart(
        2,
        '0'
      );


    return `${year}-${month}-${day}`;
  }

}
