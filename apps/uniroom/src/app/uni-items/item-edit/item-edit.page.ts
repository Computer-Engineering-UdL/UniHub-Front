import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import NotificationService from '../../services/notification.service';
import { UniItem } from '../../models/uni-item.types';
import { UniItemsService } from '../../services/uni-items.service';
import { ApiService } from '../../services/api.service';
import { LocalizationService } from '../../services/localization.service';
import { FileMetadata } from '../../models/offer.types';
import { resolveFileUrl } from '../../utils/file-url.util';

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

  form!: FormGroup;
  loading: boolean = false;
  isEditMode: boolean = false;
  itemId: string | null = null;

  photoPreviews: SelectedPhotoPreview[] = [];
  photoUploadError: string | null = null;
  readonly maxPhotoCount: number = 5;
  readonly allowedPhotoMimeTypes: Set<string> = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
  readonly maxPhotoSizeBytes: number = 10 * 1024 * 1024;
  readonly maxPhotoSizeMB: number = 10;

  readonly categories: string[] = ['Furniture', 'Books', 'Electronics', 'Clothing', 'Other'];
  readonly conditions: { value: UniItem['condition']; labelKey: string }[] = [
    { value: 'new', labelKey: 'UNI_ITEMS.CONDITION_LABELS.new' },
    { value: 'like_new', labelKey: 'UNI_ITEMS.CONDITION_LABELS.like_new' },
    { value: 'good', labelKey: 'UNI_ITEMS.CONDITION_LABELS.good' },
    { value: 'used', labelKey: 'UNI_ITEMS.CONDITION_LABELS.used' },
    { value: 'for_parts', labelKey: 'UNI_ITEMS.CONDITION_LABELS.for_parts' }
  ];

  currencies: Array<{ value: string; label: string }> = [];

  get canAddMorePhotos(): boolean {
    return this.photoPreviews.length < this.maxPhotoCount;
  }

  ngOnInit(): void {
    this.currencies = this.localizationService.getSupportedCurrencies();

    this.form = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      category: ['', Validators.required],
      condition: ['good', Validators.required],
      price: [null, [Validators.required, Validators.min(0)]],
      currency: ['EUR', Validators.required],
      location: ['', Validators.required]
    });

    this.itemId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.itemId;

    if (this.isEditMode && this.itemId) {
      void this.loadItem(this.itemId);
    }
  }

  async loadItem(id: string): Promise<void> {
    this.loading = true;
    try {
      const item: UniItem = await firstValueFrom(this.uniItemsService.getItemById(id));
      if (item.ownerId && this.authService.currentUser?.id !== item.ownerId) {
        await this.router.navigate(['/items']);
        return;
      }

      this.form.patchValue({
        title: item.title,
        description: item.description,
        category: item.category,
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
      this.photoUploadError = `Máximo ${this.maxPhotoCount} fotos`;
      hasError = true;
    }

    const validFiles: File[] = filesToProcess.filter((file: File) => {
      if (!this.allowedPhotoMimeTypes.has(file.type)) {
        if (!hasError) {
          this.photoUploadError = 'Tipo de archivo no permitido';
          hasError = true;
        }
        return false;
      }
      if (file.size > this.maxPhotoSizeBytes) {
        this.photoUploadError = `Tamaño máximo ${this.maxPhotoSizeMB}MB`;
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
      ...this.photoPreviews.filter((_: SelectedPhotoPreview, i: number) => i !== index).map((photo: SelectedPhotoPreview) => ({ ...photo, isPrimary: false }))
    ];
    this.photoPreviews = newOrder.map((photo: SelectedPhotoPreview, idx: number) => ({ ...photo, isPrimary: idx === 0 }));
  }

  private async uploadSelectedPhotos(): Promise<string[]> {
    if (!this.photoPreviews.length) {
      return [];
    }

    const uploadedUrls: string[] = [];
    const uploadedFileIds: string[] = [];

    try {
      for (const photo of this.photoPreviews) {
        const formData: FormData = new FormData();
        formData.append('file', photo.file);
        formData.append('is_public', 'true');

        const response: FileMetadata = await firstValueFrom(this.apiService.post<FileMetadata>('files/', formData));
        uploadedFileIds.push(response.id);

        const url: string | null = response.public_url ? resolveFileUrl(response.public_url) : '';
        if (url) {
          uploadedUrls.push(url);
        }
      }

      return uploadedUrls;
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
      } catch {
      }
    });

    await Promise.all(cleanupTasks);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.photoPreviews.length === 0 && !this.isEditMode) {
      this.photoUploadError = 'Debe añadir al menos una foto';
      this.notificationService.error('UNI_ITEMS.FORM.PHOTO_REQUIRED');
      return;
    }

    this.loading = true;

    try {
      const imageUrls: string[] = await this.uploadSelectedPhotos();

      const payload: Partial<UniItem> = {
        ...this.form.value,
        images: imageUrls
      } as Partial<UniItem>;

      if (this.isEditMode && this.itemId) {
        const updated: UniItem = await firstValueFrom(this.uniItemsService.updateItem(this.itemId, payload));
        this.notificationService.success('UNI_ITEMS.FORM.SUCCESS_EDIT');
        await this.router.navigate(['/items', updated.id]);
      } else {
        const created: UniItem = await firstValueFrom(this.uniItemsService.createItem(payload));
        this.notificationService.success('UNI_ITEMS.FORM.SUCCESS_CREATE');
        await this.router.navigate(['/items', created.id]);
      }
    } catch (error) {
      if (error instanceof PhotoUploadException) {
        return;
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
