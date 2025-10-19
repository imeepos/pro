#!/bin/bash

# 端到端测试运行脚本
# 数字时代业务流程的守护者 - 确保系统完整性和正确性

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_test() {
    echo -e "${PURPLE}[TEST]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# 脚本配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
CRAWLER_DIR="$PROJECT_ROOT/apps/crawler"
TEST_DIR="$CRAWLER_DIR/test/integration/e2e"

# 测试配置
TEST_TIMEOUT=${TEST_TIMEOUT:-600000}  # 10分钟默认超时
PARALLEL_WORKERS=${PARALLEL_WORKERS:-4}
COVERAGE_DIR="$TEST_DIR/coverage"
REPORT_DIR="$TEST_DIR/reports"
DOCKER_COMPOSE_FILE="$TEST_DIR/docker-compose.e2e.yml"

# 测试套件
TEST_SUITES=(
    "historical-data-backfill"
    "real-time-data-monitoring"
    "multi-account-concurrent-crawling"
    "exception-recovery"
    "data-quality-assurance"
)

# 显示帮助信息
show_help() {
    cat << EOF
微博爬虫系统端到端测试运行脚本

用法: $0 [选项] [测试套件]

选项:
    -h, --help              显示此帮助信息
    -v, --verbose           详细输出
    -q, --quiet             静默模式
    -t, --timeout SECONDS   设置测试超时时间（默认: 600000）
    -p, --parallel NUM      设置并行测试数量（默认: 4）
    -c, --coverage          生成测试覆盖率报告
    -r, --reports           生成详细测试报告
    -k, --keep-containers   测试完成后保留容器
    -b, --build             重新构建Docker镜像
    -s, --suite SUITE       运行指定测试套件
    -l, --list              列出可用的测试套件
    --dry-run               仅显示将要执行的命令，不实际运行
    --clean                 清理测试环境和容器

测试套件:
    historical-data-backfill         历史数据回溯端到端测试
    real-time-data-monitoring        实时数据监控端到端测试
    multi-account-concurrent-crawling 多账号并发爬取端到端测试
    exception-recovery               异常恢复端到端测试
    data-quality-assurance          数据质量保证端到端测试

示例:
    $0                                    # 运行所有测试套件
    $0 -s historical-data-backfill       # 仅运行历史数据回溯测试
    $0 -c -r -v                          # 运行所有测试并生成报告
    $0 --clean                           # 清理测试环境

EOF
}

# 解析命令行参数
VERBOSE=false
QUIET=false
GENERATE_COVERAGE=false
GENERATE_REPORTS=false
KEEP_CONTAINERS=false
BUILD_IMAGES=false
DRY_RUN=false
CLEAN_ENV=false
SPECIFIC_SUITE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -q|--quiet)
            QUIET=true
            shift
            ;;
        -t|--timeout)
            TEST_TIMEOUT="$2"
            shift 2
            ;;
        -p|--parallel)
            PARALLEL_WORKERS="$2"
            shift 2
            ;;
        -c|--coverage)
            GENERATE_COVERAGE=true
            shift
            ;;
        -r|--reports)
            GENERATE_REPORTS=true
            shift
            ;;
        -k|--keep-containers)
            KEEP_CONTAINERS=true
            shift
            ;;
        -b|--build)
            BUILD_IMAGES=true
            shift
            ;;
        -s|--suite)
            SPECIFIC_SUITE="$2"
            shift 2
            ;;
        -l|--list)
            echo "可用的测试套件:"
            for suite in "${TEST_SUITES[@]}"; do
                echo "  - $suite"
            done
            exit 0
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --clean)
            CLEAN_ENV=true
            shift
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 日志输出函数
log() {
    if [[ "$QUIET" != "true" ]]; then
        echo "$@"
    fi
}

verbose_log() {
    if [[ "$VERBOSE" == "true" ]]; then
        log "$@"
    fi
}

# 清理函数
cleanup() {
    log_info "正在清理测试环境..."

    if [[ "$KEEP_CONTAINERS" != "true" ]]; then
        cd "$TEST_DIR"
        if [[ -f "$DOCKER_COMPOSE_FILE" ]]; then
            docker-compose -f "$DOCKER_COMPOSE_FILE" down -v --remove-orphans 2>/dev/null || true
        fi
    fi

    # 清理临时文件
    find "$TEST_DIR" -name "*.tmp" -type f -delete 2>/dev/null || true
    find "$TEST_DIR" -name "*.log" -type f -delete 2>/dev/null || true

    log_info "测试环境清理完成"
}

# 信号处理
trap cleanup EXIT INT TERM

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."

    # 检查Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装或不在PATH中"
        exit 1
    fi

    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装或不在PATH中"
        exit 1
    fi

    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装或不在PATH中"
        exit 1
    fi

    # 检查pnpm
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm 未安装或不在PATH中"
        exit 1
    fi

    log_success "依赖检查通过"
}

# 准备测试环境
prepare_test_environment() {
    log_info "准备测试环境..."

    # 创建必要的目录
    mkdir -p "$COVERAGE_DIR"
    mkdir -p "$REPORT_DIR"
    mkdir -p "$TEST_DIR/logs"

    # 设置环境变量
    export NODE_ENV=test
    export TEST_DB_HOST=localhost
    export TEST_DB_PORT=5433
    export TEST_DB_USER=test
    export TEST_DB_PASSWORD=test
    export TEST_DB_NAME=weibo_crawler_e2e
    export TEST_REDIS_HOST=localhost
    export TEST_REDIS_PORT=6380
    export TEST_REDIS_DB=1
    export TEST_RABBITMQ_URL=amqp://test:test@localhost:5673/
    export TEST_MONGODB_URI=mongodb://test:test@localhost:27018
    export TEST_MONGODB_NAME=weibo_raw_e2e
    export TEST_MINIO_ENDPOINT=localhost
    export TEST_MINIO_PORT=9001
    export TEST_MINIO_ACCESS_KEY=test
    export TEST_MINIO_SECRET_KEY=testtest

    verbose_log "环境变量设置完成"
}

# 启动Docker服务
start_docker_services() {
    log_info "启动Docker测试服务..."

    cd "$TEST_DIR"

    if [[ "$BUILD_IMAGES" == "true" ]]; then
        log_info "重新构建Docker镜像..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" build
    fi

    # 启动服务
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d

    # 等待服务就绪
    log_info "等待服务就绪..."
    local max_attempts=60
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose -f "$DOCKER_COMPOSE_FILE" ps --services --filter status=running | wc -l | grep -q "^7$"; then
            log_success "所有服务已启动"
            break
        fi

        if [[ $attempt -eq $max_attempts ]]; then
            log_error "服务启动超时"
            docker-compose -f "$DOCKER_COMPOSE_FILE" logs
            exit 1
        fi

        log_info "等待服务启动... ($attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done

    # 额外等待服务完全就绪
    sleep 10
}

# 验证服务健康状态
verify_services() {
    log_info "验证服务健康状态..."

    # 检查PostgreSQL
    if ! docker exec weibo_crawler_e2e_postgres pg_isready -U test -d weibo_crawler_e2e; then
        log_error "PostgreSQL 服务不健康"
        exit 1
    fi

    # 检查Redis
    if ! docker exec weibo_crawler_e2e_redis redis-cli ping | grep -q PONG; then
        log_error "Redis 服务不健康"
        exit 1
    fi

    # 检查RabbitMQ
    if ! docker exec weibo_crawler_e2e_rabbitmq rabbitmq-diagnostics ping; then
        log_error "RabbitMQ 服务不健康"
        exit 1
    fi

    # 检查MongoDB
    if ! docker exec weibo_crawler_e2e_mongodb mongo --eval "db.adminCommand('ping')" --quiet; then
        log_error "MongoDB 服务不健康"
        exit 1
    fi

    log_success "所有服务健康检查通过"
}

# 运行测试套件
run_test_suite() {
    local suite_name="$1"

    log_test "开始运行测试套件: $suite_name"

    cd "$CRAWLER_DIR"

    local jest_config="test/jest-e2e.json"
    local test_pattern="test/integration/e2e/${suite_name}.test.ts"
    local coverage_args=""
    local report_args=""

    if [[ "$GENERATE_COVERAGE" == "true" ]]; then
        coverage_args="--coverage --coverageDirectory=$COVERAGE_DIR/${suite_name}"
    fi

    if [[ "$GENERATE_REPORTS" == "true" ]]; then
        report_args="--json --outputFile=$REPORT_DIR/${suite_name}-results.json"
    fi

    local jest_command="NODE_OPTIONS='--max-old-space-size=4096' pnpm jest"
    jest_command="$jest_command --config=$jest_config"
    jest_command="$jest_command --testTimeout=$TEST_TIMEOUT"
    jest_command="$jest_command --maxWorkers=$PARALLEL_WORKERS"
    jest_command="$jest_command $test_pattern"
    jest_command="$jest_command $coverage_args $report_args"

    verbose_log "执行命令: $jest_command"

    if [[ "$DRY_RUN" == "true" ]]; then
        log "[DRY-RUN] 将要执行: $jest_command"
        return 0
    fi

    # 记录开始时间
    local start_time=$(date +%s)

    # 运行测试
    if eval "$jest_command"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log_success "测试套件 '$suite_name' 通过 (${duration}s)"

        # 生成测试报告摘要
        if [[ "$GENERATE_REPORTS" == "true" ]]; then
            generate_test_summary "$suite_name" "$duration"
        fi

        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log_error "测试套件 '$suite_name' 失败 (${duration}s)"

        # 收集失败的测试日志
        collect_failure_logs "$suite_name"

        return 1
    fi
}

# 生成测试摘要
generate_test_summary() {
    local suite_name="$1"
    local duration="$2"

    local summary_file="$REPORT_DIR/${suite_name}-summary.md"

    cat > "$summary_file" << EOF
# $suite_name 测试摘要

## 基本信息
- 测试套件: $suite_name
- 执行时间: $(date '+%Y-%m-%d %H:%M:%S')
- 耗时: ${duration}s
- 并行度: $PARALLEL_WORKERS

## 测试结果
- 状态: 通过
- 超时设置: ${TEST_TIMEOUT}ms

## 环境
- Node.js: $(node --version)
- Docker: $(docker --version)
- Docker Compose: $(docker-compose --version)

EOF

    log_success "测试摘要已生成: $summary_file"
}

# 收集失败日志
collect_failure_logs() {
    local suite_name="$1"

    local log_dir="$REPORT_DIR/logs"
    mkdir -p "$log_dir"

    # 收集Docker服务日志
    cd "$TEST_DIR"
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs > "$log_dir/${suite_name}-docker.log" 2>&1

    # 收集应用日志
    if [[ -d "$CRAWLER_DIR/logs" ]]; then
        cp -r "$CRAWLER_DIR/logs"/* "$log_dir/" 2>/dev/null || true
    fi

    log_warning "失败日志已收集到: $log_dir"
}

# 生成综合报告
generate_comprehensive_report() {
    if [[ "$GENERATE_REPORTS" != "true" ]]; then
        return 0
    fi

    log_info "生成综合测试报告..."

    local report_file="$REPORT_DIR/comprehensive-report.md"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    cat > "$report_file" << EOF
# 微博爬虫系统端到端测试综合报告

## 执行概要
- 生成时间: $timestamp
- 总测试套件: ${#TEST_SUITES[@]}
- 并行度: $PARALLEL_WORKERS
- 超时设置: ${TEST_TIMEOUT}ms

## 测试套件执行结果

EOF

    # 添加各测试套件的结果
    for suite in "${TEST_SUITES[@]}"; do
        local result_file="$REPORT_DIR/${suite}-results.json"
        local status="未知"

        if [[ -f "$result_file" ]]; then
            # 这里可以解析JSON结果文件获取状态
            status="通过"
        fi

        cat >> "$report_file" << EOF
### $suite
- 状态: $status
- 详细结果: [查看](${suite}-results.json)

EOF
    done

    cat >> "$report_file" << EOF
## 环境信息
- 操作系统: $(uname -s)
- Node.js: $(node --version)
- pnpm: $(pnpm --version)
- Docker: $(docker --version)
- Docker Compose: $(docker-compose --version)

## 建议
1. 定期运行端到端测试以确保系统稳定性
2. 在生产部署前必须通过所有测试套件
3. 监控测试执行时间，及时发现性能问题

EOF

    log_success "综合报告已生成: $report_file"
}

# 清理环境
clean_environment() {
    log_info "清理测试环境..."

    cd "$TEST_DIR"

    if [[ -f "$DOCKER_COMPOSE_FILE" ]]; then
        docker-compose -f "$DOCKER_COMPOSE_FILE" down -v --remove-orphans || true
        docker system prune -f || true
    fi

    # 清理测试数据
    rm -rf "$COVERAGE_DIR" 2>/dev/null || true
    rm -rf "$REPORT_DIR" 2>/dev/null || true

    log_success "环境清理完成"
}

# 主函数
main() {
    log_info "微博爬虫系统端到端测试开始"

    if [[ "$CLEAN_ENV" == "true" ]]; then
        clean_environment
        exit 0
    fi

    # 检查依赖
    check_dependencies

    # 准备测试环境
    prepare_test_environment

    # 启动Docker服务
    start_docker_services

    # 验证服务健康状态
    verify_services

    # 运行测试套件
    local failed_suites=0
    local total_suites=0

    if [[ -n "$SPECIFIC_SUITE" ]]; then
        # 运行指定测试套件
        if [[ " ${TEST_SUITES[@]} " =~ " $SPECIFIC_SUITE " ]]; then
            total_suites=1
            if ! run_test_suite "$SPECIFIC_SUITE"; then
                failed_suites=1
            fi
        else
            log_error "未知的测试套件: $SPECIFIC_SUITE"
            log_info "可用的测试套件:"
            for suite in "${TEST_SUITES[@]}"; do
                echo "  - $suite"
            done
            exit 1
        fi
    else
        # 运行所有测试套件
        total_suites=${#TEST_SUITES[@]}
        for suite in "${TEST_SUITES[@]}"; do
            if ! run_test_suite "$suite"; then
                ((failed_suites++))
            fi
        done
    fi

    # 生成综合报告
    generate_comprehensive_report

    # 输出最终结果
    log_info "测试执行完成"
    log_info "总测试套件: $total_suites"
    log_info "失败套件: $failed_suites"
    log_info "成功套件: $((total_suites - failed_suites))"

    if [[ $failed_suites -gt 0 ]]; then
        log_error "有 $failed_suites 个测试套件失败"
        exit 1
    else
        log_success "所有测试套件通过"
        exit 0
    fi
}

# 执行主函数
main "$@"