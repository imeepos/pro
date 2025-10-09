# Broker 服务部署指南

## 服务概述

Broker 是微博关键词搜索任务调度中心，负责：
- 扫描主任务并生成子任务
- 监控任务状态
- 管理 RabbitMQ 队列

## 部署要求

### 依赖服务
- PostgreSQL 数据库（weibo_search_tasks 表）
- RabbitMQ 消息队列
- Redis（可选，用于缓存）

### 环境变量

```bash
# 服务配置
PORT=3003
NODE_ENV=production

# 数据库配置
DATABASE_URL=postgresql://postgres:password@postgres:5432/pro
# 或分别配置
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres123
DATABASE_NAME=pro

# RabbitMQ 配置
RABBITMQ_URL=amqp://rabbitmq:5672

# 日志级别
LOG_LEVEL=info
```

## 部署方式

### 1. Docker 部署（推荐）

```bash
# 构建镜像
docker build -t pro-broker .

# 运行容器
docker run -d \
  --name pro-broker \
  -p 3003:3003 \
  -e DATABASE_URL=postgresql://postgres:password@postgres:5432/pro \
  -e RABBITMQ_URL=amqp://rabbitmq:5672 \
  pro-broker
```

### 2. Docker Compose 部署

在 `docker-compose.yml` 中添加：

```yaml
broker:
  build:
    context: ./apps/broker
    dockerfile: Dockerfile
  ports:
    - "3003:3003"
  environment:
    DATABASE_URL: postgresql://postgres:postgres123@postgres:5432/pro
    RABBITMQ_URL: amqp://rabbitmq:5672
    NODE_ENV: production
  depends_on:
    - postgres
    - rabbitmq
  restart: unless-stopped
```

### 3. 直接部署

```bash
# 安装依赖
pnpm install

# 构建
pnpm run build

# 启动
NODE_ENV=production DATABASE_URL=postgresql://... RABBITMQ_URL=amqp://... node dist/apps/broker/src/main.js
```

## 数据库设置

确保 PostgreSQL 中存在 `weibo_search_tasks` 表。如果表不存在，会自动创建。

## 验证部署

### 健康检查

```bash
curl http://localhost:3003/broker/health
```

### 获取统计信息

```bash
curl http://localhost:3003/broker/stats
```

### 手动触发扫描

```bash
curl -X POST http://localhost:3003/broker/scan
```

## 监控

### 日志查看

```bash
# Docker 容器日志
docker logs pro-broker -f

# Docker Compose 日志
docker-compose logs -f broker
```

### 关键日志信息

- `任务扫描已触发` - 调度器开始工作
- `已发布子任务` - 成功生成子任务
- `任务监控完成` - 监控器正常工作
- `超时任务已标记` - 处理超时任务

## 故障排查

### 常见问题

1. **数据库连接失败**
   - 检查 DATABASE_URL 配置
   - 确认 PostgreSQL 服务正常

2. **RabbitMQ 连接失败**
   - 检查 RABBITMQ_URL 配置
   - 确认 RabbitMQ 服务正常

3. **任务无法调度**
   - 检查 `weibo_search_tasks` 表数据
   - 确认任务 `enabled=true` 且 `nextRunAt` 小于当前时间

### 重新构建部署

修改源码后需要重新构建：

```bash
# 开发环境
docker compose build broker
docker compose up -d broker --build

# 生产环境
docker build -t pro-broker .
docker stop pro-broker
docker rm pro-broker
docker run -d --name pro-broker pro-broker
```

## 性能优化

### 调度间隔

- TaskScannerScheduler: 每分钟执行
- TaskMonitor: 每5分钟执行

### 并发处理

- 批量处理主任务：每批5个任务
- 指数退避重试：5分钟、10分钟、20分钟...

### 资源限制

- 内存: 建议 256MB+
- CPU: 建议 1核+

## 扩展性

- 支持 RabbitMQ 集群
- 支持多个 broker 实例（通过数据库协调）
- 支持水平扩展

## 安全

- 数据库连接加密
- RabbitMQ 连接认证
- API 接口鉴权（可选）

## 备份恢复

- 数据库定期备份
- 任务状态持久化
- 异常自动恢复