# 微博关键词搜索数据抓取方案

## 一、需求分析

### 1.1 业务需求
实现微博关键词搜索的持续监控数据抓取。

**核心功能**:
- 支持按关键词搜索微博内容
- 支持持续监控模式（只有开始时间，无结束时间）
- 智能时间段拆分（自动适配数据量，解决50页限制）
- 存储原始HTML数据,供后续解析使用

### 1.2 技术约束

**微博搜索接口**: `https://s.weibo.com/weibo?q={keyword}&timescope=custom:{start}:{end}&page={page}`

- **时间精度**: 只能精确到小时 (格式: `2025-10-01-0`)
- **分页限制**: 最多50页
- **登录要求**: 需要Cookie认证
- **反爬策略**: 控制请求频率、账号轮换

### 1.3 数据存储策略

- ✅ 存储完整HTML到MongoDB (`raw_data_sources`)
- ✅ 通过 `contentHash` 自动去重
- ❌ 不做解析，解析服务独立实现

---

## 二、整体架构设计

### 2.1 服务架构

```
@pro/admin (前端) → HTTP → @pro/api (任务管理) → PostgreSQL (weibo_search_tasks)
                                                        ↓
                              @pro/broker (调度中心) ← 定时扫描
                                      ↓
                              [智能时间拆分]
                                      ↓
                              RabbitMQ (消息队列)
                                      ↓
                              @pro/crawler (爬虫)
                                      ↓
                              MongoDB (raw_data_sources)
```

### 2.2 核心模块

| 模块 | 职责 | 关键功能 |
|------|------|---------|
| **@pro/broker** | 任务调度中心 | 每分钟扫描主任务 → 智能拆分 → 生成子任务 → 推送MQ |
| **@pro/crawler** | 爬虫执行 | 消费MQ子任务 → 抓取HTML → 存储MongoDB |
| **@pro/api** | 主任务管理 | 主任务CRUD接口 |
| **@pro/admin** | 前端界面 | 主任务管理、监控 |

---

## 三、核心流程设计

### 3.1 主任务与子任务

**主任务** (weibo_search_tasks表):
- 持续监控配置：keyword, startDate, crawlInterval
- 历史回溯进度：currentCrawlTime (向startDate递减，用于历史数据回溯)
- 增量抓取基准：latestCrawlTime (记录最新抓到的数据时间，用于增量更新)
- 调度控制：nextRunAt (下次生成子任务的时间)

**子任务** (RabbitMQ消息):
- 具体的抓取任务：某个关键词在某个时间段(如 2025-01-01-10 ~ 2025-01-01-15)
- 一个主任务可以生成多个子任务 (通过智能拆分)

### 3.2 首次抓取流程（历史数据回溯）

```
用户创建主任务 → weibo_search_tasks
  keyword='关键词', startDate=2020-10-01
  currentCrawlTime=null, latestCrawlTime=null
                              ↓
         broker检测到新主任务 (currentCrawlTime=null)
                              ↓
         生成子任务1: { start: 2020-10-01, end: NOW }
         推送到RabbitMQ
                              ↓
         crawler消费子任务1
           → 抓取第1页...第50页
           → 第1页第1条微博时间: 2025-10-01-12 (最新)
           → 第50页最后一条微博时间: 2025-09-15-10 (较旧)
           → 存储HTML到MongoDB
                              ↓
         crawler完成后
           → 更新主任务:
              latestCrawlTime = 2025-10-01-12 (第1条，最新的)
              currentCrawlTime = 2025-09-15-10 (第50条，向下递减)
           → 抓满50页: 自动触发下一个子任务
                              ↓
         生成子任务2: { start: 2020-10-01, end: 2025-09-15-10 }
         推送到RabbitMQ
                              ↓
         crawler消费子任务2
           → 第50页最后一条: 2025-08-20-15
           → 更新: currentCrawlTime = 2025-08-20-15
                  latestCrawlTime 不变 (保持最新值)
                              ↓
         ...循环直到某个子任务不足50页
                              ↓
         历史数据回溯完成
           → currentCrawlTime = 2020-10-01 (已到startDate)
           → latestCrawlTime = 2025-10-01-12 (最新数据时间)
           → 更新: nextRunAt = NOW + crawlInterval
           → 进入增量更新模式
```

### 3.3 增量更新流程（持续监控）

```
broker每分钟扫描 (TaskScannerScheduler)
                              ↓
发现满足条件的主任务 (enabled=true && nextRunAt <= NOW && currentCrawlTime <= startDate)
                              ↓
         生成增量子任务:
           { start: latestCrawlTime, end: NOW }  ⭐ 使用 latestCrawlTime
         推送到RabbitMQ
                              ↓
         crawler消费子任务
           → 抓取所有页面 (通常很少，不会满50页)
           → 第1页第1条: 2025-10-01-13 (最新)
           → 存储HTML到MongoDB
                              ↓
         crawler完成后
           → 更新主任务: latestCrawlTime = 2025-10-01-13
                        nextRunAt = NOW + crawlInterval
```

### 3.4 数据驱动拆分（核心创新）

**原理**: 通过微博发布时间自动拆分，无需预测页数

**关键点**:
- **第1页第1条**: 最新的微博 → 更新 latestCrawlTime
- **第50页最后一条**: 较旧的微博 → 更新 currentCrawlTime (向下递减)

**首次抓取示例**:
```
主任务: keyword="热点事件", startDate=2020-10-01, 当前=2025-10-01

子任务1: 2020-10-01 ~ 2025-10-01
  → 第1页第1条: 2025-10-01-12 → latestCrawlTime = 2025-10-01-12
  → 第50页最后一条: 2025-09-15-10 → currentCrawlTime = 2025-09-15-10
  ↓
子任务2: 2020-10-01 ~ 2025-09-15-10 (自动触发)
  → 第50页最后一条: 2025-08-20-15 → currentCrawlTime = 2025-08-20-15
  → latestCrawlTime 保持 2025-10-01-12 不变
  ↓
子任务3: 2020-10-01 ~ 2025-08-20-15
  → 抓取30页，已到达开始时间
  → currentCrawlTime = 2020-10-01
  → 历史数据回溯完成
```

**增量更新示例**:
```
每1小时触发:
  latestCrawlTime = 2025-10-01-12
  当前时间 = 2025-10-01-13
  ↓
子任务: 2025-10-01-12 ~ 2025-10-01-13
  → 第1页第1条: 2025-10-01-13 → latestCrawlTime = 2025-10-01-13
  → 抓取1-3页 (新增数据很少)
```

### 3.5 任务状态管理

**TaskMonitor**(每5分钟):
- 检查超时主任务 (30分钟未更新 → timeout)
- 失败重试 (retryCount < maxRetries → 重新调度)
- 无数据判定 (连续3次无数据 → 暂停主任务)

---

## 四、数据库设计

### 4.1 PostgreSQL - weibo_search_tasks

**核心字段**:
```typescript
{
  id: number;
  keyword: string;                    // 搜索关键词
  startDate: Date;                    // 监控起始时间

  // ⭐ 两个时间游标
  currentCrawlTime?: Date;            // 历史回溯进度 (向startDate递减)
  latestCrawlTime?: Date;             // 最新数据时间 (用于增量抓取)

  crawlInterval: string;              // 抓取间隔('1h')
  nextRunAt?: Date;                   // 下次执行时间

  weiboAccountId?: number;            // 指定账号
  enableAccountRotation: boolean;     // 是否轮换账号

  status: 'pending' | 'running' | 'paused' | 'failed' | 'timeout';
  enabled: boolean;                   // 是否启用
  progress: number;                   // 已完成段数
  totalSegments: number;              // 总段数

  noDataCount: number;                // 连续无数据次数
  noDataThreshold: number;            // 无数据判定阈值(默认3)

  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
}
```

**关键逻辑**:
- `currentCrawlTime=null` → 首次抓取（历史回溯）
- `currentCrawlTime <= startDate` → 历史回溯完成，进入增量模式
- 增量模式使用 `latestCrawlTime ~ NOW`

**索引**:
```sql
CREATE INDEX idx_enabled_next_run ON weibo_search_tasks(enabled, nextRunAt);
CREATE INDEX idx_status ON weibo_search_tasks(status);
```

### 4.2 PostgreSQL - weibo_accounts (已存在)

使用现有表,包含: `id`, `nickname`, `cookies(jsonb)`, `status`, `usageCount`

### 4.3 MongoDB - raw_data_sources (已存在)

**存储格式**:
```javascript
{
  sourceType: 'weibo_keyword_search',
  sourceUrl: 'https://s.weibo.com/weibo?...',
  rawContent: '<html>...</html>',
  contentHash: 'xxx',  // 自动去重
  metadata: {
    keyword: '关键词',
    taskId: 123,
    page: 1,
    timeRangeStart: '2025-10-01-0',
    timeRangeEnd: '2025-10-01-23',
  },
  status: 'pending',
  createdAt: Date
}
```

---

## 五、数据驱动拆分算法（核心创新）

### 5.1 问题背景

微博搜索限制最多50页，传统方案的问题:
- **预测困难**: 无法提前知道某时间段有多少数据
- **智能拆分复杂**: 需要多次测试请求，增加网络开销
- **数据丢失**: 如果1小时仍>=50页，部分数据会被忽略

### 5.2 数据驱动方案

**核心思想**: 不预测，而是**根据实际抓取结果动态调整**

**策略**:
1. **首次抓取**: 从 startDate ~ NOW 开始抓
2. **抓满50页**: 提取第50页最后一条微博的发布时间
3. **自动触发**: 生成新子任务 startDate ~ lastPostTime
4. **循环回溯**: 直到某个子任务不足50页，说明已到开始时间
5. **增量更新**: 每小时抓取 currentCrawlTime ~ NOW

**优势**:
- ✅ 无需预测，简单高效
- ✅ 无需额外测试请求
- ✅ 自动适配任何数据量
- ✅ 保证数据完整性，不会丢失

**伪代码**:
```
function crawlSubTask(taskId, start, end):
  pages = []
  for page in 1..50:
    html = fetchPage(keyword, start, end, page)
    pages.push(html)
    if isLastPage(html):
      break

  if pages.length == 50:
    lastPostTime = extractLastPostTime(pages[49])
    triggerNextSubTask(taskId, start, lastPostTime)

  updateTaskProgress(taskId, lastPostTime || end)
```

---

## 六、核心模块接口设计

### 6.1 @pro/broker 模块

#### TaskScannerScheduler (主任务扫描调度器)
```typescript
class TaskScannerScheduler {
  @Cron(CronExpression.EVERY_MINUTE)  // 每分钟执行
  async scanTasks(): Promise<void>
  // 扫描所有 enabled=true && nextRunAt <= NOW 的主任务

  private async dispatchTask(task: WeiboSearchTaskEntity): Promise<void>
  // 1. 判断是首次抓取还是增量更新
  // 2. 生成子任务: { start, end, taskId, keyword }
  // 3. 推送到 RabbitMQ 'weibo_crawl_queue'
  // 4. 对于增量更新: 更新 nextRunAt = NOW + crawlInterval
}
```

**首次抓取逻辑（历史回溯）**:
```typescript
if (task.currentCrawlTime === null) {
  // 首次抓取: startDate ~ NOW
  const subTask = {
    taskId: task.id,
    keyword: task.keyword,
    start: task.startDate,
    end: new Date(),
    isInitialCrawl: true,  // 标记为首次抓取
  };
  await this.rabbitMQService.publish('weibo_crawl_queue', subTask);
  // 不更新 nextRunAt，等待 crawler 自动触发下一个子任务
}
```

**增量更新逻辑（持续监控）**:
```typescript
else if (task.currentCrawlTime <= task.startDate) {
  // 历史回溯已完成，进入增量模式
  // 使用 latestCrawlTime ~ NOW
  const subTask = {
    taskId: task.id,
    keyword: task.keyword,
    start: task.latestCrawlTime,  // ⭐ 使用 latestCrawlTime
    end: new Date(),
    isInitialCrawl: false,
  };
  await this.rabbitMQService.publish('weibo_crawl_queue', subTask);

  // 立即更新 nextRunAt，等下次触发
  await this.taskRepo.update(task.id, {
    nextRunAt: new Date(Date.now() + parseInterval(task.crawlInterval)),
  });
}
```

#### TaskMonitor (主任务监控器)
```typescript
class TaskMonitor {
  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorTasks(): Promise<void>

  private async checkTimeoutTasks(): Promise<void>    // 检查超时主任务
  private async retryFailedTasks(): Promise<void>     // 重试失败主任务
}
```

### 6.2 @pro/crawler 模块

#### WeiboSearchCrawler (子任务执行器)
```typescript
interface SubTaskMessage {
  taskId: number;          // 主任务ID
  keyword: string;
  start: Date;             // 时间范围开始
  end: Date;               // 时间范围结束
  isInitialCrawl: boolean; // 是否首次抓取
  weiboAccountId?: number;
  enableAccountRotation: boolean;
}

class WeiboSearchCrawler {
  async crawl(message: SubTaskMessage): Promise<void>
  // 核心流程:
  // 1. 循环抓取 page 1 ~ 50
  // 2. 每页HTML存储到MongoDB
  // 3. 提取关键时间:
  //    - firstPostTime: 第1页第1条微博时间 (最新)
  //    - lastPostTime: 第50页最后一条微博时间 (较旧)
  // 4. 如果抓满50页 && 是首次抓取:
  //    - 更新主任务: latestCrawlTime = firstPostTime (仅第一次设置)
  //                  currentCrawlTime = lastPostTime (向下递减)
  //    - 自动触发下一个子任务: (start ~ lastPostTime)
  // 5. 如果不足50页 && 是首次抓取:
  //    - 更新主任务: currentCrawlTime = startDate (历史回溯完成)
  //                  nextRunAt = NOW + crawlInterval (进入增量模式)
  // 6. 如果是增量更新:
  //    - 更新主任务: latestCrawlTime = firstPostTime

  private async getAccount(accountId?: number, enableRotation?: boolean): Promise<WeiboAccountEntity>
  private async initBrowser(cookies: any[]): Promise<void>
  private async getPageHtml(url: string): Promise<string>
  private buildSearchUrl(keyword: string, start: Date, end: Date, page: number): string
  private isLastPage(html: string): boolean

  private extractFirstPostTime(html: string): Date | null
  // 从第1页HTML中提取第1条微博的发布时间 (最新数据)

  private extractLastPostTime(html: string): Date | null
  // 从第50页HTML中提取最后一条微博的发布时间 (用于递减)

  private async triggerNextSubTask(taskId: number, start: Date, end: Date): Promise<void>
  // 自动触发下一个子任务 (首次抓取时使用)
}
```

#### CrawlQueueConsumer (子任务消费者)
```typescript
class CrawlQueueConsumer implements OnModuleInit {
  async onModuleInit(): Promise<void>
  // 监听 RabbitMQ 'weibo_crawl_queue'
  // 收到子任务消息 → 调用 WeiboSearchCrawler.crawl()
}
```

### 6.3 @pro/api 模块

#### WeiboSearchTaskService (主任务管理)
```typescript
interface CreateTaskDto {
  keyword: string;
  startDate: string;
  crawlInterval?: string;  // 默认 '1h'
  weiboAccountId?: number;
  enableAccountRotation?: boolean;
}

class WeiboSearchTaskService {
  async create(dto: CreateTaskDto): Promise<WeiboSearchTaskEntity>
  // 创建主任务，自动设置 enabled=true, nextRunAt=NOW

  async findAll(): Promise<WeiboSearchTaskEntity[]>
  async findOne(id: number): Promise<WeiboSearchTaskEntity | null>
  async update(id: number, updates: Partial<WeiboSearchTaskEntity>): Promise<void>
  async delete(id: number): Promise<void>
  async pause(id: number): Promise<void>    // 暂停: enabled=false
  async resume(id: number): Promise<void>   // 恢复: enabled=true, nextRunAt=NOW
}
```

#### WeiboSearchTaskController
```typescript
@Controller('weibo-search-tasks')
class WeiboSearchTaskController {
  @Post() create(@Body() dto: CreateTaskDto)
  @Get() findAll()
  @Get(':id') findOne(@Param('id') id: number)
  @Put(':id') update(@Param('id') id: number, @Body() updates: any)
  @Delete(':id') delete(@Param('id') id: number)
  @Post(':id/pause') pause(@Param('id') id: number)
  @Post(':id/resume') resume(@Param('id') id: number)
}
```

---

## 七、前端界面设计

### 7.1 主任务管理页面

**路由**: `/weibo-search-tasks`

**功能模块**:
1. **主任务列表**: 表格展示、筛选(状态/关键词)、排序
2. **创建主任务**: 关键词输入、起始日期、抓取间隔、账号选择
3. **主任务操作**: 暂停/恢复、编辑、删除、查看详情
4. **状态监控**:
   - currentCrawlTime: 显示当前已抓取到的时间点
   - nextRunAt: 显示下次生成子任务的时间
   - 状态标签、错误信息

### 7.2 原始数据查看页面

**路由**: `/raw-data-sources`

**功能**: 查询原始HTML、按主任务ID/关键词/时间筛选、预览/下载

---

## 八、API接口设计

### 8.1 主任务管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/weibo-search-tasks` | 创建主任务 |
| GET | `/api/weibo-search-tasks` | 获取主任务列表 |
| GET | `/api/weibo-search-tasks/:id` | 获取主任务详情 |
| PUT | `/api/weibo-search-tasks/:id` | 更新主任务 |
| DELETE | `/api/weibo-search-tasks/:id` | 删除主任务 |
| POST | `/api/weibo-search-tasks/:id/pause` | 暂停主任务 |
| POST | `/api/weibo-search-tasks/:id/resume` | 恢复主任务 |

### 8.2 原始数据查询接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/raw-data-sources?sourceType=weibo_keyword_search&keyword=xxx` | 查询原始数据 |
| GET | `/api/raw-data-sources/:id` | 获取单条数据 |

**注意**: 子任务不需要API接口，由broker自动生成并推送到MQ

---

## 九、实施步骤

### 阶段1: 数据库准备 (可并行)

**任务**:
- [ ] 创建 `weibo_search_tasks` 主任务表
- [ ] 验证 `weibo_accounts` 表 ✅ 已存在
- [ ] 验证 MongoDB `raw_data_sources` 集合 ✅ 已存在

**说明**: 子任务不需要数据库表，通过MQ消息传递

**依赖**: 无

**提交**: `feat(db): 创建微博搜索主任务表`

---

### 阶段2: @pro/api - 主任务管理 (依赖阶段1)

**任务**:
- [ ] 创建 `WeiboSearchTaskEntity` (主任务实体)
- [ ] 创建 `WeiboSearchTaskService` (主任务CRUD)
- [ ] 创建 `WeiboSearchTaskController`
- [ ] 创建 DTO: `CreateTaskDto`, `UpdateTaskDto`

**验证**: 使用curl测试创建主任务接口

**提交**: `feat(api): 实现微博搜索主任务管理接口`

---

### 阶段3: @pro/broker - 主任务调度 (依赖阶段2)

**任务**:
- [ ] 安装 RabbitMQ 依赖: `pnpm add @nestjs/microservices amqplib`
- [ ] 创建 `TaskScannerScheduler` (每分钟扫描主任务)
- [ ] 实现 `dispatchTask()`:
  - 判断首次抓取/增量更新
  - 生成子任务消息 (包含 isInitialCrawl 标记)
  - 推送到MQ
- [ ] 创建 `TaskMonitor` (监控主任务状态)

**提交**: `feat(broker): 实现主任务调度和监控`

---

### 阶段4: @pro/crawler - 爬虫基础 (依赖阶段1, 可与阶段3并行)

**任务**:
- [ ] 安装 Playwright: `pnpm add playwright`
- [ ] 创建 `WeiboSearchCrawler` 服务
- [ ] 实现账号获取和浏览器初始化
- [ ] 实现URL构建

**提交**: `feat(crawler): 实现爬虫基础功能`

---

### 阶段5: @pro/crawler - 子任务执行 (依赖阶段4)

**任务**:
- [ ] 实现 `crawl(message: SubTaskMessage)` 完整流程:
  - 循环抓取 page 1 ~ 50
  - 每页HTML存储到MongoDB
  - 实现 `extractLastPostTime()` 提取最后一条微博发布时间
  - 抓满50页: 调用 `triggerNextSubTask()` 自动触发下一个子任务
  - 更新主任务 currentCrawlTime
- [ ] 集成 `RawDataSourceService`
- [ ] 创建 `CrawlQueueConsumer` 监听MQ

**验证**:
1. 创建主任务 (startDate=1年前)
2. broker生成首次子任务
3. crawler抓满50页，自动触发下一个子任务
4. 循环直到历史数据回溯完成
5. 检查MongoDB数据完整性

**提交**: `feat(crawler): 实现数据驱动拆分和子任务执行`

---

### 阶段6: @pro/admin - 前端界面 (依赖阶段2, 可与其他阶段并行)

**任务**:
- [ ] 创建 `WeiboSearchTaskStore` (Akita, 主任务状态管理)
- [ ] 创建 `WeiboSearchTaskService` (调用主任务API)
- [ ] 创建主任务列表页面
- [ ] 创建主任务创建/编辑表单
- [ ] 实现主任务状态监控视图 (currentCrawlTime, nextRunAt)

**提交**: `feat(admin): 实现微博搜索主任务管理界面`

---

## 七、关键实现细节

### 7.1 extractFirstPostTime() 实现

从第1页HTML中提取第1条微博的发布时间（最新数据）：

```typescript
private extractFirstPostTime(html: string): Date | null {
  const $ = cheerio.load(html);
  const firstCard = $('.card-wrap').first();
  const timeText = firstCard.find('.from time').attr('title') ||
                   firstCard.find('.from a').text();

  // 解析时间字符串: "2025-10-01 12:30"
  if (timeText) {
    return new Date(timeText);
  }

  // 正则匹配
  const timePattern = /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/;
  const match = html.match(timePattern);
  if (match) {
    return new Date(match[1]);
  }

  return null;
}
```

### 7.2 extractLastPostTime() 实现

从第50页HTML中提取最后一条微博的发布时间（用于递减）：

```typescript
private extractLastPostTime(html: string): Date | null {
  const $ = cheerio.load(html);
  const lastCard = $('.card-wrap').last();
  const timeText = lastCard.find('.from time').attr('title') ||
                   lastCard.find('.from a').text();

  // 解析时间字符串: "2025-09-15 10:30"
  if (timeText) {
    return new Date(timeText);
  }

  // 方法2: 正则匹配
  const timePattern = /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/g;
  const matches = html.match(timePattern);
  if (matches && matches.length > 0) {
    return new Date(matches[matches.length - 1]);
  }

  return null;
}
```

### 7.3 crawl() 核心实现

完整的子任务抓取流程：

```typescript
async crawl(message: SubTaskMessage): Promise<void> {
  const { taskId, keyword, start, end, isInitialCrawl } = message;

  let firstPostTime: Date | null = null;
  let lastPostTime: Date | null = null;
  let pageCount = 0;

  // 1. 循环抓取页面
  for (let page = 1; page <= 50; page++) {
    const html = await this.getPageHtml(keyword, start, end, page);

    // 存储到MongoDB
    await this.rawDataSourceService.create({
      sourceType: 'weibo_keyword_search',
      sourceUrl: url,
      rawContent: html,
      metadata: { keyword, taskId, page, ... }
    });

    pageCount = page;

    // 第1页: 提取最新数据时间
    if (page === 1) {
      firstPostTime = this.extractFirstPostTime(html);
    }

    // 最后一页: 提取最后一条时间
    lastPostTime = this.extractLastPostTime(html);

    // 检查是否为最后一页
    if (this.isLastPage(html)) {
      break;
    }
  }

  // 2. 更新主任务
  if (isInitialCrawl) {
    // 首次抓取（历史回溯）
    if (pageCount === 50) {
      // 抓满50页，继续回溯
      await this.taskRepo.update(taskId, {
        latestCrawlTime: firstPostTime || new Date(),  // 仅第一次设置
        currentCrawlTime: lastPostTime,                // 向下递减
      });

      // 自动触发下一个子任务
      await this.triggerNextSubTask(taskId, start, lastPostTime);
    } else {
      // 不足50页，历史回溯完成
      await this.taskRepo.update(taskId, {
        currentCrawlTime: start,  // 设置为 startDate
        nextRunAt: new Date(Date.now() + parseInterval(crawlInterval)),
      });
    }
  } else {
    // 增量更新
    await this.taskRepo.update(taskId, {
      latestCrawlTime: firstPostTime || new Date(),
    });
  }
}
```

### 7.4 triggerNextSubTask() 实现

抓满50页后自动触发下一个子任务：

```typescript
private async triggerNextSubTask(
  taskId: number,
  start: Date,
  end: Date  // lastPostTime
): Promise<void> {
  const task = await this.taskRepo.findOne({ where: { id: taskId } });

  const nextSubTask = {
    taskId: task.id,
    keyword: task.keyword,
    start: task.startDate,  // 始终从 startDate 开始
    end: end,               // 到上一个子任务的 lastPostTime
    isInitialCrawl: true,
  };

  await this.rabbitMQService.publish('weibo_crawl_queue', nextSubTask);
}
```

---

## 八、部署要点

### 8.1 环境依赖

- **Playwright**: 需要Chromium浏览器支持
- **RabbitMQ**: 消息队列服务
- **PostgreSQL**: 主任务配置存储
- **MongoDB**: 原始数据存储
- **cheerio**: HTML解析 (提取微博发布时间)

### 8.2 Docker支持

修改源码后需要重新构建镜像:
```bash
docker compose build broker
docker compose up -d broker --build
```

---

## 九、核心优势

1. **双时间游标设计** ⭐⭐:
   - **currentCrawlTime**: 历史回溯进度，向startDate递减
   - **latestCrawlTime**: 最新数据时间，用于增量抓取
   - 完美解决"向下回溯"和"向上增量"的矛盾

2. **数据驱动拆分** ⭐:
   - 无需预测页数，根据实际抓取结果动态调整
   - 第1页第1条 → latestCrawlTime (最新)
   - 第50页最后一条 → currentCrawlTime (递减)
   - 保证数据完整性，无数据丢失

3. **主任务/子任务分离**:
   - 主任务存储在数据库，持续监控配置
   - 子任务通过MQ传递，无需数据库，轻量高效

4. **首次抓取/增量更新自动切换**:
   - currentCrawlTime=null → 首次抓取 (历史数据回溯)
   - currentCrawlTime <= startDate → 增量更新 (持续监控)

5. **持续监控**:
   - 历史回溯: 自动触发下一个子任务，无需等待
   - 增量更新: 每小时检查 latestCrawlTime ~ NOW

6. **职责清晰**:
   - broker: 扫描主任务 → 生成子任务 → 推送MQ
   - crawler: 消费子任务 → 抓取HTML → 提取双时间 → 自动触发

7. **自动去重**: contentHash避免重复存储
8. **账号轮换**: 降低封禁风险
9. **失败重试**: 主任务自动重试，最多3次

---

## 十、注意事项

### 10.1 双时间提取关键点

**extractFirstPostTime()** (第1页第1条):
- 提取最新数据时间
- 只在第1页调用
- 用于更新 latestCrawlTime

**extractLastPostTime()** (第50页最后一条):
- 提取较旧数据时间
- 用于更新 currentCrawlTime (递减)
- 用于生成下一个子任务的 end 参数

**注意事项**:
- 微博HTML结构可能变化，需要多种解析方法兜底
- 时间格式可能多样: "2025-09-15 10:30" 或 "2小时前"
- 需要处理相对时间转换为绝对时间
- 如果提取失败，应记录日志并返回 null

### 10.2 latestCrawlTime 更新策略

- **首次抓取第1个子任务**: 设置 latestCrawlTime = firstPostTime
- **首次抓取后续子任务**: 不更新 latestCrawlTime (保持最新值)
- **增量更新**: 每次都更新 latestCrawlTime = firstPostTime

**实现建议**:
```typescript
if (isInitialCrawl && pageCount === 50) {
  // 仅在 latestCrawlTime 为 null 时设置
  const updates: any = { currentCrawlTime: lastPostTime };
  if (task.latestCrawlTime === null) {
    updates.latestCrawlTime = firstPostTime;
  }
  await this.taskRepo.update(taskId, updates);
}
```

### 10.3 反爬策略

- 随机延迟 (2-5秒)
- 账号轮换
- 控制并发数 (crawler实例数量)

### 10.4 数据完整性

- contentHash自动去重
- 主任务失败自动重试
- 超时检测(30分钟)
- 历史数据回溯完成后才进入增量模式

### 10.5 实施原则

- 每个阶段完成后提交代码
- 修改源码后需要 `--build` 重启
- 先完成依赖任务，再并行执行独立任务
- 优先实现双时间提取函数并充分测试
- 确保 latestCrawlTime 仅在首次设置一次
