import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RabbitMQClient, RabbitMQConfig } from '@pro/rabbitmq';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from '@pro/logger';
import { QUEUE_NAMES, AggregateTaskEvent } from '@pro/types';
import { SubTaskMessage, TaskResultMessage, WEIBO_CRAWL_QUEUE } from '../weibo/interfaces/sub-task-message.interface';

/**
 * RabbitMQ 配置和服务
 * 负责微博搜索任务的队列管理和消息发布
 */
@Injectable()
export class RabbitMQConfigService implements OnModuleInit, OnModuleDestroy {
  private client: RabbitMQClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger
  ) {}

  async onModuleInit(): Promise<void> {
    const rabbitmqConfig: RabbitMQConfig = {
      url: this.configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672',
      queue: WEIBO_CRAWL_QUEUE,
    };

    this.logger.debug('初始化 RabbitMQ 连接', {
      url: rabbitmqConfig.url.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'), // 隐藏密码
      queue: rabbitmqConfig.queue
    });

    const connectStart = Date.now();
    this.client = new RabbitMQClient(rabbitmqConfig);

    try {
      await this.client.connect();
      const connectDuration = Date.now() - connectStart;

      this.logger.info(`RabbitMQ 连接已建立，队列已初始化，耗时 ${connectDuration}ms`, 'RabbitMQConfigService');
      this.logger.debug('RabbitMQ 连接详情', {
        queue: WEIBO_CRAWL_QUEUE,
        connectionTimeMs: connectDuration
      });
    } catch (error) {
      const connectDuration = Date.now() - connectStart;
      this.logger.error('RabbitMQ 连接失败', {
        error: error.message,
        connectionTimeMs: connectDuration,
        queue: WEIBO_CRAWL_QUEUE
      });
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.debug('开始关闭 RabbitMQ 连接');
    const closeStart = Date.now();

    try {
      await this.client.close();
      const closeDuration = Date.now() - closeStart;
      this.logger.info(`RabbitMQ 连接已关闭，耗时 ${closeDuration}ms`, 'RabbitMQConfigService');
    } catch (error) {
      const closeDuration = Date.now() - closeStart;
      this.logger.error('关闭 RabbitMQ 连接时发生错误', {
        error: error.message,
        closeTimeMs: closeDuration
      });
    }
  }

  /**
   * 发布微博搜索子任务
   */
  async publishSubTask(message: SubTaskMessage): Promise<boolean> {
    const publishStart = Date.now();
    const messageSize = JSON.stringify(message).length;

    this.logger.debug('开始发布子任务消息', {
      taskId: message.taskId,
      keyword: message.keyword,
      queue: WEIBO_CRAWL_QUEUE,
      messageSizeBytes: messageSize,
      timeRange: {
        start: message.start.toISOString(),
        end: message.end.toISOString(),
        durationHours: (message.end.getTime() - message.start.getTime()) / 1000 / 60 / 60
      },
      isInitialCrawl: message.isInitialCrawl
    });

    try {
      const success = await this.client.publish(WEIBO_CRAWL_QUEUE, message);
      const publishDuration = Date.now() - publishStart;

      this.logger.debug(`消息发布操作完成`, {
        taskId: message.taskId,
        success,
        publishTimeMs: publishDuration,
        queue: WEIBO_CRAWL_QUEUE
      });

      if (success) {
        this.logger.info(`已发布子任务: 任务ID=${message.taskId}, 关键词=${message.keyword}, 时间范围=${message.start.toISOString()} ~ ${message.end.toISOString()}, 耗时 ${publishDuration}ms`, 'RabbitMQConfigService');
      } else {
        this.logger.warn(`消息发布失败: 任务ID=${message.taskId}, 返回false`, 'RabbitMQConfigService');
      }

      return success;
    } catch (error) {
      const publishDuration = Date.now() - publishStart;
      this.logger.error('发布子任务失败', {
        taskId: message.taskId,
        keyword: message.keyword,
        queue: WEIBO_CRAWL_QUEUE,
        error: error.message,
        publishTimeMs: publishDuration,
        messageSizeBytes: messageSize
      }, 'RabbitMQConfigService');
      throw error;
    }
  }

  /**
   * 发布任务结果（可选功能）
   */
  async publishTaskResult(message: TaskResultMessage): Promise<boolean> {
    try {
      const resultQueue = 'weibo_task_results';
      const success = await this.client.publish(resultQueue, message);
      this.logger.info(`已发布任务结果: 任务ID=${message.taskId}, 状态=${message.status}`, 'RabbitMQConfigService');
      return success;
    } catch (error) {
      this.logger.error('发布任务结果失败:', error, 'RabbitMQConfigService');
      throw error;
    }
  }

  /**
   * 发布聚合任务事件
   */
  async publishAggregateTask(event: AggregateTaskEvent): Promise<boolean> {
    const publishStart = Date.now();
    const messageSize = JSON.stringify(event).length;

    this.logger.debug('开始发布聚合任务事件', {
      windowType: event.windowType,
      timeRange: {
        start: event.startTime,
        end: event.endTime,
      },
      metrics: event.metrics,
      messageSizeBytes: messageSize,
    });

    try {
      const success = await this.client.publish(
        QUEUE_NAMES.AGGREGATE_TASK,
        event,
      );
      const publishDuration = Date.now() - publishStart;

      this.logger.debug('聚合任务事件发布完成', {
        success,
        publishTimeMs: publishDuration,
        queue: QUEUE_NAMES.AGGREGATE_TASK,
      });

      if (success) {
        this.logger.info(
          `已发布聚合任务: 窗口类型=${event.windowType}, 时间范围=${event.startTime} ~ ${event.endTime}, 耗时 ${publishDuration}ms`,
          'RabbitMQConfigService',
        );
      } else {
        this.logger.warn(
          '聚合任务事件发布失败: 返回false',
          'RabbitMQConfigService',
        );
      }

      return success;
    } catch (error) {
      const publishDuration = Date.now() - publishStart;
      this.logger.error(
        '发布聚合任务事件失败',
        {
          windowType: event.windowType,
          queue: QUEUE_NAMES.AGGREGATE_TASK,
          error: error.message,
          publishTimeMs: publishDuration,
          messageSizeBytes: messageSize,
        },
        'RabbitMQConfigService',
      );
      throw error;
    }
  }

  /**
   * 获取 RabbitMQ 客户端实例（用于高级操作）
   */
  getClient(): RabbitMQClient {
    return this.client;
  }
}