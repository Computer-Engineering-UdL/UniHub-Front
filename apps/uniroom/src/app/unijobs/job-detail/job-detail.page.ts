import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ModalController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { LocalizationService } from '../../services/localization.service';
import NotificationService from '../../services/notification.service';
import { UniJobsService } from '../../services/unijobs.service';
import { JobOffer, JobType } from '../../models/unijobs.types';
import { ApplyJobDialogComponent } from '../apply-job-dialog/apply-job-dialog.component';
import { SharedModule } from '../../shared/shared-module';
import { JOB_TYPE_TRANSLATION_KEYS } from '../unijobs.constants';

@Component({
  selector: 'app-job-detail',
  templateUrl: './job-detail.page.html',
  styleUrls: ['./job-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule, SharedModule]
})
export class JobDetailPage implements OnInit, OnDestroy {
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly uniJobsService: UniJobsService = inject(UniJobsService);
  private readonly modalController: ModalController = inject(ModalController);
  private readonly translateService: TranslateService = inject(TranslateService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  protected readonly localizationService: LocalizationService = inject(LocalizationService);

  protected job?: JobOffer;
  protected loading: boolean = true;
  private routeSubscription?: Subscription;

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const id: string | null = params.get('id');
      if (id) {
        this.fetchJob(id);
      } else {
        this.router.navigateByUrl('/jobs');
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  protected async goBack(): Promise<void> {
    await this.router.navigateByUrl('/jobs');
  }

  protected formatSalary(): string {
    if (!this.job) {
      return '';
    }
    const { salaryMin, salaryMax, salaryPeriod } = this.job;
    if (!salaryMin && !salaryMax) {
      return this.translateService.instant('UNIJOBS.LIST.SALARY.NA');
    }
    const min: string | null = salaryMin ? this.localizationService.formatPrice(salaryMin) : null;
    const max: string | null = salaryMax ? this.localizationService.formatPrice(salaryMax) : null;
    const range: string = min && max ? `${min} - ${max}` : min || max || '';
    return `${range} / ${this.translateService.instant(`UNIJOBS.LIST.SALARY.PERIOD.${salaryPeriod}` as const)}`;
  }

  protected formatRelative(date: string): string {
    return this.localizationService.formatRelativeTime(date);
  }

  protected getInitials(name: string): string {
    return (name || '')
      .split(' ')
      .filter((part: string) => part.trim().length > 0)
      .map((part: string) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  protected jobTypeLabel(jobType: JobType): string {
    return JOB_TYPE_TRANSLATION_KEYS[jobType] ?? JOB_TYPE_TRANSLATION_KEYS.full_time;
  }

  protected async openApply(): Promise<void> {
    if (!this.job) {
      return;
    }
    const modal = await this.modalController.create({
      component: ApplyJobDialogComponent,
      componentProps: { jobTitle: this.job.title, companyName: this.job.companyName, jobId: this.job.id }
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.applied) {
      this.job = { ...this.job, isApplied: true };
    }
  }

  protected async toggleSave(): Promise<void> {
    if (!this.job) {
      return;
    }
    try {
      const isSaved: boolean = await firstValueFrom(this.uniJobsService.toggleSave(this.job.id));
      this.job = { ...this.job, isSaved };
    } catch {
      this.notificationService.error('UNIJOBS.ERROR.SAVE_FAILED');
    }
  }

  private fetchJob(id: string): void {
    this.loading = true;
    this.uniJobsService.getJobDetail(id).subscribe({
      next: (job: JobOffer) => {
        this.job = job;
      },
      error: () => {
        this.notificationService.error('UNIJOBS.ERROR.LOAD_JOB_DETAIL');
        this.router.navigateByUrl('/jobs');
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}
