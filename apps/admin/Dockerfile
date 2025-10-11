# ========================================
# Admin 应用镜像（前端 Angular 项目）
# ========================================
# 架构：基于 packages-builder 提供的预构建 packages
# 优化：将 Playwright 依赖独立为缓存层（用于 E2E 测试）
# 策略：packages → runtime-deps (Playwright) → builder → production (nginx)
# ========================================

# ========================================
# 构建参数
# ========================================
ARG PACKAGES_IMAGE=imeepos/packages-builder:latest
ARG BUILD_VERSION=1.0.0
ARG BUILD_TIME
ARG GIT_COMMIT
ARG BUILD_TYPE=full
ARG AMAP_API_KEY

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
# 构建阶段
# 目的：构建 @pro/admin Angular 应用
# 基础：runtime-deps
# ========================================
FROM runtime-deps AS builder

ARG BUILD_VERSION
ARG BUILD_TIME
ARG GIT_COMMIT
ARG BUILD_TYPE
ARG AMAP_API_KEY

LABEL version="${BUILD_VERSION}" \
      build-time="${BUILD_TIME}" \
      git-commit="${GIT_COMMIT}" \
      build-type="${BUILD_TYPE}" \
      stage="builder"

USER root
WORKDIR /app

# 复制 admin 应用配置
COPY --chown=nestjs:nodejs apps/admin/package.json ./apps/admin/

# 安装依赖
RUN --mount=type=cache,id=bun-admin-builder,target=/root/.bun/install/cache \
    echo "📦 安装 @pro/admin 依赖..." && \
    bun install

# 复制源码并构建
COPY --chown=nestjs:nodejs apps/admin ./apps/admin

# 配置环境变量并构建
ENV AMAP_API_KEY=${AMAP_API_KEY:-YOUR_AMAP_KEY}
RUN echo "AMAP_API_KEY=${AMAP_API_KEY}" >> apps/admin/.env.production && \
    echo "🏗️  构建 @pro/admin..." && \
    bun --filter @pro/admin build

# ========================================
# 生产阶段
# 目的：最小化生产镜像（nginx + 静态文件）
# 基础：nginx:alpine
# ========================================
FROM nginx:alpine AS production

ARG BUILD_VERSION
ARG BUILD_TIME
ARG GIT_COMMIT
ARG BUILD_TYPE

LABEL version="${BUILD_VERSION}" \
      build-time="${BUILD_TIME}" \
      git-commit="${GIT_COMMIT}" \
      build-type="${BUILD_TYPE}" \
      stage="production"

# 从 builder 复制构建产物
COPY --from=builder /app/apps/admin/dist/admin/browser /usr/share/nginx/html

# 复制 nginx 配置
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf

# 创建版本信息文件
RUN echo "{ \
      \"version\": \"${BUILD_VERSION}\", \
      \"buildTime\": \"${BUILD_TIME}\", \
      \"gitCommit\": \"${GIT_COMMIT}\", \
      \"buildType\": \"${BUILD_TYPE}\", \
      \"stage\": \"production\" \
    }" > /usr/share/nginx/html/build-info.json

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
