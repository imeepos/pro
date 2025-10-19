#!/bin/bash

# 微博爬虫系统数据库集成测试运行脚本
# 此脚本会启动必要的服务并运行所有集成测试

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的命令
check_dependencies() {
    log_info "检查依赖项..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装或不在 PATH 中"
        exit 1
    fi

    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm 未安装或不在 PATH 中"
        exit 1
    fi

    log_info "依赖项检查完成"
}

# 启动测试数据库服务
start_test_services() {
    log_info "启动测试数据库服务..."

    # 创建 docker-compose 测试配置
    cat > docker-compose.test.yml << EOF
version: '3.8'

services:
  postgres-test:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: test_pro_entities
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test -d test_pro_entities"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis-test:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

networks:
  default:
    name: pro_test_network
EOF

    # 启动服务
    docker-compose -f docker-compose.test.yml up -d

    # 等待服务就绪
    log_info "等待 PostgreSQL 服务就绪..."
    timeout 60 bash -c 'until docker-compose -f docker-compose.test.yml exec postgres-test pg_isready -U test -d test_pro_entities; do sleep 2; done'

    log_info "等待 Redis 服务就绪..."
    timeout 60 bash -c 'until docker-compose -f docker-compose.test.yml exec redis-test redis-cli ping; do sleep 2; done'

    log_info "测试服务启动完成"
}

# 停止测试服务
stop_test_services() {
    log_info "停止测试服务..."
    docker-compose -f docker-compose.test.yml down -v
    rm -f docker-compose.test.yml
    log_info "测试服务已停止"
}

# 安装测试依赖
install_dependencies() {
    log_info "安装测试依赖..."
    pnpm install --no-frozen-lockfile
    log_info "依赖安装完成"
}

# 运行集成测试
run_integration_tests() {
    log_info "运行集成测试..."

    # 设置测试环境变量
    export NODE_ENV=test
    export POSTGRES_HOST=localhost
    export POSTGRES_PORT=5433
    export POSTGRES_USER=test
    export POSTGRES_PASSWORD=test
    export POSTGRES_DB=test_pro_entities
    export REDIS_HOST=localhost
    export REDIS_PORT=6380
    export REDIS_DB=1
    export VERBOSE_TESTS=false

    # 运行类型检查
    log_info "执行类型检查..."
    pnpm run typecheck

    # 运行集成测试
    log_info "执行 PostgreSQL 实体集成测试..."
    pnpm test test/integration/postgres-entities.integration.test.ts --verbose

    log_info "执行 MongoDB 原始数据集成测试..."
    pnpm test test/integration/mongo-raw-data.integration.test.ts --verbose

    log_info "执行 Redis 缓存集成测试..."
    pnpm test test/integration/redis-cache.integration.test.ts --verbose

    log_info "执行跨数据库一致性测试..."
    pnpm test test/integration/cross-database-consistency.integration.test.ts --verbose

    # 生成测试覆盖率报告
    log_info "生成测试覆盖率报告..."
    pnpm test:test:cov

    log_info "所有集成测试执行完成"
}

# 清理函数
cleanup() {
    log_info "执行清理操作..."
    stop_test_services
}

# 设置错误处理
trap cleanup EXIT

# 主函数
main() {
    log_info "开始微博爬虫系统数据库集成测试"

    check_dependencies
    install_dependencies
    start_test_services
    run_integration_tests

    log_info "集成测试成功完成！"
}

# 脚本参数处理
case "${1:-}" in
    "start")
        start_test_services
        ;;
    "stop")
        stop_test_services
        ;;
    "test")
        run_integration_tests
        ;;
    "clean")
        cleanup
        ;;
    *)
        main
        ;;
esac