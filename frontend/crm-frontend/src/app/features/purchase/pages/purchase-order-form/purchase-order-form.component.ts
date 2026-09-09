import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  Subject,
  finalize,
  forkJoin,
  takeUntil
} from 'rxjs';

import {
  PurchaseOrder,
  PurchaseOrderPayload,
  PurchaseQuotation,
  PurchaseQuotationItem,
  PurchaseVendorOption,
  PurchaseWarehouseOption,
  VendorEnquiry
} from '../../models/purchase.models';

import {
  PurchaseOrderService
} from '../../services/purchase-order.service';

import {
  PurchaseQuotationService
} from '../../services/purchase-quotation.service';

import {
  PurchaseReferenceService
} from '../../services/purchase-reference.service';


@Component({
  selector:
    'app-purchase-order-form',

  standalone:
    true,

  imports: [
    CommonModule,
    ReactiveFormsModule
  ],

  templateUrl:
    './purchase-order-form.component.html',

  styleUrl:
    './purchase-order-form.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class PurchaseOrderFormComponent
  implements OnInit, OnDestroy {

  /* ============================================================
     FORM
  ============================================================ */

  readonly form:
    FormGroup;


  /* ============================================================
     DATA
  ============================================================ */

  selectedQuotation:
    PurchaseQuotation |
    null =
    null;


  purchaseOrder:
    PurchaseOrder |
    null =
    null;


  quotations:
    PurchaseQuotation[] =
    [];


  warehouses:
    PurchaseWarehouseOption[] =
    [];


  /* ============================================================
     ROUTE STATE
  ============================================================ */

  purchaseOrderId =
    '';


  quotationId =
    '';


  purchaseRequestId =
    '';


  isEditMode =
    false;


  /* ============================================================
     UI STATE
  ============================================================ */

  isLoading =
    false;


  isLoadingReferences =
    false;


  isLoadingQuotation =
    false;


  isSaving =
    false;


  errorMessage =
    '';


  successMessage =
    '';


  /* ============================================================
     DESTROY
  ============================================================ */

  private readonly destroy$ =
    new Subject<void>();


  constructor(
    private readonly fb:
      FormBuilder,

    private readonly purchaseOrderService:
      PurchaseOrderService,

    private readonly quotationService:
      PurchaseQuotationService,

    private readonly referenceService:
      PurchaseReferenceService,

    private readonly route:
      ActivatedRoute,

    private readonly router:
      Router,

    private readonly cdr:
      ChangeDetectorRef
  ) {

    this.form =
      this.fb.group({

        quotationId: [
          '',
          [
            Validators.required
          ]
        ],

        purchaseRequestId: [
          ''
        ],

        vendorId: [
          ''
        ],

        vendorEnquiryId: [
          ''
        ],

        poDate: [
          this.today(),
          [
            Validators.required
          ]
        ],

        warehouseId: [
          '',
          [
            Validators.required
          ]
        ],

        deliveryAddress: [
          '',
          [
            Validators.required,
            Validators.maxLength(
              1000
            )
          ]
        ],

        expectedDeliveryDate: [
          '',
          [
            Validators.required
          ]
        ],

        paymentTerms: [
          '',
          [
            Validators.maxLength(
              500
            )
          ]
        ],

        freightCharges: [
          0,
          [
            Validators.min(
              0
            )
          ]
        ],

        otherCharges: [
          0,
          [
            Validators.min(
              0
            )
          ]
        ],

        remarks: [
          '',
          [
            Validators.maxLength(
              2000
            )
          ]
        ],

        items:
          this.fb.array(
            []
          )

      });
  }


  /* ============================================================
     GETTERS
  ============================================================ */

  get items():
    FormArray {

    return this.form
      .get(
        'items'
      ) as FormArray;
  }


  get pageTitle():
    string {

    if (
      this.isEditMode
    ) {

      return (
        this.purchaseOrder
          ?.poNumber
          ? `Edit ${this.purchaseOrder.poNumber}`
          : 'Edit Purchase Order'
      );
    }


    return 'Create Purchase Order';
  }


  get pageSubtitle():
    string {

    if (
      this.isEditMode
    ) {

      return 'Update delivery, warehouse and draft Purchase Order details.';
    }


    return 'Create a Purchase Order from a selected vendor quotation.';
  }


  get isReadOnly():
    boolean {

    return (
      this.isEditMode &&
      this.purchaseOrder
        ?.status !==
        'draft'
    );
  }


  /* ============================================================
     INIT
  ============================================================ */

  ngOnInit():
    void {

    this.purchaseOrderId =
      String(
        this.route
          .snapshot
          .paramMap
          .get(
            'id'
          ) ||
        ''
      );


    this.quotationId =
      String(
        this.route
          .snapshot
          .queryParamMap
          .get(
            'quotationId'
          ) ||
        ''
      );


    this.purchaseRequestId =
      String(
        this.route
          .snapshot
          .queryParamMap
          .get(
            'purchaseRequestId'
          ) ||
        this.route
          .snapshot
          .queryParamMap
          .get(
            'prId'
          ) ||
        ''
      );


    this.isEditMode =
      Boolean(
        this.purchaseOrderId
      );


    this.setupCalculationWatchers();


    this.loadInitialData();
  }


  /* ============================================================
     DESTROY
  ============================================================ */

  ngOnDestroy():
    void {

    this.destroy$
      .next();

    this.destroy$
      .complete();
  }


  /* ============================================================
     INITIAL DATA
  ============================================================ */

  private loadInitialData():
    void {

    this.isLoadingReferences =
      true;


    forkJoin({

      quotations:
        this.quotationService
          .getQuotations({
            status:
              'selected',

            page:
              1,

            limit:
              100
          }),

      warehouses:
        this.referenceService
          .getWarehouses()

    })
      .pipe(

        takeUntil(
          this.destroy$
        ),

        finalize(
          () => {

            this.isLoadingReferences =
              false;

            this.cdr
              .markForCheck();
          }
        )

      )
      .subscribe({

        next:
          result => {

            this.quotations =
              this.extractRows<
                PurchaseQuotation
              >(
                result.quotations
              );


            this.warehouses =
              Array.isArray(
                result.warehouses
              )
                ? result.warehouses
                : [];


            if (
              this.isEditMode
            ) {

              this.loadPurchaseOrder();

              return;
            }


            if (
              this.quotationId
            ) {

              this.loadQuotationById(
                this.quotationId
              );

              return;
            }


            if (
              this.purchaseRequestId
            ) {

              const selected =
                this.quotations
                  .find(
                    quotation =>
                      this.getReferenceId(
                        quotation
                          .purchaseRequest
                      ) ===
                      this.purchaseRequestId
                  );


              if (
                selected
              ) {

                this.applyQuotation(
                  selected
                );
              }
            }


            this.cdr
              .markForCheck();
          },

        error:
          error => {

            this.errorMessage =
              this.getErrorMessage(
                error,
                'Purchase Order reference data could not be loaded.'
              );


            this.cdr
              .markForCheck();
          }

      });
  }


  /* ============================================================
     LOAD PURCHASE ORDER
  ============================================================ */

  private loadPurchaseOrder():
    void {

    if (
      !this.purchaseOrderId
    ) {

      return;
    }


    this.isLoading =
      true;


    this.purchaseOrderService
      .getPurchaseOrderById(
        this.purchaseOrderId
      )
      .pipe(

        takeUntil(
          this.destroy$
        ),

        finalize(
          () => {

            this.isLoading =
              false;

            this.cdr
              .markForCheck();
          }
        )

      )
      .subscribe({

        next:
          purchaseOrder => {

            this.purchaseOrder =
              purchaseOrder;


            this.patchPurchaseOrder(
              purchaseOrder
            );


            if (
              purchaseOrder.status !==
              'draft'
            ) {

              this.form
                .disable({
                  emitEvent:
                    false
                });
            }


            this.cdr
              .markForCheck();
          },

        error:
          error => {

            this.errorMessage =
              this.getErrorMessage(
                error,
                'Purchase Order could not be loaded.'
              );


            this.cdr
              .markForCheck();
          }

      });
  }


  /* ============================================================
     LOAD QUOTATION
  ============================================================ */

  private loadQuotationById(
    quotationId:
      string
  ):
    void {

    if (
      !quotationId
    ) {

      return;
    }


    const existing =
      this.quotations
        .find(
          quotation =>
            quotation._id ===
            quotationId
        );


    if (
      existing
    ) {

      this.applyQuotation(
        existing
      );

      return;
    }


    this.isLoadingQuotation =
      true;


    this.quotationService
      .getQuotationById(
        quotationId
      )
      .pipe(

        takeUntil(
          this.destroy$
        ),

        finalize(
          () => {

            this.isLoadingQuotation =
              false;

            this.cdr
              .markForCheck();
          }
        )

      )
      .subscribe({

        next:
          quotation => {

            this.applyQuotation(
              quotation
            );
          },

        error:
          error => {

            this.errorMessage =
              this.getErrorMessage(
                error,
                'Selected quotation could not be loaded.'
              );


            this.cdr
              .markForCheck();
          }

      });
  }


  /* ============================================================
     QUOTATION SELECT
  ============================================================ */

  onQuotationChange():
    void {

    if (
      this.isEditMode
    ) {

      return;
    }


    const quotationId =
      String(
        this.form
          .get(
            'quotationId'
          )
          ?.value ||
        ''
      );


    if (
      !quotationId
    ) {

      this.selectedQuotation =
        null;


      this.items
        .clear();


      this.form
        .patchValue(
          {
            purchaseRequestId:
              '',

            vendorId:
              '',

            vendorEnquiryId:
              '',

            paymentTerms:
              '',

            freightCharges:
              0,

            otherCharges:
              0
          },
          {
            emitEvent:
              false
          }
        );


      return;
    }


    this.loadQuotationById(
      quotationId
    );
  }


  /* ============================================================
     APPLY QUOTATION
  ============================================================ */

  private applyQuotation(
    quotation:
      PurchaseQuotation
  ):
    void {
  
    if (
      quotation.status !==
      'selected'
    ) {
  
      this.errorMessage =
        'Purchase Order can only be created from a selected quotation.';
  
      return;
    }
  
  
    this.errorMessage =
      '';
  
  
    this.selectedQuotation =
      quotation;
  
  
    /*
     * Backend PurchaseQuotation stores the references primarily as:
     * vendorId
     * purchaseRequestId
     * vendorEnquiryId
     *
     * Some API responses may additionally contain populated:
     * vendor
     * purchaseRequest
     * vendorEnquiry
     *
     * Support both response shapes.
     */
    const raw =
      quotation as
        PurchaseQuotation &
        {
          vendorId?:
            string |
            {
              _id?: string;
            } |
            null;
  
          purchaseRequestId?:
            string |
            {
              _id?: string;
            } |
            null;
  
          vendorEnquiryId?:
            string |
            {
              _id?: string;
            } |
            null;
        };
  
  
    const vendorId =
      this.getReferenceId(
        raw.vendorId
      ) ||
      this.getReferenceId(
        quotation.vendor
      );
  
  
    const purchaseRequestId =
      this.getReferenceId(
        raw.purchaseRequestId
      ) ||
      this.getReferenceId(
        quotation.purchaseRequest
      );
  
  
    const vendorEnquiryId =
      this.getReferenceId(
        raw.vendorEnquiryId
      ) ||
      this.getReferenceId(
        quotation.vendorEnquiry
      );
  
  
    this.form
      .patchValue(
        {
  
          quotationId:
            quotation._id,
  
          purchaseRequestId,
  
          vendorId,
  
          vendorEnquiryId,
  
          paymentTerms:
            quotation
              .paymentTerms ||
            '',
  
          freightCharges:
            Number(
              quotation
                .freightCharges ||
              0
            ),
  
          otherCharges:
            Number(
              quotation
                .otherCharges ||
              0
            )
  
        },
        {
          emitEvent:
            false
        }
      );
  
  
    this.replaceItemsFromQuotation(
      quotation.items ||
      []
    );
  
  
    if (
      quotation.deliveryTime &&
      !this.form
        .get(
          'remarks'
        )
        ?.value
    ) {
  
      this.form
        .get(
          'remarks'
        )
        ?.setValue(
          `Vendor quoted delivery time: ${quotation.deliveryTime}`,
          {
            emitEvent:
              false
          }
        );
    }
  
  
    this.cdr
      .markForCheck();
  }


  /* ============================================================
     QUOTATION ITEMS → PO ITEMS
  ============================================================ */

  private replaceItemsFromQuotation(
    quotationItems:
      PurchaseQuotationItem[]
  ):
    void {

    this.items
      .clear();


    quotationItems
      .forEach(
        item => {

          this.items
            .push(
              this.createItemGroup({

                itemId:
                  item.itemId ||
                  null,

                itemName:
                  item.itemName,

                description:
                  item.description ||
                  '',

                orderedQuantity:
                  Number(
                    item.quantity ||
                    0
                  ),

                unit:
                  item.unit,

                unitPrice:
                  Number(
                    item.unitPrice ||
                    0
                  ),

                taxPercent:
                  Number(
                    item.taxPercent ||
                    0
                  )

              })
            );
        }
      );


    this.cdr
      .markForCheck();
  }


  /* ============================================================
     CREATE ITEM GROUP
  ============================================================ */

  private createItemGroup(
    item?: {
      itemId?:
        string |
        null;

      itemName?:
        string;

      description?:
        string;

      orderedQuantity?:
        number;

      unit?:
        string;

      unitPrice?:
        number;

      taxPercent?:
        number;
    }
  ):
    FormGroup {

    return this.fb
      .group({

        itemId: [
          item
            ?.itemId ||
          ''
        ],

        itemName: [
          item
            ?.itemName ||
          '',
          [
            Validators.required
          ]
        ],

        description: [
          item
            ?.description ||
          ''
        ],

        orderedQuantity: [
          Number(
            item
              ?.orderedQuantity ||
            0
          ),
          [
            Validators.required,
            Validators.min(
              0.0001
            )
          ]
        ],

        unit: [
          item
            ?.unit ||
          '',
          [
            Validators.required
          ]
        ],

        unitPrice: [
          Number(
            item
              ?.unitPrice ||
            0
          ),
          [
            Validators.required,
            Validators.min(
              0
            )
          ]
        ],

        taxPercent: [
          Number(
            item
              ?.taxPercent ||
            0
          ),
          [
            Validators.required,
            Validators.min(
              0
            ),
            Validators.max(
              100
            )
          ]
        ]

      });
  }


  /* ============================================================
     PATCH EXISTING PO
  ============================================================ */

  private patchPurchaseOrder(
    purchaseOrder:
      PurchaseOrder
  ):
    void {

    const raw =
      purchaseOrder as
        PurchaseOrder &
        {

          vendorId?:
            string;

          purchaseRequestId?:
            string;

          quotationId?:
            string;

          vendorEnquiryId?:
            string;

          warehouseId?:
            string;

        };


    const quotationId =
      raw.quotationId ||
      this.getReferenceId(
        purchaseOrder
          .quotation
      );


    const purchaseRequestId =
      raw.purchaseRequestId ||
      this.getReferenceId(
        purchaseOrder
          .purchaseRequest
      );


    const vendorId =
      raw.vendorId ||
      this.getReferenceId(
        purchaseOrder
          .vendor
      );


    const vendorEnquiryId =
      raw.vendorEnquiryId ||
      this.getReferenceId(
        purchaseOrder
          .vendorEnquiry
      );


    const warehouseId =
      raw.warehouseId ||
      this.getReferenceId(
        purchaseOrder
          .warehouse
      );


    this.form
      .patchValue(
        {

          quotationId,

          purchaseRequestId,

          vendorId,

          vendorEnquiryId,

          poDate:
            this.toDateInput(
              purchaseOrder.poDate
            ),

          warehouseId,

          deliveryAddress:
            purchaseOrder
              .deliveryAddress ||
            '',

          expectedDeliveryDate:
            this.toDateInput(
              purchaseOrder
                .expectedDeliveryDate
            ),

          paymentTerms:
            purchaseOrder
              .paymentTerms ||
            '',

          freightCharges:
            Number(
              purchaseOrder
                .freightCharges ||
              0
            ),

          otherCharges:
            Number(
              purchaseOrder
                .otherCharges ||
              0
            ),

          remarks:
            purchaseOrder
              .remarks ||
            ''

        },
        {
          emitEvent:
            false
        }
      );


    this.items
      .clear();


    (
      purchaseOrder.items ||
      []
    )
      .forEach(
        item => {

          this.items
            .push(
              this.createItemGroup({

                itemId:
                  item.itemId ||
                  null,

                itemName:
                  item.itemName,

                description:
                  item.description ||
                  '',

                orderedQuantity:
                  Number(
                    item
                      .orderedQuantity ||
                    0
                  ),

                unit:
                  item.unit,

                unitPrice:
                  Number(
                    item.unitPrice ||
                    0
                  ),

                taxPercent:
                  Number(
                    item.taxPercent ||
                    0
                  )

              })
            );
        }
      );


    const matchingQuotation =
      this.quotations
        .find(
          quotation =>
            quotation._id ===
            quotationId
        );


    if (
      matchingQuotation
    ) {

      this.selectedQuotation =
        matchingQuotation;
    }


    this.cdr
      .markForCheck();
  }


  /* ============================================================
     CALCULATION WATCHERS
  ============================================================ */

  private setupCalculationWatchers():
    void {

    this.form
      .valueChanges
      .pipe(
        takeUntil(
          this.destroy$
        )
      )
      .subscribe(
        () => {

          this.cdr
            .markForCheck();
        }
      );
  }


  /* ============================================================
     ITEM CALCULATIONS
  ============================================================ */

  getItemSubtotal(
    index:
      number
  ):
    number {

    const group =
      this.items
        .at(
          index
        );


    const quantity =
      Number(
        group
          .get(
            'orderedQuantity'
          )
          ?.value ||
        0
      );


    const unitPrice =
      Number(
        group
          .get(
            'unitPrice'
          )
          ?.value ||
        0
      );


    return this.roundMoney(
      quantity *
      unitPrice
    );
  }


  getItemTax(
    index:
      number
  ):
    number {

    const subtotal =
      this.getItemSubtotal(
        index
      );


    const taxPercent =
      Number(
        this.items
          .at(
            index
          )
          .get(
            'taxPercent'
          )
          ?.value ||
        0
      );


    return this.roundMoney(
      subtotal *
      taxPercent /
      100
    );
  }


  getItemTotal(
    index:
      number
  ):
    number {

    return this.roundMoney(
      this.getItemSubtotal(
        index
      ) +
      this.getItemTax(
        index
      )
    );
  }


  get subtotal():
    number {

    return this.roundMoney(
      this.items.controls
        .reduce(
          (
            total,
            _control,
            index
          ) =>
            total +
            this.getItemSubtotal(
              index
            ),
          0
        )
    );
  }


  get taxTotal():
    number {

    return this.roundMoney(
      this.items.controls
        .reduce(
          (
            total,
            _control,
            index
          ) =>
            total +
            this.getItemTax(
              index
            ),
          0
        )
    );
  }


  get freightCharges():
    number {

    return Number(
      this.form
        .get(
          'freightCharges'
        )
        ?.value ||
      0
    );
  }


  get otherCharges():
    number {

    return Number(
      this.form
        .get(
          'otherCharges'
        )
        ?.value ||
      0
    );
  }


  get grandTotal():
    number {

    return this.roundMoney(
      this.subtotal +
      this.taxTotal +
      this.freightCharges +
      this.otherCharges
    );
  }


  /* ============================================================
     SELECTED VENDOR DISPLAY
  ============================================================ */

  get vendorName():
  string {

  if (
    this.selectedQuotation
  ) {

    const raw =
      this.selectedQuotation as
        PurchaseQuotation &
        {
          vendorName?:
            string;
        };


    if (
      raw.vendorName
    ) {

      return raw.vendorName;
    }


    return this.referenceDisplayName(
      this.selectedQuotation
        .vendor
    );
  }


  if (
    this.purchaseOrder
  ) {

    return this.referenceDisplayName(
      this.purchaseOrder
        .vendor
    );
  }


  return '—';
}


  /* ============================================================
     PR NUMBER
  ============================================================ */

  get purchaseRequestNumber():
  string {

  const reference =
    this.selectedQuotation
      ?.purchaseRequest ||
    this.purchaseOrder
      ?.purchaseRequest;


  if (
    reference &&
    typeof reference ===
      'object'
  ) {

    return (
      reference.prNumber ||
      '—'
    );
  }


  const quotationRaw =
    this.selectedQuotation as
      (
        PurchaseQuotation &
        {
          purchaseRequestNumber?:
            string;

          prNumber?:
            string;
        }
      ) |
      null;


  if (
    quotationRaw
      ?.purchaseRequestNumber
  ) {

    return quotationRaw
      .purchaseRequestNumber;
  }


  if (
    quotationRaw
      ?.prNumber
  ) {

    return quotationRaw
      .prNumber;
  }


  const purchaseOrderRaw =
    this.purchaseOrder as
      (
        PurchaseOrder &
        {
          purchaseRequestNumber?:
            string;
        }
      ) |
      null;


  return (
    purchaseOrderRaw
      ?.purchaseRequestNumber ||
    '—'
  );
}


  /* ============================================================
     RFQ NUMBER
  ============================================================ */

  get rfqNumber():
  string {

  const raw =
    this.selectedQuotation as
      (
        PurchaseQuotation &
        {
          rfqNumber?:
            string;
        }
      ) |
      null;


  return (
    raw?.rfqNumber ||
    this.getVendorEnquiryRfq() ||
    '—'
  );
}


  private getVendorEnquiryRfq():
    string {

    const enquiry =
      this.selectedQuotation
        ?.vendorEnquiry;


    if (
      enquiry &&
      typeof enquiry ===
        'object'
    ) {

      return (
        enquiry.rfqNumber ||
        enquiry.enquiryNumber ||
        ''
      );
    }


    return '';
  }


  /* ============================================================
     WAREHOUSE
  ============================================================ */

  onWarehouseChange():
    void {

    const warehouseId =
      String(
        this.form
          .get(
            'warehouseId'
          )
          ?.value ||
        ''
      );


    const warehouse =
      this.warehouses
        .find(
          item =>
            item._id ===
            warehouseId
        );


    if (
      !warehouse
    ) {

      return;
    }


    const currentAddress =
      String(
        this.form
          .get(
            'deliveryAddress'
          )
          ?.value ||
        ''
      )
        .trim();


    if (
      currentAddress
    ) {

      return;
    }


    const address =
      this.getWarehouseAddress(
        warehouse
      );


    if (
      address
    ) {

      this.form
        .get(
          'deliveryAddress'
        )
        ?.setValue(
          address
        );
    }
  }


  getWarehouseAddress(
    warehouse:
      PurchaseWarehouseOption
  ):
    string {

    return [
      warehouse.address,
      warehouse.city,
      warehouse.state,
      warehouse.country
    ]
      .filter(
        Boolean
      )
      .join(
        ', '
      );
  }


  /* ============================================================
     VALIDATION
  ============================================================ */

  fieldInvalid(
    controlName:
      string
  ):
    boolean {

    const control =
      this.form
        .get(
          controlName
        );


    return Boolean(
      control &&
      control.invalid &&
      (
        control.touched ||
        control.dirty
      )
    );
  }


  itemFieldInvalid(
    index:
      number,

    controlName:
      string
  ):
    boolean {

    const control =
      this.items
        .at(
          index
        )
        .get(
          controlName
        );


    return Boolean(
      control &&
      control.invalid &&
      (
        control.touched ||
        control.dirty
      )
    );
  }


  private validateBusinessRules():
    string {

    if (
      this.items.length ===
      0
    ) {

      return 'Purchase Order must contain at least one item.';
    }


    const poDate =
      String(
        this.form
          .get(
            'poDate'
          )
          ?.value ||
        ''
      );


    const expectedDate =
      String(
        this.form
          .get(
            'expectedDeliveryDate'
          )
          ?.value ||
        ''
      );


    if (
      poDate &&
      expectedDate &&
      expectedDate <
        poDate
    ) {

      return 'Expected delivery date cannot be before PO date.';
    }


    if (
      !this.isEditMode &&
      this.selectedQuotation
        ?.status !==
        'selected'
    ) {

      return 'Please select an approved vendor quotation before creating the Purchase Order.';
    }


    return '';
  }


  /* ============================================================
     SUBMIT
  ============================================================ */

  submit():
    void {

    this.errorMessage =
      '';

    this.successMessage =
      '';


    if (
      this.isReadOnly
    ) {

      this.errorMessage =
        'Only Draft Purchase Orders can be edited.';

      return;
    }


    if (
      this.form.invalid
    ) {

      this.form
        .markAllAsTouched();


      this.errorMessage =
        'Please complete all required Purchase Order fields.';


      this.cdr
        .markForCheck();

      return;
    }


    const businessError =
      this.validateBusinessRules();


    if (
      businessError
    ) {

      this.errorMessage =
        businessError;


      this.cdr
        .markForCheck();

      return;
    }


    const payload =
      this.buildPayload();


    this.isSaving =
      true;


    const request$ =
      this.isEditMode
        ? this.purchaseOrderService
            .updatePurchaseOrder(
              this.purchaseOrderId,
              payload
            )

        : this.purchaseOrderService
            .createPurchaseOrder(
              payload
            );


    request$
      .pipe(

        takeUntil(
          this.destroy$
        ),

        finalize(
          () => {

            this.isSaving =
              false;

            this.cdr
              .markForCheck();
          }
        )

      )
      .subscribe({

        next:
          purchaseOrder => {

            this.successMessage =
              this.isEditMode
                ? 'Purchase Order updated successfully.'
                : 'Purchase Order created successfully.';


            this.purchaseOrder =
              purchaseOrder;


            this.cdr
              .markForCheck();


            this.router
              .navigate([
                '/purchase/purchase-orders'
              ]);
          },

        error:
          error => {

            this.errorMessage =
              this.getErrorMessage(
                error,
                this.isEditMode
                  ? 'Purchase Order could not be updated.'
                  : 'Purchase Order could not be created.'
              );


            this.cdr
              .markForCheck();
          }

      });
  }


  /* ============================================================
     BUILD PAYLOAD
  ============================================================ */

  private buildPayload():
    PurchaseOrderPayload {

    const value =
      this.form
        .getRawValue();


    return {

      vendorId:
        String(
          value.vendorId ||
          ''
        ),

      purchaseRequestId:
        value.purchaseRequestId
          ? String(
              value.purchaseRequestId
            )
          : null,

      quotationId:
        value.quotationId
          ? String(
              value.quotationId
            )
          : null,

      vendorEnquiryId:
        value.vendorEnquiryId
          ? String(
              value.vendorEnquiryId
            )
          : null,

      poDate:
        value.poDate ||
        undefined,

      items:
        (
          value.items ||
          []
        )
          .map(
            (
              item:
                any
            ) => ({

              itemId:
                item.itemId
                  ? String(
                      item.itemId
                    )
                  : null,

              itemName:
                String(
                  item.itemName ||
                  ''
                )
                  .trim(),

              description:
                String(
                  item.description ||
                  ''
                )
                  .trim(),

              orderedQuantity:
                Number(
                  item.orderedQuantity ||
                  0
                ),

              unit:
                String(
                  item.unit ||
                  ''
                )
                  .trim(),

              unitPrice:
                Number(
                  item.unitPrice ||
                  0
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

      deliveryAddress:
        String(
          value.deliveryAddress ||
          ''
        )
          .trim(),

      warehouseId:
        value.warehouseId
          ? String(
              value.warehouseId
            )
          : null,

      expectedDeliveryDate:
        value.expectedDeliveryDate ||
        null,

      paymentTerms:
        String(
          value.paymentTerms ||
          ''
        )
          .trim(),

      remarks:
        String(
          value.remarks ||
          ''
        )
          .trim()

    };
  }


  /* ============================================================
     CANCEL
  ============================================================ */

  cancel():
    void {

    this.router
      .navigate([
        '/purchase/purchase-orders'
      ]);
  }


  /* ============================================================
     FORMAT
  ============================================================ */

  formatCurrency(
    value:
      number |
      null |
      undefined
  ):
    string {

    return new Intl
      .NumberFormat(
        'en-IN',
        {
          style:
            'currency',

          currency:
            'INR',

          maximumFractionDigits:
            2
        }
      )
      .format(
        Number(
          value ||
          0
        )
      );
  }


  /* ============================================================
     HELPERS
  ============================================================ */

  private getReferenceId(
    value:
      unknown
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


    if (
      typeof value ===
        'object' &&
      '_id' in value
    ) {

      return String(
        (
          value as
            {
              _id?:
                string;
            }
        )._id ||
        ''
      );
    }


    return '';
  }


  private referenceDisplayName(
    value:
      PurchaseVendorOption |
      string |
      null |
      undefined
  ):
    string {

    if (
      !value
    ) {

      return '—';
    }


    if (
      typeof value ===
        'string'
    ) {

      return value;
    }


    return (
      value.name ||
      value.companyName ||
      '—'
    );
  }


  private extractRows<T>(
    response:
      unknown
  ):
    T[] {

    if (
      Array.isArray(
        response
      )
    ) {

      return response as
        T[];
    }


    if (
      !response ||
      typeof response !==
        'object'
    ) {

      return [];
    }


    const raw =
      response as
        {
          rows?:
            T[];

          data?:
            T[] |
            {
              rows?:
                T[];
            };
        };


    if (
      Array.isArray(
        raw.rows
      )
    ) {

      return raw.rows;
    }


    if (
      Array.isArray(
        raw.data
      )
    ) {

      return raw.data;
    }


    if (
      raw.data &&
      !Array.isArray(
        raw.data
      ) &&
      Array.isArray(
        raw.data.rows
      )
    ) {

      return raw.data.rows;
    }


    return [];
  }


  private roundMoney(
    value:
      number
  ):
    number {

    return (
      Math.round(
        (
          Number(
            value ||
            0
          ) +
          Number.EPSILON
        ) *
        100
      ) /
      100
    );
  }


  private today():
    string {

    const now =
      new Date();


    const year =
      now.getFullYear();


    const month =
      String(
        now.getMonth() +
        1
      )
        .padStart(
          2,
          '0'
        );


    const day =
      String(
        now.getDate()
      )
        .padStart(
          2,
          '0'
        );


    return `${year}-${month}-${day}`;
  }


  private toDateInput(
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


    const text =
      String(
        value
      );


    if (
      /^\d{4}-\d{2}-\d{2}$/.test(
        text
      )
    ) {

      return text;
    }


    const date =
      new Date(
        text
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
      )
        .padStart(
          2,
          '0'
        );


    const day =
      String(
        date.getDate()
      )
        .padStart(
          2,
          '0'
        );


    return `${year}-${month}-${day}`;
  }


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
     TRACK BY
  ============================================================ */

  trackByQuotation(
    _index:
      number,

    quotation:
      PurchaseQuotation
  ):
    string {

    return quotation._id;
  }


  trackByWarehouse(
    _index:
      number,

    warehouse:
      PurchaseWarehouseOption
  ):
    string {

    return warehouse._id;
  }


  trackByItem(
    index:
      number,

    control:
      AbstractControl
  ):
    string {

    return (
      String(
        control
          .get(
            'itemId'
          )
          ?.value ||
        ''
      ) ||
      String(
        index
      )
    );
  }

}