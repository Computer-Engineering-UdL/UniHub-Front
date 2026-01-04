import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../services/auth.service';
import NotificationService from '../services/notification.service';
import { SignupData } from '../models/auth.types';
import { LangCode, LocalizationService } from '../services/localization.service';

@Component({
  selector: 'app-signup',
  templateUrl: 'signup.page.html',
  styleUrls: ['signup.page.scss'],
  standalone: false
})
export class SignupPage {
  username: string = '';
  firstName: string = '';
  lastName: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  phone: string = '';
  isLoading: boolean = false;

  usernameTouched: boolean = false;
  firstNameTouched: boolean = false;
  lastNameTouched: boolean = false;
  emailTouched: boolean = false;
  phoneTouched: boolean = false;
  passwordTouched: boolean = false;
  confirmPasswordTouched: boolean = false;
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  private readonly authService: AuthService = inject(AuthService);
  private readonly router: Router = inject(Router);
  private readonly translate: TranslateService = inject(TranslateService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly localizationService: LocalizationService = inject(LocalizationService);

  private readonly emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  validateEmail(email: string): boolean {
    return this.emailRegex.test(email);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  private buildSignupPayload(): SignupData {
    return {
      username: this.username.trim(),
      first_name: this.firstName.trim(),
      last_name: this.lastName.trim(),
      email: this.email.trim(),
      password: this.password,
      phone: this.phone.trim() || undefined,
      accepted_terms_version: '1.0.0'
    };
  }

  onFirstNameInput(): void {
    if (!this.firstNameTouched) {
      this.firstNameTouched = true;
    }
  }

  onUsernameInput(): void {
    if (!this.usernameTouched) {
      this.usernameTouched = true;
    }
  }

  onLastNameInput(): void {
    if (!this.lastNameTouched) {
      this.lastNameTouched = true;
    }
  }

  onEmailInput(): void {
    if (!this.emailTouched) {
      this.emailTouched = true;
    }
  }

  onPhoneInputTouched(): void {
    if (!this.phoneTouched) {
      this.phoneTouched = true;
    }
  }

  onPasswordInput(): void {
    if (!this.passwordTouched) {
      this.passwordTouched = true;
    }
  }

  onConfirmPasswordInput(): void {
    if (!this.confirmPasswordTouched) {
      this.confirmPasswordTouched = true;
    }
  }

  validatePhone(phone: string): boolean {
    if (!phone) {
      return true;
    }
    return /^\+?\d{7,15}$/.test(phone);
  }

  async signup(): Promise<void> {
    if (!this.username || !this.firstName || !this.lastName || !this.email || !this.password || !this.confirmPassword) {
      this.usernameTouched = true;
      this.firstNameTouched = true;
      this.lastNameTouched = true;
      this.emailTouched = true;
      this.passwordTouched = true;
      this.confirmPasswordTouched = true;
      this.notificationService.error(this.translate.instant('SIGNUP.ERROR.EMPTY_FIELDS'));
      return;
    }
    if (!this.validateEmail(this.email)) {
      this.emailTouched = true;
      this.notificationService.error(this.translate.instant('SIGNUP.ERROR.INVALID_EMAIL'));
      return;
    }
    if (this.phone && !this.validatePhone(this.phone)) {
      this.phoneTouched = true;
      this.notificationService.error(this.translate.instant('SIGNUP.ERROR.INVALID_PHONE'));
      return;
    }
    if (this.password.length < 8) {
      this.passwordTouched = true;
      this.notificationService.error(this.translate.instant('SIGNUP.ERROR.PASSWORD_TOO_SHORT'));
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.confirmPasswordTouched = true;
      this.notificationService.error(this.translate.instant('SIGNUP.ERROR.PASSWORD_MISMATCH'));
      return;
    }

    this.isLoading = true;

    try {
      const payload: SignupData = this.buildSignupPayload();
      await this.authService.signup(payload);
      await this.goToOnboarding();
    } catch (error: any) {
      let message = 'SIGNUP.ERROR.SIGNUP_FAILED';
      if (error) {
        const formattedMsg =
          'SIGNUP.ERROR.' + this.localizationService.formatWSResponseToTranslateKey(error.error.detail);
        if (this.localizationService.hasTranslation(formattedMsg)) {
          message = formattedMsg;
        }
      }
      this.notificationService.error(message);
    } finally {
      this.isLoading = false;
    }
  }

  async signupWithGoogle(): Promise<void> {
    this.isLoading = true;
    try {
      await this.authService.loginWithGoogle();
      await this.goToOnboarding();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : this.translate.instant('LOGIN.ERROR.GOOGLE_FAILED');
      this.notificationService.error(message);
    } finally {
      this.isLoading = false;
    }
  }

  private async goToOnboarding(): Promise<void> {
    await this.router.navigate(['/onboarding/role']);
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
    if (hasLeadingPlus) {
      cleaned = '+' + cleaned;
    }
    // Enforce max length: 16 total (1 for plus + up to 15 digits per E.164)
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.slice(0, 16);
    } else {
      cleaned = cleaned.slice(0, 15);
    }
    this.phone = cleaned;
  }

  async changeLanguage(lang: LangCode): Promise<void> {
    await this.localizationService.changeLanguage(lang);
  }
}
