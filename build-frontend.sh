#!/bin/bash

set -e

echo "========================================="
echo "构建前端应用"
echo "========================================="

# 检查当前目录
if [ ! -f "pnpm-workspace.yaml" ]; then
    echo "错误：请在项目根目录执行此脚本"
    exit 1
fi

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    pnpm install
fi

# 构建 web 应用
echo ""
echo "========================================="
echo "构建 @pro/web"
echo "========================================="
cd apps/web
pnpm build
cd ../..

# 构建 admin 应用
echo ""
echo "========================================="
echo "构建 @pro/admin"
echo "========================================="
cd apps/admin
pnpm build
cd ../..

# 检查构建产物
echo ""
echo "========================================="
echo "检查构建产物"
echo "========================================="

if [ -d "apps/web/dist/web/browser" ]; then
    echo "✓ web 构建产物存在: apps/web/dist/web/browser"
else
    echo "✗ web 构建产物不存在"
    exit 1
fi

if [ -d "apps/admin/dist/admin/browser" ]; then
    echo "✓ admin 构建产物存在: apps/admin/dist/admin/browser"
else
    echo "✗ admin 构建产物不存在"
    exit 1
fi

echo ""
echo "========================================="
echo "构建完成！"
echo "========================================="
echo ""
echo "现在可以启动容器："
echo "  docker-compose up -d --build web admin"
echo ""
echo "或重启已存在的容器："
echo "  docker-compose restart web admin"
echo ""
