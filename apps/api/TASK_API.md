# 任务触发 API 文档

## 概述

本文档描述了手动触发数据处理流程的 GraphQL Mutation 接口。

## 架构设计

```
API Service (GraphQL) → RabbitMQ → Worker Services
     ↓                     ↓
 TasksResolver      RabbitMQService
     ↓                     ↓
 Input DTOs         Event Types (@pro/types)
```

### 核心组件

1. **RabbitMQModule** - 全局模块，提供消息发布能力
2. **RabbitMQService** - 封装 RabbitMQ 客户端，提供类型安全的发布方法
3. **TasksModule** - GraphQL 接口模块
4. **TasksResolver** - 暴露三个 Mutation 接口

## GraphQL Mutations

### 1. 触发清洗任务

**用途**: 对已存储的原始数据进行清洗

```graphql
mutation TriggerCleanTask {
  triggerCleanTask(input: {
    rawDataId: "6747a1b2c3d4e5f6a7b8c9d0"
    sourceType: "WEIBO_POST"
    priority: "NORMAL"
  }) {
    success
    message
    taskId
  }
}
```

**参数说明**:
- `rawDataId`: MongoDB 中的原始数据文档 ID (必填)
- `sourceType`: 数据源类型 (必填，枚举值见 @pro/types)
- `priority`: 任务优先级 (可选，默认 NORMAL)

**优先级枚举**:
- `LOW` - 低优先级，历史数据回溯
- `NORMAL` - 正常优先级，常规调度任务
- `HIGH` - 高优先级，热点事件
- `URGENT` - 紧急优先级，手动触发的关键任务

### 2. 触发分析任务

**用途**: 对清洗后的结构化数据进行分析

```graphql
mutation TriggerAnalyzeTask {
  triggerAnalyzeTask(input: {
    dataId: "123e4567-e89b-12d3-a456-426614174000"
    dataType: "POST"
    analysisTypes: ["SENTIMENT", "NLP"]
    keyword: "热点事件"
  }) {
    success
    message
    taskId
  }
}
```

**参数说明**:
- `dataId`: PostgreSQL 中的数据实体 ID (必填)
- `dataType`: 数据类型 (必填，枚举: POST, COMMENT, USER)
- `analysisTypes`: 分析类型列表 (必填，至少一个)
  - `SENTIMENT` - 情感分析
  - `NLP` - 关键词/主题提取
  - `LLM` - 深度语义理解
- `taskId`: 关联任务ID (可选)
- `keyword`: 关键词 (可选)

### 3. 触发聚合任务

**用途**: 对分析结果进行时间窗口聚合

```graphql
mutation TriggerAggregateTask {
  triggerAggregateTask(input: {
    windowType: "DAY"
    startTime: "2025-10-19T00:00:00Z"
    endTime: "2025-10-19T23:59:59Z"
    metrics: ["SENTIMENT_DISTRIBUTION", "TOP_KEYWORDS"]
    topN: 20
    forceRecalculate: false
  }) {
    success
    message
    taskId
  }
}
```

**参数说明**:
- `windowType`: 时间窗口类型 (必填，枚举: HOUR, DAY, WEEK, MONTH)
- `startTime`: 窗口开始时间，ISO 8601 格式 (必填)
- `endTime`: 窗口结束时间，ISO 8601 格式 (必填)
- `metrics`: 聚合指标列表 (必填)
  - `SENTIMENT_DISTRIBUTION` - 情感分布
  - `TOP_KEYWORDS` - 热门关键词
  - `TOP_TOPICS` - 热门主题
  - `POST_TREND` - 发布趋势
  - `ENGAGEMENT_TREND` - 互动趋势
  - `USER_ACTIVITY` - 用户活跃度
- `keyword`: 过滤关键词 (可选)
- `topN`: Top N 数量 (可选，默认 10)
- `forceRecalculate`: 强制重新计算 (可选，默认 false)

## 返回类型

所有 Mutation 都返回 `TaskResult` 类型:

```graphql
type TaskResult {
  success: Boolean!
  message: String!
  taskId: String
}
```

**字段说明**:
- `success`: 任务是否成功发布到队列
- `message`: 结果描述消息
- `taskId`: 任务标识符 (用于追踪)

## 错误处理

- 服务采用**优雅降级**策略：即使消息发布失败，也不会抛出异常
- 通过 `success` 字段判断操作结果
- 通过 `message` 字段获取详细信息
- 所有错误都会记录到日志系统

## 配置

### 环境变量

在 `.env` 文件中配置 RabbitMQ 连接：

```env
RABBITMQ_URL=amqp://rabbitmq:rabbitmq123@rabbitmq:5672
```

### RabbitMQ 配置

- **最大重试次数**: 3 次
- **死信队列**: 已启用
- **消息持久化**: 已启用

## 使用示例

### 场景1: 手动触发单条数据的完整处理流程

```graphql
# 1. 触发清洗
mutation {
  triggerCleanTask(input: {
    rawDataId: "6747a1b2c3d4e5f6a7b8c9d0"
    sourceType: "WEIBO_POST"
    priority: "URGENT"
  }) {
    success
    message
    taskId
  }
}

# 2. 等待清洗完成后，触发分析
mutation {
  triggerAnalyzeTask(input: {
    dataId: "post_123"
    dataType: "POST"
    analysisTypes: ["SENTIMENT", "NLP", "LLM"]
  }) {
    success
    message
  }
}

# 3. 触发今日数据聚合
mutation {
  triggerAggregateTask(input: {
    windowType: "DAY"
    startTime: "2025-10-19T00:00:00Z"
    endTime: "2025-10-19T23:59:59Z"
    metrics: ["SENTIMENT_DISTRIBUTION", "TOP_KEYWORDS", "POST_TREND"]
  }) {
    success
    message
  }
}
```

### 场景2: 批量重新分析历史数据

```graphql
mutation {
  triggerAnalyzeTask(input: {
    dataId: "post_456"
    dataType: "POST"
    analysisTypes: ["LLM"]
  }) {
    success
    message
  }
}
```

### 场景3: 强制重新计算聚合数据

```graphql
mutation {
  triggerAggregateTask(input: {
    windowType: "WEEK"
    startTime: "2025-10-13T00:00:00Z"
    endTime: "2025-10-19T23:59:59Z"
    metrics: ["TOP_KEYWORDS", "USER_ACTIVITY"]
    forceRecalculate: true
    topN: 50
  }) {
    success
    message
  }
}
```

## 日志

所有操作都会产生结构化日志：

```
[RabbitMQService] 发布清洗任务: 6747a1b2c3d4e5f6a7b8c9d0
[RabbitMQ] 正在发布消息到队列 clean_task_queue, 消息大小: 156 bytes
[RabbitMQ] 消息发布成功到队列 clean_task_queue, 耗时: 5ms
[RabbitMQService] 清洗任务发布成功: 6747a1b2c3d4e5f6a7b8c9d0
```

## 设计原则

本实现遵循以下设计原则：

1. **存在即合理** - 每个接口对应明确的业务触发点
2. **优雅即简约** - DTO 定义清晰，避免冗余字段
3. **类型安全** - 充分利用 TypeScript 和 GraphQL 的类型系统
4. **错误处理** - 提供有意义的错误消息，便于调试
5. **资源管理** - 实现生命周期钩子，确保连接优雅关闭
6. **日志叙事** - 每个操作都讲述它的故事

## 后续扩展

当需要支持爬虫任务触发时，可以添加：

```typescript
// rabbitmq.service.ts
async publishCrawlTask(event: CrawlTaskEvent): Promise<boolean> {
  // 实现爬虫任务发布
}

// tasks.resolver.ts
@Mutation(() => TaskResult)
async triggerCrawlTask(@Args('input') input: CrawlTaskInput): Promise<TaskResult> {
  // 实现爬虫任务触发
}
```
