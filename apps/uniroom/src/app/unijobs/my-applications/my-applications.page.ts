import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { ApplicationStatus, JobApplication } from '../../models/unijobs.types';
import { LocalizationService } from '../../services/localization.service';
import NotificationService from '../../services/notification.service';
import { UniJobsService } from '../../services/unijobs.service';

interface StatusSummary {
  status: ApplicationStatus | 'total';
  label: string;
  count: number;
}

@Component({
  selector: 'app-my-applications',
  templateUrl: './my-applications.page.html',
  styleUrls: ['./my-applications.page.scss'],
  standalone: false
})
export class MyApplicationsPage implements OnInit {
  private readonly uniJobsService: UniJobsService = inject(UniJobsService);
  private readonly localization: LocalizationService = inject(LocalizationService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly router: Router = inject(Router);
  private readonly translate: TranslateService = inject(TranslateService);

  applications: JobApplication[] = [];
  filtered: JobApplication[] = [];
  summaries: StatusSummary[] = [];
  activeStatus: ApplicationStatus | 'all' = 'all';
  loading: boolean = false;
  readonly statusTabs: ApplicationStatus[] = ['pending', 'interview', 'accepted', 'rejected'];

  async ngOnInit(): Promise<void> {
    await this.loadApplications();
  }

  async loadApplications(): Promise<void> {
    this.loading = true;
    try {
      this.applications = await firstValueFrom(this.uniJobsService.getMyApplications());
      this.filtered = [...this.applications];
      this.computeSummaries();
    } catch {
      this.notificationService.error('UNIJOBS.APPLICATIONS.ERROR');
    } finally {
      this.loading = false;
    }
  }

  computeSummaries(): void {
    const total: number = this.applications.length;
    const statusCounts: Record<ApplicationStatus, number> = {
      pending: this.applications.filter((a: JobApplication) => a.status === 'pending').length,
      interview: this.applications.filter((a: JobApplication) => a.status === 'interview').length,
      accepted: this.applications.filter((a: JobApplication) => a.status === 'accepted').length,
      rejected: this.applications.filter((a: JobApplication) => a.status === 'rejected').length
    };

    this.summaries = [
      { status: 'total', label: this.translate.instant('UNIJOBS.APPLICATIONS.STATS.TOTAL'), count: total },
      { status: 'pending', label: this.translate.instant('UNIJOBS.APPLICATIONS.TABS.PENDING'), count: statusCounts.pending },
      { status: 'interview', label: this.translate.instant('UNIJOBS.APPLICATIONS.TABS.INTERVIEW'), count: statusCounts.interview },
      { status: 'accepted', label: this.translate.instant('UNIJOBS.APPLICATIONS.TABS.ACCEPTED'), count: statusCounts.accepted },
      { status: 'rejected', label: this.translate.instant('UNIJOBS.APPLICATIONS.TABS.REJECTED'), count: statusCounts.rejected }
    ];
  }

  setStatusFilter(status: ApplicationStatus | 'all'): void {
    this.activeStatus = status;
    if (status === 'all') {
      this.filtered = [...this.applications];
    } else {
      this.filtered = this.applications.filter((app: JobApplication) => app.status === status);
    }
  }

  formatAppliedDate(date: string): string {
    return this.localization.formatDate(date, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  getStatusClass(status: ApplicationStatus): string {
    switch (status) {
      case 'pending':
        return 'status-badge pending';
      case 'interview':
        return 'status-badge interview';
      case 'accepted':
        return 'status-badge accepted';
      case 'rejected':
        return 'status-badge rejected';
      default:
        return 'status-badge';
    }
  }

  viewJob(application: JobApplication): void {
    void this.router.navigate(['/jobs', application.jobId]);
  }
}
