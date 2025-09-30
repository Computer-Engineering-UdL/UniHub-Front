import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  standalone: false,
})
export class LoginPage {
  email = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  private authService = inject(AuthService);
  private router = inject(Router);
  private translate = inject(TranslateService);

  // Email validation regex
  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  validateEmail(email: string): boolean {
    return this.emailRegex.test(email);
  }

  async login() {
    if (!this.email || !this.password) {
      this.errorMessage = this.translate.instant(
        'LOGIN.ERROR.EMPTY_CREDENTIALS',
      );
      return;
    }

    if (!this.validateEmail(this.email)) {
      this.errorMessage = this.translate.instant('LOGIN.ERROR.INVALID_EMAIL');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      await this.authService.login(this.email, this.password);
      await this.router.navigate(['/home']);
    } catch (error: any) {
      this.errorMessage =
        error.message || this.translate.instant('LOGIN.ERROR.LOGIN_FAILED');
    } finally {
      this.isLoading = false;
    }
  }

  async loginWithGithub() {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      await this.authService.loginWithGithub();
      this.router.navigate(['/home']);
    } catch (error: any) {
      this.errorMessage =
        error.message || this.translate.instant('LOGIN.ERROR.GITHUB_FAILED');
    } finally {
      this.isLoading = false;
    }
  }

  async loginWithGoogle() {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      await this.authService.loginWithGoogle();
      await this.router.navigate(['/home']);
    } catch (error: any) {
      this.errorMessage =
        error.message || this.translate.instant('LOGIN.ERROR.GOOGLE_FAILED');
    } finally {
      this.isLoading = false;
    }
  }

  changeLanguage(lang: string) {
    this.translate.use(lang);
  }
}
