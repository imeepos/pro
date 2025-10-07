# ==========================================
# 构建阶段
# ==========================================
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@10.18.1 --activate

# 复制 workspace 配置文件
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# 复制所有依赖的 packages
COPY packages/types ./packages/types
COPY packages/components ./packages/components
COPY packages/utils ./packages/utils
COPY packages/config ./packages/config

# 复制 admin 应用代码
COPY apps/admin ./apps/admin

# 复制基础 TypeScript 配置
COPY tsconfig.base.json ./

# 安装所有依赖（frozen-lockfile 确保版本一致性）
RUN pnpm install --frozen-lockfile

# 构建 admin 应用（生产模式）
RUN pnpm --filter @pro/admin build

# ==========================================
# 生产阶段
# ==========================================
FROM nginx:alpine

# 复制自定义 nginx 配置
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf

# 从构建阶段复制构建产物
COPY --from=builder /app/apps/admin/dist/admin/browser /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
