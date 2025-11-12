import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import {
  CreateOfferData,
  FileMetadata,
  GenderPreference,
  Offer,
  OfferHouseRules,
  OfferStatus
} from '../../models/offer.types';
import { Subscription, firstValueFrom } from 'rxjs';
import { LocalizationService } from '../../services/localization.service';
import { User } from '../../models/auth.types';
import NotificationService from '../../services/notification.service';
import { TranslateService } from '@ngx-translate/core';
import { ADDITIONAL_AMENITIES, AMENITY_KEY_TO_CODE } from '../../models/amenities.constants';

interface SelectedPhotoPreview {
  file: File;
  preview: string;
  isPrimary: boolean;
}
class PhotoUploadException extends Error {
  constructor(message: string = 'PHOTO_UPLOAD_FAILED') {
    super(message);
    this.name = 'PhotoUploadException';
  }
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
  street: string;
  street_number: string;
  apartment: string | null;
  postal_code: string;
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

  readonly allowedPhotoMimeTypes: Set<string> = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]);
  readonly maxPhotoSizeBytes: number = 10 * 1024 * 1024;
  readonly maxPhotoSizeMB: number = 10;

  readonly additionalAmenities: Array<{ control: string; labelKey: string; defaultSelected: boolean }> =
    ADDITIONAL_AMENITIES.map((amenity) => ({
      control: amenity.key,
      labelKey: amenity.formLabelKey ?? amenity.labelKey,
      defaultSelected: amenity.defaultSelected ?? false
    }));

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

  private subscriptions: Subscription[] = [];

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
    this.subscriptions.forEach((subscription: Subscription) => subscription.unsubscribe());
    this.subscriptions = [];
  }

  private initializeForm(): void {
    const amenityControls: Record<string, [boolean]> = {};
    this.additionalAmenities.forEach((amenity) => {
      amenityControls[amenity.control] = [amenity.defaultSelected ?? false];
    });
    this.offerForm = this.formBuilder.group({
      category_id: ['', Validators.required],
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      price: [0, [Validators.required, Validators.min(0)]],
      area: [0, [Validators.required, Validators.min(0)]],
      offer_valid_until: ['', Validators.required],
      city: ['', [Validators.required, Validators.maxLength(50)]],
      address: ['', [Validators.required, Validators.maxLength(200)]],
      street: ['', [Validators.required, Validators.maxLength(120)]],
      street_number: ['', [Validators.required, Validators.maxLength(10)]],
      apartment: ['', [Validators.maxLength(50)]],
      postal_code: ['', [Validators.required, Validators.maxLength(15)]],
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
      amenities: this.formBuilder.group(amenityControls),
      house_rules: this.formBuilder.group({
        smoking: [false],
        pets: [false],
        couples: [false]
      })
    });

    this.endDateMin = this.todayISO;
    const startDateSub: Subscription | undefined = this.offerForm
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
    if (startDateSub) {
      this.subscriptions.push(startDateSub);
    }

    this.setupAddressSynchronization();
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
      } catch {
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
    } catch {
      return 'action-sheet';
    }
  }

  get selectInterfaceOptions(): Record<string, unknown> {
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
    this.photoUploadError = null;

    let uploadedFiles: FileMetadata[] = [];
    try {
      const user: User | null = await firstValueFrom(this.authService.currentUser$);
      if (!user) {
        this.notificationService.error('ERROR.NOT_AUTHENTICATED');
        this.isSubmitting = false;
        return;
      }

      uploadedFiles = await this.uploadSelectedPhotos();
      const photoIds: string[] | null = uploadedFiles.length
        ? uploadedFiles.map((file) => file.id)
        : null;

      const offerData: CreateOfferData = {
        ...this.buildOfferPayload(photoIds),
        user_id: user.id
      };

      const createdOffer: Offer = await firstValueFrom(this.apiService.post<Offer>('offers/', offerData));

      await this.modalController.dismiss(createdOffer, 'created');
    } catch (error) {
      console.error('Failed to create offer', error);
      if (error instanceof PhotoUploadException) {
        // Upload method already notified the user.
        return;
      }
      if (uploadedFiles.length) {
        await this.cleanupUploadedFiles(uploadedFiles.map((file) => file.id));
      }
      this.notificationService.error('ROOM.FORM.CREATE_ERROR');
    } finally {
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

    let errorKey: string | null = null;
    let errorParams: Record<string, unknown> = {};

    if (files.length > filesToProcess.length) {
      errorKey = 'ROOM.FORM.PHOTOS_LIMIT';
      errorParams = { max: this.maxPhotoCount };
    }

    const validFiles: File[] = filesToProcess.filter((file: File) => {
      if (!this.allowedPhotoMimeTypes.has(file.type)) {
        if (!errorKey) {
          errorKey = 'ROOM.FORM.PHOTO_TYPE_NOT_ALLOWED';
        }
        return false;
      }
      if (file.size > this.maxPhotoSizeBytes) {
        errorKey = 'ROOM.FORM.PHOTO_SIZE_EXCEEDED';
        errorParams = { maxSize: this.maxPhotoSizeMB };
        return false;
      }
      return true;
    });

    this.photoUploadError = errorKey ? this.translateService.instant(errorKey, errorParams) : null;

    validFiles.forEach((file: File) => {
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
    this.photoPreviews = this.photoPreviews
      .filter((_, i) => i !== index)
      .map((photo, idx) => ({
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
      ...this.photoPreviews.filter((_, i) => i !== index).map((photo, idx) => ({ ...photo, isPrimary: idx === 0 }))
    ];
    this.photoPreviews = newOrder.map((photo, idx) => ({ ...photo, isPrimary: idx === 0 }));
  }

  private buildOfferPayload(photoIds: string[] | null): Omit<CreateOfferData, 'user_id'> {
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
      street,
      street_number,
      apartment,
      postal_code,
      ...formData
    } = this.offerForm.getRawValue() as OfferFormValue;

    const address: string = this.composeFullAddress({
      street,
      street_number,
      apartment,
      postal_code,
      city: formData.city
    });

    return {
      ...formData,
      address,
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
      photo_ids: photoIds && photoIds.length ? photoIds : null,
      furnished: formData.furnished,
      utilities_included: formData.utilities_included,
      internet_included: formData.internet_included
    } as Omit<CreateOfferData, 'user_id'>;
  }

  private mapAmenitiesToPayload(amenities: Record<string, boolean>): number[] | null {
    const selectedCodes: number[] = Object.entries(amenities || {})
      .filter(([, value]) => value)
      .map(([key]) => AMENITY_KEY_TO_CODE[key.toLowerCase()])
      .filter((code): code is number => code !== undefined);

    if (selectedCodes.length === 0) {
      return null;
    }

    return [...new Set(selectedCodes)].sort((a, b) => a - b);
  }

  private normalizeRules(rules: OfferHouseRules): OfferHouseRules {
    const normalized: OfferHouseRules = {};
    Object.entries(rules || {}).forEach(([key, value]) => {
      normalized[key] = value;
    });
    return normalized;
  }

  private setupAddressSynchronization(): void {
    const controls: string[] = ['street', 'street_number', 'apartment', 'postal_code', 'city'];
    controls.forEach((controlName: string) => {
      const control: AbstractControl | null = this.offerForm.get(controlName);
      if (!control) {
        return;
      }
      const subscription: Subscription = control.valueChanges.subscribe(() => {
        this.updateAddressValue();
      });
      this.subscriptions.push(subscription);
    });

    this.updateAddressValue();
  }

  private updateAddressValue(): void {
    const rawValue = this.offerForm.getRawValue() as OfferFormValue;
    const address: string = this.composeFullAddress({
      street: rawValue.street,
      street_number: rawValue.street_number,
      apartment: rawValue.apartment,
      postal_code: rawValue.postal_code,
      city: rawValue.city
    });

    const addressControl: AbstractControl | null = this.offerForm.get('address');
    if (addressControl && addressControl.value !== address) {
      addressControl.setValue(address, { emitEvent: false });
      addressControl.updateValueAndValidity({ emitEvent: false });
    }
  }

  private composeFullAddress({
    street,
    street_number,
    apartment,
    postal_code,
    city
  }: {
    street: string;
    street_number: string;
    apartment: string | null;
    postal_code: string;
    city: string;
  }): string {
    const normalizedStreet: string | null = this.normalizeString(street);
    const normalizedNumber: string | null = this.normalizeString(street_number);
    const normalizedApartment: string | null = this.normalizeString(apartment);
    const normalizedPostal: string | null = this.normalizeString(postal_code);
    const normalizedCity: string | null = this.normalizeString(city);

    const line1Parts: string[] = [];
    if (normalizedStreet) {
      line1Parts.push(normalizedStreet);
    }
    if (normalizedNumber) {
      line1Parts.push(normalizedNumber);
    }
    const line1: string | null = line1Parts.length ? line1Parts.join(' ') : null;

    const line2Parts: string[] = [];
    if (normalizedApartment) {
      line2Parts.push(normalizedApartment);
    }
    const localityParts: string[] = [];
    if (normalizedPostal) {
      localityParts.push(normalizedPostal);
    }
    if (normalizedCity) {
      localityParts.push(normalizedCity);
    }
    if (localityParts.length) {
      line2Parts.push(localityParts.join(' '));
    }

    const parts: string[] = [];
    if (line1) {
      parts.push(line1);
    }
    if (line2Parts.length) {
      parts.push(line2Parts.join(', '));
    }

    return parts.join(', ');
  }

  private async uploadSelectedPhotos(): Promise<FileMetadata[]> {
    if (!this.photoPreviews.length) {
      return [];
    }

    const uploadedFiles: FileMetadata[] = [];

    try {
      for (const photo of this.photoPreviews) {
        const formData: FormData = new FormData();
        formData.append('file', photo.file);
        formData.append('is_public', 'true');

        const response: FileMetadata = await firstValueFrom(
          this.apiService.post<FileMetadata>('files/', formData)
        );
        uploadedFiles.push(response);
      }

      return uploadedFiles;
    } catch (error) {
      console.error('Failed to upload photo:', error);
      const uploadedIds: string[] = uploadedFiles.map((file) => file.id);
      if (uploadedIds.length) {
        await this.cleanupUploadedFiles(uploadedIds);
      }
      this.notificationService.error('ROOM.FORM.PHOTO_UPLOAD_FAILED');
      throw new PhotoUploadException();
    }
  }

  private async cleanupUploadedFiles(fileIds: string[]): Promise<void> {
    const cleanupTasks: Promise<void>[] = fileIds.map(async (fileId: string) => {
      try {
        await firstValueFrom(this.apiService.delete(`files/${fileId}`));
      } catch (cleanupError) {
        console.warn('Failed to clean up uploaded file', cleanupError);
      }
    });

    await Promise.all(cleanupTasks);
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
