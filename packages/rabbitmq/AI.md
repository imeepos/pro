# @pro/rabbitmq

RabbitMQ operations wrapper providing elegant, reliable message queue functionality with built-in retry mechanisms and dead letter queue support.

## Core Purpose

封装 RabbitMQ 的消息发布与消费逻辑，提供：
- 自动重试机制
- 死信队列（DLQ）处理
- 优雅的错误处理
- 消息持久化
- 并发控制

## Package Structure

```
packages/rabbitmq/
├── src/
│   ├── index.ts          # Main implementation
│   └── index.d.ts        # Type definitions
├── package.json
└── tsconfig.json
```

## Core Exports

### RabbitMQClient

主消息队列客户端，封装所有 RabbitMQ 操作。

**Location**: `/home/ubuntu/worktrees/pro/packages/rabbitmq/src/index.ts`

### Interfaces

#### RabbitMQConfig
```typescript
interface RabbitMQConfig {
  url: string;              // RabbitMQ 连接 URL
  queue?: string;           // 默认队列名称（可选）
  maxRetries?: number;      // 最大重试次数（默认: 3）
  enableDLQ?: boolean;      // 启用死信队列（默认: true）
}
```

#### ConsumeOptions
```typescript
interface ConsumeOptions {
  noAck?: boolean;          // 自动 ACK（默认: false）
  prefetchCount?: number;   // 预取数量，控制并发（默认: 1）
}
```

## Key Features

### 1. 自动重试机制

消息处理失败时自动重试，重试次数通过 `x-retry-count` 头部跟踪：
- 失败时增加重试计数器
- 未超过 `maxRetries` 时重新入队
- 超过重试上限后发送至死信队列

### 2. 死信队列（DLQ）

自动为每个队列创建对应的死信队列：
- 主队列: `{queueName}`
- 死信交换机: `{queueName}.dlx`
- 死信队列: `{queueName}.dlq`

### 3. 消息持久化

默认启用消息持久化（`persistent: true`），确保消息不会因 RabbitMQ 重启丢失。

### 4. 并发控制

通过 `prefetchCount` 控制并发处理的消息数量，避免消费者过载。

### 5. 优雅的 ACK 机制

- 成功处理：`ack(msg)`
- 失败重试：`nack(msg, false, true)` - 重新入队
- 超过重试：`nack(msg, false, false)` - 进入死信队列

## Usage Examples

### Basic Publisher

```typescript
import { RabbitMQClient } from '@pro/rabbitmq';

const client = new RabbitMQClient({
  url: 'amqp://localhost:5672',
  queue: 'my_queue',
  maxRetries: 3,
  enableDLQ: true
});

await client.connect();

await client.publish('my_queue', {
  taskId: 123,
  data: 'some payload'
}, { persistent: true });

await client.close();
```

### Basic Consumer

```typescript
import { RabbitMQClient } from '@pro/rabbitmq';

const client = new RabbitMQClient({
  url: 'amqp://localhost:5672',
  maxRetries: 3
});

await client.connect();

await client.consume(
  'my_queue',
  async (message) => {
    console.log('Processing:', message);
    // 处理消息逻辑
    // 成功完成自动 ACK
  },
  {
    prefetchCount: 5  // 并发处理 5 条消息
  }
);
```

### NestJS Integration Pattern

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { RabbitMQClient, RabbitMQConfig } from '@pro/rabbitmq';

@Injectable()
export class MessageQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly client: RabbitMQClient;
  private readonly logger = new Logger(MessageQueueService.name);

  constructor() {
    this.client = new RabbitMQClient({
      url: process.env.RABBITMQ_URL,
      queue: 'task_queue',
      maxRetries: 3,
      enableDLQ: true,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    this.logger.log('RabbitMQ 连接成功');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
    this.logger.log('RabbitMQ 连接已关闭');
  }

  async publishTask(task: any): Promise<boolean> {
    return this.client.publish('task_queue', task);
  }

  async startConsumer(handler: (msg: any) => Promise<void>): Promise<void> {
    await this.client.consume('task_queue', handler, {
      prefetchCount: 5
    });
  }
}
```

### Error Handling Pattern

```typescript
await client.consume('task_queue', async (message) => {
  try {
    // 处理消息
    await processMessage(message);
    // 成功：自动 ACK
  } catch (error) {
    // 失败：自动重试或进入 DLQ
    // RabbitMQClient 自动处理重试逻辑
    throw error;  // 重新抛出以触发重试
  }
});
```

## Message Flow

### Success Flow
```
Producer → Queue → Consumer → Process → ACK → Done
```

### Retry Flow
```
Producer → Queue → Consumer → Process → Error
  ↓
NACK (requeue=true, retry < maxRetries)
  ↓
Queue → Consumer → Process (retry)
```

### Dead Letter Flow
```
Producer → Queue → Consumer → Process → Error (retry >= maxRetries)
  ↓
NACK (requeue=false)
  ↓
DLX Exchange → DLQ Queue
```

## Queue Topology

每个队列自动创建以下拓扑结构：

```
Main Queue: my_queue
  ├── Durable: true
  ├── x-dead-letter-exchange: my_queue.dlx
  └── x-dead-letter-routing-key: my_queue

DLX Exchange: my_queue.dlx
  ├── Type: direct
  └── Durable: true

DLQ Queue: my_queue.dlq
  ├── Durable: true
  └── Bound to: my_queue.dlx with routing key: my_queue
```

## Real-World Usage

### Example 1: Crawler Task Queue
**Location**: `/home/ubuntu/worktrees/pro/apps/crawler/src/crawl-queue.consumer.ts`

```typescript
// 消费爬虫任务
this.rabbitMQClient = new RabbitMQClient({
  url: this.rabbitmqConfig.url,
  queue: this.rabbitmqConfig.queues.crawlQueue,
});

await this.rabbitMQClient.consume(
  this.rabbitmqConfig.queues.crawlQueue,
  async (message: SubTaskMessage) => {
    const result = await this.crawlerService.crawl(message);
    if (!result.success) {
      throw new Error(`爬取失败: ${result.error}`);
    }
  }
);
```

### Example 2: Task Status Updates
**Location**: `/home/ubuntu/worktrees/pro/apps/api/src/weibo/weibo-rabbitmq-config.service.ts`

```typescript
// 微博任务状态更新队列
const rabbitMQConfig: RabbitMQConfig = {
  url: this.configService.get<string>('RABBITMQ_URL'),
  queue: 'weibo_task_status_queue',
  maxRetries: 3,
  enableDLQ: true,
};

this.rabbitMQClient = new RabbitMQClient(rabbitMQConfig);
```

## Logging Strategy

日志遵循 **日志是思想的表达** 原则，记录关键状态：

### Publisher Logs
```
[RabbitMQ] 正在发布消息到队列 {queue}, 消息大小: {size} bytes
[RabbitMQ] 消息发布成功到队列 {queue}, 耗时: {duration}ms
[RabbitMQ] 消息发布失败到队列 {queue} - 队列缓冲区满/背压
```

### Consumer Logs
```
[RabbitMQ] 开始处理消息 {messageId} from queue {queue}
[RabbitMQ] 消息 {messageId} 处理成功, 耗时: {duration}ms
[RabbitMQ] 消息 {messageId} 处理失败 - 重试 {retryCount}/{maxRetries}
[RabbitMQ] 消息 {messageId} 重试次数已达上限, 发送到死信队列
```

## Performance Considerations

### Concurrency Control
```typescript
// 低并发（单消息处理）
await client.consume(queue, handler, { prefetchCount: 1 });

// 中等并发（批量处理）
await client.consume(queue, handler, { prefetchCount: 5 });

// 高并发（大规模处理）
await client.consume(queue, handler, { prefetchCount: 20 });
```

### Message Persistence Trade-off
```typescript
// 高可靠性（默认）
await client.publish(queue, message, { persistent: true });

// 高性能（不持久化）
await client.publish(queue, message, { persistent: false });
```

## Design Philosophy

### 存在即合理
每个方法都有不可替代的职责：
- `connect()` - 建立连接
- `setupQueue()` - 配置队列拓扑
- `publish()` - 发布消息
- `consume()` - 消费消息
- `getRetryCount()` - 获取重试次数
- `incrementRetryCount()` - 增加重试次数
- `close()` - 关闭连接

### 错误处理如为人处世的哲学
- 失败不是终点，而是重试的机会
- 超过重试上限时，优雅地进入死信队列
- 每个错误都提供详细的上下文信息

### 性能即艺术
- 通过 `prefetchCount` 平衡并发与稳定性
- 消息持久化与性能之间的优雅权衡
- Channel 复用，避免频繁创建连接

## Dependencies

```json
{
  "amqplib": "^0.10.9"
}
```

## Quick Reference

| Operation | Method | Default Behavior |
|-----------|--------|------------------|
| 连接 | `connect()` | 创建连接和 channel |
| 发布消息 | `publish(queue, message, options)` | 持久化消息 |
| 消费消息 | `consume(queue, callback, options)` | 手动 ACK, prefetch=1 |
| 关闭连接 | `close()` | 优雅关闭 channel 和连接 |

## Environment Variables

```bash
RABBITMQ_URL=amqp://localhost:5672
```

## Common Patterns

### Pattern 1: Fire-and-Forget
```typescript
await client.publish('notifications', { userId: 123, type: 'email' });
```

### Pattern 2: Work Queue with Retry
```typescript
await client.consume('tasks', async (task) => {
  await processTask(task);
}, { prefetchCount: 5 });
```

### Pattern 3: Guaranteed Processing
```typescript
await client.consume('critical_tasks', async (task) => {
  await processCriticalTask(task);
}, { prefetchCount: 1 });  // 单消息处理确保可靠性
```

## Notes for AI

- 此包提供最小化、优雅的 RabbitMQ 封装
- 重试机制和死信队列自动配置，无需手动干预
- 所有队列默认持久化，确保消息不丢失
- 日志详细且有意义，便于问题排查
- NestJS 集成通过 `OnModuleInit` 和 `OnModuleDestroy` 实现生命周期管理

## Migration Notes

如需禁用死信队列（不推荐）：
```typescript
const client = new RabbitMQClient({
  url: 'amqp://localhost:5672',
  enableDLQ: false  // 禁用 DLQ
});
```

如需调整重试次数：
```typescript
const client = new RabbitMQClient({
  url: 'amqp://localhost:5672',
  maxRetries: 5  // 增加到 5 次重试
});
```
