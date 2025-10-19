# 基于MediaCrawler增强的微博爬取系统 - 部署指南
# Weibo Crawler System Deployment Guide

## 目录

1. [系统概述](#系统概述)
2. [环境要求](#环境要求)
3. [快速部署](#快速部署)
4. [详细部署流程](#详细部署流程)
5. [验证部署](#验证部署)
6. [故障排除](#故障排除)
7. [升级指南](#升级指南)
8. [性能调优](#性能调优)

## 系统概述

基于MediaCrawler增强的微博爬取系统是一个企业级的分布式爬虫解决方案，采用微服务架构，支持高并发、高可用、易扩展的特性。

### 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx         │    │   Crawler       │    │   Monitoring    │
│   (LoadBalancer)│───▶│   Service       │───▶│   (Prometheus)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │   MongoDB       │    │   Redis         │
│   (主数据库)     │    │   (原始数据)     │    │   (缓存)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   RabbitMQ      │    │   MinIO         │    │   Grafana       │
│   (消息队列)     │    │   (对象存储)     │    │   (可视化)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 核心组件

| 组件 | 功能 | 版本要求 |
|------|------|----------|
| Crawler Service | 核心爬虫服务 | Node.js 20+ |
| PostgreSQL | 关系型数据库 | PostgreSQL 15+ |
| MongoDB | 文档数据库 | MongoDB 7+ |
| Redis | 缓存和会话存储 | Redis 7+ |
| RabbitMQ | 消息队列 | RabbitMQ 3.12+ |
| MinIO | 对象存储 | MinIO latest |
| Nginx | 反向代理和负载均衡 | Nginx 1.24+ |
| Prometheus | 监控和告警 | Prometheus latest |
| Grafana | 数据可视化 | Grafana latest |

## 环境要求

### 硬件要求

#### 最小配置
- **CPU**: 8 cores
- **内存**: 32GB RAM
- **存储**: 500GB SSD
- **网络**: 1Gbps

#### 推荐配置
- **CPU**: 16 cores
- **内存**: 64GB RAM
- **存储**: 2TB NVMe SSD
- **网络**: 10Gbps

#### 生产环境配置
- **CPU**: 32+ cores
- **内存**: 128GB+ RAM
- **存储**: 5TB+ NVMe SSD
- **网络**: 10Gbps+

### 软件要求

#### 容器化部署
- Docker 24.0+
- Docker Compose 2.20+
- Kubernetes 1.28+ (可选)

#### 传统部署
- Node.js 20+
- PostgreSQL 15+
- MongoDB 7+
- Redis 7+
- RabbitMQ 3.12+
- Nginx 1.24+

#### 开发工具
- Git 2.40+
- pnpm 8.0+
- Make 4.0+

### 网络要求

#### 端口开放
```
HTTP/HTTPS:    80, 443
API:           3000
PostgreSQL:    5432
MongoDB:       27017
Redis:         6379
RabbitMQ:      5672, 15672
MinIO:         9000, 9001
Prometheus:    9090
Grafana:       3000
```

#### 防火墙配置
```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## 快速部署

### 1. 使用Docker Compose (推荐)

#### 克隆项目
```bash
git clone https://github.com/company/weibo-crawler.git
cd weibo-crawler
```

#### 配置环境变量
```bash
cp deploy/docker/.env.example .env
# 编辑.env文件，填入实际的配置值
vim .env
```

#### 启动服务
```bash
# 构建并启动所有服务
cd deploy/docker
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f crawler
```

#### 验证部署
```bash
# 检查健康状态
curl http://localhost/health

# 检查API
curl http://localhost/api/health

# 访问Grafana
curl http://localhost:3001
```

### 2. 使用Kubernetes

#### 准备集群
```bash
# 确保Kubernetes集群可用
kubectl cluster-info

# 创建命名空间
kubectl create namespace weibo-crawler
```

#### 部署系统
```bash
cd deploy/kubernetes

# 配置密钥
cp secrets.yaml.example secrets.yaml
# 编辑secrets.yaml文件

# 执行部署脚本
./deploy.sh deploy
```

#### 验证部署
```bash
# 查看Pod状态
kubectl get pods -n weibo-crawler

# 查看服务
kubectl get services -n weibo-crawler

# 查看Ingress
kubectl get ingress -n weibo-crawler
```

## 详细部署流程

### 1. 环境准备

#### 系统更新
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

#### 安装Docker
```bash
# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 安装Node.js (开发环境)
```bash
# 使用nvm安装Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

### 2. 配置准备

#### 创建配置文件
```bash
# 复制配置模板
cp deploy/docker/.env.example .env

# 编辑配置文件
vim .env
```

#### 关键配置项
```bash
# 数据库密码
POSTGRES_PASSWORD=your_secure_password
MONGO_ROOT_PASSWORD=your_secure_password
REDIS_PASSWORD=your_secure_password

# RabbitMQ配置
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=your_secure_password

# MinIO配置
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your_secure_password

# 爬虫配置
CRAWLER_CONCURRENCY=3
CRAWLER_DELAY_MIN=2000
CRAWLER_DELAY_MAX=5000
ANTI_DETECTION_STEALTH_SCRIPT=true
```

#### SSL证书配置
```bash
# 创建SSL目录
mkdir -p deploy/docker/ssl

# 使用Let's Encrypt生成证书
sudo certbot certonly --standalone -d your-domain.com

# 复制证书到项目目录
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem deploy/docker/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem deploy/docker/ssl/key.pem
```

### 3. 数据库初始化

#### PostgreSQL初始化
```bash
# 连接到PostgreSQL
docker-compose exec postgres psql -U pro -d pro

# 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

# 创建索引
CREATE INDEX IF NOT EXISTS idx_weibo_accounts_status ON weibo_accounts(status);
CREATE INDEX IF NOT EXISTS idx_crawl_tasks_status ON crawl_tasks(status);
```

#### MongoDB初始化
```bash
# 连接到MongoDB
docker-compose exec mongodb mongosh --username admin --password your_password

# 创建用户
use pro
db.createUser({
  user: "crawler",
  pwd: "crawler_password",
  roles: [
    { role: "readWrite", db: "pro" }
  ]
})

# 创建索引
db.raw_data_sources.createIndex({ "sourceUrl": 1 }, { unique: true })
db.raw_data_sources.createIndex({ "sourceType": 1 })
db.raw_data_sources.createIndex({ "status": 1 })
```

#### Redis配置
```bash
# 连接到Redis
docker-compose exec redis redis-cli

# 设置配置
CONFIG SET maxmemory 1gb
CONFIG SET maxmemory-policy allkeys-lru
CONFIG SAVE
```

### 4. 应用部署

#### 构建镜像
```bash
# 构建应用镜像
docker-compose build crawler

# 或者使用多阶段构建
docker build -f deploy/docker/Dockerfile.crawler -t weibo-crawler:latest .
```

#### 启动服务
```bash
# 启动基础服务
docker-compose up -d postgres mongodb redis rabbitmq minio

# 等待服务就绪
sleep 30

# 启动应用服务
docker-compose up -d crawler

# 启动前端服务
docker-compose up -d nginx

# 启动监控服务
docker-compose up -d prometheus grafana alertmanager
```

#### 配置Grafana
```bash
# 获取Grafana密码
docker-compose exec grafana grep "admin-password" /etc/grafana/grafana.ini

# 访问Grafana
open http://localhost:3001

# 导入仪表板
# 使用monitoring/grafana/dashboards目录下的JSON文件
```

### 5. 监控配置

#### Prometheus配置
```bash
# 验证Prometheus配置
docker-compose exec prometheus promtool check config /etc/prometheus/prometheus.yml

# 重新加载配置
curl -X POST http://localhost:9090/-/reload
```

#### AlertManager配置
```bash
# 验证AlertManager配置
docker-compose exec alertmanager amtool check-config /etc/alertmanager/alertmanager.yml

# 重新加载配置
curl -X POST http://localhost:9093/-/reload
```

## 验证部署

### 1. 健康检查

#### 系统健康检查
```bash
# 检查所有服务状态
docker-compose ps

# 检查健康状态
curl http://localhost/health

# 检查API健康状态
curl http://localhost/api/health
```

#### 数据库连接检查
```bash
# PostgreSQL连接测试
docker-compose exec postgres pg_isready -U pro

# MongoDB连接测试
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Redis连接测试
docker-compose exec redis redis-cli ping

# RabbitMQ连接测试
curl -u admin:password http://localhost:15672/api/overview
```

### 2. 功能测试

#### 爬虫功能测试
```bash
# 发送测试爬取任务
curl -X POST http://localhost/api/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "测试",
    "maxPages": 1,
    "dataType": "weibo"
  }'

# 查看任务状态
curl http://localhost/api/crawl/status/{taskId}
```

#### 监控功能测试
```bash
# 访问Prometheus
open http://localhost:9090

# 访问Grafana
open http://localhost:3001

# 查看告警规则
curl http://localhost:9090/api/v1/rules
```

### 3. 性能测试

#### 负载测试
```bash
# 使用ab进行负载测试
ab -n 1000 -c 10 http://localhost/health

# 使用wrk进行负载测试
wrk -t12 -c400 -d30s http://localhost/health
```

#### 数据库性能测试
```bash
# PostgreSQL性能测试
docker-compose exec postgres pgbench -h localhost -U pro -d pro -c 10 -j 2 -t 1000

# Redis性能测试
docker-compose exec redis redis-benchmark -h localhost -p 6379 -c 50 -n 10000
```

## 故障排除

### 1. 常见问题

#### 服务启动失败
```bash
# 查看日志
docker-compose logs crawler

# 检查配置
docker-compose config

# 检查资源使用
docker stats
```

#### 数据库连接失败
```bash
# 检查网络连接
docker-compose exec crawler ping postgres

# 检查配置
docker-compose exec crawler env | grep DATABASE

# 重启服务
docker-compose restart postgres
```

#### 爬虫异常
```bash
# 查看详细日志
docker-compose logs -f crawler

# 检查Playwright安装
docker-compose exec crawler npx playwright install chromium

# 检查代理配置
curl http://localhost/api/crawler/proxy/status
```

### 2. 性能问题

#### 高CPU使用率
```bash
# 查看CPU使用情况
docker stats --no-stream

# 分析瓶颈
docker-compose exec crawler top

# 调整并发数
vim .env
# 修改CRAWLER_CONCURRENCY=3
```

#### 高内存使用率
```bash
# 查看内存使用
docker-compose exec crawler free -h

# 调整容器内存限制
vim deploy/docker/docker-compose.prod.yml
# 修改memory限制
```

#### 磁盘空间不足
```bash
# 查看磁盘使用
df -h

# 清理Docker
docker system prune -a

# 清理日志
docker-compose exec crawler find /app/logs -name "*.log" -mtime +7 -delete
```

### 3. 网络问题

#### 端口冲突
```bash
# 查看端口占用
netstat -tulpn | grep :3000

# 修改端口配置
vim deploy/docker/docker-compose.prod.yml
```

#### 防火墙问题
```bash
# 检查防火墙状态
sudo ufw status

# 开放端口
sudo ufw allow 3000/tcp
```

## 升级指南

### 1. 应用升级

#### 滚动升级
```bash
# 拉取最新代码
git pull origin main

# 重新构建镜像
docker-compose build crawler

# 滚动升级
docker-compose up -d --no-deps crawler
```

#### 数据库迁移
```bash
# 备份数据库
docker-compose exec postgres pg_dump -U pro pro > backup.sql

# 执行迁移
docker-compose exec crawler npm run migrate

# 验证迁移
docker-compose exec crawler npm run migrate:status
```

### 2. 配置更新

#### 环境变量更新
```bash
# 更新配置
vim .env

# 重启服务
docker-compose restart crawler
```

#### 监控配置更新
```bash
# 更新Prometheus配置
vim monitoring/prometheus/prometheus.yml

# 重新加载配置
curl -X POST http://localhost:9090/-/reload
```

### 3. 安全更新

#### 证书更新
```bash
# 更新SSL证书
sudo certbot renew

# 重启Nginx
docker-compose restart nginx
```

#### 密码更新
```bash
# 更新数据库密码
vim .env

# 重启相关服务
docker-compose restart postgres mongodb redis rabbitmq minio
```

## 性能调优

### 1. 数据库优化

#### PostgreSQL调优
```sql
-- 调整配置参数
ALTER SYSTEM SET shared_buffers = '4GB';
ALTER SYSTEM SET effective_cache_size = '12GB';
ALTER SYSTEM SET work_mem = '256MB';
ALTER SYSTEM SET maintenance_work_mem = '1GB';

-- 重启服务使配置生效
SELECT pg_reload_conf();
```

#### MongoDB调优
```javascript
// 创建复合索引
db.raw_data_sources.createIndex({
  "sourceType": 1,
  "status": 1,
  "createdAt": -1
});

// 调整连接池
db.adminCommand({
  setParameter: 1,
  maxConnections: 1000
});
```

#### Redis调优
```bash
# 调整内存配置
CONFIG SET maxmemory 2gb
CONFIG SET maxmemory-policy allkeys-lru

# 调整持久化配置
CONFIG SET save "900 1 300 10 60 10000"
```

### 2. 应用优化

#### 爬虫并发调优
```bash
# 调整并发数
vim .env
CRAWLER_CONCURRENCY=5
BROWSER_POOL_SIZE=10
```

#### 缓存优化
```bash
# 调整缓存配置
vim .env
REDIS_CACHE_TTL=3600
MONGODB_CACHE_SIZE=1000
```

### 3. 监控优化

#### Prometheus优化
```yaml
# 调整存储配置
global:
  scrape_interval: 30s
  evaluation_interval: 30s

# 调整存储保留时间
storage:
  tsdb:
    retention.time: 15d
    retention.size: 10GB
```

## 总结

本部署指南涵盖了基于MediaCrawler增强的微博爬取系统的完整部署流程，包括环境准备、配置优化、监控设置和故障排除。按照本指南操作，可以确保系统稳定、高效地运行在生产环境中。

如遇到问题，请参考故障排除章节或联系运维团队。