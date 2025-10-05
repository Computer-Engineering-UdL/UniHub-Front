import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { SignupData } from '../models/auth.types';
import { LangCode, LocalizationService } from '../services/localization.service';

@Component({
  selector: 'app-signup',
  templateUrl: 'signup.page.html',
  styleUrls: ['signup.page.scss'],
  standalone: false
})
export class SignupPage implements OnInit {
  firstName: string = '';
  lastName: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  phone: string = '';
  university: string = '';
  isLoading: boolean = false;

  firstNameTouched: boolean = false;
  lastNameTouched: boolean = false;
  emailTouched: boolean = false;
  phoneTouched: boolean = false;
  passwordTouched: boolean = false;
  confirmPasswordTouched: boolean = false;

  private authService: AuthService = inject(AuthService);
  private router: Router = inject(Router);
  private translate: TranslateService = inject(TranslateService);
  private notificationService: NotificationService = inject(NotificationService);
  private localizationService: LocalizationService = inject(LocalizationService);

  private readonly emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  ngOnInit(): void {
    const currentLang: LangCode = this.localizationService.getCurrentLanguage();
    this.localizationService.changeLanguage(currentLang);
  }

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
      university: this.university.trim() || undefined
    };
  }

  onFirstNameInput(): void {
    if (!this.firstNameTouched) {
      this.firstNameTouched = true;
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
    if (!this.firstName || !this.lastName || !this.email || !this.password || !this.confirmPassword) {
      this.firstNameTouched = true;
      this.lastNameTouched = true;
      this.emailTouched = true;
      this.passwordTouched = true;
      this.confirmPasswordTouched = true;
      await this.notificationService.error(this.translate.instant('SIGNUP.ERROR.EMPTY_FIELDS'));
      return;
    }
    if (!this.validateEmail(this.email)) {
      this.emailTouched = true;
      await this.notificationService.error(this.translate.instant('SIGNUP.ERROR.INVALID_EMAIL'));
      return;
    }
    if (this.phone && !this.validatePhone(this.phone)) {
      this.phoneTouched = true;
      await this.notificationService.error(this.translate.instant('SIGNUP.ERROR.INVALID_PHONE'));
      return;
    }
    if (this.password.length < 8) {
      this.passwordTouched = true;
      await this.notificationService.error(this.translate.instant('SIGNUP.ERROR.PASSWORD_TOO_SHORT'));
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.confirmPasswordTouched = true;
      await this.notificationService.error(this.translate.instant('SIGNUP.ERROR.PASSWORD_MISMATCH'));
      return;
    }

    this.isLoading = true;

    try {
      const payload: SignupData = this.buildSignupPayload();
      await this.authService.signup(payload);
      await this.router.navigate(['/home']);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : this.translate.instant('SIGNUP.ERROR.SIGNUP_FAILED');
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
      const message = error instanceof Error ? error.message : this.translate.instant('LOGIN.ERROR.GITHUB_FAILED');
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
      const message = error instanceof Error ? error.message : this.translate.instant('LOGIN.ERROR.GOOGLE_FAILED');
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

  changeLanguage(lang: LangCode): void {
    this.localizationService.changeLanguage(lang);
  }
}
