import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit
  } from '@angular/core';
  
  import { CommonModule } from '@angular/common';
  
  import {
    FormBuilder,
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
    Subject,
    finalize,
    takeUntil
  } from 'rxjs';
  
  import {
    PurchasePriority,
    PurchaseRequest,
    PurchaseRequestPayload,
    PURCHASE_PRIORITY_OPTIONS
  } from '../../models/purchase.models';
  
  import {
    PurchaseRequestService
  } from '../../services/purchase-request.service';
  
  
  @Component({
    selector: 'app-purchase-request-form',
  
    standalone: true,
  
    imports: [
      CommonModule,
      ReactiveFormsModule,
      RouterLink
    ],
  
    templateUrl:
      './purchase-request-form.component.html',
  
    styleUrl:
      './purchase-request-form.component.scss',
  
    changeDetection:
      ChangeDetectionStrategy.OnPush
  })
  export class PurchaseRequestFormComponent
    implements OnInit, OnDestroy {
  
    /* ============================================================
       FORM
    ============================================================ */
  
    form!: FormGroup;
  
  
    /* ============================================================
       MODE
    ============================================================ */
  
    isEditMode = false;
  
    purchaseRequestId = '';
  
    existingRequest:
      PurchaseRequest | null = null;
  
  
    /* ============================================================
       STATE
    ============================================================ */
  
    isLoading = false;
  
    isSubmitting = false;
  
    loadErrorMessage = '';
  
    submitErrorMessage = '';
  
    successMessage = '';
  
  
    /* ============================================================
       OPTIONS
    ============================================================ */
  
    readonly priorityOptions =
      PURCHASE_PRIORITY_OPTIONS;
  
  
    readonly unitOptions = [
      'Nos',
      'Piece',
      'Kg',
      'Gram',
      'Ton',
      'Litre',
      'Meter',
      'Box',
      'Pack',
      'Set',
      'Roll',
      'Bag',
      'Carton',
      'Other'
    ];
  
  
    /* ============================================================
       DESTROY
    ============================================================ */
  
    private readonly destroy$ =
      new Subject<void>();
  
  
    constructor(
      private readonly fb:
        FormBuilder,
  
      private readonly route:
        ActivatedRoute,
  
      private readonly router:
        Router,
  
      private readonly purchaseRequestService:
        PurchaseRequestService,
  
      private readonly cdr:
        ChangeDetectorRef
    ) {}
  
  
    /* ============================================================
       INIT
    ============================================================ */
  
    ngOnInit(): void {
  
      this.buildForm();
  
      this.purchaseRequestId =
        this.route.snapshot.paramMap.get('id') ?? '';
  
      this.isEditMode =
        Boolean(this.purchaseRequestId);
  
  
      if (this.isEditMode) {
  
        this.loadPurchaseRequest();
      }
    }
  
  
    /* ============================================================
       DESTROY
    ============================================================ */
  
    ngOnDestroy(): void {
  
      this.destroy$.next();
  
      this.destroy$.complete();
    }
  
  
    /* ============================================================
       BUILD FORM
    ============================================================ */
  
    private buildForm(): void {
  
      this.form =
        this.fb.group({
  
          requestDate: [
            this.getTodayDate(),
            [
              Validators.required
            ]
          ],
  
          itemName: [
            '',
            [
              Validators.required,
              Validators.maxLength(160)
            ]
          ],
  
          description: [
            '',
            [
              Validators.maxLength(1000)
            ]
          ],
  
          requiredQuantity: [
            null,
            [
              Validators.required,
              Validators.min(0.0001)
            ]
          ],
  
          unit: [
            'Nos',
            [
              Validators.required
            ]
          ],
  
          requiredDate: [
            '',
            [
              Validators.required
            ]
          ],
  
          purpose: [
            '',
            [
              Validators.required,
              Validators.maxLength(1000)
            ]
          ],
  
          priority: [
            'medium' as PurchasePriority,
            [
              Validators.required
            ]
          ],
  
          remarks: [
            '',
            [
              Validators.maxLength(1500)
            ]
          ]
        });
    }
  
  
    /* ============================================================
       LOAD EXISTING PURCHASE REQUEST
    ============================================================ */
  
    private loadPurchaseRequest(): void {
  
      if (!this.purchaseRequestId) {
  
        return;
      }
  
  
      this.isLoading = true;
  
      this.loadErrorMessage = '';
  
  
      this.purchaseRequestService
        .getPurchaseRequestById(
          this.purchaseRequestId
        )
        .pipe(
          takeUntil(this.destroy$),
  
          finalize(() => {
  
            this.isLoading = false;
  
            this.cdr.markForCheck();
          })
        )
        .subscribe({
  
          next: (response) => {
  
            const request =
              response;
  
  
            if (!request) {
  
              this.loadErrorMessage =
                'Purchase request details were not returned by the server.';
  
              this.cdr.markForCheck();
  
              return;
            }
  
  
            this.existingRequest =
              request;
  
  
            this.patchForm(request);
  
  
            this.cdr.markForCheck();
          },
  
  
          error: (error) => {
  
            this.loadErrorMessage =
              this.getErrorMessage(
                error,
                'Unable to load purchase request.'
              );
  
  
            this.cdr.markForCheck();
          }
        });
    }
  
  
    /* ============================================================
       PATCH FORM
    ============================================================ */
  
    private patchForm(
      request: PurchaseRequest
    ): void {
  
      this.form.patchValue({
  
        requestDate:
          this.toDateInputValue(
            request.requestDate
          ),
  
        itemName:
          request.item?.name ||
          request.itemName ||
          '',
  
        description:
          request.description || '',
  
        requiredQuantity:
          request.requiredQuantity,
  
        unit:
          request.unit || 'Nos',
  
        requiredDate:
          this.toDateInputValue(
            request.requiredDate
          ),
  
        purpose:
          request.purpose || '',
  
        priority:
          request.priority || 'medium',
  
        remarks:
          request.remarks || ''
      });
    }
  
  
    /* ============================================================
       SUBMIT
    ============================================================ */
  
    submit(): void {
  
      this.submitErrorMessage = '';
  
      this.successMessage = '';
  
  
      if (this.form.invalid) {
  
        this.form.markAllAsTouched();
  
        this.submitErrorMessage =
          'Please complete all required fields correctly.';
  
        this.scrollToFirstInvalidControl();
  
        return;
      }
  
  
      if (this.isSubmitting) {
  
        return;
      }
  
  
      const payload =
        this.buildPayload();
  
  
      this.isSubmitting = true;
  
  
      const request$ =
        this.isEditMode
          ? this.purchaseRequestService
              .updatePurchaseRequest(
                this.purchaseRequestId,
                payload
              )
          : this.purchaseRequestService
              .createPurchaseRequest(
                payload
              );
  
  
      request$
        .pipe(
          takeUntil(this.destroy$),
  
          finalize(() => {
  
            this.isSubmitting = false;
  
            this.cdr.markForCheck();
          })
        )
        .subscribe({
  
          next: (response) => {
  
            const savedRequest =
              response;
  
  
            this.successMessage =
              this.isEditMode
                ? 'Purchase request updated successfully.'
                : 'Purchase request created successfully.';
  
  
            this.cdr.markForCheck();
  
  
            const targetId =
              savedRequest?._id ||
              this.purchaseRequestId;
  
  
            if (targetId) {
  
              void this.router.navigate(
                [
                  '/purchase/purchase-requests',
                  targetId,
                  'edit'
                ]
              );
  
              return;
            }
  
  
            void this.router.navigate(
              [
                '/purchase/purchase-requests'
              ]
            );
          },
  
  
          error: (error) => {
  
            this.submitErrorMessage =
              this.getErrorMessage(
                error,
                this.isEditMode
                  ? 'Unable to update purchase request.'
                  : 'Unable to create purchase request.'
              );
  
  
            this.cdr.markForCheck();
          }
        });
    }
  
  
    /* ============================================================
       BUILD PAYLOAD
    ============================================================ */
  
    private buildPayload():
      PurchaseRequestPayload {
  
      const raw =
        this.form.getRawValue();
  
  
      return {
  
        requestDate:
          raw.requestDate || undefined,
  
        itemName:
          String(
            raw.itemName || ''
          ).trim(),
  
        description:
          this.normaliseOptionalText(
            raw.description
          ),
  
        requiredQuantity:
          Number(
            raw.requiredQuantity
          ),
  
        unit:
          String(
            raw.unit || ''
          ).trim(),
  
        requiredDate:
          raw.requiredDate || null,
  
        purpose:
          this.normaliseOptionalText(
            raw.purpose
          ),
  
        priority:
          raw.priority as PurchasePriority,
  
        remarks:
          this.normaliseOptionalText(
            raw.remarks
          )
      };
    }
  
  
    /* ============================================================
       CANCEL
    ============================================================ */
  
    cancel(): void {
  
      void this.router.navigate(
        [
          '/purchase/purchase-requests'
        ]
      );
    }
  
  
    /* ============================================================
       FORM HELPERS
    ============================================================ */
  
    isInvalid(
      controlName: string
    ): boolean {
  
      const control =
        this.form.get(controlName);
  
  
      return Boolean(
        control &&
        control.invalid &&
        (
          control.touched ||
          control.dirty
        )
      );
    }
  
  
    hasError(
      controlName: string,
      errorName: string
    ): boolean {
  
      return Boolean(
        this.form
          .get(controlName)
          ?.hasError(errorName)
      );
    }
  
  
    getControlValue(
      controlName: string
    ): unknown {
  
      return this.form
        .get(controlName)
        ?.value;
    }
  
  
    /* ============================================================
       STATUS HELPERS
    ============================================================ */
  
    getExistingStatusLabel(): string {
  
      const status =
        this.existingRequest?.status;
  
  
      if (!status) {
  
        return '';
      }
  
  
      return status
        .replace(
          /_/g,
          ' '
        )
        .replace(
          /\b\w/g,
          (character) =>
            character.toUpperCase()
        );
    }
  
  
    getExistingReference(): string {
  
      return (
        this.existingRequest?.prNumber ||
        ''
      );
    }
  
  
    /* ============================================================
       DATE HELPERS
    ============================================================ */
  
    private getTodayDate(): string {
  
      const now =
        new Date();
  
  
      const year =
        now.getFullYear();
  
  
      const month =
        String(
          now.getMonth() + 1
        ).padStart(
          2,
          '0'
        );
  
  
      const day =
        String(
          now.getDate()
        ).padStart(
          2,
          '0'
        );
  
  
      return `${year}-${month}-${day}`;
    }
  
  
    private toDateInputValue(
      value?: string | null
    ): string {
  
      if (!value) {
  
        return '';
      }
  
  
      const directMatch =
        value.match(
          /^\d{4}-\d{2}-\d{2}/
        );
  
  
      if (directMatch) {
  
        return directMatch[0];
      }
  
  
      const date =
        new Date(value);
  
  
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
          date.getMonth() + 1
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
  
  
    /* ============================================================
       OPTIONAL TEXT
    ============================================================ */
  
    private normaliseOptionalText(
      value: unknown
    ): string | undefined {
  
      if (
        typeof value !== 'string'
      ) {
  
        return undefined;
      }
  
  
      const trimmed =
        value.trim();
  
  
      return trimmed || undefined;
    }
  
  
    /* ============================================================
       SCROLL TO INVALID
    ============================================================ */
  
    private scrollToFirstInvalidControl(): void {
  
      if (
        typeof document ===
        'undefined'
      ) {
  
        return;
      }
  
  
      setTimeout(
        () => {
  
          const element =
            document.querySelector(
              '.form-control--invalid, .form-select--invalid, .form-textarea--invalid'
            );
  
  
          if (
            element instanceof HTMLElement
          ) {
  
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
  
  
            element.focus();
          }
        },
        0
      );
    }
  
  
    /* ============================================================
       ERROR
    ============================================================ */
  
    private getErrorMessage(
      error: unknown,
      fallback: string
    ): string {
  
      if (
        error &&
        typeof error === 'object'
      ) {
  
        const typedError =
          error as {
            error?: {
              message?: string;
              error?: string;
            };
  
            message?: string;
          };
  
  
        if (
          typedError.error?.message
        ) {
  
          return typedError.error.message;
        }
  
  
        if (
          typedError.error?.error
        ) {
  
          return typedError.error.error;
        }
  
  
        if (
          typedError.message
        ) {
  
          return typedError.message;
        }
      }
  
  
      return fallback;
    }
  }
