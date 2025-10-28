import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { CreateOfferData, GenderPreference, OfferStatus } from '../../models/offer.types';
import { Subscription, firstValueFrom } from 'rxjs';
import { LocalizationService } from '../../services/localization.service';
import { User } from '../../models/auth.types';
import NotificationService from "../../services/notification.service";

@Component({
  selector: 'app-create-offer-modal',
  templateUrl: './create-offer-modal.component.html',
  styleUrls: ['./create-offer-modal.component.scss'],
  standalone: false
})
export class CreateOfferModalComponent implements OnInit, OnDestroy {
  offerForm!: FormGroup;
  isSubmitting: boolean = false;

  genderPreferences: GenderPreference[] = ['any', 'male', 'female', 'other'];

  categories: { id: string; name: string }[] = [];
  categoryLoading: boolean = true;

  readonly availableCities: Array<{ value: string; label: string; disabled?: boolean }> = [
    { value: 'Lleida', label: 'Lleida' },
    { value: 'Barcelona', label: 'Barcelona', disabled: true },
    { value: 'Tarragona', label: 'Tarragona', disabled: true },
    { value: 'Girona', label: 'Girona', disabled: true }
  ];


  public readonly todayISO: string = new Date().toISOString().split('T')[0];
  public endDateMin: string = this.todayISO;
  public readonly offerValidMin: string = this.todayISO;

  private startDateSubscription?: Subscription;

  private modalController: ModalController = inject(ModalController);
  private formBuilder: FormBuilder = inject(FormBuilder);
  private apiService: ApiService = inject(ApiService);
  private authService: AuthService = inject(AuthService);
  private notificationService: NotificationService = inject(NotificationService);
  private localizationService: LocalizationService = inject(LocalizationService);
  private translateService: TranslateService = inject(TranslateService);

  ngOnInit(): void {
    this.initializeForm();
    void this.loadCategories();
  }

  ngOnDestroy(): void {
    this.startDateSubscription?.unsubscribe();
  }

  private initializeForm(): void {
    this.offerForm = this.formBuilder.group({
      category_id: ['', Validators.required],
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      price: [0, [Validators.required, Validators.min(0)]],
      area: [0, [Validators.required, Validators.min(0)]],
      offer_valid_until: ['', Validators.required],
      city: ['', [Validators.required, Validators.maxLength(50)]],
      address: ['', [Validators.required, Validators.maxLength(200)]],
      start_date: [this.todayISO, Validators.required],
      end_date: ['', Validators.required],
      deposit: [0, [Validators.min(0)]],
      num_rooms: [1, [Validators.required, Validators.min(1)]],
      num_bathrooms: [1, [Validators.required, Validators.min(1)]],
      furnished: [false],
      utilities_included: [false],
      internet_included: [false],
      gender_preference: ['any' as GenderPreference, Validators.required],
      status: ['active' as OfferStatus, Validators.required]
    });

    this.endDateMin = this.todayISO;
    this.startDateSubscription = this.offerForm
      .get('start_date')
      ?.valueChanges.subscribe((value: string) => {
        if (!value) {
          this.endDateMin = this.todayISO;
          return;
        }

        this.endDateMin = value;
        const endDateControl = this.offerForm.get('end_date');
        const currentEndDate = endDateControl?.value as string;
        if (currentEndDate && new Date(currentEndDate) < new Date(value)) {
          endDateControl?.setValue(value);
        }
      });
  }

  // New: load categories from API
  private async loadCategories(): Promise<void> {
    this.categoryLoading = true;
    try {
      // The API path follows the same pattern used elsewhere in the app
      const result = await firstValueFrom(
        this.apiService.get<{ id: string; name: string }[]>('categories/categories/')
      );
      this.categories = Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Failed to load categories:', error);
      // Notify user (translation key assumed); if not available it will show the key
      try {
        this.notificationService.error('ERROR.LOAD_CATEGORIES');
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
      const user: User | null = await firstValueFrom(this.authService.currentUser$);
      if (!user) {
        this.notificationService.error('ERROR.NOT_AUTHENTICATED');
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

  get formattedMonthlyPrice(): string {
    const value = this.offerForm?.get('price')?.value;
    return this.localizationService.formatPrice(value ?? 0);
  }

  get formattedDeposit(): string {
    const value = this.offerForm?.get('deposit')?.value;
    if (value === null || value === '' || value === undefined) {
      return '—';
    }
    return this.localizationService.formatPrice(value ?? 0);
  }

  get formattedArea(): string {
    const value = this.offerForm?.get('area')?.value;
    if (value === null || value === '' || value === undefined) {
      return '—';
    }
    return `${this.localizationService.formatNumber(value ?? 0, 1)} m²`;
  }

  getRangeValue(controlName: 'num_rooms' | 'num_bathrooms'): number {
    const raw = this.offerForm?.get(controlName)?.value;
    return Number(raw ?? 0);
  }

  private normalizeCategoryName(name: string): string {
    return name.toUpperCase().replace(/ /g, '_');
  }
  getCategoryLabel(category: { id: string; name: string }): string {
    if (!category) {
      return '';
    }
    const key = `ROOM.CATEGORY_NAMES.${this.normalizeCategoryName(category.name)}`;
    const translated = this.translateService.instant(key);
    // If the key is not found, instant() returns the key itself.
    // In that case, we should return the original category name.
    return translated !== key ? translated : category.name;
  }

  getCityLabel(city: { value: string; label: string }): string {
    if (!city) {
      return '';
    }
    const key: string = `ROOM.CITIES.${this.normalizeCityKey(city.label)}`;
    const translated: string = this.translateService.instant(key);
    if (translated && translated !== key) {
      return translated;
    }
    return city.label;
  }

  private normalizeCityKey(name: string): string {
    return name?.trim().toUpperCase().replace(/\s+/g, '_') ?? '';
  }

  getFormattedDate(field: 'start_date' | 'end_date' | 'offer_valid_until'): string {
    const value = this.offerForm?.get(field)?.value;
    return value ? this.localizationService.formatDate(value) : '—';
  }

  toggleAmenity(fieldName: string): void {
    const control = this.offerForm.get(fieldName);
    if (control) {
      control.setValue(!control.value);
    }
  }
}
