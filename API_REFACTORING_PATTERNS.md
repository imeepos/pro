# apps/api 重构模式与示例

本文档展示如何在 apps/api 中应用 @pro/core 架构来重构现有代码。

---

## 模式 1：使用 root.get() 注入基础设施服务

### 现状：直接在构造函数中注入

```typescript
// 旧方式：在 NestJS 服务中注入
@Injectable()
export class WeiboSessionStorage {
  constructor(
    private readonly redis: RedisClient,
    private readonly logger: Logger,
    private readonly config: ConfigService,
  ) {}
}
```

**问题**：
- Redis/Logger/Config 是全局基础设施，不应该成为服务的必需依赖
- 增加了构造函数的复杂度
- 不利于单元测试

### 新模式：使用 root.get() 延迟获取

```typescript
import { root } from '@pro/core';
import { RedisClient } from '@pro/redis';

@Injectable()
export class WeiboSessionStorage {
  private redis: RedisClient;

  constructor(private readonly logger: Logger) {
    // ✅ 基础设施依赖通过 root.get() 获取
    this.redis = root.get(RedisClient);
  }

  async createSession(userId: string): Promise<SessionData> {
    const session: SessionData = {
      sessionId: `${userId}_${Date.now()}`,
      userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 300000),
      status: 'active',
    };

    // 使用 redis 存储会话
    await this.redis.set(
      `weibo:session:${session.sessionId}`,
      session,
      300
    );

    return session;
  }
}
```

**优势**：
- 构造函数只包含核心业务依赖
- Redis 获取被延迟到实际使用时
- 易于测试：可以在测试前 mock root.get()

---

## 模式 2：RabbitMQ 服务的薄包装

### 现状：重复的 RabbitMQ 调用

```typescript
// 多个地方重复调用 RabbitMQService
export class TaskPublisher {
  constructor(private readonly rabbitmq: RabbitMQService) {}

  async publishCleanTask(event: CleanTaskEvent) {
    return this.rabbitmq.publish(QUEUE_NAMES.CLEAN_TASK, event);
  }

  async publishAnalyzeTask(event: AnalyzeTaskEvent) {
    return this.rabbitmq.publish(QUEUE_NAMES.ANALYZE_TASK, event);
  }
}
```

### 新模式：使用 root.get() 包装

```typescript
import { root } from '@pro/core';
import { RabbitMQService as BaseRabbitMQService } from '@pro/rabbitmq';
import { QUEUE_NAMES, CleanTaskEvent } from '@pro/types';

@Injectable()
export class RabbitMQService {
  private baseService: BaseRabbitMQService;

  constructor() {
    // ✅ 在构造函数中获取基础 RabbitMQ 服务
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

  isConnected(): boolean {
    return this.baseService.isConnected();
  }
}
```

**优势**：
- 业务代码只依赖 API 层的 RabbitMQService
- 类型安全的事件发布
- 统一的日志记录点

---

## 模式 3：配置服务的中心化获取

### 现状：配置分散在各个服务

```typescript
@Injectable()
export class Service1 {
  constructor(private config: ConfigService) {}
  
  someMethod() {
    const apiUrl = this.config.get('API_URL');
  }
}

@Injectable()
export class Service2 {
  constructor(private config: ConfigService) {}
  
  anotherMethod() {
    const apiUrl = this.config.get('API_URL');
  }
}
```

### 新模式：创建配置代理

```typescript
import { root } from '@pro/core';
import { ConfigService } from '@nestjs/config';
import { InjectionToken } from '@pro/core';

export interface AppConfig {
  apiUrl: string;
  redisUrl: string;
  rabbitmqUrl: string;
  databaseUrl: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

@Injectable()
export class AppConfigService {
  private nestConfig: ConfigService;
  private config: AppConfig;

  constructor() {
    this.nestConfig = root.get(ConfigService);
    this.config = {
      apiUrl: this.nestConfig.get('API_URL'),
      redisUrl: this.nestConfig.get('REDIS_URL'),
      rabbitmqUrl: this.nestConfig.get('RABBITMQ_URL'),
      databaseUrl: this.nestConfig.get('DATABASE_URL'),
    };
  }

  getConfig(): AppConfig {
    return this.config;
  }
}

// 在应用启动时注册
root.set([
  { provide: APP_CONFIG, useClass: AppConfigService }
]);
```

**优势**：
- 集中管理应用配置
- 类型安全的配置访问
- 易于配置验证

---

## 模式 4：会话存储的生命周期管理

### 使用 OnInit 和 OnDestroy

```typescript
import { Injectable, OnInit, OnDestroy } from '@pro/core';
import { RedisClient } from '@pro/redis';
import { root } from '@pro/core';

@Injectable()
export class SessionManager implements OnInit, OnDestroy {
  private redis: RedisClient;
  private cleanupTimer: NodeJS.Timeout;

  constructor() {
    this.redis = root.get(RedisClient);
  }

  async onInit() {
    // ✅ 在注入器初始化时调用
    await this.startCleanupTask();
  }

  async onDestroy() {
    // ✅ 在注入器销毁时调用
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  private async startCleanupTask() {
    this.cleanupTimer = setInterval(async () => {
      await this.cleanupExpiredSessions();
    }, 60000);
  }

  private async cleanupExpiredSessions() {
    const keys = await this.redis.keys('weibo:session:*');
    for (const key of keys) {
      const session = await this.redis.get(key);
      if (session && this.isExpired(session)) {
        await this.redis.del(key);
      }
    }
  }

  private isExpired(session: any): boolean {
    return Date.now() >= session.expiresAt;
  }
}
```

---

## 模式 5：多值提供者用于插件系统

### 定义插件接口

```typescript
import { InjectionToken, root } from '@pro/core';

export interface DataProcessor {
  process(data: any): Promise<any>;
  name: string;
}

export const DATA_PROCESSORS = new InjectionToken<DataProcessor[]>(
  'DATA_PROCESSORS'
);

export function registerProcessor(processor: DataProcessor) {
  root.set([
    { provide: DATA_PROCESSORS, useValue: processor, multi: true }
  ]);
}

export function getProcessors(): DataProcessor[] {
  return root.get(DATA_PROCESSORS, []);
}
```

### 实现具体处理器

```typescript
@Injectable()
export class WeiboDataProcessor implements DataProcessor {
  name = 'weibo-data-processor';

  async process(data: any): Promise<any> {
    // 处理微博数据
    return this.normalizeWeiboData(data);
  }

  private normalizeWeiboData(data: any) {
    return {
      ...data,
      processedAt: new Date(),
      processorName: this.name,
    };
  }
}

// 在应用启动时注册
registerProcessor(new WeiboDataProcessor());
```

### 使用处理器链

```typescript
@Injectable()
export class DataProcessingPipeline {
  async process(data: any): Promise<any> {
    const processors = getProcessors();
    let result = data;

    for (const processor of processors) {
      result = await processor.process(result);
    }

    return result;
  }
}
```

---

## 模式 6：实体管理中心化

### 创建实体管理器

```typescript
import { root } from '@pro/core';
import { ENTITY } from '@pro/entities';

@Injectable()
export class EntityRegistry {
  private entities: Map<string, any> = new Map();

  constructor() {
    // ✅ 从 root 获取所有实体类
    const allEntities = root.get(ENTITY, []);
    
    // 建立索引
    for (const entity of allEntities) {
      this.entities.set(entity.name, entity);
    }
  }

  getEntity(name: string): any {
    return this.entities.get(name);
  }

  getAllEntities(): any[] {
    return Array.from(this.entities.values());
  }

  getEntityCount(): number {
    return this.entities.size;
  }
}
```

### 在数据库迁移中使用

```typescript
@Injectable()
export class DatabaseMigrationService {
  constructor(private entityRegistry: EntityRegistry) {}

  async runMigrations() {
    const entities = this.entityRegistry.getAllEntities();
    console.log(`Starting migration for ${entities.length} entities`);

    for (const entity of entities) {
      await this.migrateEntity(entity);
    }
  }

  private async migrateEntity(entity: any) {
    // 迁移逻辑
  }
}
```

---

## 模式 7：队列配置的中心化管理

### 初始化队列配置

```typescript
import { getMqQueueConfig, registerMqQueues } from '@pro/rabbitmq';

@Injectable()
export class QueueInitializer implements OnInit {
  async onInit() {
    // ✅ 在应用启动时注册队列
    registerMqQueues();
    
    // 验证所有队列
    const queueNames = ['weibo_crawl', 'clean_task', 'analyze_task'];
    for (const queueName of queueNames) {
      const config = getMqQueueConfig(queueName);
      console.log(`Queue configured: ${config.queue} -> DLQ: ${config.dlq}`);
    }
  }
}
```

### 在消费者中使用

```typescript
import { getMqQueueConfig } from '@pro/rabbitmq';

@Injectable()
export class TaskConsumer {
  async consume() {
    // ✅ 获取队列配置
    const config = getMqQueueConfig('clean_task');
    
    // 使用配置
    await this.rabbitMQ.consume(
      config.queue,
      async (message) => {
        try {
          await this.processTask(message);
        } catch (error) {
          // 发送到死信队列
          await this.rabbitMQ.publish(config.dlq, {
            originalMessage: message,
            error: error.message,
          });
        }
      }
    );
  }
}
```

---

## 完整的应用启动流程

### 推荐的 main.ts

```typescript
// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { createRootInjector, createPlatformInjector, root } from '@pro/core';
import { registerMqQueues } from '@pro/rabbitmq';
import { AppModule } from './app.module';

async function bootstrap() {
  // 1️⃣ 初始化 @pro/core 注入器层级
  console.log('[Bootstrap] Initializing @pro/core injectors...');
  createRootInjector([
    // 可选的根级配置
  ]);

  const platformInjector = createPlatformInjector([
    // 可选的平台级配置
  ]);

  // 2️⃣ 注册消息队列配置
  console.log('[Bootstrap] Registering MQ queues...');
  registerMqQueues();

  // 3️⃣ 启动 NestJS 应用
  console.log('[Bootstrap] Starting NestJS application...');
  const app = await NestFactory.create(AppModule);

  // 4️⃣ 获取应用级注入器并初始化
  const appInjector = app.get('APP_INJECTOR');
  if (appInjector?.init) {
    console.log('[Bootstrap] Initializing services...');
    await appInjector.init();
  }

  // 5️⃣ 启动服务器
  const PORT = process.env.PORT || 3000;
  await app.listen(PORT);
  console.log(`[Bootstrap] Application listening on port ${PORT}`);
}

bootstrap()
  .catch((error) => {
    console.error('[Bootstrap] Fatal error:', error);
    process.exit(1);
  });
```

### AppModule 配置

```typescript
import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createApplicationInjector } from '@pro/core';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [
    // 核心服务
    RabbitMQService,
    EntityRegistry,
    QueueInitializer,
    // 业务服务
    WeiboSessionStorage,
    TaskPublisher,
    // ...
  ],
})
export class AppModule implements OnModuleInit, OnModuleDestroy {
  private appInjector: any;

  async onModuleInit() {
    console.log('[AppModule] Initializing...');

    // ✅ 创建应用级注入器
    this.appInjector = createApplicationInjector([
      // 应用级提供者
    ]);

    // ✅ 初始化所有服务
    await this.appInjector.init();
    console.log('[AppModule] Initialization complete');
  }

  async onModuleDestroy() {
    console.log('[AppModule] Destroying...');
    
    if (this.appInjector?.destroy) {
      await this.appInjector.destroy();
    }
  }
}
```

---

## 测试中的使用

### Mock root.get() 进行单元测试

```typescript
import { root, resetRootInjector } from '@pro/core';

describe('WeiboSessionStorage', () => {
  let service: WeiboSessionStorage;
  let mockRedis: any;

  beforeEach(() => {
    // ✅ 重置注入器
    resetRootInjector();

    // ✅ 创建 mock Redis
    mockRedis = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
    };

    // ✅ 注册 mock 到 root
    root.set([
      { provide: RedisClient, useValue: mockRedis }
    ]);

    // ✅ 创建服务
    service = new WeiboSessionStorage(mockLogger);
  });

  afterEach(() => {
    resetRootInjector();
  });

  it('should create session', async () => {
    const session = await service.createSession('user123');
    
    expect(mockRedis.set).toHaveBeenCalledWith(
      expect.stringContaining('weibo:session:'),
      expect.objectContaining({ userId: 'user123' }),
      300
    );
    expect(session.userId).toBe('user123');
  });
});
```

---

## 迁移检查清单

在重构现有服务时，按以下步骤进行：

- [ ] 识别基础设施依赖（Redis, Logger, Config, RabbitMQ 等）
- [ ] 将基础设施依赖从构造函数参数转移到 root.get()
- [ ] 为复杂服务创建薄包装层（如 RabbitMQService 包装）
- [ ] 为实体、配置、队列等使用 InjectionToken + multi provider
- [ ] 为有初始化逻辑的服务实现 OnInit/OnDestroy
- [ ] 更新测试代码，使用 resetRootInjector() 和 mock
- [ ] 验证循环依赖检测工作正常
- [ ] 更新应用启动流程调用 injector.init()

