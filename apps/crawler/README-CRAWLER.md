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
- **Robots.txt遵守**：自动检查和遵守目标网站的robots.txt规则
- **Crawl-delay支持**：根据网站规则动态调整请求延迟
- **自适应限流**：实时监控请求频率，自动调整延迟策略

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

# Robots.txt 配置
ROBOTS_ENABLED=true                    # 是否启用 robots.txt 检查
ROBOTS_USER_AGENT=ProCrawler           # 机器人名称
ROBOTS_RESPECT_CRAWL_DELAY=true        # 是否遵守 crawl-delay
ROBOTS_FALLBACK_DELAY=3                # 无法获取规则时的默认延迟(秒)
ROBOTS_CACHE_TIMEOUT=3600000           # robots.txt 缓存时间(毫秒)

# 请求频率监控配置
RATE_MONITORING_ENABLED=true           # 是否启用请求频率监控
RATE_WINDOW_SIZE_MS=60000              # 监控窗口大小(毫秒)
RATE_MAX_REQUESTS_PER_WINDOW=10        # 每个窗口最大请求数
ADAPTIVE_DELAY_ENABLED=true            # 是否启用自适应延迟
ADAPTIVE_DELAY_INCREASE_FACTOR=1.5     # 延迟增加因子
ADAPTIVE_DELAY_DECREASE_FACTOR=0.8     # 延迟减少因子
ADAPTIVE_DELAY_MAX_MS=30000            # 最大延迟毫秒数
ADAPTIVE_DELAY_MIN_MS=1000             # 最小延迟毫秒数
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
- **网站规则遵守**：集成robots.txt检查和请求监控

### RobotsService
- **robots.txt解析**：自动获取和解析目标网站的robots.txt规则
- **路径检查**：验证URL是否被允许访问
- **Crawl-delay支持**：读取并应用网站指定的爬取延迟
- **缓存机制**：智能缓存robots.txt内容，减少重复请求

### RequestMonitorService
- **请求监控**：实时监控请求频率、成功率、响应时间
- **自适应延迟**：根据网站响应动态调整请求延迟
- **限流保护**：防止对目标网站造成过大压力
- **统计分析**：提供详细的请求统计和错误分析

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