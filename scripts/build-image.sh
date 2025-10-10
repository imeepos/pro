#!/bin/bash

# 简化的Docker构建脚本
# 使用方法: ./scripts/build-image.sh [service]
# 如果不指定服务，则构建所有服务

set -e

# 获取git commit hash
GIT_COMMIT=$(git rev-parse --short HEAD)

# 获取服务参数，如果未指定则构建所有服务
SERVICE=${1:-"all"}

# 服务配置函数
get_service_config() {
    local service=$1
    case $service in
        "api")
            echo "docker.io/imeepos/api:$GIT_COMMIT|apps/api/Dockerfile.playwright|."
            ;;
        "web")
            echo "docker.io/imeepos/web:$GIT_COMMIT|apps/web/Dockerfile|."
            ;;
        "admin")
            echo "docker.io/imeepos/admin:$GIT_COMMIT|apps/admin/Dockerfile|."
            ;;
        "broker")
            echo "docker.io/imeepos/broker:$GIT_COMMIT|apps/broker/Dockerfile|."
            ;;
        "crawler")
            echo "docker.io/imeepos/crawler:$GIT_COMMIT|apps/crawler/Dockerfile|."
            ;;
        "cleaner")
            echo "docker.io/imeepos/cleaner:$GIT_COMMIT|apps/cleaner/Dockerfile|."
            ;;
        *)
            echo ""
            ;;
    esac
}

# 获取所有服务列表
get_all_services() {
    echo "api web admin broker crawler cleaner"
}

# 检查是否存在旧镜像作为缓存源
check_cache_source() {
    local service=$1
    local config=$(get_service_config "$service")
    local IMAGE_NAME=$(echo "$config" | cut -d'|' -f1)
    local LATEST_IMAGE_NAME="${IMAGE_NAME%:*}:latest"

    # 去除 docker.io/ 前缀，因为 Docker images 命令默认不显示这个前缀
    local SHORT_IMAGE_NAME="${IMAGE_NAME#docker.io/}"
    local SHORT_LATEST_IMAGE_NAME="${LATEST_IMAGE_NAME#docker.io/}"

    echo "🔍 检查缓存镜像..." >&2
    echo "📋 完整名称: $LATEST_IMAGE_NAME" >&2
    echo "📋 短名称: $SHORT_LATEST_IMAGE_NAME" >&2

    # 检查是否存在 latest 标签的镜像（先尝试短名称）
    if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${SHORT_LATEST_IMAGE_NAME}$"; then
        echo "🎯 发现缓存镜像: $SHORT_LATEST_IMAGE_NAME" >&2
        echo "$SHORT_LATEST_IMAGE_NAME"
        return 0
    fi

    # 再尝试完整名称
    if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${LATEST_IMAGE_NAME}$"; then
        echo "🎯 发现缓存镜像: $LATEST_IMAGE_NAME" >&2
        echo "$LATEST_IMAGE_NAME"
        return 0
    fi

    # 检查是否存在其他版本的镜像
    local latest_tag=$(docker images --format "{{.Repository}}:{{.Tag}} {{.CreatedAt}}" | grep "^${SHORT_IMAGE_NAME%:*}:" | sort -k2 -r | head -1 | awk '{print $1}')
    if [ -n "$latest_tag" ]; then
        echo "🎯 发现缓存镜像: $latest_tag" >&2
        echo "$latest_tag"
        return 0
    fi

    echo "❌ 未找到缓存镜像" >&2
    return 1
}

# 构建单个服务
build_service() {
    local service=$1
    local config=$(get_service_config "$service")

    if [ -z "$config" ]; then
        echo "❌ 错误: 不支持的服务 '$service'"
        echo "支持的服务: api, web, admin, broker, crawler, cleaner, all"
        exit 1
    fi

    IMAGE_NAME=$(echo "$config" | cut -d'|' -f1)
    DOCKERFILE=$(echo "$config" | cut -d'|' -f2)
    BUILD_CONTEXT=$(echo "$config" | cut -d'|' -f3)

    echo "🚀 开始构建 $service 服务..."
    echo "📦 镜像名称: $IMAGE_NAME"
    echo "📄 Dockerfile: $DOCKERFILE"
    echo "📁 构建上下文: $BUILD_CONTEXT"

    # 检查Dockerfile是否存在
    if [ ! -f "$DOCKERFILE" ]; then
        echo "❌ 错误: Dockerfile不存在: $DOCKERFILE"
        return 1
    fi

    # 设置缓存参数
    local CACHE_ARGS=""
    local BUILD_FROM_BASE="node:20-alpine"

    # 检查缓存源
    local CACHE_SOURCE=$(check_cache_source "$service")
    local CACHE_CHECK_RESULT=$?

    if [ $CACHE_CHECK_RESULT -eq 0 ] && [ -n "$CACHE_SOURCE" ]; then
        echo "🚀 使用缓存镜像: $CACHE_SOURCE"
        CACHE_ARGS="--cache-from $CACHE_SOURCE"
        BUILD_FROM_BASE="$CACHE_SOURCE"
    else
        echo "🔧 使用基础镜像: node:20-alpine"
    fi

    # 构建镜像，启用 inline cache
    # 如果使用缓存镜像，避免从远程仓库导入缓存以解决权限问题
    docker buildx build \
        --platform linux/amd64 \
        -f $DOCKERFILE \
        -t $IMAGE_NAME \
        --build-arg BUILD_FROM_BASE="$BUILD_FROM_BASE" \
        --cache-to type=inline,mode=max \
        $BUILD_CONTEXT

    # 添加 latest 标签
    local LATEST_IMAGE_NAME="${IMAGE_NAME%:*}:latest"
    docker tag $IMAGE_NAME $LATEST_IMAGE_NAME

    echo "✅ $service 服务构建完成！"
    echo "📦 标签: $IMAGE_NAME, $LATEST_IMAGE_NAME"
    echo ""
}

# 主逻辑
if [ "$SERVICE" = "all" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🚀 开始构建所有服务 Docker 镜像"
    echo "🔖 Git Commit: $GIT_COMMIT"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # 构建所有服务
    for service in $(get_all_services); do
        build_service "$service"
    done

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 所有服务构建完成！"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 可用镜像:"
    for service in $(get_all_services); do
        local config=$(get_service_config "$service")
        IMAGE_NAME=$(echo "$config" | cut -d'|' -f1)
        local LATEST_IMAGE_NAME="${IMAGE_NAME%:*}:latest"
        echo "   - $IMAGE_NAME"
        echo "   - $LATEST_IMAGE_NAME"
    done
    echo ""
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🚀 开始构建 Docker 镜像"
    echo "🔖 Git Commit: $GIT_COMMIT"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # 构建指定服务
    build_service "$SERVICE"

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 构建完成！"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 可用镜像:"
    echo "   - $IMAGE_NAME"
    LATEST_IMAGE_NAME="${IMAGE_NAME%:*}:latest"
    echo "   - $LATEST_IMAGE_NAME"
    echo ""
fi

echo "🏃 运行示例:"
echo "   使用 commit hash: docker run -p 3000:3000 $IMAGE_NAME"
echo "   使用 latest 标签: docker run -p 3000:3000 $LATEST_IMAGE_NAME"
