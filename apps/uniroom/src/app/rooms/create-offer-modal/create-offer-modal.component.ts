import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import {
  CreateOfferData,
  CreateOfferPhoto,
  GenderPreference,
  OfferAmenity,
  OfferHouseRules,
  OfferStatus
} from '../../models/offer.types';
import { Subscription, firstValueFrom } from 'rxjs';
import { LocalizationService } from '../../services/localization.service';
import { User } from '../../models/auth.types';
import NotificationService from '../../services/notification.service';
import { TranslateService } from '@ngx-translate/core';

interface SelectedPhotoPreview {
  file: File;
  preview: string;
  isPrimary: boolean;
}

type OfferFormValue = {
  category_id: string;
  title: string;
  description: string;
  price: number;
  area: number;
  offer_valid_until: string;
  city: string;
  address: string;
  start_date: string;
  end_date: string;
  deposit: number | null;
  num_rooms: number;
  num_bathrooms: number;
  furnished: boolean;
  utilities_included: boolean;
  internet_included: boolean;
  gender_preference: GenderPreference;
  status: OfferStatus;
  floor: number | null;
  distance_from_campus: string | null;
  utilities_cost: number | null;
  utilities_description: string | null;
  contract_type: string | null;
  latitude: number | null;
  longitude: number | null;
  amenities: Record<string, boolean>;
  house_rules: OfferHouseRules;
};

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

  readonly maxPhotoCount: number = 10;
  photoUploadError: string | null = null;
  photoPreviews: SelectedPhotoPreview[] = [];

  readonly additionalAmenities: Array<{ control: string; labelKey: string }> = [
    { control: 'heating', labelKey: 'ROOM.FORM.HEATING' },
    { control: 'parking', labelKey: 'ROOM.FORM.PARKING' },
    { control: 'kitchen', labelKey: 'ROOM.FORM.KITCHEN' },
    { control: 'tv', labelKey: 'ROOM.FORM.TV' },
    { control: 'security', labelKey: 'ROOM.FORM.SECURITY' },
    { control: 'balcony', labelKey: 'ROOM.FORM.BALCONY' }
  ];

  readonly houseRuleControls: Array<{ control: string; labelKey: string }> = [
    { control: 'smoking', labelKey: 'ROOM.FORM.RULE_SMOKING' },
    { control: 'pets', labelKey: 'ROOM.FORM.RULE_PETS' },
    { control: 'couples', labelKey: 'ROOM.FORM.RULE_COUPLES' }
  ];

  readonly contractTypeOptions: Array<{ value: string; labelKey: string }> = [
    { value: 'Long-term (min. 6 months)', labelKey: 'ROOM.FORM.CONTRACT_TYPE_LONG' },
    { value: 'Short-term (1-6 months)', labelKey: 'ROOM.FORM.CONTRACT_TYPE_SHORT' },
    { value: 'Academic stay', labelKey: 'ROOM.FORM.CONTRACT_TYPE_ACADEMIC' },
    { value: 'Other', labelKey: 'ROOM.FORM.CONTRACT_TYPE_OTHER' }
  ];

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
      status: ['active' as OfferStatus, Validators.required],
      floor: [null, [Validators.min(0)]],
      distance_from_campus: ['', [Validators.maxLength(100)]],
      utilities_cost: [null, [Validators.min(0)]],
      utilities_description: ['', [Validators.maxLength(200)]],
      contract_type: ['', [Validators.maxLength(100)]],
      latitude: [null, [Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.min(-180), Validators.max(180)]],
      amenities: this.formBuilder.group({
        heating: [false],
        parking: [false],
        kitchen: [true],
        tv: [false],
        security: [false],
        balcony: [false]
      }),
      house_rules: this.formBuilder.group({
        smoking: [false],
        pets: [false],
        couples: [false]
      })
    });


    this.endDateMin = this.todayISO;
    this.startDateSubscription = this.offerForm.get('start_date')?.valueChanges.subscribe((value: string) => {
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

  get selectInterface(): 'popover' | 'action-sheet' {
    try {
      return window && window.innerWidth >= 768 ? 'popover' : 'action-sheet';
    } catch (e) {
      return 'action-sheet';
    }
  }

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
        ...this.buildOfferPayload(),
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

  get canAddMorePhotos(): boolean {
    return this.photoPreviews.length < this.maxPhotoCount;
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

  toggleAmenity(controlPath: string): void {
    const control: AbstractControl | null = this.offerForm.get(controlPath);
    if (!control) {
      return;
    }
    const currentValue: unknown = control.value;
    if (typeof currentValue === 'boolean') {
      control.setValue(!currentValue);
    }
  }

  onPhotosSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files: FileList | null = target?.files;
    if (!files || files.length === 0) {
      return;
    }

    const availableSlots: number = this.maxPhotoCount - this.photoPreviews.length;
    const filesToProcess: File[] = Array.from(files).slice(0, Math.max(availableSlots, 0));

    if (files.length > filesToProcess.length) {
      this.photoUploadError = this.translateService.instant('ROOM.FORM.PHOTOS_LIMIT', {
        max: this.maxPhotoCount
      });
    } else {
      this.photoUploadError = null;
    }

    filesToProcess.forEach((file: File) => {
      const reader: FileReader = new FileReader();
      reader.onload = () => {
        const preview: string = typeof reader.result === 'string' ? reader.result : '';
        if (!preview) {
          return;
        }
        const newPhoto: SelectedPhotoPreview = {
          file,
          preview,
          isPrimary: this.photoPreviews.length === 0
        };
        this.photoPreviews = [...this.photoPreviews, newPhoto];
      };
      reader.readAsDataURL(file);
    });

    if (target) {
      target.value = '';
    }
  }

  removePhoto(index: number): void {
    if (index < 0 || index >= this.photoPreviews.length) {
      return;
    }
    this.photoPreviews = this.photoPreviews.filter((_, i) => i !== index).map((photo, idx) => ({
      ...photo,
      isPrimary: idx === 0
    }));
    if (this.photoPreviews.length < this.maxPhotoCount) {
      this.photoUploadError = null;
    }
  }

  setPrimaryPhoto(index: number): void {
    if (index <= 0 || index >= this.photoPreviews.length) {
      return;
    }
    const newOrder: SelectedPhotoPreview[] = [
      { ...this.photoPreviews[index], isPrimary: true },
      ...this.photoPreviews
        .filter((_, i) => i !== index)
        .map((photo, idx) => ({ ...photo, isPrimary: idx === 0 }))
    ];
    this.photoPreviews = newOrder.map((photo, idx) => ({ ...photo, isPrimary: idx === 0 }));
  }

  private buildOfferPayload(): Omit<CreateOfferData, 'user_id'> {
    const {
      amenities,
      house_rules,
      floor,
      distance_from_campus,
      utilities_cost,
      utilities_description,
      contract_type,
      latitude,
      longitude,
      ...formData
    } = this.offerForm.getRawValue() as OfferFormValue;

    return {
      ...formData,
      price: this.toNumber(formData.price),
      area: this.toNumber(formData.area),
      deposit: this.toNullableNumber(formData.deposit),
      num_rooms: this.toNumber(formData.num_rooms),
      num_bathrooms: this.toNumber(formData.num_bathrooms),
      floor: this.toNullableNumber(floor),
      distance_from_campus: this.normalizeString(distance_from_campus),
      utilities_cost: this.toNullableNumber(utilities_cost),
      utilities_description: this.normalizeString(utilities_description),
      contract_type: this.normalizeString(contract_type),
      latitude: this.toNullableNumber(latitude),
      longitude: this.toNullableNumber(longitude),
      amenities: this.mapAmenitiesToPayload(amenities),
      rules: this.normalizeRules(house_rules),
      photos: this.buildPhotoPayload(),
      furnished: formData.furnished,
      utilities_included: formData.utilities_included,
      internet_included: formData.internet_included
    } as Omit<CreateOfferData, 'user_id'>;
  }

  private mapAmenitiesToPayload(amenities: Record<string, boolean>): OfferAmenity[] {
    return Object.entries(amenities || {}).map(([key, value]) => ({
      key,
      available: value
    }));
  }

  private normalizeRules(rules: OfferHouseRules): OfferHouseRules {
    const normalized: OfferHouseRules = {};
    Object.entries(rules || {}).forEach(([key, value]) => {
      normalized[key] = value;
    });
    return normalized;
  }

  private buildPhotoPayload(): CreateOfferPhoto[] | null {
    if (!this.photoPreviews.length) {
      return null;
    }

    return this.photoPreviews.map((photo, index) => ({
      url: photo.preview,
      is_primary: index === 0
    }));
  }

  private normalizeString(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed: string = String(value).trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private toNumber(value: unknown): number {
    const parsed: number = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed: number = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
