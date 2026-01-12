import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonicModule, ModalController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { LocalizationService } from '../../services/localization.service';
import NotificationService from '../../services/notification.service';
import { UniJobsService } from '../../services/unijobs.service';
import { JobOffer, JobType, JobWorkplace } from '../../models/unijobs.types';
import { ApplyJobDialogComponent } from '../apply-job-dialog/apply-job-dialog.component';
import { SharedModule } from '../../shared/shared-module';
import { JOB_CREATOR_ROLES, JOB_TYPE_TRANSLATION_KEYS } from '../unijobs.constants';
import { JobAvatarService } from '../../services/job-avatar.service';
import { AuthService } from '../../services/auth.service';
import { Role, User } from '../../models/auth.types';
import { ReportContext, ReportModalComponent } from '../../shared/reports/report-modal.component';
import { ReportCategory, ReportReason } from '../../models/report.types';
import { ReportService } from '../../services/report.service';
import { resolveFileUrl } from '../../utils/file-url.util';

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
  private readonly alertController: AlertController = inject(AlertController);
  private readonly jobAvatarService: JobAvatarService = inject(JobAvatarService);
  private readonly authService: AuthService = inject(AuthService);
  private readonly reportService: ReportService = inject(ReportService);

  protected job?: JobOffer;
  protected loading: boolean = true;
  protected canManage: boolean = false;
  protected canViewApplications: boolean = false;
  private routeSubscription?: Subscription;
  private readonly requestedAvatars: Set<string> = new Set<string>();

  ngOnInit(): void {
    const role: Role | undefined = this.authService.currentUser?.role;
    this.canManage = role ? JOB_CREATOR_ROLES.includes(role) : false;
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
    const relative: string = this.localizationService.formatRelativeTime(date);
    return relative === '—' ? this.localizationService.formatDate(date) : relative;
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
    if (!this.job || this.job.isApplied) {
      return;
    }
    const modal = await this.modalController.create({
      component: ApplyJobDialogComponent,
      componentProps: { jobTitle: this.job.title, companyName: this.job.companyName, jobId: this.job.id }
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.applied) {
      this.job = { ...this.job, isApplied: true, applicationCount: (this.job.applicationCount ?? 0) + 1 };
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

  protected workplaceLabel(type: JobWorkplace | undefined): string {
    if (!type) {
      return '';
    }
    return `UNIJOBS.CREATE.WORKPLACE.${type.toUpperCase()}`;
  }

  protected jobLogo(job: JobOffer | undefined): string | null {
    if (!job) {
      return null;
    }
    if (job.logoUrl) {
      return resolveFileUrl(job.logoUrl);
    }
    if (job.creatorAvatarUrl) {
      return resolveFileUrl(job.creatorAvatarUrl);
    }
    if (job.creatorId && !this.requestedAvatars.has(job.creatorId)) {
      this.requestedAvatars.add(job.creatorId);
      void this.loadCreatorAvatar(job.creatorId);
    }
    return null;
  }

  protected async confirmDelete(): Promise<void> {
    if (!this.job || !this.canManage) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translateService.instant('UNIJOBS.DETAIL.DELETE_TITLE'),
      message: this.translateService.instant('UNIJOBS.DETAIL.DELETE_CONFIRM'),
      buttons: [
        {
          text: this.translateService.instant('COMMON.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translateService.instant('UNIJOBS.DETAIL.DELETE_ACTION'),
          role: 'destructive',
          handler: () => {
            void this.deleteJob();
          }
        }
      ]
    });

    await alert.present();
  }

  protected async editJob(): Promise<void> {
    if (!this.job || !this.canManage) {
      return;
    }
    await this.router.navigate(['/jobs', 'edit', this.job.id]);
  }

  protected async viewApplications(): Promise<void> {
    if (!this.job || !this.canViewApplications) {
      return;
    }
    await this.router.navigate(['/jobs', this.job.id, 'applications']);
  }

  private fetchJob(id: string): void {
    this.loading = true;
    this.uniJobsService.getJobDetail(id).subscribe({
      next: (job: JobOffer) => {
        this.job = job;
        this.updatePermissions();
        if (job.creatorId && !job.creatorAvatarUrl) {
          void this.loadCreatorAvatar(job.creatorId);
        }
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

  private updatePermissions(): void {
    const currentUser: User | null = this.authService.currentUser;
    if (!currentUser || !this.job) {
      this.canViewApplications = false;
      return;
    }
    const isAdmin: boolean = currentUser.role === 'Admin';
    const isCreator: boolean = this.job.creatorId === currentUser.id;
    this.canViewApplications = isAdmin || isCreator;
  }

  private async loadCreatorAvatar(userId: string): Promise<void> {
    const avatarUrl: string | null = await this.jobAvatarService.getAvatarForUser(userId);
    if (avatarUrl && this.job) {
      this.job = { ...this.job, creatorAvatarUrl: avatarUrl };
    }
  }

  private async deleteJob(): Promise<void> {
    if (!this.job) {
      return;
    }
    try {
      await firstValueFrom(this.uniJobsService.deleteJob(this.job.id));
      this.notificationService.success('UNIJOBS.DETAIL.DELETE_SUCCESS');
      await this.router.navigate(['/jobs'], { state: { refreshJobs: true } });
    } catch {
      this.notificationService.error('UNIJOBS.ERROR.DELETE_JOB');
    }
  }

  protected async reportJob(): Promise<void> {
    if (!this.job) {
      return;
    }

    if (!this.authService.currentUser) {
      this.notificationService.error('AUTH.REQUIRED');
      await this.router.navigate(['/login']);
      return;
    }

    if (this.canManage) {
      this.notificationService.error('REPORT.CANNOT_REPORT_YOURSELF');
      return;
    }

    const context: ReportContext = {
      contentType: ReportCategory.SERVICES,
      contentId: this.job.id,
      contentTitle: this.job.title,
      reportedUserId: this.job.creatorId,
      allowedReasons: [
        ReportReason.SCAM_FRAUD,
        ReportReason.FAKE_LISTING,
        ReportReason.INAPPROPRIATE_CONTENT,
        ReportReason.SPAM,
        ReportReason.OTHER
      ]
    };

    const modal = await this.modalController.create({
      component: ReportModalComponent,
      componentProps: { context }
    });

    await modal.present();
    const { data, role } = await modal.onDidDismiss();

    if (role === 'submit' && data) {
      try {
        await firstValueFrom(
          this.reportService.createReport({
            contentType: ReportCategory.SERVICES,
            contentId: this.job.id,
            reportedUserId: this.job.creatorId,
            reason: data.reason,
            description: data.description,
            contentTitle: this.job.title
          })
        );
        this.notificationService.success('REPORT.SUCCESS');
      } catch {
        this.notificationService.error('REPORT.ERROR');
      }
    }
  }
}
