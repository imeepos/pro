#!/bin/bash

# Git Tag 版本化镜像构建脚本
# 使用方法: ./scripts/build-image.sh <service> [version]
# 示例:
#   ./scripts/build-image.sh api                 # 使用当前 commit hash
#   ./scripts/build-image.sh api v1.2.3          # 使用指定版本标签
#   ./scripts/build-image.sh web $(git describe --tags)  # 使用 git describe

set -e

# ===========================
# 配置区域
# ===========================

# 镜像仓库地址 (可通过环境变量覆盖)
REGISTRY=${REGISTRY:-"your-registry.com/pro"}

# 支持的服务列表
SERVICES=("api" "web" "admin" "crawler" "cleaner" "broker")

# ===========================
# 函数定义
# ===========================

# 显示使用帮助
show_usage() {
    echo "📖 使用方法: $0 <service> [version]"
    echo ""
    echo "服务列表:"
    for svc in "${SERVICES[@]}"; do
        echo "  - $svc"
    done
    echo ""
    echo "示例:"
    echo "  $0 api                      # 使用当前 commit hash 构建"
    echo "  $0 api v1.2.3               # 使用指定版本标签构建"
    echo "  $0 web \$(git describe --tags)  # 使用 git describe 构建"
    echo ""
    echo "环境变量:"
    echo "  REGISTRY                    # 镜像仓库地址 (默认: your-registry.com/pro)"
    echo "  DOCKER_BUILDKIT=1           # 启用 BuildKit (推荐)"
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

# 获取 Dockerfile 路径
get_dockerfile() {
    local service=$1
    local dockerfile="apps/${service}/Dockerfile"

    # 特殊处理: api 服务使用 Dockerfile.playwright
    if [[ "$service" == "api" ]] && [[ -f "apps/api/Dockerfile.playwright" ]]; then
        dockerfile="apps/api/Dockerfile.playwright"
    fi

    if [[ ! -f "$dockerfile" ]]; then
        echo "❌ 错误: Dockerfile 不存在: $dockerfile"
        exit 1
    fi

    echo "$dockerfile"
}

# ===========================
# 参数解析
# ===========================

if [[ $# -lt 1 ]]; then
    show_usage
fi

SERVICE=$1
VERSION=${2:-$(git rev-parse --short HEAD)}

# 验证服务
validate_service "$SERVICE"

# 获取构建元数据
GIT_COMMIT=$(git rev-parse --short HEAD)
BUILD_TIME=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
DOCKERFILE=$(get_dockerfile "$SERVICE")

# 生成镜像标签
IMAGE_TAG="${VERSION}"
IMAGE_NAME="${REGISTRY}/${SERVICE}:${IMAGE_TAG}"
IMAGE_LATEST="${REGISTRY}/${SERVICE}:latest"

# ===========================
# 显示构建信息
# ===========================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 开始构建 Docker 镜像"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 服务名称:   $SERVICE"
echo "🏷️  版本标签:   $VERSION"
echo "🔖 Git Commit: $GIT_COMMIT"
echo "🕐 构建时间:   $BUILD_TIME"
echo "📄 Dockerfile: $DOCKERFILE"
echo "🎯 镜像名称:   $IMAGE_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ===========================
# 构建镜像
# ===========================

echo "🔨 正在构建镜像..."

# 启用 BuildKit 并使用缓存
export DOCKER_BUILDKIT=1

docker buildx build \
    --platform linux/amd64 \
    --build-arg BUILD_VERSION="${VERSION}" \
    --build-arg BUILD_TIME="${BUILD_TIME}" \
    --build-arg GIT_COMMIT="${GIT_COMMIT}" \
    --build-arg BUILD_TYPE="release" \
    --cache-from "${IMAGE_LATEST}" \
    --tag "${IMAGE_NAME}" \
    --tag "${IMAGE_LATEST}" \
    --target production \
    --file "${DOCKERFILE}" \
    .

echo "✅ 镜像构建完成"
echo ""

# ===========================
# 推送镜像
# ===========================

read -p "是否推送镜像到仓库? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📤 正在推送镜像..."
    docker push "${IMAGE_NAME}"
    docker push "${IMAGE_LATEST}"
    echo "✅ 镜像推送完成"
else
    echo "⏭️  跳过镜像推送"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 构建完成!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 可用镜像标签:"
echo "   - ${IMAGE_NAME}"
echo "   - ${IMAGE_LATEST}"
echo ""
echo "🏃 本地运行命令:"
echo "   docker run -p 3000:3000 ${IMAGE_NAME}"
echo ""
echo "🔄 更新 docker-compose.yml 服务:"
echo "   docker-compose up -d ${SERVICE}"
echo ""
echo "🏷️  创建 Git Tag (如果尚未创建):"
echo "   git tag -a ${VERSION} -m \"Release ${VERSION}\""
echo "   git push origin ${VERSION}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
