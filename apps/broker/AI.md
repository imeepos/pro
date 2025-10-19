# Broker 子系统 - 任务调度中心 AI 分析报告

## 系统概述和核心定位

**Broker** 是微博数据抓取系统的任务调度中心，作为连接业务层（API）和执行层（Crawler）的关键中间层。其核心价值在于将复杂的微博搜索任务拆分为可管理的子任务，并通过消息队列实现异步、可靠的任务分发。

### 核心定位
- **任务调度引擎**: 负责扫描、调度和分发微博搜索任务
- **时间窗口管理器**: 智能管理历史数据回溯和增量更新的时间边界
- **任务状态监控器**: 全生命周期监控任务执行状态，处理异常和重试
- **数据聚合触发器**: 定时触发小时级和日度数据聚合任务

## 主要功能特性

### 1. 智能任务调度
- **双模式调度**: 支持首次抓取（历史回溯）和增量更新两种模式
- **时间窗口优化**: 自动将大时间跨度拆分为7天（首次）或30天（增量）的片段
- **分钟精度调度**: 使用分钟级时间基准，避免秒级时间重叠
- **乐观锁机制**: 防止并发调度同一任务，确保任务唯一性

### 2. 健壮的状态管理
- **任务状态机**: PENDING → RUNNING → COMPLETED/FAILED/TIMEOUT
- **智能重试**: 指数退避策略（5分钟, 10分钟, 20分钟, 40分钟）
- **超时检测**: 30分钟超时阈值，自动标记僵尸任务
- **无数据暂停**: 连续无数据达到阈值自动暂停任务

### 3. 实时监控和诊断
- **每分钟扫描**: 自动发现待执行任务
- **每5分钟监控**: 检查超时、重试失败、处理无数据任务
- **统计报告**: 实时任务统计、执行报告、异常诊断
- **手动干预**: 支持手动触发扫描、重置失败任务

### 4. 数据聚合调度
- **小时级聚合**: 每小时第5分钟执行，聚合上一小时数据
- **日度聚合**: 每天00:10执行，聚合前一天数据
- **自定义窗口**: 支持任意时间范围的聚合任务触发

## 技术架构分析

### 核心技术栈
- **框架**: NestJS 11.x (Node.js/TypeScript)
- **数据库**: PostgreSQL + TypeORM
- **消息队列**: RabbitMQ
- **调度**: @nestjs/schedule (Cron)
- **日志**: Pino Logger
- **配置**: @nestjs/config

### 架构设计模式

#### 1. 模块化架构
```
BrokerModule (主模块)
├── TaskScannerScheduler (任务扫描调度器)
├── TaskMonitor (任务监控器)
├── AggregateSchedulerService (聚合调度器)
├── DiagnosticService (诊断服务)
├── RabbitMQConfigService (消息队列服务)
└── AppController (HTTP API控制器)
```

#### 2. 时间驱动架构
- **Cron表达式**: 精确控制调度时机
- **时间游标**: currentCrawlTime, latestCrawlTime 双游标管理
- **窗口算法**: 智能计算最优时间范围

#### 3. 状态驱动设计
- **实体状态**: 任务状态驱动调度行为
- **事件驱动**: 通过状态变更触发相应处理
- **错误恢复**: 基于状态的重试和恢复机制

## 关键模块说明

### TaskScannerScheduler (任务扫描调度器)
**职责**: 每分钟扫描待执行任务，生成子任务并推送到消息队列

**核心算法**:
```typescript
// 时间窗口计算
if (task.needsInitialCrawl) {
  // 首次抓取: startDate ~ NOW (最大7天)
  subTask = createInitialSubTask(task);
} else if (task.isHistoricalCrawlCompleted) {
  // 增量更新: latestCrawlTime ~ NOW (最大30天)
  subTask = createIncrementalSubTask(task);
}
```

**设计亮点**:
- 乐观锁防止重复调度
- 批量处理控制并发数
- 详细日志追踪执行过程
- 指数退避重试策略

### TaskMonitor (任务监控器)
**职责**: 监控任务执行状态，处理超时和异常恢复

**监控机制**:
- **超时检测**: RUNNING状态超过30分钟未更新
- **失败重试**: 检查可重试的FAILED状态任务
- **无数据处理**: 连续无数据达到阈值自动暂停

**恢复策略**:
```typescript
// 指数退避重试
const retryInterval = baseInterval * Math.pow(2, retryCount);
```

### AggregateSchedulerService (聚合调度器)
**职责**: 定时触发数据聚合任务，计算精确时间窗口

**调度策略**:
```typescript
// 小时级聚合: 每小时第5分钟执行，聚合上一小时
@Cron('5 * * * *')
// 日度聚合: 每天00:10执行，聚合前一天
@Cron('10 0 * * *')
```

**时间窗口算法**:
- 左闭右开区间 [start, end) 避免数据重复
- 延迟执行确保上游数据完成
- 支持手动触发和自定义窗口

### RabbitMQConfigService (消息队列服务)
**职责**: 管理RabbitMQ连接，发布子任务和聚合事件

**消息类型**:
- `weibo_crawl_queue`: 微博搜索子任务
- `aggregate_task`: 数据聚合任务
- `weibo_task_results`: 任务执行结果（可选）

## API 接口和数据流

### REST API 接口
```
POST /broker/scan          # 手动触发任务扫描
POST /broker/monitor       # 手动触发任务监控
GET  /broker/stats         # 获取任务统计信息
POST /broker/reset/:taskId # 重置失败任务
GET  /health               # 健康检查
GET  /broker/diagnostic    # 数据库状态诊断
POST /broker/fix-overdue   # 修复过期任务
```

### 核心数据流

#### 1. 任务调度流程
```
API创建任务 → PostgreSQL存储 → Broker扫描 → 生成子任务 → RabbitMQ发布 → Crawler执行
```

#### 2. 状态管理流程
```
任务调度 → RUNNING状态 → Crawler执行 → 状态更新 → 下次调度/完成
```

#### 3. 聚合数据流
```
定时触发 → 时间窗口计算 → 聚合事件发布 → Analyzer执行 → 结果存储
```

### 关键数据结构

#### SubTaskMessage (子任务消息)
```typescript
{
  taskId: number;
  keyword: string;
  start: Date;           // 时间窗口开始
  end: Date;             // 时间窗口结束
  isInitialCrawl: boolean;
  weiboAccountId?: number;
  enableAccountRotation: boolean;
}
```

#### AggregateTaskEvent (聚合任务事件)
```typescript
{
  windowType: 'HOUR' | 'DAY';
  startTime: string;
  endTime: string;
  metrics: AggregateMetric[];
  config: { topN: number; forceRecalculate: boolean; cacheTTL: number };
}
```

## 与其他系统的关系

### 上游依赖
- **@pro/api**: 任务创建和管理的入口
- **PostgreSQL**: 任务状态和配置存储

### 下游消费
- **@pro/crawler**: 子任务执行和数据抓取
- **@pro/analyzer**: 数据聚合和分析
- **MongoDB**: 原始抓取数据存储
- **Redis**: 缓存和临时数据

### 横向协作
- **@pro/entities**: 共享数据模型
- **@pro/types**: 类型定义和接口
- **@pro/logger**: 统一日志系统
- **@pro/rabbitmq**: 消息队列客户端

### 系统集成图
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   @pro/api  │───▶│ PostgreSQL  │◀───│   Broker    │
└─────────────┘    └─────────────┘    └─────────────┘
                                             │
                                             ▼
                                    ┌─────────────┐
                                    │  RabbitMQ   │
                                    └─────────────┘
                                       │        │
                       ┌───────────────┘        └──────────────┐
                       ▼                                      ▼
                ┌─────────────┐                        ┌─────────────┐
                │ @pro/crawler│                        │ @pro/analyzer│
                └─────────────┘                        └─────────────┘
                       │                                      │
                       ▼                                      ▼
                ┌─────────────┐                        ┌─────────────┐
                │   MongoDB   │                        │   PostgreSQL│
                └─────────────┘                        └─────────────┘
```

## 开发和部署要点

### 配置要求
```bash
# 核心环境变量
PORT=3003
DATABASE_URL=postgresql://user:password@localhost:5432/pro
RABBITMQ_URL=amqp://localhost:5672
NODE_ENV=development
LOG_LEVEL=debug
```

### 构建和运行
```bash
# 开发模式
pnpm run dev

# 类型检查
cd apps/broker && pnpm run typecheck

# 构建生产版本
cd apps/broker && pnpm run build

# PM2部署
pnpm run pm2:prod
```

### 监控和运维
- **日志级别**: 支持debug/info/warn/error多级别日志
- **性能监控**: 内置执行时间统计和批量处理优化
- **异常处理**: 完善的错误捕获和恢复机制
- **健康检查**: HTTP健康检查接口

### Docker部署
```dockerfile
# 构建镜像
docker build -f Dockerfile.pro -t imeepos/pro:latest .

# 启动服务
docker compose up -d broker
```

## 系统核心价值和技术亮点

### 核心价值
1. **解耦复杂度**: 将复杂的时间窗口管理和任务调度逻辑从业务API中分离
2. **提升可靠性**: 通过乐观锁、重试机制、状态监控确保任务可靠执行
3. **优化性能**: 批量处理、时间分片、并发控制提升系统吞吐量
4. **增强可观测性**: 详细日志、统计报告、诊断接口提供全面监控能力

### 技术亮点
1. **智能时间窗口算法**: 自动计算最优时间范围，避免数据重叠和遗漏
2. **双游标时间管理**: currentCrawlTime和latestCrawlTime精确控制抓取进度
3. **乐观锁并发控制**: 防止重复调度，确保任务执行的幂等性
4. **指数退避重试**: 智能的错误恢复机制，平衡恢复速度和系统稳定性
5. **分钟级调度精度**: 归整到分钟精度，避免秒级时间冲突

### 适用场景
- **大规模数据抓取**: 支持历史数据回溯和实时增量更新
- **分布式任务调度**: 通过消息队列实现水平扩展
- **时间序列数据处理**: 精确的时间窗口管理和聚合
- **高可靠性任务执行**: 完善的监控、重试和恢复机制

Broker 子系统作为微博数据抓取系统的调度中枢，通过精心设计的任务调度算法、状态管理机制和监控体系，为整个数据流水线提供了稳定、高效、可观测的任务执行保障。