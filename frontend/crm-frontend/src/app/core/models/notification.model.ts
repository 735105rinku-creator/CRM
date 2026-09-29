export type NotificationType =
  | 'message'
  | 'leave'
  | 'attendance'
  | 'payroll'
  | 'meeting'
  | 'event'
  | 'holiday'
  | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationEntityRef {
  _id?: string;
  id?: string;
}

export interface AppNotification {
  _id: string;
  companyId: string;
  recipientUserId: string;
  senderUserId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string | NotificationEntityRef | null;
  priority: NotificationPriority;
  isRead: boolean;
  readAt?: string | null;
  actionUrl?: string;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  docs: AppNotification[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface UnreadCountResponse {
  unreadCount: number;
}
