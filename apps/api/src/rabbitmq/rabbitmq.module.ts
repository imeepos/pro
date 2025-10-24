import { Module } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';

/**
 * API 服务的 RabbitMQ 功能模块
 *
 * 存在即合理：
 * - 提供业务特定的 RabbitMQService 包装器
 * - 基础连接由 @pro/rabbitmq 的 RabbitMQModule 全局提供
 *
 * 优雅即简约：
 * - 薄模块，只提供业务逻辑层
 * - 依赖全局 RabbitMQModule 的连接管理
 */
@Module({
  providers: [RabbitMQService],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}
