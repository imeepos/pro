# ========================================
# Pro 项目统一基础镜像
# ========================================
# 目的：提供所有服务的公共依赖层，减少重复构建
# 包含：node、bun、系统工具、标准用户、工作目录
# ========================================

FROM node:20-alpine AS base

# ========================================
# 元数据标签
# ========================================
LABEL maintainer="Pro Team" \
      description="Pro 项目统一基础镜像" \
      base.image="node:20-alpine" \
      base.node.version="20" \
      base.bun.version="latest"

# ========================================
# 安装系统工具
# 按变化频率排序：系统包变化频率最低，放在最前面
# ========================================
RUN apk add --no-cache \
    curl \
    dumb-init \
    git

# ========================================
# 安装 Bun
# 配置环境变量使 bun 命令全局可用
# ========================================
ENV BUN_INSTALL=/root/.bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH=${BUN_INSTALL}/bin:${PATH}

# ========================================
# 创建非 root 用户和组
# 检查并创建以支持基于此镜像的二次构建
# ========================================
RUN if ! getent group nodejs > /dev/null 2>&1; then \
      addgroup -g 1001 nodejs; \
    fi && \
    if ! getent passwd nestjs > /dev/null 2>&1; then \
      adduser -D -u 1001 -G nodejs nestjs; \
    fi

# ========================================
# 设置工作目录并配置权限
# ========================================
WORKDIR /app
RUN chown -R nestjs:nodejs /app

# ========================================
# 默认使用非 root 用户
# 子镜像可以根据需要切换回 root
# ========================================
USER nestjs
