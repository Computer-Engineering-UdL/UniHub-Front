import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { SharedModule } from '../../shared/shared-module';
import { JobCategory, JobOfferCreate, JobSalaryPeriod, JobType, JobWorkplace } from '../../models/unijobs.types';
import NotificationService from '../../services/notification.service';
import { UniJobsService } from '../../services/unijobs.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/auth.types';

interface CreateJobForm {
  title: FormControl<string>;
  description: FormControl<string>;
  category: FormControl<JobCategory | null>;
  jobType: FormControl<JobType | null>;
  workplaceType: FormControl<JobWorkplace | null>;
  location: FormControl<string>;
  salaryPeriod: FormControl<JobSalaryPeriod | null>;
  salaryMin: FormControl<number | null>;
  salaryMax: FormControl<number | null>;
  companyName: FormControl<string>;
  companyDescription: FormControl<string>;
  companyWebsite: FormControl<string>;
  companyEmployeeCount: FormControl<string>;
  fileIds: FormControl<string>;
}

@Component({
  selector: 'app-create-job',
  templateUrl: './create-job.page.html',
  styleUrls: ['./create-job.page.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, TranslateModule, SharedModule]
})
export class CreateJobPage implements OnInit, OnDestroy {
  protected form!: FormGroup<CreateJobForm>;
  protected submitting: boolean = false;

  protected readonly categories: JobCategory[] = [
    'Technology',
    'Marketing',
    'Design',
    'Sales',
    'Finance',
    'Human Resources',
    'Customer Service',
    'Engineering',
    'Education',
    'Healthcare',
    'Other'
  ];

  protected readonly jobTypes: Array<{ value: JobType; label: string }> = [
    { value: 'full_time', label: 'UNIJOBS.FILTERS.JOB_TYPE.FULL_TIME' },
    { value: 'part_time', label: 'UNIJOBS.FILTERS.JOB_TYPE.PART_TIME' },
    { value: 'internship', label: 'UNIJOBS.FILTERS.JOB_TYPE.INTERNSHIP' },
    { value: 'freelance', label: 'UNIJOBS.FILTERS.JOB_TYPE.FREELANCE' }
  ];

  protected readonly workplaces: Array<{ value: JobWorkplace; label: string }> = [
    { value: 'on_site', label: 'UNIJOBS.CREATE.WORKPLACE.ON_SITE' },
    { value: 'hybrid', label: 'UNIJOBS.CREATE.WORKPLACE.HYBRID' },
    { value: 'remote', label: 'UNIJOBS.CREATE.WORKPLACE.REMOTE' }
  ];

  protected readonly salaryPeriods: Array<{ value: JobSalaryPeriod; label: string }> = [
    { value: 'year', label: 'UNIJOBS.LIST.SALARY.PERIOD.year' },
    { value: 'month', label: 'UNIJOBS.LIST.SALARY.PERIOD.month' },
    { value: 'hour', label: 'UNIJOBS.LIST.SALARY.PERIOD.hour' }
  ];

  protected readonly locations: string[] = [
    'Barcelona',
    'Lleida',
    'Balaguer',
    'Les Borges Blanques',
    'Torrefarrera',
    'Mollerussa',
    'Tremp',
    'Fraga'
  ];

  private readonly formBuilder: FormBuilder = inject(FormBuilder);
  private readonly uniJobsService: UniJobsService = inject(UniJobsService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly router: Router = inject(Router);
  private readonly authService: AuthService = inject(AuthService);
  private userSubscription?: Subscription;

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser$.subscribe((user: User | null) => {
      if (user?.role !== 'Admin') {
        void this.router.navigateByUrl('/unauthorized');
      }
    });
    this.buildForm();
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  protected async submit(): Promise<void> {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();
    const salaryMin: number | null = formValue.salaryMin !== null ? Number(formValue.salaryMin) : null;
    const salaryMax: number | null = formValue.salaryMax !== null ? Number(formValue.salaryMax) : null;

    if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
      this.notificationService.error('UNIJOBS.ERROR.SALARY_RANGE');
      return;
    }

    const payload: JobOfferCreate = {
      title: formValue.title.trim(),
      description: formValue.description.trim(),
      category: formValue.category!,
      jobType: formValue.jobType!,
      workplaceType: formValue.workplaceType ?? undefined,
      location: formValue.location.trim(),
      salaryPeriod: formValue.salaryPeriod!,
      salaryMin: salaryMin ?? undefined,
      salaryMax: salaryMax ?? undefined,
      companyName: formValue.companyName.trim(),
      companyDescription: formValue.companyDescription?.trim() || undefined,
      companyWebsite: formValue.companyWebsite?.trim() || undefined,
      companyEmployeeCount: formValue.companyEmployeeCount?.trim() || undefined,
      fileIds: this.parseFileIds(formValue.fileIds)
    };

    this.submitting = true;
    try {
      await firstValueFrom(this.uniJobsService.createJob(payload));
      this.notificationService.success('UNIJOBS.SUCCESS.CREATED');
      await this.router.navigateByUrl('/jobs');
    } catch {
      this.notificationService.error('UNIJOBS.ERROR.CREATE_FAILED');
    } finally {
      this.submitting = false;
    }
  }

  protected async cancel(): Promise<void> {
    await this.router.navigateByUrl('/jobs');
  }

  private buildForm(): void {
    this.form = this.formBuilder.group<CreateJobForm>({
      title: this.formBuilder.control('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(120)]
      }),
      description: this.formBuilder.control('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(20), Validators.maxLength(2000)]
      }),
      category: this.formBuilder.control<JobCategory | null>(null, { validators: [Validators.required] }),
      jobType: this.formBuilder.control<JobType | null>(null, { validators: [Validators.required] }),
      workplaceType: this.formBuilder.control<JobWorkplace | null>(null),
      location: this.formBuilder.control('', { nonNullable: true, validators: [Validators.required] }),
      salaryPeriod: this.formBuilder.control<JobSalaryPeriod | null>(null, { validators: [Validators.required] }),
      salaryMin: this.formBuilder.control<number | null>(null, { validators: [Validators.min(0)] }),
      salaryMax: this.formBuilder.control<number | null>(null, { validators: [Validators.min(0)] }),
      companyName: this.formBuilder.control('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(120)]
      }),
      companyDescription: this.formBuilder.control('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
      companyWebsite: this.formBuilder.control('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
      companyEmployeeCount: this.formBuilder.control('', { nonNullable: true, validators: [Validators.maxLength(50)] }),
      fileIds: this.formBuilder.control('', { nonNullable: true })
    });
  }

  private parseFileIds(fileIdsRaw: string): string[] | undefined {
    const ids: string[] = fileIdsRaw
      .split(',')
      .map((id: string) => id.trim())
      .filter((id: string) => id.length > 0);
    return ids.length ? ids : undefined;
  }
}
