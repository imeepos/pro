import { ObjectType, Field } from '@nestjs/graphql';
import { HourlyStatsResponseDto } from './hourly-stats-response.dto';

/**
 * 多类型小时统计数据 GraphQL 对象类型
 */
@ObjectType('MultiTypeHourlyStats')
export class MultiTypeHourlyStatsDto {
  @Field(() => HourlyStatsResponseDto, { description: '任务执行统计', nullable: true })
  task_execution?: HourlyStatsResponseDto;

  @Field(() => HourlyStatsResponseDto, { description: '消息处理统计', nullable: true })
  message_processing?: HourlyStatsResponseDto;

  @Field(() => HourlyStatsResponseDto, { description: '性能统计', nullable: true })
  performance?: HourlyStatsResponseDto;

  @Field(() => HourlyStatsResponseDto, { description: '用户活跃度', nullable: true })
  user_activity?: HourlyStatsResponseDto;
}