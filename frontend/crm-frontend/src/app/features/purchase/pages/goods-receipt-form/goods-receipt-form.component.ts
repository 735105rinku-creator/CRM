import {
  CommonModule
} from '@angular/common';

import {
  Component,
  OnInit
} from '@angular/core';

import {
  FormsModule
} from '@angular/forms';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  forkJoin
} from 'rxjs';

import {
  finalize
} from 'rxjs/operators';

import {
  GoodsReceipt,
  GoodsReceiptPayload,
  PurchaseOrder,
  PurchaseOrderReceiptSummary,
  PurchaseOrderReceiptSummaryItem,
  PurchaseWarehouseOption
} from '../../models/purchase.models';

import {
  GoodsReceiptService
} from '../../services/goods-receipt.service';

import {
  PurchaseOrderService
} from '../../services/purchase-order.service';

import {
  PurchaseReferenceService
} from '../../services/purchase-reference.service';


interface GoodsReceiptFormItem {

  purchaseOrderItemId: string;

  itemId?: string | null;

  itemName: string;

  description?: string;

  unit: string;

  orderedQuantity: number;

  previouslyReceivedQuantity: number;

  availableQuantity: number;

  currentReceivedQuantity: number;

  acceptedQuantity: number;

  rejectedQuantity: number;

  rejectionReason: string;

}


@Component({
  selector: 'app-goods-receipt-form',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl:
    './goods-receipt-form.component.html',

  styleUrl:
    './goods-receipt-form.component.scss'
})
export class GoodsReceiptFormComponent
  implements OnInit {


  /* ============================================================
     STATE
  ============================================================ */

  loading =
    false;

  saving =
    false;

  loadingPurchaseOrder =
    false;

  loadingWarehouses =
    false;

  errorMessage =
    '';

  successMessage =
    '';

  isViewMode =
    false;

  goodsReceiptId =
    '';

  existingGoodsReceipt:
    GoodsReceipt |
    null =
    null;


  /* ============================================================
     REFERENCE DATA
  ============================================================ */

  purchaseOrders:
    PurchaseOrder[] = [];

  warehouses:
    PurchaseWarehouseOption[] = [];

  selectedPurchaseOrder:
    PurchaseOrder |
    null =
    null;

  receiptSummary:
    PurchaseOrderReceiptSummary |
    null =
    null;


  /* ============================================================
     FORM
  ============================================================ */

  purchaseOrderId =
    '';

  receiptDate =
    this.todayDate();

  warehouseId =
    '';

  deliveryChallanNumber =
    '';

  remarks =
    '';

  items:
    GoodsReceiptFormItem[] = [];


  constructor(
    private readonly goodsReceiptService:
      GoodsReceiptService,

    private readonly purchaseOrderService:
      PurchaseOrderService,

    private readonly purchaseReferenceService:
      PurchaseReferenceService,

    private readonly route:
      ActivatedRoute,

    private readonly router:
      Router
  ) {}


  /* ============================================================
     INIT
  ============================================================ */

  ngOnInit():
    void {

    this.goodsReceiptId =
      String(
        this.route.snapshot.paramMap.get(
          'id'
        ) ||
        ''
      )
        .trim();


    this.isViewMode =
      Boolean(
        this.goodsReceiptId
      );


    if (
      this.isViewMode
    ) {

      this.loadExistingGoodsReceipt();

      return;
    }


    this.loadCreateReferences();
  }


  /* ============================================================
     CREATE REFERENCES
  ============================================================ */

  private loadCreateReferences():
    void {

    this.loading =
      false;

    this.loadingWarehouses =
      true;

    this.errorMessage =
      '';

    /*
     * Purchase Orders and Warehouses are intentionally
     * loaded independently.
     *
     * One slow/failed reference API must never block
     * the complete Create GRN form.
     */

    this.purchaseOrderService
      .getPurchaseOrders({
        page:
          1,

        limit:
          100
      })
      .subscribe({

        next:
          (
            response
          ) => {

            this.purchaseOrders =
              this.extractPurchaseOrders(
                response
              )
                .filter(
                  (
                    purchaseOrder
                  ) =>
                    this.isReceiptEligiblePurchaseOrder(
                      purchaseOrder
                    )
                );


            const queryPurchaseOrderId =
              String(
                this.route.snapshot.queryParamMap.get(
                  'purchaseOrderId'
                ) ||
                ''
              )
                .trim();


            if (
              queryPurchaseOrderId &&
              this.purchaseOrders.some(
                (
                  purchaseOrder
                ) =>
                  purchaseOrder._id ===
                  queryPurchaseOrderId
              )
            ) {

              this.purchaseOrderId =
                queryPurchaseOrderId;

              this.onPurchaseOrderChange();
            }

          },

        error:
          (
            error
          ) => {

            this.purchaseOrders =
              [];


            this.errorMessage =
              this.resolveErrorMessage(
                error,
                'Unable to load Purchase Orders.'
              );

          }

      });


    this.purchaseReferenceService
      .getWarehouses()
      .pipe(
        finalize(
          () => {

            this.loadingWarehouses =
              false;

          }
        )
      )
      .subscribe({

        next:
          (
            response
          ) => {

            this.warehouses =
              this.extractWarehouses(
                response
              )
                .filter(
                  (
                    warehouse
                  ) =>
                    warehouse.isActive !==
                    false
                );

          },

        error:
          (
            error
          ) => {

            this.warehouses =
              [];


            const warehouseError =
              this.resolveErrorMessage(
                error,
                'Unable to load warehouses.'
              );


            this.errorMessage =
              this.errorMessage
                ? `${this.errorMessage} ${warehouseError}`
                : warehouseError;

          }

      });
  }


  /* ============================================================
     LOAD EXISTING GRN
  ============================================================ */

  private loadExistingGoodsReceipt():
    void {

    this.loading =
      true;

    this.errorMessage =
      '';


    this.goodsReceiptService
      .getById(
        this.goodsReceiptId
      )
      .pipe(
        finalize(
          () => {

            this.loading =
              false;

          }
        )
      )
      .subscribe({

        next:
          (
            goodsReceipt
          ) => {

            this.existingGoodsReceipt =
              goodsReceipt;


            this.purchaseOrderId =
              this.referenceId(
                goodsReceipt.purchaseOrderId
              );


            this.receiptDate =
              this.toDateInputValue(
                goodsReceipt.receiptDate
              );


            this.warehouseId =
              this.referenceId(
                goodsReceipt.warehouseId
              );


            this.deliveryChallanNumber =
              goodsReceipt.deliveryChallanNumber ||
              '';


            this.remarks =
              goodsReceipt.remarks ||
              '';


            this.items =
              (
                goodsReceipt.items ||
                []
              )
                .map(
                  (
                    item
                  ) => ({

                    purchaseOrderItemId:
                      item.purchaseOrderItemId,

                    itemId:
                      item.itemId ??
                      null,

                    itemName:
                      item.itemName,

                    description:
                      item.description,

                    unit:
                      item.unit,

                    orderedQuantity:
                      Number(
                        item.orderedQuantity ||
                        0
                      ),

                    previouslyReceivedQuantity:
                      Number(
                        item.previouslyReceivedQuantity ||
                        0
                      ),

                    availableQuantity:
                      Math.max(
                        Number(
                          item.orderedQuantity ||
                          0
                        ) -
                        Number(
                          item.previouslyReceivedQuantity ||
                          0
                        ),
                        0
                      ),

                    currentReceivedQuantity:
                      Number(
                        item.currentReceivedQuantity ||
                        0
                      ),

                    acceptedQuantity:
                      Number(
                        item.acceptedQuantity ||
                        0
                      ),

                    rejectedQuantity:
                      Number(
                        item.rejectedQuantity ||
                        0
                      ),

                    rejectionReason:
                      item.rejectionReason ||
                      ''

                  })
                );

          },

        error:
          (
            error
          ) => {

            this.errorMessage =
              this.resolveErrorMessage(
                error,
                'Unable to load Goods Receipt.'
              );

          }

      });
  }


  /* ============================================================
     PURCHASE ORDER SELECTION
  ============================================================ */

  onPurchaseOrderChange():
    void {

    this.resetPurchaseOrderDetails();


    if (
      !this.purchaseOrderId
    ) {

      return;
    }


    this.loadingPurchaseOrder =
      true;

    this.errorMessage =
      '';


    forkJoin({

      purchaseOrder:
        this.purchaseOrderService
          .getPurchaseOrderById(
            this.purchaseOrderId
          ),

      receiptSummary:
        this.goodsReceiptService
          .getPurchaseOrderReceiptSummary(
            this.purchaseOrderId
          )

    })
      .pipe(
        finalize(
          () => {

            this.loadingPurchaseOrder =
              false;

          }
        )
      )
      .subscribe({

        next:
          (
            response
          ) => {

            this.selectedPurchaseOrder =
              response.purchaseOrder;


            this.receiptSummary =
              response.receiptSummary;


            this.applyWarehouseFromPurchaseOrder(
              response.purchaseOrder
            );


            this.buildItems(
              response.purchaseOrder,
              response.receiptSummary
            );

          },

        error:
          (
            error
          ) => {

            this.resetPurchaseOrderDetails();


            this.errorMessage =
              this.resolveErrorMessage(
                error,
                'Unable to load Purchase Order receipt details.'
              );

          }

      });
  }


  /* ============================================================
     BUILD ITEMS
  ============================================================ */

  private buildItems(
    purchaseOrder:
      PurchaseOrder,

    summary:
      PurchaseOrderReceiptSummary
  ):
    void {

    const summaryMap =
      new Map<
        string,
        PurchaseOrderReceiptSummaryItem
      >();


    for (
      const item of
      summary?.items ||
      []
    ) {

      summaryMap.set(
        item.purchaseOrderItemId,
        item
      );
    }


    this.items =
      (
        purchaseOrder.items ||
        []
      )
        .map(
          (
            purchaseOrderItem
          ) => {

            const itemId =
              String(
                purchaseOrderItem._id ||
                ''
              )
                .trim();


            if (
              !itemId
            ) {

              return null;
            }


            const existingSummary =
              summaryMap.get(
                itemId
              );


            const orderedQuantity =
              Number(
                existingSummary?.orderedQuantity ??
                purchaseOrderItem.orderedQuantity ??
                0
              );


            const previouslyReceivedQuantity =
              Number(
                existingSummary?.receivedQuantity ??
                purchaseOrderItem.receivedQuantity ??
                0
              );


            const availableQuantity =
              Math.max(
                Number(
                  existingSummary?.remainingQuantity ??
                  (
                    orderedQuantity -
                    previouslyReceivedQuantity
                  )
                ),
                0
              );


            const formItem:
              GoodsReceiptFormItem = {

                purchaseOrderItemId:
                  itemId,

                itemId:
                  purchaseOrderItem.itemId ??
                  null,

                itemName:
                  purchaseOrderItem.itemName,

                description:
                  purchaseOrderItem.description,

                unit:
                  purchaseOrderItem.unit,

                orderedQuantity,

                previouslyReceivedQuantity,

                availableQuantity,

                currentReceivedQuantity:
                  0,

                acceptedQuantity:
                  0,

                rejectedQuantity:
                  0,

                rejectionReason:
                  ''

              };


            return formItem;

          }
        )
        .filter(
          (
            item
          ):
            item is GoodsReceiptFormItem =>
              Boolean(
                item &&
                item.availableQuantity >
                0
              )
        );
  }


  /* ============================================================
     QUANTITY EVENTS
  ============================================================ */

  onCurrentReceivedChange(
    item:
      GoodsReceiptFormItem
  ):
    void {

    item.currentReceivedQuantity =
      this.clampQuantity(
        item.currentReceivedQuantity,
        0,
        item.availableQuantity
      );


    item.acceptedQuantity =
      item.currentReceivedQuantity;


    item.rejectedQuantity =
      0;


    item.rejectionReason =
      '';
  }


  onAcceptedChange(
    item:
      GoodsReceiptFormItem
  ):
    void {

    item.acceptedQuantity =
      this.clampQuantity(
        item.acceptedQuantity,
        0,
        item.currentReceivedQuantity
      );


    item.rejectedQuantity =
      this.roundQuantity(
        Math.max(
          item.currentReceivedQuantity -
          item.acceptedQuantity,
          0
        )
      );


    if (
      item.rejectedQuantity <=
      0
    ) {

      item.rejectionReason =
        '';
    }
  }


  onRejectedChange(
    item:
      GoodsReceiptFormItem
  ):
    void {

    item.rejectedQuantity =
      this.clampQuantity(
        item.rejectedQuantity,
        0,
        item.currentReceivedQuantity
      );


    item.acceptedQuantity =
      this.roundQuantity(
        Math.max(
          item.currentReceivedQuantity -
          item.rejectedQuantity,
          0
        )
      );


    if (
      item.rejectedQuantity <=
      0
    ) {

      item.rejectionReason =
        '';
    }
  }


  /* ============================================================
     TOTALS
  ============================================================ */

  get totalOrderedQuantity():
    number {

    return this.roundQuantity(
      this.items.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.orderedQuantity ||
            0
          ),
        0
      )
    );
  }


  get totalPreviouslyReceivedQuantity():
    number {

    return this.roundQuantity(
      this.items.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.previouslyReceivedQuantity ||
            0
          ),
        0
      )
    );
  }


  get totalAvailableQuantity():
    number {

    return this.roundQuantity(
      this.items.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.availableQuantity ||
            0
          ),
        0
      )
    );
  }


  get totalCurrentReceivedQuantity():
    number {

    return this.roundQuantity(
      this.items.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.currentReceivedQuantity ||
            0
          ),
        0
      )
    );
  }


  get totalAcceptedQuantity():
    number {

    return this.roundQuantity(
      this.items.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.acceptedQuantity ||
            0
          ),
        0
      )
    );
  }


  get totalRejectedQuantity():
    number {

    return this.roundQuantity(
      this.items.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.rejectedQuantity ||
            0
          ),
        0
      )
    );
  }


  get totalRemainingAfterReceipt():
    number {

    return this.roundQuantity(
      this.items.reduce(
        (
          total,
          item
        ) =>
          total +
          Math.max(
            Number(
              item.availableQuantity ||
              0
            ) -
            Number(
              item.currentReceivedQuantity ||
              0
            ),
            0
          ),
        0
      )
    );
  }


  remainingAfterReceipt(
    item:
      GoodsReceiptFormItem
  ):
    number {

    return this.roundQuantity(
      Math.max(
        Number(
          item.availableQuantity ||
          0
        ) -
        Number(
          item.currentReceivedQuantity ||
          0
        ),
        0
      )
    );
  }


  /* ============================================================
     VALIDATION
  ============================================================ */

  private validateForm():
    string {

    if (
      !this.purchaseOrderId
    ) {

      return 'Please select a Purchase Order.';
    }


    if (
      !this.receiptDate
    ) {

      return 'Receipt date is required.';
    }


    if (
      this.isCompanyWarehouseDelivery &&
      !this.warehouseId
    ) {

      return 'Please select a warehouse.';
    }


    if (
      !this.items.length
    ) {

      return 'No pending Purchase Order quantity is available for receipt.';
    }


    const receiptItems =
      this.items.filter(
        (
          item
        ) =>
          Number(
            item.currentReceivedQuantity ||
            0
          ) >
          0
      );


    if (
      !receiptItems.length
    ) {

      return 'Enter received quantity for at least one item.';
    }


    for (
      const item of
      receiptItems
    ) {

      const received =
        Number(
          item.currentReceivedQuantity ||
          0
        );


      const accepted =
        Number(
          item.acceptedQuantity ||
          0
        );


      const rejected =
        Number(
          item.rejectedQuantity ||
          0
        );


      if (
        received <=
        0
      ) {

        return `Received quantity must be greater than zero for ${item.itemName}.`;
      }


      if (
        received >
        item.availableQuantity
      ) {

        return `Received quantity cannot exceed remaining quantity for ${item.itemName}.`;
      }


      if (
        this.roundQuantity(
          accepted +
          rejected
        ) !==
        this.roundQuantity(
          received
        )
      ) {

        return `Accepted + Rejected quantity must equal Received quantity for ${item.itemName}.`;
      }


      if (
        rejected >
          0 &&
        !String(
          item.rejectionReason ||
          ''
        )
          .trim()
      ) {

        return `Rejection reason is required for ${item.itemName}.`;
      }

    }


    return '';
  }


  /* ============================================================
     SAVE
  ============================================================ */

  save():
    void {

    if (
      this.isViewMode ||
      this.saving
    ) {

      return;
    }


    const validationMessage =
      this.validateForm();


    if (
      validationMessage
    ) {

      this.errorMessage =
        validationMessage;

      this.successMessage =
        '';

      return;
    }


    const payload =
      this.buildPayload();


    this.saving =
      true;

    this.errorMessage =
      '';

    this.successMessage =
      '';


    this.goodsReceiptService
      .create(
        payload
      )
      .pipe(
        finalize(
          () => {

            this.saving =
              false;

          }
        )
      )
      .subscribe({

        next:
          (
            goodsReceipt
          ) => {

            this.successMessage =
              'Goods Receipt created successfully.';


            const id =
              goodsReceipt?._id;


            if (
              id
            ) {

              this.router.navigate(
                [
                  '/purchase/goods-receipts',
                  id
                ]
              );

              return;
            }


            this.router.navigate(
              [
                '/purchase/goods-receipts'
              ]
            );

          },

        error:
          (
            error
          ) => {

            this.errorMessage =
              this.resolveErrorMessage(
                error,
                'Unable to create Goods Receipt.'
              );

          }

      });
  }


  /* ============================================================
     BUILD PAYLOAD
  ============================================================ */

  private buildPayload():
    GoodsReceiptPayload {

    return {

      purchaseOrderId:
        this.purchaseOrderId,

      receiptDate:
        this.receiptDate,

      warehouseId:
        this.warehouseId || null,

      deliveryChallanNumber:
        String(
          this.deliveryChallanNumber ||
          ''
        )
          .trim() ||
        undefined,

      items:
        this.items
          .filter(
            (
              item
            ) =>
              Number(
                item.currentReceivedQuantity ||
                0
              ) >
              0
          )
          .map(
            (
              item
            ) => ({

              purchaseOrderItemId:
                item.purchaseOrderItemId,

              currentReceivedQuantity:
                this.roundQuantity(
                  item.currentReceivedQuantity
                ),

              acceptedQuantity:
                this.roundQuantity(
                  item.acceptedQuantity
                ),

              rejectedQuantity:
                this.roundQuantity(
                  item.rejectedQuantity
                ),

              rejectionReason:
                item.rejectedQuantity >
                  0
                  ? String(
                      item.rejectionReason ||
                      ''
                    )
                      .trim()
                  : undefined

            })
          ),

      remarks:
        String(
          this.remarks ||
          ''
        )
          .trim() ||
        undefined

    };
  }


  /* ============================================================
     NAVIGATION
  ============================================================ */

  cancel():
    void {

    this.router.navigate(
      [
        '/purchase/goods-receipts'
      ]
    );
  }


  back():
    void {

    this.cancel();
  }


  /* ============================================================
     DISPLAY HELPERS
  ============================================================ */

  purchaseOrderVendorName(
    purchaseOrder:
      PurchaseOrder |
      null
  ):
    string {

    if (
      !purchaseOrder
    ) {

      return '—';
    }


    if (
      typeof purchaseOrder.vendor ===
      'string'
    ) {

      return purchaseOrder.vendor;
    }


    return (
      purchaseOrder.vendor?.vendorName ||
      purchaseOrder.vendor?.companyName ||
      purchaseOrder.vendor?.name ||
      '—'
    );
  }


  purchaseOrderWarehouseName(
    purchaseOrder:
      PurchaseOrder |
      null
  ):
    string {

    if (
      !purchaseOrder?.warehouse
    ) {

      return '—';
    }


    if (
      typeof purchaseOrder.warehouse ===
      'string'
    ) {

      const matchedWarehouse =
        this.warehouses.find(
          (
            warehouse
          ) =>
            warehouse._id ===
            purchaseOrder.warehouse
        );


      return (
        matchedWarehouse?.name ||
        matchedWarehouse?.code ||
        '—'
      );
    }


    return (
      purchaseOrder.warehouse.name ||
      purchaseOrder.warehouse.code ||
      '—'
    );
  }


  warehouseDisplayName(
    warehouse:
      PurchaseWarehouseOption
  ):
    string {

    const code =
      String(
        warehouse.code ||
        ''
      )
        .trim();


    if (
      code
    ) {

      return `${warehouse.name} (${code})`;
    }


    return warehouse.name;
  }


  itemTrackBy(
    index:
      number,

    item:
      GoodsReceiptFormItem
  ):
    string {

    return (
      item.purchaseOrderItemId ||
      String(
        index
      )
    );
  }


  formatDate(
    value?:
      string |
      null
  ):
    string {

    if (
      !value
    ) {

      return '—';
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

      return '—';
    }


    return date.toLocaleDateString(
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


  formatDateTime(
    value?:
      string |
      null
  ):
    string {

    if (
      !value
    ) {

      return '—';
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

      return '—';
    }


    return date.toLocaleString(
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


  receiptOutcomeLabel(
    goodsReceipt:
      GoodsReceipt |
      null
  ):
    string {

    const status =
      String(
        goodsReceipt?.status ||
        ''
      )
        .trim()
        .toLowerCase();


    switch (
      status
    ) {

      case 'received':
        return 'Received';

      case 'partial':
        return 'Partial';

      case 'rejected':
        return 'Rejected';

      case 'completed':
        return 'Completed';

      default:
        return status
          ? this.toTitleCase(
              status
            )
          : '—';
    }
  }


  receiptOutcomeClass(
    goodsReceipt:
      GoodsReceipt |
      null
  ):
    string {

    const status =
      String(
        goodsReceipt?.status ||
        ''
      )
        .trim()
        .toLowerCase();


    switch (
      status
    ) {

      case 'received':
        return 'receipt-status-received';

      case 'partial':
        return 'receipt-status-partial';

      case 'rejected':
        return 'receipt-status-rejected';

      case 'completed':
        return 'receipt-status-completed';

      default:
        return 'receipt-status-default';
    }
  }


  approvalLabel(
    goodsReceipt:
      GoodsReceipt |
      null
  ):
    string {

    const approvalStatus =
      String(
        goodsReceipt?.approvalStatus ||
        ''
      )
        .trim()
        .toLowerCase();


    switch (
      approvalStatus
    ) {

      case 'pending_approval':
        return 'Pending Approval';

      case 'approved':
        return 'Approved';

      case 'rejected':
        return 'Rejected';

      default:
        /*
         * Existing/legacy GRNs may not contain approvalStatus.
         * Do not incorrectly label them as pending.
         */
        return 'Legacy / Not Applicable';
    }
  }


  approvalClass(
    goodsReceipt:
      GoodsReceipt |
      null
  ):
    string {

    const approvalStatus =
      String(
        goodsReceipt?.approvalStatus ||
        ''
      )
        .trim()
        .toLowerCase();


    switch (
      approvalStatus
    ) {

      case 'pending_approval':
        return 'approval-status-pending';

      case 'approved':
        return 'approval-status-approved';

      case 'rejected':
        return 'approval-status-rejected';

      default:
        return 'approval-status-legacy';
    }
  }


  get createdByDisplayName():
    string {

    const goodsReceipt =
      this.existingGoodsReceipt;


    if (
      !goodsReceipt
    ) {

      return '—';
    }


    return (
      String(
        goodsReceipt.createdByEmployeeName ||
        goodsReceipt.receivedByName ||
        ''
      )
        .trim() ||
      '—'
    );
  }


  get createdByDisplayCode():
    string {

    return String(
      this.existingGoodsReceipt
        ?.createdByEmployeeCode ||
      ''
    )
      .trim();
  }


  get approvedByDisplayName():
    string {

    const goodsReceipt =
      this.existingGoodsReceipt;


    if (
      !goodsReceipt
    ) {

      return '—';
    }


    const explicitName =
      String(
        goodsReceipt.approvedByName ||
        ''
      )
        .trim();


    if (
      explicitName
    ) {

      return explicitName;
    }


    return this.userReferenceDisplayName(
      goodsReceipt.approvedBy
    );
  }


  get rejectedByDisplayName():
    string {

    const goodsReceipt =
      this.existingGoodsReceipt;


    if (
      !goodsReceipt
    ) {

      return '—';
    }


    const explicitName =
      String(
        goodsReceipt.rejectedByName ||
        ''
      )
        .trim();


    if (
      explicitName
    ) {

      return explicitName;
    }


    return this.userReferenceDisplayName(
      goodsReceipt.rejectedBy
    );
  }


  get approvalRejectionReason():
    string {

    return (
      String(
        this.existingGoodsReceipt
          ?.approvalRejectionReason ||
        ''
      )
        .trim() ||
      '—'
    );
  }


  /* ============================================================
     PRIVATE HELPERS
  ============================================================ */

  private applyWarehouseFromPurchaseOrder(
    purchaseOrder:
      PurchaseOrder
  ):
    void {

    if (
      !purchaseOrder.warehouse
    ) {

      return;
    }


    const warehouseId =
      this.referenceId(
        purchaseOrder.warehouse
      );


    if (
      warehouseId
    ) {

      this.warehouseId =
        warehouseId;
    }
  }


  private resetPurchaseOrderDetails():
    void {

    this.selectedPurchaseOrder =
      null;

    this.receiptSummary =
      null;

    this.items =
      [];

    this.warehouseId =
      '';
  }


  private isReceiptEligiblePurchaseOrder(
    purchaseOrder:
      PurchaseOrder
  ):
    boolean {

    return [
      'approved',
      'sent',
      'partially_received'
    ]
      .includes(
        purchaseOrder.status
      );
  }


  private extractPurchaseOrders(
    response:
      any
  ):
    PurchaseOrder[] {

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
        response?.data?.rows
      )
    ) {

      return response.data.rows;
    }


    return [];
  }


  private extractWarehouses(
    response:
      any
  ):
    PurchaseWarehouseOption[] {

    const source =
      Array.isArray(
        response
      )
        ? response
        : Array.isArray(
            response?.rows
          )
          ? response.rows
          : Array.isArray(
              response?.data?.rows
            )
            ? response.data.rows
            : Array.isArray(
                response?.data
              )
              ? response.data
              : [];


    return source
      .map(
        (
          warehouse:
            any
        ) => {

          const id =
            String(
              warehouse?._id ||
              warehouse?.id ||
              ''
            )
              .trim();


          const name =
            String(
              warehouse?.name ||
              warehouse?.warehouseName ||
              ''
            )
              .trim();


          const code =
            String(
              warehouse?.code ||
              warehouse?.warehouseCode ||
              ''
            )
              .trim();


          if (
            !id ||
            !name
          ) {

            return null;
          }


          const normalized:
            PurchaseWarehouseOption = {

              _id:
                id,

              name,

              code:
                code ||
                undefined,

              address:
                warehouse?.address,

              city:
                warehouse?.city,

              state:
                warehouse?.state,

              country:
                warehouse?.country,

              isActive:
                warehouse?.isActive

            };


          return normalized;

        }
      )
      .filter(
        (
          warehouse:
            PurchaseWarehouseOption |
            null
        ):
          warehouse is PurchaseWarehouseOption =>
            Boolean(
              warehouse
            )
      );
  }


  private referenceId(
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


  private userReferenceDisplayName(
    value:
      any
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

      /*
       * A raw database ID must not be shown to the user.
       */
      return '—';
    }


    return (
      String(
        value?.name ||
        value?.fullName ||
        value?.employeeName ||
        value?.displayName ||
        ''
      )
        .trim() ||
      '—'
    );
  }


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
        /_/g,
        ' '
      )
      .replace(
        /\b\w/g,
        (
          character
        ) =>
          character.toUpperCase()
      );
  }


  private clampQuantity(
    value:
      number,

    minimum:
      number,

    maximum:
      number
  ):
    number {

    const numberValue =
      Number(
        value ||
        0
      );


    if (
      !Number.isFinite(
        numberValue
      )
    ) {

      return minimum;
    }


    return this.roundQuantity(
      Math.min(
        Math.max(
          numberValue,
          minimum
        ),
        maximum
      )
    );
  }


  private roundQuantity(
    value:
      number
  ):
    number {

    return Math.round(
      (
        Number(
          value ||
          0
        ) +
        Number.EPSILON
      ) *
      10000
    ) /
      10000;
  }


  private todayDate():
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


  private toDateInputValue(
    value:
      string
  ):
    string {

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


  private resolveErrorMessage(
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


  get isCompanyWarehouseDelivery():
    boolean {

    return (
      !this.selectedPurchaseOrder?.deliveryType ||
      this.selectedPurchaseOrder.deliveryType ===
        'company_warehouse'
    );
  }


  get purchaseOrderDestination():
    string {

    const order =
      this.selectedPurchaseOrder;


    if (
      !order
    ) {

      return '';
    }


    if (
      this.isCompanyWarehouseDelivery
    ) {

      return (
        order.warehouseName ||
        (
          typeof order.warehouse ===
          'object'
            ? order.warehouse?.name
            : ''
        ) ||
        'Company Warehouse'
      );
    }


    return (
      order.deliveryLocationName ||
      order.otherDeliveryType ||
      String(
        order.deliveryType ||
        ''
      )
        .replace(
          /_/g,
          ' '
        )
    );
  }

}