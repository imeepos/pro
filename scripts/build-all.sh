#!/bin/bash

# 构建所有依赖包和应用的脚本
# 按照依赖顺序构建，避免并发构建导致的问题

set -e  # 遇到错误立即退出

echo "开始构建所有包和应用..."

# 构建基础依赖包
echo "构建基础依赖包..."
cd packages/types && bun run build && cd ../..
cd packages/utils && bun run build && cd ../..
cd packages/entities && bun run build && cd ../..
cd packages/logger && bun run build && cd ../..

# 构建中间层包
echo "构建中间层包..."
cd packages/sdk && bun run build && cd ../..
cd packages/components && bun run build && cd ../..
cd packages/redis && bun run build && cd ../..
cd packages/rabbitmq && bun run build && cd ../..

# 构建存储相关包
echo "构建存储相关包..."
cd packages/mongodb && bun run build && cd ../..
cd packages/minio && bun run build && cd ../..

# 构建应用
echo "构建应用..."
cd apps/admin && bun run build && cd ../..
cd apps/web && bun run build && cd ../..
cd apps/api && bun run build && cd ../..
cd apps/broker && bun run build && cd ../..
cd apps/cleaner && bun run build && cd ../..
cd apps/crawler && bun run build && cd ../..

echo "所有构建完成！"