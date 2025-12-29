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
import { ReportService, ReportsResponse } from '../../services/report.service';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
  standalone: false
})
export class AdminReportsComponent implements OnInit, OnDestroy {
  private readonly reportService: ReportService = inject(ReportService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  readonly localizationService: LocalizationService = inject(LocalizationService);
  readonly translateService: TranslateService = inject(TranslateService);
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
  openedMenuReportId: string | null = null;
  expandedReportId: string | null = null;
  pageSizeOptions: number[] = [10, 25, 50, 100];

  private readonly searchSubject: Subject<string> = new Subject<string>();

  sortField: string = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';

  readonly ReportStatus = ReportStatus;
  readonly ReportPriority = ReportPriority;
  readonly ReportCategory = ReportCategory;
  readonly ReportReason = ReportReason;
  private readonly accessCheckCache: Map<string, Promise<boolean>> = new Map();
  private readonly http: HttpClient = inject(HttpClient);

  ngOnInit(): void {
    this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe((term: string) => {
      this.searchTerm = term;
      this.currentPage = 0;
      this.loadReports();
    });

    this.loadStats();
    this.loadReports();
  }

  ionViewWillEnter(): void {
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
      try {
        this.stats = await lastValueFrom(this.reportService.getReportStats());
      } catch {
        this.stats = await this.getFallbackStats();
      }
    } catch {
      this.notificationService.error(this.translateService.instant('ADMIN.REPORTS.ERROR.LOAD_STATS'));
    }
  }

  private async getFallbackStats(): Promise<ReportStats> {
    let page: number = 0;
    const size = 100;
    let allReports: Report[] = [];
    let total: number = 0;
    let hasMore: boolean = true;
    while (hasMore) {
      const response: ReportsResponse = await lastValueFrom(this.reportService.getReports(page, size));
      if (response?.reports && response.reports.length > 0) {
        allReports = allReports.concat(response.reports);
        total += response.reports.length;
        page++;
        hasMore = response.reports.length === size;
      } else {
        hasMore = false;
      }
    }
    return {
      total: total,
      pending: allReports.filter((r) => r.status === 'pending').length,
      reviewing: allReports.filter((r) => r.status === 'reviewing').length,
      resolved: allReports.filter((r) => r.status === 'resolved').length,
      dismissed: allReports.filter((r) => r.status === 'dismissed').length,
      critical: allReports.filter((r) => r.priority === 'critical').length
    };
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

  openActionsMenu(reportId: string): void {
    this.openedMenuReportId = reportId;
  }

  closeActionsMenu(): void {
    this.openedMenuReportId = null;
  }

  async handleReportAction(report: Report, newStatus: ReportStatus): Promise<void> {
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
    this.openedMenuReportId = null;
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
    this.openedMenuReportId = null;
  }

  toggleReportDetails(reportId: string): void {
    this.expandedReportId = this.expandedReportId === reportId ? null : reportId;
  }

  async changePriority(report: Report): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translateService.instant('ADMIN.REPORTS.PRIORITY_MODAL.TITLE'),
      message: this.translateService.instant('ADMIN.REPORTS.PRIORITY_MODAL.MESSAGE'),
      cssClass: 'priority-alert',
      inputs: [
        {
          type: 'radio',
          label: `${this.translateService.instant('ADMIN.REPORTS.PRIORITY.CRITICAL')}`,
          value: ReportPriority.CRITICAL,
          checked: report.priority === ReportPriority.CRITICAL,
          cssClass: 'priority-critical'
        },
        {
          type: 'radio',
          label: `${this.translateService.instant('ADMIN.REPORTS.PRIORITY.HIGH')}`,
          value: ReportPriority.HIGH,
          checked: report.priority === ReportPriority.HIGH,
          cssClass: 'priority-high'
        },
        {
          type: 'radio',
          label: `${this.translateService.instant('ADMIN.REPORTS.PRIORITY.MEDIUM')}`,
          value: ReportPriority.MEDIUM,
          checked: report.priority === ReportPriority.MEDIUM,
          cssClass: 'priority-medium'
        },
        {
          type: 'radio',
          label: `${this.translateService.instant('ADMIN.REPORTS.PRIORITY.LOW')}`,
          value: ReportPriority.LOW,
          checked: report.priority === ReportPriority.LOW,
          cssClass: 'priority-low'
        }
      ],
      buttons: [
        {
          text: this.translateService.instant('ADMIN.REPORTS.PRIORITY_MODAL.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translateService.instant('ADMIN.REPORTS.PRIORITY_MODAL.CONFIRM'),
          handler: async (priority: ReportPriority) => {
            if (priority && priority !== report.priority) {
              await this.updateReportPriority(report.id, priority);
            }
          }
        }
      ]
    });
    await alert.present();
    this.openedMenuReportId = null;
  }

  async bulkUpdateStatus(status: ReportStatus): Promise<void> {
    if (this.selectedReports.size === 0) {
      return;
    }

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

  getStatusIcon(status: ReportStatus): string {
    switch (status) {
      case ReportStatus.PENDING:
        return 'time-outline';
      case ReportStatus.REVIEWING:
        return 'eye-outline';
      case ReportStatus.RESOLVED:
        return 'checkmark-circle-outline';
      case ReportStatus.DISMISSED:
        return 'close-circle-outline';
      default:
        return 'help-circle-outline';
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
        return 'cube-outline';
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

  navigateToUser(userId: string): void {
    if (userId) {
      void this.router.navigate(['/profile', userId]);
    }
  }

  async navigateToRoom(roomId: string): Promise<void> {
    if (roomId) {
      void this.router.navigate(['/rooms/details', roomId]);
    }
  }

  navigateToChannel(channelId: string): void {
    if (channelId) {
      void this.router.navigate(['/channels', channelId]);
    }
  }

  navigateToItem(itemId: string): void {
    if (itemId) {
      void this.router.navigate(['/items/', itemId]);
    }
  }

  navigateToJob(jobId: string): void {
    if (jobId) {
      void this.router.navigate(['/jobs/', jobId]);
    }
  }

  getGoToContentConfig(category: ReportCategory): { icon: string; labelKey: string } | null {
    const categoryIcon: string = this.getCategoryIcon(category);
    switch (category) {
      case 'user':
        return { icon: categoryIcon, labelKey: 'ADMIN.REPORTS.GO_TO_USER' };
      case 'housing':
        return { icon: categoryIcon, labelKey: 'ADMIN.REPORTS.GO_TO_ROOM' };
      case 'channels':
        return { icon: categoryIcon, labelKey: 'ADMIN.REPORTS.GO_TO_CHANNEL' };
      case 'marketplace':
        return { icon: categoryIcon, labelKey: 'ADMIN.REPORTS.GO_TO_ITEM' };
      case 'services':
        return { icon: categoryIcon, labelKey: 'ADMIN.REPORTS.GO_TO_JOB' };
      default:
        return null;
    }
  }

  private getContentApiUrl(contentType: string, contentId: string): string | null {
    if (!contentType || !contentId) {
      return null;
    }
    switch (contentType) {
      case 'user':
        return `${environment.apiUrl}/user/public/${contentId}`;
      case 'housing':
        return `${environment.apiUrl}/offers/${contentId}`;
      case 'channels':
        return `${environment.apiUrl}/channel/${contentId}`;
      case 'marketplace':
        return `${environment.apiUrl}/items/${contentId}`;
      case 'services':
        return `${environment.apiUrl}/job/${contentId}`;
      default:
        return null;
    }
  }

  async navigateToContent(contentType: string, contentId: string): Promise<void> {
    const apiUrl: string | null = this.getContentApiUrl(contentType, contentId);
    if (apiUrl) {
      const ok: boolean = await this.canAccessUrl(apiUrl);
      if (!ok) {
        this.notificationService.error('ADMIN.REPORTS.ERROR.NO_ACCESS_CONTENT');
        return;
      }
    }

    if (contentType === 'user') {
      this.navigateToUser(contentId);
    } else if (contentType === 'housing') {
      await this.navigateToRoom(contentId);
    } else if (contentType === 'channels') {
      this.navigateToChannel(contentId);
    } else if (contentType === 'marketplace') {
      this.navigateToItem(contentId);
    } else if (contentType === 'services') {
      this.navigateToJob(contentId);
    }
  }

  getContentTitle(report: Report): string {
    if (!report.contentTitle) {
      return this.translateService.instant(`ADMIN.REPORTS.CATEGORY.${report.contentType.toUpperCase()}`);
    }

    const translationKey = `ADMIN.REPORTS.CONTENT_TITLE.${report.contentType.toUpperCase()}`;
    const params = this.getContentTitleParams(report);

    return this.translateService.instant(translationKey, params);
  }

  private getContentTitleParams(report: Report): Record<string, string> {
    const baseParams: Record<string, string> = {};

    switch (report.contentType) {
      case ReportCategory.HOUSING:
        baseParams['title'] = report.contentTitle || '';
        break;
      case ReportCategory.MARKETPLACE:
        baseParams['title'] = report.contentTitle || '';
        break;
      case ReportCategory.CHANNELS:
        baseParams['name'] = report.contentTitle || '';
        break;
      case ReportCategory.MESSAGES:
        baseParams['senderName'] = report.contentTitle || '';
        break;
      case ReportCategory.SERVICES:
        baseParams['title'] = report.contentTitle || '';
        break;
      case ReportCategory.USER:
        baseParams['username'] = report.contentTitle || '';
        break;
    }

    return baseParams;
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

  onSort(field: string): void {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = 'asc';
    }
    this.sortReports();
  }

  private sortReports(): void {
    this.reports.sort((a: Report, b: Report) => {
      let compareValue;

      switch (this.sortField) {
        case 'contentTitle':
          compareValue = (this.getContentTitle(a) || '').localeCompare(this.getContentTitle(b) || '');
          break;
        case 'reason':
          compareValue = a.reason.localeCompare(b.reason);
          break;
        case 'reportedBy':
          compareValue = a.reportedBy.fullName.localeCompare(b.reportedBy.fullName);
          break;
        case 'reportedUser':
          compareValue = a.reportedUser.fullName.localeCompare(b.reportedUser.fullName);
          break;
        case 'priority': {
          const priorityOrder: Record<ReportPriority, number> = {
            [ReportPriority.CRITICAL]: 4,
            [ReportPriority.HIGH]: 3,
            [ReportPriority.MEDIUM]: 2,
            [ReportPriority.LOW]: 1
          };
          compareValue = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        }
        case 'status':
          compareValue = a.status.localeCompare(b.status);
          break;
        case 'createdAt':
          compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        default:
          compareValue = 0;
      }

      return this.sortOrder === 'asc' ? compareValue : -compareValue;
    });
  }

  getStatusBadgeClass(status: ReportStatus): string {
    switch (status) {
      case ReportStatus.PENDING:
        return 'status-pending';
      case ReportStatus.REVIEWING:
        return 'status-reviewing';
      case ReportStatus.RESOLVED:
        return 'status-resolved';
      case ReportStatus.DISMISSED:
        return 'status-dismissed';
      default:
        return '';
    }
  }

  async canAccessUrl(url: string): Promise<boolean> {
    if (!url) {
      return false;
    }
    if (this.accessCheckCache.has(url)) {
      return this.accessCheckCache.get(url)!;
    }

    const checkPromise = (async (): Promise<boolean> => {
      try {
        await lastValueFrom(
          this.http.head(url, {
            observe: 'response',
            responseType: 'text' as 'json'
          })
        );
        return true;
      } catch (err) {
        if (err instanceof HttpErrorResponse) {
          if (err.status === 401 || err.status === 403) {
            return false;
          }
          try {
            await lastValueFrom(
              this.http.get(url, {
                observe: 'response',
                responseType: 'text' as 'json'
              })
            );
            return true;
          } catch (error_) {
            if (error_ instanceof HttpErrorResponse && (error_.status === 401 || error_.status === 403)) {
              return false;
            }
            return false;
          }
        }
        return false;
      }
    })();

    this.accessCheckCache.set(url, checkPromise);
    return checkPromise;
  }
}
