import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { CreateOfferData, GenderPreference, OfferStatus } from '../../models/offer.types';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-create-offer-modal',
  templateUrl: './create-offer-modal.component.html',
  styleUrls: ['./create-offer-modal.component.scss'],
  standalone: false
})
export class CreateOfferModalComponent implements OnInit {
  offerForm!: FormGroup;
  isSubmitting: boolean = false;

  genderPreferences: GenderPreference[] = ['any', 'male', 'female', 'other'];

  categories: { id: string; name: string }[] = [];
  categoryLoading: boolean = true;

  private modalController: ModalController = inject(ModalController);
  private formBuilder: FormBuilder = inject(FormBuilder);
  private apiService: ApiService = inject(ApiService);
  private authService: AuthService = inject(AuthService);
  private notificationService: NotificationService = inject(NotificationService);

  ngOnInit(): void {
    this.initializeForm();
    this.loadCategories();
  }

  private initializeForm(): void {
    const today = new Date().toISOString().split('T')[0];

    this.offerForm = this.formBuilder.group({
      category_id: ['', Validators.required],
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      price: [0, [Validators.required, Validators.min(0)]],
      area: [0, [Validators.required, Validators.min(0)]],
      offer_valid_until: ['', Validators.required],
      city: ['', [Validators.required, Validators.maxLength(50)]],
      address: ['', [Validators.required, Validators.maxLength(200)]],
      start_date: [today, Validators.required],
      end_date: ['', Validators.required],
      deposit: [0, [Validators.min(0)]],
      num_rooms: [1, [Validators.required, Validators.min(0)]],
      num_bathrooms: [1, [Validators.required, Validators.min(0)]],
      furnished: [false],
      utilities_included: [false],
      internet_included: [false],
      gender_preference: ['any' as GenderPreference, Validators.required],
      status: ['active' as OfferStatus, Validators.required]
    });
  }

  // New: load categories from API
  private async loadCategories(): Promise<void> {
    this.categoryLoading = true;
    try {
      // The API path follows the same pattern used elsewhere in the app
      const result = await firstValueFrom(this.apiService.get<{ id: string; name: string }[]>('categories/categories/'));
      this.categories = Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Failed to load categories:', error);
      // Notify user (translation key assumed); if not available it will show the key
      try {
        await this.notificationService.error('ERROR.LOAD_CATEGORIES');
      } catch (e) {
        // swallow notification errors
      }
      this.categories = [];
    } finally {
      this.categoryLoading = false;
    }
  }

  // New: detect desktop vs mobile to choose a better ion-select interface
  get selectInterface(): 'popover' | 'action-sheet' {
    try {
      return window && window.innerWidth >= 768 ? 'popover' : 'action-sheet';
    } catch (e) {
      return 'action-sheet';
    }
  }

  // Options for the select interfaces (used to apply a wider popover on desktop)
  get selectInterfaceOptions(): any {
    if (this.selectInterface === 'popover') {
      return { cssClass: 'category-popover' };
    }
    return {};
  }

  async onSubmit(): Promise<void> {
    if (this.offerForm.invalid || this.isSubmitting) {
      this.markFormGroupTouched(this.offerForm);
      return;
    }

    this.isSubmitting = true;

    try {
      const user = await firstValueFrom(this.authService.currentUser$);
      if (!user) {
        await this.notificationService.error('ERROR.NOT_AUTHENTICATED');
        this.isSubmitting = false;
        return;
      }

      const offerData: CreateOfferData = {
        ...this.offerForm.value,
        user_id: user.id
      };

      const createdOffer: unknown = await firstValueFrom(this.apiService.post('offers/offers/', offerData));

      await this.modalController.dismiss(createdOffer, 'created');
    } catch (error) {
      this.isSubmitting = false;
    }
  }

  async dismiss(): Promise<void> {
    await this.modalController.dismiss(null, 'cancel');
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.offerForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }
}
