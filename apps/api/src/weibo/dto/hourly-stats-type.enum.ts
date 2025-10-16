import { registerEnumType } from '@nestjs/graphql';
import { HourlyStatsType } from '../interfaces/hourly-stats.interface';

/**
 * 小时统计类型 GraphQL 枚举
 */
registerEnumType(HourlyStatsType, {
  name: 'HourlyStatsType',
  description: '小时统计类型',
  valuesMap: {
    TASK_EXECUTION: { description: '任务执行统计' },
    MESSAGE_PROCESSING: { description: '消息处理统计' },
    PERFORMANCE: { description: '性能统计' },
    USER_ACTIVITY: { description: '用户活跃度' },
  },
});

export { HourlyStatsType };