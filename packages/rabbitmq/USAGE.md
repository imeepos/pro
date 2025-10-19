# @pro/rabbitmq 使用指南

优雅、类型安全的 RabbitMQ 操作工具包。

## 核心设计原则

- **存在即合理**: 每个 API 都解决实际痛点
- **优雅即简约**: 简洁直观，减少样板代码
- **类型安全**: 充分利用 TypeScript 泛型和类型推导
- **性能即艺术**: 连接复用、批量发布优化

## 快速开始

### 安装

```bash
pnpm add @pro/rabbitmq
```

### 基础使用

#### 1. 使用新的 RabbitMQService (推荐)

```typescript
import { RabbitMQService } from '@pro/rabbitmq';
import { QUEUE_NAMES, type RawDataReadyEvent } from '@pro/types';

const rabbitMQ = new RabbitMQService({
  url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  maxRetries: 3,
  enableDLQ: true,
});

await rabbitMQ.initialize();

// 发布消息
const event: RawDataReadyEvent = {
  rawDataId: '123',
  sourceType: SourceType.WEIBO_SEARCH,
  sourcePlatform: SourcePlatform.WEIBO,
  sourceUrl: 'https://weibo.com/...',
  contentHash: 'abc123',
  createdAt: new Date().toISOString(),
};

await rabbitMQ.publish(QUEUE_NAMES.RAW_DATA_READY, event);

// 消费消息
await rabbitMQ.consume(
  QUEUE_NAMES.RAW_DATA_READY,
  async (message, metadata) => {
    console.log('收到消息:', message);
    console.log('元数据:', metadata);

    // 处理消息...
  },
  {
    prefetchCount: 1,
  }
);

// 监听连接事件
rabbitMQ.onConnectionEvent('connected', (event) => {
  console.log('RabbitMQ 已连接', event);
});

rabbitMQ.onConnectionEvent('error', (event) => {
  console.error('RabbitMQ 错误', event);
});

// 关闭连接
await rabbitMQ.close();
```

#### 2. 继续使用现有的 RabbitMQClient (向后兼容)

```typescript
import { RabbitMQClient } from '@pro/rabbitmq';
import { QUEUE_NAMES } from '@pro/types';

const client = new RabbitMQClient({
  url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  queue: QUEUE_NAMES.RAW_DATA_READY,
  maxRetries: 3,
  enableDLQ: true,
});

await client.connect();

await client.publish(QUEUE_NAMES.RAW_DATA_READY, { data: 'test' });

await client.consume(
  QUEUE_NAMES.RAW_DATA_READY,
  async (message) => {
    console.log('收到消息:', message);
  },
  {
    prefetchCount: 1,
  }
);

await client.close();
```

## 高级用法

### 批量发布

```typescript
import { RabbitMQService } from '@pro/rabbitmq';
import { QUEUE_NAMES } from '@pro/types';

const rabbitMQ = new RabbitMQService({
  url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
});

await rabbitMQ.initialize();

const events = [
  { id: 1, data: 'event1' },
  { id: 2, data: 'event2' },
  { id: 3, data: 'event3' },
];

const result = await rabbitMQ.publishBatch(
  QUEUE_NAMES.RAW_DATA_READY,
  events
);

console.log(`成功: ${result.successCount}, 失败: ${result.failureCount}`);
console.log(`总耗时: ${result.totalTimeMs}ms`);

if (result.failureCount > 0) {
  console.log('失败的索引:', result.failedIndices);
}
```

### 自定义发布选项

```typescript
await rabbitMQ.publish(
  QUEUE_NAMES.CLEANED_DATA,
  event,
  {
    priority: 8,           // 消息优先级 (0-10)
    expiration: 60000,     // 60秒后过期
    persistent: true,      // 持久化
    messageId: 'msg-123',  // 消息ID
  }
);
```

### 自定义消费选项

```typescript
await rabbitMQ.consume(
  QUEUE_NAMES.RAW_DATA_READY,
  async (message, metadata) => {
    console.log('重试次数:', metadata.retryCount);
    console.log('消息ID:', metadata.messageId);

    // 处理消息...
  },
  {
    prefetchCount: 10,     // 并发处理10条消息
    retryStrategy: {
      maxRetries: 5,
      backoffMs: 2000,     // 基础退避时间 2 秒
      maxBackoffMs: 60000, // 最大退避时间 60 秒
    },
  }
);
```

### 连接状态监控

```typescript
import { ConnectionState } from '@pro/rabbitmq';

// 获取当前连接状态
const state = rabbitMQ.getConnectionState();
console.log('当前状态:', state);

// 检查是否已连接
if (rabbitMQ.isConnected()) {
  console.log('RabbitMQ 已连接');
}

// 监听连接事件
rabbitMQ.onConnectionEvent('connected', (event) => {
  console.log('连接建立', event.timestamp);
});

rabbitMQ.onConnectionEvent('disconnected', (event) => {
  console.log('连接断开', event.timestamp);
});

rabbitMQ.onConnectionEvent('reconnecting', (event) => {
  console.log('正在重连...', event.state);
});

rabbitMQ.onConnectionEvent('error', (event) => {
  console.error('连接错误', event.error?.message);
});

rabbitMQ.onConnectionEvent('blocked', (event) => {
  console.warn('连接被阻塞', event.metadata);
});

rabbitMQ.onConnectionEvent('unblocked', (event) => {
  console.log('连接恢复正常');
});
```

## NestJS 集成示例

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQService } from '@pro/rabbitmq';
import { QUEUE_NAMES, type CleanedDataEvent } from '@pro/types';

@Injectable()
export class RabbitMQServiceWrapper implements OnModuleInit, OnModuleDestroy {
  private rabbitMQ: RabbitMQService;

  constructor(private readonly configService: ConfigService) {
    this.rabbitMQ = new RabbitMQService({
      url: this.configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672',
      maxRetries: 3,
      enableDLQ: true,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.rabbitMQ.initialize();

    this.rabbitMQ.onConnectionEvent('connected', () => {
      console.log('[RabbitMQ] 连接已建立');
    });

    this.rabbitMQ.onConnectionEvent('error', (event) => {
      console.error('[RabbitMQ] 连接错误:', event.error?.message);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.rabbitMQ.close();
  }

  async publishCleanedData(event: CleanedDataEvent): Promise<boolean> {
    return this.rabbitMQ.publish(QUEUE_NAMES.CLEANED_DATA, event);
  }

  getService(): RabbitMQService {
    return this.rabbitMQ;
  }
}
```

## 类型定义

```typescript
// 配置选项
interface RabbitMQConfig {
  url: string;
  queue?: string;
  maxRetries?: number;        // 默认 3
  enableDLQ?: boolean;        // 默认 true
  poolSize?: number;          // 默认 5
  heartbeat?: number;         // 默认 30 秒
}

// 发布选项
interface PublishOptions {
  priority?: number;          // 0-10，默认 5
  expiration?: number;        // 毫秒
  persistent?: boolean;       // 默认 true
  messageId?: string;
  correlationId?: string;
}

// 消费选项
interface ConsumerOptions {
  prefetchCount?: number;     // 默认 1
  noAck?: boolean;            // 默认 false
  retryStrategy?: RetryStrategy;
  deadLetterExchange?: string;
  consumerTag?: string;
}

// 重试策略
interface RetryStrategy {
  maxRetries: number;
  backoffMs: number;
  maxBackoffMs?: number;
}

// 消息元数据
interface MessageMetadata {
  messageId?: string;
  correlationId?: string;
  timestamp?: number;
  retryCount: number;
  properties: Record<string, any>;
}

// 批量发布结果
interface BatchPublishResult {
  successCount: number;
  failureCount: number;
  failedIndices: number[];
  totalTimeMs: number;
}

// 连接状态
enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  CLOSING = 'closing',
  CLOSED = 'closed',
  ERROR = 'error',
}
```

## 迁移指南

### 从 RabbitMQClient 迁移到 RabbitMQService

```typescript
// 旧代码
const client = new RabbitMQClient({ url, queue });
await client.connect();
await client.publish(queue, message);
await client.close();

// 新代码
const service = new RabbitMQService({ url });
await service.initialize();
await service.publish(queueName, message);
await service.close();
```

### 消费者迁移

```typescript
// 旧代码
await client.consume(queue, async (message) => {
  // 处理消息
});

// 新代码 - 获得元数据支持
await service.consume(queueName, async (message, metadata) => {
  console.log('重试次数:', metadata.retryCount);
  // 处理消息
});
```

## 最佳实践

1. **连接管理**: 在应用启动时初始化一次，全局复用
2. **错误处理**: 监听连接事件，及时处理异常
3. **优雅关闭**: 应用关闭时调用 `close()` 方法
4. **批量发布**: 大量消息时使用 `publishBatch()` 提升性能
5. **预取控制**: 根据消息处理耗时调整 `prefetchCount`
6. **重试策略**: 根据业务场景自定义重试次数和退避时间

## 向后兼容性

- 完全兼容现有的 `RabbitMQClient` API
- 新增的 `RabbitMQService` 提供更优雅的 API
- 所有现有代码无需修改即可继续使用
- 建议新代码使用 `RabbitMQService`

## 性能优化

- 连接和通道复用，减少开销
- 批量发布减少网络往返
- 可配置的预取数量控制并发
- 自动重连机制确保可用性
