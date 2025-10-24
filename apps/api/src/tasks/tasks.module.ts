import { Module } from '@nestjs/common';
import { TasksResolver } from './tasks.resolver';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';

/**
 * 任务模块
 *
 * 设计原则：
 * - 轻量级：只包含 Resolver，不涉及数据存储
 * - 依赖注入：RabbitMQService 由 RabbitMQModule 提供
 * - 存在即合理：提供手动触发任务的 GraphQL 接口
 */
@Module({
  imports: [RabbitMQModule],
  providers: [TasksResolver],
})
export class TasksModule {}
