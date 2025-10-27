import { Component } from '@angular/core';
import NotificationService, { ToastNotification } from '../../services/notification.service';

@Component({
  selector: 'app-notification-container',
  templateUrl: './notification-container.component.html',
  styleUrls: ['./notification-container.component.scss'],
  standalone: false
})
export class NotificationContainerComponent {
  notifications: ToastNotification[] = [];

  constructor(private notificationService: NotificationService) {
    this.notificationService.notifications$.subscribe((notifications: ToastNotification[]) => {
      this.notifications = notifications;
    });
  }

  onDismiss(id: string): void {
    this.notificationService.remove(id);
  }

  trackByFn(index: number, item: ToastNotification): string {
    return item.id;
  }
}
