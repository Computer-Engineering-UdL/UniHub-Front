import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import NotificationService from '../../services/notification.service';
import { LocalizationService } from '../../services/localization.service';
import { TranslateService } from '@ngx-translate/core';
import { AlertController } from '@ionic/angular';
import {
  Report,
  ReportActionRequest,
  ReportCategory,
  ReportFilters,
  ReportPriority,
  ReportReason,
  ReportStats,
  ReportStatus
} from '../../models/report.types';
import { lastValueFrom, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ReportService } from '../../services/report.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
  standalone: false
})
export class AdminReportsComponent implements OnInit, OnDestroy {
  private readonly reportService: ReportService = inject(ReportService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly localizationService: LocalizationService = inject(LocalizationService);
  private readonly translateService: TranslateService = inject(TranslateService);
  private readonly alertController: AlertController = inject(AlertController);
  private readonly router: Router = inject(Router);

  reports: Report[] = [];
  stats: ReportStats = { total: 0, pending: 0, reviewing: 0, resolved: 0, dismissed: 0, critical: 0 };
  loading: boolean = false;
  searchTerm: string = '';
  currentPage: number = 0;
  pageSize: number = 10;
  totalReports: number = 0;
  filters: ReportFilters = {
    status: 'all',
    priority: 'all',
    category: 'all',
    reason: 'all'
  };
  selectedReports: Set<string> = new Set();
  expandedReportId: string | null = null;
  pageSizeOptions: number[] = [10, 25, 50, 100];

  private readonly searchSubject: Subject<string> = new Subject<string>();

  readonly ReportStatus = ReportStatus;
  readonly ReportPriority = ReportPriority;
  readonly ReportCategory = ReportCategory;
  readonly ReportReason = ReportReason;

  ngOnInit(): void {
    this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe((term: string) => {
      this.searchTerm = term;
      this.currentPage = 0;
      this.loadReports();
    });

    this.loadStats();
    this.loadReports();
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchSubject.next(target.value);
  }

  async loadStats(): Promise<void> {
    try {
      this.stats = await lastValueFrom(this.reportService.getReportStats());
    } catch {
      this.notificationService.error(this.translateService.instant('ADMIN.REPORTS.ERROR.LOAD_STATS'));
    }
  }

  async loadReports(): Promise<void> {
    this.loading = true;
    try {
      const response = await lastValueFrom(
        this.reportService.getReports(this.currentPage, this.pageSize, this.searchTerm, this.filters)
      );
      this.reports = response.reports;
      this.totalReports = response.total;
    } catch {
      this.notificationService.error(this.translateService.instant('ADMIN.REPORTS.ERROR.LOAD_REPORTS'));
    } finally {
      this.loading = false;
    }
  }

  onFilterChange(): void {
    this.currentPage = 0;
    this.loadReports();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadReports();
  }

  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.pageSize = Number.parseInt(target.value, 10);
    this.currentPage = 0;
    this.loadReports();
  }

  toggleReportSelection(reportId: string): void {
    if (this.selectedReports.has(reportId)) {
      this.selectedReports.delete(reportId);
    } else {
      this.selectedReports.add(reportId);
    }
  }

  toggleAllReports(): void {
    if (this.selectedReports.size === this.reports.length) {
      this.selectedReports.clear();
    } else {
      this.reports.forEach((report: Report) => this.selectedReports.add(report.id));
    }
  }

  toggleReportDetails(reportId: string): void {
    this.expandedReportId = this.expandedReportId === reportId ? null : reportId;
  }

  closePopover(popoverId: string): void {
    const popover = document.querySelector(`ion-popover[trigger="${popoverId}"]`);
    if (popover && 'dismiss' in popover) {
      void (popover as any).dismiss();
    }
  }

  async handleReportAction(report: Report, newStatus: ReportStatus): Promise<void> {
    this.closePopover('actions-' + report.id);
    if (newStatus === ReportStatus.RESOLVED || newStatus === ReportStatus.DISMISSED) {
      const alert = await this.alertController.create({
        header: this.translateService.instant('ADMIN.REPORTS.ACTION_MODAL.TITLE'),
        message: this.translateService.instant('ADMIN.REPORTS.ACTION_MODAL.MESSAGE'),
        inputs: [
          {
            name: 'resolution',
            type: 'textarea',
            placeholder: this.translateService.instant('ADMIN.REPORTS.ACTION_MODAL.RESOLUTION_PLACEHOLDER')
          }
        ],
        buttons: [
          {
            text: this.translateService.instant('ADMIN.REPORTS.ACTION_MODAL.CANCEL'),
            role: 'cancel'
          },
          {
            text: this.translateService.instant('ADMIN.REPORTS.ACTION_MODAL.CONFIRM'),
            handler: (data: { resolution: string }) => {
              this.updateReportStatus(report.id, { status: newStatus, resolution: data.resolution });
            }
          }
        ]
      });
      await alert.present();
    } else {
      await this.updateReportStatus(report.id, { status: newStatus });
    }
  }

  async updateReportStatus(reportId: string, action: ReportActionRequest): Promise<void> {
    try {
      await lastValueFrom(this.reportService.updateReportStatus(reportId, action));
      this.notificationService.success(this.translateService.instant('ADMIN.REPORTS.SUCCESS.STATUS_UPDATED'));
      await this.loadStats();
      await this.loadReports();
    } catch {
      this.notificationService.error(this.translateService.instant('ADMIN.REPORTS.ERROR.UPDATE_STATUS'));
    }
  }

  async updateReportPriority(reportId: string, priority: ReportPriority): Promise<void> {
    try {
      await lastValueFrom(this.reportService.updateReportPriority(reportId, priority));
      this.notificationService.success(this.translateService.instant('ADMIN.REPORTS.SUCCESS.PRIORITY_UPDATED'));
      await this.loadStats();
      await this.loadReports();
    } catch {
      this.notificationService.error(this.translateService.instant('ADMIN.REPORTS.ERROR.UPDATE_PRIORITY'));
    }
  }

  async deleteReport(reportId: string): Promise<void> {
    this.closePopover('actions-' + reportId);
    const alert = await this.alertController.create({
      header: this.translateService.instant('ADMIN.REPORTS.DELETE_MODAL.TITLE'),
      message: this.translateService.instant('ADMIN.REPORTS.DELETE_MODAL.MESSAGE'),
      buttons: [
        {
          text: this.translateService.instant('ADMIN.REPORTS.DELETE_MODAL.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translateService.instant('ADMIN.REPORTS.DELETE_MODAL.CONFIRM'),
          role: 'destructive',
          handler: async () => {
            try {
              await lastValueFrom(this.reportService.deleteReport(reportId));
              this.notificationService.success(this.translateService.instant('ADMIN.REPORTS.SUCCESS.DELETED'));
              await this.loadStats();
              await this.loadReports();
            } catch {
              this.notificationService.error(this.translateService.instant('ADMIN.REPORTS.ERROR.DELETE'));
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async bulkUpdateStatus(status: ReportStatus): Promise<void> {
    if (this.selectedReports.size === 0) return;

    const alert = await this.alertController.create({
      header: this.translateService.instant('ADMIN.REPORTS.BULK_ACTION_MODAL.TITLE'),
      message: this.translateService.instant('ADMIN.REPORTS.BULK_ACTION_MODAL.MESSAGE', {
        count: this.selectedReports.size
      }),
      buttons: [
        {
          text: this.translateService.instant('ADMIN.REPORTS.BULK_ACTION_MODAL.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translateService.instant('ADMIN.REPORTS.BULK_ACTION_MODAL.CONFIRM'),
          handler: async () => {
            try {
              const reportIds = Array.from(this.selectedReports);
              await lastValueFrom(this.reportService.bulkUpdateReports(reportIds, { status }));
              this.notificationService.success(this.translateService.instant('ADMIN.REPORTS.SUCCESS.BULK_UPDATED'));
              this.selectedReports.clear();
              await this.loadStats();
              await this.loadReports();
            } catch {
              this.notificationService.error(this.translateService.instant('ADMIN.REPORTS.ERROR.BULK_UPDATE'));
            }
          }
        }
      ]
    });
    await alert.present();
  }

  getStatusColor(status: ReportStatus): string {
    switch (status) {
      case ReportStatus.PENDING:
        return 'warning';
      case ReportStatus.REVIEWING:
        return 'primary';
      case ReportStatus.RESOLVED:
        return 'success';
      case ReportStatus.DISMISSED:
        return 'medium';
      default:
        return 'medium';
    }
  }

  getPriorityColor(priority: ReportPriority): string {
    switch (priority) {
      case ReportPriority.CRITICAL:
        return 'danger';
      case ReportPriority.HIGH:
        return 'warning';
      case ReportPriority.MEDIUM:
        return 'primary';
      case ReportPriority.LOW:
        return 'success';
      default:
        return 'medium';
    }
  }

  getCategoryIcon(category: ReportCategory): string {
    switch (category) {
      case ReportCategory.HOUSING:
        return 'home';
      case ReportCategory.MARKETPLACE:
        return 'storefront';
      case ReportCategory.CHANNELS:
        return 'chatbubbles';
      case ReportCategory.MESSAGES:
        return 'mail';
      case ReportCategory.SERVICES:
        return 'briefcase';
      case ReportCategory.USER:
        return 'person';
      default:
        return 'alert-circle';
    }
  }

  getReasonIcon(reason: ReportReason): string {
    switch (reason) {
      case ReportReason.SCAM_FRAUD:
        return 'cash-outline';
      case ReportReason.FAKE_LISTING:
        return 'close-circle-outline';
      case ReportReason.INAPPROPRIATE_CONTENT:
        return 'eye-off-outline';
      case ReportReason.HARASSMENT:
        return 'hand-left-outline';
      case ReportReason.SPAM:
        return 'mail-unread-outline';
      case ReportReason.HATE_SPEECH:
        return 'megaphone-outline';
      case ReportReason.VIOLENCE:
        return 'alert-circle-outline';
      case ReportReason.OTHER:
        return 'help-circle-outline';
      default:
        return 'alert-circle-outline';
    }
  }

  getReasonColor(reason: ReportReason): string {
    switch (reason) {
      case ReportReason.SCAM_FRAUD:
      case ReportReason.HARASSMENT:
      case ReportReason.HATE_SPEECH:
      case ReportReason.VIOLENCE:
        return 'danger';
      case ReportReason.FAKE_LISTING:
      case ReportReason.SPAM:
        return 'warning';
      case ReportReason.INAPPROPRIATE_CONTENT:
        return 'tertiary';
      case ReportReason.OTHER:
        return 'medium';
      default:
        return 'medium';
    }
  }

  navigateToProfile(userId: string): void {
    void this.router.navigate(['/profile', userId]);
  }

  formatDate(date: string): string {
    return this.localizationService.formatDate(date);
  }

  getMinValue(a: number, b: number): number {
    return Math.min(a, b);
  }

  get totalPages(): number {
    return Math.ceil(this.totalReports / this.pageSize);
  }

  get allSelected(): boolean {
    return this.reports.length > 0 && this.selectedReports.size === this.reports.length;
  }
}
