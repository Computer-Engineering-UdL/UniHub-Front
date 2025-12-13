import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, InfiniteScrollCustomEvent, ModalController, NavController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { LocalizationService } from '../../services/localization.service';
import NotificationService from '../../services/notification.service';
import { UniJobsService } from '../../services/unijobs.service';
import { JobOffer, JobCategory, JobType, JobsQuery } from '../../models/unijobs.types';
import { ApplyJobDialogComponent } from '../apply-job-dialog/apply-job-dialog.component';
import { SharedModule } from '../../shared/shared-module';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/auth.types';

interface JobTab {
  key: 'all' | 'saved' | 'applied';
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
  private readonly PAGE_SIZE: number = 10;

  private readonly uniJobsService: UniJobsService = inject(UniJobsService);
  private readonly modalController: ModalController = inject(ModalController);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly translateService: TranslateService = inject(TranslateService);
  protected readonly localizationService: LocalizationService = inject(LocalizationService);
  private readonly navController: NavController = inject(NavController);
  private readonly authService: AuthService = inject(AuthService);

  protected jobs: JobOffer[] = [];
  protected loading: boolean = true;
  protected loadingMore: boolean = false;
  protected searchTerm: string = '';
  protected selectedCategory?: JobCategory;
  protected selectedJobTypes: Set<JobType> = new Set<JobType>();
  protected selectedLocations: Set<string> = new Set<string>();
  protected currentTab: 'all' | 'saved' | 'applied' = 'all';
  protected savedCount: number = 0;
  protected appliedCount: number = 0;
  protected hasMore: boolean = true;
  protected showMobileFilters: boolean = false;
  protected canCreate: boolean = false;

  Array = Array

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

  private currentPage: number = 1;
  private userSubscription?: Subscription;

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser$.subscribe((user: User | null) => {
      this.canCreate = user?.role === 'Admin';
    });
    this.loadTab('all');
    this.loadBadges();
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  protected async openApplications(): Promise<void> {
    await this.navController.navigateForward('/jobs/applications');
  }

  protected async openCreate(): Promise<void> {
    await this.navController.navigateForward('/jobs/create');
  }

  protected changeTab(tab: 'all' | 'saved' | 'applied'): void {
    if (this.currentTab === tab) {
      return;
    }
    this.currentTab = tab;
    this.resetList();
    this.loadJobs(true);
  }

  protected onSearchChange(event: CustomEvent): void {
    this.searchTerm = (event.detail.value || '').toString();
    this.resetList();
    this.loadJobs(true);
  }

  protected toggleJobType(type: JobType): void {
    if (this.selectedJobTypes.has(type)) {
      this.selectedJobTypes.delete(type);
    } else {
      this.selectedJobTypes.add(type);
    }
    this.resetList();
    this.loadJobs(true);
  }

  protected selectCategory(category?: JobCategory): void {
    this.selectedCategory = this.selectedCategory === category ? undefined : category;
    this.resetList();
    this.loadJobs(true);
  }

  protected toggleLocation(location: string): void {
    if (this.selectedLocations.has(location)) {
      this.selectedLocations.delete(location);
    } else {
      this.selectedLocations.add(location);
    }
    this.resetList();
    this.loadJobs(true);
  }

  protected onLocationsChange(locations: string[] | undefined): void {
    this.selectedLocations = new Set<string>(locations ?? []);
    this.resetList();
    this.loadJobs(true);
  }

  protected clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = undefined;
    this.selectedJobTypes.clear();
    this.selectedLocations.clear();
    this.showMobileFilters = false;
    this.resetList();
    this.loadJobs(true);
  }

  protected async openApply(job: JobOffer): Promise<void> {
    const modal = await this.modalController.create({
      component: ApplyJobDialogComponent,
      componentProps: { jobTitle: job.title, companyName: job.companyName, jobId: job.id }
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.applied && !job.isApplied) {
      this.jobs = this.jobs.map((j: JobOffer) => (j.id === job.id ? { ...j, isApplied: true } : j));
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

  protected loadMore(event: InfiniteScrollCustomEvent): void {
    if (!this.hasMore || this.loading) {
      event.target.complete();
      return;
    }
    this.loadJobs(false, event);
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

  protected trackByJob(_: number, job: JobOffer): string {
    return job.id;
  }

  protected toggleFiltersPanel(): void {
    this.showMobileFilters = !this.showMobileFilters;
  }

  protected hideFiltersPanel(): void {
    this.showMobileFilters = false;
  }

  private loadTab(tab: 'all' | 'saved' | 'applied'): void {
    this.currentTab = tab;
    this.resetList();
    this.loadJobs(true);
  }

  private loadBadges(): void {
    const baseQuery: JobsQuery = {
      page: 1,
      pageSize: 1
    };
    this.uniJobsService.getSavedJobs(baseQuery).subscribe({
      next: (result) => (this.savedCount = result.total),
      error: () => {}
    });
    this.uniJobsService.getAppliedJobs(baseQuery).subscribe({
      next: (result) => (this.appliedCount = result.total),
      error: () => {}
    });
  }

  private resetList(): void {
    this.jobs = [];
    this.currentPage = 1;
    this.hasMore = true;
  }

  private loadJobs(reset: boolean, event?: InfiniteScrollCustomEvent): void {
    if (!this.hasMore && !reset) {
      if (event) {
        event.target.complete();
      }
      return;
    }
    this.loading = reset;
    this.loadingMore = !reset;

    const query: JobsQuery = {
      search: this.searchTerm || undefined,
      category: this.selectedCategory,
      jobTypes: Array.from(this.selectedJobTypes),
      locations: Array.from(this.selectedLocations),
      page: this.currentPage,
      pageSize: this.PAGE_SIZE,
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
        this.jobs = reset ? result.items : [...this.jobs, ...result.items];
        if (this.currentTab === 'saved') {
          this.savedCount = result.total;
        }
        if (this.currentTab === 'applied') {
          this.appliedCount = result.total;
        }
        this.hasMore = this.jobs.length < result.total;
        if (this.hasMore) {
          this.currentPage += 1;
        }
      },
      error: () => {
        this.notificationService.error('UNIJOBS.ERROR.LOAD_JOBS');
      },
      complete: () => {
        this.loading = false;
        this.loadingMore = false;
        if (event) {
          event.target.complete();
        }
      }
    });
  }
}
