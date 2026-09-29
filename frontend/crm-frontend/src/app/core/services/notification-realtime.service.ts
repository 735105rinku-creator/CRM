import { Injectable, inject } from '@angular/core';
import { Observable, fromEvent } from 'rxjs';
import { Socket, io } from 'socket.io-client';

import { AuthService } from '../auth/auth.service';
import { API_BASE_URL } from '../config/api.config';
import { AppNotification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationRealtimeService {
  private readonly auth = inject(AuthService);

  private readonly socket: Socket = io(API_BASE_URL, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    withCredentials: true,
    auth: (callback) => callback({ token: this.auth.getAccessToken() }),
  });

  readonly notification$: Observable<AppNotification> =
    fromEvent<AppNotification>(this.socket, 'notification:new');

  constructor() {
    this.socket.io.on('reconnect_attempt', () => {
      this.socket.auth = { token: this.auth.getAccessToken() };
    });
  }

  connect(): void {
    if (!this.socket.connected && this.auth.getAccessToken()) {
      this.socket.connect();
    }
  }

  disconnect(): void {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }
}
