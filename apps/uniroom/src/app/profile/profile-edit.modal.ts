import { Component, Input, OnInit, inject } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { DEFAULT_USER_URL, FacultyUpdate, User } from '../models/auth.types';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../services/api.service';
import { FileMetadata } from '../models/offer.types';
import { firstValueFrom } from 'rxjs';
import NotificationService from '../services/notification.service';
import { resolveFileUrl } from '../utils/file-url.util';
import { SharedModule } from '../shared/shared-module';

interface PhotoPreview {
  file: File;
  preview: string;
}

interface Faculty {
  id: string;
  name: string;
}

interface University {
  id: string;
  name: string;
  faculties: Faculty[];
}

@Component({
  selector: 'app-profile-edit-modal',
  templateUrl: './profile-edit.modal.html',
  styleUrls: ['./profile-edit.modal.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, TranslateModule, SharedModule]
})
export class ProfileEditModal implements OnInit {
  @Input() user!: User;

  saving: boolean = false;
  avatarSrc: string = DEFAULT_USER_URL;
  photoPreview: PhotoPreview | null = null;
  photoUploadError: string | null = null;

  universities: University[] = [];
  filteredFaculties: Faculty[] = [];
  selectedUniversityId: string | null = null;
  selectedFacultyId: string | null = null;
  loadingUniversities: boolean = false;

  readonly allowedPhotoMimeTypes: Set<string> = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
  readonly maxPhotoSizeBytes: number = 5 * 1024 * 1024;
  readonly maxPhotoSizeMB: number = 5;

  private readonly modalCtrl: ModalController = inject(ModalController);
  private readonly auth: AuthService = inject(AuthService);
  private readonly apiService: ApiService = inject(ApiService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly translateService: TranslateService = inject(TranslateService);

  ngOnInit(): void {
    if (!this.user) {
      return;
    }
    this.avatarSrc = this.computeAvatarSrc();
    this.selectedFacultyId = this.user.faculty_id ?? null;
    void this.loadUniversitiesAndFaculties();
  }

  private async loadUniversitiesAndFaculties(): Promise<void> {
    this.loadingUniversities = true;

    try {
      const universitiesResponse: University[] = await firstValueFrom(
        this.apiService.get<University[]>('universities')
      );

      this.universities = universitiesResponse || [];

      if (this.selectedFacultyId) {
        for (const university of this.universities) {
          const faculty = university.faculties.find((f) => f.id === this.selectedFacultyId);
          if (faculty) {
            this.selectedUniversityId = university.id;
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
    this.selectedUniversityId = universityId;
    this.selectedFacultyId = null;
    this.filterFacultiesByUniversity(universityId);
  }

  onFacultyChange(facultyId: string): void {
    this.selectedFacultyId = facultyId;
  }

  private filterFacultiesByUniversity(universityId: string | null): void {
    if (!universityId) {
      this.filteredFaculties = [];
      return;
    }
    const university = this.universities.find((u) => u.id === universityId);
    this.filteredFaculties = university?.faculties || [];
  }

  onPhotoSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files: FileList | null = target?.files;

    if (!files || files.length === 0) {
      return;
    }

    const file: File = files[0];

    if (!this.allowedPhotoMimeTypes.has(file.type)) {
      this.photoUploadError = this.translateService.instant('PROFILE.PHOTO_TYPE_NOT_ALLOWED');
      this.notificationService.error('PROFILE.PHOTO_TYPE_NOT_ALLOWED');
      return;
    }

    if (file.size > this.maxPhotoSizeBytes) {
      this.photoUploadError = this.translateService.instant('PROFILE.PHOTO_SIZE_EXCEEDED', {
        maxSize: this.maxPhotoSizeMB
      });
      this.notificationService.error('PROFILE.PHOTO_SIZE_EXCEEDED');
      return;
    }

    this.photoUploadError = null;

    const reader: FileReader = new FileReader();
    reader.onload = (): void => {
      const preview: string = typeof reader.result === 'string' ? reader.result : '';
      if (preview) {
        this.photoPreview = { file, preview };
        this.avatarSrc = preview;
      }
    };
    reader.readAsDataURL(file);

    if (target) {
      target.value = '';
    }
  }

  removePhoto(): void {
    this.photoPreview = null;
    this.avatarSrc = this.computeAvatarSrc();
    this.photoUploadError = null;
  }

  onImgUrlInput(value: string): void {
    if (!this.user) {
      return;
    }
    this.user.imgUrl = value;
    if (!this.photoPreview) {
      this.avatarSrc = this.computeAvatarSrc();
    }
  }

  onNameInput(): void {
    if (!this.user) {
      return;
    }
    if (!this.user.imgUrl && !this.photoPreview) {
      this.avatarSrc = this.computeAvatarSrc();
    }
  }

  computeAvatarSrc(): string {
    if (this.user?.imgUrl) {
      return this.user.imgUrl;
    }
    if (this.user?.avatar_url) {
      return this.user.avatar_url;
    }
    const first: string = this.user?.firstName?.trim() || '';
    const last: string = this.user?.lastName?.trim() || '';
    const name: string =
      first || last
        ? encodeURIComponent((first + ' ' + last).trim())
        : encodeURIComponent(this.user?.username || 'user');
    return `https://avatar.iran.liara.run/username?username=${name}`;
  }

  onAvatarError(): void {
    this.avatarSrc = DEFAULT_USER_URL;
  }

  private async uploadPhoto(): Promise<string | null> {
    if (!this.photoPreview) {
      return null;
    }

    try {
      const formData: FormData = new FormData();
      formData.append('file', this.photoPreview.file);
      formData.append('is_public', 'true');

      const response: FileMetadata = await firstValueFrom(this.apiService.post<FileMetadata>('files/', formData));

      const publicUrl: string | null = response.public_url ? resolveFileUrl(response.public_url) : null;

      if (publicUrl && this.user) {
        await this.associatePhotoWithUser(response.id, this.user.id);
      }

      return publicUrl;
    } catch (error) {
      this.notificationService.error('PROFILE.PHOTO_UPLOAD_FAILED');
      throw error;
    }
  }

  private async associatePhotoWithUser(fileId: string, userId: string): Promise<void> {
    const association = {
      file_id: fileId,
      entity_type: 'user',
      entity_id: userId,
      order: 0,
      is_primary: true,
      category: 'profile_photo'
    };

    await firstValueFrom(this.apiService.post('file-associations/', association));
  }

  async save(): Promise<void> {
    if (!this.user) {
      return;
    }
    this.saving = true;
    this.photoUploadError = null;

    try {
      let uploadedPhotoUrl: string | null = null;

      if (this.photoPreview) {
        uploadedPhotoUrl = await this.uploadPhoto();
      }

      // Depending on the endpoint this is used or not, I know this is a crap but not my fault
      const faculty: FacultyUpdate = {
        id: this.selectedFacultyId || '',
        name: '',
        university: {
          id: this.selectedUniversityId || '',
          name: ''
        },
        address: ''
      };

      const payload: Partial<User> = {
        firstName: this.user.firstName,
        lastName: this.user.lastName,
        phone: this.user.phone,
        faculty_id: this.selectedFacultyId || undefined,
        faculty: faculty,
        yearOfStudy: this.user.yearOfStudy
      };

      if (uploadedPhotoUrl) {
        payload.imgUrl = uploadedPhotoUrl;
      } else if (!this.photoPreview) {
        payload.imgUrl = this.user.imgUrl;
      }

      const updatedUser: User = await this.auth.updateCurrentUser(payload);
      await this.modalCtrl.dismiss({ saved: true, user: updatedUser });
    } finally {
      this.saving = false;
    }
  }

  async cancel(): Promise<void> {
    await this.modalCtrl.dismiss({ saved: false });
  }
}
