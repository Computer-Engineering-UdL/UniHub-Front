import { Component, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import NotificationService from '../../services/notification.service';
import { firstValueFrom } from 'rxjs';

interface ForgotPasswordRequest {
  email: string;
}

interface ForgotPasswordResponse {
  message: string;
}

@Component({
  selector: 'app-forgot-password-modal',
  templateUrl: './forgot-password-modal.component.html',
  styleUrls: ['./forgot-password-modal.component.scss'],
  standalone: false
})
export class ForgotPasswordModalComponent {
  public email: string = '';
  public isLoading: boolean = false;
  public emailTouched: boolean = false;

  private readonly modalController: ModalController = inject(ModalController);
  private readonly apiService: ApiService = inject(ApiService);
  private readonly notificationService: NotificationService = inject(NotificationService);

  private readonly emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  public validateEmail(value: string): boolean {
    return this.emailRegex.test(value);
  }

  public onEmailInput(): void {
    if (!this.emailTouched) {
      this.emailTouched = true;
    }
  }

  public async sendResetEmail(): Promise<void> {
    if (!this.validateEmail(this.email)) {
      this.emailTouched = true;
      this.notificationService.error('LOGIN.ERROR.INVALID_EMAIL');
      return;
    }

    this.isLoading = true;

    try {
      const request: ForgotPasswordRequest = { email: this.email };
      await firstValueFrom(
        this.apiService.post<ForgotPasswordResponse>('auth/password/forgot', request, undefined, false)
      );

      this.notificationService.success('PASSWORD.FORGOT.SUCCESS', 5000);
      await this.close();
    } catch {
      this.notificationService.error('PASSWORD.FORGOT.ERROR');
    } finally {
      this.isLoading = false;
    }
  }

  public async close(): Promise<void> {
    await this.modalController.dismiss();
  }
}
