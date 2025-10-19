#!/bin/bash

# 集成测试运行脚本
#
# 这个脚本提供了运行集成测试的便捷方式
# 支持不同类型的测试：全部、快速、性能、特定模块等

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    cat << EOF
微博爬虫系统 - 集成测试运行器

用法: $0 [选项] [测试类型]

测试类型:
  all                 运行所有集成测试 (默认)
  fast                运行快速测试
  performance         运行性能测试
  auth                运行认证相关测试
  weibo               运行微博相关测试
  search              运行搜索相关测试
  crawl               运行爬取数据相关测试
  coverage            运行测试并生成覆盖率报告

选项:
  -h, --help          显示此帮助信息
  -v, --verbose       详细输出
  -w, --watch         监视模式
  --ci                CI模式 (无交互)
  --timeout MS        设置超时时间 (毫秒)
  --max-workers N     设置最大工作进程数
  --test-name PATTERN 运行匹配模式的测试

示例:
  $0 all                    # 运行所有测试
  $0 fast                   # 运行快速测试
  $0 performance            # 运行性能测试
  $0 auth --verbose         # 运行认证测试并显示详细输出
  $0 all --coverage         # 运行所有测试并生成覆盖率报告
  $0 --test-name "*auth*"   # 运行名称包含"auth"的测试

EOF
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."

    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi

    # 检查pnpm
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm 未安装"
        exit 1
    fi

    # 检查PostgreSQL
    if ! command -v psql &> /dev/null; then
        log_warning "PostgreSQL 客户端未找到，请确保数据库正在运行"
    fi

    # 检查Redis
    if ! command -v redis-cli &> /dev/null; then
        log_warning "Redis 客户端未找到，请确保Redis正在运行"
    fi

    log_success "依赖检查完成"
}

# 设置测试环境
setup_test_environment() {
    log_info "设置测试环境..."

    # 进入API目录
    cd "$(dirname "$0")/../.."

    # 安装依赖
    if [ ! -d "node_modules" ]; then
        log_info "安装依赖..."
        pnpm install
    fi

    # 构建项目
    if [ ! -d "dist" ]; then
        log_info "构建项目..."
        pnpm run build
    fi

    # 设置环境变量
    export NODE_ENV=test
    export LOG_LEVEL=warn

    log_success "测试环境设置完成"
}

# 检查服务状态
check_services() {
    log_info "检查外部服务状态..."

    # 检查PostgreSQL
    if pg_isready -h localhost -p 5432 -U test &>/dev/null; then
        log_success "PostgreSQL 运行正常"
    else
        log_error "PostgreSQL 未运行或连接失败"
        log_info "请启动PostgreSQL: sudo systemctl start postgresql"
        exit 1
    fi

    # 检查Redis
    if redis-cli ping &>/dev/null; then
        log_success "Redis 运行正常"
    else
        log_error "Redis 未运行或连接失败"
        log_info "请启动Redis: sudo systemctl start redis"
        exit 1
    fi

    # 检查RabbitMQ (可选)
    if command -v rabbitmqctl &> /dev/null; then
        if rabbitmqctl status &>/dev/null; then
            log_success "RabbitMQ 运行正常"
        else
            log_warning "RabbitMQ 未运行，某些测试可能失败"
        fi
    else
        log_warning "RabbitMQ 未安装，某些测试可能失败"
    fi
}

# 运行测试
run_tests() {
    local test_type="$1"
    local verbose="$2"
    local watch="$3"
    local coverage="$4"
    local timeout="$5"
    local max_workers="$6"
    local test_pattern="$7"

    log_info "运行 ${test_type} 测试..."

    # 构建Jest命令
    local jest_cmd="pnpm exec jest"

    # 添加配置文件
    jest_cmd="$jest_cmd --config test/integration/test-config.ts"

    # 添加测试文件模式
    case "$test_type" in
        "all")
            jest_cmd="$jest_cmd test/integration/**/*.test.ts"
            ;;
        "fast")
            jest_cmd="$jest_cmd test/integration/**/*.test.ts --testNamePattern='fast|应该'"
            ;;
        "performance")
            jest_cmd="$jest_cmd test/integration/*performance*.test.ts"
            ;;
        "auth")
            jest_cmd="$jest_cmd test/integration/*auth*.test.ts"
            ;;
        "weibo")
            jest_cmd="$jest_cmd test/integration/*weibo-account*.test.ts"
            ;;
        "search")
            jest_cmd="$jest_cmd test/integration/*search-task*.test.ts"
            ;;
        "crawl")
            jest_cmd="$jest_cmd test/integration/*crawl-data*.test.ts"
            ;;
        "coverage")
            jest_cmd="$jest_cmd test/integration/**/*.test.ts --coverage"
            coverage="true"
            ;;
        *)
            jest_cmd="$jest_cmd test/integration/*${test_type}*.test.ts"
            ;;
    esac

    # 添加选项
    if [ "$verbose" = "true" ]; then
        jest_cmd="$jest_cmd --verbose"
    fi

    if [ "$watch" = "true" ]; then
        jest_cmd="$jest_cmd --watch"
    fi

    if [ "$coverage" = "true" ]; then
        jest_cmd="$jest_cmd --coverage --coverageDirectory=coverage/integration"
    fi

    if [ -n "$timeout" ]; then
        jest_cmd="$jest_cmd --testTimeout=$timeout"
    fi

    if [ -n "$max_workers" ]; then
        jest_cmd="$jest_cmd --maxWorkers=$max_workers"
    fi

    if [ -n "$test_pattern" ]; then
        jest_cmd="$jest_cmd --testNamePattern='$test_pattern'"
    fi

    # 运行测试
    log_info "执行命令: $jest_cmd"
    eval $jest_cmd

    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        log_success "测试执行完成"

        if [ "$coverage" = "true" ]; then
            log_info "覆盖率报告已生成: coverage/integration/lcov-report/index.html"
        fi
    else
        log_error "测试执行失败"
        exit $exit_code
    fi
}

# 清理测试环境
cleanup_test_environment() {
    log_info "清理测试环境..."

    # 清理测试数据库
    if command -v psql &> /dev/null; then
        PGPASSWORD=test psql -h localhost -p 5432 -U test -d test_integration -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" &>/dev/null || true
    fi

    # 清理Redis测试数据
    if command -v redis-cli &> /dev/null; then
        redis-cli -n 1 flushdb &>/dev/null || true
    fi

    log_success "清理完成"
}

# 主函数
main() {
    local test_type="all"
    local verbose="false"
    local watch="false"
    local coverage="false"
    local timeout=""
    local max_workers="1"
    local test_pattern=""

    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--verbose)
                verbose="true"
                shift
                ;;
            -w|--watch)
                watch="true"
                shift
                ;;
            --ci)
                verbose="true"
                max_workers="4"
                shift
                ;;
            --timeout)
                timeout="$2"
                shift 2
                ;;
            --max-workers)
                max_workers="$2"
                shift 2
                ;;
            --test-name)
                test_pattern="$2"
                shift 2
                ;;
            coverage)
                coverage="true"
                shift
                ;;
            all|fast|performance|auth|weibo|search|crawl)
                test_type="$1"
                shift
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # 显示开始信息
    echo "=========================================="
    echo "微博爬虫系统 - 集成测试运行器"
    echo "=========================================="
    echo "测试类型: $test_type"
    echo "详细输出: $verbose"
    echo "监视模式: $watch"
    echo "覆盖率报告: $coverage"
    echo "=========================================="

    # 执行测试流程
    check_dependencies
    setup_test_environment
    check_services

    # 设置清理陷阱
    trap cleanup_test_environment EXIT

    # 运行测试
    run_tests "$test_type" "$verbose" "$watch" "$coverage" "$timeout" "$max_workers" "$test_pattern"

    log_success "所有测试完成！"
}

# 运行主函数
main "$@"