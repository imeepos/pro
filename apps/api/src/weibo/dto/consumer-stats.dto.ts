import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

/**
 * 消费者处理统计信息 GraphQL 对象类型
 */
@ObjectType('ConsumerStats')
export class ConsumerStatsDto {
  /** 总处理消息数 */
  @Field(() => Int, { description: '总处理消息数' })
  totalMessages: number;

  /** 成功处理数 */
  @Field(() => Int, { description: '成功处理数' })
  successCount: number;

  /** 失败处理数 */
  @Field(() => Int, { description: '失败处理数' })
  failureCount: number;

  /** 重试处理数 */
  @Field(() => Int, { description: '重试处理数' })
  retryCount: number;

  /** 平均处理时间（毫秒） */
  @Field(() => Float, { description: '平均处理时间（毫秒）' })
  avgProcessingTime: number;

  /** 最后处理时间 */
  @Field(() => Date, { description: '最后处理时间', nullable: true })
  lastProcessedAt?: Date;
}