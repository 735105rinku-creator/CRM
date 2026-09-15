import { Injectable, inject } from '@angular/core';
import { Observable, fromEvent } from 'rxjs';
import { Socket, io } from 'socket.io-client';

import { AuthService } from '../auth/auth.service';
import { API_BASE_URL } from '../config/api.config';

export interface DepartmentInvoiceUpdatedEvent {
  departmentInvoiceId: string;
  sourceDepartment: 'purchase' | 'logistics';
  sourceModule: 'purchase_invoice' | 'logistics_invoice' | 'logistics_vendor_payment';
  sourceRecordId: string;
  invoiceNumber: string;
  status: string;
  paidAmount: number;
  remainingAmount: number;
  companyAdminApprovalStatus: string;
  updatedAt: string;
  action: string;
}

@Injectable({ providedIn: 'root' })
export class DepartmentInvoiceRealtimeService {
  private readonly auth = inject(AuthService);
  private readonly socket: Socket = io(API_BASE_URL, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    withCredentials: true,
    auth: callback => callback({ token: this.auth.getAccessToken() })
  });

  readonly updates$: Observable<DepartmentInvoiceUpdatedEvent> =
    fromEvent<DepartmentInvoiceUpdatedEvent>(this.socket, 'department-invoice:updated');
  readonly notifications$: Observable<unknown> =
    fromEvent(this.socket, 'notification:new');

  constructor() {
    this.socket.io.on('reconnect_attempt', () => {
      this.socket.auth = { token: this.auth.getAccessToken() };
    });
  }

  connect(): void {
    if (!this.socket.connected && this.auth.getAccessToken()) this.socket.connect();
  }
}
