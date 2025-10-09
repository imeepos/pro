import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQClient } from '@pro/rabbitmq';
import { WeiboSearchCrawlerService, SubTaskMessage, CrawlResult } from './weibo/search-crawler.service';

@Injectable()
export class CrawlQueueConsumer implements OnModuleInit {
  private readonly logger = new Logger(CrawlQueueConsumer.name);
  private readonly queueName = 'weibo_crawl_queue';
  private rabbitMQClient: RabbitMQClient;

  constructor(
    private readonly weiboSearchCrawlerService: WeiboSearchCrawlerService,
    private readonly configService: ConfigService
  ) {}

  async onModuleInit(): Promise<void> {
    await this.setupConsumer();
  }

  private async setupConsumer(): Promise<void> {
    try {
      const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672');

      this.rabbitMQClient = new RabbitMQClient({ url: rabbitmqUrl, queue: this.queueName });
      await this.rabbitMQClient.connect();

      await this.rabbitMQClient.consume(this.queueName, async (message: any) => {
        await this.handleMessage(message);
      });

      this.logger.log(`已启动队列消费者: ${this.queueName}`);
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

      this.logger.log(`收到爬取任务: taskId=${subTask.taskId}, keyword=${subTask.keyword}`);

      const result = await this.weiboSearchCrawlerService.crawl(subTask);

      await this.handleCrawlResult(subTask, result);

      const duration = Date.now() - startTime;
      this.logger.log(`任务完成: taskId=${subTask.taskId}, 耗时=${duration}ms, 成功=${result.success}`);

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`处理任务失败: taskId=${subTask?.taskId}, 耗时=${duration}ms, 错误=`, error);

      if (subTask) {
        await this.handleTaskFailure(subTask, error instanceof Error ? error.message : '未知错误');
      }
    }
  }

  private async handleCrawlResult(subTask: SubTaskMessage, result: CrawlResult): Promise<void> {
    if (!result.success) {
      await this.handleTaskFailure(subTask, result.error || '爬取失败');
      return;
    }

    const updates: any = {
      status: 'running',
      progress: (subTask.taskId * 100) / 100,
      updatedAt: new Date()
    };

    if (subTask.isInitialCrawl) {
      if (result.pageCount === 50 && result.lastPostTime) {
        updates.currentCrawlTime = result.lastPostTime;
        if (!subTask.weiboAccountId) {
          updates.latestCrawlTime = result.firstPostTime;
        }
        await this.triggerNextSubTask(subTask, result.lastPostTime);
      } else {
        updates.currentCrawlTime = subTask.start;
        updates.nextRunAt = new Date(Date.now() + 60 * 60 * 1000);
        updates.status = 'paused';
      }
    } else {
      if (result.firstPostTime) {
        updates.latestCrawlTime = result.firstPostTime;
      }
      updates.nextRunAt = new Date(Date.now() + 60 * 60 * 1000);
    }

    this.logger.log(`任务状态更新: taskId=${subTask.taskId}, 更新内容=`, updates);
  }

  private async triggerNextSubTask(subTask: SubTaskMessage, endTime: Date): Promise<void> {
    const nextTask: SubTaskMessage = {
      ...subTask,
      end: endTime
    };

    try {
      await this.rabbitMQClient.publish(this.queueName, nextTask);
      this.logger.log(`已自动触发下一个子任务: taskId=${subTask.taskId}, 新结束时间=${endTime.toISOString()}`);
    } catch (error) {
      this.logger.error(`触发下一个子任务失败: taskId=${subTask.taskId}`, error);
    }
  }

  private async handleTaskFailure(subTask: SubTaskMessage, errorMessage: string): Promise<void> {
    this.logger.error(`任务执行失败: taskId=${subTask.taskId}, 错误=${errorMessage}`);
  }
}