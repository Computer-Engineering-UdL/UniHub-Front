import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { InfiniteScrollCustomEvent, ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { UniJob, UniJobsQuery, JobType } from '../../models/unijobs.types';
import { AuthService } from '../../services/auth.service';
import { LocalizationService } from '../../services/localization.service';
import NotificationService from '../../services/notification.service';
import { UniJobsService } from '../../services/unijobs.service';
import { ApplyJobDialogComponent } from '../apply-job-dialog/apply-job-dialog.component';

interface UniJobViewModel extends UniJob {
  salaryText: string;
  postedLabel: string;
  locationLabel: string;
}

@Component({
  selector: 'app-jobs-list',
  templateUrl: './jobs-list.page.html',
  styleUrls: ['./jobs-list.page.scss'],
  standalone: false
})
export class JobsListPage implements OnInit {
  private readonly uniJobsService: UniJobsService = inject(UniJobsService);
  private readonly localization: LocalizationService = inject(LocalizationService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly translate: TranslateService = inject(TranslateService);
  private readonly router: Router = inject(Router);
  private readonly modalController: ModalController = inject(ModalController);
  private readonly authService: AuthService = inject(AuthService);

  jobs: UniJobViewModel[] = [];
  total: number = 0;
  savedCount: number = 0;
  appliedCount: number = 0;
  loading: boolean = false;
  loadingMore: boolean = false;
  hasMore: boolean = false;
  showMobileFilters: boolean = false;

  private readonly pageSize: number = 10;

  query: UniJobsQuery = {
    page: 1,
    pageSize: this.pageSize
  };

  readonly jobTypeFilters: { value: JobType; labelKey: string }[] = [
    { value: 'full_time', labelKey: 'UNIJOBS.FILTERS.TYPE_FULL_TIME' },
    { value: 'part_time', labelKey: 'UNIJOBS.FILTERS.TYPE_PART_TIME' },
    { value: 'internship', labelKey: 'UNIJOBS.FILTERS.TYPE_INTERNSHIP' },
    { value: 'freelance', labelKey: 'UNIJOBS.FILTERS.TYPE_FREELANCE' }
  ];

  readonly categories: string[] = [
    'Technology',
    'Marketing',
    'Design',
    'Sales',
    'Finance',
    'Operations',
    'Customer Support',
    'Human Resources'
  ];

  readonly locations: string[] = ['Barcelona', 'Madrid', 'London', 'Berlin', 'Paris', 'Remote'];

  readonly tabs: { key: 'all' | 'saved' | 'applied'; labelKey: string }[] = [
    { key: 'all', labelKey: 'UNIJOBS.LIST.TABS.ALL' },
    { key: 'saved', labelKey: 'UNIJOBS.LIST.TABS.SAVED' },
    { key: 'applied', labelKey: 'UNIJOBS.LIST.TABS.APPLIED' }
  ];
  activeTab: 'all' | 'saved' | 'applied' = 'all';

  ngOnInit(): void {
    void this.loadJobs(true);
  }

  async loadJobs(reset: boolean = false, event?: InfiniteScrollCustomEvent): Promise<void> {
    if (this.loading || this.loadingMore) {
      event?.target.complete();
      return;
    }

    if (reset) {
      this.query.page = 1;
      this.jobs = [];
    }

    this.loading = reset;
    this.loadingMore = !reset;
    try {
      const response = await firstValueFrom(this.uniJobsService.getJobs(this.query));
      const mapped: UniJobViewModel[] = response.items.map((job: UniJob) => this.mapJob(job));
      this.jobs = reset ? mapped : [...this.jobs, ...mapped];
      this.total = response.total;
      this.hasMore = this.jobs.length < this.total;
      this.query.page += 1;
      this.savedCount = this.jobs.filter((j: UniJob) => j.isSaved).length;
      this.appliedCount = this.jobs.filter((j: UniJob) => j.isApplied).length;
    } catch {
      this.notificationService.error('UNIJOBS.LIST.ERROR');
    } finally {
      this.loading = false;
      this.loadingMore = false;
      event?.target.complete();
    }
  }

  private mapJob(job: UniJob): UniJobViewModel {
    return {
      ...job,
      salaryText: this.formatSalary(job),
      postedLabel: this.localization.formatRelativeTime(job.postedAt),
      locationLabel: this.formatLocation(job)
    };
  }

  formatLocation(job: UniJob): string {
    const city: string = job.locationCity;
    if (job.locationType === 'remote') {
      return this.translate.instant('UNIJOBS.LIST.REMOTE');
    }
    if (job.locationCountry) {
      return `${city}, ${job.locationCountry}`;
    }
    return city;
  }

  formatSalary(job: UniJob): string {
    const periodKey: string = job.salaryPeriod
      ? this.translate.instant(`UNIJOBS.SALARY_PERIOD.${job.salaryPeriod.toUpperCase()}`)
      : '';
    const currency: string = job.currency || 'EUR';

    if (job.minSalary && job.maxSalary) {
      return `${this.localization.formatPrice(job.minSalary, currency)} - ${this.localization.formatPrice(job.maxSalary, currency)}${periodKey ? `/${periodKey}` : ''}`;
    }
    if (job.minSalary) {
      return `${this.localization.formatPrice(job.minSalary, currency)}${periodKey ? `/${periodKey}` : ''}`;
    }
    if (job.maxSalary) {
      return `${this.localization.formatPrice(job.maxSalary, currency)}${periodKey ? `/${periodKey}` : ''}`;
    }
    return this.translate.instant('UNIJOBS.LIST.SALARY_COMPETITIVE');
  }

  toggleJobType(jobType: JobType): void {
    const types: JobType[] = this.query.jobTypes || [];
    if (types.includes(jobType)) {
      this.query.jobTypes = types.filter((t: JobType) => t !== jobType);
    } else {
      this.query.jobTypes = [...types, jobType];
    }
    void this.loadJobs(true);
  }

  toggleCategory(category: string): void {
    const categories: string[] = this.query.categories || [];
    if (categories.includes(category)) {
      this.query.categories = categories.filter((c: string) => c !== category);
    } else {
      this.query.categories = [...categories, category];
    }
    void this.loadJobs(true);
  }

  toggleLocation(location: string): void {
    const locations: string[] = this.query.locations || [];
    if (locations.includes(location)) {
      this.query.locations = locations.filter((l: string) => l !== location);
    } else {
      this.query.locations = [...locations, location];
    }
    void this.loadJobs(true);
  }

  onSearchChange(value: string): void {
    this.query.search = value;
    void this.loadJobs(true);
  }

  changeTab(tab: 'all' | 'saved' | 'applied'): void {
    this.activeTab = tab;
    this.query.savedOnly = tab === 'saved' ? true : undefined;
    this.query.appliedOnly = tab === 'applied' ? true : undefined;
    if (tab === 'all') {
      this.query.savedOnly = undefined;
      this.query.appliedOnly = undefined;
    }
    void this.loadJobs(true);
  }

  loadMore(event: InfiniteScrollCustomEvent): void {
    if (this.hasMore) {
      void this.loadJobs(false, event);
    } else {
      event.target.complete();
    }
  }

  toggleSave(job: UniJobViewModel, event?: Event): void {
    event?.stopPropagation();
    const currentState: boolean = job.isSaved;
    job.isSaved = !currentState;
    void firstValueFrom(this.uniJobsService.toggleSaveJob(job.id)).catch(() => {
      job.isSaved = currentState;
    });
  }

  openJob(job: UniJob): void {
    void this.router.navigate(['/jobs', job.id]);
  }

  openFilters(): void {
    this.showMobileFilters = true;
  }

  closeFilters(): void {
    this.showMobileFilters = false;
  }

  async openApplyModal(job: UniJobViewModel, event: Event): Promise<void> {
    event.stopPropagation();
    if (!this.authService.currentUser) {
      await this.router.navigate(['/login'], { queryParams: { redirectTo: `/jobs/${job.id}` } });
      return;
    }

    const modal = await this.modalController.create({
      component: ApplyJobDialogComponent,
      componentProps: { jobId: job.id, jobTitle: job.title }
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.applied) {
      job.isApplied = true;
      this.activeTab = 'all';
    }
  }
}
