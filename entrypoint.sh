#!/bin/bash
set -euo pipefail

readonly SCRIPT_NAME="${0##*/}"
readonly LOG_PREFIX="[$SCRIPT_NAME]"

log_info() {
    echo "${LOG_PREFIX} 🎨 $*" >&2
}

log_success() {
    echo "${LOG_PREFIX} ✅ $*" >&2
}

log_error() {
    echo "${LOG_PREFIX} ❌ $*" >&2
}

detect_service_type() {
    local service="${SERVICE_NAME:-}"

    if [[ -z "$service" ]]; then
        log_error "SERVICE_NAME 环境变量未设置"
        exit 1
    fi

    case "$service" in
        api|broker|crawler|cleaner)
            echo "nestjs"
            ;;
        web|admin)
            echo "angular"
            ;;
        *)
            log_error "未知服务类型: $service"
            exit 1
            ;;
    esac
}

start_nestjs_service() {
    local service="${SERVICE_NAME}"
    local app_path="/app/apps/${service}"
    local dist_path="/app/apps/${service}/dist"

    log_info "启动 NestJS 服务: $service"

    if [[ ! -d "$app_path" ]]; then
        log_error "服务目录不存在: $app_path"
        exit 1
    fi

    if [[ ! -f "${dist_path}/main.js" ]]; then
        log_error "构建产物不存在: ${dist_path}/main.js"
        log_info "可用构建产物:"
        find /app/apps -name "main.js" -type f 2>/dev/null || log_info "未找到任何 main.js 文件"
        exit 1
    fi

    cd "$app_path"
    log_success "工作目录: $app_path"

    export NODE_ENV="${NODE_ENV:-production}"
    export PORT="${PORT:-3000}"

    log_info "执行命令: node ${dist_path}/main.js"
    exec node "${dist_path}/main.js"
}

start_angular_service() {
    local service="${SERVICE_NAME}"
    local dist_path="/app/apps/${service}/dist/${service}/browser"

    log_info "启动 Angular 服务: $service"

    if [[ ! -d "$dist_path" ]]; then
        log_error "构建产物不存在: $dist_path"
        log_info "可用构建产物:"
        find /app/apps -type d -name "dist" 2>/dev/null || log_info "未找到服务构建目录"
        exit 1
    fi

    # 创建 nginx 配置
    cat > /etc/nginx/conf.d/default.conf << EOF
server {
    listen 80;
    server_name localhost;
    root ${dist_path};
    index index.html;

    # 启用 gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Angular 路由支持
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

    log_success "Nginx 配置完成"
    log_info "静态文件目录: $dist_path"

    # 启动 nginx
    log_info "启动 Nginx"
    exec nginx -g "daemon off;"
}

setup_error_handling() {
    trap 'log_error "服务启动失败，退出码: $?"' ERR
    trap 'log_info "接收到中断信号，正在退出..."' INT TERM
}

validate_environment() {
    if [[ -z "${SERVICE_NAME:-}" ]]; then
        log_error "必须设置 SERVICE_NAME 环境变量"
        log_info "支持的服务: api, broker, crawler, cleaner, web, admin"
        exit 1
    fi

    log_info "服务名称: $SERVICE_NAME"
    log_info "工作目录: $(pwd)"
    log_info "Node 版本: $(node --version 2>/dev/null || echo "未安装")"
}

main() {
    setup_error_handling
    validate_environment

    local service_type
    service_type="$(detect_service_type)"

    log_info "检测到服务类型: $service_type"

    case "$service_type" in
        nestjs)
            start_nestjs_service
            ;;
        angular)
            start_angular_service
            ;;
        *)
            log_error "不支持的服务类型: $service_type"
            exit 1
            ;;
    esac
}

main "$@"