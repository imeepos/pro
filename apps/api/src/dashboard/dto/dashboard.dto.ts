export interface DashboardStats {
  totalScreens: number;
  totalEvents: number;
  totalWeiboAccounts: number;
  totalSearchTasks: number;
}

export interface RecentActivity {
  type: 'screen' | 'event' | 'weibo' | 'task';
  message: string;
  time: string;
  entityId?: string;
}