# syntax=docker/dockerfile:1

#
# Production multi-stage image for the @pro/cleaner background service.
# Mirrors the shared Bun workspace strategy for deterministic builds.
#

FROM oven/bun:1.3.0-alpine AS base

ENV BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 \
    BUN_INSTALL_BIN=/usr/local/bin

WORKDIR /app

# -----------------------------------------------------------------------------
# deps: install workspace dependencies once
# -----------------------------------------------------------------------------
FROM base AS deps

WORKDIR /app

COPY bun.lock package.json turbo.json tsconfig.base.json ./
COPY apps/cleaner/package.json apps/cleaner/
COPY packages/*/package.json packages/*/

RUN --mount=type=cache,id=bun-cleaner-deps,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# -----------------------------------------------------------------------------
# builder: compile service and prepare production payload
# -----------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/bun.lock ./bun.lock
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/apps/cleaner/package.json ./apps/cleaner/package.json
COPY --from=deps /app/apps/cleaner/node_modules ./apps/cleaner/node_modules
COPY --from=deps /app/packages ./packages

COPY . .

RUN --mount=type=cache,id=bun-cleaner-deps,target=/root/.bun/install/cache \
    bunx --bun turbo run build --filter=@pro/cleaner...

RUN --mount=type=cache,id=bun-cleaner-deps,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production

RUN set -eux; \
    mkdir -p /app/.release/apps/cleaner; \
    cp bun.lock package.json /app/.release/; \
    cp -r node_modules /app/.release/node_modules; \
    cp apps/cleaner/package.json /app/.release/apps/cleaner/; \
    if [ -d apps/cleaner/node_modules ]; then \
      cp -r apps/cleaner/node_modules /app/.release/apps/cleaner/node_modules; \
    fi; \
    cp -r apps/cleaner/dist /app/.release/apps/cleaner/dist; \
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
# runner: minimal Bun runtime
# -----------------------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production \
    PORT=3002 \
    BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 \
    BUN_INSTALL_BIN=/usr/local/bin

RUN addgroup -g 1001 bunapp && \
    adduser -u 1001 -G bunapp -h /home/bunapp -s /bin/sh -D bunapp

WORKDIR /app

COPY --from=builder --chown=bunapp:bunapp /app/.release/ /app/

USER bunapp

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3002}/health" >/dev/null || exit 1

CMD ["bun", "run", "--cwd", "apps/cleaner", "start:prod"]
