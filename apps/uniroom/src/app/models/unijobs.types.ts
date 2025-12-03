export type JobType = 'full_time' | 'part_time' | 'internship' | 'freelance';
export type JobLocationType = 'on_site' | 'remote' | 'hybrid';

export interface UniJob {
  id: string;
  title: string;
  companyName: string;
  companyLogoUrl?: string;
  jobType: JobType;
  categories: string[];
  locationCity: string;
  locationCountry?: string;
  locationType: JobLocationType;
  minSalary?: number;
  maxSalary?: number;
  salaryPeriod?: 'month' | 'year' | 'hour';
  currency?: string;
  postedAt: string;
  isSaved: boolean;
  isApplied: boolean;
  tags: string[];
  description: string;
  requirements: string[];
  niceToHave: string[];
  companySize?: string;
  companyIndustry?: string;
  companyWebsite?: string;
}

export type ApplicationStatus = 'pending' | 'interview' | 'accepted' | 'rejected';

export interface UniJobsQuery {
  search?: string;
  jobTypes?: JobType[];
  categories?: string[];
  locations?: string[];
  remoteOnly?: boolean;
  minSalary?: number;
  maxSalary?: number;
  savedOnly?: boolean;
  appliedOnly?: boolean;
  page: number;
  pageSize: number;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  locationCity: string;
  jobType: JobType;
  status: ApplicationStatus;
  appliedAt: string;
  resumeFileName?: string;
  coverLetterPreview?: string;
}

export interface JobApplicationPayload {
  fullName: string;
  email: string;
  phone: string;
  coverLetter?: string;
  resumeFile?: File;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
