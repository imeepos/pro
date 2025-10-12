# 开发环境部署指南

## 概述

开发环境采用单容器多服务架构，将所有后端服务（api, broker, crawler, cleaner）合并到一个容器中运行，通过 PM2 进程管理器管理，以节省资源和简化开发流程。

## 架构对比

### 生产环境（6个容器）
```
├── pro-api        (独立容器 - imeepos/pro:latest)
├── pro-broker     (独立容器 - imeepos/pro:latest)
├── pro-crawler    (独立容器 - imeepos/pro:latest)
├── pro-cleaner    (独立容器 - imeepos/pro:latest)
├── pro-web        (独立容器 - imeepos/pro:latest)
└── pro-admin      (独立容器 - imeepos/pro:latest)
```

### 开发环境（3个容器）
```
├── pro-backend-dev   (包含: api + broker + crawler + cleaner - imeepos/pro:latest + PM2)
├── pro-web-dev       (nginx:alpine + 静态文件)
└── pro-admin-dev     (nginx:alpine + 静态文件)
```

## 资源优化效果

- **容器数量**: 6个 → 3个 (减少50%)
- **镜像大小**: 前端从 ~2GB 减少到 ~20MB (nginx:alpine)
- **内存使用**: ~900MB → ~400MB (节省55%)
- **CPU开销**: 显著减少容器管理开销
- **启动时间**: 前端容器秒级启动

## 使用方法

### 1. 构建前端应用

开发环境的前端服务使用纯静态文件部署，需要先构建：

```bash
# 构建所有前端应用
./build-frontend.sh

# 或分别构建
./build-frontend.sh web      # 构建 Web 应用
./build-frontend.sh admin    # 构建 Admin 应用

# 生产环境构建
./build-frontend.sh --prod

# 清理后构建
./build-frontend.sh --clean
```

### 2. 启动开发环境

```bash
# 使用开发配置启动
docker compose -f docker-compose.dev.yml up -d

# 查看服务状态
docker compose -f docker-compose.dev.yml ps

# 查看日志
docker compose -f docker-compose.dev.yml logs -f backend
```

### 3. 服务端口映射

| 服务 | 端口 | 说明 |
|------|------|------|
| API | 3000 | 主要 REST API 服务 |
| Broker | 3003 | 任务调度服务 |
| Crawler | 3001 | 爬虫服务 |
| Cleaner | 3002 | 数据清理服务 |
| Web | 8080 | 公共前端应用 |
| Admin | 8081 | 管理后台 |

### 4. PM2 管理命令

```bash
# 进入后端容器
docker exec -it pro-backend-dev bash

# 查看所有服务状态
pm2 status

# 查看实时日志
pm2 logs

# 重启特定服务
pm2 restart api
pm2 restart crawler

# 查看服务监控
pm2 monit

# 停止所有服务
pm2 kill
```

### 5. 健康检查

```bash
# 检查所有服务健康状态
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health

# 前端应用健康检查
curl http://localhost:8080/health
curl http://localhost:8081/health
```

## 开发工作流

### 代码更新后重新部署

**前端代码更新**：
```bash
# 1. 重新构建前端
./build-frontend.sh

# 2. 重启前端服务
docker compose -f docker-compose.dev.yml restart web admin
```

**后端代码更新**：
```bash
# 1. 重新构建后端镜像
docker build -f Dockerfile.pro -t imeepos/pro:latest .

# 2. 重启后端服务
docker compose -f docker-compose.dev.yml down backend
docker compose -f docker-compose.dev.yml up -d backend

# 3. 查看启动日志
docker compose -f docker-compose.dev.yml logs -f backend
```

**完整重新部署**：
```bash
# 重新构建所有
./build-frontend.sh
docker build -f Dockerfile.pro -t imeepos/pro:latest .

# 重启环境
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d
```

### 单独重启某个服务

```bash
# 进入容器
docker exec -it pro-backend-dev bash

# 重启特定服务
pm2 restart api
```

## 环境变量配置

开发环境使用以下环境变量文件：

```bash
# .env.dev
COMPOSE_PROJECT_NAME=pro-dev
NODE_ENV=development

# 端口配置
API_PORT=3000
BROKER_PORT=3003
CRAWLER_PORT=3001
CLEANER_PORT=3002
WEB_PORT=8080
ADMIN_PORT=8081

# 数据库配置 (使用远程数据库)
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=pro_dev
REDIS_PASSWORD=your_redis_password
RABBITMQ_DEFAULT_USER=your_rabbitmq_user
RABBITMQ_DEFAULT_PASS=your_rabbitmq_password
MONGO_INITDB_ROOT_USERNAME=your_mongo_user
MONGO_INITDB_ROOT_PASSWORD=your_mongo_password

# 认证配置
JWT_SECRET=dev-secret-key
INTERNAL_API_TOKEN=dev-internal-token
```

## 故障排除

### 常见问题

1. **服务启动失败**
   ```bash
   # 检查构建产物
   docker exec -it pro-backend-dev ls -la /app/apps/*/dist/

   # 查看详细日志
   docker compose -f docker-compose.dev.yml logs backend
   ```

2. **PM2 进程异常**
   ```bash
   # 进入容器检查
   docker exec -it pro-backend-dev bash
   pm2 status
   pm2 logs --lines 50
   ```

3. **端口冲突**
   ```bash
   # 检查端口占用
   netstat -tlnp | grep :3000

   # 修改 .env.dev 中的端口配置
   ```

4. **内存不足**
   ```bash
   # 查看容器资源使用
   docker stats pro-backend-dev

   # 调整 docker-compose.dev.yml 中的资源限制
   ```

### 日志查看

```bash
# 查看所有服务日志
docker compose -f docker-compose.dev.yml logs -f

# 查看特定服务日志
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f web

# 进入容器查看 PM2 日志
docker exec -it pro-backend-dev pm2 logs
```

## 切换回生产模式

如需切换回原始的多容器模式：

```bash
# 停止开发环境
docker compose -f docker-compose.dev.yml down

# 启动生产环境
docker compose up -d
```

## 注意事项

1. **资源限制**: 开发环境对后端容器设置了2GB内存限制，确保主机有足够资源
2. **数据持久化**: 开发环境使用远程数据库，无需本地数据卷
3. **网络隔离**: 前端和后端使用独立网络，确保服务间通信正常
4. **健康检查**: 所有服务都配置了健康检查，启动时会等待依赖服务就绪

## 性能监控

```bash
# 查看容器资源使用
docker stats

# 查看 PM2 进程监控
docker exec -it pro-backend-dev pm2 monit

# 查看服务响应时间
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/health
```