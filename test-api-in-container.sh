#!/bin/sh

###############################################################################
# API 集成测试脚本 (容器内运行)
###############################################################################

set -e

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
    echo "[INFO] $1"
}

log_error() {
    echo "[ERROR] $1"
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
test_api_root() {
    log_info "测试 API 根路径..."
    response=$(wget -q -O- "$API_URL/api" 2>&1 || echo "")

    if echo "$response" | grep -q "success"; then
        test_result 0 "API 根路径响应正常"
        return 0
    else
        test_result 1 "API 根路径响应异常"
        return 1
    fi
}

test_register() {
    log_info "测试用户注册..."
    response=$(wget -q -O- --post-data="{\"username\":\"$TEST_USERNAME\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
        --header="Content-Type: application/json" \
        "$API_URL/api/auth/register" 2>&1 || echo "error")

    if echo "$response" | grep -q "accessToken"; then
        ACCESS_TOKEN=$(echo "$response" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
        REFRESH_TOKEN=$(echo "$response" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
        test_result 0 "用户注册成功"
        return 0
    else
        test_result 1 "用户注册失败: $response"
        return 1
    fi
}

test_duplicate_register() {
    log_info "测试重复注册..."
    response=$(wget -q -O- --post-data="{\"username\":\"$TEST_USERNAME\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
        --header="Content-Type: application/json" \
        "$API_URL/api/auth/register" 2>&1 || echo "expected error")

    if echo "$response" | grep -q "已存在\|exist"; then
        test_result 0 "重复注册正确返回错误"
        return 0
    else
        test_result 1 "重复注册未返回预期错误: $response"
        return 1
    fi
}

test_short_password() {
    log_info "测试密码过短..."
    response=$(wget -q -O- --post-data="{\"username\":\"short_$TEST_USERNAME\",\"email\":\"short_$TEST_EMAIL\",\"password\":\"123\"}" \
        --header="Content-Type: application/json" \
        "$API_URL/api/auth/register" 2>&1 || echo "expected error")

    if echo "$response" | grep -q "password\|密码"; then
        test_result 0 "密码过短验证正确"
        return 0
    else
        test_result 1 "密码过短未返回预期错误: $response"
        return 1
    fi
}

test_login() {
    log_info "测试用户登录..."
    response=$(wget -q -O- --post-data="{\"usernameOrEmail\":\"$TEST_USERNAME\",\"password\":\"$TEST_PASSWORD\"}" \
        --header="Content-Type: application/json" \
        "$API_URL/api/auth/login" 2>&1 || echo "error")

    if echo "$response" | grep -q "accessToken"; then
        NEW_ACCESS_TOKEN=$(echo "$response" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$NEW_ACCESS_TOKEN" ]; then
            ACCESS_TOKEN="$NEW_ACCESS_TOKEN"
            test_result 0 "用户登录成功"
            return 0
        fi
    fi

    test_result 1 "用户登录失败: $response"
    return 1
}

test_wrong_password() {
    log_info "测试错误密码..."
    response=$(wget -q -O- --post-data="{\"usernameOrEmail\":\"$TEST_USERNAME\",\"password\":\"wrongpassword\"}" \
        --header="Content-Type: application/json" \
        "$API_URL/api/auth/login" 2>&1 || echo "expected error")

    if echo "$response" | grep -q "密码\|password\|Unauthorized"; then
        test_result 0 "错误密码正确返回错误"
        return 0
    else
        test_result 1 "错误密码未返回预期错误: $response"
        return 1
    fi
}

test_get_profile() {
    log_info "测试获取用户信息..."

    if [ -z "$ACCESS_TOKEN" ]; then
        test_result 1 "无法测试获取用户信息：ACCESS_TOKEN 为空"
        return 1
    fi

    response=$(wget -q -O- --header="Authorization: Bearer $ACCESS_TOKEN" \
        "$API_URL/api/auth/profile" 2>&1 || echo "error")

    if echo "$response" | grep -q "$TEST_USERNAME"; then
        test_result 0 "获取用户信息成功"
        return 0
    else
        test_result 1 "获取用户信息失败: $response"
        return 1
    fi
}

test_profile_without_token() {
    log_info "测试无 token 获取用户信息..."
    response=$(wget -q -O- "$API_URL/api/auth/profile" 2>&1 || echo "expected error")

    if echo "$response" | grep -q "Unauthorized\|401\|未授权"; then
        test_result 0 "无 token 正确返回错误"
        return 0
    else
        test_result 1 "无 token 未返回预期错误: $response"
        return 1
    fi
}

test_refresh_token() {
    log_info "测试刷新 token..."

    if [ -z "$REFRESH_TOKEN" ]; then
        test_result 1 "无法测试刷新 token：REFRESH_TOKEN 为空"
        return 1
    fi

    response=$(wget -q -O- --post-data="{\"refreshToken\":\"$REFRESH_TOKEN\"}" \
        --header="Content-Type: application/json" \
        "$API_URL/api/auth/refresh" 2>&1 || echo "error")

    if echo "$response" | grep -q "accessToken"; then
        test_result 0 "刷新 token 成功"
        return 0
    else
        test_result 1 "刷新 token 失败: $response"
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

    # 运行测试
    test_api_root
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
    echo "通过: $PASSED"
    echo "失败: $FAILED"
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
