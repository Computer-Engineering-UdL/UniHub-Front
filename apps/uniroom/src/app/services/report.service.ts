import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Report, ReportActionRequest, ReportFilters, ReportPriority, ReportStats } from '../models/report.types';

export interface ReportsResponse {
  reports: Report[];
  total: number;
}

export interface BulkActionRequest {
  reportIds: string[];
  action: ReportActionRequest;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private readonly apiService: ApiService = inject(ApiService);

  getReportStats(): Observable<ReportStats> {
    return this.apiService.get<ReportStats>('admin/reports/stats');
  }

  getReports(page: number, size: number, searchTerm?: string, filters?: ReportFilters): Observable<ReportsResponse> {
    const params: Record<string, any> = {
      page,
      size
    };

    if (searchTerm) {
      params['search'] = searchTerm;
    }

    if (filters?.status && filters.status !== 'all') {
      params['status'] = filters.status;
    }

    if (filters?.priority && filters.priority !== 'all') {
      params['priority'] = filters.priority;
    }

    if (filters?.category && filters.category !== 'all') {
      params['category'] = filters.category;
    }

    if (filters?.reason && filters.reason !== 'all') {
      params['reason'] = filters.reason;
    }

    return this.apiService.get<ReportsResponse>('admin/reports', params);
  }

  updateReportStatus(reportId: string, action: ReportActionRequest): Observable<void> {
    return this.apiService.patch<void>(`admin/reports/${reportId}`, action);
  }

  updateReportPriority(reportId: string, priority: ReportPriority): Observable<void> {
    return this.apiService.patch<void>(`admin/reports/${reportId}`, { priority });
  }

  deleteReport(reportId: string): Observable<void> {
    return this.apiService.delete<void>(`admin/reports/${reportId}`);
  }

  bulkUpdateReports(reportIds: string[], action: ReportActionRequest): Observable<void> {
    const request: BulkActionRequest = {
      reportIds,
      action
    };
    return this.apiService.patch<void>('admin/reports/bulk', request);
  }
}
