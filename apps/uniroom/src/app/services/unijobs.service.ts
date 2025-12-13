import { Injectable, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import NotificationService from './notification.service';
import { JobApplication, JobApplicationPayload, JobOffer, JobsQuery, PagedJobsResult } from '../models/unijobs.types';
import { Role, User } from '../models/auth.types';

interface RawPagedResult<T> {
  items?: T[];
  total?: number;
  page?: number;
  page_size?: number;
  pageSize?: number;
}

interface RawJobOffer {
  id: string;
  title: string;
  description: string;
  category: JobOffer['category'];
  job_type?: JobOffer['jobType'];
  jobType?: JobOffer['jobType'];
  workplace_type?: JobOffer['workplaceType'];
  workplaceType?: JobOffer['workplaceType'];
  location: string;
  salary_period?: JobOffer['salaryPeriod'];
  salaryPeriod?: JobOffer['salaryPeriod'];
  salary_min?: number;
  salaryMin?: number;
  salary_max?: number;
  salaryMax?: number;
  company_name?: string;
  companyName?: string;
  company_description?: string;
  companyDescription?: string;
  company_website?: string;
  companyWebsite?: string;
  company_employee_count?: string;
  companyEmployeeCount?: string;
  logo_url?: string;
  logoUrl?: string;
  created_at?: string;
  createdAt?: string;
  is_active?: boolean;
  isActive?: boolean;
  is_saved?: boolean;
  isSaved?: boolean;
  is_applied?: boolean;
  isApplied?: boolean;
  application_count?: number;
  applicationCount?: number;
  tags?: string[];
  requirements?: string[];
  nice_to_have?: string[];
  niceToHave?: string[];
}

interface RawJobApplication extends JobApplication {
  job_id?: string;
  job_title?: string;
  company_name?: string;
  applied_at?: string;
  resume_file_name?: string;
  cover_letter_preview?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UniJobsService {
  private readonly apiService: ApiService = inject(ApiService);
  private readonly authService: AuthService = inject(AuthService);
  private readonly notificationService: NotificationService = inject(NotificationService);

  getJobs(query: JobsQuery): Observable<PagedJobsResult> {
    const params: Record<string, string | number | boolean> = this.serializeQuery(query);
    return this.apiService
      .get<RawPagedResult<RawJobOffer> | RawJobOffer[]>('job', params, undefined, false)
      .pipe(map((response) => this.mapPagedJobs(response)));
  }

  getSavedJobs(query: JobsQuery): Observable<PagedJobsResult> {
    const params: Record<string, string | number | boolean> = this.serializeQuery(query);
    return this.apiService
      .get<RawPagedResult<RawJobOffer> | RawJobOffer[]>('job/saved', params)
      .pipe(map((response) => this.mapPagedJobs(response)));
  }

  getAppliedJobs(query: JobsQuery): Observable<PagedJobsResult> {
    const params: Record<string, string | number | boolean> = this.serializeQuery(query);
    return this.apiService
      .get<RawPagedResult<RawJobOffer> | RawJobOffer[]>('job/applied', params)
      .pipe(map((response) => this.mapPagedJobs(response)));
  }

  getJobDetail(jobId: string): Observable<JobOffer> {
    return this.apiService
      .get<RawJobOffer>(`job/${jobId}`, undefined, undefined, false)
      .pipe(map((response: RawJobOffer) => this.mapJob(response)));
  }

  toggleSave(jobId: string): Observable<boolean> {
    return this.apiService
      .post<{ is_saved: boolean }>(`job/${jobId}/save`, {})
      .pipe(map((response: { is_saved: boolean }) => response.is_saved));
  }

  applyToJob(jobId: string, payload: JobApplicationPayload): Observable<void> {
    const currentUser: User | null = this.authService.currentUser;
    if (!currentUser) {
      this.notificationService.error('UNIJOBS.APPLY.LOGIN_REQUIRED');
      return throwError(() => new Error('User not authenticated'));
    }
    if (!currentUser.isVerified) {
      this.notificationService.error('UNIJOBS.APPLY.VERIFICATION_REQUIRED');
      return throwError(() => new Error('User not verified'));
    }

    const body: FormData | Record<string, string> = this.buildApplicationPayload(payload);
    return this.apiService.post<void, FormData | Record<string, string>>(`job/${jobId}/apply`, body);
  }

  createJob(payload: Partial<JobOffer>): Observable<JobOffer> {
    if (!this.isAdmin()) {
      this.notificationService.error('UNIJOBS.ADMIN.ONLY');
      return throwError(() => new Error('Admin only'));
    }
    return this.apiService
      .post<RawJobOffer>('job', this.mapJobPayload(payload))
      .pipe(map((response: RawJobOffer) => this.mapJob(response)));
  }

  updateJob(jobId: string, payload: Partial<JobOffer>): Observable<JobOffer> {
    if (!this.isAdmin()) {
      this.notificationService.error('UNIJOBS.ADMIN.ONLY');
      return throwError(() => new Error('Admin only'));
    }
    return this.apiService
      .patch<RawJobOffer>(`job/${jobId}`, this.mapJobPayload(payload))
      .pipe(map((response: RawJobOffer) => this.mapJob(response)));
  }

  deleteJob(jobId: string): Observable<void> {
    if (!this.isAdmin()) {
      this.notificationService.error('UNIJOBS.ADMIN.ONLY');
      return throwError(() => new Error('Admin only'));
    }
    return this.apiService.delete<void>(`job/${jobId}`);
  }

  getJobApplications(): Observable<JobApplication[]> {
    return this.apiService
      .get<RawJobApplication[]>('job/applications')
      .pipe(map((apps: RawJobApplication[]) => apps.map((a: RawJobApplication) => this.mapApplication(a))));
  }

  private buildApplicationPayload(payload: JobApplicationPayload): FormData | Record<string, string> {
    if (payload.resumeFile) {
      const formData: FormData = new FormData();
      formData.append('full_name', payload.fullName);
      formData.append('email', payload.email);
      formData.append('phone', payload.phone);
      if (payload.coverLetter) {
        formData.append('cover_letter', payload.coverLetter);
      }
      formData.append('resume', payload.resumeFile);
      return formData;
    }

    const body: Record<string, string> = {
      full_name: payload.fullName,
      email: payload.email,
      phone: payload.phone
    };
    if (payload.coverLetter) {
      body['cover_letter'] = payload.coverLetter;
    }
    return body;
  }

  private serializeQuery(query: JobsQuery): Record<string, string | number | boolean> {
    const params: Record<string, string | number | boolean> = {
      page: query.page,
      page_size: query.pageSize
    };
    if (query.search) {
      params['search'] = query.search;
    }
    if (query.category) {
      params['category'] = query.category;
    }
    if (query.jobTypes?.length) {
      params['job_type'] = query.jobTypes.join(',');
    }
    if (query.locations?.length) {
      params['location'] = query.locations.join(',');
    }
    if (query.savedOnly) {
      params['saved_only'] = true;
    }
    if (query.appliedOnly) {
      params['applied_only'] = true;
    }
    return params;
  }

  private mapPagedJobs(response: RawPagedResult<RawJobOffer> | RawJobOffer[]): PagedJobsResult {
    if ((response as RawPagedResult<RawJobOffer>).items) {
      const paged = response as RawPagedResult<RawJobOffer>;
      return {
        items: (paged.items ?? []).map((item: RawJobOffer) => this.mapJob(item)),
        total: paged.total ?? paged.items?.length ?? 0,
        page: paged.page ?? 1,
        pageSize: paged.page_size ?? paged.pageSize ?? paged.items?.length ?? 0
      };
    }
    const rawItems: RawJobOffer[] = Array.isArray(response) ? response : [];
    const items: JobOffer[] = rawItems.map((item: RawJobOffer) => this.mapJob(item));
    return {
      items,
      total: items.length,
      page: 1,
      pageSize: items.length || 10
    };
  }

  private mapJob(data: RawJobOffer): JobOffer {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      category: data.category,
      jobType: (data.job_type ?? data.jobType)!,
      workplaceType: (data.workplace_type ?? data.workplaceType)!,
      location: data.location,
      salaryPeriod: (data.salary_period ?? data.salaryPeriod)!,
      salaryMin: data.salary_min ?? data.salaryMin,
      salaryMax: data.salary_max ?? data.salaryMax,
      companyName: (data.company_name ?? data.companyName)!,
      companyDescription: data.company_description ?? data.companyDescription,
      companyWebsite: data.company_website ?? data.companyWebsite,
      companyEmployeeCount: data.company_employee_count ?? data.companyEmployeeCount,
      logoUrl: data.logo_url ?? data.logoUrl,
      createdAt: (data.created_at ?? data.createdAt)!,
      isActive: data.is_active ?? data.isActive ?? true,
      isSaved: data.is_saved ?? data.isSaved ?? false,
      isApplied: data.is_applied ?? data.isApplied ?? false,
      applicationCount: data.application_count ?? data.applicationCount ?? 0,
      tags: data.tags,
      requirements: data.requirements,
      niceToHave: data.nice_to_have ?? data.niceToHave
    };
  }

  private mapJobPayload(payload: Partial<JobOffer>): Record<string, string | number | string[] | undefined> {
    return {
      title: payload.title,
      description: payload.description,
      category: payload.category,
      job_type: payload.jobType,
      workplace_type: payload.workplaceType,
      location: payload.location,
      salary_period: payload.salaryPeriod,
      salary_min: payload.salaryMin,
      salary_max: payload.salaryMax,
      company_name: payload.companyName,
      company_description: payload.companyDescription,
      company_website: payload.companyWebsite,
      company_employee_count: payload.companyEmployeeCount,
      logo_url: payload.logoUrl,
      tags: payload.tags
    };
  }

  private mapApplication(data: RawJobApplication): JobApplication {
    return {
      ...data,
      jobId: data.job_id ?? data.jobId,
      jobTitle: data.job_title ?? data.jobTitle,
      companyName: data.company_name ?? data.companyName,
      appliedAt: data.applied_at ?? data.appliedAt,
      resumeFileName: data.resume_file_name ?? data.resumeFileName,
      coverLetterPreview: data.cover_letter_preview ?? data.coverLetterPreview
    };
  }

  private isAdmin(): boolean {
    const user: User | null = this.authService.currentUser;
    const role: Role | undefined = user?.role;
    return role === 'Admin';
  }
}
