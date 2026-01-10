import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import NotificationService from '../../services/notification.service';
import { UniJobsService } from '../../services/unijobs.service';
import { AuthService } from '../../services/auth.service';
import { JobApplicationPayload } from '../../models/unijobs.types';
import { SharedModule } from '../../shared/shared-module';
import { User } from '../../models/auth.types';

interface ApplyJobForm {
  fullName: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  coverLetter: FormControl<string>;
}

@Component({
  selector: 'app-apply-job-dialog',
  templateUrl: './apply-job-dialog.component.html',
  styleUrls: ['./apply-job-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, TranslateModule, SharedModule]
})
export class ApplyJobDialogComponent implements OnInit {
  @Input() jobTitle: string = '';
  @Input() companyName: string = '';
  @Input() jobId!: string;

  private readonly uniJobsService: UniJobsService = inject(UniJobsService);
  private readonly modalController: ModalController = inject(ModalController);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly translateService: TranslateService = inject(TranslateService);
  private readonly authService: AuthService = inject(AuthService);

  protected form: FormGroup<ApplyJobForm> = new FormGroup<ApplyJobForm>({
    fullName: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    phone: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    coverLetter: new FormControl<string>('', { nonNullable: true, validators: [Validators.maxLength(1000)] })
  });

  protected resumeFile: File | null = null;
  protected fileError: string | null = null;
  protected submitting: boolean = false;

  ngOnInit(): void {
    void this.loadUserData();
  }

  private async loadUserData(): Promise<void> {
    const user: User | null = this.authService.currentUser;
    if (!user) {
      return;
    }

    try {
      const fullUser: User = await this.authService.fetchUserById(user.id);
      this.form.patchValue({
        fullName: fullUser.fullName ?? fullUser.name ?? '',
        email: fullUser.email ?? '',
        phone: fullUser.phone ?? ''
      });
    } catch {
      this.form.patchValue({
        fullName: user.fullName ?? user.name ?? '',
        email: user.email ?? '',
        phone: user.phone ?? ''
      });
    }
  }

  protected dismiss(applied: boolean = false): void {
    this.modalController.dismiss({ applied });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file: File | undefined = input.files?.[0];
    if (!file) {
      this.resumeFile = null;
      this.fileError = null;
      return;
    }
    const allowedTypes: string[] = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const maxSizeBytes: number = 5 * 1024 * 1024;
    if (!allowedTypes.includes(file.type)) {
      this.fileError = this.translateService.instant('UNIJOBS.APPLY.FILE_TYPE_ERROR');
      this.resumeFile = null;
      return;
    }
    if (file.size > maxSizeBytes) {
      this.fileError = this.translateService.instant('UNIJOBS.APPLY.FILE_SIZE_ERROR');
      this.resumeFile = null;
      return;
    }
    this.fileError = null;
    this.resumeFile = file;
  }

  protected get coverLetterLength(): number {
    return this.form.controls.coverLetter.value?.length || 0;
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.resumeFile) {
      this.fileError = this.translateService.instant('UNIJOBS.APPLY.FILE_REQUIRED');
      return;
    }
    if (!this.jobId) {
      return;
    }
    this.submitting = true;
    const payload: JobApplicationPayload = {
      fullName: this.form.controls.fullName.value.trim(),
      email: this.form.controls.email.value.trim(),
      phone: this.form.controls.phone.value.trim(),
      coverLetter: this.form.controls.coverLetter.value.trim() || undefined,
      resumeFile: this.resumeFile
    };
    try {
      await firstValueFrom(this.uniJobsService.applyToJob(this.jobId, payload));
      this.notificationService.success('UNIJOBS.APPLY.SUBMIT_SUCCESS');
      this.dismiss(true);
    } catch {
      this.notificationService.error('UNIJOBS.APPLY.ERROR');
    } finally {
      this.submitting = false;
    }
  }
}
