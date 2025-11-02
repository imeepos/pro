import { Injectable } from '@pro/core';
import { RawDataSourceService } from '@pro/mongodb';
import {
  RawDataFilterDto,
  RawDataStatisticsDto,
  TrendDataInput,
  TrendDataPointDto,
  RawDataItemDto,
  PaginatedRawDataDto,
} from './dto/raw-data.dto';
import { ProcessingStatus, SourceType, SourcePlatform } from '@pro/types';
import { TimeFormatter } from './models/raw-data.model';
import { Inject, Logger, NotFoundException } from '@nestjs/common';

/**
 * 原始数据业务服务 - 数字时代的数据编排艺术
 *
 * 遵循"存在即合理"的设计哲学：
 * - 每个方法都承载独特的业务价值
 * - 数据访问完全委托给 RawDataSourceService
 * - 错误处理优雅而有意义
 * - 日志表达系统的思想脉络
 */
@Injectable()
export class RawDataService {
  private readonly logger = new Logger(RawDataService.name);

  constructor(
    @Inject(RawDataSourceService) private readonly rawDataSourceService: RawDataSourceService,
  ) {}

  /**
   * 获取原始数据列表 - 数据的诗意流淌
   */
  async findRawData(filter: RawDataFilterDto): Promise<PaginatedRawDataDto> {
    this.logger.log(`数据查询启航: ${this.describeFilter(filter)}`);

    const queryOptions = this.buildQueryOptions(filter);

    try {
      const result = await this.rawDataSourceService.findWithFilters(queryOptions);
      const transformedItems = result.items.map(doc => this.transformToDto(doc.toObject()));

      this.logger.log(`数据之旅完成: 共${result.total}条记录，返回${transformedItems.length}条`);

      return {
        items: transformedItems,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrevious: result.hasPrevious,
      };
    } catch (error) {
      this.logger.error(`数据查询遭遇挫折: ${error.message}`, error.stack);
      throw this.createBusinessError('数据查询失败，请稍后重试');
    }
  }

  /**
   * 根据ID获取单个原始数据 - 精准定位数据的灵魂
   */
  async findRawDataById(id: string): Promise<RawDataItemDto> {
    this.logger.log(`寻觅数据精魂: ${id}`);

    try {
      // 验证ID格式
      if (!id || id.trim().length === 0) {
        this.logger.warn(`无效的数据ID: ${id}`);
        throw new NotFoundException('数据ID不能为空');
      }

      const document = await this.rawDataSourceService.findById(id);

      if (!document) {
        this.logger.warn(`数据精魂不在此处: ${id}`);
        throw new NotFoundException(`数据记录不存在，请确认ID是否正确`);
      }

      const result = this.transformToDto(document.toObject());
      this.logger.log(`数据精魂成功捕获: ${id}`);
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`寻觅数据精魂遇阻: ${id} - ${error.message}`, error.stack);
      throw this.createBusinessError('数据检索失败，请确认记录ID是否正确');
    }
  }

  /**
   * 获取数据统计信息 - 数字的诗篇，洞察数据之韵律
   */
  async getStatistics(): Promise<RawDataStatisticsDto> {
    this.logger.log('数据统计之诗开始吟诵');

    try {
      const rawStats = await this.rawDataSourceService.getStatistics();
      const statistics = this.composeStatisticsSymphony(rawStats);

      this.logger.log(`数据统计华章完成: 总量${statistics.total}，成功率${statistics.successRate.toFixed(1)}%`);
      return statistics;
    } catch (error) {
      this.logger.error(`数据统计遭遇阻碍: ${error.message}`, error.stack);
      throw this.createBusinessError('统计信息获取失败，请稍后重试');
    }
  }

  /**
   * 获取趋势数据 - 时间的轨迹，数据的生命律动
   */
  async getTrendData(input: TrendDataInput): Promise<TrendDataPointDto[]> {
    this.logger.log(`时间轨迹探索启动: ${input.granularity}粒度，${input.status || '全维度'}观察`);

    try {
      const trendOptions = this.buildTrendQueryOptions(input);
      const rawTrendData = await this.rawDataSourceService.getTrendData(trendOptions);

      const trendPoints = rawTrendData.map(point => ({
        timestamp: point.timestamp,
        count: point.count,
        status: input.status,
      }));

      this.logger.log(`时间轨迹绘制完成: 共${trendPoints.length}个时间节点`);
      return trendPoints;
    } catch (error) {
      this.logger.error(`时间轨迹探索受阻: ${error.message}`, error.stack);
      throw this.createBusinessError('趋势数据分析失败，请检查查询参数');
    }
  }

  /**
   * 获取数据源类型统计 - 数据谱系的分布画卷
   */
  async getSourceTypeStatistics(): Promise<Record<string, number>> {
    this.logger.log('数据谱系分析启动');

    try {
      const rawStats = await this.rawDataSourceService.getSourceTypeStatistics();
      const completeStats = this.ensureCompleteSourceTypeStats(rawStats);

      this.logger.log(`数据谱系画卷完成: 共${Object.keys(completeStats).length}种数据源类型`);
      return completeStats;
    } catch (error) {
      this.logger.error(`数据谱系分析遇阻: ${error.message}`, error.stack);
      throw this.createBusinessError('数据源统计失败，请稍后重试');
    }
  }

  /**
   * 清理旧数据 - 时光的清道夫，为新数据腾出空间
   */
  async cleanupOldData(days: number = 30): Promise<{ deletedCount: number }> {
    this.logger.log(`时光清道夫启动: 清理${days}天前的完成数据`);

    try {
      const deletedCount = await this.rawDataSourceService.deleteOldCompleted(days);
      this.logger.log(`时光清道完成: 已清理${deletedCount}条历史记录`);
      return { deletedCount };
    } catch (error) {
      this.logger.error(`时光清道遇阻: ${error.message}`, error.stack);
      throw this.createBusinessError('数据清理失败，请稍后重试');
    }
  }

  /**
   * 重新处理失败的数据 - 给失败以重生的机会
   */
  async retryFailedData(limit: number = 50): Promise<{ updatedCount: number }> {
    this.logger.log(`数据重生计划启动: 最多重试${limit}条失败记录`);

    try {
      const updatedCount = await this.rawDataSourceService.retryFailedData(limit);
      this.logger.log(`数据重生完成: ${updatedCount}条记录获得新生`);
      return { updatedCount };
    } catch (error) {
      this.logger.error(`数据重生受阻: ${error.message}`, error.stack);
      throw this.createBusinessError('数据重试失败，请稍后再试');
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
   * 描述查询过滤器 - 为日志提供诗意的表达
   */
  private describeFilter(filter: RawDataFilterDto): string {
    const parts: string[] = [];

    if (filter.status) parts.push(`状态:${filter.status}`);
    if (filter.sourceType) parts.push(`类型:${filter.sourceType}`);
    if (filter.sourcePlatform) parts.push(`平台:${filter.sourcePlatform}`);
    if (filter.keyword) parts.push(`关键词:${filter.keyword}`);
    if (filter.timeRange?.startDate) parts.push(`起始:${filter.timeRange.startDate}`);
    if (filter.timeRange?.endDate) parts.push(`终止:${filter.timeRange.endDate}`);
    if (filter.page) parts.push(`页码:${filter.page}`);
    if (filter.pageSize) parts.push(`页数:${filter.pageSize}`);

    return parts.length > 0 ? parts.join(', ') : '无条件查询';
  }

  /**
   * 构建查询选项 - 将用户意图转化为数据库语言
   */
  private buildQueryOptions(filter: RawDataFilterDto) {
    const options: any = {
      page: filter.page || 1,
      pageSize: Math.min(filter.pageSize || 20, 100),
    };

    if (filter.status) {
      options.status = filter.status;
    }

    // 优先使用 sourceType，其次才映射 sourcePlatform
    if (filter.sourceType) {
      options.sourceType = filter.sourceType;
    } else if (filter.sourcePlatform) {
      const mappedType = this.mapSourcePlatformToType(filter.sourcePlatform);
      if (mappedType) {
        options.sourceType = mappedType;
      }
    }

    if (filter.keyword) {
      options.keyword = filter.keyword;
    }

    if (filter.timeRange?.startDate) {
      options.startDate = new Date(filter.timeRange.startDate);
    }

    if (filter.timeRange?.endDate) {
      options.endDate = new Date(filter.timeRange.endDate);
    }

    return options;
  }

  /**
   * 构建趋势查询选项 - 时光织梦者的参数设计
   */
  private buildTrendQueryOptions(input: TrendDataInput) {
    const options: {
      granularity: 'hour' | 'day' | 'week' | 'month';
      status?: ProcessingStatus;
      startDate?: Date;
      endDate?: Date;
    } = {
      granularity: input.granularity || 'day',
    };

    if (input.status) {
      options.status = input.status;
    }

    if (input.timeRange?.startDate) {
      options.startDate = new Date(input.timeRange.startDate);
    }

    if (input.timeRange?.endDate) {
      options.endDate = new Date(input.timeRange.endDate);
    }

    return options;
  }

  /**
   * 将平台类型映射为源类型
   */
  private mapSourcePlatformToType(platform?: SourcePlatform): SourceType | undefined {
    if (!platform) return undefined;

    switch (platform) {
      case SourcePlatform.WEIBO:
        return SourceType.WEIBO_HTML;
      case SourcePlatform.JD:
        return SourceType.JD;
      case SourcePlatform.CUSTOM:
        return SourceType.CUSTOM;
      default:
        return undefined;
    }
  }

  /**
   * 编织统计信息的交响乐
   */
  private composeStatisticsSymphony(rawStats: Record<string, number>): RawDataStatisticsDto {
    const statistics: RawDataStatisticsDto = {
      pending: rawStats[ProcessingStatus.PENDING] || 0,
      processing: rawStats[ProcessingStatus.PROCESSING] || 0,
      completed: rawStats[ProcessingStatus.COMPLETED] || 0,
      failed: rawStats[ProcessingStatus.FAILED] || 0,
      total: Object.values(rawStats).reduce((sum, count) => sum + count, 0),
      successRate: 0,
    };

    if (statistics.total > 0) {
      statistics.successRate = (statistics.completed / statistics.total) * 100;
    }

    return statistics;
  }

  /**
   * 确保数据源类型统计的完整性
   */
  private ensureCompleteSourceTypeStats(rawStats: Record<string, number>): Record<string, number> {
    const completeStats: Record<string, number> = {};

    Object.values(SourceType).forEach(type => {
      if (typeof type === 'string') {
        completeStats[type] = rawStats[type] || 0;
      }
    });

    return completeStats;
  }

  /**
   * 系统健康检查 - 数据之根的生命力探测
   */
  async checkHealth(): Promise<{ isHealthy: boolean; details?: any }> {
    try {
      await this.rawDataSourceService.getStatistics();
      return { isHealthy: true };
    } catch (error) {
      this.logger.error(`健康检查失败: ${error.message}`, error.stack);
      return {
        isHealthy: false,
        details: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * 创建业务错误 - 优雅的错误表达
   */
  private createBusinessError(message: string): Error {
    const error = new Error(message);
    error.name = 'BusinessError';
    return error;
  }

}