import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import {
  MongoQueryBuilder,
  TimeFormatter
} from './models/raw-data.model';

/**
 * 原始数据业务服务
 * 专注于高级业务逻辑：复杂查询、统计分析、趋势计算
 * 数据访问完全委托给 RawDataSourceService
 */
@Injectable()
export class RawDataService {
  private readonly logger = new Logger(RawDataService.name);

  constructor(
    private readonly rawDataSourceService: RawDataSourceService,
  ) {}

  /**
   * 获取原始数据列表（简化版本）
   * 当前版本专注于基础查询，复杂过滤功能待扩展
   */
  async findRawData(filter: RawDataFilterDto): Promise<PaginatedRawDataDto> {
    this.logger.log(`查询原始数据，状态: ${filter.status || '全部'}`);

    // 目前使用基础服务的方法，后续可扩展为更复杂的查询
    const page = filter.page || 1;
    const pageSize = Math.min(filter.pageSize || 20, 100);

    try {
      // 简化实现：目前只支持状态过滤
      const items = filter.status === ProcessingStatus.PENDING
        ? await this.rawDataSourceService.findPending(pageSize)
        : [];

      const transformedItems = items.map(doc => this.transformToDto(doc.toObject()));

      this.logger.log(`查询完成，返回 ${transformedItems.length} 条记录`);

      return {
        items: transformedItems,
        total: transformedItems.length,
        page,
        pageSize,
        totalPages: Math.ceil(transformedItems.length / pageSize),
        hasNext: false,
        hasPrevious: false,
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
      const document = await this.rawDataSourceService.findById(id);

      if (!document) {
        this.logger.warn(`未找到ID为 ${id} 的原始数据`);
        throw new NotFoundException(`未找到ID为 ${id} 的原始数据`);
      }

      return this.transformToDto(document.toObject());
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
      const rawStats = await this.rawDataSourceService.getStatistics();

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

      this.logger.log(`统计信息获取完成: ${JSON.stringify(statistics)}`);
      return statistics;
    } catch (error) {
      this.logger.error(`获取统计信息失败: ${error.message}`, error.stack);
      throw new Error('获取统计信息时发生错误');
    }
  }

  /**
   * 获取趋势数据（简化版本）
   * TODO: 复杂趋势分析功能待数据层扩展支持
   */
  async getTrendData(input: TrendDataInput): Promise<TrendDataPointDto[]> {
    this.logger.log(`获取趋势数据，粒度: ${input.granularity}, 状态: ${input.status || '全部'}`);

    try {
      // 简化实现：返回空数据，防止客户端报错
      this.logger.warn('趋势数据分析功能暂时不可用，等待数据层扩展');
      return [];
    } catch (error) {
      this.logger.error(`获取趋势数据失败: ${error.message}`, error.stack);
      throw new Error('获取趋势数据时发生错误');
    }
  }

  /**
   * 获取数据源类型统计（简化版本）
   * TODO: 待数据层扩展支持复杂聚合查询
   */
  async getSourceTypeStatistics(): Promise<Record<string, number>> {
    this.logger.log('获取数据源类型统计');

    try {
      // 简化实现：返回空统计，确保所有类型都有值
      const statistics: Record<string, number> = {};

      Object.values(SourceType).forEach(type => {
        if (typeof type === 'string') {
          statistics[type] = 0;
        }
      });

      this.logger.warn('数据源类型统计功能暂时不可用，等待数据层扩展');
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
   * 重新处理失败的数据（简化版本）
   * TODO: 待数据层扩展支持批量更新操作
   */
  async retryFailedData(limit: number = 50): Promise<{ updatedCount: number }> {
    this.logger.log(`开始重试失败的数据，限制: ${limit}`);

    try {
      // 简化实现：暂时不支持批量重试
      this.logger.warn('批量重试功能暂时不可用，等待数据层扩展');
      return { updatedCount: 0 };
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