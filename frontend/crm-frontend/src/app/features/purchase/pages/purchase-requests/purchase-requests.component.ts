import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit
  } from '@angular/core';
  
  import { CommonModule } from '@angular/common';
  
  import {
    FormControl,
    ReactiveFormsModule
  } from '@angular/forms';
  
  import {
    RouterLink
  } from '@angular/router';
  
  import {
    Subject,
    debounceTime,
    distinctUntilChanged,
    finalize,
    takeUntil
  } from 'rxjs';
  
  import {
    PurchaseAccess,
    PurchasePriority,
    PurchaseRequest,
    PurchaseRequestFilters,
    PurchaseRequestStatus,
    PURCHASE_PRIORITY_OPTIONS,
    PURCHASE_REQUEST_STATUS_OPTIONS
  } from '../../models/purchase.models';
  
  import {
    PurchaseRequestService
  } from '../../services/purchase-request.service';
  
  
  @Component({
    selector: 'app-purchase-requests',
  
    standalone: true,
  
    imports: [
      CommonModule,
      ReactiveFormsModule,
      RouterLink
    ],
  
    templateUrl:
      './purchase-requests.component.html',
  
    styleUrl:
      './purchase-requests.component.scss',
  
    changeDetection:
      ChangeDetectionStrategy.OnPush
  })
  export class PurchaseRequestsComponent
    implements OnInit, OnDestroy {
  
    /* ============================================================
       CONTROLS
    ============================================================ */
  
    readonly searchControl =
      new FormControl<string>(
        '',
        {
          nonNullable: true
        }
      );
  
  
    readonly statusControl =
      new FormControl<
        PurchaseRequestStatus | ''
      >(
        '',
        {
          nonNullable: true
        }
      );
  
  
    readonly priorityControl =
      new FormControl<
        PurchasePriority | ''
      >(
        '',
        {
          nonNullable: true
        }
      );
  
  
    /* ============================================================
       OPTIONS
    ============================================================ */
  
    readonly statusOptions =
      PURCHASE_REQUEST_STATUS_OPTIONS;
  
  
    readonly priorityOptions =
      PURCHASE_PRIORITY_OPTIONS;
  
  
    /* ============================================================
       DATA
    ============================================================ */
  
    requests: PurchaseRequest[] = [];
  
  
    isLoading = false;
  
    errorMessage = '';
  
  
    /* ============================================================
       PURCHASE ACCESS
    ============================================================ */
  
    purchaseAccess:
      PurchaseAccess | null =
        null;
  
  
    isAccessLoading =
      false;
  
  
    accessErrorMessage =
      '';
  
  
    canApprove =
      false;
  
  
    /* ============================================================
       WORKFLOW ACTION STATE
    ============================================================ */
  
    actionRequestId:
      string | null =
        null;
  
  
    actionType:
      'submit' |
      'approve' |
      'reject' |
      null =
        null;
  
  
    actionMessage =
      '';
  
  
    actionErrorMessage =
      '';
  
  
    /* ============================================================
       PAGINATION
    ============================================================ */
  
    currentPage = 1;
  
    pageSize = 10;
  
    totalRecords = 0;
  
    totalPages = 1;
  
  
    /* ============================================================
       DESTROY
    ============================================================ */
  
    private readonly destroy$ =
      new Subject<void>();
  
  
    constructor(
      private readonly purchaseRequestService:
        PurchaseRequestService,
  
      private readonly cdr:
        ChangeDetectorRef
    ) {}
  
  
    /* ============================================================
       INIT
    ============================================================ */
  
    ngOnInit(): void {
  
      this.setupFilters();
  
      this.loadPurchaseAccess();
  
      this.loadPurchaseRequests();
    }
  
  
    /* ============================================================
       DESTROY
    ============================================================ */
  
    ngOnDestroy(): void {
  
      this.destroy$.next();
  
      this.destroy$.complete();
    }
  
  
    /* ============================================================
       PURCHASE ACCESS
    ============================================================ */
  
    loadPurchaseAccess(): void {
  
      this.isAccessLoading =
        true;
  
      this.accessErrorMessage =
        '';
  
  
      this.purchaseRequestService
        .getPurchaseAccess()
        .pipe(
          takeUntil(
            this.destroy$
          ),
  
          finalize(() => {
  
            this.isAccessLoading =
              false;
  
            this.cdr
              .markForCheck();
          })
        )
        .subscribe({
  
          next: (response) => {
  
            this.purchaseAccess =
              response ||
              null;
  
  
            this.canApprove =
              response
                ?.canApprove ===
              true;
  
  
            this.cdr
              .markForCheck();
          },
  
  
          error: (error) => {
  
            this.purchaseAccess =
              null;
  
            this.canApprove =
              false;
  
  
            this.accessErrorMessage =
              this.getErrorMessage(
                error,
                'Unable to verify Purchase approval access.'
              );
  
  
            this.cdr
              .markForCheck();
          }
        });
    }
  
  
    /* ============================================================
       FILTER EVENTS
    ============================================================ */
  
    private setupFilters(): void {
  
      this.searchControl
        .valueChanges
        .pipe(
          debounceTime(350),
          distinctUntilChanged(),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
  
          this.currentPage = 1;
  
          this.loadPurchaseRequests();
        });
  
  
      this.statusControl
        .valueChanges
        .pipe(
          distinctUntilChanged(),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
  
          this.currentPage = 1;
  
          this.loadPurchaseRequests();
        });
  
  
      this.priorityControl
        .valueChanges
        .pipe(
          distinctUntilChanged(),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
  
          this.currentPage = 1;
  
          this.loadPurchaseRequests();
        });
    }
  
  
    /* ============================================================
       LOAD PURCHASE REQUESTS
    ============================================================ */
  
    loadPurchaseRequests(): void {
  
      this.isLoading = true;
  
      this.errorMessage = '';
  
  
      const filters:
        PurchaseRequestFilters = {
  
          search:
            this.searchControl
              .value
              .trim(),
  
          status:
            this.statusControl
              .value,
  
          priority:
            this.priorityControl
              .value,
  
          page:
            this.currentPage,
  
          limit:
            this.pageSize
        };
  
  
      this.purchaseRequestService
        .getPurchaseRequests(
          filters
        )
        .pipe(
          takeUntil(
            this.destroy$
          ),
  
          finalize(() => {
  
            this.isLoading =
              false;
  
            this.cdr
              .markForCheck();
          })
        )
        .subscribe({
  
          next: (response) => {
  
            const rows =
              response?.rows;
  
  
            const pagination =
              response?.pagination;
  
  
            this.requests =
              Array.isArray(rows)
                ? rows
                : [];
  
  
            this.totalRecords =
              pagination?.total ??
              this.requests.length;
  
  
            this.currentPage =
              pagination?.page ??
              this.currentPage;
  
  
            this.pageSize =
              pagination?.limit ??
              this.pageSize;
  
  
            this.totalPages =
              Math.max(
                pagination?.pages ??
                  1,
                1
              );
  
  
            if (
              this.currentPage >
              this.totalPages
            ) {
  
              this.currentPage =
                this.totalPages;
            }
  
  
            this.cdr
              .markForCheck();
          },
  
  
          error: (error) => {
  
            this.requests = [];
  
            this.totalRecords = 0;
  
            this.totalPages = 1;
  
  
            this.errorMessage =
              this.getErrorMessage(
                error,
                'Unable to load purchase requests. Please try again.'
              );
  
  
            this.cdr
              .markForCheck();
          }
        });
    }
  
  
    /* ============================================================
       SUBMIT FOR APPROVAL
    ============================================================ */
  
    submitForApproval(
      request: PurchaseRequest
    ): void {
  
      if (
        !request?._id ||
        request.status !==
          'draft' ||
        this.isRequestActionLoading(
          request._id
        )
      ) {
  
        return;
      }
  
  
      this.startAction(
        request._id,
        'submit'
      );
  
  
      this.purchaseRequestService
        .submitForApproval(
          request._id
        )
        .pipe(
          takeUntil(
            this.destroy$
          ),
  
          finalize(() => {
  
            this.finishAction();
          })
        )
        .subscribe({
  
          next: () => {

            this.actionMessage =
              'Purchase request submitted for approval successfully.';
  
  
            this.loadPurchaseRequests();
  
  
            this.cdr
              .markForCheck();
          },
  
  
          error: (error) => {
  
            this.actionErrorMessage =
              this.getErrorMessage(
                error,
                'Unable to submit the purchase request for approval.'
              );
  
  
            this.cdr
              .markForCheck();
          }
        });
    }
  
  
    /* ============================================================
       APPROVE PURCHASE REQUEST
    ============================================================ */
  
    approveRequest(
      request: PurchaseRequest
    ): void {
  
      if (
        !this.canApprove ||
        !request?._id ||
        request.status !==
          'pending_approval' ||
        this.isRequestActionLoading(
          request._id
        )
      ) {
  
        return;
      }
  
  
      this.startAction(
        request._id,
        'approve'
      );
  
  
      this.purchaseRequestService
        .approvePurchaseRequest(
          request._id
        )
        .pipe(
          takeUntil(
            this.destroy$
          ),
  
          finalize(() => {
  
            this.finishAction();
          })
        )
        .subscribe({
  
          next: () => {

            this.actionMessage =
              'Purchase request approved successfully.';
  
  
            this.loadPurchaseRequests();
  
  
            this.cdr
              .markForCheck();
          },
  
  
          error: (error) => {
  
            this.actionErrorMessage =
              this.getErrorMessage(
                error,
                'Unable to approve the purchase request.'
              );
  
  
            this.cdr
              .markForCheck();
          }
        });
    }
  
  
    /* ============================================================
       REJECT PURCHASE REQUEST
    ============================================================ */
  
    rejectRequest(
      request: PurchaseRequest
    ): void {
  
      if (
        !this.canApprove ||
        !request?._id ||
        request.status !==
          'pending_approval' ||
        this.isRequestActionLoading(
          request._id
        )
      ) {
  
        return;
      }
  
  
      /*
       * Temporary browser prompt keeps the workflow functional
       * without introducing a new modal/component in this file.
       *
       * It can later be replaced by the project's existing
       * confirmation/dialog component if one is available.
       */
  
      const rejectionReason =
        window.prompt(
          'Enter rejection reason:'
        );
  
  
      if (
        rejectionReason ===
        null
      ) {
  
        return;
      }
  
  
      const cleanReason =
        rejectionReason
          .trim();
  
  
      if (
        cleanReason.length <
        3
      ) {
  
        this.actionMessage =
          '';
  
        this.actionErrorMessage =
          'Rejection reason must contain at least 3 characters.';
  
  
        this.cdr
          .markForCheck();
  
        return;
      }
  
  
      this.startAction(
        request._id,
        'reject'
      );
  
  
      this.purchaseRequestService
        .rejectPurchaseRequest(
          request._id,
          cleanReason
        )
        .pipe(
          takeUntil(
            this.destroy$
          ),
  
          finalize(() => {
  
            this.finishAction();
          })
        )
        .subscribe({
  
          next: () => {

            this.actionMessage =
              'Purchase request rejected successfully.';
  
  
            this.loadPurchaseRequests();
  
  
            this.cdr
              .markForCheck();
          },
  
  
          error: (error) => {
  
            this.actionErrorMessage =
              this.getErrorMessage(
                error,
                'Unable to reject the purchase request.'
              );
  
  
            this.cdr
              .markForCheck();
          }
        });
    }
  
  
    /* ============================================================
       ACTION STATE
    ============================================================ */
  
    isRequestActionLoading(
      requestId: string
    ): boolean {
  
      return (
        this.actionRequestId ===
          requestId &&
        this.actionType !==
          null
      );
    }
  
  
    isSubmitting(
      requestId: string
    ): boolean {
  
      return (
        this.actionRequestId ===
          requestId &&
        this.actionType ===
          'submit'
      );
    }
  
  
    isApproving(
      requestId: string
    ): boolean {
  
      return (
        this.actionRequestId ===
          requestId &&
        this.actionType ===
          'approve'
      );
    }
  
  
    isRejecting(
      requestId: string
    ): boolean {
  
      return (
        this.actionRequestId ===
          requestId &&
        this.actionType ===
          'reject'
      );
    }
  
  
    private startAction(
      requestId: string,
      action:
        'submit' |
        'approve' |
        'reject'
    ): void {
  
      this.actionRequestId =
        requestId;
  
      this.actionType =
        action;
  
      this.actionMessage =
        '';
  
      this.actionErrorMessage =
        '';
  
  
      this.cdr
        .markForCheck();
    }
  
  
    private finishAction(): void {
  
      this.actionRequestId =
        null;
  
      this.actionType =
        null;
  
  
      this.cdr
        .markForCheck();
    }
  
  
    /* ============================================================
       CLEAR ACTION MESSAGE
    ============================================================ */
  
    clearActionMessage(): void {
  
      this.actionMessage =
        '';
  
      this.actionErrorMessage =
        '';
  
  
      this.cdr
        .markForCheck();
    }
  
  
    /* ============================================================
       CLEAR FILTERS
    ============================================================ */
  
    clearFilters(): void {
  
      this.searchControl
        .setValue(
          '',
          {
            emitEvent: false
          }
        );
  
  
      this.statusControl
        .setValue(
          '',
          {
            emitEvent: false
          }
        );
  
  
      this.priorityControl
        .setValue(
          '',
          {
            emitEvent: false
          }
        );
  
  
      this.currentPage = 1;
  
  
      this.loadPurchaseRequests();
    }
  
  
    /* ============================================================
       PAGINATION
    ============================================================ */
  
    goToPreviousPage(): void {
  
      if (
        this.currentPage <= 1 ||
        this.isLoading
      ) {
  
        return;
      }
  
  
      this.currentPage--;
  
  
      this.loadPurchaseRequests();
    }
  
  
    goToNextPage(): void {
  
      if (
        this.currentPage >=
          this.totalPages ||
        this.isLoading
      ) {
  
        return;
      }
  
  
      this.currentPage++;
  
  
      this.loadPurchaseRequests();
    }
  
  
    /* ============================================================
       REQUESTED BY
    ============================================================ */
  
    getRequestedByName(
      request: PurchaseRequest
    ): string {
  
      if (
        request.requestedByName
          ?.trim()
      ) {
  
        return request
          .requestedByName;
      }
  
  
      const requestedBy =
        request.requestedBy;
  
  
      if (
        !requestedBy
      ) {
  
        return (
          request
            .requestedEmployeeCode ||
          '—'
        );
      }
  
  
      if (
        typeof requestedBy ===
          'string'
      ) {
  
        return (
          request
            .requestedEmployeeCode ||
          requestedBy ||
          '—'
        );
      }
  
  
      return (
        requestedBy.fullName ||
        requestedBy.employeeName ||
        requestedBy.name ||
        requestedBy.employeeCode ||
        request.requestedEmployeeCode ||
        '—'
      );
    }
  
  
    /* ============================================================
       DEPARTMENT
    ============================================================ */
  
    getDepartmentName(
      request: PurchaseRequest
    ): string {
  
      if (
        request.departmentName
          ?.trim()
      ) {
  
        return request
          .departmentName;
      }
  
  
      if (
        request.departmentCode
          ?.trim()
      ) {
  
        return request
          .departmentCode;
      }
  
  
      const department =
        request.departmentId ||
        request.requestingDepartment;
  
  
      if (
        !department
      ) {
  
        return '—';
      }
  
  
      if (
        typeof department ===
          'string'
      ) {
  
        return department;
      }
  
  
      return (
        department.departmentName ||
        department.name ||
        department.departmentCode ||
        department.code ||
        '—'
      );
    }
  
  
    /* ============================================================
       STATUS
    ============================================================ */
  
    getStatusLabel(
      status: PurchaseRequestStatus
    ): string {
  
      return (
        this.statusOptions.find(
          (option) =>
            option.value ===
            status
        )?.label ||
        this.formatValue(
          status
        )
      );
    }
  
  
    getStatusClass(
      status: PurchaseRequestStatus
    ): string {
  
      return (
        `status-badge--${status}`
      );
    }
  
  
    /* ============================================================
       PRIORITY
    ============================================================ */
  
    getPriorityLabel(
      priority: PurchasePriority
    ): string {
  
      return (
        this.priorityOptions.find(
          (option) =>
            option.value ===
            priority
        )?.label ||
        this.formatValue(
          priority
        )
      );
    }
  
  
    getPriorityClass(
      priority: PurchasePriority
    ): string {
  
      return (
        `priority-badge--${priority}`
      );
    }
  
  
    /* ============================================================
       ITEM
    ============================================================ */
  
    getItemName(
      request: PurchaseRequest
    ): string {
  
      return (
        request.item?.name ||
        request.itemName ||
        '—'
      );
    }
  
  
    /* ============================================================
       DATE
    ============================================================ */
  
    getDateValue(
      value?: string | null
    ): string {
  
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
  
        return value;
      }
  
  
      return new Intl.DateTimeFormat(
        'en-IN',
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
       TRACK BY
    ============================================================ */
  
    trackByRequest(
      index: number,
      request: PurchaseRequest
    ): string {
  
      return request._id;
    }
  
  
    /* ============================================================
       FORMAT
    ============================================================ */
  
    private formatValue(
      value: string
    ): string {
  
      return value
        .replace(
          /_/g,
          ' '
        )
        .replace(
          /\b\w/g,
          (character) =>
            character
              .toUpperCase()
        );
    }
  
  
    /* ============================================================
       ERROR MESSAGE
    ============================================================ */
  
    private getErrorMessage(
      error: unknown,
      fallback =
        'Something went wrong. Please try again.'
    ): string {
  
      if (
        error &&
        typeof error ===
          'object'
      ) {
  
        const typedError =
          error as {
  
            error?: {
              message?: string;
            };
  
            message?: string;
          };
  
  
        if (
          typedError.error
            ?.message
        ) {
  
          return typedError
            .error
            .message;
        }
  
  
        if (
          typedError.message
        ) {
  
          return typedError
            .message;
        }
      }
  
  
      return fallback;
    }
  }
