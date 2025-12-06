export interface StatCard {
  label: string;
  value: number;
  change_percentage: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface DashboardStats {
  total_users: StatCard;
  active_content: StatCard;
  pending_reports: StatCard;
  engagement_rate: StatCard;
}

export interface DashboardActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  user_avatar?: string;
}

export interface WeeklyChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
}

export interface DistributionChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
}
