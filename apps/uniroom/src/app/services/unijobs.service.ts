import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import NotificationService from './notification.service';
import {
  JobApplication,
  JobApplicationPayload,
  PagedResult,
  UniJob,
  UniJobsQuery
} from '../models/unijobs.types';

@Injectable({
  providedIn: 'root'
})
export class UniJobsService {
  private readonly apiService: ApiService = inject(ApiService);
  private readonly authService: AuthService = inject(AuthService);
  private readonly notificationService: NotificationService = inject(NotificationService);

  getJobs(query: UniJobsQuery): Observable<PagedResult<UniJob>> {
    const params: Record<string, any> = this.serializeQuery(query);
    return this.apiService.get<PagedResult<UniJob>>('jobs', params, undefined, false);
  }

  getJobById(jobId: string): Observable<UniJob> {
    return this.apiService.get<UniJob>(`jobs/${jobId}`, undefined, undefined, false);
  }

  toggleSaveJob(jobId: string): Observable<void> {
    return this.apiService.post<void, Record<string, never>>(`jobs/${jobId}/save`, {});
  }

  applyToJob(jobId: string, payload: JobApplicationPayload): Observable<void> {
    const basePayload: Record<string, any> = {
      full_name: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      cover_letter: payload.coverLetter
    };

    const body: FormData | Record<string, any> = payload.resumeFile
      ? this.buildFormData(payload)
      : basePayload;

    return this.apiService.post<void, FormData | JobApplicationPayload>(`jobs/${jobId}/apply`, body);
  }

  getMyApplications(): Observable<JobApplication[]> {
    return this.apiService.get<JobApplication[]>('jobs/applications');
  }

  createJob(payload: Partial<UniJob>): Observable<UniJob> {
    if (this.authService.currentUser?.role !== 'Admin') {
      this.notificationService.error('UNIJOBS.ADMIN.ONLY');
      return throwError(() => new Error('Admin only'));
    }
    return this.apiService.post<UniJob, Partial<UniJob>>('jobs', payload);
  }

  updateJob(jobId: string, payload: Partial<UniJob>): Observable<UniJob> {
    if (this.authService.currentUser?.role !== 'Admin') {
      this.notificationService.error('UNIJOBS.ADMIN.ONLY');
      return throwError(() => new Error('Admin only'));
    }
    return this.apiService.put<UniJob, Partial<UniJob>>(`jobs/${jobId}`, payload);
  }

  private serializeQuery(query: UniJobsQuery): Record<string, any> {
    const params: Record<string, any> = {
      page: query.page,
      page_size: query.pageSize
    };

    if (query.search) {
      params['search'] = query.search;
    }
    if (query.jobTypes?.length) {
      params['job_types'] = query.jobTypes.join(',');
    }
    if (query.categories?.length) {
      params['categories'] = query.categories.join(',');
    }
    if (query.locations?.length) {
      params['locations'] = query.locations.join(',');
    }
    if (query.remoteOnly !== undefined) {
      params['remote_only'] = query.remoteOnly;
    }
    if (query.minSalary !== undefined) {
      params['min_salary'] = query.minSalary;
    }
    if (query.maxSalary !== undefined) {
      params['max_salary'] = query.maxSalary;
    }
    if (query.savedOnly !== undefined) {
      params['saved_only'] = query.savedOnly;
    }
    if (query.appliedOnly !== undefined) {
      params['applied_only'] = query.appliedOnly;
    }

    return params;
  }

  private buildFormData(payload: JobApplicationPayload): FormData {
    const formData: FormData = new FormData();
    formData.append('full_name', payload.fullName);
    formData.append('email', payload.email);
    formData.append('phone', payload.phone);
    if (payload.coverLetter) {
      formData.append('cover_letter', payload.coverLetter);
    }
    if (payload.resumeFile) {
      formData.append('resume', payload.resumeFile, payload.resumeFile.name);
    }
    return formData;
  }
}
