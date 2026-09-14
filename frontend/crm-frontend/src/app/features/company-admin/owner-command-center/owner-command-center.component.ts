import {
    CommonModule
  } from '@angular/common';
  
  import {
    Component,
    computed,
    inject,
    signal
  } from '@angular/core';
  
  import {
    FormsModule
  } from '@angular/forms';
  
  import {
    finalize
  } from 'rxjs';
  
  import {
    CompanyOwnerOverview,
    CompanyOwnerOverviewService,
    OwnerOutstandingAccount
  } from '../services/company-owner-overview.service';
  
  
  interface OwnerKpiCard {
    key: string;
    label: string;
    value: number;
    formattedValue: string;
    icon: string;
    tone:
      | 'primary'
      | 'positive'
      | 'negative'
      | 'warning'
      | 'neutral';
    meta: string;
  }
  
  
  interface OwnerHealthCard {
    label: string;
    value: string;
    status:
      | 'good'
      | 'warning'
      | 'danger'
      | 'neutral';
    meta: string;
  }
  
  
  @Component({
    selector:
      'app-owner-command-center',
  
    standalone:
      true,
  
    imports: [
      CommonModule,
      FormsModule
    ],
  
    templateUrl:
      './owner-command-center.component.html',
  
    styleUrls: [
      './owner-command-center.component.scss'
    ]
  })
  export class OwnerCommandCenterComponent {
  
    private readonly ownerOverviewService =
      inject(
        CompanyOwnerOverviewService
      );
  
  
    /* ============================================================
       CORE STATE
    ============================================================ */
  
    protected readonly overview =
      signal<CompanyOwnerOverview | null>(
        null
      );
  
  
    protected readonly isLoading =
      signal(
        false
      );
  
  
    protected readonly errorMessage =
      signal(
        ''
      );
  
  
    protected readonly lastUpdated =
      signal(
        ''
      );
  
  
    protected readonly fromDate =
      signal(
        ''
      );
  
  
    protected readonly toDate =
      signal(
        ''
      );
  
  
    protected readonly asOfDate =
      signal(
        ''
      );
  
  
    /* ============================================================
       FINANCIAL DATA
    ============================================================ */
  
    protected readonly financial =
      computed(
        () =>
          this.overview()
            ?.financial ||
          null
      );
  
  
    protected readonly revenue =
      computed(
        () =>
          Number(
            this.financial()
              ?.revenue ||
            0
          )
      );
  
  
    protected readonly expenses =
      computed(
        () =>
          Number(
            this.financial()
              ?.expenses ||
            0
          )
      );
  
  
    protected readonly netProfit =
      computed(
        () =>
          Number(
            this.financial()
              ?.netProfit ||
            0
          )
      );
  
  
    protected readonly netLoss =
      computed(
        () =>
          Number(
            this.financial()
              ?.netLoss ||
            0
          )
      );
  
  
    protected readonly profitMargin =
      computed(
        () =>
          Number(
            this.financial()
              ?.profitMargin ||
            0
          )
      );
  
  
    protected readonly cashBankBalance =
      computed(
        () =>
          Number(
            this.financial()
              ?.cashBankBalance ||
            0
          )
      );
  
  
    protected readonly receivable =
      computed(
        () =>
          Number(
            this.financial()
              ?.receivable ||
            0
          )
      );
  
  
    protected readonly payable =
      computed(
        () =>
          Number(
            this.financial()
              ?.payable ||
            0
          )
      );
  
  
    protected readonly netOutstanding =
      computed(
        () =>
          Number(
            this.financial()
              ?.netOutstanding ||
            0
          )
      );
  
  
    protected readonly assets =
      computed(
        () =>
          Number(
            this.financial()
              ?.assets ||
            0
          )
      );
  
  
    protected readonly liabilities =
      computed(
        () =>
          Number(
            this.financial()
              ?.liabilities ||
            0
          )
      );
  
  
    protected readonly equity =
      computed(
        () =>
          Number(
            this.financial()
              ?.equity ||
            0
          )
      );
  
  
    protected readonly booksBalanced =
      computed(
        () =>
          this.financial()
            ?.booksBalanced ===
          true
      );
  
  
    protected readonly balanceDifference =
      computed(
        () =>
          Number(
            this.financial()
              ?.balanceDifference ||
            0
          )
      );
  
  
    protected readonly result =
      computed(
        () =>
          String(
            this.financial()
              ?.result ||
            'break-even'
          )
      );
  
  
    /* ============================================================
       REPORT DATA
    ============================================================ */
  
    protected readonly profitLossReport =
      computed(
        () =>
          this.overview()
            ?.reports
            ?.profitLoss ||
          null
      );
  
  
    protected readonly balanceSheetReport =
      computed(
        () =>
          this.overview()
            ?.reports
            ?.balanceSheet ||
          null
      );
  
  
    protected readonly cashBankReport =
      computed(
        () =>
          this.overview()
            ?.reports
            ?.cashBank ||
          null
      );
  
  
    protected readonly outstandingReport =
      computed(
        () =>
          this.overview()
            ?.reports
            ?.outstanding ||
          null
      );
  
  
    /* ============================================================
       KPI CARDS
    ============================================================ */
  
    protected readonly primaryKpis =
      computed<OwnerKpiCard[]>(
        () => [
          {
            key:
              'revenue',
  
            label:
              'Revenue',
  
            value:
              this.revenue(),
  
            formattedValue:
              this.formatCurrency(
                this.revenue()
              ),
  
            icon:
              'trending-up',
  
            tone:
              'positive',
  
            meta:
              'Total income for selected period'
          },
  
          {
            key:
              'expenses',
  
            label:
              'Expenses',
  
            value:
              this.expenses(),
  
            formattedValue:
              this.formatCurrency(
                this.expenses()
              ),
  
            icon:
              'receipt',
  
            tone:
              'warning',
  
            meta:
              'Total accounting expenses'
          },
  
          {
            key:
              'net-profit',
  
            label:
              this.netLoss() >
              0
                ? 'Net Loss'
                : 'Net Profit',
  
            value:
              this.netLoss() >
              0
                ? this.netLoss()
                : this.netProfit(),
  
            formattedValue:
              this.formatCurrency(
                this.netLoss() >
                0
                  ? this.netLoss()
                  : this.netProfit()
              ),
  
            icon:
              this.netLoss() >
              0
                ? 'trending-down'
                : 'chart',
  
            tone:
              this.netLoss() >
              0
                ? 'negative'
                : 'positive',
  
            meta:
              this.resultLabel()
          },
  
          {
            key:
              'margin',
  
            label:
              'Profit Margin',
  
            value:
              this.profitMargin(),
  
            formattedValue:
              `${this.formatNumber(
                this.profitMargin(),
                2
              )}%`,
  
            icon:
              'percent',
  
            tone:
              this.profitMargin() <
              0
                ? 'negative'
                : this.profitMargin() <
                  10
                    ? 'warning'
                    : 'positive',
  
            meta:
              'Net profit ÷ revenue'
          },
  
          {
            key:
              'cash-bank',
  
            label:
              'Cash & Bank',
  
            value:
              this.cashBankBalance(),
  
            formattedValue:
              this.formatCurrency(
                this.cashBankBalance()
              ),
  
            icon:
              'wallet',
  
            tone:
              this.cashBankBalance() <
              0
                ? 'negative'
                : 'primary',
  
            meta:
              'Combined closing liquidity'
          },
  
          {
            key:
              'receivable',
  
            label:
              'Receivable',
  
            value:
              this.receivable(),
  
            formattedValue:
              this.formatCurrency(
                this.receivable()
              ),
  
            icon:
              'arrow-down',
  
            tone:
              'primary',
  
            meta:
              'Amount due from customers'
          },
  
          {
            key:
              'payable',
  
            label:
              'Payable',
  
            value:
              this.payable(),
  
            formattedValue:
              this.formatCurrency(
                this.payable()
              ),
  
            icon:
              'arrow-up',
  
            tone:
              this.payable() >
              this.receivable()
                ? 'warning'
                : 'neutral',
  
            meta:
              'Amount payable to vendors'
          },
  
          {
            key:
              'net-outstanding',
  
            label:
              'Net Outstanding',
  
            value:
              this.netOutstanding(),
  
            formattedValue:
              this.formatCurrency(
                this.netOutstanding()
              ),
  
            icon:
              'balance',
  
            tone:
              this.netOutstanding() <
              0
                ? 'warning'
                : 'positive',
  
            meta:
              'Receivable minus payable'
          }
        ]
      );
  
  
    protected readonly balanceSheetKpis =
      computed<OwnerKpiCard[]>(
        () => [
          {
            key:
              'assets',
  
            label:
              'Total Assets',
  
            value:
              this.assets(),
  
            formattedValue:
              this.formatCurrency(
                this.assets()
              ),
  
            icon:
              'assets',
  
            tone:
              'primary',
  
            meta:
              'Accounting balance sheet'
          },
  
          {
            key:
              'liabilities',
  
            label:
              'Total Liabilities',
  
            value:
              this.liabilities(),
  
            formattedValue:
              this.formatCurrency(
                this.liabilities()
              ),
  
            icon:
              'liabilities',
  
            tone:
              'warning',
  
            meta:
              'Accounting balance sheet'
          },
  
          {
            key:
              'equity',
  
            label:
              'Total Equity',
  
            value:
              this.equity(),
  
            formattedValue:
              this.formatCurrency(
                this.equity()
              ),
  
            icon:
              'equity',
  
            tone:
              this.equity() <
              0
                ? 'negative'
                : 'positive',
  
            meta:
              'Company equity position'
          }
        ]
      );
  
  
    /* ============================================================
       FINANCIAL HEALTH
    ============================================================ */
  
    protected readonly financialHealthCards =
      computed<OwnerHealthCard[]>(
        () => [
          {
            label:
              'Books Status',
  
            value:
              this.booksBalanced()
                ? 'Balanced'
                : 'Needs Review',
  
            status:
              this.booksBalanced()
                ? 'good'
                : 'danger',
  
            meta:
              this.booksBalanced()
                ? 'Balance sheet is balanced'
                : `Difference ${this.formatCurrency(
                    this.balanceDifference()
                  )}`
          },
  
          {
            label:
              'Profitability',
  
            value:
              this.netLoss() >
              0
                ? 'Loss'
                : this.netProfit() >
                  0
                    ? 'Profitable'
                    : 'Break Even',
  
            status:
              this.netLoss() >
              0
                ? 'danger'
                : this.netProfit() >
                  0
                    ? 'good'
                    : 'neutral',
  
            meta:
              `${this.formatNumber(
                this.profitMargin(),
                2
              )}% margin`
          },
  
          {
            label:
              'Liquidity',
  
            value:
              this.cashBankBalance() >
              0
                ? 'Positive'
                : this.cashBankBalance() <
                  0
                    ? 'Negative'
                    : 'Neutral',
  
            status:
              this.cashBankBalance() >
              0
                ? 'good'
                : this.cashBankBalance() <
                  0
                    ? 'danger'
                    : 'neutral',
  
            meta:
              this.formatCurrency(
                this.cashBankBalance()
              )
          },
  
          {
            label:
              'Outstanding Position',
  
            value:
              this.netOutstanding() >=
              0
                ? 'Net Receivable'
                : 'Net Payable',
  
            status:
              this.netOutstanding() >=
              0
                ? 'good'
                : 'warning',
  
            meta:
              this.formatCurrency(
                Math.abs(
                  this.netOutstanding()
                )
              )
          }
        ]
      );
  
  
    /* ============================================================
       RECEIVABLE / PAYABLE TABLES
    ============================================================ */
  
    protected readonly receivableRows =
      computed<OwnerOutstandingAccount[]>(
        () =>
          this.outstandingReport()
            ?.receivables
            ?.accounts ||
          []
      );
  
  
    protected readonly payableRows =
      computed<OwnerOutstandingAccount[]>(
        () =>
          this.outstandingReport()
            ?.payables
            ?.accounts ||
          []
      );
  
  
    protected readonly topReceivables =
      computed(
        () =>
          [
            ...this.receivableRows()
          ]
            .sort(
              (
                a,
                b
              ) =>
                Number(
                  b.outstanding ||
                  0
                ) -
                Number(
                  a.outstanding ||
                  0
                )
            )
            .slice(
              0,
              8
            )
      );
  
  
    protected readonly topPayables =
      computed(
        () =>
          [
            ...this.payableRows()
          ]
            .sort(
              (
                a,
                b
              ) =>
                Number(
                  b.outstanding ||
                  0
                ) -
                Number(
                  a.outstanding ||
                  0
                )
            )
            .slice(
              0,
              8
            )
      );
  
  
    /* ============================================================
       CASH / BANK
    ============================================================ */
  
    protected readonly cashBankAccounts =
      computed(
        () =>
          this.cashBankReport()
            ?.accounts ||
          []
      );
  
  
    protected readonly totalCashBankAccounts =
      computed(
        () =>
          Number(
            this.cashBankReport()
              ?.summary
              ?.totalAccounts ||
            0
          )
      );
  
  
    protected readonly totalCashBankOpening =
      computed(
        () =>
          Number(
            this.cashBankReport()
              ?.summary
              ?.totalOpening ||
            0
          )
      );
  
  
    protected readonly totalCashBankDebit =
      computed(
        () =>
          Number(
            this.cashBankReport()
              ?.summary
              ?.totalDebit ||
            0
          )
      );
  
  
    protected readonly totalCashBankCredit =
      computed(
        () =>
          Number(
            this.cashBankReport()
              ?.summary
              ?.totalCredit ||
            0
          )
      );
  
  
    /* ============================================================
       PERIOD LABELS
    ============================================================ */
  
    protected readonly periodLabel =
      computed(
        () => {
  
          const period =
            this.overview()
              ?.period;
  
  
          if (
            !period
          ) {
  
            return '-';
          }
  
  
          return `${this.formatDate(
            period.from
          )} - ${this.formatDate(
            period.to
          )}`;
        }
      );
  
  
    protected readonly asOfLabel =
      computed(
        () => {
  
          const asOf =
            this.overview()
              ?.period
              ?.asOf;
  
  
          return asOf
            ? this.formatDate(
                asOf
              )
            : '-';
        }
      );
  
  
    /* ============================================================
       CONSTRUCTOR
    ============================================================ */
  
    constructor() {
  
      this.useCurrentFinancialYear(
        false
      );
  
  
      this.loadOverview();
  
    }
  
  
    /* ============================================================
       API
    ============================================================ */
  
    protected loadOverview(): void {
  
      if (
        this.isLoading()
      ) {
  
        return;
      }
  
  
      if (
        !this.validateDateRange()
      ) {
  
        return;
      }
  
  
      this.isLoading.set(
        true
      );
  
  
      this.errorMessage.set(
        ''
      );
  
  
      this.ownerOverviewService
        .getOverview({
          from:
            this.fromDate(),
  
          to:
            this.toDate(),
  
          asOf:
            this.asOfDate()
        })
        .pipe(
          finalize(
            () =>
              this.isLoading.set(
                false
              )
          )
        )
        .subscribe({
          next:
            (
              response
            ) => {
  
              this.overview.set(
                response
              );
  
  
              if (
                response.period
              ) {
  
                this.fromDate.set(
                  response.period.from
                );
  
  
                this.toDate.set(
                  response.period.to
                );
  
  
                this.asOfDate.set(
                  response.period.asOf
                );
  
              }
  
  
              this.lastUpdated.set(
                response.generatedAt ||
                new Date()
                  .toISOString()
              );
  
            },
  
          error:
            (
              error: {
                error?: {
                  message?: string;
                };
  
                message?: string;
              }
            ) => {
  
              this.overview.set(
                null
              );
  
  
              this.errorMessage.set(
                error.error?.message ||
                error.message ||
                'Unable to load owner financial overview.'
              );
  
            }
        });
  
    }
  
  
    /* ============================================================
       FILTER ACTIONS
    ============================================================ */
  
    protected applyDateFilter(): void {
  
      this.loadOverview();
  
    }
  
  
    protected useCurrentFinancialYear(
      load =
        true
    ): void {
  
      const period =
        this.ownerOverviewService
          .currentFinancialYear();
  
  
      this.fromDate.set(
        period.from
      );
  
  
      this.toDate.set(
        period.to
      );
  
  
      this.asOfDate.set(
        period.asOf
      );
  
  
      this.errorMessage.set(
        ''
      );
  
  
      if (
        load
      ) {
  
        this.loadOverview();
  
      }
  
    }
  
  
    protected useCurrentMonth(): void {
  
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
  
  
      const firstDay =
        `${year}-${month}-01`;
  
  
      const today =
        this.localDateString(
          now
        );
  
  
      this.fromDate.set(
        firstDay
      );
  
  
      this.toDate.set(
        today
      );
  
  
      this.asOfDate.set(
        today
      );
  
  
      this.loadOverview();
  
    }
  
  
    protected useToday(): void {
  
      const today =
        this.localDateString(
          new Date()
        );
  
  
      this.fromDate.set(
        today
      );
  
  
      this.toDate.set(
        today
      );
  
  
      this.asOfDate.set(
        today
      );
  
  
      this.loadOverview();
  
    }
  
  
    protected onFromDateChange(
      value: string
    ): void {
  
      this.fromDate.set(
        value
      );
  
  
      if (
        value &&
        this.toDate() &&
        value >
        this.toDate()
      ) {
  
        this.toDate.set(
          value
        );
  
      }
  
  
      if (
        value &&
        this.asOfDate() &&
        value >
        this.asOfDate()
      ) {
  
        this.asOfDate.set(
          this.toDate() ||
          value
        );
  
      }
  
    }
  
  
    protected onToDateChange(
      value: string
    ): void {
  
      this.toDate.set(
        value
      );
  
  
      if (
        value
      ) {
  
        this.asOfDate.set(
          value
        );
  
      }
  
    }
  
  
    protected onAsOfDateChange(
      value: string
    ): void {
  
      this.asOfDate.set(
        value
      );
  
    }
  
  
    /* ============================================================
       BUSINESS LABELS
    ============================================================ */
  
    protected resultLabel(): string {
  
      const result =
        this.result()
          .trim()
          .toLowerCase();
  
  
      if (
        result ===
        'profit'
      ) {
  
        return 'Company is profitable';
  
      }
  
  
      if (
        result ===
        'loss'
      ) {
  
        return 'Company is currently in loss';
  
      }
  
  
      return 'Company is at break-even';
  
    }
  
  
    protected ownerAlertCount(): number {
  
      let alerts =
        0;
  
  
      if (
        !this.booksBalanced()
      ) {
  
        alerts +=
          1;
  
      }
  
  
      if (
        this.netLoss() >
        0
      ) {
  
        alerts +=
          1;
  
      }
  
  
      if (
        this.cashBankBalance() <
        0
      ) {
  
        alerts +=
          1;
  
      }
  
  
      if (
        this.payable() >
        this.receivable()
      ) {
  
        alerts +=
          1;
  
      }
  
  
      return alerts;
  
    }
  
  
    protected ownerAlerts(): {
      title: string;
      message: string;
      severity:
        | 'danger'
        | 'warning'
        | 'info';
    }[] {
  
      const alerts: {
        title: string;
        message: string;
        severity:
          | 'danger'
          | 'warning'
          | 'info';
      }[] = [];
  
  
      if (
        !this.booksBalanced()
      ) {
  
        alerts.push({
          title:
            'Books require review',
  
          message:
            `Balance sheet difference is ${this.formatCurrency(
              this.balanceDifference()
            )}.`,
  
          severity:
            'danger'
        });
  
      }
  
  
      if (
        this.netLoss() >
        0
      ) {
  
        alerts.push({
          title:
            'Net loss detected',
  
          message:
            `Current period net loss is ${this.formatCurrency(
              this.netLoss()
            )}.`,
  
          severity:
            'danger'
        });
  
      }
  
  
      if (
        this.cashBankBalance() <
        0
      ) {
  
        alerts.push({
          title:
            'Negative liquidity',
  
          message:
            `Cash & Bank closing position is ${this.formatCurrency(
              this.cashBankBalance()
            )}.`,
  
          severity:
            'danger'
        });
  
      }
  
  
      if (
        this.payable() >
        this.receivable()
      ) {
  
        alerts.push({
          title:
            'Payables exceed receivables',
  
          message:
            `Payables exceed receivables by ${this.formatCurrency(
              this.payable() -
              this.receivable()
            )}.`,
  
          severity:
            'warning'
        });
  
      }
  
  
      if (
        !alerts.length
      ) {
  
        alerts.push({
          title:
            'No major financial alert',
  
          message:
            'No critical condition was detected from the available accounting summary.',
  
          severity:
            'info'
        });
  
      }
  
  
      return alerts;
  
    }
  
  
    /* ============================================================
       DISPLAY HELPERS
    ============================================================ */
  
    protected formatCurrency(
      value:
        number
    ): string {
  
      return new Intl.NumberFormat(
        'en-IN',
        {
          style:
            'currency',
  
          currency:
            'INR',
  
          maximumFractionDigits:
            0
        }
      )
        .format(
          Number(
            value ||
            0
          )
        );
  
    }
  
  
    protected formatNumber(
      value:
        number,
  
      maximumFractionDigits =
        0
    ): string {
  
      return new Intl.NumberFormat(
        'en-IN',
        {
          maximumFractionDigits
        }
      )
        .format(
          Number(
            value ||
            0
          )
        );
  
    }
  
  
    protected formatDate(
      value?: string
    ): string {
  
      if (
        !value
      ) {
  
        return '-';
  
      }
  
  
      const parsed =
        new Date(
          `${value}T00:00:00`
        );
  
  
      if (
        Number.isNaN(
          parsed.getTime()
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
          parsed
        );
  
    }
  
  
    protected formatDateTime(
      value?: string
    ): string {
  
      if (
        !value
      ) {
  
        return '-';
  
      }
  
  
      const parsed =
        new Date(
          value
        );
  
  
      if (
        Number.isNaN(
          parsed.getTime()
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
            'numeric',
  
          hour:
            '2-digit',
  
          minute:
            '2-digit'
        }
      )
        .format(
          parsed
        );
  
    }
  
  
    protected accountOutstanding(
      row:
        OwnerOutstandingAccount
    ): string {
  
      return this.formatCurrency(
        Number(
          row.outstanding ||
          0
        )
      );
  
    }
  
  
    protected accountClosingBalance(
      row:
        OwnerOutstandingAccount
    ): string {
  
      const amount =
        Number(
          row.closingBalance
            ?.amount ||
          0
        );
  
  
      const type =
        row.closingBalance
          ?.type;
  
  
      if (
        !type
      ) {
  
        return this.formatCurrency(
          amount
        );
  
      }
  
  
      return `${this.formatCurrency(
        amount
      )} ${String(
        type
      )
        .charAt(
          0
        )
        .toUpperCase()}${String(
        type
      )
        .slice(
          1
        )}`;
  
    }
  
  
    protected cashBankClosing(
      row:
        any
    ): string {
  
      const value =
        row?.closingBalance;
  
  
      if (
        value &&
        typeof value ===
        'object'
      ) {
  
        const amount =
          Number(
            value.amount ||
            0
          );
  
  
        return value.type ===
          'credit'
            ? this.formatCurrency(
                -amount
              )
            : this.formatCurrency(
                amount
              );
  
      }
  
  
      return this.formatCurrency(
        Number(
          value ||
          0
        )
      );
  
    }
  
  
    protected trackByKey(
      index:
        number,
  
      item:
        {
          key?: string;
          accountId?: string;
          label?: string;
        }
    ): string | number {
  
      return item.key ||
        item.accountId ||
        item.label ||
        index;
  
    }
  
  
    /* ============================================================
       VALIDATION
    ============================================================ */
  
    private validateDateRange(): boolean {
  
      const from =
        this.fromDate();
  
  
      const to =
        this.toDate();
  
  
      const asOf =
        this.asOfDate();
  
  
      if (
        !from ||
        !to ||
        !asOf
      ) {
  
        this.errorMessage.set(
          'From date, To date and As Of date are required.'
        );
  
  
        return false;
  
      }
  
  
      if (
        from >
        to
      ) {
  
        this.errorMessage.set(
          'From date cannot be after To date.'
        );
  
  
        return false;
  
      }
  
  
      if (
        asOf <
        from
      ) {
  
        this.errorMessage.set(
          'As Of date cannot be before From date.'
        );
  
  
        return false;
  
      }
  
  
      this.errorMessage.set(
        ''
      );
  
  
      return true;
  
    }
  
  
    private localDateString(
      value:
        Date
    ): string {
  
      const year =
        value.getFullYear();
  
  
      const month =
        String(
          value.getMonth() +
          1
        )
          .padStart(
            2,
            '0'
          );
  
  
      const day =
        String(
          value.getDate()
        )
          .padStart(
            2,
            '0'
          );
  
  
      return `${year}-${month}-${day}`;
  
    }
  }