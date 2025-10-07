#!/bin/bash

###############################################################################
# 集成测试脚本
# 用于测试登录注册功能的完整流程
###############################################################################

set -e

# 颜色定义
RED='\033[0:31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
API_URL="http://localhost:3000"
TEST_USERNAME="testuser_$(date +%s)"
TEST_EMAIL="test_$(date +%s)@example.com"
TEST_PASSWORD="password123"

# 计数器
PASSED=0
FAILED=0
TOTAL=0

# 辅助函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

test_result() {
    TOTAL=$((TOTAL + 1))
    if [ $1 -eq 0 ]; then
        PASSED=$((PASSED + 1))
        log_info "✓ $2"
    else
        FAILED=$((FAILED + 1))
        log_error "✗ $2"
    fi
}

# 测试函数
test_health_check() {
    log_info "测试健康检查接口..."
    response=$(curl -s -w "\n%{http_code}" "$API_URL/health" || echo "000")
    http_code=$(echo "$response" | tail -n 1)

    if [ "$http_code" = "200" ]; then
        test_result 0 "健康检查接口正常"
        return 0
    else
        test_result 1 "健康检查接口失败 (HTTP $http_code)"
        return 1
    fi
}

test_register() {
    log_info "测试用户注册..."
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$TEST_USERNAME\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" || echo "000")

    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)

    if [ "$http_code" = "201" ]; then
        ACCESS_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
        REFRESH_TOKEN=$(echo "$body" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)

        if [ -n "$ACCESS_TOKEN" ] && [ -n "$REFRESH_TOKEN" ]; then
            test_result 0 "用户注册成功"
            return 0
        else
            test_result 1 "用户注册成功但未返回 token"
            return 1
        fi
    else
        test_result 1 "用户注册失败 (HTTP $http_code): $body"
        return 1
    fi
}

test_duplicate_register() {
    log_info "测试重复注册..."
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$TEST_USERNAME\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" || echo "000")

    http_code=$(echo "$response" | tail -n 1)

    if [ "$http_code" = "409" ] || [ "$http_code" = "400" ]; then
        test_result 0 "重复注册正确返回错误"
        return 0
    else
        test_result 1 "重复注册应返回 409/400,实际: $http_code"
        return 1
    fi
}

test_short_password() {
    log_info "测试密码过短..."
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"short_$TEST_USERNAME\",\"email\":\"short_$TEST_EMAIL\",\"password\":\"123\"}" || echo "000")

    http_code=$(echo "$response" | tail -n 1)

    if [ "$http_code" = "400" ]; then
        test_result 0 "密码过短验证正确"
        return 0
    else
        test_result 1 "密码过短应返回 400,实际: $http_code"
        return 1
    fi
}

test_login() {
    log_info "测试用户登录..."
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"usernameOrEmail\":\"$TEST_USERNAME\",\"password\":\"$TEST_PASSWORD\"}" || echo "000")

    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)

    if [ "$http_code" = "200" ]; then
        NEW_ACCESS_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

        if [ -n "$NEW_ACCESS_TOKEN" ]; then
            ACCESS_TOKEN="$NEW_ACCESS_TOKEN"
            test_result 0 "用户登录成功"
            return 0
        else
            test_result 1 "用户登录成功但未返回 token"
            return 1
        fi
    else
        test_result 1 "用户登录失败 (HTTP $http_code): $body"
        return 1
    fi
}

test_wrong_password() {
    log_info "测试错误密码..."
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"usernameOrEmail\":\"$TEST_USERNAME\",\"password\":\"wrongpassword\"}" || echo "000")

    http_code=$(echo "$response" | tail -n 1)

    if [ "$http_code" = "401" ]; then
        test_result 0 "错误密码正确返回 401"
        return 0
    else
        test_result 1 "错误密码应返回 401,实际: $http_code"
        return 1
    fi
}

test_get_profile() {
    log_info "测试获取用户信息..."

    if [ -z "$ACCESS_TOKEN" ]; then
        test_result 1 "无法测试获取用户信息：ACCESS_TOKEN 为空"
        return 1
    fi

    response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/auth/profile" \
        -H "Authorization: Bearer $ACCESS_TOKEN" || echo "000")

    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)

    if [ "$http_code" = "200" ]; then
        if echo "$body" | grep -q "$TEST_USERNAME"; then
            test_result 0 "获取用户信息成功"
            return 0
        else
            test_result 1 "获取用户信息成功但用户名不匹配"
            return 1
        fi
    else
        test_result 1 "获取用户信息失败 (HTTP $http_code): $body"
        return 1
    fi
}

test_profile_without_token() {
    log_info "测试无 token 获取用户信息..."
    response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/auth/profile" || echo "000")

    http_code=$(echo "$response" | tail -n 1)

    if [ "$http_code" = "401" ]; then
        test_result 0 "无 token 正确返回 401"
        return 0
    else
        test_result 1 "无 token 应返回 401,实际: $http_code"
        return 1
    fi
}

test_refresh_token() {
    log_info "测试刷新 token..."

    if [ -z "$REFRESH_TOKEN" ]; then
        test_result 1 "无法测试刷新 token：REFRESH_TOKEN 为空"
        return 1
    fi

    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/auth/refresh" \
        -H "Content-Type: application/json" \
        -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" || echo "000")

    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)

    if [ "$http_code" = "200" ]; then
        NEW_ACCESS_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

        if [ -n "$NEW_ACCESS_TOKEN" ]; then
            test_result 0 "刷新 token 成功"
            return 0
        else
            test_result 1 "刷新 token 成功但未返回新 token"
            return 1
        fi
    else
        test_result 1 "刷新 token 失败 (HTTP $http_code): $body"
        return 1
    fi
}

# 主测试流程
main() {
    echo "========================================="
    echo "      登录注册功能集成测试"
    echo "========================================="
    echo ""

    log_info "API 地址: $API_URL"
    log_info "测试用户名: $TEST_USERNAME"
    log_info "测试邮箱: $TEST_EMAIL"
    echo ""

    # 等待 API 服务就绪
    log_info "等待 API 服务就绪..."
    for i in {1..30}; do
        if curl -s "$API_URL/health" > /dev/null 2>&1; then
            log_info "API 服务已就绪"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "API 服务启动超时"
            exit 1
        fi
        sleep 1
    done
    echo ""

    # 运行测试
    test_health_check
    test_register
    test_duplicate_register
    test_short_password
    test_login
    test_wrong_password
    test_get_profile
    test_profile_without_token
    test_refresh_token

    # 输出测试结果
    echo ""
    echo "========================================="
    echo "          测试结果汇总"
    echo "========================================="
    echo "总计: $TOTAL"
    echo -e "${GREEN}通过: $PASSED${NC}"
    echo -e "${RED}失败: $FAILED${NC}"
    echo "========================================="

    if [ $FAILED -eq 0 ]; then
        log_info "所有测试通过!"
        exit 0
    else
        log_error "有 $FAILED 个测试失败"
        exit 1
    fi
}

# 执行主程序
main
