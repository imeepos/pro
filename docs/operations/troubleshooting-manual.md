# 基于MediaCrawler增强的微博爬取系统 - 故障排查手册
# Weibo Crawler System Troubleshooting Manual

## 目录

1. [故障分类](#故障分类)
2. [快速诊断](#快速诊断)
3. [系统故障](#系统故障)
4. [应用故障](#应用故障)
5. [数据库故障](#数据库故障)
6. [网络故障](#网络故障)
7. [监控故障](#监控故障)
8. [性能问题](#性能问题)
9. [安全事件](#安全事件)
10. [应急响应](#应急响应)

## 故障分类

### 严重级别

| 级别 | 描述 | 响应时间 | 影响范围 |
|------|------|----------|----------|
| P0 | 系统完全不可用 | 15分钟 | 全部用户 |
| P1 | 核心功能异常 | 30分钟 | 大部分用户 |
| P2 | 部分功能异常 | 2小时 | 少数用户 |
| P3 | 性能下降 | 4小时 | 非关键功能 |
| P4 | 轻微异常 | 24小时 | 内部系统 |

### 故障类型

- **系统故障**: 容器、Kubernetes、基础设施
- **应用故障**: 爬虫服务、API、业务逻辑
- **数据故障**: 数据库、缓存、存储
- **网络故障**: 连接、代理、DNS
- **监控故障**: Prometheus、Grafana、告警
- **安全事件**: 攻击、泄露、权限异常

## 快速诊断

### 1. 健康检查脚本

```bash
#!/bin/bash
# 健康检查脚本 - health-check.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查容器状态
check_containers() {
    log_info "检查容器状态..."

    containers=("crawler" "postgres" "mongodb" "redis" "rabbitmq" "nginx" "prometheus")

    for container in "${containers[@]}"; do
        if docker-compose ps | grep -q "${container}.*Up"; then
            log_info "✓ $container 运行正常"
        else
            log_error "✗ $container 状态异常"
        fi
    done
}

# 检查服务健康状态
check_services() {
    log_info "检查服务健康状态..."

    # 检查主服务
    if curl -f http://localhost/health > /dev/null 2>&1; then
        log_info "✓ 主服务健康"
    else
        log_error "✗ 主服务异常"
    fi

    # 检查API服务
    if curl -f http://localhost/api/health > /dev/null 2>&1; then
        log_info "✓ API服务健康"
    else
        log_error "✗ API服务异常"
    fi

    # 检查数据库连接
    if docker-compose exec -T postgres pg_isready -U pro > /dev/null 2>&1; then
        log_info "✓ PostgreSQL连接正常"
    else
        log_error "✗ PostgreSQL连接异常"
    fi

    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        log_info "✓ Redis连接正常"
    else
        log_error "✗ Redis连接异常"
    fi
}

# 检查资源使用
check_resources() {
    log_info "检查资源使用..."

    # CPU使用率
    cpu_usage=$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}" | grep crawler | awk '{print $2}' | sed 's/%//')
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        log_warn "CPU使用率过高: ${cpu_usage}%"
    else
        log_info "CPU使用率正常: ${cpu_usage}%"
    fi

    # 内存使用率
    mem_usage=$(docker stats --no-stream --format "table {{.Container}}\t{{.MemPerc}}" | grep crawler | awk '{print $2}' | sed 's/%//')
    if (( $(echo "$mem_usage > 85" | bc -l) )); then
        log_warn "内存使用率过高: ${mem_usage}%"
    else
        log_info "内存使用率正常: ${mem_usage}%"
    fi

    # 磁盘空间
    disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 85 ]; then
        log_warn "磁盘使用率过高: ${disk_usage}%"
    else
        log_info "磁盘使用率正常: ${disk_usage}%"
    fi
}

# 检查日志错误
check_logs() {
    log_info "检查日志错误..."

    # 检查爬虫服务错误日志
    error_count=$(docker-compose logs --tail=100 crawler 2>&1 | grep -i error | wc -l)
    if [ "$error_count" -gt 10 ]; then
        log_warn "爬虫服务错误日志较多: $error_count 条"
    else
        log_info "爬虫服务错误日志正常: $error_count 条"
    fi
}

# 主函数
main() {
    echo "=================================="
    echo "  系统健康检查"
    echo "=================================="
    echo ""

    check_containers
    echo ""
    check_services
    echo ""
    check_resources
    echo ""
    check_logs

    echo ""
    echo "健康检查完成"
}

main "$@"
```

### 2. 快速故障定位

```bash
# 查看系统整体状态
docker-compose ps
kubectl get pods -n weibo-crawler

# 查看最近的错误日志
docker-compose logs --tail=100 crawler | grep -i error
kubectl logs -n weibo-crawler deployment/crawler --tail=100 | grep -i error

# 查看资源使用情况
docker stats
kubectl top pods -n weibo-crawler

# 查看系统事件
kubectl get events -n weibo-crawler --sort-by='.lastTimestamp'
```

## 系统故障

### 1. 容器启动失败

#### 症状
- 容器无法启动
- 容器反复重启
- 容器状态为 `Error` 或 `CrashLoopBackOff`

#### 诊断步骤
```bash
# 查看容器状态
docker-compose ps
kubectl describe pod <pod-name> -n weibo-crawler

# 查看容器日志
docker-compose logs <service-name>
kubectl logs <pod-name> -n weibo-crawler

# 查看容器详细信息
docker inspect <container-id>
kubectl get pod <pod-name> -n weibo-crawler -o yaml
```

#### 常见原因和解决方案

**配置文件错误**
```bash
# 检查配置文件语法
docker-compose config

# 重新加载配置
docker-compose down && docker-compose up -d
```

**镜像拉取失败**
```bash
# 检查镜像是否存在
docker images | grep <image-name>

# 重新拉取镜像
docker-compose pull <service-name>

# 手动构建镜像
docker build -t <image-name> .
```

**资源不足**
```bash
# 查看系统资源
free -h
df -h

# 清理Docker资源
docker system prune -a

# 调整容器资源限制
vim docker-compose.yml
# 修改memory和cpu限制
```

**权限问题**
```bash
# 检查文件权限
ls -la /path/to/volume

# 修复权限
sudo chown -R 1001:1001 /path/to/volume

# 使用root用户运行（临时）
docker-compose exec --user root <service-name> bash
```

### 2. Kubernetes Pod异常

#### 症状
- Pod处于 `Pending` 状态
- Pod处于 `CrashLoopBackOff` 状态
- Pod处于 `ImagePullBackOff` 状态

#### 诊断和解决

**Pending状态**
```bash
# 查看Pod详细信息
kubectl describe pod <pod-name> -n weibo-crawler

# 检查资源配额
kubectl describe quota -n weibo-crawler

# 检查节点资源
kubectl describe nodes

# 解决方案：增加资源或调整请求
vim deployments.yaml
# 调整resources.requests和resources.limits
```

**CrashLoopBackOff状态**
```bash
# 查看Pod日志
kubectl logs <pod-name> -n weibo-crawler --previous

# 进入Pod调试
kubectl exec -it <pod-name> -n weibo-crawler -- /bin/bash

# 检查健康检查配置
kubectl get pod <pod-name> -n weibo-crawler -o yaml | grep liveness
kubectl get pod <pod-name> -n weibo-crawler -o yaml | grep readiness
```

**ImagePullBackOff状态**
```bash
# 检查镜像仓库访问权限
kubectl get secret registry-secret -n weibo-crawler -o yaml

# 手动拉取镜像测试
docker pull <image-name>

# 更新镜像拉取密钥
kubectl delete secret registry-secret -n weibo-crawler
kubectl create secret docker-registry registry-secret \
  --docker-server=<registry-url> \
  --docker-username=<username> \
  --docker-password=<password> \
  --namespace=weibo-crawler
```

## 应用故障

### 1. 爬虫服务异常

#### 症状
- 爬虫任务失败率高
- 爬取速度慢
- 反爬虫检测频繁

#### 诊断步骤
```bash
# 查看爬虫服务状态
curl http://localhost/api/health

# 查看爬虫日志
docker-compose logs -f crawler | grep -E "(ERROR|WARN)"

# 查看任务队列状态
curl http://localhost/api/crawler/queue/status

# 查看爬虫统计信息
curl http://localhost/api/crawler/stats
```

#### 常见问题和解决方案

**反爬虫检测**
```bash
# 检查当前IP是否被封禁
curl -I https://weibo.com

# 查看代理状态
curl http://localhost/api/crawler/proxy/status

# 轮换User-Agent
curl -X POST http://localhost/api/crawler/rotate-useragent

# 清除浏览器缓存
curl -X POST http://localhost/api/crawler/browser/clear-cache
```

**账号异常**
```bash
# 查看账号状态
curl http://localhost/api/crawler/accounts/status

# 轮换账号
curl -X POST http://localhost/api/crawler/accounts/rotate

# 更新账号Cookie
curl -X POST http://localhost/api/crawler/accounts/update \
  -H "Content-Type: application/json" \
  -d '{"accountId": 1, "cookie": "new_cookie"}'
```

**浏览器异常**
```bash
# 重启浏览器池
curl -X POST http://localhost/api/crawler/browser/restart

# 查看浏览器统计
curl http://localhost/api/crawler/browser/stats

# 清理僵尸浏览器进程
docker-compose exec crawler pkill -f chromium
```

### 2. API服务异常

#### 症状
- API请求超时
- API返回500错误
- 认证失败

#### 诊断和解决

**请求超时**
```bash
# 检查服务响应时间
curl -w "@curl-format.txt" -o /dev/null -s http://localhost/api/health

# 增加超时时间
curl --max-time 30 http://localhost/api/health

# 检查负载均衡器状态
docker-compose exec nginx nginx -t
```

**500错误**
```bash
# 查看详细错误日志
docker-compose logs crawler | grep -i error

# 检查数据库连接
docker-compose exec crawler npm run db:check

# 重新启动服务
docker-compose restart crawler
```

## 数据库故障

### 1. PostgreSQL故障

#### 症状
- 连接被拒绝
- 查询超时
- 数据库锁死

#### 诊断和解决

**连接失败**
```bash
# 检查PostgreSQL状态
docker-compose exec postgres pg_isready -U pro

# 检查连接数
docker-compose exec postgres psql -U pro -c "SELECT count(*) FROM pg_stat_activity;"

# 检查配置文件
docker-compose exec postgres cat /var/lib/postgresql/data/postgresql.conf | grep listen_addresses

# 重启PostgreSQL服务
docker-compose restart postgres
```

**查询超时**
```bash
# 查看慢查询
docker-compose exec postgres psql -U pro -c "
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;"

# 查看锁等待
docker-compose exec postgres psql -U pro -c "
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;"

# 终止长时间运行的查询
docker-compose exec postgres psql -U pro -c "SELECT pg_terminate_backend(pid FROM pg_stat_activity WHERE state = 'active' AND query_start < now() - interval '5 minutes');"
```

### 2. MongoDB故障

#### 症状
- 连接超时
- 副本集状态异常
- 磁盘空间不足

#### 诊断和解决

**连接问题**
```bash
# 检查MongoDB状态
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# 检查副本集状态
docker-compose exec mongodb mongosh --eval "rs.status()"

# 查看连接数
docker-compose exec mongodb mongosh --eval "db.serverStatus().connections"
```

**性能问题**
```bash
# 查看慢查询
docker-compose exec mongodb mongosh --eval "
db.setProfilingLevel(2, {slowms: 100})
db.system.profile.find().limit(5).sort({ts: -1}).pretty()"

# 查看索引使用情况
docker-compose exec mongodb mongosh --eval "
db.raw_data_sources.getIndexes()
db.raw_data_sources.aggregate([{$indexStats: {}}])"

# 创建复合索引
docker-compose exec mongodb mongosh --eval "
db.raw_data_sources.createIndex({'sourceType': 1, 'status': 1, 'createdAt': -1})"
```

### 3. Redis故障

#### 症状
- 内存使用率过高
- 连接数过多
- 缓存穿透

#### 诊断和解决

**内存问题**
```bash
# 查看内存使用情况
docker-compose exec redis redis-cli info memory

# 查看大key
docker-compose exec redis redis-cli --bigkeys

# 清理过期key
docker-compose exec redis redis-cli --scan --pattern "expired:*" | xargs redis-cli del

# 调整内存策略
docker-compose exec redis redis-cli config set maxmemory-policy allkeys-lru
```

**连接问题**
```bash
# 查看连接信息
docker-compose exec redis redis-cli info clients

# 查看慢查询日志
docker-compose exec redis redis-cli slowlog get 10

# 重置慢查询日志
docker-compose exec redis redis-cli slowlog reset
```

## 网络故障

### 1. 容器网络问题

#### 症状
- 容器间无法通信
- DNS解析失败
- 端口无法访问

#### 诊断和解决

**网络连通性测试**
```bash
# 测试容器间连通性
docker-compose exec crawler ping postgres
docker-compose exec crawler telnet postgres 5432

# 查看网络配置
docker network ls
docker network inspect weibo-crawler_default

# 重建网络
docker-compose down
docker network prune
docker-compose up -d
```

**DNS解析问题**
```bash
# 查看DNS配置
docker-compose exec crawler cat /etc/resolv.conf

# 测试DNS解析
docker-compose exec crawler nslookup postgres

# 使用IP直接连接
docker-compose exec crawler curl http://172.20.0.2:5432
```

### 2. 负载均衡器问题

#### 症状
- 502 Bad Gateway
- 504 Gateway Timeout
- 负载不均

#### 诊断和解决

**Nginx配置检查**
```bash
# 测试Nginx配置
docker-compose exec nginx nginx -t

# 重新加载配置
docker-compose exec nginx nginx -s reload

# 查看访问日志
docker-compose exec nginx tail -f /var/log/nginx/access.log

# 查看错误日志
docker-compose exec nginx tail -f /var/log/nginx/error.log
```

**后端服务检查**
```bash
# 检查后端服务状态
curl http://crawler-service:3000/health

# 查看Nginx upstream配置
docker-compose exec nginx cat /etc/nginx/conf.d/default.conf | grep upstream

# 调整健康检查配置
vim deploy/docker/default.conf
# 修改proxy_connect_timeout等参数
```

## 监控故障

### 1. Prometheus故障

#### 症状
- 数据采集失败
- 告警规则不生效
- 查询超时

#### 诊断和解决

**数据采集问题**
```bash
# 检查Prometheus配置
docker-compose exec prometheus promtool check config /etc/prometheus/prometheus.yml

# 查看targets状态
curl http://localhost:9090/api/v1/targets

# 查看服务发现
curl http://localhost:9090/api/v1/service-discovery

# 重新加载配置
curl -X POST http://localhost:9090/-/reload
```

**告警问题**
```bash
# 检查告警规则
docker-compose exec prometheus promtool check rules /etc/prometheus/rules/*.yml

# 查看当前告警
curl http://localhost:9090/api/v1/alerts

# 查看告警规则状态
curl http://localhost:9090/api/v1/rules
```

### 2. Grafana故障

#### 症状
- 仪表板无法加载
- 数据源连接失败
- 查询报错

#### 诊断和解决

**数据源连接问题**
```bash
# 测试数据源连接
curl -u admin:password http://localhost:3001/api/datasources

# 查看数据源配置
curl -u admin:password http://localhost:3001/api/datasources/1

# 重新创建数据源
curl -X POST -u admin:password \
  -H "Content-Type: application/json" \
  -d @datasource.json \
  http://localhost:3001/api/datasources
```

**仪表板问题**
```bash
# 导出仪表板配置
curl -u admin:password http://localhost:3001/api/dashboards/uid/dashboard-id

# 重新导入仪表板
curl -X POST -u admin:password \
  -H "Content-Type: application/json" \
  -d @dashboard.json \
  http://localhost:3001/api/dashboards/db
```

## 性能问题

### 1. CPU使用率过高

#### 诊断步骤
```bash
# 查看CPU使用情况
docker stats --no-stream
top

# 查看进程CPU使用
docker-compose exec crawler top

# 分析CPU热点
docker-compose exec crawler perf top -g
```

#### 优化方案

**调整并发数**
```bash
# 减少爬虫并发数
vim .env
CRAWLER_CONCURRENCY=2
BROWSER_POOL_SIZE=3

# 重启服务
docker-compose restart crawler
```

**优化代码**
```bash
# 查看性能分析日志
docker-compose logs crawler | grep "performance"

# 启用性能分析
vim .env
PROFILING_ENABLED=true

# 生成火焰图
docker-compose exec crawler npm run prof:flamegraph
```

### 2. 内存使用率过高

#### 诊断步骤
```bash
# 查看内存使用情况
free -h
docker stats --no-stream

# 查看进程内存使用
docker-compose exec crawler ps aux --sort=-%mem

# 查看内存泄漏
docker-compose exec crawler npm run memleak:detect
```

#### 优化方案

**调整内存限制**
```bash
# 增加容器内存限制
vim docker-compose.yml
services:
  crawler:
    mem_limit: 8g
```

**优化缓存**
```bash
# 清理Redis缓存
docker-compose exec redis redis-cli flushall

# 调整缓存TTL
vim .env
REDIS_CACHE_TTL=1800
```

## 安全事件

### 1. 反爬虫检测

#### 症状
- 频繁返回403错误
- IP被封禁
- 验证码增多

#### 应急响应

**立即措施**
```bash
# 暂停爬取任务
curl -X POST http://localhost/api/crawler/pause

# 切换到备用IP池
curl -X POST http://localhost/api/crawler/proxy/rotate-pool

# 增加请求间隔
curl -X POST http://localhost/api/crawler/delay/increase \
  -H "Content-Type: application/json" \
  -d '{"factor": 2.0}'
```

**长期解决方案**
```bash
# 更新User-Agent池
curl -X POST http://localhost/api/crawler/useragent/refresh

# 启用高级反检测
vim .env
ANTI_DETECTION_STEALTH_SCRIPT=true
ANTI_DETECTION_FINGERPRINTING=true
```

### 2. 数据泄露

#### 症状
- 异常数据访问
- 未授权API调用
- 敏感信息泄露

#### 应急响应

**立即措施**
```bash
# 停止所有服务
docker-compose down

# 更改所有密码
vim .env
# 更新数据库密码、API密钥等

# 检查访问日志
docker-compose logs nginx | grep -E "(401|403|429)"

# 启用审计日志
vim .env
AUDIT_LOG_ENABLED=true
```

**安全加固**
```bash
# 更新防火墙规则
ufw deny from suspicious_ip

# 启用HTTPS
vim deploy/docker/default.conf
# 配置SSL证书

# 限制API访问
vim nginx.conf
# 添加IP白名单或rate limiting
```

## 应急响应

### 1. 系统完全宕机

#### 响应流程
1. **立即响应 (0-15分钟)**
   - 确认故障范围
   - 启动应急预案
   - 通知相关人员

2. **故障诊断 (15-30分钟)**
   - 查看系统状态
   - 分析错误日志
   - 确定根本原因

3. **恢复服务 (30-60分钟)**
   - 执行恢复操作
   - 验证服务状态
   - 通知业务方

4. **事后分析 (1-24小时)**
   - 编写故障报告
   - 制定改进措施
   - 更新运维文档

#### 恢复脚本
```bash
#!/bin/bash
# 应急恢复脚本 - emergency-recovery.sh

set -e

echo "开始应急恢复..."

# 1. 停止所有服务
echo "停止所有服务..."
docker-compose down

# 2. 清理Docker资源
echo "清理Docker资源..."
docker system prune -f

# 3. 检查系统资源
echo "检查系统资源..."
df -h
free -h

# 4. 重新启动基础服务
echo "启动基础服务..."
docker-compose up -d postgres mongodb redis rabbitmq minio

# 5. 等待服务就绪
echo "等待服务就绪..."
sleep 60

# 6. 检查服务状态
echo "检查服务状态..."
docker-compose exec postgres pg_isready -U pro
docker-compose exec redis redis-cli ping

# 7. 启动应用服务
echo "启动应用服务..."
docker-compose up -d crawler nginx

# 8. 启动监控服务
echo "启动监控服务..."
docker-compose up -d prometheus grafana alertmanager

# 9. 验证服务
echo "验证服务状态..."
curl -f http://localhost/health || exit 1
curl -f http://localhost/api/health || exit 1

echo "应急恢复完成！"
```

### 2. 数据备份恢复

#### 备份策略
```bash
#!/bin/bash
# 数据备份脚本 - backup.sh

BACKUP_DIR="/backup/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# PostgreSQL备份
docker-compose exec -T postgres pg_dump -U pro pro > $BACKUP_DIR/postgres.sql

# MongoDB备份
docker-compose exec -T mongodb mongodump --username admin --password password --out $BACKUP_DIR/mongodb

# Redis备份
docker-compose exec -T redis redis-cli BGSAVE
docker cp $(docker-compose ps -q redis):/data/dump.rdb $BACKUP_DIR/

# 压缩备份
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
rm -rf $BACKUP_DIR

echo "备份完成: $BACKUP_DIR.tar.gz"
```

#### 恢复流程
```bash
#!/bin/bash
# 数据恢复脚本 - restore.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "用法: $0 <backup_file.tar.gz>"
    exit 1
fi

# 解压备份
TEMP_DIR=$(mktemp -d)
tar -xzf $BACKUP_FILE -C $TEMP_DIR

# 停止应用服务
docker-compose stop crawler

# 恢复PostgreSQL
docker-compose exec -T postgres psql -U pro -c "DROP DATABASE IF EXISTS pro;"
docker-compose exec -T postgres psql -U pro -c "CREATE DATABASE pro;"
docker-compose exec -T postgres psql -U pro pro < $TEMP_DIR/*/postgres.sql

# 恢复MongoDB
docker-compose exec -T mongodb mongorestore --username admin --password password --drop $TEMP_DIR/*/mongodb

# 恢复Redis
docker cp $TEMP_DIR/*/dump.rdb $(docker-compose ps -q redis):/data/dump.rdb
docker-compose restart redis

# 启动应用服务
docker-compose start crawler

# 清理临时文件
rm -rf $TEMP_DIR

echo "恢复完成！"
```

## 总结

本故障排查手册涵盖了基于MediaCrawler增强的微博爬取系统的常见故障场景和解决方案。运维人员应该：

1. **熟悉故障分类和严重级别**
2. **掌握快速诊断方法**
3. **了解各类故障的处理流程**
4. **定期进行故障演练**
5. **持续完善故障处理知识库**

通过系统化的故障排查流程，可以快速定位和解决问题，确保系统稳定运行。