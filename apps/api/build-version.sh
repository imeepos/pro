#!/bin/bash

# Docker镜像增量构建脚本
# 用法: ./build-version.sh [base_version] [new_version] [options]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    cat << EOF
Docker镜像增量构建脚本

用法: $0 [base_version] [new_version] [options]

参数:
  base_version    基础版本号 (默认: latest)
  new_version     新版本号 (默认: 自动生成)

选项:
  --update-deps    更新依赖包
  --push           构建后推送到镜像仓库
  --full           执行完整构建（不使用增量模式）
  --clean          构建前清理旧镜像
  --tag TAG        额外的标签
  --registry REG   指定镜像仓库地址
  --help, -h       显示此帮助信息

示例:
  $0 latest v1.0.1
  $0 v1.0.0 v1.0.1 --update-deps --push
  $0 v1.0.1 --full --clean
  $0 --help

版本号格式:
  - v1.0.0  (主版本.次版本.补丁版本)
  - v1.0.0-rc1 (发布候选版本)
  - v1.0.0-beta (测试版本)

EOF
}

# 解析命令行参数
parse_args() {
    BASE_VERSION="latest"
    NEW_VERSION=""
    UPDATE_DEPS=false
    PUSH=false
    FULL_BUILD=false
    CLEAN=false
    EXTRA_TAGS=()
    REGISTRY=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            --update-deps)
                UPDATE_DEPS=true
                shift
                ;;
            --push)
                PUSH=true
                shift
                ;;
            --full)
                FULL_BUILD=true
                shift
                ;;
            --clean)
                CLEAN=true
                shift
                ;;
            --tag)
                EXTRA_TAGS+=("$2")
                shift 2
                ;;
            --registry)
                REGISTRY="$2"
                shift 2
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            -*)
                print_error "未知选项: $1"
                show_help
                exit 1
                ;;
            *)
                if [[ -z "$BASE_VERSION" || "$BASE_VERSION" == "latest" ]]; then
                    BASE_VERSION="$1"
                elif [[ -z "$NEW_VERSION" ]]; then
                    NEW_VERSION="$1"
                else
                    print_error "参数过多: $1"
                    exit 1
                fi
                shift
                ;;
        esac
    done
}

# 自动生成版本号
generate_version() {
    local base_version="$1"

    if [[ "$base_version" =~ ^v([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
        local major="${BASH_REMATCH[1]}"
        local minor="${BASH_REMATCH[2]}"
        local patch="${BASH_REMATCH[3]}"

        # 补丁版本+1
        patch=$((patch + 1))
        echo "v${major}.${minor}.${patch}"
    else
        # 如果无法解析，使用时间戳
        echo "v$(date +%Y%m%d-%H%M%S)"
    fi
}

# 获取Git信息
get_git_info() {
    GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    GIT_CLEAN=$(git diff-index --quiet HEAD -- && echo "true" || echo "false")
}

# 检查基础镜像是否存在
check_base_image() {
    local base_tag="$1"

    print_info "检查基础镜像: $base_tag"

    if docker image inspect "$base_tag" >/dev/null 2>&1; then
        print_success "基础镜像存在: $base_tag"
        return 0
    else
        print_warning "基础镜像不存在: $base_tag"
        return 1
    fi
}

# 清理旧镜像
clean_old_images() {
    local image_name="$1"
    local keep_count=5

    print_info "清理旧镜像，保留最近 $keep_count 个版本..."

    # 获取所有标签，按创建时间排序，删除旧版本
    local old_images=$(docker images --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" | \
                      grep "^$image_name:" | \
                      grep -v "$image_name:latest" | \
                      sort -k2 -r | \
                      tail -n +$((keep_count + 1)) | \
                      awk '{print $1}')

    if [[ -n "$old_images" ]]; then
        echo "$old_images" | xargs -r docker rmi
        print_success "已清理旧镜像"
    else
        print_info "没有需要清理的镜像"
    fi
}

# 构建镜像
build_image() {
    local base_version="$1"
    local new_version="$2"
    local dockerfile="$3"
    local image_name="$4"

    print_info "开始构建镜像..."
    print_info "基础版本: $base_version"
    print_info "新版本: $new_version"
    print_info "Dockerfile: $dockerfile"
    print_info "更新依赖: $UPDATE_DEPS"

    # 构建参数
    local build_args=(
        "--build-arg" "BASE_VERSION=$base_version"
        "--build-arg" "BUILD_VERSION=$new_version"
        "--build-arg" "BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
        "--build-arg" "GIT_COMMIT=$GIT_COMMIT"
        "--build-arg" "UPDATE_DEPENDENCIES=$UPDATE_DEPS"
        "--build-arg" "BUILD_TYPE=incremental"
    )

    # 执行构建
    local start_time=$(date +%s)

    docker build \
        "${build_args[@]}" \
        -f "$dockerfile" \
        -t "${image_name}:${new_version}" \
        .

    local end_time=$(date +%s)
    local build_time=$((end_time - start_time))

    # 添加额外标签
    for tag in "${EXTRA_TAGS[@]}"; do
        docker tag "${image_name}:${new_version}" "${image_name}:${tag}"
    done

    # 更新 latest 标签
    docker tag "${image_name}:${new_version}" "${image_name}:latest"

    print_success "镜像构建完成！"
    print_info "构建耗时: ${build_time}秒"
    print_info "镜像标签: ${image_name}:${new_version}"

    # 显示镜像信息
    docker images "${image_name}:${new_version}"
}

# 推送镜像
push_image() {
    local image_name="$1"
    local version="$2"

    print_info "推送镜像到仓库..."

    # 推送版本标签
    docker push "${image_name}:${version}"

    # 推送 latest 标签
    docker push "${image_name}:latest"

    # 推送额外标签
    for tag in "${EXTRA_TAGS[@]}"; do
        docker push "${image_name}:${tag}"
    done

    print_success "镜像推送完成"
}

# 验证镜像
verify_image() {
    local image_name="$1"
    local version="$2"

    print_info "验证镜像..."

    # 检查镜像是否存在
    if ! docker image inspect "${image_name}:${version}" >/dev/null 2>&1; then
        print_error "镜像验证失败: ${image_name}:${version} 不存在"
        return 1
    fi

    # 检查镜像大小
    local image_size=$(docker images --format "{{.Size}}" "${image_name}:${version}")
    print_info "镜像大小: $image_size"

    # 检查构建信息
    print_info "构建信息:"
    docker inspect "${image_name}:${version}" --format='{{range .Config.Labels}}{{println .}}{{end}}' | grep -E "(version|build-time|git-commit)" || true

    print_success "镜像验证通过"
}

# 主函数
main() {
    print_info "Docker增量构建脚本启动"

    # 解析参数
    parse_args "$@"

    # 设置镜像名称
    local image_name="microinfra-api"
    if [[ -n "$REGISTRY" ]]; then
        image_name="${REGISTRY}/${image_name}"
    fi

    # 自动生成版本号
    if [[ -z "$NEW_VERSION" ]]; then
        NEW_VERSION=$(generate_version "$BASE_VERSION")
        print_info "自动生成版本号: $NEW_VERSION"
    fi

    # 获取Git信息
    get_git_info
    print_info "Git提交: $GIT_COMMIT (分支: $GIT_BRANCH, 干净: $GIT_CLEAN)"

    # 检查工作目录
    if [[ ! -f "Dockerfile" && ! -f "Dockerfile.incremental" ]]; then
        print_error "未找到 Dockerfile"
        exit 1
    fi

    # 选择构建模式
    local dockerfile="Dockerfile.incremental"
    if [[ "$FULL_BUILD" == "true" ]]; then
        dockerfile="Dockerfile"
        print_info "使用完整构建模式"
    else
        print_info "使用增量构建模式"
    fi

    # 检查基础镜像（仅增量模式需要）
    if [[ "$FULL_BUILD" != "true" ]]; then
        if ! check_base_image "${image_name}:${BASE_VERSION}"; then
            print_warning "基础镜像不存在，切换到完整构建模式"
            dockerfile="Dockerfile"
            FULL_BUILD=true
        fi
    fi

    # 清理旧镜像
    if [[ "$CLEAN" == "true" ]]; then
        clean_old_images "$image_name"
    fi

    # 构建镜像
    build_image "$BASE_VERSION" "$NEW_VERSION" "$dockerfile" "$image_name"

    # 验证镜像
    verify_image "$image_name" "$NEW_VERSION"

    # 推送镜像
    if [[ "$PUSH" == "true" ]]; then
        push_image "$image_name" "$NEW_VERSION"
    fi

    print_success "构建脚本执行完成！"
    print_info "镜像: ${image_name}:${NEW_VERSION}"
    print_info "大小: $(docker images --format "{{.Size}}" "${image_name}:${NEW_VERSION}")"
}

# 执行主函数
main "$@"