import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { LangCode, SUPPORTED_LANGS } from '../models/i18n.types';

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
  private translate: TranslateService = inject(TranslateService);
  private notificationService: NotificationService = inject(NotificationService);

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
      await this.notificationService.error(this.translate.instant('LOGIN.ERROR.EMPTY_CREDENTIALS'));
      return;
    }
    if (!this.validateEmail(this.email)) {
      this.emailTouched = true;
      await this.notificationService.error(this.translate.instant('LOGIN.ERROR.INVALID_EMAIL'));
      return;
    }
    if (this.password.length < 8) {
      this.passwordTouched = true;
      await this.notificationService.error(this.translate.instant('SIGNUP.ERROR.PASSWORD_TOO_SHORT'));
      return;
    }

    this.isLoading = true;

    try {
      await this.authService.login(this.email, this.password);
      await this.router.navigate(['/home']);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : this.translate.instant('LOGIN.ERROR.LOGIN_FAILED');
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
      const message = error instanceof Error ? error.message : this.translate.instant('LOGIN.ERROR.GITHUB_FAILED');
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
      const message = error instanceof Error ? error.message : this.translate.instant('LOGIN.ERROR.GOOGLE_FAILED');
      await this.notificationService.error(message);
    } finally {
      this.isLoading = false;
    }
  }

  changeLanguage(lang: LangCode): void {
    const code: LangCode = SUPPORTED_LANGS.includes(lang) ? lang : 'en';
    this.translate.use(code);
  }
}
