#!/bin/bash

# ========================================
# Docker 镜像构建脚本 - 代码艺术家出品
# ========================================
# 使用方法:
#   ./scripts/build-image.sh [service] [options]
#
# 示例:
#   ./scripts/build-image.sh api
#   ./scripts/build-image.sh --service=api --tag=v1.0.0
#   ./scripts/build-image.sh all --push
# ========================================

set -euo pipefail

# ========================================
# 全局配置
# ========================================
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly REGISTRY="docker.io/imeepos"

# 构建信息
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

# 默认参数
SERVICE=""
TAG="${GIT_COMMIT}"
PUSH=false
NO_CACHE=false
BUILDKIT_INLINE_CACHE=true
PLATFORM="linux/amd64"

# ========================================
# 工具函数
# ========================================

# 打印信息
log_info() { echo -e "\033[0;36m[INFO]\033[0m $*"; }
log_success() { echo -e "\033[0;32m[SUCCESS]\033[0m $*"; }
log_warning() { echo -e "\033[0;33m[WARNING]\033[0m $*"; }
log_error() { echo -e "\033[0;31m[ERROR]\033[0m $*"; }

# 打印分隔线
print_separator() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# 显示帮助信息
show_help() {
    cat << EOF
Docker 镜像构建脚本

用法:
    $(basename "$0") [SERVICE] [OPTIONS]

参数:
    SERVICE             服务名称 (api, web, admin, broker, crawler, cleaner, all)

选项:
    --service=SERVICE   指定服务名称
    --tag=TAG          镜像标签 (默认: git commit hash)
    --push             构建后推送到远程仓库
    --no-cache         不使用缓存构建
    --platform=PLATFORM 目标平台 (默认: linux/amd64)
    -h, --help         显示帮助信息

示例:
    $(basename "$0") api
    $(basename "$0") --service=api --tag=v1.0.0
    $(basename "$0") all --push
    $(basename "$0") api --no-cache --platform=linux/arm64

EOF
    exit 0
}

# 解析命令行参数
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                ;;
            --service=*)
                SERVICE="${1#*=}"
                shift
                ;;
            --tag=*)
                TAG="${1#*=}"
                shift
                ;;
            --push)
                PUSH=true
                shift
                ;;
            --no-cache)
                NO_CACHE=true
                shift
                ;;
            --platform=*)
                PLATFORM="${1#*=}"
                shift
                ;;
            -*)
                log_error "未知选项: $1"
                show_help
                ;;
            *)
                if [[ -z "$SERVICE" ]]; then
                    SERVICE="$1"
                fi
                shift
                ;;
        esac
    done

    # 如果未指定服务，默认构建所有
    SERVICE="${SERVICE:-all}"
}

# 服务配置函数
get_service_config() {
    local service=$1
    case $service in
        api)
            echo "${REGISTRY}/api|apps/api/Dockerfile|."
            ;;
        web)
            echo "${REGISTRY}/web|apps/web/Dockerfile|."
            ;;
        admin)
            echo "${REGISTRY}/admin|apps/admin/Dockerfile|."
            ;;
        broker)
            echo "${REGISTRY}/broker|apps/broker/Dockerfile|."
            ;;
        crawler)
            echo "${REGISTRY}/crawler|apps/crawler/Dockerfile|."
            ;;
        cleaner)
            echo "${REGISTRY}/cleaner|apps/cleaner/."
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

# 验证服务名称
validate_service() {
    local service=$1
    local config

    if [[ "$service" == "all" ]]; then
        return 0
    fi

    config=$(get_service_config "$service")
    if [[ -z "$config" ]]; then
        log_error "不支持的服务: $service"
        log_info "支持的服务: $(get_all_services), all"
        exit 1
    fi
}

# 检查 Docker 环境
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "未找到 Docker，请先安装 Docker"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker 守护进程未运行"
        exit 1
    fi

    # 启用 BuildKit
    export DOCKER_BUILDKIT=1
    log_info "Docker BuildKit 已启用"
}

# 检查缓存镜像
check_cache_source() {
    local service=$1
    local image_base="${REGISTRY}/${service}"

    # 检查本地是否存在 latest 标签
    if docker image inspect "${image_base}:latest" &>/dev/null; then
        log_info "发现缓存镜像: ${image_base}:latest"
        echo "${image_base}:latest"
        return 0
    fi

    # 查找最新的镜像
    local latest_image
    latest_image=$(docker images --format "{{.Repository}}:{{.Tag}}" "${image_base}" | head -1)

    if [[ -n "$latest_image" ]]; then
        log_info "发现缓存镜像: ${latest_image}"
        echo "$latest_image"
        return 0
    fi

    log_warning "未找到缓存镜像，将进行完整构建"
    return 1
}

# 获取镜像大小
get_image_size() {
    local image=$1
    docker image inspect "$image" --format='{{.Size}}' 2>/dev/null | awk '{
        size=$1;
        if (size >= 1073741824) printf "%.2f GB", size/1073741824;
        else if (size >= 1048576) printf "%.2f MB", size/1048576;
        else if (size >= 1024) printf "%.2f KB", size/1024;
        else printf "%d B", size;
    }'
}

# 获取镜像层数
get_image_layers() {
    local image=$1
    docker image inspect "$image" --format='{{len .RootFS.Layers}}' 2>/dev/null || echo "unknown"
}

# 构建单个服务
build_service() {
    local service=$1
    local config
    local image_name
    local dockerfile
    local build_context
    local build_start
    local build_end
    local build_duration

    config=$(get_service_config "$service")
    if [[ -z "$config" ]]; then
        log_error "服务配置未找到: $service"
        return 1
    fi

    IFS='|' read -r image_base dockerfile build_context <<< "$config"
    image_name="${image_base}:${TAG}"

    print_separator
    log_info "构建服务: $service"
    log_info "镜像名称: $image_name"
    log_info "Dockerfile: $dockerfile"
    log_info "构建上下文: $build_context"
    log_info "目标平台: $PLATFORM"
    print_separator

    # 检查 Dockerfile 是否存在
    if [[ ! -f "${PROJECT_ROOT}/${dockerfile}" ]]; then
        log_error "Dockerfile 不存在: ${dockerfile}"
        return 1
    fi

    # 构建参数
    local build_args=(
        "--platform=${PLATFORM}"
        "--file=${PROJECT_ROOT}/${dockerfile}"
        "--tag=${image_name}"
        "--build-arg=BUILD_VERSION=${TAG}"
        "--build-arg=BUILD_TIME=${BUILD_TIME}"
        "--build-arg=GIT_COMMIT=${GIT_COMMIT}"
        "--build-arg=GIT_BRANCH=${GIT_BRANCH}"
    )

    # 缓存策略
    if [[ "$NO_CACHE" == "false" ]]; then
        local cache_source
        if cache_source=$(check_cache_source "$service"); then
            build_args+=("--cache-from=${cache_source}")
        fi

        if [[ "$BUILDKIT_INLINE_CACHE" == "true" ]]; then
            build_args+=("--build-arg=BUILDKIT_INLINE_CACHE=1")
        fi
    else
        build_args+=("--no-cache")
        log_warning "禁用缓存构建"
    fi

    # 添加 latest 标签
    build_args+=("--tag=${image_base}:latest")

    # 执行构建
    build_start=$(date +%s)
    log_info "开始构建..."

    if docker buildx build "${build_args[@]}" "${PROJECT_ROOT}/${build_context}"; then
        build_end=$(date +%s)
        build_duration=$((build_end - build_start))

        # 获取镜像信息
        local image_size
        local image_layers
        image_size=$(get_image_size "$image_name")
        image_layers=$(get_image_layers "$image_name")

        print_separator
        log_success "构建成功: $service"
        log_info "镜像标签: ${image_name}, ${image_base}:latest"
        log_info "镜像大小: ${image_size}"
        log_info "镜像层数: ${image_layers}"
        log_info "构建耗时: ${build_duration}s"
        print_separator

        # 推送镜像
        if [[ "$PUSH" == "true" ]]; then
            push_image "$image_name" "$image_base"
        fi

        return 0
    else
        log_error "构建失败: $service"
        return 1
    fi
}

# 推送镜像
push_image() {
    local image_name=$1
    local image_base=$2

    log_info "推送镜像: ${image_name}"
    if docker push "$image_name"; then
        log_success "推送成功: ${image_name}"
    else
        log_error "推送失败: ${image_name}"
        return 1
    fi

    log_info "推送镜像: ${image_base}:latest"
    if docker push "${image_base}:latest"; then
        log_success "推送成功: ${image_base}:latest"
    else
        log_error "推送失败: ${image_base}:latest"
        return 1
    fi
}

# ========================================
# 主函数
# ========================================
main() {
    local total_start
    local total_end
    local total_duration
    local failed_services=()
    local success_services=()

    # 解析参数
    parse_args "$@"

    # 验证环境
    check_docker

    # 验证服务
    validate_service "$SERVICE"

    # 显示构建信息
    print_separator
    log_info "Docker 镜像构建"
    log_info "Git Commit: ${GIT_COMMIT}"
    log_info "Git Branch: ${GIT_BRANCH}"
    log_info "Build Time: ${BUILD_TIME}"
    log_info "镜像标签: ${TAG}"
    log_info "目标平台: ${PLATFORM}"
    [[ "$PUSH" == "true" ]] && log_info "推送镜像: 启用"
    [[ "$NO_CACHE" == "true" ]] && log_warning "缓存: 禁用"
    print_separator

    total_start=$(date +%s)

    # 构建服务
    if [[ "$SERVICE" == "all" ]]; then
        log_info "构建所有服务"
        for service in $(get_all_services); do
            if build_service "$service"; then
                success_services+=("$service")
            else
                failed_services+=("$service")
            fi
        done
    else
        if build_service "$SERVICE"; then
            success_services+=("$SERVICE")
        else
            failed_services+=("$SERVICE")
        fi
    fi

    total_end=$(date +%s)
    total_duration=$((total_end - total_start))

    # 显示构建结果
    print_separator
    log_info "构建总结"
    print_separator
    log_info "总耗时: ${total_duration}s"

    if [[ ${#success_services[@]} -gt 0 ]]; then
        log_success "成功构建 (${#success_services[@]}): ${success_services[*]}"
    fi

    if [[ ${#failed_services[@]} -gt 0 ]]; then
        log_error "构建失败 (${#failed_services[@]}): ${failed_services[*]}"
        print_separator
        exit 1
    fi

    print_separator
    log_success "所有构建任务完成"
    print_separator
}

# 执行主函数
main "$@"
