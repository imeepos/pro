# ========================================
# Packages Builder 镜像
# ========================================
# 目的：构建包含所有共享 packages 的基础镜像
# 用途：为应用镜像提供预构建的 packages，减少应用构建时间
# 策略：多阶段构建 + 分层缓存 + 依赖关系优化
# 优化：基于统一权限配置的 base 镜像，减少用户切换
# ========================================

# ========================================
# 基础镜像配置
# 基于 imeepos/base:latest，包含统一的权限配置和 bun 安装
# ========================================
ARG BUILD_FROM_BASE=imeepos/base:latest
FROM $BUILD_FROM_BASE AS base

# ========================================
# 元数据标签
# ========================================
LABEL maintainer="Pro Team" \
      description="包含所有共享 packages 构建产物的基础镜像" \
      base.image="imeepos/base:latest" \
      packages="types,config,utils,mongodb,redis,rabbitmq,minio"

# ========================================
# 依赖声明阶段 (deps)
# 目的：将依赖声明与源代码分离，最大化缓存利用
# 变化频率：低（仅在依赖变更时重建）
# 优化：利用 base 镜像的统一权限配置，减少用户切换
# ========================================
FROM base AS deps

# 设置工作目录（base 镜像已配置好权限）
WORKDIR /app

# 配置 Bun 临时目录，解决权限问题
ENV BUN_TMPDIR=/home/nestjs/tmp \
    BUN_INSTALL_CACHE_DIR=/home/nestjs/.bun/install/cache

# ========================================
# 复制 workspace 配置文件
# 这些文件决定了 monorepo 的结构
# 优化：直接使用 base 镜像的 nestjs 用户权限
# ========================================
COPY --chown=nestjs:nodejs package.json bun.lock ./

# ========================================
# 复制所有 packages 的 package.json
# 按依赖关系排序，便于理解构建流程
# 优化：保持权限一致性，无需额外权限设置
# ========================================
# 第一层：无依赖的基础 packages
COPY --chown=nestjs:nodejs packages/types/package.json ./packages/types/
COPY --chown=nestjs:nodejs packages/config/package.json ./packages/config/

# 第二层：依赖基础 packages 的工具层
COPY --chown=nestjs:nodejs packages/utils/package.json ./packages/utils/

# 第三层：服务集成层（MongoDB、Redis、RabbitMQ、MinIO）
COPY --chown=nestjs:nodejs packages/mongodb/package.json ./packages/mongodb/
COPY --chown=nestjs:nodejs packages/redis/package.json ./packages/redis/
COPY --chown=nestjs:nodejs packages/rabbitmq/package.json ./packages/rabbitmq/
COPY --chown=nestjs:nodejs packages/minio/package.json ./packages/minio/

# ========================================
# 安装所有依赖
# 优化：使用统一的缓存目录和权限配置
# 1. 利用 base 镜像已安装的 bun
# 2. 使用统一的缓存 ID 和目录
# 3. 减少权限切换操作
# 4. 确保临时目录存在并有正确权限
# ========================================
RUN --mount=type=cache,id=bun-packages,target=/home/nestjs/.bun/install/cache,uid=1001,gid=1001 \
    echo "🔧 安装所有 packages 依赖..." && \
    mkdir -p /home/nestjs/tmp && \
    chmod 755 /home/nestjs/tmp && \
    BUN_TMPDIR=/home/nestjs/tmp bun install

# ========================================
# 构建阶段 (builder)
# 目的：按依赖关系逐层构建 packages
# 策略：分层构建，最大化利用 Docker 层级缓存
# 优势：源码变化只影响相关层及后续依赖层
# 优化：保持统一的权限配置，无需用户切换
# ========================================
FROM deps AS builder

# ========================================
# 复制 TypeScript 基础配置
# 变化频率：极低，放在最前面
# 优化：继承 base 镜像的权限配置
# ========================================
COPY --chown=nestjs:nodejs tsconfig.base.json* ./

# ========================================
# 第一层：@pro/types
# 基础类型定义，无依赖，最底层 package
# 影响范围：types 变化会影响所有依赖它的后续层
# 优化：使用统一的用户权限和缓存配置
# ========================================
COPY --chown=nestjs:nodejs packages/types/tsconfig.json ./packages/types/
COPY --chown=nestjs:nodejs packages/types/src ./packages/types/src
RUN echo "🏗️  构建 @pro/types..." && \
    bun --filter @pro/types build

# ========================================
# 第三层：@pro/utils
# 工具函数库，依赖 types
# 影响范围：utils 变化影响使用工具函数的 packages
# 优化：利用已安装的依赖，无需重新安装
# ========================================
COPY --chown=nestjs:nodejs packages/utils/tsconfig.json ./packages/utils/
COPY --chown=nestjs:nodejs packages/utils/src ./packages/utils/src
RUN echo "🏗️  构建 @pro/utils..." && \
    bun --filter @pro/utils build

# ========================================
# 第四层：服务集成层
# MongoDB、Redis、RabbitMQ、MinIO 相互独立
# 影响范围：各自变化只影响依赖它们的应用
# 缓存策略：每个服务独立缓存，互不影响
# 优化：统一权限管理，减少构建开销
# ========================================

# @pro/mongodb - MongoDB 数据库封装
COPY --chown=nestjs:nodejs packages/mongodb/tsconfig.json ./packages/mongodb/
COPY --chown=nestjs:nodejs packages/mongodb/src ./packages/mongodb/src
RUN echo "🏗️  构建 @pro/mongodb..." && \
    bun --filter @pro/mongodb build

# @pro/redis - Redis 缓存封装
COPY --chown=nestjs:nodejs packages/redis/tsconfig.json ./packages/redis/
COPY --chown=nestjs:nodejs packages/redis/src ./packages/redis/src
RUN echo "🏗️  构建 @pro/redis..." && \
    bun --filter @pro/redis build

# @pro/rabbitmq - RabbitMQ 消息队列封装
COPY --chown=nestjs:nodejs packages/rabbitmq/tsconfig.json ./packages/rabbitmq/
COPY --chown=nestjs:nodejs packages/rabbitmq/src ./packages/rabbitmq/src
RUN echo "🏗️  构建 @pro/rabbitmq..." && \
    bun --filter @pro/rabbitmq build

# @pro/minio - MinIO 对象存储封装
COPY --chown=nestjs:nodejs packages/minio/tsconfig.json ./packages/minio/
COPY --chown=nestjs:nodejs packages/minio/src ./packages/minio/src
RUN echo "🏗️  构建 @pro/minio..." && \
    bun --filter @pro/minio build

# ========================================
# 生产阶段 (production)
# 目的：输出包含所有 packages 构建产物的镜像
# 用途：作为应用镜像的基础，提供预构建的 packages
# 优势：应用构建时无需重新构建 packages，大幅提升速度
# 优化：基于统一权限配置，减少用户切换和重复操作
# ========================================
FROM base AS production

# 设置工作目录（base 镜像已配置好权限）
WORKDIR /app

# ========================================
# 复制依赖声明文件
# 应用镜像需要这些文件来识别依赖关系
# 优化：直接使用 base 镜像的 nestjs 用户权限
# ========================================
COPY --chown=nestjs:nodejs package.json bun.lock ./

# 复制所有 packages 的 package.json
# 优化：保持权限一致性，避免额外的权限设置
COPY --chown=nestjs:nodejs packages/types/package.json ./packages/types/
COPY --chown=nestjs:nodejs packages/config/package.json ./packages/config/
COPY --chown=nestjs:nodejs packages/utils/package.json ./packages/utils/
COPY --chown=nestjs:nodejs packages/mongodb/package.json ./packages/mongodb/
COPY --chown=nestjs:nodejs packages/redis/package.json ./packages/redis/
COPY --chown=nestjs:nodejs packages/rabbitmq/package.json ./packages/rabbitmq/
COPY --chown=nestjs:nodejs packages/minio/package.json ./packages/minio/

# ========================================
# 安装所有依赖
# 优化：复用依赖阶段的缓存，使用统一的缓存目录
# 1. 使用统一的缓存 ID，最大化缓存复用
# 2. 利用 base 镜像已配置的 bun 和权限
# 3. 避免重复安装 base 镜像已有的依赖
# 4. 确保临时目录存在并有正确权限
# ========================================
RUN --mount=type=cache,id=bun-packages,target=/home/nestjs/.bun/install/cache,uid=1001,gid=1001 \
    echo "📦 安装生产依赖..." && \
    mkdir -p /home/nestjs/tmp && \
    chmod 755 /home/nestjs/tmp && \
    BUN_TMPDIR=/home/nestjs/tmp bun install

# ========================================
# 复制构建产物
# 从 builder 阶段复制所有 packages 的编译结果
# 按依赖关系顺序复制，便于理解和维护
# 优化：权限一致性，无需额外的 chown 操作
# ========================================
COPY --from=builder --chown=nestjs:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/config/dist ./packages/config/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/mongodb/dist ./packages/mongodb/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/redis/dist ./packages/redis/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/rabbitmq/dist ./packages/rabbitmq/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/minio/dist ./packages/minio/dist

# ========================================
# 环境变量配置
# 优化：与 base 镜像保持一致的环境变量
# 使用统一的家目录和路径配置
# ========================================
ENV NODE_ENV=production \
    BUN_INSTALL=/home/nestjs/.bun \
    BUN_TMPDIR=/home/nestjs/tmp \
    BUN_INSTALL_CACHE_DIR=/home/nestjs/.bun/install/cache \
    PATH=${BUN_INSTALL}/bin:${PATH}

# ========================================
# 用户权限验证
# 确保以正确的用户身份运行
# 优化：base 镜像已配置好，无需额外操作
# ========================================
USER nestjs

# ========================================
# 默认命令
# 此镜像作为基础镜像使用，不直接运行
# 优化：提供更详细的镜像信息
# ========================================
CMD ["echo", "Packages builder image ready. Use as base for application images. All packages built and cached."]
