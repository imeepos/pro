#!/bin/bash

# 前端构建脚本
set -euo pipefail

readonly SCRIPT_NAME="${0##*/}"
readonly LOG_PREFIX="[$SCRIPT_NAME]"

log_info() {
    echo "${LOG_PREFIX} 🏗️  $*" >&2
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

# 显示帮助信息
show_help() {
    cat << EOF
前端构建脚本

用法: $0 [选项] [应用名]

参数:
  应用名              构建指定应用 (web, admin, all)

选项:
  --prod              生产环境构建
  --dev               开发环境构建 (默认)
  --clean             构建前清理
  --watch             监听模式
  --help, -h          显示此帮助信息

示例:
  $0                  # 构建所有前端应用
  $0 web              # 只构建 web 应用
  $0 admin --prod     # 生产环境构建 admin
  $0 --clean all      # 清理后构建所有应用

EOF
}

# 解析参数
parse_args() {
    APP_NAME="all"
    BUILD_MODE="development"
    CLEAN=false
    WATCH=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --prod)
                BUILD_MODE="production"
                shift
                ;;
            --dev)
                BUILD_MODE="development"
                shift
                ;;
            --clean)
                CLEAN=true
                shift
                ;;
            --watch)
                WATCH=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            web|admin|all)
                APP_NAME="$1"
                shift
                ;;
            -*)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# 清理构建产物
clean_build() {
    local app="$1"
    local app_path="apps/$app"

    if [[ -d "$app_path/dist" ]]; then
        log_info "清理 $app 构建产物..."
        rm -rf "$app_path/dist"
        log_success "$app 构建产物已清理"
    fi
}

# 检查应用存在
check_app_exists() {
    local app="$1"
    local app_path="apps/$app"

    if [[ ! -d "$app_path" ]]; then
        log_error "应用不存在: $app_path"
        return 1
    fi

    if [[ ! -f "$app_path/package.json" ]]; then
        log_error "无效的应用目录: $app_path (缺少 package.json)"
        return 1
    fi

    return 0
}

# 构建单个应用
build_app() {
    local app="$1"
    local app_path="apps/$app"

    log_info "开始构建 $app..."

    # 检查应用存在
    if ! check_app_exists "$app"; then
        return 1
    fi

    # 清理（如果需要）
    if [[ "$CLEAN" == "true" ]]; then
        clean_build "$app"
    fi

    # 进入应用目录
    cd "$app_path"

    # 检查依赖
    if [[ ! -d "node_modules" ]]; then
        log_warning "$app 依赖未安装，正在安装..."
        bun install
    fi

    # 构建命令
    local build_cmd="bun run build"
    if [[ "$BUILD_MODE" == "production" ]]; then
        build_cmd="bun run build --configuration=production"
    fi

    # 监听模式
    if [[ "$WATCH" == "true" ]]; then
        build_cmd="bun run watch"
        log_info "启动 $app 监听模式..."
    fi

    # 执行构建
    local start_time=$(date +%s)

    if eval "$build_cmd"; then
        local end_time=$(date +%s)
        local build_time=$((end_time - start_time))

        # 检查构建产物
        local expected_dist=""
        case "$app" in
            web)
                expected_dist="dist/web/browser"
                ;;
            admin)
                expected_dist="dist/admin/browser"
                ;;
        esac

        if [[ -n "$expected_dist" && -d "$expected_dist" ]]; then
            local dist_size=$(du -sh "$expected_dist" | cut -f1)
            log_success "$app 构建完成！耗时: ${build_time}秒，大小: $dist_size"
            log_info "构建产物: $app_path/$expected_dist"
        else
            log_success "$app 构建完成！耗时: ${build_time}秒"
        fi
    else
        log_error "$app 构建失败"
        return 1
    fi

    # 返回根目录
    cd - >/dev/null
}

# 验证构建产物
verify_build() {
    local app="$1"
    local app_path="apps/$app"

    local expected_files=("index.html")
    local dist_path=""

    case "$app" in
        web)
            dist_path="$app_path/dist/web/browser"
            ;;
        admin)
            dist_path="$app_path/dist/admin/browser"
            ;;
    esac

    if [[ -z "$dist_path" ]]; then
        log_warning "$app 验证跳过：未知的构建产物路径"
        return 0
    fi

    log_info "验证 $app 构建产物..."

    for file in "${expected_files[@]}"; do
        if [[ ! -f "$dist_path/$file" ]]; then
            log_error "$app 构建产物验证失败：缺少 $file"
            return 1
        fi
    done

    log_success "$app 构建产物验证通过"
}

# 显示构建总结
show_summary() {
    local apps=("$@")
    local failed_apps=()

    log_info "==================== 构建总结 ===================="

    for app in "${apps[@]}"; do
        if ! verify_build "$app"; then
            failed_apps+=("$app")
        fi
    done

    if [[ ${#failed_apps[@]} -eq 0 ]]; then
        log_success "🎉 所有应用构建成功！"
        echo
        log_info "下一步:"
        log_info "1. 启动开发环境: docker compose -f docker-compose.dev.yml up -d"
        log_info "2. 查看应用:"
        log_info "   - Web:   http://localhost:8080"
        log_info "   - Admin: http://localhost:8081"
    else
        log_error "以下应用构建失败: ${failed_apps[*]}"
        exit 1
    fi
}

# 主函数
main() {
    log_info "🏗️ 前端构建脚本启动"

    # 解析参数
    parse_args "$@"

    # 验证工作目录
    if [[ ! -f "package.json" ]]; then
        log_error "请在项目根目录运行此脚本"
        exit 1
    fi

    log_info "构建模式: $BUILD_MODE"
    log_info "目标应用: $APP_NAME"
    if [[ "$CLEAN" == "true" ]]; then
        log_info "清理模式: 启用"
    fi
    if [[ "$WATCH" == "true" ]]; then
        log_info "监听模式: 启用"
    fi

    echo

    # 确定要构建的应用
    local apps_to_build=()
    case "$APP_NAME" in
        all)
            apps_to_build=("web" "admin")
            ;;
        web|admin)
            apps_to_build=("$APP_NAME")
            ;;
        *)
            log_error "不支持的应用: $APP_NAME"
            exit 1
            ;;
    esac

    # 构建应用
    local built_apps=()
    for app in "${apps_to_build[@]}"; do
        if build_app "$app"; then
            built_apps+=("$app")
        else
            log_error "应用 $app 构建失败"
            exit 1
        fi
        echo
    done

    # 监听模式下不显示总结
    if [[ "$WATCH" != "true" ]]; then
        show_summary "${built_apps[@]}"
    fi
}

# 执行主函数
main "$@"