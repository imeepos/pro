# 微博关键词搜索数据抓取方案

## 一、需求分析

### 1.1 业务需求
实现微博关键词搜索的持续监控数据抓取。

**核心功能**:
- 支持按关键词搜索微博内容
- 支持持续监控模式（只有开始时间，无结束时间）
- 任务持续运行直到用户手动关闭
- 智能时间段拆分（自动适配数据量，解决50页限制）
- 支持任务状态监控和进度追踪
- 存储原始HTML数据,供后续解析使用

### 1.2 技术约束

**微博搜索接口限制**:
```
https://s.weibo.com/weibo?q={keyword}&typeall=1&suball=1&timescope=custom:{start}:{end}&Refer=g&page={page}
```

- ⏰ **时间精度**: 只能精确到小时 (格式: `2025-10-01-0` 表示2025年10月1日0时)
- 📄 **分页限制**: 最多50页
- 🔐 **登录要求**: 需要Cookie认证
- ⚠️ **反爬风险**: 需要控制请求频率、使用账号轮换

### 1.3 数据存储策略

**核心原则**: 只存储原始HTML,不做解析

- ✅ **存储**: 完整的页面HTML (`page.content()`)
- ✅ **去重**: 通过 `contentHash` 自动去重
- ❌ **不解析**: 不提取微博内容、用户信息等结构化数据
- 🔄 **后续处理**: 解析服务独立实现,从 `raw_data_sources` 读取HTML并解析

---

## 二、整体架构设计

### 2.1 服务架构图

```
┌──────────────────────────────────────────────────────────────────┐
│                         @pro/admin (前端管理界面)                     │
│  - 微博搜索任务管理页面 (创建、查看、编辑、删除)                          │
│  - 任务监控页面 (状态、进度、错误日志)                                  │
└─────────────────────────┬────────────────────────────────────────┘
                          │ HTTP (REST API)
                          ↓
┌──────────────────────────────────────────────────────────────────┐
│                         @pro/api (API服务)                        │
│  - WeiboSearchTaskController (任务管理接口)                        │
│  - WeiboSearchTaskService (任务CRUD)                              │
│  - PostgreSQL: weibo_search_tasks (任务配置表)                     │
└─────────────────────────┬────────────────────────────────────────┘
                          │ 定时触发 (通过数据库轮询)
                          ↓
┌──────────────────────────────────────────────────────────────────┐
│                      @pro/broker (任务调度服务) ⭐                  │
│                                                                  │
│  [TaskScannerScheduler]                                         │
│     - 每分钟扫描 weibo_search_tasks 表                            │
│     - 检查需要执行的任务 (enabled=true, nextRunAt <= now)          │
│                                                                  │
│  [TimeRangeSplitter] ⭐ 智能拆分                                 │
│     - 测试时间段页数（>= 50页则拆分，0页则扩大）                      │
│     - 递归拆分直到合适粒度（最小1小时，最大1周）                      │
│     - 解决50页限制问题                                             │
│                                                                  │
│  [PageCountTester]                                              │
│     - 快速测试指定时间段的页数                                      │
│     - 解析分页信息或估算页数                                        │
│                                                                  │
│  [ContinuousTaskGenerator]                                      │
│     - 持续监控任务生成器                                           │
│     - 每小时检查新数据                                             │
│     - 更新 currentCrawlTime 和 nextRunAt                         │
│                                                                  │
│  [TaskMonitor]                                                  │
│     - 监控任务执行状态                                             │
│     - 处理失败重试                                                 │
└─────────────────────────┬────────────────────────────────────────┘
                          │ RabbitMQ (消息队列)
                          ↓
┌──────────────────────────────────────────────────────────────────┐
│                    @pro/crawler (爬虫执行服务)                      │
│                                                                  │
│  [WeiboSearchCrawler]                                           │
│     - 从 weibo_accounts 表读取Cookie                              │
│     - 使用 Playwright 访问搜索页面                                 │
│     - 获取完整HTML (page.content())                               │
│     - 存储到 MongoDB                                              │
│                                                                  │
│  [AccountRotator]                                               │
│     - 账号轮换策略                                                 │
│     - 健康检查                                                    │
└─────────────────────────┬────────────────────────────────────────┘
                          │ 存储原始数据
                          ↓
┌──────────────────────────────────────────────────────────────────┐
│                      MongoDB (原始数据存储)                         │
│  - Collection: raw_data_sources                                 │
│  - 存储完整HTML + 元数据                                           │
│  - 自动去重 (contentHash)                                         │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 服务职责划分

| 服务 | 职责 | 技术栈 |
|------|------|--------|
| **@pro/admin** | 任务管理界面、状态监控 | Angular + Akita |
| **@pro/api** | 任务配置CRUD、REST API | NestJS + TypeORM + PostgreSQL |
| **@pro/broker** | 任务调度、时间拆分、增量生成 | NestJS + @nestjs/schedule |
| **@pro/crawler** | 执行爬取、账号管理 | NestJS + Playwright + RabbitMQ |
| **PostgreSQL** | 存储任务配置、账号信息 | weibo_search_tasks, weibo_accounts |
| **MongoDB** | 存储原始HTML数据 | raw_data_sources |
| **RabbitMQ** | 解耦调度与执行、支持并发 | 消息队列 |

---

## 三、数据流转设计

### 3.1 任务创建流程

```
用户在管理界面创建任务
   ↓
POST /api/weibo-search-tasks
   ↓
WeiboSearchTaskService.create()
   ↓
写入 PostgreSQL: weibo_search_tasks
   {
     keyword: '关键词',
     startDate: '2025-01-01',       // 监控起始时间
     crawlInterval: '1h',           // 抓取间隔（每小时检查一次）
     minTimeGranularity: '1h',      // 最小时间粒度
     maxTimeGranularity: '1w',      // 最大时间粒度
     enabled: true,                 // 启用状态
     nextRunAt: NOW()               // 下次执行时间
   }
```

### 3.2 持续监控任务调度流程 ⭐ 核心变化

```
@pro/broker - ContinuousTaskGenerator (每小时执行)
   ↓
扫描数据库: SELECT * FROM weibo_search_tasks
            WHERE enabled=true AND nextRunAt <= NOW()
   ↓
找到待执行任务
   ↓
计算时间范围:
   start = task.currentCrawlTime || task.startDate
   end = NOW()
   ↓
TimeRangeSplitter.split(keyword, start, end) ⭐ 智能拆分
   ↓
   1. 测试当前时间段的页数
      PageCountTester.test(keyword, start, end)
   ↓
   2. 根据页数决定策略:
      - >= 50页 → 拆分为更小时间段（递归）
      - 0页 → 扩大时间范围（最大1周）
      - 1-49页 → 正常返回
   ↓
   输出: [
     { start: '2025-01-01-0', end: '2025-01-01-11', estimatedPages: 30 },
     { start: '2025-01-01-12', end: '2025-01-01-23', estimatedPages: 25 },
     ...
   ]
   ↓
为每个时间段生成消息
   ↓
发送到 RabbitMQ: weibo_crawl_queue
   {
     taskId: 123,
     keyword: '关键词',
     timeRange: { start: '2025-01-01-0', end: '2025-01-01-11' },
     estimatedPages: 30,
     weiboAccountId: 1
   }
   ↓
更新任务状态:
   - currentCrawlTime = NOW()        // 更新游标
   - nextRunAt = NOW() + crawlInterval  // 下次执行时间
   - noDataCount = 0 (有数据) 或 +1 (无数据)
   ↓
如果连续无数据 >= noDataThreshold:
   - status = 'paused'
   - enabled = false
```

### 3.3 任务执行流程

```
@pro/crawler - 监听 RabbitMQ: weibo_crawl_queue
   ↓
收到消息 { taskId, keyword, timeRange, weiboAccountId }
   ↓
WeiboSearchCrawler.crawl()
   ↓
1. 从 weibo_accounts 表读取Cookie
   ↓
2. 启动 Playwright Browser
   ↓
3. 循环分页 (page = 1 to 50)
      ↓
      构建URL: https://s.weibo.com/weibo?q={keyword}
                &timescope=custom:{timeRange.start}:{timeRange.end}
                &page={page}
      ↓
      访问页面: await page.goto(url)
      ↓
      获取HTML: const html = await page.content()
      ↓
      存储到MongoDB:
         RawDataSourceService.create({
           sourceType: 'weibo_keyword_search',
           sourceUrl: url,
           rawContent: html,
           metadata: {
             keyword,
             taskId,
             page,
             timeRangeStart: timeRange.start,
             timeRangeEnd: timeRange.end,
           },
         })
      ↓
      如果检测到"没有更多结果" → 停止翻页
   ↓
4. 关闭浏览器
   ↓
5. ACK消息 (成功) 或 NACK消息 (失败)
   ↓
6. 更新任务进度: UPDATE weibo_search_tasks
                SET progress=progress+1
```

### 3.4 状态监控流程

```
@pro/broker - TaskMonitor (每5分钟执行)
   ↓
扫描数据库: SELECT * FROM weibo_search_tasks
            WHERE status='running' AND updatedAt < NOW() - 30min
   ↓
标记超时任务: status='timeout'
   ↓
检查失败任务: SELECT * FROM weibo_search_tasks
              WHERE status='failed' AND retryCount < maxRetries
   ↓
重新调度失败任务: status='pending', nextRunAt=NOW()
```

### 3.5 持续监控流程 ⭐ (替代增量抓取)

```
持续监控任务: enabled=true, crawlInterval='1h'
   ↓
ContinuousTaskGenerator 检测到 nextRunAt <= NOW()
   ↓
计算时间范围:
   start = task.currentCrawlTime || task.startDate
   end = NOW()
   ↓
智能拆分时间段 (见 3.2 节)
   ↓
发送到 RabbitMQ
   ↓
Crawler 执行抓取
   ↓
更新任务:
   currentCrawlTime = NOW()           // 游标前移
   nextRunAt = NOW() + crawlInterval  // 下次1小时后执行
   noDataCount = 0 或 +1
   ↓
任务永不结束，除非:
   1. 用户手动关闭 (enabled=false)
   2. 连续无数据次数超过阈值 (自动暂停)
```

### 3.6 数据查询流程

```
用户查询某关键词的原始数据
   ↓
GET /api/raw-data-sources?sourceType=weibo_keyword_search&keyword=xxx
   ↓
RawDataSourceService.findAll({
  sourceType: 'weibo_keyword_search',
  'metadata.keyword': 'xxx'
})
   ↓
返回原始HTML列表
   ↓
(后续) 解析服务读取HTML并提取结构化数据
```

---

## 四、数据库设计

### 4.1 PostgreSQL - 任务配置表

#### weibo_search_tasks (微博搜索任务表) ⭐ 重要变更

```typescript
@Entity('weibo_search_tasks')
export class WeiboSearchTaskEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  // ========== 基本信息 ==========
  @Column({ length: 200, comment: '搜索关键词' })
  keyword!: string;

  @Column({ type: 'timestamp', comment: '监控起始时间' })
  startDate!: Date;

  // ========== 持续监控配置 ⭐ ==========
  @Column({ type: 'timestamp', nullable: true, comment: '当前抓取进度（游标）' })
  currentCrawlTime?: Date;

  @Column({ default: '1h', comment: '抓取间隔（1h=每小时检查一次）' })
  crawlInterval!: string; // '1h' | '30m' | '2h'

  @Column({ default: '1h', comment: '最小时间粒度' })
  minTimeGranularity!: string;

  @Column({ default: '1w', comment: '最大时间粒度（判断无数据）' })
  maxTimeGranularity!: string;

  @Column({ default: 0, comment: '连续无数据次数' })
  noDataCount!: number;

  @Column({ default: 3, comment: '无数据判定阈值（连续3次无数据则暂停）' })
  noDataThreshold!: number;

  @Column({ type: 'timestamp', nullable: true, comment: '下次执行时间' })
  nextRunAt?: Date;

  // ========== 账号配置 ==========
  @Column({ nullable: true, comment: '指定使用的微博账号ID' })
  weiboAccountId?: number;

  @Column({ default: true, comment: '是否启用账号轮换' })
  enableAccountRotation!: boolean;

  // ========== 任务状态 ==========
  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'paused', 'completed', 'failed', 'timeout'],
    default: 'pending',
    comment: '任务状态'
  })
  status!: string;

  @Column({ default: true, comment: '是否启用' })
  enabled!: boolean;

  @Column({ default: 0, comment: '已完成的时间段数量' })
  progress!: number;

  @Column({ default: 0, comment: '总时间段数量' })
  totalSegments!: number;

  @Column({ nullable: true, type: 'text', comment: '错误信息' })
  errorMessage?: string;

  @Column({ default: 0, comment: '重试次数' })
  retryCount!: number;

  @Column({ default: 3, comment: '最大重试次数' })
  maxRetries!: number;

  // ========== 时间戳 ==========
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

**索引设计**:
```sql
CREATE INDEX idx_enabled_next_run ON weibo_search_tasks(enabled, nextRunAt);
CREATE INDEX idx_status ON weibo_search_tasks(status);
CREATE INDEX idx_keyword ON weibo_search_tasks(keyword);
```

#### weibo_accounts (微博账号表) ✅ 已存在

```typescript
@Entity('weibo_accounts')
export class WeiboAccountEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100, comment: '账号昵称' })
  nickname!: string;

  @Column({ type: 'jsonb', comment: 'Cookie数组' })
  cookies!: any[];

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'banned'],
    default: 'active',
    comment: '账号状态'
  })
  status!: string;

  @Column({ type: 'timestamp', nullable: true, comment: '上次使用时间' })
  lastUsedAt?: Date;

  @Column({ default: 0, comment: '使用次数' })
  usageCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

### 4.2 MongoDB - 原始数据存储

#### raw_data_sources (原始数据源集合) ✅ 已存在于 @pro/mongodb

使用现有的 `RawDataSource` Schema,**不需要新建Schema**。

**字段映射说明**:

```typescript
// 存储示例
{
  // ========== 核心字段 ==========
  sourceType: 'weibo_keyword_search',  // 固定值,标识数据来源

  sourceUrl: 'https://s.weibo.com/weibo?q=关键词&typeall=1&suball=1&timescope=custom:2025-10-01-0:2025-10-02-23&Refer=g&page=1',

  rawContent: '<!DOCTYPE html><html>...完整的页面HTML...</html>',

  contentHash: 'a1b2c3d4e5f6...',  // 自动计算,用于去重

  // ========== 元数据 (自定义) ==========
  metadata: {
    keyword: '关键词',              // 搜索关键词
    taskId: 123,                    // 关联的任务ID (weibo_search_tasks.id)
    page: 1,                        // 页码
    timeRangeStart: '2025-10-01-0', // 时间范围起始
    timeRangeEnd: '2025-10-02-23',  // 时间范围结束
    weiboAccountId: 1,              // 使用的微博账号ID
    crawledAt: '2025-10-09T12:00:00Z', // 抓取时间
  },

  // ========== 处理状态 ==========
  status: 'pending',  // pending | processing | completed | failed

  processedAt: null,  // 解析完成时间 (由解析服务更新)

  errorMessage: null, // 错误信息 (如解析失败原因)

  // ========== 时间戳 ==========
  createdAt: '2025-10-09T12:00:00Z',
}
```

**索引设计** (已在Schema中定义):
```javascript
// 单字段索引
{ sourceType: 1 }
{ status: 1 }
{ contentHash: 1 }  // unique

// 复合索引
{ status: 1, createdAt: 1 }
```

**查询示例**:
```typescript
// 查询某任务的所有原始数据
await rawDataSourceService.findAll({
  sourceType: 'weibo_keyword_search',
  'metadata.taskId': 123,
});

// 查询某关键词的数据
await rawDataSourceService.findAll({
  sourceType: 'weibo_keyword_search',
  'metadata.keyword': '关键词',
});

// 查询待解析的数据
await rawDataSourceService.findAll({
  sourceType: 'weibo_keyword_search',
  status: 'pending',
});
```

---

## 五、智能时间段拆分算法 ⭐ 核心创新

### 5.1 算法设计思路

微博搜索接口有 **50页限制**，如果某个时间段的数据超过50页，后续数据将无法获取。传统方案是固定按天拆分，但这存在两个问题：

1. **热点事件**：某天可能有上千条微博，50页无法覆盖
2. **冷门关键词**：连续多天可能只有几条数据，按天拆分浪费请求

**智能拆分算法** 通过 **测试页数** + **动态调整** 解决这两个问题。

### 5.2 核心策略

```
策略1: 数据量大（>= 50页）
  → 拆分为更小时间段
  → 递归拆分直到 < 50页
  → 最小粒度：1小时

策略2: 无数据（0页）
  → 扩大时间范围
  → 递归扩大直到有数据或达到1周
  → 最大粒度：1周

策略3: 正常数据（1-49页）
  → 直接返回该时间段
```

### 5.3 拆分示例

#### 场景1：热点事件（数据量大）

```
初始时间段: 2025-01-01 00:00 - 2025-01-02 00:00 (1天)
   ↓
测试页数: PageCountTester.test() → 返回 100页 (>= 50)
   ↓
拆分策略: 拆分为两半
   - 左半部分: 2025-01-01 00:00 - 2025-01-01 12:00 (12小时)
   - 右半部分: 2025-01-01 12:00 - 2025-01-02 00:00 (12小时)
   ↓
继续递归测试:
   左半部分 → 60页 (>= 50) → 继续拆分为6小时
   右半部分 → 40页 (< 50) → 正常返回
   ↓
继续拆分左半部分...
   2025-01-01 00:00 - 2025-01-01 06:00 → 35页 (正常)
   2025-01-01 06:00 - 2025-01-01 12:00 → 25页 (正常)
   ↓
最终结果:
   [
     { start: '2025-01-01-0', end: '2025-01-01-5', estimatedPages: 35 },
     { start: '2025-01-01-6', end: '2025-01-01-11', estimatedPages: 25 },
     { start: '2025-01-01-12', end: '2025-01-01-23', estimatedPages: 40 },
   ]
```

#### 场景2：超热点事件（1小时仍>=50页）

```
初始时间段: 2025-01-01 10:00 - 2025-01-01 11:00 (1小时)
   ↓
测试页数: 80页 (>= 50)
   ↓
检查粒度: 已经是1小时（最小粒度），无法继续拆分
   ↓
警告日志: "[TimeRangeSplitter] 时间段 ... 有 80 页，超过50页限制，部分数据将被忽略"
   ↓
返回结果:
   [
     { start: '2025-01-01-10', end: '2025-01-01-10', estimatedPages: 50 }
   ]
   (只抓取前50页，后续数据忽略)
```

#### 场景3：冷门关键词（无数据）

```
初始时间段: 2025-01-01 00:00 - 2025-01-01 01:00 (1小时)
   ↓
测试页数: 0页
   ↓
扩大策略: 扩大为 2025-01-01 00:00 - 2025-01-01 03:00 (3小时)
   ↓
测试页数: 0页
   ↓
继续扩大: 2025-01-01 00:00 - 2025-01-01 09:00 (9小时)
   ↓
测试页数: 0页
   ↓
继续扩大: 2025-01-01 00:00 - 2025-01-02 03:00 (1天3小时)
   ↓
...扩大到1周还是0页...
   ↓
判定为无数据: 返回 []
   ↓
任务处理: noDataCount + 1，连续3次无数据后暂停任务
```

#### 场景4：正常数据量

```
初始时间段: 2025-01-01 00:00 - 2025-01-02 00:00 (1天)
   ↓
测试页数: 25页 (正常范围)
   ↓
直接返回:
   [
     { start: '2025-01-01-0', end: '2025-01-01-23', estimatedPages: 25 }
   ]
```

### 5.4 算法复杂度分析

**时间复杂度**: O(log N)
- 每次拆分/扩大都是指数级变化（×2 或 ÷2）
- 最多拆分次数：log₂(1周/1小时) = log₂(168) ≈ 8次

**空间复杂度**: O(log N)
- 递归深度最多8层
- 最终返回的时间段数量取决于数据分布

**网络请求次数**:
- 每次拆分需要1次页面请求（测试页数）
- 最坏情况：约8次请求
- 平均情况：2-3次请求

### 5.5 算法优化方向

**当前实现**:
- 每次都实时访问微博页面测试页数
- 优点：精确
- 缺点：网络请求多

**未来优化**:
1. **缓存策略**：相同关键词+时间段的页数缓存1小时
2. **历史学习**：记录每个关键词的数据密度，预测最佳粒度
3. **批量测试**：一次请求同时测试多个时间段
4. **并行拆分**：左右两半并行测试，减少总耗时

---

## 六、核心模块设计

### 6.1 @pro/broker 模块 ⭐ 核心

#### TaskScannerScheduler - 任务扫描调度器

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { WeiboSearchTaskEntity } from '../entities/weibo-search-task.entity';
import { TimeRangeSplitter } from './time-range-splitter';
import { RabbitMQService } from './rabbitmq.service';

@Injectable()
export class TaskScannerScheduler {
  constructor(
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly taskRepo: Repository<WeiboSearchTaskEntity>,
    private readonly timeRangeSplitter: TimeRangeSplitter,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  /**
   * 每分钟扫描一次待执行任务
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async scanTasks() {
    const tasks = await this.taskRepo.find({
      where: {
        enabled: true,
        nextRunAt: LessThanOrEqual(new Date()),
        status: 'pending',
      },
    });

    for (const task of tasks) {
      await this.dispatchTask(task);
    }
  }

  /**
   * 调度单个任务
   */
  private async dispatchTask(task: WeiboSearchTaskEntity) {
    try {
      // 1. 标记为运行中
      await this.taskRepo.update(task.id, { status: 'running' });

      // 2. 拆分时间范围
      const timeRanges = this.timeRangeSplitter.split(
        task.startDate,
        task.endDate,
      );

      // 3. 更新总段数
      await this.taskRepo.update(task.id, {
        totalSegments: timeRanges.length,
      });

      // 4. 发送到消息队列
      for (const range of timeRanges) {
        await this.rabbitMQService.publish('weibo_crawl_queue', {
          taskId: task.id,
          keyword: task.keyword,
          timeRange: range,
          weiboAccountId: task.weiboAccountId,
          enableAccountRotation: task.enableAccountRotation,
        });
      }

      // 5. 更新下次执行时间 (增量任务)
      if (task.isIncremental) {
        const nextRunAt = this.calculateNextRunTime(task.interval);
        await this.taskRepo.update(task.id, { nextRunAt });
      }

    } catch (error) {
      await this.taskRepo.update(task.id, {
        status: 'failed',
        errorMessage: error.message,
        retryCount: task.retryCount + 1,
      });
    }
  }

  /**
   * 计算下次执行时间
   */
  private calculateNextRunTime(interval: string): Date {
    const now = new Date();
    const match = interval.match(/^(\d+)(h|m|d)$/);
    if (!match) return now;

    const [, value, unit] = match;
    const num = parseInt(value);

    switch (unit) {
      case 'h':
        return new Date(now.getTime() + num * 60 * 60 * 1000);
      case 'm':
        return new Date(now.getTime() + num * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + num * 24 * 60 * 60 * 1000);
      default:
        return now;
    }
  }
}
```

#### TimeRangeSplitter - 智能时间段拆分器 ⭐ 完全重写

```typescript
import { Injectable } from '@nestjs/common';
import { PageCountTester } from './page-count-tester';

export interface TimeRange {
  start: string; // '2025-01-01-0'
  end: string;   // '2025-01-01-23'
  estimatedPages: number; // 预估页数
}

@Injectable()
export class TimeRangeSplitter {
  constructor(
    private readonly pageCountTester: PageCountTester,
  ) {}

  /**
   * 智能拆分时间段
   *
   * 核心逻辑:
   * - >= 50页 → 拆分为更小时间段
   * - 0页 → 扩大时间范围
   * - 1-49页 → 正常返回
   *
   * @param keyword 搜索关键词
   * @param startTime 起始时间
   * @param endTime 结束时间
   * @returns 拆分后的时间段数组
   */
  async split(
    keyword: string,
    startTime: Date,
    endTime: Date,
  ): Promise<TimeRange[]> {
    return await this.splitRecursive(keyword, startTime, endTime);
  }

  /**
   * 递归拆分
   */
  private async splitRecursive(
    keyword: string,
    start: Date,
    end: Date,
  ): Promise<TimeRange[]> {
    const duration = this.getDuration(start, end);

    // 1. 测试当前时间段的页数
    const pageCount = await this.pageCountTester.test(keyword, start, end);

    // 2. 如果 >= 50页，需要拆分
    if (pageCount >= 50) {
      if (duration <= this.parseInterval('1h')) {
        // 已经是1小时了，无法再拆分
        console.warn(
          `[TimeRangeSplitter] 时间段 ${start.toISOString()} - ${end.toISOString()} 有 ${pageCount} 页，超过50页限制，部分数据将被忽略`,
        );
        return [{
          start: this.formatDateTime(start),
          end: this.formatDateTime(end),
          estimatedPages: 50
        }]; // 最多抓50页
      }

      // 拆分为两半
      const mid = new Date((start.getTime() + end.getTime()) / 2);

      const left = await this.splitRecursive(keyword, start, mid);
      const right = await this.splitRecursive(keyword, mid, end);

      return [...left, ...right];
    }

    // 3. 如果 = 0页，尝试扩大范围
    if (pageCount === 0) {
      const maxDuration = this.parseInterval('1w'); // 最大1周

      if (duration >= maxDuration) {
        // 1周都没数据，判定为无数据
        console.log(
          `[TimeRangeSplitter] 时间段 ${start.toISOString()} - ${end.toISOString()} 无数据，停止拆分`,
        );
        return [];
      }

      // 扩大时间范围（向后扩展）
      const newEnd = new Date(end.getTime() + duration);

      return await this.splitRecursive(keyword, start, newEnd);
    }

    // 4. 正常情况（1-49页）
    return [{
      start: this.formatDateTime(start),
      end: this.formatDateTime(end),
      estimatedPages: pageCount
    }];
  }

  /**
   * 计算时间段长度（毫秒）
   */
  private getDuration(start: Date, end: Date): number {
    return end.getTime() - start.getTime();
  }

  /**
   * 解析时间间隔为毫秒
   */
  private parseInterval(interval: string): number {
    const match = interval.match(/^(\d+)(h|d|w)$/);
    if (!match) return 60 * 60 * 1000; // 默认1小时

    const [, value, unit] = match;
    const num = parseInt(value);

    switch (unit) {
      case 'h':
        return num * 60 * 60 * 1000;
      case 'd':
        return num * 24 * 60 * 60 * 1000;
      case 'w':
        return num * 7 * 24 * 60 * 60 * 1000;
      default:
        return 60 * 60 * 1000;
    }
  }

  /**
   * 格式化日期时间: 2025-10-09-12
   */
  private formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours());
    return `${year}-${month}-${day}-${hour}`;
  }
}
```

#### PageCountTester - 页数测试服务 ⭐ 新增

```typescript
import { Injectable } from '@nestjs/common';
import { chromium, Browser, BrowserContext } from 'playwright';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeiboAccountEntity } from '../entities/weibo-account.entity';

@Injectable()
export class PageCountTester {
  constructor(
    @InjectRepository(WeiboAccountEntity)
    private readonly accountRepo: Repository<WeiboAccountEntity>,
  ) {}

  /**
   * 测试指定时间段的页数
   *
   * 实现方式：
   * 1. 快速访问第1页
   * 2. 解析分页信息（如: "共50页"）
   * 3. 如果没有分页信息，通过第1页的内容数量估算
   *
   * @param keyword 搜索关键词
   * @param start 起始时间
   * @param end 结束时间
   * @returns 页数（0表示无数据）
   */
  async test(keyword: string, start: Date, end: Date): Promise<number> {
    let browser: Browser | undefined;

    try {
      // 1. 获取账号Cookie
      const account = await this.getActiveAccount();

      // 2. 构建URL
      const url = this.buildUrl(keyword, start, end, 1);

      // 3. 启动浏览器
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      });

      await context.addCookies(account.cookies);

      const page = await context.newPage();

      // 4. 访问页面
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 15000,
      });

      await page.waitForTimeout(2000);

      // 5. 获取HTML
      const html = await page.content();

      // 6. 解析页数
      const pageCount = this.parsePageCount(html);

      return pageCount;

    } catch (error) {
      console.error(`[PageCountTester] 测试失败:`, error.message);
      return 10; // 默认估算10页
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * 获取活跃账号
   */
  private async getActiveAccount(): Promise<WeiboAccountEntity> {
    const account = await this.accountRepo.findOne({
      where: { status: 'active' },
      order: { usageCount: 'ASC' },
    });

    if (!account) {
      throw new Error('没有可用的微博账号');
    }

    return account;
  }

  /**
   * 构建搜索URL
   */
  private buildUrl(keyword: string, start: Date, end: Date, page: number): string {
    const startStr = this.formatDateTime(start);
    const endStr = this.formatDateTime(end);

    const params = new URLSearchParams({
      q: keyword,
      typeall: '1',
      suball: '1',
      timescope: `custom:${startStr}:${endStr}`,
      Refer: 'g',
      page: String(page),
    });

    return `https://s.weibo.com/weibo?${params.toString()}`;
  }

  /**
   * 格式化日期时间: 2025-10-09-12
   */
  private formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours());
    return `${year}-${month}-${day}-${hour}`;
  }

  /**
   * 解析HTML获取总页数
   */
  private parsePageCount(html: string): number {
    // 方法1: 查找 "共X页" 文本
    const match1 = html.match(/共(\d+)页/);
    if (match1) {
      return parseInt(match1[1]);
    }

    // 方法2: 查找分页按钮
    const match2 = html.match(/page=(\d+)/g);
    if (match2 && match2.length > 0) {
      const pages = match2.map(m => {
        const pageMatch = m.match(/page=(\d+)/);
        return pageMatch ? parseInt(pageMatch[1]) : 0;
      });
      return Math.max(...pages);
    }

    // 方法3: 通过内容数量估算
    const itemCount = (html.match(/class="card-wrap"/g) || []).length;

    if (itemCount === 0) {
      // 检查是否有"抱歉，未找到"等提示
      const noResultKeywords = ['抱歉,未找到', '没有找到相关结果', '未搜索到相关微博'];
      if (noResultKeywords.some(kw => html.includes(kw))) {
        return 0;
      }
      return 0; // 无数据
    }

    if (itemCount < 20) {
      return 1; // 少于20条，只有1页
    }

    // 默认估算10页
    return 10;
  }
}
```

#### ContinuousTaskGenerator - 持续监控任务生成器 ⭐ 完全重写

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { WeiboSearchTaskEntity } from '../entities/weibo-search-task.entity';
import { TimeRangeSplitter } from './time-range-splitter';
import { RabbitMQService } from './rabbitmq.service';

@Injectable()
export class ContinuousTaskGenerator {
  constructor(
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly taskRepo: Repository<WeiboSearchTaskEntity>,
    private readonly timeRangeSplitter: TimeRangeSplitter,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  /**
   * 每小时检查持续监控任务
   */
  @Cron(CronExpression.EVERY_HOUR)
  async generateTasks() {
    const tasks = await this.taskRepo.find({
      where: {
        enabled: true,
        nextRunAt: LessThanOrEqual(new Date()),
      },
    });

    for (const task of tasks) {
      await this.generateContinuousTask(task);
    }
  }

  /**
   * 生成持续监控任务
   */
  private async generateContinuousTask(task: WeiboSearchTaskEntity) {
    try {
      const now = new Date();
      const start = task.currentCrawlTime || task.startDate;
      const end = now;

      // 1. 智能拆分时间段
      const ranges = await this.timeRangeSplitter.split(
        task.keyword,
        start,
        end,
      );

      if (ranges.length === 0) {
        // 无数据，增加计数
        const newNoDataCount = task.noDataCount + 1;

        await this.taskRepo.update(task.id, {
          noDataCount: newNoDataCount,
        });

        // 如果连续N次无数据，暂停任务
        if (newNoDataCount >= task.noDataThreshold) {
          console.log(`[Task ${task.id}] 连续 ${task.noDataThreshold} 次无数据，暂停任务`);
          await this.taskRepo.update(task.id, {
            enabled: false,
            status: 'paused',
          });
        } else {
          // 更新下次执行时间，继续监控
          const nextRunAt = this.calculateNextRunTime(task.crawlInterval, now);
          await this.taskRepo.update(task.id, {
            nextRunAt,
          });
        }
      } else {
        // 有数据，重置计数
        await this.taskRepo.update(task.id, {
          noDataCount: 0,
        });

        // 2. 发送到消息队列
        for (const range of ranges) {
          await this.rabbitMQService.publish('weibo_crawl_queue', {
            taskId: task.id,
            keyword: task.keyword,
            timeRange: range,
            weiboAccountId: task.weiboAccountId,
            enableAccountRotation: task.enableAccountRotation,
          });
        }

        // 3. 更新游标和下次执行时间
        const nextRunAt = this.calculateNextRunTime(task.crawlInterval, now);

        await this.taskRepo.update(task.id, {
          currentCrawlTime: now,
          nextRunAt,
          status: 'running',
        });
      }

    } catch (error) {
      console.error(`[Task ${task.id}] 生成任务失败:`, error.message);
      await this.taskRepo.update(task.id, {
        errorMessage: error.message,
      });
    }
  }

  /**
   * 计算下次执行时间
   */
  private calculateNextRunTime(interval: string, now: Date): Date {
    const match = interval.match(/^(\d+)(h|m|d)$/);
    if (!match) {
      return new Date(now.getTime() + 60 * 60 * 1000); // 默认1小时
    }

    const [, value, unit] = match;
    const num = parseInt(value);

    switch (unit) {
      case 'h':
        return new Date(now.getTime() + num * 60 * 60 * 1000);
      case 'm':
        return new Date(now.getTime() + num * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + num * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 60 * 60 * 1000);
    }
  }

  /**
   * 解析时间间隔（用于日志）
   */
  private parseInterval(interval: string): number {
    const match = interval.match(/^(\d+)(h|m|d)$/);
    if (!match) return 60 * 60 * 1000;

    const [, value, unit] = match;
    const num = parseInt(value);

    switch (unit) {
      case 'h':
        return num * 60 * 60 * 1000;
      case 'm':
        return num * 60 * 1000;
      case 'd':
        return num * 24 * 60 * 60 * 1000;
      default:
        return 60 * 60 * 1000;
    }
  }
}
```

#### TaskMonitor - 任务状态监控器

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { WeiboSearchTaskEntity } from '../entities/weibo-search-task.entity';

@Injectable()
export class TaskMonitor {
  constructor(
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly taskRepo: Repository<WeiboSearchTaskEntity>,
  ) {}

  /**
   * 每5分钟检查任务状态
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorTasks() {
    await this.checkTimeoutTasks();
    await this.retryFailedTasks();
    await this.checkCompletedTasks();
  }

  /**
   * 检查超时任务
   */
  private async checkTimeoutTasks() {
    const timeoutThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30分钟

    const timeoutTasks = await this.taskRepo.find({
      where: {
        status: 'running',
        updatedAt: LessThan(timeoutThreshold),
      },
    });

    for (const task of timeoutTasks) {
      await this.taskRepo.update(task.id, {
        status: 'timeout',
        errorMessage: '任务执行超时 (30分钟)',
      });
    }
  }

  /**
   * 重试失败任务
   */
  private async retryFailedTasks() {
    const failedTasks = await this.taskRepo.find({
      where: {
        status: 'failed',
      },
    });

    for (const task of failedTasks) {
      if (task.retryCount < task.maxRetries) {
        await this.taskRepo.update(task.id, {
          status: 'pending',
          nextRunAt: new Date(),
          retryCount: task.retryCount + 1,
        });
      }
    }
  }

  /**
   * 检查已完成任务
   */
  private async checkCompletedTasks() {
    const runningTasks = await this.taskRepo.find({
      where: {
        status: 'running',
      },
    });

    for (const task of runningTasks) {
      // 如果进度已达到总段数,标记为完成
      if (task.progress >= task.totalSegments && task.totalSegments > 0) {
        await this.taskRepo.update(task.id, {
          status: 'completed',
        });
      }
    }
  }
}
```

### 6.2 @pro/crawler 模块

#### WeiboSearchCrawler - 爬虫执行器

```typescript
import { Injectable } from '@nestjs/common';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeiboAccountEntity } from '../entities/weibo-account.entity';
import { WeiboSearchTaskEntity } from '../entities/weibo-search-task.entity';
import { RawDataSourceService } from '@pro/mongodb';

export interface CrawlMessage {
  taskId: number;
  keyword: string;
  timeRange: {
    start: string; // '2025-10-01-0'
    end: string;   // '2025-10-02-23'
  };
  weiboAccountId?: number;
  enableAccountRotation: boolean;
}

@Injectable()
export class WeiboSearchCrawler {
  private browser?: Browser;
  private context?: BrowserContext;

  constructor(
    @InjectRepository(WeiboAccountEntity)
    private readonly accountRepo: Repository<WeiboAccountEntity>,
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly taskRepo: Repository<WeiboSearchTaskEntity>,
    private readonly rawDataSourceService: RawDataSourceService,
  ) {}

  /**
   * 执行抓取任务
   */
  async crawl(message: CrawlMessage): Promise<void> {
    const { taskId, keyword, timeRange, weiboAccountId, enableAccountRotation } = message;

    try {
      // 1. 获取账号Cookie
      const account = await this.getAccount(weiboAccountId, enableAccountRotation);

      // 2. 初始化浏览器
      await this.initBrowser(account.cookies);

      // 3. 估算页数 (实际抓取时可根据第一页判断)
      const estimatedPages = 50; // 默认最多抓50页

      // 4. 分页抓取
      let page = 1;
      let hasMore = true;

      while (page <= estimatedPages && hasMore) {
        const url = this.buildSearchUrl(keyword, timeRange, page);

        const html = await this.getPageHtml(url);

        // 存储到MongoDB
        await this.rawDataSourceService.create({
          sourceType: 'weibo_keyword_search',
          sourceUrl: url,
          rawContent: html,
          metadata: {
            keyword,
            taskId,
            page,
            timeRangeStart: timeRange.start,
            timeRangeEnd: timeRange.end,
            weiboAccountId: account.id,
            crawledAt: new Date().toISOString(),
          },
        });

        // 检查是否有更多结果 (简单判断: 如果HTML中包含"抱歉,未找到"等文本)
        hasMore = !this.isLastPage(html);

        page++;

        // 随机延迟 (反爬)
        await this.randomDelay(2000, 5000);
      }

      // 5. 更新任务进度
      await this.taskRepo.increment({ id: taskId }, 'progress', 1);

      // 6. 更新账号使用记录
      await this.accountRepo.update(account.id, {
        lastUsedAt: new Date(),
        usageCount: account.usageCount + 1,
      });

    } catch (error) {
      // 记录错误
      await this.taskRepo.update(taskId, {
        errorMessage: error.message,
      });
      throw error;
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * 获取账号 (支持轮换)
   */
  private async getAccount(
    accountId?: number,
    enableRotation: boolean = true,
  ): Promise<WeiboAccountEntity> {
    if (accountId) {
      const account = await this.accountRepo.findOne({ where: { id: accountId } });
      if (!account) throw new Error(`账号 ${accountId} 不存在`);
      return account;
    }

    if (enableRotation) {
      // 账号轮换: 选择最少使用的活跃账号
      const account = await this.accountRepo.findOne({
        where: { status: 'active' },
        order: { usageCount: 'ASC' },
      });
      if (!account) throw new Error('没有可用的微博账号');
      return account;
    }

    // 默认选择第一个活跃账号
    const account = await this.accountRepo.findOne({
      where: { status: 'active' },
    });
    if (!account) throw new Error('没有可用的微博账号');
    return account;
  }

  /**
   * 初始化浏览器
   */
  private async initBrowser(cookies: any[]): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    // 添加Cookie
    await this.context.addCookies(cookies);
  }

  /**
   * 获取页面HTML
   */
  private async getPageHtml(url: string): Promise<string> {
    const page = await this.context!.newPage();

    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // 等待内容加载
      await page.waitForTimeout(3000);

      // 获取完整HTML
      const html = await page.content();

      return html;

    } finally {
      await page.close();
    }
  }

  /**
   * 构建搜索URL
   */
  private buildSearchUrl(
    keyword: string,
    timeRange: { start: string; end: string },
    page: number,
  ): string {
    const params = new URLSearchParams({
      q: keyword,
      typeall: '1',
      suball: '1',
      timescope: `custom:${timeRange.start}:${timeRange.end}`,
      Refer: 'g',
      page: String(page),
    });

    return `https://s.weibo.com/weibo?${params.toString()}`;
  }

  /**
   * 判断是否为最后一页
   */
  private isLastPage(html: string): boolean {
    const keywords = [
      '抱歉,未找到',
      '没有找到相关结果',
      '未搜索到相关微博',
    ];

    return keywords.some(kw => html.includes(kw));
  }

  /**
   * 随机延迟
   */
  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 关闭浏览器
   */
  private async closeBrowser(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = undefined;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
  }
}
```

#### RabbitMQ 消息消费者

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { WeiboSearchCrawler, CrawlMessage } from './weibo-search-crawler';

@Injectable()
export class CrawlQueueConsumer implements OnModuleInit {
  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly crawler: WeiboSearchCrawler,
  ) {}

  async onModuleInit() {
    await this.rabbitMQService.consume('weibo_crawl_queue', async (message: CrawlMessage) => {
      await this.crawler.crawl(message);
    });
  }
}
```

### 6.3 @pro/api 模块

#### WeiboSearchTaskService - 任务管理服务

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeiboSearchTaskEntity } from '../entities/weibo-search-task.entity';

export interface CreateTaskDto {
  keyword: string;
  startDate: string;
  endDate: string;
  isIncremental?: boolean;
  interval?: string;
  weiboAccountId?: number;
  enableAccountRotation?: boolean;
}

@Injectable()
export class WeiboSearchTaskService {
  constructor(
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly taskRepo: Repository<WeiboSearchTaskEntity>,
  ) {}

  async create(dto: CreateTaskDto): Promise<WeiboSearchTaskEntity> {
    const task = this.taskRepo.create({
      ...dto,
      status: 'pending',
      enabled: true,
      nextRunAt: new Date(), // 立即执行
    });

    return await this.taskRepo.save(task);
  }

  async findAll(): Promise<WeiboSearchTaskEntity[]> {
    return await this.taskRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<WeiboSearchTaskEntity | null> {
    return await this.taskRepo.findOne({ where: { id } });
  }

  async update(id: number, updates: Partial<WeiboSearchTaskEntity>): Promise<void> {
    await this.taskRepo.update(id, updates);
  }

  async delete(id: number): Promise<void> {
    await this.taskRepo.delete(id);
  }

  async pause(id: number): Promise<void> {
    await this.taskRepo.update(id, {
      enabled: false,
      status: 'paused',
    });
  }

  async resume(id: number): Promise<void> {
    await this.taskRepo.update(id, {
      enabled: true,
      status: 'pending',
      nextRunAt: new Date(),
    });
  }
}
```

#### WeiboSearchTaskController - API接口

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { WeiboSearchTaskService, CreateTaskDto } from './weibo-search-task.service';

@Controller('weibo-search-tasks')
export class WeiboSearchTaskController {
  constructor(private readonly taskService: WeiboSearchTaskService) {}

  @Post()
  async create(@Body() dto: CreateTaskDto) {
    return await this.taskService.create(dto);
  }

  @Get()
  async findAll() {
    return await this.taskService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return await this.taskService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() updates: any) {
    await this.taskService.update(id, updates);
    return { success: true };
  }

  @Delete(':id')
  async delete(@Param('id') id: number) {
    await this.taskService.delete(id);
    return { success: true };
  }

  @Post(':id/pause')
  async pause(@Param('id') id: number) {
    await this.taskService.pause(id);
    return { success: true };
  }

  @Post(':id/resume')
  async resume(@Param('id') id: number) {
    await this.taskService.resume(id);
    return { success: true };
  }
}
```

---

## 七、管理界面设计

### 7.1 任务管理页面

**路由**: `/weibo-search-tasks`

**功能模块**:

1. **任务列表**
   - 表格展示所有任务
   - 支持筛选 (状态、关键词、日期范围)
   - 支持排序 (创建时间、更新时间)

2. **创建任务**
   - 关键词输入
   - 日期范围选择器
   - 增量配置 (开关、间隔)
   - 账号选择

3. **任务操作**
   - 暂停/恢复
   - 编辑
   - 删除
   - 查看详情

4. **状态监控**
   - 实时进度条 (progress / totalSegments)
   - 状态标签 (运行中、已完成、失败等)
   - 错误信息展示

### 7.2 数据查看页面

**路由**: `/raw-data-sources`

**功能**:
- 查询某关键词的原始HTML数据
- 支持按任务ID、时间范围筛选
- 预览HTML内容 (iframe)
- 下载原始HTML

---

## 八、API接口设计

### 8.1 任务管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/weibo-search-tasks` | 创建任务 |
| GET | `/api/weibo-search-tasks` | 获取任务列表 |
| GET | `/api/weibo-search-tasks/:id` | 获取任务详情 |
| PUT | `/api/weibo-search-tasks/:id` | 更新任务 |
| DELETE | `/api/weibo-search-tasks/:id` | 删除任务 |
| POST | `/api/weibo-search-tasks/:id/pause` | 暂停任务 |
| POST | `/api/weibo-search-tasks/:id/resume` | 恢复任务 |

### 8.2 原始数据查询接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/raw-data-sources?sourceType=weibo_keyword_search&keyword=xxx` | 查询原始数据 |
| GET | `/api/raw-data-sources/:id` | 获取单条数据 |

---

## 九、实施步骤

### 阶段1: 数据库准备 (无依赖,可并行)

**任务**:
- [ ] 在 PostgreSQL 中创建 `weibo_search_tasks` 表
- [ ] 验证 `weibo_accounts` 表已存在 ✅
- [ ] 验证 MongoDB 中的 `raw_data_sources` 集合已存在 ✅

**验证**:
```bash
# PostgreSQL
psql -U postgres -d your_database -c "\d weibo_search_tasks"

# MongoDB
docker exec -it mongodb mongosh --eval "db.raw_data_sources.findOne()"
```

**提交代码**: `git commit -m "feat(db): 创建微博搜索任务表"`

---

### 阶段2: @pro/api 模块 - 任务管理 (依赖阶段1)

**任务**:
- [ ] 创建 `WeiboSearchTaskEntity`
- [ ] 创建 `WeiboSearchTaskService`
- [ ] 创建 `WeiboSearchTaskController`
- [ ] 创建 DTO: `CreateTaskDto`, `UpdateTaskDto`
- [ ] 在 `AppModule` 中注册模块

**验证**:
```bash
# 测试创建任务
curl -X POST http://localhost:3000/api/weibo-search-tasks \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "测试关键词",
    "startDate": "2025-10-01",
    "endDate": "2025-10-31",
    "isIncremental": false
  }'
```

**提交代码**: `git commit -m "feat(api): 实现微博搜索任务管理接口"`

---

### 阶段3: @pro/broker 模块 - 时间拆分 (依赖阶段2,可与阶段4并行)

**任务**:
- [ ] 创建 `TimeRangeSplitter` 服务
- [ ] 编写单元测试验证拆分逻辑
- [ ] 创建 `TaskScannerScheduler`
- [ ] 集成 RabbitMQ (安装 `@nestjs/microservices`, `amqplib`)

**验证**:
```typescript
// 单元测试
const splitter = new TimeRangeSplitter();
const ranges = splitter.split('2025-10-01', '2025-10-03');
console.log(ranges);
// 输出:
// [
//   { start: '2025-10-01-0', end: '2025-10-01-23' },
//   { start: '2025-10-02-0', end: '2025-10-02-23' },
//   { start: '2025-10-03-0', end: '2025-10-03-23' },
// ]
```

**提交代码**: `git commit -m "feat(broker): 实现任务扫描和时间段拆分"`

---

### 阶段4: @pro/crawler 模块 - 爬虫基础 (依赖阶段1,可与阶段3并行)

**任务**:
- [ ] 安装 Playwright: `pnpm add playwright`
- [ ] 创建 `WeiboSearchCrawler` 服务
- [ ] 实现 `getAccount()` - 账号获取
- [ ] 实现 `initBrowser()` - 浏览器初始化
- [ ] 实现 `buildSearchUrl()` - URL构建

**验证**:
```typescript
// 测试URL构建
const url = crawler.buildSearchUrl('测试', { start: '2025-10-01-0', end: '2025-10-01-23' }, 1);
console.log(url);
// 输出: https://s.weibo.com/weibo?q=测试&...
```

**提交代码**: `git commit -m "feat(crawler): 实现爬虫基础功能"`

---

### 阶段5: @pro/crawler 模块 - 抓取与存储 (依赖阶段4)

**任务**:
- [ ] 实现 `getPageHtml()` - 页面抓取
- [ ] 集成 `@pro/mongodb` 的 `RawDataSourceService`
- [ ] 实现 `crawl()` 完整流程
- [ ] 创建 `CrawlQueueConsumer` 监听RabbitMQ

**验证**:
```bash
# 手动发送消息到RabbitMQ测试
# 然后检查MongoDB中是否有数据
docker exec -it mongodb mongosh --eval "db.raw_data_sources.find({ sourceType: 'weibo_keyword_search' }).pretty()"
```

**提交代码**: `git commit -m "feat(crawler): 实现完整抓取流程"`

---

### 阶段6: @pro/broker 模块 - 增量任务 (依赖阶段3、阶段5)

**任务**:
- [ ] 创建 `IncrementalTaskGenerator`
- [ ] 实现时间范围生成逻辑
- [ ] 集成到调度器

**验证**:
```bash
# 创建一个增量任务
curl -X POST http://localhost:3000/api/weibo-search-tasks \
  -d '{ "keyword": "测试", "startDate": "2025-10-01", "endDate": "2025-10-31", "isIncremental": true, "interval": "1h" }'

# 等待1小时后检查是否自动生成新任务
```

**提交代码**: `git commit -m "feat(broker): 实现增量任务生成"`

---

### 阶段7: @pro/broker 模块 - 任务监控 (依赖阶段6)

**任务**:
- [ ] 创建 `TaskMonitor`
- [ ] 实现超时检测
- [ ] 实现失败重试
- [ ] 实现完成状态检测

**验证**:
```bash
# 手动将某任务标记为30分钟前更新
# 等待5分钟后检查是否被标记为超时
```

**提交代码**: `git commit -m "feat(broker): 实现任务状态监控"`

---

### 阶段8: @pro/admin 前端界面 (依赖阶段2,可与其他阶段并行)

**任务**:
- [ ] 创建 `WeiboSearchTaskStore` (Akita)
- [ ] 创建 `WeiboSearchTaskService` (调用API)
- [ ] 创建任务列表页面
- [ ] 创建任务创建/编辑表单
- [ ] 实现状态监控视图

**验证**:
```bash
# 访问管理界面
http://localhost:4200/weibo-search-tasks
```

**提交代码**: `git commit -m "feat(admin): 实现微博搜索任务管理界面"`

---

## 十、部署配置

### 10.1 Docker 配置

**apps/api/Dockerfile**:
```dockerfile
FROM node:18-alpine

# 安装 Playwright 依赖
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .

RUN pnpm run build

CMD ["node", "dist/main"]
```

**apps/broker/Dockerfile**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .

RUN pnpm run build

CMD ["node", "dist/main"]
```

**apps/crawler/Dockerfile**:
```dockerfile
FROM node:18-alpine

# 安装 Playwright 依赖
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .

RUN pnpm run build

CMD ["node", "dist/main"]
```

### 10.2 docker-compose.yml

```yaml
services:
  api:
    build:
      context: ./apps/api
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - mongodb
    environment:
      DATABASE_URL: postgres://user:pass@postgres:5432/dbname
      MONGODB_URI: mongodb://mongodb:27017/dbname
      RABBITMQ_URL: amqp://rabbitmq:5672

  broker:
    build:
      context: ./apps/broker
    depends_on:
      - postgres
      - rabbitmq
    environment:
      DATABASE_URL: postgres://user:pass@postgres:5432/dbname
      RABBITMQ_URL: amqp://rabbitmq:5672

  crawler:
    build:
      context: ./apps/crawler
    depends_on:
      - mongodb
      - rabbitmq
    environment:
      DATABASE_URL: postgres://user:pass@postgres:5432/dbname
      MONGODB_URI: mongodb://mongodb:27017/dbname
      RABBITMQ_URL: amqp://rabbitmq:5672

  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data

  mongodb:
    image: mongo:7
    volumes:
      - mongodb_data:/data/db

  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"

volumes:
  postgres_data:
  mongodb_data:
```

### 10.3 启动命令

```bash
# 构建所有镜像
docker compose build

# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f broker
docker compose logs -f crawler

# 重启单个服务 (修改代码后)
docker compose build api && docker compose up -d api --build
docker compose build broker && docker compose up -d broker --build
docker compose build crawler && docker compose up -d crawler --build
```

---

## 十一、后续扩展方向

### 11.1 数据解析服务 (第二期)

创建独立的解析服务:

```typescript
@Injectable()
export class WeiboParserService {
  async parseHtml(rawData: RawDataSource): Promise<void> {
    const $ = cheerio.load(rawData.rawContent);

    const posts = [];

    $('.card-wrap').each((i, el) => {
      const post = {
        content: $(el).find('.txt').text(),
        author: $(el).find('.name').text(),
        publishTime: $(el).find('.time').text(),
        // ... 更多字段
      };
      posts.push(post);
    });

    // 存储到 parsed_weibo_posts 集合
    await this.parsedPostRepo.insertMany(posts);

    // 更新原始数据状态
    await this.rawDataSourceService.update(rawData._id, {
      status: 'completed',
      processedAt: new Date(),
    });
  }
}
```

### 11.2 数据分析服务 (第三期)

- 舆情趋势分析
- 关键词热度统计
- 用户画像分析
- 情感分析

### 11.3 告警通知 (第三期)

- 任务失败告警
- 账号异常告警
- 数据异常告警

### 11.4 性能优化 (第四期)

- 分布式爬虫 (多机部署)
- 代理IP池
- 浏览器实例复用
- 数据压缩存储

---

## 十二、注意事项

### 12.1 反爬策略

- ✅ 随机延迟 (2-5秒)
- ✅ 账号轮换
- ⚠️ User-Agent轮换 (可选)
- ⚠️ 代理IP (可选)

### 12.2 数据完整性

- ✅ 通过 `contentHash` 自动去重
- ✅ 任务失败自动重试 (最多3次)
- ✅ 任务超时检测 (30分钟)

### 12.3 监控指标

- 任务执行成功率
- 账号可用率
- 数据抓取速度 (页/分钟)
- 存储空间使用情况

---

## 十三、总结

### 核心优势

1. **架构完整**: 从任务管理到数据存储的完整闭环
2. **职责清晰**: API、Broker、Crawler 各司其职
3. **持续监控**: 任务永不结束，实时跟踪关键词动态
4. **智能拆分**: 自动适配数据量，解决50页限制问题
5. **数据存储简化**: 只存储原始HTML,解析逻辑独立

### 技术亮点 ⭐

1. **智能时间段拆分算法**:
   - 动态测试页数，自动拆分/扩大时间范围
   - 支持热点事件（>= 50页自动拆分）
   - 支持冷门关键词（0页自动扩大）
   - O(log N) 时间复杂度，高效精准

2. **持续监控模式**:
   - 只有开始时间，无结束时间
   - 使用游标（currentCrawlTime）记录抓取进度
   - 自动检测无数据，连续N次无数据后暂停
   - 每小时自动检查新数据

3. **@pro/broker 调度中心**: 定时扫描、智能拆分、持续生成、状态监控

4. **RabbitMQ 解耦**: 调度与执行分离,支持横向扩展

5. **账号轮换**: 降低单账号封禁风险

6. **自动去重**: 通过 `contentHash` 避免重复存储

### 实施原则

- ✅ 每个阶段完成后提交代码
- ✅ 修改源码后重启: `docker compose up -d xxx --build`
- ✅ 先完成依赖任务,再并行执行独立任务
- ✅ 使用已存在的 `weibo_accounts` 表
- ✅ 定时任务触发,无需手动调用API
