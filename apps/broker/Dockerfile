# syntax=docker/dockerfile:1

FROM oven/bun:1.3.0-alpine AS base

ENV BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 \
    BUN_INSTALL_BIN=/usr/local/bin

WORKDIR /app

FROM base AS deps

WORKDIR /app

COPY bun.lock package.json turbo.json tsconfig.base.json ./

RUN --mount=type=bind,source=apps,target=/tmp/apps,ro \
    --mount=type=bind,source=packages,target=/tmp/packages,ro \
    set -e; \
    mkdir -p apps packages; \
    for manifest in /tmp/apps/*/package.json; do \
      [ -f "$manifest" ] || continue; \
      app="$(basename "$(dirname "$manifest")")"; \
      mkdir -p "apps/$app"; \
      cp "$manifest" "apps/$app/package.json"; \
    done; \
    for manifest in /tmp/packages/*/package.json; do \
      [ -f "$manifest" ] || continue; \
      pkg="$(basename "$(dirname "$manifest")")"; \
      mkdir -p "packages/$pkg"; \
      cp "$manifest" "packages/$pkg/package.json"; \
    done

RUN --mount=type=cache,id=bun-broker-deps,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/bun.lock ./bun.lock
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/apps/broker/package.json ./apps/broker/package.json
COPY --from=deps /app/apps/broker/node_modules ./apps/broker/node_modules
COPY --from=deps /app/packages ./packages

COPY . .

RUN --mount=type=cache,id=bun-broker-deps,target=/root/.bun/install/cache \
    bunx --bun turbo run build --filter=@pro/broker...

RUN --mount=type=cache,id=bun-broker-prod,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production

RUN set -eux; \
    mkdir -p /app/.release/apps/broker; \
    cp bun.lock package.json /app/.release/; \
    cp -r node_modules /app/.release/node_modules; \
    cp apps/broker/package.json /app/.release/apps/broker/; \
    if [ -d apps/broker/node_modules ]; then \
      cp -r apps/broker/node_modules /app/.release/apps/broker/node_modules; \
    fi; \
    cp -r apps/broker/dist /app/.release/apps/broker/dist; \
    for pkg in packages/*; do \
      if [ -d "$pkg" ] && [ -f "$pkg/package.json" ]; then \
        mkdir -p "/app/.release/$pkg"; \
        cp "$pkg/package.json" "/app/.release/$pkg/"; \
        if [ -d "$pkg/dist" ]; then \
          cp -r "$pkg/dist" "/app/.release/$pkg/dist"; \
        fi; \
      fi; \
    done

FROM oven/bun:1.3.0-alpine AS runner

ENV NODE_ENV=production \
    PORT=3003 \
    BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 \
    BUN_INSTALL_BIN=/usr/local/bin

RUN addgroup -g 1001 bunapp && \
    adduser -u 1001 -G bunapp -h /home/bunapp -s /bin/sh -D bunapp

WORKDIR /app

COPY --from=builder --chown=bunapp:bunapp /app/.release/ /app/

USER bunapp

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3003}/health" >/dev/null || exit 1

CMD ["bun", "run", "--cwd", "apps/broker", "start:prod"]
