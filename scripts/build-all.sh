#!/bin/bash

# 构建所有依赖包和应用的脚本
# 按照依赖顺序构建，避免并发构建导致的问题

set -e  # 遇到错误立即退出

echo "开始构建所有包和应用..."

# 构建基础依赖包
echo "构建基础依赖包..."
cd packages/types && pnpm run build && cd ../..
cd packages/utils && pnpm run build && cd ../..
cd packages/entities && pnpm run build && cd ../..
cd packages/logger && pnpm run build && cd ../..

# 构建中间层包
echo "构建中间层包..."
cd packages/sdk && pnpm run build && cd ../..
cd packages/components && pnpm run build && cd ../..
cd packages/redis && pnpm run build && cd ../..
cd packages/rabbitmq && pnpm run build && cd ../..

# 构建存储相关包
echo "构建存储相关包..."
cd packages/mongodb && pnpm run build && cd ../..
cd packages/minio && pnpm run build && cd ../..

# 构建应用
echo "构建应用..."
cd apps/admin && pnpm run build && cd ../..
cd apps/web && pnpm run build && cd ../..
cd apps/api && pnpm run build && cd ../..
cd apps/broker && pnpm run build && cd ../..
cd apps/cleaner && pnpm run build && cd ../..
cd apps/crawler && pnpm run build && cd ../..

echo "所有构建完成！"