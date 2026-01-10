import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LocalizationService } from '../../services/localization.service';
import NotificationService from '../../services/notification.service';
import { UniJobsService } from '../../services/unijobs.service';
import { JobApplicationDetails, JobOffer } from '../../models/unijobs.types';
import { SharedModule } from '../../shared/shared-module';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/auth.types';

@Component({
  selector: 'app-job-applications',
  templateUrl: './job-applications.component.html',
  styleUrls: ['./job-applications.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule, SharedModule]
})
export class JobApplicationsComponent implements OnInit {
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly uniJobsService: UniJobsService = inject(UniJobsService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly authService: AuthService = inject(AuthService);
  protected readonly localizationService: LocalizationService = inject(LocalizationService);

  protected applications: JobApplicationDetails[] = [];
  protected loading: boolean = true;
  protected jobId: string = '';

  ngOnInit(): void {
    const id: string | null = this.route.snapshot.paramMap.get('id');
    if (!id) {
      void this.router.navigate(['/jobs']);
      return;
    }
    this.jobId = id;
    void this.loadApplications();
  }

  protected async goBack(): Promise<void> {
    await this.router.navigate(['/jobs', this.jobId]);
  }

  protected getInitials(name: string): string {
    return (name || '')
      .split(' ')
      .filter((part: string) => part.trim().length > 0)
      .map((part: string) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  protected formatDate(date: string): string {
    return this.localizationService.formatDate(date);
  }

  protected downloadCV(cvUrl: string): void {
    if (!cvUrl) {
      return;
    }
    try {
      window.open(cvUrl, '_blank');
    } catch {
      this.notificationService.error('UNIJOBS.APPLICATIONS.ERROR.DOWNLOAD_CV');
    }
  }

  private async loadApplications(): Promise<void> {
    this.loading = true;
    try {
      const job: JobOffer = await firstValueFrom(this.uniJobsService.getJobDetail(this.jobId));
      const currentUser: User | null = this.authService.currentUser;

      if (!currentUser) {
        await this.router.navigate(['/login']);
        return;
      }

      const isAdmin: boolean = currentUser.role === 'Admin';
      const isCreator: boolean = job.creatorId === currentUser.id;

      if (!isAdmin && !isCreator) {
        this.notificationService.error('UNIJOBS.APPLICATIONS.ERROR.LOAD');
        await this.router.navigate(['/jobs', this.jobId]);
        return;
      }

      this.applications = await firstValueFrom(this.uniJobsService.getJobOfferApplications(this.jobId));
    } catch {
      this.notificationService.error('UNIJOBS.APPLICATIONS.ERROR.LOAD');
      await this.router.navigate(['/jobs', this.jobId]);
    } finally {
      this.loading = false;
    }
  }
}
