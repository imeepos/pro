/**
 * Dashboard 统计数据类型
 */
export interface DashboardStats {
  totalScreens: number;
  totalEvents: number;
  totalWeiboAccounts: number;
  totalSearchTasks: number;
}

/**
 * 最近活动类型
 */
export interface RecentActivity {
  type: 'screen' | 'event' | 'weibo' | 'task';
  message: string;
  time: string;
  entityId?: string;
}