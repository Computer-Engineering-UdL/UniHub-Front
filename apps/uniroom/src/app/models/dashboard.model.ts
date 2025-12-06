export interface DashboardStats {
  totalUsers: number;
  totalUsersChange: number;
  totalUsersChangeCount: number;
  activeContent: number;
  activeContentChange: number;
  activeContentChangeCount: number;
  pendingReports: number;
  pendingReportsChange: number;
  pendingReportsChangeCount: number;
  engagementRate: number;
  engagementRateChange: number;
  engagementRateChangeValue: number;
}

export interface DashboardActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  user?: {
    name: string;
    avatar?: string;
    initials: string;
  };
}

export interface WeeklyChartData {
  days: Array<{
    label: string;
    newUsers: number;
    posts: number;
    reports: number;
  }>;
  maxValue: number;
}

export interface DistributionChartData {
  housing: {
    count: number;
    max: number;
    percentage: number;
  };
  marketplace: {
    count: number;
    max: number;
    percentage: number;
  };
  jobs: {
    count: number;
    max: number;
    percentage: number;
  };
  carpool: {
    count: number;
    max: number;
    percentage: number;
  };
  services: {
    count: number;
    max: number;
    percentage: number;
  };
}
