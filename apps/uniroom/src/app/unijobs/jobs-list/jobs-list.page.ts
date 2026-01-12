import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, NavController } from '@ionic/angular';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { LocalizationService } from '../../services/localization.service';
import NotificationService from '../../services/notification.service';
import { UniJobsService } from '../../services/unijobs.service';
import { JobOffer, JobCategory, JobType, JobsQuery, JobWorkplace } from '../../models/unijobs.types';
import { ApplyJobDialogComponent } from '../apply-job-dialog/apply-job-dialog.component';
import { SharedModule } from '../../shared/shared-module';
import { AuthService } from '../../services/auth.service';
import { Role, User } from '../../models/auth.types';
import { JOB_CREATOR_ROLES, JOB_TYPE_TRANSLATION_KEYS } from '../unijobs.constants';
import { JobAvatarService } from '../../services/job-avatar.service';
import { resolveFileUrl } from '../../utils/file-url.util';

type JobTabKey = 'all' | 'saved' | 'applied';
interface JobTab {
  key: JobTabKey;
  label: string;
}

@Component({
  selector: 'app-jobs-list',
  templateUrl: './jobs-list.page.html',
  styleUrls: ['./jobs-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule, SharedModule]
})
export class JobsListPage implements OnInit, OnDestroy {
  private readonly uniJobsService: UniJobsService = inject(UniJobsService);
  private readonly modalController: ModalController = inject(ModalController);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly translateService: TranslateService = inject(TranslateService);
  protected readonly localizationService: LocalizationService = inject(LocalizationService);
  private readonly navController: NavController = inject(NavController);
  private readonly authService: AuthService = inject(AuthService);
  private readonly jobAvatarService: JobAvatarService = inject(JobAvatarService);
  private readonly router: Router = inject(Router);

  protected jobs: JobOffer[] = [];
  protected loading: boolean = true;
  protected searchTerm: string = '';
  protected selectedCategory?: JobCategory;
  protected selectedJobTypes: Set<JobType> = new Set<JobType>();
  protected selectedLocations: Set<string> = new Set<string>();
  protected currentTab: JobTabKey = 'all';
  protected savedCount: number = 0;
  protected appliedCount: number = 0;
  protected showMobileFilters: boolean = false;
  protected canCreate: boolean = false;
  protected isAuthenticated: boolean = false;

  Array = Array;

  protected readonly tabs: JobTab[] = [
    { key: 'all', label: 'UNIJOBS.LIST.TABS.ALL' },
    { key: 'saved', label: 'UNIJOBS.LIST.TABS.SAVED' },
    { key: 'applied', label: 'UNIJOBS.LIST.TABS.APPLIED' }
  ];

  protected readonly jobTypes: Array<{ value: JobType; label: string }> = [
    { value: 'full_time', label: 'UNIJOBS.FILTERS.JOB_TYPE.FULL_TIME' },
    { value: 'part_time', label: 'UNIJOBS.FILTERS.JOB_TYPE.PART_TIME' },
    { value: 'internship', label: 'UNIJOBS.FILTERS.JOB_TYPE.INTERNSHIP' },
    { value: 'freelance', label: 'UNIJOBS.FILTERS.JOB_TYPE.FREELANCE' }
  ];

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

  private userSubscription?: Subscription;
  private jobCreatedSubscription?: Subscription;
  private readonly creatorAvatarCache: Map<string, string | null> = new Map<string, string | null>();

  ngOnInit(): void {
    this.authService.isAuthenticated().then((auth) => (this.isAuthenticated = auth));
    this.userSubscription = this.authService.currentUser$.subscribe((user: User | null) => {
      const role: Role | undefined = user?.role;
      this.canCreate = role ? JOB_CREATOR_ROLES.includes(role) : false;
      this.isAuthenticated = !!user;
    });
    const navigation = this.router.getCurrentNavigation();
    const shouldRefresh: boolean = Boolean(navigation?.extras.state?.['refreshJobs']);
    const pendingCreatedJob: JobOffer | undefined = this.uniJobsService.consumeLastCreatedJob();
    if (pendingCreatedJob || shouldRefresh) {
      this.loadJobs();
    }
    this.loadTab('all');
    this.loadBadges();
    this.jobCreatedSubscription = this.uniJobsService.jobCreated$.subscribe(() => {
      this.loadJobs();
      this.loadBadges();
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.jobCreatedSubscription?.unsubscribe();
  }

  protected async openApplications(): Promise<void> {
    await this.navController.navigateForward('/jobs/applications');
  }

  protected async openJob(job: JobOffer): Promise<void> {
    await this.navController.navigateForward(['/jobs', job.id]);
  }

  protected async openCreate(): Promise<void> {
    await this.navController.navigateForward('/jobs/create');
  }

  protected changeTab(tab: JobTabKey): void {
    if (this.currentTab === tab) {
      return;
    }
    this.currentTab = tab;
    this.loadJobs();
  }

  protected onSearchChange(event: CustomEvent): void {
    this.searchTerm = (event.detail.value || '').toString();
    this.loadJobs();
  }

  protected toggleJobType(type: JobType): void {
    if (this.selectedJobTypes.has(type)) {
      this.selectedJobTypes.delete(type);
    } else {
      this.selectedJobTypes.add(type);
    }
    this.loadJobs();
  }

  protected selectCategory(category?: JobCategory): void {
    this.selectedCategory = this.selectedCategory === category ? undefined : category;
    this.loadJobs();
  }

  protected toggleLocation(location: string): void {
    if (this.selectedLocations.has(location)) {
      this.selectedLocations.delete(location);
    } else {
      this.selectedLocations.add(location);
    }
    this.loadJobs();
  }

  protected onLocationsChange(locations: string[] | undefined): void {
    this.selectedLocations = new Set<string>(locations ?? []);
    this.loadJobs();
  }

  protected clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = undefined;
    this.selectedJobTypes.clear();
    this.selectedLocations.clear();
    this.showMobileFilters = false;
    this.loadJobs();
  }

  protected async openApply(job: JobOffer): Promise<void> {
    if (job.isApplied) {
      return;
    }
    const modal = await this.modalController.create({
      component: ApplyJobDialogComponent,
      componentProps: { jobTitle: job.title, companyName: job.companyName, jobId: job.id }
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.applied && !job.isApplied) {
      this.jobs = this.jobs.map((j: JobOffer) =>
        j.id === job.id ? { ...j, isApplied: true, applicationCount: (j.applicationCount ?? 0) + 1 } : j
      );
      this.appliedCount = Math.max(0, this.appliedCount + 1);
    }
  }

  protected async toggleSave(job: JobOffer): Promise<void> {
    try {
      const isSaved: boolean = await firstValueFrom(this.uniJobsService.toggleSave(job.id));
      this.jobs = this.jobs.map((j: JobOffer) => (j.id === job.id ? { ...j, isSaved } : j));
      this.savedCount = Math.max(0, this.savedCount + (isSaved ? 1 : -1));
    } catch {
      this.notificationService.error('UNIJOBS.ERROR.SAVE_FAILED');
    }
  }

  protected formatSalary(job: JobOffer): string {
    const { salaryMin, salaryMax, salaryPeriod } = job;
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

  protected trackByJob(_: number, job: JobOffer): string {
    return job.id;
  }

  protected jobLogo(job: JobOffer): string | null {
    if (job.logoUrl) {
      return resolveFileUrl(job.logoUrl);
    }
    if (job.creatorAvatarUrl) {
      return resolveFileUrl(job.creatorAvatarUrl);
    }
    const creatorId: string | undefined = job.creatorId;
    if (!creatorId) {
      return null;
    }
    if (this.creatorAvatarCache.has(creatorId)) {
      return this.creatorAvatarCache.get(creatorId) ?? null;
    }
    this.creatorAvatarCache.set(creatorId, null);
    void this.loadCreatorAvatar(creatorId, job.id);
    return null;
  }

  protected toggleFiltersPanel(): void {
    this.showMobileFilters = !this.showMobileFilters;
  }

  protected hideFiltersPanel(): void {
    this.showMobileFilters = false;
  }

  protected hasActiveFilters(): boolean {
    return (
      !!this.searchTerm.trim() ||
      !!this.selectedCategory ||
      this.selectedJobTypes.size > 0 ||
      this.selectedLocations.size > 0
    );
  }

  protected jobTypeLabel(type: JobType): string {
    return JOB_TYPE_TRANSLATION_KEYS[type];
  }

  protected workplaceLabel(type: JobWorkplace | undefined): string {
    if (!type) {
      return '';
    }
    return `UNIJOBS.CREATE.WORKPLACE.${type.toUpperCase()}`;
  }

  private loadTab(tab: JobTabKey): void {
    this.currentTab = tab;
    this.loadJobs();
  }

  private loadBadges(): void {
    const baseQuery: JobsQuery = {};
    this.uniJobsService.getSavedJobs(baseQuery).subscribe({
      next: (result) => (this.savedCount = result.total),
      error: () => {}
    });
    this.uniJobsService.getAppliedJobs(baseQuery).subscribe({
      next: (result) => (this.appliedCount = result.total),
      error: () => {}
    });
  }

  private loadJobs(): void {
    this.loading = true;

    const query: JobsQuery = {
      search: this.searchTerm || undefined,
      category: this.selectedCategory,
      jobTypes: Array.from(this.selectedJobTypes),
      locations: Array.from(this.selectedLocations),
      savedOnly: this.currentTab === 'saved',
      appliedOnly: this.currentTab === 'applied'
    };

    const request$ =
      this.currentTab === 'saved'
        ? this.uniJobsService.getSavedJobs(query)
        : this.currentTab === 'applied'
          ? this.uniJobsService.getAppliedJobs(query)
          : this.uniJobsService.getJobs(query);

    request$.subscribe({
      next: (result) => {
        this.jobs = result.items;
        if (this.currentTab === 'saved') {
          this.savedCount = result.total;
        }
        if (this.currentTab === 'applied') {
          this.appliedCount = result.total;
        }
      },
      error: () => {
        this.notificationService.error('UNIJOBS.ERROR.LOAD_JOBS');
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  private async loadCreatorAvatar(userId: string, jobId: string): Promise<void> {
    const avatarUrl: string | null = await this.jobAvatarService.getAvatarForUser(userId);
    if (avatarUrl) {
      this.creatorAvatarCache.set(userId, avatarUrl);
    }
    this.jobs = this.jobs.map((job: JobOffer) =>
      job.id === jobId ? { ...job, creatorId: userId, creatorAvatarUrl: avatarUrl ?? undefined } : job
    );
  }
}
