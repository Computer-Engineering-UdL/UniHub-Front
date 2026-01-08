import { Injectable, inject } from '@angular/core';
import { Observable, Subject, map, tap, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import NotificationService from './notification.service';
import {
  JobApplication,
  JobApplicationPayload,
  JobOffer,
  JobOfferCreate,
  JobOfferUpdate,
  JobSalaryPeriod,
  JobType,
  JobsQuery,
  PagedJobsResult,
  JobWorkplace
} from '../models/unijobs.types';
import { Role, User } from '../models/auth.types';
import {
  JOB_CREATOR_ROLES,
  JOB_TYPE_FROM_API,
  JOB_TYPE_TO_API,
  PROFILE_VERIFICATION_ENABLED,
  WORKPLACE_FROM_API,
  WORKPLACE_TO_API
} from '../unijobs/unijobs.constants';

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
  job_type?: JobType | string;
  workplace_type?: JobWorkplace | string;
  location: string;
  salary_period?: JobSalaryPeriod;
  salary_min?: number;
  salary_max?: number;
  company_name?: string;
  company_description?: string;
  company_website?: string;
  company_employee_count?: string;
  logo_url?: string;
  user_id?: string;
  creator_avatar_url?: string;
  created_at?: string;
  is_active?: boolean;
  is_saved?: boolean;
  is_applied?: boolean;
  application_count?: number;
  tags?: string[];
  requirements?: string[];
  nice_to_have?: string[];
}

interface RawJobApplication {
  id: string;
  job_id?: string;
  job_title?: string;
  company_name?: string;
  location?: string;
  job_type?: JobType | string;
  status?: JobApplication['status'];
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
  private readonly jobCreatedSubject: Subject<JobOffer> = new Subject<JobOffer>();

  jobCreated$ = this.jobCreatedSubject.asObservable();
  private lastCreatedJob?: JobOffer;

  getJobs(query: JobsQuery): Observable<PagedJobsResult> {
    const params: Record<string, string | number | boolean> = this.serializeQuery(query);
    return this.apiService
      .get<RawPagedResult<RawJobOffer> | RawJobOffer[]>('job/', params, undefined, false)
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
      .pipe(map((response) => this.mapJob(response)));
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
    if (PROFILE_VERIFICATION_ENABLED && !currentUser.isVerified) {
      this.notificationService.error('UNIJOBS.APPLY.VERIFICATION_REQUIRED');
      return throwError(() => new Error('User not verified'));
    }

    const body: FormData | Record<string, string> = this.buildApplicationPayload(payload);
    return this.apiService.post<void, FormData | Record<string, string>>(`job/${jobId}/apply`, body);
  }

  createJob(payload: JobOfferCreate): Observable<JobOffer> {
    if (!this.hasCreatorRole()) {
      this.notificationService.error('UNIJOBS.ADMIN.ONLY');
      return throwError(() => new Error('Admin only'));
    }
    return this.apiService.post<RawJobOffer>('job/', this.mapJobPayload(payload)).pipe(
      map((response: RawJobOffer) => this.mapJob(response)),
      tap((job: JobOffer) => {
        this.lastCreatedJob = job;
        this.jobCreatedSubject.next(job);
      })
    );
  }

  consumeLastCreatedJob(): JobOffer | undefined {
    const job: JobOffer | undefined = this.lastCreatedJob;
    this.lastCreatedJob = undefined;
    return job;
  }

  updateJob(jobId: string, payload: JobOfferUpdate): Observable<JobOffer> {
    if (!this.hasCreatorRole()) {
      this.notificationService.error('UNIJOBS.ADMIN.ONLY');
      return throwError(() => new Error('Admin only'));
    }
    return this.apiService
      .patch<RawJobOffer>(`job/${jobId}`, this.mapJobPayload(payload))
      .pipe(map((response: RawJobOffer) => this.mapJob(response)));
  }

  deleteJob(jobId: string): Observable<void> {
    if (!this.hasCreatorRole()) {
      this.notificationService.error('UNIJOBS.ADMIN.ONLY');
      return throwError(() => new Error('Admin only'));
    }
    return this.apiService.delete<void>(`job/${jobId}`);
  }

  getJobApplications(): Observable<JobApplication[]> {
    return this.apiService
      .get<RawJobApplication[]>('job/applied')
      .pipe(map((apps: RawJobApplication[]) => apps.map((application) => this.mapApplication(application))));
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
    const params: Record<string, string | number | boolean> = {};
    if (query.search) {
      params['search'] = query.search;
    }
    if (query.category) {
      params['category'] = query.category;
    }
    if (query.jobTypes?.length) {
      const mappedTypes: string[] = query.jobTypes
        .map((type: JobType) => JOB_TYPE_TO_API[type])
        .filter((value: string | undefined): value is string => !!value);
      if (mappedTypes.length) {
        params['job_type'] = mappedTypes.join(',');
      }
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
      jobType: this.mapJobTypeFromApi(data.job_type),
      workplaceType: this.mapWorkplaceFromApi(data.workplace_type),
      location: data.location,
      salaryPeriod: data.salary_period ?? 'month',
      salaryMin: data.salary_min,
      salaryMax: data.salary_max,
      companyName: data.company_name ?? '',
      companyDescription: data.company_description,
      companyWebsite: data.company_website,
      companyEmployeeCount: data.company_employee_count,
      logoUrl: data.logo_url,
      creatorId: data.user_id,
      creatorAvatarUrl: data.creator_avatar_url,
      createdAt: data.created_at ?? '',
      isActive: data.is_active ?? true,
      isSaved: data.is_saved ?? false,
      isApplied: data.is_applied ?? false,
      applicationCount: data.application_count ?? 0,
      tags: data.tags,
      requirements: data.requirements,
      niceToHave: data.nice_to_have
    };
  }

  private mapJobPayload(
    payload: JobOfferCreate | JobOfferUpdate
  ): Record<string, string | number | string[] | undefined> {
    return {
      title: payload.title,
      description: payload.description,
      category: payload.category,
      job_type: this.mapJobTypeToApi(payload.jobType),
      workplace_type: this.mapWorkplaceToApi(payload.workplaceType),
      location: payload.location,
      salary_period: payload.salaryPeriod,
      salary_min: payload.salaryMin,
      salary_max: payload.salaryMax,
      company_name: payload.companyName,
      company_description: payload.companyDescription,
      company_website: payload.companyWebsite,
      company_employee_count: payload.companyEmployeeCount,
      file_ids: payload.fileIds
    };
  }

  private mapApplication(data: RawJobApplication): JobApplication {
    return {
      id: data.id,
      jobId: data.job_id ?? '',
      jobTitle: data.job_title ?? '',
      companyName: data.company_name ?? '',
      location: data.location ?? '',
      jobType: this.mapJobTypeFromApi(data.job_type),
      status: data.status ?? 'pending',
      appliedAt: data.applied_at ?? '',
      resumeFileName: data.resume_file_name,
      coverLetterPreview: data.cover_letter_preview
    };
  }

  private hasCreatorRole(): boolean {
    const user: User | null = this.authService.currentUser;
    const role: Role | undefined = user?.role;
    return role ? JOB_CREATOR_ROLES.includes(role) : false;
  }

  private mapJobTypeFromApi(type: JobType | string | undefined): JobType {
    if (!type) {
      return 'full_time';
    }
    if (JOB_TYPE_TO_API[type as JobType]) {
      return type as JobType;
    }
    const mappedType: JobType | undefined = JOB_TYPE_FROM_API[type];
    if (mappedType) {
      return mappedType;
    }
    const normalized: string = type.toString().replace(/[-\s]/g, '_').toLowerCase();
    return (JOB_TYPE_FROM_API[normalized] as JobType) || 'full_time';
  }

  private mapJobTypeToApi(type: JobType | undefined): string | undefined {
    if (!type) {
      return undefined;
    }
    return JOB_TYPE_TO_API[type] ?? type;
  }

  private mapWorkplaceFromApi(type: JobWorkplace | string | undefined): JobWorkplace | undefined {
    if (!type) {
      return undefined;
    }
    if (WORKPLACE_TO_API[type as JobWorkplace]) {
      return type as JobWorkplace;
    }
    return WORKPLACE_FROM_API[type] ?? WORKPLACE_FROM_API[type.toString().toLowerCase()] ?? undefined;
  }

  private mapWorkplaceToApi(type: JobWorkplace | undefined): string | undefined {
    if (!type) {
      return undefined;
    }
    return WORKPLACE_TO_API[type] ?? type;
  }
}
