import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private toastController = inject(ToastController);

  /**
   * Show a toast notification
   * @param message - The message to display
   * @param type - The type of notification (success, error, warning, info)
   * @param duration - Duration in milliseconds (default: 3000)
   */
  async show(
    message: string,
    type: NotificationType = 'info',
    duration: number = 3000
  ): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration,
      position: 'top',
      color: this.getColorForType(type),
      cssClass: `toast-${type}`,
      buttons: [
        {
          text: '✕',
          role: 'cancel',
        },
      ],
    });

    await toast.present();
  }

  /**
   * Show a success notification
   */
  async success(message: string, duration: number = 3000): Promise<void> {
    await this.show(message, 'success', duration);
  }

  /**
   * Show an error notification
   */
  async error(message: string, duration: number = 4000): Promise<void> {
    await this.show(message, 'error', duration);
  }

  /**
   * Show a warning notification
   */
  async warning(message: string, duration: number = 3000): Promise<void> {
    await this.show(message, 'warning', duration);
  }

  /**
   * Show an info notification
   */
  async info(message: string, duration: number = 3000): Promise<void> {
    await this.show(message, 'info', duration);
  }

  /**
   * Get Ionic color for notification type
   */
  private getColorForType(type: NotificationType): string {
    switch (type) {
      case 'success':
        return 'success';
      case 'error':
        return 'danger';
      case 'warning':
        return 'warning';
      case 'info':
        return 'primary';
      default:
        return 'primary';
    }
  }
}
