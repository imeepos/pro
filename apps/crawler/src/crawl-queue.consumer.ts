import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQClient } from '@pro/rabbitmq';
import { WeiboSearchCrawlerService, SubTaskMessage, CrawlResult } from './weibo/search-crawler.service';
import { RabbitMQConfig } from './config/crawler.interface';

@Injectable()
export class CrawlQueueConsumer implements OnModuleInit {
  private readonly logger = new Logger(CrawlQueueConsumer.name);
  private rabbitMQClient: RabbitMQClient;

  constructor(
    private readonly weiboSearchCrawlerService: WeiboSearchCrawlerService,
    private readonly configService: ConfigService,
    @Inject('RABBITMQ_CONFIG') private readonly rabbitmqConfig: RabbitMQConfig
  ) {}

  async onModuleInit(): Promise<void> {
    await this.setupConsumer();
  }

  private async setupConsumer(): Promise<void> {
    try {
      this.rabbitMQClient = new RabbitMQClient({
        url: this.rabbitmqConfig.url,
        queue: this.rabbitmqConfig.queues.crawlQueue
      });
      await this.rabbitMQClient.connect();

      await this.rabbitMQClient.consume(this.rabbitmqConfig.queues.crawlQueue, async (message: any) => {
        await this.handleMessage(message);
      });

      this.logger.log(`已启动队列消费者: ${this.rabbitmqConfig.queues.crawlQueue}`);
    } catch (error) {
      this.logger.error('设置队列消费者失败:', error);
      throw error;
    }
  }

  private async handleMessage(message: any): Promise<void> {
    const startTime = Date.now();
    let subTask: SubTaskMessage;

    try {
      subTask = message;

      this.logger.log(`收到爬取任务: taskId=${subTask.taskId}, keyword=${subTask.keyword}, ` +
                     `时间范围=${this.formatDate(subTask.start)}~${this.formatDate(subTask.end)}, ` +
                     `isInitialCrawl=${subTask.isInitialCrawl}`);

      const result = await this.weiboSearchCrawlerService.crawl(subTask);

      await this.handleCrawlResult(subTask, result);

      const duration = Date.now() - startTime;
      this.logger.log(`任务完成: taskId=${subTask.taskId}, 耗时=${duration}ms, 成功=${result.success}`);

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`处理任务失败: taskId=${subTask?.taskId}, 耗时=${duration}ms, 错误=`, error);

      if (subTask) {
        await this.handleTaskFailure(subTask, error instanceof Error ? error.message : '未知错误');

        // 重试逻辑 - 如果是网络错误或临时错误，可以重新入队
        if (this.shouldRetry(error) && subTask.isInitialCrawl) {
          await this.scheduleRetry(subTask, error instanceof Error ? error.message : '未知错误');
        }
      }
    }
  }

  private shouldRetry(error: any): boolean {
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';

    // 网络相关错误可以重试
    const retryableErrors = [
      'timeout',
      'network',
      'connection',
      'etimedout',
      'enotfound',
      'econnreset'
    ];

    return retryableErrors.some(err => errorMessage.includes(err));
  }

  private async scheduleRetry(subTask: SubTaskMessage, errorMessage: string): Promise<void> {
    const retryDelay = 5 * 60 * 1000; // 5分钟后重试

    try {
      // 延迟重试消息
      setTimeout(async () => {
        try {
          await this.rabbitMQClient.publish(this.rabbitmqConfig.queues.crawlQueue, {
            ...subTask,
            retryCount: (subTask as any).retryCount ? (subTask as any).retryCount + 1 : 1
          });
          this.logger.log(`已重新安排任务重试: taskId=${subTask.taskId}, 重试次数=${(subTask as any).retryCount ? (subTask as any).retryCount + 1 : 1}`);
        } catch (error) {
          this.logger.error(`重试任务安排失败: taskId=${subTask.taskId}`, error);
        }
      }, retryDelay);

    } catch (error) {
      this.logger.error(`安排重试失败: taskId=${subTask.taskId}`, error);
    }
  }

  private formatDate(date: any): string {
    if (!date) {
      return '未知日期';
    }

    // 如果是字符串，尝试转换为Date对象
    if (typeof date === 'string') {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return '无效日期';
      }
      return parsedDate.toISOString().split('T')[0];
    }

    // 如果是Date对象，检查有效性
    if (date instanceof Date) {
      if (isNaN(date.getTime())) {
        return '无效日期';
      }
      return date.toISOString().split('T')[0];
    }

    // 其他类型，尝试转换
    try {
      const convertedDate = new Date(date);
      if (isNaN(convertedDate.getTime())) {
        return '无效日期';
      }
      return convertedDate.toISOString().split('T')[0];
    } catch {
      return '无效日期';
    }
  }

  private formatDateTime(date: any): string {
    if (!date) {
      return '未知时间';
    }

    // 如果是字符串，尝试转换为Date对象
    if (typeof date === 'string') {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return '无效时间';
      }
      return parsedDate.toISOString();
    }

    // 如果是Date对象，检查有效性
    if (date instanceof Date) {
      if (isNaN(date.getTime())) {
        return '无效时间';
      }
      return date.toISOString();
    }

    // 其他类型，尝试转换
    try {
      const convertedDate = new Date(date);
      if (isNaN(convertedDate.getTime())) {
        return '无效时间';
      }
      return convertedDate.toISOString();
    } catch {
      return '无效时间';
    }
  }

  private async handleCrawlResult(subTask: SubTaskMessage, result: CrawlResult): Promise<void> {
    if (!result.success) {
      await this.handleTaskFailure(subTask, result.error || '爬取失败');
      return;
    }

    // 安全处理日期时间显示
    const firstPostTimeStr = this.formatDateTime(result.firstPostTime);
    const lastPostTimeStr = this.formatDateTime(result.lastPostTime);

    this.logger.log(`爬取任务成功完成: taskId=${subTask.taskId}, pageCount=${result.pageCount}, ` +
                   `首条时间=${firstPostTimeStr}, 末条时间=${lastPostTimeStr}`);

    // 状态更新逻辑已移至 WeiboSearchCrawlerService.handleTaskResult()
    // 这里只做日志记录和失败处理
  }

  private async handleTaskFailure(subTask: SubTaskMessage, errorMessage: string): Promise<void> {
    this.logger.error(`任务执行失败: taskId=${subTask.taskId}, keyword=${subTask.keyword}, 错误=${errorMessage}`);

    // 发布失败状态更新消息
    try {
      await this.rabbitMQClient.publish(this.rabbitmqConfig.queues.statusQueue, {
        taskId: subTask.taskId,
        status: 'failed',
        errorMessage: errorMessage,
        updatedAt: new Date()
      });
    } catch (error) {
      this.logger.error(`发布失败状态更新消息失败: taskId=${subTask.taskId}`, error);
    }
  }
}