#!/bin/bash

# Docker 镜像清理脚本
# 使用方法: ./scripts/clean-images.sh [service] [keep-count]
# 示例:
#   ./scripts/clean-images.sh                    # 清理所有服务的旧镜像
#   ./scripts/clean-images.sh api 5              # 保留 api 服务最近 5 个版本
#   ./scripts/clean-images.sh --dangling         # 清理悬空镜像

set -e

# ===========================
# 配置区域
# ===========================

# 镜像仓库地址 (可通过环境变量覆盖)
REGISTRY=${REGISTRY:-"your-registry.com/pro"}

# 支持的服务列表
SERVICES=("api" "web" "admin" "crawler" "cleaner" "broker")

# 默认保留的镜像版本数
DEFAULT_KEEP_COUNT=5

# ===========================
# 函数定义
# ===========================

# 显示使用帮助
show_usage() {
    echo "📖 使用方法: $0 [service] [keep-count]"
    echo ""
    echo "参数:"
    echo "  service                     # 服务名称 (可选,默认所有服务)"
    echo "  keep-count                  # 保留版本数 (可选,默认 $DEFAULT_KEEP_COUNT)"
    echo ""
    echo "服务列表:"
    for svc in "${SERVICES[@]}"; do
        echo "  - $svc"
    done
    echo ""
    echo "示例:"
    echo "  $0                          # 清理所有服务,保留最近 $DEFAULT_KEEP_COUNT 个版本"
    echo "  $0 api                      # 清理 api 服务,保留最近 $DEFAULT_KEEP_COUNT 个版本"
    echo "  $0 api 10                   # 清理 api 服务,保留最近 10 个版本"
    echo "  $0 --dangling               # 仅清理悬空镜像 (dangling images)"
    echo "  $0 --all                    # 清理所有未使用的镜像"
    echo ""
    echo "环境变量:"
    echo "  REGISTRY                    # 镜像仓库地址 (默认: your-registry.com/pro)"
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

# 清理悬空镜像
clean_dangling_images() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧹 清理悬空镜像 (dangling images)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    local dangling_images=$(docker images -f "dangling=true" -q)

    if [[ -z "$dangling_images" ]]; then
        echo "✅ 没有找到悬空镜像"
        return
    fi

    local count=$(echo "$dangling_images" | wc -l)
    echo "🔍 找到 $count 个悬空镜像"
    echo ""

    read -p "确认删除这些悬空镜像? (y/N): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker rmi $dangling_images
        echo "✅ 悬空镜像清理完成"
    else
        echo "❌ 取消清理操作"
    fi
}

# 清理所有未使用的镜像
clean_all_unused_images() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧹 清理所有未使用的镜像"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚠️  警告: 这将删除所有未被容器使用的镜像"
    echo ""

    read -p "确认执行此操作? (y/N): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker image prune -a -f
        echo "✅ 未使用镜像清理完成"
    else
        echo "❌ 取消清理操作"
    fi
}

# 清理指定服务的旧镜像
clean_service_images() {
    local service=$1
    local keep_count=$2

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧹 清理服务镜像"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 服务名称: $service"
    echo "🔢 保留版本: $keep_count"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # 获取服务的所有镜像 (按创建时间排序)
    local image_pattern="${REGISTRY}/${service}"
    local images=$(docker images "$image_pattern" --format "{{.ID}}|{{.Tag}}|{{.CreatedAt}}" | \
                   grep -v "latest" | \
                   sort -t'|' -k3 -r)

    if [[ -z "$images" ]]; then
        echo "ℹ️  未找到 $service 服务的镜像"
        return
    fi

    local total_count=$(echo "$images" | wc -l)
    echo "🔍 找到 $total_count 个镜像版本"
    echo ""

    # 显示将要保留的镜像
    echo "✅ 将保留的镜像 (最新 $keep_count 个):"
    echo "$images" | head -n "$keep_count" | while IFS='|' read -r id tag created; do
        echo "  📌 $tag ($id) - $created"
    done
    echo ""

    # 显示将要删除的镜像
    local delete_count=$((total_count - keep_count))
    if [[ $delete_count -le 0 ]]; then
        echo "ℹ️  没有需要删除的镜像"
        return
    fi

    echo "🗑️  将删除的镜像 (旧 $delete_count 个):"
    echo "$images" | tail -n "+$((keep_count + 1))" | while IFS='|' read -r id tag created; do
        echo "  ❌ $tag ($id) - $created"
    done
    echo ""

    # 确认删除操作
    read -p "确认删除这 $delete_count 个旧镜像? (y/N): " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 取消清理操作"
        return
    fi

    # 执行删除
    local deleted=0
    local failed=0

    echo "$images" | tail -n "+$((keep_count + 1))" | while IFS='|' read -r id tag created; do
        echo "🗑️  删除镜像: $tag ($id)"
        if docker rmi "${image_pattern}:${tag}" 2>/dev/null; then
            ((deleted++)) || true
        else
            echo "  ⚠️  删除失败 (可能正在使用中)"
            ((failed++)) || true
        fi
    done

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ 清理完成"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 删除统计: 成功 $deleted 个"
    if [[ $failed -gt 0 ]]; then
        echo "⚠️  失败 $failed 个 (可能正在使用中)"
    fi
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# 清理所有服务的旧镜像
clean_all_services() {
    local keep_count=$1

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧹 清理所有服务的旧镜像"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔢 保留版本: $keep_count"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    for service in "${SERVICES[@]}"; do
        clean_service_images "$service" "$keep_count"
        echo ""
    done
}

# 显示磁盘使用情况
show_disk_usage() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "💾 Docker 磁盘使用情况"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    docker system df
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ===========================
# 参数解析
# ===========================

# 显示清理前的磁盘使用情况
echo "清理前磁盘使用情况:"
show_disk_usage
echo ""

# 特殊参数处理
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    show_usage
elif [[ "$1" == "--dangling" ]]; then
    clean_dangling_images
    exit 0
elif [[ "$1" == "--all" ]]; then
    clean_all_unused_images
    exit 0
fi

# 解析参数
SERVICE=$1
KEEP_COUNT=${2:-$DEFAULT_KEEP_COUNT}

# 验证保留数量
if ! [[ "$KEEP_COUNT" =~ ^[0-9]+$ ]] || [[ "$KEEP_COUNT" -lt 1 ]]; then
    echo "❌ 错误: 保留数量必须是大于 0 的整数"
    exit 1
fi

# 执行清理
if [[ -z "$SERVICE" ]]; then
    # 清理所有服务
    clean_all_services "$KEEP_COUNT"
else
    # 验证服务名称
    validate_service "$SERVICE"
    # 清理指定服务
    clean_service_images "$SERVICE" "$KEEP_COUNT"
fi

# 显示清理后的磁盘使用情况
echo ""
echo "清理后磁盘使用情况:"
show_disk_usage
echo ""
echo "💡 提示: 运行 'docker system prune' 清理更多未使用的资源"
