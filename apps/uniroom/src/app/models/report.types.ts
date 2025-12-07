export enum ReportStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed'
}

export enum ReportPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ReportCategory {
  HOUSING = 'housing',
  MARKETPLACE = 'marketplace',
  CHANNELS = 'channels',
  MESSAGES = 'messages',
  SERVICES = 'services',
  USER = 'user'
}

export enum ReportReason {
  SCAM_FRAUD = 'scam_fraud',
  HARASSMENT = 'harassment',
  SPAM = 'spam',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  FAKE_LISTING = 'fake_listing',
  HATE_SPEECH = 'hate_speech',
  VIOLENCE = 'violence',
  OTHER = 'other'
}

export interface Report {
  id: string;
  reportedBy: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl?: string;
  };
  reportedUser: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl?: string;
  };
  contentType: ReportCategory;
  contentId: string;
  contentTitle?: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  priority: ReportPriority;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: {
    id: string;
    username: string;
    fullName: string;
  };
  reviewedAt?: string;
  resolution?: string;
}

export interface ReportStats {
  total: number;
  pending: number;
  reviewing: number;
  resolved: number;
  dismissed: number;
  critical: number;
}

export interface ReportFilters {
  status?: ReportStatus | 'all';
  priority?: ReportPriority | 'all';
  category?: ReportCategory | 'all';
  reason?: ReportReason | 'all';
  search?: string;
}

export interface ReportActionRequest {
  status: ReportStatus;
  resolution?: string;
  priority?: ReportPriority;
}
