# 构建阶段：编译 TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

COPY package.json pnpm-workspace.yaml bun.lockb ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/

RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

COPY packages/types ./packages/types
COPY packages/utils ./packages/utils

RUN bun --filter @pro/types build
RUN bun --filter @pro/utils build

# 生产阶段：仅保留编译产物和运行时依赖
FROM node:20-alpine AS production

WORKDIR /app

RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

COPY package.json pnpm-workspace.yaml bun.lockb ./
COPY packages/utils/package.json ./packages/utils/

RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production

COPY --from=builder /app/packages/utils/dist ./packages/utils/dist

LABEL maintainer="pro-team"
LABEL description="@pro/utils - Shared utility functions"
LABEL version="1.0.0"

WORKDIR /app/packages/utils
