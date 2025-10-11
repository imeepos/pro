# 开发环境指南

## 概述

本项目提供了一个一体化的开发环境 Docker 容器，可以同时启动所有服务并支持热重载。

## 架构说明

### 容器架构

```
┌─────────────────────────────────────────────────────────────┐
│                     开发容器 (pro_dev)                        │
├─────────────────────────────────────────────────────────────┤
│  Turbo Dev (自动监控文件变化)                                  │
│  ├── API (NestJS)         → http://localhost:3000           │
│  ├── Crawler (NestJS)     → http://localhost:3001           │
│  ├── Cleaner (NestJS)     → http://localhost:3002           │
│  ├── Broker (NestJS)      → http://localhost:3003           │
│  ├── Admin (Angular)      → http://localhost:4201           │
│  └── Web (Angular)        → http://localhost:4200           │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      基础设施容器                              │
├─────────────────────────────────────────────────────────────┤
│  • PostgreSQL      → localhost:5432                         │
│  • Redis           → localhost:6379                         │
│  • RabbitMQ        → localhost:5672 & 15672                 │
│  • MongoDB         → localhost:27017                        │
│  • MinIO           → localhost:9000 & 9001                  │
└─────────────────────────────────────────────────────────────┘
```

## 快速开始

### 方式一：使用启动脚本（推荐）

```bash
# 一键启动所有服务
./scripts/dev-start.sh
```

脚本会自动：
1. 检查 Docker 和 Docker Compose
2. 检查并创建 .env 文件
3. 清理旧容器
4. 构建开发镜像
5. 启动所有服务
6. 等待服务就绪
7. 显示服务状态和访问地址

### 方式二：手动启动

```bash
# 1. 确保有 .env 文件
cp .env.example .env

# 2. 构建开发镜像
docker build -f Dockerfile.dev -t pro-dev:latest .

# 3. 启动所有服务
docker compose -f docker-compose.dev.all.yml up -d

# 4. 查看日志
docker compose -f docker-compose.dev.all.yml logs -f dev
```

## 服务访问

### 后端服务

| 服务 | 地址 | 说明 |
|------|------|------|
| API | http://localhost:3000 | 主 API 服务 |
| Crawler | http://localhost:3001 | 爬虫服务 |
| Cleaner | http://localhost:3002 | 清理服务 |
| Broker | http://localhost:3003 | 消息代理服务 |

### 前端服务

| 服务 | 地址 | 说明 |
|------|------|------|
| Admin | http://localhost:4201 | 后台管理系统 |
| Web | http://localhost:4200 | 前端展示页面 |

### 基础设施

| 服务 | 地址 | 凭证 |
|------|------|------|
| PostgreSQL | localhost:5432 | 见 .env |
| Redis | localhost:6379 | 见 .env |
| RabbitMQ 管理界面 | http://localhost:15672 | 见 .env |
| MongoDB | localhost:27017 | 见 .env |
| MinIO 控制台 | http://localhost:9001 | 见 .env |

## 热重载机制

### 工作原理

1. **卷映射**：源代码通过卷映射到容器内
   ```yaml
   volumes:
     - ./apps:/app/apps
     - ./packages:/app/packages
   ```

2. **Turbo Dev**：使用 `bun run dev` 启动 turbo，会并行启动所有服务的 dev 脚本
   - NestJS 服务：使用 `nest start --watch` 监控变化
   - Angular 服务：使用 `ng serve` 自动重载

3. **自动重启**：
   - 后端代码修改 → NestJS 自动重启
   - 前端代码修改 → Angular 热模块替换 (HMR)

### 支持的文件类型

- TypeScript 文件 (`.ts`, `.tsx`)
- 配置文件 (`tsconfig.json`, `package.json`)
- 模板文件 (`.html`)
- 样式文件 (`.css`, `.scss`)

## 常用命令

### 查看日志

```bash
# 查看所有服务日志
docker compose -f docker-compose.dev.all.yml logs -f

# 查看开发容器日志
docker compose -f docker-compose.dev.all.yml logs -f dev

# 查看特定服务日志
docker compose -f docker-compose.dev.all.yml logs -f postgres
```

### 管理服务

```bash
# 停止所有服务
docker compose -f docker-compose.dev.all.yml down

# 重启开发容器
docker compose -f docker-compose.dev.all.yml restart dev

# 重启基础设施服务
docker compose -f docker-compose.dev.all.yml restart postgres redis rabbitmq mongo minio

# 查看服务状态
docker compose -f docker-compose.dev.all.yml ps
```

### 进入容器

```bash
# 进入开发容器
docker compose -f docker-compose.dev.all.yml exec dev sh

# 在容器内执行命令
docker compose -f docker-compose.dev.all.yml exec dev bun run typecheck
docker compose -f docker-compose.dev.all.yml exec dev bun run lint
```

### 清理和重建

```bash
# 完全清理（包括数据卷）
docker compose -f docker-compose.dev.all.yml down -v

# 重建镜像
docker build -f Dockerfile.dev -t pro-dev:latest . --no-cache

# 重新启动
./scripts/dev-start.sh
```

## 调试技巧

### 1. 后端调试

开发容器支持 Node.js 调试，可以修改 `package.json` 添加调试端口：

```json
{
  "scripts": {
    "dev": "nest start --watch --debug 0.0.0.0:9229"
  }
}
```

然后在 `docker-compose.dev.all.yml` 中暴露调试端口：

```yaml
ports:
  - "9229:9229"  # 调试端口
```

### 2. 前端调试

Angular 应用支持 Chrome DevTools：
1. 打开浏览器开发者工具
2. 使用 Source Map 调试 TypeScript 源码

### 3. 数据库调试

```bash
# 连接 PostgreSQL
docker compose -f docker-compose.dev.all.yml exec postgres psql -U your_user -d your_db

# 连接 MongoDB
docker compose -f docker-compose.dev.all.yml exec mongo mongosh -u root -p password

# 连接 Redis
docker compose -f docker-compose.dev.all.yml exec redis redis-cli -a password
```

## 性能优化

### 1. 提高热重载速度

如果热重载较慢，可以：
- 使用 SSD 存储代码
- 在 WSL2 中开发时，确保代码在 WSL2 文件系统中
- 调整 Docker Desktop 的资源分配（CPU、内存）

### 2. 减少容器大小

开发镜像已经优化：
- 基于 Alpine Linux
- 多阶段构建缓存
- 排除不必要的文件（通过 .dockerignore）

### 3. 并行启动优化

Turbo 已配置为并行启动服务，如需调整并发数：

```json
// turbo.json
{
  "globalEnv": ["NODE_ENV"],
  "globalPassThroughEnv": ["FORCE_COLOR"],
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true,
      "dependsOn": ["^build"]
    }
  }
}
```

## 故障排查

### 问题：端口被占用

```bash
# 查找占用端口的进程
lsof -i :3000
# 或
netstat -tulpn | grep 3000

# 杀死进程
kill -9 <PID>
```

### 问题：服务启动失败

```bash
# 1. 查看详细日志
docker compose -f docker-compose.dev.all.yml logs dev

# 2. 检查健康状态
docker compose -f docker-compose.dev.all.yml ps

# 3. 进入容器检查
docker compose -f docker-compose.dev.all.yml exec dev sh
```

### 问题：热重载不工作

1. 确认卷映射正确
2. 检查文件权限
3. 重启开发容器

```bash
docker compose -f docker-compose.dev.all.yml restart dev
```

### 问题：依赖安装失败

```bash
# 重新安装依赖
docker compose -f docker-compose.dev.all.yml exec dev bun install

# 清理缓存重建
docker build -f Dockerfile.dev -t pro-dev:latest . --no-cache
```

## 环境变量

关键环境变量配置在 `.env` 文件中：

```bash
# 数据库
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=pro

# Redis
REDIS_PASSWORD=your_redis_password

# RabbitMQ
RABBITMQ_DEFAULT_USER=admin
RABBITMQ_DEFAULT_PASS=your_rabbitmq_password

# MongoDB
MONGO_INITDB_ROOT_USERNAME=root
MONGO_INITDB_ROOT_PASSWORD=your_mongo_password

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your_minio_password

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
```

## 与生产环境的区别

| 特性 | 开发环境 | 生产环境 |
|------|---------|---------|
| 容器数量 | 1个开发容器 | 每个服务独立容器 |
| 代码加载 | 卷映射 | 构建到镜像 |
| 热重载 | ✅ | ❌ |
| 调试信息 | 详细 | 精简 |
| 优化 | 开发速度 | 运行性能 |
| 镜像大小 | 较大（包含开发工具） | 精简（仅运行时） |

## 最佳实践

1. **定期清理**：定期清理未使用的容器和镜像
   ```bash
   docker system prune -a
   ```

2. **环境隔离**：使用不同的 `.env` 文件管理不同环境

3. **依赖更新**：更新依赖后重建镜像
   ```bash
   docker build -f Dockerfile.dev -t pro-dev:latest . --no-cache
   ```

4. **日志管理**：定期查看日志，及时发现问题

5. **数据备份**：重要数据定期备份
   ```bash
   docker compose -f docker-compose.dev.all.yml exec postgres pg_dump -U user db > backup.sql
   ```

## 相关文件

- `Dockerfile.dev` - 开发环境镜像定义
- `docker-compose.dev.all.yml` - 完整服务编排配置
- `scripts/dev-start.sh` - 一键启动脚本
- `.dockerignore` - Docker 构建忽略文件
- `turbo.json` - Turbo 配置

## 技术支持

如遇到问题，请：
1. 查看本文档的故障排查部分
2. 查看容器日志
3. 提交 Issue 或联系团队
