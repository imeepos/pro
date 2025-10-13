# Pro Monorepo

一个基于微服务架构的数据采集与处理平台，专注于社交媒体和电商平台的数据爬取、清洗和分析。

## 🏗️ 项目架构

### 技术栈
- **包管理**: pnpm (快速的、节省磁盘空间的包管理器)
- **构建工具**: Turbo (高性能构建系统)
- **后端框架**: NestJS (可扩展的Node.js框架)
- **前端框架**: Angular 20 (现代化的前端框架)
- **数据库**: PostgreSQL + MongoDB + Redis
- **消息队列**: RabbitMQ
- **对象存储**: MinIO
- **浏览器自动化**: Playwright
- **容器化**: Docker

### 架构模式
```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Admin         │
│   (Angular)     │    │   (Angular)     │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────┬───────────────┘
                 │
┌─────────────────▼─────────────────┐
│           API Gateway            │
│          (NestJS API)            │
└─────────────────┬─────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼────┐  ┌───▼────┐  ┌───▼────┐
│ Broker │  │Crawler │  │Cleaner │
│(调度器) │  │(爬虫)  │  │(清洗器)│
└────────┘  └────────┘  └────────┘
    │            │            │
    └────────────┼────────────┘
                 │
    ┌────────────▼────────────┐
    │     消息队列 & 存储      │
    │ RabbitMQ + PostgreSQL   │
    │  + MongoDB + Redis      │
    └─────────────────────────┘
```

## 📁 项目结构

### Apps 目录 - 应用服务

#### 🔧 `admin` (端口: 4201)
**管理后台系统**
- **技术栈**: Angular 20, Flowbite UI, TailwindCSS
- **功能**: 系统管理、任务监控、数据可视化
- **特性**:
  - 响应式仪表板 (angular-gridster2)
  - 地图集成 (高德地图)
  - 实时数据展示 (Socket.IO)
  - 本地数据存储 (Dexie)

#### 🌐 `api` (主API服务)
**核心API网关**
- **技术栈**: NestJS, TypeORM, PostgreSQL
- **功能**: 用户认证、数据API、实时通信
- **模块**:
  - 认证授权 (JWT, Passport)
  - 用户管理
  - 微博数据API
  - 京东数据API
  - 媒体类型管理
  - 实时事件推送
  - 仪表板数据聚合

#### ⚡ `broker` (任务调度中心)
**智能任务分发器**
- **技术栈**: NestJS, TypeORM, 定时任务
- **功能**: 主任务扫描、子任务生成、负载均衡
- **职责**:
  - 扫描微博搜索任务
  - 生成爬取子任务
  - 监控任务执行状态
  - 任务重试与失败处理

#### 🧹 `cleaner` (数据清洗服务)
**数据处理引擎**
- **技术栈**: NestJS, MongoDB, 消息队列
- **功能**: 原始数据清洗、结构化处理、质量检查
- **处理流程**:
  - 接收原始爬取数据
  - 数据去重与验证
  - 内容提取与标准化
  - 存储到结构化数据库

#### 🕷️ `crawler` (爬虫服务)
**智能网页爬取器**
- **技术栈**: NestJS, Playwright, MongoDB
- **功能**: 多平台数据爬取、反爬突破、数据存储
- **支持平台**:
  - 微博搜索与用户数据
  - 京东商品信息
- **特性**:
  - 浏览器自动化 (Playwright)
  - 账号池管理
  - 请求监控与限流
  - robots.txt 遵循
  - 原始数据备份

#### 🌟 `web` (前端展示)
**公共展示界面**
- **技术栈**: Angular 20, TailwindCSS
- **功能**: 数据展示、用户交互、实时更新
- **特性**:
  - 状态管理 (Akita)
  - JWT认证
  - Socket.IO实时通信

### Packages 目录 - 共享包

#### 🏗️ 基础设施层

##### `@pro/types` - 类型定义基石
- **纯TypeScript类型库**
- **零依赖设计**
- **全项目类型统一**

##### `@pro/entities` - 数据模型层
- **TypeORM实体定义**
- **数据库映射**
- **关系配置**

##### `@pro/utils` - 工具函数库
- **通用工具函数**
- **JWT处理工具**
- **类型安全的工具集**

#### 🎨 用户界面层

##### `@pro/components` - 共享UI组件
- **Angular组件库**
- **可复用UI元素**
- **统一设计语言**

##### `@pro/sdk` - API接口定义
- **前端API接口**
- **RxJS响应式编程**
- **类型安全的API调用**

#### 🔧 服务层

##### `@pro/logger` - 统一日志系统
- **基于Pino的高性能日志**
- **结构化日志输出**
- **NestJS集成**

#### 💾 数据存储层

##### `@pro/mongodb` - MongoDB操作
- **原始数据存储**
- **Mongoose ODM**
- **爬虫数据专用**

##### `@pro/redis` - 缓存操作
- **高性能缓存**
- **IORedis客户端**
- **会话存储**

##### `@pro/rabbitmq` - 消息队列
- **异步任务处理**
- **服务间通信**
- **AMQP协议**

##### `@pro/minio` - 对象存储
- **文件存储服务**
- **S3兼容API**
- **媒体文件管理**

## 🔄 数据流架构

### 任务调度流程
```
1. Broker 扫描主任务 (定时)
2. 生成子任务并推送到 RabbitMQ
3. Crawler 消费任务进行爬取
4. 原始数据存储到 MongoDB
5. Cleaner 处理原始数据
6. 清洗后数据存储到 PostgreSQL
7. API 提供数据访问接口
8. Frontend 展示处理结果
```

### 存储策略
- **PostgreSQL**: 结构化业务数据
- **MongoDB**: 原始爬取数据
- **Redis**: 缓存与会话
- **MinIO**: 文件与媒体资源

## 🚀 开发指南

### 环境要求
- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker & Docker Compose
- PostgreSQL 14+
- MongoDB 6+
- Redis 7+
- RabbitMQ 3.12+

### 快速开始

```bash
# 安装依赖
pnpm install

# 启动基础服务 (数据库、消息队列等)
docker compose up -d postgres mongodb redis rabbitmq minio

# 启动所有应用服务 (开发模式)
pnpm run dev

# 或者单独启动特定服务
cd apps/api && pnpm run dev    # API 服务
cd apps/admin && pnpm run dev  # 管理后台
cd apps/web && pnpm run dev    # 前端应用

# 构建所有包
pnpm run build

# 运行测试
pnpm run test

# 类型检查
pnpm run typecheck

# 代码检查
pnpm run lint
```

### 多服务本地开发

详细的多服务本地开发指南请参考：[本地开发文档](docs/LOCAL_DEVELOPMENT.md)

### 单独服务开发

```bash
# API服务开发
cd apps/api
pnpm run dev

# 爬虫服务开发
cd apps/crawler
pnpm run dev

# 前端开发
cd apps/web
pnpm run dev

# 管理后台开发
cd apps/admin
pnpm run dev
```

### 包开发

```bash
# 类型包
cd packages/types
pnpm run dev

# 组件包
cd packages/components
pnpm run dev
```

## 🐳 Docker 部署

### 构建镜像
```bash
# 构建生产镜像
docker build -f Dockerfile.pro -t imeepos/pro:latest .

# 启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 开发环境部署
```bash
# 仅启动基础服务
docker compose up -d postgres mongodb redis rabbitmq minio

# 然后启动应用服务
pnpm run dev
```

### 服务端口
- **API**: 3000
- **Admin**: 4201
- **Web**: 4200
- **Broker**: 3001
- **Crawler**: 3002
- **Cleaner**: 3003

## 📊 监控与维护

### 日志系统
- 基于 Pino 的结构化日志
- 统一的日志格式和等级
- 服务标识与追踪

### 健康检查
```bash
# API 健康检查
curl http://xxx:3000/health

# 各服务状态监控
docker compose ps
```

### 性能监控
- RabbitMQ 管理界面: http://localhost:15672
- 任务执行状态实时监控
- 爬取速率与成功率统计

## 🔒 安全特性

- JWT 认证与授权
- API 密钥管理
- 请求频率限制
- 数据加密存储
- 容器安全隔离

## 📈 扩展性

### 水平扩展
- 爬虫服务多实例部署
- 消息队列负载均衡
- 数据库读写分离

### 功能扩展
- 新平台爬取器插件化
- 数据处理管道可配置
- 前端组件模块化

## 🤝 贡献指南

1. 遵循现有代码风格
2. 编写充分的测试用例
3. 更新相关文档
4. 提交前运行类型检查

## 📄 许可证

UNLICENSED - 仅供内部使用

---

**构建状态**: 使用 Turbo 实现快速构建缓存
**包管理**: 使用 pnpm 实现高效依赖管理
**架构模式**: 微服务 + 单体仓库的混合架构