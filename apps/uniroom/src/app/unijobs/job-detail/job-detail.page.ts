import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { UniJob } from '../../models/unijobs.types';
import { AuthService } from '../../services/auth.service';
import { LocalizationService } from '../../services/localization.service';
import NotificationService from '../../services/notification.service';
import { UniJobsService } from '../../services/unijobs.service';
import { ApplyJobDialogComponent } from '../apply-job-dialog/apply-job-dialog.component';

@Component({
  selector: 'app-job-detail',
  templateUrl: './job-detail.page.html',
  styleUrls: ['./job-detail.page.scss'],
  standalone: false
})
export class JobDetailPage implements OnInit {
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly uniJobsService: UniJobsService = inject(UniJobsService);
  private readonly localization: LocalizationService = inject(LocalizationService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly modalController: ModalController = inject(ModalController);
  private readonly translate: TranslateService = inject(TranslateService);
  private readonly authService: AuthService = inject(AuthService);

  job: UniJob | null = null;
  loading: boolean = false;

  get postedLabel(): string {
    return this.job ? this.localization.formatRelativeTime(this.job.postedAt) : '';
  }

  ngOnInit(): void {
    const jobId: string | null = this.route.snapshot.paramMap.get('id');
    if (jobId) {
      void this.loadJob(jobId);
    }
  }

  async loadJob(jobId: string): Promise<void> {
    this.loading = true;
    try {
      this.job = await firstValueFrom(this.uniJobsService.getJobById(jobId));
    } catch {
      this.notificationService.error('UNIJOBS.DETAIL.ERROR');
    } finally {
      this.loading = false;
    }
  }

  formatSalary(): string {
    if (!this.job) {
      return '';
    }
    const currency: string = this.job.currency || 'EUR';
    const periodKey: string = this.job.salaryPeriod
      ? this.translate.instant(`UNIJOBS.SALARY_PERIOD.${this.job.salaryPeriod.toUpperCase()}`)
      : '';

    if (this.job.minSalary && this.job.maxSalary) {
      return `${this.localization.formatPrice(this.job.minSalary, currency)} - ${this.localization.formatPrice(this.job.maxSalary, currency)}${periodKey ? `/${periodKey}` : ''}`;
    }
    if (this.job.minSalary) {
      return `${this.localization.formatPrice(this.job.minSalary, currency)}${periodKey ? `/${periodKey}` : ''}`;
    }
    if (this.job.maxSalary) {
      return `${this.localization.formatPrice(this.job.maxSalary, currency)}${periodKey ? `/${periodKey}` : ''}`;
    }
    return this.translate.instant('UNIJOBS.LIST.SALARY_COMPETITIVE');
  }

  async toggleSave(): Promise<void> {
    if (!this.job) {
      return;
    }
    const original: boolean = this.job.isSaved;
    this.job.isSaved = !original;
    try {
      await firstValueFrom(this.uniJobsService.toggleSaveJob(this.job.id));
    } catch {
      this.job.isSaved = original;
      this.notificationService.error('UNIJOBS.LIST.ERROR');
    }
  }

  async apply(): Promise<void> {
    if (!this.job) {
      return;
    }
    if (!this.authService.currentUser) {
      await this.router.navigate(['/login'], { queryParams: { redirectTo: `/jobs/${this.job.id}` } });
      return;
    }

    const modal = await this.modalController.create({
      component: ApplyJobDialogComponent,
      componentProps: { jobId: this.job.id, jobTitle: this.job.title }
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.applied) {
      this.job.isApplied = true;
    }
  }

  formatLocation(): string {
    if (!this.job) {
      return '';
    }
    if (this.job.locationType === 'remote') {
      return this.translate.instant('UNIJOBS.LIST.REMOTE');
    }
    if (this.job.locationCountry) {
      return `${this.job.locationCity}, ${this.job.locationCountry}`;
    }
    return this.job.locationCity;
  }

  getRequirementIcon(): string {
    return 'checkmark-circle-outline';
  }
}
