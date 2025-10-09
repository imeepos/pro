# 微博爬虫应用

微博关键词搜索的持续监控数据抓取应用，实现了数据驱动的智能拆分和子任务执行功能。

## 核心特性

### 🚀 数据驱动拆分
- **无需预测页数**：根据实际抓取结果动态调整时间段
- **智能时间提取**：自动提取第1页第1条和第50页最后一条微博的发布时间
- **无数据丢失**：确保完整覆盖所有历史数据

### 🔄 双时间游标设计
- **currentCrawlTime**：历史回溯进度，向startDate递减
- **latestCrawlTime**：最新数据时间，用于增量抓取

### 📦 完整的任务管理
- **主任务/子任务分离**：主任务存储配置，子任务轻量执行
- **自动状态切换**：首次抓取 → 历史回溯 → 增量更新
- **失败重试机制**：网络错误自动重试，支持延迟重试

### 🛡️ 反爬策略
- **随机延迟**：2-5秒随机请求间隔
- **账号轮换**：支持多账号自动轮换
- **浏览器伪装**：完整的反检测浏览器配置

## 架构设计

```
Broker (任务调度) → RabbitMQ (消息队列) → Crawler (爬虫执行) → MongoDB (数据存储)
                        ↓
                 自动触发下一子任务 (数据驱动)
```

## 核心流程

### 首次抓取（历史数据回溯）

1. **接收子任务**：`{ taskId, keyword, start: startDate, end: NOW, isInitialCrawl: true }`
2. **循环抓取**：第1页 → 第50页，每页HTML存储到MongoDB
3. **时间提取**：
   - `firstPostTime`：第1页第1条微博时间（最新）
   - `lastPostTime`：第50页最后一条微博时间（较旧）
4. **结果处理**：
   - **抓满50页**：自动触发下一子任务 `{ start, end: lastPostTime }`
   - **不足50页**：历史回溯完成，设置 `nextRunAt`，进入增量模式

### 增量更新（持续监控）

1. **接收子任务**：`{ taskId, keyword, start: latestCrawlTime, end: NOW, isInitialCrawl: false }`
2. **抓取新数据**：通常只有1-3页，数据量较小
3. **更新时间**：`latestCrawlTime = firstPostTime`
4. **设置下次执行**：`nextRunAt = NOW + crawlInterval`

## 配置说明

### 环境变量

```bash
# RabbitMQ 配置
RABBITMQ_URL=amqp://rabbitmq:rabbitmq123@rabbitmq:5672

# MongoDB 配置
MONGODB_URI=mongodb://mongo:mongo123@mongo:27017/pro?authSource=admin
MONGODB_DATABASE=pro

# 微博账号配置 (JSON格式)
WEIBO_ACCOUNTS=[
  {
    "id": 1,
    "nickname": "账号1",
    "cookies": [...],
    "status": "active"
  }
]

# 爬虫配置
REQUEST_DELAY_MIN=2000    # 最小延迟(毫秒)
REQUEST_DELAY_MAX=5000    # 最大延迟(毫秒)
MAX_RETRIES=3             # 最大重试次数
PAGE_TIMEOUT=30000        # 页面超时(毫秒)
```

## API接口

### 消息队列

#### 爬取队列 (weibo_crawl_queue)
```typescript
interface SubTaskMessage {
  taskId: number;
  keyword: string;
  start: Date;
  end: Date;
  isInitialCrawl: boolean;
  weiboAccountId?: number;
  enableAccountRotation: boolean;
}
```

#### 状态队列 (weibo_task_status_queue)
```typescript
interface TaskStatusUpdate {
  taskId: number;
  status: 'pending' | 'running' | 'paused' | 'failed' | 'timeout';
  currentCrawlTime?: Date;
  latestCrawlTime?: Date;
  nextRunAt?: Date;
  progress?: number;
  errorMessage?: string;
  updatedAt: Date;
}
```

## 核心服务

### WeiboSearchCrawlerService
- **核心功能**：执行子任务，抓取微博数据
- **时间提取**：智能解析微博发布时间
- **结果处理**：自动触发下一子任务或更新状态

### CrawlQueueConsumer
- **消息消费**：监听爬取队列，执行爬虫任务
- **错误处理**：失败重试、状态更新
- **日志记录**：完整的执行日志

### RawDataService
- **数据存储**：HTML数据存储到MongoDB
- **自动去重**：基于contentHash避免重复存储
- **查询统计**：支持多维度数据查询

## 项目设置

```bash
$ pnpm install
```

## 编译和运行项目

```bash
# 开发模式
$ pnpm run start

# 监听模式
$ pnpm run start:dev

# 生产模式
$ pnpm run start:prod
```

## 运行测试

```bash
# 单元测试
$ pnpm run test

# e2e 测试
$ pnpm run test:e2e

# 测试覆盖率
$ pnpm run test:cov
```

## 部署说明

### Docker部署
```bash
# 构建镜像
docker compose build crawler

# 启动服务
docker compose up -d crawler --build
```

## 注意事项

1. **微博账号**：需要有效的微博Cookie，配置在 `WEIBO_ACCOUNTS`
2. **请求频率**：建议不要设置过低的延迟，避免IP被封
3. **数据量控制**：长时间运行会产生大量数据，定期清理
4. **监控日志**：关注错误日志，及时处理账号问题

## 更新日志

### v1.0.0
- ✅ 实现数据驱动拆分算法
- ✅ 完成双时间游标设计
- ✅ 添加自动任务状态管理
- ✅ 集成RabbitMQ消息队列
- ✅ 完善错误重试机制
- ✅ 添加配置文件管理
- ✅ 编写完整的单元测试