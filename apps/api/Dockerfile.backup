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

# 复制 api 应用的 package.json
COPY apps/api/package.json ./apps/api/

# 安装依赖
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# 暴露端口
EXPOSE 3000

# 启动开发服务器
CMD ["pnpm", "--filter", "@pro/api", "start:dev"]

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

# 复制 api 应用的 package.json
COPY apps/api/package.json ./apps/api/

# ============================================
# 第二层：安装依赖
# 使用 BuildKit cache mount 加速依赖下载
# 只有 package.json 或 lockfile 变化时才会重新执行
# ============================================
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

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
# 第十一层：构建 @pro/api 应用
# 目的：独立层，api 源码变化只影响此层
# 依赖：所有前置 packages
# ============================================
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/tsconfig.build.json* ./apps/api/
COPY apps/api/nest-cli.json* ./apps/api/
COPY apps/api/src ./apps/api/src
RUN pnpm --filter @pro/api build

# ========================================
# 生产阶段
# ========================================
FROM node:18-slim AS production

# 安装系统依赖：Playwright 浏览器所需的库
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    dumb-init \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@10.18.1 --activate

# 创建非 root 用户
RUN groupadd -g 1001 nodejs && \
    useradd -m -u 1001 -g nodejs nestjs

# 设置工作目录
WORKDIR /app

# 复制 workspace 配置文件
COPY --chown=nestjs:nodejs pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# 复制 packages 的 package.json（用于安装生产依赖）
COPY --chown=nestjs:nodejs packages/types/package.json ./packages/types/
COPY --chown=nestjs:nodejs packages/config/package.json ./packages/config/
COPY --chown=nestjs:nodejs packages/utils/package.json ./packages/utils/
COPY --chown=nestjs:nodejs packages/redis/package.json ./packages/redis/
COPY --chown=nestjs:nodejs packages/mongodb/package.json ./packages/mongodb/
COPY --chown=nestjs:nodejs packages/rabbitmq/package.json ./packages/rabbitmq/
COPY --chown=nestjs:nodejs packages/minio/package.json ./packages/minio/

# 复制 apps/api 的 package.json
COPY --chown=nestjs:nodejs apps/api/package.json ./apps/api/

# 安装生产依赖（使用 BuildKit cache mount）
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile

# 安装 Playwright 浏览器（使用 chromium）
RUN npx playwright install chromium

# 从构建阶段复制编译后的代码
COPY --from=builder --chown=nestjs:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/config/dist ./packages/config/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/redis/dist ./packages/redis/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/mongodb/dist ./packages/mongodb/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/rabbitmq/dist ./packages/rabbitmq/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/minio/dist ./packages/minio/dist

# 复制 apps/api 的构建产物
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist

# 切换到非 root 用户
USER nestjs

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production

# 健康检查（可选）
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用 dumb-init 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/dist/main.js"]
