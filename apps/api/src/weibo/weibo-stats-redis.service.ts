import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisClient } from '@pro/redis';
import { ConsumerStats } from './interfaces/weibo-task-status.interface';

/**
 * Redis 统计服务
 * 提供微博任务状态消费者的持久化统计功能
 */
@Injectable()
export class WeiboStatsRedisService implements OnModuleInit {
  private readonly logger = new Logger(WeiboStatsRedisService.name);
  private readonly STATS_KEY = 'weibo:consumer:stats';
  private readonly MAX_PROCESSING_TIME_SAMPLES = 100;
  private readonly STATS_TTL = 30 * 24 * 60 * 60; // 30天过期

  constructor(private readonly redisClient: RedisClient) {
    this.logger.log('Redis统计服务初始化');
  }

  async onModuleInit(): Promise<void> {
    // 测试 Redis 连接
    try {
      await this.redisClient.set('test:connection', 'ok', 10);
      await this.redisClient.del('test:connection');
      this.logger.log('Redis统计服务连接成功');
    } catch (error) {
      this.logger.error('Redis统计服务连接失败', error);
      throw error;
    }
  }

  /**
   * 获取消费者统计信息
   */
  async getStats(): Promise<ConsumerStats> {
    try {
      const statsData = await this.redisClient.get<any>(this.STATS_KEY);

      if (!statsData) {
        return {
          totalMessages: 0,
          successCount: 0,
          failureCount: 0,
          retryCount: 0,
          avgProcessingTime: 0,
        };
      }

      return {
        totalMessages: statsData.totalMessages || 0,
        successCount: statsData.successCount || 0,
        failureCount: statsData.failureCount || 0,
        retryCount: statsData.retryCount || 0,
        avgProcessingTime: statsData.avgProcessingTime || 0,
        lastProcessedAt: statsData.lastProcessedAt
          ? new Date(statsData.lastProcessedAt)
          : undefined,
      };
    } catch (error) {
      this.logger.error('获取统计信息失败', error);
      // 返回默认统计信息
      return {
        totalMessages: 0,
        successCount: 0,
        failureCount: 0,
        retryCount: 0,
        avgProcessingTime: 0,
      };
    }
  }

  /**
   * 增加消息计数
   */
  async incrementMessageCount(result: 'success' | 'failure' | 'retry'): Promise<void> {
    try {
      const stats = await this.getStats();

      // 更新计数
      stats.totalMessages += 1;
      if (result === 'success') stats.successCount += 1;
      else if (result === 'failure') stats.failureCount += 1;
      else if (result === 'retry') stats.retryCount += 1;

      stats.lastProcessedAt = new Date();

      // 保存到 Redis
      await this.redisClient.set(this.STATS_KEY, stats, this.STATS_TTL);

      this.logger.debug(`消息计数更新: ${result}`, {
        totalMessages: stats.totalMessages,
        [`${result}Count`]: stats[`${result}Count` as keyof ConsumerStats],
      });
    } catch (error) {
      this.logger.error('增加消息计数失败', { result, error });
      throw error;
    }
  }

  /**
   * 更新平均处理时间
   */
  async updateAverageProcessingTime(processingTime: number): Promise<void> {
    try {
      const stats = await this.getStats();

      // 获取当前处理时间列表
      const processingTimesKey = `${this.STATS_KEY}:processing_times`;
      let processingTimes = await this.redisClient.get<number[]>(processingTimesKey) || [];

      // 添加新的处理时间
      processingTimes.push(processingTime);

      // 保持列表长度在限制内
      if (processingTimes.length > this.MAX_PROCESSING_TIME_SAMPLES) {
        processingTimes = processingTimes.slice(-this.MAX_PROCESSING_TIME_SAMPLES);
      }

      // 计算新的平均处理时间
      const avgTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
      stats.avgProcessingTime = avgTime;

      // 保存处理时间列表和统计信息
      await this.redisClient.set(processingTimesKey, processingTimes, this.STATS_TTL);
      await this.redisClient.set(this.STATS_KEY, stats, this.STATS_TTL);

      this.logger.debug(`平均处理时间更新: ${avgTime.toFixed(2)}ms`, {
        sampleCount: processingTimes.length,
        newSampleTime: processingTime,
      });
    } catch (error) {
      this.logger.error('更新平均处理时间失败', { processingTime, error });
      throw error;
    }
  }

  /**
   * 重置统计信息
   */
  async resetStats(): Promise<void> {
    try {
      await this.redisClient.del(this.STATS_KEY);
      await this.redisClient.del(`${this.STATS_KEY}:processing_times`);
      this.logger.log('Redis统计信息已重置');
    } catch (error) {
      this.logger.error('重置统计信息失败', error);
      throw error;
    }
  }

  /**
   * 批量更新统计信息
   */
  async updateStats(result: 'success' | 'failure' | 'retry', processingTime: number): Promise<void> {
    try {
      const stats = await this.getStats();

      // 更新消息计数
      stats.totalMessages += 1;
      if (result === 'success') stats.successCount += 1;
      else if (result === 'failure') stats.failureCount += 1;
      else if (result === 'retry') stats.retryCount += 1;

      stats.lastProcessedAt = new Date();

      // 获取并更新处理时间列表
      const processingTimesKey = `${this.STATS_KEY}:processing_times`;
      let processingTimes = await this.redisClient.get<number[]>(processingTimesKey) || [];
      processingTimes.push(processingTime);

      // 保持列表长度在限制内
      if (processingTimes.length > this.MAX_PROCESSING_TIME_SAMPLES) {
        processingTimes = processingTimes.slice(-this.MAX_PROCESSING_TIME_SAMPLES);
      }

      // 计算新的平均处理时间
      const avgTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
      stats.avgProcessingTime = avgTime;

      // 保存所有数据
      await Promise.all([
        this.redisClient.set(this.STATS_KEY, stats, this.STATS_TTL),
        this.redisClient.set(processingTimesKey, processingTimes, this.STATS_TTL),
      ]);

      this.logger.debug(`批量统计更新完成`, {
        result,
        processingTime,
        totalMessages: stats.totalMessages,
        avgProcessingTime: avgTime,
      });
    } catch (error) {
      this.logger.error('批量更新统计信息失败', { result, processingTime, error });
      throw error;
    }
  }

  /**
   * 获取详细统计信息（包含原始处理时间数据）
   */
  async getDetailedStats(): Promise<ConsumerStats & { processingTimes: number[] }> {
    try {
      const [stats, processingTimes] = await Promise.all([
        this.getStats(),
        this.getProcessingTimes(),
      ]);

      return {
        ...stats,
        processingTimes,
      };
    } catch (error) {
      this.logger.error('获取详细统计信息失败', error);
      throw error;
    }
  }

  /**
   * 获取处理时间样本
   */
  async getProcessingTimes(): Promise<number[]> {
    try {
      const processingTimesKey = `${this.STATS_KEY}:processing_times`;
      const times = await this.redisClient.get<number[]>(processingTimesKey);
      return times || [];
    } catch (error) {
      this.logger.error('获取处理时间样本失败', error);
      return [];
    }
  }

  /**
   * 检查 Redis 服务是否可用
   */
  async isRedisAvailable(): Promise<boolean> {
    try {
      await this.redisClient.set('test:availability', 'ok', 5);
      await this.redisClient.del('test:availability');
      return true;
    } catch (error) {
      this.logger.error('Redis 服务不可用', error);
      return false;
    }
  }
}