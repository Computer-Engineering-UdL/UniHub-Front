import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { SignupData } from '../models/auth.types';
import { LangCode, SUPPORTED_LANGS } from '../models/i18n.types';

@Component({
  selector: 'app-signup',
  templateUrl: 'signup.page.html',
  styleUrls: ['signup.page.scss'],
  standalone: false,
})
export class SignupPage {
  firstName: string = '';
  lastName: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  phone: string = '';
  university: string = '';
  isLoading: boolean = false;

  private authService = inject(AuthService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private notificationService = inject(NotificationService);

  private readonly emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  validateEmail(email: string): boolean {
    return this.emailRegex.test(email);
  }

  private buildSignupPayload(): SignupData {
    return {
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      email: this.email.trim(),
      password: this.password,
      phone: this.phone.trim() || undefined,
      university: this.university.trim() || undefined,
    };
  }

  async signup(): Promise<void> {
    if (
      !this.firstName ||
      !this.lastName ||
      !this.email ||
      !this.password ||
      !this.confirmPassword
    ) {
      await this.notificationService.error(
        this.translate.instant('SIGNUP.ERROR.EMPTY_FIELDS'),
      );
      return;
    }

    if (!this.validateEmail(this.email)) {
      await this.notificationService.error(
        this.translate.instant('SIGNUP.ERROR.INVALID_EMAIL'),
      );
      return;
    }

    if (this.password.length < 8) {
      await this.notificationService.error(
        this.translate.instant('SIGNUP.ERROR.PASSWORD_TOO_SHORT'),
      );
      return;
    }

    if (this.password !== this.confirmPassword) {
      await this.notificationService.error(
        this.translate.instant('SIGNUP.ERROR.PASSWORD_MISMATCH'),
      );
      return;
    }

    this.isLoading = true;

    try {
      const payload: SignupData = this.buildSignupPayload();
      await this.authService.signup(payload);
      await this.router.navigate(['/home']);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : this.translate.instant('SIGNUP.ERROR.SIGNUP_FAILED');
      await this.notificationService.error(message);
    } finally {
      this.isLoading = false;
    }
  }

  async signupWithGithub(): Promise<void> {
    this.isLoading = true;
    try {
      await this.authService.loginWithGithub();
      await this.router.navigate(['/home']);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : this.translate.instant('LOGIN.ERROR.GITHUB_FAILED');
      await this.notificationService.error(message);
    } finally {
      this.isLoading = false;
    }
  }

  async signupWithGoogle(): Promise<void> {
    this.isLoading = true;
    try {
      await this.authService.loginWithGoogle();
      await this.router.navigate(['/home']);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : this.translate.instant('LOGIN.ERROR.GOOGLE_FAILED');
      await this.notificationService.error(message);
    } finally {
      this.isLoading = false;
    }
  }

  onPhoneInput(ev: CustomEvent): void {
    const raw: string = (ev.detail?.value ?? '') as string;
    if (raw === '') {
      this.phone = '';
      return;
    }
    // Allow only digits and plus, keep only first leading plus
    const hasLeadingPlus = raw.trim().startsWith('+');
    let cleaned = raw.replace(/[^+\d]/g, '');
    cleaned = cleaned.replace(/\+/g, '');
    if (hasLeadingPlus) cleaned = '+' + cleaned;
    // Enforce max length: 16 total (1 for plus + up to 15 digits per E.164)
    if (cleaned.startsWith('+')) cleaned = cleaned.slice(0, 16);
    else cleaned = cleaned.slice(0, 15);
    this.phone = cleaned;
  }

  changeLanguage(lang: LangCode): void {
    const code: LangCode = SUPPORTED_LANGS.includes(lang) ? lang : 'en';
    this.translate.use(code);
  }
}
