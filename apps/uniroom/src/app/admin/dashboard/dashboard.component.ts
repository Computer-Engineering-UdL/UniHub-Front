import { Component, OnInit, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DashboardService } from '../../services/dashboard.service';
import NotificationService from '../../services/notification.service';
import { LocalizationService } from '../../services/localization.service';
import {
  DashboardStats,
  DashboardActivity,
  ActivityChartData,
  DistributionChartData,
  TimeRange
} from '../../models/dashboard.model';

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
  private readonly translateService: TranslateService = inject(TranslateService);

  stats: DashboardStats | null = null;
  recentActivity: DashboardActivity[] = [];
  activityData: ActivityChartData | null = null;
  distributionData: DistributionChartData | null = null;

  isLoadingStats: boolean = true;
  isLoadingActivity: boolean = true;
  isLoadingActivityChart: boolean = true;
  isLoadingDistribution: boolean = true;

  selectedTimeRange: TimeRange = 'week';
  activityChartMax: number = 0;

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loadStats();
    this.loadActivity();
    this.loadActivityChart();
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
        this.recentActivity = data.slice(0, 10);
        this.isLoadingActivity = false;
      },
      error: () => {
        this.notificationService.error('ADMIN.DASHBOARD.ERROR.LOAD_ACTIVITY');
        this.isLoadingActivity = false;
      }
    });
  }

  loadActivityChart(): void {
    this.isLoadingActivityChart = true;
    this.dashboardService.getActivityChart(this.selectedTimeRange).subscribe({
      next: (data: ActivityChartData) => {
        this.activityData = data;
        this.activityChartMax = this.calculateChartMax(data);
        this.isLoadingActivityChart = false;
      },
      error: () => {
        this.notificationService.error('ADMIN.DASHBOARD.ERROR.LOAD_CHART');
        this.isLoadingActivityChart = false;
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

  changeTimeRange(range: TimeRange): void {
    this.selectedTimeRange = range;
    this.loadActivityChart();
  }

  calculateChartMax(data: ActivityChartData): number {
    let max: number = 0;
    data.datasets.forEach((dataset: { label: string; data: number[] }) => {
      dataset.data.forEach((value: number) => {
        if (value > max) max = value;
      });
    });
    return max > 0 ? max : 1;
  }

  formatNumber(num: number | undefined): string {
    if (num === undefined) return '0';
    return this.localizationService.formatNumber(num);
  }

  formatPercentage(value: number | undefined): string {
    if (value === undefined) return '0%';
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  formatDate(timestamp: string): string {
    const date: Date = new Date(timestamp);
    return this.localizationService.formatRelativeTime(date);
  }

  getTrendIcon(trend: string): string {
    const icons: Record<string, string> = {
      up: 'trending-up',
      down: 'trending-down',
      neutral: 'remove'
    };
    return icons[trend] || 'remove';
  }

  getTrendColor(trend: string): string {
    const colors: Record<string, string> = {
      up: 'success',
      down: 'danger',
      neutral: 'medium'
    };
    return colors[trend] || 'medium';
  }

  getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      new_user: 'person-add',
      new_housing: 'home',
      new_report: 'warning',
      user_verified: 'checkmark-circle',
      new_channel: 'chatbubbles',
      new_post: 'newspaper'
    };
    return icons[type] || 'information-circle';
  }

  getDistributionMax(): number {
    if (!this.distributionData?.datasets[0]?.data) return 1;
    return Math.max(...this.distributionData.datasets[0].data, 1);
  }

  getContentType(index: number): string {
    const types: string[] = ['housing', 'marketplace', 'jobs', 'carpool'];
    return types[index] || 'default';
  }

  getContentIcon(index: number): string {
    const icons: string[] = ['home', 'bag-handle', 'briefcase', 'car'];
    return icons[index] || 'document';
  }

  getContentLabel(label: string): string {
    const labelMap: Record<string, string> = {
      Housing: 'ADMIN.DASHBOARD.CONTENT.HOUSING_OFFERS',
      Marketplace: 'ADMIN.DASHBOARD.CONTENT.MARKETPLACE_ITEMS',
      Jobs: 'ADMIN.DASHBOARD.CONTENT.JOB_POSTINGS',
      Carpool: 'ADMIN.DASHBOARD.CONTENT.CARPOOL_OFFERS',
      'Housing Offers': 'ADMIN.DASHBOARD.CONTENT.HOUSING_OFFERS',
      Channels: 'ADMIN.DASHBOARD.CONTENT.CHANNELS'
    };
    return labelMap[label] || label;
  }

  translateDatasetLabel(label: string): string {
    const labelMap: Record<string, string> = {
      'New Users': 'ADMIN.DASHBOARD.CHARTS.NEW_USERS',
      'New Housing': 'ADMIN.DASHBOARD.CHARTS.NEW_HOUSING',
      'Activity (Posts & Messages)': 'ADMIN.DASHBOARD.CHARTS.ACTIVITY_POSTS_MESSAGES',
      'Nuevos Usuarios': 'ADMIN.DASHBOARD.CHARTS.NEW_USERS',
      'Actividad (Posts & Mensajes)': 'ADMIN.DASHBOARD.CHARTS.ACTIVITY_POSTS_MESSAGES'
    };
    return labelMap[label] || label;
  }

  getActivityDescription(activity: DashboardActivity): string {
    let description: string = activity.description;

    description = description.replace(' UniRoom', '').replace('UniRoom ', '');

    const joinedMatch: RegExpMatchArray | null = description.match(/(.+) joined$/);
    if (joinedMatch) {
      const username: string = joinedMatch[1];
      return this.translateService.instant('ADMIN.DASHBOARD.ACTIVITY.USER_JOINED', { username });
    }

    const channelMatch: RegExpMatchArray | null = description.match(/New channel created: (.+)$/);
    if (channelMatch) {
      const channelName: string = channelMatch[1];
      return this.translateService.instant('ADMIN.DASHBOARD.ACTIVITY.CHANNEL_CREATED', { name: channelName });
    }

    const postMatch: RegExpMatchArray | null = description.match(/New post created: (.+)$/);
    if (postMatch) {
      const postTitle: string = postMatch[1];
      return this.translateService.instant('ADMIN.DASHBOARD.ACTIVITY.POST_CREATED', { title: postTitle });
    }

    return description;
  }
}
