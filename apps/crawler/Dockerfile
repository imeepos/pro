# ========================================
# Crawler 应用镜像
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

# 复制 crawler 应用的 package.json
COPY --chown=nestjs:nodejs apps/crawler/package.json ./apps/crawler/

# 安装 crawler 应用依赖
RUN --mount=type=cache,id=bun-crawler-dev,target=/root/.bun/install/cache \
    echo "📦 安装 @pro/crawler 依赖..." && \
    bun install

# 暴露端口
EXPOSE 3001

# 切换回非 root 用户
USER nestjs

# 启动开发服务器
CMD ["bun", "--filter", "@pro/crawler", "start:dev"]

# ========================================
# 构建阶段
# 目的：构建 @pro/crawler 应用
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

# 复制 crawler 应用的 package.json
COPY --chown=nestjs:nodejs apps/crawler/package.json ./apps/crawler/

# 安装 crawler 应用依赖
RUN --mount=type=cache,id=bun-crawler-builder,target=/root/.bun/install/cache \
    echo "📦 安装 @pro/crawler 依赖..." && \
    bun install

# 复制 crawler 应用源码和配置
COPY --chown=nestjs:nodejs apps/crawler/tsconfig.json ./apps/crawler/
COPY --chown=nestjs:nodejs apps/crawler/tsconfig.build.json* ./apps/crawler/
COPY --chown=nestjs:nodejs apps/crawler/nest-cli.json* ./apps/crawler/
COPY --chown=nestjs:nodejs apps/crawler/src ./apps/crawler/src
COPY --chown=nestjs:nodejs apps/crawler/.env ./apps/crawler/

# 构建 crawler 应用
RUN echo "🏗️  构建 @pro/crawler..." && \
    bun --filter @pro/crawler build

# ========================================
# 生产阶段
# 目的：最小化生产镜像
# 基础：node:20-alpine (轻量级运行时)
# ========================================
FROM node:20-alpine AS production

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

# 安装系统依赖：dumb-init 用于信号处理
RUN apk add --no-cache dumb-init

# 创建非 root 用户
RUN (getent group nodejs >/dev/null 2>&1 || addgroup -g 1001 -S nodejs) && \
    (id nestjs >/dev/null 2>&1 || adduser -S nestjs -u 1001)

WORKDIR /app

# 从 packages 镜像复制 packages 依赖和构建产物
COPY --from=packages --chown=nestjs:nodejs /app/package.json ./
COPY --from=packages --chown=nestjs:nodejs /app/bun.lock ./
COPY --from=packages --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=packages --chown=nestjs:nodejs /app/packages ./packages

# 从 builder 复制 crawler 应用依赖、构建产物和环境配置
COPY --from=builder --chown=nestjs:nodejs /app/apps/crawler/package.json ./apps/crawler/
COPY --from=builder --chown=nestjs:nodejs /app/apps/crawler/node_modules ./apps/crawler/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/crawler/dist ./apps/crawler/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/crawler/.env ./apps/crawler/

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
EXPOSE 3001

# 环境变量
ENV NODE_ENV=production \
    NODE_OPTIONS="--experimental-global-webcrypto"

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用 dumb-init 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/crawler/dist/main.js"]
