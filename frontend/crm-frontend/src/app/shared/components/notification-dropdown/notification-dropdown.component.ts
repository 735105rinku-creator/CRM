import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { AppNotification } from '../../../core/models/notification.model';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationRealtimeService } from '../../../core/services/notification-realtime.service';
import { navigateToNotification } from '../../../core/services/notification-navigation.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-dropdown.component.html',
  styleUrl: './notification-dropdown.component.scss',
})
export class NotificationDropdownComponent implements OnInit, OnDestroy {
  private readonly notificationService = inject(NotificationService);
  private readonly realtime = inject(NotificationRealtimeService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private realtimeSub?: Subscription;

  protected readonly notifications = signal<AppNotification[]>([]);
  protected readonly unreadCount = signal<number>(0);
  protected readonly isOpen = signal<boolean>(false);
  protected readonly isLoading = signal<boolean>(false);

  protected readonly hasUnread = computed(() => this.unreadCount() > 0);
  protected readonly visibleNotifications = computed(() => this.notifications().slice(0, 20));

  ngOnInit(): void {
    this.loadNotifications();
    this.loadUnreadCount();

    this.realtime.connect();
    this.realtimeSub = this.realtime.notification$.subscribe((notification) => {
      this.notifications.update((list) => [notification, ...list].slice(0, 20));
      this.unreadCount.update((count) => count + 1);
    });
  }

  ngOnDestroy(): void {
    this.realtimeSub?.unsubscribe();
    this.realtime.disconnect();
  }

  protected toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isOpen.update((open) => !open);
    if (this.isOpen()) {
      this.loadNotifications();
    }
  }

  protected closeDropdown(): void {
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-dropdown-wrapper')) {
      this.closeDropdown();
    }
  }

  protected onNotificationClick(notification: AppNotification, event: Event): void {
    event.stopPropagation();

    const role = this.auth.getCurrentUser()?.role ?? null;

    if (!notification.isRead) {
      this.notificationService.markRead(notification._id).subscribe({
        next: () => {
          this.notifications.update((list) =>
            list.map((item) =>
              item._id === notification._id ? { ...item, isRead: true } : item
            )
          );
          this.unreadCount.update((count) => Math.max(0, count - 1));
        },
        error: () => {},
      });
    }

    navigateToNotification(this.router, notification, role);
    this.closeDropdown();
  }

  protected onMarkAllRead(event: Event): void {
    event.stopPropagation();
    this.notificationService.markAllRead().subscribe({
      next: () => {
        this.notifications.update((list) => list.map((item) => ({ ...item, isRead: true })));
        this.unreadCount.set(0);
      },
      error: () => {},
    });
  }

  protected onViewAll(event: Event): void {
    event.stopPropagation();
    this.closeDropdown();
    void this.router.navigate(['/notifications']);
  }

  protected formatTime(value: string): string {
    const date = new Date(value);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;

    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;

    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;

    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  private loadNotifications(): void {
    this.isLoading.set(true);
    this.notificationService.list(1, 20).subscribe({
      next: (response) => {
        this.notifications.set(response?.docs ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.notifications.set([]);
        this.isLoading.set(false);
      },
    });
  }

  private loadUnreadCount(): void {
    this.notificationService.unreadCount().subscribe({
      next: (response) => this.unreadCount.set(response?.unreadCount ?? 0),
      error: () => this.unreadCount.set(0),
    });
  }
}
