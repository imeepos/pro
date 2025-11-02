# @pro/core 架构设计完全指南

## 概述

@pro/core 是一个轻量级的依赖注入框架，设计用于支持整个系统的模块化和依赖解耦。它采用了 Angular 风格的注入器架构，但针对 NestJS/Node.js 环境进行了优化。

**核心哲学**: 存在即合理 - 每一个类、方法、属性都必须有其不可替代的存在理由。

---

## 第一部分：核心概念

### 1.1 注入器层级体系

@pro/core 实现了严格的层级注入器模式：

```
NullInjector (虚拟根)
    ↓
RootInjector (全局单例) - 基础服务层
    ↓
PlatformInjector (全局单例) - 跨应用共享服务
    ↓
ApplicationInjector - 应用级服务
    ↓
FeatureInjector - 功能模块级服务
```

每个注入器：
- 缓存其实例化的服务
- 向父注入器委托未找到的依赖
- 支持层级化作用域

### 1.2 InjectorScope 作用域

```typescript
type InjectorScope = 'root' | 'platform' | 'application' | 'feature' | 'auto';
```

| 作用域 | 含义 | 自动注册位置 | 使用场景 |
|------|-----|----------|---------|
| `root` | 根作用域 | RootInjector | 基础设施服务（日志、配置） |
| `platform` | 平台共享 | PlatformInjector | 跨应用共享（如 RedisClient） |
| `application` | 应用级 | ApplicationInjector | 业务逻辑服务 |
| `feature` | 功能模块级 | FeatureInjector | 模块特定服务 |
| `auto` | 自动 | 当前注入器 | 灵活注册（默认选项） |

---

## 第二部分：API 详解

### 2.1 创建与初始化

#### RootInjector 创建（全局唯一）

```typescript
import { createRootInjector, root } from '@pro/core';

// ✅ 方式 1：使用便捷函数（推荐）
// 在 main.ts 或启动脚本中执行一次
const rootInjector = createRootInjector([
  // 可选的根级提供者
  { provide: 'ROOT_CONFIG', useValue: { debug: true } }
]);

// ✅ 方式 2：直接访问全局 root 对象
// root 已在 index.ts 中预初始化
const service = root.get(SomeService);
```

**关键特性**：
- 全局唯一，多次调用会抛错
- 自动启用 `providedIn: 'root'` 的服务自动注册
- 作为其他注入器的父级

#### PlatformInjector 创建（全局唯一）

```typescript
import { createRootInjector, createPlatformInjector } from '@pro/core';

// ⚠️ 必须先创建 RootInjector
const rootInjector = createRootInjector();

// 创建 PlatformInjector（自动使用 RootInjector 作为父级）
const platformInjector = createPlatformInjector([
  { provide: 'PLATFORM_TOKEN', useValue: { } }
]);

// 获取已存在的 PlatformInjector
import { getPlatformInjector } from '@pro/core';
const platform = getPlatformInjector(); // 如果不存在则抛错
```

#### ApplicationInjector 创建

```typescript
import { createApplicationInjector } from '@pro/core';

// ⚠️ 必须先创建 PlatformInjector
const appInjector = createApplicationInjector([
  { provide: ConfigService, useClass: ConfigService }
]);

// 获取依赖
const config = appInjector.get(ConfigService);
```

#### FeatureInjector 创建

```typescript
import { createFeatureInjector } from '@pro/core';

// 创建功能模块注入器，通常以 ApplicationInjector 为父级
const featureInjector = createFeatureInjector(
  [
    { provide: FeatureService, useClass: FeatureService }
  ],
  appInjector // 父注入器
);
```

### 2.2 核心方法：get() 和 set()

#### get<T>(token, defaultValue?)

```typescript
// ✅ 基本用法
const service = injector.get(SomeService);

// ✅ 使用 InjectionToken
import { InjectionToken } from '@pro/core';
const CONFIG_TOKEN = new InjectionToken<Config>('config');
const config = injector.get(CONFIG_TOKEN);

// ✅ 使用字符串令牌
const apiUrl = injector.get<string>('API_URL');

// ✅ 提供默认值（如果未找到）
const logger = injector.get(LoggerService, new NullLogger());

// ✅ root.get() 访问全局服务
import { root } from '@pro/core';
const redisClient = root.get(RedisClient);
```

**get() 的解析流程**：
1. 检查本地缓存（已实例化的服务）
2. 检查本地提供者
3. 尝试自动解析 `providedIn` 服务
4. 委托给父注入器
5. 抛错或返回默认值

#### set(providers)

```typescript
// ✅ 动态注册提供者（多数场景不需要）
injector.set([
  { provide: Service1, useClass: Service1 },
  { provide: Token2, useValue: { data: 'value' } }
]);

// ✅ root.set() 向全局注册（在服务初始化时）
import { root } from '@pro/core';
root.set([
  { provide: RedisClient, useClass: RedisClient }
]);

// ✅ 注册多值提供者（用于 @Inject() 获取数组）
root.set([
  { provide: 'PLUGINS', useValue: plugin1, multi: true },
  { provide: 'PLUGINS', useValue: plugin2, multi: true }
]);

const plugins = root.get('PLUGINS'); // 返回数组
```

---

## 第三部分：装饰器使用

### 3.1 @Injectable 装饰器

```typescript
import { Injectable } from '@pro/core';

// ✅ 基本用法：自动在 root 注册（默认 providedIn: 'root'）
@Injectable()
export class LoggerService {
  log(msg: string) { console.log(msg); }
}

// ✅ 指定作用域
@Injectable({ providedIn: 'application' })
export class UserService {
  // 在 ApplicationInjector 中自动注册
}

// ✅ 使用工厂函数
@Injectable({
  providedIn: 'root',
  useFactory: (config: ConfigService) => {
    return new CacheService(config.cacheOptions);
  },
  deps: [ConfigService] // 声明工厂依赖
})
export class CacheService {
  constructor(readonly options: any) {}
}

// ✅ 不自动注册（需手动配置）
@Injectable({ providedIn: null })
export class SpecialService {
  // 只能通过手动 root.set() 注册
}
```

### 3.2 @Inject 装饰器

```typescript
import { Inject } from '@pro/core';

export class OrderService {
  constructor(
    // ✅ 注入类型
    private readonly userService: UserService,

    // ✅ 注入 InjectionToken
    @Inject(CONFIG_TOKEN)
    private readonly config: Config,

    // ✅ 注入字符串令牌
    @Inject('API_URL')
    private readonly apiUrl: string,

    // ✅ 可选依赖（找不到时返回 null）
    @Inject(OptionalService) @Optional()
    private readonly optional?: OptionalService,

    // ✅ 跳过当前注入器，从父注入器查找
    @Inject(ParentService) @SkipSelf()
    private readonly parent?: ParentService,

    // ✅ 只在当前注入器查找
    @Inject(LocalService) @Self()
    private readonly local?: LocalService,

    // ✅ 在宿主注入器查找
    @Inject(RootService) @Host()
    private readonly host?: RootService
  ) {}
}
```

参数装饰器说明：
- `@Optional()` - 可选依赖，找不到时为 null
- `@SkipSelf()` - 跳过当前注入器，从父级开始查找
- `@Self()` - 仅在当前注入器查找，不查找父级
- `@Host()` - 在宿主注入器（根注入器）查找

---

## 第四部分：实战应用模式

### 4.1 模式：root.get() 获取全局服务

这是 @pro/core 最强大的特性。比 NestJS 依赖注入更灵活。

#### 使用场景：当无法直接注入时

```typescript
// ❌ 不适合注入：在静态方法、工厂函数中
export class UserFactory {
  static create(id: string) {
    // 无法通过构造函数注入，因为这是工厂方法
    const db = root.get(Database);
    const user = new User(id);
    user.setDatabase(db);
    return user;
  }
}

// ❌ 不适合注入：在异步初始化期间
export async function initializeApp() {
  const configService = root.get(ConfigService);
  const config = await configService.load();
  
  const redisClient = root.get(RedisClient);
  await redisClient.connect();
}

// ❌ 不适合注入：在模块级的服务初始化
@Injectable()
export class DatabaseService implements OnInit {
  private redis: RedisClient;

  constructor() {
    // 在构造函数无法注入时，推迟到 onInit
    this.redis = root.get(RedisClient);
  }

  async onInit() {
    await this.redis.connect();
  }
}
```

#### 实战例子：Redis 服务获取

```typescript
import { root } from '@pro/core';
import { RedisClient } from '@pro/redis';

@Injectable()
export class WeiboSessionStorage {
  private redis: RedisClient;

  constructor(private readonly logger: Logger) {
    // ✅ 在构造函数中获取全局 RedisClient
    this.redis = root.get(RedisClient);
  }

  async getSession(id: string) {
    // 使用 redis 实例
    return this.redis.get(`session:${id}`);
  }
}
```

为什么这样设计？
- `RedisClient` 在 @pro/redis 的模块初始化时已经注册到 root
- SessionStorage 是各个应用模块共有的，但注入 Redis 不是主要职责
- 使用 root.get() 表示这是一个"全局基础设施依赖"，而非核心业务依赖

#### 实战例子：RabbitMQ 服务获取

```typescript
import { root } from '@pro/core';
import { RabbitMQService } from '@pro/rabbitmq';

@Injectable()
export class RabbitMQService {
  private readonly baseService: RabbitMQService;

  constructor() {
    // ✅ 获取全局 RabbitMQ 基础服务
    this.baseService = root.get(RabbitMQService);
  }

  async publishTask(queue: string, message: any) {
    return this.baseService.publish(queue, message);
  }
}
```

#### 实战例子：配置服务获取

```typescript
import { root } from '@pro/core';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WeiboRabbitMQConfigService {
  private configService: ConfigService;

  constructor() {
    // ✅ 获取全局配置服务
    this.configService = root.get(ConfigService);
    
    const rabbitMQUrl = this.configService.get('RABBITMQ_URL');
    // ...
  }
}
```

### 4.2 模式：实体自动注册

@pro/entities 使用 `@Entity` 装饰器和 ENTITY token 实现实体自动收集：

```typescript
// packages/entities/src/decorator.ts
import { InjectionToken, root } from '@pro/core';

export const ENTITY = new InjectionToken<Type<any>[]>('ENTITY');

export const Entity = (name?: string): ClassDecorator => {
  return (target) => {
    // ✅ 当装饰器执行时，自动注册到 root
    root.set([{ provide: ENTITY, useValue: target, multi: true }]);
    return TypeormEntity(name)(target);
  };
};
```

使用方式：

```typescript
// packages/entities/src/weibo-post.entity.ts
@Entity('weibo_posts')  // 自动向 root 注册
export class WeiboPostEntity {
  @PrimaryColumn()
  id!: string;
  // ...
}

// packages/entities/src/weibo-account.entity.ts
@Entity('weibo_accounts')  // 自动向 root 注册
export class WeiboAccountEntity {
  // ...
}

// packages/entities/src/index.ts
import { root } from '@pro/core';

export const createDatabaseConfig = () => {
  // ✅ 获取所有注册的实体类
  const entities = root.get(ENTITY, []);
  
  return {
    type: 'postgres',
    entities,  // 自动包含所有 @Entity 装饰的类
    // ...
  };
};
```

**优势**：
- 无需手动维护实体列表
- 新增实体时自动生效
- 使用装饰器元数据的编译时优化

### 4.3 模式：队列配置注册

@pro/rabbitmq 使用 token 和 multi provider 模式：

```typescript
// packages/rabbitmq/src/tokens.ts
import { InjectionToken, root } from '@pro/core';

export interface MqQueueConfig {
  queue: string;
  dlq: string;
}

export const MQ_QUEUE_CONFIG = new InjectionToken<MqQueueConfig[]>(
  'MQ_QUEUE_CONFIG'
);

// ✅ 获取所有队列配置（多值注入）
export function getMqQueueConfigs(): MqQueueConfig[] {
  return root.get(MQ_QUEUE_CONFIG);
}

// ✅ 获取特定队列配置
export function getMqQueueConfig(name: string): MqQueueConfig {
  const configs = getMqQueueConfigs();
  return configs.find(it => it.queue === name)!;
}

// ✅ 注册队列配置
export function registerMqQueues() {
  root.set([
    {
      provide: MQ_QUEUE_CONFIG,
      useValue: { queue: 'weibo_crawl', dlq: 'weibo_crawl_dlq' },
      multi: true  // 允许多值注入
    },
    {
      provide: MQ_QUEUE_CONFIG,
      useValue: { queue: 'clean_task', dlq: 'clean_task_dlq' },
      multi: true
    }
  ]);
}
```

调用方：

```typescript
// 在应用启动时调用
import { registerMqQueues, getMqQueueConfigs } from '@pro/rabbitmq';

async function bootstrap() {
  // ✅ 注册所有队列配置
  registerMqQueues();
  
  // ✅ 获取所有配置
  const configs = getMqQueueConfigs();
  console.log(configs);
}
```

### 4.4 模式：OnInit 生命周期钩子

@pro/core 支持异步初始化：

```typescript
import { Injectable, OnInit } from '@pro/core';

@Injectable()
export class DatabaseService implements OnInit {
  private connection: any;

  async onInit() {
    // ✅ 在注入器初始化时被自动调用
    this.connection = await this.createConnection();
    console.log('Database initialized');
  }

  private async createConnection() {
    // ...
  }
}

// 在应用启动时调用注入器初始化
const injector = createApplicationInjector([
  { provide: DatabaseService, useClass: DatabaseService }
]);

await injector.init(); // ✅ 调用所有带 @OnInit() 的服务
```

---

## 第五部分：最佳实践

### 5.1 何时使用 @Inject vs root.get()

| 场景 | 方案 | 原因 |
|------|-----|-----|
| 业务类构造函数 | `@Inject()` | 清晰的依赖声明，易于测试 |
| 基础设施服务 | `root.get()` | 解耦业务与基础设施 |
| 静态方法/工厂 | `root.get()` | 无法注入 |
| 异步初始化 | `root.get()` | 动态获取 |
| 可选依赖 | `@Optional()` | 明确表示可选性 |

### 5.2 避免循环依赖

```typescript
// ❌ 错误：A 依赖 B，B 依赖 A
@Injectable()
export class ServiceA {
  constructor(private b: ServiceB) {} // 循环！
}

@Injectable()
export class ServiceB {
  constructor(private a: ServiceA) {} // 循环！
}

// ✅ 改进：使用 root.get() 延迟依赖解析
@Injectable()
export class ServiceA {
  getB() {
    return root.get(ServiceB);
  }
}

@Injectable()
export class ServiceB {
  constructor(private a: ServiceA) {}
}
```

### 5.3 类型安全的 Token

```typescript
import { InjectionToken } from '@pro/core';

// ✅ 定义类型安全的 token
export interface AppConfig {
  apiUrl: string;
  debug: boolean;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

// ✅ 注册
root.set([
  { provide: APP_CONFIG, useValue: { apiUrl: 'http://...', debug: true } }
]);

// ✅ 注入
@Injectable()
export class ApiService {
  constructor(@Inject(APP_CONFIG) private config: AppConfig) {
    // config 类型完全安全
  }
}
```

### 5.4 多值提供者最佳实践

```typescript
import { InjectionToken } from '@pro/core';

// 定义 token
export const PLUGINS = new InjectionToken<Plugin[]>('PLUGINS');

// 注册多值
root.set([
  { provide: PLUGINS, useValue: plugin1, multi: true },
  { provide: PLUGINS, useValue: plugin2, multi: true },
  { provide: PLUGINS, useValue: plugin3, multi: true }
]);

// 获取数组
const plugins = root.get(PLUGINS);

// 在服务中使用
@Injectable()
export class PluginManager {
  constructor(@Inject(PLUGINS) private plugins: Plugin[]) {
    // plugins 是数组
  }
}
```

---

## 第六部分：与 NestJS 的集成

@pro/core 可与 NestJS 无缝集成：

```typescript
import { Module, Injectable } from '@nestjs/common';
import { createRootInjector, root } from '@pro/core';

// ✅ 在应用启动时初始化 @pro/core
async function bootstrap() {
  // 创建全局注入器
  createRootInjector([
    // 可选的基础服务
  ]);

  // 启动 NestJS 应用
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}

// ✅ 在 NestJS 服务中使用 root.get()
@Injectable()
export class AppService {
  constructor() {
    // 获取全局服务
    const redis = root.get(RedisClient);
    this.redis = redis;
  }
}

// ✅ 导出 NestJS Module
@Module({
  providers: [AppService],
  exports: [AppService]
})
export class AppModule {}

bootstrap();
```

---

## 第七部分：微博 Entity 设计

### 7.1 核心 Entity 概览

```typescript
// WeiboAccountEntity - 用户绑定的微博账号
@Entity('weibo_accounts')
export class WeiboAccountEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'uuid' })
  userId: string;  // 系统用户 ID

  @Column({ type: 'varchar' })
  weiboUid: string;  // 微博账号 UID

  @Column({ type: 'varchar', nullable: true })
  weiboNickname: string;  // 昵称

  @Column({ type: 'varchar', nullable: true })
  weiboAvatar: string;  // 头像

  @Column({ type: 'text' })
  cookies: string;  // 登录凭证

  @Column({ type: 'enum', enum: WeiboAccountStatus })
  status: WeiboAccountStatus;  // ACTIVE/SUSPENDED/BANNED

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  user: UserEntity;  // 关联系统用户
}

// WeiboPostEntity - 微博帖子
@Entity('weibo_posts')
export class WeiboPostEntity {
  @PrimaryColumn({ type: 'bigint', unsigned: true })
  id!: string;  // 微博 ID

  @Column({ type: 'varchar' })
  mid!: string;  // 微博 mid（消息 ID）

  @Column({ type: 'text' })
  text!: string;  // 帖子文本

  @Column({ type: 'integer' })
  reposts_count!: number;  // 转发数

  @Column({ type: 'integer' })
  comments_count!: number;  // 评论数

  @Column({ type: 'integer' })
  attitudes_count!: number;  // 点赞数

  @CreateDateColumn()
  ingested_at!: Date;  // 采集时间

  @UpdateDateColumn()
  updated_at!: Date;  // 更新时间

  @DeleteDateColumn({ nullable: true })
  deleted_at!: Date | null;  // 软删除时间
}
```

### 7.2 Entity 关系设计

```
UserEntity (系统用户)
    ↓ (1:N)
WeiboAccountEntity (微博账号)
    ↓ (1:N)
WeiboPostEntity (微博帖子)
    ├─ (1:N) → WeiboCommentEntity (评论)
    ├─ (1:N) → WeiboRepostEntity (转发)
    ├─ (1:N) → WeiboLikeEntity (点赞)
    └─ (1:N) → WeiboMediaEntity (媒体)
```

### 7.3 使用 useEntityManager 的模式

```typescript
import { useEntityManager, useTranslation, WeiboPostEntity } from '@pro/entities';

// ✅ 单个操作
export async function getPost(id: string) {
  return useEntityManager(async (m) => {
    return m.findOne(WeiboPostEntity, {
      where: { id }
    });
  });
}

// ✅ 事务操作
export async function updatePostStats(postId: string, stats: any) {
  return useTranslation(async (m) => {
    const post = await m.findOne(WeiboPostEntity, {
      where: { id: postId }
    });
    if (post) {
      post.reposts_count = stats.reposts;
      post.comments_count = stats.comments;
      await m.save(post);
    }
    return post;
  });
}

// ✅ 批量操作
export async function saveMultiplePosts(posts: WeiboPostEntity[]) {
  return useTranslation(async (m) => {
    return m.save(posts);
  });
}
```

---

## 第八部分：常见错误与调试

### 8.1 循环依赖检测

```typescript
// 错误示例
@Injectable()
export class ServiceA {
  constructor(b: ServiceB) {}
}

@Injectable()
export class ServiceB {
  constructor(a: ServiceA) {}
}

// 调用时会抛出：
// Error: 检测到循环依赖: ServiceA -> ServiceB -> ServiceA
```

### 8.2 多次创建 RootInjector

```typescript
// ❌ 错误
createRootInjector();
createRootInjector(); // Error: Root injector already exists!

// ✅ 正确：只创建一次
if (!getRootInjector()) {
  createRootInjector();
}
```

### 8.3 在 PlatformInjector 前创建 ApplicationInjector

```typescript
// ❌ 错误
const appInjector = createApplicationInjector(); // Error: Platform injector not found!

// ✅ 正确：按顺序创建
createRootInjector();
createPlatformInjector();
const appInjector = createApplicationInjector();
```

---

## 第九部分：完整应用示例

### apps/api 的推荐启动流程

```typescript
// apps/api/src/main.ts
import { createRootInjector, createPlatformInjector } from '@pro/core';
import { registerMqQueues } from '@pro/rabbitmq';

async function bootstrap() {
  // 1. 创建全局注入器
  createRootInjector([
    // 可选的根级配置
  ]);

  // 2. 创建平台注入器
  createPlatformInjector([
    // 可选的平台级配置
  ]);

  // 3. 注册消息队列配置
  registerMqQueues();

  // 4. 启动 NestJS 应用
  const app = await NestFactory.create(AppModule);
  
  // 5. 初始化注入器中的所有服务
  const injector = app.get(Injector);
  await injector.init();

  await app.listen(3000);
  console.log('Application started');
}

bootstrap().catch(console.error);
```

---

## 总结

@pro/core 的设计遵循：

1. **最小必要性** - 每个 API 都有不可替代的用途
2. **层级清晰** - 从 Root → Platform → Application → Feature
3. **灵活获取** - root.get() 解决基础设施依赖
4. **类型安全** - 使用 InjectionToken 保证类型
5. **自动注册** - 装饰器模式的编译时优化

掌握这些模式，能够优雅地处理大型系统的依赖管理。
