import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RabbitMQClient, RabbitMQConfig } from '@pro/rabbitmq';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from '@pro/logger-nestjs';
import { QUEUE_NAMES, AggregateTaskEvent } from '@pro/types';
import { SubTaskMessage, TaskResultMessage, WEIBO_CRAWL_QUEUE } from '../weibo/interfaces/sub-task-message.interface';

/**
 * RabbitMQ 配置服务 - 消息的优雅桥梁
 *
 * 设计哲学：
 * - 连接如流水般顺畅，断开如秋风般从容
 * - 每条消息都有其独特的旅程
 * - 错误处理如智者般沉稳
 *
 * 使命：
 * - 建立与消息队列的可靠连接
 * - 确保消息的可靠传递
 * - 为分布式系统提供通信基础
 */
@Injectable()
export class RabbitMQConfigService implements OnModuleInit, OnModuleDestroy {
  private client: RabbitMQClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RabbitMQConfigService.name);
  }

  /**
   * 模块初始化 - 连接的建立
   * 与 RabbitMQ 建立持久而优雅的连接
   */
  async onModuleInit(): Promise<void> {
    const config: RabbitMQConfig = {
      url: this.configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672',
      queue: WEIBO_CRAWL_QUEUE,
      messageTTL: 30 * 60 * 1000, // 30分钟TTL，任务超时自动进入死信队列
      enableDLQ: true, // 启用死信队列
      maxRetries: 3, // 最大重试3次
    };

    this.logger.debug('准备建立 RabbitMQ 连接', {
      queue: config.queue,
      url: this.maskSensitiveUrl(config.url),
    });

    const connectStart = Date.now();
    this.client = new RabbitMQClient(config);

    try {
      await this.client.connect();
      const duration = Date.now() - connectStart;

      this.logger.info(`RabbitMQ 连接已建立，耗时 ${duration}ms`);
      this.logger.debug('连接详情', {
        queue: WEIBO_CRAWL_QUEUE,
        connectionTime: `${duration}ms`,
      });
    } catch (error) {
      const duration = Date.now() - connectStart;
      this.logger.error('RabbitMQ 连接失败', {
        error: error.message,
        connectionTime: `${duration}ms`,
        queue: WEIBO_CRAWL_QUEUE,
      });
      throw error;
    }
  }

  /**
   * 模块销毁 - 优雅的告别
   * 关闭连接，释放资源，如同完成使命后的退场
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.debug('准备关闭 RabbitMQ 连接');
    const closeStart = Date.now();

    try {
      await this.client.close();
      const duration = Date.now() - closeStart;
      this.logger.info(`RabbitMQ 连接已优雅关闭，耗时 ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - closeStart;
      this.logger.error('关闭 RabbitMQ 连接时发生异常', {
        error: error.message,
        closeTime: `${duration}ms`,
      });
    }
  }

  /**
   * 发布微博搜索子任务 - 任务的传递
   * 将任务调度器创建的子任务传递给执行者
   */
  async publishSubTask(message: SubTaskMessage): Promise<boolean> {
    const publishStart = Date.now();
    const messageInfo = this.extractMessageInfo(message);

    this.logger.debug('发布子任务到消息队列', messageInfo);

    try {
      const success = await this.client.publish(WEIBO_CRAWL_QUEUE, message);
      const duration = Date.now() - publishStart;

      this.logger.debug('消息发布完成', {
        ...messageInfo,
        success,
        publishTime: `${duration}ms`,
      });

      if (success) {
        this.logger.info(`子任务已发送: ID=${message.taskId}, 关键词=${message.keyword}`);
      } else {
        this.logger.warn(`消息发布失败: ID=${message.taskId}`);
      }

      return success;
    } catch (error) {
      const duration = Date.now() - publishStart;
      this.logger.error('子任务发布异常', {
        ...messageInfo,
        error: error.message,
        publishTime: `${duration}ms`,
      });
      throw error;
    }
  }

  /**
   * 发布任务结果 - 完成的回响
   * 将任务执行结果传递回调度中心（可选功能）
   */
  async publishTaskResult(message: TaskResultMessage): Promise<boolean> {
    const resultQueue = 'weibo_task_results';

    try {
      const success = await this.client.publish(resultQueue, message);
      this.logger.info(`任务结果已发布: ID=${message.taskId}, 状态=${message.status}`);
      return success;
    } catch (error) {
      this.logger.error('任务结果发布失败', {
        taskId: message.taskId,
        status: message.status,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 发布聚合任务事件 - 数据的汇总
   * 将聚合任务信息传递给数据处理服务
   */
  async publishAggregateTask(event: AggregateTaskEvent): Promise<boolean> {
    const publishStart = Date.now();
    const eventInfo = this.extractEventInfo(event);

    this.logger.debug('发布聚合任务事件', eventInfo);

    try {
      const success = await this.client.publish(QUEUE_NAMES.AGGREGATE_TASK, event);
      const duration = Date.now() - publishStart;

      this.logger.debug('聚合事件发布完成', {
        ...eventInfo,
        success,
        publishTime: `${duration}ms`,
      });

      if (success) {
        this.logger.info(`聚合任务已发布: 类型=${event.windowType}`);
      } else {
        this.logger.warn('聚合事件发布失败');
      }

      return success;
    } catch (error) {
      const duration = Date.now() - publishStart;
      this.logger.error('聚合事件发布异常', {
        ...eventInfo,
        error: error.message,
        publishTime: `${duration}ms`,
      });
      throw error;
    }
  }

  /**
   * 获取客户端实例 - 高级操作的钥匙
   * 为需要直接操作 RabbitMQ 的场景提供客户端访问
   */
  getClient(): RabbitMQClient {
    if (!this.client) {
      throw new Error('RabbitMQ 客户端尚未初始化');
    }
    return this.client;
  }

  /**
   * 掩盖敏感信息 - 隐私的守护者
   * 在日志中隐藏密码等敏感信息
   */
  private maskSensitiveUrl(url: string): string {
    return url.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  }

  /**
   * 提取消息信息 - 结构化的日志
   * 将关键信息提取为结构化格式，便于日志分析
   */
  private extractMessageInfo(message: SubTaskMessage) {
    const start = message.metadata.startTime ? new Date(message.metadata.startTime) : null;
    const end = message.metadata.endTime ? new Date(message.metadata.endTime) : null;
    const durationHours = start && end
      ? Math.round(((end.getTime() - start.getTime()) / 1000 / 60 / 60) * 100) / 100
      : null;

    return {
      taskId: message.taskId,
      type: message.type,
      keyword: message.metadata.keyword,
      queue: WEIBO_CRAWL_QUEUE,
      timeRange: {
        start: start?.toISOString() ?? null,
        end: end?.toISOString() ?? null,
        durationHours,
      },
      messageSize: JSON.stringify(message).length,
    };
  }

  /**
   * 提取事件信息 - 结构化的日志
   * 将聚合事件的关键信息提取为结构化格式
   */
  private extractEventInfo(event: AggregateTaskEvent) {
    return {
      windowType: event.windowType,
      timeRange: {
        start: event.startTime,
        end: event.endTime,
      },
      metrics: event.metrics,
      queue: QUEUE_NAMES.AGGREGATE_TASK,
      messageSize: JSON.stringify(event).length,
    };
  }
}
