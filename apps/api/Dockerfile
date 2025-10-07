# ========================================
# 构建阶段
# ========================================
FROM node:18-alpine AS builder

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@10.18.1 --activate

# 设置工作目录
WORKDIR /app

# 复制 workspace 配置文件
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# 复制所有 packages（apps/api 依赖的共享库）
COPY packages ./packages

# 复制 apps/api
COPY apps/api ./apps/api

# 复制 tsconfig.base.json（如果存在）
COPY tsconfig.base.json* ./

# 安装所有依赖（包括 devDependencies，因为需要构建）
RUN pnpm install --frozen-lockfile

# 构建共享库
RUN pnpm --filter "@pro/types" build || true
RUN pnpm --filter "@pro/config" build || true
RUN pnpm --filter "@pro/utils" build || true
RUN pnpm --filter "@pro/redis" build || true
RUN pnpm --filter "@pro/mongodb" build || true
RUN pnpm --filter "@pro/rabbitmq" build || true
RUN pnpm --filter "@pro/minio" build || true

# 构建 API 应用
RUN pnpm --filter "@pro/api" build

# ========================================
# 生产阶段
# ========================================
FROM node:18-alpine AS production

# 安装 pnpm 和 dumb-init（用于正确处理信号）
RUN corepack enable && corepack prepare pnpm@10.18.1 --activate && \
    apk add --no-cache dumb-init

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# 设置工作目录
WORKDIR /app

# 复制 workspace 配置文件
COPY --chown=nestjs:nodejs pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# 复制 packages 的 package.json（用于安装生产依赖）
COPY --chown=nestjs:nodejs packages/types/package.json ./packages/types/
COPY --chown=nestjs:nodejs packages/config/package.json ./packages/config/
COPY --chown=nestjs:nodejs packages/utils/package.json ./packages/utils/
COPY --chown=nestjs:nodejs packages/redis/package.json ./packages/redis/
COPY --chown=nestjs:nodejs packages/mongodb/package.json ./packages/mongodb/
COPY --chown=nestjs:nodejs packages/rabbitmq/package.json ./packages/rabbitmq/
COPY --chown=nestjs:nodejs packages/minio/package.json ./packages/minio/

# 复制 apps/api 的 package.json
COPY --chown=nestjs:nodejs apps/api/package.json ./apps/api/

# 安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 从构建阶段复制编译后的代码
COPY --from=builder --chown=nestjs:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/config/dist ./packages/config/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/redis/dist ./packages/redis/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/mongodb/dist ./packages/mongodb/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/rabbitmq/dist ./packages/rabbitmq/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/minio/dist ./packages/minio/dist

# 复制 apps/api 的构建产物
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist

# 切换到非 root 用户
USER nestjs

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production

# 健康检查（可选）
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用 dumb-init 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/dist/main.js"]
