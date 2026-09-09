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
  FormBuilder,
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
  PurchaseRequest,
  PurchaseVendorOption,
  VendorEnquiry,
  VendorEnquiryPayload,
  VendorEnquirySource,
  VENDOR_ENQUIRY_SOURCE_OPTIONS
} from '../../models/purchase.models';

import {
  VendorEnquiryService
} from '../../services/vendor-enquiry.service';

import {
  PurchaseRequestService
} from '../../services/purchase-request.service';

import {
  ApiService
} from '../../../../core/services/api.service';


@Component({
  selector: 'app-vendor-enquiry-form',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],

  templateUrl:
    './vendor-enquiry-form.component.html',

  styleUrl:
    './vendor-enquiry-form.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class VendorEnquiryFormComponent
  implements OnInit {

  /* ============================================================
     DEPENDENCIES
  ============================================================ */

  private readonly fb =
    inject(FormBuilder);

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly cdr =
    inject(ChangeDetectorRef);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly vendorEnquiryService =
    inject(VendorEnquiryService);

  private readonly purchaseRequestService =
    inject(PurchaseRequestService);

  private readonly api =
    inject(ApiService);


  /* ============================================================
     OPTIONS
  ============================================================ */

  readonly sourceOptions =
    VENDOR_ENQUIRY_SOURCE_OPTIONS;


  approvedPurchaseRequests:
    PurchaseRequest[] = [];


  vendors:
    PurchaseVendorOption[] = [];


  /* ============================================================
     PAGE STATE
  ============================================================ */

  enquiryId:
    string |
    null = null;


  isEditMode =
    false;


  isLoading =
    false;


  isSaving =
    false;


  isReferenceLoading =
    false;


  errorMessage =
    '';


  successMessage =
    '';


  currentEnquiry:
    VendorEnquiry |
    null = null;


  /* ============================================================
     FORM
  ============================================================ */

  readonly form =
    this.fb.group({

      purchaseRequestId: [
        ''
      ],

      vendorId: [
        '',
        [
          Validators.required
        ]
      ],

      contactPerson: [
        ''
      ],

      phone: [
        ''
      ],

      email: [
        '',
        [
          Validators.email
        ]
      ],

      source: [
        'direct_supplier' as VendorEnquirySource,
        [
          Validators.required
        ]
      ],

      otherSource: [
        ''
      ],

      itemName: [
        '',
        [
          Validators.required,
          Validators.maxLength(180)
        ]
      ],

      quantity: [
        1,
        [
          Validators.required,
          Validators.min(0.000001)
        ]
      ],

      unit: [
        '',
        [
          Validators.required
        ]
      ],

      quotedPrice: [
        null as number | null,
        [
          Validators.min(0)
        ]
      ],

      taxPercent: [
        null as number | null,
        [
          Validators.min(0),
          Validators.max(100)
        ]
      ],

      deliveryTime: [
        ''
      ],

      paymentTerms: [
        ''
      ],

      validUntil: [
        ''
      ],

      remarks: [
        ''
      ]

    });


  /* ============================================================
     INIT
  ============================================================ */

  ngOnInit(): void {

    this.enquiryId =
      this.route
        .snapshot
        .paramMap
        .get('id');


    this.isEditMode =
      Boolean(
        this.enquiryId
      );


    this.setupOtherSourceValidation();

    this.setupVendorSelection();

    this.setupPurchaseRequestSelection();

    this.loadReferences();


    if (
      this.enquiryId
    ) {

      this.loadEnquiry(
        this.enquiryId
      );
    }
  }


  /* ============================================================
     OTHER SOURCE VALIDATION
  ============================================================ */

  private setupOtherSourceValidation():
    void {

    this.form.controls
      .source
      .valueChanges
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe(
        source => {

          this.applyOtherSourceValidation(
            source as VendorEnquirySource
          );

          this.cdr.markForCheck();
        }
      );


    this.applyOtherSourceValidation(
      this.form.controls
        .source
        .value as VendorEnquirySource
    );
  }


  private applyOtherSourceValidation(
    source: VendorEnquirySource
  ):
    void {

    const control =
      this.form.controls
        .otherSource;


    if (
      source ===
      'other'
    ) {

      control.setValidators([
        Validators.required,
        Validators.maxLength(120)
      ]);

    } else {

      control.clearValidators();

      control.setValue(
        '',
        {
          emitEvent:
            false
        }
      );
    }


    control.updateValueAndValidity({
      emitEvent:
        false
    });
  }


  /* ============================================================
     VENDOR SELECTION
  ============================================================ */

  private setupVendorSelection():
    void {

    this.form.controls
      .vendorId
      .valueChanges
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe(
        vendorId => {

          if (
            !vendorId
          ) {
            return;
          }


          const vendor =
            this.vendors.find(
              item =>
                item._id ===
                vendorId
            );


          if (
            !vendor
          ) {
            return;
          }


          this.form.patchValue({

            contactPerson:
              vendor.contactPerson ||
              '',

            phone:
              vendor.phone ||
              vendor.mobile ||
              '',

            email:
              vendor.email ||
              ''

          }, {
            emitEvent:
              false
          });


          this.cdr.markForCheck();
        }
      );
  }


  /* ============================================================
     PURCHASE REQUEST SELECTION
  ============================================================ */

  private setupPurchaseRequestSelection():
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


          const purchaseRequest =
            this.approvedPurchaseRequests
              .find(
                item =>
                  item._id ===
                  purchaseRequestId
              );


          if (
            !purchaseRequest
          ) {
            return;
          }


          this.form.patchValue({

            itemName:
              purchaseRequest
                .itemName ||
              '',

            quantity:
              Number(
                purchaseRequest
                  .requiredQuantity ||
                1
              ),

            unit:
              purchaseRequest
                .unit ||
              ''

          }, {
            emitEvent:
              false
          });


          this.cdr.markForCheck();
        }
      );
  }


  /* ============================================================
     LOAD REFERENCE DATA
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

            /*
             * Purchase Request response shape:
             *
             * {
             *   success: true,
             *   data: {
             *     rows: [],
             *     pagination: {}
             *   }
             * }
             */

            const purchaseRequestRows =
              response
                .purchaseRequests
                ?.rows;


            this.approvedPurchaseRequests =
              Array.isArray(
                purchaseRequestRows
              )
                ? purchaseRequestRows
                : [];


            this.vendors =
              Array.isArray(
                response.vendors
              )
                ? response.vendors
                : [];


            if (
              this.currentEnquiry
            ) {

              this.patchCurrentEnquiry(
                this.currentEnquiry
              );
            }


            this.cdr.markForCheck();
          },


        error:
          error => {

            this.errorMessage =
              this.getErrorMessage(
                error,
                'Unable to load Purchase references.'
              );


            this.cdr.markForCheck();
          }

      });
  }


  /* ============================================================
     EXISTING VENDOR MASTER
  ============================================================ */

  /* ============================================================
  EXISTING VENDOR MASTER
  Purchase-safe read-only reference endpoint
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
             page: 1,
             limit: 100
           }
         )
         .subscribe({

           next:
             response => {

               const rawRows =
                 this.extractVendorRows(
                   response
                 );


               const vendors =
                 rawRows
                   .map(
                     vendor =>
                       this.mapVendorOption(
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


     return () => {

       subscription.unsubscribe();
     };
   }
 );
}


  /* ============================================================
     VENDOR RESPONSE NORMALIZER
  ============================================================ */

  private extractVendorRows(
    response: any
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


  /* ============================================================
     MAP VENDOR OPTION
  ============================================================ */

  private mapVendorOption(
    vendor: any
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


    const name =
      String(
        vendor?.vendorName ||
        vendor?.companyName ||
        vendor?.name ||
        'Vendor'
      ).trim();


    return {

      _id:
        id,

      name,

      vendorName:
        vendor?.vendorName ||
        undefined,

      vendorCode:
        vendor?.vendorCode ||
        undefined,

      companyName:
        vendor?.companyName ||
        undefined,

      contactPerson:
        vendor?.contactPerson ||
        undefined,

      phone:
        vendor?.phone ||
        vendor?.mobile ||
        undefined,

      mobile:
        vendor?.mobile ||
        undefined,

      email:
        vendor?.email ||
        undefined,

      address:
        vendor?.address ||
        undefined,

      city:
        vendor?.city ||
        undefined,

      state:
        vendor?.state ||
        undefined,

      country:
        vendor?.country ||
        undefined,

      isActive:
        vendor?.isActive

    };
  }


  /* ============================================================
     LOAD EXISTING ENQUIRY
  ============================================================ */

  private loadEnquiry(
    enquiryId: string
  ):
    void {

    this.isLoading =
      true;

    this.errorMessage =
      '';

    this.cdr.markForCheck();


    this.vendorEnquiryService
      .getVendorEnquiryById(
        enquiryId
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
          enquiry => {

            this.currentEnquiry =
              enquiry;


            this.patchCurrentEnquiry(
              enquiry
            );


            this.cdr.markForCheck();
          },


        error:
          error => {

            this.errorMessage =
              this.getErrorMessage(
                error,
                'Unable to load vendor enquiry.'
              );


            this.cdr.markForCheck();
          }

      });
  }


  /* ============================================================
     PATCH EDIT FORM
  ============================================================ */

  private patchCurrentEnquiry(
    enquiry: VendorEnquiry
  ):
    void {

    this.form.patchValue({

      purchaseRequestId:
        enquiry.purchaseRequestId ||
        '',

      vendorId:
        enquiry.vendorId ||
        '',

      contactPerson:
        enquiry.contactPerson ||
        '',

      phone:
        enquiry.phone ||
        '',

      email:
        enquiry.email ||
        '',

      source:
        enquiry.source,

      otherSource:
        enquiry.otherSource ||
        '',

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

      quotedPrice:
        enquiry.quotedPrice ??
        null,

      taxPercent:
        enquiry.taxPercent ??
        null,

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


    this.applyOtherSourceValidation(
      enquiry.source
    );


    if (
      enquiry.status !==
      'draft'
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


      this.applyOtherSourceValidation(
        enquiry.source
      );
    }


    this.cdr.markForCheck();
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
      this.form.invalid
    ) {

      this.form.markAllAsTouched();


      this.errorMessage =
        'Please complete all required fields correctly.';


      this.cdr.markForCheck();

      return;
    }


    const value =
      this.form.getRawValue();


    const source =
      value.source as
        VendorEnquirySource;


    if (
      source ===
        'other' &&
      !String(
        value.otherSource ||
        ''
      ).trim()
    ) {

      this.form.controls
        .otherSource
        .markAsTouched();


      this.errorMessage =
        'Please enter the Other Source details.';


      this.cdr.markForCheck();

      return;
    }


    const payload:
      VendorEnquiryPayload = {

        purchaseRequestId:
          value.purchaseRequestId ||
          null,

        vendorId:
          String(
            value.vendorId ||
            ''
          ).trim(),

        contactPerson:
          String(
            value.contactPerson ||
            ''
          ).trim(),

        phone:
          String(
            value.phone ||
            ''
          ).trim(),

        email:
          String(
            value.email ||
            ''
          ).trim(),

        source,

        ...(source ===
          'other'
          ? {
              otherSource:
                String(
                  value.otherSource ||
                  ''
                ).trim()
            }
          : {}),

        itemName:
          String(
            value.itemName ||
            ''
          ).trim(),

        quantity:
          Number(
            value.quantity
          ),

        unit:
          String(
            value.unit ||
            ''
          ).trim(),

        quotedPrice:
          value.quotedPrice ===
            null ||
          value.quotedPrice ===
            undefined
            ? null
            : Number(
                value.quotedPrice
              ),

        taxPercent:
          value.taxPercent ===
            null ||
          value.taxPercent ===
            undefined
            ? null
            : Number(
                value.taxPercent
              ),

        deliveryTime:
          String(
            value.deliveryTime ||
            ''
          ).trim(),

        paymentTerms:
          String(
            value.paymentTerms ||
            ''
          ).trim(),

        validUntil:
          value.validUntil ||
          null,

        remarks:
          String(
            value.remarks ||
            ''
          ).trim()

      };


    this.isSaving =
      true;

    this.cdr.markForCheck();


    const request$ =
      this.isEditMode &&
      this.enquiryId

        ? this.vendorEnquiryService
            .updateVendorEnquiry(
              this.enquiryId,
              payload
            )

        : this.vendorEnquiryService
            .createVendorEnquiry(
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
          enquiry => {

            this.currentEnquiry =
              enquiry;


            this.successMessage =
              this.isEditMode
                ? 'Vendor enquiry updated successfully.'
                : 'Vendor enquiry created successfully.';


            this.cdr.markForCheck();


            void this.router.navigate([
              '/purchase/vendor-enquiries'
            ]);
          },


        error:
          error => {

            this.errorMessage =
              this.getErrorMessage(
                error,
                this.isEditMode
                  ? 'Unable to update vendor enquiry.'
                  : 'Unable to create vendor enquiry.'
              );


            this.cdr.markForCheck();
          }

      });
  }


  /* ============================================================
     CANCEL
  ============================================================ */

  cancel():
    void {

    void this.router.navigate([
      '/purchase/vendor-enquiries'
    ]);
  }


  /* ============================================================
     DISPLAY HELPERS
  ============================================================ */

  get pageTitle():
    string {

    return this.isEditMode
      ? 'Edit Vendor Enquiry'
      : 'New Vendor Enquiry';
  }


  get pageSubtitle():
    string {

    return this.isEditMode
      ? 'Update the draft vendor enquiry details.'
      : 'Create a vendor enquiry and prepare an RFQ.';
  }


  get isOtherSource():
    boolean {

    return (
      this.form.controls
        .source
        .value ===
      'other'
    );
  }


  get isReadOnly():
    boolean {

    return Boolean(
      this.currentEnquiry &&
      this.currentEnquiry.status !==
        'draft'
    );
  }


  get selectedVendor():
    PurchaseVendorOption |
    null {

    const vendorId =
      this.form.controls
        .vendorId
        .value;


    return this.vendors
      .find(
        vendor =>
          vendor._id ===
          vendorId
      ) ||
      null;
  }


  get selectedPurchaseRequest():
    PurchaseRequest |
    null {

    const purchaseRequestId =
      this.form.controls
        .purchaseRequestId
        .value;


    return this
      .approvedPurchaseRequests
      .find(
        request =>
          request._id ===
          purchaseRequestId
      ) ||
      null;
  }


  clearMessages():
    void {

    this.errorMessage =
      '';

    this.successMessage =
      '';
  }


  /* ============================================================
     ERROR
  ============================================================ */

  private getErrorMessage(
    error: any,
    fallback: string
  ):
    string {

    return (
      error?.error?.message ||
      error?.message ||
      fallback
    );
  }


  /* ============================================================
     DATE FORMAT
  ============================================================ */

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
