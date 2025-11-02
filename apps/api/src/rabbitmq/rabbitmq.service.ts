import { Injectable } from '@nestjs/common';
import { RabbitMQService as BaseRabbitMQService } from '@pro/rabbitmq';
import { root } from '@pro/core';
import {
  QUEUE_NAMES,
  CleanTaskEvent,
  AnalyzeTaskEvent,
  AggregateTaskEvent,
} from '@pro/types';

/**
 * API 服务的 RabbitMQ 包装器
 *
 * 存在即合理：
 * - 提供业务特定的发布方法
 * - 统一的日志格式
 * - 类型安全的事件发布
 *
 * 优雅即简约：
 * - 使用 root.get 获取基础服务
 * - 薄包装层，仅封装业务逻辑
 */
@Injectable()
export class RabbitMQService {
  private readonly baseService: BaseRabbitMQService;

  constructor() {
    this.baseService = root.get(BaseRabbitMQService);
  }

  async publishCleanTask(event: CleanTaskEvent): Promise<boolean> {
    return this.baseService.publish(QUEUE_NAMES.CLEAN_TASK, event, {
      persistent: true,
    });
  }

  async publishAnalyzeTask(event: AnalyzeTaskEvent): Promise<boolean> {
    return this.baseService.publish(QUEUE_NAMES.ANALYZE_TASK, event, {
      persistent: true,
    });
  }

  async publishAggregateTask(event: AggregateTaskEvent): Promise<boolean> {
    return this.baseService.publish(QUEUE_NAMES.AGGREGATE_TASK, event, {
      persistent: true,
    });
  }

  isConnected(): boolean {
    return this.baseService.isConnected();
  }
}
