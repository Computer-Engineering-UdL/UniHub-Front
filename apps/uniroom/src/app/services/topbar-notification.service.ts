import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';

export type NotificationIcon =
  | 'mail'
  | 'chatbubbles'
  | 'heart'
  | 'home'
  | 'alert-circle'
  | 'information-circle'
  | 'checkmark-circle';

export interface TopBarNotification {
  id: string;
  title: string;
  message: string;
  icon: NotificationIcon;
  timestamp: Date;
  read: boolean;
  route?: string;
  routeParams?: Record<string, any>;
  category: 'message' | 'like' | 'offer' | 'system' | 'other';
}

@Injectable({
  providedIn: 'root'
})
export class TopBarNotificationService {
  private readonly MAX_NOTIFICATIONS: number = 50;
  private readonly router: Router = inject(Router);

  private readonly notificationsSubject: BehaviorSubject<TopBarNotification[]> = new BehaviorSubject<
    TopBarNotification[]
  >([]);
  public readonly notifications$: Observable<TopBarNotification[]> = this.notificationsSubject.asObservable();

  private readonly unreadCountSubject: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  public readonly unreadCount$: Observable<number> = this.unreadCountSubject.asObservable();

  addNotification(notification: Omit<TopBarNotification, 'id' | 'timestamp' | 'read'>): void {
    const newNotification: TopBarNotification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date(),
      read: false
    };

    const currentNotifications: TopBarNotification[] = this.notificationsSubject.value;
    const updatedNotifications: TopBarNotification[] = [newNotification, ...currentNotifications];

    if (updatedNotifications.length > this.MAX_NOTIFICATIONS) {
      updatedNotifications.splice(this.MAX_NOTIFICATIONS);
    }

    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();
  }

  markAsRead(notificationId: string): void {
    const currentNotifications: TopBarNotification[] = this.notificationsSubject.value;
    const updatedNotifications: TopBarNotification[] = currentNotifications.map((n: TopBarNotification) => {
      if (n.id === notificationId) {
        return { ...n, read: true };
      }
      return n;
    });

    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();
  }

  markAllAsRead(): void {
    const currentNotifications: TopBarNotification[] = this.notificationsSubject.value;
    const updatedNotifications: TopBarNotification[] = currentNotifications.map((n: TopBarNotification) => ({
      ...n,
      read: true
    }));

    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();
  }

  removeNotification(notificationId: string): void {
    const currentNotifications: TopBarNotification[] = this.notificationsSubject.value;
    const updatedNotifications: TopBarNotification[] = currentNotifications.filter(
      (n: TopBarNotification) => n.id !== notificationId
    );

    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();
  }

  clearReadNotifications(): void {
    const currentNotifications: TopBarNotification[] = this.notificationsSubject.value;
    const updatedNotifications: TopBarNotification[] = currentNotifications.filter((n: TopBarNotification) => !n.read);

    this.notificationsSubject.next(updatedNotifications);
  }

  async navigateToNotification(notification: TopBarNotification): Promise<void> {
    this.markAsRead(notification.id);

    if (notification.route) {
      await this.router.navigate([notification.route], {
        queryParams: notification.routeParams || {},
        replaceUrl: false
      });
    }
  }

  getNotifications(): TopBarNotification[] {
    return this.notificationsSubject.value;
  }

  getUnreadCount(): number {
    return this.unreadCountSubject.value;
  }

  private updateUnreadCount(): void {
    const currentNotifications: TopBarNotification[] = this.notificationsSubject.value;
    const unreadCount: number = currentNotifications.filter((n: TopBarNotification) => !n.read).length;
    this.unreadCountSubject.next(unreadCount);
  }

  private generateId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
