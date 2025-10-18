import { Document } from 'mongoose';
import { ProcessingStatus, SourceType, SourcePlatform } from '@pro/types';

/**
 * MongoDB 原始数据文档接口
 */
export interface RawDataDocument extends Document {
  _id: string;
  sourceType: SourceType;
  sourceUrl: string;
  rawContent: string;
  contentHash: string;
  status: ProcessingStatus;
  metadata?: Record<string, any>;
  errorMessage?: string;
  createdAt: Date;
  processedAt?: Date;
  updatedAt: Date;
}

/**
 * 数据聚合管道接口
 */
export interface AggregationPipeline {
  $match?: Record<string, any>;
  $group?: Record<string, any>;
  $sort?: Record<string, any>;
  $limit?: number;
  $skip?: number;
  $project?: Record<string, any>;
  $addFields?: Record<string, any>;
  $unwind?: string | Record<string, any>;
}

/**
 * 查询构建器接口
 */
export interface QueryBuilder {
  keyword?: string;
  sourcePlatform?: SourcePlatform;
  status?: ProcessingStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

/**
 * 统计数据接口
 */
export interface DataStatistics {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
  successRate: number;
}

/**
 * 趋势数据配置接口
 */
export interface TrendDataConfig {
  granularity: 'hour' | 'day' | 'week' | 'month';
  startDate?: Date;
  endDate?: Date;
  status?: ProcessingStatus;
}

/**
 * 时间格式化工具
 */
export class TimeFormatter {
  /**
   * 格式化日期为 ISO 字符串
   */
  static toISOString(date: Date): string {
    return date.toISOString();
  }

  /**
   * 获取时间段的开始日期
   */
  static getStartDate(granularity: string, periods: number = 30): Date {
    const now = new Date();
    const startDate = new Date(now);

    switch (granularity) {
      case 'hour':
        startDate.setHours(startDate.getHours() - periods);
        break;
      case 'day':
        startDate.setDate(startDate.getDate() - periods);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - (periods * 7));
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - periods);
        break;
      default:
        startDate.setDate(startDate.getDate() - periods);
    }

    return startDate;
  }

  /**
   * 创建日期范围查询条件
   */
  static createDateRangeFilter(startDate?: Date, endDate?: Date): Record<string, any> {
    const filter: Record<string, any> = {};

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = startDate;
      }
      if (endDate) {
        filter.createdAt.$lte = endDate;
      }
    }

    return filter;
  }
}

/**
 * MongoDB 查询构建器
 */
export class MongoQueryBuilder {
  /**
   * 构建查询条件
   */
  static buildQuery(filter: QueryBuilder): Record<string, any> {
    const query: Record<string, any> = {};

    if (filter.keyword) {
      query.$or = [
        { sourceUrl: { $regex: filter.keyword, $options: 'i' } },
        { rawContent: { $regex: filter.keyword, $options: 'i' } },
        { 'metadata.title': { $regex: filter.keyword, $options: 'i' } }
      ];
    }

    if (filter.sourcePlatform) {
      query.sourceType = this.platformToSourceTypes(filter.sourcePlatform);
    }

    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.startDate || filter.endDate) {
      query.createdAt = {};
      if (filter.startDate) {
        query.createdAt.$gte = filter.startDate;
      }
      if (filter.endDate) {
        query.createdAt.$lte = filter.endDate;
      }
    }

    return query;
  }

  /**
   * 将平台类型转换为源类型查询
   */
  private static platformToSourceTypes(platform: SourcePlatform): any {
    switch (platform) {
      case SourcePlatform.WEIBO:
        return { $in: [SourceType.WEIBO_HTML, SourceType.WEIBO_API_JSON, SourceType.WEIBO_COMMENT] };
      case SourcePlatform.JD:
        return SourceType.JD;
      case SourcePlatform.CUSTOM:
        return SourceType.CUSTOM;
      default:
        return platform;
    }
  }

  /**
   * 构建聚合管道用于趋势分析
   */
  static buildTrendPipeline(config: TrendDataConfig): any[] {
    const pipeline: any[] = [];

    // 匹配阶段
    const matchStage: Record<string, any> = {};

    if (config.status) {
      matchStage.status = config.status;
    }

    if (config.startDate || config.endDate) {
      matchStage.createdAt = {};
      if (config.startDate) {
        matchStage.createdAt.$gte = config.startDate;
      }
      if (config.endDate) {
        matchStage.createdAt.$lte = config.endDate;
      }
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // 时间分组阶段
    const groupFormat = this.getGroupDateFormat(config.granularity);
    pipeline.push({
      $group: {
        _id: {
          $dateToString: {
            format: groupFormat,
            date: '$createdAt'
          }
        },
        count: { $sum: 1 },
        status: { $first: '$status' }
      }
    });

    // 排序阶段
    pipeline.push({
      $sort: { '_id': 1 }
    });

    // 投影阶段
    pipeline.push({
      $project: {
        _id: 0,
        timestamp: '$_id',
        count: 1,
        status: 1
      }
    });

    return pipeline;
  }

  /**
   * 获取分组日期格式
   */
  private static getGroupDateFormat(granularity: string): string {
    switch (granularity) {
      case 'hour':
        return '%Y-%m-%d %H:00:00';
      case 'day':
        return '%Y-%m-%d';
      case 'week':
        return '%Y-%U';
      case 'month':
        return '%Y-%m';
      default:
        return '%Y-%m-%d';
    }
  }

  /**
   * 构建统计聚合管道
   */
  static buildStatisticsPipeline(): any[] {
    return [
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          stats: {
            $push: {
              status: '$_id',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      },
      {
        $project: {
          _id: 0,
          statistics: {
            $arrayToObject: {
              $map: {
                input: '$stats',
                as: 'stat',
                in: {
                  k: '$$stat.status',
                  v: '$$stat.count'
                }
              }
            }
          },
          total: 1
        }
      }
    ];
  }
}