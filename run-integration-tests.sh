#!/bin/bash

# 微博爬虫系统集成测试执行器
#
# 此脚本用于统一执行所有集成测试，确保微博爬虫业务的正常运行
#
# 使用方法:
#   ./run-integration-tests.sh [选项]
#
# 选项:
#   -h, --help              显示帮助信息
#   -a, --all               运行所有集成测试
#   -c, --crawler           运行crawler服务集成测试
#   -b, --broker            运行broker服务集成测试
#   -A, --api               运行api服务集成测试
#   -e, --entities          运行entities包集成测试
#   -v, --verbose           详细输出模式
#   -t, --timeout <秒>      设置测试超时时间（默认：300秒）
#   --coverage              生成覆盖率报告
#   --clean                 测试前清理环境
#   --dry-run               仅显示将要执行的测试，不实际运行
#
# 示例:
#   ./run-integration-tests.sh -a                    # 运行所有测试
#   ./run-integration-tests.sh -c -v                 # 运行crawler测试并显示详细输出
#   ./run-integration-tests.sh -e --coverage         # 运行entities测试并生成覆盖率报告
#   ./run-integration-tests.sh --dry-run             # 查看将要执行的测试

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置变量
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_TIMEOUT=300
VERBOSE=false
COVERAGE=false
CLEAN_ENV=false
DRY_RUN=false
TIMEOUT=$DEFAULT_TIMEOUT

# 测试统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

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

log_verbose() {
    if [[ "$VERBOSE" == true ]]; then
        echo -e "${PURPLE}[VERBOSE]${NC} $1"
    fi
}

log_header() {
    echo -e "${CYAN}=== $1 ===${NC}"
}

# 显示帮助信息
show_help() {
    cat << EOF
微博爬虫系统集成测试执行器

用法: $0 [选项]

选项:
    -h, --help              显示此帮助信息
    -a, --all               运行所有集成测试
    -c, --crawler           运行crawler服务集成测试
    -b, --broker            运行broker服务集成测试
    -A, --api               运行api服务集成测试
    -e, --entities          运行entities包集成测试
    -v, --verbose           详细输出模式
    -t, --timeout <秒>      设置测试超时时间（默认：300秒）
    --coverage              生成覆盖率报告
    --clean                 测试前清理环境
    --dry-run               仅显示将要执行的测试，不实际运行

示例:
    $0 -a                    # 运行所有测试
    $0 -c -v                 # 运行crawler测试并显示详细输出
    $0 -e --coverage         # 运行entities测试并生成覆盖率报告
    $0 --dry-run             # 查看将要执行的测试

测试套件说明:
    Crawler测试    - 爬取核心功能、错误处理、端到端业务流程
    Broker测试     - 任务调度、消息队列、子任务生成
    API测试        - REST接口、认证授权、性能测试
    Entities测试   - 数据库实体、缓存、跨库一致性

EOF
}

# 解析命令行参数
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -a|--all)
                RUN_CRAWLER=true
                RUN_BROKER=true
                RUN_API=true
                RUN_ENTITIES=true
                shift
                ;;
            -c|--crawler)
                RUN_CRAWLER=true
                shift
                ;;
            -b|--broker)
                RUN_BROKER=true
                shift
                ;;
            -A|--api)
                RUN_API=true
                shift
                ;;
            -e|--entities)
                RUN_ENTITIES=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -t|--timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            --coverage)
                COVERAGE=true
                shift
                ;;
            --clean)
                CLEAN_ENV=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# 检查环境依赖
check_dependencies() {
    log_info "检查环境依赖..."

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

    # 检查Docker (可选，用于e2e测试)
    if ! command -v docker &> /dev/null; then
        log_warning "Docker 未安装，端到端测试可能无法运行"
    fi

    # 检查项目结构
    if [[ ! -d "$PROJECT_ROOT/apps" ]]; then
        log_error "项目结构不正确，未找到apps目录"
        exit 1
    fi

    log_success "环境依赖检查通过"
}

# 清理测试环境
clean_environment() {
    if [[ "$CLEAN_ENV" == true ]]; then
        log_info "清理测试环境..."

        # 清理临时文件
        find "$PROJECT_ROOT" -name "*.tmp.*" -type f -delete 2>/dev/null || true
        find "$PROJECT_ROOT" -name ".test-temp*" -type d -exec rm -rf {} + 2>/dev/null || true

        # 清理node_modules测试缓存
        pnpm run test:clean 2>/dev/null || true

        log_success "测试环境清理完成"
    fi
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    cd "$PROJECT_ROOT"
    pnpm install
    log_success "依赖安装完成"
}

# 运行测试套件
run_test_suite() {
    local suite_name="$1"
    local suite_path="$2"
    local test_command="$3"

    log_header "运行 $suite_name 集成测试"
    log_verbose "测试路径: $suite_path"
    log_verbose "测试命令: $test_command"

    if [[ "$DRY_RUN" == true ]]; then
        echo "[DRY RUN] 将会执行: cd $suite_path && $test_command"
        ((SKIPPED_TESTS++))
        return 0
    fi

    local start_time=$(date +%s)

    if cd "$suite_path" && eval "$test_command"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))

        log_success "$suite_name 测试通过 (耗时: ${duration}s)"
        ((PASSED_TESTS++))
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))

        log_error "$suite_name 测试失败 (耗时: ${duration}s)"
        ((FAILED_TESTS++))
        return 1
    fi
}

# 运行Crawler集成测试
run_crawler_tests() {
    local coverage_arg=""
    if [[ "$COVERAGE" == true ]]; then
        coverage_arg="--coverage"
    fi

    local verbose_arg=""
    if [[ "$VERBOSE" == true ]]; then
        verbose_arg="--verbose"
    fi

    local test_command="pnpm run test:integration $coverage_arg $verbose_arg --testTimeout=$TIMEOUT"

    run_test_suite "Crawler" "$PROJECT_ROOT/apps/crawler" "$test_command"
}

# 运行Broker集成测试
run_broker_tests() {
    local coverage_arg=""
    if [[ "$COVERAGE" == true ]]; then
        coverage_arg="--coverage"
    fi

    local verbose_arg=""
    if [[ "$VERBOSE" == true ]]; then
        verbose_arg="--verbose"
    fi

    local test_command="pnpm run test:integration $coverage_arg $verbose_arg --testTimeout=$TIMEOUT"

    run_test_suite "Broker" "$PROJECT_ROOT/apps/broker" "$test_command"
}

# 运行API集成测试
run_api_tests() {
    local coverage_arg=""
    if [[ "$COVERAGE" == true ]]; then
        coverage_arg="--coverage"
    fi

    local verbose_arg=""
    if [[ "$VERBOSE" == true ]]; then
        verbose_arg="--verbose"
    fi

    local test_command="pnpm run test:integration $coverage_arg $verbose_arg --testTimeout=$TIMEOUT"

    run_test_suite "API" "$PROJECT_ROOT/apps/api" "$test_command"
}

# 运行Entities集成测试
run_entities_tests() {
    local coverage_arg=""
    if [[ "$COVERAGE" == true ]]; then
        coverage_arg="--coverage"
    fi

    local verbose_arg=""
    if [[ "$VERBOSE" == true ]]; then
        verbose_arg="--verbose"
    fi

    local test_command="pnpm run test:integration $coverage_arg $verbose_arg --testTimeout=$TIMEOUT"

    run_test_suite "Entities" "$PROJECT_ROOT/packages/entities" "$test_command"
}

# 生成测试报告
generate_report() {
    log_header "集成测试执行报告"
    echo "总测试套件: $TOTAL_TESTS"
    echo -e "通过: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "失败: ${RED}$FAILED_TESTS${NC}"
    echo -e "跳过: ${YELLOW}$SKIPPED_TESTS${NC}"

    if [[ $FAILED_TESTS -eq 0 ]]; then
        log_success "所有集成测试通过！微博爬虫系统运行正常。"

        if [[ "$COVERAGE" == true ]]; then
            log_info "覆盖率报告已生成，请查看 coverage/ 目录"
        fi

        return 0
    else
        log_error "$FAILED_TESTS 个测试套件失败，请检查日志并修复问题。"
        return 1
    fi
}

# 主函数
main() {
    log_header "微博爬虫系统集成测试执行器"
    log_info "项目根目录: $PROJECT_ROOT"
    log_info "执行时间: $(date)"

    # 解析参数
    parse_args "$@"

    # 如果没有指定任何测试，默认运行所有测试
    if [[ -z "${RUN_CRAWLER:-}" && -z "${RUN_BROKER:-}" && -z "${RUN_API:-}" && -z "${RUN_ENTITIES:-}" ]]; then
        RUN_CRAWLER=true
        RUN_BROKER=true
        RUN_API=true
        RUN_ENTITIES=true
    fi

    # 计算总测试数
    [[ "${RUN_CRAWLER:-}" == true ]] && ((TOTAL_TESTS++))
    [[ "${RUN_BROKER:-}" == true ]] && ((TOTAL_TESTS++))
    [[ "${RUN_API:-}" == true ]] && ((TOTAL_TESTS++))
    [[ "${RUN_ENTITIES:-}" == true ]] && ((TOTAL_TESTS++))

    log_info "将要执行 $TOTAL_TESTS 个测试套件"

    # 检查环境
    check_dependencies

    # 清理环境
    clean_environment

    # 安装依赖
    install_dependencies

    # 记录开始时间
    local start_time=$(date +%s)

    # 执行测试
    [[ "${RUN_CRAWLER:-}" == true ]] && run_crawler_tests
    [[ "${RUN_BROKER:-}" == true ]] && run_broker_tests
    [[ "${RUN_API:-}" == true ]] && run_api_tests
    [[ "${RUN_ENTITIES:-}" == true ]] && run_entities_tests

    # 计算总耗时
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))

    log_info "总执行时间: ${total_duration}s"

    # 生成报告
    generate_report

    # 返回结果
    exit $?
}

# 脚本入口点
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi