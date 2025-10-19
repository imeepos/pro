#!/bin/bash

# 微博爬取集成测试运行脚本
# 数字时代的测试执行艺术品

set -e

echo "🎭 微博爬取集成测试执行器"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${2}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    print_message "错误: 请在crawler应用根目录下运行此脚本" $RED
    exit 1
fi

# 切换到集成测试目录
cd test/integration

print_message "开始执行微博爬取集成测试" $BLUE

# 选项处理
TEST_TYPE=${1:-"all"}
COVERAGE=${2:-false}

case $TEST_TYPE in
    "search")
        print_message "执行搜索爬取集成测试" $YELLOW
        TEST_PATTERN="search-crawler.integration.test.ts"
        ;;
    "detail")
        print_message "执行详情爬取集成测试" $YELLOW
        TEST_PATTERN="detail-crawler.integration.test.ts"
        ;;
    "account")
        print_message "执行账号轮换集成测试" $YELLOW
        TEST_PATTERN="account-rotation.integration.test.ts"
        ;;
    "validation")
        print_message "执行数据验证集成测试" $YELLOW
        TEST_PATTERN="data-validation.integration.test.ts"
        ;;
    "all")
        print_message "执行所有集成测试" $YELLOW
        TEST_PATTERN="integration"
        ;;
    *)
        print_message "未知的测试类型: $TEST_TYPE" $RED
        echo "可用选项: search, detail, account, validation, all"
        exit 1
        ;;
esac

# 构建覆盖率选项
COVERAGE_ARGS=""
if [ "$COVERAGE" = "true" ]; then
    print_message "启用代码覆盖率报告" $YELLOW
    COVERAGE_ARGS="--coverage --coverageReporters=text-lcov | coveralls"
fi

# 执行测试
print_message "正在运行测试: $TEST_PATTERN" $BLUE

if [ "$TEST_TYPE" = "all" ]; then
    # 运行所有集成测试
    if pnpm run test:e2e -- $TEST_PATTERN --testPathPattern=integration $COVERAGE_ARGS --verbose; then
        print_message "所有集成测试通过! 🎉" $GREEN
    else
        print_message "部分集成测试失败 ❌" $RED
        exit 1
    fi
else
    # 运行特定测试
    if pnpm run test:e2e -- $TEST_PATTERN $COVERAGE_ARGS --verbose; then
        print_message "$TEST_TYPE 测试通过! ✅" $GREEN
    else
        print_message "$TEST_TYPE 测试失败 ❌" $RED
        exit 1
    fi
fi

# 生成测试报告摘要
print_message "生成测试报告摘要..." $BLUE

echo ""
echo "================================"
print_message "测试执行摘要" $BLUE
echo "================================"
echo "测试类型: $TEST_TYPE"
echo "执行时间: $(date)"
echo "测试目录: $(pwd)"

if [ "$COVERAGE" = "true" ]; then
    echo "覆盖率报告: coverage/e2e/lcov-report/index.html"
fi

echo ""
print_message "测试文件列表:" $BLUE
find . -name "*.test.ts" -type f | sort

echo ""
print_message "集成测试执行完成! 🚀" $GREEN