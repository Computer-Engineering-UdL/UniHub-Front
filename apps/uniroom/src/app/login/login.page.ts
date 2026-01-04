import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import NotificationService from '../services/notification.service';
import { LangCode, LocalizationService } from '../services/localization.service';
import { ForgotPasswordModalComponent } from './forgot-password-modal/forgot-password-modal.component';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  standalone: false
})
export class LoginPage {
  emailOrUsername: string = '';
  password: string = '';
  isLoading: boolean = false;
  emailOrUsernameTouched: boolean = false;
  passwordTouched: boolean = false;
  showPassword: boolean = false;

  private readonly authService: AuthService = inject(AuthService);
  private readonly router: Router = inject(Router);
  private readonly modalController: ModalController = inject(ModalController);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly localizationService: LocalizationService = inject(LocalizationService);
  private readonly translateService: TranslateService = inject(TranslateService);

  private readonly emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  validateEmailOrUsername(value: string): boolean {
    return value.trim().length > 0;
  }

  isEmail(value: string): boolean {
    return this.emailRegex.test(value);
  }

  onEmailOrUsernameInput(): void {
    if (!this.emailOrUsernameTouched) {
      this.emailOrUsernameTouched = true;
    }
  }

  onPasswordInput(): void {
    if (!this.passwordTouched) {
      this.passwordTouched = true;
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async login(): Promise<void> {
    if (!this.emailOrUsername || !this.password) {
      this.emailOrUsernameTouched = true;
      this.passwordTouched = true;
      this.notificationService.error('LOGIN.ERROR.EMPTY_CREDENTIALS');
      return;
    }
    if (this.password.length < 8) {
      this.passwordTouched = true;
      this.notificationService.error('SIGNUP.ERROR.PASSWORD_TOO_SHORT');
      return;
    }

    this.isLoading = true;

    try {
      await this.authService.login(this.emailOrUsername, this.password);
      await this.router.navigate(['/home']);
    } catch (error: any) {
      let message = 'LOGIN.ERROR.LOGIN_FAILED';
      if (error) {
        const formattedMsg =
          'LOGIN.ERROR.' + this.localizationService.formatWSResponseToTranslateKey(error.error.detail);
        if (this.localizationService.hasTranslation(formattedMsg)) {
          message = formattedMsg;
        }
      }

      if (error?.bannedUntil) {
        const bannedUntilDate = new Date(error.bannedUntil);
        const formattedDate = this.localizationService.formatDate(bannedUntilDate.toISOString());
        message = this.translateService.instant('LOGIN.ERROR.USER_BANNED_UNTIL', {
          date: formattedDate
        });
      }

      this.notificationService.error(message, 4000);
    } finally {
      this.isLoading = false;
    }
  }

  public async changeLanguage(lang: LangCode): Promise<void> {
    await this.localizationService.changeLanguage(lang);
  }

  public async openForgotPasswordModal(): Promise<void> {
    const modal: HTMLIonModalElement = await this.modalController.create({
      component: ForgotPasswordModalComponent
    });
    await modal.present();
  }

  async loginWithGoogle(): Promise<void> {
    this.isLoading = true;
    try {
      await this.authService.loginWithGoogle();
      await this.router.navigate(['/home']);
    } catch (error: any) {
      // Provide specific error messages
      if (error?.message?.includes('OAUTH_WINDOW_CLOSED')) {
        this.notificationService.error('LOGIN.ERROR.OAUTH_WINDOW_CLOSED');
      } else if (error?.message?.includes('Failed to open OAuth window')) {
        this.notificationService.error('LOGIN.ERROR.POPUP_BLOCKED');
      } else {
        this.notificationService.error('LOGIN.ERROR.GOOGLE_FAILED');
      }
    } finally {
      this.isLoading = false;
    }
  }
}
