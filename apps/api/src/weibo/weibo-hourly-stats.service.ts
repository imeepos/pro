import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisClient } from '@pro/redis';
import {
  HourlyStatsType,
  HourlyStatsResponse,
  HourlyStatsQuery,
  HourlyStatsRecord,
  HourlyStatsPoint,
  HourlyStatsTimeRange,
  HourlyStatsSummary,
  HOURLY_STATS_TTL,
  HOURLY_STATS_CONFIG,
} from './interfaces/hourly-stats.interface';

/**
 * 小时统计服务
 * 提供按小时维度的数据统计和查询功能，支持曲线图展示
 */
@Injectable()
export class WeiboHourlyStatsService implements OnModuleInit {
  private readonly logger = new Logger(WeiboHourlyStatsService.name);
  private readonly STATS_KEY_PREFIX = 'weibo:hourly:stats';
  private readonly DEFAULT_TIMEZONE = 'Asia/Shanghai';

  constructor(private readonly redisClient: RedisClient) {
    this.logger.log('小时统计服务初始化');
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.redisClient.set('test:hourly:stats:connection', 'ok', 10);
      await this.redisClient.del('test:hourly:stats:connection');
      this.logger.log('小时统计服务连接成功');
    } catch (error) {
      this.logger.error('小时统计服务连接失败', error);
      throw error;
    }
  }

  /**
   * 记录小时统计数据
   */
  async recordHourlyStat(
    type: HourlyStatsType,
    timestamp: Date,
    count: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const hourKey = this.getHourKey(type, timestamp);
      const score = Math.floor(timestamp.getTime() / 1000); // 使用秒作为score

      // 使用 Redis ZINCRBY 原子性地增加值
      await this.redisClient.zincrby(hourKey, count, score.toString());

      // 设置过期时间
      const ttl = this.getTTL(type, timestamp);
      await this.redisClient.expire(hourKey, ttl);

      // 如果有元数据，存储到单独的hash
      if (metadata) {
        const metadataKey = `${hourKey}:metadata:${score}`;
        await this.redisClient.hmset(metadataKey, metadata);
        await this.redisClient.expire(metadataKey, ttl);
      }

      this.logger.debug(`小时统计数据已记录: ${type}`, {
        type,
        timestamp: timestamp.toISOString(),
        count,
        hourKey,
      });
    } catch (error) {
      this.logger.error('记录小时统计数据失败', { type, timestamp, count, error });
      throw error;
    }
  }

  /**
   * 批量记录小时统计数据
   */
  async recordHourlyStatsBatch(records: HourlyStatsRecord[]): Promise<void> {
    if (records.length === 0) return;

    try {
      const pipeline = this.redisClient.pipeline();

      for (const record of records) {
        const timestamp = new Date(record.timestamp);
        const hourKey = this.getHourKey(record.type, timestamp);
        const score = Math.floor(timestamp.getTime() / 1000);

        // 使用 ZINCRBY 原子性增加
        pipeline.zincrby(hourKey, record.count, score.toString());

        // 设置过期时间
        const ttl = this.getTTL(record.type, timestamp);
        pipeline.expire(hourKey, ttl);

        // 处理元数据
        if (record.metadata) {
          const metadataKey = `${hourKey}:metadata:${score}`;
          pipeline.hmset(metadataKey, record.metadata);
          pipeline.expire(metadataKey, ttl);
        }
      }

      await pipeline.exec();

      this.logger.debug(`批量记录小时统计数据完成: ${records.length}条记录`);
    } catch (error) {
      this.logger.error('批量记录小时统计数据失败', { recordCount: records.length, error });
      throw error;
    }
  }

  /**
   * 获取小时统计数据
   */
  async getHourlyStats(query: HourlyStatsQuery): Promise<HourlyStatsResponse> {
    try {
      const { type, startDate, endDate, timezone = this.DEFAULT_TIMEZONE, interval = 'hour' } = query;

      // 验证查询参数
      this.validateQueryParams(startDate, endDate);

      const timeRange = this.formatTimeRange(startDate, endDate, timezone);
      const data = await this.fetchStatsData(type, startDate, endDate, interval);
      const summary = this.calculateSummary(data);

      const response: HourlyStatsResponse = {
        timeRange,
        data,
        summary,
      };

      this.logger.debug(`获取小时统计数据完成: ${type}`, {
        type,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dataPoints: data.length,
      });

      return response;
    } catch (error) {
      this.logger.error('获取小时统计数据失败', { query, error });
      throw error;
    }
  }

  /**
   * 获取多个类型的统计数据
   */
  async getMultiTypeStats(
    types: HourlyStatsType[],
    startDate: Date,
    endDate: Date,
    timezone?: string
  ): Promise<Record<HourlyStatsType, HourlyStatsResponse>> {
    try {
      const results: Record<HourlyStatsType, HourlyStatsResponse> = {} as any;

      const promises = types.map(type =>
        this.getHourlyStats({
          type,
          startDate,
          endDate,
          timezone,
        }).then(result => ({ type, result }))
      );

      const settledResults = await Promise.allSettled(promises);

      for (const settled of settledResults) {
        if (settled.status === 'fulfilled') {
          results[settled.value.type] = settled.value.result;
        } else {
          this.logger.error('获取多类型统计数据失败', { error: settled.reason });
        }
      }

      return results;
    } catch (error) {
      this.logger.error('获取多类型统计数据失败', { types, error });
      throw error;
    }
  }

  /**
   * 聚合统计数据
   */
  async aggregateStats(
    type: HourlyStatsType,
    startDate: Date,
    endDate: Date,
    interval: 'day' | 'week' | 'month'
  ): Promise<HourlyStatsResponse> {
    try {
      // 先获取小时级别数据
      const hourlyQuery: HourlyStatsQuery = {
        type,
        startDate,
        endDate,
        interval: 'hour',
      };

      const hourlyData = await this.getHourlyStats(hourlyQuery);

      // 根据间隔进行聚合
      const aggregatedData = this.aggregateByInterval(hourlyData.data, interval);

      return {
        ...hourlyData,
        data: aggregatedData,
      };
    } catch (error) {
      this.logger.error('聚合统计数据失败', { type, interval, error });
      throw error;
    }
  }

  /**
   * 清理过期统计数据
   */
  async cleanupExpiredStats(): Promise<number> {
    try {
      let deletedCount = 0;
      const pattern = `${this.STATS_KEY_PREFIX}:*`;
      const keys = await this.redisClient.keys(pattern);

      for (const key of keys) {
        const ttl = await this.redisClient.ttl(key);
        if (ttl === -1) { // 没有设置过期时间的key
          // 根据key中的日期判断是否过期
          const dateMatch = key.match(/(\d{4}-\d{2}-\d{2})$/);
          if (dateMatch) {
            const keyDate = new Date(dateMatch[1]);
            const daysDiff = Math.floor((Date.now() - keyDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff > 30) { // 超过30天的数据
              await this.redisClient.del(key);
              deletedCount++;
            }
          }
        }
      }

      this.logger.log(`清理过期统计数据完成: ${deletedCount}个key`);
      return deletedCount;
    } catch (error) {
      this.logger.error('清理过期统计数据失败', error);
      return 0;
    }
  }

  /**
   * 生成Redis键名
   */
  private getHourKey(type: HourlyStatsType, timestamp: Date): string {
    const dateStr = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
    return `${this.STATS_KEY_PREFIX}:${type}:${dateStr}`;
  }

  /**
   * 获取TTL
   */
  private getTTL(type: HourlyStatsType, timestamp: Date): number {
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 1) {
      return HOURLY_STATS_TTL.RECENT_HOURS;
    } else if (daysDiff <= 7) {
      return HOURLY_STATS_TTL.RECENT_DAYS;
    } else {
      return HOURLY_STATS_TTL.HISTORICAL;
    }
  }

  /**
   * 验证查询参数
   */
  private validateQueryParams(startDate: Date, endDate: Date): void {
    const now = new Date();
    const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (startDate > endDate) {
      throw new Error('开始时间不能大于结束时间');
    }

    if (startDate > now) {
      throw new Error('开始时间不能是未来时间');
    }

    if (daysDiff > HOURLY_STATS_CONFIG.MAX_QUERY_DAYS) {
      throw new Error(`查询时间范围不能超过${HOURLY_STATS_CONFIG.MAX_QUERY_DAYS}天`);
    }
  }

  /**
   * 格式化时间范围
   */
  private formatTimeRange(startDate: Date, endDate: Date, timezone: string): HourlyStatsTimeRange {
    return {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      timezone,
    };
  }

  /**
   * 获取统计数据
   */
  private async fetchStatsData(
    type: HourlyStatsType,
    startDate: Date,
    endDate: Date,
    interval: string
  ): Promise<HourlyStatsPoint[]> {
    const data: HourlyStatsPoint[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const hourKey = this.getHourKey(type, current);
      const startScore = Math.floor(current.getTime() / 1000);
      const endScore = Math.floor(new Date(current.getTime() + 60 * 60 * 1000 - 1).getTime() / 1000);

      try {
        // 使用 ZRANGEBYSCORE 获取指定时间范围内的数据
        const results = await this.redisClient.zrangebyscore(
          hourKey,
          startScore,
          endScore,
          true
        );

        let totalCount = 0;
        for (let i = 0; i < results.length; i += 2) {
          totalCount += parseFloat(results[i]);
        }

        data.push({
          hour: current.toISOString(),
          count: totalCount,
        });
      } catch (error) {
        this.logger.warn('获取小时数据失败', { hourKey, startScore, endScore, error });
        data.push({
          hour: current.toISOString(),
          count: 0,
        });
      }

      current.setHours(current.getHours() + 1);
    }

    // 计算趋势和百分比
    this.enrichDataWithMetadata(data);

    return data;
  }

  /**
   * 丰富数据元信息
   */
  private enrichDataWithMetadata(data: HourlyStatsPoint[]): void {
    const total = data.reduce((sum, point) => sum + point.count, 0);

    for (let i = 0; i < data.length; i++) {
      const point = data[i];

      // 计算百分比
      if (total > 0) {
        point.percentage = Math.round((point.count / total) * 100 * 100) / 100;
      }

      // 计算趋势
      if (i > 0) {
        const prevCount = data[i - 1].count;
        if (point.count > prevCount) {
          point.trend = 'up';
        } else if (point.count < prevCount) {
          point.trend = 'down';
        } else {
          point.trend = 'stable';
        }
      }
    }
  }

  /**
   * 计算汇总信息
   */
  private calculateSummary(data: HourlyStatsPoint[]): HourlyStatsSummary {
    const total = data.reduce((sum, point) => sum + point.count, 0);
    const average = data.length > 0 ? Math.round(total / data.length * 100) / 100 : 0;

    let peak: { hour: string; count: number } = { hour: '', count: 0 };
    for (const point of data) {
      if (point.count > peak.count) {
        peak = { hour: point.hour, count: point.count };
      }
    }

    // 计算增长率 (与上一个周期比较)
    let growth: number | undefined;
    if (data.length >= 2) {
      const firstHalf = data.slice(0, Math.floor(data.length / 2));
      const secondHalf = data.slice(Math.floor(data.length / 2));

      const firstHalfSum = firstHalf.reduce((sum, point) => sum + point.count, 0);
      const secondHalfSum = secondHalf.reduce((sum, point) => sum + point.count, 0);

      if (firstHalfSum > 0) {
        growth = Math.round(((secondHalfSum - firstHalfSum) / firstHalfSum) * 100 * 100) / 100;
      }
    }

    return {
      total,
      average,
      peak,
      growth,
    };
  }

  /**
   * 按间隔聚合数据
   */
  private aggregateByInterval(
    data: HourlyStatsPoint[],
    interval: 'day' | 'week' | 'month'
  ): HourlyStatsPoint[] {
    const aggregated = new Map<string, HourlyStatsPoint>();

    for (const point of data) {
      const date = new Date(point.hour);
      let key: string;

      switch (interval) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = date.toISOString().substring(0, 7); // YYYY-MM
          break;
      }

      if (!aggregated.has(key)) {
        aggregated.set(key, {
          hour: key,
          count: 0,
        });
      }

      const existing = aggregated.get(key)!;
      existing.count += point.count;
    }

    return Array.from(aggregated.values()).sort((a, b) => a.hour.localeCompare(b.hour));
  }
}