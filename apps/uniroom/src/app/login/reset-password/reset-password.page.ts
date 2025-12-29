import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import NotificationService from '../../services/notification.service';
import { firstValueFrom } from 'rxjs';

interface ResetPasswordRequest {
  token: string;
  new_password: string;
  confirm_password: string;
}

interface ResetPasswordResponse {
  message: string;
}

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: false
})
export class ResetPasswordPage implements OnInit {
  public token: string = '';
  public newPassword: string = '';
  public confirmPassword: string = '';
  public isLoading: boolean = false;
  public newPasswordTouched: boolean = false;
  public confirmPasswordTouched: boolean = false;
  public showNewPassword: boolean = false;
  public showConfirmPassword: boolean = false;

  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly apiService: ApiService = inject(ApiService);
  private readonly notificationService: NotificationService = inject(NotificationService);

  private readonly passwordRegex: RegExp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParams['token'] || '';
    if (!this.token) {
      this.notificationService.error('PASSWORD.RESET.INVALID_TOKEN');
      void this.router.navigate(['/login']);
    }
  }

  public validatePassword(value: string): boolean {
    return this.passwordRegex.test(value);
  }

  public passwordsMatch(): boolean {
    return this.newPassword === this.confirmPassword;
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

  public toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  public toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  public async resetPassword(): Promise<void> {
    if (!this.validatePassword(this.newPassword)) {
      this.newPasswordTouched = true;
      this.notificationService.error('PASSWORD.RESET.INVALID_FORMAT');
      return;
    }

    if (!this.passwordsMatch()) {
      this.confirmPasswordTouched = true;
      this.notificationService.error('PASSWORD.RESET.PASSWORDS_NOT_MATCH');
      return;
    }

    this.isLoading = true;

    try {
      const request: ResetPasswordRequest = {
        token: this.token,
        new_password: this.newPassword,
        confirm_password: this.confirmPassword
      };

      await firstValueFrom(
        this.apiService.post<ResetPasswordResponse>('auth/password/reset', request, undefined, false)
      );

      this.notificationService.success('PASSWORD.RESET.SUCCESS');
      await this.router.navigate(['/login']);
    } catch (error: unknown) {
      this.notificationService.error('PASSWORD.RESET.ERROR');
    } finally {
      this.isLoading = false;
    }
  }
}
