import { CommonModule } from '@angular/common';

import {
  Component
} from '@angular/core';

import {
  RouterOutlet
} from '@angular/router';

import {
  WarehouseSidebarComponent
} from '../warehouse-sidebar/warehouse-sidebar.component';
import { SupportTicketFormComponent } from '../../../shared/components/support-ticket-form/support-ticket-form.component';


@Component({
  selector:
    'app-warehouse-layout',

  standalone:
    true,

  imports: [
    CommonModule,
    RouterOutlet,
    WarehouseSidebarComponent,
    SupportTicketFormComponent
  ],

  templateUrl:
    './warehouse-layout.component.html',

  styleUrl:
    './warehouse-layout.component.scss'
})
export class WarehouseLayoutComponent {}