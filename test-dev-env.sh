#!/bin/bash

# 开发环境测试脚本
set -euo pipefail

readonly SCRIPT_NAME="${0##*/}"
readonly LOG_PREFIX="[$SCRIPT_NAME]"

log_info() {
    echo "${LOG_PREFIX} 🧪 $*" >&2
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

# 服务健康检查
check_service_health() {
    local service_name="$1"
    local port="$2"
    local max_attempts=10
    local attempt=0

    log_info "检查 ${service_name} 服务健康状态 (端口: ${port})"

    while [[ $attempt -lt $max_attempts ]]; do
        if curl -sf "http://localhost:${port}/health" >/dev/null 2>&1; then
            log_success "${service_name} 服务正常"
            return 0
        fi

        ((attempt++))
        if [[ $attempt -lt $max_attempts ]]; then
            log_info "第 ${attempt}/${max_attempts} 次尝试失败，等待 3 秒后重试..."
            sleep 3
        fi
    done

    log_error "${service_name} 服务健康检查失败"
    return 1
}

# 检查容器状态
check_container_status() {
    log_info "检查容器状态"

    local containers=("pro-backend-dev" "pro-web-dev" "pro-admin-dev")
    local all_running=true

    for container in "${containers[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "^${container}$"; then
            log_success "容器 ${container} 正在运行"
        else
            log_error "容器 ${container} 未运行"
            all_running=false
        fi
    done

    if [[ "$all_running" == "false" ]]; then
        log_error "部分容器未运行，请检查 docker-compose 状态"
        return 1
    fi

    return 0
}

# 检查PM2进程状态
check_pm2_processes() {
    log_info "检查 PM2 进程状态"

    local pm2_output
    if pm2_output=$(docker exec pro-backend-dev pm2 jlist 2>/dev/null); then
        local processes=(api broker crawler cleaner)

        for process in "${processes[@]}"; do
            if echo "$pm2_output" | grep -q "\"name\":\"${process}\"" && echo "$pm2_output" | grep -q "\"status\":\"online\""; then
                log_success "PM2 进程 ${process} 正常运行"
            else
                log_warning "PM2 进程 ${process} 状态异常"
            fi
        done
    else
        log_error "无法获取 PM2 进程状态"
        return 1
    fi
}

# 检查网络连通性
check_network_connectivity() {
    log_info "检查服务间网络连通性"

    # 测试后端服务间通信
    if docker exec pro-backend-dev curl -sf "http://localhost:3000/health" >/dev/null 2>&1; then
        log_success "后端容器内部网络正常"
    else
        log_error "后端容器内部网络异常"
        return 1
    fi

    # 测试前端访问后端
    if docker exec pro-web-dev curl -sf "http://backend:3000/health" >/dev/null 2>&1; then
        log_success "前端到后端网络连通正常"
    else
        log_warning "前端到后端网络连通可能存在问题"
    fi
}

# 性能检查
check_resource_usage() {
    log_info "检查资源使用情况"

    local stats_output
    if stats_output=$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null | grep -E "(pro-backend-dev|pro-web-dev|pro-admin-dev)"); then
        echo
        echo "容器资源使用情况:"
        echo "容器名称\t\t\tCPU使用率\t内存使用"
        echo "----------------------------------------"
        echo "$stats_output"
        echo
    else
        log_warning "无法获取容器资源使用情况"
    fi
}

# 主测试流程
main() {
    log_info "🚀 开始测试开发环境"
    echo

    # 检查容器状态
    if ! check_container_status; then
        log_error "容器状态检查失败，退出测试"
        exit 1
    fi
    echo

    # 等待服务启动
    log_info "等待服务完全启动 (30秒)"
    sleep 30
    echo

    # 检查 PM2 进程
    check_pm2_processes
    echo

    # 检查服务健康状态
    local services=(
        "API:3000"
        "Broker:3003"
        "Crawler:3001"
        "Cleaner:3002"
        "Web:8080"
        "Admin:8081"
    )

    local failed_services=()
    for service_port in "${services[@]}"; do
        local service="${service_port%:*}"
        local port="${service_port#*:}"

        if ! check_service_health "$service" "$port"; then
            failed_services+=("$service")
        fi
    done
    echo

    # 检查网络连通性
    check_network_connectivity
    echo

    # 检查资源使用
    check_resource_usage

    # 测试结果总结
    echo "==================== 测试结果 ===================="
    if [[ ${#failed_services[@]} -eq 0 ]]; then
        log_success "🎉 所有服务测试通过！开发环境运行正常"
        echo
        log_info "快速访问链接:"
        log_info "🎯 API 服务:      http://localhost:3000"
        log_info "🔄 Broker 服务:   http://localhost:3003"
        log_info "🕷️  Crawler 服务:  http://localhost:3001"
        log_info "🧹 Cleaner 服务:  http://localhost:3002"
        log_info "🌐 Web 应用:      http://localhost:8080"
        log_info "⚙️  Admin 后台:    http://localhost:8081"
        echo
        log_info "管理命令:"
        log_info "📊 查看PM2状态:   docker exec pro-backend-dev pm2 status"
        log_info "📝 查看日志:      docker compose -f docker-compose.dev.yml logs -f"
        log_info "🔄 重启服务:      docker exec pro-backend-dev pm2 restart <service>"
        exit 0
    else
        log_error "以下服务测试失败: ${failed_services[*]}"
        log_info "请检查日志: docker compose -f docker-compose.dev.yml logs"
        exit 1
    fi
}

main "$@"