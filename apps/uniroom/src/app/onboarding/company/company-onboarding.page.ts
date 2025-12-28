import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import NotificationService from '../../services/notification.service';
import { User } from '../../models/auth.types';

const FACULTY_OPTIONS: string[] = ['Engineering', 'Business', 'Arts', 'Sciences'];
const SKILL_OPTIONS: string[] = ['Design', 'Marketing', 'Data', 'Operations', 'Finance'];
const FOCUS_OPTIONS: string[] = ['Internship', 'Part-time', 'Full-time'];

interface CompanyData {
  companyName?: string;
  website?: string;
  industry?: string;
  country?: string;
  city?: string;
  contactPerson?: string;
  contactRole?: string;
  workEmail?: string;
  targetFaculties: string[];
  targetSkills: string[];
  hiringFocus: string[];
  description?: string;
  linkedinUrl?: string;
}

@Component({
  selector: 'app-company-onboarding',
  templateUrl: './company-onboarding.page.html',
  styleUrls: ['./company-onboarding.page.scss'],
  standalone: false
})
export class CompanyOnboardingPage {
  private authService: AuthService = inject(AuthService);
  private router: Router = inject(Router);
  private notificationService: NotificationService = inject(NotificationService);

  currentStep: number = 1;
  readonly totalSteps: number = 4;

  companyData: CompanyData = {
    targetFaculties: [],
    targetSkills: [],
    hiringFocus: []
  };

  isSaving: boolean = false;

  readonly facultyOptions = FACULTY_OPTIONS;
  readonly skillOptions = SKILL_OPTIONS;
  readonly focusOptions = FOCUS_OPTIONS;

  constructor() {
    const user: User | null = this.authService.currentUser;
    if (user) {
      this.companyData = {
        companyName: user.companyName,
        website: user.companyWebsite,
        industry: user.industry,
        country: user.country,
        city: user.city,
        contactPerson: user.contactPerson,
        contactRole: user.contactRole,
        workEmail: user.workEmail,
        targetFaculties: user.targetFaculties || [],
        targetSkills: user.targetSkills || [],
        hiringFocus: user.hiringFocus || [],
        description: user.description,
        linkedinUrl: user.linkedinUrl
      };
    }
  }

  canContinueCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!this.companyData.companyName && !!this.companyData.industry;
      case 2:
        return !!this.companyData.contactPerson && !!this.companyData.workEmail;
      default:
        return true;
    }
  }

  async nextStep(): Promise<void> {
    if (!this.canContinueCurrentStep()) {
      this.notificationService.error('ONBOARDING.ERROR.VALIDATION');
      return;
    }
    this.isSaving = true;
    try {
      await this.persistCurrentStep();
      this.currentStep = Math.min(this.totalSteps, this.currentStep + 1);
    } catch (error) {
      console.error(error);
      this.notificationService.error('ONBOARDING.ERROR.GENERIC');
    } finally {
      this.isSaving = false;
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    } else {
      void this.router.navigate(['/onboarding/role']);
    }
  }

  toggleValue(list: string[], value: string): string[] {
    const next = new Set(list);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    return Array.from(next);
  }

  toggleFaculty(option: string): void {
    this.companyData.targetFaculties = this.toggleValue(this.companyData.targetFaculties, option);
  }

  toggleSkill(option: string): void {
    this.companyData.targetSkills = this.toggleValue(this.companyData.targetSkills, option);
  }

  toggleFocus(option: string): void {
    this.companyData.hiringFocus = this.toggleValue(this.companyData.hiringFocus, option);
  }

  private async persistCurrentStep(): Promise<void> {
    switch (this.currentStep) {
      case 1:
        await this.authService.updateCurrentUser({
          companyName: this.companyData.companyName,
          companyWebsite: this.companyData.website,
          industry: this.companyData.industry,
          country: this.companyData.country,
          city: this.companyData.city
        });
        break;
      case 2:
        await this.authService.updateCurrentUser({
          contactPerson: this.companyData.contactPerson,
          contactRole: this.companyData.contactRole,
          workEmail: this.companyData.workEmail
        });
        break;
      case 3:
        await this.authService.updateCurrentUser({
          targetFaculties: this.companyData.targetFaculties,
          targetSkills: this.companyData.targetSkills,
          hiringFocus: this.companyData.hiringFocus
        });
        break;
      default:
        break;
    }
  }

  async finish(): Promise<void> {
    this.isSaving = true;
    try {
      await this.persistCurrentStep();
      await this.authService.updateCurrentUser({
        description: this.companyData.description,
        linkedinUrl: this.companyData.linkedinUrl,
        onboardingCompleted: true
      });
      await this.router.navigate(['/home']);
    } catch (error) {
      console.error(error);
      this.notificationService.error('ONBOARDING.ERROR.GENERIC');
    } finally {
      this.isSaving = false;
    }
  }
}
