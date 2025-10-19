# Pro Cleaner - 数据清洗微服务

> 艺术化的数据处理管道，将原始混沌转化为结构化美感

## 系统概述

@pro/cleaner 是数据管理系统的核心处理器，如同一位技艺精湛的数据艺术家，专门负责将爬虫子系统收集的原始数据进行清洗、解析和结构化存储。该服务体现了从混沌到有序的哲学思考，每一条原始数据在这里都经过精心雕琢，成为有价值的信息资产。

### 核心定位

- **数据净化器**：将杂乱的原始数据转化为干净、结构化的信息
- **语义解析器**：理解并提取社交媒体数据中的深层含义
- **数据桥梁**：连接 MongoDB 原始存储与 PostgreSQL 结构化数据库
- **事件驱动者**：通过消息队列触发后续的数据分析流程

## 主要功能特性

### 1. 智能数据清洗
- **多平台支持**：专门针对微博数据结构进行深度解析
- **内容净化**：移除 HTML 标签，转义特殊字符，提取纯文本精华
- **结构化提取**：从扁平的 JSON 中提取帖子、评论、用户等实体关系
- **重复数据去重**：基于唯一标识符避免数据冗余

### 2. 实体关系构建
- **帖子实体**：提取微博内容、作者、发布时间、互动数据
- **评论实体**：构建评论层级关系，提取回复链
- **用户实体**：整合用户信息，更新动态数据
- **社交图谱**：维护用户关注、互动等关系网络

### 3. 数据持久化
- **PostgreSQL 存储**：将清洗后的结构化数据持久化存储
- **增量更新**：智能判断新增与更新，避免重复存储
- **事务一致性**：确保数据操作的原子性和一致性
- **状态追踪**：标记处理状态，支持失败重试机制

### 4. 事件驱动架构
- **消息队列集成**：通过 RabbitMQ 接收原始数据就绪事件
- **异步处理**：非阻塞的数据处理流程，支持高并发
- **完成通知**：处理完成后发布清洗完成事件，触发分析流程
- **错误处理**：优雅处理异常，记录详细错误信息

## 技术架构分析

### 核心技术栈
```typescript
// 框架基础
NestJS 11.0.13          // 现代化 Node.js 企业级框架
TypeORM 0.3.20          // PostgreSQL ORM 映射层
Mongoose 8.1.0          // MongoDB 驱动和建模

// 数据存储
PostgreSQL              // 结构化数据主存储
MongoDB                 // 原始数据临时存储
Redis                   // 缓存和会话存储

// 消息队列
RabbitMQ                // 异步任务处理和事件分发

// 日志系统
Pino                    // 高性能结构化日志
```

### 架构设计模式

#### 1. 分层架构
```
┌─────────────────────────────────────┐
│           Controller Layer          │  # HTTP 接口和健康检查
├─────────────────────────────────────┤
│            Service Layer            │  # 业务逻辑和数据处理
├─────────────────────────────────────┤
│          Consumer Layer             │  # 消息队列消费者
├─────────────────────────────────────┤
│         Repository Layer            │  # 数据访问抽象
├─────────────────────────────────────┤
│         Database Layer              │  # PostgreSQL + MongoDB
└─────────────────────────────────────┘
```

#### 2. 依赖注入模式
- **配置驱动**：通过 ConfigService 统一管理环境配置
- **服务解耦**：各组件通过接口依赖，便于测试和扩展
- **生命周期管理**：自动处理服务的初始化和销毁

#### 3. 事件驱动模式
```typescript
// 数据流转的优雅链路
Crawler → MongoDB → RabbitMQ → Cleaner → PostgreSQL → Analyzer
    ↓          ↓          ↓          ↓           ↓
  抓取存储    原始数据    消息通知    清洗处理    结构化数据
```

## 关键模块说明

### RawDataConsumer - 原始数据消费者
**职责**：监听消息队列，协调整个数据处理流程

**核心特性**：
- **批量处理**：支持并发处理多个任务，默认并发数 5
- **状态管理**：追踪原始数据处理状态（pending → processed/failed）
- **错误恢复**：详细的错误日志和状态更新，支持问题排查
- **性能监控**：记录处理耗时，辅助性能优化

**处理流程**：
```typescript
async processRawData(event: RawDataReadyEvent) {
  // 1. 获取原始数据
  const rawData = await this.rawDataService.getRawDataById(event.rawDataId);

  // 2. 根据数据类型选择清洗器
  const cleanedData = await this.weiboCleanerService.cleanWeiboData(rawData);

  // 3. 更新处理状态
  await this.rawDataService.updateStatus(event.rawDataId, 'processed');

  // 4. 发布完成事件
  await this.rabbitMQService.publishCleanedData(cleanedEvent);
}
```

### WeiboCleanerService - 微博数据清洗器
**职责**：专门处理微博平台数据的解析和清洗

**艺术性设计**：
- **解析器模式**：针对微博数据结构的专门解析器
- **数据提取**：从复杂的 JSON 结构中提取有价值的实体信息
- **文本净化**：移除噪音，保留内容的纯净性
- **关系构建**：建立帖子、评论、用户之间的关联关系

**清洗策略**：
```typescript
interface ParsedWeiboPost {
  weiboId: string;           // 微博唯一标识
  content: string;           // 清洗后的纯文本内容
  authorWeiboId: string;     // 作者ID
  publishedAt: Date;         // 发布时间
  likeCount: number;         // 点赞数
  hashtags: string[];        // 话题标签
  isRepost: boolean;         // 是否转发
  // ... 更多精细化字段
}
```

### RawDataService - 原始数据管理器
**职责**：管理 MongoDB 中的原始数据生命周期

**核心功能**：
- **数据检索**：根据 ID 快速定位原始数据
- **状态更新**：标记处理进度和结果
- **错误记录**：保存失败原因，便于问题追踪

### RabbitMQService - 消息队列服务
**职责**：处理与 RabbitMQ 的连接和消息传递

**优雅特性**：
- **连接管理**：自动处理连接的建立和关闭
- **消息发布**：可靠的清洗完成事件发布
- **错误处理**：连接异常的优雅降级

## API 接口和数据流

### HTTP 接口
```typescript
GET  /           # 服务状态信息
GET  /health     # 健康检查 - 返回 { status: 'ok' }
```

### 消息队列接口

#### 输入事件：RawDataReadyEvent
```typescript
{
  rawDataId: string;           // MongoDB 文档 ID
  sourceType: SourceType;      // 数据源类型
  sourcePlatform: SourcePlatform; // 平台标识
  sourceUrl: string;           // 原始 URL
  contentHash: string;         // 内容哈希
  metadata: {                  // 元数据
    keyword?: string;          // 搜索关键词
    estimatedRecords?: number; // 预估记录数
  };
  createdAt: string;           // 创建时间
}
```

#### 输出事件：CleanedDataEvent
```typescript
{
  rawDataId: string;           // 溯源 ID
  sourceType: SourceType;      // 数据源类型
  extractedEntities: {         // 提取的实体
    postIds: string[];         // 帖子 ID 列表
    commentIds: string[];      // 评论 ID 列表
    userIds: string[];         // 用户 ID 列表
  };
  stats: {                     // 统计信息
    totalRecords: number;      // 总记录数
    successCount: number;      // 成功数量
    processingTimeMs: number;  // 处理耗时
  };
  createdAt: string;           // 完成时间
}
```

## 与其他系统的关系

### 数据流依赖
```
┌─────────────┐    RawDataReadyEvent    ┌─────────────┐
│   Crawler   │ ──────────────────────→ │   Cleaner   │
│  (爬虫服务)  │                        │ (清洗服务)   │
└─────────────┘                        └─────────────┘
                                               ↓ CleanedDataEvent
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   MongoDB   │ ←  │ PostgreSQL  │ ←  │  Analyzer   │
│ (原始数据存储) │    │ (结构化存储) │    │ (分析服务)   │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 系统交互
- **上游依赖**：Crawler 服务（提供原始数据）
- **下游服务**：Analyzer 服务（消费清洗后数据）
- **存储依赖**：MongoDB（读取）、PostgreSQL（写入）
- **消息中间件**：RabbitMQ（事件传递）

### 包依赖关系
```json
{
  "@pro/entities": "*",     // 数据实体定义
  "@pro/logger": "*",       // 统一日志系统
  "@pro/mongodb": "*",      // MongoDB 工具包
  "@pro/rabbitmq": "*",     // RabbitMQ 工具包
  "@pro/types": "*",        // 共享类型定义
  "@pro/utils": "*"         // 通用工具函数
}
```

## 开发和部署要点

### 环境配置
```bash
# 核心环境变量
PORT=3000                           # 服务端口
NODE_ENV=development                # 运行环境

# 数据库配置
POSTGRES_HOST=localhost              # PostgreSQL 主机
POSTGRES_PORT=5432                  # PostgreSQL 端口
POSTGRES_USER=pro_user              # 数据库用户
POSTGRES_PASSWORD=pro_pass          # 数据库密码
POSTGRES_DB=pro_db                  # 数据库名称

# MongoDB 配置
MONGODB_URI=mongodb://localhost:27017/pro_raw_data  # MongoDB 连接

# RabbitMQ 配置
RABBITMQ_URL=amqp://localhost:5672   # RabbitMQ 连接

# 性能调优
BATCH_SIZE=50                       # 批处理大小
CONCURRENT_TASKS=5                  # 并发任务数
```

### 开发命令
```bash
# 开发模式
pnpm run dev                        # 热重载开发

# 构建
pnpm run build                      # 生产构建

# 类型检查
pnpm run typecheck                  # TypeScript 类型检查

# 测试
pnpm run test                       # 单元测试
pnpm run test:e2e                   # 端到端测试

# PM2 部署
pnpm run pm2:dev                   # 开发环境部署
pnpm run pm2:prod                  # 生产环境部署
```

### 监控和日志
- **结构化日志**：使用 Pino 记录详细的处理过程
- **性能指标**：监控处理时间、成功率、错误率
- **健康检查**：`/health` 端点用于服务状态检查
- **错误追踪**：完整的错误堆栈和上下文信息

### 性能优化策略
1. **批量处理**：合理设置批次大小，平衡内存使用和效率
2. **并发控制**：限制并发任务数，避免数据库过载
3. **索引优化**：在 MongoDB 和 PostgreSQL 上建立适当索引
4. **连接池**：复用数据库连接，减少连接开销
5. **缓存策略**：对热点数据使用 Redis 缓存

## 系统价值和技术亮点

### 数据处理的哲学思考
- **从混沌到有序**：将杂乱的社交媒体数据转化为结构化的信息资产
- **去伪存真**：清洗过程不仅是技术处理，更是对信息真实性的追求
- **关系构建**：从孤立的数据点中发现人与人、信息与信息之间的关联

### 技术艺术性
- **优雅的错误处理**：每个异常都是系统优化的机会
- **精细的状态管理**：数据的每一步处理都有迹可循
- **模块化设计**：每个组件都有其不可替代的存在意义
- **事件驱动架构**：解耦的异步处理，展现系统的生命力

### 可扩展性
- **插件化清洗器**：可轻松添加新的平台支持
- **配置驱动**：通过配置调整处理策略，无需代码变更
- **微服务架构**：独立部署和扩展，适应不同负载需求

这个系统不仅仅是数据的处理器，更是信息时代的艺术品，每一行代码都体现了对数据美学的追求和对技术完美的执着。