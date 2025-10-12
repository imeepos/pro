import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQClient } from '@pro/rabbitmq';
import {
  WeiboSearchCrawlerService,
  SubTaskMessage,
  CrawlResult,
} from './weibo/search-crawler.service';
import { RabbitMQConfig } from './config/crawler.interface';

@Injectable()
export class CrawlQueueConsumer implements OnModuleInit {
  private readonly logger = new Logger(CrawlQueueConsumer.name);
  private rabbitMQClient: RabbitMQClient;

  constructor(
    private readonly weiboSearchCrawlerService: WeiboSearchCrawlerService,
    private readonly configService: ConfigService,
    @Inject('RABBITMQ_CONFIG') private readonly rabbitmqConfig: RabbitMQConfig,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.setupConsumer();
  }

  private async setupConsumer(): Promise<void> {
    try {
      this.rabbitMQClient = new RabbitMQClient({
        url: this.rabbitmqConfig.url,
        queue: this.rabbitmqConfig.queues.crawlQueue,
      });
      await this.rabbitMQClient.connect();

      await this.rabbitMQClient.consume(
        this.rabbitmqConfig.queues.crawlQueue,
        async (message: any) => {
          await this.handleMessage(message);
        },
      );

      this.logger.log(
        `已启动队列消费者: ${this.rabbitmqConfig.queues.crawlQueue}`,
      );
    } catch (error) {
      this.logger.error('设置队列消费者失败:', error);
      throw error;
    }
  }

  private async handleMessage(message: any): Promise<void> {
    const startTime = Date.now();
    let subTask: SubTaskMessage;

    // 检查消息是否为空或无效
    if (!message) {
      this.logger.error('收到空消息，跳过处理');
      return;
    }

    subTask = message;

    // 检查taskId是否存在
    if (!subTask.taskId) {
      this.logger.error('消息缺少taskId，跳过处理', message);
      return;
    }

    this.logger.log(
      `收到爬取任务: taskId=${subTask.taskId}, keyword=${subTask.keyword}, ` +
        `时间范围=${this.formatDate(subTask.start)}~${this.formatDate(subTask.end)}, ` +
        `isInitialCrawl=${subTask.isInitialCrawl}`,
    );

    const result = await this.weiboSearchCrawlerService.crawl(subTask);

    await this.handleCrawlResult(subTask, result);

    const duration = Date.now() - startTime;
    this.logger.log(
      `任务完成: taskId=${subTask.taskId}, 耗时=${duration}ms, 成功=${result.success}`,
    );

    // 如果爬取失败，抛出异常触发 RabbitMQ 重试机制
    if (!result.success) {
      throw new Error(`爬取失败: ${result.error || '未知错误'}`);
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

  private async handleCrawlResult(
    subTask: SubTaskMessage,
    result: CrawlResult,
  ): Promise<void> {
    // 安全处理日期时间显示
    const firstPostTimeStr = this.formatDateTime(result.firstPostTime);
    const lastPostTimeStr = this.formatDateTime(result.lastPostTime);

    this.logger.log(
      `爬取任务成功完成: taskId=${subTask.taskId}, pageCount=${result.pageCount}, ` +
        `首条时间=${firstPostTimeStr}, 末条时间=${lastPostTimeStr}`,
    );

    // 状态更新逻辑已移至 WeiboSearchCrawlerService.handleTaskResult()
    // 这里只做日志记录
  }
}
