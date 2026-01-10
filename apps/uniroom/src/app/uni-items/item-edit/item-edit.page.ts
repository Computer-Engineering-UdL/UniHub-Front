import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ModalController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import NotificationService from '../../services/notification.service';
import {
  ItemCategory,
  ItemCondition,
  ItemCreateRequest,
  ItemRead,
  ItemUpdateRequest
} from '../../models/uni-item.types';
import { UniItemsService } from '../../services/uni-items.service';
import { ApiService } from '../../services/api.service';
import { LocalizationService } from '../../services/localization.service';
import { FileMetadata } from '../../models/offer.types';
import { LocationPickerComponent } from '../../shared/location-picker/location-picker.component';
import { LocationResult } from '../../services/google-places.service';

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

@Component({
  selector: 'app-item-edit',
  templateUrl: './item-edit.page.html',
  styleUrls: ['./item-edit.page.scss'],
  standalone: false
})
export class ItemEditPage implements OnInit {
  private readonly fb: FormBuilder = inject(FormBuilder);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly uniItemsService: UniItemsService = inject(UniItemsService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly authService: AuthService = inject(AuthService);
  private readonly apiService: ApiService = inject(ApiService);
  private readonly localizationService: LocalizationService = inject(LocalizationService);
  private readonly modalController: ModalController = inject(ModalController);

  form!: FormGroup;
  loading: boolean = false;
  isEditMode: boolean = false;
  itemId: string | null = null;

  photoPreviews: SelectedPhotoPreview[] = [];
  photoUploadError: string | null = null;
  readonly maxPhotoCount: number = 5;
  readonly allowedPhotoMimeTypes: Set<string> = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
  readonly maxPhotoSizeBytes: number = 10 * 1024 * 1024;

  categories: ItemCategory[] = [];
  readonly conditions: { value: ItemCondition; labelKey: string }[] = [
    { value: 'New', labelKey: 'UNI_ITEMS.CONDITION_LABELS.NEW' },
    { value: 'Like New', labelKey: 'UNI_ITEMS.CONDITION_LABELS.LIKE_NEW' },
    { value: 'Good', labelKey: 'UNI_ITEMS.CONDITION_LABELS.GOOD' },
    { value: 'Fair', labelKey: 'UNI_ITEMS.CONDITION_LABELS.FAIR' },
    { value: 'Poor', labelKey: 'UNI_ITEMS.CONDITION_LABELS.POOR' }
  ];

  currencies: Array<{ value: string; label: string }> = [];

  fieldErrors: Record<string, string> = {};

  get canAddMorePhotos(): boolean {
    return this.photoPreviews.length < this.maxPhotoCount;
  }

  ngOnInit(): void {
    this.currencies = this.localizationService.getSupportedCurrencies();

    this.form = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      category: ['', Validators.required],
      condition: ['Good', Validators.required],
      price: [null, [Validators.required, Validators.min(0)]],
      currency: ['EUR', Validators.required],
      location: ['', Validators.required]
    });

    this.itemId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.itemId;

    void this.initializeData();
  }

  private async initializeData(): Promise<void> {
    await this.loadCategories();

    if (this.isEditMode && this.itemId) {
      await this.loadItem(this.itemId);
    }
  }

  async loadCategories(): Promise<void> {
    try {
      this.categories = await firstValueFrom(this.uniItemsService.getCategories());
    } catch {
      this.notificationService.error('UNI_ITEMS.FORM.ERROR_LOAD_CATEGORIES');
    }
  }

  async openLocationPicker(): Promise<void> {
    const modal: HTMLIonModalElement = await this.modalController.create({
      component: LocationPickerComponent,
      cssClass: 'location-picker-modal'
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss<LocationResult>();

    if (role === 'confirm' && data) {
      this.form.patchValue({
        location: data.address
      });
    }
  }

  get isAdmin(): boolean {
    return this.authService.currentUser?.role == 'Admin';
  }

  async loadItem(id: string): Promise<void> {
    this.loading = true;
    try {
      const item: ItemRead = await firstValueFrom(this.uniItemsService.getItemDetail(id));
      if (item.owner_details?.id && this.authService.currentUser?.id !== item.owner_details.id && !this.isAdmin) {
        await this.router.navigate(['/items']);
        return;
      }

      const category: ItemCategory | undefined = this.categories.find(
        (cat: ItemCategory) => cat.id === item.category?.id
      );

      this.form.patchValue({
        title: item.title,
        description: item.description,
        category: category?.id || '',
        condition: item.condition,
        price: item.price,
        currency: item.currency,
        location: item.location
      });

      this.photoPreviews = [];
    } catch {
      this.notificationService.error('UNI_ITEMS.FORM.ERROR_LOAD');
    } finally {
      this.loading = false;
    }
  }

  onPhotosSelected(event: Event): void {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    const files: FileList | null = target?.files;
    if (!files || files.length === 0) {
      return;
    }

    const availableSlots: number = this.maxPhotoCount - this.photoPreviews.length;
    const filesToProcess: File[] = Array.from(files).slice(0, Math.max(availableSlots, 0));

    let hasError: boolean = false;

    if (files.length > filesToProcess.length) {
      this.photoUploadError = 'UNI_ITEMS.FORM.PHOTO_LIMIT';
      hasError = true;
    }

    const validFiles: File[] = filesToProcess.filter((file: File) => {
      if (!this.allowedPhotoMimeTypes.has(file.type)) {
        if (!hasError) {
          this.photoUploadError = 'UNI_ITEMS.FORM.PHOTO_TYPE_ERROR';
          hasError = true;
        }
        return false;
      }
      if (file.size > this.maxPhotoSizeBytes) {
        this.photoUploadError = 'UNI_ITEMS.FORM.PHOTO_SIZE_ERROR';
        hasError = true;
        return false;
      }
      return true;
    });

    if (!hasError) {
      this.photoUploadError = null;
    }

    validFiles.forEach((file: File) => {
      const reader: FileReader = new FileReader();
      reader.onload = (): void => {
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
      .filter((_: SelectedPhotoPreview, i: number) => i !== index)
      .map((photo: SelectedPhotoPreview, idx: number) => ({
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
        .filter((_: SelectedPhotoPreview, i: number) => i !== index)
        .map((photo: SelectedPhotoPreview) => ({ ...photo, isPrimary: false }))
    ];
    this.photoPreviews = newOrder.map((photo: SelectedPhotoPreview, idx: number) => ({
      ...photo,
      isPrimary: idx === 0
    }));
  }

  private async uploadSelectedPhotos(): Promise<string[]> {
    if (!this.photoPreviews.length) {
      return [];
    }

    const uploadedFileIds: string[] = [];

    try {
      for (const photo of this.photoPreviews) {
        const formData: FormData = new FormData();
        formData.append('file', photo.file);
        formData.append('is_public', 'true');

        const response: FileMetadata = await firstValueFrom(this.apiService.post<FileMetadata>('files/', formData));
        uploadedFileIds.push(response.id);
      }

      return uploadedFileIds;
    } catch {
      if (uploadedFileIds.length) {
        await this.cleanupUploadedFiles(uploadedFileIds);
      }
      this.notificationService.error('UNI_ITEMS.FORM.PHOTO_UPLOAD_FAILED');
      throw new PhotoUploadException();
    }
  }

  private async cleanupUploadedFiles(fileIds: string[]): Promise<void> {
    const cleanupTasks: Promise<void>[] = fileIds.map(async (fileId: string) => {
      try {
        await firstValueFrom(this.apiService.delete(`files/${fileId}`));
      } catch {}
    });

    await Promise.all(cleanupTasks);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notificationService.error('UNI_ITEMS.FORM.VALIDATION_ERROR');
      return;
    }

    this.loading = true;
    this.fieldErrors = {};

    try {
      if (!this.authService.currentUser) {
        this.notificationService.error('UNI_ITEMS.AUTH.REQUIRED');
        await this.router.navigate(['/login']);
        return;
      }

      const formValue: {
        title: string;
        description: string;
        category: string;
        condition: ItemCondition;
        price: number;
        currency: string;
        location: string;
      } = this.form.value;

      const selectedCategory: ItemCategory | undefined = this.categories.find(
        (cat: ItemCategory) => cat.id === formValue.category
      );

      if (!selectedCategory) {
        this.notificationService.error('UNI_ITEMS.FORM.INVALID_CATEGORY');
        return;
      }

      const fileIds: string[] = await this.uploadSelectedPhotos();

      const basePayload: ItemUpdateRequest = {
        title: formValue.title,
        description: formValue.description || '',
        condition: formValue.condition,
        price: Number(formValue.price),
        currency: formValue.currency,
        location: formValue.location,
        category_id: selectedCategory.id
      };

      if (this.isEditMode && this.itemId) {
        const payload: ItemUpdateRequest = { ...basePayload };
        if (fileIds.length) {
          payload.file_ids = fileIds;
        }
        const updated: ItemRead = await firstValueFrom(this.uniItemsService.updateItem(this.itemId, payload));
        this.notificationService.success('UNI_ITEMS.FORM.SUCCESS_EDIT');
        await this.router.navigate(['/items', updated.id], {
          queryParams: { refresh: Date.now() },
          replaceUrl: false
        });
      } else {
        const payload: ItemCreateRequest = {
          ...(basePayload as ItemCreateRequest),
          file_ids: fileIds
        };
        const created: ItemRead = await firstValueFrom(this.uniItemsService.createItem(payload));
        this.notificationService.success('UNI_ITEMS.FORM.SUCCESS_CREATE');
        await this.router.navigate(['/items', created.id]);
      }
    } catch (error: any) {
      if (error instanceof PhotoUploadException) {
        return;
      }

      if (error?.error?.detail && Array.isArray(error.error.detail)) {
        for (const err of error.error.detail) {
          const fieldName: string = err.loc?.[1];
          if (fieldName) {
            const mappedField: string = fieldName === 'category_id' ? 'category' : fieldName;
            this.fieldErrors[mappedField] = err.msg;
          }
        }
      }

      this.notificationService.error('UNI_ITEMS.FORM.ERROR_SAVE');
    } finally {
      this.loading = false;
    }
  }

  cancel(): void {
    void this.router.navigate(['/items']);
  }
}
