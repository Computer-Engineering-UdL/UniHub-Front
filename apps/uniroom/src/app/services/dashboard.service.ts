import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  DashboardStats,
  DashboardActivity,
  ActivityChartData,
  DistributionChartData,
  ChannelsChartData,
  TimeRange
} from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly apiService: ApiService = inject(ApiService);

  getStats(): Observable<DashboardStats> {
    return this.apiService.get<DashboardStats>('dashboard/stats');
  }

  getActivity(): Observable<DashboardActivity[]> {
    return this.apiService.get<DashboardActivity[]>('dashboard/activity');
  }

  getActivityChart(timeRange: TimeRange = 'week'): Observable<ActivityChartData> {
    return this.apiService.get<ActivityChartData>(`dashboard/charts/activity?time_range=${timeRange}`);
  }

  getDistributionChart(): Observable<DistributionChartData> {
    return this.apiService.get<DistributionChartData>('dashboard/charts/distribution');
  }

  getChannelsChart(): Observable<ChannelsChartData> {
    return this.apiService.get<ChannelsChartData>('dashboard/charts/channels');
  }
}
