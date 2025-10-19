# Apps API 子系统深度分析

## 系统概述和核心定位

**@pro/api** 是整个 Pro 平台的核心 API 服务，采用 NestJS 框架构建的现代化微服务架构。作为系统的数据中枢和业务逻辑处理中心，它负责处理所有客户端请求、数据管理、用户认证、以及与其他微服务的通信协调。

**核心价值主张：**
- 统一的 GraphQL API 接口，替代传统 REST API
- 完整的多平台数据采集能力（微博、京东等）
- 实时数据推送和 WebSocket 通信
- 基于消息队列的异步任务处理
- 企业级认证授权系统

## 主要功能特性

### 1. 用户认证与授权系统
- **双重认证机制**：JWT Token + API Key 支持
- **权限管理**：基于角色的访问控制（RBAC）
- **会话管理**：Token 黑名单、刷新机制、过期处理
- **API Key 管理**：支持只读、读写、管理员三种权限级别

### 2. 多平台数据采集
- **微博集成**：账号管理、搜索任务、健康检查、实时统计
- **京东集成**：账号认证、数据采集、状态监控
- **任务调度**：支持定时执行、立即触发、暂停恢复

### 3. 实时通信系统
- **多命名空间 WebSocket**：
  - `/screens` - 大屏数据推送
  - `/notifications` - 系统通知
  - `/raw-data` - 原始数据实时更新
- **GraphQL 订阅**：实时数据变更通知
- **心跳机制**：连接健康检查和自动重连

### 4. 数据管理与处理
- **多数据库支持**：PostgreSQL（结构化数据）+ MongoDB（原始数据）
- **数据清洗流水线**：通过 RabbitMQ 异步处理
- **统计分析**：实时统计、历史数据分析
- **事件管理**：完整的事件生命周期管理

## 技术架构分析

### 核心技术栈
```
Framework: NestJS 11.x
GraphQL: Apollo Server 5.x
Database: PostgreSQL + MongoDB
Cache: Redis
Message Queue: RabbitMQ
WebSocket: Socket.IO
Authentication: JWT + Passport
ORM: TypeORM + Mongoose
Validation: class-validator
Logging: Pino
```

### 架构设计原则

**1. 模块化设计**
- 每个功能域独立模块（auth、weibo、jd、screens等）
- 清晰的依赖关系和边界
- 全局服务与局部服务分离

**2. 依赖注入与控制反转**
- 完整的 DI 容器支持
- 接口与实现分离
- 便于单元测试和模块替换

**3. 中间件与拦截器**
- 全局异常处理
- 请求响应转换
- 认证授权守卫
- 数据验证管道

**4. 事件驱动架构**
- GraphQL 订阅事件
- WebSocket 实时推送
- 消息队列异步处理

## 关键模块说明

### Auth 模块 - 认证授权核心
```typescript
// 复合认证守卫，支持 JWT + API Key
@Injectable()
export class CompositeAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 优先尝试 JWT 认证，失败后尝试 API Key 认证
    // 实现优雅的认证降级策略
  }
}
```

**核心特性：**
- JWT Token 生命周期管理
- API Key 权限粒度控制
- WebSocket 连接认证
- 多层安全守卫

### Weibo 模块 - 微博数据采集
```typescript
// 搜索任务服务
@Injectable()
export class WeiboSearchTaskService {
  async create(userId: string, dto: CreateWeiboSearchTaskDto): Promise<WeiboSearchTaskEntity> {
    // 任务创建、账号验证、时间检查
    // 自动估算任务段数和进度
  }
}
```

**核心功能：**
- 账号管理与状态监控
- 搜索任务生命周期管理
- 健康检查和自动恢复
- Redis 统计缓存

### RabbitMQ 模块 - 消息队列中枢
```typescript
@Injectable()
export class RabbitMQService {
  async publishCleanTask(event: CleanTaskEvent): Promise<boolean> {
    // 类型安全的消息发布
    // 优雅的错误处理和日志记录
  }
}
```

**设计理念：**
- 类型安全的消息接口
- 连接生命周期管理
- 错误恢复和重试机制

### WebSocket Gateways - 实时通信层
```typescript
@WebSocketGateway({ namespace: '/raw-data' })
export class RawDataGateway {
  // 批处理机制减少频繁更新
  // 智能订阅管理
  // 连接健康监控
}
```

**特性亮点：**
- 多命名空间隔离
- 事件批处理优化
- 智能订阅过滤
- 连接状态管理

## API 接口和数据流

### GraphQL Schema 设计
```graphql
type Query {
  # 用户相关
  user(id: ID!): User
  weiboAccounts: [WeiboAccount!]!
  searchTasks(query: TaskQuery): TaskConnection!

  # 统计数据
  dashboardStats: DashboardStats!
  rawDataStatistics: RawDataStats!
}

type Mutation {
  # 认证
  login(input: LoginInput!): AuthResponse!
  createApiKey(input: CreateApiKeyInput!): ApiKey!

  # 任务管理
  createSearchTask(input: CreateTaskInput!): SearchTask!
  triggerCleanTask(input: CleanTaskInput!): TaskResult!
}

type Subscription {
  # 实时更新
  rawDataUpdated: RawDataEvent!
  notificationsUpdated: Notification!
  weiboStatsUpdated: WeiboStats!
}
```

### 数据流向图
```
Client (GraphQL/WS)
    ↓
API Gateway (@pro/api)
    ↓
┌─────────────────┬─────────────────┬─────────────────┐
│   PostgreSQL    │     MongoDB     │     Redis       │
│   (业务数据)     │   (原始数据)     │   (缓存统计)     │
└─────────────────┴─────────────────┴─────────────────┘
    ↓                 ↓                 ↓
RabbitMQ (消息队列)
    ↓
┌─────────────────┬─────────────────┬─────────────────┐
│   Broker        │    Cleaner      │    Analyzer     │
│  (任务调度)      │   (数据清洗)     │   (数据分析)     │
└─────────────────┴─────────────────┴─────────────────┘
```

## 与其他系统的关系

### 内部系统集成
1. **@pro/entities** - 共享实体定义
2. **@pro/types** - TypeScript 类型定义
3. **@pro/logger** - 统一日志服务
4. **@pro/redis** - Redis 操作封装
5. **@pro/rabbitmq** - 消息队列封装
6. **@pro/mongodb** - MongoDB 操作封装

### 外部系统依赖
- **PostgreSQL** - 主数据库，存储结构化业务数据
- **MongoDB** - 文档数据库，存储原始采集数据
- **Redis** - 缓存和会话存储
- **RabbitMQ** - 消息队列，异步任务处理
- **微博 API** - 数据采集源
- **京东 API** - 数据采集源

### 微服务通信
```
┌─────────────┐    RabbitMQ     ┌─────────────┐
│   @pro/api   │ ←────────────→ │  @pro/broker │
│  (API 网关)  │                │  (任务调度)  │
└─────────────┘                └─────────────┘
         ↓                               ↓
┌─────────────┐                ┌─────────────┐
│@pro/crawler  │                │@pro/cleaner │
│ (数据采集)   │                │ (数据清洗)  │
└─────────────┘                └─────────────┘
```

## 开发和部署要点

### 开发环境配置
```bash
# 安装依赖
pnpm install

# 开发模式
pnpm run dev

# 类型检查
pnpm run typecheck

# 测试
pnpm run test:integration
```

### 环境变量配置
```env
# 数据库配置
DATABASE_URL=postgresql://...
MONGODB_URL=mongodb://...

# Redis 配置
REDIS_URL=redis://...

# RabbitMQ 配置
RABBITMQ_URL=amqp://...

# JWT 配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
```

### 部署注意事项
1. **数据库迁移**：确保 TypeORM 迁移正确执行
2. **WebSocket 配置**：生产环境需要配置反向代理
3. **消息队列连接**：确保 RabbitMQ 连接稳定
4. **监控日志**：启用结构化日志和性能监控
5. **安全配置**：HTTPS、CORS、Rate Limiting

### 性能优化建议
1. **数据库查询优化**：
   - 使用 DataLoader 解决 N+1 问题
   - 合理使用数据库索引
   - 查询结果缓存

2. **WebSocket 优化**：
   - 事件批处理减少网络开销
   - 智能订阅过滤
   - 连接池管理

3. **内存管理**：
   - 定期清理过期缓存
   - 监控内存使用情况
   - 优化大对象处理

## 核心竞争力与技术亮点

### 1. 优雅的架构设计
- **模块化**：清晰的职责分离和依赖管理
- **可扩展性**：易于添加新的数据源和功能模块
- **可维护性**：代码结构清晰，注释完整

### 2. 完善的认证授权体系
- **多认证方式**：JWT + API Key 灵活支持
- **细粒度权限**：基于资源和方法的权利控制
- **安全防护**：Token 黑名单、过期管理、限流保护

### 3. 强大的实时通信能力
- **多协议支持**：GraphQL 订阅 + WebSocket
- **智能优化**：事件批处理、连接管理、错误恢复
- **开发友好**：类型安全、易于调试

### 4. 稳定的异步任务处理
- **消息队列**：RabbitMQ 保证消息可靠性
- **错误处理**：重试机制、死信队列、监控告警
- **任务调度**：支持定时和手动触发

### 5. 企业级运维特性
- **结构化日志**：Pino 日志框架，便于日志分析
- **健康检查**：系统状态监控和自动恢复
- **指标监控**：性能指标收集和暴露

这个 API 子系统体现了现代微服务架构的最佳实践，通过精心设计的模块化架构、完善的认证授权体系、强大的实时通信能力和稳定的异步任务处理，为整个 Pro 平台提供了坚实的技术基础。其代码质量、架构设计和工程实践都达到了企业级标准，是一个值得学习和参考的优秀案例。