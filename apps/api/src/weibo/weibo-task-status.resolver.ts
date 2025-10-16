import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { WeiboTaskStatusConsumer } from './weibo-task-status.consumer';
import { WeiboHourlyStatsService } from './weibo-hourly-stats.service';
import { ConsumerStats } from './interfaces/weibo-task-status.interface';
import { HourlyStatsResponse, HourlyStatsType } from './interfaces/hourly-stats.interface';
import {
  HourlyStatsQueryDto,
  MultiTypeStatsQueryDto,
  StatsAggregationQueryDto,
  BatchHourlyStatsRecordDto,
} from './dto/hourly-stats.dto';

/**
 * 微博任务状态监控接口
 */
@Resolver(() => Object)
export class WeiboTaskStatusResolver {
  private readonly logger = new Logger(WeiboTaskStatusResolver.name);

  constructor(
    private readonly taskStatusConsumer: WeiboTaskStatusConsumer,
    private readonly hourlyStatsService: WeiboHourlyStatsService,
  ) {
    this.logger.log('微博任务状态监控解析器初始化');
  }

  /**
   * 获取消费者统计信息
   */
  @Query(() => Object, { name: 'weiboTaskStatusConsumerStats' })
  async getConsumerStats(): Promise<ConsumerStats> {
    try {
      const stats = await this.taskStatusConsumer.getStats();
      this.logger.debug('获取消费者统计信息', { stats });
      return stats;
    } catch (error) {
      this.logger.error('获取消费者统计信息失败', error);
      throw error;
    }
  }

  /**
   * 重置消费者统计信息
   */
  @Mutation(() => Boolean, { name: 'resetWeiboTaskStatusConsumerStats' })
  async resetConsumerStats(): Promise<boolean> {
    try {
      await this.taskStatusConsumer.resetStats();
      this.logger.log('消费者统计信息已重置');
      return true;
    } catch (error) {
      this.logger.error('重置消费者统计信息失败', error);
      throw error;
    }
  }

  /**
   * 获取小时统计数据
   */
  @Query(() => Object, { name: 'weiboHourlyStats' })
  async getHourlyStats(@Args() query: HourlyStatsQueryDto): Promise<HourlyStatsResponse> {
    try {
      this.logger.debug('获取小时统计数据', { type: query.type });
      return await this.hourlyStatsService.getHourlyStats(query);
    } catch (error) {
      this.logger.error('获取小时统计数据失败', { query, error });
      throw error;
    }
  }

  /**
   * 获取多类型小时统计数据
   */
  @Query(() => Object, { name: 'weiboMultiTypeHourlyStats' })
  async getMultiTypeStats(
    @Args() query: MultiTypeStatsQueryDto,
  ): Promise<Record<HourlyStatsType, HourlyStatsResponse>> {
    try {
      this.logger.debug('获取多类型小时统计数据', { types: query.types });
      return await this.hourlyStatsService.getMultiTypeStats(
        query.types,
        query.startDate,
        query.endDate,
        query.timezone,
      );
    } catch (error) {
      this.logger.error('获取多类型小时统计数据失败', { query, error });
      throw error;
    }
  }

  /**
   * 获取聚合统计数据
   */
  @Query(() => Object, { name: 'weiboAggregatedStats' })
  async getAggregatedStats(@Args() query: StatsAggregationQueryDto): Promise<HourlyStatsResponse> {
    try {
      this.logger.debug('获取聚合统计数据', { type: query.type, interval: query.interval });
      return await this.hourlyStatsService.aggregateStats(
        query.type,
        query.startDate,
        query.endDate,
        query.interval,
      );
    } catch (error) {
      this.logger.error('获取聚合统计数据失败', { query, error });
      throw error;
    }
  }

  /**
   * 批量记录小时统计数据
   */
  @Mutation(() => Boolean, { name: 'recordBatchHourlyStats' })
  async recordBatchHourlyStats(@Args() dto: BatchHourlyStatsRecordDto): Promise<boolean> {
    try {
      const records = dto.records.map(record => ({
        type: record.type,
        timestamp: record.timestamp.getTime(),
        count: record.count,
        metadata: record.metadata,
      }));

      await this.hourlyStatsService.recordHourlyStatsBatch(records);
      this.logger.log(`批量记录小时统计数据成功: ${records.length}条记录`);
      return true;
    } catch (error) {
      this.logger.error('批量记录小时统计数据失败', { dto, error });
      throw error;
    }
  }

  /**
   * 清理过期统计数据
   */
  @Mutation(() => Int, { name: 'cleanupExpiredStats' })
  async cleanupExpiredStats(): Promise<number> {
    try {
      const deletedCount = await this.hourlyStatsService.cleanupExpiredStats();
      this.logger.log(`清理过期统计数据完成: ${deletedCount}个key`);
      return deletedCount;
    } catch (error) {
      this.logger.error('清理过期统计数据失败', error);
      throw error;
    }
  }
}