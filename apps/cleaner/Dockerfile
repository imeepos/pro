# ========================================
# Cleaner 应用镜像
# ========================================
# 架构：基于 packages-builder 提供的预构建 packages
# 优化：无需 Playwright，直接继承 packages 层
# 策略：packages → development/builder/production
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
# 开发阶段
# 目的：本地开发环境，支持热重载
# 基础：直接继承 packages（无需 Playwright）
# ========================================
FROM packages AS development

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

# 复制 cleaner 应用配置
COPY apps/cleaner/package.json ./apps/cleaner/

# 安装 cleaner 应用依赖（利用 cache mount 加速）
RUN --mount=type=cache,id=bun-cleaner-dev,target=/home/nestjs/.bun/install/cache \
    echo "📦 安装 @pro/cleaner 依赖..." && \
    bun install

EXPOSE 3002

CMD ["bun", "--filter", "@pro/cleaner", "start:dev"]

# ========================================
# 构建阶段
# 目的：构建 @pro/cleaner 应用
# 基础：直接继承 packages
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

USER nestjs
WORKDIR /app

# 复制 cleaner 应用配置
COPY apps/cleaner/package.json ./apps/cleaner/

# 安装依赖
RUN --mount=type=cache,id=bun-cleaner-builder,target=/home/nestjs/.bun/install/cache \
    echo "📦 安装 @pro/cleaner 依赖..." && \
    bun install

# 复制源码
COPY apps/cleaner/tsconfig.json ./apps/cleaner/
COPY apps/cleaner/tsconfig.build.json* ./apps/cleaner/
COPY apps/cleaner/nest-cli.json* ./apps/cleaner/
COPY apps/cleaner/src ./apps/cleaner/src

# 构建应用
RUN echo "🏗️  构建 @pro/cleaner..." && \
    bun --filter @pro/cleaner build

# ========================================
# 生产阶段
# 目的：最小化生产镜像
# 基础：直接继承 packages
# ========================================
FROM packages AS production

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
COPY --from=builder /app/apps/cleaner/package.json ./apps/cleaner/
COPY --from=builder /app/apps/cleaner/dist ./apps/cleaner/dist
COPY --from=builder /app/bun.lock ./

# 仅安装生产依赖
RUN --mount=type=cache,id=bun-cleaner-prod,target=/home/nestjs/.bun/install/cache \
    echo "📦 安装 @pro/cleaner 生产依赖..." && \
    bun install --cwd ./apps/cleaner --production

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

EXPOSE 3002

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "apps/cleaner/dist/main.js"]
