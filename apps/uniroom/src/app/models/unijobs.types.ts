export type JobType = 'full_time' | 'part_time' | 'internship' | 'freelance';
export type JobWorkplace = 'on_site' | 'hybrid' | 'remote';
export type JobSalaryPeriod = 'year' | 'month' | 'hour';

export type JobCategory =
  | 'Technology'
  | 'Marketing'
  | 'Design'
  | 'Sales'
  | 'Finance'
  | 'Human Resources'
  | 'Customer Service'
  | 'Engineering'
  | 'Education'
  | 'Healthcare'
  | 'Other';

export interface JobOffer {
  id: string;
  title: string;
  description: string;
  category: JobCategory;
  jobType: JobType;
  workplaceType?: JobWorkplace;
  location: string;
  salaryPeriod: JobSalaryPeriod;
  salaryMin?: number;
  salaryMax?: number;
  companyName: string;
  companyDescription?: string;
  companyWebsite?: string;
  companyEmployeeCount?: string;
  logoUrl?: string;
  creatorId?: string;
  creatorAvatarUrl?: string;
  createdAt: string;
  isActive: boolean;
  isSaved: boolean;
  isApplied: boolean;
  applicationCount: number;
  tags?: string[];
  requirements?: string[];
  niceToHave?: string[];
}

export interface JobOfferCreate {
  title: string;
  description: string;
  category: JobCategory;
  jobType: JobType;
  location: string;
  salaryPeriod: JobSalaryPeriod;
  companyName: string;
  workplaceType?: JobWorkplace;
  salaryMin?: number;
  salaryMax?: number;
  companyDescription?: string;
  companyWebsite?: string;
  companyEmployeeCount?: string;
  fileIds?: string[];
}

export type JobOfferUpdate = Partial<JobOfferCreate>;

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  location: string;
  jobType: JobType;
  status: 'pending' | 'interview' | 'accepted' | 'rejected';
  appliedAt: string;
  coverLetterPreview?: string;
  resumeFileName?: string;
}

export interface JobsQuery {
  search?: string;
  category?: JobCategory;
  jobTypes?: JobType[];
  locations?: string[];
  page: number;
  pageSize: number;
  savedOnly?: boolean;
  appliedOnly?: boolean;
}

export interface JobApplicationPayload {
  fullName: string;
  email: string;
  phone: string;
  coverLetter?: string;
  resumeFile?: File | null;
}

export interface PagedJobsResult {
  items: JobOffer[];
  total: number;
  page: number;
  pageSize: number;
}
