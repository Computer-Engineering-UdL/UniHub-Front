import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { StorageService } from './storage.service';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';

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
  private readonly STORAGE_KEY: string = 'topbar_notifications';
  private readonly router: Router = inject(Router);
  private readonly storageService: StorageService = inject(StorageService);

  private readonly notificationsSubject: BehaviorSubject<TopBarNotification[]> = new BehaviorSubject<
    TopBarNotification[]
  >([]);
  public readonly notifications$: Observable<TopBarNotification[]> = this.notificationsSubject.asObservable();

  private readonly unreadCountSubject: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  public readonly unreadCount$: Observable<number> = this.unreadCountSubject.asObservable();

  private readonly isNativePlatform: boolean = Capacitor.isNativePlatform();
  private notificationIdCounter: number = 1;

  constructor() {
    this.loadNotifications();
    if (this.isNativePlatform) {
      this.initializeLocalNotifications();
    }
  }

  private async initializeLocalNotifications(): Promise<void> {
    try {
      const permissionStatus = await LocalNotifications.checkPermissions();
      if (permissionStatus.display !== 'granted') {
        const requestResult = await LocalNotifications.requestPermissions();
        if (requestResult.display !== 'granted') {
          return;
        }
      }

      await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        const notificationId = notification.notification.extra?.notificationId as string | undefined;
        if (notificationId) {
          const topbarNotification = this.notificationsSubject.value.find((n) => n.id === notificationId);
          if (topbarNotification) {
            void this.navigateToNotification(topbarNotification);
          }
        }
      });
    } catch {}
  }

  private async loadNotifications(): Promise<void> {
    const stored = await this.storageService.getObject<TopBarNotification[]>(this.STORAGE_KEY);
    if (stored && Array.isArray(stored)) {
      const notifications = stored.map((n) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      }));
      this.notificationsSubject.next(notifications);
      this.updateUnreadCount();
    }
  }

  private async saveNotifications(): Promise<void> {
    await this.storageService.setObject(this.STORAGE_KEY, this.notificationsSubject.value);
  }

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
    void this.saveNotifications();

    if (this.isNativePlatform) {
      void this.sendNativeNotification(newNotification);
    }
  }

  private async sendNativeNotification(notification: TopBarNotification): Promise<void> {
    try {
      const localNotification: LocalNotificationSchema = {
        id: this.notificationIdCounter++,
        title: notification.title,
        body: notification.message,
        smallIcon: this.getNotificationIcon(notification.icon),
        iconColor: this.getIconColor(notification.category),
        extra: {
          notificationId: notification.id,
          route: notification.route,
          routeParams: notification.routeParams
        }
      };

      await LocalNotifications.schedule({
        notifications: [localNotification]
      });
    } catch {}
  }

  private getNotificationIcon(icon: NotificationIcon): string {
    const iconMap: Record<NotificationIcon, string> = {
      mail: 'ic_stat_mail',
      chatbubbles: 'ic_stat_chat',
      heart: 'ic_stat_heart',
      home: 'ic_stat_home',
      'alert-circle': 'ic_stat_alert',
      'information-circle': 'ic_stat_info',
      'checkmark-circle': 'ic_stat_check'
    };
    return iconMap[icon] || 'ic_stat_notification';
  }

  private getIconColor(category: TopBarNotification['category']): string {
    const colorMap: Record<TopBarNotification['category'], string> = {
      message: '#3880ff',
      like: '#eb445a',
      offer: '#2dd36f',
      system: '#ffc409',
      other: '#92949c'
    };
    return colorMap[category] || '#3880ff';
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
    void this.saveNotifications();
  }

  markAllAsRead(): void {
    const currentNotifications: TopBarNotification[] = this.notificationsSubject.value;
    const updatedNotifications: TopBarNotification[] = currentNotifications.map((n: TopBarNotification) => ({
      ...n,
      read: true
    }));

    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();
    void this.saveNotifications();
  }

  removeNotification(notificationId: string): void {
    const currentNotifications: TopBarNotification[] = this.notificationsSubject.value;
    const updatedNotifications: TopBarNotification[] = currentNotifications.filter(
      (n: TopBarNotification) => n.id !== notificationId
    );

    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();
    void this.saveNotifications();
  }

  clearReadNotifications(): void {
    const currentNotifications: TopBarNotification[] = this.notificationsSubject.value;
    const updatedNotifications: TopBarNotification[] = currentNotifications.filter((n: TopBarNotification) => !n.read);

    this.notificationsSubject.next(updatedNotifications);
    void this.saveNotifications();
  }

  clearNotificationsByConversation(conversationId: string): void {
    const currentNotifications: TopBarNotification[] = this.notificationsSubject.value;
    const updatedNotifications: TopBarNotification[] = currentNotifications.filter(
      (n: TopBarNotification) => n.routeParams?.['conversationId'] !== conversationId
    );

    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();
    void this.saveNotifications();
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
