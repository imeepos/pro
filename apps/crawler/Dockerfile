# ========================================
# Crawler 应用镜像
# ========================================
# 架构：基于 imeepos/playwright 基础镜像
# 优化：统一权限处理，简化构建流程
# 策略：base → development/builder → production
# ========================================

# ========================================
# 构建参数
# ========================================
ARG BUILD_VERSION=1.0.0
ARG BUILD_TIME
ARG GIT_COMMIT
ARG BUILD_TYPE=full

# ========================================
# Base 阶段
# 目的：基于 imeepos/playwright 基础镜像
# 包含：预装的 Playwright 依赖和统一的权限配置
# ========================================
FROM imeepos/playwright:latest AS base

# ========================================
# 开发阶段
# 目的：本地开发环境，支持热重载
# 基础：base (已包含 Playwright 依赖和 packages)
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

# 复制 crawler 应用配置
COPY apps/crawler/package.json ./apps/crawler/

# 安装 crawler 应用依赖（利用统一缓存目录）
RUN --mount=type=cache,id=bun-crawler-dev,target=/home/nestjs/.bun/install/cache \
    echo "📦 安装 @pro/crawler 依赖..." && \
    bun install

EXPOSE 3001

CMD ["bun", "--filter", "@pro/crawler", "start:dev"]

# ========================================
# 构建阶段
# 目的：构建 @pro/crawler 应用
# 基础：base
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

# 复制 crawler 应用配置
COPY apps/crawler/package.json ./apps/crawler/

# 安装依赖（利用统一缓存目录）
RUN --mount=type=cache,id=bun-crawler-builder,target=/home/nestjs/.bun/install/cache \
    echo "📦 安装 @pro/crawler 依赖..." && \
    bun install

# 复制源码
COPY apps/crawler/tsconfig.json ./apps/crawler/
COPY apps/crawler/tsconfig.build.json* ./apps/crawler/
COPY apps/crawler/nest-cli.json* ./apps/crawler/
COPY apps/crawler/src ./apps/crawler/
COPY apps/crawler/.env* ./apps/crawler/

# 构建应用
RUN echo "🏗️  构建 @pro/crawler..." && \
    bun --filter @pro/crawler build

# ========================================
# 生产阶段
# 目的：最小化生产镜像
# 基础：base (复用 Playwright 依赖)
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
COPY --from=builder /app/apps/crawler/package.json ./apps/crawler/
COPY --from=builder /app/apps/crawler/dist ./apps/crawler/dist
COPY --from=builder /app/apps/crawler/.env* ./apps/crawler/
COPY --from=builder /app/bun.lock ./

# 仅安装生产依赖（利用统一缓存目录）
RUN --mount=type=cache,id=bun-crawler-prod,target=/home/nestjs/.bun/install/cache \
    echo "📦 安装 @pro/crawler 生产依赖..." && \
    bun install --cwd ./apps/crawler --production

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

EXPOSE 3001

ENV NODE_ENV=production \
    NODE_OPTIONS="--experimental-global-webcrypto"

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "apps/crawler/dist/main.js"]
