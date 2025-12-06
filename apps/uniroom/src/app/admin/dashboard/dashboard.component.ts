import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import NotificationService from '../../services/notification.service';
import { LocalizationService } from '../../services/localization.service';
import {
  DashboardStats,
  DashboardActivity,
  WeeklyChartData,
  DistributionChartData
} from '../../models/dashboard.model';

type TimeFilter = 'today' | 'week' | 'month' | 'year';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: false
})
export class AdminDashboardComponent implements OnInit {
  private readonly dashboardService: DashboardService = inject(DashboardService);
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly localizationService: LocalizationService = inject(LocalizationService);
  private readonly router: Router = inject(Router);

  stats: DashboardStats | null = null;
  recentActivity: DashboardActivity[] = [];
  weeklyData: WeeklyChartData | null = null;
  distributionData: DistributionChartData | null = null;

  isLoadingStats: boolean = true;
  isLoadingActivity: boolean = true;
  isLoadingWeekly: boolean = true;
  isLoadingDistribution: boolean = true;

  selectedFilter: TimeFilter = 'week';

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loadStats();
    this.loadActivity();
    this.loadWeeklyChart();
    this.loadDistributionChart();
  }

  loadStats(): void {
    this.isLoadingStats = true;
    this.dashboardService.getStats().subscribe({
      next: (data: DashboardStats) => {
        this.stats = data;
        this.isLoadingStats = false;
      },
      error: () => {
        this.notificationService.error('ADMIN.DASHBOARD.ERROR.LOAD_STATS');
        this.isLoadingStats = false;
      }
    });
  }

  loadActivity(): void {
    this.isLoadingActivity = true;
    this.dashboardService.getActivity().subscribe({
      next: (data: DashboardActivity[]) => {
        this.recentActivity = data;
        this.isLoadingActivity = false;
      },
      error: () => {
        this.notificationService.error('ADMIN.DASHBOARD.ERROR.LOAD_ACTIVITY');
        this.isLoadingActivity = false;
      }
    });
  }

  loadWeeklyChart(): void {
    this.isLoadingWeekly = true;
    this.dashboardService.getWeeklyChart().subscribe({
      next: (data: WeeklyChartData) => {
        this.weeklyData = data;
        this.isLoadingWeekly = false;
      },
      error: () => {
        this.notificationService.error('ADMIN.DASHBOARD.ERROR.LOAD_CHART');
        this.isLoadingWeekly = false;
      }
    });
  }

  loadDistributionChart(): void {
    this.isLoadingDistribution = true;
    this.dashboardService.getDistributionChart().subscribe({
      next: (data: DistributionChartData) => {
        this.distributionData = data;
        this.isLoadingDistribution = false;
      },
      error: () => {
        this.notificationService.error('ADMIN.DASHBOARD.ERROR.LOAD_CHART');
        this.isLoadingDistribution = false;
      }
    });
  }

  formatNumber(num: number | undefined): string {
    if (num === undefined) return '0';
    return this.localizationService.formatNumber(num);
  }

  formatPercentage(value: number | undefined): string {
    if (value === undefined) return '0%';
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  getContentCount(category: 'housing' | 'marketplace' | 'jobs' | 'carpool'): number {
    return this.distributionData?.[category]?.count ?? 0;
  }

  getContentMax(category: 'housing' | 'marketplace' | 'jobs' | 'carpool'): number {
    return this.distributionData?.[category]?.max ?? 0;
  }

  getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      user_registration: 'person-add',
      content_reported: 'warning',
      new_listing: 'home',
      user_verified: 'checkmark-circle',
      system_maintenance: 'construct',
      multiple_reports: 'alert-circle'
    };
    return icons[type] || 'information-circle';
  }

  getActivityColor(type: string): string {
    const colors: Record<string, string> = {
      user_registration: 'primary',
      content_reported: 'warning',
      new_listing: 'success',
      user_verified: 'success',
      system_maintenance: 'medium',
      multiple_reports: 'danger'
    };
    return colors[type] || 'medium';
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  viewAllActivity(): void {
    this.router.navigate(['/admin/activity']);
  }
}
