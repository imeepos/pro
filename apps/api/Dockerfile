# ========================================
# API 应用镜像
# ========================================
# 架构：基于 Playwright 基础镜像，预装所有必要依赖
# 优化：统一权限配置，避免重复安装 Playwright 依赖
# 策略：playwright-base → development/production
# ========================================

# ========================================
# 构建参数
# ========================================
ARG BUILD_VERSION=1.0.0
ARG BUILD_TIME
ARG GIT_COMMIT
ARG BUILD_TYPE=full

# ========================================
# Playwright 基础阶段
# 目的：利用预装 Playwright 依赖的基础镜像
# 优势：包含 Chromium、系统依赖、Bun 运行时
# ========================================
FROM imeepos/playwright:latest AS base

# ========================================
# 开发阶段
# 目的：本地开发环境，支持热重载
# 基础：playwright-base (已包含所有系统依赖)
# ========================================
FROM base AS development

ARG BUILD_VERSION
ARG BUILD_TIME
ARG GIT_COMMIT
ARG BUILD_TYPE

LABEL version="${BUILD_VERSION}" \
      build-time="${BUILD_TIME}" \
      git-commit="${GIT_COMMIT}" \
      build-type="${BUILD_TYPE}" \
      stage="development"

USER nestjs
WORKDIR /app

# 复制 API 应用配置
COPY apps/api/package.json ./apps/api/

# 安装 API 应用依赖（使用统一的缓存目录）
RUN --mount=type=cache,id=bun-api-dev,target=/home/nestjs/.bun/install/cache \
    echo "📦 安装 @pro/api 依赖..." && \
    bun install

EXPOSE 3000

CMD ["bun", "--filter", "@pro/api", "start:dev"]

# ========================================
# 构建阶段
# 目的：构建 @pro/api 应用
# 基础：playwright-base
# ========================================
FROM base AS builder

ARG BUILD_VERSION
ARG BUILD_TIME
ARG GIT_COMMIT
ARG BUILD_TYPE

LABEL version="${BUILD_VERSION}" \
      build-time="${BUILD_TIME}" \
      git-commit="${GIT_COMMIT}" \
      build-type="${BUILD_TYPE}" \
      stage="builder"

USER nestjs
WORKDIR /app

# 复制 API 应用配置
COPY apps/api/package.json ./apps/api/

# 安装依赖（使用统一的缓存目录）
RUN --mount=type=cache,id=bun-api-builder,target=/home/nestjs/.bun/install/cache \
    echo "📦 安装 @pro/api 依赖..." && \
    bun install

# 复制源码
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/tsconfig.build.json* ./apps/api/
COPY apps/api/nest-cli.json* ./apps/api/
COPY apps/api/src ./apps/api/src

# 构建应用
RUN echo "🏗️  构建 @pro/api..." && \
    bun --filter @pro/api build

# ========================================
# 生产阶段
# 目的：最小化生产镜像
# 基础：playwright-base (复用所有预装依赖)
# ========================================
FROM base AS production

ARG BUILD_VERSION
ARG BUILD_TIME
ARG GIT_COMMIT
ARG BUILD_TYPE

LABEL version="${BUILD_VERSION}" \
      build-time="${BUILD_TIME}" \
      git-commit="${GIT_COMMIT}" \
      build-type="${BUILD_TYPE}" \
      stage="production"

USER nestjs
WORKDIR /app

# 从 builder 复制构建产物
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/bun.lock ./

# 安装生产依赖（使用统一的缓存目录）
RUN --mount=type=cache,id=bun-api-prod,target=/home/nestjs/.bun/install/cache \
    echo "📦 安装 @pro/api 生产依赖..." && \
    bun install --cwd ./apps/api --production

# 创建版本信息
RUN echo "{ \
      \"version\": \"${BUILD_VERSION}\", \
      \"buildTime\": \"${BUILD_TIME}\", \
      \"gitCommit\": \"${GIT_COMMIT}\", \
      \"buildType\": \"${BUILD_TYPE}\", \
      \"stage\": \"production\", \
      \"nodeVersion\": \"$(node --version)\", \
      \"platform\": \"$(uname -a)\" \
    }" > /app/build-info.json

EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 切换到 root 用户安装 dumb-init（基础镜像中可能未包含）
USER root
RUN apk add --no-cache dumb-init

# 切换回 nestjs 用户运行应用
USER nestjs
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "apps/api/dist/main.js"]
