FROM ubuntu-ai-tools:22.04 AS runtime

# 安装 nginx 用于 Angular 应用
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制源码
COPY . .

# 安装依赖
RUN bun install

# 构建所有应用
RUN bun run build

# 复制入口点脚本并设置权限
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# 设置入口点
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

