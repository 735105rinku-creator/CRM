import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from './api.service';
import {
  AppNotification,
  NotificationListResponse,
  UnreadCountResponse,
} from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly api = inject(ApiService);

  list(page = 1, limit = 10): Observable<NotificationListResponse> {
    return this.api.get<NotificationListResponse>('/notifications', {
      page,
      limit,
    });
  }

  unreadCount(): Observable<UnreadCountResponse> {
    return this.api.get<UnreadCountResponse>('/notifications/unread-count');
  }

  markRead(id: string): Observable<AppNotification> {
    return this.api.patch<AppNotification>(`/notifications/${id}/read`, {});
  }

  markAllRead(): Observable<boolean> {
    return this.api.patch<boolean>('/notifications/read-all', {});
  }
}
