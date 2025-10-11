# 第一阶段：构建
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 bun
RUN apk add --no-cache curl bash \
    && curl -fsSL https://bun.sh/install | bash \
    && export BUN_INSTALL="$HOME/.bun" \
    && export PATH="$BUN_INSTALL/bin:$PATH"

# 复制依赖文件
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY packages ./packages

# 安装依赖
RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache \
    export BUN_INSTALL="$HOME/.bun" \
    && export PATH="$BUN_INSTALL/bin:$PATH" \
    && bun install

# 复制源码并构建
COPY apps/web ./apps/web
RUN export BUN_INSTALL="$HOME/.bun" \
    && export PATH="$BUN_INSTALL/bin:$PATH" \
    && bun --filter @pro/web build

# 第二阶段：运行
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/apps/web/dist/web/browser /usr/share/nginx/html

# 复制 nginx 配置
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
