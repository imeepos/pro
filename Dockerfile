FROM oven/bun:1.3.0-alpine AS base
WORKDIR /app
COPY  . .
RUN bun install
RUN bun run build
