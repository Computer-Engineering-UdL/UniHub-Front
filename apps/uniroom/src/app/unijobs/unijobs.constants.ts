import { Role } from '../models/auth.types';
import { JobType, JobWorkplace } from '../models/unijobs.types';

export const PROFILE_VERIFICATION_ENABLED = false;

export const JOB_CREATOR_ROLES: Role[] = ['Admin', 'Seller'];

export const JOB_TYPE_TO_API: Record<JobType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  internship: 'Internship',
  freelance: 'Freelance'
};

export const JOB_TYPE_FROM_API: Record<string, JobType> = {
  'Full-time': 'full_time',
  full_time: 'full_time',
  'full-time': 'full_time',
  'Full time': 'full_time',
  'Part-time': 'part_time',
  part_time: 'part_time',
  'part-time': 'part_time',
  'Part time': 'part_time',
  Internship: 'internship',
  internship: 'internship',
  Freelance: 'freelance',
  freelance: 'freelance'
};

export const JOB_TYPE_TRANSLATION_KEYS: Record<JobType, string> = {
  full_time: 'UNIJOBS.JOB_TYPE.FULL_TIME',
  part_time: 'UNIJOBS.JOB_TYPE.PART_TIME',
  internship: 'UNIJOBS.JOB_TYPE.INTERNSHIP',
  freelance: 'UNIJOBS.JOB_TYPE.FREELANCE'
};

export const WORKPLACE_TO_API: Record<JobWorkplace, string> = {
  on_site: 'On-site',
  hybrid: 'Hybrid',
  remote: 'Remote'
};

export const WORKPLACE_FROM_API: Record<string, JobWorkplace> = {
  'On-site': 'on_site',
  on_site: 'on_site',
  'on-site': 'on_site',
  'On site': 'on_site',
  Hybrid: 'hybrid',
  hybrid: 'hybrid',
  Remote: 'remote',
  remote: 'remote'
};
