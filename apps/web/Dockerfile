# ========================================
# Web 应用镜像（前端 Angular 项目）
# ========================================
# 架构：基于 packages-builder 提供的预构建 packages
# 优化：复用 packages-builder，无需 Playwright
# 策略：packages → builder → production (nginx)
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
# 构建阶段
# 目的：构建 @pro/web Angular 应用
# 基础：packages
# ========================================
FROM packages AS builder

ARG BUILD_VERSION
ARG BUILD_TIME
ARG GIT_COMMIT
ARG BUILD_TYPE

LABEL version="${BUILD_VERSION}" \
      build-time="${BUILD_TIME}" \
      git-commit="${GIT_COMMIT}" \
      build-type="${BUILD_TYPE}" \
      stage="builder"

# 使用 nestjs 用户作为主要用户，减少权限切换
USER nestjs
WORKDIR /app

# 确保统一缓存目录权限
RUN mkdir -p /home/nestjs/.bun/install/cache

# 复制 web 应用配置和依赖的 packages
COPY --chown=nestjs:nodejs apps/web/package.json ./apps/web/
COPY --chown=nestjs:nodejs packages/components ./packages/components
COPY --chown=nestjs:nodejs packages/sdk ./packages/sdk

# 安装依赖 - 使用统一的缓存目录
RUN --mount=type=cache,id=bun-web-builder,target=/home/nestjs/.bun/install/cache \
    echo "📦 安装 @pro/web 依赖..." && \
    bun install

# 复制源码并构建
COPY --chown=nestjs:nodejs apps/web ./apps/web

RUN echo "🏗️  构建 @pro/web..." && \
    bun --filter @pro/web build

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
COPY --from=builder /app/apps/web/dist/web/browser /usr/share/nginx/html

# 复制 nginx 配置
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

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
