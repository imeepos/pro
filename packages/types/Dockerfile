# ============================================
# 构建阶段：编译 TypeScript 类型定义
# ============================================
FROM node:20-alpine AS builder

# 安装 bun
RUN curl -fsSL https://bun.sh/install | bash

WORKDIR /app

# ============================================
# 第一层：复制 workspace 配置
# 目的：只有 workspace 配置变化时才重新执行后续步骤
# ============================================
COPY package.json bun.lock ./

# ============================================
# 第二层：复制 types 包的依赖声明
# 目的：只有依赖变化时才重新安装
# ============================================
COPY packages/types/package.json ./packages/types/

# ============================================
# 第三层：安装依赖
# 使用 BuildKit cache mount 加速依赖下载
# ============================================
RUN --mount=type=cache,id=bun-types,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# ============================================
# 第四层：复制 TypeScript 配置
# 目的：独立层，配置变化不影响依赖安装
# ============================================
COPY tsconfig.base.json ./
COPY packages/types/tsconfig.json ./packages/types/

# ============================================
# 第五层：复制源码并构建
# 目的：源码变化只影响最后一层
# ============================================
COPY packages/types/src ./packages/types/src
RUN cd packages/types && bun run build

# ============================================
# 生产阶段：仅保留编译产物
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

# 复制 package.json（用于模块解析）
COPY --from=builder /app/packages/types/package.json ./packages/types/

# 复制编译产物
COPY --from=builder /app/packages/types/dist ./packages/types/dist

# 类型包无需运行时，仅作为构建依赖使用
CMD ["echo", "@pro/types build completed"]
