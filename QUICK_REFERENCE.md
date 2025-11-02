# 爬虫系统架构 - 快速参考卡片

## 核心数据流

```
Broker (调度) 
  → SubTaskMessage 
    → Crawler (采集)
      → RawDataReadyEvent 
        → Cleaner (清洗)
          → CleanedDataEvent
            → [Analysis] (分析) ❌
              → [Aggregation] (聚合) ❌
```

## 三大核心服务

### 1. Broker (任务调度)
**位置**: `/apps/broker/src`

**责任**: 定时触发任务，管理调度

**关键类**:
- `AggregateSchedulerService` - 聚合调度 (小时/日度)
- `SimpleIntervalScheduler` - 任务间隔调度
- `SimpleTaskMonitor` - 进度监控
- `WeiboAccountHealthScheduler` - 账号健康检查

**输出事件**: 
- `SubTaskMessage` → `weibo_crawl_queue`
- `AggregateTaskEvent` → `aggregate_task_queue`

**数据库**: PostgreSQL (weibo_search_tasks, weibo_sub_tasks)

---

### 2. Crawler (数据采集)
**位置**: `/apps/crawler/src`

**责任**: 执行爬虫任务，采集原始数据

**工作流** (DAG):
```
URLBuilder → AccountInjector → Playwright → Storage
   URL       cookies+UA        HTML        MongoDB
```

**关键类**:
- `CrawlQueueConsumer` - 消费Broker任务
- `CrawlerServiceV2` - 核心执行逻辑
- `WorkflowFactory` - 构建爬虫DAG
- `BrowserGuardianService` - 浏览器生命周期
- `WeiboAccountService` - 账号轮转
- `StorageService` - 存储原始数据

**输出事件**:
- `RawDataReadyEvent` → `raw_data_ready_queue`

**存储**: MongoDB (raw_data_sources)

---

### 3. Cleaner (数据清洗)
**位置**: `/apps/cleaner/src`

**责任**: 清洗原始数据，结构化入库

**清洗任务**:
- `WeiboPersistenceService`
  - KeywordSearch清洗 (文章+评论+用户)
  - Detail清洗 (文章详情)
  - Comments清洗 (评论)
  - UserInfo清洗 (用户信息)

**关键类**:
- `RawDataConsumer` - 消费RawDataReadyEvent
- `CleanerService` - 清洗核心
- `CleanTaskFactory` - 清洗任务工厂
- `WeiboPersistenceService` - 数据持久化

**输出事件**:
- `CleanedDataEvent` → `cleaned_data_queue`

**存储**: PostgreSQL (weibo_posts, weibo_comments, weibo_users等)

---

## 消息队列定义

```typescript
// @pro/types/mq/queue-names.ts
CRAWL_TASK              = 'weibo_crawl_queue'          // Broker → Crawler
RAW_DATA_READY          = 'raw_data_ready_queue'       // Crawler → Cleaner
CLEANED_DATA            = 'cleaned_data_queue'         // Cleaner → [Analysis]
ANALYZE_TASK            = 'analyze_task_queue'         // System → Analyzer
ANALYSIS_RESULT         = 'analysis_result_queue'      // Analyzer → Aggregator
AGGREGATE_TASK          = 'aggregate_task_queue'       // System → Aggregator
WEIBO_DETAIL_CRAWL      = 'weibo_detail_crawl_queue'   // 详情采集
CLEAN_TASK              = 'clean_task_queue'           // 手动清洗
```

---

## 核心实体

### 任务实体
- **WeiboSearchTaskEntity** - 搜索任务
  - `keyword` - 搜索关键词
  - `crawlInterval` - 采集间隔
  - `nextRunAt` - 下次运行时间
  - `enabled` - 是否启用

- **WeiboSubTaskEntity** - 子任务
  - `taskId` - 关联任务ID
  - `type` - 任务类型
  - `status` - 状态 (pending/completed/failed)
  - `metadata` - 任务元数据

### 数据实体
- **WeiboPostEntity** - 微博文章
- **WeiboCommentEntity** - 评论
- **WeiboUserEntity** - 用户
- **WeiboHashtagEntity** - 标签
- **WeiboMediaEntity** - 媒体
- **WeiboInteractionEntity** - 互动数据

### MongoDB集合
- **raw_data_sources** - 原始数据
  ```typescript
  {
    sourceType: string       // WEIBO_KEYWORD_SEARCH等
    sourceUrl: string        // 原始URL
    rawContent: string       // HTML/JSON
    contentHash: string      // 去重用
    metadata: object         // 抓取上下文
    status: string          // pending/processed/failed
    createdAt: Date
  }
  ```

---

## 工作流系统 (@pro/workflow-core)

**DAG模型**:
```typescript
// 节点定义
@Node
class MyNode {
  @Input() input: string;
  @Output() output: string;
}

// 构建工作流
const workflow = builder
  .addAst(node1)
  .addAst(node2)
  .addEdge({ 
    from: node1.id, 
    to: node2.id,
    fromProperty: 'output',
    toProperty: 'input'
  })
  .build('WorkflowName')

// 执行
const result = await execute(workflow, visitor);
```

**当前爬虫工作流** (apps/crawler/workflow-factory.ts):
```
createWeiboSearchUrlBuilderAst()  // 构建搜索URL
    ↓
createAccountInjectorAst()       // 注入cookies + userAgent
    ↓
createPlaywrightAst()            // 浏览器自动化，提取HTML
    ↓
createStorageAst()               // 存储到MongoDB
```

---

## 日志系统 (@pro/logger)

```typescript
import { Logger, PinoLogger } from '@pro/logger';

const logger = new Logger('ClassName');
logger.log('message', { metadata });
logger.error('error', { stack });
logger.warn('warning', { context });
logger.debug('debug', { detailed });
```

---

## Redis缓存 (@pro/redis)

```typescript
// Sorted Set (排序集，用于排名)
await redis.zadd(key, score, member);
await redis.zrangebyscore(key, min, max);

// Hash (哈希，用于对象)
await redis.hset(key, field, value);
await redis.hget(key, field);

// Set (集合，用于去重)
await redis.sadd(key, ...members);
await redis.sismember(key, member);

// String (字符串)
await redis.get(key);
await redis.setex(key, ttl, value);
```

**建议用途**:
- 聚合结果缓存 (`sentimentDistribution:hour:2024-01-20-14`)
- 任务去重缓存 (`processed:tasks:{taskId}`)
- 排名统计 (`top_keywords:hour:2024-01-20-14`)

---

## 类型定义库 (@pro/types)

### 事件接口
```typescript
// 原始数据就绪事件
RawDataReadyEvent {
  rawDataId: string           // MongoDB _id
  sourceType: string          // WEIBO_KEYWORD_SEARCH等
  sourcePlatform: string      // WEIBO
  sourceUrl: string
  contentHash: string
  metadata?: { taskId?, keyword?, timeRange? }
  createdAt: string
}

// 清洗完成事件
CleanedDataEvent {
  rawDataId: string
  sourceType: string
  extractedEntities: { postIds[], commentIds[], userIds[] }
  stats: { totalRecords, successCount, processingTimeMs }
  createdAt: string
}

// 聚合任务事件
AggregateTaskEvent {
  windowType: HOUR | DAY | WEEK | MONTH
  startTime: ISO8601
  endTime: ISO8601
  metrics: AggregateMetric[]
  config?: { topN, forceRecalculate, cacheTTL }
  createdAt: string
}
```

### 枚举
```typescript
// 时间窗口
enum TimeWindowType {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month'
}

// 聚合指标
enum AggregateMetric {
  SENTIMENT_DISTRIBUTION,     // 情感分布
  TOP_KEYWORDS,               // 热门关键词
  TOP_TOPICS,                 // 热门主题
  POST_TREND,                 // 发布趋势
  ENGAGEMENT_TREND,           // 互动趋势
  USER_ACTIVITY               // 用户活跃度
}

// 数据源类型
enum SourceType {
  WEIBO_KEYWORD_SEARCH,
  WEIBO_DETAIL,
  WEIBO_COMMENT,
  WEIBO_USER_INFO
}
```

---

## 常见操作

### 手动触发聚合
```typescript
// apps/broker/src/services/aggregate-scheduler.service.ts
await aggregateScheduler.manualTriggerHourly();
await aggregateScheduler.manualTriggerDaily();
await aggregateScheduler.triggerCustomAggregation(
  TimeWindowType.HOUR,
  startTime,
  endTime,
  [AggregateMetric.SENTIMENT_DISTRIBUTION]
);
```

### 创建新的爬虫任务
```typescript
// PostgreSQL
const searchTask = new WeiboSearchTaskEntity();
searchTask.keyword = '关键词';
searchTask.crawlInterval = '1h';
searchTask.nextRunAt = new Date();
searchTask.enabled = true;
await repository.save(searchTask);
```

### 查询原始数据
```typescript
// MongoDB
const rawData = await model
  .find({ sourceType: 'WEIBO_KEYWORD_SEARCH', status: 'pending' })
  .limit(10);
```

---

## 缺失模块清单

### 必须实现
1. **AnalysisService** - 消费 CleanedDataEvent
   - 情感分析
   - 关键词提取
   - 热点检测

2. **AggregationService** - 消费 AggregateTaskEvent
   - 时间窗口聚合
   - 统计指标计算
   - 缓存管理

3. **DLQHandler** - 死信队列处理
   - 失败任务重试
   - 人工干预工作流

### 应该改进
- 添加分布式锁防止重复调度
- 实现失败重试机制
- 添加数据一致性校验
- 完善可观测性（细粒度日志）

---

## 快速定位文件

| 功能 | 文件 | 位置 |
|------|------|------|
| 任务调度 | `aggregate-scheduler.service.ts` | `apps/broker/src/services/` |
| 爬虫执行 | `crawler-v2.service.ts` | `apps/crawler/src/services/` |
| 工作流构建 | `workflow-factory.ts` | `apps/crawler/src/` |
| 数据清洗 | `cleaner.service.ts` | `apps/cleaner/src/services/` |
| 队列定义 | `queue-names.ts` | `packages/types/src/mq/` |
| 事件定义 | `crawl-events.ts` 等 | `packages/types/src/mq/` |
| 实体定义 | `weibo-*.entity.ts` | `packages/entities/src/` |
| 工作流引擎 | `executor.ts` | `packages/workflow-core/src/` |
| RabbitMQ | `rabbitmq.service.ts` | `packages/rabbitmq/src/` |

---

## 配置环境变量

```bash
# RabbitMQ
RABBITMQ_URL=amqp://user:pass@localhost:5672

# MongoDB
MONGODB_URL=mongodb://localhost:27017/pro

# Redis
REDIS_URL=redis://localhost:6379
# 或
REDIS_HOST=localhost
REDIS_PORT=6379

# PostgreSQL (通过TypeORM)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=pro

# 日志级别
LOG_LEVEL=debug  # development
LOG_LEVEL=info   # production
```

---

## 常见问题排查

### 任务没有被执行
1. 检查 Broker 是否运行: `docker ps | grep broker`
2. 检查 CRON 表达式: `@Cron('5 * * * *')`
3. 查看日志: `docker logs {broker-container} | grep -i schedule`

### 原始数据未清洗
1. 检查 Cleaner 是否运行
2. 查看 RabbitMQ 队列: `raw_data_ready_queue`
3. 检查 MongoDB `raw_data_sources` 状态

### 数据不一致
1. 确认 MongoDB → PostgreSQL 的映射是否正确
2. 检查 `WeiboPersistenceService` 中的字段映射
3. 查看 Cleaner 日志找出失败原因

---

**最后更新**: 2025-10-25
**架构图详见**: `ARCHITECTURE_VISUAL.txt`
**完整分析详见**: `ARCHITECTURE_ANALYSIS.md`
