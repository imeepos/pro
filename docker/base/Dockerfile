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
    bash \
    curl \
    dumb-init \
    git

# ========================================
# 创建非 root 用户和组
# 早期创建用户，确保后续所有操作都使用正确的用户权限
# ========================================
RUN if ! getent group nodejs > /dev/null 2>&1; then \
      addgroup -g 1001 nodejs; \
    fi && \
    if ! getent passwd nestjs > /dev/null 2>&1; then \
      adduser -D -u 1001 -G nodejs nestjs; \
    fi

# ========================================
# 设置工作目录并配置权限
# 确保目录所有权在用户操作前已正确设置
# ========================================
WORKDIR /app
RUN chown nestjs:nodejs /app

# ========================================
# 创建并配置 Bun 相关目录
# 统一使用 /home/nestjs/.bun 避免权限冲突
# 创建 /home/nestjs/tmp 作为 Bun 临时目录
# ========================================
RUN mkdir -p /home/nestjs/.bun /home/nestjs/tmp && \
    chown nestjs:nodejs /home/nestjs/.bun /home/nestjs/tmp

# ========================================
# 安装 Bun 并配置权限和环境变量
# 临时切换到 root 安装 Bun，然后配置权限给 nestjs 用户
# 配置 BUN_TMPDIR 指向用户可写的临时目录
# ========================================
ENV BUN_INSTALL=/home/nestjs/.bun \
    BUN_TMPDIR=/home/nestjs/tmp
USER nestjs
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH=${BUN_INSTALL}/bin:${PATH}

# ========================================
# 默认使用非 root 用户
# 子镜像可以根据需要切换回 root
# ========================================
USER nestjs
