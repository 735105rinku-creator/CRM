import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';

import {
  RouterLink
} from '@angular/router';


interface AccountsSettingArea {
  readonly title: string;
  readonly description: string;
  readonly value: string;
  readonly code: string;
  readonly route?: string;
  readonly action?: string;
}


@Component({
  selector: 'app-accounts-settings',

  standalone: true,

  imports: [
    RouterLink
  ],

  templateUrl:
    './accounts-settings.component.html',

  styleUrl:
    './accounts-settings.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class AccountsSettingsComponent {

  readonly settingAreas:
    readonly AccountsSettingArea[] = [
      {
        title: 'Financial Year',
        description:
          'Accounting periods follow the existing financial-year logic used by the Accounts module.',
        value: 'System managed',
        code: 'FY'
      },
      {
        title: 'Currency',
        description:
          'Accounts screens currently present monetary values using the existing INR convention.',
        value: 'INR',
        code: 'INR'
      },
      {
        title: 'Voucher Numbering',
        description:
          'Voucher numbers follow the existing company, financial-year and voucher-type sequence.',
        value: 'System managed',
        code: 'VN'
      },
      {
        title: 'GST & Tax',
        description:
          'Open the existing GST and statutory tax information workspace.',
        value: 'Available',
        code: 'GST',
        route: '/accounts/tax',
        action: 'Open GST & Tax'
      },
      {
        title: 'Chart of Accounts',
        description:
          'Open the existing accounting ledger and account structure workspace.',
        value: 'Available',
        code: 'COA',
        route: '/accounts/chart-of-accounts',
        action: 'Open Chart of Accounts'
      },
      {
        title: 'Company Configuration',
        description:
          'Company-wide configuration remains controlled by the existing company administration flow.',
        value: 'Company level',
        code: 'ORG'
      }
    ];
}