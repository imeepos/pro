# ========================================
# Broker 应用镜像
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

USER root
WORKDIR /app

# 复制 broker 应用配置
COPY --chown=nestjs:nodejs apps/broker/package.json ./apps/broker/

# 安装 broker 应用依赖（利用 cache mount 加速）
RUN --mount=type=cache,id=bun-broker-dev,target=/root/.bun/install/cache \
    echo "📦 安装 @pro/broker 依赖..." && \
    bun install

EXPOSE 3003

USER nestjs

CMD ["bun", "--filter", "@pro/broker", "start:dev"]

# ========================================
# 构建阶段
# 目的：构建 @pro/broker 应用
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

USER root
WORKDIR /app

# 复制 broker 应用配置
COPY --chown=nestjs:nodejs apps/broker/package.json ./apps/broker/

# 安装依赖
RUN --mount=type=cache,id=bun-broker-builder,target=/root/.bun/install/cache \
    echo "📦 安装 @pro/broker 依赖..." && \
    bun install

# 复制源码
COPY --chown=nestjs:nodejs apps/broker/tsconfig.json ./apps/broker/
COPY --chown=nestjs:nodejs apps/broker/tsconfig.build.json* ./apps/broker/
COPY --chown=nestjs:nodejs apps/broker/nest-cli.json* ./apps/broker/
COPY --chown=nestjs:nodejs apps/broker/src ./apps/broker/src

# 构建应用
RUN echo "🏗️  构建 @pro/broker..." && \
    bun --filter @pro/broker build

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

USER root
WORKDIR /app

# 从 builder 复制构建产物
COPY --from=builder --chown=nestjs:nodejs /app/apps/broker/package.json ./apps/broker/
COPY --from=builder --chown=nestjs:nodejs /app/apps/broker/dist ./apps/broker/dist
COPY --from=builder --chown=nestjs:nodejs /app/bun.lock ./

# 仅安装生产依赖
RUN --mount=type=cache,id=bun-broker-prod,target=/root/.bun/install/cache \
    echo "📦 安装 @pro/broker 生产依赖..." && \
    bun install --cwd ./apps/broker --production && \
    chown -R nestjs:nodejs apps/broker/node_modules

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

EXPOSE 3003

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3003/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "apps/broker/dist/main.js"]
