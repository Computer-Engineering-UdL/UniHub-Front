import { Component, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import NotificationService from '../../services/notification.service';
import { firstValueFrom } from 'rxjs';

interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface ChangePasswordResponse {
  message: string;
}

@Component({
  selector: 'app-change-password-modal',
  templateUrl: './change-password-modal.component.html',
  styleUrls: ['./change-password-modal.component.scss'],
  standalone: false
})
export class ChangePasswordModalComponent {
  public currentPassword: string = '';
  public newPassword: string = '';
  public confirmPassword: string = '';
  public isLoading: boolean = false;
  public currentPasswordTouched: boolean = false;
  public newPasswordTouched: boolean = false;
  public confirmPasswordTouched: boolean = false;
  public showCurrentPassword: boolean = false;
  public showNewPassword: boolean = false;
  public showConfirmPassword: boolean = false;

  private readonly modalController: ModalController = inject(ModalController);
  private readonly apiService: ApiService = inject(ApiService);
  private readonly notificationService: NotificationService = inject(NotificationService);

  private readonly passwordRegex: RegExp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

  public validatePassword(value: string): boolean {
    return this.passwordRegex.test(value);
  }

  public passwordsMatch(): boolean {
    return this.newPassword === this.confirmPassword;
  }

  public onCurrentPasswordInput(): void {
    if (!this.currentPasswordTouched) {
      this.currentPasswordTouched = true;
    }
  }

  public onNewPasswordInput(): void {
    if (!this.newPasswordTouched) {
      this.newPasswordTouched = true;
    }
  }

  public onConfirmPasswordInput(): void {
    if (!this.confirmPasswordTouched) {
      this.confirmPasswordTouched = true;
    }
  }

  public toggleCurrentPasswordVisibility(): void {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  public toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  public toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  public async changePassword(): Promise<void> {
    if (!this.currentPassword) {
      this.currentPasswordTouched = true;
      this.notificationService.error('PASSWORD.CHANGE.CURRENT_REQUIRED');
      return;
    }

    if (!this.validatePassword(this.newPassword)) {
      this.newPasswordTouched = true;
      this.notificationService.error('PASSWORD.CHANGE.INVALID_FORMAT');
      return;
    }

    if (!this.passwordsMatch()) {
      this.confirmPasswordTouched = true;
      this.notificationService.error('PASSWORD.CHANGE.PASSWORDS_NOT_MATCH');
      return;
    }

    this.isLoading = true;

    try {
      const request: ChangePasswordRequest = {
        current_password: this.currentPassword,
        new_password: this.newPassword,
        confirm_password: this.confirmPassword
      };

      await firstValueFrom(
        this.apiService.post<ChangePasswordResponse>('auth/password/change', request, undefined, true)
      );

      this.notificationService.success('PASSWORD.CHANGE.SUCCESS');
      await this.close();
    } catch (error: unknown) {
      this.notificationService.error('PASSWORD.CHANGE.ERROR');
    } finally {
      this.isLoading = false;
    }
  }

  public async close(): Promise<void> {
    await this.modalController.dismiss();
  }
}
