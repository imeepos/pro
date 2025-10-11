# syntax=docker/dockerfile:1

#
# Production multi-stage image for the @pro/crawler service.
# Includes Playwright browser binaries while keeping the runtime lean.
#

FROM oven/bun:1.3.0 AS base

ENV BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 \
    BUN_INSTALL_BIN=/usr/local/bin \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

# -----------------------------------------------------------------------------
# deps: install workspace dependencies with caching
# -----------------------------------------------------------------------------
FROM base AS deps

WORKDIR /app

COPY bun.lock package.json turbo.json tsconfig.base.json ./
COPY apps/crawler/package.json apps/crawler/
COPY packages/*/package.json packages/*/

RUN --mount=type=cache,id=bun-crawler-deps,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# -----------------------------------------------------------------------------
# builder: compile service, download browsers, prepare payload
# -----------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/bun.lock ./bun.lock
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/apps/crawler/package.json ./apps/crawler/package.json
COPY --from=deps /app/apps/crawler/node_modules ./apps/crawler/node_modules
COPY --from=deps /app/packages ./packages

COPY . .

RUN --mount=type=cache,id=bun-crawler-deps,target=/root/.bun/install/cache \
    bunx --bun turbo run build --filter=@pro/crawler...

RUN --mount=type=cache,id=bun-crawler-deps,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production

# Download Chromium so it can be copied into the runtime image.
RUN --mount=type=cache,id=playwright-browsers,target=/root/.cache/ms-playwright \
    bunx --bun playwright install chromium

RUN set -eux; \
    mkdir -p /app/.release/apps/crawler; \
    cp bun.lock package.json /app/.release/; \
    cp -r node_modules /app/.release/node_modules; \
    cp apps/crawler/package.json /app/.release/apps/crawler/; \
    if [ -d apps/crawler/node_modules ]; then \
      cp -r apps/crawler/node_modules /app/.release/apps/crawler/node_modules; \
    fi; \
    cp -r apps/crawler/dist /app/.release/apps/crawler/dist; \
    for env_file in apps/crawler/.env*; do \
      [ -e "$env_file" ] && cp "$env_file" /app/.release/apps/crawler/; \
    done; \
    if [ -d packages ]; then \
      for pkg in packages/*; do \
        if [ -d "$pkg" ] && [ -f "$pkg/package.json" ]; then \
          mkdir -p "/app/.release/$pkg"; \
          cp "$pkg/package.json" "/app/.release/$pkg/"; \
          if [ -d "$pkg/dist" ]; then \
            cp -r "$pkg/dist" "/app/.release/$pkg/dist"; \
          fi; \
        fi; \
      done; \
    fi; \
    if [ -d /ms-playwright ]; then \
      cp -r /ms-playwright /app/.release/ms-playwright; \
    fi

# -----------------------------------------------------------------------------
# runner: Bun runtime with Playwright deps installed
# -----------------------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production \
    PORT=3001 \
    NODE_OPTIONS="--experimental-global-webcrypto" \
    BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 \
    BUN_INSTALL_BIN=/usr/local/bin \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

RUN addgroup --system bunapp && \
    adduser --system --ingroup bunapp --home /home/bunapp --shell /bin/bash bunapp

COPY --from=builder --chown=bunapp:bunapp /app/.release/ /app/

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends curl; \
    node_modules/.bin/playwright install-deps chromium; \
    rm -rf /var/lib/apt/lists/*

USER bunapp

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-3001}/health" >/dev/null || exit 1

CMD ["bun", "run", "--cwd", "apps/crawler", "start:prod"]
