#!/bin/bash
set -euo pipefail

readonly SCRIPT_NAME="${0##*/}"
readonly LOG_PREFIX="[$SCRIPT_NAME]"

log_info() {
    echo "${LOG_PREFIX} 🚀 $*" >&2
}

log_success() {
    echo "${LOG_PREFIX} ✅ $*" >&2
}

log_error() {
    echo "${LOG_PREFIX} ❌ $*" >&2
}

log_warning() {
    echo "${LOG_PREFIX} ⚠️  $*" >&2
}

install_pm2() {
    if ! command -v pm2 &> /dev/null; then
        log_info "安装 PM2..."
        bun add -g pm2
        log_success "PM2 安装完成"
    else
        log_info "PM2 已安装: $(pm2 --version)"
    fi
}

validate_build_artifacts() {
    local missing_services=()
    local services=("api" "broker" "crawler" "cleaner")

    for service in "${services[@]}"; do
        local main_js="/app/apps/${service}/dist/main.js"
        if [[ ! -f "$main_js" ]]; then
            missing_services+=("$service")
        fi
    done

    if [[ ${#missing_services[@]} -gt 0 ]]; then
        log_error "以下服务的构建产物缺失:"
        for service in "${missing_services[@]}"; do
            log_error "  - apps/${service}/dist/main.js"
        done
        log_info "请先运行构建命令: bun run build"
        exit 1
    fi

    log_success "所有服务构建产物验证通过"
}

setup_pm2_environment() {
    # 设置 PM2 环境变量
    export PM2_HOME="/tmp/.pm2"
    export PM2_LOG_DATE_FORMAT="YYYY-MM-DD HH:mm:ss Z"

    # 创建 PM2 目录
    mkdir -p "$PM2_HOME"

    log_info "PM2 环境配置完成"
}

wait_for_services() {
    local services=("api:3000" "broker:3003" "crawler:3001" "cleaner:3002")
    local max_attempts=30
    local attempt=0

    log_info "等待服务启动..."

    for service_port in "${services[@]}"; do
        local service="${service_port%:*}"
        local port="${service_port#*:}"

        attempt=0
        while [[ $attempt -lt $max_attempts ]]; do
            if curl -sf "http://localhost:${port}/health" >/dev/null 2>&1; then
                log_success "${service} 服务已就绪 (端口: ${port})"
                break
            fi

            ((attempt++))
            if [[ $attempt -eq $max_attempts ]]; then
                log_warning "${service} 服务启动超时 (端口: ${port})"
            else
                sleep 2
            fi
        done
    done
}

start_backend_services() {
    log_info "启动后端服务集群..."

    # 停止现有的 PM2 进程
    pm2 kill >/dev/null 2>&1 || true

    # 启动服务
    pm2 start ecosystem.config.js

    # 显示状态
    pm2 status
    pm2 logs --lines 10

    log_success "后端服务集群启动完成"
}

setup_health_check() {
    # 创建统一健康检查端点脚本
    cat > /tmp/health_check.js << 'EOF'
const http = require('http');

const services = [
    { name: 'api', port: 3000 },
    { name: 'broker', port: 3003 },
    { name: 'crawler', port: 3001 },
    { name: 'cleaner', port: 3002 }
];

async function checkService(service) {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${service.port}/health`, (res) => {
            resolve({ name: service.name, status: res.statusCode === 200 ? 'healthy' : 'unhealthy' });
        });

        req.on('error', () => {
            resolve({ name: service.name, status: 'unreachable' });
        });

        req.setTimeout(5000, () => {
            req.destroy();
            resolve({ name: service.name, status: 'timeout' });
        });
    });
}

async function healthCheck() {
    const results = await Promise.all(services.map(checkService));
    const allHealthy = results.every(r => r.status === 'healthy');

    console.log(JSON.stringify({
        status: allHealthy ? 'healthy' : 'unhealthy',
        services: results,
        timestamp: new Date().toISOString()
    }));

    process.exit(allHealthy ? 0 : 1);
}

healthCheck();
EOF

    chmod +x /tmp/health_check.js
    log_info "健康检查脚本创建完成"
}

setup_signal_handling() {
    # 优雅关闭处理
    trap 'log_info "接收到关闭信号，正在停止服务..."; pm2 kill; exit 0' INT TERM
    trap 'log_error "服务异常退出"; pm2 kill; exit 1' ERR
}

print_service_info() {
    log_info "==================== 服务信息 ===================="
    log_info "🎯 API 服务:      http://localhost:3000"
    log_info "🔄 Broker 服务:   http://localhost:3003"
    log_info "🕷️  Crawler 服务:  http://localhost:3001"
    log_info "🧹 Cleaner 服务:  http://localhost:3002"
    log_info ""
    log_info "📊 PM2 监控:      pm2 monit"
    log_info "📝 查看日志:      pm2 logs"
    log_info "🔄 重启服务:      pm2 restart <service>"
    log_info "⛔ 停止所有:      pm2 kill"
    log_info "=================================================="
}

main() {
    log_info "🚀 Pro 开发环境 - 多服务容器启动中..."

    setup_signal_handling

    # 验证工作目录
    if [[ ! -f "/app/ecosystem.config.js" ]]; then
        log_error "ecosystem.config.js 文件不存在"
        exit 1
    fi

    cd /app
    log_info "工作目录: $(pwd)"
    log_info "Node 版本: $(node --version)"

    # 安装和配置 PM2
    install_pm2
    setup_pm2_environment

    # 验证构建产物
    validate_build_artifacts

    # 设置健康检查
    setup_health_check

    # 启动服务
    start_backend_services

    # 等待服务就绪
    wait_for_services

    # 显示服务信息
    print_service_info

    log_success "所有后端服务已启动完成！"

    # 保持容器运行并显示日志
    log_info "容器将保持运行，按 Ctrl+C 停止所有服务"
    pm2 logs
}

main "$@"