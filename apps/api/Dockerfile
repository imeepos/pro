# ========================================
# API 应用镜像
# ========================================
# 架构：基于 packages-builder 提供的预构建 packages
# 优化：将 Playwright 依赖独立为缓存层，避免重复下载
# 策略：packages → runtime-deps (Playwright) → development/production
# ========================================

# ========================================
# 构建参数
# ========================================
ARG PACKAGES_IMAGE=imeepos/packages-builder:latest
ARG BUILD_VERSION=1.0.0
ARG BUILD_TIME
ARG GIT_COMMIT
ARG BUILD_TYPE=full

# ========================================
# Packages 阶段
# 目的：引入预构建的共享 packages
# ========================================
FROM ${PACKAGES_IMAGE} AS packages

# ========================================
# Runtime 依赖阶段（关键优化点）
# 目的：预装 Playwright 系统依赖，此层独立缓存
# 优势：源码变化不影响此层，仅构建一次即可复用
# ========================================
FROM packages AS runtime-deps

USER root

# 安装 Playwright 所需的 Alpine 系统包
# 精简版本，只安装必需依赖
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# 配置 Chromium 环境变量
ENV CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/lib/chromium/

USER nestjs

# ========================================
# 开发阶段
# 目的：本地开发环境，支持热重载
# 基础：runtime-deps (已包含 packages + Playwright)
# ========================================
FROM runtime-deps AS development

ARG BUILD_VERSION
ARG BUILD_TIME
ARG GIT_COMMIT
ARG BUILD_TYPE

LABEL version="${BUILD_VERSION}" \
      build-time="${BUILD_TIME}" \
      git-commit="${GIT_COMMIT}" \
      build-type="${BUILD_TYPE}" \
      stage="development"

USER root
WORKDIR /app

# 复制 API 应用配置
COPY --chown=nestjs:nodejs apps/api/package.json ./apps/api/

# 安装 API 应用依赖（利用 cache mount 加速）
RUN --mount=type=cache,id=bun-api-dev,target=/root/.bun/install/cache \
    echo "📦 安装 @pro/api 依赖..." && \
    bun install

EXPOSE 3000

USER nestjs

CMD ["bun", "--filter", "@pro/api", "start:dev"]

# ========================================
# 构建阶段
# 目的：构建 @pro/api 应用
# 基础：runtime-deps
# ========================================
FROM runtime-deps AS builder

ARG BUILD_VERSION
ARG BUILD_TIME
ARG GIT_COMMIT
ARG BUILD_TYPE

LABEL version="${BUILD_VERSION}" \
      build-time="${BUILD_TIME}" \
      git-commit="${GIT_COMMIT}" \
      build-type="${BUILD_TYPE}" \
      stage="builder"

USER root
WORKDIR /app

# 复制 API 应用配置
COPY --chown=nestjs:nodejs apps/api/package.json ./apps/api/

# 安装依赖
RUN --mount=type=cache,id=bun-api-builder,target=/root/.bun/install/cache \
    echo "📦 安装 @pro/api 依赖..." && \
    bun install

# 复制源码
COPY --chown=nestjs:nodejs apps/api/tsconfig.json ./apps/api/
COPY --chown=nestjs:nodejs apps/api/tsconfig.build.json* ./apps/api/
COPY --chown=nestjs:nodejs apps/api/nest-cli.json* ./apps/api/
COPY --chown=nestjs:nodejs apps/api/src ./apps/api/src

# 构建应用
RUN echo "🏗️  构建 @pro/api..." && \
    bun --filter @pro/api build

# ========================================
# 生产阶段
# 目的：最小化生产镜像
# 基础：runtime-deps (复用 Playwright 依赖)
# ========================================
FROM runtime-deps AS production

ARG BUILD_VERSION
ARG BUILD_TIME
ARG GIT_COMMIT
ARG BUILD_TYPE

LABEL version="${BUILD_VERSION}" \
      build-time="${BUILD_TIME}" \
      git-commit="${GIT_COMMIT}" \
      build-type="${BUILD_TYPE}" \
      stage="production"

USER root
WORKDIR /app

# 从 builder 复制构建产物
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/bun.lock ./

# 仅安装生产依赖
RUN --mount=type=cache,id=bun-api-prod,target=/root/.bun/install/cache \
    echo "📦 安装 @pro/api 生产依赖..." && \
    bun install --cwd ./apps/api --production && \
    chown -R nestjs:nodejs apps/api/node_modules

# 创建版本信息
RUN echo "{ \
      \"version\": \"${BUILD_VERSION}\", \
      \"buildTime\": \"${BUILD_TIME}\", \
      \"gitCommit\": \"${GIT_COMMIT}\", \
      \"buildType\": \"${BUILD_TYPE}\", \
      \"stage\": \"production\", \
      \"nodeVersion\": \"$(node --version)\", \
      \"platform\": \"$(uname -a)\" \
    }" > /app/build-info.json && \
    chown nestjs:nodejs /app/build-info.json

USER nestjs

EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "apps/api/dist/main.js"]
