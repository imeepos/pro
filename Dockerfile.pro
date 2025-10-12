FROM imeepos/pro:latest AS runtime

# 安装 nginx 用于 Angular 应用
# RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制源码
COPY . .

# 安装依赖
RUN bun install

# 安装 Playwright 浏览器（仅在有 playwright 依赖的应用中）
# RUN cd apps/api && bunx playwright install chromium
# RUN cd apps/crawler && bunx playwright install chromium

# 先构建依赖包
RUN cd packages/types && bun run build
RUN cd packages/utils && bun run build
RUN cd packages/entities && bun run build
RUN cd packages/logger && bun run build

RUN cd packages/sdk && bun run build
RUN cd packages/components && bun run build
RUN cd packages/redis && bun run build
RUN cd packages/rabbitmq && bun run build

RUN cd packages/mongodb && bun run build
RUN cd packages/minio && bun run build

RUN cd apps/admin && bun run build
RUN cd apps/web && bun run build
RUN cd apps/api && bun run build
RUN cd apps/broker && bun run build
RUN cd apps/cleaner && bun run build
RUN cd apps/crawler && bun run build

# 复制入口点脚本并设置权限
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# 设置入口点
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

