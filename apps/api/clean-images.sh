#!/bin/bash

# Docker镜像清理脚本
# 用法: ./clean-images.sh [options]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
Docker镜像清理脚本

用法: $0 [options]

选项:
  --dry-run        仅显示将要删除的镜像，不实际删除
  --keep COUNT     保留最近的版本数量 (默认: 5)
  --all            清理所有镜像（包括有标签的）
  --untagged       只清理无标签的镜像
  --older-than DAYS 清理超过指定天数的镜像
  --force          强制删除，不询问确认
  --registry REG   指定镜像仓库地址
  --image NAME     指定镜像名称 (默认: microinfra-api)
  --help, -h       显示此帮助信息

示例:
  $0                                    # 清理旧版本，保留5个
  $0 --keep 3                          # 保留最近3个版本
  $0 --dry-run                         # 预览将要删除的镜像
  $0 --untagged                        # 清理无标签镜像
  $0 --older-than 30                   # 清理30天前的镜像
  $0 --force --keep 2                  # 强制清理，只保留2个版本

EOF
}

# 解析命令行参数
parse_args() {
    DRY_RUN=false
    KEEP_COUNT=5
    CLEAN_ALL=false
    UNTAGGED_ONLY=false
    OLDER_THAN=0
    FORCE=false
    REGISTRY=""
    IMAGE_NAME="microinfra-api"

    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --keep)
                KEEP_COUNT="$2"
                shift 2
                ;;
            --all)
                CLEAN_ALL=true
                shift
                ;;
            --untagged)
                UNTAGGED_ONLY=true
                shift
                ;;
            --older-than)
                OLDER_THAN="$2"
                shift 2
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --registry)
                REGISTRY="$2"
                shift 2
                ;;
            --image)
                IMAGE_NAME="$2"
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
                print_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # 设置完整的镜像名称
    if [[ -n "$REGISTRY" ]]; then
        IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}"
    fi
}

# 获取镜像列表
get_image_list() {
    local pattern="^${IMAGE_NAME}:"

    if [[ "$UNTAGGED_ONLY" == "true" ]]; then
        docker images --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" | \
            grep "<none>" || true
    else
        docker images --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" | \
            grep -E "$pattern" || true
    fi
}

# 按时间过滤镜像
filter_by_age() {
    local days="$1"
    if [[ "$days" -gt 0 ]]; then
        local cutoff_date=$(date -d "$days days ago" +%Y-%m-%d)
        awk -v cutoff="$cutoff_date" '$2 < cutoff {print $0}'
    else
        cat
    fi
}

# 分析镜像使用情况
analyze_image_usage() {
    print_info "分析镜像使用情况..."

    # 统计镜像数量
    local total_images=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep "^${IMAGE_NAME}:" | wc -l)
    local total_size=$(docker images --format "{{.Repository}}:{{.Tag}}\t{{.Size}}" | grep "^${IMAGE_NAME}:" | awk '{sum += $2} END {print sum}' | numfmt --to=iec 2>/dev/null || echo "N/A")

    print_info "总镜像数量: $total_images"
    print_info "总占用空间: $total_size"

    # 统计版本分布
    echo
    print_info "版本分布:"
    docker images --format "{{.Tag}}\t{{.CreatedAt}}" | grep "^${IMAGE_NAME}:" | \
        sed "s/^${IMAGE_NAME}://g" | \
        awk '{
            if ($1 ~ /^v[0-9]+\.[0-9]+\.[0-9]+$/) {
                split($1, ver, ".")
                maj = ver[1]
                key = maj "." ver[2] ".*"
                versions[key]++
            } else {
                others[$1]++
            }
        }
        END {
            for (v in versions) {
                printf "  %s: %d 个版本\n", v, versions[v]
            }
            for (o in others) {
                printf "  %s: %d 个版本\n", o, others[o]
            }
        }'
}

# 识别需要保留的镜像
identify_keep_images() {
    local keep_count="$1"
    local all_images_file="$2"
    local keep_images_file="$3"

    # 始终保留的重要标签
    local important_tags=("latest" "stable" "production" "staging")

    # 保留带有重要标签的镜像
    for tag in "${important_tags[@]}"; do
        if docker image inspect "${IMAGE_NAME}:${tag}" >/dev/null 2>&1; then
            echo "${IMAGE_NAME}:${tag}" >> "$keep_images_file"
        fi
    done

    # 保留每个主版本的最新版本
    awk -F':' -v image="$IMAGE_NAME" '
    $1 ~ "^" image ":v[0-9]+" {
        split($2, ver, ".")
        maj = ver[1] "." ver[2]
        if (!(maj in latest_ver) || $2 > latest_ver[maj]) {
            latest_ver[maj] = $2
        }
    }
    END {
        for (maj in latest_ver) {
            print image ":" latest_ver[maj]
        }
    }' "$all_images_file" >> "$keep_images_file"

    # 保留最近的版本（除了已保留的）
    sort -k2 -r "$all_images_file" | head -n "$keep_count" | cut -d: -f1-2 >> "$keep_images_file"

    # 去重
    sort -u "$keep_images_file" > "${keep_images_file}.tmp"
    mv "${keep_images_file}.tmp" "$keep_images_file"
}

# 生成清理计划
generate_cleanup_plan() {
    local all_images_file="$1"
    local keep_images_file="$2"
    local cleanup_plan_file="$3"

    # 找出需要删除的镜像
    while IFS= read -r image; do
        if ! grep -q "^${image}$" "$keep_images_file"; then
            echo "$image" >> "$cleanup_plan_file"
        fi
    done < "$all_images_file"
}

# 显示清理计划
show_cleanup_plan() {
    local cleanup_plan_file="$1"

    if [[ ! -s "$cleanup_plan_file" ]]; then
        print_info "没有需要清理的镜像"
        return 0
    fi

    print_warning "将要删除以下镜像:"
    cat "$cleanup_plan_file" | while read -r image; do
        local size=$(docker images --format "{{.Size}}" "$image" 2>/dev/null || echo "N/A")
        echo "  - $image ($size)"
    done

    local count=$(wc -l < "$cleanup_plan_file")
    local total_size=$(cat "$cleanup_plan_file" | xargs -r docker images --format "{{.Size}}" | \
        awk '{sum += $1} END {print sum}' 2>/dev/null | numfmt --to=iec 2>/dev/null || echo "N/A")

    echo
    print_info "总计删除: $count 个镜像，释放空间: $total_size"
}

# 执行清理
execute_cleanup() {
    local cleanup_plan_file="$1"

    if [[ ! -s "$cleanup_plan_file" ]]; then
        print_info "没有需要清理的镜像"
        return 0
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
        print_warning "预览模式 - 不会实际删除镜像"
        return 0
    fi

    if [[ "$FORCE" != "true" ]]; then
        echo
        read -p "确认删除这些镜像吗? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "操作已取消"
            return 0
        fi
    fi

    print_info "开始清理镜像..."

    local deleted_count=0
    local failed_count=0

    while IFS= read -r image; do
        if [[ -n "$image" ]]; then
            if docker rmi "$image" 2>/dev/null; then
                echo "  ✓ 删除: $image"
                ((deleted_count++))
            else
                echo "  ✗ 失败: $image"
                ((failed_count++))
            fi
        fi
    done < "$cleanup_plan_file"

    echo
    print_success "清理完成!"
    print_info "成功删除: $deleted_count 个镜像"
    if [[ "$failed_count" -gt 0 ]]; then
        print_warning "删除失败: $failed_count 个镜像"
    fi

    # 清理悬空镜像
    if [[ "$CLEAN_ALL" == "true" ]]; then
        print_info "清理悬空镜像..."
        local dangling_removed=$(docker image prune -f | grep "Total reclaimed space" | awk '{print $4}' || echo "0")
        print_info "悬空镜像清理完成，释放空间: $dangling_removed"
    fi
}

# 主函数
main() {
    print_info "Docker镜像清理脚本启动"

    # 解析参数
    parse_args "$@"

    # 验证参数
    if ! [[ "$KEEP_COUNT" =~ ^[0-9]+$ ]] || [[ "$KEEP_COUNT" -lt 1 ]]; then
        print_error "保留数量必须是大于0的整数"
        exit 1
    fi

    # 分析镜像使用情况
    analyze_image_usage

    # 获取镜像列表
    echo
    print_info "获取镜像列表..."

    local temp_dir=$(mktemp -d)
    trap "rm -rf $temp_dir" EXIT

    local all_images_file="$temp_dir/all_images.txt"
    local keep_images_file="$temp_dir/keep_images.txt"
    local cleanup_plan_file="$temp_dir/cleanup_plan.txt"

    # 获取所有镜像
    get_image_list > "$all_images_file"

    if [[ ! -s "$all_images_file" ]]; then
        print_info "没有找到相关镜像"
        exit 0
    fi

    # 按时间过滤
    if [[ "$OLDER_THAN" -gt 0 ]]; then
        print_info "过滤超过 $OLDER_THAN 天的镜像..."
        filter_by_age "$OLDER_THAN" < "$all_images_file" > "${all_images_file}.filtered"
        mv "${all_images_file}.filtered" "$all_images_file"
    fi

    # 识别需要保留的镜像
    identify_keep_images "$KEEP_COUNT" "$all_images_file" "$keep_images_file"

    # 生成清理计划
    generate_cleanup_plan "$all_images_file" "$keep_images_file" "$cleanup_plan_file"

    # 显示清理计划
    echo
    show_cleanup_plan "$cleanup_plan_file"

    # 显示保留的镜像
    echo
    print_info "将保留以下镜像:"
    cat "$keep_images_file" | while read -r image; do
        local size=$(docker images --format "{{.Size}}" "$image" 2>/dev/null || echo "N/A")
        echo "  ✓ $image ($size)"
    done

    # 执行清理
    if [[ -s "$cleanup_plan_file" ]]; then
        echo
        execute_cleanup "$cleanup_plan_file"
    else
        print_success "所有镜像都符合保留策略，无需清理"
    fi
}

# 执行主函数
main "$@"