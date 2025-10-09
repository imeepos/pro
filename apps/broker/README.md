# Broker 服务 - 任务调度中心

微博关键词搜索任务调度中心，负责扫描主任务并生成子任务推送到 RabbitMQ。

## 功能特性

- **TaskScannerScheduler**: 每分钟扫描主任务，智能判断首次抓取 vs 增量更新
- **TaskMonitor**: 监控任务状态，处理超时、失败重试和无数据判定
- **RabbitMQ 集成**: 完整的消息队列管理和子任务发布
- **智能调度**: 基于双时间游标的数据驱动拆分算法
- **错误处理**: 完善的异常处理和日志记录
- **API 接口**: 提供管理和监控接口

## 核心逻辑

### 首次抓取（历史数据回溯）
```typescript
if (task.needsInitialCrawl) {
  // startDate ~ NOW
  // crawler 会自动触发后续子任务直到 currentCrawlTime <= startDate
}
```

### 增量更新（持续监控）
```typescript
if (task.isHistoricalCrawlCompleted) {
  // latestCrawlTime ~ NOW
  // 定时触发，更新 nextRunAt
}
```

## API 接口

- `POST /broker/scan` - 手动触发任务扫描
- `POST /broker/monitor` - 手动触发任务监控
- `GET /broker/stats` - 获取任务统计信息
- `POST /broker/reset/:taskId` - 重置失败任务
- `GET /broker/health` - 健康检查
- `GET /api/docs` - Swagger API 文档

## 环境变量

```bash
PORT=3003
DATABASE_URL=postgresql://user:password@localhost:5432/pro
RABBITMQ_URL=amqp://localhost:5672
NODE_ENV=development
```

## 安装和运行

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm run dev

# 构建生产版本
pnpm run build

# 启动生产版本
pnpm run start
```

## 监控和日志

服务启动后会自动开始任务调度和监控：

- 每分钟扫描待执行的主任务
- 每5分钟执行任务状态监控
- 详细的日志记录和错误追踪
- 实时任务统计信息

## 与其他服务的关系

```
@pro/api (主任务管理) ← → PostgreSQL (weibo_search_tasks)
                              ↓
@pro/broker (调度中心) ← 定时扫描
                              ↓
                        RabbitMQ (weibo_crawl_queue)
                              ↓
@pro/crawler (爬虫执行)
                              ↓
                      MongoDB (raw_data_sources)
```

## 注意事项

1. 修改源码后需要重新构建 Docker 镜像：`docker compose build broker`
2. 确保 RabbitMQ 服务正常运行
3. 确保数据库连接正常
4. 任务调度基于 cron 表达式，时间精度为分钟级别