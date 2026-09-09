import {
  CommonModule
} from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import {
  FormsModule
} from '@angular/forms';

import {
  Router
} from '@angular/router';

import {
  finalize
} from 'rxjs/operators';

import {
  GoodsReceipt,
  GoodsReceiptFilters,
  GoodsReceiptStatus,
  GoodsReceiptStatusCounts,
  GOODS_RECEIPT_STATUS_OPTIONS,
  PurchasePagination
} from '../../models/purchase.models';

import {
  GoodsReceiptService
} from '../../services/goods-receipt.service';


@Component({
  selector: 'app-goods-receipts',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl:
    './goods-receipts.component.html',

  styleUrl:
    './goods-receipts.component.scss'
})
export class GoodsReceiptsComponent
  implements OnInit {

  /* ============================================================
     STATE
  ============================================================ */

  loading =
    false;

  statusCountsLoading =
    false;

  errorMessage =
    '';

  goodsReceipts:
    GoodsReceipt[] = [];

  readonly statusOptions =
    GOODS_RECEIPT_STATUS_OPTIONS;


  /* ============================================================
     FILTERS
  ============================================================ */

  filters:
    GoodsReceiptFilters = {

      search:
        '',

      status:
        '',

      fromDate:
        '',

      toDate:
        '',

      page:
        1,

      limit:
        20,

      sort:
        '-receiptDate'

    };


  /* ============================================================
     PAGINATION
  ============================================================ */

  pagination:
    PurchasePagination = {

      total:
        0,

      page:
        1,

      limit:
        20,

      pages:
        1

    };


  /* ============================================================
     STATUS COUNTS
  ============================================================ */

  statusCounts:
    GoodsReceiptStatusCounts = {

      received:
        0,

      partial:
        0,

      rejected:
        0,

      completed:
        0

    };


  constructor(
    private readonly goodsReceiptService:
      GoodsReceiptService,

    private readonly router:
      Router,

    private readonly cdr:
      ChangeDetectorRef
  ) {}


  /* ============================================================
     INIT
  ============================================================ */

  ngOnInit():
    void {

    this.loadGoodsReceipts();

    this.loadStatusCounts();
  }


  /* ============================================================
     LOAD LIST
  ============================================================ */

  loadGoodsReceipts():
    void {

    this.loading =
      true;

    this.errorMessage =
      '';


    this.goodsReceiptService
      .getAll(
        this.filters
      )
      .pipe(
        finalize(
          () => {

            this.loading =
              false;

            this.cdr
              .markForCheck();

          }
        )
      )
      .subscribe({

        next:
          (
            response
          ) => {

            this.goodsReceipts =
              Array.isArray(
                response?.rows
              )
                ? response.rows
                : [];


            this.pagination =
              response?.pagination || {

                total:
                  0,

                page:
                  Number(
                    this.filters.page ||
                    1
                  ),

                limit:
                  Number(
                    this.filters.limit ||
                    20
                  ),

                pages:
                  1

              };

          },

        error:
          (
            error
          ) => {

            this.goodsReceipts =
              [];


            this.pagination = {

              total:
                0,

              page:
                1,

              limit:
                Number(
                  this.filters.limit ||
                  20
                ),

              pages:
                1

            };


            this.errorMessage =
              this.resolveErrorMessage(
                error,
                'Unable to load Goods Receipts.'
              );

          }

      });
  }


  /* ============================================================
     STATUS COUNTS
  ============================================================ */

  loadStatusCounts():
    void {

    this.statusCountsLoading =
      true;


    this.goodsReceiptService
      .getStatusCounts()
      .pipe(
        finalize(
          () => {

            this.statusCountsLoading =
              false;

            this.cdr
              .markForCheck();

          }
        )
      )
      .subscribe({

        next:
          (
            response
          ) => {

            this.statusCounts = {

              received:
                Number(
                  response?.received ||
                  0
                ),

              partial:
                Number(
                  response?.partial ||
                  0
                ),

              rejected:
                Number(
                  response?.rejected ||
                  0
                ),

              completed:
                Number(
                  response?.completed ||
                  0
                )

            };

          },

        error:
          () => {

            this.statusCounts = {

              received:
                0,

              partial:
                0,

              rejected:
                0,

              completed:
                0

            };

          }

      });
  }


  /* ============================================================
     SEARCH
  ============================================================ */

  applyFilters():
    void {

    this.filters.page =
      1;

    this.loadGoodsReceipts();
  }


  onSearchEnter():
    void {

    this.applyFilters();
  }


  /* ============================================================
     STATUS FILTER
  ============================================================ */

  setStatusFilter(
    status:
      GoodsReceiptStatus |
      ''
  ):
    void {

    this.filters.status =
      status;

    this.filters.page =
      1;

    this.loadGoodsReceipts();
  }


  /* ============================================================
     RESET FILTERS
  ============================================================ */

  resetFilters():
    void {

    this.filters = {

      search:
        '',

      status:
        '',

      fromDate:
        '',

      toDate:
        '',

      page:
        1,

      limit:
        20,

      sort:
        '-receiptDate'

    };


    this.loadGoodsReceipts();
  }


  /* ============================================================
     CREATE
  ============================================================ */

  createGoodsReceipt():
    void {

    this.router.navigate(
      [
        '/purchase/goods-receipts/new'
      ]
    );
  }


  /* ============================================================
     VIEW
  ============================================================ */

  viewGoodsReceipt(
    goodsReceipt:
      GoodsReceipt
  ):
    void {

    if (
      !goodsReceipt?._id
    ) {

      return;
    }


    this.router.navigate(
      [
        '/purchase/goods-receipts',
        goodsReceipt._id
      ]
    );
  }


  /* ============================================================
     PAGINATION
  ============================================================ */

  previousPage():
    void {

    if (
      this.pagination.page <=
      1 ||
      this.loading
    ) {

      return;
    }


    this.filters.page =
      this.pagination.page -
      1;

    this.loadGoodsReceipts();
  }


  nextPage():
    void {

    if (
      this.pagination.page >=
      this.pagination.pages ||
      this.loading
    ) {

      return;
    }


    this.filters.page =
      this.pagination.page +
      1;

    this.loadGoodsReceipts();
  }


  goToPage(
    page:
      number
  ):
    void {

    if (
      page <
      1 ||
      page >
      this.pagination.pages ||
      page ===
      this.pagination.page ||
      this.loading
    ) {

      return;
    }


    this.filters.page =
      page;

    this.loadGoodsReceipts();
  }


  get pageNumbers():
    number[] {

    const totalPages =
      Math.max(
        Number(
          this.pagination.pages ||
          1
        ),
        1
      );


    const currentPage =
      Math.max(
        Number(
          this.pagination.page ||
          1
        ),
        1
      );


    const start =
      Math.max(
        currentPage -
        2,
        1
      );


    const end =
      Math.min(
        start +
        4,
        totalPages
      );


    const adjustedStart =
      Math.max(
        end -
        4,
        1
      );


    const pages:
      number[] = [];


    for (
      let page =
        adjustedStart;
      page <=
        end;
      page +=
        1
    ) {

      pages.push(
        page
      );
    }


    return pages;
  }


  /* ============================================================
     DISPLAY HELPERS
  ============================================================ */

  statusLabel(
    status:
      GoodsReceiptStatus |
      string
  ):
    string {

    return this.statusOptions
      .find(
        (
          option
        ) =>
          option.value ===
          status
      )
      ?.label ||
      this.humanize(
        status
      );
  }


  statusClass(
    status:
      GoodsReceiptStatus |
      string
  ):
    string {

    switch (
      status
    ) {

      case 'received':
        return 'status-received';

      case 'partial':
        return 'status-partial';

      case 'rejected':
        return 'status-rejected';

      case 'completed':
        return 'status-completed';

      default:
        return 'status-default';

    }
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


  totalCurrentReceived(
    goodsReceipt:
      GoodsReceipt
  ):
    number {

    return (
      goodsReceipt?.items ||
      []
    )
      .reduce(
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
      );
  }


  totalAccepted(
    goodsReceipt:
      GoodsReceipt
  ):
    number {

    return (
      goodsReceipt?.items ||
      []
    )
      .reduce(
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
      );
  }


  totalRejected(
    goodsReceipt:
      GoodsReceipt
  ):
    number {

    return (
      goodsReceipt?.items ||
      []
    )
      .reduce(
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
      );
  }


  totalRemaining(
    goodsReceipt:
      GoodsReceipt
  ):
    number {

    return (
      goodsReceipt?.items ||
      []
    )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.remainingQuantity ||
            0
          ),
        0
      );
  }


  trackByGoodsReceipt(
    _index:
      number,

    goodsReceipt:
      GoodsReceipt
  ):
    string {

    return goodsReceipt._id;
  }


  /* ============================================================
     PRIVATE HELPERS
  ============================================================ */

  private humanize(
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
      error?.message ||
      fallback
    );
  }

}
