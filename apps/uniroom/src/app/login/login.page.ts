import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
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

  async login() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter email and password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      await this.authService.login(this.email, this.password);
      this.router.navigate(['/home']);
    } catch (error: any) {
      this.errorMessage = error.message || 'Login failed. Please try again.';
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
      this.errorMessage = error.message || 'GitHub login failed. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  async loginWithGoogle() {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      await this.authService.loginWithGoogle();
      this.router.navigate(['/home']);
    } catch (error: any) {
      this.errorMessage = error.message || 'Google login failed. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }
}
