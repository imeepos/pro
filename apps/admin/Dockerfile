# 第一阶段：构建
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 bun
RUN apk add --no-cache curl bash \
    && curl -fsSL https://bun.sh/install | bash

# 设置 bun 环境
ENV BUN_INSTALL="/root/.bun"
ENV PATH="/root/.bun/bin:$PATH"

# 复制依赖文件
COPY package.json bun.lock ./
COPY apps/admin/package.json ./apps/admin/
COPY packages ./packages

# 安装依赖
RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache \
    bun install

# 复制源码并构建
COPY apps/admin ./apps/admin
ARG AMAP_API_KEY
ENV AMAP_API_KEY=${AMAP_API_KEY:-YOUR_AMAP_KEY}
RUN echo "AMAP_API_KEY=${AMAP_API_KEY}" >> apps/admin/.env.production
RUN bun --filter @pro/admin build

# 第二阶段：运行
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/apps/admin/dist/admin/browser /usr/share/nginx/html

# 复制 nginx 配置
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
