import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-signup',
  templateUrl: 'signup.page.html',
  styleUrls: ['signup.page.scss'],
  standalone: false,
})
export class SignupPage {
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  confirmPassword = '';
  phone = '';
  university = '';
  isLoading = false;

  private authService = inject(AuthService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private notificationService = inject(NotificationService);

  // Email validation regex
  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  validateEmail(email: string): boolean {
    return this.emailRegex.test(email);
  }

  async signup() {
    // Validate required fields
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

    // Validate email format
    if (!this.validateEmail(this.email)) {
      await this.notificationService.error(
        this.translate.instant('SIGNUP.ERROR.INVALID_EMAIL'),
      );
      return;
    }

    // Validate password length
    if (this.password.length < 8) {
      await this.notificationService.error(
        this.translate.instant('SIGNUP.ERROR.PASSWORD_TOO_SHORT'),
      );
      return;
    }

    // Validate password match
    if (this.password !== this.confirmPassword) {
      await this.notificationService.error(
        this.translate.instant('SIGNUP.ERROR.PASSWORD_MISMATCH'),
      );
      return;
    }

    this.isLoading = true;

    try {
      await this.authService.signup({
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        password: this.password,
        phone: this.phone,
        university: this.university,
      });
      await this.router.navigate(['/home']);
    } catch (error: any) {
      await this.notificationService.error(
        error.message || this.translate.instant('SIGNUP.ERROR.SIGNUP_FAILED'),
      );
    } finally {
      this.isLoading = false;
    }
  }

  async signupWithGithub(): Promise<void> {
    this.isLoading = true;

    try {
      await this.authService.loginWithGithub();
      this.router.navigate(['/home']);
    } catch (error: any) {
      await this.notificationService.error(
        error.message || this.translate.instant('LOGIN.ERROR.GITHUB_FAILED'),
      );
    } finally {
      this.isLoading = false;
    }
  }

  async signupWithGoogle(): Promise<void> {
    this.isLoading = true;

    try {
      await this.authService.loginWithGoogle();
      await this.router.navigate(['/home']);
    } catch (error: any) {
      await this.notificationService.error(
        error.message || this.translate.instant('LOGIN.ERROR.GOOGLE_FAILED'),
      );
    } finally {
      this.isLoading = false;
    }
  }

  changeLanguage(lang: string): void {
    this.translate.use(lang);
  }
}
