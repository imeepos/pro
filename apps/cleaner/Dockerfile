# Build stage
FROM node:18-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.18.1 --activate

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy all packages source code (required for workspace dependencies)
COPY packages ./packages

# Copy cleaner app source code
COPY apps/cleaner ./apps/cleaner

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Build all workspace packages first
RUN pnpm --filter "@pro/types" build
RUN pnpm --filter "@pro/config" build
RUN pnpm --filter "@pro/utils" build
RUN pnpm --filter "@pro/rabbitmq" build
RUN pnpm --filter "@pro/redis" build
RUN pnpm --filter "@pro/mongodb" build
RUN pnpm --filter "@pro/minio" build

# Build cleaner app
RUN pnpm --filter "@pro/cleaner" build

# Production stage
FROM node:18-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.18.1 --activate

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy all packages (needed for workspace structure)
COPY packages ./packages

# Copy cleaner app package.json
COPY apps/cleaner/package.json ./apps/cleaner/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder stage
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/config/package.json ./packages/config/
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder /app/packages/utils/package.json ./packages/utils/
COPY --from=builder /app/packages/rabbitmq/dist ./packages/rabbitmq/dist
COPY --from=builder /app/packages/rabbitmq/package.json ./packages/rabbitmq/
COPY --from=builder /app/packages/redis/dist ./packages/redis/dist
COPY --from=builder /app/packages/redis/package.json ./packages/redis/
COPY --from=builder /app/packages/mongodb/dist ./packages/mongodb/dist
COPY --from=builder /app/packages/mongodb/package.json ./packages/mongodb/
COPY --from=builder /app/packages/minio/dist ./packages/minio/dist
COPY --from=builder /app/packages/minio/package.json ./packages/minio/

# Copy cleaner app built artifacts
COPY --from=builder /app/apps/cleaner/dist ./apps/cleaner/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Set working directory to cleaner app
WORKDIR /app/apps/cleaner

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/main.js"]
