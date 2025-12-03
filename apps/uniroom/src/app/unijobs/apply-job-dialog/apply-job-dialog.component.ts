import { Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import NotificationService from '../../services/notification.service';
import { UniJobsService } from '../../services/unijobs.service';

interface ApplyFormGroup {
  fullName: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  coverLetter: FormControl<string>;
}

@Component({
  selector: 'app-apply-job-dialog',
  templateUrl: './apply-job-dialog.component.html',
  styleUrls: ['./apply-job-dialog.component.scss'],
  standalone: false
})
export class ApplyJobDialogComponent implements OnInit {
  @Input() jobId!: string;
  @Input() jobTitle?: string;

  private readonly fb: FormBuilder = inject(FormBuilder);
  private readonly modalController: ModalController = inject(ModalController);
  private readonly uniJobsService: UniJobsService = inject(UniJobsService);
  private readonly authService: AuthService = inject(AuthService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly translate: TranslateService = inject(TranslateService);

  form!: FormGroup<ApplyFormGroup>;
  resumeFile: File | null = null;
  fileError: string | null = null;
  readonly maxFileSize: number = 5 * 1024 * 1024;
  readonly acceptedTypes: string[] = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  submitting: boolean = false;

  ngOnInit(): void {
    const user = this.authService.currentUser;
    this.form = this.fb.group<ApplyFormGroup>({
      fullName: this.fb.control(user?.fullName ?? '', {
        validators: [Validators.required, Validators.minLength(3)],
        nonNullable: true
      }),
      email: this.fb.control(user?.email ?? '', {
        validators: [Validators.required, Validators.email],
        nonNullable: true
      }),
      phone: this.fb.control(user?.phone ?? '', {
        validators: [Validators.required, Validators.minLength(6)],
        nonNullable: true
      }),
      coverLetter: this.fb.control('', {
        validators: [Validators.maxLength(1000)],
        nonNullable: true
      })
    });
  }

  dismiss(applied: boolean = false): void {
    void this.modalController.dismiss({ applied });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file: File | undefined = input.files?.[0];
    this.fileError = null;

    if (!file) {
      this.resumeFile = null;
      return;
    }

    if (!this.acceptedTypes.includes(file.type)) {
      this.fileError = this.translate.instant('UNIJOBS.APPLY.FILE_TYPE_ERROR');
      this.resumeFile = null;
      return;
    }

    if (file.size > this.maxFileSize) {
      this.fileError = this.translate.instant('UNIJOBS.APPLY.FILE_SIZE_ERROR');
      this.resumeFile = null;
      return;
    }

    this.resumeFile = file;
  }

  async submit(): Promise<void> {
    if (this.form.invalid || !this.jobId) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;

    try {
      const { fullName, email, phone, coverLetter } = this.form.getRawValue();
      await firstValueFrom(
        this.uniJobsService.applyToJob(this.jobId, {
          fullName,
          email,
          phone,
          coverLetter,
          resumeFile: this.resumeFile || undefined
        })
      );
      this.notificationService.success('UNIJOBS.APPLY.SUBMIT_SUCCESS');
      this.dismiss(true);
    } catch {
      this.notificationService.error('UNIJOBS.APPLY.ERROR');
    } finally {
      this.submitting = false;
    }
  }

  get coverLetterCount(): number {
    return this.form.controls.coverLetter.value.length;
  }
}
