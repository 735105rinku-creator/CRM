import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';

import {
  RouterLink
} from '@angular/router';


interface FinancialReportLink {
  readonly title: string;
  readonly description: string;
  readonly route: string;
  readonly code: string;
}


@Component({
  selector: 'app-financial-reports-hub',

  standalone: true,

  imports: [
    RouterLink
  ],

  templateUrl:
    './financial-reports-hub.component.html',

  styleUrl:
    './financial-reports-hub.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class FinancialReportsHubComponent {

  readonly reports:
    readonly FinancialReportLink[] = [
      {
        title: 'Trial Balance',
        description:
          'Review debit and credit balances across accounting ledgers.',
        route:
          '/accounts/trial-balance',
        code: 'TB'
      },
      {
        title: 'Profit & Loss',
        description:
          'Review income, expenses and the resulting operating result.',
        route:
          '/accounts/profit-and-loss',
        code: 'PL'
      },
      {
        title: 'Balance Sheet',
        description:
          'Review assets, liabilities and equity at the selected date.',
        route:
          '/accounts/balance-sheet',
        code: 'BS'
      },
      {
        title: 'Cash & Bank',
        description:
          'Review cash and bank ledger movements through the existing book.',
        route:
          '/accounts/cash-bank',
        code: 'CB'
      },
      {
        title: 'Outstanding',
        description:
          'Review receivable and payable balances and outstanding activity.',
        route:
          '/accounts/outstanding',
        code: 'OS'
      },
      {
        title: 'GST Report',
        description:
          'Review input, output and net GST through the existing GST report.',
        route:
          '/accounts/gst-report',
        code: 'GST'
      }
    ];
}