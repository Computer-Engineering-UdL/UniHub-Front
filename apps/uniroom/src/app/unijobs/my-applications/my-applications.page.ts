import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { LocalizationService } from '../../services/localization.service';
import NotificationService from '../../services/notification.service';
import { UniJobsService } from '../../services/unijobs.service';
import { JobApplication } from '../../models/unijobs.types';
import { AuthService } from '../../services/auth.service';
import { SharedModule } from '../../shared/shared-module';

interface ApplicationStats {
  total: number;
  pending: number;
  interview: number;
  accepted: number;
  rejected: number;
}

interface StatOption {
  key: keyof ApplicationStats;
  label: string;
}

@Component({
  selector: 'app-my-applications',
  templateUrl: './my-applications.page.html',
  styleUrls: ['./my-applications.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule, SharedModule]
})
export class MyApplicationsPage implements OnInit {
  private readonly uniJobsService: UniJobsService = inject(UniJobsService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  protected readonly localizationService: LocalizationService = inject(LocalizationService);
  private readonly router: Router = inject(Router);
  private readonly authService: AuthService = inject(AuthService);

  protected applications: JobApplication[] = [];
  protected filteredApplications: JobApplication[] = [];
  protected selectedStatus: 'all' | 'pending' | 'interview' | 'accepted' | 'rejected' = 'all';
  protected loading: boolean = true;
  protected stats: ApplicationStats = {
    total: 0,
    pending: 0,
    interview: 0,
    accepted: 0,
    rejected: 0
  };

  protected readonly statOptions: StatOption[] = [
    { key: 'total', label: 'UNIJOBS.APPLICATIONS.STATS.TOTAL' },
    { key: 'pending', label: 'UNIJOBS.APPLICATIONS.STATS.PENDING' },
    { key: 'interview', label: 'UNIJOBS.APPLICATIONS.STATS.INTERVIEW' },
    { key: 'accepted', label: 'UNIJOBS.APPLICATIONS.STATS.ACCEPTED' },
    { key: 'rejected', label: 'UNIJOBS.APPLICATIONS.STATS.REJECTED' }
  ];

  protected readonly statusOptions: Array<{
    key: 'all' | 'pending' | 'interview' | 'accepted' | 'rejected';
    label: string;
  }> = [
    { key: 'all', label: 'UNIJOBS.APPLICATIONS.STATUS.ALL' },
    { key: 'pending', label: 'UNIJOBS.APPLICATIONS.STATUS.PENDING' },
    { key: 'interview', label: 'UNIJOBS.APPLICATIONS.STATUS.INTERVIEW' },
    { key: 'accepted', label: 'UNIJOBS.APPLICATIONS.STATUS.ACCEPTED' },
    { key: 'rejected', label: 'UNIJOBS.APPLICATIONS.STATUS.REJECTED' }
  ];

  ngOnInit(): void {
    const user = this.authService.currentUser;
    if (!user?.isVerified) {
      this.notificationService.error('UNIJOBS.APPLICATIONS.VERIFICATION_REQUIRED');
      this.router.navigateByUrl('/profile');
      return;
    }
    this.loadApplications();
  }

  protected selectStatus(status: 'all' | 'pending' | 'interview' | 'accepted' | 'rejected'): void {
    this.selectedStatus = status;
    this.applyFilter();
  }

  protected formatDate(date: string): string {
    return this.localizationService.formatDate(date);
  }

  protected getStatusColor(status: 'pending' | 'interview' | 'accepted' | 'rejected'): string {
    switch (status) {
      case 'accepted':
        return 'success';
      case 'interview':
        return 'tertiary';
      case 'rejected':
        return 'danger';
      default:
        return 'warning';
    }
  }

  protected goToJob(jobId: string): void {
    this.router.navigate(['/jobs', jobId]);
  }

  protected trackByApplication(_: number, application: JobApplication): string {
    return application.id;
  }

  private loadApplications(): void {
    this.loading = true;
    this.uniJobsService.getJobApplications().subscribe({
      next: (apps: JobApplication[]) => {
        this.applications = apps;
        this.computeStats();
        this.applyFilter();
      },
      error: () => {
        this.notificationService.error('UNIJOBS.ERROR.LOAD_APPLICATIONS');
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  private applyFilter(): void {
    if (this.selectedStatus === 'all') {
      this.filteredApplications = [...this.applications];
      return;
    }
    this.filteredApplications = this.applications.filter((app: JobApplication) => app.status === this.selectedStatus);
  }

  private computeStats(): void {
    const stats: ApplicationStats = {
      total: this.applications.length,
      pending: 0,
      interview: 0,
      accepted: 0,
      rejected: 0
    };
    this.applications.forEach((app: JobApplication) => {
      stats[app.status as keyof ApplicationStats] += 1;
    });
    this.stats = stats;
  }
}
