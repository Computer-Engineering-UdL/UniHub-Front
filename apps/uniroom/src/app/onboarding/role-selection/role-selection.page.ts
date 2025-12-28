import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import NotificationService from '../../services/notification.service';
import { Role, User } from '../../models/auth.types';

interface RoleOption {
  id: Role;
  icon: string;
  titleKey: string;
  descriptionKey: string;
}

@Component({
  selector: 'app-role-selection',
  templateUrl: './role-selection.page.html',
  styleUrls: ['./role-selection.page.scss'],
  standalone: false
})
export class RoleSelectionPage {
  private readonly authService: AuthService = inject(AuthService);
  private readonly router: Router = inject(Router);
  private readonly notificationService: NotificationService = inject(NotificationService);

  selectedRole: Role | null = null;
  isSaving: boolean = false;

  readonly roleOptions: RoleOption[] = [
    {
      id: 'Basic',
      icon: 'school-outline',
      titleKey: 'ONBOARDING.ROLE_SELECTION.STUDENT.TITLE',
      descriptionKey: 'ONBOARDING.ROLE_SELECTION.STUDENT.DESCRIPTION'
    },
    {
      id: 'Seller',
      icon: 'home-outline',
      titleKey: 'ONBOARDING.ROLE_SELECTION.LANDLORD.TITLE',
      descriptionKey: 'ONBOARDING.ROLE_SELECTION.LANDLORD.DESCRIPTION'
    },
    {
      id: 'Company',
      icon: 'briefcase-outline',
      titleKey: 'ONBOARDING.ROLE_SELECTION.COMPANY.TITLE',
      descriptionKey: 'ONBOARDING.ROLE_SELECTION.COMPANY.DESCRIPTION'
    }
  ];

  constructor() {
    const user: User | null = this.authService.currentUser;
    this.selectedRole = user?.role ?? null;
  }

  selectRole(role: Role): void {
    this.selectedRole = role;
  }

  async continue(): Promise<void> {
    if (!this.selectedRole) {
      return;
    }
    this.isSaving = true;
    try {
      await this.authService.updateCurrentUser({ role: this.selectedRole, onboardingCompleted: false });
      const redirect = this.authService.getOnboardingRedirectRoute();
      await this.router.navigate([redirect ?? '/home']);
    } catch (error) {
      console.error(error);
      this.notificationService.error('ONBOARDING.ERROR.GENERIC');
    } finally {
      this.isSaving = false;
    }
  }
}
