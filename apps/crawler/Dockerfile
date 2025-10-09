# ========================================
# 开发阶段
# ========================================
FROM node:18-alpine AS development

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@10.18.1 --activate

# 设置工作目录
WORKDIR /app

# 复制 workspace 配置文件
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# 复制所有 packages 的 package.json
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/utils/package.json ./packages/utils/
COPY packages/redis/package.json ./packages/redis/
COPY packages/mongodb/package.json ./packages/mongodb/
COPY packages/rabbitmq/package.json ./packages/rabbitmq/
COPY packages/minio/package.json ./packages/minio/

# 复制 crawler 应用的 package.json
COPY apps/crawler/package.json ./apps/crawler/

# 安装依赖
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile

# 暴露端口
EXPOSE 3001

# 启动开发服务器
CMD ["pnpm", "--filter", "@pro/crawler", "start:dev"]

# ============================================
# 构建阶段：安装依赖并构建 NestJS 应用
# ============================================
FROM node:18-alpine AS builder

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@10.18.1 --activate

# 设置工作目录
WORKDIR /app

# ============================================
# 第一层：复制 package.json 文件（依赖声明）
# 目的：只有依赖变化时才重新安装，源代码变化不影响此层
# ============================================

# 复制 workspace 配置文件
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# 复制所有 packages 的 package.json
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/utils/package.json ./packages/utils/
COPY packages/redis/package.json ./packages/redis/
COPY packages/mongodb/package.json ./packages/mongodb/
COPY packages/rabbitmq/package.json ./packages/rabbitmq/
COPY packages/minio/package.json ./packages/minio/

# 复制 crawler 应用的 package.json
COPY apps/crawler/package.json ./apps/crawler/

# ============================================
# 第二层：安装依赖
# 使用 BuildKit cache mount 加速依赖下载
# 只有 package.json 或 lockfile 变化时才会重新执行
# ============================================
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile

# ============================================
# 第三层：复制基础 TypeScript 配置
# ============================================
COPY tsconfig.base.json* ./

# ============================================
# 第四层：构建 @pro/types
# 目的：独立层，types 源码变化只影响此层及依赖它的后续层
# ============================================
COPY packages/types/tsconfig.json ./packages/types/
COPY packages/types/src ./packages/types/src
RUN pnpm --filter @pro/types build

# ============================================
# 第五层：构建 @pro/config
# 目的：独立层，config 源码变化只影响此层及依赖它的后续层
# 依赖：@pro/types
# ============================================
COPY packages/config/tsconfig.json ./packages/config/
COPY packages/config/src ./packages/config/src
RUN pnpm --filter @pro/config build

# ============================================
# 第六层：构建 @pro/utils
# 目的：独立层，utils 源码变化只影响此层及依赖它的后续层
# ============================================
COPY packages/utils/tsconfig.json ./packages/utils/
COPY packages/utils/src ./packages/utils/src
RUN pnpm --filter @pro/utils build

# ============================================
# 第七层：构建 @pro/redis
# 目的：独立层，redis 源码变化只影响此层及依赖它的后续层
# 依赖：@pro/config
# ============================================
COPY packages/redis/tsconfig.json ./packages/redis/
COPY packages/redis/src ./packages/redis/src
RUN pnpm --filter @pro/redis build

# ============================================
# 第八层：构建 @pro/mongodb
# 目的：独立层，mongodb 源码变化只影响此层及依赖它的后续层
# 依赖：@pro/config
# ============================================
COPY packages/mongodb/tsconfig.json ./packages/mongodb/
COPY packages/mongodb/src ./packages/mongodb/src
RUN pnpm --filter @pro/mongodb build

# ============================================
# 第九层：构建 @pro/rabbitmq
# 目的：独立层，rabbitmq 源码变化只影响此层及依赖它的后续层
# 依赖：@pro/config
# ============================================
COPY packages/rabbitmq/tsconfig.json ./packages/rabbitmq/
COPY packages/rabbitmq/src ./packages/rabbitmq/src
RUN pnpm --filter @pro/rabbitmq build

# ============================================
# 第十层：构建 @pro/minio
# 目的：独立层，minio 源码变化只影响此层及依赖它的后续层
# 依赖：@pro/config
# ============================================
COPY packages/minio/tsconfig.json ./packages/minio/
COPY packages/minio/src ./packages/minio/src
RUN pnpm --filter @pro/minio build

# ============================================
# 第十一层：构建 @pro/crawler 应用
# 目的：独立层，crawler 源码变化只影响此层
# 依赖：所有前置 packages
# ============================================
COPY apps/crawler/tsconfig.json ./apps/crawler/
COPY apps/crawler/tsconfig.build.json* ./apps/crawler/
COPY apps/crawler/nest-cli.json* ./apps/crawler/
COPY apps/crawler/src ./apps/crawler/src
RUN pnpm --filter @pro/crawler build

# ========================================
# 生产阶段
# ========================================
FROM node:18-alpine AS production

# 安装 pnpm 和 dumb-init
RUN corepack enable && corepack prepare pnpm@10.18.1 --activate && \
    apk add --no-cache dumb-init

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# 设置工作目录
WORKDIR /app

# 复制 workspace 配置文件
COPY --chown=nestjs:nodejs pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# 复制 packages 的 package.json
COPY --chown=nestjs:nodejs packages/types/package.json ./packages/types/
COPY --chown=nestjs:nodejs packages/config/package.json ./packages/config/
COPY --chown=nestjs:nodejs packages/utils/package.json ./packages/utils/
COPY --chown=nestjs:nodejs packages/redis/package.json ./packages/redis/
COPY --chown=nestjs:nodejs packages/mongodb/package.json ./packages/mongodb/
COPY --chown=nestjs:nodejs packages/rabbitmq/package.json ./packages/rabbitmq/
COPY --chown=nestjs:nodejs packages/minio/package.json ./packages/minio/

# 复制 apps/crawler 的 package.json
COPY --chown=nestjs:nodejs apps/crawler/package.json ./apps/crawler/

# 安装生产依赖（使用 BuildKit cache mount）
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --prod --no-frozen-lockfile

# 从构建阶段复制编译后的代码
COPY --from=builder --chown=nestjs:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/config/dist ./packages/config/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/redis/dist ./packages/redis/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/mongodb/dist ./packages/mongodb/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/rabbitmq/dist ./packages/rabbitmq/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/minio/dist ./packages/minio/dist

# 复制 apps/crawler 的构建产物
COPY --from=builder --chown=nestjs:nodejs /app/apps/crawler/dist ./apps/crawler/dist

# 切换到非 root 用户
USER nestjs

# 暴露端口
EXPOSE 3001

# 设置环境变量
ENV NODE_ENV=production
ENV NODE_OPTIONS="--experimental-global-webcrypto"

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用 dumb-init 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/crawler/dist/main.js"]
