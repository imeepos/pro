#!/bin/bash

# ============================================
# 开发环境启动脚本
# ============================================
# 用途：一键启动完整开发环境
# 功能：
# - 检查环境依赖
# - 构建开发镜像
# - 启动所有服务
# - 显示服务状态
# ============================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi

    if ! command -v docker compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi

    log_success "依赖检查通过"
}

# 检查环境变量
check_env() {
    log_info "检查环境变量..."

    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            log_warning ".env 文件不存在，从 .env.example 复制..."
            cp .env.example .env
            log_success "已创建 .env 文件，请检查配置"
        else
            log_error ".env 和 .env.example 文件都不存在"
            exit 1
        fi
    fi

    log_success "环境变量检查通过"
}

# 清理旧容器
clean_old() {
    log_info "清理旧容器..."
    docker compose -f docker-compose.dev.all.yml down 2>/dev/null || true
    log_success "清理完成"
}

# 构建开发镜像
build_image() {
    log_info "构建开发镜像..."
    docker build -f Dockerfile.dev -t pro-dev:latest .
    log_success "镜像构建完成"
}

# 启动服务
start_services() {
    log_info "启动所有服务..."
    docker compose -f docker-compose.dev.all.yml up -d
    log_success "服务启动完成"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务就绪..."

    services=("postgres" "redis" "rabbitmq" "mongo" "minio")
    for service in "${services[@]}"; do
        log_info "等待 $service..."
        timeout=60
        counter=0

        while [ $counter -lt $timeout ]; do
            if docker compose -f docker-compose.dev.all.yml ps $service | grep -q "healthy"; then
                log_success "$service 已就绪"
                break
            fi

            counter=$((counter + 1))
            if [ $counter -eq $timeout ]; then
                log_error "$service 启动超时"
                exit 1
            fi

            sleep 1
        done
    done

    log_success "所有基础服务已就绪"
}

# 显示服务状态
show_status() {
    echo ""
    log_info "==================================="
    log_info "服务状态"
    log_info "==================================="
    docker compose -f docker-compose.dev.all.yml ps
    echo ""
    log_info "==================================="
    log_info "服务访问地址"
    log_info "==================================="
    echo -e "${GREEN}后端服务：${NC}"
    echo "  • API:        http://localhost:3000"
    echo "  • Crawler:    http://localhost:3001"
    echo "  • Cleaner:    http://localhost:3002"
    echo "  • Broker:     http://localhost:3003"
    echo ""
    echo -e "${GREEN}前端服务：${NC}"
    echo "  • Admin:      http://localhost:4201"
    echo "  • Web:        http://localhost:4200"
    echo ""
    echo -e "${GREEN}基础设施：${NC}"
    echo "  • PostgreSQL: localhost:5432"
    echo "  • Redis:      localhost:6379"
    echo "  • RabbitMQ:   http://localhost:15672"
    echo "  • MongoDB:    localhost:27017"
    echo "  • MinIO:      http://localhost:9001"
    echo ""
    log_info "==================================="
}

# 查看日志
view_logs() {
    log_info "查看开发容器日志 (Ctrl+C 退出)..."
    docker compose -f docker-compose.dev.all.yml logs -f dev
}

# 主流程
main() {
    echo ""
    log_info "==================================="
    log_info "启动开发环境"
    log_info "==================================="
    echo ""

    check_dependencies
    check_env
    clean_old
    build_image
    start_services
    wait_for_services
    show_status

    echo ""
    log_success "开发环境启动完成！"
    echo ""
    log_info "提示："
    echo "  • 查看日志: docker compose -f docker-compose.dev.all.yml logs -f dev"
    echo "  • 停止服务: docker compose -f docker-compose.dev.all.yml down"
    echo "  • 重启服务: docker compose -f docker-compose.dev.all.yml restart dev"
    echo ""

    # 询问是否查看日志
    read -p "是否查看开发容器日志? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        view_logs
    fi
}

# 执行主流程
main
