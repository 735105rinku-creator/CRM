import { CommonModule } from '@angular/common';

import {
  Component
} from '@angular/core';

import {
  RouterOutlet
} from '@angular/router';

import {
  LogisticsSidebarComponent
} from '../logistics-sidebar/logistics-sidebar.component';
import { SupportTicketFormComponent } from '../../../shared/components/support-ticket-form/support-ticket-form.component';


@Component({
  selector:
    'app-logistics-layout',

  standalone:
    true,

  imports: [
    CommonModule,
    RouterOutlet,
    LogisticsSidebarComponent,
    SupportTicketFormComponent
  ],

  templateUrl:
    './logistics-layout.component.html',

  styleUrl:
    './logistics-layout.component.scss'
})
export class LogisticsLayoutComponent {}