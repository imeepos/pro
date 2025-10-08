# 第一阶段：构建
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 复制依赖文件
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages ./packages

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源码并构建
COPY apps/web ./apps/web
RUN pnpm --filter @pro/web build

# 第二阶段：运行
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/apps/web/dist/web/browser /usr/share/nginx/html

# 复制 nginx 配置
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
