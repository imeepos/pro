import { Resolver, Query, Args, Int, Mutation } from '@nestjs/graphql';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  EnhancedRawDataFilter,
  EnhancedRawDataItem,
  EnhancedPaginatedRawData,
  EnhancedStatistics,
  EnhancedTrendDataPoint,
  RealtimeMetrics,
  SystemHealth,
  DataExportConfig,
  BatchOperationInput,
  BatchOperationResult,
  DataQualityAnalysisConfig,
  DataQualityAnalysisResult,
  AdvancedTimeRangeFilter,
  AggregationGranularity,
  EnhancedProcessingStatus
} from './dto/enhanced-raw-data.dto';
import { EnhancedRawDataService } from './enhanced-raw-data.service';
import { root } from '@pro/core';

/**
 * 增强的原始数据 GraphQL 解析器
 * 提供Admin后台所需的完整数据查询、分析、导出和监控功能
 */
@Resolver(() => EnhancedRawDataItem)
@UseGuards(JwtAuthGuard)
export class EnhancedRawDataResolver {
  private readonly logger = new Logger(EnhancedRawDataResolver.name);
  private readonly enhancedRawDataService: EnhancedRawDataService
  constructor() {
    this.enhancedRawDataService = root.get(EnhancedRawDataService)
  }

  /**
   * 增强的原始数据列表查询
   */
  @Query(() => EnhancedPaginatedRawData, {
    name: 'enhancedRawDataList',
    description: '获取增强的原始数据列表，支持高级过滤、排序和质量分析'
  })
  async findEnhancedRawDataList(
    @Args('filter', { type: () => EnhancedRawDataFilter, nullable: true })
    filter?: EnhancedRawDataFilter,
  ): Promise<EnhancedPaginatedRawData> {
    const startTime = Date.now();
    this.logger.debug(`增强数据查询开始: ${JSON.stringify(filter || {})}`);

    try {
      const result = await this.enhancedRawDataService.findEnhancedRawData(filter || {});
      const queryTime = Date.now() - startTime;

      this.logger.log(`增强数据查询完成，返回 ${result.items.length} 条记录，耗时 ${queryTime}ms`);
      return {
        ...result,
        queryTime: queryTime.toString()
      };
    } catch (error) {
      this.logger.error(`增强数据查询失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 增强的统计信息查询
   */
  @Query(() => EnhancedStatistics, {
    name: 'enhancedRawDataStatistics',
    description: '获取增强的原始数据统计信息，包含数据源分析和质量指标'
  })
  async getEnhancedStatistics(
    @Args('timeRange', { type: () => AdvancedTimeRangeFilter, nullable: true })
    timeRange?: AdvancedTimeRangeFilter,
  ): Promise<EnhancedStatistics> {
    this.logger.debug(`增强统计查询开始: ${JSON.stringify(timeRange || {})}`);

    try {
      const result = await this.enhancedRawDataService.getEnhancedStatistics(timeRange);
      this.logger.log(`增强统计查询完成: 总计 ${result.total} 条数据`);
      return result;
    } catch (error) {
      this.logger.error(`增强统计查询失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 增强的趋势数据分析
   */
  @Query(() => [EnhancedTrendDataPoint], {
    name: 'enhancedRawDataTrend',
    description: '获取增强的趋势数据，包含成功率和质量指标'
  })
  async getEnhancedTrendData(
    @Args('granularity', { type: () => AggregationGranularity, nullable: true })
    granularity?: AggregationGranularity,
    @Args('timeRange', { type: () => AdvancedTimeRangeFilter, nullable: true })
    timeRange?: AdvancedTimeRangeFilter,
    @Args('statuses', { type: () => [EnhancedProcessingStatus], nullable: true })
    statuses?: EnhancedProcessingStatus[],
  ): Promise<EnhancedTrendDataPoint[]> {
    this.logger.debug(`增强趋势查询: 粒度=${granularity}, 状态=${statuses?.join(',')}`);

    try {
      const result = await this.enhancedRawDataService.getEnhancedTrendData(
        granularity || AggregationGranularity.DAY,
        timeRange,
        statuses
      );
      this.logger.log(`增强趋势查询完成，返回 ${result.length} 个数据点`);
      return result;
    } catch (error) {
      this.logger.error(`增强趋势查询失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 实时监控指标
   */
  @Query(() => [RealtimeMetrics], {
    name: 'realtimeMetrics',
    description: '获取实时监控指标和性能数据'
  })
  async getRealtimeMetrics(
    @Args('metricNames', { type: () => [String], nullable: true })
    metricNames?: string[],
    @Args('timeWindow', { type: () => Int, nullable: true, defaultValue: 24 })
    timeWindow?: number,
  ): Promise<RealtimeMetrics[]> {
    this.logger.debug(`实时指标查询: 指标=${metricNames?.join(',')}, 时间窗口=${timeWindow}h`);

    try {
      const result = await this.enhancedRawDataService.getRealtimeMetrics(metricNames, timeWindow);
      this.logger.log(`实时指标查询完成，返回 ${result.length} 个指标`);
      return result;
    } catch (error) {
      this.logger.error(`实时指标查询失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 系统健康状态
   */
  @Query(() => SystemHealth, {
    name: 'systemHealth',
    description: '获取系统整体健康状态和性能指标'
  })
  async getSystemHealth(): Promise<SystemHealth> {
    this.logger.debug('系统健康状态查询');

    try {
      const result = await this.enhancedRawDataService.getSystemHealth();
      this.logger.log(`系统健康查询完成: 状态=${result.status}, 得分=${result.healthScore}`);
      return result;
    } catch (error) {
      this.logger.error(`系统健康查询失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 数据质量分析
   */
  @Query(() => DataQualityAnalysisResult, {
    name: 'dataQualityAnalysis',
    description: '执行数据质量分析并生成详细报告'
  })
  async analyzeDataQuality(
    @Args('config', { type: () => DataQualityAnalysisConfig })
    config: DataQualityAnalysisConfig,
  ): Promise<DataQualityAnalysisResult> {
    this.logger.debug(`数据质量分析开始: ${JSON.stringify(config)}`);

    try {
      const result = await this.enhancedRawDataService.analyzeDataQuality(config);
      this.logger.log(`数据质量分析完成: 分析ID=${result.analysisId}, 总量=${result.totalAnalyzed}`);
      return result;
    } catch (error) {
      this.logger.error(`数据质量分析失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 数据导出
   */
  @Mutation(() => BatchOperationResult, {
    name: 'exportRawData',
    description: '导出原始数据到指定格式'
  })
  async exportRawData(
    @Args('config', { type: () => DataExportConfig })
    config: DataExportConfig,
  ): Promise<BatchOperationResult> {
    this.logger.debug(`数据导出开始: 格式=${config.format}`);

    try {
      const result = await this.enhancedRawDataService.exportRawData(config);
      this.logger.log(`数据导出完成: 操作ID=${result.operationId}, 文件=${result.exportFileUrl}`);
      return result;
    } catch (error) {
      this.logger.error(`数据导出失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 批量数据操作
   */
  @Mutation(() => BatchOperationResult, {
    name: 'batchDataOperation',
    description: '执行批量数据操作（重试、取消、归档、删除等）'
  })
  async executeBatchOperation(
    @Args('input', { type: () => BatchOperationInput })
    input: BatchOperationInput,
  ): Promise<BatchOperationResult> {
    this.logger.debug(`批量操作开始: 类型=${input.operationType}`);

    try {
      const result = await this.enhancedRawDataService.executeBatchOperation(input);
      this.logger.log(`批量操作完成: 成功=${result.successful}, 失败=${result.failed}`);
      return result;
    } catch (error) {
      this.logger.error(`批量操作失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}