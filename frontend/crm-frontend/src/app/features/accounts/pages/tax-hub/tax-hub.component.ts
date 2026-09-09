import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';

import {
  RouterLink
} from '@angular/router';


@Component({
  selector: 'app-tax-hub',

  standalone: true,

  imports: [
    RouterLink
  ],

  templateUrl:
    './tax-hub.component.html',

  styleUrl:
    './tax-hub.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class TaxHubComponent {

  readonly gstReportRoute =
    '/accounts/gst-report';
}