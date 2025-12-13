export type JobType = 'full_time' | 'part_time' | 'internship' | 'freelance';
export type JobWorkplace = 'on_site' | 'hybrid' | 'remote';
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
  workplaceType: JobWorkplace;
  location: string;
  salaryPeriod: 'year' | 'month' | 'hour';
  salaryMin?: number;
  salaryMax?: number;
  companyName: string;
  companyDescription?: string;
  companyWebsite?: string;
  companyEmployeeCount?: string;
  logoUrl?: string;
  createdAt: string;
  isActive: boolean;
  isSaved: boolean;
  isApplied: boolean;
  applicationCount: number;
  tags?: string[];
  requirements?: string[];
  niceToHave?: string[];
}

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
