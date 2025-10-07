# Build stage
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@10.18.1 --activate

# 复制 workspace 配置文件
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# 复制所有 packages（crawler 的依赖）
COPY packages ./packages

# 复制 crawler 应用
COPY apps/crawler ./apps/crawler

# 复制根目录 tsconfig（可能被引用）
COPY tsconfig.base.json ./

# 安装所有依赖（包括 devDependencies，用于构建）
RUN pnpm install --frozen-lockfile

# 构建 crawler 应用
RUN pnpm --filter @pro/crawler build

# Production stage
FROM node:18-alpine AS production

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@10.18.1 --activate

# 复制 workspace 配置文件
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# 复制所有 packages 的 package.json
COPY packages ./packages

# 复制 crawler 的 package.json
COPY apps/crawler/package.json ./apps/crawler/

# 只安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 从构建阶段复制构建产物
COPY --from=builder /app/apps/crawler/dist ./apps/crawler/dist

# 从构建阶段复制已构建的 packages（workspace 依赖需要源码或编译输出）
COPY --from=builder /app/packages ./packages

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

# 切换到非 root 用户
USER nestjs

# 暴露端口
EXPOSE 3001

# 启动应用
CMD ["node", "apps/crawler/dist/main.js"]
