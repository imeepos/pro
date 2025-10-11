# ========================================
# API 应用镜像
# ========================================
# 架构：基于 packages-builder 提供的预构建 packages
# 优势：仅构建应用本身，大幅提升构建速度
# 策略：development (开发) + builder (构建) + production (生产)
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
# ========================================
FROM imeepos/base:latest AS development

# 继承构建参数
ARG BUILD_VERSION
ARG BUILD_TIME
ARG GIT_COMMIT
ARG BUILD_TYPE

# 元数据标签
LABEL version="${BUILD_VERSION}" \
      build-time="${BUILD_TIME}" \
      git-commit="${GIT_COMMIT}" \
      build-type="${BUILD_TYPE}" \
      stage="development"

# 切换到 root 用户以确保安装权限
USER root
WORKDIR /app

# 从 packages 镜像复制所有预构建内容
COPY --from=packages --chown=nestjs:nodejs /app /app

# 复制 api 应用的 package.json
COPY --chown=nestjs:nodejs apps/api/package.json ./apps/api/

# 安装 api 应用依赖
RUN --mount=type=cache,id=bun-api-dev,target=/root/.bun/install/cache \
    echo "📦 安装 @pro/api 依赖..." && \
    bun install

# 暴露端口
EXPOSE 3000

# 切换回非 root 用户
USER nestjs

# 启动开发服务器
CMD ["bun", "--filter", "@pro/api", "start:dev"]

# ========================================
# 构建阶段
# 目的：构建 @pro/api 应用
# 依赖：packages 镜像提供的所有预构建 packages
# ========================================
FROM packages AS builder

# 继承构建参数
ARG BUILD_VERSION
ARG BUILD_TIME
ARG GIT_COMMIT
ARG BUILD_TYPE

# 元数据标签
LABEL version="${BUILD_VERSION}" \
      build-time="${BUILD_TIME}" \
      git-commit="${GIT_COMMIT}" \
      build-type="${BUILD_TYPE}" \
      stage="builder"

# 切换到 root 用户
USER root
WORKDIR /app

# 复制 api 应用的 package.json
COPY --chown=nestjs:nodejs apps/api/package.json ./apps/api/

# 安装 api 应用依赖
RUN --mount=type=cache,id=bun-api-builder,target=/root/.bun/install/cache \
    echo "📦 安装 @pro/api 依赖..." && \
    bun install

# 复制 api 应用源码
COPY --chown=nestjs:nodejs apps/api/tsconfig.json ./apps/api/
COPY --chown=nestjs:nodejs apps/api/tsconfig.build.json* ./apps/api/
COPY --chown=nestjs:nodejs apps/api/nest-cli.json* ./apps/api/
COPY --chown=nestjs:nodejs apps/api/src ./apps/api/src

# 构建 api 应用
RUN echo "🏗️  构建 @pro/api..." && \
    bun --filter @pro/api build

# ========================================
# 生产阶段
# 目的：最小化生产镜像，包含 Playwright 支持
# 基础：node:20-slim (与 packages-builder 版本一致)
# ========================================
FROM node:20-slim AS production

# 继承构建参数
ARG BUILD_VERSION
ARG BUILD_TIME
ARG GIT_COMMIT
ARG BUILD_TYPE

# 元数据标签
LABEL version="${BUILD_VERSION}" \
      build-time="${BUILD_TIME}" \
      git-commit="${GIT_COMMIT}" \
      build-type="${BUILD_TYPE}" \
      stage="production"

# 安装系统依赖：dumb-init 和 Playwright 浏览器所需库
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    dumb-init \
    curl \
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

# 创建非 root 用户
RUN groupadd -g 1001 nodejs && \
    useradd -m -u 1001 -g nodejs nestjs

WORKDIR /app

# 从 packages 镜像复制 packages 依赖和构建产物
COPY --from=packages --chown=nestjs:nodejs /app/package.json ./
COPY --from=packages --chown=nestjs:nodejs /app/bun.lock ./
COPY --from=packages --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=packages --chown=nestjs:nodejs /app/packages ./packages

# 从 builder 复制 api 应用构建产物
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist

# 在生产镜像中重新安装依赖以确保 Node.js 兼容性
USER root
RUN npm install --prefix ./apps/api && chown -R nestjs:nodejs apps/api/node_modules
USER nestjs

# 安装 Playwright Chromium 浏览器
RUN npx playwright install chromium

# 创建版本信息文件
RUN echo "{ \
      \"version\": \"${BUILD_VERSION}\", \
      \"buildTime\": \"${BUILD_TIME}\", \
      \"gitCommit\": \"${GIT_COMMIT}\", \
      \"buildType\": \"${BUILD_TYPE}\", \
      \"stage\": \"production\", \
      \"nodeVersion\": \"$(node --version)\", \
      \"platform\": \"$(uname -a)\" \
    }" > /app/build-info.json

# 切换到非 root 用户
USER nestjs

# 暴露端口
EXPOSE 3000

# 环境变量
ENV NODE_ENV=production

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用 dumb-init 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/dist/main.js"]
