import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import NotificationService from '../services/notification.service';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.page.html',
  styleUrls: ['./verify-email.page.scss'],
  standalone: false
})
export class VerifyEmailPage implements OnInit {
  isVerifying: boolean = true;
  isSuccess: boolean = false;
  errorMessage: string = '';

  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly authService: AuthService = inject(AuthService);
  private readonly notificationService: NotificationService = inject(NotificationService);

  async ngOnInit(): Promise<void> {
    const token: string | null = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.isVerifying = false;
      this.errorMessage = 'VERIFY_EMAIL.ERROR.NO_TOKEN';
      return;
    }

    try {
      await this.authService.confirmEmailVerification(token);
      this.isSuccess = true;
      this.notificationService.success('VERIFY_EMAIL.SUCCESS');
      setTimeout((): void => {
        void this.router.navigate(['/profile']);
      }, 2000);
    } catch {
      this.errorMessage = 'VERIFY_EMAIL.ERROR.VERIFICATION_FAILED';
      this.notificationService.error('VERIFY_EMAIL.ERROR.VERIFICATION_FAILED');
    } finally {
      this.isVerifying = false;
    }
  }

  async goToProfile(): Promise<void> {
    await this.router.navigate(['/profile']);
  }

  async goToHome(): Promise<void> {
    await this.router.navigate(['/home']);
  }
}
