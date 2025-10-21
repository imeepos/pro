import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQClient } from '@pro/rabbitmq';
import {
  WeiboSearchCrawlerService,
  SubTaskMessage,
  CrawlResult,
} from './weibo/search-crawler.service';
import { RabbitMQConfig } from './config/crawler.interface';

interface CrawlMetrics {
  taskId: number;
  keyword: string;
  startTime: number;
  duration?: number;
  pageCount?: number;
  success: boolean;
  error?: string;
}

@Injectable()
export class CrawlQueueConsumer implements OnModuleInit {
  private readonly logger = new Logger(CrawlQueueConsumer.name);
  private rabbitMQClient: RabbitMQClient;
  private activeTasks = new Map<number, CrawlMetrics>();

  constructor(
    private readonly weiboSearchCrawlerService: WeiboSearchCrawlerService,
    private readonly configService: ConfigService,
    @Inject('RABBITMQ_CONFIG') private readonly rabbitmqConfig: RabbitMQConfig,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.setupConsumer();
  }

  private async setupConsumer(): Promise<void> {
    const initStartTime = Date.now();

    try {
      this.logger.debug('初始化RabbitMQ消费者连接', {
        queue: this.rabbitmqConfig.queues.crawlQueue,
        url: this.rabbitmqConfig.url.replace(/\/\/.*@/, '//***:***@') // 隐藏敏感信息
      });

      this.rabbitMQClient = new RabbitMQClient({
        url: this.rabbitmqConfig.url,
        queue: this.rabbitmqConfig.queues.crawlQueue,
      });

      await this.rabbitMQClient.connect();

      await this.rabbitMQClient.consume(
        this.rabbitmqConfig.queues.crawlQueue,
        async (message: SubTaskMessage) => {
          await this.handleMessage(message);
        },
      );

      const initDuration = Date.now() - initStartTime;
      this.logger.log('队列消费者就绪', {
        queue: this.rabbitmqConfig.queues.crawlQueue,
        initTimeMs: initDuration,
        activeConnections: 1
      });

    } catch (error) {
      const initDuration = Date.now() - initStartTime;
      this.logger.error('队列消费者初始化失败', {
        queue: this.rabbitmqConfig.queues.crawlQueue,
        initTimeMs: initDuration,
        error: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  private async handleMessage(message: SubTaskMessage): Promise<void> {
    const startTime = Date.now();
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 消息验证和预处理
    const validationResult = this.validateAndParseMessage(message);
    if (!validationResult.isValid) {
      this.logger.warn('消息验证失败，跳过处理', {
        messageId,
        reason: validationResult.error,
        receivedAt: new Date().toISOString()
      });
      return;
    }

    const subTask = validationResult.data!;

    // 检查任务是否已在处理中（防止重复处理）
    if (this.activeTasks.has(subTask.taskId)) {
      this.logger.warn('任务已在处理中，跳过重复消息', {
        messageId,
        taskId: subTask.taskId,
        keyword: subTask.keyword,
        activeDuration: Date.now() - this.activeTasks.get(subTask.taskId)!.startTime
      });
      return;
    }

    // 记录任务开始
    const metrics: CrawlMetrics = {
      taskId: subTask.taskId,
      keyword: subTask.keyword,
      startTime,
      success: false
    };
    this.activeTasks.set(subTask.taskId, metrics);

    this.logger.log('开始处理爬取任务', {
      messageId,
      taskId: subTask.taskId,
      keyword: subTask.keyword,
      timeRange: {
        start: subTask.start.toISOString(),
        end: subTask.end.toISOString()
      },
      isInitialCrawl: subTask.isInitialCrawl,
      enableAccountRotation: subTask.enableAccountRotation,
      activeTasksCount: this.activeTasks.size
    });

    try {
      const result = await this.weiboSearchCrawlerService.crawl(subTask);
      await this.handleCrawlResult(subTask, result);

      // 更新任务指标
      metrics.duration = Date.now() - startTime;
      metrics.pageCount = result.pageCount;
      metrics.success = result.success;
      metrics.error = result.error;

      if (result.success) {
        this.logger.log('任务执行成功', {
          messageId,
          taskId: subTask.taskId,
          keyword: subTask.keyword,
          duration: metrics.duration,
          pageCount: result.pageCount,
          firstPostTime: result.firstPostTime?.toISOString(),
          lastPostTime: result.lastPostTime?.toISOString(),
          throughput: Math.round((result.pageCount || 0) / (metrics.duration / 1000) * 100) / 100
        });
      } else {
        this.logger.error('任务执行失败', {
          messageId,
          taskId: subTask.taskId,
          keyword: subTask.keyword,
          duration: metrics.duration,
          error: result.error,
          errorType: this.classifyError(result.error)
        });

        // 抛出异常触发 RabbitMQ 重试机制
        throw new Error(`爬取失败: ${result.error || '未知错误'}`);
      }

    } catch (error) {
      metrics.duration = Date.now() - startTime;
      metrics.success = false;
      metrics.error = error instanceof Error ? error.message : '未知错误';

      this.logger.error('任务处理异常', {
        messageId,
        taskId: subTask.taskId,
        keyword: subTask.keyword,
        duration: metrics.duration,
        error: metrics.error,
        errorType: this.classifyError(metrics.error),
        stack: error instanceof Error ? error.stack : undefined
      });

      throw error;

    } finally {
      // 清理活动任务记录
      this.activeTasks.delete(subTask.taskId);
    }
  }

  
  private validateAndParseMessage(message: unknown): { isValid: boolean; data?: SubTaskMessage; error?: string } {
    if (!message || typeof message !== 'object') {
      return { isValid: false, error: '消息为空或不是对象' };
    }

    const rawMessage = message as SubTaskMessage;

    if (typeof rawMessage.taskId !== 'number') {
      return { isValid: false, error: '缺少有效的taskId字段' };
    }

    try {
      const normalized = this.normalizeMessage(rawMessage);
      return { isValid: true, data: normalized };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { isValid: false, error: errorMessage };
    }
  }

  private normalizeMessage(message: SubTaskMessage): SubTaskMessage {
    const metadata = { ...(message.metadata ?? {}) };
    const keywordCandidate = message.keyword ?? metadata.keyword;
    const keyword = typeof keywordCandidate === 'string' ? keywordCandidate.trim() : '';

    if (!keyword) {
      throw new Error('缺少有效的keyword字段');
    }

    const start = this.parseDate(message.start ?? metadata.startTime);
    const end = this.parseDate(message.end ?? metadata.endTime);

    if (!start || !end) {
      throw new Error('缺少或存在无效的时间范围');
    }

    if (start >= end) {
      throw new Error('开始时间必须早于结束时间');
    }

    const maxTimeRange = 2 * 365 * 24 * 60 * 60 * 1000; // 2年
    if (end.getTime() - start.getTime() > maxTimeRange) {
      throw new Error('时间范围超过最大限制（2年）');
    }

    return {
      ...message,
      metadata,
      keyword,
      start,
      end,
      isInitialCrawl: message.isInitialCrawl ?? !metadata.startTime,
      enableAccountRotation: message.enableAccountRotation ?? false,
    };
  }

  private parseDate(value?: unknown): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  }

  private classifyError(error?: string): string {
    if (!error) return 'UNKNOWN';

    const errorLower = error.toLowerCase();

    if (errorLower.includes('timeout') || errorLower.includes('超时')) {
      return 'TIMEOUT';
    }

    if (errorLower.includes('network') || errorLower.includes('网络') ||
        errorLower.includes('connection') || errorLower.includes('连接')) {
      return 'NETWORK';
    }

    if (errorLower.includes('account') || errorLower.includes('账号') ||
        errorLower.includes('login') || errorLower.includes('登录') ||
        errorLower.includes('banned') || errorLower.includes('封禁')) {
      return 'ACCOUNT';
    }

    if (errorLower.includes('robots') || errorLower.includes('403') ||
        errorLower.includes('forbidden')) {
      return 'ACCESS_DENIED';
    }

    if (errorLower.includes('rate') || errorLower.includes('限流') ||
        errorLower.includes('frequency')) {
      return 'RATE_LIMIT';
    }

    if (errorLower.includes('parse') || errorLower.includes('解析') ||
        errorLower.includes('selector') || errorLower.includes('element')) {
      return 'PARSE_ERROR';
    }

    if (errorLower.includes('browser') || errorLower.includes('page') ||
        errorLower.includes('crash') || errorLower.includes('崩溃')) {
      return 'BROWSER_ERROR';
    }

    return 'UNKNOWN';
  }

  private async handleCrawlResult(
    subTask: SubTaskMessage,
    result: CrawlResult,
  ): Promise<void> {
    // 状态更新逻辑已移至 WeiboSearchCrawlerService.handleTaskResult()
    // 这里只做必要的日志记录和指标收集

    if (result.success && result.pageCount > 0) {
      this.logger.debug('任务结果处理完成', {
        taskId: subTask.taskId,
        pageCount: result.pageCount,
        hasTimeData: !!(result.firstPostTime && result.lastPostTime),
        timeSpanHours: result.firstPostTime && result.lastPostTime
          ? Math.round((result.lastPostTime.getTime() - result.firstPostTime.getTime()) / (1000 * 60 * 60))
          : null
      });
    }
  }

  // 获取当前活动任务统计（用于监控）
  getActiveTasksStats(): {
    activeCount: number;
    tasks: Array<{ taskId: number; keyword: string; duration: number }>;
  } {
    const now = Date.now();
    const tasks = Array.from(this.activeTasks.values()).map(task => ({
      taskId: task.taskId,
      keyword: task.keyword,
      duration: now - task.startTime
    }));

    return {
      activeCount: this.activeTasks.size,
      tasks
    };
  }
}
