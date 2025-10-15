/**
 * API服务统一入口 - 向后兼容导出
 * 推荐使用 @/services/api 替代此文件
 */

// 导出主要API客户端 - 保持向后兼容
export { apiUtils as apiClient } from '@/services/api/client';

// 导出所有API服务
export { CommonAPI } from '@/services/api/common';
export { EventsAPI } from '@/services/api/events';
export { OverviewAPI } from '@/services/api/overview';
export { UsersAPI } from '@/services/api/users';
export { SystemAPI, SystemAPI as systemAPI } from '@/services/api/system';
export { SentimentAPI, SentimentAPI as sentimentAPI } from '@/services/api/sentiment';
export { ChartsAPI } from '@/services/api/charts';

// 导入API模块用于默认导出
import { CommonAPI } from '@/services/api/common';
import { EventsAPI } from '@/services/api/events';
import { OverviewAPI } from '@/services/api/overview';
import { UsersAPI } from '@/services/api/users';
import { SystemAPI } from '@/services/api/system';
import { SentimentAPI } from '@/services/api/sentiment';
import { ChartsAPI } from '@/services/api/charts';

// 向后兼容的默认导出
export default {
  common: CommonAPI,
  events: EventsAPI,
  overview: OverviewAPI,
  users: UsersAPI,
  system: SystemAPI,
  sentiment: SentimentAPI,
  charts: ChartsAPI,
};