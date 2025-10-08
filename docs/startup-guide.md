# Pro 项目启动指南

**版本**: v1.0
**更新日期**: 2025-10-08
**适用环境**: 开发环境

---

## 目录

1. [环境要求](#环境要求)
2. [快速启动](#快速启动)
3. [详细步骤](#详细步骤)
4. [服务说明](#服务说明)
5. [常见问题](#常见问题)
6. [测试指南](#测试指南)
7. [开发指南](#开发指南)

---

## 环境要求

### 必需软件

| 软件 | 版本 | 用途 |
|------|------|------|
| Node.js | >=18.0.0 | 运行时环境 |
| pnpm | >=8.0.0 | 包管理器 |
| Docker | Latest | 容器运行 |
| Docker Compose | Latest | 多容器编排 |

### 可选软件

- Git: 代码版本控制
- VS Code: 推荐的 IDE
- Postman/Insomnia: API 测试

### 系统要求

- **操作系统**: Linux, macOS, Windows (with WSL2)
- **内存**: 最小 8GB RAM
- **磁盘**: 最小 10GB 可用空间

---

## 快速启动

### 一行命令启动

```bash
# 克隆仓库(如果还没有)
git clone <repository-url>
cd pro

# 复制环境变量文件
cp .env.example .env

# 启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps
```

### 验证服务

```bash
# 检查 API 是否正常
docker exec pro-api wget -q -O- http://localhost:3000/api

# 预期输出:
# {"success":true,"data":"Hello World!","timestamp":"2025-..."}
```

**就这么简单!** 🎉

---

## 详细步骤

### 步骤 1: 环境准备

#### 1.1 安装 Node.js 和 pnpm

```bash
# 检查 Node.js 版本
node --version  # 应该 >= 18.0.0

# 安装 pnpm (如果没有)
npm install -g pnpm

# 验证 pnpm
pnpm --version  # 应该 >= 8.0.0
```

#### 1.2 安装 Docker

```bash
# Linux (Ubuntu/Debian)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# macOS
brew install --cask docker

# Windows
# 下载并安装 Docker Desktop
# https://www.docker.com/products/docker-desktop
```

#### 1.3 验证 Docker

```bash
docker --version
docker compose version

# 测试 Docker
docker run hello-world
```

---

### 步骤 2: 项目设置

#### 2.1 获取代码

```bash
# 克隆仓库
git clone <repository-url>
cd pro

# 或者,如果已经克隆
cd /path/to/pro
git pull origin master
```

#### 2.2 配置环境变量

```bash
# 复制示例文件
cp .env.example .env

# 编辑环境变量(可选)
vi .env
```

**重要环境变量**:

```env
# 数据库密码
POSTGRES_PASSWORD=change_me_please

# Redis 密码
REDIS_PASSWORD=change_me_please

# JWT 密钥 (生产环境必须修改!)
JWT_SECRET=your-jwt-secret-change-in-production

# 应用端口
API_PORT=3000
ADMIN_PORT=4201
WEB_PORT=4200
```

#### 2.3 安装依赖 (可选,Docker 会自动处理)

```bash
# 如果要本地开发
pnpm install
```

---

### 步骤 3: 启动服务

#### 3.1 启动所有基础服务

```bash
# 启动数据库、Redis、RabbitMQ 等
docker compose up -d postgres redis rabbitmq mongo minio nginx

# 等待服务就绪 (~30秒)
docker compose ps
```

#### 3.2 启动 API 服务

```bash
# 构建并启动 API
docker compose up -d --build api

# 查看启动日志
docker logs pro-api -f

# 看到 "Nest application successfully started" 即成功
```

#### 3.3 启动前端应用 (可选)

```bash
# 方式 1: Docker 启动 (生产模式)
docker compose up -d --build admin web

# 方式 2: 本地开发启动
cd apps/admin
pnpm dev

# 另一个终端
cd apps/web
pnpm dev
```

---

### 步骤 4: 验证部署

#### 4.1 检查容器状态

```bash
docker compose ps

# 所有容器应该显示 "healthy" 或 "Up"
```

#### 4.2 测试 API

```bash
# 测试根路径
curl http://localhost:3000/api

# 预期输出:
# {"success":true,"data":"Hello World!","timestamp":"..."}
```

#### 4.3 测试数据库

```bash
# 进入 PostgreSQL 容器
docker exec -it microinfra_postgres psql -U app_user -d app_db

# 查看表
\dt

# 退出
\q
```

#### 4.4 访问管理界面

打开浏览器:

- **Admin 后台**: http://localhost:4201
- **Web 应用**: http://localhost:4200
- **RabbitMQ 管理界面**: http://localhost:15672 (guest/guest)
- **MinIO 控制台**: http://localhost:9001

---

## 服务说明

### 核心服务

| 服务 | 端口 | 容器名 | 用途 |
|------|------|--------|------|
| PostgreSQL | 5432 | microinfra_postgres | 主数据库 |
| Redis | 6379 | microinfra_redis | 缓存和会话 |
| RabbitMQ | 5672, 15672 | microinfra_rabbitmq | 消息队列 |
| MongoDB | 27017 | microinfra_mongo | 文档数据库 |
| MinIO | 9000, 9001 | microinfra_minio | 对象存储 |

### 应用服务

| 服务 | 端口 | 容器名 | 用途 |
|------|------|--------|------|
| API | 3000 | pro-api | 后端 REST API |
| Admin | 4201 | pro-admin | 管理后台 |
| Web | 4200 | pro-web | 前端应用 |
| Crawler | 3001 | pro-crawler | 爬虫服务 |
| Cleaner | 3002 | pro-cleaner | 数据清理 |

### 网络

| 网络 | 用途 |
|------|------|
| microinfra_backend | 后端服务通信 |
| microinfra_frontend | 前端服务通信 |

---

## 常见问题

### Q1: 端口被占用

**问题**: `Error: port is already allocated`

**解决方案**:

```bash
# 方式 1: 修改 .env 中的端口
# 例如: API_PORT=3001

# 方式 2: 停止占用端口的服务
lsof -i :3000
kill -9 <PID>

# 方式 3: 使用不同的端口
API_PORT=3001 docker compose up -d api
```

---

### Q2: 容器无法启动

**问题**: Container fails to start

**诊断步骤**:

```bash
# 1. 查看日志
docker compose logs <service-name>

# 2. 查看详细错误
docker logs <container-name>

# 3. 检查容器状态
docker inspect <container-name>

# 4. 重新构建
docker compose up -d --build --force-recreate <service-name>
```

---

### Q3: 数据库连接失败

**问题**: `ECONNREFUSED` 或 `connection refused`

**检查清单**:

```bash
# 1. 数据库容器是否运行
docker compose ps postgres

# 2. 检查环境变量
docker exec pro-api env | grep DATABASE

# 3. 测试连接
docker exec pro-api pg_isready -h postgres -p 5432

# 4. 检查网络
docker network ls
docker network inspect microinfra_backend
```

---

### Q4: API 返回 500 错误

**已知问题**: 注册接口当前有 bug (见测试报告)

**临时方案**: 等待修复,或使用容器内测试:

```bash
docker exec pro-api wget -q -O- --post-data='{...}' \
  --header="Content-Type: application/json" \
  http://localhost:3000/api/auth/register
```

---

### Q5: WSL2 无法访问容器端口

**问题**: Windows WSL2 无法访问 `localhost:3000`

**解决方案**:

```bash
# 方式 1: 使用 Docker 内部网络
docker exec pro-api wget -q -O- http://localhost:3000/api

# 方式 2: 使用 Windows 主机 IP
# 在 PowerShell 中运行
ipconfig
# 找到 WSL 适配器的 IP (例如 172.x.x.x)

# 在 WSL2 中访问
curl http://<Windows-IP>:3000/api

# 方式 3: 端口转发
netsh interface portproxy add v4tov4 listenport=3000 \
  listenaddress=0.0.0.0 connectport=3000 connectaddress=<WSL2-IP>
```

---

## 测试指南

### 手动测试

#### 测试 API 根路径

```bash
curl http://localhost:3000/api
```

#### 测试用户注册 (待修复)

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### 测试用户登录

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "testuser",
    "password": "password123"
  }'
```

#### 测试获取用户信息

```bash
# 先登录获取 token
TOKEN="<your-access-token>"

curl http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

---

### 使用测试脚本

#### 容器内测试

```bash
# 复制脚本到容器
docker cp test-api-in-container.sh pro-api:/tmp/test.sh

# 运行测试
docker exec pro-api /tmp/test.sh
```

#### 宿主机测试

```bash
# 直接运行 (如果端口可访问)
./test-integration.sh
```

---

### 使用 E2E 测试

```bash
# 进入 API 目录
cd apps/api

# 运行 E2E 测试
pnpm test:e2e

# 查看测试覆盖率
pnpm test:cov
```

---

## 开发指南

### 本地开发 API

```bash
# 1. 启动依赖服务
docker compose up -d postgres redis

# 2. 配置本地环境变量
cd apps/api
cp .env.example .env

# 编辑 .env，使用 localhost 而非容器名
vi .env

# 3. 安装依赖
pnpm install

# 4. 启动开发服务器
pnpm dev

# API 运行在 http://localhost:3000
```

---

### 本地开发前端

```bash
# 1. 确保 API 正在运行

# 2. 启动 Admin
cd apps/admin
pnpm dev
# 访问 http://localhost:4201

# 3. 启动 Web
cd apps/web
pnpm dev
# 访问 http://localhost:4200
```

---

### 代码热重载

所有应用都支持热重载:

- **API**: 使用 `nest start --watch`
- **Admin**: 使用 Angular CLI dev server
- **Web**: 使用 Angular CLI dev server

修改代码后自动重启,无需手动刷新。

---

### 数据库管理

#### 查看数据

```bash
# 方式 1: 命令行
docker exec -it microinfra_postgres psql -U app_user -d app_db

# 查看所有表
\dt

# 查看用户表
SELECT * FROM users;

# 退出
\q
```

#### 重置数据库

```bash
# 警告: 会删除所有数据!

# 停止 API
docker compose stop api

# 删除数据库卷
docker volume rm microinfra_postgres_data

# 重新启动
docker compose up -d postgres
docker compose up -d api
```

---

### 查看日志

```bash
# 实时查看所有服务日志
docker compose logs -f

# 查看特定服务
docker compose logs -f api

# 查看最后 100 行
docker logs pro-api --tail 100

# 带时间戳
docker logs pro-api -t
```

---

### 进入容器

```bash
# 进入 API 容器
docker exec -it pro-api sh

# 进入 PostgreSQL 容器
docker exec -it microinfra_postgres bash

# 进入 Redis 容器
docker exec -it microinfra_redis sh
```

---

## 停止和清理

### 停止服务

```bash
# 停止所有服务
docker compose stop

# 停止特定服务
docker compose stop api

# 停止并删除容器
docker compose down
```

---

### 清理数据

```bash
# 删除容器和网络 (保留数据卷)
docker compose down

# 删除所有内容包括数据卷
docker compose down -v

# 删除未使用的镜像
docker image prune -a
```

---

### 完全重置

```bash
# 警告: 会删除所有数据!

# 停止并删除所有内容
docker compose down -v

# 删除构建缓存
docker builder prune -a

# 重新开始
docker compose up -d --build
```

---

## 性能优化

### 开发环境优化

```bash
# 1. 使用 BuildKit
export DOCKER_BUILDKIT=1

# 2. 并行构建
docker compose build --parallel

# 3. 缓存依赖
# 在 Dockerfile 中分层复制 package.json
```

### 生产环境优化

```bash
# 1. 使用 production 模式
NODE_ENV=production docker compose up -d

# 2. 限制资源
# 在 docker-compose.yml 中设置 deploy.resources

# 3. 启用日志轮转
# 配置 docker logging driver
```

---

## 监控和调试

### 资源监控

```bash
# 查看容器资源使用
docker stats

# 查看特定容器
docker stats pro-api
```

### 健康检查

```bash
# 查看容器健康状态
docker inspect --format='{{.State.Health.Status}}' pro-api

# 查看健康检查日志
docker inspect --format='{{json .State.Health}}' pro-api | jq
```

---

## 附录

### A. 常用命令速查

```bash
# 启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f [service]

# 重启服务
docker compose restart [service]

# 重新构建
docker compose up -d --build [service]

# 停止服务
docker compose stop

# 删除服务
docker compose down

# 进入容器
docker exec -it <container> sh

# 查看容器 IP
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' <container>
```

### B. 环境变量完整列表

参见 `.env.example` 文件。

### C. 端口映射表

| 服务 | 容器端口 | 宿主机端口 | 协议 |
|------|----------|------------|------|
| API | 3000 | 3000 | HTTP |
| Admin | 80 | 4201 | HTTP |
| Web | 80 | 4200 | HTTP |
| PostgreSQL | 5432 | 5432 | PostgreSQL |
| Redis | 6379 | 6379 | Redis |
| RabbitMQ | 5672 | 5672 | AMQP |
| RabbitMQ 管理 | 15672 | 15672 | HTTP |
| MongoDB | 27017 | 27017 | MongoDB |
| MinIO API | 9000 | 9000 | HTTP |
| MinIO Console | 9001 | 9001 | HTTP |

### D. 故障排查清单

1. ✅ Docker 是否运行?
2. ✅ 端口是否被占用?
3. ✅ 环境变量是否正确?
4. ✅ 容器是否健康?
5. ✅ 网络是否正常?
6. ✅ 数据卷是否挂载?
7. ✅ 日志中有错误吗?

---

## 获取帮助

### 文档

- [集成测试报告](/docs/integration-test-report.md)
- [需求文档](/docs/001.md)
- [验证文档](/docs/verification.md)

### 联系方式

- **Issues**: 在 GitHub 提交 issue
- **Email**: support@example.com
- **文档**: https://docs.example.com

---

**最后更新**: 2025-10-08
**维护者**: Pro Team
**版本**: 1.0.0
