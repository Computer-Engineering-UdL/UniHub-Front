import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import NotificationService from '../../services/notification.service';
import { User } from '../../models/auth.types';

const PROPERTY_OPTIONS: string[] = ['Room', 'Studio', 'Apartment', 'House'];

interface LandlordData {
  fullName?: string;
  phone?: string;
  city?: string;
  country?: string;
  landlordType?: string;
  companyName?: string;
  taxId?: string;
  operatingLocationsText?: string;
  propertyTypes: string[];
  priceMin?: number;
  priceMax?: number;
}

@Component({
  selector: 'app-landlord-onboarding',
  templateUrl: './landlord-onboarding.page.html',
  styleUrls: ['./landlord-onboarding.page.scss'],
  standalone: false
})
export class LandlordOnboardingPage {
  private readonly authService: AuthService = inject(AuthService);
  private readonly router: Router = inject(Router);
  private readonly notificationService: NotificationService = inject(NotificationService);

  currentStep: number = 1;
  readonly totalSteps: number = 3;

  landlordData: LandlordData = {
    propertyTypes: []
  };

  isSaving: boolean = false;

  readonly propertyOptions: string[] = PROPERTY_OPTIONS;

  constructor() {
    const user: User | null = this.authService.currentUser;
    if (user) {
      const fullName = user.fullName?.trim() || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
      this.landlordData = {
        fullName: fullName || undefined,
        phone: user.phone,
        city: user.city,
        country: user.country,
        landlordType: user.landlordType,
        companyName: user.companyName,
        taxId: user.taxId,
        operatingLocationsText: user.operatingLocations?.join(', '),
        propertyTypes: user.propertyTypes || [],
        priceMin: user.priceRangeMin,
        priceMax: user.priceRangeMax
      };
    } else {
      this.landlordData.propertyTypes = [];
    }
  }

  canContinueCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return (
          !!this.landlordData.fullName &&
          !!this.landlordData.phone &&
          !!this.landlordData.city &&
          !!this.landlordData.country
        );
      case 2:
        return !!this.landlordData.landlordType;
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

  togglePropertyType(option: string): void {
    const types = new Set(this.landlordData.propertyTypes);
    if (types.has(option)) {
      types.delete(option);
    } else {
      types.add(option);
    }
    this.landlordData.propertyTypes = Array.from(types);
  }

  private async persistCurrentStep(): Promise<void> {
    switch (this.currentStep) {
      case 1: {
        const [firstName = '', ...rest] = (this.landlordData.fullName || '').split(' ');
        await this.authService.updateCurrentUser({
          firstName: firstName.trim(),
          lastName: rest.join(' ').trim() || undefined,
          phone: this.landlordData.phone,
          city: this.landlordData.city,
          country: this.landlordData.country
        });
        break;
      }
      case 2:
        await this.authService.updateCurrentUser({
          landlordType: this.landlordData.landlordType,
          companyName: this.landlordData.companyName,
          taxId: this.landlordData.taxId
        });
        break;
      default:
        await this.authService.updateCurrentUser({
          operatingLocations: this.parseLocations(),
          propertyTypes: this.landlordData.propertyTypes,
          priceRangeMin: this.landlordData.priceMin,
          priceRangeMax: this.landlordData.priceMax
        });
        break;
    }
  }

  private parseLocations(): string[] | undefined {
    if (!this.landlordData.operatingLocationsText) {
      return undefined;
    }
    return this.landlordData.operatingLocationsText
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  async finish(): Promise<void> {
    this.isSaving = true;
    try {
      await this.persistCurrentStep();
      await this.authService.updateCurrentUser({ onboardingCompleted: true });
      await this.router.navigate(['/home']);
    } catch (error) {
      console.error(error);
      this.notificationService.error('ONBOARDING.ERROR.GENERIC');
    } finally {
      this.isSaving = false;
    }
  }
}
