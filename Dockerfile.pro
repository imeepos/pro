FROM imeepos/pro:latest AS runtime

# 安装 nginx 用于 Angular 应用
# RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制源码
COPY . .

# 安装依赖
RUN pnpm install

# 安装 Playwright 浏览器（仅在有 playwright 依赖的应用中）
# RUN cd apps/api && pnpm dlx playwright install chromium
# RUN cd apps/crawler && pnpm dlx playwright install chromium

# 先构建依赖包
RUN cd packages/types && pnpm run build
RUN cd packages/utils && pnpm run build
RUN cd packages/entities && pnpm run build
RUN cd packages/logger && pnpm run build

RUN cd packages/sdk && pnpm run build
RUN cd packages/components && pnpm run build
RUN cd packages/redis && pnpm run build
RUN cd packages/rabbitmq && pnpm run build

RUN cd packages/mongodb && pnpm run build
RUN cd packages/minio && pnpm run build

RUN cd apps/admin && pnpm run build
RUN cd apps/web && pnpm run build
RUN cd apps/api && pnpm run build
RUN cd apps/broker && pnpm run build
RUN cd apps/cleaner && pnpm run build
RUN cd apps/crawler && pnpm run build

# 复制入口点脚本并设置权限
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# 设置入口点
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

