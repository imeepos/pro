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

    # 构建镜像
    docker buildx build --platform linux/amd64 -f $DOCKERFILE -t $IMAGE_NAME $BUILD_CONTEXT

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
