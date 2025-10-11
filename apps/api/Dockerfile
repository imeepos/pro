# syntax=docker/dockerfile:1.7-labs

#
# Production-ready multi-stage image for the @pro/api service.
# Key goals:
#   - deterministic installs via bun.lock
#   - cached dependency layer to speed up rebuilds
#   - multi-stage build producing a trimmed runtime payload
#   - non-root execution with health monitoring
#

FROM oven/bun:1.3.0-alpine AS base

ENV BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 \
    BUN_INSTALL_BIN=/usr/local/bin

WORKDIR /app

# -----------------------------------------------------------------------------
# deps: install workspace dependencies with maximal layer reuse
# -----------------------------------------------------------------------------
FROM base AS deps

WORKDIR /app

# Copy only manifests so dependency layer is re-used when source changes.
COPY bun.lock package.json turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/*/package.json packages/*/

RUN --mount=type=cache,id=bun-deps,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# -----------------------------------------------------------------------------
# builder: compile API + dependant workspaces, prepare runtime payload
# -----------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

# Re-use dependency graph from the deps stage.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/bun.lock ./bun.lock
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/apps/api/package.json ./apps/api/package.json
COPY --from=deps /app/packages ./packages

# Copy the rest of the workspace (source code, configs, etc.).
COPY . .

# Build API and its transitive workspace dependencies.
RUN --mount=type=cache,id=bun-deps,target=/root/.bun/install/cache \
    bunx --bun turbo run build --filter=@pro/api...

# Produce a production-only node_modules tree.
RUN --mount=type=cache,id=bun-deps,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production

# Assemble a minimal runtime filesystem under /.release
RUN set -eux; \
    mkdir -p /app/.release/apps/api; \
    cp bun.lock package.json /app/.release/; \
    cp -r node_modules /app/.release/node_modules; \
    cp apps/api/package.json /app/.release/apps/api/; \
    if [ -d apps/api/node_modules ]; then \
      cp -r apps/api/node_modules /app/.release/apps/api/node_modules; \
    fi; \
    cp -r apps/api/dist /app/.release/apps/api/dist; \
    for pkg in packages/*; do \
      if [ -d "$pkg" ] && [ -f "$pkg/package.json" ]; then \
        mkdir -p "/app/.release/$pkg"; \
        cp "$pkg/package.json" "/app/.release/$pkg/"; \
        if [ -d "$pkg/dist" ]; then \
          cp -r "$pkg/dist" "/app/.release/$pkg/dist"; \
        fi; \
      fi; \
    done

# -----------------------------------------------------------------------------
# runner: minimal production image
# -----------------------------------------------------------------------------
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 \
    BUN_INSTALL_BIN=/usr/local/bin

# Create an unprivileged user for the runtime container.
RUN addgroup -g 1001 bunapp && \
    adduser -u 1001 -G bunapp -h /home/bunapp -s /bin/sh -D bunapp

# Copy the prepared runtime payload.
COPY --from=builder /app/.release/ /app/

# Ensure correct ownership for mounted files/directories.
RUN chown -R bunapp:bunapp /app

USER bunapp

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/health" >/dev/null || exit 1

CMD ["bun", "run", "--cwd", "apps/api", "start:prod"]
