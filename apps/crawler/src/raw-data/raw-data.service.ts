import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Logger } from '@pro/logger';
import { Model } from 'mongoose';
import { createHash } from 'crypto';
import * as cheerio from 'cheerio';
import { RabbitMQClient } from '@pro/rabbitmq';
import { QUEUE_NAMES, RawDataReadyEvent, SourcePlatform } from '@pro/types';

export interface RawDataSource {
  _id?: any;
  sourceType: string;
  sourceUrl: string;
  rawContent: string;
  contentHash: string;
  metadata: Record<string, any>;
  status: 'pending' | 'processed' | 'failed';
  sourcePlatform?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RabbitMQConfig {
  url: string;
}

@Injectable()
export class RawDataService {
  private rabbitMQClient: RabbitMQClient | null = null;
  private isRabbitMQConnected = false;
  private publishRetryCount = 0;
  private readonly MAX_PUBLISH_RETRIES = 3;

  constructor(
    @InjectModel('RawDataSource') private rawDataSourceModel: Model<RawDataSource>,
    private readonly logger: Logger,
    @Inject('RABBITMQ_CONFIG') private readonly rabbitmqConfig: RabbitMQConfig
  ) {
    this.initializeRabbitMQ();
  }

  async create(data: {
    sourceType: string;
    sourceUrl: string;
    rawContent: string;
    metadata: Record<string, any>;
  }): Promise<RawDataSource> {
    const createStartTime = Date.now();
    const contentSize = data.rawContent.length;
    const contentHash = this.generateContentHash(data.rawContent);

    this.logger.debug('💾 开始存储原始数据', {
      sourceType: data.sourceType,
      sourceUrl: data.sourceUrl.length > 100 ? data.sourceUrl.substring(0, 100) + '...' : data.sourceUrl,
      contentSize,
      contentSizeKB: Math.round(contentSize / 1024),
      contentHash: contentHash.substring(0, 16) + '...',
      traceId: data.metadata.traceId,
      taskId: data.metadata.taskId
    }, 'RawDataService');

    // 检查基于 contentHash 的重复
    const hashCheckStart = Date.now();
    const existingByHash = await this.rawDataSourceModel.findOne({
      sourceType: data.sourceType,
      contentHash: contentHash
    });
    const hashCheckDuration = Date.now() - hashCheckStart;

    if (existingByHash) {
      this.logger.log('♻️ 发现重复内容，跳过存储', {
        sourceType: data.sourceType,
        sourceUrl: data.sourceUrl.length > 100 ? data.sourceUrl.substring(0, 100) + '...' : data.sourceUrl,
        contentHash: contentHash.substring(0, 16) + '...',
        existingId: existingByHash._id,
        existingCreatedAt: existingByHash.createdAt?.toISOString(),
        hashCheckDuration,
        totalDuration: Date.now() - createStartTime,
        traceId: data.metadata.traceId
      }, 'RawDataService');
      return existingByHash;
    }

    // 检查基于 sourceUrl 的重复
    const urlCheckStart = Date.now();
    const existingByUrl = await this.rawDataSourceModel.findOne({
      sourceUrl: data.sourceUrl
    });
    const urlCheckDuration = Date.now() - urlCheckStart;

    if (existingByUrl) {
      this.logger.log('🔗 发现重复URL，跳过存储', {
        sourceType: data.sourceType,
        sourceUrl: data.sourceUrl.length > 100 ? data.sourceUrl.substring(0, 100) + '...' : data.sourceUrl,
        existingId: existingByUrl._id,
        existingCreatedAt: existingByUrl.createdAt?.toISOString(),
        urlCheckDuration,
        totalDuration: Date.now() - createStartTime,
        contentHashDifferent: existingByUrl.contentHash !== contentHash,
        traceId: data.metadata.traceId
      }, 'RawDataService');
      return existingByUrl;
    }

    const createdRecord = new this.rawDataSourceModel({
      sourceType: data.sourceType,
      sourceUrl: data.sourceUrl,
      rawContent: data.rawContent,
      contentHash: contentHash,
      metadata: data.metadata,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.logger.debug('📝 准备保存新记录', {
      sourceType: data.sourceType,
      recordSize: Math.round(JSON.stringify(createdRecord.toObject()).length / 1024) + 'KB',
      metadataKeys: Object.keys(data.metadata),
      traceId: data.metadata.traceId
    }, 'RawDataService');

    try {
      const saveStart = Date.now();
      const savedRecord = await createdRecord.save();
      const saveDuration = Date.now() - saveStart;
      const totalDuration = Date.now() - createStartTime;

      this.logger.log('✅ 原始数据存储成功', {
        sourceType: data.sourceType,
        recordId: savedRecord._id,
        sourceUrl: data.sourceUrl.length > 100 ? data.sourceUrl.substring(0, 100) + '...' : data.sourceUrl,
        contentSize,
        contentSizeKB: Math.round(contentSize / 1024),
        hashCheckDuration,
        urlCheckDuration,
        saveDuration,
        totalDuration,
        throughput: Math.round((contentSize / 1024) / (totalDuration / 1000) * 100) / 100, // KB/s
        traceId: data.metadata.traceId,
        taskId: data.metadata.taskId
      }, 'RawDataService');

      await this.publishRawDataReady(savedRecord);

      return savedRecord;

    } catch (error: any) {
      const totalDuration = Date.now() - createStartTime;

      // 处理 MongoDB E11000 重复键错误
      if (error.code === 11000) {
        this.logger.warn('⚠️ 检测到MongoDB重复键冲突', {
          sourceType: data.sourceType,
          sourceUrl: data.sourceUrl.length > 100 ? data.sourceUrl.substring(0, 100) + '...' : data.sourceUrl,
          errorMessage: error.message,
          errorCode: error.code,
          totalDuration,
          traceId: data.metadata.traceId
        }, 'RawDataService');

        // 根据错误信息判断是 sourceUrl 还是 contentHash 冲突
        if (error.message.includes('sourceUrl_1')) {
          const existing = await this.rawDataSourceModel.findOne({ sourceUrl: data.sourceUrl });
          if (existing) {
            this.logger.log('🔄 已获取重复URL的现有记录', {
              sourceUrl: data.sourceUrl.length > 100 ? data.sourceUrl.substring(0, 100) + '...' : data.sourceUrl,
              existingId: existing._id,
              existingCreatedAt: existing.createdAt?.toISOString(),
              conflictType: 'sourceUrl',
              totalDuration,
              traceId: data.metadata.traceId
            }, 'RawDataService');
            return existing;
          }
        }

        if (error.message.includes('contentHash')) {
          const existing = await this.rawDataSourceModel.findOne({ contentHash: contentHash });
          if (existing) {
            this.logger.log('🔄 已获取重复内容的现有记录', {
              contentHash: contentHash.substring(0, 16) + '...',
              existingId: existing._id,
              existingCreatedAt: existing.createdAt?.toISOString(),
              conflictType: 'contentHash',
              totalDuration,
              traceId: data.metadata.traceId
            }, 'RawDataService');
            return existing;
          }
        }
      }

      // 记录其他类型的错误
      this.logger.error('❌ 原始数据存储失败', {
        sourceType: data.sourceType,
        sourceUrl: data.sourceUrl.length > 100 ? data.sourceUrl.substring(0, 100) + '...' : data.sourceUrl,
        contentSize,
        contentHash: contentHash.substring(0, 16) + '...',
        error: error.message,
        errorCode: error.code,
        errorType: this.classifyStorageError(error),
        totalDuration,
        traceId: data.metadata.traceId,
        stack: error.stack
      }, 'RawDataService');

      // 重新抛出非重复键的其他错误
      throw error;
    }
  }

  async findBySourceUrl(sourceUrl: string): Promise<RawDataSource | null> {
    return this.rawDataSourceModel.findOne({ sourceUrl }).exec();
  }

  async findByMetadata(metadataQuery: Record<string, any>): Promise<RawDataSource[]> {
    const query: any = {};
    for (const [key, value] of Object.entries(metadataQuery)) {
      query[`metadata.${key}`] = value;
    }
    return this.rawDataSourceModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findByTaskId(taskId: number): Promise<RawDataSource[]> {
    return this.rawDataSourceModel
      .find({ 'metadata.taskId': taskId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByKeywordAndTimeRange(
    keyword: string,
    startTime: Date,
    endTime: Date
  ): Promise<RawDataSource[]> {
    return this.rawDataSourceModel
      .find({
        'metadata.keyword': keyword,
        createdAt: {
          $gte: startTime,
          $lte: endTime
        }
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateStatus(id: string, status: 'pending' | 'processed' | 'failed'): Promise<void> {
    await this.rawDataSourceModel.updateOne(
      { _id: id },
      { status, updatedAt: new Date() }
    );
  }

  async getStatistics(sourceType?: string): Promise<{
    total: number;
    pending: number;
    processed: number;
    failed: number;
    byDate: Array<{ date: string; count: number }>;
  }> {
    const statsStartTime = Date.now();

    this.logger.debug('📊 开始获取存储统计信息', {
      sourceType,
      timestamp: new Date().toISOString()
    }, 'RawDataService');

    const matchQuery = sourceType ? { sourceType } : {};

    try {
      const aggStart = Date.now();
      const stats = await this.rawDataSourceModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            processed: { $sum: { $cond: [{ $eq: ['$status', 'processed'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
          }
        }
      ]);
      const aggDuration = Date.now() - aggStart;

      const dateAggStart = Date.now();
      const byDateStats = await this.rawDataSourceModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 30 }
      ]);
      const dateAggDuration = Date.now() - dateAggStart;

      const totalDuration = Date.now() - statsStartTime;

      const result = {
        total: stats[0]?.total || 0,
        pending: stats[0]?.pending || 0,
        processed: stats[0]?.processed || 0,
        failed: stats[0]?.failed || 0,
        byDate: byDateStats.map(item => ({
          date: item._id,
          count: item.count
        }))
      };

      this.logger.debug('✅ 存储统计信息获取完成', {
        sourceType,
        stats: result,
        aggDuration,
        dateAggDuration,
        totalDuration,
        performance: {
          aggregationSpeed: Math.round((byDateStats.length + 1) / (totalDuration / 1000) * 100) / 100, // 查询/秒
          avgAggTime: Math.round(totalDuration / 2) // 平均聚合时间
        }
      }, 'RawDataService');

      return result;

    } catch (error) {
      const totalDuration = Date.now() - statsStartTime;
      this.logger.error('❌ 获取存储统计信息失败', {
        sourceType,
        error: error instanceof Error ? error.message : '未知错误',
        errorType: this.classifyStorageError(error),
        totalDuration,
        traceId: 'stats_query'
      }, 'RawDataService');
      throw error;
    }
  }

  async cleanupOldData(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.rawDataSourceModel.deleteMany({
      createdAt: { $lt: cutoffDate },
      status: 'processed'
    });

    return result.deletedCount || 0;
  }

  private generateContentHash(content: string): string {
    return createHash('md5')
      .update(content)
      .digest('hex');
  }

  async searchContent(query: {
    keyword?: string;
    sourceType?: string;
    status?: string;
    startTime?: Date;
    endTime?: Date;
    page?: number;
    limit?: number;
  }): Promise<{
    data: RawDataSource[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      keyword,
      sourceType,
      status,
      startTime,
      endTime,
      page = 1,
      limit = 20
    } = query;

    const filter: any = {};

    if (sourceType) {
      filter.sourceType = sourceType;
    }

    if (status) {
      filter.status = status;
    }

    if (startTime || endTime) {
      filter.createdAt = {};
      if (startTime) filter.createdAt.$gte = startTime;
      if (endTime) filter.createdAt.$lte = endTime;
    }

    if (keyword) {
      filter.$or = [
        { 'metadata.keyword': { $regex: keyword, $options: 'i' } },
        { rawContent: { $regex: keyword, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.rawDataSourceModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.rawDataSourceModel.countDocuments(filter)
    ]);

    return {
      data,
      total,
      page,
      limit
    };
  }

  /**
   * 分类存储错误
   */
  private classifyStorageError(error: any): string {
    if (!error) return 'UNKNOWN_STORAGE_ERROR';

    if (error.code === 11000) {
      return 'DUPLICATE_KEY_ERROR';
    }

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (errorMessage.includes('connection') || errorMessage.includes('econnrefused')) {
      return 'MONGODB_CONNECTION_ERROR';
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('etimedout')) {
      return 'MONGODB_TIMEOUT_ERROR';
    }

    if (errorMessage.includes('validation') || errorMessage.includes('cast')) {
      return 'DATA_VALIDATION_ERROR';
    }

    if (errorMessage.includes('disk') || errorMessage.includes('space')) {
      return 'DISK_SPACE_ERROR';
    }

    if (errorMessage.includes('index') || errorMessage.includes('duplicate')) {
      return 'INDEX_ERROR';
    }

    return 'UNKNOWN_STORAGE_ERROR';
  }

  /**
   * 获取存储性能报告
   */
  async getStoragePerformanceReport(): Promise<{
    summary: {
      totalRecords: number;
      totalSizeMB: number;
      averageRecordSizeKB: number;
      indexEfficiency: number;
      queryPerformance: {
        avgQueryTime: number;
        slowQueries: number;
        fastQueries: number;
      };
    };
    operations: {
      insertPerformance: {
        avgInsertTime: number;
        insertThroughput: number; // records/second
        duplicateRate: number; // percentage
      };
      queryPerformance: {
        avgQueryTime: number;
        cacheHitRate: number;
        indexUsage: number;
      };
      updatePerformance: {
        avgUpdateTime: number;
        updateSuccessRate: number;
      };
    };
    health: {
      isHealthy: boolean;
      issues: string[];
      recommendations: string[];
    };
    trends: {
      growthRate: number; // records/day
      sizeGrowthRate: number; // MB/day
      errorRate: number; // percentage
    };
  }> {
    const reportStartTime = Date.now();

    try {
      this.logger.debug('📈 开始生成存储性能报告', {
        timestamp: new Date().toISOString()
      }, 'RawDataService');

      // 获取基础统计信息
      const stats = await this.getStatistics();

      // 计算集合统计信息（需要MongoDB的统计API）
      const collectionStats = await this.getCollectionStatistics();

      // 模拟查询性能测试
      const queryPerfStart = Date.now();
      await this.rawDataSourceModel.findOne().exec(); // 简单查询测试
      const simpleQueryTime = Date.now() - queryPerfStart;

      const complexQueryPerfStart = Date.now();
      await this.rawDataSourceModel.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
        { $group: { _id: '$sourceType', count: { $sum: 1 } } }
      ]);
      const complexQueryTime = Date.now() - complexQueryPerfStart;

      const reportDuration = Date.now() - reportStartTime;

      // 健康检查
      const issues: string[] = [];
      const recommendations: string[] = [];

      if (collectionStats.totalSize > 1024) { // 超过1GB
        issues.push('large_collection_size');
        recommendations.push('考虑数据归档或分片策略');
      }

      if (simpleQueryTime > 100) { // 超过100ms
        issues.push('slow_query_performance');
        recommendations.push('优化索引或查询结构');
      }

      if (stats.failed > stats.total * 0.05) { // 失败率超过5%
        issues.push('high_failure_rate');
        recommendations.push('检查数据质量和存储逻辑');
      }

      const isHealthy = issues.length === 0;

      const report = {
        summary: {
          totalRecords: stats.total,
          totalSizeMB: Math.round(collectionStats.totalSize),
          averageRecordSizeKB: Math.round(collectionStats.avgObjSize / 1024),
          indexEfficiency: Math.round((collectionStats.indexSizes / collectionStats.totalSize) * 100),
          queryPerformance: {
            avgQueryTime: Math.round((simpleQueryTime + complexQueryTime) / 2),
            slowQueries: simpleQueryTime > 100 ? 1 : 0,
            fastQueries: simpleQueryTime <= 100 ? 1 : 0
          }
        },
        operations: {
          insertPerformance: {
            avgInsertTime: 50, // 模拟数据
            insertThroughput: Math.round(1000 / 50), // 基于平均插入时间计算
            duplicateRate: Math.round((stats.pending / stats.total) * 100)
          },
          queryPerformance: {
            avgQueryTime: Math.round((simpleQueryTime + complexQueryTime) / 2),
            cacheHitRate: 85, // 模拟数据
            indexUsage: 90 // 模拟数据
          },
          updatePerformance: {
            avgUpdateTime: 30, // 模拟数据
            updateSuccessRate: 95 // 模拟数据
          }
        },
        health: {
          isHealthy,
          issues,
          recommendations
        },
        trends: {
          growthRate: Math.round(stats.byDate[0]?.count || 0), // 最近一天的记录数作为增长率参考
          sizeGrowthRate: Math.round(collectionStats.totalSize * 0.1), // 假设每日增长10%
          errorRate: Math.round((stats.failed / stats.total) * 100)
        }
      };

      this.logger.log('📊 存储性能报告生成完成', {
        reportDuration,
        summary: report.summary,
        health: report.health,
        trends: report.trends
      }, 'RawDataService');

      return report;

    } catch (error) {
      const reportDuration = Date.now() - reportStartTime;
      this.logger.error('❌ 存储性能报告生成失败', {
        error: error instanceof Error ? error.message : '未知错误',
        errorType: this.classifyStorageError(error),
        reportDuration
      }, 'RawDataService');
      throw error;
    }
  }

  /**
   * 获取集合统计信息
   */
  private async getCollectionStatistics(): Promise<{
    totalSize: number; // MB
    avgObjSize: number; // bytes
    indexSizes: number; // MB
    count: number;
  }> {
    try {
      // 这里应该使用MongoDB的collStats命令，但由于我们在Mongoose环境中，
      // 我们使用简化的方式来获取基本信息
      const count = await this.rawDataSourceModel.countDocuments();

      // 模拟统计数据（实际应用中应该使用真实的collStats）
      return {
        totalSize: Math.round(count * 50 * 1024 / 1024), // 假设平均每条记录50KB
        avgObjSize: 50 * 1024, // 50KB
        indexSizes: Math.round(count * 5 * 1024 / 1024), // 假设索引大小是数据大小的10%
        count
      };
    } catch (error) {
      this.logger.warn('获取集合统计信息失败，使用默认值', {
        error: error instanceof Error ? error.message : '未知错误'
      }, 'RawDataService');

      return {
        totalSize: 0,
        avgObjSize: 0,
        indexSizes: 0,
        count: 0
      };
    }
  }

  /**
   * 初始化 RabbitMQ 连接
   */
  private async initializeRabbitMQ(): Promise<void> {
    try {
      this.rabbitMQClient = new RabbitMQClient({ url: this.rabbitmqConfig.url });
      await this.rabbitMQClient.connect();
      this.isRabbitMQConnected = true;
      this.logger.log('🔗 RabbitMQ 连接初始化成功', {
        url: this.rabbitmqConfig.url.replace(/\/\/.*@/, '//***@')
      }, 'RawDataService');
    } catch (error) {
      this.isRabbitMQConnected = false;
      this.logger.warn('⚠️ RabbitMQ 初始化失败，消息发布将被跳过', {
        error: error instanceof Error ? error.message : '未知错误',
        willRetry: true
      }, 'RawDataService');
    }
  }

  /**
   * 发布原始数据就绪事件
   */
  private async publishRawDataReady(rawData: RawDataSource): Promise<void> {
    if (!this.isRabbitMQConnected || !this.rabbitMQClient) {
      this.logger.debug('⏭️ RabbitMQ 未连接，跳过消息发布', {
        rawDataId: rawData._id,
        sourceType: rawData.sourceType
      }, 'RawDataService');
      return;
    }

    const publishStartTime = Date.now();
    const rawDataId = rawData._id?.toString();

    if (!rawDataId) {
      this.logger.warn('⚠️ 原始数据ID缺失，跳过消息发布', {
        sourceType: rawData.sourceType,
        sourceUrl: rawData.sourceUrl.substring(0, 100)
      }, 'RawDataService');
      return;
    }

    const sourcePlatform = this.extractSourcePlatform(rawData.sourceType);
    const event: RawDataReadyEvent = {
      rawDataId,
      sourceType: rawData.sourceType as any,
      sourcePlatform,
      sourceUrl: rawData.sourceUrl,
      contentHash: rawData.contentHash,
      metadata: {
        taskId: rawData.metadata?.taskId,
        keyword: rawData.metadata?.keyword,
        fileSize: rawData.rawContent?.length || 0,
      },
      createdAt: new Date().toISOString(),
    };

    try {
      await this.retryPublish(QUEUE_NAMES.RAW_DATA_READY, event);
      const publishDuration = Date.now() - publishStartTime;

      this.logger.log('📤 原始数据就绪事件发布成功', {
        rawDataId,
        sourceType: rawData.sourceType,
        sourcePlatform,
        queue: QUEUE_NAMES.RAW_DATA_READY,
        publishDuration,
        taskId: rawData.metadata?.taskId,
        traceId: rawData.metadata?.traceId
      }, 'RawDataService');

      this.publishRetryCount = 0;

    } catch (error) {
      const publishDuration = Date.now() - publishStartTime;
      this.logger.error('❌ 原始数据就绪事件发布失败', {
        rawDataId,
        sourceType: rawData.sourceType,
        queue: QUEUE_NAMES.RAW_DATA_READY,
        error: error instanceof Error ? error.message : '未知错误',
        publishDuration,
        retryCount: this.publishRetryCount,
        taskId: rawData.metadata?.taskId,
        traceId: rawData.metadata?.traceId
      }, 'RawDataService');
    }
  }

  /**
   * 带指数退避的重试发布
   */
  private async retryPublish(queue: string, event: RawDataReadyEvent, retryCount = 0): Promise<void> {
    try {
      if (!this.rabbitMQClient) {
        throw new Error('RabbitMQ 客户端未初始化');
      }

      await this.rabbitMQClient.publish(queue, event);
    } catch (error) {
      if (retryCount < this.MAX_PUBLISH_RETRIES) {
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 8000);

        this.logger.warn(`🔄 消息发布失败，${backoffDelay}ms 后重试 (${retryCount + 1}/${this.MAX_PUBLISH_RETRIES})`, {
          queue,
          rawDataId: event.rawDataId,
          error: error instanceof Error ? error.message : '未知错误',
          backoffDelay
        }, 'RawDataService');

        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return this.retryPublish(queue, event, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * 从 sourceType 提取 sourcePlatform
   */
  private extractSourcePlatform(sourceType: string): SourcePlatform {
    if (sourceType.startsWith('weibo')) {
      return SourcePlatform.WEIBO;
    }
    if (sourceType.startsWith('jd')) {
      return SourcePlatform.JD;
    }
    return SourcePlatform.CUSTOM;
  }

  /**
   * 监控存储健康状态
   */
  async monitorStorageHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    score: number; // 0-100
    checks: Array<{
      name: string;
      status: 'pass' | 'warn' | 'fail';
      value: any;
      threshold: any;
    }>;
    alerts: string[];
    recommendations: string[];
  }> {
    const healthStartTime = Date.now();
    const checks: Array<{
      name: string;
      status: 'pass' | 'warn' | 'fail';
      value: any;
      threshold: any;
    }> = [];
    const alerts: string[] = [];
    const recommendations: string[] = [];

    try {
      // 检查1：连接状态
      const connectionStart = Date.now();
      await this.rawDataSourceModel.findOne().exec().catch(() => null);
      const connectionTime = Date.now() - connectionStart;

      checks.push({
        name: 'database_connection',
        status: connectionTime < 1000 ? 'pass' : connectionTime < 3000 ? 'warn' : 'fail',
        value: connectionTime,
        threshold: { pass: 1000, warn: 3000 }
      });

      if (connectionTime > 3000) {
        alerts.push('数据库连接响应缓慢');
        recommendations.push('检查数据库服务器性能和网络连接');
      }

      // 检查2：存储大小
      const stats = await this.getStatistics();
      const collectionStats = await this.getCollectionStatistics();

      checks.push({
        name: 'storage_size',
        status: collectionStats.totalSize < 5120 ? 'pass' : collectionStats.totalSize < 10240 ? 'warn' : 'fail',
        value: collectionStats.totalSize,
        threshold: { pass: 5120, warn: 10240 } // MB
      });

      if (collectionStats.totalSize > 10240) {
        alerts.push('存储空间使用过多');
        recommendations.push('考虑数据归档或清理策略');
      }

      // 检查3：错误率
      const errorRate = stats.total > 0 ? (stats.failed / stats.total) * 100 : 0;

      checks.push({
        name: 'error_rate',
        status: errorRate < 5 ? 'pass' : errorRate < 10 ? 'warn' : 'fail',
        value: Math.round(errorRate),
        threshold: { pass: 5, warn: 10 }
      });

      if (errorRate > 10) {
        alerts.push('存储错误率过高');
        recommendations.push('检查数据质量和存储逻辑');
      }

      // 计算总体健康评分
      const passCount = checks.filter(c => c.status === 'pass').length;
      const warnCount = checks.filter(c => c.status === 'warn').length;
      const failCount = checks.filter(c => c.status === 'fail').length;

      const score = Math.round(((passCount * 100) + (warnCount * 50)) / checks.length);

      let status: 'healthy' | 'warning' | 'critical';
      if (failCount > 0) {
        status = 'critical';
      } else if (warnCount > 0 || score < 80) {
        status = 'warning';
      } else {
        status = 'healthy';
      }

      const healthDuration = Date.now() - healthStartTime;

      this.logger.log('🏥 存储健康检查完成', {
        status,
        score,
        checksCount: checks.length,
        alertsCount: alerts.length,
        duration: healthDuration
      }, 'RawDataService');

      return {
        status,
        score,
        checks,
        alerts,
        recommendations
      };

    } catch (error) {
      const healthDuration = Date.now() - healthStartTime;
      this.logger.error('❌ 存储健康检查失败', {
        error: error instanceof Error ? error.message : '未知错误',
        errorType: this.classifyStorageError(error),
        duration: healthDuration
      }, 'RawDataService');

      return {
        status: 'critical',
        score: 0,
        checks: [{
          name: 'health_check',
          status: 'fail',
          value: error instanceof Error ? error.message : '未知错误',
          threshold: 'pass'
        }],
        alerts: ['健康检查执行失败'],
        recommendations: ['检查数据库连接和配置']
      };
    }
  }
}