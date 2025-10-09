FROM node:20-alpine

WORKDIR /app

# 复制 package.json 和 pnpm-lock.yaml
COPY package*.json ./
COPY pnpm-lock.yaml ./

# 安装 pnpm
RUN npm install -g pnpm

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm run build

# 暴露端口
EXPOSE 3003

# 启动命令
CMD ["node", "dist/apps/broker/src/main.js"]