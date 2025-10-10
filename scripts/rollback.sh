#!/bin/bash

# 镜像回滚管理脚本
# 使用方法: ./scripts/rollback.sh <service> [target-version]
# 示例:
#   ./scripts/rollback.sh api                    # 列出可用版本
#   ./scripts/rollback.sh api v1.2.2             # 回滚到指定版本
#   ./scripts/rollback.sh api --show-current     # 显示当前运行版本

set -e

# ===========================
# 配置区域
# ===========================

# 镜像仓库地址 (可通过环境变量覆盖)
REGISTRY=${REGISTRY:-"your-registry.com/pro"}

# 支持的服务列表
SERVICES=("api" "web" "admin" "crawler" "cleaner" "broker")

# Docker Compose 文件路径
COMPOSE_FILE=${COMPOSE_FILE:-"docker-compose.yml"}

# ===========================
# 函数定义
# ===========================

# 显示使用帮助
show_usage() {
    echo "📖 使用方法: $0 <service> [target-version]"
    echo ""
    echo "服务列表:"
    for svc in "${SERVICES[@]}"; do
        echo "  - $svc"
    done
    echo ""
    echo "示例:"
    echo "  $0 api                      # 列出可用版本"
    echo "  $0 api v1.2.2               # 回滚到指定版本"
    echo "  $0 api --show-current       # 显示当前运行版本"
    echo ""
    echo "环境变量:"
    echo "  REGISTRY                    # 镜像仓库地址 (默认: your-registry.com/pro)"
    echo "  COMPOSE_FILE                # Docker Compose 文件 (默认: docker-compose.yml)"
    exit 1
}

# 检查服务是否支持
validate_service() {
    local service=$1
    for svc in "${SERVICES[@]}"; do
        if [[ "$svc" == "$service" ]]; then
            return 0
        fi
    done
    echo "❌ 错误: 不支持的服务 '$service'"
    echo "支持的服务: ${SERVICES[*]}"
    exit 1
}

# 获取容器名称
get_container_name() {
    local service=$1
    local container_name=$(docker-compose -f "$COMPOSE_FILE" ps -q "$service" 2>/dev/null | head -1)

    if [[ -z "$container_name" ]]; then
        # 尝试通过 docker ps 查找
        container_name=$(docker ps --filter "name=${service}" --format "{{.Names}}" | head -1)
    fi

    echo "$container_name"
}

# 获取当前运行版本
get_current_version() {
    local service=$1
    local container_name=$(get_container_name "$service")

    if [[ -z "$container_name" ]]; then
        echo "未运行"
        return
    fi

    # 尝试从容器标签获取版本
    local version=$(docker inspect "$container_name" --format '{{index .Config.Labels "version"}}' 2>/dev/null)

    if [[ -z "$version" ]] || [[ "$version" == "<no value>" ]]; then
        # 尝试从镜像标签获取
        local image=$(docker inspect "$container_name" --format '{{.Config.Image}}' 2>/dev/null)
        version=$(echo "$image" | grep -oP ':[^:]+$' | sed 's/://')
    fi

    echo "${version:-unknown}"
}

# 列出可用的版本标签
list_available_versions() {
    echo "📋 最近 10 个可用版本 (Git Tags):"
    echo ""
    git tag -l "v*" --sort=-version:refname | head -10 | while read -r tag; do
        local commit=$(git rev-list -n 1 "$tag" 2>/dev/null)
        local short_commit=$(echo "$commit" | cut -c1-7)
        local date=$(git log -1 --format=%ai "$tag" 2>/dev/null | cut -d' ' -f1)
        local message=$(git tag -l --format='%(contents:subject)' "$tag")
        echo "  🏷️  $tag ($short_commit) - $date"
        echo "      $message"
        echo ""
    done
}

# 显示当前版本
show_current_version() {
    local service=$1
    local current_version=$(get_current_version "$service")
    local container_name=$(get_container_name "$service")

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 当前运行版本信息"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 服务名称: $service"
    echo "🏷️  当前版本: $current_version"

    if [[ -n "$container_name" ]]; then
        echo "🐳 容器名称: $container_name"
        local image=$(docker inspect "$container_name" --format '{{.Config.Image}}' 2>/dev/null)
        echo "🖼️  镜像名称: $image"
        local created=$(docker inspect "$container_name" --format '{{.Created}}' 2>/dev/null)
        echo "🕐 创建时间: $created"
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# 执行回滚
perform_rollback() {
    local service=$1
    local target_version=$2

    local current_version=$(get_current_version "$service")
    local image_name="${REGISTRY}/${service}:${target_version}"

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔄 准备回滚服务"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 服务名称:   $service"
    echo "📉 当前版本:   $current_version"
    echo "📈 目标版本:   $target_version"
    echo "🎯 目标镜像:   $image_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # 确认回滚操作
    read -p "⚠️  确认执行回滚操作? (y/N): " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 取消回滚操作"
        exit 0
    fi

    # 检查目标镜像是否存在
    echo "🔍 检查目标镜像..."
    if ! docker image inspect "$image_name" &> /dev/null; then
        echo "⚠️  本地未找到镜像,尝试从仓库拉取..."
        if ! docker pull "$image_name"; then
            echo "❌ 错误: 无法拉取镜像 $image_name"
            echo "请检查版本标签是否正确,或运行构建脚本创建该版本镜像"
            exit 1
        fi
    fi

    echo "✅ 目标镜像已就绪"
    echo ""

    # 更新服务镜像
    echo "🔄 正在更新服务..."

    # 方法1: 使用 docker-compose (推荐)
    if [[ -f "$COMPOSE_FILE" ]]; then
        # 临时修改环境变量
        export IMAGE_TAG="$target_version"

        # 停止服务
        echo "⏸️  停止服务 $service..."
        docker-compose -f "$COMPOSE_FILE" stop "$service"

        # 更新并启动服务
        echo "🚀 启动新版本..."
        docker-compose -f "$COMPOSE_FILE" up -d "$service"
    else
        # 方法2: 直接使用 docker 命令
        local container_name=$(get_container_name "$service")

        if [[ -n "$container_name" ]]; then
            echo "⏸️  停止容器 $container_name..."
            docker stop "$container_name"
            docker rm "$container_name"
        fi

        echo "🚀 启动新容器..."
        docker run -d \
            --name "pro-${service}" \
            --network pro_backend \
            "$image_name"
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ 回滚完成!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # 等待服务启动
    echo "⏳ 等待服务启动..."
    sleep 5

    # 验证回滚结果
    echo "🔍 验证回滚结果..."
    local new_version=$(get_current_version "$service")
    echo "📊 当前运行版本: $new_version"

    # 检查容器状态
    local container_name=$(get_container_name "$service")
    if [[ -n "$container_name" ]]; then
        local status=$(docker inspect "$container_name" --format '{{.State.Status}}' 2>/dev/null)
        echo "🐳 容器状态: $status"

        if [[ "$status" == "running" ]]; then
            echo "✅ 服务运行正常"

            # 显示最近日志
            echo ""
            echo "📋 最近日志 (最后 10 行):"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            docker logs --tail 10 "$container_name"
        else
            echo "⚠️  警告: 服务状态异常"
            echo "查看完整日志: docker logs $container_name"
        fi
    else
        echo "⚠️  警告: 未找到运行中的容器"
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ===========================
# 参数解析
# ===========================

if [[ $# -lt 1 ]]; then
    show_usage
fi

SERVICE=$1
TARGET_VERSION=$2

# 验证服务
validate_service "$SERVICE"

# 根据参数执行不同操作
if [[ -z "$TARGET_VERSION" ]]; then
    # 未指定版本,显示可用版本列表
    show_current_version "$SERVICE"
    echo ""
    list_available_versions
    echo ""
    echo "💡 提示: 运行 '$0 $SERVICE <version>' 回滚到指定版本"
elif [[ "$TARGET_VERSION" == "--show-current" ]]; then
    # 显示当前版本
    show_current_version "$SERVICE"
else
    # 执行回滚
    perform_rollback "$SERVICE" "$TARGET_VERSION"
fi
