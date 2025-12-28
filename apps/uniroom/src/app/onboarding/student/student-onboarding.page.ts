import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import NotificationService from '../../services/notification.service';
import { InterestCategory, Role, User } from '../../models/auth.types';

interface StudentData {
  university?: string;
  campus?: string;
  faculty?: string;
  degree?: string;
  yearOfStudy?: number;
  studyMode: 'full-time' | 'part-time';
  bio?: string;
  languagesText?: string;
}

@Component({
  selector: 'app-student-onboarding',
  templateUrl: './student-onboarding.page.html',
  styleUrls: ['./student-onboarding.page.scss'],
  standalone: false
})
export class StudentOnboardingPage {
  private authService: AuthService = inject(AuthService);
  private router: Router = inject(Router);
  private notificationService: NotificationService = inject(NotificationService);

  currentStep: number = 1;
  readonly totalSteps: number = 4;

  studentData: StudentData = {
    studyMode: 'full-time'
  };

  interestCategories: InterestCategory[] = [];
  isLoadingInterests: boolean = false;
  isSaving: boolean = false;
  selectedInterestIds: Set<string> = new Set<string>();

  readonly yearOptions: number[] = [1, 2, 3, 4, 5, 6];

  constructor() {
    const user: User | null = this.authService.currentUser;
    if (user) {
      this.studentData = {
        university: user.university,
        campus: user.campus,
        faculty: user.faculty,
        degree: user.degree,
        yearOfStudy: user.yearOfStudy,
        studyMode: (user.studyMode as 'full-time' | 'part-time') || 'full-time',
        bio: user.bio,
        languagesText: user.languages?.join(', ')
      };
      user.interests?.forEach((interest) => {
        if (interest?.id) {
          this.selectedInterestIds.add(interest.id);
        }
      });
    }
    void this.loadInterestCategories();
  }

  private async loadInterestCategories(): Promise<void> {
    this.isLoadingInterests = true;
    try {
      this.interestCategories = await this.authService.getAllInterestCategories();
    } finally {
      this.isLoadingInterests = false;
    }
  }

  canContinueCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!this.studentData.university && !!this.studentData.faculty && !!this.studentData.degree;
      case 2:
        return !!this.studentData.yearOfStudy && !!this.studentData.studyMode;
      case 3:
        return this.selectedInterestIds.size > 0;
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

  private async persistCurrentStep(): Promise<void> {
    switch (this.currentStep) {
      case 1:
        await this.authService.updateCurrentUser({
          university: this.studentData.university,
          campus: this.studentData.campus,
          faculty: this.studentData.faculty,
          degree: this.studentData.degree
        });
        break;
      case 2:
        await this.authService.updateCurrentUser({
          yearOfStudy: this.studentData.yearOfStudy,
          studyMode: this.studentData.studyMode
        });
        break;
      case 3:
        await this.syncInterests();
        break;
      default:
        break;
    }
  }

  private async syncInterests(): Promise<void> {
    const user: User | null = this.authService.currentUser;
    if (!user?.id) {
      return;
    }
    const currentIds: string[] = user.interests?.map((interest) => interest.id) ?? [];
    const toAdd: string[] = Array.from(this.selectedInterestIds).filter((id) => !currentIds.includes(id));
    const toRemove: string[] = currentIds.filter((id) => !this.selectedInterestIds.has(id));
    const operations: Promise<void>[] = [];
    toAdd.forEach((id) => operations.push(this.authService.addInterestToUser(user.id, id)));
    toRemove.forEach((id) => operations.push(this.authService.removeInterestFromUser(user.id, id)));
    await Promise.all(operations);
  }

  toggleInterest(interestId: string): void {
    if (this.selectedInterestIds.has(interestId)) {
      this.selectedInterestIds.delete(interestId);
    } else {
      this.selectedInterestIds.add(interestId);
    }
  }

  async finish(): Promise<void> {
    this.isSaving = true;
    try {
      await this.authService.updateCurrentUser({
        bio: this.studentData.bio,
        languages: this.studentData.languagesText
          ? this.studentData.languagesText
              .split(',')
              .map((language) => language.trim())
              .filter(Boolean)
          : undefined,
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
