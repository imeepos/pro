# 基于MediaCrawler增强的微博爬取系统 - 生产环境部署方案
# Weibo Crawler System - Production Deployment Solution

## 📋 项目概述

本项目提供了一个基于MediaCrawler增强的企业级微博爬取系统的完整生产环境部署方案。该系统采用微服务架构，具备高可用、高性能、易扩展的特性，适用于大规模数据采集和处理场景。

### 🎯 核心特性

- **微服务架构**: 模块化设计，易于维护和扩展
- **高可用部署**: 支持Docker和Kubernetes部署
- **智能反爬虫**: IP轮换、请求伪装、频率控制
- **企业级安全**: 完整的安全防护体系
- **实时监控**: Prometheus + Grafana监控栈
- **自动扩缩容**: 基于负载的智能扩缩容
- **数据保护**: 加密存储、访问控制、审计日志

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        负载均衡层 (Nginx)                      │
├─────────────────────────────────────────────────────────────┤
│  爬虫服务    │  调度服务    │  解析服务    │  存储服务      │
│  (3副本)    │  (2副本)    │  (2副本)    │  (1副本)      │
├─────────────────────────────────────────────────────────────┤
│ PostgreSQL  │   MongoDB   │    Redis    │   RabbitMQ    │
│  (结构化数据) │  (原始数据)  │   (缓存)     │  (消息队列)    │
├─────────────────────────────────────────────────────────────┤
│                      MinIO (对象存储)                        │
├─────────────────────────────────────────────────────────────┤
│  Prometheus  │   Grafana   │ AlertManager │   日志系统     │
│  (监控)      │  (可视化)    │  (告警)      │  (ELK Stack)   │
└─────────────────────────────────────────────────────────────┘
```

## 📁 项目结构

```
pro/
├── apps/                          # 应用程序
│   └── crawler/                   # 爬虫服务
├── packages/                      # 共享包
├── deploy/                        # 部署配置
│   ├── docker/                    # Docker配置
│   │   ├── Dockerfile.crawler
│   │   ├── docker-compose.prod.yml
│   │   ├── nginx.conf
│   │   └── .env.example
│   ├── kubernetes/                # Kubernetes配置
│   │   ├── deployments.yaml
│   │   ├── services.yaml
│   │   ├── ingress.yaml
│   │   ├── statefulsets.yaml
│   │   ├── configmaps.yaml
│   │   ├── secrets.yaml
│   │   ├── rbac.yaml
│   │   ├── autoscaling.yaml
│   │   ├── pvc.yaml
│   │   └── deploy.sh
│   └── helm/                      # Helm Charts
├── monitoring/                    # 监控配置
│   ├── prometheus/
│   │   ├── prometheus.yml
│   │   └── rules/
│   ├── grafana/
│   │   └── provisioning/
│   └── alertmanager/
│       └── alertmanager.yml
└── docs/                          # 文档
    ├── operations/                # 运维文档
    │   ├── deployment-guide.md
    │   ├── troubleshooting-manual.md
    │   └── performance-tuning.md
    └── security/                  # 安全文档
        └── security-guide.md
```

## 🚀 快速开始

### 1. Docker Compose 部署

```bash
# 1. 克隆项目
git clone <repository-url>
cd pro

# 2. 配置环境变量
cp deploy/docker/.env.example .env
vim .env  # 编辑配置文件

# 3. 启动服务
cd deploy/docker
docker-compose up -d

# 4. 验证部署
curl http://localhost/health
```

### 2. Kubernetes 部署

```bash
# 1. 准备Kubernetes集群
kubectl cluster-info

# 2. 配置密钥
cd deploy/kubernetes
cp secrets.yaml.example secrets.yaml
vim secrets.yaml  # 编辑密钥配置

# 3. 执行部署
./deploy.sh deploy

# 4. 验证部署
kubectl get pods -n weibo-crawler
kubectl get services -n weibo-crawler
```

## 📊 监控和可视化

### 访问地址

| 服务 | 地址 | 用途 |
|------|------|------|
| 主应用 | http://localhost | 微博爬取系统 |
| Grafana | http://localhost:3001 | 监控仪表板 |
| Prometheus | http://localhost:9090 | 指标数据 |
| RabbitMQ管理 | http://localhost:15672 | 消息队列管理 |
| MinIO控制台 | http://localhost:9001 | 对象存储管理 |

### 默认账户

| 服务 | 用户名 | 密码 |
|------|--------|------|
| Grafana | admin | (见.env文件) |
| RabbitMQ | admin | (见.env文件) |
| MinIO | minioadmin | (见.env文件) |

## 📚 文档

### 运维文档
- [部署指南](docs/operations/deployment-guide.md) - 详细的部署流程说明
- [故障排查手册](docs/operations/troubleshooting-manual.md) - 常见问题解决方案
- [性能优化指南](docs/operations/performance-tuning.md) - 系统性能调优方法

### 安全文档
- [安全配置指南](docs/security/security-guide.md) - 全面的安全防护方案

## 🔧 配置说明

### 环境变量

主要配置项：

```bash
# 数据库配置
POSTGRES_PASSWORD=your_postgres_password
MONGODB_PASSWORD=your_mongodb_password
REDIS_PASSWORD=your_redis_password

# 爬虫配置
CRAWLER_CONCURRENCY=3
CRAWLER_DELAY_MIN=2000
CRAWLER_DELAY_MAX=5000
ANTI_DETECTION_STEALTH_SCRIPT=true

# 监控配置
GRAFANA_ADMIN_PASSWORD=your_grafana_password
```

完整配置请参考 [deploy/docker/.env.example](deploy/docker/.env.example)

### 反爬虫配置

系统内置了智能反爬虫机制：

- **IP轮换**: 自动切换代理IP
- **请求伪装**: 随机User-Agent、浏览器指纹
- **频率控制**: 自适应请求间隔
- **异常检测**: 自动识别反爬虫措施

## 📈 性能指标

### 系统容量

| 指标 | 最小配置 | 推荐配置 | 生产配置 |
|------|----------|----------|----------|
| 并发爬取 | 3 | 10 | 30+ |
| 每分钟页面数 | 100 | 500 | 1000+ |
| 数据处理量 | 10MB/h | 50MB/h | 200MB/h+ |
| 响应时间 | < 5s | < 3s | < 2s |

### 可用性保证

- **服务可用率**: > 99.9%
- **数据持久性**: > 99.99%
- **故障恢复时间**: < 5分钟
- **数据备份**: 每日自动备份

## 🛡️ 安全特性

- **身份认证**: JWT + 多因素认证
- **访问控制**: RBAC权限管理
- **数据加密**: 传输加密 + 存储加密
- **网络隔离**: 防火墙 + VPN
- **安全监控**: 实时威胁检测
- **合规支持**: GDPR等数据保护法规

## 🔍 监控告警

### 关键指标监控

- **系统指标**: CPU、内存、磁盘、网络
- **应用指标**: 请求量、成功率、响应时间
- **业务指标**: 爬取量、数据质量、账号状态
- **安全指标**: 异常访问、攻击检测

### 告警规则

- **P0级**: 服务宕机、数据库不可用
- **P1级**: 性能严重下降、数据异常
- **P2级**: 资源使用过高、成功率下降
- **P3级**: 性能轻微波动、配置变更

## 🔄 扩缩容策略

### 自动扩缩容

```yaml
# HPA配置示例
metrics:
- type: Resource
  resource:
    name: cpu
    target:
      type: Utilization
      averageUtilization: 70
- type: Pods
  pods:
    metric:
      name: crawler_queue_size
    target:
      type: AverageValue
      averageValue: "100"
```

### 扩缩容策略

- **扩容条件**: CPU > 70% 或 队列积压 > 100
- **缩容条件**: CPU < 30% 且 队列为空持续5分钟
- **最大副本数**: 10个
- **最小副本数**: 3个

## 🛠️ 维护操作

### 日常维护

```bash
# 查看服务状态
docker-compose ps
kubectl get pods -n weibo-crawler

# 查看日志
docker-compose logs -f crawler
kubectl logs -f deployment/crawler -n weibo-crawler

# 重启服务
docker-compose restart crawler
kubectl rollout restart deployment/crawler -n weibo-crawler
```

### 备份恢复

```bash
# 数据备份
./scripts/backup.sh

# 数据恢复
./scripts/restore.sh backup_file.tar.gz
```

---

## 原项目架构说明

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

#### 🌐 `api` (GraphQL 核心服务)
**统一 GraphQL 网关**
- **技术栈**: NestJS, Apollo GraphQL, TypeORM, PostgreSQL
- **接口模式**: 所有对外能力通过单一 `/graphql` 端点暴露，支持 Query / Mutation / Subscription
- **领域模块**:
  - 认证授权：注册、登录、刷新、注销、当前用户
  - 用户 & API Key 管理
  - 微博 / 京东账号与登录会话（含实时订阅）
  - 媒体类型、仪表板、屏幕编排等数据管理
  - 事件与附件（预签名直传 + 确认）
  - 通知推送与实时数据广播
- **兼容性提示**: 历史 `/api/*` REST 路径已下线并返回 `410 Gone`，请改用 GraphQL。详见 [`docs/graphql-migration.md`](docs/graphql-migration.md)。

> 本地开发可使用 `pnpm --filter @pro/api run dev` 启动服务，然后在 http://localhost:3000/graphql 访问 GraphQL Playground。

常用 GraphQL 指南：

- 健康检查
  ```graphql
  query Health {
    health { status timestamp }
  }
  ```
- 用户注册 / 登录
  ```graphql
  mutation Register($input: RegisterDto!) {
    register(input: $input) { accessToken refreshToken user { id username } }
  }

  mutation Login($input: LoginDto!) {
    login(input: $input) { accessToken refreshToken }
  }
  ```
- 微博登录订阅（需配合 Mutation `startWeiboLogin`）
  ```graphql
  subscription WeiboLoginEvents($sessionId: String!) {
    weiboLoginEvents(sessionId: $sessionId) {
      type
      data
    }
  }
  ```

更多 REST → GraphQL 对照、附件上传流程等内容请参考 [`docs/graphql-migration.md`](docs/graphql-migration.md)。

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
7. GraphQL 服务提供数据访问接口
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
cd apps/api && pnpm run dev    # GraphQL 服务（访问 http://localhost:3000/graphql）
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
# GraphQL 服务开发
cd apps/api
pnpm run dev

# 健康检查（GraphQL）
curl -s -X POST http://localhost:3000/graphql \\
  -H 'Content-Type: application/json' \\
  -d '{"query":"{ health { status timestamp } }"}'

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
