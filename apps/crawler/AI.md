# Pro Crawler 子系统分析文档

## 系统概述

`@pro/crawler` 是一个高度专业化的企业级网络爬虫微服务，专门用于微博等社交媒体平台的数据采集。该系统采用 NestJS 框架构建，集成了 Playwright 浏览器自动化、智能请求频率控制、账号轮换管理等先进技术，体现了现代爬虫系统的最佳实践。

### 核心定位
- **专业级数据采集**：针对微博等社交平台的深度数据采集
- **企业级可靠性**：具备完善的错误处理、监控和重试机制
- **智能反检测**：多层次反爬虫策略，模拟真实用户行为
- **分布式架构**：支持横向扩展和高可用部署

## 主要功能特性

### 1. 智能爬虫引擎
- **Playwright 浏览器自动化**：支持 Chromium 浏览器的完整自动化操作
- **智能页面解析**：集成 Cheerio 进行高效的 HTML 解析和数据提取
- **时间序列采集**：支持指定时间范围的精确数据采集
- **增量数据同步**：区分初始全量采集和增量更新采集

### 2. 账号管理系统
- **多账号池管理**：支持多个微博账号的统一管理和轮换
- **账号健康监控**：实时监控账号状态，自动识别和处理异常账号
- **Cookie 管理**：智能 Cookie 注入和生命周期管理
- **使用频率控制**：防止单个账号过度使用导致封禁

### 3. 反检测技术
- **浏览器指纹伪装**：随机 User-Agent、屏幕分辨率等浏览器特征
- **行为模拟**：模拟人类的页面操作和浏览习惯
- **请求频率控制**：自适应请求延迟，避免触发反爬机制
- **Robots.txt 遵守**：智能解析和遵守网站爬虫协议

### 4. 数据存储与处理
- **原始数据存储**：MongoDB 存储完整的页面 HTML 内容
- **内容去重机制**：基于 URL 和内容哈希的双重去重
- **元数据管理**：丰富的任务元信息和执行状态跟踪
- **消息队列集成**：RabbitMQ 异步数据流处理

## 技术架构分析

### 架构设计模式
- **微服务架构**：独立部署的服务单元，职责清晰
- **事件驱动**：基于消息队列的异步事件处理
- **依赖注入**：NestJS IoC 容器管理组件依赖
- **分层架构**：清晰的业务逻辑、数据访问和基础设施分层

### 核心技术栈
```
框架层:     NestJS 11.x
浏览器引擎:  Playwright 1.56.x
数据库:     PostgreSQL + MongoDB
消息队列:   RabbitMQ
HTTP客户端:  Axios
HTML解析:   Cheerio
日志系统:   Pino (自定义 @pro/logger)
```

### 数据流架构
```
[Broker Scheduler] → [RabbitMQ] → [CrawlQueueConsumer] → [WeiboSearchCrawlerService]
                                                              ↓
[Browser Service] ← [Account Service] ← [Request Monitor] ← [Robots Service]
                                                              ↓
[RawDataService] → [MongoDB] → [RabbitMQ: RAW_DATA_READY] → [Cleaner Service]
```

## 关键模块说明

### 1. BrowserService (`/src/browser/browser.service.ts`)
**职责**：浏览器实例和上下文的生命周期管理

**核心特性**：
- **浏览器实例管理**：支持 Chromium 的启动、配置和优雅关闭
- **上下文隔离**：每个账号独立的浏览器上下文，防止数据混淆
- **反检测注入**：自动注入反检测脚本，隐藏自动化特征
- **性能监控**：详细的性能指标收集和健康状态检查
- **资源管理**：智能的上下文创建、复用和清理策略

**技术亮点**：
- 支持多账号并发浏览，每个账号独立的 Cookie 和会话
- 内置性能监控，可追踪内存使用、上下文生命周期等指标
- 异常恢复机制，自动处理浏览器崩溃和连接断开

### 2. WeiboAccountService (`/src/weibo/account.service.ts`)
**职责**：微博账号池的统一管理和健康监控

**核心特性**：
- **多源账号加载**：支持数据库和环境变量两种账号配置方式
- **智能轮换算法**：基于使用频率和账号状态的智能轮换
- **健康状态检查**：多维度的账号健康评估和异常检测
- **使用统计追踪**：详细的使用模式分析和性能报告

**技术亮点**：
- 支持数据库和环境变量的 Fallback 机制
- 实时账号健康评分和使用平衡度分析
- 自动账号状态更新和异常账号标记

### 3. WeiboSearchCrawlerService (`/src/weibo/search-crawler.service.ts`)
**职责**：微博搜索爬取的核心业务逻辑实现

**核心特性**：
- **链路追踪**：完整的任务执行链路追踪和性能分析
- **智能分页**：自动检测页面结束，避免无限抓取
- **时间解析**：多种时间格式的智能解析和标准化
- **任务编排**：支持历史数据回溯和增量更新的自动编排

**技术亮点**：
- 实现了复杂的时间窗口爬取逻辑，支持历史数据回溯
- 集成多重监控和日志记录，便于问题排查和性能优化
- 支持任务状态的实时更新和下游系统的状态同步

### 4. RequestMonitorService (`/src/monitoring/request-monitor.service.ts`)
**职责**：请求频率控制和性能监控

**核心特性**：
- **自适应延迟**：基于响应时间和成功率的智能延迟调整
- **频率限制**：精确的请求频率控制和限流保护
- **性能基准**：实时性能评估和基准对比
- **趋势分析**：长期性能趋势分析和预警机制

**技术亮点**：
- 实现了业界领先的自适应延迟算法
- 提供详细的性能指标和健康状态评估
- 支持性能趋势分析和智能调优建议

### 5. RobotsService (`/src/robots/robots.service.ts`)
**职责**：Robots.txt 协议解析和遵守

**核心特性**：
- **协议解析**：完整的 Robots.txt 标准解析实现
- **缓存机制**：智能的协议内容缓存和更新策略
- **爬取延迟**：遵守网站指定的爬取延迟要求
- **路径匹配**：支持通配符和复杂路径规则匹配

**技术亮点**：
- 完整实现了 Robots.txt 标准，包括 Allow/Disallow 规则和 Crawl-delay
- 智能缓存机制减少网络请求，提升爬取效率
- 支持多 User-Agent 规则匹配和优先级处理

### 6. RawDataService (`/src/raw-data/raw-data.service.ts`)
**职责**：原始数据的存储、去重和分发

**核心特性**：
- **双重去重**：URL 和内容哈希的双重去重机制
- **元数据管理**：丰富的任务元信息和执行状态管理
- **事件发布**：自动发布数据就绪事件给下游系统
- **性能监控**：存储性能监控和健康状态检查

**技术亮点**：
- 高效的去重算法，避免数据重复存储
- 完整的 MongoDB 集成，支持复杂查询和聚合操作
- 异步事件发布，支持系统的松耦合架构

### 7. CrawlQueueConsumer (`/src/crawl-queue.consumer.ts`)
**职责**：消息队列消费和任务调度

**核心特性**：
- **消息验证**：完整的消息格式验证和数据清洗
- **重复检测**：防止重复任务的并发执行
- **错误分类**：智能的错误分类和处理策略
- **指标收集**：详细的任务执行指标和统计信息

**技术亮点**：
- 完善的消息验证机制，确保数据质量
- 支持任务的并发控制和去重处理
- 详细的执行指标收集，便于系统监控和优化

## API 接口和数据流

### 核心消息格式

#### SubTaskMessage（爬取子任务）
```typescript
interface SubTaskMessage {
  taskId: number;              // 主任务ID
  keyword: string;             // 搜索关键词
  start: Date;                 // 时间范围开始
  end: Date;                   // 时间范围结束
  isInitialCrawl: boolean;     // 是否初始全量爬取
  weiboAccountId?: number;     // 指定账号ID（可选）
  enableAccountRotation: boolean; // 是否启用账号轮换
}
```

#### CrawlResult（爬取结果）
```typescript
interface CrawlResult {
  success: boolean;            // 执行是否成功
  pageCount: number;           // 抓取页面数
  firstPostTime?: Date;        // 首条微博时间
  lastPostTime?: Date;         // 末条微博时间
  error?: string;              // 错误信息
}
```

#### RawDataReadyEvent（数据就绪事件）
```typescript
interface RawDataReadyEvent {
  rawDataId: string;           // 原始数据ID
  sourceType: SourceType;      // 数据源类型
  sourcePlatform: SourcePlatform; // 数据源平台
  sourceUrl: string;           // 原始URL
  contentHash: string;         // 内容哈希
  metadata: {                  // 元数据
    taskId?: number;
    keyword?: string;
    fileSize: number;
  };
  createdAt: string;           // 创建时间
}
```

### 数据流转过程

1. **任务调度**：Broker 服务发布爬取子任务到 RabbitMQ
2. **消息消费**：CrawlQueueConsumer 接收并验证任务消息
3. **账号分配**：WeiboAccountService 分配可用的微博账号
4. **浏览器准备**：BrowserService 创建隔离的浏览器上下文
5. **规则检查**：RobotsService 检查目标 URL 的爬取规则
6. **频率控制**：RequestMonitorService 确保请求频率合规
7. **页面抓取**：WeiboSearchCrawlerService 执行实际的页面抓取
8. **数据存储**：RawDataService 存储原始数据到 MongoDB
9. **事件发布**：发布数据就绪事件到下游处理系统
10. **状态更新**：更新任务执行状态和进度信息

## 与其他系统的关系

### 依赖的系统服务
- **@pro/entities**：数据库实体和 ORM 映射
- **@pro/types**：共享类型定义和接口规范
- **@pro/logger**：统一的日志记录服务
- **@pro/rabbitmq**：消息队列客户端封装
- **@pro/mongodb**：MongoDB 操作工具包
- **@pro/redis**：Redis 缓存操作（预留）
- **@pro/minio**：对象存储服务（预留）

### 上游系统
- **Broker Service**：任务调度和分发系统
  - 提供爬取任务的分解和调度逻辑
  - 监控任务执行状态和进度

### 下游系统
- **Cleaner Service**：数据清洗和处理系统
  - 消费 RAW_DATA_READY 事件
  - 对原始数据进行结构化处理和清洗

### 监控和管理系统
- **Admin Dashboard**：系统管理和监控界面
  - 提供爬虫系统的状态监控
  - 支持任务管理和账号管理

## 开发和部署要点

### 开发环境配置

#### 必需的环境变量
```bash
# 数据库配置
DATABASE_URL=postgresql://user:pass@localhost:5432/pro
MONGODB_URL=mongodb://localhost:27017/pro

# RabbitMQ 配置
RABBITMQ_URL=amqp://localhost:5672

# 微博账号配置（开发环境fallback）
WEIBO_ACCOUNTS=[{"id":1,"nickname":"测试账号","status":"active","cookies":[...]}]

# 爬虫配置
NODE_ENV=development
FORCE_HEADLESS=false
PORT=3000
```

#### 账号配置方式
1. **数据库配置**（推荐）：在 `weibo_accounts` 表中配置账号信息
2. **环境变量配置**：通过 `WEIBO_ACCOUNTS` 环境变量配置（开发环境备用）

### 性能调优建议

#### 浏览器优化
- 合理设置 `maxPages` 参数，避免单次任务抓取过多页面
- 启用资源拦截，阻止不必要的图片、CSS、字体文件加载
- 监控内存使用情况，定期重启浏览器实例释放内存

#### 频率控制优化
- 根据目标网站的响应特性调整 `requestDelay` 范围
- 启用自适应延迟功能，让系统根据实际情况动态调整
- 监控请求成功率，及时调整策略避免封禁

#### 数据存储优化
- 确保 MongoDB 的索引优化，特别是 `sourceUrl` 和 `contentHash` 字段
- 定期清理历史数据，避免存储空间无限增长
- 监控存储性能，适时进行分片或归档

### 部署注意事项

#### Docker 部署
```dockerfile
# 需要安装 Chromium 浏览器依赖
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list \
    && apt-get update && apt-get install -y google-chrome-stable
```

#### 监控指标
- **任务执行指标**：成功率、平均执行时间、页面抓取数量
- **账号健康指标**：可用账号数量、账号使用分布、异常账号比例
- **性能指标**：请求频率、响应时间、错误率、内存使用
- **存储指标**：数据存储量、去重率、存储性能

#### 告警配置
- 任务失败率超过 10%
- 可用账号数量少于 3 个
- 平均响应时间超过 30 秒
- 存储错误率超过 5%
- 内存使用率超过 80%

### 扩展性考虑

#### 水平扩展
- 支持多实例部署，通过 RabbitMQ 负载均衡
- 账号池共享，避免实例间的账号冲突
- 分布式去重机制，确保数据一致性

#### 功能扩展
- 支持更多社交媒体平台（抖音、小红书等）
- 支持更多数据类型（图片、视频等）
- 支持更复杂的反检测策略

## 系统优势和亮点

### 技术优势
1. **企业级可靠性**：完善的错误处理、重试机制和监控体系
2. **智能反检测**：多层次的反爬虫策略，成功率行业领先
3. **高性能架构**：异步处理、智能缓存、资源复用等优化策略
4. **可扩展设计**：模块化架构，支持水平扩展和功能扩展

### 业务优势
1. **数据质量保证**：完整的原始数据保存，确保数据完整性
2. **合规性考虑**：遵守 Robots.txt 协议，支持请求频率控制
3. **运维友好**：详细的日志记录和监控指标，便于问题排查
4. **成本控制**：智能的资源管理和账号轮换，降低运营成本

### 创新特性
1. **自适应延迟算法**：基于实时反馈的智能请求频率调整
2. **链路追踪系统**：完整的任务执行过程追踪和性能分析
3. **多维度账号健康管理**：智能的账号状态评估和使用策略
4. **事件驱动架构**：松耦合的系统设计，支持复杂的业务流程编排

这个爬虫系统代表了现代数据采集技术的最佳实践，在保证数据采集效率的同时，充分考虑了合规性、可靠性和可维护性的要求。系统的模块化设计和丰富的监控功能使其能够适应各种复杂的业务场景和部署环境。