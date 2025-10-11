#!/bin/bash

# 停止所有服务的脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}正在停止所有服务...${NC}"

# 通过PID文件停止服务
if [ -d "logs" ]; then
    for pid_file in logs/*.pid; do
        if [ -f "$pid_file" ]; then
            service_name=$(basename "$pid_file" .pid)
            pid=$(cat "$pid_file")

            if ps -p $pid > /dev/null 2>&1; then
                kill $pid
                echo -e "${GREEN}已停止 $service_name (PID: $pid)${NC}"
            else
                echo -e "${YELLOW}$service_name 进程已不存在${NC}"
            fi

            # 删除PID文件
            rm -f "$pid_file"
        fi
    done
fi

# 通过进程名停止残留进程
echo -e "${YELLOW}清理残留进程...${NC}"
pkill -f "bun run dev" 2>/dev/null || true

echo -e "${GREEN}所有服务已停止！${NC}"