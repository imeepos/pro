import { Module, Global } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';

/**
 * RabbitMQ 全局模块
 *
 * 设计原则：
 * - Global 装饰器：避免在多个模块中重复导入
 * - 单例服务：整个应用共享同一个 RabbitMQ 连接
 * - 存在即合理：提供消息发布能力，是微服务通信的桥梁
 */
@Global()
@Module({
  providers: [RabbitMQService],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}
