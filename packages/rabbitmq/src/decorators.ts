import { Inject } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service.js';

/**
 * 注入 RabbitMQ 服务
 *
 * 优雅即简约：一行代码完成依赖注入
 *
 * 使用示例：
 * ```ts
 * @Injectable()
 * export class MyService {
 *   constructor(@InjectRabbitMQ() private readonly rabbitmq: RabbitMQService) {}
 *
 *   async publishMessage() {
 *     await this.rabbitmq.publish('my-queue', { data: 'hello' });
 *   }
 * }
 * ```
 */
export const InjectRabbitMQ = () => Inject(RabbitMQService);
