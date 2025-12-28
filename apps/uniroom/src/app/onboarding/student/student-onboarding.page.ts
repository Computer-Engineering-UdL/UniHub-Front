import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import NotificationService from '../../services/notification.service';
import { FacultyUpdate, InterestCategory, User } from '../../models/auth.types';
import { ApiService } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';

interface Faculty {
  id: string;
  name: string;
}

interface University {
  id: string;
  name: string;
  faculties: Faculty[];
}

interface StudentData {
  selectedUniversityId?: string | null;
  selectedFacultyId?: string | null;
  campus?: string;
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
export class StudentOnboardingPage implements OnInit {
  private readonly authService: AuthService = inject(AuthService);
  private readonly router: Router = inject(Router);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly apiService: ApiService = inject(ApiService);

  currentStep: number = 1;
  readonly totalSteps: number = 4;

  studentData: StudentData = {
    studyMode: 'full-time',
    yearOfStudy: 1
  };

  universities: University[] = [];
  filteredFaculties: Faculty[] = [];
  loadingUniversities: boolean = false;
  interestCategories: InterestCategory[] = [];
  isLoadingInterests: boolean = false;
  isSaving: boolean = false;
  selectedInterestIds: Set<string> = new Set<string>();

  ngOnInit(): void {
    void this.loadUniversitiesAndFaculties();
    this.loadUserData();
    void this.loadInterestCategories();
  }

  private loadUserData(): void {
    const user: User | null = this.authService.currentUser;
    if (user) {
      this.studentData = {
        selectedUniversityId: null,
        selectedFacultyId: user.faculty_id,
        campus: user.campus,
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
  }

  private async loadUniversitiesAndFaculties(): Promise<void> {
    this.loadingUniversities = true;

    try {
      const universitiesResponse: University[] = await firstValueFrom(
        this.apiService.get<University[]>('universities')
      );

      this.universities = universitiesResponse || [];

      if (this.studentData.selectedFacultyId) {
        for (const university of this.universities) {
          const faculty = university.faculties.find((f) => f.id === this.studentData.selectedFacultyId);
          if (faculty) {
            this.studentData.selectedUniversityId = university.id;
            this.filteredFaculties = university.faculties;
            break;
          }
        }
      }
    } catch {
      this.notificationService.error('PROFILE.ERROR_LOADING_DATA');
    } finally {
      this.loadingUniversities = false;
    }
  }

  onUniversityChange(universityId: string): void {
    this.studentData.selectedUniversityId = universityId;
    this.studentData.selectedFacultyId = null;
    this.filterFacultiesByUniversity(universityId);
  }

  onFacultyChange(facultyId: string): void {
    this.studentData.selectedFacultyId = facultyId;
  }

  private filterFacultiesByUniversity(universityId: string | null): void {
    if (!universityId) {
      this.filteredFaculties = [];
      return;
    }
    const university: University | undefined = this.universities.find((u: University) => u.id === universityId);
    this.filteredFaculties = university?.faculties || [];
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
        return (
          !!this.studentData.selectedUniversityId && !!this.studentData.selectedFacultyId && !!this.studentData.degree
        );
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
    } catch {
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
      case 1: {
        const selectedUniversity: University | undefined = this.universities.find(
          (u: University) => u.id === this.studentData.selectedUniversityId
        );
        const selectedFaculty: Faculty | undefined = this.filteredFaculties.find(
          (f: Faculty) => f.id === this.studentData.selectedFacultyId
        );

        const faculty: FacultyUpdate = {
          id: selectedFaculty?.id || '',
          name: selectedFaculty?.name || '',
          university: {
            id: selectedUniversity?.id || '',
            name: selectedUniversity?.name || ''
          },
          address: this.studentData.campus || ''
        };

        await this.authService.updateCurrentUser({
          faculty_id: selectedFaculty?.id,
          faculty: faculty,
          campus: this.studentData.campus,
          degree: this.studentData.degree
        });
        break;
      }
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
    } catch {
      this.notificationService.error('ONBOARDING.ERROR.GENERIC');
    } finally {
      this.isSaving = false;
    }
  }
}
