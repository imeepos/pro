#!/bin/bash

# 启动所有服务的脚本
# 使用 bun 启动所有应用程序

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 服务列表
services=("web" "api" "broker" "crawler" "cleaner")

# 创建日志目录
mkdir -p logs

echo -e "${BLUE}正在启动所有服务...${NC}"

# 检查 bun 是否安装
if ! command -v bun &> /dev/null; then
    echo -e "${RED}错误: bun 未安装或不在 PATH 中${NC}"
    exit 1
fi

# 停止已存在的服务
echo -e "${YELLOW}停止已存在的服务...${NC}"
pkill -f "bun run dev" || true
sleep 2

# 启动每个服务
for service in "${services[@]}"; do
    echo -e "${GREEN}启动 $service 服务...${NC}"

    if [ ! -d "apps/$service" ]; then
        echo -e "${RED}错误: apps/$service 目录不存在${NC}"
        continue
    fi

    # 在后台启动服务，并将输出重定向到日志文件
    cd "apps/$service"
    bun run dev > "../../logs/$service.log" 2>&1 &
    local_pid=$!
    cd - > /dev/null

    # 保存PID到文件
    echo $local_pid > "logs/$service.pid"

    echo -e "${GREEN}$service 服务已启动 (PID: $local_pid)${NC}"
done

echo -e "${BLUE}所有服务启动完成！${NC}"
echo -e "${YELLOW}查看日志: tail -f logs/[service].log${NC}"
echo -e "${YELLOW}停止服务: ./stop-services.sh${NC}"

# 等待几秒钟让服务完全启动
echo -e "${BLUE}等待服务启动...${NC}"
sleep 5

# 显示服务状态
echo -e "${BLUE}检查服务状态:${NC}"
for service in "${services[@]}"; do
    if [ -f "logs/$service.pid" ]; then
        pid=$(cat "logs/$service.pid")
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $service (PID: $pid)${NC}"
        else
            echo -e "${RED}✗ $service (未运行)${NC}"
        fi
    else
        echo -e "${RED}✗ $service (PID文件不存在)${NC}"
    fi
done

echo -e "${GREEN}服务启动脚本执行完成！${NC}"