# 第一阶段：构建
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 复制依赖文件
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/admin/package.json ./apps/admin/
COPY packages ./packages

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源码并构建
COPY apps/admin ./apps/admin
ARG AMAP_API_KEY
ENV AMAP_API_KEY=${AMAP_API_KEY:-YOUR_AMAP_KEY}
RUN echo "AMAP_API_KEY=${AMAP_API_KEY}" >> apps/admin/.env.production
RUN pnpm --filter @pro/admin build

# 第二阶段：运行
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/apps/admin/dist/admin/browser /usr/share/nginx/html

# 复制 nginx 配置
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
