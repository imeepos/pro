# syntax=docker/dockerfile:1

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

# Populate workspace manifests for apps and packages without dragging
# their source trees into the dependency layer.
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
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages ./packages

# Copy the rest of the workspace (source code, configs, etc.).
COPY . .

# Build API and its transitive workspace dependencies.
RUN --mount=type=cache,id=bun-deps,target=/root/.bun/install/cache \
    bunx --bun turbo run build --filter=@pro/api...

# Produce a production-only node_modules tree.
RUN --mount=type=cache,id=bun-deps,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production

# Install production dependencies for each package that has dependencies
RUN --mount=type=cache,id=bun-deps,target=/root/.bun/install/cache \
    set -e; \
    for pkg in packages/*; do \
      if [ -d "$pkg" ] && [ -f "$pkg/package.json" ]; then \
        pkg_name=$(basename "$pkg"); \
        echo "Checking dependencies for package: $pkg_name"; \
        if bun pm ls "$pkg_name" --production-only 2>/dev/null | grep -q "ioredis\|@redis\|redis"; then \
          echo "Installing production dependencies for $pkg_name"; \
          (cd "$pkg" && bun install --frozen-lockfile --production); \
        fi; \
      fi; \
    done

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
        if [ -d "$pkg/node_modules" ]; then \
          cp -r "$pkg/node_modules" "/app/.release/$pkg/node_modules"; \
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

# Copy the prepared runtime payload with correct ownership.
COPY --from=builder --chown=bunapp:bunapp /app/.release/ /app/

USER bunapp

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/health" >/dev/null || exit 1

CMD ["bun", "run", "--cwd", "apps/api", "start:prod"]
