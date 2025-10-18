import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export type NotificationColor = 'success' | 'danger' | 'warning' | 'primary';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private toastController: ToastController = inject(ToastController);
  private translateService: TranslateService = inject(TranslateService);

  async show(message: string, type: NotificationType = 'info', duration: number = 3000): Promise<void> {
    const safeMessage: string = (message ?? '').toString();
    const toast: HTMLIonToastElement = await this.toastController.create({
      message: this.translateService.instant(safeMessage),
      duration,
      position: 'top',
      color: this.getColorForType(type),
      cssClass: `toast-${type}`,
      buttons: [{ text: '✕', role: 'cancel' }]
    });

    await toast.present();
  }

  async success(message: string, duration: number = 3000): Promise<void> {
    await this.show(message, 'success', duration);
  }
  async error(message: string, duration: number = 4000): Promise<void> {
    await this.show(message, 'error', duration);
  }
  async warning(message: string, duration: number = 3000): Promise<void> {
    await this.show(message, 'warning', duration);
  }
  async info(message: string, duration: number = 3000): Promise<void> {
    await this.show(message, 'info', duration);
  }

  // Map notification type to Ionic color token
  private getColorForType(type: NotificationType): NotificationColor {
    switch (type) {
      case 'success':
        return 'success';
      case 'error':
        return 'danger';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'primary';
    }
  }
}
