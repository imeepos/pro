# ========================================
# 基础准备阶段：共享的依赖安装层
# 目的：为 development 和 builder 阶段提供统一的依赖基础
# 缓存策略：优先使用已有镜像作为基础，大幅加速构建
# ========================================
ARG BUILD_FROM_BASE=node:20-alpine
FROM $BUILD_FROM_BASE AS base

# 创建非 root 用户（修复权限问题）
RUN (getent group nodejs >/dev/null 2>&1 || addgroup -g 1001 -S nodejs) && \
    (id nestjs >/dev/null 2>&1 || adduser -S nestjs -u 1001)

# 安装 bun（全局，可被后续阶段复用）
RUN curl -fsSL https://bun.sh/install | bash

# 设置工作目录并确保权限正确
WORKDIR /app

# 创建 bun 缓存目录并设置权限
RUN mkdir -p /root/.bun/install/cache && \
    chown -R nestjs:nodejs /app && \
    chown -R nestjs:nodejs /root/.bun

# ========================================
# 依赖声明层：复制所有 package.json 文件
# 目的：将依赖声明与源代码分离，最大化缓存利用
# 变化频率：低（仅在依赖变更时重建）
# ========================================
# 复制 workspace 配置文件
COPY pnpm-workspace.yaml package.json bun.lockb ./

# 复制所有 packages 的 package.json（按依赖关系排序）
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/utils/package.json ./packages/utils/
COPY packages/mongodb/package.json ./packages/mongodb/
COPY packages/redis/package.json ./packages/redis/
COPY packages/rabbitmq/package.json ./packages/rabbitmq/

# 复制 broker 应用的 package.json
COPY apps/broker/package.json ./apps/broker/

# ========================================
# 依赖安装层：安装所有依赖
# 目的：为开发和构建提供完整的依赖环境
# ========================================
RUN --mount=type=cache,id=bun-base,target=/root/.bun/install/cache \
    echo "🔧 安装所有依赖..." && \
    chown -R nestjs:nodejs /app && \
    chown -R nestjs:nodejs /root/.bun && \
    bun install --frozen-lockfile

# ========================================
# 开发阶段：基于依赖层，添加源代码热重载
# ========================================
FROM base AS development

# 复制源代码（开发时需要完整源码用于热重载）
COPY packages/ ./packages/
COPY apps/ ./apps/

# 暴露端口
EXPOSE 3003

# 启动开发服务器
CMD ["bun", "--filter", "@pro/broker", "start:dev"]

# ============================================
# 构建阶段：基于依赖层，按依赖关系逐层构建
# 目的：最大化利用缓存，只重建变化的部分
# 缓存策略：按依赖关系分层，源码变化只影响相关层
# ============================================
FROM base AS builder

# Builder 阶段直接使用 base 阶段安装的依赖

# ============================================
# 基础配置层：TypeScript 配置（变化频率极低）
# 目的：将构建配置与源代码分离
# ============================================
COPY tsconfig.base.json* ./

# ============================================
# 核心依赖构建层：按依赖关系逐构建 packages
# 目的：利用 Docker 层级缓存，只重建变化的 package
# 构建顺序：按依赖关系从底层到上层
# ============================================

# 第一层：@pro/types（基础类型定义，无依赖）
# 目的：最底层包，types 变化只影响此层及所有后续层
COPY packages/types/tsconfig.json ./packages/types/
COPY packages/types/src ./packages/types/src
RUN bun --filter @pro/types build

# 第二层：@pro/config（配置管理，依赖 types）
# 目的：config 变化只影响此层及依赖它的后续层
COPY packages/config/tsconfig.json ./packages/config/
COPY packages/config/src ./packages/config/src
RUN bun --filter @pro/config build

# 第三层：@pro/mongodb（MongoDB 封装，独立依赖）
# 目的：mongodb 变化只影响此层及依赖它的后续层
COPY packages/mongodb/tsconfig.json ./packages/mongodb/
COPY packages/mongodb/src ./packages/mongodb/src
RUN bun --filter @pro/mongodb build

# 第四层：@pro/utils（工具函数，独立依赖）
# 目的：utils 变化只影响此层及依赖它的后续层
COPY packages/utils/tsconfig.json ./packages/utils/
COPY packages/utils/src ./packages/utils/src
RUN bun --filter @pro/utils build

# 第五层：@pro/redis（Redis 封装，依赖 config）
# 目的：redis 变化只影响此层及依赖它的后续层
COPY packages/redis/tsconfig.json ./packages/redis/
COPY packages/redis/src ./packages/redis/src
RUN bun --filter @pro/redis build

# 第六层：@pro/rabbitmq（RabbitMQ 封装，依赖 config）
# 目的：rabbitmq 变化只影响此层及依赖它的后续层
COPY packages/rabbitmq/tsconfig.json ./packages/rabbitmq/
COPY packages/rabbitmq/src ./packages/rabbitmq/src
RUN bun --filter @pro/rabbitmq build

# 第七层：@pro/broker 应用（顶层应用，依赖所有 packages）
# 目的：broker 变化只影响此层，最大化缓存利用
COPY apps/broker/tsconfig.json ./apps/broker/
COPY apps/broker/tsconfig.build.json* ./apps/broker/
COPY apps/broker/nest-cli.json* ./apps/broker/
COPY apps/broker/src ./apps/broker/src
RUN bun --filter @pro/broker build

# ========================================
# 生产阶段：运行时镜像
# 目的：基于构建产物创建包含所有依赖的运行时镜像
# ========================================
FROM node:20-alpine AS production

# ========================================
# 运行时准备层：安装系统依赖和配置用户
# 目的：配置安全的运行环境，避免使用 root 用户
# ========================================
# 安装 bun 和 dumb-init（信号处理）
RUN curl -fsSL https://bun.sh/install | bash && \
    apk add --no-cache dumb-init

# 创建非 root 用户（安全最佳实践）
RUN (getent group nodejs >/dev/null 2>&1 || addgroup -g 1001 -S nodejs) && \
    (id nestjs >/dev/null 2>&1 || adduser -S nestjs -u 1001)

# 设置工作目录
WORKDIR /app

# ========================================
# 依赖层：安装所有依赖（生产和开发）
# 目的：简化依赖管理，确保运行时环境完整
# ========================================
# 复制依赖声明文件
COPY --chown=nestjs:nodejs pnpm-workspace.yaml package.json bun.lockb ./
COPY --chown=nestjs:nodejs packages/types/package.json ./packages/types/
COPY --chown=nestjs:nodejs packages/config/package.json ./packages/config/
COPY --chown=nestjs:nodejs packages/utils/package.json ./packages/utils/
COPY --chown=nestjs:nodejs packages/mongodb/package.json ./packages/mongodb/
COPY --chown=nestjs:nodejs packages/redis/package.json ./packages/redis/
COPY --chown=nestjs:nodejs packages/rabbitmq/package.json ./packages/rabbitmq/
COPY --chown=nestjs:nodejs apps/broker/package.json ./apps/broker/

# 安装所有依赖（包括开发依赖）
RUN --mount=type=cache,id=bun-all,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# ========================================
# 构建产物层：复制编译后的代码
# 目的：从 builder 阶段复制构建产物，不包含源代码
# 优势：镜像体积小，安全性高，构建速度快
# ========================================
# 复制 packages 的构建产物（按依赖关系顺序复制）
COPY --from=builder --chown=nestjs:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/config/dist ./packages/config/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/mongodb/dist ./packages/mongodb/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/redis/dist ./packages/redis/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/rabbitmq/dist ./packages/rabbitmq/dist

# 复制应用的构建产物
COPY --from=builder --chown=nestjs:nodejs /app/apps/broker/dist ./apps/broker/dist

# ========================================
# 运行时配置：用户权限、环境变量和健康检查
# 目的：配置生产环境的运行参数
# ========================================
# 切换到非 root 用户
USER nestjs

# 暴露端口
EXPOSE 3003

# 设置生产环境变量
ENV NODE_ENV=production
ENV NODE_OPTIONS="--experimental-global-webcrypto"
ENV BUN_INSTALL_ROOT=/root/.bun
ENV PATH=/root/.bun/bin:$PATH

# 健康检查（确保服务可用性）
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3003/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用（使用 dumb-init 处理信号）
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/broker/dist/apps/broker/src/main.js"]
