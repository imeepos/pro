# 爬虫系统架构深度分析报告

## 执行摘要

当前爬虫系统采用**微服务+DAG工作流**架构，已建立完整的数据处理管道（采集→清洗→分析→聚合）。
系统具有完整的基础设施层，但在以下方面存在优化空间：
- 任务调度灵活性（当前基于CRON，无分布式锁）
- 数据聚合策略（需增强实时性与缓存机制）
- 错误恢复与补偿（DLQ机制存在，但未充分利用）
- 工作流可观测性（缺少细粒度的执行日志）

---

## 1. 现有服务结构分析

### 1.1 Crawler 服务 (apps/crawler)
**职责**: 执行爬虫任务，采集原始数据

**核心组件**:
```typescript
CrawlQueueConsumer
  ↓ (消费RabbitMQ消息)
CrawlerServiceV2
  ↓ (构建工作流)
WorkflowFactory → WorkflowExecutorService
  ↓ (执行DAG流程)
StorageService (存储到MongoDB)
  ↓ (发布事件)
RawDataReadyEvent → RabbitMQ
```

**关键能力**:
- **工作流驱动**: 使用 @pro/workflow-core 的 DAG 模型
- **账号轮转**: WeiboAccountService 管理账号池
- **浏览器管理**: BrowserGuardianService 管理Playwright实例
- **存储**: StorageService 直接写入MongoDB RawDataSource集合

**数据流**:
1. Broker 发送 `SubTaskMessage` 到 `weibo_crawl_queue`
2. CrawlQueueConsumer 消费消息
3. WorkflowFactory 构建搜索→账号注入→浏览器执行→存储的DAG
4. 成功后发送 RawDataReadyEvent 到 `raw_data_ready_queue`

**缺失能力**:
- ❌ 重试机制（失败直接抛异常）
- ❌ 批量采集模式（当前单条处理）
- ❌ 数据校验（没有checksum或格式验证）
- ❌ 增量采集跟踪（无lastCrawlTime更新逻辑）

---

### 1.2 Broker 服务 (apps/broker)
**职责**: 任务调度与监控

**核心组件**:
```typescript
AggregateSchedulerService
  ├─ @Cron('5 * * * *')  → triggerHourlyAggregation
  └─ @Cron('10 0 * * *') → triggerDailyAggregation

SimpleIntervalScheduler
  └─ 管理 WeiboSearchTask 的定时执行

SimpleTaskMonitor
  └─ 监控任务进度

WeiboAccountHealthScheduler
  └─ 定期检查账号健康度
```

**任务流程**:
- WeiboSearchTask (keyword, crawlInterval, nextRunAt)
  ↓
- 创建 WeiboSubTask (type, status='pending', metadata)
  ↓
- 发送 SubTaskMessage 到 RabbitMQ
  ↓
- Crawler 执行采集
  ↓
- 更新 WeiboSubTask.status='completed'

**已有能力**:
- ✅ 定时调度（@nestjs/schedule CRON）
- ✅ 聚合任务触发（小时/日度粒度）
- ✅ 账号健康监控
- ✅ 诊断工具（DiagnosticService）

**缺失能力**:
- ❌ 分布式锁（多实例可能重复执行）
- ❌ 任务优先级（所有任务平等）
- ❌ 动态调度（无法在运行时调整任务配置）
- ❌ 死信队列处理（失败任务未追踪）
- ❌ 任务依赖关系（子任务无序列化）

---

### 1.3 Cleaner 服务 (apps/cleaner)
**职责**: 数据清洗与结构化

**核心组件**:
```typescript
RawDataConsumer
  ↓ (消费 RawDataReadyEvent)
RawDataService (查询MongoDB)
  ↓
CleanerService
  ↓ (工厂模式创建清洗任务)
CleanTaskFactory
  ├─ WeiboPersistenceService
  └─ 各类型清洗任务 (KeywordSearch/Detail/Comments/UserInfo)
    ↓
    PostgreSQL (WeiboPostEntity, WeiboCommentEntity等)
    ↓
CleanedDataEvent → RabbitMQ
```

**清洗流程**:
1. 从MongoDB读取原始数据
2. 根据 sourceType 选择对应清洗任务
3. 执行数据正规化、字段提取、关系建立
4. 批量插入/更新 PostgreSQL
5. 发送 CleanedDataEvent 到 `cleaned_data_queue`

**已有能力**:
- ✅ 多类型支持（KeywordSearch/Detail/Comments/UserInfo）
- ✅ 事务管理（TypeORM repository）
- ✅ 状态追踪（RawDataSource.status: pending/processed/failed）
- ✅ 错误恢复（失败状态记录）

**缺失能力**:
- ❌ 去重策略（可能插入重复数据）
- ❌ 数据一致性检验（清洗前后验证）
- ❌ 增量清洗（无增量处理标记）
- ❌ 字段映射灵活性（硬编码字段）

---

## 2. 已有基础设施分析

### 2.1 MongoDB (@pro/mongodb)
**Schema**: RawDataSource
```typescript
{
  sourceType: string         // 数据源类型 (WEIBO_KEYWORD_SEARCH等)
  sourceUrl: string          // 原始URL
  rawContent: string         // 未处理的HTML/JSON
  contentHash: string        // 去重用
  metadata: object           // 抓取上下文 (taskId, keyword, timeRange等)
  status: string            // pending/processed/failed
  processedAt?: Date        // 处理完成时间
  errorMessage?: string     // 错误信息
  createdAt: Date
}
```

**索引**:
- `{ status, createdAt }` - 查询待处理数据
- `{ contentHash }` - 快速去重
- `{ sourceType, createdAt }` - 按类型查询

**能力**:
- ✅ 原始数据存储
- ✅ 基本去重
- ✅ 状态追踪

**缺失**:
- ❌ 数据分片策略
- ❌ 自动清理策略（TTL）
- ❌ 大文件处理（rawContent可能超限）

---

### 2.2 RabbitMQ (@pro/rabbitmq)
**架构**:
```
ConnectionPool (连接池管理)
├─ RabbitMQPublisher (发布)
├─ RabbitMQConsumer (消费)
└─ RabbitMQService (统一接口)

LegacyClient (向后兼容)
```

**队列定义** (@pro/types/mq/queue-names.ts):
```typescript
CRAWL_TASK:           'weibo_crawl_queue'           // Broker → Crawler
WEIBO_DETAIL_CRAWL:   'weibo_detail_crawl_queue'    // SearchCrawler → DetailCrawler
RAW_DATA_READY:       'raw_data_ready_queue'        // Crawler → Cleaner
CLEAN_TASK:           'clean_task_queue'             // System → Cleaner (手动)
CLEANED_DATA:         'cleaned_data_queue'          // Cleaner → Analyzer
ANALYZE_TASK:         'analyze_task_queue'           // System → Analyzer
ANALYSIS_RESULT:      'analysis_result_queue'        // Analyzer → Aggregator
AGGREGATE_TASK:       'aggregate_task_queue'         // System → Aggregator
```

**能力**:
- ✅ 类型安全的事件发布/消费
- ✅ 连接池管理
- ✅ DLQ支持 (DlqManagerService)
- ✅ 灵活的重试策略

**缺失**:
- ❌ 消息优先级
- ❌ 批量处理优化
- ❌ 消息去重（可能重复消费）

---

### 2.3 Redis (@pro/redis)
**能力**:
```typescript
// Sorted Set (排序集)
zadd(key, score, member)
zincrby(key, increment, member)
zrangebyscore(key, min, max)

// Hash (哈希)
hset/hget/hgetall/hdel

// Set (集合)
sadd/sismember/smembers

// String (字符串)
get/set/setex/setnx

// Pipeline (管道)
pipeline() // 批量操作
```

**当前使用场景**:
- ❓ 未在代码中看到明确的Redis使用（已注入但未调用）

**可用于**:
- 任务去重缓存
- 聚合结果缓存
- 账号使用频率统计
- 临时数据缓存

---

### 2.4 Entities (@pro/entities)
**已定义实体**:

#### Weibo相关
- `WeiboPostEntity` - 微博文章（7M+字段）
  - 关键字段: weiboId(PK), authorId(FK), createdAt
  - 关联: media[], hashtags[], comments[], interactions[]
  
- `WeiboCommentEntity` - 评论
  - 关键字段: commentId(PK), postId(FK), authorId(FK)
  
- `WeiboUserEntity` - 用户
  - 关键字段: weiboId(PK), nickname, verified
  - 关联: posts[]

- `WeiboHashtagEntity` - 话题标签
- `WeiboMediaEntity` - 图片/视频
- `WeiboInteractionEntity` - 互动数据
- `WeiboPostHashtagEntity` - 文章-标签关系
- `WeiboPostMentionEntity` - @提及
- `WeiboUserStatsEntity` - 用户统计

#### Task相关
- `WeiboSearchTaskEntity` - 搜索任务（keyword, crawlInterval, nextRunAt, enabled）
- `WeiboSubTaskEntity` - 子任务（taskId, type, status, metadata）
- `WeiboAccountEntity` - 账号管理

#### Other
- `UserEntity`, `EventEntity`, `BugEntity` 等

---

## 3. 共享包能力清单

### 3.1 @pro/types
**核心类型定义**:
```
event.ts              - 事件接口
raw-data.ts          - 原始数据事件
mq/
  ├─ queue-names.ts          - 队列定义
  ├─ crawl-events.ts         - RawDataReadyEvent
  ├─ clean-events.ts         - CleanedDataEvent
  ├─ analyze-events.ts       - 分析事件
  └─ aggregate-events.ts     - AggregateTaskEvent
aggregation/
  └─ time-window.ts  - TimeWindowType, AggregateMetric, AggregateTaskEvent
weibo-search-task.ts - 搜索任务接口
weibo-account.ts     - 账号接口
```

**关键枚举**:
- `TimeWindowType`: HOUR, DAY, WEEK, MONTH
- `AggregateMetric`: SENTIMENT_DISTRIBUTION, TOP_KEYWORDS, TOP_TOPICS, POST_TREND, ENGAGEMENT_TREND, USER_ACTIVITY
- `SourceType`: WEIBO_KEYWORD_SEARCH, WEIBO_DETAIL, WEIBO_COMMENT, WEIBO_USER_INFO
- `SourcePlatform`: WEIBO, JD, ...

---

### 3.2 @pro/logger
**能力**:
```typescript
import { Logger, PinoLogger } from '@pro/logger';

// 使用方式
const logger = new Logger('ClassName');
logger.log(message, metadata?)
logger.error(message, metadata?)
logger.warn(message, metadata?)
logger.debug(message, metadata?)
```

**配置**:
```typescript
createLoggerConfig({
  serviceName: '@pro/service-name',
  logLevel: 'debug' | 'info' | 'warn' | 'error'
})
```

---

### 3.3 @pro/utils
**已有工具**:
- `password.ts` - 密码加密/验证
- `token.ts` - JWT处理
- `validation.ts` - 数据验证
- `common.ts` - 通用工具

**缺失**:
- ❌ 日期时间工具
- ❌ 数据转换工具
- ❌ 字符串处理工具
- ❌ 集合操作工具

---

### 3.4 @pro/workflow-core
**DAG工作流执行引擎**:

```typescript
// 节点定义
@Node
class MyNode {
  @Input() input: string;
  @Output() output: string;
}

// 工作流构建
builder
  .addAst(node1)
  .addAst(node2)
  .addEdge({ from: node1.id, to: node2.id, 
             fromProperty: 'output', toProperty: 'input' })
  .build('WorkflowName')

// 执行
const result = await execute(workflow, visitor);
```

**核心特性**:
- ✅ DAG式节点组织
- ✅ 属性映射（数据通过边传递）
- ✅ 并行执行（同一层级节点可并发）
- ✅ 访问者模式（灵活的节点处理逻辑）
- ✅ 状态管理（pending/running/success/fail）

**当前使用**:
- Crawler使用WorkflowFactory构建爬虫流程

---

### 3.5 @pro/weibo
**微博API操作库**:

```typescript
// 服务
WeiboStatusService       - 文章API
WeiboProfileService      - 用户API
WeiboHealthCheckService  - 账号检查
WeiboWorkflowVisitor     - 工作流访问者

// 类型
WeiboStatusDetail, WeiboUserProfile, WeiboStatusLikesOptions等

// 工作流AST构建器
createWeiboSearchUrlBuilderAst()
createAccountInjectorAst()
createStorageAst()
```

---

### 3.6 @pro/workflow (NestJS适配层)
**核心服务**:
```typescript
WorkflowModule
WorkflowExecutorService    - 执行引擎
WorkflowBuilderService     - 构建助手

// 导出AST创建函数
createPlaywrightAst()      - 浏览器自动化
// 其他专业AST创建器
```

---

## 4. 服务间通信模式

### 4.1 事件驱动架构

```
Broker (定时器)
  └─> SubTaskMessage ─(weibo_crawl_queue)─> Crawler
        ├─ taskId: number
        ├─ type: string (KEYWORD_SEARCH/DETAIL等)
        ├─ metadata: { keyword?, startTime?, endTime?, ... }
        └─ keyword?: string

Crawler (数据采集完成)
  └─> RawDataReadyEvent ─(raw_data_ready_queue)─> Cleaner
        ├─ rawDataId: string (MongoDB _id)
        ├─ sourceType: string (WEIBO_KEYWORD_SEARCH等)
        ├─ sourcePlatform: string (WEIBO)
        ├─ sourceUrl: string
        ├─ contentHash: string
        └─ metadata: { taskId?, keyword?, timeRange?, ... }

Cleaner (数据清洗完成)
  └─> CleanedDataEvent ─(cleaned_data_queue)─> Analyzer/Downstream
        ├─ rawDataId: string
        ├─ sourceType: string
        ├─ extractedEntities: { postIds[], commentIds[], userIds[] }
        └─ stats: { totalRecords, successCount, processingTimeMs }

Broker (定时器)
  └─> AggregateTaskEvent ─(aggregate_task_queue)─> Aggregator
        ├─ windowType: HOUR | DAY | WEEK | MONTH
        ├─ startTime: ISO8601
        ├─ endTime: ISO8601
        ├─ metrics: [SENTIMENT_DISTRIBUTION, TOP_KEYWORDS, ...]
        └─ config: { topN, forceRecalculate, cacheTTL }
```

### 4.2 数据库依赖

```
PostgreSQL (TypeORM)
├─ weibo_search_tasks (Broker管理)
├─ weibo_sub_tasks (Broker创建)
├─ weibo_accounts (Crawler使用)
├─ weibo_posts (Cleaner写入)
├─ weibo_comments (Cleaner写入)
├─ weibo_users (Cleaner写入)
└─ weibo_* 相关表

MongoDB (Mongoose)
└─ raw_data_sources (Crawler写入, Cleaner读取)

Redis
└─ 各种缓存键 (未充分使用)
```

---

## 5. 已有能力清单

### ✅ 已实现的能力

#### 采集层
- [x] 基础爬虫框架（Playwright集成）
- [x] 账号管理与轮转
- [x] 浏览器生命周期管理
- [x] DAG式工作流支持
- [x] 原始数据存储（MongoDB）
- [x] 基本去重（contentHash）

#### 调度层
- [x] CRON定时调度
- [x] 任务队列系统（RabbitMQ）
- [x] 子任务生成与追踪
- [x] 账号健康监控
- [x] 小时/日度聚合触发

#### 清洗层
- [x] 多类型数据清洗（KeywordSearch/Detail/Comments/UserInfo）
- [x] 结构化数据入库（PostgreSQL）
- [x] 事件驱动触发
- [x] 状态追踪与错误记录
- [x] 关系数据映射

#### 基础设施
- [x] 统一日志系统（Pino）
- [x] Redis客户端
- [x] 数据库连接管理
- [x] 环境配置管理
- [x] TypeORM实体定义

---

## 6. 缺失模块与优化点

### 6.1 重要缺失模块

#### A. 数据分析层 (Analysis)
**缺失**: 原始→清洗 之后的分析处理
- 需要: AnalyzeService 消费 CleanedDataEvent
- 职责: 
  - 情感分析
  - 关键词提取
  - 热点检测
  - NLP处理

#### B. 数据聚合层 (Aggregation)
**缺失**: 生成聚合报表的服务
- 需要: AggregationService 消费 AggregateTaskEvent
- 职责:
  - 时间窗口数据聚合
  - 统计指标计算
  - 缓存策略管理
  - 报表生成

#### C. 分布式协调
**缺失**: 多实例部署时的一致性
- 分布式锁（解决重复调度）
- 分布式事务（消费消息的幂等性）
- 健康检查与故障转移

#### D. 错误补偿机制
**缺失**: 死信队列处理与重试
- DLQ消费者
- 失败任务重新投递
- 人工干预工作流

#### E. 数据一致性
**缺失**: 端到端数据校验
- Schema验证
- 关键字段完整性检查
- 统计数据审计

### 6.2 优化点

#### 采集优化
1. **增量采集** - 需要 lastCrawlTime 跟踪与增量window计算
2. **批量API** - 支持批量获取替代单条爬虫
3. **重试策略** - 当前无重试，建议使用指数退避
4. **并发控制** - 账号速率限制与流量控制

#### 调度优化
1. **优先级队列** - 不同任务应有优先级
2. **动态调度** - 支持运行时修改调度参数
3. **分布式锁** - 防止多实例重复执行
4. **快速恢复** - 失败任务自动重入队

#### 清洗优化
1. **增量标记** - 追踪哪些数据已清洗
2. **字段映射** - 配置驱动的字段提取
3. **一致性检查** - 清洗前后数据对账
4. **性能优化** - 批量操作替代单条插入

#### 存储优化
1. **分表策略** - 按日期/关键词分表
2. **数据归档** - 过期数据自动转移
3. **查询优化** - 适当增加物化视图

---

## 7. 潜在冲突点

### 7.1 命名与版本管理
**问题**: @pro/workflow 和 @pro/workflow-core 职责界限不清
- @pro/workflow-core: 纯DAG执行引擎
- @pro/workflow: NestJS适配层 + AST构建器
- **建议**: 明确分离，避免代码重复

### 7.2 消息序列化
**问题**: RabbitMQ消息类型与TypeScript接口的同步
```typescript
// broker 发送时
const msg: SubTaskMessage = { ... };
// crawler 消费时
await consume(queue, (msg: SubTaskMessage) => { ... });
// 无Schema验证，可能导致运行时错误
```
**建议**: 使用Zod/io-ts进行运行时验证

### 7.3 MongoDB与PostgreSQL数据同步
**问题**: 原始数据(MongoDB) ↔ 清洗数据(PostgreSQL) 关系管理
- 无外键关联
- 清洗失败时无回滚机制
**建议**: 添加 rawDataId 到 WeiboPostEntity，建立追踪关系

### 7.4 事件溯源缺失
**问题**: 数据处理过程无完整审计日志
- 无法追踪数据从采集→清洗→分析的完整路径
**建议**: 在MongoDB存储 DataProcessingLog 文档

### 7.5 时区处理
**问题**: 聚合任务的时间窗口计算
```typescript
// 当前代码直接使用 new Date()，无考虑时区
const now = new Date();
const startTime = new Date(now);
startTime.setHours(startTime.getHours() - 1);
// 问题: 不同时区的系统可能得到不同结果
```
**建议**: 统一使用UTC，或使用day.js/dayjs库

---

## 8. 可复用资源总结

### 8.1 现成的AST构建器
```typescript
// 直接可用
createPlaywrightAst()          // 浏览器自动化
createWeiboSearchUrlBuilderAst() // 微博搜索URL构建
createAccountInjectorAst()      // 账号注入
createStorageAst()              // 数据存储

// 可扩展的访问者模式
WeiboWorkflowVisitor            // 微博特定逻辑
CrawlerWorkflowVisitor          // 爬虫通用逻辑
```

### 8.2 实体模型库
```typescript
// 直接导入使用
WeiboPostEntity, WeiboCommentEntity, WeiboUserEntity,
WeiboHashtagEntity, WeiboMediaEntity, WeiboInteractionEntity
WeiboSearchTaskEntity, WeiboSubTaskEntity, WeiboAccountEntity
```

### 8.3 类型定义库
```typescript
// 事件接口
RawDataReadyEvent, CleanedDataEvent, AggregateTaskEvent
SubTaskMessage, TaskResultMessage

// 枚举
TimeWindowType, AggregateMetric, SourceType, SourcePlatform
```

### 8.4 基础设施工具
```typescript
// 日志
Logger, PinoLogger from '@pro/logger'

// 缓存
RedisClient with sorted set, hash, set operations

// 消息队列
RabbitMQService, RabbitMQPublisher, RabbitMQConsumer

// 数据库
TypeORM entities with PostgreSQL

// 数据存储
MongooseModule with RawDataSource schema
```

---

## 9. 架构视角的建议

### 9.1 可复用资源
- ✅ DAG工作流框架（可用于分析、聚合等新任务类型）
- ✅ RabbitMQ事件架构（已建立，只需添加新的event type）
- ✅ 实体模型（微博领域模型完善）
- ✅ 日志与监控基础设施

### 9.2 缺失的关键模块
1. **Analysis Service** - 必须实现的数据分析层
2. **Aggregation Service** - 必须实现的数据聚合层
3. **DLQ Handler** - 错误恢复与补偿
4. **Schema Validator** - 消息与数据验证

### 9.3 优先级修复
1. **高优先级**:
   - 添加分布式锁防止Broker重复调度
   - 实现失败重试机制
   - 添加Analysis和Aggregation服务
   
2. **中优先级**:
   - 增量采集跟踪
   - 数据一致性校验
   - Redis缓存策略

3. **低优先级**:
   - 性能优化（批量操作）
   - 报表UI
   - 可视化监控面板

