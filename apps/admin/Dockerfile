# ========================================
# Admin 应用镜像（前端 Angular 项目）
# ========================================
# 架构：基于 Playwright 基础镜像（已包含系统依赖和 Chromium）
# 优化：利用预构建的 Playwright 环境，统一权限和缓存配置
# 策略：playwright-base → builder → production (nginx)
# ========================================

# ========================================
# 构建参数
# ========================================
ARG BUILD_VERSION=1.0.0
ARG BUILD_TIME
ARG GIT_COMMIT
ARG BUILD_TYPE=full
ARG AMAP_API_KEY

# ========================================
# Playwright 基础阶段
# 目的：使用预配置的 Playwright 基础镜像
# 优势：已包含 Chromium、系统依赖、Bun 运行时，无需重复安装
# ========================================
FROM imeepos/playwright:latest AS base

# ========================================
# 构建阶段
# 目的：构建 @pro/admin Angular 应用
# 基础：playwright-base（已包含所有系统依赖）
# ========================================
FROM base AS builder

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

USER nestjs
WORKDIR /app

# 复制 admin 应用配置
COPY apps/admin/package.json ./apps/admin/

# 安装依赖（使用统一的缓存目录）
RUN --mount=type=cache,id=bun-admin-builder,target=/home/nestjs/.bun/install/cache \
    echo "📦 安装 @pro/admin 依赖..." && \
    bun install

# 复制源码并构建
COPY apps/admin ./apps/admin

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
