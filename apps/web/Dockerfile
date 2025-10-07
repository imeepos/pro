# ============================================
# 构建阶段：安装依赖并构建 Angular 应用
# ============================================
FROM node:18-alpine AS builder

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@10.18.1 --activate

# 设置工作目录
WORKDIR /app

# 复制 workspace 配置文件
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# 复制所有 packages（web 应用依赖的共享包）
COPY packages/types ./packages/types
COPY packages/components ./packages/components
COPY packages/utils ./packages/utils
COPY packages/config ./packages/config

# 复制 web 应用代码
COPY apps/web ./apps/web

# 复制基础配置文件
COPY tsconfig.base.json ./

# 安装依赖（使用 frozen-lockfile 确保一致性）
RUN pnpm install --frozen-lockfile

# 构建应用（生成静态文件到 dist/web）
RUN pnpm --filter @pro/web build

# ============================================
# 生产阶段：使用 Nginx 提供静态文件服务
# ============================================
FROM nginx:alpine

# 复制自定义 Nginx 配置
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# 从构建阶段复制构建产物到 Nginx html 目录
COPY --from=builder /app/apps/web/dist/web/browser /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动 Nginx（前台运行）
CMD ["nginx", "-g", "daemon off;"]
