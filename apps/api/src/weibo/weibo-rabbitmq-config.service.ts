import { Injectable, Logger } from '@nestjs/common';
import { useQueue } from '@pro/rabbitmq';
import type { WeiboTaskStatusMessage } from './interfaces/weibo-task-status.interface';

/**
 * 微博任务状态消息验证服务
 *
 * 存在即合理：
 * - 验证消息格式的完整性和有效性
 * - 转换消息中的日期字段
 * - 提供队列管理器访问接口
 *
 * 优雅即简约：
 * - 无需手动管理连接生命周期（由 useQueue 处理）
 * - 专注于消息验证逻辑，无冗余代码
 */
@Injectable()
export class WeiboRabbitMQConfigService {
  private readonly logger = new Logger(WeiboRabbitMQConfigService.name);
  private readonly queueManager = useQueue<WeiboTaskStatusMessage>('weibo_task_status_queue');

  /**
   * 获取队列管理器
   */
  getQueueManager() {
    return this.queueManager;
  }

  /**
   * 验证消息格式
   */
  validateStatusMessage(message: any): message is WeiboTaskStatusMessage {
    if (!message || typeof message !== 'object') return false;

    const requiredFields = ['taskId', 'status', 'updatedAt'];
    const validStatuses = new Set(['running', 'completed', 'failed', 'timeout']);

    // 检查必需字段
    if (!requiredFields.every(field => field in message)) {
      this.logger.warn('消息缺少必需字段', { message });
      return false;
    }

    // 验证任务ID
    if (typeof message.taskId !== 'number' || message.taskId <= 0) {
      this.logger.warn('无效的任务ID', { taskId: message.taskId });
      return false;
    }

    // 验证状态值
    if (!validStatuses.has(message.status)) {
      this.logger.warn('无效的任务状态', { status: message.status });
      return false;
    }

    // 验证更新时间
    if (isNaN(new Date(message.updatedAt).getTime())) {
      this.logger.warn('无效的更新时间', { updatedAt: message.updatedAt });
      return false;
    }

    return true;
  }

  /**
   * 将RabbitMQ消息转换为标准格式
   */
  parseStatusMessage(rawMessage: any): WeiboTaskStatusMessage | null {
    try {
      const message = { ...rawMessage };

      // 转换日期字段
      ['currentCrawlTime', 'latestCrawlTime', 'nextRunAt', 'updatedAt'].forEach(field => {
        if (message[field]) message[field] = new Date(message[field]);
      });

      if (!this.validateStatusMessage(message)) return null;

      this.logger.debug('解析状态消息成功', {
        taskId: message.taskId,
        status: message.status,
        progress: message.progress,
      });

      return message;
    } catch (error) {
      this.logger.error('解析状态消息失败', { rawMessage, error });
      return null;
    }
  }
}