import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { JobCategory, JobOfferCreate, JobSalaryPeriod, JobType, JobWorkplace } from '../../models/unijobs.types';
import { LocalizationService } from '../../services/localization.service';
import NotificationService from '../../services/notification.service';
import { UniJobsService } from '../../services/unijobs.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/auth.types';
import { SharedModule } from '../../shared/shared-module';

interface CreateJobForm {
  title: FormControl<string>;
  description: FormControl<string>;
  category: FormControl<JobCategory | null>;
  jobType: FormControl<JobType | null>;
  workplaceType: FormControl<JobWorkplace>;
  location: FormControl<string>;
  salaryPeriod: FormControl<JobSalaryPeriod>;
  salaryMin: FormControl<number | null>;
  salaryMax: FormControl<number | null>;
  companyName: FormControl<string>;
  companyDescription: FormControl<string>;
  companyWebsite: FormControl<string>;
  companyEmployeeCount: FormControl<string>;
}

type WizardStepId = 'basic' | 'details' | 'company' | 'review';

interface WizardStep {
  id: WizardStepId;
  titleKey: string;
  descriptionKey: string;
  controlPaths?: string[];
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

  protected wizardSteps: WizardStep[] = [];
  protected currentStepIndex: number = 0;
  protected furthestStepIndex: number = 0;

  private readonly formBuilder: FormBuilder = inject(FormBuilder);
  private readonly uniJobsService: UniJobsService = inject(UniJobsService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly router: Router = inject(Router);
  private readonly authService: AuthService = inject(AuthService);
  private readonly localizationService: LocalizationService = inject(LocalizationService);
  private userSubscription?: Subscription;

  ngOnInit(): void {
    this.buildForm();
    this.configureWizardSteps();
    this.userSubscription = this.authService.currentUser$.subscribe((user: User | null) => {
      if (!user || user.role !== 'Admin') {
        this.notificationService.error('UNIJOBS.CREATE.ERROR_UNAUTHORIZED');
        void this.router.navigateByUrl('/jobs');
        return;
      }
      if (!user.isVerified) {
        this.notificationService.error('UNIJOBS.CREATE.ERROR_VERIFICATION_REQUIRED');
        void this.router.navigateByUrl('/jobs');
      }
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  protected get currentStep(): WizardStep {
    return this.wizardSteps[this.currentStepIndex] ?? this.wizardSteps[0];
  }

  protected get previousStep(): WizardStep | null {
    if (this.currentStepIndex === 0) {
      return null;
    }
    return this.wizardSteps[this.currentStepIndex - 1] ?? null;
  }

  protected get nextStep(): WizardStep | null {
    if (this.currentStepIndex >= this.wizardSteps.length - 1) {
      return null;
    }
    return this.wizardSteps[this.currentStepIndex + 1] ?? null;
  }

  protected get isLastStep(): boolean {
    return this.currentStepIndex >= this.wizardSteps.length - 1;
  }

  protected get progressValue(): number {
    if (!this.wizardSteps.length) {
      return 0;
    }
    return ((this.currentStepIndex + 1) / this.wizardSteps.length) * 100;
  }

  protected goToStep(index: number): void {
    if (index < 0 || index > this.furthestStepIndex || index >= this.wizardSteps.length) {
      return;
    }
    this.currentStepIndex = index;
  }

  protected next(): void {
    if (this.isLastStep) {
      void this.submit();
      return;
    }
    if (!this.validateStep(this.currentStep)) {
      return;
    }
    this.currentStepIndex = Math.min(this.currentStepIndex + 1, this.wizardSteps.length - 1);
    this.furthestStepIndex = Math.max(this.furthestStepIndex, this.currentStepIndex);
    this.scrollToTop();
  }

  protected previous(): void {
    if (this.currentStepIndex === 0) {
      return;
    }
    this.currentStepIndex = Math.max(this.currentStepIndex - 1, 0);
    this.scrollToTop();
  }

  protected isControlInvalid(controlPath: string): boolean {
    const control: AbstractControl | null = this.getControl(controlPath);
    return !!(control && control.invalid && control.touched);
  }

  protected getErrorKey(controlPath: string): string | null {
    const control: AbstractControl | null = this.getControl(controlPath);
    if (!control) {
      return null;
    }

    if (control.hasError('required')) {
      return 'UNIJOBS.CREATE.ERRORS.REQUIRED';
    }
    if (control.hasError('maxlength')) {
      return 'UNIJOBS.CREATE.ERRORS.MAX_LENGTH';
    }
    if (control.hasError('minlength')) {
      return 'UNIJOBS.CREATE.ERRORS.MIN_LENGTH';
    }
    if (control.hasError('min')) {
      return 'UNIJOBS.CREATE.ERRORS.MIN_VALUE';
    }
    if (control.hasError('invalidUrl')) {
      return 'UNIJOBS.CREATE.ERRORS.INVALID_URL';
    }
    if (control.hasError('salaryRange')) {
      return 'UNIJOBS.CREATE.ERRORS.SALARY_RANGE';
    }

    return null;
  }

  protected formatSalary(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '—';
    }
    return this.localizationService.formatPrice(value);
  }

  protected formatCategory(category: JobCategory | null): string {
    return category ? `UNIJOBS.CATEGORIES.${category}` : '—';
  }

  protected formatJobType(jobType: JobType | null): string {
    return jobType ? `UNIJOBS.FILTERS.JOB_TYPE.${jobType.toUpperCase()}` : '—';
  }

  protected formatWorkplace(workplace: JobWorkplace | null): string {
    if (!workplace) {
      return 'UNIJOBS.CREATE.WORKPLACE.ON_SITE';
    }
    const match = this.workplaces.find((item) => item.value === workplace);
    return match ? match.label : 'UNIJOBS.CREATE.WORKPLACE.ON_SITE';
  }

  protected async submit(): Promise<void> {
    if (this.submitting) {
      return;
    }

    this.form.markAllAsTouched();
    this.form.updateValueAndValidity({ onlySelf: false });

    const firstInvalidStep: number = this.findFirstInvalidStepIndex();
    if (firstInvalidStep >= 0) {
      this.currentStepIndex = firstInvalidStep;
      this.furthestStepIndex = Math.max(this.furthestStepIndex, firstInvalidStep);
      this.scrollToFirstError();
      this.notificationService.error('UNIJOBS.CREATE.ERROR_GLOBAL');
      return;
    }

    const payload: JobOfferCreate = this.buildPayload();
    this.submitting = true;

    try {
      await firstValueFrom(this.uniJobsService.createJob(payload));
      this.notificationService.success('UNIJOBS.CREATE.SUCCESS');
      await this.router.navigateByUrl('/jobs');
    } catch {
      this.notificationService.error('UNIJOBS.CREATE.ERROR_GENERIC');
    } finally {
      this.submitting = false;
    }
  }

  protected cancel(): void {
    void this.router.navigateByUrl('/jobs');
  }

  private configureWizardSteps(): void {
    this.wizardSteps = [
      {
        id: 'basic',
        titleKey: 'UNIJOBS.CREATE.STEPS.BASIC',
        descriptionKey: 'UNIJOBS.CREATE.STEPS.BASIC_DESC',
        controlPaths: ['title', 'companyName', 'category', 'jobType', 'workplaceType', 'location']
      },
      {
        id: 'details',
        titleKey: 'UNIJOBS.CREATE.STEPS.DETAILS',
        descriptionKey: 'UNIJOBS.CREATE.STEPS.DETAILS_DESC',
        controlPaths: ['description', 'salaryPeriod', 'salaryMin', 'salaryMax']
      },
      {
        id: 'company',
        titleKey: 'UNIJOBS.CREATE.STEPS.COMPANY',
        descriptionKey: 'UNIJOBS.CREATE.STEPS.COMPANY_DESC',
        controlPaths: ['companyDescription', 'companyWebsite', 'companyEmployeeCount']
      },
      {
        id: 'review',
        titleKey: 'UNIJOBS.CREATE.STEPS.REVIEW',
        descriptionKey: 'UNIJOBS.CREATE.STEPS.REVIEW_DESC'
      }
    ];
    this.currentStepIndex = 0;
    this.furthestStepIndex = 0;
  }

  private buildForm(): void {
    this.form = this.formBuilder.group<CreateJobForm>(
      {
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
        workplaceType: this.formBuilder.control<JobWorkplace>('on_site', { nonNullable: true }),
        location: this.formBuilder.control('', {
          nonNullable: true,
          validators: [Validators.required]
        }),
        salaryPeriod: this.formBuilder.control<JobSalaryPeriod>('year', {
          nonNullable: true,
          validators: [Validators.required]
        }),
        salaryMin: this.formBuilder.control<number | null>(null, { validators: [Validators.min(0)] }),
        salaryMax: this.formBuilder.control<number | null>(null, { validators: [Validators.min(0)] }),
        companyName: this.formBuilder.control('', {
          nonNullable: true,
          validators: [Validators.required, Validators.maxLength(120)]
        }),
        companyDescription: this.formBuilder.control('', {
          nonNullable: true,
          validators: [Validators.maxLength(1000)]
        }),
        companyWebsite: this.formBuilder.control('', {
          nonNullable: true,
          validators: [Validators.maxLength(200), this.urlValidator]
        }),
        companyEmployeeCount: this.formBuilder.control('', {
          nonNullable: true,
          validators: [Validators.maxLength(50)]
        })
      },
      { validators: [this.salaryRangeValidator.bind(this)] }
    );
  }

  private getControl(path: string): AbstractControl | null {
    return this.form.get(path);
  }

  private validateStep(step: WizardStep): boolean {
    const controls: AbstractControl[] = this.getStepControls(step);
    if (!controls.length) {
      return true;
    }

    let valid: boolean = true;
    controls.forEach((control: AbstractControl) => {
      control.markAsTouched();
      control.updateValueAndValidity();
      if (control.invalid) {
        valid = false;
      }
    });

    if (!valid) {
      this.scrollToFirstError();
    }

    return valid;
  }

  private findFirstInvalidStepIndex(): number {
    return this.wizardSteps.findIndex((step: WizardStep) => !this.isStepValid(step));
  }

  private isStepValid(step: WizardStep): boolean {
    const controls: AbstractControl[] = this.getStepControls(step);
    if (!controls.length) {
      return true;
    }
    return controls.every((control: AbstractControl) => control.valid);
  }

  private getStepControls(step: WizardStep): AbstractControl[] {
    if (!step.controlPaths?.length) {
      return [];
    }
    return step.controlPaths
      .map((path: string) => this.getControl(path))
      .filter((control: AbstractControl | null): control is AbstractControl => control !== null);
  }

  private salaryRangeValidator(group: FormGroup): ValidationErrors | null {
    const minControl: AbstractControl | null = group.get('salaryMin');
    const maxControl: AbstractControl | null = group.get('salaryMax');
    const minValue: number | null = this.toNumber(minControl?.value);
    const maxValue: number | null = this.toNumber(maxControl?.value);

    if (minValue !== null && maxValue !== null && minValue > maxValue) {
      minControl?.setErrors({ ...(minControl.errors ?? {}), salaryRange: true });
      maxControl?.setErrors({ ...(maxControl.errors ?? {}), salaryRange: true });
      return { salaryRange: true };
    }

    if (minControl?.hasError('salaryRange')) {
      const errors: ValidationErrors = { ...(minControl.errors ?? {}) };
      delete errors['salaryRange'];
      minControl.setErrors(Object.keys(errors).length ? errors : null);
    }
    if (maxControl?.hasError('salaryRange')) {
      const errors: ValidationErrors = { ...(maxControl.errors ?? {}) };
      delete errors['salaryRange'];
      maxControl.setErrors(Object.keys(errors).length ? errors : null);
    }

    return null;
  }

  private urlValidator(control: AbstractControl): ValidationErrors | null {
    const value: string = (control.value ?? '').trim();
    if (!value) {
      return null;
    }
    const pattern: RegExp = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/[^\s]*)?$/i;
    return pattern.test(value) ? null : { invalidUrl: true };
  }

  private buildPayload(): JobOfferCreate {
    const value = this.form.getRawValue();
    const salaryMin: number | undefined = this.toNumber(value.salaryMin) ?? undefined;
    const salaryMax: number | undefined = this.toNumber(value.salaryMax) ?? undefined;

    return {
      title: value.title.trim(),
      description: value.description.trim(),
      category: value.category!,
      jobType: value.jobType!,
      workplaceType: value.workplaceType ?? undefined,
      location: value.location.trim(),
      salaryPeriod: value.salaryPeriod ?? 'year',
      salaryMin,
      salaryMax,
      companyName: value.companyName.trim(),
      companyDescription: value.companyDescription.trim() || undefined,
      companyWebsite: value.companyWebsite.trim() || undefined,
      companyEmployeeCount: value.companyEmployeeCount.trim() || undefined,
      fileIds: []
    };
  }

  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed: number = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private scrollToTop(): void {
    try {
      const content: Element | null = document.querySelector('.create-job-page ion-content');
      content?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // ignore scrolling errors
    }
  }

  private scrollToFirstError(): void {
    setTimeout(() => {
      const firstError: Element | null = document.querySelector(
        '.wizard-panel .item-has-error, .wizard-panel .ion-invalid'
      );
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  }
}
