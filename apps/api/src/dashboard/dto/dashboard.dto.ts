import { DashboardActivityType } from '@pro/types';

export interface DashboardStats {
  totalScreens: number;
  totalEvents: number;
  totalWeiboAccounts: number;
  totalSearchTasks: number;
}

export interface RecentActivity {
  type: DashboardActivityType;
  message: string;
  time: string;
  entityId?: string;
}