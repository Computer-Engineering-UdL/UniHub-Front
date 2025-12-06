import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { DashboardStats, DashboardActivity, WeeklyChartData, DistributionChartData } from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly apiService: ApiService = inject(ApiService);

  getStats(): Observable<DashboardStats> {
    return this.apiService.get<DashboardStats>('api/v1/dashboard/stats');
  }

  getActivity(): Observable<DashboardActivity[]> {
    return this.apiService.get<DashboardActivity[]>('api/v1/dashboard/activity');
  }

  getWeeklyChart(): Observable<WeeklyChartData> {
    return this.apiService.get<WeeklyChartData>('api/v1/dashboard/charts/weekly');
  }

  getDistributionChart(): Observable<DistributionChartData> {
    return this.apiService.get<DistributionChartData>('api/v1/dashboard/charts/distribution');
  }
}
