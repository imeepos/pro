import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RawDataSourceService, RawDataSource } from '@pro/mongodb';
import {
  RawDataFilterDto,
  RawDataStatisticsDto,
  TrendDataInput,
  TrendDataPointDto,
  RawDataItemDto,
  PaginatedRawDataDto,
} from './dto/raw-data.dto';
import { ProcessingStatus, SourceType, SourcePlatform } from '@pro/types';
import {
  RawDataDocument,
  DataStatistics,
  MongoQueryBuilder,
  TimeFormatter
} from './models/raw-data.model';

/**
 * 原始数据服务
 * 负责原始数据的查询、统计、分析等业务逻辑
 */
@Injectable()
export class RawDataService {
  private readonly logger = new Logger(RawDataService.name);

  constructor(
    private readonly rawDataSourceService: RawDataSourceService,
    @InjectModel(RawDataSource.name)
    private readonly rawDataModel: Model<RawDataDocument>,
  ) {}

  /**
   * 获取原始数据列表（分页）
   */
  async findRawData(filter: RawDataFilterDto): Promise<PaginatedRawDataDto> {
    this.logger.log(`查询原始数据，关键词: ${filter.keyword || '无'}, 平台: ${filter.sourcePlatform || '全部'}, 状态: ${filter.status || '全部'}`);

    const query = MongoQueryBuilder.buildQuery(filter);
    const page = filter.page || 1;
    const pageSize = Math.min(filter.pageSize || 20, 100);
    const skip = (page - 1) * pageSize;

    try {
      const [items, total] = await Promise.all([
        this.rawDataModel
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .lean()
          .exec(),
        this.rawDataModel.countDocuments(query).exec()
      ]);

      const totalPages = Math.ceil(total / pageSize);
      const transformedItems = items.map(this.transformToDto);

      this.logger.log(`查询完成，返回 ${transformedItems.length} 条记录，总计 ${total} 条`);

      return {
        items: transformedItems,
        total,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      };
    } catch (error) {
      this.logger.error(`查询原始数据失败: ${error.message}`, error.stack);
      throw new Error('查询原始数据时发生错误');
    }
  }

  /**
   * 根据ID获取单个原始数据
   */
  async findRawDataById(id: string): Promise<RawDataItemDto> {
    this.logger.log(`查询原始数据，ID: ${id}`);

    try {
      const document = await this.rawDataModel.findById(id).lean().exec();

      if (!document) {
        this.logger.warn(`未找到ID为 ${id} 的原始数据`);
        throw new NotFoundException(`未找到ID为 ${id} 的原始数据`);
      }

      return this.transformToDto(document);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`查询原始数据失败，ID: ${id}, 错误: ${error.message}`, error.stack);
      throw new Error('查询原始数据时发生错误');
    }
  }

  /**
   * 获取数据统计信息
   */
  async getStatistics(): Promise<RawDataStatisticsDto> {
    this.logger.log('获取数据统计信息');

    try {
      const pipeline = MongoQueryBuilder.buildStatisticsPipeline();
      const result = await this.rawDataModel.aggregate(pipeline).exec();

      if (result.length === 0) {
        return this.createEmptyStatistics();
      }

      const stats = result[0].statistics || {};
      const total = result[0].total || 0;

      const statistics: RawDataStatisticsDto = {
        pending: stats.pending || 0,
        processing: stats.processing || 0,
        completed: stats.completed || 0,
        failed: stats.failed || 0,
        total,
        successRate: total > 0 ? ((stats.completed || 0) / total) * 100 : 0,
      };

      this.logger.log(`统计信息获取完成: ${JSON.stringify(statistics)}`);
      return statistics;
    } catch (error) {
      this.logger.error(`获取统计信息失败: ${error.message}`, error.stack);
      throw new Error('获取统计信息时发生错误');
    }
  }

  /**
   * 获取趋势数据
   */
  async getTrendData(input: TrendDataInput): Promise<TrendDataPointDto[]> {
    this.logger.log(`获取趋势数据，粒度: ${input.granularity}, 状态: ${input.status || '全部'}`);

    const config = {
      granularity: input.granularity || 'day',
      status: input.status,
      startDate: input.timeRange?.startDate ? new Date(input.timeRange.startDate) : undefined,
      endDate: input.timeRange?.endDate ? new Date(input.timeRange.endDate) : undefined,
    };

    // 设置默认时间范围
    if (!config.startDate) {
      config.startDate = TimeFormatter.getStartDate(config.granularity, 30);
    }

    try {
      const pipeline = MongoQueryBuilder.buildTrendPipeline(config);
      const results = await this.rawDataModel.aggregate(pipeline).exec();

      const trendData = results.map(item => ({
        timestamp: item.timestamp,
        count: item.count,
        status: item.status,
      }));

      this.logger.log(`趋势数据获取完成，返回 ${trendData.length} 个数据点`);
      return trendData;
    } catch (error) {
      this.logger.error(`获取趋势数据失败: ${error.message}`, error.stack);
      throw new Error('获取趋势数据时发生错误');
    }
  }

  /**
   * 获取数据源类型统计（细粒度）
   */
  async getSourceTypeStatistics(): Promise<Record<string, number>> {
    this.logger.log('获取数据源类型统计');

    try {
      const result = await this.rawDataModel.aggregate([
        {
          $group: {
            _id: '$sourceType',
            count: { $sum: 1 }
          }
        }
      ]).exec();

      const statistics = result.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>);

      // 确保所有类型都有值
      Object.values(SourceType).forEach(type => {
        if (!(type in statistics)) {
          statistics[type] = 0;
        }
      });

      this.logger.log(`数据源类型统计完成: ${JSON.stringify(statistics)}`);
      return statistics;
    } catch (error) {
      this.logger.error(`获取数据源类型统计失败: ${error.message}`, error.stack);
      throw new Error('获取数据源类型统计时发生错误');
    }
  }

  /**
   * 清理旧数据
   */
  async cleanupOldData(days: number = 30): Promise<{ deletedCount: number }> {
    this.logger.log(`开始清理 ${days} 天前的已完成数据`);

    try {
      const deletedCount = await this.rawDataSourceService.deleteOldCompleted(days);
      this.logger.log(`清理完成，删除了 ${deletedCount} 条记录`);
      return { deletedCount };
    } catch (error) {
      this.logger.error(`清理旧数据失败: ${error.message}`, error.stack);
      throw new Error('清理旧数据时发生错误');
    }
  }

  /**
   * 重新处理失败的数据
   */
  async retryFailedData(limit: number = 50): Promise<{ updatedCount: number }> {
    this.logger.log(`开始重试失败的数据，限制: ${limit}`);

    try {
      const result = await this.rawDataModel.updateMany(
        { status: ProcessingStatus.FAILED },
        {
          $set: {
            status: ProcessingStatus.PENDING,
            errorMessage: undefined,
            processedAt: undefined
          }
        },
        { limit }
      ).exec();

      this.logger.log(`重试完成，更新了 ${result.modifiedCount} 条记录`);
      return { updatedCount: result.modifiedCount };
    } catch (error) {
      this.logger.error(`重试失败数据时发生错误: ${error.message}`, error.stack);
      throw new Error('重试失败数据时发生错误');
    }
  }

  /**
   * 将MongoDB文档转换为DTO
   */
  private transformToDto(document: any): RawDataItemDto {
    return {
      _id: document._id.toString(),
      sourceType: document.sourceType,
      sourceUrl: document.sourceUrl,
      contentPreview: this.generateContentPreview(document.rawContent),
      contentHash: document.contentHash,
      status: document.status,
      errorMessage: document.errorMessage,
      createdAt: TimeFormatter.toISOString(document.createdAt),
      processedAt: document.processedAt ? TimeFormatter.toISOString(document.processedAt) : undefined,
      metadata: JSON.stringify(document.metadata || {}),
    };
  }

  /**
   * 生成内容预览
   */
  private generateContentPreview(content: string, maxLength: number = 200): string {
    if (!content) {
      return '';
    }

    const cleaned = content.replace(/\s+/g, ' ').trim();
    return cleaned.length > maxLength
      ? cleaned.substring(0, maxLength) + '...'
      : cleaned;
  }

  /**
   * 创建空的统计信息
   */
  private createEmptyStatistics(): RawDataStatisticsDto {
    return {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: 0,
      successRate: 0,
    };
  }
}