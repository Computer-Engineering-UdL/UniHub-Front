import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import NotificationService from '../services/notification.service';
import { LangCode, LocalizationService } from '../services/localization.service';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  standalone: false
})
export class LoginPage {
  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  emailTouched: boolean = false;
  passwordTouched: boolean = false;

  private authService: AuthService = inject(AuthService);
  private router: Router = inject(Router);
  private notificationService: NotificationService = inject(NotificationService);
  private localizationService: LocalizationService = inject(LocalizationService);

  private readonly emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  validateEmail(email: string): boolean {
    return this.emailRegex.test(email);
  }

  onEmailInput(): void {
    if (!this.emailTouched) {
      this.emailTouched = true;
    }
  }

  onPasswordInput(): void {
    if (!this.passwordTouched) {
      this.passwordTouched = true;
    }
  }

  async login(): Promise<void> {
    if (!this.email || !this.password) {
      this.emailTouched = true;
      this.passwordTouched = true;
      await this.notificationService.error('LOGIN.ERROR.EMPTY_CREDENTIALS');
      return;
    }
    if (!this.validateEmail(this.email)) {
      this.emailTouched = true;
      await this.notificationService.error('LOGIN.ERROR.INVALID_EMAIL');
      return;
    }
    if (this.password.length < 8) {
      this.passwordTouched = true;
      await this.notificationService.error('SIGNUP.ERROR.PASSWORD_TOO_SHORT');
      return;
    }

    this.isLoading = true;

    try {
      await this.authService.login(this.email, this.password);
      await this.router.navigate(['/home']);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'LOGIN.ERROR.LOGIN_FAILED';
      await this.notificationService.error(message);
    } finally {
      this.isLoading = false;
    }
  }

  async loginWithGithub(): Promise<void> {
    this.isLoading = true;
    try {
      await this.authService.loginWithGithub();
      await this.router.navigate(['/home']);
    } catch (error: unknown) {
      const message: string = error instanceof Error ? error.message : 'LOGIN.ERROR.GITHUB_FAILED';
      await this.notificationService.error(message);
    } finally {
      this.isLoading = false;
    }
  }

  async loginWithGoogle(): Promise<void> {
    this.isLoading = true;
    try {
      await this.authService.loginWithGoogle();
      await this.router.navigate(['/home']);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'LOGIN.ERROR.GOOGLE_FAILED';
      await this.notificationService.error(message);
    } finally {
      this.isLoading = false;
    }
  }

  changeLanguage(lang: LangCode): void {
    this.localizationService.changeLanguage(lang);
  }
}
