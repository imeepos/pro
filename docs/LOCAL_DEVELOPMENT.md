# 多服务本地开发指南

本文档介绍如何在本地环境中进行多服务联调开发。

## 🏗️ 服务架构

### 服务列表
- **API**: http://localhost:3000 (主 API 服务)
- **Admin**: http://localhost:4201 (管理后台)
- **Web**: http://localhost:4200 (前端应用)
- **Broker**: http://localhost:3001 (任务调度)
- **Crawler**: http://localhost:3002 (爬虫服务)
- **Cleaner**: http://localhost:3003 (数据清洗)

### 依赖服务
- **PostgreSQL**: localhost:5432
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379
- **RabbitMQ**: http://localhost:15672 (管理界面)
- **MinIO**: http://localhost:9000 (管理界面)

## 🚀 快速启动

### 1. 启动基础服务

```bash
# 使用 Docker Compose 启动基础服务
docker compose up -d postgres mongodb redis rabbitmq minio

# 等待服务启动完成
docker compose ps
```

### 2. 安装依赖

```bash
# 根目录安装所有依赖
bun install
```

### 3. 环境配置

复制并配置环境变量文件：

```bash
# API 服务
cp apps/api/.env.example apps/api/.env

# 其他服务根据需要配置
```

### 4. 数据库初始化

```bash
# 运行数据库迁移
cd apps/api
bun run migration:run

# 初始化基础数据
bun run seed:run
```

## 🔧 开发模式启动

### 方式一：全部服务启动
```bash
# 在根目录执行
bun run dev
```

### 方式二：按需启动服务

#### 启动 API 服务
```bash
cd apps/api
bun run dev
```

#### 启动前端服务
```bash
# 启动管理后台
cd apps/admin
bun run dev

# 启动前端应用
cd apps/web
bun run dev
```

#### 启动后端微服务
```bash
# 启动任务调度
cd apps/broker
bun run dev

# 启动爬虫服务
cd apps/crawler
bun run dev

# 启动数据清洗
cd apps/cleaner
bun run dev
```

## 🔍 服务状态检查

### 健康检查脚本
```bash
#!/bin/bash
# 检查脚本: check-services.sh

services=(
    "API:http://localhost:3000/health"
    "Admin:http://localhost:4201"
    "Web:http://localhost:4200"
    "Broker:http://localhost:3001/health"
    "Crawler:http://localhost:3002/health"
    "Cleaner:http://localhost:3003/health"
)

for service in "${services[@]}"; do
    name=$(echo $service | cut -d: -f1)
    url=$(echo $service | cut -d: -f2-)

    if curl -s -f "$url" > /dev/null; then
        echo "✅ $name is running"
    else
        echo "❌ $name is down"
    fi
done
```

### 依赖服务检查
```bash
# PostgreSQL
pg_isready -h localhost -p 5432

# MongoDB
mongosh --eval "db.adminCommand('ismaster')"

# Redis
redis-cli ping

# RabbitMQ
curl -f http://localhost:15672/api/overview

# MinIO
curl -f http://localhost:9000/minio/health/live
```

## 🐛 常见问题排查

### 1. 端口冲突
```bash
# 查看端口占用
lsof -i :3000
lsof -i :4200

# 杀死占用进程
kill -9 <PID>
```

### 2. 数据库连接失败
```bash
# 检查 PostgreSQL 连接
psql -h localhost -U postgres -d pro_dev

# 检查 MongoDB 连接
mongosh mongodb://localhost:27017/pro_dev
```

### 3. Redis 连接问题
```bash
# 测试 Redis 连接
redis-cli -h localhost -p 6379 ping
```

### 4. RabbitMQ 问题
```bash
# 查看队列状态
curl -u guest:guest http://localhost:15672/api/queues

# 重启 RabbitMQ
docker compose restart rabbitmq
```

### 5. 前端代理问题
检查 Angular 应用的代理配置：

```typescript
// proxy.conf.json
{
  "/api/*": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true
  }
}
```

## 📡 调试技巧

### 1. 日志查看
```bash
# 实时查看 API 服务日志
cd apps/api && bun run dev | pino-pretty

# 查看所有服务日志
docker compose logs -f
```

### 2. API 测试
```bash
# 使用 curl 测试 API
curl -X GET http://localhost:3000/api/health \
  -H "Authorization: Bearer <token>"

# 使用 httpie 测试
http GET localhost:3000/api/health Authorization:"Bearer <token>"
```

### 3. WebSocket 测试
```javascript
// 在浏览器控制台测试 WebSocket
const ws = new WebSocket('ws://localhost:3000/screens?token=<jwt_token>');
ws.onmessage = (event) => console.log('Received:', JSON.parse(event.data));
```

### 4. 数据库调试
```sql
-- PostgreSQL 查询
SELECT * FROM users LIMIT 10;

-- MongoDB 查询
db.weibo_accounts.find().limit(10);
```

## 🔧 开发工具推荐

### 1. API 测试工具
- **Postman**: API 接口测试
- **Insomnia**: 轻量级 API 客户端
- **httpie**: 命令行 HTTP 客户端

### 2. 数据库工具
- **pgAdmin**: PostgreSQL 管理界面
- **MongoDB Compass**: MongoDB GUI
- **Redis Desktop Manager**: Redis 客户端

### 3. 监控工具
- **RabbitMQ Management**: http://localhost:15672
- **MinIO Console**: http://localhost:9000
- **Grafana**: (如配置) 监控面板

## 📊 性能监控

### 1. 应用性能
```bash
# 使用 Node.js 性能分析
node --prof apps/api/dist/main.js
node --prof-process isolate-* > processed.txt
```

### 2. 数据库性能
```sql
-- PostgreSQL 慢查询
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### 3. 内存使用
```bash
# 查看进程内存占用
ps aux | grep node

# 内存详细信息
cat /proc/<pid>/status
```

## 🚀 生产环境模拟

### 1. 使用 Docker 构建
```bash
# 构建生产镜像
docker build -f Dockerfile.pro -t pro:latest .

# 启动生产环境
docker compose -f docker-compose.prod.yml up -d
```

### 2. 压力测试
```bash
# 使用 Artillery 进行压力测试
artillery run load-test.yml
```

## 📝 开发最佳实践

### 1. 代码质量
- 提交前运行类型检查: `bun run typecheck`
- 运行代码检查: `bun run lint`
- 运行单元测试: `bun run test`

### 2. Git 工作流
```bash
# 功能分支开发
git checkout -b feature/new-feature

# 提交代码
git add .
git commit -m "feat: add new feature"

# 推送分支
git push origin feature/new-feature
```

### 3. 环境隔离
- 开发环境: `.env.development`
- 测试环境: `.env.test`
- 生产环境: `.env.production`

### 4. 依赖管理
```bash
# 更新依赖
bun update

# 清理未使用依赖
bun pm cache rm
```

## 🔗 相关链接

- [API 文档](http://localhost:3000/api/docs)
- [Admin 管理后台](http://localhost:4201)
- [Web 前端应用](http://localhost:4200)
- [RabbitMQ 管理](http://localhost:15672)
- [MinIO 控制台](http://localhost:9000)

## 📞 获取帮助

如果遇到问题，请：
1. 查看相关服务的日志
2. 检查依赖服务状态
3. 参考项目文档
4. 联系开发团队