import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface ToastNotification {
  id: string;
  message: string;
  type: NotificationType;
  duration: number;
}

@Injectable({ providedIn: 'root' })
class NotificationService {
  private translateService: TranslateService = inject(TranslateService);
  private notificationsSubject: BehaviorSubject<ToastNotification[]> = new BehaviorSubject<ToastNotification[]>([]);
  public notifications$: Observable<ToastNotification[]> = this.notificationsSubject.asObservable();

  show(message: string, type: NotificationType = 'info', duration: number = 3000): void {
    const safeMessage: string = (message ?? '').toString();
    const notification: ToastNotification = {
      id: this.generateId(),
      message: this.translateService.instant(safeMessage),
      type,
      duration
    };

    const currentNotifications: ToastNotification[] = this.notificationsSubject.value;
    this.notificationsSubject.next([...currentNotifications, notification]);

    if (duration > 0) {
      setTimeout((): void => {
        this.remove(notification.id);
      }, duration);
    }
  }

  success(message: string, duration: number = 3000): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration: number = 4000): void {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration: number = 3000): void {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration: number = 3000): void {
    this.show(message, 'info', duration);
  }

  public remove(id: string): void {
    const currentNotifications: ToastNotification[] = this.notificationsSubject.value;
    this.notificationsSubject.next(currentNotifications.filter((n: ToastNotification): boolean => n.id !== id));
  }

  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
export default NotificationService;
