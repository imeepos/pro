# Pro 项目统一基础镜像

## 概述

`docker/base/Dockerfile` 提供了所有服务的公共依赖层，包含 Node.js、Bun、系统工具和标准用户配置。

## 包含内容

- **基础镜像**: `node:20-alpine`
- **运行时**: Bun (最新版本)
- **系统工具**: curl, dumb-init, git
- **标准用户**: `nestjs:nodejs` (uid=1001, gid=1001)
- **工作目录**: `/app` (权限已配置)

## 使用方式

### 方式一：本地构建后引用

```dockerfile
# 第一步：构建基础镜像
# docker build -t pro-base:latest -f docker/base/Dockerfile docker/base/

# 第二步：在服务 Dockerfile 中使用
FROM pro-base:latest AS base

# 如需 root 权限执行操作
USER root
RUN apk add --no-cache your-package
USER nestjs

# 继续你的构建逻辑
COPY package.json ./
RUN bun install
```

### 方式二：多阶段构建中直接使用

```dockerfile
# 直接引用 base 目标
FROM node:20-alpine AS base
# ... (复制 docker/base/Dockerfile 的内容)

FROM base AS builder
# 构建逻辑

FROM base AS production
# 生产配置
```

## 设计原则

### 缓存优化
层按变化频率排序：
1. 系统包安装（最稳定）
2. Bun 安装
3. 用户创建
4. 工作目录设置

### 安全性
- 默认使用非 root 用户 `nestjs`
- 仅在必要时切换到 root
- 最小化系统包安装

### 可扩展性
- 支持基于此镜像的二次构建
- 用户创建时检查是否已存在
- 环境变量配置完整

## 镜像信息

```bash
# 查看镜像元数据
docker image inspect pro-base:latest --format='{{json .Config.Labels}}' | jq

# 输出示例:
# {
#   "maintainer": "Pro Team",
#   "description": "Pro 项目统一基础镜像",
#   "base.image": "node:20-alpine",
#   "base.node.version": "20",
#   "base.bun.version": "latest"
# }
```

## 环境变量

- `BUN_INSTALL=/root/.bun` - Bun 安装路径
- `PATH=${BUN_INSTALL}/bin:${PATH}` - 包含 bun 命令

## 适用场景

- ✅ NestJS 后端服务 (api, broker, crawler, cleaner)
- ✅ 需要 Bun 构建的前端应用 (web, admin)
- ✅ 工具包构建 (@pro/types, @pro/utils, etc.)
- ❌ 纯 Nginx 静态服务（无需 Node.js 环境）
