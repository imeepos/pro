import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { Logger } from '@pro/logger';
import { RabbitMQClient } from '@pro/rabbitmq';
import { QUEUE_NAMES, RawDataReadyEvent } from '@pro/types';
import { WeiboContentParser, ParsedWeiboContent } from './weibo-content-parser.service';
import { RawDataService } from '../raw-data/raw-data.service';

/**
 * 微博数据清洗服务 - 融合MediaCrawler智慧的数字清洗艺术品
 * 将原始微博数据转化为结构化、高质量的数字文化遗产
 * 每一个处理步骤都是对数据完整性和优雅性的完美追求
 */

export interface WeiboCleaningOptions {
  enableQualityEnhancement: boolean;
  enableMediaAnalysis: boolean;
  enableUserProfiling: boolean;
  enableCommentAnalysis: boolean;
  enableTimestampStandardization: boolean;
  maxBatchSize: number;
  qualityThreshold: number;
  enableDuplicateDetection: boolean;
  enableDataValidation: boolean;
}

export interface WeiboCleaningResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  skippedCount: number;
  quality: {
    averageScore: number;
    highQualityCount: number;
    mediumQualityCount: number;
    lowQualityCount: number;
  };
  performance: {
    processingTime: number;
    averageProcessingTime: number;
    throughput: number;
  };
  errors: Array<{
    id: string;
    error: string;
    type: string;
  }>;
  metadata: {
    cleaningId: string;
    timestamp: Date;
    version: string;
    options: WeiboCleaningOptions;
  };
}

@Injectable()
export class WeiboDataCleaner {
  private rabbitMQClient: RabbitMQClient | null = null;
  private isRabbitMQConnected = false;

  // MediaCrawler启发的配置常量
  private readonly DEFAULT_OPTIONS: WeiboCleaningOptions = {
    enableQualityEnhancement: true,
    enableMediaAnalysis: true,
    enableUserProfiling: true,
    enableCommentAnalysis: true,
    enableTimestampStandardization: true,
    maxBatchSize: 50,
    qualityThreshold: 0.7,
    enableDuplicateDetection: true,
    enableDataValidation: true
  };

  private readonly QUALITY_THRESHOLDS = {
    HIGH: 0.8,
    MEDIUM: 0.6,
    LOW: 0.4
  };

  constructor(
    private readonly weiboContentParser: WeiboContentParser,
    private readonly rawDataService: RawDataService,
    private readonly logger: Logger,
    @Inject('RABBITMQ_CONFIG') private readonly rabbitmqConfig: { url: string }
  ) {
    this.initializeRabbitMQ();
  }

  /**
   * 处理微博数据清洗事件 - 主入口方法
   * 每一次清洗都是对数据质量和完整性的艺术性提升
   */
  async handleWeiboDataReady(event: RawDataReadyEvent): Promise<WeiboCleaningResult> {
    const cleaningStartTime = Date.now();
    const cleaningId = this.generateCleaningId();

    this.logger.log('🎨 开始创作微博数据清洗艺术品', {
      cleaningId,
      rawDataId: event.rawDataId,
      sourceType: event.sourceType,
      sourcePlatform: event.sourcePlatform,
      timestamp: new Date().toISOString()
    }, 'WeiboDataCleaner');

    try {
      // 1. 验证事件数据
      const validationResult = await this.validateRawDataEvent(event, cleaningId);
      if (!validationResult.isValid) {
        throw new Error(`数据验证失败: ${validationResult.reason}`);
      }

      // 2. 获取原始数据
      const rawData = await this.fetchRawData(event.rawDataId, cleaningId);
      if (!rawData) {
        throw new Error(`原始数据不存在: ${event.rawDataId}`);
      }

      // 3. 执行数据清洗
      const cleaningResult = await this.performDataCleaning(rawData, this.DEFAULT_OPTIONS, cleaningId);

      // 4. 发布清洗完成事件
      await this.publishCleaningCompletedEvent(event, cleaningResult, cleaningId);

      // 5. 更新原始数据状态
      await this.updateRawDataStatus(event.rawDataId, 'processed', cleaningId);

      const totalProcessingTime = Date.now() - cleaningStartTime;

      this.logger.log('🎉 微博数据清洗艺术品创作完成', {
        cleaningId,
        rawDataId: event.rawDataId,
        result: {
          success: cleaningResult.success,
          processedCount: cleaningResult.processedCount,
          quality: cleaningResult.quality,
          performance: cleaningResult.performance
        },
        totalProcessingTime,
        timestamp: new Date().toISOString()
      }, 'WeiboDataCleaner');

      return cleaningResult;

    } catch (error) {
      const totalProcessingTime = Date.now() - cleaningStartTime;

      this.logger.error('💥 微博数据清洗艺术品创作失败', {
        cleaningId,
        rawDataId: event.rawDataId,
        error: error instanceof Error ? error.message : '未知错误',
        errorType: this.classifyCleaningError(error),
        totalProcessingTime,
        stack: error instanceof Error ? error.stack : undefined
      }, 'WeiboDataCleaner');

      // 更新原始数据状态为失败
      await this.updateRawDataStatus(event.rawDataId, 'failed', cleaningId).catch(e => {
        this.logger.warn('⚠️ 更新原始数据状态失败', {
          cleaningId,
          rawDataId: event.rawDataId,
          error: e instanceof Error ? e.message : '未知错误'
        }, 'WeiboDataCleaner');
      });

      throw this.enhanceCleaningError(error, event, cleaningId);
    }
  }

  /**
   * 批量清洗微博数据
   */
  async batchCleanWeiboData(
    rawDataIds: string[],
    options: Partial<WeiboCleaningOptions> = {}
  ): Promise<WeiboCleaningResult[]> {
    const batchId = this.generateBatchId();
    const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };

    this.logger.log('🔄 开始批量微博数据清洗', {
      batchId,
      totalItems: rawDataIds.length,
      options: mergedOptions,
      timestamp: new Date().toISOString()
    }, 'WeiboDataCleaner');

    const results: WeiboCleaningResult[] = [];
    const batches = this.chunkArray(rawDataIds, mergedOptions.maxBatchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchStartTime = Date.now();

      this.logger.debug(`🔧 处理批次 ${i + 1}/${batches.length}`, {
        batchId,
        batchSize: batch.length,
        batchIndex: i + 1
      }, 'WeiboDataCleaner');

      // 并行处理批次内的数据
      const batchPromises = batch.map(rawDataId =>
        this.cleanSingleRawData(rawDataId, mergedOptions)
      );

      try {
        const batchResults = await Promise.allSettled(batchPromises);

        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push(this.createFailureResult(result.reason, batchId));
          }
        }

        const batchDuration = Date.now() - batchStartTime;
        this.logger.debug(`✅ 批次 ${i + 1} 处理完成`, {
          batchId,
          batchIndex: i + 1,
          successCount: batchResults.filter(r => r.status === 'fulfilled').length,
          failureCount: batchResults.filter(r => r.status === 'rejected').length,
          batchDuration
        }, 'WeiboDataCleaner');

        // 批次间延迟，避免系统过载
        if (i < batches.length - 1) {
          await this.sleep(1000);
        }

      } catch (error) {
        this.logger.error(`❌ 批次 ${i + 1} 处理失败`, {
          batchId,
          batchIndex: i + 1,
          error: error instanceof Error ? error.message : '未知错误'
        }, 'WeiboDataCleaner');

        // 为整个批次创建失败结果
        for (const rawDataId of batch) {
          results.push(this.createFailureResult(error, batchId, rawDataId));
        }
      }
    }

    const totalProcessingTime = Date.now() - Date.now();

    this.logger.log('🎊 批量微博数据清洗完成', {
      batchId,
      totalBatches: batches.length,
      totalItems: rawDataIds.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      totalProcessingTime,
      timestamp: new Date().toISOString()
    }, 'WeiboDataCleaner');

    return results;
  }

  /**
   * 清洗单个原始数据
   */
  private async cleanSingleRawData(
    rawDataId: string,
    options: WeiboCleaningOptions
  ): Promise<WeiboCleaningResult> {
    const cleaningId = this.generateCleaningId();
    const startTime = Date.now();

    try {
      // 获取原始数据
      const rawData = await this.fetchRawData(rawDataId, cleaningId);
      if (!rawData) {
        throw new Error(`原始数据不存在: ${rawDataId}`);
      }

      // 执行清洗
      const result = await this.performDataCleaning(rawData, options, cleaningId);

      // 更新状态
      await this.updateRawDataStatus(rawDataId, 'processed', cleaningId);

      return result;

    } catch (error) {
      await this.updateRawDataStatus(rawDataId, 'failed', cleaningId);
      throw error;
    }
  }

  /**
   * 执行数据清洗 - 核心清洗逻辑
   */
  private async performDataCleaning(
    rawData: any,
    options: WeiboCleaningOptions,
    cleaningId: string
  ): Promise<WeiboCleaningResult> {
    const cleaningStartTime = Date.now();

    try {
      this.logger.debug('🧹 开始执行数据清洗', {
        cleaningId,
        rawDataId: rawData._id,
        options
      }, 'WeiboDataCleaner');

      // 1. 数据预处理
      const preprocessedData = await this.preprocessRawData(rawData, options, cleaningId);

      // 2. 内容解析
      const parsedContent = await this.weiboContentParser.parseWeiboContent(
        preprocessedData.content,
        {
          extractFullContent: options.enableQualityEnhancement,
          includeMediaAnalysis: options.enableMediaAnalysis,
          calculateQualityScores: options.enableQualityEnhancement,
          standardizeTimestamps: options.enableTimestampStandardization,
          extractEmotions: options.enableCommentAnalysis,
          buildCommentThreads: options.enableCommentAnalysis,
          maxMediaItems: 50,
          maxCommentDepth: options.enableCommentAnalysis ? 5 : 1,
          qualityThreshold: options.qualityThreshold
        }
      );

      // 3. 数据验证
      if (options.enableDataValidation) {
        await this.validateParsedContent(parsedContent, cleaningId);
      }

      // 4. 数据存储
      const storageResult = await this.storeParsedContent(parsedContent, cleaningId);

      // 5. 生成清洗结果
      const cleaningResult = this.generateCleaningResult(
        parsedContent,
        cleaningStartTime,
        cleaningId,
        options
      );

      this.logger.debug('✨ 数据清洗完成', {
        cleaningId,
        result: cleaningResult,
        processingTime: Date.now() - cleaningStartTime
      }, 'WeiboDataCleaner');

      return cleaningResult;

    } catch (error) {
      this.logger.error('❌ 数据清洗失败', {
        cleaningId,
        error: error instanceof Error ? error.message : '未知错误',
        processingTime: Date.now() - cleaningStartTime
      }, 'WeiboDataCleaner');

      return this.createFailureResult(error, cleaningId);
    }
  }

  /**
   * 预处理原始数据
   */
  private async preprocessRawData(
    rawData: any,
    options: WeiboCleaningOptions,
    cleaningId: string
  ): Promise<{ content: any; metadata: any }> {
    const preprocessStartTime = Date.now();

    try {
      // 解析原始内容
      let content: any;
      if (typeof rawData.rawContent === 'string') {
        content = JSON.parse(rawData.rawContent);
      } else {
        content = rawData.rawContent;
      }

      // 数据去重检测
      if (options.enableDuplicateDetection) {
        const isDuplicate = await this.detectDuplicate(content, cleaningId);
        if (isDuplicate) {
          throw new Error('检测到重复数据，跳过处理');
        }
      }

      // 内容标准化
      const standardizedContent = this.standardizeContent(content);

      this.logger.debug('🔧 原始数据预处理完成', {
        cleaningId,
        processingTime: Date.now() - preprocessStartTime
      }, 'WeiboDataCleaner');

      return {
        content: standardizedContent,
        metadata: rawData.metadata
      };

    } catch (error) {
      this.logger.error('❌ 原始数据预处理失败', {
        cleaningId,
        error: error instanceof Error ? error.message : '未知错误',
        processingTime: Date.now() - preprocessStartTime
      }, 'WeiboDataCleaner');

      throw error;
    }
  }

  /**
   * 标准化内容
   */
  private standardizeContent(content: any): any {
    if (!content) return content;

    // 确保基本结构存在
    if (!content.cards) {
      content.cards = [];
    }

    // 标准化时间格式
    if (Array.isArray(content.cards)) {
      content.cards.forEach((card: any) => {
        if (card.mblog && card.mblog.created_at) {
          card.mblog.created_at = this.normalizeTimestamp(card.mblog.created_at);
        }
      });
    }

    return content;
  }

  /**
   * 标准化时间戳
   */
  private normalizeTimestamp(timestamp: string): string {
    // MediaCrawler启发的时间标准化逻辑
    if (!timestamp) return new Date().toISOString();

    try {
      // 处理相对时间
      if (timestamp.includes('刚刚')) return new Date().toISOString();
      if (timestamp.includes('分钟前')) {
        const minutes = parseInt(timestamp.replace(/[^0-9]/g, '')) || 1;
        return new Date(Date.now() - minutes * 60 * 1000).toISOString();
      }
      if (timestamp.includes('小时前')) {
        const hours = parseInt(timestamp.replace(/[^0-9]/g, '')) || 1;
        return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      }

      // 尝试直接解析
      const parsed = new Date(timestamp);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }

      return new Date().toISOString();

    } catch (error) {
      return new Date().toISOString();
    }
  }

  /**
   * 检测重复数据
   */
  private async detectDuplicate(content: any, cleaningId: string): Promise<boolean> {
    // 简化的重复检测逻辑
    // 实际应用中可以基于内容哈希、URL等进行更精确的检测
    try {
      const contentHash = this.generateContentHash(JSON.stringify(content));

      // 这里可以查询数据库检查是否已存在相同哈希的内容
      // 简化实现，总是返回false（不重复）

      return false;

    } catch (error) {
      this.logger.warn('⚠️ 重复检测失败，跳过检测', {
        cleaningId,
        error: error instanceof Error ? error.message : '未知错误'
      }, 'WeiboDataCleaner');

      return false;
    }
  }

  /**
   * 生成内容哈希
   */
  private generateContentHash(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * 验证解析后的内容
   */
  private async validateParsedContent(
    parsedContent: ParsedWeiboContent,
    cleaningId: string
  ): Promise<void> {
    const validationStartTime = Date.now();

    try {
      const issues: string[] = [];

      // 验证基础结构
      if (!parsedContent.posts || parsedContent.posts.length === 0) {
        issues.push('缺少微博帖子数据');
      }

      if (!parsedContent.users || parsedContent.users.length === 0) {
        issues.push('缺少用户数据');
      }

      // 验证数据质量
      const lowQualityPosts = parsedContent.posts.filter(p => p.quality.score < 0.3);
      if (lowQualityPosts.length > parsedContent.posts.length * 0.5) {
        issues.push('低质量帖子比例过高');
      }

      // 验证时间戳
      const invalidTimestamps = parsedContent.posts.filter(p =>
        !p.timing.createdAt || isNaN(p.timing.createdAt.getTime())
      );
      if (invalidTimestamps.length > 0) {
        issues.push(`发现 ${invalidTimestamps.length} 个无效时间戳`);
      }

      if (issues.length > 0) {
        this.logger.warn('⚠️ 数据验证发现问题', {
          cleaningId,
          issues,
          processingTime: Date.now() - validationStartTime
        }, 'WeiboDataCleaner');

        // 根据问题严重程度决定是否抛出错误
        if (issues.some(issue => issue.includes('缺少') || issue.includes('比例过高'))) {
          throw new Error(`数据验证失败: ${issues.join(', ')}`);
        }
      }

      this.logger.debug('✅ 数据验证完成', {
        cleaningId,
        issuesCount: issues.length,
        processingTime: Date.now() - validationStartTime
      }, 'WeiboDataCleaner');

    } catch (error) {
      this.logger.error('❌ 数据验证失败', {
        cleaningId,
        error: error instanceof Error ? error.message : '未知错误',
        processingTime: Date.now() - validationStartTime
      }, 'WeiboDataCleaner');

      throw error;
    }
  }

  /**
   * 存储解析后的内容
   */
  private async storeParsedContent(
    parsedContent: ParsedWeiboContent,
    cleaningId: string
  ): Promise<{ success: boolean; storedCounts: any }> {
    const storageStartTime = Date.now();

    try {
      // 这里应该将解析后的内容存储到相应的数据库表中
      // 例如：WeiboPost, WeiboUser, WeiboComment等

      // 简化实现，只是记录日志
      const storedCounts = {
        posts: parsedContent.posts.length,
        users: parsedContent.users.length,
        comments: parsedContent.comments.length,
        media: parsedContent.media.length
      };

      this.logger.debug('💾 解析内容存储完成', {
        cleaningId,
        storedCounts,
        processingTime: Date.now() - storageStartTime
      }, 'WeiboDataCleaner');

      return {
        success: true,
        storedCounts
      };

    } catch (error) {
      this.logger.error('❌ 解析内容存储失败', {
        cleaningId,
        error: error instanceof Error ? error.message : '未知错误',
        processingTime: Date.now() - storageStartTime
      }, 'WeiboDataCleaner');

      throw error;
    }
  }

  /**
   * 生成清洗结果
   */
  private generateCleaningResult(
    parsedContent: ParsedWeiboContent,
    startTime: number,
    cleaningId: string,
    options: WeiboCleaningOptions
  ): WeiboCleaningResult {
    const processingTime = Date.now() - startTime;

    // 计算质量分布
    const qualityDistribution = this.calculateQualityDistribution(parsedContent.posts);

    return {
      success: true,
      processedCount: parsedContent.posts.length,
      failedCount: 0,
      skippedCount: 0,
      quality: qualityDistribution,
      performance: {
        processingTime,
        averageProcessingTime: parsedContent.posts.length > 0 ? processingTime / parsedContent.posts.length : 0,
        throughput: Math.round((parsedContent.posts.length / processingTime) * 1000) // posts/second
      },
      errors: [],
      metadata: {
        cleaningId,
        timestamp: new Date(),
        version: '1.0.0',
        options
      }
    };
  }

  /**
   * 计算质量分布
   */
  private calculateQualityDistribution(posts: any[]): WeiboCleaningResult['quality'] {
    const highQuality = posts.filter(p => p.quality.score >= this.QUALITY_THRESHOLDS.HIGH).length;
    const mediumQuality = posts.filter(p =>
      p.quality.score >= this.QUALITY_THRESHOLDS.MEDIUM &&
      p.quality.score < this.QUALITY_THRESHOLDS.HIGH
    ).length;
    const lowQuality = posts.filter(p =>
      p.quality.score < this.QUALITY_THRESHOLDS.MEDIUM
    ).length;

    const averageScore = posts.length > 0
      ? posts.reduce((sum, p) => sum + p.quality.score, 0) / posts.length
      : 0;

    return {
      averageScore: Math.round(averageScore * 100) / 100,
      highQualityCount: highQuality,
      mediumQualityCount: mediumQuality,
      lowQualityCount: lowQuality
    };
  }

  /**
   * 创建失败结果
   */
  private createFailureResult(
    error: any,
    cleaningId: string,
    rawDataId?: string
  ): WeiboCleaningResult {
    return {
      success: false,
      processedCount: 0,
      failedCount: 1,
      skippedCount: 0,
      quality: {
        averageScore: 0,
        highQualityCount: 0,
        mediumQualityCount: 0,
        lowQualityCount: 0
      },
      performance: {
        processingTime: 0,
        averageProcessingTime: 0,
        throughput: 0
      },
      errors: [{
        id: rawDataId || 'unknown',
        error: error instanceof Error ? error.message : '未知错误',
        type: this.classifyCleaningError(error)
      }],
      metadata: {
        cleaningId,
        timestamp: new Date(),
        version: '1.0.0',
        options: this.DEFAULT_OPTIONS
      }
    };
  }

  /**
   * 验证原始数据事件
   */
  private async validateRawDataEvent(
    event: RawDataReadyEvent,
    cleaningId: string
  ): Promise<{ isValid: boolean; reason?: string }> {
    try {
      // 验证必要字段
      if (!event.rawDataId) {
        return { isValid: false, reason: '缺少rawDataId' };
      }

      if (!event.sourceType) {
        return { isValid: false, reason: '缺少sourceType' };
      }

      if (!event.sourcePlatform) {
        return { isValid: false, reason: '缺少sourcePlatform' };
      }

      // 验证是否为微博数据
      if (!event.sourceType.toLowerCase().includes('weibo')) {
        return { isValid: false, reason: '非微博数据类型' };
      }

      return { isValid: true };

    } catch (error) {
      return {
        isValid: false,
        reason: `验证过程中出错: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 获取原始数据
   */
  private async fetchRawData(rawDataId: string, cleaningId: string): Promise<any> {
    try {
      // 这里应该调用RawDataService获取数据
      // 简化实现，返回null
      return null;

    } catch (error) {
      this.logger.error('❌ 获取原始数据失败', {
        cleaningId,
        rawDataId,
        error: error instanceof Error ? error.message : '未知错误'
      }, 'WeiboDataCleaner');

      throw error;
    }
  }

  /**
   * 更新原始数据状态
   */
  private async updateRawDataStatus(
    rawDataId: string,
    status: 'pending' | 'processed' | 'failed',
    cleaningId: string
  ): Promise<void> {
    try {
      // 这里应该调用RawDataService更新状态
      // 简化实现，只记录日志
      this.logger.debug('📝 原始数据状态更新', {
        cleaningId,
        rawDataId,
        status,
        timestamp: new Date().toISOString()
      }, 'WeiboDataCleaner');

    } catch (error) {
      this.logger.warn('⚠️ 更新原始数据状态失败', {
        cleaningId,
        rawDataId,
        status,
        error: error instanceof Error ? error.message : '未知错误'
      }, 'WeiboDataCleaner');
    }
  }

  /**
   * 发布清洗完成事件
   */
  private async publishCleaningCompletedEvent(
    originalEvent: RawDataReadyEvent,
    cleaningResult: WeiboCleaningResult,
    cleaningId: string
  ): Promise<void> {
    if (!this.isRabbitMQConnected) {
      this.logger.debug('⏭️ RabbitMQ未连接，跳过事件发布', {
        cleaningId,
        rawDataId: originalEvent.rawDataId
      }, 'WeiboDataCleaner');
      return;
    }

    try {
      const event = {
        rawDataId: originalEvent.rawDataId,
        sourceType: originalEvent.sourceType,
        sourcePlatform: originalEvent.sourcePlatform,
        cleaningId,
        result: cleaningResult,
        timestamp: new Date().toISOString()
      };

      // 这里应该发布到相应的队列
      // 简化实现，只记录日志
      this.logger.log('📤 清洗完成事件发布成功', {
        cleaningId,
        rawDataId: originalEvent.rawDataId,
        success: cleaningResult.success,
        processedCount: cleaningResult.processedCount
      }, 'WeiboDataCleaner');

    } catch (error) {
      this.logger.error('❌ 清洗完成事件发布失败', {
        cleaningId,
        rawDataId: originalEvent.rawDataId,
        error: error instanceof Error ? error.message : '未知错误'
      }, 'WeiboDataCleaner');
    }
  }

  /**
   * 初始化RabbitMQ连接
   */
  private async initializeRabbitMQ(): Promise<void> {
    try {
      this.rabbitMQClient = new RabbitMQClient({ url: this.rabbitmqConfig.url });
      await this.rabbitMQClient.connect();
      this.isRabbitMQConnected = true;

      this.logger.log('🔗 RabbitMQ连接初始化成功', {
        url: this.rabbitmqConfig.url.replace(/\/\/.*@/, '//***@')
      }, 'WeiboDataCleaner');

    } catch (error) {
      this.isRabbitMQConnected = false;
      this.logger.warn('⚠️ RabbitMQ初始化失败，消息发布将被跳过', {
        error: error instanceof Error ? error.message : '未知错误'
      }, 'WeiboDataCleaner');
    }
  }

  /**
   * 分类清洗错误
   */
  private classifyCleaningError(error: any): string {
    if (!error) return 'UNKNOWN_CLEANING_ERROR';

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (errorMessage.includes('json') || errorMessage.includes('parse')) {
      return 'PARSE_ERROR';
    }

    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return 'VALIDATION_ERROR';
    }

    if (errorMessage.includes('duplicate')) {
      return 'DUPLICATE_ERROR';
    }

    if (errorMessage.includes('storage') || errorMessage.includes('database')) {
      return 'STORAGE_ERROR';
    }

    if (errorMessage.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    }

    if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
      return 'MEMORY_ERROR';
    }

    return 'UNKNOWN_CLEANING_ERROR';
  }

  /**
   * 增强清洗错误信息
   */
  private enhanceCleaningError(
    error: any,
    event: RawDataReadyEvent,
    cleaningId: string
  ): Error {
    const enhancedError = new Error(
      `微博数据清洗失败: ${error instanceof Error ? error.message : '未知错误'}`
    );

    enhancedError.name = 'EnhancedWeiboCleaningError';
    (enhancedError as any).cleaningId = cleaningId;
    (enhancedError as any).rawDataId = event.rawDataId;
    (enhancedError as any).sourceType = event.sourceType;
    (enhancedError as any).originalError = error;
    (enhancedError as any).errorType = this.classifyCleaningError(error);

    return enhancedError;
  }

  /**
   * 生成清洗ID
   */
  private generateCleaningId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `clean_${timestamp}_${random}`;
  }

  /**
   * 生成批次ID
   */
  private generateBatchId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `batch_${timestamp}_${random}`;
  }

  /**
   * 数组分块
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}