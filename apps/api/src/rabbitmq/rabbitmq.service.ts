import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQClient } from '@pro/rabbitmq';
import {
  QUEUE_NAMES,
  CleanTaskEvent,
  AnalyzeTaskEvent,
  AggregateTaskEvent,
} from '@pro/types';

/**
 * RabbitMQ 服务
 *
 * 设计哲学：
 * - 类型安全：每个发布方法都使用明确的事件类型
 * - 优雅错误处理：失败时不抛出异常，而是记录日志并返回结果
 * - 资源管理：实现生命周期钩子，确保连接优雅关闭
 * - 日志叙事：每个操作都讲述它的故事
 */
@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private client: RabbitMQClient;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('RABBITMQ_URL');
    if (!url) {
      throw new Error('RABBITMQ_URL 未配置 - 消息队列无法初始化');
    }

    this.client = new RabbitMQClient({
      url,
      maxRetries: 3,
      enableDLQ: true,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      this.logger.log('RabbitMQ 连接已建立');
    } catch (error) {
      this.logger.error('RabbitMQ 连接失败', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.close();
      this.logger.log('RabbitMQ 连接已关闭');
    } catch (error) {
      this.logger.error('关闭 RabbitMQ 连接时发生错误', error);
    }
  }

  /**
   * 发布清洗任务事件
   *
   * @param event 清洗任务事件
   * @returns 发布是否成功
   */
  async publishCleanTask(event: CleanTaskEvent): Promise<boolean> {
    try {
      this.logger.log(`发布清洗任务: ${event.rawDataId}`);

      const result = await this.client.publish(QUEUE_NAMES.CLEAN_TASK, event, {
        persistent: true,
      });

      if (result) {
        this.logger.log(`清洗任务发布成功: ${event.rawDataId}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`清洗任务发布失败: ${event.rawDataId}`, error);
      return false;
    }
  }

  /**
   * 发布分析任务事件
   *
   * @param event 分析任务事件
   * @returns 发布是否成功
   */
  async publishAnalyzeTask(event: AnalyzeTaskEvent): Promise<boolean> {
    try {
      this.logger.log(`发布分析任务: ${event.dataId} (${event.dataType})`);

      const result = await this.client.publish(QUEUE_NAMES.ANALYZE_TASK, event, {
        persistent: true,
      });

      if (result) {
        this.logger.log(`分析任务发布成功: ${event.dataId}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`分析任务发布失败: ${event.dataId}`, error);
      return false;
    }
  }

  /**
   * 发布聚合任务事件
   *
   * @param event 聚合任务事件
   * @returns 发布是否成功
   */
  async publishAggregateTask(event: AggregateTaskEvent): Promise<boolean> {
    try {
      this.logger.log(
        `发布聚合任务: ${event.windowType} (${event.startTime} ~ ${event.endTime})`,
      );

      const result = await this.client.publish(QUEUE_NAMES.AGGREGATE_TASK, event, {
        persistent: true,
      });

      if (result) {
        this.logger.log(`聚合任务发布成功: ${event.windowType}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`聚合任务发布失败: ${event.windowType}`, error);
      return false;
    }
  }

  /**
   * 检查 RabbitMQ 连接状态
   */
  isConnected(): boolean {
    return this.client.isConnected();
  }
}
